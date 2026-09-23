import { useMemo, useState } from 'react';
import { saveMaster } from '../../lib/ops';
import { useData } from '../../lib/data';
import { Button, Modal, Textarea, useAction } from '../../components/ui';

const COLS = ['nis', 'nama', 'jk', 'tempatLahir', 'tanggalLahir', 'alamat', 'namaAyah', 'namaIbu', 'namaWali', 'hp', 'kelas', 'tahunMasuk'];
const LABEL = 'NIS | Nama | Jenis kelamin | Tempat lahir | Tanggal lahir | Alamat | Ayah | Ibu | Wali | No. HP | Kelas | Tahun masuk';

function toISO(s) {
  const t = String(s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}
function toJK(s) { const t = String(s || '').trim().toUpperCase(); return t.startsWith('L') ? 'Laki-laki' : t.startsWith('P') ? 'Perempuan' : ''; }

export default function ImportSantri({ open, onClose }) {
  const { kelas } = useData();
  const [text, setText] = useState('');
  const [run, busy] = useAction();
  const [progress, setProgress] = useState(0);

  const rows = useMemo(() => text.split(/\r?\n/).map((l) => l.split(/\t|;/)).filter((c) => c.length >= 2 && c[1]?.trim())
    .map((c) => {
      const o = Object.fromEntries(COLS.map((k, i) => [k, (c[i] || '').trim()]));
      o.jk = toJK(o.jk); o.tanggalLahir = toISO(o.tanggalLahir); o.tahunMasuk = o.tahunMasuk ? Number(o.tahunMasuk) : '';
      o.status = 'Aktif';
      return o;
    }).filter((o) => o.nama.toLowerCase() !== 'nama'), [text]);

  const kelasBaru = [...new Set(rows.map((r) => r.kelas).filter((k) => k && !kelas.some((x) => x.nama === k)))];

  const go = () => run(async () => {
    for (const k of kelasBaru) await saveMaster('kelas', { nama: k });
    for (let i = 0; i < rows.length; i++) { await saveMaster('santri', rows[i]); setProgress(i + 1); }
    setText(''); setProgress(0); onClose();
  }, `${rows.length} santri berhasil diimpor.`);

  return (
    <Modal open={open} onClose={onClose} title="Impor data santri" width="max-w-3xl"
      subtitle="Salin baris dari Excel/Google Sheets lalu tempel di bawah. Urutan kolom:"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button>
        <Button loading={busy} disabled={!rows.length} onClick={go}>{busy ? `Mengimpor ${progress}/${rows.length}` : `Impor ${rows.length} santri`}</Button></>}>
      <p className="text-xs font-semibold bg-paper border border-line rounded-lg px-3 py-2 mb-3 overflow-x-auto whitespace-nowrap">{LABEL}</p>
      <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs"
        placeholder={'2026001\tAhmad Fauzi\tL\tBekasi\t12/03/2017\tJl. Melati 3\tBudi\tRina\t\t081200000001\tKelas A\t2025'} />
      <p className="text-sm text-muted mt-3">
        Terbaca <b className="text-ink">{rows.length}</b> santri. Jenis kelamin cukup L/P, tanggal boleh dd/mm/yyyy.
        {kelasBaru.length > 0 && <> Kelas baru yang akan dibuat: <b className="text-ink">{kelasBaru.join(', ')}</b>.</>}
      </p>
    </Modal>
  );
}
