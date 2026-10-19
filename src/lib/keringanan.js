import { rupiah } from './format';
import { tarifUntuk } from './tarif';

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

/**
 * Susun item tagihan untuk createTagihan.
 * ikutiTarif = true → nominal dasar diambil dari tarif khusus jenis kewajiban (per angkatan / per kelas),
 * lalu keringanan tetap santri diterapkan bila diminta.
 */
export function itemTagihan(s, kw, {
  nominal, bulan, tahun, tanggal, keterangan, pakaiKeringanan = true, ikutiTarif = false, kelasList = [],
}) {
  const tarif = ikutiTarif ? tarifUntuk(kw, s, kelasList) : { nominal: Number(nominal) || 0, sumber: '', khusus: false };
  const base = tarif.nominal;
  const h = pakaiKeringanan ? terapkanKeringanan(base, s, kw.id) : { nominal: base, nominalAwal: base, potongan: 0, ket: '' };
  return {
    santri: s, kewajiban: kw, nominal: h.nominal, nominalAwal: h.nominalAwal ?? base, potongan: h.potongan,
    sumberTarif: tarif.sumber, tarifKhusus: tarif.khusus, dibebaskan: tarif.khusus && base === 0,
    bulan, tahun, tanggal, keterangan: [keterangan, h.ket].filter(Boolean).join(' · '),
  };
}
