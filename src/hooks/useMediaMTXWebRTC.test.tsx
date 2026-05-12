import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMediaMTXWebRTC } from './useMediaMTXWebRTC';

const readerMock = vi.hoisted(() => {
  class MockMediaMTXWebRTCReader {
    static instances: MockMediaMTXWebRTCReader[] = [];
    connectionState = 'getting_codecs';
    close = vi.fn();

    constructor(public conf: unknown) {
      MockMediaMTXWebRTCReader.instances.push(this);
    }
  }

  return { MockMediaMTXWebRTCReader };
});

vi.mock('../lib/MediaMTXWebRTCReader', () => ({
  MediaMTXWebRTCReader: readerMock.MockMediaMTXWebRTCReader,
}));

const latestReaderConfig = () => (
  readerMock.MockMediaMTXWebRTCReader.instances.at(-1)!.conf as {
    onError: (err: string) => void;
    onTrack: (evt: RTCTrackEvent) => void;
    onDataChannel?: (evt: RTCDataChannelEvent) => void;
  }
);

const makeStream = ({
  videoTracks = [],
  audioTracks = [],
}: {
  videoTracks?: unknown[];
  audioTracks?: unknown[];
}) => ({
  getVideoTracks: vi.fn(() => videoTracks),
  getAudioTracks: vi.fn(() => audioTracks),
});

describe('useMediaMTXWebRTC', () => {
  afterEach(() => {
    vi.useRealTimers();
    readerMock.MockMediaMTXWebRTCReader.instances = [];
  });

  it('does not recreate the reader when polled connection state changes', () => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useMediaMTXWebRTC({ url: 'http://example.test/stream/whep' }));

    expect(readerMock.MockMediaMTXWebRTCReader.instances).toHaveLength(1);

    act(() => {
      readerMock.MockMediaMTXWebRTCReader.instances[0].connectionState = 'running';
      vi.advanceTimersByTime(100);
    });

    expect(result.current.connectionState).toBe('running');
    expect(readerMock.MockMediaMTXWebRTCReader.instances).toHaveLength(1);

    unmount();
  });

  it('recreates the reader when restart is called', () => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useMediaMTXWebRTC({ url: 'http://example.test/stream/whep' }));
    const firstReader = readerMock.MockMediaMTXWebRTCReader.instances[0];

    act(() => {
      result.current.restart();
    });

    expect(readerMock.MockMediaMTXWebRTCReader.instances).toHaveLength(2);
    expect(firstReader.close).toHaveBeenCalled();
    expect(result.current.connectionState).toBe('getting_codecs');

    unmount();
  });

  it('stops polling connection state after close is called', () => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useMediaMTXWebRTC({ url: 'http://example.test/stream/whep' }));
    const reader = readerMock.MockMediaMTXWebRTCReader.instances[0];

    act(() => {
      result.current.close();
    });

    expect(reader.close).toHaveBeenCalled();
    expect(result.current.connectionState).toBe('closed');

    act(() => {
      reader.connectionState = 'running';
      vi.advanceTimersByTime(200);
    });

    expect(result.current.connectionState).toBe('closed');

    unmount();
  });

  it('passes onDataChannel through to the reader config', () => {
    const onDataChannel = vi.fn();
    const { unmount } = renderHook(() => (
      useMediaMTXWebRTC({
        url: 'http://example.test/stream/whep',
        onDataChannel,
      })
    ));
    const event = { channel: { label: 'remote' } } as RTCDataChannelEvent;

    latestReaderConfig().onDataChannel?.(event);

    expect(onDataChannel).toHaveBeenCalledWith(event);

    unmount();
  });

  it('uses the latest callbacks without recreating the reader', () => {
    const firstOnError = vi.fn();
    const secondOnError = vi.fn();
    const firstOnTrack = vi.fn();
    const secondOnTrack = vi.fn();
    const firstOnDataChannel = vi.fn();
    const secondOnDataChannel = vi.fn();
    const { rerender, unmount } = renderHook((props: {
      onError: (err: string) => void;
      onTrack: (evt: RTCTrackEvent) => void;
      onDataChannel: (evt: RTCDataChannelEvent) => void;
    }) => (
      useMediaMTXWebRTC({
        url: 'http://example.test/stream/whep',
        onError: props.onError,
        onTrack: props.onTrack,
        onDataChannel: props.onDataChannel,
      })
    ), {
      initialProps: {
        onError: firstOnError,
        onTrack: firstOnTrack,
        onDataChannel: firstOnDataChannel,
      },
    });
    const config = latestReaderConfig();

    rerender({
      onError: secondOnError,
      onTrack: secondOnTrack,
      onDataChannel: secondOnDataChannel,
    });

    expect(readerMock.MockMediaMTXWebRTCReader.instances).toHaveLength(1);

    const trackEvent = { streams: [makeStream({})], track: {} } as unknown as RTCTrackEvent;
    const dataChannelEvent = { channel: { label: 'remote' } } as RTCDataChannelEvent;
    act(() => {
      config.onError('stream not found');
      config.onTrack(trackEvent);
      config.onDataChannel?.(dataChannelEvent);
    });

    expect(firstOnError).not.toHaveBeenCalled();
    expect(secondOnError).toHaveBeenCalledWith('stream not found');
    expect(firstOnTrack).not.toHaveBeenCalled();
    expect(secondOnTrack).toHaveBeenCalledWith(trackEvent);
    expect(firstOnDataChannel).not.toHaveBeenCalled();
    expect(secondOnDataChannel).toHaveBeenCalledWith(dataChannelEvent);

    unmount();
  });

  it('recreates the reader when connection inputs change', () => {
    const { rerender, unmount } = renderHook((props: { url: string; token?: string }) => (
      useMediaMTXWebRTC(props)
    ), {
      initialProps: { url: 'http://example.test/stream/whep', token: 'first-token' },
    });
    const firstReader = readerMock.MockMediaMTXWebRTCReader.instances[0];

    rerender({ url: 'http://example.test/stream/whep', token: 'second-token' });

    expect(firstReader.close).toHaveBeenCalled();
    expect(readerMock.MockMediaMTXWebRTCReader.instances).toHaveLength(2);

    rerender({ url: 'http://example.test/other/whep', token: 'second-token' });

    expect(readerMock.MockMediaMTXWebRTCReader.instances[1].close).toHaveBeenCalled();
    expect(readerMock.MockMediaMTXWebRTCReader.instances).toHaveLength(3);

    unmount();
  });

  it('updates state, clears retry errors, and forwards track events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T10:30:00.000Z'));
    const video = document.createElement('video');
    const play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(video, 'play', { value: play, configurable: true });
    Object.defineProperty(video, 'srcObject', { value: null, writable: true, configurable: true });
    const videoRef = { current: video };
    const stream = makeStream({ videoTracks: [{}] });
    const onTrack = vi.fn();
    const { result, unmount } = renderHook(() => (
      useMediaMTXWebRTC({
        url: 'http://example.test/stream/whep',
        videoRef,
        onTrack,
      })
    ));
    const config = latestReaderConfig();

    act(() => {
      config.onError('network issue, retrying in some seconds');
    });
    expect(result.current.error).toBe('network issue, retrying in some seconds');
    expect(result.current.retryCount).toBe(1);

    const event = { streams: [stream], track: {} } as unknown as RTCTrackEvent;
    act(() => {
      config.onTrack(event);
    });

    expect(result.current.stream).toBe(stream);
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.lastConnectedAt).toEqual(new Date('2026-05-12T10:30:00.000Z'));
    expect(video.srcObject).toBe(stream);
    expect(play).toHaveBeenCalled();
    expect(onTrack).toHaveBeenCalledWith(event);

    unmount();
  });

  it('assigns audio refs only when audio tracks are present', () => {
    const video = document.createElement('video');
    const audio = document.createElement('audio');
    const videoPlay = vi.fn().mockResolvedValue(undefined);
    const audioPlay = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(video, 'play', { value: videoPlay, configurable: true });
    Object.defineProperty(audio, 'play', { value: audioPlay, configurable: true });
    Object.defineProperty(video, 'srcObject', { value: null, writable: true, configurable: true });
    Object.defineProperty(audio, 'srcObject', { value: null, writable: true, configurable: true });
    const videoRef = { current: video };
    const audioRef = { current: audio };
    const videoOnlyStream = makeStream({ videoTracks: [{}], audioTracks: [] });
    const audioStream = makeStream({ videoTracks: [], audioTracks: [{}] });
    const { unmount } = renderHook(() => (
      useMediaMTXWebRTC({
        url: 'http://example.test/stream/whep',
        videoRef,
        audioRef,
      })
    ));
    const config = latestReaderConfig();

    act(() => {
      config.onTrack({ streams: [videoOnlyStream], track: {} } as unknown as RTCTrackEvent);
    });
    expect(video.srcObject).toBe(videoOnlyStream);
    expect(audio.srcObject).toBeNull();

    act(() => {
      config.onTrack({ streams: [audioStream], track: {} } as unknown as RTCTrackEvent);
    });
    expect(audio.srcObject).toBe(audioStream);

    unmount();
  });

  it('skips media playback when autoplay is disabled', () => {
    const video = document.createElement('video');
    const play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(video, 'play', { value: play, configurable: true });
    Object.defineProperty(video, 'srcObject', { value: null, writable: true, configurable: true });
    const videoRef = { current: video };
    const stream = makeStream({ videoTracks: [{}] });
    const { unmount } = renderHook(() => (
      useMediaMTXWebRTC({
        url: 'http://example.test/stream/whep',
        videoRef,
        autoplay: false,
      })
    ));

    act(() => {
      latestReaderConfig().onTrack({ streams: [stream], track: {} } as unknown as RTCTrackEvent);
    });

    expect(video.srcObject).toBe(stream);
    expect(play).not.toHaveBeenCalled();

    unmount();
  });

  it('swallows autoplay failures after assigning media', () => {
    const video = document.createElement('video');
    const play = vi.fn().mockRejectedValue(new Error('blocked'));
    Object.defineProperty(video, 'play', { value: play, configurable: true });
    Object.defineProperty(video, 'srcObject', { value: null, writable: true, configurable: true });
    const videoRef = { current: video };
    const stream = makeStream({ videoTracks: [{}] });
    const { unmount } = renderHook(() => (
      useMediaMTXWebRTC({
        url: 'http://example.test/stream/whep',
        videoRef,
      })
    ));

    expect(() => {
      act(() => {
        latestReaderConfig().onTrack({ streams: [stream], track: {} } as unknown as RTCTrackEvent);
      });
    }).not.toThrow();

    expect(video.srcObject).toBe(stream);
    expect(play).toHaveBeenCalled();

    unmount();
  });

  it('forwards non-retry errors without incrementing retry count', () => {
    const onError = vi.fn();
    const { result, unmount } = renderHook(() => (
      useMediaMTXWebRTC({
        url: 'http://example.test/stream/whep',
        onError,
      })
    ));

    act(() => {
      latestReaderConfig().onError('stream not found');
    });

    expect(result.current.error).toBe('stream not found');
    expect(result.current.retryCount).toBe(0);
    expect(onError).toHaveBeenCalledWith('stream not found');

    unmount();
  });
});
