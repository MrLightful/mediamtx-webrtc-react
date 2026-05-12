import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaMTXWebRTCReader } from './MediaMTXWebRTCReader';

const makeReader = (overrides: Record<string, unknown> = {}) => Object.assign(
  Object.create(MediaMTXWebRTCReader.prototype),
  {
    conf: { url: 'http://example.test/stream/whep' },
    state: 'running',
    sessionUrl: null,
    offerData: null,
    queuedCandidates: [],
    pc: null,
    restartTimeout: null,
    ...overrides,
  },
);

const mockFetchResponse = ({
  status,
  headers = {},
  text = '',
  json,
}: {
  status: number;
  headers?: Record<string, string>;
  text?: string;
  json?: unknown;
}) => ({
  status,
  headers: {
    get: vi.fn((name: string) => headers[name.toLowerCase()] ?? headers[name] ?? null),
  },
  text: vi.fn().mockResolvedValue(text),
  json: vi.fn().mockResolvedValue(json),
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('MediaMTXWebRTCReader helpers', () => {
  it('parses ICE Link headers with credentials', () => {
    const servers = (MediaMTXWebRTCReader as any).linkToIceServers(
      '<stun:stun.example.com>; rel="ice-server", <turn:turn.example.com>; rel="ice-server"; username="user\\\"name"; credential="pass\\\\word"; credential-type="password"',
    );

    expect(servers).toEqual([
      { urls: ['stun:stun.example.com'] },
      {
        urls: ['turn:turn.example.com'],
        username: 'user"name',
        credential: 'pass\\word',
        credentialType: 'password',
      },
    ]);
  });

  it('generates SDP fragments grouped by media line', () => {
    const fragment = (MediaMTXWebRTCReader as any).generateSdpFragment(
      {
        iceUfrag: 'ufrag',
        icePwd: 'pwd',
        medias: [
          'video 9 UDP/TLS/RTP/SAVPF 96',
          'audio 9 UDP/TLS/RTP/SAVPF 111',
        ],
      },
      [
        { sdpMLineIndex: 1, candidate: 'candidate:audio' },
        { sdpMLineIndex: 0, candidate: 'candidate:video' },
      ],
    );

    expect(fragment).toBe(
      'a=ice-ufrag:ufrag\r\n'
      + 'a=ice-pwd:pwd\r\n'
      + 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n'
      + 'a=mid:0\r\n'
      + 'a=candidate:video\r\n'
      + 'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'
      + 'a=mid:1\r\n'
      + 'a=candidate:audio\r\n',
    );
  });
});

describe('MediaMTXWebRTCReader auth headers', () => {
  it('uses Basic auth when user is present', () => {
    const reader = makeReader({
      conf: {
        url: 'http://example.test/stream/whep',
        user: 'alice',
        pass: 'secret',
        token: 'token-value',
      },
    });

    expect((reader as any).authHeader()).toEqual({
      Authorization: `Basic ${btoa('alice:secret')}`,
    });
  });

  it('uses Bearer auth when only token is present', () => {
    const reader = makeReader({
      conf: {
        url: 'http://example.test/stream/whep',
        token: 'token-value',
      },
    });

    expect((reader as any).authHeader()).toEqual({
      Authorization: 'Bearer token-value',
    });
  });

  it('omits auth for empty credentials', () => {
    const reader = makeReader({
      conf: {
        url: 'http://example.test/stream/whep',
        user: '',
        token: '',
      },
    });

    expect((reader as any).authHeader()).toEqual({});
  });
});

describe('MediaMTXWebRTCReader WHEP offer handling', () => {
  it('stores the resolved session URL and returns answer SDP on 201', async () => {
    const fetch = vi.fn().mockResolvedValue(mockFetchResponse({
      status: 201,
      headers: { location: '../sessions/abc' },
      text: 'answer-sdp',
    }));
    vi.stubGlobal('fetch', fetch);
    const reader = makeReader({
      conf: {
        url: 'http://example.test/live/stream/whep',
        token: 'token-value',
      },
    });

    await expect((reader as any).sendOffer('offer-sdp')).resolves.toBe('answer-sdp');

    expect(reader.sessionUrl).toBe('http://example.test/live/sessions/abc');
    expect(fetch).toHaveBeenCalledWith('http://example.test/live/stream/whep', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-value',
        'Content-Type': 'application/sdp',
      },
      body: 'offer-sdp',
    });
  });

  it.each([
    [404, mockFetchResponse({ status: 404 }), 'stream not found'],
    [400, mockFetchResponse({ status: 400, json: { error: 'bad offer' } }), 'bad offer'],
    [500, mockFetchResponse({ status: 500 }), 'bad status code 500'],
    [201, mockFetchResponse({ status: 201, text: 'answer-sdp' }), 'No location header in response'],
  ])('rejects failed offer responses with status %s', async (_status, response, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const reader = makeReader();

    await expect((reader as any).sendOffer('offer-sdp')).rejects.toThrow(message);
  });
});

describe('MediaMTXWebRTCReader ICE candidates', () => {
  it('queues local candidates before the WHEP session URL is available', () => {
    const reader = makeReader();
    const candidate = { candidate: 'candidate:video', sdpMLineIndex: 0 };

    (reader as any).onLocalCandidate({ candidate });

    expect(reader.queuedCandidates).toEqual([candidate]);
  });

  it('flushes queued candidates after setting the answer', async () => {
    const setRemoteDescription = vi.fn().mockResolvedValue(undefined);
    const fetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 204 }));
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal('RTCSessionDescription', class MockSessionDescription {
      constructor(init: RTCSessionDescriptionInit) {
        Object.assign(this, init);
      }
    });

    const candidate = { candidate: 'candidate:audio', sdpMLineIndex: 1 };
    const reader = makeReader({
      pc: { setRemoteDescription },
      sessionUrl: 'http://example.test/session/abc',
      offerData: {
        iceUfrag: 'ufrag',
        icePwd: 'pwd',
        medias: [
          'video 9 UDP/TLS/RTP/SAVPF 96',
          'audio 9 UDP/TLS/RTP/SAVPF 111',
        ],
      },
      queuedCandidates: [candidate],
    });

    await (reader as any).setAnswer('answer-sdp');

    expect(setRemoteDescription).toHaveBeenCalledWith(expect.objectContaining({
      type: 'answer',
      sdp: 'answer-sdp',
    }));
    expect(reader.queuedCandidates).toEqual([]);
    expect(fetch).toHaveBeenCalledWith('http://example.test/session/abc', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/trickle-ice-sdpfrag',
        'If-Match': '*',
      },
      body: 'a=ice-ufrag:ufrag\r\n'
        + 'a=ice-pwd:pwd\r\n'
        + 'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'
        + 'a=mid:1\r\n'
        + 'a=candidate:audio\r\n',
    });
  });
});

describe('MediaMTXWebRTCReader connection recovery', () => {
  it('cleans up the active session and schedules a restart on running errors', () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(mockFetchResponse({ status: 204 }));
    vi.stubGlobal('fetch', fetch);
    const close = vi.fn();
    const onError = vi.fn();
    const start = vi.fn();
    const reader = makeReader({
      conf: { url: 'http://example.test/stream/whep', onError },
      pc: { close },
      sessionUrl: 'http://example.test/session/abc',
      offerData: { iceUfrag: 'ufrag', icePwd: 'pwd', medias: [] },
      queuedCandidates: [{ candidate: 'candidate:video', sdpMLineIndex: 0 }],
      retryPause: 2000,
      start,
    });

    (reader as any).handleError('peer connection closed');

    expect(close).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('http://example.test/session/abc', {
      method: 'DELETE',
    });
    expect(reader.pc).toBeNull();
    expect(reader.sessionUrl).toBeNull();
    expect(reader.offerData).toBeNull();
    expect(reader.queuedCandidates).toEqual([]);
    expect(reader.state).toBe('restarting');
    expect(onError).toHaveBeenCalledWith('peer connection closed, retrying in some seconds');

    vi.advanceTimersByTime(2000);

    expect(reader.state).toBe('running');
    expect(reader.restartTimeout).toBeNull();
    expect(start).toHaveBeenCalled();
  });
});

describe('MediaMTXWebRTCReader peer connection setup', () => {
  it('creates a local data channel and forwards remote data channel events', async () => {
    const OriginalPeerConnection = globalThis.RTCPeerConnection;
    const OriginalSessionDescription = globalThis.RTCSessionDescription;
    const createDataChannel = vi.fn();
    const addTransceiver = vi.fn();
    const setLocalDescription = vi.fn().mockResolvedValue(undefined);
    const createOffer = vi.fn().mockResolvedValue({
      type: 'offer',
      sdp: 'v=0\r\n'
        + 'a=ice-ufrag:ufrag\r\n'
        + 'a=ice-pwd:pwd\r\n'
        + 'm=video 9 UDP/TLS/RTP/SAVPF 96\r\n'
        + 'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'
        + 'a=rtpmap:111 opus/48000/2\r\n'
        + 'a=fmtp:111 minptime=10;useinbandfec=1\r\n',
    });
    let latestPeerConnection: any;

    class MockPeerConnection {
      ondatachannel: ((evt: RTCDataChannelEvent) => void) | null = null;
      onicecandidate: ((evt: RTCPeerConnectionIceEvent) => void) | null = null;
      onconnectionstatechange: (() => void) | null = null;
      ontrack: ((evt: RTCTrackEvent) => void) | null = null;
      createDataChannel = createDataChannel;
      addTransceiver = addTransceiver;
      createOffer = createOffer;
      setLocalDescription = setLocalDescription;

      constructor(public config: RTCConfiguration) {
        latestPeerConnection = this;
      }
    }

    (globalThis as any).RTCPeerConnection = MockPeerConnection;
    (globalThis as any).RTCSessionDescription = class MockSessionDescription {
      constructor(init: RTCSessionDescriptionInit) {
        Object.assign(this, init);
      }
    };

    try {
      const onDataChannel = vi.fn();
      const reader = Object.assign(Object.create(MediaMTXWebRTCReader.prototype), {
        conf: { url: 'http://example.test/stream/whep', onDataChannel },
        state: 'running',
        nonAdvertisedCodecs: [],
        offerData: null,
      });

      await (reader as any).setupPeerConnection([]);

      expect(latestPeerConnection.config).toMatchObject({
        iceServers: [],
        sdpSemantics: 'unified-plan',
      });
      expect(createDataChannel).toHaveBeenCalledWith('');

      const event = { channel: { label: 'remote' } } as RTCDataChannelEvent;
      latestPeerConnection.ondatachannel(event);
      expect(onDataChannel).toHaveBeenCalledWith(event);
    } finally {
      globalThis.RTCPeerConnection = OriginalPeerConnection;
      globalThis.RTCSessionDescription = OriginalSessionDescription;
    }
  });
});
