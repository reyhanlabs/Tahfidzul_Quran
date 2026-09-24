import { rupiah } from '../../lib/format';
import { Badge } from '../../components/ui';

/**
 * Konfigurasi halaman master. Menambah field baru cukup di sini.
 * type: text | textarea | number | money | date | select | bool
 */
export const MASTERS = {
  santri: {
    akses: 'masterSantri',
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
      { name: 'keringanan', label: 'Keringanan tetap (otomatis diterapkan saat membuat tagihan)', type: 'keringanan', span: 2, akses: 'keuangan' },
    ],
    columns: [
      { key: 'kode', label: 'ID' },
      { key: 'nama', label: 'Nama', render: (r) => <><p className="font-semibold">{r.nama}</p>{r.nis && <p className="text-xs text-muted">NIS {r.nis}</p>}</> },
      { key: 'kelas', label: 'Kelas' }, { key: 'jk', label: 'L/P', render: (r) => (r.jk ? r.jk.charAt(0) : '') },
      { key: 'wali', label: 'Orang tua / wali', render: (r) => r.namaWali || [r.namaAyah, r.namaIbu].filter(Boolean).join(' / ') },
      { key: 'hp', label: 'No. HP' },
      { key: 'status', label: 'Status', render: (r) => <span className="inline-flex flex-wrap gap-1"><Badge>{r.status}</Badge>{r.keringanan?.length > 0 && <Badge tone="SEBAGIAN">Keringanan</Badge>}</span> },
    ],
    filters: [{ name: 'kelas', label: 'Semua kelas', optionsFrom: 'kelas' }, { name: 'status', label: 'Semua status', options: ['Aktif', 'Nonaktif', 'Lulus'], default: 'Aktif' }],
    search: ['kode', 'nama', 'nis', 'namaAyah', 'namaIbu', 'namaWali'],
    refCheck: { col: 'tagihan', field: 'santriId', msg: 'Santri ini sudah punya tagihan. Ubah statusnya menjadi Nonaktif.' },
    cascade: [
      { col: 'tagihan', where: 'santriId', by: 'id', set: 'santriNama' },
      { col: 'pembayaran', where: 'santriId', by: 'id', set: 'santriNama' },
    ],
    importable: true,
  },
  ustadz: {
    akses: 'masterSantri',
    title: 'Ustadz & ustadzah', singular: 'ustadz/ustadzah',
    description: 'Tarif honor dipakai otomatis untuk komponen "Honor Mengajar" saat membuat slip gaji.',
    fields: [
      { name: 'nama', label: 'Nama', required: true, span: 2 },
      { name: 'nip', label: 'NIP / ID' }, { name: 'jk', label: 'Jenis kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'] },
      { name: 'jabatan', label: 'Jabatan' }, { name: 'hp', label: 'No. HP' },
      { name: 'alamat', label: 'Alamat', type: 'textarea', span: 2 },
      { name: 'tanggalGabung', label: 'Tanggal bergabung', type: 'date' },
      { name: 'tarif', label: 'Tarif honor', type: 'money', akses: 'keuangan' },
      { name: 'bank', label: 'Nama bank', akses: 'keuangan' }, { name: 'rekening', label: 'No. rekening', akses: 'keuangan' },
      { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif'], default: 'Aktif' },
      { name: 'keterangan', label: 'Keterangan' },
    ],
    columns: [
      { key: 'kode', label: 'ID' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'jabatan', label: 'Jabatan' },
      { key: 'hp', label: 'No. HP' }, { key: 'tarif', label: 'Tarif honor', money: true, akses: 'keuangan' }, { key: 'status', label: 'Status', badge: true },
    ],
    filters: [{ name: 'status', label: 'Semua status', options: ['Aktif', 'Nonaktif'], default: 'Aktif' }],
    search: ['kode', 'nama', 'jabatan', 'nip'],
    refCheck: { col: 'gaji', field: 'ustadzId', msg: 'Sudah ada slip gaji untuk orang ini. Ubah statusnya menjadi Nonaktif.' },
    cascade: [{ col: 'gaji', where: 'ustadzId', by: 'id', set: 'ustadzNama' }],
  },
  kelas: {
    akses: 'masterSantri',
    title: 'Kelas & kelompok', singular: 'kelas',
    description: 'Mengganti nama kelas otomatis memperbarui kelas pada data santri dan tagihan.',
    fields: [
      { name: 'nama', label: 'Nama kelas / kelompok', required: true, span: 2 },
      { name: 'wali', label: 'Wali kelas / pengajar' }, { name: 'keterangan', label: 'Keterangan' },
    ],
    columns: [
      { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'wali', label: 'Wali / pengajar' },
      { key: 'jumlah', label: 'Santri aktif', num: true }, { key: 'keterangan', label: 'Keterangan' },
    ],
    search: ['nama', 'wali'],
    unique: true,
    cascade: [
      { col: 'santri', where: 'kelas', set: 'kelas' },
      { col: 'tagihan', where: 'kelas', set: 'kelas' },
    ],
    refCheck: { col: 'santri', field: 'kelas', by: 'nama', msg: 'Kelas ini masih dipakai oleh data santri. Pindahkan santrinya dulu.' },
  },
  kewajiban: {
    akses: 'keuangan',
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
    unique: true,
    refCheck: { col: 'tagihan', field: 'kewajibanId', msg: 'Jenis kewajiban ini sudah dipakai di tagihan. Ubah statusnya menjadi Nonaktif.' },
    cascade: [
      { col: 'tagihan', where: 'kewajibanId', by: 'id', set: 'kewajibanNama' },
      { col: 'kas', where: 'kewajiban', set: 'kewajiban' },
    ],
  },
  komponen: {
    akses: 'keuangan',
    title: 'Komponen gaji', singular: 'komponen',
    description: 'Pendapatan menambah, potongan mengurangi gaji. Komponen yang memakai tarif honor mengambil nilai dari data ustadz.',
    fields: [
      { name: 'nama', label: 'Nama komponen', required: true, span: 2 },
      { name: 'jenis', label: 'Jenis', type: 'select', options: ['Pendapatan', 'Potongan'], default: 'Pendapatan' },
      { name: 'nominal', label: 'Nominal default', type: 'money' },
      { name: 'pakaiTarif', label: 'Pakai tarif honor ustadz', type: 'bool' },
      { name: 'perHadir', label: 'Dikalikan jumlah hadir (absensi ustadz)', type: 'bool', hint: 'Nominal default = honor per kehadiran.' },
      { name: 'status', label: 'Status', type: 'select', options: ['Aktif', 'Nonaktif'], default: 'Aktif' },
      { name: 'keterangan', label: 'Keterangan', span: 2 },
    ],
    columns: [
      { key: 'kode', label: 'Kode' }, { key: 'nama', label: 'Nama', strong: true }, { key: 'jenis', label: 'Jenis', badge: true },
      { key: 'nominal', label: 'Nominal default', money: true, render: (r) => (r.pakaiTarif ? <span className="text-muted text-xs">Tarif ustadz</span> : r.perHadir ? <span>{rupiah(r.nominal)} <span className="text-muted text-xs">/ hadir</span></span> : rupiah(r.nominal)) },
      { key: 'status', label: 'Status', badge: true },
    ],
    search: ['nama'],
    unique: true,
  },
  akun: {
    akses: 'keuangan',
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
    unique: true,
    locked: ['Gaji/Honor'],
    cascade: [
      { col: 'kewajiban', where: 'akun', set: 'akun' },
      { col: 'tagihan', where: 'akun', set: 'akun' },
      { col: 'kas', where: 'kategori', set: 'kategori' },
    ],
    refCheck: { col: 'kewajiban', field: 'akun', by: 'nama', msg: 'Kategori ini masih dipakai oleh jenis kewajiban. Ganti kategori kas di jenis kewajiban tersebut dulu.' },
  },
};
