import { Plus, X } from 'lucide-react';
import { Button, Input, Select, MoneyInput } from '../../components/ui';
import { rupiah } from '../../lib/format';
import { terapkanKeringanan } from '../../lib/keringanan';

/** Daftar keringanan tetap santri per jenis kewajiban (persen atau rupiah). */
export default function KeringananField({ value = [], onChange, kewajiban }) {
  const list = Array.isArray(value) ? value : [];
  const set = (i, patch) => onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const opsi = kewajiban.filter((k) => k.status === 'Aktif');
  return (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-xs text-muted">Tidak ada. Tambahkan jika santri ini mendapat potongan tetap, misalnya anak yatim atau saudara kandung.</p>}
      {list.map((k, i) => {
        const kw = kewajiban.find((x) => x.id === k.kewajibanId);
        const contoh = kw ? terapkanKeringanan(kw.nominal, { keringanan: [k] }, kw.id) : null;
        return (
          <div key={i} className="rounded-lg border border-line p-2.5 space-y-2">
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <Select className="flex-1 min-w-40" value={k.kewajibanId} placeholder="— jenis kewajiban —" options={opsi.map((x) => ({ value: x.id, label: x.nama }))} onChange={(e) => set(i, { kewajibanId: e.target.value })} />
              <Select className="w-32" value={k.tipe} options={[{ value: 'persen', label: 'Persen (%)' }, { value: 'nominal', label: 'Rupiah' }]} onChange={(e) => set(i, { tipe: e.target.value, nilai: '' })} />
              <div className="w-36">
                {k.tipe === 'persen'
                  ? <Input type="number" min={1} max={100} value={k.nilai} onChange={(e) => set(i, { nilai: e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value))) })} placeholder="50" />
                  : <MoneyInput value={k.nilai} onChange={(v) => set(i, { nilai: v })} />}
              </div>
              <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="px-1.5 text-muted hover:text-rose-ink" aria-label="Hapus keringanan"><X className="size-4" /></button>
            </div>
            <Input value={k.ket || ''} onChange={(e) => set(i, { ket: e.target.value })} placeholder="Alasan, mis. anak yatim (opsional)" />
            {contoh && contoh.potongan > 0 && <p className="text-xs text-brass-700">{kw.nama}: {rupiah(contoh.nominalAwal)} → <b>{rupiah(contoh.nominal)}</b></p>}
          </div>
        );
      })}
      <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => onChange([...list, { kewajibanId: '', tipe: 'persen', nilai: '', ket: '' }])}>Tambah keringanan</Button>
    </div>
  );
}
