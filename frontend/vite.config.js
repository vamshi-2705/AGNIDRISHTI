import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';
import path from 'path';

export default defineConfig({
  plugins: [react(), cesium()],
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 5173,
    host: true
  }
});
