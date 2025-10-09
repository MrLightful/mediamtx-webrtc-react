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
export const WebRTCAudio: React.FC<WebRTCAudioProps> = ({
  url,
  user,
  pass,
  token,
  onError,
  onConnectionStateChange,
  className,
  autoPlay = true,
  controls = true,
  muted = false,
  style,
  ...audioProps
}) => {
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
    autoplay: autoPlay,
  });

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
      ref={audioRef}
      className={className}
      style={style}
      autoPlay={autoPlay}
      controls={controls}
      muted={muted}
      {...audioProps}
    />
  );
};