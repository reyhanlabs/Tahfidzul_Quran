/**
 * Operasi bisnis. Semua transaksi keuangan ditulis atomik (runTransaction/writeBatch)
 * sehingga tagihan, pembayaran, dan buku kas selalu konsisten.
 */
import {
  collection, doc, runTransaction, writeBatch, serverTimestamp, getDocs, query, where, limit,
  deleteDoc, updateDoc, setDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { COL } from './db';
import { pad, periodeKey, periodeLabel, statusTagihan, rupiah } from './format';
import { cekKunci, rekeningUntuk, perluPersetujuan } from './konteks';
import { catat } from './log';
import { perbaruiPortalSantri, perbaruiPortalBanyak } from './portal';

const who = () => auth.currentUser?.email || '-';

/**
 * Batas aman jumlah tulis per batch/transaksi. Rules memanggil get() ke dokumen users
 * untuk setiap tulis, dan Firestore membatasi 20 pemanggilan get() per batch/transaksi.
 */
export const MAX_TULIS = 18;
/** Maksimal tagihan per kwitansi: tiap tagihan = 2 tulis (tagihan + kas), ditambah pembayaran & counter. */
export const MAKS_ITEM = 8;

/** Perbarui field di banyak dokumen (mis. saat nama master diganti) dalam potongan aman. */
export async function perbaruiMassal(col, whereField, whereValue, patch) {
  const s = await getDocs(query(collection(db, col), where(whereField, '==', whereValue)));
  for (let i = 0; i < s.docs.length; i += MAX_TULIS) {
    const b = writeBatch(db);
    s.docs.slice(i, i + MAX_TULIS).forEach((d) => b.update(d.ref, patch));
    await b.commit();
  }
  return s.size;
}
export const stamp = (isNew) => (isNew
  ? { createdAt: serverTimestamp(), createdBy: who(), updatedAt: serverTimestamp() }
  : { updatedAt: serverTimestamp(), updatedBy: who() });

/** Ambil n nomor urut berikutnya dari counters/{key}. Harus dipanggil sebelum tx.set/update lain. */
export async function reserve(tx, key, n = 1) {
  const ref = doc(db, COL.counters, key);
  const snap = await tx.get(ref);
  const last = snap.exists() ? snap.data().last || 0 : 0;
  return { ref, first: last + 1, commit: () => tx.set(ref, { last: last + n }, { merge: true }) };
}

// ---------------------------------------------------------------- Master data
const KODE = {
  santri: { prefix: 'S', pad: 4 }, ustadz: { prefix: 'U', pad: 3 }, kelas: { prefix: 'KLS', pad: 2 },
  kewajiban: { prefix: 'K', pad: 2 }, komponen: { prefix: 'G', pad: 2 }, akun: { prefix: 'A', pad: 2 },
};

export async function saveMaster(col, data, id) {
  const clean = Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'id'));
  if (id) {
    await updateDoc(doc(db, col, id), { ...clean, ...stamp(false) });
    catat('ubah', col, `${clean.kode || ''} ${clean.nama || ''}`.trim());
    return id;
  }
  const cfg = KODE[col];
  return runTransaction(db, async (tx) => {
    const r = await reserve(tx, `master-${col}`);
    const kode = cfg ? `${cfg.prefix}${pad(r.first, cfg.pad)}` : undefined;
    const ref = doc(collection(db, col));
    r.commit();
    tx.set(ref, { ...clean, ...(kode ? { kode } : {}), ...stamp(true) });
    return ref.id;
  }).then((newId) => { catat('tambah', col, clean.nama || ''); return newId; });
}

export async function isReferenced(col, field, value) {
  const s = await getDocs(query(collection(db, col), where(field, '==', value), limit(1)));
  return !s.empty;
}

export async function deleteMaster(col, id, nama = '') {
  await deleteDoc(doc(db, col, id));
  catat('hapus', col, nama);
}

// ---------------------------------------------------------------- Tagihan
/** items: [{ santri, kewajiban, nominal, bulan, tahun, tanggal, keterangan }] */
/** onProgress(sudah, total) dipanggil setiap satu tahap selesai disimpan. */
export async function createTagihan(items, onProgress) {
  const CHUNK = MAX_TULIS - 1; // + 1 tulis untuk counter
  let created = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    const part = items.slice(i, i + CHUNK);
    const tahun = part[0].tahun;
    await runTransaction(db, async (tx) => {
      const r = await reserve(tx, `tagihan-${tahun}`, part.length);
      r.commit();
      part.forEach((it, j) => {
        const nominal = Number(it.nominal) || 0;
        tx.set(doc(collection(db, COL.tagihan)), {
          no: `TG-${tahun}-${pad(r.first + j, 5)}`,
          tanggal: it.tanggal,
          bulan: Number(it.bulan), tahun: Number(it.tahun), periodeKey: periodeKey(it.bulan, it.tahun),
          santriId: it.santri.id, santriKode: it.santri.kode, santriNama: it.santri.nama, kelas: it.santri.kelas || '',
          kewajibanId: it.kewajiban.id, kewajibanNama: it.kewajiban.nama, akun: it.kewajiban.akun || 'Pembayaran Santri Lainnya',
          nominal, dibayar: 0, sisa: nominal, status: statusTagihan(nominal, 0),
          ...(it.potongan ? { nominalAwal: Number(it.nominalAwal) || nominal, potongan: it.potongan } : {}),
          keterangan: it.keterangan || '',
          ...stamp(true),
        });
      });
    });
    created += part.length;
    onProgress?.(created, items.length);
  }
  if (created) perbaruiPortalBanyak([...new Map(items.map((i) => [i.santri.id, i.santri])).values()]);
  if (created) catat('tambah', 'tagihan', `${created} tagihan ${items[0].kewajiban.nama} ${periodeLabel(periodeKey(items[0].bulan, items[0].tahun))}`);
  return created;
}

export async function updateNominalTagihan(t, nominalBaru, keterangan) {
  const nominal = Number(nominalBaru) || 0;
  return runTransaction(db, async (tx) => {
    const ref = doc(db, COL.tagihan, t.id);
    const s = await tx.get(ref);
    const cur = s.data();
    if (nominal < cur.dibayar) throw new Error(`Nominal tidak boleh kurang dari yang sudah dibayar (${cur.dibayar}).`);
    tx.update(ref, { nominal, sisa: nominal - cur.dibayar, status: statusTagihan(nominal, cur.dibayar), keterangan: keterangan ?? cur.keterangan, ...stamp(false) });
  }).then(() => { catat('ubah', 'tagihan', `${t.no} ${t.santriNama}: ${rupiah(t.nominal)} → ${rupiah(nominal)}`); perbaruiPortalSantri(t.santriId); });
}

export async function deleteTagihan(t) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, COL.tagihan, t.id);
    const s = await tx.get(ref);
    if (!s.exists()) return;
    if ((s.data().dibayar || 0) > 0) throw new Error('Tagihan sudah ada pembayarannya. Batalkan pembayarannya dulu.');
    tx.delete(ref);
  }).then(() => { catat('hapus', 'tagihan', `${t.no} ${t.santriNama} ${t.kewajibanNama}`); perbaruiPortalSantri(t.santriId); });
}

// ---------------------------------------------------------------- Pembayaran
/** data: { tanggal, santri, metode, keterangan, items:[{ tagihanId, bayar }] } */
export async function createPembayaran(data) {
  const items = data.items.filter((x) => Number(x.bayar) > 0);
  if (!items.length) throw new Error('Isi nominal bayar minimal pada satu tagihan.');
  if (items.length > MAKS_ITEM) throw new Error(`Maksimal ${MAKS_ITEM} tagihan dalam satu kwitansi. Simpan sisanya sebagai pembayaran berikutnya.`);
  cekKunci(data.tanggal);
  const rekening = rekeningUntuk(data.metode, data.rekening);
  const tahun = Number(data.tanggal.slice(0, 4));
  return runTransaction(db, async (tx) => {
    const refs = items.map((x) => doc(db, COL.tagihan, x.tagihanId));
    const snaps = [];
    for (const r of refs) snaps.push(await tx.get(r));
    const r = await reserve(tx, `pembayaran-${tahun}`);
    const no = `BYR-${tahun}-${pad(r.first, 5)}`;
    const payRef = doc(collection(db, COL.pembayaran));

    const detail = items.map((x, i) => {
      const s = snaps[i];
      if (!s.exists()) throw new Error('Tagihan tidak ditemukan. Muat ulang halaman.');
      const t = s.data();
      const bayar = Math.round(Number(x.bayar));
      if (bayar > t.sisa) throw new Error(`Pembayaran ${t.kewajibanNama} ${periodeLabel(t.periodeKey)} melebihi sisa tagihan.`);
      const dibayar = t.dibayar + bayar;
      tx.update(refs[i], { dibayar, sisa: t.nominal - dibayar, status: statusTagihan(t.nominal, dibayar), ...stamp(false) });
      return {
        tagihanId: s.id, tagihanNo: t.no, kewajibanNama: t.kewajibanNama, akun: t.akun,
        periodeKey: t.periodeKey, nominal: t.nominal, sisaSebelum: t.sisa, bayar, sisaSesudah: t.sisa - bayar,
      };
    });

    r.commit();
    const total = detail.reduce((a, b) => a + b.bayar, 0);
    tx.set(payRef, {
      no, tanggal: data.tanggal, santriId: data.santri.id, santriKode: data.santri.kode,
      santriNama: data.santri.nama, kelas: data.santri.kelas || '', wali: data.santri.namaWali || data.santri.namaAyah || data.santri.namaIbu || '',
      metode: data.metode, rekening, keterangan: data.keterangan || '', items: detail, total, ...stamp(true),
    });
    detail.forEach((d, i) => {
      tx.set(doc(db, COL.kas, `${payRef.id}_${i}`), {
        tanggal: data.tanggal, no, sumber: 'pembayaran', refId: payRef.id,
        kategori: d.akun, kewajiban: d.kewajibanNama,
        keterangan: `${d.kewajibanNama} ${periodeLabel(d.periodeKey)} — ${data.santri.nama}`,
        masuk: d.bayar, keluar: 0, metode: data.metode, rekening, ...stamp(true),
      });
    });
    return { id: payRef.id, no, total };
  }).then((r) => { catat('tambah', 'pembayaran', `${r.no} ${data.santri.nama} ${rupiah(r.total)}`); perbaruiPortalSantri(data.santri.id, data.santri); return r.id; });
}

/**
 * Ubah pembayaran: tanggal, metode, keterangan, dan nominal per tagihan.
 * Nominal 0 = tagihan itu dikeluarkan dari pembayaran. Tagihan & buku kas ikut disesuaikan.
 * data: { tanggal, metode, keterangan, items:[{ tagihanId, bayar }] }
 */
export async function editPembayaran(p, data, { bolehHapusItem = false } = {}) {
  if (!bolehHapusItem && data.items.some((x) => !(Number(x.bayar) > 0))) {
    throw new Error('Mengeluarkan tagihan dari pembayaran (nominal 0) hanya bisa dilakukan admin.');
  }
  if (!data.items.some((x) => Number(x.bayar) > 0)) throw new Error('Minimal satu tagihan harus punya nominal. Untuk menghapus seluruh pembayaran, gunakan Hapus.');
  cekKunci(p.tanggal, data.tanggal);
  const rekening = rekeningUntuk(data.metode, data.rekening);
  return runTransaction(db, async (tx) => {
    const payRef = doc(db, COL.pembayaran, p.id);
    const cur = await tx.get(payRef);
    if (!cur.exists()) throw new Error('Pembayaran sudah tidak ada. Muat ulang halaman.');
    const old = cur.data();
    const refs = old.items.map((x) => doc(db, COL.tagihan, x.tagihanId));
    const snaps = [];
    for (const r of refs) snaps.push(await tx.get(r));

    const baru = [];
    old.items.forEach((it, i) => {
      const s = snaps[i];
      const neu = Math.round(Number(data.items.find((x) => x.tagihanId === it.tagihanId)?.bayar) || 0);
      if (!s.exists()) { if (neu !== it.bayar) throw new Error(`Tagihan ${it.kewajibanNama} sudah dihapus; nominalnya tidak bisa diubah.`); baru.push(it); return; }
      const t = s.data();
      const tersedia = t.sisa + it.bayar;
      if (neu > tersedia) throw new Error(`${it.kewajibanNama} ${periodeLabel(it.periodeKey)}: maksimal ${tersedia.toLocaleString('id-ID')}.`);
      const dibayar = t.dibayar - it.bayar + neu;
      tx.update(refs[i], { dibayar, sisa: t.nominal - dibayar, status: statusTagihan(t.nominal, dibayar), ...stamp(false) });
      if (neu > 0) baru.push({ ...it, nominal: t.nominal, sisaSebelum: tersedia, bayar: neu, sisaSesudah: tersedia - neu });
    });

    const total = baru.reduce((a, b) => a + b.bayar, 0);
    tx.update(payRef, { tanggal: data.tanggal, metode: data.metode, rekening, keterangan: data.keterangan || '', items: baru, total, ...stamp(false) });
    baru.forEach((d, i) => {
      tx.set(doc(db, COL.kas, `${p.id}_${i}`), {
        tanggal: data.tanggal, no: old.no, sumber: 'pembayaran', refId: p.id, kategori: d.akun, kewajiban: d.kewajibanNama,
        keterangan: `${d.kewajibanNama} ${periodeLabel(d.periodeKey)} — ${old.santriNama}`,
        masuk: d.bayar, keluar: 0, metode: data.metode, rekening, ...stamp(false),
      }, { merge: true });
    });
    for (let i = baru.length; i < old.items.length; i++) tx.delete(doc(db, COL.kas, `${p.id}_${i}`));
    return total;
  }).then((total) => { catat('ubah', 'pembayaran', `${p.no} ${p.santriNama}: ${rupiah(p.total)} → ${rupiah(total)}`); perbaruiPortalSantri(p.santriId); });
}

export async function batalPembayaran(p) {
  cekKunci(p.tanggal);
  return runTransaction(db, async (tx) => {
    const refs = p.items.map((x) => doc(db, COL.tagihan, x.tagihanId));
    const snaps = [];
    for (const r of refs) snaps.push(await tx.get(r));
    snaps.forEach((s, i) => {
      if (!s.exists()) return;
      const t = s.data();
      const dibayar = Math.max(0, t.dibayar - p.items[i].bayar);
      tx.update(refs[i], { dibayar, sisa: t.nominal - dibayar, status: statusTagihan(t.nominal, dibayar), ...stamp(false) });
    });
    p.items.forEach((_, i) => tx.delete(doc(db, COL.kas, `${p.id}_${i}`)));
    tx.delete(doc(db, COL.pembayaran, p.id));
  }).then(() => { catat('hapus', 'pembayaran', `${p.no} ${p.santriNama} ${rupiah(p.total)}`); perbaruiPortalSantri(p.santriId); });
}

// ---------------------------------------------------------------- Gaji
/** data: { tanggal, bulan, tahun, ustadz, metode, keterangan, items:[{nama, jenis, nominal}] } */
function hitungGaji(list) {
  const items = list.filter((x) => x.nama && Number(x.nominal) > 0)
    .map((x) => ({ nama: x.nama, jenis: x.jenis, nominal: Math.round(Number(x.nominal)) }));
  if (!items.length) throw new Error('Isi minimal satu komponen gaji.');
  const bruto = items.filter((x) => x.jenis === 'Pendapatan').reduce((a, b) => a + b.nominal, 0);
  const potongan = items.filter((x) => x.jenis === 'Potongan').reduce((a, b) => a + b.nominal, 0);
  const neto = bruto - potongan;
  if (neto < 0) throw new Error('Total potongan melebihi pendapatan.');
  return { items, bruto, potongan, neto };
}

export async function createGaji(data) {
  const { items, bruto, potongan, neto } = hitungGaji(data.items);
  cekKunci(data.tanggal);
  const rekeningKas = rekeningUntuk(data.metode, data.rekeningKas);
  const tahun = Number(data.tanggal.slice(0, 4));
  const id = await runTransaction(db, async (tx) => {
    const r = await reserve(tx, `gaji-${tahun}`);
    const no = `GJ-${tahun}-${pad(r.first, 4)}`;
    const ref = doc(collection(db, COL.gaji));
    r.commit();
    const u = data.ustadz;
    tx.set(ref, {
      no, tanggal: data.tanggal, bulan: Number(data.bulan), tahun: Number(data.tahun),
      periodeKey: periodeKey(data.bulan, data.tahun),
      ustadzId: u.id, ustadzKode: u.kode, ustadzNama: u.nama, jabatan: u.jabatan || '',
      bank: u.bank || '', rekening: u.rekening || '', // rekening = no. rekening bank ustadz
      items, bruto, potongan, neto, metode: data.metode, rekeningKas, keterangan: data.keterangan || '', ...stamp(true),
    });
    tx.set(doc(db, COL.kas, `gaji_${ref.id}`), {
      tanggal: data.tanggal, no, sumber: 'gaji', refId: ref.id, kategori: 'Gaji/Honor',
      keterangan: `Honor ${u.nama} ${periodeLabel(periodeKey(data.bulan, data.tahun))}`,
      masuk: 0, keluar: neto, metode: data.metode, rekening: rekeningKas, ...stamp(true),
    });
    return ref.id;
  });
  catat('tambah', 'gaji', `${data.ustadz.nama} ${periodeLabel(periodeKey(data.bulan, data.tahun))} ${rupiah(neto)}`);
  return id;
}

/** Ubah slip gaji (orangnya tetap). Catatan kas ikut diperbarui. */
export async function updateGaji(g, data) {
  const { items, bruto, potongan, neto } = hitungGaji(data.items);
  cekKunci(g.tanggal, data.tanggal);
  const rekeningKas = rekeningUntuk(data.metode, data.rekeningKas);
  const pk = periodeKey(data.bulan, data.tahun);
  const b = writeBatch(db);
  b.update(doc(db, COL.gaji, g.id), {
    tanggal: data.tanggal, bulan: Number(data.bulan), tahun: Number(data.tahun), periodeKey: pk,
    metode: data.metode, rekeningKas, keterangan: data.keterangan || '', items, bruto, potongan, neto, ...stamp(false),
  });
  b.set(doc(db, COL.kas, `gaji_${g.id}`), {
    tanggal: data.tanggal, no: g.no, sumber: 'gaji', refId: g.id, kategori: 'Gaji/Honor',
    keterangan: `Honor ${g.ustadzNama} ${periodeLabel(pk)}`, masuk: 0, keluar: neto, metode: data.metode, rekening: rekeningKas, ...stamp(false),
  }, { merge: true });
  await b.commit();
  catat('ubah', 'gaji', `${g.no} ${g.ustadzNama}: ${rupiah(g.neto)} → ${rupiah(neto)}`);
}

export async function deleteGaji(g) {
  cekKunci(g.tanggal);
  const b = writeBatch(db);
  b.delete(doc(db, COL.gaji, g.id));
  b.delete(doc(db, COL.kas, `gaji_${g.id}`));
  await b.commit();
  catat('hapus', 'gaji', `${g.no} ${g.ustadzNama} ${rupiah(g.neto)}`);
}

// ---------------------------------------------------------------- Kas manual
/** jenis: 'pemasukan' | 'pengeluaran'. lama = catatan sebelum diubah (untuk cek kunci). */
export async function saveKasManual(jenis, data, id, lama) {
  const nominal = Math.round(Number(data.nominal) || 0);
  if (nominal <= 0) throw new Error('Nominal harus lebih dari 0.');
  cekKunci(data.tanggal, lama?.tanggal);
  if (jenis === 'pengeluaran' && perluPersetujuan(nominal)) {
    throw new Error(id ? 'Pengeluaran di atas batas persetujuan hanya bisa diubah oleh penyetuju.' : 'Pengeluaran sebesar ini wajib lewat persetujuan. Gunakan "Ajukan pengeluaran".');
  }
  const base = {
    tanggal: data.tanggal, sumber: jenis, kategori: data.kategori, keterangan: data.keterangan || '',
    pihak: data.pihak || '', bukti: data.bukti || '', metode: data.metode, rekening: rekeningUntuk(data.metode, data.rekening),
    masuk: jenis === 'pemasukan' ? nominal : 0, keluar: jenis === 'pengeluaran' ? nominal : 0,
  };
  if (id) {
    await updateDoc(doc(db, COL.kas, id), { ...base, ...stamp(false) });
    catat('ubah', jenis, `${lama?.no || ''} ${data.kategori} ${rupiah(nominal)}`);
    return id;
  }
  const tahun = Number(data.tanggal.slice(0, 4));
  const prefix = jenis === 'pemasukan' ? 'KM' : 'KK';
  const res = await runTransaction(db, async (tx) => {
    const r = await reserve(tx, `${jenis}-${tahun}`);
    r.commit();
    const ref = doc(collection(db, COL.kas));
    const no = `${prefix}-${tahun}-${pad(r.first, 5)}`;
    tx.set(ref, { ...base, no, ...stamp(true) });
    return { id: ref.id, no };
  });
  catat('tambah', jenis, `${res.no} ${data.kategori} ${rupiah(nominal)}`);
  return res.id;
}
export async function deleteKasManual(k) {
  cekKunci(k.tanggal);
  await deleteDoc(doc(db, COL.kas, k.id));
  catat('hapus', k.sumber, `${k.no} ${k.kategori} ${rupiah(k.masuk || k.keluar || k.nominal)}`);
}

// ---------------------------------------------------------------- Mutasi antar rekening
/**
 * Pindah dana antar rekening (setor tunai ke bank, tarik tunai, dsb.).
 * Dicatat di buku kas dengan masuk = keluar = 0 sehingga tidak mengubah total
 * pemasukan/pengeluaran lembaga — hanya memindahkan saldo antar rekening.
 */
export async function saveMutasi(data, id, lama) {
  const nominal = Math.round(Number(data.nominal) || 0);
  if (nominal <= 0) throw new Error('Nominal harus lebih dari 0.');
  if (!data.dari || !data.ke || data.dari === data.ke) throw new Error('Pilih rekening asal dan tujuan yang berbeda.');
  cekKunci(data.tanggal, lama?.tanggal);
  const base = {
    tanggal: data.tanggal, sumber: 'mutasi', kategori: 'Pindah dana', keterangan: data.keterangan || '',
    dari: data.dari, ke: data.ke, nominal, masuk: 0, keluar: 0, metode: '-',
  };
  if (id) { await updateDoc(doc(db, COL.kas, id), { ...base, ...stamp(false) }); catat('ubah', 'mutasi', `${lama?.no} ${rupiah(nominal)}`); return id; }
  const tahun = Number(data.tanggal.slice(0, 4));
  const res = await runTransaction(db, async (tx) => {
    const r = await reserve(tx, `mutasi-${tahun}`);
    r.commit();
    const ref = doc(collection(db, COL.kas));
    const no = `MT-${tahun}-${pad(r.first, 4)}`;
    tx.set(ref, { ...base, no, ...stamp(true) });
    return { id: ref.id, no };
  });
  catat('tambah', 'mutasi', `${res.no} ${rupiah(nominal)}`);
  return res.id;
}

// ---------------------------------------------------------------- Settings & setup
export async function saveSettings(data) {
  await setDoc(doc(db, COL.settings, 'lembaga'), { ...data, ...stamp(false) }, { merge: true });
  catat('ubah', 'pengaturan', data.kunciSampai !== undefined ? `kunci s.d. ${data.kunciSampai || '-'}` : '');
}

export const DEFAULTS = {
  kelas: [
    { nama: 'Kelas A', keterangan: "Iqro' 1–3" }, { nama: 'Kelas B', keterangan: "Iqro' 4–6" },
    { nama: 'Kelas C', keterangan: "Al-Qur'an" }, { nama: 'Tahsin', keterangan: '' }, { nama: 'Tahfidz', keterangan: '' },
  ],
  akun: [
    ...['Pembayaran Syahriyah', 'Pembayaran LKS', 'Daftar Ulang', 'Pembayaran Santri Lainnya', 'Sumbangan', 'Donasi', 'Bantuan', 'Pemasukan Kegiatan', 'Pemasukan Lainnya']
      .map((nama) => ({ nama, jenis: 'Pemasukan' })),
    ...['Gaji/Honor', 'Tunjangan', 'ATK', 'Listrik', 'Air', 'Internet', 'Kebersihan', 'Pemeliharaan', 'Kegiatan', 'Konsumsi', 'Transportasi', 'Operasional', 'Administrasi Kantor', 'Pengeluaran Lainnya']
      .map((nama) => ({ nama, jenis: 'Pengeluaran' })),
  ],
  kewajiban: [
    ['Syahriyah/SPP', 'Rutin', 50000, 'Bulanan', 'Pembayaran Syahriyah'],
    ['LKS', 'Akademik', 25000, 'Custom', 'Pembayaran LKS'],
    ['Daftar Ulang', 'Administrasi', 150000, 'Tahunan', 'Daftar Ulang'],
    ['Seragam', 'Perlengkapan', 200000, 'Sekali', 'Pembayaran Santri Lainnya'],
    ['Ujian', 'Akademik', 30000, 'Custom', 'Pembayaran Santri Lainnya'],
    ['Kegiatan', 'Kegiatan', 10000, 'Bulanan', 'Pembayaran Santri Lainnya'],
    ['Administrasi', 'Administrasi', 20000, 'Sekali', 'Pembayaran Santri Lainnya'],
    ['Buku', 'Akademik', 35000, 'Custom', 'Pembayaran Santri Lainnya'],
    ['Wisuda', 'Kegiatan', 250000, 'Tahunan', 'Pembayaran Santri Lainnya'],
    ['Kewajiban Lainnya', 'Lainnya', 0, 'Custom', 'Pembayaran Santri Lainnya'],
  ].map(([nama, kategori, nominal, periode, akun]) => ({ nama, kategori, nominal, periode, akun, status: 'Aktif' })),
  komponen: [
    ['Honor Mengajar', 'Pendapatan', 0, true], ['Tunjangan Jabatan', 'Pendapatan', 200000, false],
    ['Tunjangan Transport', 'Pendapatan', 100000, false], ['Tunjangan Makan', 'Pendapatan', 100000, false],
    ['Tunjangan Lainnya', 'Pendapatan', 0, false], ['Bonus', 'Pendapatan', 0, false], ['Insentif', 'Pendapatan', 0, false],
    ['Potongan', 'Potongan', 0, false],
  ].map(([nama, jenis, nominal, pakaiTarif]) => ({ nama, jenis, nominal, pakaiTarif, status: 'Aktif' })),
};

/** Isi data default hanya ke koleksi yang masih kosong. */
export async function seedDefaults() {
  const hasil = {};
  for (const col of ['kelas', 'akun', 'kewajiban', 'komponen']) {
    const s = await getDocs(query(collection(db, col), limit(1)));
    if (!s.empty) { hasil[col] = 0; continue; }
    const cfg = KODE[col];
    const rows = DEFAULTS[col];
    for (let i = 0; i < rows.length; i += MAX_TULIS) {
      const b = writeBatch(db);
      rows.slice(i, i + MAX_TULIS).forEach((row, j) => {
        b.set(doc(collection(db, col)), { ...row, kode: `${cfg.prefix}${pad(i + j + 1, cfg.pad)}`, ...stamp(true) });
      });
      await b.commit();
    }
    await setDoc(doc(db, COL.counters, `master-${col}`), { last: rows.length }, { merge: true });
    hasil[col] = rows.length;
  }
  return hasil;
}
