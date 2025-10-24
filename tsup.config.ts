import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],        // build both formats
  dts: true,                     // generate .d.ts
  sourcemap: true,               // nice for debugging
  clean: true,                   // clear dist before build
  minify: false,                 // keep readable output
  target: 'es2020',              // modern baseline
  external: ['react'],           // don't bundle peer deps
  splitting: false,              // single-file output per format
});
