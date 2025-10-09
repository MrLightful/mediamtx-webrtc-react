import { useEffect, useRef, useState, useCallback } from 'react';
import { MediaMTXWebRTCReader } from '../lib/MediaMTXWebRTCReader';
import type { 
  MediaMTXWebRTCReaderConfig, 
  ReaderState, 
  ReactWebRTCConfig,
  WebRTCState
} from '../types/index';

/**
 * React hook for MediaMTX WebRTC streaming
 */
export function useMediaMTXWebRTC(config: ReactWebRTCConfig) {
  const [connectionState, setConnectionState] = useState<ReaderState>('getting_codecs');
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);
  
  const readerRef = useRef<MediaMTXWebRTCReader | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isInitializedRef = useRef<boolean>(false);

  // Handle track events with automatic video/audio element assignment
  const handleTrack = useCallback((evt: RTCTrackEvent) => {
    const mediaStream = evt.streams[0];
    setStream(mediaStream);
    
    // Auto-assign to video element if available
    const targetVideoRef = config.videoRef?.current || videoRef.current;
    if (targetVideoRef && mediaStream.getVideoTracks().length > 0) {
      targetVideoRef.srcObject = mediaStream;
      if (config.autoplay !== false) {
        targetVideoRef.play().catch(() => {
          // Autoplay might fail due to browser policies
        });
      }
    }
    
    // Auto-assign to audio element if available
    const targetAudioRef = config.audioRef?.current || audioRef.current;
    if (targetAudioRef && mediaStream.getAudioTracks().length > 0) {
      targetAudioRef.srcObject = mediaStream;
      if (config.autoplay !== false) {
        targetAudioRef.play().catch(() => {
          // Autoplay might fail due to browser policies
        });
      }
    }
    
    // Mark as connected
    setLastConnectedAt(new Date());
    setRetryCount(0);
    
    // Call custom onTrack if provided
    config.onTrack?.(evt);
  }, [config.onTrack, config.videoRef, config.audioRef, config.autoplay]);

  // Handle errors with retry counting
  const handleError = useCallback((err: string) => {
    setError(err);
    
    // Check if this is a retry attempt
    if (err.includes('retrying in some seconds')) {
      setRetryCount((prev: number) => prev + 1);
    }
    
    // Call custom onError if provided
    config.onError?.(err);
  }, [config.onError]);

  // Initialize WebRTC reader
  useEffect(() => {
    if (isInitializedRef.current || !config.url) {
      return () => {}; // Return no-op cleanup function
    }

    const readerConfig: MediaMTXWebRTCReaderConfig = {
      url: config.url,
      user: config.user,
      pass: config.pass,
      token: config.token,
      onError: handleError,
      onTrack: handleTrack,
    };

    try {
      const reader = new MediaMTXWebRTCReader(readerConfig);
      readerRef.current = reader;
      isInitializedRef.current = true;

      // Monitor connection state changes
      const stateCheckInterval = setInterval(() => {
        if (reader && reader.connectionState !== connectionState) {
          setConnectionState(reader.connectionState);
        }
      }, 100);

      return () => {
        clearInterval(stateCheckInterval);
        reader.close();
        readerRef.current = null;
        isInitializedRef.current = false;
      };
    } catch (error) {
      handleError(`Failed to initialize WebRTC reader: ${error}`);
      isInitializedRef.current = false;
      return () => {}; // Return no-op cleanup function
    }
  }, [config.url, config.user, config.pass, config.token, handleError, handleTrack, connectionState]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.close();
      }
    };
  }, []);

  // Compute derived state
  const isConnecting = connectionState === 'getting_codecs' || connectionState === 'restarting';
  const isConnected = connectionState === 'running' && stream !== null;

  const webRTCState: WebRTCState = {
    connectionState,
    isConnecting,
    error,
    retryCount,
    lastConnectedAt,
    stream,
  };

  return {
    // State
    ...webRTCState,
    isConnected,
    
    // Refs for manual element assignment
    videoRef: config.videoRef || videoRef,
    audioRef: config.audioRef || audioRef,
    
    // Reader instance for advanced usage
    reader: readerRef.current,
    
    // Manual control methods
    close: () => readerRef.current?.close(),
    restart: () => {
      if (readerRef.current) {
        readerRef.current.close();
        // Re-initialization will happen automatically via useEffect dependency
        isInitializedRef.current = false;
        setError(null);
        setStream(null);
      }
    },
  };
}