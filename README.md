# MediaMTX WebRTC Reader - TypeScript/React

[![NPM Version](https://img.shields.io/npm/v/mediamtx-webrtc-react)](https://www.npmjs.com/package/mediamtx-webrtc-react)
[![NPM Downloads](https://img.shields.io/npm/dm/mediamtx-webrtc-react)](https://www.npmjs.com/package/mediamtx-webrtc-react)
[![CI](https://img.shields.io/github/actions/workflow/status/MrLightful/mediamtx-webrtc-react/test.yml?label=CI)](https://github.com/MrLightful/mediamtx-webrtc-react/actions/workflows/test.yml)

A TypeScript-compatible WebRTC reader for MediaMTX WHEP streams with React integration.

This is a close port of the MediaMTX's [reader.js](https://github.com/bluenviron/mediamtx/blob/v1.18.1/internal/servers/webrtc/reader.js) (based on v1.18.1).

## Installation

```bash
pnpm add mediamtx-webrtc-react
# or
npm install mediamtx-webrtc-react
# or
yarn add mediamtx-webrtc-react
```

## Usage

### 1. Direct TypeScript Class (Same API as original)

```typescript
import { MediaMTXWebRTCReader } from 'mediamtx-webrtc-react';

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
  onDataChannel: (evt) => {
    console.log("Data channel:", evt.channel);
  },
});

// Clean up when done
// reader.close();
```

### 2. React Hook

```tsx
import React from 'react';
import { useMediaMTXWebRTC } from 'mediamtx-webrtc-react';

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
import { WebRTCVideo } from 'mediamtx-webrtc-react';

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
import { WebRTCAudio } from 'mediamtx-webrtc-react';

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
import { MediaMTXWebRTCReader } from 'mediamtx-webrtc-react';

const reader = new MediaMTXWebRTCReader({
  url: "http://mediamtx-ip:8889/mystream/whep",
  onTrack: (evt) => {
    const video = document.getElementById("myvideo") as HTMLVideoElement;
    video.srcObject = evt.streams[0];
  },
});
```

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
  onDataChannel?: (evt: RTCDataChannelEvent) => void;
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
  restart,            // () => void; closes the current reader and starts a new one
} = useMediaMTXWebRTC(config);
```

`WebRTCVideo` and `WebRTCAudio` both support standard React refs via `forwardRef`, so parent components can directly access the rendered media element when needed.

## Features

- ✅ **Full TypeScript support** with strict typing
- ✅ **React hooks** for easy integration
- ✅ **Automatic video/audio element handling**
- ✅ **Connection state management**
- ✅ **Error handling and retry logic**
- ✅ **Data channel support**
- ✅ **Backward compatibility** with original JavaScript API
- ✅ **ESM/CommonJS support**
- ✅ **Tree-shakeable exports**