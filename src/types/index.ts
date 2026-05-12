/**
 * Type definitions for MediaMTX WebRTC Reader
 */

// Basic callback types
export type OnError = (err: string) => void;
export type OnTrack = (evt: RTCTrackEvent) => void;
export type OnDataChannel = (evt: RTCDataChannelEvent) => void;

// Reader state type
export type ReaderState = 'getting_codecs' | 'running' | 'restarting' | 'closed' | 'failed';

// Main configuration interface
export interface MediaMTXWebRTCReaderConfig {
  /** Absolute URL of the WHEP endpoint */
  url: string;
  /** Username for authentication */
  user?: string;
  /** Password for authentication */
  pass?: string;
  /** Bearer token for authentication */
  token?: string;
  /** Called when there's an error */
  onError?: OnError;
  /** Called when there's a track available */
  onTrack?: OnTrack;
  /** Called when there's a data channel available */
  onDataChannel?: OnDataChannel;
}

// Internal data structures
export interface OfferData {
  iceUfrag: string;
  icePwd: string;
  medias: string[];
}

// React-specific configuration
export interface ReactWebRTCConfig extends Omit<MediaMTXWebRTCReaderConfig, 'onTrack'> {
  onTrack?: OnTrack;
  videoRef?: React.RefObject<HTMLVideoElement>;
  audioRef?: React.RefObject<HTMLAudioElement>;
  autoplay?: boolean;
}

// WebRTC state for React components
export interface WebRTCState {
  connectionState: ReaderState;
  isConnecting: boolean;
  error: string | null;
  retryCount: number;
  lastConnectedAt: Date | null;
  stream: MediaStream | null;
}

// Component props
export interface WebRTCVideoProps extends Omit<React.VideoHTMLAttributes<HTMLVideoElement>, 'onError'> {
  url: string;
  user?: string;
  pass?: string;
  token?: string;
  onError?: OnError;
  onDataChannel?: OnDataChannel;
  onConnectionStateChange?: (state: ReaderState) => void;
}

export interface WebRTCAudioProps extends Omit<React.AudioHTMLAttributes<HTMLAudioElement>, 'onError'> {
  url: string;
  user?: string;
  pass?: string;
  token?: string;
  onError?: OnError;
  onDataChannel?: OnDataChannel;
  onConnectionStateChange?: (state: ReaderState) => void;
}
