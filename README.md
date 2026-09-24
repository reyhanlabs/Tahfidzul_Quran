# PPMTQ — Administrasi & Keuangan Lembaga

Aplikasi web administrasi untuk TPQ, madrasah, pesantren kecil, dan lembaga pendidikan nonformal:
data santri & ustadz, tagihan dan pembayaran (termasuk cicilan), gaji/honor, pengeluaran, pemasukan lain,
buku kas otomatis, laporan, kwitansi, dan slip gaji.

**Stack:** React 18 + Vite · Tailwind CSS 4 · Firebase Auth + Cloud Firestore · Recharts · deploy ke Vercel.

---

## 1. Siapkan Firebase (±10 menit)

1. **Firebase Console → Add project** (atau pakai project yang sudah ada).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** → mode *production*, lokasi `asia-southeast2 (Jakarta)`.
4. Config web app sudah tertanam di `src/lib/firebase.js` (project `tahfizulquran-b6b7c`) — tidak perlu diisi lagi.
5. **Pasang security rules & indeks** (wajib — rules membatasi akses hanya untuk pengguna terdaftar; indeks dipakai untuk saldo per rekening):
   ```bash
   npm i -g firebase-tools
   firebase login
   # project sudah diset di .firebaserc (tahfizulquran-b6b7c)
   firebase deploy --only firestore
   ```
   Perintah ini memasang `firestore.rules` dan `firestore.indexes.json` sekaligus. Pembuatan indeks bisa memakan beberapa menit; selama itu saldo per rekening di Dashboard/Buku kas belum tampil.
6. **Authentication → Settings → Authorized domains** → tambahkan domain Vercel Anda (mis. `ppmtq.vercel.app`).

## 1b. Aktifkan fitur "Atur login" untuk admin (opsional, disarankan)

Admin bisa langsung mengganti email/kata sandi pengguna lain tanpa email reset. Fitur ini memakai
fungsi server `api/admin-user.js` (Vercel Serverless Function + Firebase Admin SDK) dan butuh kunci service account:

1. Firebase Console → ⚙ Project settings → **Service accounts** → **Generate new private key** → file JSON terunduh.
2. Vercel → Project → Settings → **Environment Variables** → tambahkan `FIREBASE_SERVICE_ACCOUNT`, isinya **seluruh isi file JSON** tadi.
3. Redeploy.

Simpan file JSON itu baik-baik dan **jangan** di-commit ke GitHub — siapa pun yang memegangnya punya akses penuh ke project Firebase.
Fungsi server hanya berjalan di Vercel (atau lokal dengan `npx vercel dev`); di `npm run dev` biasa tombol "Atur login" akan menampilkan pesan bahwa fungsi server belum tersedia.

## 2. Jalankan lokal

```bash
npm install
npm run dev
```

Buka http://localhost:5173. Saat pertama kali dibuka, muncul layar **Setup awal** untuk membuat akun admin
pertama. Data default (kelas, 10 jenis kewajiban, komponen gaji, kategori kas) terisi otomatis.
Setelah admin pertama dibuat, pendaftaran mandiri tertutup — pengguna berikutnya ditambahkan admin dari menu **Pengguna**.

## 3. Deploy ke Vercel

1. Push folder ini ke repo GitHub.
2. Vercel → **Add New Project** → import repo. Framework: *Vite* (terdeteksi otomatis).
3. Deploy — tidak perlu mengisi environment variable. `vercel.json` sudah mengatur rewrite SPA sehingga halaman seperti `/cetak/kwitansi/...` bisa dibuka langsung.

---

## Cara kerja

| Modul | Keterangan |
|---|---|
| **Tagihan** | Per santri per periode. Buat satu per satu atau massal per kelas — santri yang sudah punya tagihan yang sama otomatis dilewati. |
| **Pembayaran** | Pilih santri → centang satu/beberapa tagihan → isi nominal (boleh sebagian = cicilan). Tersimpan atomik: tagihan berkurang, status berubah, kas bertambah, nomor transaksi dibuat. Kwitansi siap cetak + kirim WhatsApp ke wali. |
| **Gaji** | Slip per ustadz dengan komponen pendapatan & potongan. Honor Mengajar otomatis dari tarif ustadz. Total diterima tercatat sebagai kas keluar "Gaji/Honor". |
| **Pengeluaran / Pemasukan lain** | Langsung menjadi baris buku kas. |
| **Buku kas** | Gabungan semua transaksi, diurutkan per tanggal, saldo berjalan dari saldo awal di Pengaturan. Tidak ada input saldo manual. |
| **Kas per rekening** | Kas tunai, rekening bank, dst. dengan saldo awal masing-masing. Metode pembayaran otomatis diarahkan ke rekening tertentu. "Pindah dana" untuk setor/tarik tunai. |
| **Tutup buku** | Kunci periode: transaksi kas lama tidak bisa ditambah/diubah/dihapus sampai kunci dibuka admin. |
| **Tagihan bulanan & keringanan** | Satu tombol untuk semua kewajiban Bulanan; keringanan tetap per santri (persen/rupiah) diterapkan otomatis. |
| **Hafalan, absensi, rapor** | Setoran ziyadah/muraja'ah dengan progres 30 juz, absensi santri & ustadz (bisa jadi dasar honor per kehadiran), rapor siap cetak/kirim WA. |
| **Portal wali** | Tautan rahasia per santri (tanpa login) untuk memantau tagihan, pembayaran, hafalan, dan kehadiran. |
| **Log & cadangan** | Log aktivitas (admin), unduh/pulihkan cadangan JSON atau Excel. |
| **Laporan** | Laporan keuangan per rentang tanggal, buku kas, tunggakan (dengan pengingat WhatsApp), kartu pembayaran santri. Semua bisa dicetak dan diekspor CSV. |

### Hak akses
Setiap pengguna punya izin (`users/{uid}.izin`), dengan peran siap pakai:

| Peran | Izin | Bisa |
|---|---|---|
| Admin | semua | semuanya + hapus/batalkan, pengaturan, pengguna, log |
| Bendahara | keuangan, laporan | seluruh keuangan & master keuangan |
| Kasir | kasir | terima pembayaran, kwitansi, kartu santri |
| Guru | akademik | santri/kelas/ustadz, hafalan, absensi, rapor — **tanpa** data keuangan & gaji |
| Pimpinan | laporan, setujui, akademik | lihat laporan, menyetujui pengeluaran, akademik |

Izin ditegakkan di `firestore.rules` (baca **dan** tulis), bukan hanya di tampilan. Data lama ber-role
`bendahara` otomatis dianggap keuangan + laporan.

### Persetujuan pengeluaran
Aktifkan di Pengaturan (dengan batas nominal). Pengajuan disimpan di koleksi `pengajuan` dan baru masuk `kas`
setelah disetujui; rules menolak pencatatan pengeluaran di atas batas oleh pengguna tanpa izin menyetujui.

### Struktur data (Firestore)

```
settings/lembaga        identitas, saldo awal, metode pembayaran
users/{uid}             nama, email, role (admin|bendahara), aktif
meta/setup              penanda setup awal selesai
kelas, santri, ustadz, kewajiban, komponen, akun   data master (kode otomatis)
tagihan                 santri × kewajiban × periodeKey (YYYYMM), nominal/dibayar/sisa/status
pembayaran              satu kwitansi, items[] per tagihan
gaji                    slip, items[] komponen, bruto/potongan/neto
kas                     jurnal kas tunggal: sumber (pembayaran|gaji|pengeluaran|pemasukan), masuk/keluar
counters/{jenis-tahun}  nomor urut transaksi (BYR-2026-00001, TG-…, GJ-…, KK-…, KM-…)
```

Tanggal disimpan sebagai string `YYYY-MM-DD` agar mudah difilter. Semua query memakai indeks bawaan —
tidak perlu membuat composite index. Saldo dihitung dengan agregasi `sum()` di server sehingga hemat kuota baca.

### Struktur kode

```
src/lib/         firebase, format (rupiah, terbilang, periode), db (hooks), ops (transaksi atomik), auth, data
src/components/  UI kit, layout & sidebar, pemilih santri, kop laporan
src/pages/       dashboard, tagihan, pembayaran, gaji, kas, buku kas, laporan/, master/, cetak/, panduan/
```

Menambah field pada data master cukup di `src/pages/master/config.jsx`.

### Aplikasi terpasang (PWA)
`public/manifest.webmanifest` + `public/sw.js` membuat aplikasi bisa dipasang di HP/komputer. Service worker hanya
menyimpan tampilan aplikasi (bukan data); data selalu dari Firestore.

## Pengujian otomatis

Uji ujung-ke-ujung memakai Firebase tiruan di memori (`tests/mock/`) yang juga meniru aturan hak akses dan batas
batch Firestore, sehingga bisa dijalankan tanpa project Firebase.

```bash
pip install playwright openpyxl pillow && python -m playwright install chromium
npm run test:server              # terminal 1: aplikasi dengan Firebase tiruan di http://localhost:5299
python tests/e2e/run_all.py      # terminal 2: 11 skenario, ±4 menit
```

Uji dijalankan berurutan karena tiap uji memakai data hasil uji sebelumnya. Keluaran (PDF cetak, gambar kwitansi,
file ekspor) tersimpan di `tests/e2e/_hasil/`.

Isi menu **Panduan** di aplikasi cukup diedit di `src/pages/panduan/isi.js`.

## Uji langsung ke aplikasi yang sudah live

`tests/live/uji_live.py` menguji aplikasi sungguhan (Vercel + Firebase) memakai Playwright: membuat 4 akun penguji
(Bendahara, Kasir, Guru, Pimpinan) dan data berlabel `UJI-…`, menjalankan alur tiap peran, lalu **menghapus kembali**
data uji dan menonaktifkan akun penguji. Pengaturan lembaga tidak diubah.

- **Windows:** klik dua kali `tests/live/jalankan-uji.bat`
- **Mac/Linux:** `tests/live/jalankan-uji.sh`

Skrip akan menanyakan alamat aplikasi, email & kata sandi admin, lalu membuka browser sehingga prosesnya bisa
ditonton (±5 menit). Hasil: `tests/live/_hasil/laporan-<kode>.md` + screenshot untuk setiap pemeriksaan yang gagal.
Butuh Python 3.9+.
