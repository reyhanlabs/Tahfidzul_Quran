import { useState } from 'react';
import { Printer } from 'lucide-react';
import { useLiveQuery, kasRange } from '../../lib/db';
import { rupiah, tanggal, awalBulan, akhirBulan } from '../../lib/format';
import { Button, PageHeader, Panel, Toolbar } from '../../components/ui';
import { RangePicker } from '../../components/Periode';
import { Kop, TandaTangan } from '../../components/Kop';
import { useSaldoAwal } from '../BukuKas';

const sumBy = (list, key, val) => Object.entries(list.reduce((m, k) => { if (k[val]) m[k[key] || 'Lainnya'] = (m[k[key] || 'Lainnya'] || 0) + k[val]; return m; }, {}))
  .sort((a, b) => b[1] - a[1]);

function Rincian({ title, rows, total }) {
  return (
    <Panel title={title} pad={false}>
      <table className="ledger">
        <tbody>
          {rows.length === 0 && <tr><td className="text-muted">Tidak ada.</td><td /></tr>}
          {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="money">{rupiah(v)}</td></tr>)}
        </tbody>
        <tfoot><tr><td>Total</td><td className="money">{rupiah(total)}</td></tr></tfoot>
      </table>
    </Panel>
  );
}

export default function LapKeuangan() {
  const n = new Date();
  const [dari, setDari] = useState(awalBulan(n.getFullYear(), n.getMonth() + 1));
  const [sampai, setSampai] = useState(akhirBulan(n.getFullYear(), n.getMonth() + 1));
  const { data } = useLiveQuery(() => kasRange(dari, sampai), [dari, sampai]);
  const saldoAwal = useSaldoAwal(dari, [data.length]);
  const masuk = data.reduce((a, k) => a + (k.masuk || 0), 0);
  const keluar = data.reduce((a, k) => a + (k.keluar || 0), 0);

  return (
    <>
      <PageHeader title="Laporan keuangan" description="Ringkasan arus kas dan rinciannya per kategori untuk rentang tanggal yang dipilih. Siap dicetak."
        actions={<Button variant="secondary" icon={Printer} onClick={() => window.print()}>Cetak laporan</Button>} />
      <Toolbar><RangePicker dari={dari} sampai={sampai} onChange={(a, b) => { setDari(a); setSampai(b); }} /></Toolbar>
      <Kop judul="Laporan keuangan" sub={`Periode ${tanggal(dari, true)} s.d. ${tanggal(sampai, true)}`} />

      <Panel title="Ringkasan arus kas" pad={false} className="mb-5">
        <table className="ledger">
          <tbody>
            <tr><td>Saldo awal per {tanggal(dari, true)}</td><td className="money">{saldoAwal == null ? '…' : rupiah(saldoAwal)}</td></tr>
            <tr><td>Total pemasukan</td><td className="money text-brand-700">{rupiah(masuk)}</td></tr>
            <tr><td>Total pengeluaran</td><td className="money text-rose-ink">({rupiah(keluar)})</td></tr>
            <tr><td>Surplus / defisit periode</td><td className="money">{rupiah(masuk - keluar)}</td></tr>
          </tbody>
          <tfoot><tr><td>Saldo akhir per {tanggal(sampai, true)}</td><td className="money text-base">{saldoAwal == null ? '…' : rupiah(saldoAwal + masuk - keluar)}</td></tr></tfoot>
        </table>
      </Panel>

      <div className="grid md:grid-cols-2 gap-5 print:grid-cols-2">
        <Rincian title="Pemasukan per kategori" rows={sumBy(data, 'kategori', 'masuk')} total={masuk} />
        <Rincian title="Pengeluaran per kategori" rows={sumBy(data, 'kategori', 'keluar')} total={keluar} />
        <Rincian title="Pembayaran santri per jenis kewajiban" rows={sumBy(data.filter((k) => k.sumber === 'pembayaran'), 'kewajiban', 'masuk')}
          total={data.filter((k) => k.sumber === 'pembayaran').reduce((a, k) => a + k.masuk, 0)} />
        <Rincian title="Pemasukan per metode" rows={sumBy(data, 'metode', 'masuk')} total={masuk} />
      </div>
      <TandaTangan />
    </>
  );
}
