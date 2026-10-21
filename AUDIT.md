# Audit PPMTQ

## Audit 2 — 21 Oktober 2026 (versi 1.4.0)

Cakupan: kelengkapan fitur, UI/UX (desktop & HP, 25 halaman), keamanan (rules, fungsi server, dependensi),
kualitas kode. Metode: ESLint + knip (kode mati), `npm audit`, tinjauan `firestore.rules` & `api/admin-user.js`,
tangkapan layar semua halaman di 1400px & 390px (cek scroll horizontal), 14 uji ujung-ke-ujung.

| # | Area | Tingkat | Temuan | Status |
|---|---|---|---|---|
| 1 | Keamanan | Sedang | Kunci periode (tutup buku) hanya dicek di aplikasi. Bendahara secara teknis bisa menulis buku kas bertanggal terkunci lewat API Firebase. | Diperbaiki: rules buku kas menolak tambah/ubah catatan bertanggal ≤ tanggal kunci (admin dikecualikan untuk pemulihan cadangan) |
| 2 | Keamanan | Sedang | Guru/bagian pendidikan bisa mengubah **keringanan** santri dan **tarif honor** ustadz lewat API (di tampilan sudah tersembunyi). | Diperbaiki di rules |
| 3 | Keamanan | Rendah | Penghitung nomor transaksi bisa dimundurkan oleh pengguna mana pun → nomor kwitansi bisa dobel. | Diperbaiki: penghitung hanya boleh maju (kecuali admin) |
| 4 | Keamanan | Sedang | `npm audit`: 14 celah (4 tinggi) di firebase-admin, @grpc/grpc-js, react-router. | Diperbaiki: firebase-admin 14, react-router-dom 7, override grpc-js → **0 celah** |
| 5 | Fungsi | Sedang | Filter di Data master terbawa saat pindah halaman (mis. filter status "Aktif" dari Santri ikut menyaring Jenis kewajiban sehingga yang Nonaktif tidak terlihat). | Diperbaiki |
| 6 | Fitur | — | Belum ada cara memindahkan banyak santri sekaligus (kenaikan kelas, kelulusan, isi angkatan) — penting di awal tahun ajaran dan untuk tarif per kelas/angkatan. | Ditambahkan: **Ubah sekaligus** di Data santri |
| 7 | UI HP | Rendah | Angka ringkasan Gaji terpotong ("Rp 1.4…"). Kolom Kode memakan tempat di tabel master. | Diperbaiki |
| 8 | UX | Rendah | Pengaturan yang panjang hanya punya tombol simpan di atas; perubahan mudah terlupa disimpan. | Ditambahkan bilah "Ada perubahan yang belum disimpan" |
| 9 | Kode | Rendah | 4 peringatan lint, 5 fungsi tidak terpakai, kode tab & rentang tanggal & progres disalin di 5–7 tempat. | Dirapikan: `npm run lint` bersih, komponen `Tabs`, `useRentangBulanIni`, `ProgresSimpan` dipakai bersama |
| 10 | Aksesibilitas | Rendah | Tab segmen tidak diumumkan sebagai tab oleh pembaca layar. | `role="tab"` + `aria-selected` |

**Sudah baik:** tidak ada `dangerouslySetInnerHTML`/`eval`; token portal wali 28 karakter acak kripto; fungsi server
memverifikasi token & peran admin aktif, tidak bisa menghapus diri sendiri/admin terakhir; header keamanan HTTP aktif;
tidak ada scroll horizontal di HP; semua transaksi uang atomik.

**Catatan/risiko yang diterima:** semua pengguna aktif bisa membaca daftar pengguna (nama, email, hak akses) — wajar
untuk tim kecil. Bendahara tetap dipercaya mengubah data keuangan dalam periode terbuka (tercatat di Log aktivitas).

**Wajib setelah update ini:** `firebase deploy --only firestore:rules`, lalu push ke GitHub. Vercel memakai Node.js 22+
(sudah diatur lewat `engines` di package.json).

---

## Audit 1 — September 2026

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

## Pembaruan: fitur tahap 2 (September 2026)

Fitur baru: tagihan bulanan otomatis, keringanan tetap, kas per rekening + pindah dana, tutup buku, hafalan,
absensi, rapor, portal wali, log aktivitas, cadangan/pemulihan, pemuatan halaman bertahap, PWA, ekspor Excel,
dan rangkaian uji otomatis di `tests/`.

Catatan keamanan & desain:
- **Portal wali** hanya bisa dibaca per dokumen (`get`), tidak bisa ditelusuri (`list`). Isinya salinan ringkas
  tanpa alamat/nomor HP. Token 28 karakter acak (±160 bit). Tautan bisa dicabut kapan saja.
- **Log aktivitas** tidak bisa diubah/dihapus siapa pun (termasuk admin) dan hanya admin yang membaca.
  Log ditulis setelah operasi berhasil; bila koneksi putus tepat saat itu, satu entri log bisa hilang.
- **Tutup buku** ditegakkan oleh aplikasi, bukan oleh rules Firestore (menambah pemeriksaan di rules akan
  menggandakan pemanggilan `get()` per tulis dan memperkecil batas batch). Risikonya sama dengan catatan
  "bendahara dapat mengubah data lewat API" di atas.
- **Pindah dana** dicatat dengan masuk = keluar = 0 sehingga tidak menggelembungkan total pemasukan/pengeluaran.
- **Pemulihan cadangan** menimpa dokumen ber-ID sama dan butuh konfirmasi ketik "PULIHKAN".
- **Data lama** otomatis ditandai ke rekening pertama saat admin pertama kali membuka versi ini.
- Ditemukan & diperbaiki selama pengujian: form setoran hafalan membuat halaman kosong setelah disimpan.
  Sekarang setiap halaman juga dilindungi *error boundary* sehingga galat satu halaman tidak mengosongkan aplikasi.

Hasil uji: 11 skenario ujung-ke-ujung lulus tanpa galat konsol.

## Pembaruan: hak akses berbasis izin & persetujuan pengeluaran

- Izin (keuangan, kasir, akademik, laporan, setujui) ditegakkan di rules untuk **baca dan tulis**. Diuji: kasir
  dan guru ditolak saat membaca buku kas, gaji, pengajuan; guru ditolak membaca tagihan & pembayaran; kasir hanya
  boleh mengubah field hasil pembayaran pada tagihan dan hanya menulis catatan kas bersumber pembayaran.
- Persetujuan: rules menolak catatan kas pengeluaran di atas batas dari pengguna tanpa izin menyetujui, termasuk
  bila dicoba langsung lewat API. Pemeriksaan batas membaca `settings/lembaga` hanya untuk tulis pengeluaran,
  sehingga batas 18 tulis per batch untuk transaksi lain tidak berubah.
- Guru mengganti nama santri: data keuangan tidak ia sentuh (tidak berhak); daftar tagihan/tunggakan menampilkan
  nama terbaru dari data santri, sehingga tetap konsisten.
- Portal wali diperbarui sebagian sesuai izin pengguna yang memicu (mis. guru hanya memperbarui bagian hafalan).
- Uji baru `12_hak_akses_persetujuan.py`: 5 peran, alur ajukan–tolak–ajukan ulang–setujui, dan upaya akses langsung.
