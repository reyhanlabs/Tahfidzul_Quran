export const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
export const BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

const rp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const rupiah = (n) => rp.format(Number(n) || 0).replace(/\u00a0/g, ' ');
export const angka = (n) => nf.format(Number(n) || 0);
export const rupiahRingkas = (n) => {
  const v = Number(n) || 0; const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1).replace('.', ',') + ' M';
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + ' jt';
  if (a >= 1e3) return Math.round(v / 1e3) + ' rb';
  return String(v);
};

export const pad = (n, len) => String(n).padStart(len, '0');

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}
export function isoOf(y, m, d) { return `${y}-${pad(m, 2)}-${pad(d, 2)}`; }
export function awalBulan(y, m) { return isoOf(y, m, 1); }
export function akhirBulan(y, m) { return isoOf(y, m, new Date(y, m, 0).getDate()); }

export function tanggal(iso, panjang = false) {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${(panjang ? BULAN : BULAN_SINGKAT)[m - 1]} ${y}`;
}

export const periodeKey = (bulan, tahun) => Number(tahun) * 100 + Number(bulan);
export const periodeLabel = (key) => {
  if (!key) return '–';
  const y = Math.floor(key / 100), m = key % 100;
  return `${BULAN[m - 1]} ${y}`;
};

export function statusTagihan(nominal, dibayar) {
  const sisa = (Number(nominal) || 0) - (Number(dibayar) || 0);
  if (sisa <= 0) return 'LUNAS';
  if ((Number(dibayar) || 0) > 0) return 'SEBAGIAN';
  return 'BELUM BAYAR';
}

const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
function tb(n) {
  if (n < 12) return SATUAN[n];
  if (n < 20) return tb(n - 10) + ' belas';
  if (n < 100) return tb(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + tb(n % 10) : '');
  if (n < 200) return 'seratus' + (n > 100 ? ' ' + tb(n - 100) : '');
  if (n < 1000) return tb(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + tb(n % 100) : '');
  if (n < 2000) return 'seribu' + (n > 1000 ? ' ' + tb(n - 1000) : '');
  if (n < 1e6) return tb(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + tb(n % 1000) : '');
  if (n < 1e9) return tb(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + tb(n % 1e6) : '');
  if (n < 1e12) return tb(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + tb(n % 1e9) : '');
  return tb(Math.floor(n / 1e12)) + ' triliun' + (n % 1e12 ? ' ' + tb(n % 1e12) : '');
}
export function terbilang(n) {
  const v = Math.round(Math.abs(Number(n) || 0));
  if (v === 0) return 'Nol rupiah';
  const s = tb(v).trim().replace(/\s+/g, ' ') + ' rupiah';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function norm(s) { return String(s ?? '').toLowerCase().normalize('NFKD'); }

export function waLink(hp, pesan) {
  let n = String(hp || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('8')) n = '62' + n;
  return `https://wa.me/${n}?text=${encodeURIComponent(pesan)}`;
}

export function downloadCSV(filename, headers, rows) {
  const esc = (v) => {
    let s = v == null ? '' : String(v);
    // cegah formula injection saat dibuka di Excel (sel yang diawali = + - @)
    if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(';'), ...rows.map((r) => r.map(esc).join(';'))];
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
