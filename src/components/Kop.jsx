import { useData } from '../lib/data';
import { tanggal, todayISO } from '../lib/format';

/** Kop laporan — hanya tampil saat dicetak. */
export function Kop({ judul, sub }) {
  const { settings } = useData();
  return (
    <div className="print-only mb-5">
      <div className="flex items-center gap-4 border-b-2 border-brand-700 pb-3">
        <img src="/logo.svg" alt="" className="size-12" />
        <div>
          <p className="text-lg font-extrabold uppercase">{settings.nama}</p>
          <p className="text-xs">{[settings.alamat, settings.telepon && `Telp. ${settings.telepon}`].filter(Boolean).join(' · ')}</p>
        </div>
      </div>
      <p className="text-center font-extrabold mt-4 text-base uppercase">{judul}</p>
      {sub && <p className="text-center text-sm">{sub}</p>}
    </div>
  );
}

export function TandaTangan() {
  const { settings } = useData();
  return (
    <div className="print-only mt-10">
      <div className="grid grid-cols-2 text-sm text-center">
        <div><p>&nbsp;</p><p>Mengetahui,</p><p>Pimpinan</p><p className="mt-16 font-bold underline">{settings.pimpinan || '....................'}</p></div>
        <div><p>{settings.kota || '........'}, {tanggal(todayISO(), true)}</p><p>&nbsp;</p><p>Bendahara</p><p className="mt-16 font-bold underline">{settings.bendahara || '....................'}</p></div>
      </div>
    </div>
  );
}
