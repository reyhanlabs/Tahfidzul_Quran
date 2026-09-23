import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { Printer, Download, MessageCircle, HandCoins, PartyPopper } from 'lucide-react';
import { db } from '../../lib/firebase';
import { COL, useLiveQuery } from '../../lib/db';
import { useData } from '../../lib/data';
import { rupiah, periodeLabel, waLink, downloadCSV, todayISO, norm } from '../../lib/format';
import { Button, Field, Select, PageHeader, Panel, Empty, Toolbar, SearchBox, Stat } from '../../components/ui';
import { Kop, TandaTangan } from '../../components/Kop';

export default function LapTunggakan() {
  const { kelas, santriMap, settings } = useData();
  const [fKelas, setFKelas] = useState(''); const [q, setQ] = useState(''); const [buka, setBuka] = useState(null);
  const { data, loading } = useLiveQuery(() => query(collection(db, COL.tagihan), where('sisa', '>', 0)), []);

  const rows = useMemo(() => {
    const m = {};
    data.forEach((t) => {
      const s = m[t.santriId] || (m[t.santriId] = { id: t.santriId, kode: t.santriKode, nama: t.santriNama, kelas: santriMap[t.santriId]?.kelas ?? t.kelas, items: [], sisa: 0 });
      s.items.push(t); s.sisa += t.sisa;
    });
    const nq = norm(q);
    return Object.values(m).filter((s) => (!fKelas || s.kelas === fKelas) && (!nq || norm(s.nama).includes(nq) || norm(s.kode).includes(nq)))
      .map((s) => ({ ...s, items: s.items.sort((a, b) => a.periodeKey - b.periodeKey) }))
      .sort((a, b) => b.sisa - a.sisa);
  }, [data, fKelas, q, santriMap]);
  const total = rows.reduce((a, s) => a + s.sisa, 0);

  const pesan = (s) => `Assalamu'alaikum Bapak/Ibu wali dari ${s.nama}. Kami informasikan kewajiban yang belum terselesaikan:\n`
    + s.items.map((t) => `• ${t.kewajibanNama} ${periodeLabel(t.periodeKey)}: ${rupiah(t.sisa)}`).join('\n')
    + `\nTotal: ${rupiah(s.sisa)}\n\nJazakumullah khairan.\n${settings.nama}`;

  return (
    <>
      <PageHeader title="Tunggakan santri" description="Semua tagihan yang belum lunas dari seluruh periode, dikelompokkan per santri."
        actions={<>
          <Button variant="secondary" icon={Download} disabled={!rows.length} onClick={() => downloadCSV(`tunggakan-${todayISO()}.csv`,
            ['ID', 'Nama', 'Kelas', 'No. HP', 'Rincian', 'Total tunggakan'],
            rows.map((s) => [s.kode, s.nama, s.kelas, santriMap[s.id]?.hp || '', s.items.map((t) => `${t.kewajibanNama} ${periodeLabel(t.periodeKey)} (${t.sisa})`).join(', '), s.sisa]))}>Ekspor CSV</Button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Cetak</Button>
        </>} />
      <Kop judul="Daftar tunggakan santri" sub={`Per ${todayISO()}${fKelas ? ` · ${fKelas}` : ''}`} />
      <Toolbar>
        <Field label="Kelas"><Select value={fKelas} placeholder="Semua kelas" options={kelas.map((k) => k.nama)} onChange={(e) => setFKelas(e.target.value)} /></Field>
        <SearchBox value={q} onChange={setQ} placeholder="Cari santri" className="w-full sm:w-60" />
      </Toolbar>
      <div className="grid grid-cols-2 gap-px bg-line border border-line rounded-xl overflow-hidden mb-4 print-area">
        <div className="bg-white p-4"><Stat label="Santri menunggak" value={rows.length} /></div>
        <div className="bg-white p-4"><Stat label="Total tunggakan" value={rupiah(total)} tone="rose" /></div>
      </div>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? <Empty icon={PartyPopper} title="Tidak ada tunggakan" text="Semua tagihan pada filter ini sudah lunas." /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>Santri</th><th>Kelas</th><th>Rincian</th><th className="money">Tunggakan</th><th className="no-print" /></tr></thead>
              <tbody>
                {rows.map((s) => {
                  const hp = santriMap[s.id]?.hp;
                  const ringkas = buka !== s.id && s.items.length > 3;
                  return (
                    <tr key={s.id}>
                      <td><p className="font-semibold">{s.nama}</p><p className="text-xs text-muted">{s.kode}{hp && ` · ${hp}`}</p></td>
                      <td>{s.kelas}</td>
                      <td className="text-xs">
                        {(ringkas ? s.items.slice(0, 3) : s.items).map((t) => <p key={t.id}>{t.kewajibanNama} {periodeLabel(t.periodeKey)} · <span className="num">{rupiah(t.sisa)}</span></p>)}
                        {ringkas && <button className="text-brand-700 font-semibold no-print" onClick={() => setBuka(s.id)}>+{s.items.length - 3} lainnya</button>}
                      </td>
                      <td className="money font-bold text-rose-ink">{rupiah(s.sisa)}</td>
                      <td className="text-right whitespace-nowrap no-print">
                        {hp && <a href={waLink(hp, pesan(s))} target="_blank" rel="noreferrer" title="Kirim pengingat WhatsApp" className="inline-flex p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><MessageCircle className="size-4" /></a>}
                        <Link to={`/pembayaran?santri=${s.id}`} title="Terima pembayaran" className="inline-flex p-1.5 rounded-md text-brand-700 hover:bg-brand-50"><HandCoins className="size-4" /></Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr><td colSpan={3}>Total</td><td className="money">{rupiah(total)}</td><td className="no-print" /></tr></tfoot>
            </table>
          </div>
        )}
      </Panel>
      <TandaTangan />
    </>
  );
}
