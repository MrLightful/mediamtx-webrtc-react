import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebRTCAudio } from './WebRTCAudio';

const defaultHookResult = () => ({
  audioRef: { current: null },
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

describe('WebRTCAudio', () => {
  afterEach(() => {
    cleanup();
    hookMock.useMediaMTXWebRTC.mockReset();
  });

  it('forwards refs to the rendered audio element', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());
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
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());
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

  it('renders a loading state while connecting without a stream', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue({
      ...defaultHookResult(),
      isConnecting: true,
      stream: null,
    });

    render(<WebRTCAudio url="http://example.test/stream/whep" />);

    expect(screen.getByText('Connecting to audio stream...')).toBeDefined();
  });

  it('renders an error state after connection failure without a stream', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue({
      ...defaultHookResult(),
      isConnecting: false,
      error: 'stream not found',
      stream: null,
    });

    render(<WebRTCAudio url="http://example.test/stream/whep" />);

    expect(screen.getByText('Audio connection error: stream not found')).toBeDefined();
  });

  it('applies default media props to the audio element', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());

    render(
      <WebRTCAudio
        url="http://example.test/stream/whep"
        data-testid="audio"
      />,
    );

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.autoplay).toBe(true);
    expect(audio.controls).toBe(true);
    expect(audio.muted).toBe(false);
  });

  it('allows default media props to be overridden', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue(defaultHookResult());

    render(
      <WebRTCAudio
        url="http://example.test/stream/whep"
        autoPlay={false}
        controls={false}
        muted
        data-testid="audio"
      />,
    );

    const audio = screen.getByTestId('audio') as HTMLAudioElement;
    expect(audio.autoplay).toBe(false);
    expect(audio.controls).toBe(false);
    expect(audio.muted).toBe(true);
  });

  it('notifies parents when the connection state changes', () => {
    hookMock.useMediaMTXWebRTC.mockReturnValue({
      ...defaultHookResult(),
      connectionState: 'running',
    });
    const onConnectionStateChange = vi.fn();

    render(
      <WebRTCAudio
        url="http://example.test/stream/whep"
        onConnectionStateChange={onConnectionStateChange}
        data-testid="audio"
      />,
    );

    expect(onConnectionStateChange).toHaveBeenCalledWith('running');
  });
});
