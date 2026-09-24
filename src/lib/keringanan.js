import { rupiah } from './format';

/**
 * Hitung nominal tagihan setelah keringanan tetap santri.
 * santri.keringanan = [{ kewajibanId, tipe: 'persen' | 'nominal', nilai, ket }]
 */
export function terapkanKeringanan(base, santri, kewajibanId) {
  const nominalAwal = Number(base) || 0;
  const k = (santri?.keringanan || []).find((x) => x.kewajibanId === kewajibanId && Number(x.nilai) > 0);
  if (!k || !nominalAwal) return { nominal: nominalAwal, nominalAwal, potongan: 0, ket: '' };
  const potongan = k.tipe === 'persen'
    ? Math.round((nominalAwal * Math.min(100, Number(k.nilai))) / 100)
    : Math.min(nominalAwal, Math.round(Number(k.nilai)));
  const label = k.tipe === 'persen' ? `${Number(k.nilai)}%` : rupiah(k.nilai);
  return { nominal: nominalAwal - potongan, nominalAwal, potongan, ket: `Keringanan ${label}${k.ket ? ` (${k.ket})` : ''}` };
}

/** Susun item tagihan untuk createTagihan, dengan keringanan diterapkan bila diminta. */
export function itemTagihan(s, kw, { nominal, bulan, tahun, tanggal, keterangan, pakaiKeringanan = true }) {
  const h = pakaiKeringanan ? terapkanKeringanan(nominal, s, kw.id) : { nominal: Number(nominal) || 0, potongan: 0, ket: '' };
  return {
    santri: s, kewajiban: kw, nominal: h.nominal, nominalAwal: h.nominalAwal, potongan: h.potongan,
    bulan, tahun, tanggal, keterangan: [keterangan, h.ket].filter(Boolean).join(' · '),
  };
}
