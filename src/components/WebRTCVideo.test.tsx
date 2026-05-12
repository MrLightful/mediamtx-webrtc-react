import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebRTCVideo } from './WebRTCVideo';

const hookMock = vi.hoisted(() => ({
  useMediaMTXWebRTC: vi.fn(() => ({
    videoRef: { current: null },
    connectionState: 'running',
    isConnecting: false,
    isConnected: true,
    error: null,
    stream: {} as MediaStream,
  })),
}));

vi.mock('../hooks/useMediaMTXWebRTC', () => ({
  useMediaMTXWebRTC: hookMock.useMediaMTXWebRTC,
}));

describe('WebRTCVideo', () => {
  afterEach(() => {
    hookMock.useMediaMTXWebRTC.mockClear();
  });

  it('forwards refs to the rendered video element', () => {
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
});
