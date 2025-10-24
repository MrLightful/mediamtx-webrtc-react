import React from 'react';
import { useMediaMTXWebRTC } from '../hooks/useMediaMTXWebRTC';
import type { WebRTCVideoProps } from '../types/index';

/**
 * Simple WebRTC video component that automatically handles MediaMTX streaming
 * 
 * @example
 * ```tsx
 * <WebRTCVideo 
 *   url="http://mediamtx-ip:8889/mystream/whep"
 *   onError={(err) => console.error(err)}
 *   autoPlay
 *   controls
 * />
 * ```
 */
export const WebRTCVideo: React.FC<WebRTCVideoProps> = ({
  url,
  user,
  pass,
  token,
  onError,
  onConnectionStateChange,
  className,
  autoPlay = true,
  controls = true,
  muted = true, // Default to muted for autoplay compatibility
  style,
  ...videoProps
}) => {
  const { 
    videoRef, 
    connectionState, 
    isConnecting, 
    isConnected, 
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

  // Combine default styles with user styles
  const combinedStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    backgroundColor: '#000',
    ...style,
  };

  // Show loading state while connecting
  if (isConnecting && !stream) {
    return (
      <div 
        className={className}
        style={{
          ...combinedStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          color: 'white',
          fontSize: '14px',
        }}
      >
        Connecting to stream...
      </div>
    );
  }

  // Show error state
  if (error && !isConnecting && !stream) {
    return (
      <div 
        className={className}
        style={{
          ...combinedStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          color: '#ff6b6b',
          fontSize: '14px',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ marginBottom: '10px' }}>⚠️ Connection Error</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      style={combinedStyle}
      autoPlay={autoPlay}
      controls={controls}
      muted={muted}
      playsInline // Important for mobile devices
      {...videoProps}
    />
  );
};

