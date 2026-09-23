import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveDoc, COL } from '../../lib/db';
import { useData } from '../../lib/data';
import { rupiah, terbilang, tanggal, periodeLabel } from '../../lib/format';
import { Spinner } from '../../components/ui';
import { CetakBar } from './Kwitansi';

export default function SlipGaji() {
  const { id } = useParams();
  const { data: g, loading } = useLiveDoc(COL.gaji, id);
  const { settings } = useData();
  useEffect(() => { if (g) document.title = `Slip ${g.no}`; }, [g]);
  if (loading) return <Spinner />;
  if (!g) return <p className="p-10 text-center text-muted">Slip tidak ditemukan.</p>;
  const pend = g.items.filter((i) => i.jenis === 'Pendapatan');
  const pot = g.items.filter((i) => i.jenis === 'Potongan');

  return (
    <div className="min-h-full bg-paper">
      <style>{'@page { size: A5 portrait; margin: 10mm; }'}</style>
      <CetakBar label={`Slip gaji ${g.no}`} />
      <div className="p-4 sm:p-8 flex justify-center">
        <article className="print-area bg-white w-full max-w-[148mm] border border-line rounded-xl p-6 text-sm">
          <header className="text-center border-b-2 border-brand-700 pb-3">
            <p className="font-extrabold text-base uppercase">{settings.nama}</p>
            <p className="text-[11px] text-muted">{settings.alamat}</p>
            <p className="mt-3 font-extrabold tracking-[0.15em] text-brand-700">SLIP GAJI / HONOR</p>
            <p className="text-xs text-muted">{periodeLabel(g.periodeKey)} · {g.no}</p>
          </header>
          <dl className="grid grid-cols-[110px_1fr] gap-y-1 mt-4">
            <dt className="text-muted">Nama</dt><dd className="font-semibold">{g.ustadzNama}</dd>
            <dt className="text-muted">Jabatan</dt><dd>{g.jabatan || '–'}</dd>
            <dt className="text-muted">Dibayar</dt><dd>{tanggal(g.tanggal, true)} · {g.metode}</dd>
            {g.rekening && <><dt className="text-muted">Rekening</dt><dd>{g.bank} {g.rekening}</dd></>}
          </dl>
          <p className="font-bold mt-5 mb-1">Pendapatan</p>
          {pend.map((i, k) => <div key={k} className="flex justify-between py-1 border-b border-line/60"><span>{i.nama}</span><span className="num">{rupiah(i.nominal)}</span></div>)}
          <div className="flex justify-between py-1 font-semibold"><span>Total pendapatan</span><span className="num">{rupiah(g.bruto)}</span></div>
          {pot.length > 0 && <>
            <p className="font-bold mt-3 mb-1">Potongan</p>
            {pot.map((i, k) => <div key={k} className="flex justify-between py-1 border-b border-line/60"><span>{i.nama}</span><span className="num text-rose-ink">({rupiah(i.nominal)})</span></div>)}
            <div className="flex justify-between py-1 font-semibold"><span>Total potongan</span><span className="num">({rupiah(g.potongan)})</span></div>
          </>}
          <div className="flex justify-between items-center mt-4 bg-brand-900 text-white rounded-lg px-4 py-3">
            <span className="font-semibold">Diterima</span><span className="text-xl font-extrabold num">{rupiah(g.neto)}</span>
          </div>
          <p className="text-xs italic text-muted mt-2">Terbilang: {terbilang(g.neto)}</p>
          {g.keterangan && <p className="text-xs mt-1">Catatan: {g.keterangan}</p>}
          <div className="grid grid-cols-2 text-center mt-8">
            <div><p>Penerima,</p><div className="h-14" /><p className="font-bold underline">{g.ustadzNama}</p></div>
            <div><p>Bendahara,</p><div className="h-14" /><p className="font-bold underline">{settings.bendahara || '....................'}</p></div>
          </div>
        </article>
      </div>
    </div>
  );
}
