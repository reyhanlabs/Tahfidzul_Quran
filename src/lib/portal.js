/**
 * Portal wali: halaman baca-saja tanpa login untuk satu santri, diakses lewat tautan rahasia.
 * Isinya salinan ringkas (bukan data asli) yang disimpan di portal/{token} dan
 * diperbarui otomatis setiap ada pembayaran, tagihan, hafalan, atau absensi baru.
 */
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { catat } from './log';
import { periodeKey } from './format';

const ABJAD = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export function tokenBaru() {
  const a = new Uint32Array(28); crypto.getRandomValues(a);
  return Array.from(a, (x) => ABJAD[x % ABJAD.length]).join('');
}
export const tautanPortal = (token) => `${window.location.origin}/wali/${token}`;

async function susun(s, token) {
  const [tg, by, hr, hf, lembaga] = await Promise.all([
    getDocs(query(collection(db, 'tagihan'), where('santriId', '==', s.id))),
    getDocs(query(collection(db, 'pembayaran'), where('santriId', '==', s.id))),
    getDoc(doc(db, 'hafalanRingkas', s.id)),
    getDocs(query(collection(db, 'hafalan'), where('santriId', '==', s.id))),
    getDoc(doc(db, 'settings', 'lembaga')),
  ]);
  const n = new Date(); const key = periodeKey(n.getMonth() + 1, n.getFullYear());
  let hadir = null;
  if (s.kelas) {
    const ab = await getDocs(query(collection(db, 'absensi'), where('periodeKey', '==', key), where('jenis', '==', 'santri'), where('grup', '==', s.kelas)));
    hadir = { H: 0, I: 0, S: 0, A: 0 };
    ab.docs.forEach((d) => { const st = d.data().data?.[s.id]; if (st) hadir[st] += 1; });
  }
  const tagihan = tg.docs.map((d) => d.data());
  const ringkas = hr.exists() ? hr.data() : null;
  const L = lembaga.exists() ? lembaga.data() : {};
  return {
    token, santriId: s.id,
    lembaga: { nama: L.nama || '', alamat: L.alamat || '', telepon: L.telepon || '' },
    santri: { nama: s.nama, kode: s.kode, kelas: s.kelas || '', status: s.status || '' },
    tagihanTerbuka: tagihan.filter((t) => t.sisa > 0).sort((a, b) => a.periodeKey - b.periodeKey)
      .map((t) => ({ kewajiban: t.kewajibanNama, periodeKey: t.periodeKey, nominal: t.nominal, dibayar: t.dibayar, sisa: t.sisa })),
    totalSisa: tagihan.reduce((a, t) => a + (t.sisa > 0 ? t.sisa : 0), 0),
    pembayaran: by.docs.map((d) => d.data()).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 12)
      .map((p) => ({ no: p.no, tanggal: p.tanggal, total: p.total, metode: p.metode, rincian: p.items.map((i) => ({ kewajiban: i.kewajibanNama, periodeKey: i.periodeKey, bayar: i.bayar })) })),
    hafalan: ringkas ? { totalAyat: ringkas.totalAyat, perJuz: ringkas.perJuz, juzSelesai: ringkas.juzSelesai, setoranTerakhir: ringkas.setoranTerakhir } : null,
    setoran: hf.docs.map((d) => d.data()).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 10)
      .map((h) => ({ tanggal: h.tanggal, jenis: h.jenis, surat: h.surat, ayatDari: h.ayatDari, ayatSampai: h.ayatSampai, nilai: h.nilai })),
    kehadiranBulanIni: hadir, periodeHadir: key,
    diperbarui: serverTimestamp(),
  };
}

export async function aktifkanPortal(s) {
  const token = s.portalToken || tokenBaru();
  await setDoc(doc(db, 'portal', token), await susun(s, token));
  if (!s.portalToken) await updateDoc(doc(db, 'santri', s.id), { portalToken: token });
  catat('aktifkan', 'portal', s.nama);
  return tautanPortal(token);
}

export async function nonaktifkanPortal(s) {
  if (s.portalToken) await deleteDoc(doc(db, 'portal', s.portalToken)).catch(() => {});
  await updateDoc(doc(db, 'santri', s.id), { portalToken: '' });
  catat('nonaktifkan', 'portal', s.nama);
}

/** Perbarui salinan portal bila santri punya portal aktif. Tidak memblokir; galat hanya dicatat. */
export async function perbaruiPortalSantri(santriId, santriObj) {
  try {
    let s = santriObj;
    if (!s) { const d = await getDoc(doc(db, 'santri', santriId)); if (!d.exists()) return; s = { id: d.id, ...d.data() }; }
    if (!s.portalToken) return;
    await setDoc(doc(db, 'portal', s.portalToken), await susun(s, s.portalToken));
  } catch (e) { console.warn('portal gagal diperbarui', e); }
}

/** Perbarui banyak portal satu per satu di latar belakang (setelah tagihan massal). */
export async function perbaruiPortalBanyak(santriList) {
  for (const s of santriList.filter((x) => x.portalToken)) await perbaruiPortalSantri(s.id, s);
}
