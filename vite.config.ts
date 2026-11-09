import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = process.env.BACKEND_PORT || 3002;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${backendPort}`,
      '/uploads': `http://localhost:${backendPort}`,
      '/socket.io': {
        target: `http://localhost:${backendPort}`,
        ws: true,
      },
    },
  },
});
