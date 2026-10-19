# Catatan perubahan PPMTQ

## 1.3.0 — 19 Oktober 2026
- Tarif jenis kewajiban: sama untuk semua, per angkatan (tahun masuk), atau per kelas. Rp0 = tidak dikenai.
- Buat tagihan & Tagihan bulanan memakai tarif tersebut, menampilkan rincian per tarif, dan ada filter Angkatan.
- Data santri: kolom & filter Angkatan (termasuk "Angkatan belum diisi").
- Jenis kewajiban: kolom Tarif menampilkan angkatan tahun berjalan; filter "Tarif angkatan" / "Tarif semua kelas" untuk melihat yang lain.
- Perbaikan galat "Failed to fetch dynamically imported module" setelah update: muat ulang otomatis, vercel.json & service worker diperbaiki.

Cara cek file ini versi terbaru: ada file `src/lib/tarif.js` dan `src/lib/muatUlang.js`.
