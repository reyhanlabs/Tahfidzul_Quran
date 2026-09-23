import { BULAN } from '../lib/format';
import { Select, Input, Field } from './ui';

export function PeriodePicker({ bulan, tahun, onChange, labels = true }) {
  const b = <Select value={bulan} onChange={(e) => onChange(Number(e.target.value), tahun)} options={BULAN.map((n, i) => ({ value: i + 1, label: n }))} />;
  const t = <Input type="number" className="w-24" value={tahun} onChange={(e) => onChange(bulan, Number(e.target.value))} />;
  if (!labels) return <div className="flex gap-2">{b}{t}</div>;
  return <><Field label="Bulan">{b}</Field><Field label="Tahun">{t}</Field></>;
}

export function RangePicker({ dari, sampai, onChange }) {
  return (
    <>
      <Field label="Dari tanggal"><Input type="date" value={dari} onChange={(e) => onChange(e.target.value, sampai)} /></Field>
      <Field label="Sampai tanggal"><Input type="date" value={sampai} onChange={(e) => onChange(dari, e.target.value)} /></Field>
    </>
  );
}
