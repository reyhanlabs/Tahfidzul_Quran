import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
const m = (f) => path.resolve(__dirname, f);
export default defineConfig({
  root: path.resolve(__dirname, '../..'),
  plugins: [react(), tailwindcss()],
  define: { __VERSI__: JSON.stringify('uji') },
  resolve: { alias: { 'firebase/app': m('app.js'), 'firebase/auth': m('auth.js'), 'firebase/firestore': m('firestore.js') } },
  server: { port: 5299 },
});
