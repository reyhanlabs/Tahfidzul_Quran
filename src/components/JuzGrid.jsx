import { JUZ_JUMLAH } from '../lib/quran';
import { cx } from './ui';

/** Kotak 30 juz; tinggi isian = persentase ayat yang sudah dihafal. */
export default function JuzGrid({ perJuz = [], kecil }) {
  return (
    <div className={cx('grid gap-1', kecil ? 'grid-cols-10' : 'grid-cols-6 sm:grid-cols-10')}>
      {JUZ_JUMLAH.map((jml, i) => {
        const p = Math.round(((perJuz[i] || 0) / jml) * 100);
        return (
          <div key={i} title={`Juz ${i + 1}: ${perJuz[i] || 0}/${jml} ayat (${p}%)`}
            className={cx('relative rounded-md border overflow-hidden text-center', kecil ? 'h-7' : 'h-11', p === 100 ? 'border-brand-600' : 'border-line')}>
            <div className={cx('absolute inset-x-0 bottom-0', p === 100 ? 'bg-brand-600' : 'bg-brand-200')} style={{ height: `${p}%` }} />
            <span className={cx('relative font-bold num', kecil ? 'text-[10px] leading-7' : 'text-xs leading-[2.75rem]', p === 100 ? 'text-white' : 'text-ink')}>{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

