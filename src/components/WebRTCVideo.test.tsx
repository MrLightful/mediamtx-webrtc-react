import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebRTCVideo } from './WebRTCVideo';

const defaultHookResult = () => ({
  videoRef: { current: null },
  connectionState: 'running',
  isConnecting: false,
  isConnected: true,
  error: null,
  stream: {} as MediaStream,
});

const hookMock = vi.hoisted(() => ({
  useMediaMTXWebRTC: vi.fn(),
}));

vi.mock('../hooks/useMediaMTXWebRTC', () => ({
  useMediaMTXWebRTC: hookMock.useMediaMTXWebRTC,
}));

describe('WebRTCVideo', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    hookMock.useMediaMTXWebRTC.mockReset();
  });

  it('forwards refs to the rendered video element', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());
    const ref = React.createRef<HTMLVideoElement>();

    render(
      <WebRTCVideo
        ref={ref}
        url="http://example.test/stream/whep"
        data-testid="video"
      />,
    );

    expect(ref.current).toBe(screen.getByTestId('video'));
  });

  it('passes onDataChannel through to the hook config', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());
    const onDataChannel = vi.fn();

    render(
      <WebRTCVideo
        url="http://example.test/stream/whep"
        onDataChannel={onDataChannel}
        data-testid="video"
      />,
    );

    expect(hookMock.useMediaMTXWebRTC).toHaveBeenCalledWith(expect.objectContaining({
      onDataChannel,
    }));
  });

  it('renders a loading state while connecting without a stream', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue({
      ...defaultHookResult(),
      isConnecting: true,
      stream: null,
    });

    render(<WebRTCVideo url="http://example.test/stream/whep" />);

    expect(screen.getByText('Connecting to stream...')).toBeDefined();
  });

  it('renders an error state after connection failure without a stream', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue({
      ...defaultHookResult(),
      isConnecting: false,
      error: 'stream not found',
      stream: null,
    });

    render(<WebRTCVideo url="http://example.test/stream/whep" />);

    expect(screen.getByText('⚠️ Connection Error')).toBeDefined();
    expect(screen.getByText('stream not found')).toBeDefined();
  });

  it('applies default media props to the video element', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());

    render(
      <WebRTCVideo
        url="http://example.test/stream/whep"
        data-testid="video"
      />,
    );

    const video = screen.getByTestId('video') as HTMLVideoElement;
    expect(video.autoplay).toBe(true);
    expect(video.controls).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
  });

  it('attaches an existing stream when the video element mounts after loading', () => {
    const stream = {} as MediaStream;
    hookMock.useMediaMTXWebRTC
      .mockReturnValueOnce({
        ...defaultHookResult(),
        isConnecting: true,
        stream: null,
      })
      .mockReturnValueOnce({
        ...defaultHookResult(),
        isConnecting: false,
        stream,
      });

    const { rerender } = render(
      <WebRTCVideo
        url="http://example.test/stream/whep"
        data-testid="video"
      />,
    );

    expect(screen.getByText('Connecting to stream...')).toBeDefined();

    rerender(
      <WebRTCVideo
        url="http://example.test/stream/whep"
        data-testid="video"
      />,
    );

    const video = screen.getByTestId('video') as HTMLVideoElement;
    expect(video.srcObject).toBe(stream);
  });

  it('allows default media props to be overridden', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());

    render(
      <WebRTCVideo
        url="http://example.test/stream/whep"
        autoPlay={false}
        controls={false}
        muted={false}
        data-testid="video"
      />,
    );

    const video = screen.getByTestId('video') as HTMLVideoElement;
    expect(video.autoplay).toBe(false);
    expect(video.controls).toBe(false);
    expect(video.muted).toBe(false);
  });

  it('notifies parents when the connection state changes', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue({
      ...defaultHookResult(),
      connectionState: 'running',
    });
    const onConnectionStateChange = vi.fn();

    render(
      <WebRTCVideo
        url="http://example.test/stream/whep"
        onConnectionStateChange={onConnectionStateChange}
        data-testid="video"
      />,
    );

    expect(onConnectionStateChange).toHaveBeenCalledWith('running');
  });
});
