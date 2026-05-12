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

    expect(readerMock.MockMediaMTXWebRTCReader.instances[0].conf).toMatchObject({
      onDataChannel,
    });

    unmount();
  });
});
