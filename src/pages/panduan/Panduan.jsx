import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Printer, ChevronDown, SearchX } from 'lucide-react';
import { norm } from '../../lib/format';
import { Button, PageHeader, SearchBox, Empty, cx } from '../../components/ui';
import { PANDUAN } from './isi';

const teks = (b) => [b.judul, b.ringkas, ...(b.langkah || []), ...(b.catatan || []), ...(b.tanya || []).flat()].join(' ');

function Bagian({ b }) {
  return (
    <section id={b.id} className="scroll-mt-24 bg-white border border-line rounded-xl p-5 sm:p-6 print:break-inside-avoid print:border-0 print:p-0 print:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-brass-700">{b.grup}</p>
          <h2 className="text-lg font-extrabold mt-0.5">{b.judul}</h2>
        </div>
        <div className="flex items-center gap-2 no-print">
          {b.admin && <span className="text-xs font-semibold rounded-md px-2 py-0.5 bg-brand-700 text-white">Khusus admin</span>}
          {b.link && (
            <Link to={b.link} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              Buka halaman<ArrowUpRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
      {b.ringkas && <p className="text-[15px] leading-relaxed text-muted mt-2 max-w-3xl">{b.ringkas}</p>}

      {b.langkah && (
        <ol className="mt-4 space-y-3 max-w-3xl">
          {b.langkah.map((l, i) => (
            <li key={i} className="flex gap-3">
              <span className="size-6 shrink-0 rounded-full bg-brand-50 text-brand-700 text-xs font-bold grid place-items-center ring-1 ring-brand-100 mt-0.5">{i + 1}</span>
              <span className="text-[15px] leading-relaxed">{l}</span>
            </li>
          ))}
        </ol>
      )}

      {b.catatan && (
        <ul className={cx('space-y-2 max-w-3xl', b.langkah ? 'mt-5 pt-4 border-t border-dashed border-line' : 'mt-4')}>
          {b.catatan.map((c, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brass-500" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}

      {b.tanya && (
        <div className="mt-4 divide-y divide-line border border-line rounded-lg max-w-3xl">
          {b.tanya.map(([q, a], i) => (
            <details key={i} className="group px-4 print:py-2">
              <summary className="flex items-center justify-between gap-3 py-3 cursor-pointer list-none font-semibold text-[15px] [&::-webkit-details-marker]:hidden">
                {q}<ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180 no-print" />
              </summary>
              <p className="pb-3 text-[15px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Panduan() {
  const { hash } = useLocation();
  const [q, setQ] = useState('');

  const semua = PANDUAN;
  const tampil = useMemo(() => {
    const nq = norm(q).trim();
    return nq ? semua.filter((b) => nq.split(/\s+/).every((w) => norm(teks(b)).includes(w))) : semua;
  }, [semua, q]);
  const grup = [...new Set(semua.map((b) => b.grup))];

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [hash]);

  const cetak = () => {
    document.querySelectorAll('#panduan details').forEach((d) => { d.open = true; });
    setQ('');
    setTimeout(() => window.print(), 100);
  };

  return (
    <>
      <PageHeader title="Panduan pemakaian" description="Cara memakai setiap menu, dari pengisian awal sampai laporan. Klik judul di daftar isi atau cari kata kunci, misalnya “cicilan” atau “keringanan”."
        actions={<Button variant="secondary" icon={Printer} onClick={cetak}>Cetak panduan</Button>} />

      <h1 className="print-only text-2xl font-extrabold mb-4">Panduan pemakaian PPMTQ</h1>
      <div className="grid lg:grid-cols-[220px_1fr] gap-8 items-start">
        <nav className="hidden lg:block sticky top-8 no-print" aria-label="Daftar isi panduan">
          <SearchBox value={q} onChange={setQ} placeholder="Cari di panduan" className="mb-5" />
          {grup.map((g) => (
            <div key={g} className="mb-4">
              <p className="text-xs font-semibold text-brass-700 mb-1.5">{g}</p>
              {semua.filter((b) => b.grup === g).map((b) => (
                <a key={b.id} href={`#${b.id}`}
                  className={cx('block text-sm py-1 pl-3 border-l-2 hover:text-brand-700',
                    hash === `#${b.id}` ? 'border-brand-600 text-brand-700 font-semibold' : 'border-line text-muted',
                    q && !tampil.includes(b) && 'opacity-40')}>
                  {b.judul}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div id="panduan" className="space-y-5 min-w-0">
          <SearchBox value={q} onChange={setQ} placeholder="Cari di panduan" className="lg:hidden" />
          {tampil.length === 0
            ? <div className="bg-white border border-line rounded-xl"><Empty icon={SearchX} title={`Tidak ada yang cocok dengan “${q}”`} text="Coba kata lain, misalnya: tagihan, cicilan, kwitansi, saldo, cetak." /></div>
            : tampil.map((b) => <Bagian key={b.id} b={b} />)}
        </div>
      </div>
    </>
  );
}
