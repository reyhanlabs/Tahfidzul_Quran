/**
 * Pengaturan yang dibutuhkan operasi transaksi (kunci periode, rekening kas).
 * Diisi oleh DataProvider setiap kali pengaturan lembaga berubah.
 */
import { tanggal as fmtTanggal } from './format';

let ctx = { kunciSampai: '', rekening: [], metodeRekening: {} };

export const REKENING_DEFAULT = [{ id: 'tunai', nama: 'Kas tunai', saldoAwal: 0 }];

export function setKonteks(settings) {
  const rekening = settings.rekening?.length ? settings.rekening : [{ ...REKENING_DEFAULT[0], saldoAwal: Number(settings.saldoAwal) || 0 }];
  ctx = { kunciSampai: settings.kunciSampai || '', rekening, metodeRekening: settings.metodeRekening || {} };
}
export const konteks = () => ctx;

/** Tolak perubahan transaksi yang bertanggal di dalam periode terkunci. */
export function cekKunci(...tanggalList) {
  const k = ctx.kunciSampai;
  if (!k) return;
  for (const t of tanggalList) {
    if (t && t <= k) {
      throw new Error(`Periode s.d. ${fmtTanggal(k, true)} sudah dikunci (tutup buku). Transaksi bertanggal ${fmtTanggal(t, true)} tidak bisa ditambah, diubah, atau dihapus. Admin dapat membuka kunci di Pengaturan.`);
    }
  }
}
export const terkunci = (t) => Boolean(ctx.kunciSampai && t && t <= ctx.kunciSampai);

/** Rekening tujuan berdasarkan metode pembayaran (bisa diganti manual). */
export function rekeningUntuk(metode, pilihan) {
  const ids = ctx.rekening.map((r) => r.id);
  if (pilihan && ids.includes(pilihan)) return pilihan;
  const m = ctx.metodeRekening[metode];
  return ids.includes(m) ? m : ids[0] || 'tunai';
}
export const namaRekening = (id) => ctx.rekening.find((r) => r.id === id)?.nama || ctx.rekening[0]?.nama || 'Kas tunai';
