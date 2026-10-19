import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { cx } from './ui';

/**
 * Menu tindakan (⋯) untuk baris daftar. Menu digambar di atas halaman (portal) supaya tidak terpotong
 * oleh tabel yang bisa digulir, dan otomatis membuka ke atas bila dekat tepi bawah layar.
 * items: [{ label, icon, onClick, danger, hidden, disabled, divider, catatan }]
 */
export default function Menu({ items, label = 'Tindakan lain' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null); const box = useRef(null);
  const tampil = items.filter((i) => !i.hidden);

  useLayoutEffect(() => {
    if (!open) return;
    const r = btn.current.getBoundingClientRect();
    const tinggi = box.current?.offsetHeight || 240;
    const bawah = r.bottom + 4 + tinggi > window.innerHeight - 8;
    setPos({ top: bawah ? Math.max(8, r.top - 4 - tinggi) : r.bottom + 4, left: Math.max(8, Math.min(r.right - 224, window.innerWidth - 232)) });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const tutup = (e) => { if (!btn.current?.contains(e.target) && !box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    const geser = () => setOpen(false);
    document.addEventListener('mousedown', tutup); document.addEventListener('keydown', esc);
    window.addEventListener('scroll', geser, true); window.addEventListener('resize', geser);
    return () => {
      document.removeEventListener('mousedown', tutup); document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', geser, true); window.removeEventListener('resize', geser);
    };
  }, [open]);

  if (!tampil.some((i) => !i.divider)) return null;
  return (
    <>
      <button ref={btn} type="button" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className={cx('size-8 inline-grid place-items-center rounded-lg border bg-white text-muted hover:text-ink hover:border-brand-200', open ? 'border-brand-200 text-ink' : 'border-line')}>
        <MoreHorizontal className="size-4" />
      </button>
      {open && createPortal(
        <div ref={box} role="menu" style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          className="fixed z-[70] w-56 bg-white border border-line rounded-xl shadow-xl py-1 no-print">
          {tampil.map((i, k) => (i.divider ? <div key={k} className="my-1 border-t border-line" /> : (
            <button key={k} role="menuitem" type="button" disabled={i.disabled} title={i.catatan}
              onClick={() => { setOpen(false); i.onClick?.(); }}
              className={cx('w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left disabled:opacity-50 disabled:cursor-not-allowed',
                i.danger ? 'text-rose-ink hover:bg-rose-ink/5' : 'hover:bg-brand-50')}>
              {i.icon && <i.icon className="size-4 shrink-0" />}
              <span className="flex-1">{i.label}{i.catatan && <span className="block text-[11px] text-muted">{i.catatan}</span>}</span>
            </button>
          )))}
        </div>,
        document.body,
      )}
    </>
  );
}
