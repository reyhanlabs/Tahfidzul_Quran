/** Operasi akademik: setoran hafalan, ringkasan hafalan per santri, absensi, catatan rapor. */
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { catat } from './log';
import { global, gabung, totalDariRentang, perJuz, jumlahAyat, namaSurah, lulusNilai, JUZ_JUMLAH as JUZ_PENUH } from './quran';
import { periodeKey } from './format';
import { perbaruiPortalSantri } from './portal';

const who = () => auth.currentUser?.email || '-';

// ---------------------------------------------------------------- Hafalan
/** data: { tanggal, santri, jenis, surat, ayatDari, ayatSampai, nilai, penyimak, catatan } */
export async function simpanSetoran(data, id) {
  const surat = Number(data.surat); const a = Number(data.ayatDari); const b = Number(data.ayatSampai);
  const maks = jumlahAyat(surat);
  if (!data.santri) throw new Error('Pilih santri.');
  if (!surat || !a || !b || a < 1 || b < a || b > maks) throw new Error(`Rentang ayat tidak valid. Surat ${namaSurah(surat)} berisi ${maks} ayat.`);
  const s = data.santri;
  const isi = {
    tanggal: data.tanggal, santriId: s.id, santriKode: s.kode, santriNama: s.nama, kelas: s.kelas || '',
    jenis: data.jenis, surat, ayatDari: a, ayatSampai: b, jumlahAyat: b - a + 1,
    nilai: data.nilai, lulus: lulusNilai(data.nilai),
    penyimakId: data.penyimak?.id || '', penyimakNama: data.penyimak?.nama || '', catatan: data.catatan || '',
  };
  if (id) await updateDoc(doc(db, 'hafalan', id), { ...isi, updatedAt: serverTimestamp(), updatedBy: who() });
  else await addDoc(collection(db, 'hafalan'), { ...isi, createdAt: serverTimestamp(), createdBy: who() });
  await hitungRingkasan(s);
  catat(id ? 'ubah' : 'tambah', 'hafalan', `${s.nama}: ${data.jenis} ${namaSurah(surat)} ${a}–${b} (${data.nilai})`);
  perbaruiPortalSantri(s.id);
}

export async function hapusSetoran(h, santri) {
  await deleteDoc(doc(db, 'hafalan', h.id));
  await hitungRingkasan(santri || { id: h.santriId, nama: h.santriNama, kelas: h.kelas, kode: h.santriKode });
  catat('hapus', 'hafalan', `${h.santriNama}: ${namaSurah(h.surat)} ${h.ayatDari}–${h.ayatSampai}`);
  perbaruiPortalSantri(h.santriId);
}

/** Hitung ulang ringkasan hafalan satu santri dari semua setoran ziyadah yang lulus. */
export async function hitungRingkasan(s) {
  const snap = await getDocs(query(collection(db, 'hafalan'), where('santriId', '==', s.id)));
  const semua = snap.docs.map((d) => d.data());
  const zi = semua.filter((h) => h.jenis === 'Ziyadah' && h.lulus);
  const ranges = gabung(zi.map((h) => [global(h.surat, h.ayatDari), global(h.surat, h.ayatSampai)]));
  const pj = perJuz(ranges);
  const urut = (x, y) => y.tanggal.localeCompare(x.tanggal) || (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0);
  const terbaru = [...semua].sort(urut)[0];
  const terakhirZi = [...zi].sort(urut)[0];
  await setDoc(doc(db, 'hafalanRingkas', s.id), {
    santriId: s.id, santriKode: s.kode || '', santriNama: s.nama, kelas: s.kelas || '',
    ranges: ranges.flat(), // disimpan datar [a1,b1,a2,b2,...] (Firestore tidak mendukung array bersarang)
    totalAyat: totalDariRentang(ranges), perJuz: pj, juzSelesai: pj.filter((x, i) => x > 0 && x === JUZ_PENUH[i]).length,
    jumlahSetoran: semua.length, setoranTerakhir: terbaru?.tanggal || '',
    terakhir: terakhirZi ? { surat: terakhirZi.surat, ayat: terakhirZi.ayatSampai } : null,
    updatedAt: serverTimestamp(),
  });
}

export const rangesDari = (flat = []) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); return r; };

// ---------------------------------------------------------------- Absensi
export const STATUS_HADIR = { H: 'Hadir', I: 'Izin', S: 'Sakit', A: 'Alpa' };
export const idAbsensi = (tanggal, jenis, grup) => `${tanggal}__${jenis}__${String(grup).replace(/[/\s]+/g, '_')}`;

export async function ambilAbsensi(tanggal, jenis, grup) {
  const s = await getDoc(doc(db, 'absensi', idAbsensi(tanggal, jenis, grup)));
  return s.exists() ? s.data() : null;
}

/** data: { id: 'H'|'I'|'S'|'A' } */
export async function simpanAbsensi(tanggal, jenis, grup, data, catatan = {}) {
  const [y, m] = tanggal.split('-').map(Number);
  await setDoc(doc(db, 'absensi', idAbsensi(tanggal, jenis, grup)), {
    tanggal, periodeKey: periodeKey(m, y), jenis, grup, data, catatan, updatedAt: serverTimestamp(), updatedBy: who(),
  });
  const n = Object.values(data);
  catat('simpan', 'absensi', `${jenis === 'ustadz' ? 'Ustadz' : grup} ${tanggal}: ${n.filter((x) => x === 'H').length}/${n.length} hadir`);
}

/** Rekap absensi per orang untuk satu bulan. */
export async function rekapAbsensi(key, jenis, grup) {
  const cons = [where('periodeKey', '==', key), where('jenis', '==', jenis)];
  if (grup) cons.push(where('grup', '==', grup));
  const s = await getDocs(query(collection(db, 'absensi'), ...cons));
  return hitungRekap(s.docs.map((d) => d.data()));
}
export function hitungRekap(docs) {
  const r = {};
  for (const d of docs) for (const [id, st] of Object.entries(d.data || {})) {
    r[id] ||= { H: 0, I: 0, S: 0, A: 0, hari: 0 };
    r[id][st] = (r[id][st] || 0) + 1; r[id].hari += 1;
  }
  return r;
}

/** Jumlah kehadiran ustadz pada satu bulan (dasar honor per kehadiran). */
export async function hadirUstadz(key) {
  return rekapAbsensi(key, 'ustadz');
}

// ---------------------------------------------------------------- Rapor
export const idRapor = (santriId, dari, sampai) => `${santriId}__${dari}__${sampai}`;
export async function ambilRapor(santriId, dari, sampai) {
  const s = await getDoc(doc(db, 'rapor', idRapor(santriId, dari, sampai)));
  return s.exists() ? s.data() : null;
}
export async function simpanRapor(santri, dari, sampai, isi) {
  await setDoc(doc(db, 'rapor', idRapor(santri.id, dari, sampai)), {
    santriId: santri.id, santriNama: santri.nama, dari, sampai, ...isi, updatedAt: serverTimestamp(), updatedBy: who(),
  });
  catat('simpan', 'rapor', `${santri.nama} ${dari} s.d. ${sampai}`);
}
