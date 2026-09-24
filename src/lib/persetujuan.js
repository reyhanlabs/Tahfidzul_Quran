/**
 * Persetujuan pengeluaran kas. Pengajuan disimpan di koleksi `pengajuan` dan BELUM
 * memengaruhi saldo. Setelah disetujui, pengeluaran dicatat ke buku kas (koleksi `kas`)
 * dalam satu transaksi; bila ditolak, alasan penolakan tersimpan.
 */
import { collection, doc, runTransaction, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { reserve, stamp } from './ops';
import { cekKunci, rekeningUntuk } from './konteks';
import { catat } from './log';
import { pad, rupiah } from './format';

const namaSaya = () => auth.currentUser?.email || '-';

function isiDari(data) {
  const nominal = Math.round(Number(data.nominal) || 0);
  if (nominal <= 0) throw new Error('Nominal harus lebih dari 0.');
  if (!data.kategori) throw new Error('Pilih kategori.');
  return {
    tanggal: data.tanggal, kategori: data.kategori, keterangan: data.keterangan || '', nominal,
    metode: data.metode, rekening: rekeningUntuk(data.metode, data.rekening), pihak: data.pihak || '', bukti: data.bukti || '',
  };
}

/** Ajukan (baru) atau ubah pengajuan yang masih menunggu / ajukan ulang yang ditolak. */
export async function ajukanPengeluaran(data, id, pengaju) {
  const isi = isiDari(data);
  cekKunci(isi.tanggal);
  if (id) {
    await updateDoc(doc(db, 'pengajuan', id), { ...isi, status: 'menunggu', catatanPutusan: '', diputusOleh: '', ...stamp(false) });
    catat('ubah', 'pengajuan', `${data.no || ''} ${isi.kategori} ${rupiah(isi.nominal)}`);
    return id;
  }
  const tahun = Number(isi.tanggal.slice(0, 4));
  const r = await runTransaction(db, async (tx) => {
    const c = await reserve(tx, `pengajuan-${tahun}`);
    c.commit();
    const ref = doc(collection(db, 'pengajuan'));
    const no = `PJ-${tahun}-${pad(c.first, 4)}`;
    tx.set(ref, { ...isi, no, status: 'menunggu', diajukanOleh: namaSaya(), diajukanNama: pengaju || namaSaya(), ...stamp(true) });
    return { id: ref.id, no };
  });
  catat('ajukan', 'pengajuan', `${r.no} ${isi.kategori} ${rupiah(isi.nominal)}`);
  return r.id;
}

export async function batalkanPengajuan(p) {
  await deleteDoc(doc(db, 'pengajuan', p.id));
  catat('hapus', 'pengajuan', `${p.no} ${p.kategori} ${rupiah(p.nominal)}`);
}

/** Setujui → catat ke buku kas; tolak → simpan alasan. */
export async function putuskanPengajuan(p, setuju, catatanPutusan, penyetuju) {
  if (!setuju && !String(catatanPutusan || '').trim()) throw new Error('Tulis alasan penolakan.');
  if (setuju) cekKunci(p.tanggal);
  const tahun = Number(p.tanggal.slice(0, 4));
  const hasil = await runTransaction(db, async (tx) => {
    const ref = doc(db, 'pengajuan', p.id);
    const cur = await tx.get(ref);
    if (!cur.exists()) throw new Error('Pengajuan sudah dihapus.');
    const d = cur.data();
    if (d.status !== 'menunggu') throw new Error(`Pengajuan ini sudah ${d.status}.`);
    const putusan = { diputusOleh: namaSaya(), diputusNama: penyetuju || namaSaya(), diputusPada: serverTimestamp(), catatanPutusan: catatanPutusan || '' };
    if (!setuju) { tx.update(ref, { ...putusan, status: 'ditolak' }); return null; }
    const c = await reserve(tx, `pengeluaran-${tahun}`);
    c.commit();
    const kasRef = doc(collection(db, 'kas'));
    const no = `KK-${tahun}-${pad(c.first, 5)}`;
    tx.set(kasRef, {
      tanggal: d.tanggal, sumber: 'pengeluaran', kategori: d.kategori, keterangan: d.keterangan, pihak: d.pihak, bukti: d.bukti,
      metode: d.metode, rekening: d.rekening, masuk: 0, keluar: d.nominal, no,
      pengajuanId: p.id, pengajuanNo: d.no, diajukanOleh: d.diajukanNama || d.diajukanOleh, disetujuiOleh: putusan.diputusNama, ...stamp(true),
    });
    tx.update(ref, { ...putusan, status: 'disetujui', kasId: kasRef.id, kasNo: no });
    return no;
  });
  catat(setuju ? 'setujui' : 'tolak', 'pengajuan', `${p.no} ${p.kategori} ${rupiah(p.nominal)}${hasil ? ` → ${hasil}` : ''}${catatanPutusan ? ` (${catatanPutusan})` : ''}`);
  return hasil;
}
