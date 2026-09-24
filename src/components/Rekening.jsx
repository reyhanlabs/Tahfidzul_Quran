import { useData } from '../lib/data';
import { Field, Select } from './ui';

/** Pilihan rekening kas; hanya tampil bila lembaga punya lebih dari satu rekening. */
export default function RekeningSelect({ value, onChange, label = 'Masuk ke rekening', className }) {
  const { rekening } = useData();
  if (!rekening || rekening.length < 2) return null;
  return (
    <Field label={label} className={className}>
      <Select value={value} options={rekening.map((r) => ({ value: r.id, label: r.nama }))} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
