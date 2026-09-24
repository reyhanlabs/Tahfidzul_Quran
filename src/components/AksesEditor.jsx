import { IZIN, PERAN } from '../lib/izin';
import { cx } from './ui';

/** Pilih hak akses: admin, atau kombinasi izin (dengan tombol peran siap pakai). value = { admin, izin: [] } */
export default function AksesEditor({ value, onChange }) {
  const set = new Set(value.izin || []);
  const sama = (a) => a.length === set.size && a.every((x) => set.has(x));
  const tombol = (aktif) => cx('px-3 h-8 rounded-lg text-sm font-semibold border', aktif ? 'bg-brand-700 text-white border-brand-700' : 'bg-white border-line text-muted hover:border-brand-200');
  return (
    <div>
      <p className="text-xs font-semibold text-muted mb-1.5">Peran siap pakai</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={tombol(value.admin)} onClick={() => onChange({ admin: true, izin: [] })}>Admin</button>
        {Object.entries(PERAN).map(([k, p]) => (
          <button type="button" key={k} className={tombol(!value.admin && sama(p.izin))} onClick={() => onChange({ admin: false, izin: [...p.izin] })}>{p.label}</button>
        ))}
      </div>
      {value.admin ? (
        <p className="text-sm text-muted mt-3 bg-paper border border-line rounded-lg px-3 py-2">Admin bisa melakukan semuanya: seluruh izin, menghapus dan membatalkan transaksi, pengaturan, pengguna, dan log aktivitas.</p>
      ) : (
        <div className="mt-3 border border-line rounded-lg divide-y divide-line">
          {Object.entries(IZIN).map(([k, i]) => (
            <label key={k} className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" className="size-4 mt-0.5 accent-brand-700" checked={set.has(k)}
                onChange={(e) => { const n = new Set(set); if (e.target.checked) n.add(k); else n.delete(k); onChange({ admin: false, izin: [...n] }); }} />
              <span><span className="text-sm font-semibold">{i.label}</span><span className="block text-xs text-muted">{i.ket}</span></span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
