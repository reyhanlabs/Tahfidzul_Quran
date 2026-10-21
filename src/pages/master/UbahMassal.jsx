import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Modal, useAction } from '../../components/ui';
import { useData } from '../../lib/data';
import { ubahSantriMassal } from '../../lib/ops';

const TETAP = '';

/** Ubah beberapa santri sekaligus: naik kelas, kelulusan/nonaktif, atau mengisi angkatan. */
export default function UbahMassal({ open, onClose, santri, onSelesai }) {
  const { kelas } = useData();
  const [run, busy] = useAction();
  const [f, setF] = useState({ kelas: TETAP, status: TETAP, tahunMasuk: '' });
  const [prog, setProg] = useState(null);

  useEffect(() => { if (open) { setF({ kelas: TETAP, status: TETAP, tahunMasuk: '' }); setProg(null); } }, [open]);

  const patch = {};
  if (f.kelas) patch.kelas = f.kelas;
  if (f.status) patch.status = f.status;
  if (/^\d{4}$/.test(String(f.tahunMasuk))) patch.tahunMasuk = Number(f.tahunMasuk);
  const ada = Object.keys(patch).length > 0;
  const asal = [...new Set(santri.map((s) => s.kelas || 'tanpa kelas'))];

  const simpan = () => run(async () => {
    if (!ada) throw new Error('Pilih minimal satu perubahan.');
    if (f.tahunMasuk && !patch.tahunMasuk) throw new Error('Angkatan harus 4 digit, mis. 2025.');
    await ubahSantriMassal(santri, patch, (done, total) => setProg({ done, total }));
    onSelesai?.();
    onClose();
  }, `${santri.length} santri diperbarui.`);

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={`Ubah ${santri.length} santri sekaligus`}
      subtitle="Untuk kenaikan kelas, kelulusan, atau melengkapi angkatan. Kolom yang dibiarkan “tidak diubah” tetap seperti semula."
      footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Batal</Button>
        <Button loading={busy} disabled={!ada} onClick={simpan}>{prog ? `Menyimpan ${prog.done} dari ${prog.total}…` : 'Terapkan'}</Button></>}>
      <fieldset disabled={busy} className="space-y-4 min-w-0">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Pindah ke kelas" className="sm:col-span-2" hint={`Kelas asal: ${asal.slice(0, 4).join(', ')}${asal.length > 4 ? ', …' : ''}`}>
            <Select value={f.kelas} placeholder="— tidak diubah —" options={kelas.map((k) => k.nama)} onChange={(e) => setF({ ...f, kelas: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={f.status} placeholder="— tidak diubah —" options={['Aktif', 'Nonaktif', 'Lulus']} onChange={(e) => setF({ ...f, status: e.target.value })} />
          </Field>
          <Field label="Angkatan (tahun masuk)" hint="Kosongkan bila tidak diubah.">
            <Input type="number" value={f.tahunMasuk} placeholder="mis. 2025" onChange={(e) => setF({ ...f, tahunMasuk: e.target.value })} />
          </Field>
        </div>
        <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 text-sm" role="status">
          {ada
            ? <><b>{santri.length}</b> santri akan {[
                patch.kelas && <span key="k">pindah ke <b>{patch.kelas}</b></span>,
                patch.status && <span key="s">berstatus <b>{patch.status}</b></span>,
                patch.tahunMasuk && <span key="t">tercatat angkatan <b>{patch.tahunMasuk}</b></span>,
              ].filter(Boolean).flatMap((x, i) => (i ? [<span key={`c${i}`}>, </span>, x] : [x]))}.
              <span className="block text-xs text-muted mt-1">Tagihan yang sudah dibuat tidak berubah. Tagihan berikutnya memakai kelas & angkatan baru (termasuk tarif per kelas/angkatan).</span></>
            : <span className="text-muted">Pilih perubahan yang ingin diterapkan.</span>}
        </div>
      </fieldset>
    </Modal>
  );
}
