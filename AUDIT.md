# Audit PPMTQ — ringkasan

Tanggal: September 2026. Cakupan: keamanan (rules Firestore, fungsi server), integritas data keuangan,
fungsi CRUD, peran pengguna, cetak & ekspor, konfigurasi deploy.

## Metode
- Uji ujung-ke-ujung di browser (Playwright) terhadap aplikasi asli dengan Firebase tiruan di memori.
  Tiruan ini juga meniru aturan `firestore.rules` (peran admin/bendahara, pengguna nonaktif) dan batas
  20 panggilan `get()` per batch/transaksi, sehingga pelanggaran aturan ikut tertangkap.
- Uji unit fungsi server `api/admin-user.js` (12 skenario: tanpa sesi, bukan admin, admin nonaktif,
  input tidak valid, email ganda, sukses).
- Pemeriksaan hasil cetak dengan membuat PDF (dengan & tanpa "grafik latar belakang").
- Belum bisa diuji: koneksi ke Firebase sungguhan (emulator tidak dapat diunduh dari lingkungan uji).

## Temuan & perbaikan

| # | Tingkat | Temuan | Status |
|---|---|---|---|
| 1 | Tinggi | Tagihan massal ditulis 150 dokumen per transaksi dan data default saat setup 23 dokumen per batch. Rules memanggil `get()` ke dokumen pengguna untuk setiap tulis, sedangkan Firestore membatasi 20 panggilan per batch → berisiko **"permission denied"** di Firebase sungguhan. | Diperbaiki: semua tulis massal dipecah maksimal 18 per batch |
| 2 | Tinggi | Satu pembayaran dengan banyak tagihan bisa melewati batas yang sama. | Diperbaiki: maksimal 8 tagihan per kwitansi, dengan penjelasan di layar |
| 3 | Sedang | Bendahara yang mengubah pembayaran dan mengosongkan satu tagihan akan gagal (butuh izin hapus catatan kas). | Diperbaiki: opsi itu hanya untuk admin; bendahara mendapat penjelasan |
| 4 | Sedang | Mengganti nama kategori kas tidak memperbarui tagihan & buku kas lama → pembayaran baru tercatat ke kategori nama lama, laporan terpecah. | Diperbaiki: nama baru diterapkan ke jenis kewajiban, tagihan, dan buku kas |
| 5 | Sedang | Membetulkan nama santri / ustadz / jenis kewajiban / kelas tidak terbawa ke tagihan, pembayaran, gaji, dan laporan. | Diperbaiki: nama diperbarui otomatis di semua data terkait |
| 6 | Sedang | Jika data gagal dimuat (rules belum dipasang, akun nonaktif, koneksi), halaman tampil kosong seolah belum ada data. | Diperbaiki: muncul pesan galat yang menjelaskan penyebabnya |
| 7 | Rendah | Ekspor CSV rentan *formula injection* (nama berawalan `=`, `+`, `-`, `@` dieksekusi Excel). | Diperbaiki |
| 8 | Rendah | No. HP yang ditulis tanpa 0 di depan (812…) menghasilkan tautan WhatsApp salah. | Diperbaiki |
| 9 | Rendah | Belum ada header keamanan HTTP. | Diperbaiki di `vercel.json` (nosniff, anti-iframe, referrer policy) + cache aset |

## Sudah baik (tidak diubah)
- Semua transaksi uang (pembayaran, ubah/hapus pembayaran, gaji) atomik: tagihan, pembayaran, dan buku kas selalu berubah bersamaan.
- Saldo tidak pernah diketik manual; dihitung dari saldo awal + transaksi, dengan agregasi di server.
- Penghapusan & pembatalan hanya untuk admin, ditegakkan di rules (bukan hanya tampilan).
- Pengguna nonaktif langsung kehilangan akses meskipun sedang login.
- Fungsi server `admin-user` memverifikasi token dan peran admin aktif sebelum mengubah akun.
- Nomor transaksi berurutan per tahun lewat penghitung transaksional (tidak dobel).

## Risiko yang diterima (keputusan desain)
- Bendahara berhak mengubah data transaksi; secara teknis ia bisa mengubah dokumen langsung lewat API Firebase
  (mis. nominal tagihan). Untuk lembaga kecil dengan petugas tepercaya ini wajar. Jika dibutuhkan jejak audit
  lengkap (siapa mengubah apa), bisa ditambah log perubahan pada tahap berikutnya.
- Nama di kwitansi/slip lama yang sudah tercetak tidak ikut berubah ketika nama master diganti (arsip historis).
- Kuota gratis Firebase (Spark) mencukupi untuk satu lembaga kecil; pantau di Firebase Console → Usage.

## Tindakan setelah deploy
1. `firebase deploy --only firestore:rules`
2. Pastikan `FIREBASE_SERVICE_ACCOUNT` sudah diisi di Vercel (untuk fitur Atur login), lalu redeploy.
3. Uji singkat: setup/masuk → buat tagihan massal → terima pembayaran → cetak & kirim WA kwitansi → buka Buku kas.
