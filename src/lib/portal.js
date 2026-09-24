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

/**
 * Susun isi portal. Setiap bagian dibaca terpisah: pengguna yang tidak berhak membaca suatu data
 * (mis. bagian pendidikan tidak boleh membaca tagihan) hanya memperbarui bagian yang boleh ia baca,
 * bagian lain di portal dibiarkan seperti sebelumnya (disimpan dengan merge).
 */
async function susun(s, token) {
  const coba = (pr) => pr.catch(() => null);
  const n = new Date(); const key = periodeKey(n.getMonth() + 1, n.getFullYear());
  const [tg, by, hr, hf, lembaga, ab] = await Promise.all([
    coba(getDocs(query(collection(db, 'tagihan'), where('santriId', '==', s.id)))),
    coba(getDocs(query(collection(db, 'pembayaran'), where('santriId', '==', s.id)))),
    coba(getDoc(doc(db, 'hafalanRingkas', s.id))),
    coba(getDocs(query(collection(db, 'hafalan'), where('santriId', '==', s.id)))),
    coba(getDoc(doc(db, 'settings', 'lembaga'))),
    s.kelas ? coba(getDocs(query(collection(db, 'absensi'), where('periodeKey', '==', key), where('jenis', '==', 'santri'), where('grup', '==', s.kelas)))) : Promise.resolve(null),
  ]);
  const L = lembaga?.exists() ? lembaga.data() : {};
  const isi = {
    token, santriId: s.id,
    lembaga: { nama: L.nama || '', alamat: L.alamat || '', telepon: L.telepon || '' },
    santri: { nama: s.nama, kode: s.kode, kelas: s.kelas || '', status: s.status || '' },
    diperbarui: serverTimestamp(),
  };
  if (tg) {
    const tagihan = tg.docs.map((d) => d.data());
    isi.tagihanTerbuka = tagihan.filter((t) => t.sisa > 0).sort((a, b) => a.periodeKey - b.periodeKey)
      .map((t) => ({ kewajiban: t.kewajibanNama, periodeKey: t.periodeKey, nominal: t.nominal, dibayar: t.dibayar, sisa: t.sisa }));
    isi.totalSisa = tagihan.reduce((a, t) => a + (t.sisa > 0 ? t.sisa : 0), 0);
  }
  if (by) {
    isi.pembayaran = by.docs.map((d) => d.data()).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 12)
      .map((p) => ({ no: p.no, tanggal: p.tanggal, total: p.total, metode: p.metode, rincian: p.items.map((i) => ({ kewajiban: i.kewajibanNama, periodeKey: i.periodeKey, bayar: i.bayar })) }));
  }
  if (hr) { const r = hr.exists() ? hr.data() : null; isi.hafalan = r ? { totalAyat: r.totalAyat, perJuz: r.perJuz, juzSelesai: r.juzSelesai, setoranTerakhir: r.setoranTerakhir } : null; }
  if (hf) {
    isi.setoran = hf.docs.map((d) => d.data()).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 10)
      .map((h) => ({ tanggal: h.tanggal, jenis: h.jenis, surat: h.surat, ayatDari: h.ayatDari, ayatSampai: h.ayatSampai, nilai: h.nilai }));
  }
  if (ab) {
    const hadir = { H: 0, I: 0, S: 0, A: 0 };
    ab.docs.forEach((d) => { const st = d.data().data?.[s.id]; if (st) hadir[st] += 1; });
    isi.kehadiranBulanIni = hadir; isi.periodeHadir = key;
  }
  return isi;
}

export async function aktifkanPortal(s) {
  const token = s.portalToken || tokenBaru();
  await setDoc(doc(db, 'portal', token), await susun(s, token), { merge: true });
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
    await setDoc(doc(db, 'portal', s.portalToken), await susun(s, s.portalToken), { merge: true });
  } catch (e) { console.warn('portal gagal diperbarui', e); }
}

/** Perbarui banyak portal satu per satu di latar belakang (setelah tagihan massal). */
export async function perbaruiPortalBanyak(santriList) {
  for (const s of santriList.filter((x) => x.portalToken)) await perbaruiPortalSantri(s.id, s);
}
