import { rupiah, tanggal, periodeLabel, waLink, todayISO } from './format';

/**
 * Redaksi pesan WhatsApp ke wali santri / ustadz. Semua pesan memakai salam pembuka & penutup yang sama
 * agar konsisten. Format *tebal* dan _miring_ mengikuti WhatsApp.
 */
const SALAM = "Assalamu'alaikum warahmatullahi wabarakatuh.";

function penutup(settings, { terimaKasih = true } = {}) {
  return [
    '',
    ...(terimaKasih ? ['Jazakumullahu khairan katsiran.', ''] : []),
    "Wassalamu'alaikum warahmatullahi wabarakatuh.",
    '',
    'Hormat kami,',
    ...(settings.bendahara ? [`${settings.bendahara} — Bendahara`] : []),
    `*${settings.nama || 'Lembaga'}*`,
    ...(settings.telepon ? [`Telp/WA ${settings.telepon}`] : []),
  ];
}

const sapaanWali = (s) => `Yth. Bapak/Ibu wali ananda *${s.nama}*${s.kelas ? ` (${s.kelas})` : ''}`;

/** Info cara pembayaran dari Pengaturan (rekening, jam layanan). */
function caraBayar(settings) {
  const info = String(settings.infoPembayaran || '').trim();
  return info
    ? ['', 'Pembayaran dapat dilakukan melalui:', info]
    : ['', `Pembayaran dapat dilakukan langsung di kantor ${settings.nama || 'lembaga'}.`];
}

/** Rincian satu tagihan untuk pesan: "Syahriyah/SPP Oktober 2026 — Rp 50.000 (sisa dari Rp 75.000)". */
const barisTagihan = (t, i) => `${i + 1}. ${t.kewajibanNama} ${periodeLabel(t.periodeKey)} — *${rupiah(t.sisa)}*${t.dibayar > 0 ? ` _(sisa dari ${rupiah(t.nominal)})_` : ''}`;

/**
 * Pemberitahuan / pengingat tagihan ke wali.
 * items: tagihan yang belum lunas. opsi.portal: tautan portal wali (opsional).
 */
export function pesanTagihan(santri, items, settings, { portal } = {}) {
  const belum = items.filter((t) => t.sisa > 0).sort((a, b) => a.periodeKey - b.periodeKey || a.kewajibanNama.localeCompare(b.kewajibanNama));
  const total = belum.reduce((a, t) => a + t.sisa, 0);
  const MAKS = 12;
  return [
    SALAM,
    '',
    sapaanWali(santri),
    '',
    `Dengan hormat, bersama ini kami sampaikan rincian kewajiban ananda yang belum terselesaikan per ${tanggal(todayISO(), true)}:`,
    '',
    ...belum.slice(0, MAKS).map(barisTagihan),
    ...(belum.length > MAKS ? [`…dan ${belum.length - MAKS} tagihan lainnya.`] : []),
    '',
    `*Total: ${rupiah(total)}*`,
    ...caraBayar(settings),
    ...(portal ? ['', 'Rincian tagihan dan riwayat pembayaran dapat dilihat kapan saja di:', portal] : []),
    '',
    'Apabila Bapak/Ibu sudah melakukan pembayaran, mohon abaikan pesan ini. Atas perhatian dan kerja samanya kami ucapkan terima kasih.',
    ...penutup(settings),
  ].join('\n');
}

export function pesanKwitansi(p, settings) {
  const baris = p.items.map((i, n) => `${n + 1}. ${i.kewajibanNama} ${periodeLabel(i.periodeKey)} — ${rupiah(i.bayar)}${i.sisaSesudah > 0 ? ` _(sisa ${rupiah(i.sisaSesudah)})_` : ' ✓ lunas'}`);
  const masihSisa = p.items.some((i) => i.sisaSesudah > 0);
  return [
    SALAM,
    '',
    `Yth. Bapak/Ibu wali ananda *${p.santriNama}*`,
    '',
    'Alhamdulillah, pembayaran berikut telah kami terima dengan baik:',
    '',
    `No. kwitansi : ${p.no}`,
    `Tanggal      : ${tanggal(p.tanggal, true)}`,
    `Metode       : ${p.metode}`,
    '',
    ...baris,
    '',
    `*Total diterima: ${rupiah(p.total)}*`,
    ...(masihSisa ? ['', 'Sisa kewajiban dapat dilunasi pada pembayaran berikutnya.'] : []),
    '',
    'Semoga Allah memberkahi harta dan keluarga Bapak/Ibu.',
    ...penutup(settings),
  ].join('\n');
}

export function pesanSlip(g, settings) {
  const baris = g.items.map((i) => `• ${i.nama}: ${i.jenis === 'Potongan' ? '−' : ''}${rupiah(i.nominal)}`);
  return [
    SALAM,
    '',
    `Yth. ${g.ustadzNama}`,
    '',
    `Berikut rincian honor periode *${periodeLabel(g.periodeKey)}*:`,
    '',
    ...baris,
    '',
    `*Diterima: ${rupiah(g.neto)}*`,
    `Dibayar ${tanggal(g.tanggal, true)} melalui ${g.metode} (No. slip ${g.no}).`,
    '',
    'Terima kasih atas pengabdian dan ilmu yang telah diberikan.',
    ...penutup(settings),
  ].join('\n');
}

export function pesanPortal(santri, url, settings) {
  return [
    SALAM, '', sapaanWali(santri), '',
    'Bapak/Ibu kini dapat memantau tagihan, riwayat pembayaran, hafalan, dan kehadiran ananda kapan saja melalui tautan berikut:',
    url, '',
    '_Tautan ini khusus untuk keluarga ananda. Mohon tidak dibagikan kepada orang lain._',
    ...penutup(settings, { terimaKasih: false }),
  ].join('\n');
}

export function pesanRapor(santri, dari, sampai, settings) {
  return [
    SALAM, '', sapaanWali(santri), '',
    `Bersama ini kami kirimkan rapor ananda periode ${tanggal(dari, true)} s.d. ${tanggal(sampai, true)}. Semoga ananda senantiasa istiqamah dalam belajar dan menghafal Al-Qur'an.`,
    ...penutup(settings),
  ].join('\n');
}

/** Buka WhatsApp dengan pesan teks. Tanpa nomor → pengguna memilih kontak sendiri. */
export function kirimTeksWA(hp, pesan) {
  const url = hp ? waLink(hp, pesan) : `https://wa.me/?text=${encodeURIComponent(pesan)}`;
  window.open(url, '_blank', 'noopener');
}

/**
 * Seperti kirimTeksWA, tetapi pesannya baru siap setelah data dimuat (mis. mengambil semua tunggakan).
 * Jendela dibuka lebih dulu agar tidak diblokir browser, lalu diarahkan ke WhatsApp.
 */
export async function kirimTeksWANanti(hp, buatPesan) {
  const w = window.open('about:blank', '_blank');
  try {
    const pesan = await buatPesan();
    const url = hp ? waLink(hp, pesan) : `https://wa.me/?text=${encodeURIComponent(pesan)}`;
    if (w) { w.opener = null; w.location.href = url; } else window.open(url, '_blank', 'noopener');
  } catch (e) { w?.close(); throw e; }
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
