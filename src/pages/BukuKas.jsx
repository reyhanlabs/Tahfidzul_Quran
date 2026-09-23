import { useEffect, useMemo, useState } from 'react';
import { Printer, Download, BookOpen } from 'lucide-react';
import { useLiveQuery, kasRange, totalKas } from '../lib/db';
import { useData } from '../lib/data';
import { rupiah, tanggal, awalBulan, akhirBulan, downloadCSV, norm } from '../lib/format';
import { Button, Field, Select, PageHeader, Panel, Empty, Toolbar, Stat, SearchBox, cx } from '../components/ui';
import { RangePicker } from '../components/Periode';
import { Kop, TandaTangan } from '../components/Kop';

export const SUMBER = { pembayaran: 'Pembayaran santri', gaji: 'Gaji/honor', pengeluaran: 'Pengeluaran', pemasukan: 'Pemasukan lain' };
export const urutKas = (a, b) => a.tanggal.localeCompare(b.tanggal) || (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0) || String(a.no).localeCompare(String(b.no));

export function useSaldoAwal(dari, deps = []) {
  const { settings } = useData();
  const [v, setV] = useState(null);
  useEffect(() => {
    let alive = true; setV(null);
    totalKas('<', dari).then((t) => alive && setV((Number(settings.saldoAwal) || 0) + t.masuk - t.keluar)).catch(() => alive && setV(Number(settings.saldoAwal) || 0));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dari, settings.saldoAwal, ...deps]);
  return v;
}

export default function BukuKas() {
  const n = new Date();
  const [dari, setDari] = useState(awalBulan(n.getFullYear(), n.getMonth() + 1));
  const [sampai, setSampai] = useState(akhirBulan(n.getFullYear(), n.getMonth() + 1));
  const [sumber, setSumber] = useState(''); const [q, setQ] = useState('');
  const { data, loading } = useLiveQuery(() => kasRange(dari, sampai), [dari, sampai]);
  const saldoAwal = useSaldoAwal(dari, [data.length]);

  const rows = useMemo(() => {
    let s = saldoAwal || 0;
    return [...data].sort(urutKas).map((k) => { s += (k.masuk || 0) - (k.keluar || 0); return { ...k, saldo: s }; });
  }, [data, saldoAwal]);
  const shown = rows.filter((k) => (!sumber || k.sumber === sumber) && (!q || [k.no, k.keterangan, k.kategori].some((x) => norm(x).includes(norm(q)))));
  const masuk = data.reduce((a, k) => a + (k.masuk || 0), 0);
  const keluar = data.reduce((a, k) => a + (k.keluar || 0), 0);
  const akhir = (saldoAwal || 0) + masuk - keluar;

  return (
    <>
      <PageHeader help="bukukas" title="Buku kas" description="Tersusun otomatis dari pembayaran santri, gaji, pengeluaran, dan pemasukan lain. Saldo dihitung dari saldo awal di Pengaturan."
        actions={<>
          <Button variant="secondary" icon={Download} disabled={!rows.length} onClick={() => downloadCSV(`buku-kas-${dari}-${sampai}.csv`,
            ['Tanggal', 'No', 'Jenis', 'Kategori', 'Keterangan', 'Masuk', 'Keluar', 'Saldo'],
            [['', '', '', '', 'Saldo awal', '', '', saldoAwal], ...rows.map((k) => [k.tanggal, k.no, SUMBER[k.sumber], k.kategori, k.keterangan, k.masuk, k.keluar, k.saldo])])}>Ekspor CSV</Button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Cetak</Button>
        </>} />
      <style>{'@page { size: A4 landscape; margin: 12mm; }'}</style>
      <Kop judul="Buku kas umum" sub={`Periode ${tanggal(dari, true)} s.d. ${tanggal(sampai, true)}`} />
      <Toolbar>
        <RangePicker dari={dari} sampai={sampai} onChange={(a, b) => { setDari(a); setSampai(b); }} />
        <Field label="Jenis"><Select value={sumber} placeholder="Semua transaksi" options={Object.entries(SUMBER).map(([value, label]) => ({ value, label }))} onChange={(e) => setSumber(e.target.value)} /></Field>
        <SearchBox value={q} onChange={setQ} className="w-full sm:w-56" />
      </Toolbar>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden mb-4 print-area">
        <div className="bg-white p-4"><Stat label="Saldo awal" value={saldoAwal == null ? '…' : rupiah(saldoAwal)} /></div>
        <div className="bg-white p-4"><Stat label="Kas masuk" value={rupiah(masuk)} tone="brand" /></div>
        <div className="bg-white p-4"><Stat label="Kas keluar" value={rupiah(keluar)} tone="rose" /></div>
        <div className="bg-white p-4"><Stat label="Saldo akhir" value={saldoAwal == null ? '…' : rupiah(akhir)} tone={akhir < 0 ? 'rose' : 'ink'} /></div>
      </div>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>Tanggal</th><th>No.</th><th>Kategori</th><th>Keterangan</th><th className="money">Masuk</th><th className="money">Keluar</th><th className="money">Saldo</th></tr></thead>
              <tbody>
                <tr className="bg-brand-50/50"><td colSpan={6} className="font-semibold">Saldo awal per {tanggal(dari, true)}</td><td className="money font-semibold">{saldoAwal == null ? '…' : rupiah(saldoAwal)}</td></tr>
                {shown.length === 0 && <tr><td colSpan={7}><Empty icon={BookOpen} title="Tidak ada transaksi kas pada rentang ini" /></td></tr>}
                {shown.map((k) => (
                  <tr key={k.id}>
                    <td className="whitespace-nowrap">{tanggal(k.tanggal)}</td>
                    <td className="text-xs text-muted num whitespace-nowrap">{k.no}</td>
                    <td><p className="font-semibold">{k.kategori}</p><p className="text-[11px] text-muted">{SUMBER[k.sumber]}</p></td>
                    <td className="max-w-md">{k.keterangan}</td>
                    <td className="money text-brand-700">{k.masuk ? rupiah(k.masuk) : ''}</td>
                    <td className="money text-rose-ink">{k.keluar ? rupiah(k.keluar) : ''}</td>
                    <td className={cx('money font-semibold', k.saldo < 0 && 'text-rose-ink')}>{sumber || q ? '' : rupiah(k.saldo)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Jumlah</td><td className="money">{rupiah(masuk)}</td><td className="money">{rupiah(keluar)}</td><td className="money">{saldoAwal == null ? '' : rupiah(akhir)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Panel>
      {(sumber || q) && <p className="text-xs text-muted mt-2 no-print">Kolom saldo disembunyikan saat filter aktif agar tidak menyesatkan.</p>}
      <TandaTangan />
    </>
  );
}
