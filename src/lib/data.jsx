import { createContext, useContext, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';
import { COL, useLiveQuery, useLiveDoc } from './db';

export const DataCtx = createContext(null);
const Ctx = DataCtx;
const byKode = (a, b) => String(a.kode || '').localeCompare(String(b.kode || ''), 'id', { numeric: true });

/** Data master kecil dimuat sekali secara realtime dan dibagikan ke seluruh halaman. */
export function DataProvider({ children }) {
  const kelas = useLiveQuery(() => collection(db, COL.kelas), []);
  const santri = useLiveQuery(() => collection(db, COL.santri), []);
  const ustadz = useLiveQuery(() => collection(db, COL.ustadz), []);
  const kewajiban = useLiveQuery(() => collection(db, COL.kewajiban), []);
  const komponen = useLiveQuery(() => collection(db, COL.komponen), []);
  const akun = useLiveQuery(() => collection(db, COL.akun), []);
  const settings = useLiveDoc(COL.settings, 'lembaga');

  const value = useMemo(() => {
    const sort = (x) => [...x.data].sort(byKode);
    const s = sort(santri);
    return {
      loading: [kelas, santri, ustadz, kewajiban, komponen, akun].some((x) => x.loading) || settings.loading,
      kelas: sort(kelas), santri: s, ustadz: sort(ustadz), kewajiban: sort(kewajiban), komponen: sort(komponen), akun: sort(akun),
      santriMap: Object.fromEntries(s.map((x) => [x.id, x])),
      settings: {
        nama: 'Lembaga', alamat: '', telepon: '', kota: '', pimpinan: '', bendahara: '',
        saldoAwal: 0, metode: ['Cash', 'Transfer', 'Bank', 'Lainnya'], ...(settings.data || {}),
      },
    };
  }, [kelas, santri, ustadz, kewajiban, komponen, akun, settings]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useData = () => useContext(Ctx);
