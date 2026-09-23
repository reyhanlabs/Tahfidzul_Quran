import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { useData } from '../lib/data';
import { norm } from '../lib/format';
import { cx } from './ui';

/** Combobox pencarian santri (nama, ID, NIS, wali). */
export default function SantriPicker({ value, onChange, onlyActive = true, placeholder = 'Ketik nama atau ID santri…', autoFocus }) {
  const { santri, santriMap } = useData();
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const [hi, setHi] = useState(0);
  const box = useRef(null);
  const selected = value ? santriMap[value] : null;

  const list = useMemo(() => {
    const nq = norm(q);
    return santri.filter((s) => (!onlyActive || s.status === 'Aktif')
      && (!nq || [s.nama, s.kode, s.nis, s.namaWali, s.namaAyah, s.kelas].some((x) => norm(x).includes(nq)))).slice(0, 40);
  }, [santri, q, onlyActive]);

  useEffect(() => {
    const h = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => setHi(0), [q]);

  const pick = (s) => { onChange(s?.id || ''); setQ(''); setOpen(false); };
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, list.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && open && list[hi]) { e.preventDefault(); pick(list[hi]); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      {selected && !open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="w-full h-10 rounded-lg border border-brand-200 bg-brand-50 px-3 text-sm flex items-center justify-between gap-2 text-left">
          <span className="truncate"><b>{selected.nama}</b> <span className="text-muted">· {selected.kode} · {selected.kelas || '-'}</span></span>
          <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); pick(null); }} className="text-muted hover:text-ink"><X className="size-4" /></span>
        </button>
      ) : (
        <div className="relative">
          <input autoFocus={autoFocus || open} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={key}
            placeholder={placeholder}
            className="w-full h-10 rounded-lg border border-line bg-white pl-3 pr-9 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100" />
          <ChevronsUpDown className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      )}
      {open && (
        <ul className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-white border border-line rounded-lg shadow-xl py-1">
          {list.length === 0 && <li className="px-3 py-2 text-sm text-muted">Tidak ada santri yang cocok.</li>}
          {list.map((s, i) => (
            <li key={s.id}>
              <button type="button" onMouseEnter={() => setHi(i)} onClick={() => pick(s)}
                className={cx('w-full text-left px-3 py-2 text-sm flex justify-between gap-3', i === hi && 'bg-brand-50')}>
                <span className="truncate"><b>{s.nama}</b> <span className="text-muted">{s.kode}</span></span>
                <span className="text-xs text-muted shrink-0">{s.kelas}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
