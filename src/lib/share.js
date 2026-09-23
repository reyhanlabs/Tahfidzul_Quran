import { rupiah, tanggal, periodeLabel, waLink } from './format';

export function pesanKwitansi(p, settings) {
  const baris = p.items.map((i) => `• ${i.kewajibanNama} ${periodeLabel(i.periodeKey)}: ${rupiah(i.bayar)}${i.sisaSesudah > 0 ? ` (sisa ${rupiah(i.sisaSesudah)})` : ' (lunas)'}`);
  return [
    "Assalamu'alaikum warahmatullah.",
    `Terima kasih, pembayaran ananda *${p.santriNama}* sudah kami terima.`,
    '',
    `No. kwitansi: ${p.no}`,
    `Tanggal: ${tanggal(p.tanggal, true)}`,
    ...baris,
    `*Total: ${rupiah(p.total)}* (${p.metode})`,
    '',
    'Jazakumullahu khairan.',
    settings.nama,
  ].join('\n');
}

export function pesanSlip(g, settings) {
  const baris = g.items.map((i) => `• ${i.nama}: ${i.jenis === 'Potongan' ? '-' : ''}${rupiah(i.nominal)}`);
  return [
    "Assalamu'alaikum warahmatullah.",
    `Berikut rincian honor ${g.ustadzNama} periode ${periodeLabel(g.periodeKey)}:`,
    '',
    ...baris,
    `*Diterima: ${rupiah(g.neto)}*`,
    `Dibayar ${tanggal(g.tanggal, true)} via ${g.metode}. No. slip ${g.no}.`,
    '',
    'Jazakumullahu khairan.',
    settings.nama,
  ].join('\n');
}

/** Buka WhatsApp dengan pesan teks. Tanpa nomor → pengguna memilih kontak sendiri. */
export function kirimTeksWA(hp, pesan) {
  const url = hp ? waLink(hp, pesan) : `https://wa.me/?text=${encodeURIComponent(pesan)}`;
  window.open(url, '_blank', 'noopener');
}

/**
 * Kirim bukti sebagai gambar.
 * - HP (Android/iOS): buka lembar bagikan → pilih WhatsApp, gambar + pesan terkirim sekaligus.
 * - Komputer: gambar diunduh, lalu WhatsApp dibuka dengan pesannya; lampirkan gambar yang baru diunduh.
 * Mengembalikan 'share' | 'download'.
 */
export async function kirimGambarWA(el, namaFile, pesan, hp) {
  const { toBlob } = await import('html-to-image');
  const opt = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true, filter: (n) => !n.classList?.contains?.('no-print') };
  let blob;
  try { blob = await toBlob(el, opt); } catch { blob = await toBlob(el, { ...opt, skipFonts: true }); }
  if (!blob) throw new Error('Gagal membuat gambar bukti.');
  const file = new File([blob], `${namaFile}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: pesan }); return 'share'; }
    catch (e) { if (e?.name === 'AbortError') return 'batal'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  kirimTeksWA(hp, pesan);
  return 'download';
}
