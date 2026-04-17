import { defineConfig } from 'vite';
import { resolve } from 'path';

/** Background Service Worker 独立构建：ES module 格式 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/background/index.ts'),
      formats: ['es'],
      fileName: () => 'background.js',
    },
    codeSplitting: false,
  },
});
