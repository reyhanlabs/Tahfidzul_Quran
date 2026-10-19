import { rupiah } from './format';

/**
 * Tarif khusus jenis kewajiban.
 *  kewajiban.dasarTarif = 'tetap' | 'angkatan' | 'kelas'
 *  kewajiban.tarif      = [{ kunci, nominal }]
 *    - angkatan: kunci = tahun masuk santri (mis. "2024")
 *    - kelas   : kunci = id kelas (tahan terhadap ganti nama kelas)
 *  Santri yang angkatan/kelasnya belum diatur memakai nominal default.
 *  Tarif khusus Rp0 berarti santri tersebut tidak dikenai kewajiban ini.
 */
export const DASAR_TARIF = [
  { value: 'tetap', label: 'Sama untuk semua santri' },
  { value: 'angkatan', label: 'Berbeda per angkatan (tahun masuk)' },
  { value: 'kelas', label: 'Berbeda per kelas' },
];

export const dasarDari = (kw) => (kw?.dasarTarif === 'angkatan' || kw?.dasarTarif === 'kelas' ? kw.dasarTarif : 'tetap');
export const pakaiTarifKhusus = (kw) => dasarDari(kw) !== 'tetap' && (kw.tarif || []).length > 0;

/** Kunci & label tarif untuk seorang santri. */
export function kunciTarif(kw, santri, kelasList = []) {
  const dasar = dasarDari(kw);
  if (dasar === 'angkatan') {
    const th = santri?.tahunMasuk ? String(santri.tahunMasuk) : '';
    return { kunci: th, label: th ? `Angkatan ${th}` : 'Angkatan belum diisi' };
  }
  if (dasar === 'kelas') {
    const k = kelasList.find((x) => x.nama === santri?.kelas);
    return { kunci: k?.id || '', label: santri?.kelas || 'Tanpa kelas' };
  }
  return { kunci: '', label: '' };
}

/** Nominal dasar (sebelum keringanan) untuk santri ini. */
export function tarifUntuk(kw, santri, kelasList = []) {
  const def = Number(kw?.nominal) || 0;
  if (dasarDari(kw) === 'tetap') return { nominal: def, sumber: '', khusus: false };
  const { kunci, label } = kunciTarif(kw, santri, kelasList);
  const t = kunci && (kw.tarif || []).find((x) => String(x.kunci) === kunci && x.nominal !== '' && x.nominal != null);
  return t
    ? { nominal: Number(t.nominal) || 0, sumber: label, khusus: true }
    : { nominal: def, sumber: `${label} (default)`, khusus: false };
}

/** Ringkasan per sumber tarif: [{ label, nominal, jumlah }] — untuk ditampilkan sebelum menyimpan. */
export function ringkasTarif(items) {
  const m = new Map();
  items.forEach((i) => {
    const key = `${i.sumberTarif || 'Default'}|${i.nominalAwal ?? i.nominal}`;
    const cur = m.get(key) || { label: i.sumberTarif || 'Default', nominal: i.nominalAwal ?? i.nominal, jumlah: 0 };
    cur.jumlah += 1;
    m.set(key, cur);
  });
  return [...m.values()].sort((a, b) => a.label.localeCompare(b.label, 'id', { numeric: true }));
}

/** Teks singkat untuk kolom daftar jenis kewajiban. */
export function teksTarif(kw, kelasList = []) {
  const dasar = dasarDari(kw);
  if (dasar === 'tetap' || !(kw.tarif || []).length) return '';
  const nama = (k) => (dasar === 'kelas' ? kelasList.find((x) => x.id === k)?.nama || '?' : k);
  return (kw.tarif || []).map((t) => `${nama(t.kunci)}: ${rupiah(t.nominal)}`).join(' · ');
}
