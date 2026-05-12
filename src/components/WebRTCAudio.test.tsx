import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebRTCAudio } from './WebRTCAudio';

const hookMock = vi.hoisted(() => ({
  useMediaMTXWebRTC: vi.fn(() => ({
    audioRef: { current: null },
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

describe('WebRTCAudio', () => {
  afterEach(() => {
    hookMock.useMediaMTXWebRTC.mockClear();
  });

  it('forwards refs to the rendered audio element', () => {
    const ref = React.createRef<HTMLAudioElement>();

    render(
      <WebRTCAudio
        ref={ref}
        url="http://example.test/stream/whep"
        data-testid="audio"
      />,
    );

    expect(ref.current).toBe(screen.getByTestId('audio'));
  });

  it('passes onDataChannel through to the hook config', () => {
    const onDataChannel = vi.fn();

    render(
      <WebRTCAudio
        url="http://example.test/stream/whep"
        onDataChannel={onDataChannel}
        data-testid="audio"
      />,
    );

    expect(hookMock.useMediaMTXWebRTC).toHaveBeenCalledWith(expect.objectContaining({
      onDataChannel,
    }));
  });
});
