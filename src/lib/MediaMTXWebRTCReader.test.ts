import { describe, expect, it, vi } from 'vitest';
import { MediaMTXWebRTCReader } from './MediaMTXWebRTCReader';

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
