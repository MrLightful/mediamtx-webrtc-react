import { describe, expect, it } from 'vitest';

import {
  MediaMTXWebRTCReader,
  WebRTCAudio,
  WebRTCVideo,
  useMediaMTXWebRTC,
} from './index';

describe('public exports', () => {
  it('loads the package entrypoint exports', () => {
    expect(MediaMTXWebRTCReader).toBeTypeOf('function');
    expect(WebRTCAudio).toBeTypeOf('function');
    expect(WebRTCVideo).toBeTypeOf('function');
    expect(useMediaMTXWebRTC).toBeTypeOf('function');
  });
});
