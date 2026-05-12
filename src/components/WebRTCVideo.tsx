import React from 'react';
import { useMediaMTXWebRTC } from '../hooks/useMediaMTXWebRTC';
import type { WebRTCVideoProps } from '../types/index';
import '../styles/video.css';

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
export const WebRTCVideo = React.forwardRef<HTMLVideoElement, WebRTCVideoProps>(({
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
  muted = true, // Default to muted for autoplay compatibility
  style,
  ...videoProps
}, ref) => {
  const internalVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const { 
    connectionState, 
    isConnecting, 
    isConnected, 
    error,
    stream 
  } = useMediaMTXWebRTC({
    videoRef: internalVideoRef,
    url,
    user,
    pass,
    token,
    onError,
    onDataChannel,
    autoplay: autoPlay,
  });

  const attachStream = React.useCallback((node: HTMLVideoElement | null) => {
    if (!node || !stream) {
      return;
    }

    node.srcObject = stream;
    if (autoPlay) {
      const playResult = node.play();
      playResult?.catch(() => {
        // Autoplay might fail due to browser policies
      });
    }
  }, [autoPlay, stream]);

  const setVideoRef = React.useCallback((node: HTMLVideoElement | null) => {
    internalVideoRef.current = node;
    attachStream(node);

    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [attachStream, ref]);

  // Notify parent of connection state changes
  React.useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  // Show loading state while connecting
  if (isConnecting && !stream) {
    return (
      <div 
        className={`webrtc-video webrtc-video-loading ${className || ''}`}
        style={style}
      >
        Connecting to stream...
      </div>
    );
  }

  // Show error state
  if (error && !isConnecting && !stream) {
    return (
      <div 
        className={`webrtc-video webrtc-video-error ${className || ''}`}
        style={style}
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
      ref={setVideoRef}
      className={`webrtc-video ${className || ''}`}
      style={style}
      autoPlay={autoPlay}
      controls={controls}
      muted={muted}
      playsInline // Important for mobile devices
      {...videoProps}
    />
  );
});

WebRTCVideo.displayName = 'WebRTCVideo';
