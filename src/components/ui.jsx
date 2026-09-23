import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { angka } from '../lib/format';

const cx = (...a) => a.filter(Boolean).join(' ');
export { cx };

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, ...p }) {
  const v = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-[inset_0_-2px_0_rgba(0,0,0,.18)]',
    secondary: 'bg-white text-ink border border-line hover:border-brand-200 hover:bg-brand-50',
    ghost: 'text-muted hover:text-ink hover:bg-black/5',
    danger: 'bg-white text-rose-ink border border-rose-ink/30 hover:bg-rose-ink hover:text-white',
    brass: 'bg-brass-500 text-white hover:bg-brass-700',
  }[variant];
  const s = { sm: 'h-8 px-2.5 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-12 px-5 text-base gap-2' }[size];
  return (
    <button {...p} disabled={p.disabled || loading}
      className={cx('inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap', v, s, className)}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, required, className, children }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="block text-xs font-semibold text-muted mb-1.5">{label}{required && <span className="text-rose-ink"> *</span>}</span>}
      {children}
      {error ? <span className="block text-xs text-rose-ink mt-1">{error}</span>
        : hint ? <span className="block text-xs text-muted mt-1">{hint}</span> : null}
    </label>
  );
}

const inputBase = 'h-10 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-100 disabled:bg-paper disabled:text-muted';
/** w-full kecuali className sudah menentukan lebar sendiri */
const ic = (className, extra = '') => cx(/(^|\s)w-/.test(className || '') ? '' : 'w-full', inputBase, extra, className);
const inputCls = cx('w-full', inputBase);
export const Input = ({ className, ...p }) => <input {...p} className={ic(className)} />;
export const Textarea = ({ className, ...p }) => <textarea rows={3} {...p} className={cx(inputCls, 'h-auto py-2', className)} />;
export function Select({ options = [], placeholder, className, ...p }) {
  return (
    <select {...p} className={ic(className, 'pr-8')}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => typeof o === 'object'
        ? <option key={o.value} value={o.value}>{o.label}</option>
        : <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/** Input rupiah: tampil dengan pemisah ribuan, nilai berupa angka. */
export function MoneyInput({ value, onChange, className, ...p }) {
  const show = value === '' || value == null ? '' : angka(value);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">Rp</span>
      <input inputMode="numeric" {...p} value={show}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); onChange(d === '' ? '' : Number(d)); }}
        className={cx(inputCls, 'pl-9 text-right num', className)} />
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Cari…', className }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputCls, 'pl-9')} />
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Esc untuk menutup. Fokus awal hanya sekali saat modal dibuka — bukan di setiap render,
  // supaya kursor tidak melompat saat pengguna mengetik.
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => e.key === 'Escape' && closeRef.current?.();
    document.addEventListener('keydown', k);
    const t = setTimeout(() => ref.current?.querySelector('input:not([type=checkbox]),select,textarea')?.focus(), 0);
    return () => { document.removeEventListener('keydown', k); clearTimeout(t); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
      <div className="absolute inset-0 bg-brand-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true"
        className={cx('relative w-full bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh]', width)}>
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-line">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 -m-1 rounded-lg text-muted hover:bg-black/5" aria-label="Tutup"><X className="size-5" /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line bg-paper/60 sm:rounded-b-2xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

const STATUS = {
  LUNAS: 'bg-brand-100 text-brand-800', SEBAGIAN: 'bg-brass-50 text-brass-700 ring-1 ring-brass-500/30',
  'BELUM BAYAR': 'bg-rose-ink/10 text-rose-ink', Aktif: 'bg-brand-100 text-brand-800',
  Nonaktif: 'bg-black/5 text-muted', Lulus: 'bg-sky-100 text-sky-800',
  Pemasukan: 'bg-brand-100 text-brand-800', Pengeluaran: 'bg-rose-ink/10 text-rose-ink', Potongan: 'bg-rose-ink/10 text-rose-ink', Pendapatan: 'bg-brand-100 text-brand-800',
  admin: 'bg-brand-700 text-white', bendahara: 'bg-brass-50 text-brass-700',
};
export function Badge({ children, tone }) {
  const label = { LUNAS: 'Lunas', SEBAGIAN: 'Sebagian', 'BELUM BAYAR': 'Belum bayar' }[children] || children;
  return <span className={cx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap', STATUS[tone || children] || 'bg-black/5 text-muted')}>{label}</span>;
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted mt-1 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, pad = true }) {
  return (
    <section className={cx('bg-white border border-line rounded-xl print-area', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-line">
          <h2 className="text-sm font-bold">{title}</h2>{action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="text-center py-14 px-6">
      {Icon && <Icon className="size-9 mx-auto text-brand-200 mb-3" strokeWidth={1.5} />}
      <p className="font-semibold">{title}</p>
      {text && <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const Spinner = ({ label = 'Memuat…' }) => (
  <div className="flex items-center gap-2 text-sm text-muted py-10 justify-center"><Loader2 className="size-4 animate-spin" />{label}</div>
);

export function Toolbar({ children }) {
  return <div className="flex flex-wrap items-end gap-3 mb-4 no-print">{children}</div>;
}

// ---- Toast & konfirmasi
const ToastCtx = createContext(null);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const [confirmState, setConfirm] = useState(null);
  const push = useCallback((text, type = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, type }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), type === 'error' ? 6000 : 3200);
  }, []);
  const confirm = useCallback((opts) => new Promise((resolve) => setConfirm({ ...opts, resolve })), []);
  const close = (v) => { confirmState?.resolve(v); setConfirm(null); };
  return (
    <ToastCtx.Provider value={{ toast: push, confirm }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,380px)] no-print" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('flex items-start gap-2.5 rounded-xl px-4 py-3 shadow-lg text-sm font-medium',
            t.type === 'error' ? 'bg-rose-ink text-white' : 'bg-brand-900 text-white')}>
            {t.type === 'error' ? <AlertTriangle className="size-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="size-4 mt-0.5 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
      <Modal open={!!confirmState} onClose={() => close(false)} title={confirmState?.title} width="max-w-md"
        footer={<>
          <Button variant="secondary" onClick={() => close(false)}>Batal</Button>
          <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{confirmState?.ok || 'Lanjutkan'}</Button>
        </>}>
        <p className="text-sm text-muted">{confirmState?.text}</p>
      </Modal>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/** Jalankan aksi async dengan status loading + toast error otomatis. */
export function useAction() {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn, okText) => {
    setBusy(true);
    try { const r = await fn(); if (okText) toast(okText); return r; }
    catch (e) {
      console.warn(e);
      toast(e?.code === 'permission-denied' ? 'Anda tidak punya izin untuk tindakan ini.' : (e?.message || 'Terjadi kesalahan.'), 'error');
      return undefined;
    } finally { setBusy(false); }
  }, [toast]);
  return [run, busy];
}

export function Stat({ label, value, sub, tone = 'ink' }) {
  const c = { ink: 'text-ink', brand: 'text-brand-700', rose: 'text-rose-ink', brass: 'text-brass-700' }[tone];
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={cx('text-xl font-extrabold num mt-1 truncate', c)}>{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </div>
  );
}
