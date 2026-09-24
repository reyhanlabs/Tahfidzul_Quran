/**
 * Ekspor Excel (.xlsx) — kolom angka bertipe angka dengan pemisah ribuan, baris judul tebal & dibekukan.
 * Pustaka dimuat hanya saat tombol ekspor diklik agar aplikasi tetap ringan.
 */
const cell = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return { value: v, type: Number, format: '#,##0' };
  return { value: String(v), type: String };
};
const lebar = (headers, rows) => headers.map((h, i) => ({
  width: Math.min(45, Math.max(8, String(h).length + 2, ...rows.slice(0, 300).map((r) => String(r[i] ?? '').length + 2))),
}));
const judul = (headers) => headers.map((h) => ({ value: String(h), type: String, fontWeight: 'bold', backgroundColor: '#E6F2EE' }));
const nama = (f) => (f.endsWith('.xlsx') ? f : `${f.replace(/\.csv$/, '')}.xlsx`);

export async function downloadExcel(filename, headers, rows) {
  const { default: write } = await import('write-excel-file');
  await write([judul(headers), ...rows.map((r) => r.map(cell))], { columns: lebar(headers, rows), fileName: nama(filename), stickyRowsCount: 1 });
}

/** sheets: [{ nama, headers, rows }] */
export async function downloadExcelMulti(filename, sheets) {
  const { default: write } = await import('write-excel-file');
  await write(sheets.map((s) => [judul(s.headers), ...s.rows.map((r) => r.map(cell))]), {
    columns: sheets.map((s) => lebar(s.headers, s.rows)),
    sheets: sheets.map((s) => s.nama.slice(0, 31)),
    fileName: nama(filename), stickyRowsCount: 1,
  });
}
