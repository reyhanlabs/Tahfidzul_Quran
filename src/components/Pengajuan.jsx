import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Pencil, Trash2, RotateCcw, Check, X, ClipboardCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/db';
import { useAuth } from '../lib/auth';
import { batalkanPengajuan, putuskanPengajuan } from '../lib/persetujuan';
import { namaRekening } from '../lib/konteks';
import { rupiah, tanggal } from '../lib/format';
import { Badge, Button, Empty, Field, Modal, Panel, Textarea, useAction, useToast } from './ui';

export const STATUS_PJ = {
  menunggu: { label: 'Menunggu', tone: 'SEBAGIAN' },
  disetujui: { label: 'Disetujui', tone: 'LUNAS' },
  ditolak: { label: 'Ditolak', tone: 'BELUM BAYAR' },
};
export const BadgePJ = ({ s }) => <Badge tone={STATUS_PJ[s]?.tone}>{STATUS_PJ[s]?.label || s}</Badge>;

/** Daftar pengajuan pengeluaran. mode 'pengaju' (bagian keuangan) atau 'penyetuju'. */
export function DaftarPengajuan({ dari, sampai, mode = 'pengaju', onUbah, hanyaMenunggu }) {
  const { profile } = useAuth();
  const { confirm } = useToast();
  const [run] = useAction();
  const [putus, setPutus] = useState(null);
  const { data, loading } = useLiveQuery(() => (hanyaMenunggu
    ? query(collection(db, 'pengajuan'), where('status', '==', 'menunggu'))
    : query(collection(db, 'pengajuan'), where('tanggal', '>=', dari), where('tanggal', '<=', sampai))), [dari, sampai, hanyaMenunggu]);
  const rows = useMemo(() => [...data].sort((a, b) => (a.status === 'menunggu' ? -1 : 0) - (b.status === 'menunggu' ? -1 : 0) || b.tanggal.localeCompare(a.tanggal)), [data]);

  const batal = async (p) => {
    if (!await confirm({ title: `Hapus pengajuan ${p.no}?`, text: `${p.kategori} · ${rupiah(p.nominal)}`, ok: 'Hapus', danger: true })) return;
    run(() => batalkanPengajuan(p), 'Pengajuan dihapus.');
  };

  if (loading) return <Panel pad={false}><Empty title="Memuat…" /></Panel>;
  if (!rows.length) return <Panel pad={false}><Empty icon={ClipboardCheck} title={hanyaMenunggu ? 'Tidak ada pengajuan yang menunggu' : 'Belum ada pengajuan pada rentang ini'} /></Panel>;
  return (
    <>
      <Panel pad={false}>
        <ul className="divide-y divide-line">
          {rows.map((p) => (
            <li key={p.id} className="px-4 py-3 flex flex-wrap lg:flex-nowrap gap-3 items-start">
              <div className="flex-1 min-w-60">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted num">{p.no}</span><BadgePJ s={p.status} />
                  <span className="text-xs text-muted">{tanggal(p.tanggal, true)}</span>
                </div>
                <p className="font-semibold mt-1">{p.kategori} <span className="font-normal text-muted">· {p.keterangan || 'tanpa keterangan'}</span></p>
                <p className="text-xs text-muted mt-0.5">
                  Diajukan {p.diajukanNama || p.diajukanOleh}{p.pihak && ` · untuk ${p.pihak}`} · {p.metode} → {namaRekening(p.rekening)}{p.bukti && ` · bukti ${p.bukti}`}
                </p>
                {p.status !== 'menunggu' && (
                  <p className={`text-xs mt-1 ${p.status === 'ditolak' ? 'text-rose-ink' : 'text-brand-700'}`}>
                    {p.status === 'disetujui' ? 'Disetujui' : 'Ditolak'} oleh {p.diputusNama || p.diputusOleh}{p.catatanPutusan && `: “${p.catatanPutusan}”`}{p.kasNo && ` · tercatat ${p.kasNo}`}
                  </p>
                )}
              </div>
              <p className="text-lg font-extrabold num whitespace-nowrap">{rupiah(p.nominal)}</p>
              <div className="flex gap-1.5 shrink-0">
                {mode === 'penyetuju' && p.status === 'menunggu' && <>
                  <Button size="sm" icon={Check} onClick={() => setPutus({ p, setuju: true, catatan: '' })}>Setujui</Button>
                  <Button size="sm" variant="danger" icon={X} onClick={() => setPutus({ p, setuju: false, catatan: '' })}>Tolak</Button>
                </>}
                {mode === 'pengaju' && p.status === 'menunggu' && <>
                  <button title="Ubah" onClick={() => onUbah?.(p)} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Pencil className="size-4" /></button>
                  <button title="Hapus" onClick={() => batal(p)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>
                </>}
                {mode === 'pengaju' && p.status === 'ditolak' && <>
                  <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => onUbah?.(p)}>Perbaiki & ajukan ulang</Button>
                  <button title="Hapus" onClick={() => batal(p)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>
                </>}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <Modal open={!!putus} onClose={() => setPutus(null)} title={putus?.setuju ? `Setujui ${putus?.p.no}?` : `Tolak ${putus?.p.no}?`}
        subtitle={putus && `${putus.p.kategori} · ${rupiah(putus.p.nominal)} · ${putus.p.keterangan || ''}`}
        footer={<><Button variant="secondary" onClick={() => setPutus(null)}>Batal</Button>
          <Button variant={putus?.setuju ? 'primary' : 'danger'} onClick={() => run(async () => {
            const no = await putuskanPengajuan(putus.p, putus.setuju, putus.catatan, profile?.nama);
            setPutus(null);
            return no;
          }, putus?.setuju ? 'Disetujui. Pengeluaran tercatat di buku kas.' : 'Pengajuan ditolak.')}>{putus?.setuju ? 'Setujui & catat' : 'Tolak pengajuan'}</Button></>}>
        {putus && <>
          <p className="text-sm text-muted mb-3">{putus.setuju
            ? `Pengeluaran akan langsung dicatat di buku kas (${namaRekening(putus.p.rekening)}) tanggal ${tanggal(putus.p.tanggal, true)}.`
            : 'Alasan penolakan akan terlihat oleh yang mengajukan, dan ia bisa memperbaiki lalu mengajukan ulang.'}</p>
          <Field label={putus.setuju ? 'Catatan (opsional)' : 'Alasan penolakan'} required={!putus.setuju}>
            <Textarea rows={3} value={putus.catatan} onChange={(e) => setPutus({ ...putus, catatan: e.target.value })} />
          </Field>
        </>}
      </Modal>
    </>
  );
}
