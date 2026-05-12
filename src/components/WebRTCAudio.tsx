import React from 'react';
import { useMediaMTXWebRTC } from '../hooks/useMediaMTXWebRTC';
import type { WebRTCAudioProps } from '../types/index';

/**
 * Simple WebRTC audio component that automatically handles MediaMTX streaming
 * 
 * @example
 * ```tsx
 * <WebRTCAudio 
 *   url="http://mediamtx-ip:8889/mystream/whep"
 *   onError={(err) => console.error(err)}
 *   autoPlay
 *   controls
 * />
 * ```
 */
export const WebRTCAudio = React.forwardRef<HTMLAudioElement, WebRTCAudioProps>(({
  url,
  user,
  pass,
  token,
  onError,
  onDataChannel,
  onConnectionStateChange,
  className,
  autoPlay = true,
  controls = true,
  muted = false,
  style,
  ...audioProps
}, ref) => {
  const { 
    audioRef, 
    connectionState, 
    isConnecting, 
    error,
    stream 
  } = useMediaMTXWebRTC({
    url,
    user,
    pass,
    token,
    onError,
    onDataChannel,
    autoplay: autoPlay,
  });

  const setAudioRef = React.useCallback((node: HTMLAudioElement | null) => {
    (audioRef as React.MutableRefObject<HTMLAudioElement | null>).current = node;

    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [audioRef, ref]);

  // Notify parent of connection state changes
  React.useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  // Show loading state
  if (isConnecting && !stream) {
    return (
      <div className={className} style={style}>
        Connecting to audio stream...
      </div>
    );
  }

  // Show error state
  if (error && !isConnecting && !stream) {
    return (
      <div className={className} style={style}>
        Audio connection error: {error}
      </div>
    );
  }

  return (
    <audio
      ref={setAudioRef}
      className={className}
      style={style}
      autoPlay={autoPlay}
      controls={controls}
      muted={muted}
      {...audioProps}
    />
  );
});

WebRTCAudio.displayName = 'WebRTCAudio';
