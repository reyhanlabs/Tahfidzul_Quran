import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { History, Download } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/db';
import { useAuth } from '../lib/auth';
import { norm } from '../lib/format';
import { downloadExcel } from '../lib/excel';
import { Button, Field, Select, PageHeader, Panel, Empty, Toolbar, SearchBox, Badge } from '../components/ui';

const WARNA = { tambah: 'Aktif', ubah: 'SEBAGIAN', hapus: 'BELUM BAYAR', pulihkan: 'BELUM BAYAR' };
const waktu = (w) => (w?.seconds ? new Date(w.seconds * 1000) : null);

export default function LogAktivitas() {
  const { isAdmin } = useAuth();
  const [batas, setBatas] = useState(300);
  const [oleh, setOleh] = useState(''); const [aksi, setAksi] = useState(''); const [q, setQ] = useState('');
  const { data, loading } = useLiveQuery(() => (isAdmin ? query(collection(db, 'log'), orderBy('waktu', 'desc'), limit(batas)) : null), [batas, isAdmin]);
  const rows = useMemo(() => data.filter((l) => (!oleh || l.oleh === oleh) && (!aksi || l.aksi === aksi)
    && (!q || norm(`${l.objek} ${l.ringkas}`).includes(norm(q)))), [data, oleh, aksi, q]);
  if (!isAdmin) return <Navigate to="/" replace />;
  const pengguna = [...new Set(data.map((l) => l.oleh))];
  const jenisAksi = [...new Set(data.map((l) => l.aksi))];

  return (
    <>
      <PageHeader help="pengguna" title="Log aktivitas" description="Catatan siapa menambah, mengubah, atau menghapus data, dan kapan. Hanya bisa dilihat admin dan tidak bisa diubah."
        actions={<Button variant="secondary" icon={Download} disabled={!rows.length} onClick={() => downloadExcel('log-aktivitas.xlsx', ['Waktu', 'Pengguna', 'Aksi', 'Data', 'Keterangan'],
          rows.map((l) => [waktu(l.waktu)?.toLocaleString('id-ID') || '', l.oleh, l.aksi, l.objek, l.ringkas]))}>Ekspor Excel</Button>} />
      <Toolbar>
        <Field label="Pengguna"><Select value={oleh} placeholder="Semua pengguna" options={pengguna} onChange={(e) => setOleh(e.target.value)} /></Field>
        <Field label="Aksi"><Select value={aksi} placeholder="Semua aksi" options={jenisAksi} onChange={(e) => setAksi(e.target.value)} /></Field>
        <SearchBox value={q} onChange={setQ} placeholder="Cari data / keterangan" className="w-full sm:w-64" />
      </Toolbar>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? <Empty icon={History} title="Belum ada aktivitas tercatat" /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>Waktu</th><th>Pengguna</th><th>Aksi</th><th>Data</th><th>Keterangan</th></tr></thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-sm">{waktu(l.waktu)?.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) || '…'}</td>
                    <td className="text-sm">{l.oleh}</td>
                    <td><Badge tone={WARNA[l.aksi]}>{l.aksi}</Badge></td>
                    <td className="font-semibold">{l.objek}</td>
                    <td className="text-sm">{l.ringkas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {data.length >= batas && <div className="text-center mt-4"><Button variant="secondary" onClick={() => setBatas(batas + 300)}>Tampilkan lebih banyak</Button></div>}
    </>
  );
}
