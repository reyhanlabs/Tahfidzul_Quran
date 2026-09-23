import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Printer, IdCard } from 'lucide-react';
import { db } from '../../lib/firebase';
import { COL, useLiveQuery } from '../../lib/db';
import { useData } from '../../lib/data';
import { rupiah, periodeLabel, tanggal } from '../../lib/format';
import { Button, Field, Badge, PageHeader, Panel, Empty, Toolbar, Stat } from '../../components/ui';
import SantriPicker from '../../components/SantriPicker';
import { Kop } from '../../components/Kop';

export default function KartuSantri() {
  const { santriMap } = useData();
  const [id, setId] = useState('');
  const s = santriMap[id];
  const tg = useLiveQuery(() => (id ? query(collection(db, COL.tagihan), where('santriId', '==', id)) : null), [id]);
  const by = useLiveQuery(() => (id ? query(collection(db, COL.pembayaran), where('santriId', '==', id)) : null), [id]);
  const tagihan = useMemo(() => [...tg.data].sort((a, b) => b.periodeKey - a.periodeKey || a.kewajibanNama.localeCompare(b.kewajibanNama)), [tg.data]);
  const bayar = useMemo(() => [...by.data].sort((a, b) => b.tanggal.localeCompare(a.tanggal)), [by.data]);
  const tot = tagihan.reduce((a, t) => ({ n: a.n + t.nominal, d: a.d + t.dibayar, s: a.s + t.sisa }), { n: 0, d: 0, s: 0 });

  return (
    <>
      <PageHeader title="Kartu pembayaran santri" description="Seluruh riwayat tagihan dan pembayaran satu santri."
        actions={s && <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Cetak kartu</Button>} />
      <Toolbar><Field label="Santri" className="w-full sm:w-96"><SantriPicker value={id} onChange={setId} onlyActive={false} /></Field></Toolbar>
      {!s ? <Panel><Empty icon={IdCard} title="Pilih santri" text="Cari santri untuk menampilkan kartu pembayarannya." /></Panel> : (
        <>
          <Kop judul="Kartu pembayaran santri" />
          <Panel className="mb-5">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div><p className="text-xl font-extrabold">{s.nama}</p><p className="text-sm text-muted">{s.kode}{s.nis && ` · NIS ${s.nis}`} · {s.kelas}</p><div className="mt-1"><Badge>{s.status}</Badge></div></div>
              <div className="text-sm"><p className="text-xs text-muted font-semibold">Orang tua / wali</p><p>{s.namaWali || [s.namaAyah, s.namaIbu].filter(Boolean).join(' / ') || '–'}</p><p className="text-muted">{s.hp}</p></div>
              <Stat label="Total dibayar" value={rupiah(tot.d)} sub={`dari ${rupiah(tot.n)}`} tone="brand" />
              <Stat label="Sisa kewajiban" value={rupiah(tot.s)} tone={tot.s > 0 ? 'rose' : 'ink'} />
            </div>
          </Panel>
          <div className="grid xl:grid-cols-2 gap-5">
            <Panel title="Tagihan" pad={false}>
              <div className="overflow-x-auto"><table className="ledger">
                <thead><tr><th>Periode</th><th>Kewajiban</th><th className="money">Nominal</th><th className="money">Sisa</th><th>Status</th></tr></thead>
                <tbody>
                  {tagihan.length === 0 && <tr><td colSpan={5} className="text-muted">Belum ada tagihan.</td></tr>}
                  {tagihan.map((t) => <tr key={t.id}><td className="whitespace-nowrap">{periodeLabel(t.periodeKey)}</td><td>{t.kewajibanNama}</td><td className="money">{rupiah(t.nominal)}</td><td className="money">{rupiah(t.sisa)}</td><td><Badge>{t.status}</Badge></td></tr>)}
                </tbody>
              </table></div>
            </Panel>
            <Panel title="Riwayat pembayaran" pad={false}>
              <div className="overflow-x-auto"><table className="ledger">
                <thead><tr><th>Tanggal</th><th>No.</th><th>Untuk</th><th className="money">Jumlah</th><th className="no-print" /></tr></thead>
                <tbody>
                  {bayar.length === 0 && <tr><td colSpan={5} className="text-muted">Belum ada pembayaran.</td></tr>}
                  {bayar.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{tanggal(p.tanggal)}</td><td className="text-xs text-muted num">{p.no}</td>
                      <td className="text-xs">{p.items.map((i) => <p key={i.tagihanId}>{i.kewajibanNama} {periodeLabel(i.periodeKey)}</p>)}</td>
                      <td className="money font-semibold">{rupiah(p.total)}</td>
                      <td className="no-print"><button onClick={() => window.open(`/cetak/kwitansi/${p.id}`, '_blank')} className="p-1.5 rounded-md text-muted hover:text-brand-700" title="Cetak kwitansi"><Printer className="size-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
