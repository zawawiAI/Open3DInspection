import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  // loaders.gl uses workers and large wasm; keep deps pre-bundled sanely
  optimizeDeps: {
    exclude: ['@loaders.gl/las'],
  },
});
