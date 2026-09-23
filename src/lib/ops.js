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
import { pad, periodeKey, periodeLabel, statusTagihan } from './format';

const who = () => auth.currentUser?.email || '-';
const stamp = (isNew) => (isNew
  ? { createdAt: serverTimestamp(), createdBy: who(), updatedAt: serverTimestamp() }
  : { updatedAt: serverTimestamp(), updatedBy: who() });

/** Ambil n nomor urut berikutnya dari counters/{key}. Harus dipanggil sebelum tx.set/update lain. */
async function reserve(tx, key, n = 1) {
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
  });
}

export async function isReferenced(col, field, value) {
  const s = await getDocs(query(collection(db, col), where(field, '==', value), limit(1)));
  return !s.empty;
}

export const deleteMaster = (col, id) => deleteDoc(doc(db, col, id));

// ---------------------------------------------------------------- Tagihan
/** items: [{ santri, kewajiban, nominal, bulan, tahun, tanggal, keterangan }] */
export async function createTagihan(items) {
  const CHUNK = 150; // 2 tulis per item + counter, aman di bawah batas 500
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
          keterangan: it.keterangan || '',
          ...stamp(true),
        });
      });
    });
    created += part.length;
  }
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
  });
}

export async function deleteTagihan(t) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, COL.tagihan, t.id);
    const s = await tx.get(ref);
    if (!s.exists()) return;
    if ((s.data().dibayar || 0) > 0) throw new Error('Tagihan sudah ada pembayarannya. Batalkan pembayarannya dulu.');
    tx.delete(ref);
  });
}

// ---------------------------------------------------------------- Pembayaran
/** data: { tanggal, santri, metode, keterangan, items:[{ tagihanId, bayar }] } */
export async function createPembayaran(data) {
  const items = data.items.filter((x) => Number(x.bayar) > 0);
  if (!items.length) throw new Error('Isi nominal bayar minimal pada satu tagihan.');
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
      metode: data.metode, keterangan: data.keterangan || '', items: detail, total, ...stamp(true),
    });
    detail.forEach((d, i) => {
      tx.set(doc(db, COL.kas, `${payRef.id}_${i}`), {
        tanggal: data.tanggal, no, sumber: 'pembayaran', refId: payRef.id,
        kategori: d.akun, kewajiban: d.kewajibanNama,
        keterangan: `${d.kewajibanNama} ${periodeLabel(d.periodeKey)} — ${data.santri.nama}`,
        masuk: d.bayar, keluar: 0, metode: data.metode, ...stamp(true),
      });
    });
    return payRef.id;
  });
}

export async function batalPembayaran(p) {
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
  });
}

// ---------------------------------------------------------------- Gaji
/** data: { tanggal, bulan, tahun, ustadz, metode, keterangan, items:[{nama, jenis, nominal}] } */
export async function createGaji(data) {
  const items = data.items.filter((x) => x.nama && Number(x.nominal) > 0)
    .map((x) => ({ nama: x.nama, jenis: x.jenis, nominal: Math.round(Number(x.nominal)) }));
  if (!items.length) throw new Error('Isi minimal satu komponen gaji.');
  const bruto = items.filter((x) => x.jenis === 'Pendapatan').reduce((a, b) => a + b.nominal, 0);
  const potongan = items.filter((x) => x.jenis === 'Potongan').reduce((a, b) => a + b.nominal, 0);
  const neto = bruto - potongan;
  if (neto < 0) throw new Error('Total potongan melebihi pendapatan.');
  const tahun = Number(data.tanggal.slice(0, 4));
  return runTransaction(db, async (tx) => {
    const r = await reserve(tx, `gaji-${tahun}`);
    const no = `GJ-${tahun}-${pad(r.first, 4)}`;
    const ref = doc(collection(db, COL.gaji));
    r.commit();
    const u = data.ustadz;
    tx.set(ref, {
      no, tanggal: data.tanggal, bulan: Number(data.bulan), tahun: Number(data.tahun),
      periodeKey: periodeKey(data.bulan, data.tahun),
      ustadzId: u.id, ustadzKode: u.kode, ustadzNama: u.nama, jabatan: u.jabatan || '',
      bank: u.bank || '', rekening: u.rekening || '',
      items, bruto, potongan, neto, metode: data.metode, keterangan: data.keterangan || '', ...stamp(true),
    });
    tx.set(doc(db, COL.kas, `gaji_${ref.id}`), {
      tanggal: data.tanggal, no, sumber: 'gaji', refId: ref.id, kategori: 'Gaji/Honor',
      keterangan: `Honor ${u.nama} ${periodeLabel(periodeKey(data.bulan, data.tahun))}`,
      masuk: 0, keluar: neto, metode: data.metode, ...stamp(true),
    });
    return ref.id;
  });
}

export async function deleteGaji(g) {
  const b = writeBatch(db);
  b.delete(doc(db, COL.gaji, g.id));
  b.delete(doc(db, COL.kas, `gaji_${g.id}`));
  await b.commit();
}

// ---------------------------------------------------------------- Kas manual
/** jenis: 'pemasukan' | 'pengeluaran' */
export async function saveKasManual(jenis, data, id) {
  const nominal = Math.round(Number(data.nominal) || 0);
  if (nominal <= 0) throw new Error('Nominal harus lebih dari 0.');
  const base = {
    tanggal: data.tanggal, sumber: jenis, kategori: data.kategori, keterangan: data.keterangan || '',
    pihak: data.pihak || '', bukti: data.bukti || '', metode: data.metode,
    masuk: jenis === 'pemasukan' ? nominal : 0, keluar: jenis === 'pengeluaran' ? nominal : 0,
  };
  if (id) { await updateDoc(doc(db, COL.kas, id), { ...base, ...stamp(false) }); return id; }
  const tahun = Number(data.tanggal.slice(0, 4));
  const prefix = jenis === 'pemasukan' ? 'KM' : 'KK';
  return runTransaction(db, async (tx) => {
    const r = await reserve(tx, `${jenis}-${tahun}`);
    r.commit();
    const ref = doc(collection(db, COL.kas));
    tx.set(ref, { ...base, no: `${prefix}-${tahun}-${pad(r.first, 5)}`, ...stamp(true) });
    return ref.id;
  });
}
export const deleteKasManual = (id) => deleteDoc(doc(db, COL.kas, id));

// ---------------------------------------------------------------- Settings & setup
export const saveSettings = (data) =>
  setDoc(doc(db, COL.settings, 'lembaga'), { ...data, ...stamp(false) }, { merge: true });

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
    const b = writeBatch(db);
    rows.forEach((row, i) => {
      b.set(doc(collection(db, col)), { ...row, kode: `${cfg.prefix}${pad(i + 1, cfg.pad)}`, ...stamp(true) });
    });
    b.set(doc(db, COL.counters, `master-${col}`), { last: rows.length }, { merge: true });
    await b.commit();
    hasil[col] = rows.length;
  }
  return hasil;
}
