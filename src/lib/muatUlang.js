import { lazy } from 'react';

/**
 * Setelah aplikasi diperbarui (deploy baru), tab yang masih terbuka menyimpan nama file
 * versi lama (mis. Dashboard-abc123.js) yang sudah tidak ada di server.
 * Saat itu terjadi, muat ulang halaman sekali secara otomatis agar memakai versi terbaru.
 */
const KUNCI = 'ppmtq-muat-ulang';

export const galatVersiLama = (e) => /dynamically imported module|Importing a module script failed|Loading chunk|error loading dynamically|Failed to fetch dynamically/i.test(String(e?.message || e));

export function muatUlangSekali() {
  let terakhir = 0;
  try { terakhir = Number(sessionStorage.getItem(KUNCI)) || 0; } catch { /* abaikan */ }
  if (Date.now() - terakhir < 15000) return false; // baru saja dimuat ulang → jangan berulang
  try { sessionStorage.setItem(KUNCI, String(Date.now())); } catch { /* abaikan */ }
  window.location.reload();
  return true;
}

/** Pengganti React.lazy: bila file halaman versi lama hilang, muat ulang halaman. */
export function lazyMuat(impor) {
  return lazy(() => impor().catch((e) => {
    if (galatVersiLama(e) && muatUlangSekali()) return new Promise(() => {}); // tunggu reload
    throw e;
  }));
}

if (typeof window !== 'undefined') {
  // Vite memicu event ini saat preload modul gagal
  window.addEventListener('vite:preloadError', (ev) => { if (muatUlangSekali()) ev.preventDefault(); });
}
