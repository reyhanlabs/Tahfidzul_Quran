/**
 * Cadangan & pemulihan data. Cadangan = satu file JSON berisi semua koleksi lembaga
 * (tanpa akun pengguna). Pemulihan menulis ulang dokumen dengan ID yang sama.
 */
import { collection, doc, getDocs, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { MAX_TULIS } from './ops';
import { catat } from './log';
import { downloadExcelMulti } from './excel';
import { todayISO } from './format';

export const KOLEKSI_CADANGAN = ['settings', 'kelas', 'santri', 'ustadz', 'kewajiban', 'komponen', 'akun',
  'tagihan', 'pembayaran', 'gaji', 'kas', 'counters', 'hafalan', 'hafalanRingkas', 'absensi', 'rapor'];

const keJson = (v) => {
  if (v && typeof v === 'object') {
    if (typeof v.toMillis === 'function') return { __ts: v.toMillis() };
    if (Array.isArray(v)) return v.map(keJson);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, keJson(x)]));
  }
  return v;
};
const dariJson = (v) => {
  if (v && typeof v === 'object') {
    if ('__ts' in v && Object.keys(v).length === 1) return Timestamp.fromMillis(v.__ts);
    if (Array.isArray(v)) return v.map(dariJson);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dariJson(x)]));
  }
  return v;
};

async function ambilSemua(onProgress) {
  const data = {};
  for (let i = 0; i < KOLEKSI_CADANGAN.length; i++) {
    const c = KOLEKSI_CADANGAN[i];
    onProgress?.(`Membaca ${c}…`);
    const s = await getDocs(collection(db, c));
    data[c] = Object.fromEntries(s.docs.map((d) => [d.id, keJson(d.data())]));
  }
  return data;
}

async function tandai() {
  await setDoc(doc(db, 'settings', 'lembaga'), { cadanganTerakhir: todayISO() }, { merge: true }).catch(() => {});
}

export async function unduhCadanganJson(namaLembaga, onProgress) {
  const data = await ambilSemua(onProgress);
  const isi = { aplikasi: 'PPMTQ', versi: 2, dibuat: new Date().toISOString(), lembaga: namaLembaga, data };
  const blob = new Blob([JSON.stringify(isi)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `cadangan-ppmtq-${todayISO()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  await tandai();
  catat('cadangan', 'data', 'unduh JSON');
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Object.keys(v).length]));
}

export async function unduhCadanganExcel(onProgress) {
  const data = await ambilSemua(onProgress);
  const flat = (v) => (v && typeof v === 'object' ? ('__ts' in v ? new Date(v.__ts).toISOString() : JSON.stringify(v)) : v);
  const sheets = Object.entries(data).filter(([, docs]) => Object.keys(docs).length).map(([c, docs]) => {
    const rows = Object.entries(docs);
    const keys = [...new Set(rows.flatMap(([, d]) => Object.keys(d)))];
    return { nama: c, headers: ['id', ...keys], rows: rows.map(([id, d]) => [id, ...keys.map((k) => flat(d[k]))]) };
  });
  await downloadExcelMulti(`cadangan-ppmtq-${todayISO()}.xlsx`, sheets);
  await tandai();
  catat('cadangan', 'data', 'unduh Excel');
}

/** Baca file cadangan JSON dan kembalikan ringkasannya (belum ditulis). */
export async function bacaCadangan(file) {
  const isi = JSON.parse(await file.text());
  if (isi?.aplikasi !== 'PPMTQ' || !isi.data) throw new Error('File ini bukan cadangan PPMTQ.');
  return isi;
}

/** Tulis ulang semua dokumen dari cadangan (dokumen yang ada ditimpa, yang tidak ada di cadangan dibiarkan). */
export async function pulihkan(isi, onProgress) {
  const pekerjaan = Object.entries(isi.data).filter(([c]) => KOLEKSI_CADANGAN.includes(c))
    .flatMap(([c, docs]) => Object.entries(docs).map(([id, d]) => [c, id, d]));
  for (let i = 0; i < pekerjaan.length; i += MAX_TULIS) {
    const b = writeBatch(db);
    pekerjaan.slice(i, i + MAX_TULIS).forEach(([c, id, d]) => b.set(doc(db, c, id), dariJson(d)));
    await b.commit();
    onProgress?.(`Memulihkan ${Math.min(i + MAX_TULIS, pekerjaan.length)} dari ${pekerjaan.length} dokumen…`);
  }
  await tandai(); // cadangan yang dipulihkan = kondisi terbaru yang tersimpan
  catat('pulihkan', 'data', `${pekerjaan.length} dokumen dari cadangan ${isi.dibuat?.slice(0, 10) || ''}`);
  return pekerjaan.length;
}
