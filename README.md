# MediaMTX WebRTC Reader - TypeScript/React

A TypeScript-compatible WebRTC reader for MediaMTX WHEP streams with React integration.

## Project Structure

```
webrtc/
├── src/                     # Source code
│   ├── types/              # TypeScript type definitions
│   ├── lib/                # Core MediaMTX WebRTC reader class
│   ├── hooks/              # React hooks
│   ├── components/         # React components
│   ├── index.ts            # Main exports
│   └── reader.tsx          # Usage examples
├── dist/                   # Built output (generated)
├── README.md              # Documentation
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
└── test.html              # Browser test file
```

## Installation

```bash
pnpm add @mediamtx/webrtc-reader
# or
npm install @mediamtx/webrtc-reader
# or
yarn add @mediamtx/webrtc-reader
```

For React usage, make sure you have React installed:
```bash
pnpm add react @types/react
# or
npm install react @types/react
```

## Usage

### 1. Direct TypeScript Class (Same API as original)

```typescript
import { MediaMTXWebRTCReader } from '@mediamtx/webrtc-reader';

const reader = new MediaMTXWebRTCReader({
  url: "http://mediamtx-ip:8889/mystream/whep",
  user: "", // optional
  pass: "", // optional
  token: "", // optional
  onError: (err) => {
    console.error(err);
  },
  onTrack: (evt) => {
    const videoElement = document.getElementById("myvideo") as HTMLVideoElement;
    videoElement.srcObject = evt.streams[0];
  },
});

// Clean up when done
// reader.close();
```

### 2. React Hook

```tsx
import React from 'react';
import { useMediaMTXWebRTC } from '@mediamtx/webrtc-reader';

function VideoPlayer() {
  const { 
    videoRef, 
    connectionState, 
    error, 
    isConnecting,
    isConnected,
    stream 
  } = useMediaMTXWebRTC({
    url: "http://mediamtx-ip:8889/mystream/whep",
    onError: (err) => console.error(err)
  });

  return (
    <div>
      <video ref={videoRef} autoPlay controls />
      <p>Status: {connectionState}</p>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### 3. Simple React Component

```tsx
import React from 'react';
import { WebRTCVideo } from '@mediamtx/webrtc-reader';

function App() {
  return (
    <WebRTCVideo 
      url="http://mediamtx-ip:8889/mystream/whep"
      onError={(err) => console.error(err)}
      onConnectionStateChange={(state) => console.log('State:', state)}
      autoPlay
      controls
      style={{ width: '100%', maxWidth: '800px' }}
    />
  );
}
```

### 4. Audio Streaming

```tsx
import React from 'react';
import { WebRTCAudio } from '@mediamtx/webrtc-reader';

function AudioPlayer() {
  return (
    <WebRTCAudio 
      url="http://mediamtx-ip:8889/audiostream/whep"
      controls
    />
  );
}
```

## Migration from JavaScript

The TypeScript version maintains full backward compatibility with the original JavaScript API:

### Before (JavaScript):
```html
<script src="reader.js"></script>
<script>
  let reader = new MediaMTXWebRTCReader({
    url: "http://mediamtx-ip:8889/mystream/whep",
    onTrack: (evt) => {
      document.getElementById("myvideo").srcObject = evt.streams[0];
    },
  });
</script>
```

### After (TypeScript):
```typescript
import { MediaMTXWebRTCReader } from '@mediamtx/webrtc-reader';

const reader = new MediaMTXWebRTCReader({
  url: "http://mediamtx-ip:8889/mystream/whep",
  onTrack: (evt) => {
    const video = document.getElementById("myvideo") as HTMLVideoElement;
    video.srcObject = evt.streams[0];
  },
});
```

## Development

This project uses **pnpm** as the package manager for better performance and disk efficiency.

### Prerequisites
```bash
# Install pnpm globally if you don't have it
npm install -g pnpm
```

### Setup & Building
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Build and watch for changes during development
pnpm run dev

# Type check without building
pnpm run typecheck

# Clean build output
pnpm run clean
```

### Testing
```bash
# Build the project
pnpm run build

# Open test.html in your browser to test the library
# The test file demonstrates the original JavaScript API compatibility
```

### Project Commands
- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run dev` - Watch mode for development
- `pnpm run typecheck` - Type checking only
- `pnpm run clean` - Remove build output

### Package Manager Enforcement
This project includes a `preinstall` script that ensures only pnpm is used for consistency across development environments.

## API Reference

### MediaMTXWebRTCReaderConfig

```typescript
interface MediaMTXWebRTCReaderConfig {
  url: string;           // WHEP endpoint URL
  user?: string;         // Optional username
  pass?: string;         // Optional password  
  token?: string;        // Optional bearer token
  onError?: (err: string) => void;
  onTrack?: (evt: RTCTrackEvent) => void;
}
```

### useMediaMTXWebRTC Hook

```typescript
const {
  // Connection state
  connectionState,     // 'getting_codecs' | 'running' | 'restarting' | 'closed' | 'failed'
  isConnecting,        // boolean
  isConnected,         // boolean
  error,              // string | null
  stream,             // MediaStream | null
  retryCount,         // number
  lastConnectedAt,    // Date | null
  
  // Element refs
  videoRef,           // RefObject<HTMLVideoElement>
  audioRef,           // RefObject<HTMLAudioElement>
  
  // Control methods
  reader,             // MediaMTXWebRTCReader instance
  close,              // () => void
  restart,            // () => void
} = useMediaMTXWebRTC(config);
```

## Features

- ✅ **Full TypeScript support** with strict typing
- ✅ **React hooks** for easy integration
- ✅ **Automatic video/audio element handling**
- ✅ **Connection state management**
- ✅ **Error handling and retry logic**
- ✅ **Backward compatibility** with original JavaScript API
- ✅ **ESM/CommonJS support**
- ✅ **Tree-shakeable exports**

## Browser Support

- Chrome/Chromium 80+
- Firefox 74+
- Safari 13.1+
- Edge 80+

## License

MIT