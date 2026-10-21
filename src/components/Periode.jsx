import { useState } from 'react';
import { BULAN, awalBulan, akhirBulan } from '../lib/format';
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

/** Rentang tanggal, default bulan berjalan. Mengembalikan [dari, sampai, setRentang(dari, sampai)]. */
export function useRentangBulanIni() {
  const [r, setR] = useState(() => {
    const n = new Date();
    return [awalBulan(n.getFullYear(), n.getMonth() + 1), akhirBulan(n.getFullYear(), n.getMonth() + 1)];
  });
  return [r[0], r[1], (dari, sampai) => setR([dari, sampai])];
}
