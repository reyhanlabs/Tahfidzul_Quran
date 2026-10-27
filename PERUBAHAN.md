# Catatan perubahan PPMTQ

## 1.5.0 — 27 Oktober 2026
- **Kartu santri** baru: profil lengkap (TTL & umur, wali, HP, alamat, angkatan, keringanan), ringkasan keuangan
  (total, dibayar, sisa, pembayaran terakhir, % kelunasan), hafalan & kehadiran bulan ini, tagihan per tahun
  (filter Belum lunas/Semua), riwayat pembayaran, tombol Kirim tagihan & Terima pembayaran, cetak A4.
- **Redaksi pesan WhatsApp** diperbarui (tagihan, kwitansi, slip, portal, rapor): salam lengkap, sapaan
  "Yth. Bapak/Ibu wali ananda …", rincian bernomor, total, cara pembayaran, tanda tangan bendahara & lembaga.
- Pengaturan → **Pesan WhatsApp ke wali**: isi cara pembayaran (rekening, jam layanan) dengan contoh pesan langsung.
- Tagihan → ⋯ → **Kirim pengingat WhatsApp** (semua tagihan belum lunas lintas periode) & **Lihat kartu santri**.
- Pintasan ke kartu dari Data santri, Pembayaran, dan Tunggakan.

## 1.4.0 — 21 Oktober 2026 (audit menyeluruh)
- Baru: **Ubah santri sekaligus** — centang beberapa santri → naik kelas, lulus/nonaktif, atau isi angkatan.
- Perbaikan: filter di halaman Data master terbawa saat pindah halaman (mis. jenis kewajiban Nonaktif ikut tersembunyi).
- Keamanan (firestore.rules — **wajib deploy ulang rules**):
  - Kunci periode (tutup buku) kini ditegakkan di server untuk buku kas, bukan hanya di tampilan.
  - Guru/bagian pendidikan tidak bisa mengubah keringanan santri atau tarif honor ustadz.
  - Nomor transaksi tidak bisa dimundurkan (mencegah nomor dobel).
- Dependensi diperbarui: 0 celah keamanan (`npm audit`). firebase-admin 14 & React Router 7; Node.js ≥ 22.
- UI: angka ringkasan tidak terpotong di HP, kolom Kode disembunyikan di HP, bilah "perubahan belum disimpan" di Pengaturan.
- Kode: ESLint (`npm run lint`) bersih, kode mati dihapus, komponen tab & rentang tanggal dipakai bersama.

## 1.3.0 — 19 Oktober 2026
- Tarif jenis kewajiban: sama untuk semua, per angkatan (tahun masuk), atau per kelas. Rp0 = tidak dikenai.
- Buat tagihan & Tagihan bulanan memakai tarif tersebut, menampilkan rincian per tarif, dan ada filter Angkatan.
- Data santri: kolom & filter Angkatan (termasuk "Angkatan belum diisi").
- Jenis kewajiban: kolom Tarif menampilkan angkatan tahun berjalan; filter "Tarif angkatan" / "Tarif semua kelas" untuk melihat yang lain.
- Perbaikan galat "Failed to fetch dynamically imported module" setelah update: muat ulang otomatis, vercel.json & service worker diperbaiki.

Cara cek file ini versi terbaru: ada file `src/lib/tarif.js` dan `src/lib/muatUlang.js`.
