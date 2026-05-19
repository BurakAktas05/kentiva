import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Tarayici /api isteklerini Spring Boot'a yonlendirir (CORS gerekmez).
      proxy: {
        '/api': { target: 'http://localhost:8080', changeOrigin: true },
        '/actuator': { target: 'http://localhost:8080', changeOrigin: true },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
