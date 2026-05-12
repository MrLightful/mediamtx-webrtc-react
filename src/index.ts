// Main exports for the MediaMTX WebRTC TypeScript library

// Core library
export { MediaMTXWebRTCReader } from './lib/MediaMTXWebRTCReader';

// React hooks
export { useMediaMTXWebRTC } from './hooks/useMediaMTXWebRTC';

// React components
export { WebRTCVideo } from './components/WebRTCVideo';
export { WebRTCAudio } from './components/WebRTCAudio';

// Types
export type {
  MediaMTXWebRTCReaderConfig,
  ReactWebRTCConfig,
  WebRTCVideoProps,
  WebRTCAudioProps,
  WebRTCState,
  ReaderState,
  OnError,
  OnTrack,
  OnDataChannel,
  OfferData,
} from './types/index';

import { MediaMTXWebRTCReader } from './lib/MediaMTXWebRTCReader';

// For backward compatibility - expose the class globally like the original
if (typeof window !== 'undefined') {
  (window as any).MediaMTXWebRTCReader = MediaMTXWebRTCReader;
}
