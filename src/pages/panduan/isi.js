/**
 * Isi panduan pemakaian. Tiap bagian: id, grup, judul, ringkas, link (halaman terkait),
 * langkah (urutan kerja), catatan (poin lepas), tanya (tanya-jawab), admin (khusus admin).
 * Untuk mengubah panduan cukup edit file ini.
 */
export const PANDUAN = [
  {
    id: 'mulai', grup: 'Mulai di sini', judul: 'Mulai cepat',
    ringkas: 'Urutan pengisian saat pertama kali memakai aplikasi. Dilakukan sekali saja; setelah itu pekerjaan harian cukup di menu Transaksi.',
    langkah: [
      'Buka Pengaturan, isi nama lembaga, alamat, kota, nama pimpinan, dan nama bendahara. Isi juga saldo awal kas — uang kas yang sudah ada sebelum memakai aplikasi.',
      'Periksa Data master → Kelas, Jenis kewajiban, Komponen gaji, dan Kategori kas. Data bawaan sudah terisi; sesuaikan nama dan nominalnya dengan lembaga Anda.',
      'Masukkan data ustadz/ustadzah beserta tarif honornya.',
      'Masukkan data santri — satu per satu, atau sekaligus dengan tombol Impor dari Excel.',
      'Buat tagihan bulan berjalan di Tagihan santri → Buat tagihan → Per kelas / massal.',
      'Mulai terima pembayaran di menu Terima pembayaran.',
    ],
    catatan: ['Jika ada petugas lain (misalnya bendahara), admin menambahkan akunnya di menu Pengguna.'],
  },
  {
    id: 'pengaturan', grup: 'Mulai di sini', judul: 'Pengaturan lembaga', link: '/pengaturan', admin: true,
    ringkas: 'Identitas lembaga (untuk kwitansi, slip, rapor, dan kop laporan), rekening kas, metode pembayaran, tutup buku, dan cadangan data.',
    catatan: [
      'Rekening kas: daftarkan tempat uang disimpan, misalnya "Kas tunai" dan "Bank BSI", masing-masing dengan saldo awalnya. Saldo awal cukup diisi sekali; koreksi saldo dilakukan lewat transaksi, bukan dengan mengubah saldo awal.',
      'Metode pembayaran: tentukan setiap metode masuk ke rekening mana, misalnya Cash → Kas tunai, Transfer → Bank BSI. Saat mencatat transaksi, rekening terisi otomatis dan masih bisa diganti.',
      'Tutup buku: setelah laporan bulan dicetak, kunci periodenya (tombol "Kunci s.d. akhir bulan lalu"). Transaksi kas bertanggal di dalam periode terkunci tidak bisa ditambah, diubah, atau dihapus — tombolnya berganti ikon gembok. Admin bisa membuka kunci bila perlu koreksi.',
      'Cadangan data: klik "Unduh cadangan" untuk menyimpan seluruh data ke satu file (.json); simpan di Google Drive atau flashdisk setiap minggu. "Versi Excel" berisi data yang sama untuk dibuka di Excel. Dashboard mengingatkan bila cadangan terakhir lebih dari 7 hari.',
      'Pulihkan: pilih file cadangan (.json), periksa ringkasannya, ketik PULIHKAN, lalu konfirmasi. Data dengan ID sama akan ditimpa isi cadangan.',
      'Tombol "Isi data default" hanya mengisi data master yang masih kosong, tidak menimpa data yang sudah ada.',
    ],
  },
  {
    id: 'santri', grup: 'Data master', judul: 'Data santri', link: '/master/santri',
    ringkas: 'ID santri (S0001, S0002, dan seterusnya) dibuat otomatis dan tidak berubah.',
    langkah: [
      'Klik Tambah santri, isi minimal nama santri dan kelas, lalu klik Simpan.',
      'Isi No. HP orang tua/wali agar tombol pengingat dan kirim kwitansi lewat WhatsApp bisa dipakai.',
    ],
    catatan: [
      'Impor dari Excel: siapkan kolom berurutan NIS, Nama, Jenis kelamin (L/P), Tempat lahir, Tanggal lahir, Alamat, Ayah, Ibu, Wali, No. HP, Kelas, Tahun masuk. Blok barisnya, salin, lalu tempel di jendela Impor. Kelas yang belum ada dibuat otomatis.',
      'Santri keluar atau lulus jangan dihapus — ubah Status menjadi Nonaktif atau Lulus. Riwayat pembayarannya tetap tersimpan dan ia tidak ikut ditagih lagi.',
      'Santri yang sudah punya tagihan tidak bisa dihapus.',
      'Membetulkan nama santri otomatis ikut memperbarui nama di tagihan dan riwayat pembayarannya.',
      'Keringanan tetap: di form santri, klik "Tambah keringanan", pilih jenis kewajiban lalu isi persen (mis. 50%) atau rupiah, dan alasannya. Setiap kali tagihan dibuat, potongan ini diterapkan otomatis dan tercatat di tagihan. Santri dengan keringanan diberi label di daftar santri.',
    ],
  },
  {
    id: 'ustadz', grup: 'Data master', judul: 'Ustadz & ustadzah', link: '/master/ustadz',
    ringkas: 'Tarif honor diisi di sini dan otomatis dipakai untuk komponen "Honor Mengajar" saat membuat slip gaji.',
    catatan: ['Nomor rekening dan nama bank ikut tercetak di slip gaji.', 'Pengajar yang berhenti cukup diubah statusnya menjadi Nonaktif.'],
  },
  {
    id: 'kelas', grup: 'Data master', judul: 'Kelas & kelompok', link: '/master/kelas',
    ringkas: 'Dipakai untuk mengelompokkan santri dan membuat tagihan massal per kelas.',
    catatan: ['Mengganti nama kelas otomatis memperbarui kelas di semua data santri.', 'Kelas yang masih berisi santri tidak bisa dihapus.'],
  },
  {
    id: 'kewajiban', grup: 'Data master', judul: 'Jenis kewajiban', link: '/master/kewajiban',
    ringkas: 'Daftar pembayaran yang bisa ditagihkan: Syahriyah/SPP, LKS, daftar ulang, seragam, dan lainnya.',
    catatan: [
      'Nominal default otomatis terisi saat membuat tagihan, tetapi tetap bisa diubah per tagihan.',
      'Kategori kas menentukan ke kategori mana uang pembayaran dicatat di buku kas dan laporan.',
      'Kewajiban yang tidak dipakai lagi cukup dijadikan Nonaktif agar tidak muncul di pilihan.',
    ],
  },
  {
    id: 'komponen', grup: 'Data master', judul: 'Komponen gaji', link: '/master/komponen',
    ringkas: 'Unsur penyusun slip gaji: honor, tunjangan, bonus, insentif, dan potongan.',
    catatan: [
      'Jenis Pendapatan menambah gaji, jenis Potongan mengurangi.',
      '"Pakai tarif honor ustadz = Ya" berarti nominalnya diambil dari tarif masing-masing ustadz.',
      '"Dikalikan jumlah hadir = Ya" berarti nominal default adalah honor per kehadiran; di slip otomatis dikalikan jumlah hadir ustadz bulan itu dari menu Absensi.',
      'Komponen pendapatan dengan nominal default lebih dari 0 otomatis muncul di slip baru; hapus dari slip jika tidak berlaku.',
    ],
  },
  {
    id: 'akun', grup: 'Data master', judul: 'Kategori kas', link: '/master/akun',
    ringkas: 'Pengelompokan pemasukan dan pengeluaran di buku kas serta laporan keuangan.',
    catatan: [
      'Kategori "Gaji/Honor" dipakai otomatis oleh modul gaji dan tidak bisa diganti nama atau dihapus.',
      'Mengganti nama kategori ikut memperbarui semua catatan buku kas dan laporan yang memakai kategori itu.',
      'Kategori baru bisa ditambah kapan saja, misalnya "Perbaikan Gedung".',
    ],
  },
  {
    id: 'tagihan', grup: 'Transaksi', judul: 'Tagihan santri', link: '/tagihan',
    ringkas: 'Tagihan adalah kewajiban satu santri untuk satu jenis pembayaran pada satu periode. Setiap pembayaran mengurangi tagihan.',
    langkah: [
      'Setiap awal bulan: klik Tagihan bulanan. Semua jenis kewajiban berperiode Bulanan (Syahriyah, Kegiatan, dll.) langsung disiapkan untuk seluruh santri aktif — centang yang ingin dibuat, lalu klik Buat. Dashboard mengingatkan bila tagihan bulanan belum dibuat.',
      'Untuk tagihan lain (LKS, seragam, daftar ulang): klik Buat tagihan.',
      'Pilih Per kelas / massal (kosongkan kelas untuk semua santri aktif) atau Satu santri.',
      'Pilih jenis kewajiban, periode (bulan dan tahun), lalu periksa nominalnya.',
      'Baca ringkasan di bawah form — jumlah santri yang akan ditagih dan totalnya — lalu klik Buat tagihan.',
    ],
    catatan: [
      'Santri yang sudah punya tagihan jenis dan periode yang sama otomatis dilewati, jadi aman bila tagihan massal tidak sengaja dibuat dua kali.',
      'Untuk ratusan santri, proses butuh beberapa detik — kemajuannya terlihat di layar ("Membuat tagihan 85 dari 200…"). Jangan tutup halaman sampai selesai. Jika internet putus di tengah jalan, klik Buat tagihan lagi: yang sudah tersimpan dilewati, sisanya dilanjutkan.',
      'Keringanan atau potongan: klik ikon pensil pada tagihan, ubah nominalnya, dan tulis keterangannya (misalnya "keringanan anak yatim").',
      'Keringanan tetap santri diterapkan otomatis (bisa dimatikan di form Buat tagihan). Tagihan dengan keringanan menampilkan besar potongannya.',
      'Status tagihan berubah sendiri: Belum bayar → Sebagian → Lunas.',
      'Tagihan hanya bisa dihapus admin, dan hanya jika belum ada pembayarannya.',
    ],
  },
  {
    id: 'pembayaran', grup: 'Transaksi', judul: 'Menerima pembayaran', link: '/pembayaran',
    ringkas: 'Satu kali penerimaan uang bisa melunasi beberapa tagihan sekaligus dan menghasilkan satu kwitansi.',
    langkah: [
      'Buka Terima pembayaran, ketik nama atau ID santri, lalu tekan Enter atau klik namanya.',
      'Centang tagihan yang dibayar. Nominal otomatis terisi sebesar sisa tagihan.',
      'Jika bayar sebagian (cicilan), ubah nominalnya sesuai uang yang diterima.',
      'Periksa tanggal, metode, dan rekening tujuan, lalu klik Simpan pembayaran.',
      'Klik Cetak kwitansi untuk mencetak, atau Kirim ke WhatsApp wali untuk mengirim rinciannya.',
    ],
    catatan: [
      'Cicilan berikutnya dicatat dengan cara yang sama; sisa tagihan sudah terhitung otomatis.',
      'Nominal tidak bisa melebihi sisa tagihan.',
      'Satu kwitansi berisi maksimal 8 tagihan. Jika wali melunasi lebih dari 8 tagihan sekaligus, simpan sisanya sebagai pembayaran kedua.',
      'Kwitansi lama bisa dicetak ulang atau dikirim ulang ke WhatsApp dari tab Riwayat atau dari Kartu santri.',
      'Salah tanggal, metode, atau nominal? Klik ikon pensil (Ubah) di tab Riwayat. Tagihan dan buku kas ikut disesuaikan. Admin juga bisa mengisi 0 pada salah satu tagihan untuk mengeluarkannya dari pembayaran itu.',
      'Pembayaran yang sama sekali salah dihapus admin lewat ikon tempat sampah (Hapus) di tab Riwayat. Tagihannya kembali terbuka dan catatan kasnya ikut terhapus.',
    ],
  },
  {
    id: 'gaji', grup: 'Transaksi', judul: 'Gaji & honor', link: '/gaji',
    ringkas: 'Setiap slip yang disimpan otomatis tercatat sebagai pengeluaran kas kategori Gaji/Honor.',
    langkah: [
      'Klik Buat slip gaji dan pilih ustadz/ustadzah.',
      'Pilih periode, tanggal bayar, dan metode.',
      'Periksa komponen yang terisi otomatis. Tambah komponen lain (tunjangan, bonus, potongan) lewat pilihan "+ Tambah komponen", dan hapus yang tidak berlaku dengan tanda ×.',
      'Pastikan total diterima sudah benar, lalu klik Simpan slip.',
      'Cetak slip lewat ikon printer, atau kirim rinciannya ke ustadz lewat ikon WhatsApp.',
    ],
    catatan: [
      'Aplikasi memberi peringatan jika orang yang sama sudah punya slip di periode yang sama.',
      'Slip yang salah bisa diubah lewat ikon pensil (tanggal, periode, metode, dan komponen). Buku kas ikut disesuaikan.',
      'Slip yang tidak jadi dibayarkan dihapus admin lewat ikon tempat sampah.',
    ],
  },
  {
    id: 'kas', grup: 'Transaksi', judul: 'Pengeluaran & pemasukan lain', link: '/pengeluaran',
    ringkas: 'Pengeluaran untuk belanja dan biaya operasional selain gaji. Pemasukan lain untuk donasi, sumbangan, dan bantuan — selain pembayaran santri.',
    langkah: [
      'Buka Pengeluaran (atau Pemasukan lain), lalu klik Catat.',
      'Isi tanggal, kategori, keterangan, dan nominal. Nomor nota atau bukti boleh diisi untuk arsip.',
      'Klik Simpan. Catatan langsung masuk ke buku kas.',
    ],
    catatan: ['Pembayaran santri jangan dicatat di Pemasukan lain — gunakan menu Terima pembayaran agar tagihannya ikut berkurang.'],
  },
  {
    id: 'hafalan', grup: 'Akademik', judul: 'Setoran hafalan', link: '/hafalan',
    ringkas: 'Mutaba\'ah hafalan Al-Qur\'an: catat setiap setoran ziyadah (hafalan baru) dan muraja\'ah. Progres juz santri dihitung otomatis.',
    langkah: [
      'Buka Setoran hafalan, klik Catat setoran.',
      'Pilih santri. Aplikasi menyarankan melanjutkan dari ayat ziyadah terakhirnya.',
      'Pilih jenis (Ziyadah atau Muraja\'ah), surat, dan rentang ayat.',
      'Pilih nilai (Mumtaz, Jayyid Jiddan, Jayyid, Maqbul, atau Ulang) dan penyimak, lalu Simpan.',
    ],
    catatan: [
      'Hanya ziyadah yang lulus (nilai selain Ulang) dihitung sebagai hafalan. Ayat yang disetor dua kali tidak dihitung ganda.',
      'Tab Progres santri menampilkan jumlah ayat hafal, persen mushaf, dan juz selesai per santri. Klik nama santri untuk melihat 30 kotak juz dan riwayat setorannya.',
      'Satu setoran untuk satu surat. Jika dalam satu pertemuan menyetor beberapa surat pendek, catat masing-masing.',
    ],
  },
  {
    id: 'absensi', grup: 'Akademik', judul: 'Absensi', link: '/absensi',
    ringkas: 'Kehadiran santri per kelas dan kehadiran ustadz: Hadir, Izin, Sakit, atau Alpa.',
    langkah: [
      'Pilih tanggal dan kelas (atau Ustadz/ustadzah).',
      'Semua otomatis Hadir; ubah yang tidak hadir dengan menekan I, S, atau A.',
      'Klik Simpan absensi. Absensi yang sudah tersimpan bisa diubah dengan cara yang sama.',
    ],
    catatan: [
      'Tab Rekap bulanan menampilkan jumlah hadir, izin, sakit, alpa, dan persen kehadiran per orang, dan bisa diekspor ke Excel.',
      'Kehadiran ustadz dipakai untuk komponen gaji "dikalikan jumlah hadir".',
    ],
  },
  {
    id: 'rapor', grup: 'Akademik', judul: 'Rapor santri', link: '/rapor',
    ringkas: 'Rapor berisi hafalan, kehadiran, adab, kedisiplinan, dan catatan ustadz untuk satu periode (default: semester berjalan).',
    langkah: [
      'Pilih santri dan periode.',
      'Isi adab, kedisiplinan, dan catatan ustadz di kotak Isian rapor, lalu Simpan isian.',
      'Klik Cetak (A4) atau Kirim ke WhatsApp (gambar rapor).',
    ],
  },
  {
    id: 'bukukas', grup: 'Kas & laporan', judul: 'Buku kas', link: '/buku-kas',
    ringkas: 'Semua uang masuk dan keluar dari seluruh menu, diurutkan per tanggal, dengan saldo berjalan. Tidak ada saldo yang diketik manual.',
    catatan: [
      'Pilih Rekening untuk melihat buku kas satu rekening saja (mis. hanya Kas tunai) lengkap dengan saldonya.',
      'Pindah dana: untuk setor uang tunai ke bank atau tarik tunai. Klik Pindah dana, pilih rekening asal dan tujuan, isi nominal. Pindah dana tidak dihitung sebagai pemasukan/pengeluaran lembaga — hanya memindahkan saldo.',
      'Pilih rentang tanggal untuk melihat periode tertentu. Saldo awal periode dihitung otomatis dari semua transaksi sebelumnya.',
      'Saat filter jenis atau pencarian dipakai, kolom saldo disembunyikan agar tidak menyesatkan.',
      'Cocokkan saldo akhir dengan uang kas fisik secara rutin.',
    ],
  },
  {
    id: 'laporan', grup: 'Kas & laporan', judul: 'Laporan', link: '/laporan/keuangan',
    ringkas: 'Semua laporan bisa dicetak lengkap dengan kop dan tanda tangan, serta diekspor ke CSV untuk dibuka di Excel.',
    catatan: [
      'Laporan keuangan: saldo awal, pemasukan, pengeluaran, saldo akhir, dan rincian per kategori untuk rentang tanggal yang dipilih.',
      'Tunggakan: daftar santri yang masih punya sisa kewajiban dari semua periode. Ikon WhatsApp mengirim pengingat berisi rincian tunggakan ke wali.',
      'Kartu santri: seluruh riwayat tagihan dan pembayaran satu santri — berguna saat wali menanyakan status pembayaran.',
      'Dashboard: ringkasan satu bulan, saldo tiap rekening, dan pengingat (tagihan bulanan, cadangan data). Ganti bulan dan tahun di pojok kanan atas.',
      'Semua tombol Ekspor menghasilkan file Excel (.xlsx) dengan angka yang sudah berformat.',
    ],
  },
  {
    id: 'portal', grup: 'Kas & laporan', judul: 'Portal wali', link: '/laporan/kartu-santri',
    ringkas: 'Tautan khusus agar wali bisa memantau tagihan, riwayat pembayaran, hafalan, dan kehadiran ananda dari HP — tanpa akun dan tanpa login.',
    langkah: [
      'Buka Kartu santri dan pilih santrinya.',
      'Di kotak Portal wali, klik Buat tautan portal.',
      'Klik Kirim ke wali untuk mengirim tautannya lewat WhatsApp, atau Salin.',
    ],
    catatan: [
      'Isi portal diperbarui otomatis setiap ada pembayaran, tagihan, setoran hafalan, atau absensi baru. Tombol Perbarui memaksa pembaruan saat itu juga.',
      'Portal tidak menampilkan alamat atau nomor HP. Siapa pun yang memegang tautan bisa membukanya, jadi minta wali tidak membagikannya.',
      'Jika tautan tersebar ke orang lain, klik Nonaktifkan lalu buat tautan baru — tautan lama langsung tidak berlaku.',
    ],
  },
  {
    id: 'pengguna', grup: 'Sistem', judul: 'Pengguna & hak akses', link: '/pengguna', admin: true,
    ringkas: 'Setiap pengguna diberi izin sesuai tugasnya. Izin dijaga di aplikasi dan di database, jadi pengguna benar-benar tidak bisa membuka data di luar izinnya — misalnya guru tidak bisa melihat keuangan dan gaji.',
    langkah: [
      'Buka Pengguna, klik Tambah pengguna.',
      'Isi nama, email, dan kata sandi awal.',
      'Pilih peran siap pakai (Bendahara, Kasir, Guru, Pimpinan, atau Admin), atau centang izinnya satu per satu.',
      'Berikan email dan kata sandinya kepada yang bersangkutan. Hak akses bisa diubah kapan saja lewat tombol Hak akses dan langsung berlaku.',
    ],
    catatan: [
      'Keuangan: tagihan, pembayaran (termasuk mengubah), gaji, pengeluaran, pemasukan, buku kas, dan data master keuangan.',
      'Terima pembayaran (kasir): hanya menerima pembayaran, mencetak/mengirim kwitansi, dan melihat kartu pembayaran santri. Tidak bisa mengubah pembayaran atau melihat buku kas.',
      'Pendidikan (guru): data santri, kelas, ustadz (tanpa tarif honor), setoran hafalan, absensi, dan rapor. Tidak bisa melihat data keuangan maupun gaji.',
      'Lihat laporan keuangan: dashboard keuangan, buku kas, laporan, dan tunggakan — hanya melihat.',
      'Menyetujui pengeluaran: menyetujui atau menolak pengajuan pengeluaran di menu Persetujuan.',
      'Admin: semua izin, ditambah menghapus data, membatalkan transaksi, pengaturan, pengguna, dan log aktivitas.',
      'Log aktivitas (khusus admin): catatan siapa menambah, mengubah, atau menghapus data, dan kapan.',
      'Atur login: admin bisa langsung mengganti email atau kata sandi seorang pengguna tanpa lewat email.',
      'Petugas yang berhenti cukup dinonaktifkan — ia tidak bisa masuk lagi, tetapi catatan transaksinya tetap ada.',
    ],
  },
  {
    id: 'persetujuan', grup: 'Transaksi', judul: 'Persetujuan pengeluaran', link: '/persetujuan',
    ringkas: 'Pengeluaran di atas batas tertentu wajib disetujui (misalnya oleh pimpinan) sebelum tercatat di buku kas. Diaktifkan admin di Pengaturan → Persetujuan pengeluaran.',
    langkah: [
      'Bendahara mencatat pengeluaran seperti biasa. Jika nominalnya di atas batas, form berubah menjadi Ajukan pengeluaran dan terkirim sebagai pengajuan.',
      'Penyetuju melihat angka di menu Persetujuan dan pengingat di Dashboard, lalu membuka pengajuannya.',
      'Klik Setujui — pengeluaran langsung tercatat di buku kas dengan nama penyetuju. Atau klik Tolak dan tulis alasannya.',
      'Pengajuan yang ditolak terlihat di Pengeluaran → tab Pengajuan beserta alasannya. Klik Perbaiki & ajukan ulang bila perlu.',
    ],
    catatan: [
      'Selama belum disetujui, pengajuan tidak mengurangi saldo kas.',
      'Pengeluaran di bawah batas, dan pengeluaran yang dicatat oleh pengguna berizin Menyetujui, langsung tercatat tanpa pengajuan.',
      'Pengeluaran yang sudah disetujui hanya bisa diubah nominalnya oleh penyetuju.',
    ],
  },
  {
    id: 'akun-saya', grup: 'Sistem', judul: 'Akun saya', link: '/akun',
    ringkas: 'Setiap pengguna bisa mengganti nama tampilan dan kata sandinya sendiri. Buka dari menu Akun saya, atau klik nama Anda di pojok kiri bawah.',
    langkah: [
      'Isi kata sandi lama.',
      'Isi kata sandi baru (minimal 6 karakter) dan ulangi sekali lagi.',
      'Klik Ganti kata sandi. Gunakan kata sandi baru saat masuk berikutnya.',
    ],
    catatan: ['Lupa kata sandi lama? Minta admin mengaturkan kata sandi baru lewat menu Pengguna → Atur login.', 'Email login hanya bisa diganti oleh admin.'],
  },
  {
    id: 'pasang', grup: 'Bantuan', judul: 'Pasang di HP',
    ringkas: 'Aplikasi bisa dipasang seperti aplikasi biasa: ada ikon di layar utama dan terbuka layar penuh.',
    catatan: [
      'Android (Chrome): buka alamat aplikasi, ketuk menu ⋮ → "Instal aplikasi" atau "Tambahkan ke layar utama".',
      'iPhone (Safari): ketuk tombol Bagikan → "Tambah ke Layar Utama".',
      'Komputer (Chrome/Edge): klik ikon pasang di ujung kanan kolom alamat.',
    ],
  },
  {
    id: 'cetak', grup: 'Bantuan', judul: 'Mencetak & mengirim bukti',
    ringkas: 'Kwitansi otomatis diatur untuk kertas A5 mendatar, slip gaji A5 tegak, laporan keuangan A4 tegak, buku kas dan tunggakan A4 mendatar. Hasil cetak polos tanpa latar belakang, hemat tinta.',
    catatan: [
      'Di jendela cetak, pilih printer atau "Simpan sebagai PDF".',
      'Jika tampilan terpotong, atur Skala ke "Sesuaikan dengan halaman" (Fit to page) dan matikan "Header dan footer".',
      'Tombol Kirim ke WhatsApp di halaman kwitansi dan slip gaji mengirim bukti dalam bentuk gambar. Di HP akan muncul pilihan aplikasi — pilih WhatsApp, lalu pilih kontaknya. Di komputer, gambar diunduh dan WhatsApp terbuka dengan pesannya; lampirkan gambar yang baru diunduh.',
      '"Kirim teks saja" mengirim rincian pembayaran tanpa gambar — paling cepat.',
      'Nomor tujuan diambil dari No. HP wali (data santri) atau No. HP ustadz. Jika kosong, WhatsApp meminta Anda memilih kontak.',
    ],
  },
  {
    id: 'tanya', grup: 'Bantuan', judul: 'Pertanyaan umum',
    tanya: [
      ['Wali membayar sebelum tagihannya dibuat. Bagaimana?', 'Buat dulu tagihannya (Tagihan santri → Buat tagihan → Satu santri), lalu catat pembayarannya.'],
      ['Wali membayar untuk dua bulan sekaligus.', 'Pastikan tagihan kedua bulan sudah dibuat, lalu centang keduanya dalam satu kali pembayaran. Hasilnya satu kwitansi.'],
      ['Saya salah memasukkan nominal pembayaran.', 'Admin membatalkan pembayaran itu di Terima pembayaran → Riwayat, lalu input ulang dengan nominal yang benar.'],
      ['Saldo di aplikasi tidak sama dengan uang di kas.', 'Periksa Buku kas pada rentang tanggal terkait — biasanya ada pengeluaran atau pemasukan yang belum dicatat. Catat selisihnya sebagai transaksi, jangan mengubah saldo awal.'],
      ['Muncul pesan "Anda tidak punya izin".', 'Tindakan itu khusus admin, misalnya menghapus. Minta admin melakukannya, atau hubungi admin jika Anda seharusnya punya akses.'],
      ['Saya lupa kata sandi.', 'Di halaman masuk klik "Lupa kata sandi", isi email, lalu klik Kirim tautan. Buka email dari alamat berakhiran firebaseapp.com (periksa juga folder Spam), klik tautannya, dan buat kata sandi baru. Tautan berlaku sekitar 1 jam. Cara paling cepat: minta admin mengganti kata sandi Anda langsung di menu Pengguna → Atur login.'],
      ['Email atur ulang kata sandi tidak pernah masuk.', 'Periksa folder Spam/Promosi. Pastikan email yang diketik sama persis dengan yang didaftarkan — demi keamanan, aplikasi tidak memberi tahu apakah sebuah email terdaftar, jadi salah ketik pun tetap terlihat "terkirim". Akun yang dibuat dengan email fiktif tidak bisa menerima email; minta admin membuatkan akun baru dengan email yang aktif.'],
      ['Apakah bisa dibuka di HP?', 'Bisa. Buka alamat aplikasi di browser HP dan masuk dengan akun yang sama. Datanya sama di semua perangkat.'],
      ['Transaksi lama tidak bisa diubah, ada ikon gembok.', 'Periode itu sudah ditutup buku. Admin dapat membuka kunci di Pengaturan → Tutup buku, melakukan koreksi, lalu mengunci lagi.'],
      ['Uang tunai disetor ke bank. Dicatat di mana?', 'Di Buku kas → Pindah dana, dari Kas tunai ke rekening bank. Jangan dicatat sebagai pengeluaran.'],
      ['Bagaimana jika internet putus saat mencatat?', 'Data yang sudah tampil tetap bisa dilihat. Tunggu sampai koneksi kembali sebelum menyimpan pembayaran atau gaji.'],
    ],
  },
];
