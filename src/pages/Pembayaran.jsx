import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { Printer, MessageCircle, CheckCircle2, Undo2, HandCoins, Download, ListChecks } from 'lucide-react';
import { db } from '../lib/firebase';
import { COL, useLiveQuery } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { createPembayaran, batalPembayaran } from '../lib/ops';
import { rupiah, periodeLabel, todayISO, tanggal, norm, waLink, downloadCSV, awalBulan, akhirBulan } from '../lib/format';
import {
  Button, Field, Input, Select, MoneyInput, Badge, PageHeader, Panel, Empty, SearchBox, Toolbar, useAction, useToast, cx,
} from '../components/ui';
import SantriPicker from '../components/SantriPicker';
import { RangePicker } from '../components/Periode';

export default function Pembayaran() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState('terima');
  return (
    <>
      <PageHeader title="Pembayaran santri" description="Terima pembayaran untuk satu atau beberapa tagihan sekaligus. Cicilan cukup diisi sebagian — sisanya tetap tercatat.">
        <div className="inline-flex p-1 bg-white rounded-lg border border-line no-print">
          {[['terima', 'Terima pembayaran'], ['riwayat', 'Riwayat']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={cx('px-4 h-9 rounded-md text-sm font-semibold', tab === v ? 'bg-brand-700 text-white' : 'text-muted hover:text-ink')}>{l}</button>
          ))}
        </div>
      </PageHeader>
      {tab === 'terima' ? <Terima initialSantri={params.get('santri') || ''} /> : <Riwayat />}
    </>
  );
}

function Terima({ initialSantri }) {
  const { santriMap, settings } = useData();
  const [run, busy] = useAction();
  const [santriId, setSantriId] = useState(initialSantri);
  const [tgl, setTgl] = useState(todayISO());
  const [metode, setMetode] = useState(settings.metode?.[0] || 'Cash');
  const [ket, setKet] = useState('');
  const [bayar, setBayar] = useState({}); // tagihanId -> nominal
  const [done, setDone] = useState(null);

  const { data, loading } = useLiveQuery(() => (santriId ? query(collection(db, COL.tagihan), where('santriId', '==', santriId)) : null), [santriId]);
  const terbuka = useMemo(() => data.filter((t) => t.sisa > 0).sort((a, b) => a.periodeKey - b.periodeKey || a.kewajibanNama.localeCompare(b.kewajibanNama)), [data]);
  useEffect(() => { setBayar({}); }, [santriId]);

  const s = santriMap[santriId];
  const total = Object.values(bayar).reduce((a, b) => a + (Number(b) || 0), 0);
  const invalid = terbuka.some((t) => (Number(bayar[t.id]) || 0) > t.sisa);
  const toggle = (t) => setBayar((b) => { const n = { ...b }; if (n[t.id] !== undefined) delete n[t.id]; else n[t.id] = t.sisa; return n; });
  const semua = () => setBayar(Object.fromEntries(terbuka.map((t) => [t.id, t.sisa])));

  const simpan = () => run(async () => {
    const id = await createPembayaran({
      tanggal: tgl, santri: s, metode, keterangan: ket,
      items: Object.entries(bayar).map(([tagihanId, v]) => ({ tagihanId, bayar: v })),
    });
    const items = terbuka.filter((t) => bayar[t.id] > 0).map((t) => ({ nama: `${t.kewajibanNama} ${periodeLabel(t.periodeKey)}`, bayar: Number(bayar[t.id]), sisa: t.sisa - Number(bayar[t.id]) }));
    setDone({ id, santri: s, total, items, tgl });
    setBayar({}); setKet('');
  }, 'Pembayaran disimpan dan tercatat di buku kas.');

  if (done) {
    const pesan = `Assalamu'alaikum. Terima kasih, pembayaran ${done.santri.nama} tanggal ${tanggal(done.tgl, true)} sudah kami terima:\n`
      + done.items.map((i) => `• ${i.nama}: ${rupiah(i.bayar)}${i.sisa > 0 ? ` (sisa ${rupiah(i.sisa)})` : ' (lunas)'}`).join('\n')
      + `\nTotal: ${rupiah(done.total)}\n\n${settings.nama}`;
    return (
      <Panel>
        <div className="text-center py-8 max-w-md mx-auto">
          <CheckCircle2 className="size-12 mx-auto text-brand-500" strokeWidth={1.5} />
          <h2 className="text-xl font-extrabold mt-3">Pembayaran tersimpan</h2>
          <p className="text-muted text-sm mt-1">{done.santri.nama} · {rupiah(done.total)}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Button icon={Printer} onClick={() => window.open(`/cetak/kwitansi/${done.id}`, '_blank')}>Cetak kwitansi</Button>
            {done.santri.hp && <Button variant="secondary" icon={MessageCircle} onClick={() => window.open(waLink(done.santri.hp, pesan), '_blank')}>Kirim ke WhatsApp wali</Button>}
            <Button variant="ghost" onClick={() => { setDone(null); setSantriId(''); }}>Pembayaran berikutnya</Button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
      <Panel title="Tagihan yang belum lunas" action={terbuka.length > 1 && <Button size="sm" variant="secondary" icon={ListChecks} onClick={semua}>Pilih semua</Button>} pad={false}>
        <div className="p-4 border-b border-line"><SantriPicker value={santriId} onChange={setSantriId} onlyActive={false} autoFocus={!santriId} /></div>
        {!santriId ? <Empty icon={HandCoins} title="Pilih santri" text="Cari santri di atas untuk melihat tagihan yang belum lunas." />
          : loading ? <Empty title="Memuat tagihan…" />
            : terbuka.length === 0 ? <Empty icon={CheckCircle2} title="Semua tagihan sudah lunas" text="Tidak ada kewajiban yang tersisa untuk santri ini." />
              : (
                <ul className="divide-y divide-line">
                  {terbuka.map((t) => {
                    const on = bayar[t.id] !== undefined;
                    const over = (Number(bayar[t.id]) || 0) > t.sisa;
                    return (
                      <li key={t.id} className={cx('flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3', on && 'bg-brand-50/60')}>
                        <input type="checkbox" checked={on} onChange={() => toggle(t)} className="size-4 accent-brand-700" aria-label={`Bayar ${t.kewajibanNama}`} />
                        <button type="button" onClick={() => toggle(t)} className="flex-1 min-w-0 text-left">
                          <p className="font-semibold">{t.kewajibanNama} <span className="font-normal text-muted">· {periodeLabel(t.periodeKey)}</span></p>
                          <p className="text-xs text-muted num">Tagihan {rupiah(t.nominal)}{t.dibayar > 0 && <> · sudah dibayar {rupiah(t.dibayar)}</>} · <span className="text-rose-ink font-semibold">sisa {rupiah(t.sisa)}</span></p>
                        </button>
                        <div className="w-full sm:w-44">
                          <MoneyInput value={on ? bayar[t.id] : ''} placeholder="0" disabled={!on}
                            onChange={(n) => setBayar({ ...bayar, [t.id]: n })} className={over ? 'border-rose-ink' : ''} />
                          {over && <p className="text-[11px] text-rose-ink mt-1">Melebihi sisa tagihan</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
      </Panel>

      <Panel title="Rincian pembayaran" className="lg:sticky lg:top-6">
        <div className="space-y-4">
          <Field label="Tanggal bayar"><Input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} /></Field>
          <Field label="Metode"><Select value={metode} options={settings.metode || []} onChange={(e) => setMetode(e.target.value)} /></Field>
          <Field label="Keterangan"><Input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Opsional" /></Field>
          <div className="border-t border-dashed border-line pt-4">
            <p className="text-xs font-semibold text-muted">Total diterima</p>
            <p className="text-3xl font-extrabold num text-brand-700 mt-1">{rupiah(total)}</p>
            {s && <p className="text-xs text-muted mt-1">dari {s.nama}{s.kelas && ` · ${s.kelas}`}</p>}
          </div>
          <Button size="lg" className="w-full" loading={busy} disabled={!s || total <= 0 || invalid || !tgl} onClick={simpan}>Simpan pembayaran</Button>
        </div>
      </Panel>
    </div>
  );
}

function Riwayat() {
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run] = useAction();
  const n = new Date();
  const [dari, setDari] = useState(awalBulan(n.getFullYear(), n.getMonth() + 1));
  const [sampai, setSampai] = useState(akhirBulan(n.getFullYear(), n.getMonth() + 1));
  const [q, setQ] = useState('');
  const { data, loading } = useLiveQuery(() => query(collection(db, COL.pembayaran), where('tanggal', '>=', dari), where('tanggal', '<=', sampai)), [dari, sampai]);
  const rows = useMemo(() => {
    const nq = norm(q);
    return data.filter((p) => !nq || [p.no, p.santriNama, p.santriKode].some((x) => norm(x).includes(nq)))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.no.localeCompare(a.no));
  }, [data, q]);
  const total = rows.reduce((a, p) => a + p.total, 0);

  const batal = async (p) => {
    if (!await confirm({ title: `Batalkan ${p.no}?`, text: `Pembayaran ${rupiah(p.total)} dari ${p.santriNama} akan dihapus, tagihannya kembali terbuka, dan catatan di buku kas ikut dihapus.`, ok: 'Batalkan pembayaran', danger: true })) return;
    run(() => batalPembayaran(p), 'Pembayaran dibatalkan.');
  };

  return (
    <>
      <Toolbar>
        <RangePicker dari={dari} sampai={sampai} onChange={(a, b) => { setDari(a); setSampai(b); }} />
        <SearchBox value={q} onChange={setQ} placeholder="Cari no. / santri" className="w-full sm:w-64" />
        <Button variant="secondary" icon={Download} className="ml-auto" disabled={!rows.length}
          onClick={() => downloadCSV(`pembayaran-${dari}-${sampai}.csv`, ['No', 'Tanggal', 'ID Santri', 'Nama', 'Kelas', 'Rincian', 'Total', 'Metode'],
            rows.map((p) => [p.no, p.tanggal, p.santriKode, p.santriNama, p.kelas, p.items.map((i) => `${i.kewajibanNama} ${periodeLabel(i.periodeKey)}`).join(', '), p.total, p.metode]))}>Ekspor CSV</Button>
      </Toolbar>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? <Empty icon={HandCoins} title="Belum ada pembayaran pada rentang ini" /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>No.</th><th>Tanggal</th><th>Santri</th><th>Rincian</th><th>Metode</th><th className="money">Total</th><th /></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs text-muted num whitespace-nowrap">{p.no}</td>
                    <td className="whitespace-nowrap">{tanggal(p.tanggal)}</td>
                    <td><p className="font-semibold">{p.santriNama}</p><p className="text-xs text-muted">{p.kelas}</p></td>
                    <td className="text-xs">{p.items.map((i) => <p key={i.tagihanId}>{i.kewajibanNama} {periodeLabel(i.periodeKey)} · <span className="num">{rupiah(i.bayar)}</span> {i.sisaSesudah <= 0 ? <Badge>LUNAS</Badge> : null}</p>)}</td>
                    <td>{p.metode}</td>
                    <td className="money font-semibold">{rupiah(p.total)}</td>
                    <td className="text-right whitespace-nowrap">
                      <button title="Cetak kwitansi" onClick={() => window.open(`/cetak/kwitansi/${p.id}`, '_blank')} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Printer className="size-4" /></button>
                      {isAdmin && <button title="Batalkan" onClick={() => batal(p)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Undo2 className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>Total {rows.length} transaksi</td><td className="money">{rupiah(total)}</td><td /></tr></tfoot>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
