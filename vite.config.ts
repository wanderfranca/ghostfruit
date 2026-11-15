import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0) for smartphone testing
    port: 5173,
    https: true, // HTTPS required for camera access on smartphones & browsers
  },
  preview: {
    host: true,
    port: 5173,
    https: true,
  },
});
