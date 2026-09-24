import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, query, getDocs, getAggregateFromServer, sum, where,
} from 'firebase/firestore';
import { db } from './firebase';

export const COL = {
  kelas: 'kelas', santri: 'santri', ustadz: 'ustadz', kewajiban: 'kewajiban', komponen: 'komponen',
  akun: 'akun', tagihan: 'tagihan', pembayaran: 'pembayaran', gaji: 'gaji', kas: 'kas',
  users: 'users', settings: 'settings', counters: 'counters',
};

const withId = (d) => ({ id: d.id, ...d.data() });

/** Langganan realtime ke koleksi/query. `build` mengembalikan query atau null. */
export function useLiveQuery(build, deps) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    const q = build();
    if (!q) { setState({ data: [], loading: false, error: null }); return undefined; }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(q,
      (snap) => setState({ data: snap.docs.map(withId), loading: false, error: null }),
      (error) => {
        console.error(error);
        window.dispatchEvent(new CustomEvent('data-gagal', { detail: error }));
        setState({ data: [], loading: false, error });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useLiveDoc(path, id) {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    if (!id) { setState({ data: null, loading: false }); return undefined; }
    return onSnapshot(doc(db, path, id),
      (s) => setState({ data: s.exists() ? withId(s) : null, loading: false }),
      () => setState({ data: null, loading: false }));
  }, [path, id]);
  return state;
}

export const kasRange = (dari, sampai) =>
  query(collection(db, COL.kas), where('tanggal', '>=', dari), where('tanggal', '<=', sampai));

/** Total kas masuk & keluar sebelum/tidak lebih dari tanggal tertentu (agregasi di server). */
export async function totalKas(op, tgl) {
  const q = query(collection(db, COL.kas), where('tanggal', op, tgl));
  const snap = await getAggregateFromServer(q, { masuk: sum('masuk'), keluar: sum('keluar') });
  const d = snap.data();
  return { masuk: d.masuk || 0, keluar: d.keluar || 0 };
}

export async function totalPiutang() {
  const q = query(collection(db, COL.tagihan), where('sisa', '>', 0));
  const snap = await getAggregateFromServer(q, { sisa: sum('sisa') });
  return snap.data().sisa || 0;
}

export async function fetchWhere(col, field, op, value) {
  const snap = await getDocs(query(collection(db, col), where(field, op, value)));
  return snap.docs.map(withId);
}

/**
 * Saldo per rekening kas. tgl opsional: saldo sebelum (op '<') atau sampai (op '<=') tanggal itu.
 * Memakai indeks gabungan (lihat firestore.indexes.json).
 */
export async function saldoPerRekening(rekening, op, tgl) {
  const kas = collection(db, COL.kas);
  const w = (field, id) => (tgl ? [where(field, '==', id), where('tanggal', op, tgl)] : [where(field, '==', id)]);
  return Promise.all(rekening.map(async (r) => {
    const [a, masukMutasi, keluarMutasi] = await Promise.all([
      getAggregateFromServer(query(kas, ...w('rekening', r.id)), { masuk: sum('masuk'), keluar: sum('keluar') }),
      getAggregateFromServer(query(kas, ...w('ke', r.id)), { n: sum('nominal') }),
      getAggregateFromServer(query(kas, ...w('dari', r.id)), { n: sum('nominal') }),
    ]);
    const d = a.data();
    const saldo = (Number(r.saldoAwal) || 0) + (d.masuk || 0) - (d.keluar || 0) + (masukMutasi.data().n || 0) - (keluarMutasi.data().n || 0);
    return { ...r, saldo };
  }));
}
