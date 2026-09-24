/**
 * Hak akses berbasis izin. Admin otomatis punya semua izin + kelola pengguna/pengaturan/log.
 * Izin ditegakkan dua lapis: tampilan aplikasi (menu, tombol) dan firestore.rules (server).
 */
export const IZIN = {
  keuangan: { label: 'Keuangan', ket: 'Tagihan, pembayaran, gaji, pengeluaran, pemasukan, buku kas, dan data master keuangan.' },
  kasir: { label: 'Terima pembayaran', ket: 'Menerima pembayaran santri, mencetak dan mengirim kwitansi. Tidak bisa mengubah atau melihat keuangan lain.' },
  akademik: { label: 'Pendidikan', ket: 'Data santri, kelas, ustadz, setoran hafalan, absensi, dan rapor. Tidak bisa melihat data keuangan.' },
  laporan: { label: 'Lihat laporan keuangan', ket: 'Dashboard keuangan, buku kas, laporan, dan tunggakan (hanya melihat).' },
  setujui: { label: 'Menyetujui pengeluaran', ket: 'Menyetujui atau menolak pengajuan pengeluaran kas.' },
};

export const PERAN = {
  bendahara: { label: 'Bendahara', izin: ['keuangan', 'laporan'] },
  kasir: { label: 'Kasir / penerima pembayaran', izin: ['kasir'] },
  guru: { label: 'Guru / bagian pendidikan', izin: ['akademik'] },
  pimpinan: { label: 'Pimpinan', izin: ['laporan', 'setujui', 'akademik'] },
};

/** Himpunan izin efektif dari profil pengguna (kompatibel dengan data lama role 'bendahara'). */
export function izinDari(profile) {
  if (!profile || profile.missing || !profile.aktif) return new Set();
  if (profile.role === 'admin') return new Set([...Object.keys(IZIN), 'admin']);
  if (Array.isArray(profile.izin)) return new Set(profile.izin);
  if (profile.role === 'bendahara') return new Set(PERAN.bendahara.izin);
  return new Set();
}

/** Aturan akses halaman/menu. Setiap fungsi menerima himpunan izin. */
const ada = (...xs) => (iz) => xs.some((x) => iz.has(x));
export const AKSES = {
  keuangan: ada('keuangan'),
  terimaBayar: ada('keuangan', 'kasir'),
  lihatKeuangan: ada('keuangan', 'laporan', 'setujui'),
  lihatTagihan: ada('keuangan', 'kasir', 'laporan', 'setujui'),
  masterSantri: ada('keuangan', 'akademik'),
  akademik: ada('akademik'),
  lihatAkademik: ada('akademik', 'laporan'),
  setujui: ada('setujui'),
  admin: ada('admin'),
  semua: () => true,
};

/** Nama peran untuk ditampilkan (mengenali kombinasi izin yang sama dengan peran bawaan). */
export function peranLabel(profile) {
  if (!profile) return '';
  if (profile.role === 'admin') return 'Admin';
  const iz = [...izinDari(profile)].sort().join(',');
  const cocok = Object.values(PERAN).find((p) => [...p.izin].sort().join(',') === iz);
  return cocok ? cocok.label : iz ? 'Akses khusus' : 'Tanpa akses';
}
