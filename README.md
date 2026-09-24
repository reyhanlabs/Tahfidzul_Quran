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
5. **Pasang security rules** (wajib — rules inilah yang membatasi akses hanya untuk pengguna terdaftar):
   ```bash
   npm i -g firebase-tools
   firebase login
   # project sudah diset di .firebaserc (tahfizulquran-b6b7c)
   firebase deploy --only firestore:rules
   ```
   Atau salin isi `firestore.rules` ke Firestore → Rules → Publish.
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
| **Laporan** | Laporan keuangan per rentang tanggal, buku kas, tunggakan (dengan pengingat WhatsApp), kartu pembayaran santri. Semua bisa dicetak dan diekspor CSV. |

### Peran pengguna
- **Admin** — semua akses, termasuk menghapus data, membatalkan pembayaran, mengubah pengaturan, dan mengelola pengguna.
- **Bendahara** — mencatat semua transaksi dan mengelola data master, tetapi tidak dapat menghapus/membatalkan.

Pembatasan ini ditegakkan di `firestore.rules`, bukan hanya di tampilan.

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

Isi menu **Panduan** di aplikasi cukup diedit di `src/pages/panduan/isi.js`.
