import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { cx } from './ui';

/** Menu tindakan (⋯). items: [{ label, icon, onClick, danger, hidden, divider }] */
export default function Menu({ items, label = 'Tindakan lain' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const tutup = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', tutup); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', tutup); document.removeEventListener('keydown', esc); };
  }, [open]);
  const tampil = items.filter((i) => !i.hidden);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen(!open)}
        className="size-9 grid place-items-center rounded-lg border border-line bg-white text-muted hover:text-ink hover:border-brand-200">
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-56 bg-white border border-line rounded-xl shadow-xl py-1">
          {tampil.map((i, k) => (i.divider ? <div key={k} className="my-1 border-t border-line" /> : (
            <button key={k} role="menuitem" type="button" onClick={() => { setOpen(false); i.onClick(); }}
              className={cx('w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left', i.danger ? 'text-rose-ink hover:bg-rose-ink/5' : 'hover:bg-brand-50')}>
              {i.icon && <i.icon className="size-4 shrink-0" />}{i.label}
            </button>
          )))}
        </div>
      )}
    </div>
  );
}
