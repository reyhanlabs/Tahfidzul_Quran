import { rupiah } from '../../lib/format';

/**
 * Konfigurasi halaman master. Menambah field baru cukup di sini.
 * type: text | textarea | number | money | date | select | bool
 */
export const MASTERS = {
  santri: {
    title: 'Data santri', singular: 'santri',
    description: 'ID santri dibuat otomatis. Santri yang keluar cukup diubah statusnya menjadi Nonaktif atau Lulus agar riwayatnya tetap ada.',
    fields: [
      { name: 'nama', label: 'Nama santri', required: true, span: 2 },
      { name: 'nis', label: 'NIS' }, { name: 'nik', label: 'NIK / NISN' },
      { name: 'jk', label: 'Jenis kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'] },
      { name: 'kelas', label: 'Kelas / kelompok', type: 'select', optionsFrom: 'kelas' },
      { name: 'tempatLahir', label: 'Tempat lahir' }, { name: 'tanggalLahir', label: 'Tanggal lahir', type: 'date' },
      { name: 'alamat', label: 'Alamat', type: 'textarea', span: 2 },
      { name: 'namaAyah', label: 'Nama ayah' }, { name: 'namaIbu', label: 'Nama ibu' },
      { name: 'namaWali', label: 'Nama wali' }, { name: 'hp', label: 'No. HP orang tua/wali', hint: 'Dipakai untuk pengingat WhatsApp.' },
      { name: 'tahunMasuk', label: 'Tahun masuk', type: 'number' },
      { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif', 'Lulus'], default: 'Aktif' },
      { name: 'keterangan', label: 'Keterangan', type: 'textarea', span: 2 },
    ],
    columns: [
      { key: 'kode', label: 'ID' },
      { key: 'nama', label: 'Nama', render: (r) => <><p className="font-semibold">{r.nama}</p>{r.nis && <p className="text-xs text-muted">NIS {r.nis}</p>}</> },
      { key: 'kelas', label: 'Kelas' }, { key: 'jk', label: 'L/P', render: (r) => (r.jk ? r.jk.charAt(0) : '') },
      { key: 'wali', label: 'Orang tua / wali', render: (r) => r.namaWali || [r.namaAyah, r.namaIbu].filter(Boolean).join(' / ') },
      { key: 'hp', label: 'No. HP' }, { key: 'status', label: 'Status', badge: true },
    ],
    filters: [{ name: 'kelas', label: 'Semua kelas', optionsFrom: 'kelas' }, { name: 'status', label: 'Semua status', options: ['Aktif', 'Nonaktif', 'Lulus'], default: 'Aktif' }],
    search: ['kode', 'nama', 'nis', 'namaAyah', 'namaIbu', 'namaWali'],
    refCheck: { col: 'tagihan', field: 'santriId', msg: 'Santri ini sudah punya tagihan. Ubah statusnya menjadi Nonaktif.' },
    importable: true,
  },
  ustadz: {
    title: 'Ustadz & ustadzah', singular: 'ustadz/ustadzah',
    description: 'Tarif honor dipakai otomatis untuk komponen "Honor Mengajar" saat membuat slip gaji.',
    fields: [
      { name: 'nama', label: 'Nama', required: true, span: 2 },
      { name: 'nip', label: 'NIP / ID' }, { name: 'jk', label: 'Jenis kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'] },
      { name: 'jabatan', label: 'Jabatan' }, { name: 'hp', label: 'No. HP' },
      { name: 'alamat', label: 'Alamat', type: 'textarea', span: 2 },
      { name: 'tanggalGabung', label: 'Tanggal bergabung', type: 'date' },
      { name: 'tarif', label: 'Tarif honor', type: 'money' },
      { name: 'bank', label: 'Nama bank' }, { name: 'rekening', label: 'No. rekening' },
      { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif'], default: 'Aktif' },
      { name: 'keterangan', label: 'Keterangan' },
    ],
    columns: [
      { key: 'kode', label: 'ID' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'jabatan', label: 'Jabatan' },
      { key: 'hp', label: 'No. HP' }, { key: 'tarif', label: 'Tarif honor', money: true }, { key: 'status', label: 'Status', badge: true },
    ],
    filters: [{ name: 'status', label: 'Semua status', options: ['Aktif', 'Nonaktif'], default: 'Aktif' }],
    search: ['kode', 'nama', 'jabatan', 'nip'],
    refCheck: { col: 'gaji', field: 'ustadzId', msg: 'Sudah ada slip gaji untuk orang ini. Ubah statusnya menjadi Nonaktif.' },
  },
  kelas: {
    title: 'Kelas & kelompok', singular: 'kelas',
    description: 'Mengganti nama kelas otomatis memperbarui kelas pada data santri.',
    fields: [
      { name: 'nama', label: 'Nama kelas / kelompok', required: true, span: 2 },
      { name: 'wali', label: 'Wali kelas / pengajar' }, { name: 'keterangan', label: 'Keterangan' },
    ],
    columns: [
      { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'wali', label: 'Wali / pengajar' },
      { key: 'jumlah', label: 'Santri aktif', num: true }, { key: 'keterangan', label: 'Keterangan' },
    ],
    search: ['nama', 'wali'],
    cascade: { col: 'santri', field: 'kelas' },
  },
  kewajiban: {
    title: 'Jenis kewajiban', singular: 'jenis kewajiban',
    description: 'Daftar pembayaran yang bisa ditagihkan ke santri. Kategori kas menentukan ke mana uang pembayaran dicatat di buku kas.',
    fields: [
      { name: 'nama', label: 'Nama kewajiban', required: true, span: 2 },
      { name: 'kategori', label: 'Kategori' },
      { name: 'nominal', label: 'Nominal default', type: 'money' },
      { name: 'periode', label: 'Periode', type: 'select', options: ['Bulanan', 'Tahunan', 'Sekali', 'Custom'], default: 'Bulanan' },
      { name: 'akun', label: 'Kategori kas (pemasukan)', type: 'select', optionsFrom: 'akunMasuk', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif'], default: 'Aktif' },
      { name: 'keterangan', label: 'Keterangan' },
    ],
    columns: [
      { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'kategori', label: 'Kategori' },
      { key: 'nominal', label: 'Nominal default', money: true }, { key: 'periode', label: 'Periode' },
      { key: 'akun', label: 'Kategori kas' }, { key: 'status', label: 'Status', badge: true },
    ],
    search: ['nama', 'kategori'],
  },
  komponen: {
    title: 'Komponen gaji', singular: 'komponen',
    description: 'Pendapatan menambah, potongan mengurangi gaji. Komponen yang memakai tarif honor mengambil nilai dari data ustadz.',
    fields: [
      { name: 'nama', label: 'Nama komponen', required: true, span: 2 },
      { name: 'jenis', label: 'Jenis', type: 'select', options: ['Pendapatan', 'Potongan'], default: 'Pendapatan' },
      { name: 'nominal', label: 'Nominal default', type: 'money' },
      { name: 'pakaiTarif', label: 'Pakai tarif honor ustadz', type: 'bool' },
      { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif'], default: 'Aktif' },
      { name: 'keterangan', label: 'Keterangan', span: 2 },
    ],
    columns: [
      { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'jenis', label: 'Jenis', badge: true },
      { key: 'nominal', label: 'Nominal default', money: true, render: (r) => (r.pakaiTarif ? <span className="text-muted text-xs">Tarif ustadz</span> : rupiah(r.nominal)) },
      { key: 'status', label: 'Status', badge: true },
    ],
    search: ['nama'],
  },
  akun: {
    title: 'Kategori kas', singular: 'kategori',
    description: 'Kategori untuk mengelompokkan pemasukan dan pengeluaran di buku kas dan laporan. Kategori "Gaji/Honor" dipakai modul gaji — jangan diganti namanya.',
    fields: [
      { name: 'nama', label: 'Nama kategori', required: true, span: 2 },
      { name: 'jenis', label: 'Jenis', type: 'select', options: ['Pemasukan', 'Pengeluaran'], default: 'Pengeluaran' },
      { name: 'keterangan', label: 'Keterangan' },
    ],
    columns: [
      { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'jenis', label: 'Jenis', badge: true },
      { key: 'keterangan', label: 'Keterangan' },
    ],
    filters: [{ name: 'jenis', label: 'Semua jenis', options: ['Pemasukan', 'Pengeluaran'] }],
    search: ['nama'],
    cascade: { col: 'kewajiban', field: 'akun' },
  },
};
