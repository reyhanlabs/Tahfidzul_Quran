/** Data mushaf standar (riwayat Hafs, 6.236 ayat) untuk pencatatan hafalan. */
export const SURAH = [
  ['Al-Fatihah', 7], ['Al-Baqarah', 286], ["Ali 'Imran", 200], ["An-Nisa'", 176], ["Al-Ma'idah", 120], ["Al-An'am", 165],
  ["Al-A'raf", 206], ['Al-Anfal', 75], ['At-Taubah', 129], ['Yunus', 109], ['Hud', 123], ['Yusuf', 111],
  ["Ar-Ra'd", 43], ['Ibrahim', 52], ['Al-Hijr', 99], ['An-Nahl', 128], ["Al-Isra'", 111], ['Al-Kahf', 110],
  ['Maryam', 98], ['Taha', 135], ["Al-Anbiya'", 112], ['Al-Hajj', 78], ["Al-Mu'minun", 118], ['An-Nur', 64],
  ['Al-Furqan', 77], ["Asy-Syu'ara'", 227], ['An-Naml', 93], ['Al-Qasas', 88], ["Al-'Ankabut", 69], ['Ar-Rum', 60],
  ['Luqman', 34], ['As-Sajdah', 30], ['Al-Ahzab', 73], ["Saba'", 54], ['Fatir', 45], ['Yasin', 83],
  ['As-Saffat', 182], ['Sad', 88], ['Az-Zumar', 75], ['Gafir', 85], ['Fussilat', 54], ['Asy-Syura', 53],
  ['Az-Zukhruf', 89], ['Ad-Dukhan', 59], ['Al-Jasiyah', 37], ['Al-Ahqaf', 35], ['Muhammad', 38], ['Al-Fath', 29],
  ['Al-Hujurat', 18], ['Qaf', 45], ['Az-Zariyat', 60], ['At-Tur', 49], ['An-Najm', 62], ['Al-Qamar', 55],
  ['Ar-Rahman', 78], ["Al-Waqi'ah", 96], ['Al-Hadid', 29], ['Al-Mujadalah', 22], ['Al-Hasyr', 24], ['Al-Mumtahanah', 13],
  ['As-Saff', 14], ["Al-Jumu'ah", 11], ['Al-Munafiqun', 11], ['At-Tagabun', 18], ['At-Talaq', 12], ['At-Tahrim', 12],
  ['Al-Mulk', 30], ['Al-Qalam', 52], ['Al-Haqqah', 52], ["Al-Ma'arij", 44], ['Nuh', 28], ['Al-Jinn', 28],
  ['Al-Muzzammil', 20], ['Al-Muddassir', 56], ['Al-Qiyamah', 40], ['Al-Insan', 31], ['Al-Mursalat', 50], ["An-Naba'", 40],
  ["An-Nazi'at", 46], ["'Abasa", 42], ['At-Takwir', 29], ['Al-Infitar', 19], ['Al-Mutaffifin', 36], ['Al-Insyiqaq', 25],
  ['Al-Buruj', 22], ['At-Tariq', 17], ["Al-A'la", 19], ['Al-Gasyiyah', 26], ['Al-Fajr', 30], ['Al-Balad', 20],
  ['Asy-Syams', 15], ['Al-Lail', 21], ['Ad-Duha', 11], ['Asy-Syarh', 8], ['At-Tin', 8], ["Al-'Alaq", 19],
  ['Al-Qadr', 5], ['Al-Bayyinah', 8], ['Az-Zalzalah', 8], ["Al-'Adiyat", 11], ["Al-Qari'ah", 11], ['At-Takasur', 8],
  ["Al-'Asr", 3], ['Al-Humazah', 9], ['Al-Fil', 5], ['Quraisy', 4], ["Al-Ma'un", 7], ['Al-Kausar', 3],
  ['Al-Kafirun', 6], ['An-Nasr', 3], ['Al-Lahab', 5], ['Al-Ikhlas', 4], ['Al-Falaq', 5], ['An-Nas', 6],
];

/** Awal tiap juz: [surat, ayat] */
export const JUZ_AWAL = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

// Nomor ayat global (1..6236)
const AWAL_SURAH = [];
let n = 0;
for (const [, jml] of SURAH) { AWAL_SURAH.push(n); n += jml; }
export const TOTAL_AYAT = n;
export const global = (surat, ayat) => AWAL_SURAH[surat - 1] + ayat;
const AWAL_JUZ_G = JUZ_AWAL.map(([s, a]) => global(s, a));
export const JUZ_JUMLAH = AWAL_JUZ_G.map((g, i) => (AWAL_JUZ_G[i + 1] || TOTAL_AYAT + 1) - g);

export const namaSurah = (s) => (SURAH[s - 1] ? SURAH[s - 1][0] : '?');
export const jumlahAyat = (s) => (SURAH[s - 1] ? SURAH[s - 1][1] : 0);
export function juzDari(g) { let j = 0; while (j + 1 < 30 && AWAL_JUZ_G[j + 1] <= g) j++; return j + 1; }
export function posisi(g) { let s = 0; while (s + 1 < 114 && AWAL_SURAH[s + 1] < g) s++; return { surat: s + 1, ayat: g - AWAL_SURAH[s] }; }

/** Gabungkan rentang ayat global [[a,b],...] menjadi rentang yang tidak tumpang tindih. */
export function gabung(ranges) {
  const r = [...ranges].sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [a, b] of r) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b); else out.push([a, b]);
  }
  return out;
}
export const totalDariRentang = (ranges) => ranges.reduce((t, [a, b]) => t + (b - a + 1), 0);

/** Jumlah ayat hafal per juz (index 0 = juz 1). */
export function perJuz(ranges) {
  const hasil = Array(30).fill(0);
  for (const [a, b] of ranges) {
    for (let j = 0; j < 30; j++) {
      const ja = AWAL_JUZ_G[j]; const jb = ja + JUZ_JUMLAH[j] - 1;
      const lo = Math.max(a, ja); const hi = Math.min(b, jb);
      if (hi >= lo) hasil[j] += hi - lo + 1;
    }
  }
  return hasil;
}

export const NILAI = ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Maqbul', 'Ulang'];
export const lulusNilai = (nilai) => nilai !== 'Ulang';
