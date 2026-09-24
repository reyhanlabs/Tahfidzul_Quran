import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Versi build (waktu build, WIB) — tampil di aplikasi untuk memastikan deploy terbaru sudah aktif
const versi = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __VERSI__: JSON.stringify(versi) },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
