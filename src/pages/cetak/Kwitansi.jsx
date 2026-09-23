import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { useLiveDoc, COL } from '../../lib/db';
import { useData } from '../../lib/data';
import { rupiah, terbilang, tanggal, periodeLabel } from '../../lib/format';
import { Button, Spinner } from '../../components/ui';
import Pattern from '../../components/Pattern';

export function CetakBar({ label }) {
  return (
    <div className="no-print sticky top-0 z-10 bg-brand-900 text-white px-4 h-14 flex items-center justify-between">
      <button onClick={() => window.close()} className="text-sm text-white/70 hover:text-white inline-flex items-center gap-2"><ArrowLeft className="size-4" />Tutup</button>
      <p className="text-sm font-semibold">{label}</p>
      <Button variant="brass" size="sm" icon={Printer} onClick={() => window.print()}>Cetak</Button>
    </div>
  );
}

export default function Kwitansi() {
  const { id } = useParams();
  const { data: p, loading } = useLiveDoc(COL.pembayaran, id);
  const { settings } = useData();
  useEffect(() => { if (p) document.title = `Kwitansi ${p.no}`; }, [p]);
  if (loading) return <Spinner />;
  if (!p) return <p className="p-10 text-center text-muted">Kwitansi tidak ditemukan atau pembayaran sudah dibatalkan.</p>;
  const lunas = p.items.every((i) => i.sisaSesudah <= 0);

  return (
    <div className="min-h-full bg-paper">
      <style>{'@page { size: A5 landscape; margin: 8mm; }'}</style>
      <CetakBar label={`Kwitansi ${p.no}`} />
      <div className="p-4 sm:p-8 flex justify-center">
        <article className="print-area relative bg-white w-full max-w-[210mm] border border-line rounded-xl shadow-sm overflow-hidden">
          <div className="flex">
            <div className="relative w-10 shrink-0 bg-brand-900 overflow-hidden"><Pattern className="absolute inset-0 w-full h-full" id="kw" opacity={0.15} /></div>
            <div className="flex-1 p-6">
              <header className="flex items-start justify-between gap-4 border-b border-line pb-3">
                <div className="flex items-center gap-3">
                  <img src="/logo.svg" alt="" className="size-11" />
                  <div>
                    <p className="font-extrabold text-lg leading-tight uppercase">{settings.nama}</p>
                    <p className="text-[11px] text-muted">{[settings.alamat, settings.telepon && `Telp. ${settings.telepon}`].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold tracking-[0.2em] text-brand-700">KWITANSI</p>
                  <p className="text-xs num text-muted">{p.no}</p>
                </div>
              </header>

              <dl className="grid grid-cols-[150px_1fr] gap-y-1.5 text-sm mt-4">
                <dt className="text-muted">Telah terima dari</dt><dd className="font-semibold">{p.wali ? `${p.wali} (wali dari ${p.santriNama})` : p.santriNama}</dd>
                <dt className="text-muted">Santri</dt><dd>{p.santriNama} · {p.santriKode}{p.kelas && ` · ${p.kelas}`}</dd>
                <dt className="text-muted">Uang sejumlah</dt><dd className="italic font-semibold bg-brass-50 px-2 py-0.5 rounded">{terbilang(p.total)}</dd>
              </dl>

              <table className="w-full text-sm mt-4">
                <thead><tr className="text-xs text-muted border-b border-line"><th className="text-left py-1.5 font-semibold">Untuk pembayaran</th><th className="text-right font-semibold">Tagihan</th><th className="text-right font-semibold">Dibayar</th><th className="text-right font-semibold">Sisa</th></tr></thead>
                <tbody>
                  {p.items.map((i) => (
                    <tr key={i.tagihanId} className="border-b border-line/60">
                      <td className="py-1.5">{i.kewajibanNama} — {periodeLabel(i.periodeKey)}</td>
                      <td className="text-right num">{rupiah(i.nominal)}</td>
                      <td className="text-right num font-semibold">{rupiah(i.bayar)}</td>
                      <td className="text-right num">{i.sisaSesudah > 0 ? rupiah(i.sisaSesudah) : 'Lunas'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-end justify-between gap-6 mt-5">
                <div>
                  <p className="text-xs text-muted">Jumlah</p>
                  <p className="text-2xl font-extrabold num border-y-2 border-ink py-1 px-2 inline-block mt-1">{rupiah(p.total)}</p>
                  <p className="text-xs text-muted mt-2">Metode: {p.metode}{p.keterangan && ` · ${p.keterangan}`}</p>
                </div>
                <div className="text-center text-sm">
                  <p>{settings.kota ? `${settings.kota}, ` : ''}{tanggal(p.tanggal, true)}</p>
                  <p>Penerima,</p>
                  <div className="h-16 relative grid place-items-center">
                    <span className={`rotate-[-12deg] border-[3px] rounded-lg px-3 py-0.5 font-extrabold tracking-widest text-lg opacity-75 ${lunas ? 'border-brand-600 text-brand-600' : 'border-brass-500 text-brass-500'}`}>
                      {lunas ? 'LUNAS' : 'CICILAN'}
                    </span>
                  </div>
                  <p className="font-bold underline">{settings.bendahara || p.createdBy}</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
