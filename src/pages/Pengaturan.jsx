import { useEffect, useState } from 'react';
import { Plus, X, DatabaseZap } from 'lucide-react';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { saveSettings, seedDefaults } from '../lib/ops';
import { Button, Field, Input, Textarea, MoneyInput, PageHeader, Panel, useAction } from '../components/ui';

export default function Pengaturan() {
  const { settings } = useData();
  const { isAdmin } = useAuth();
  const [run, busy] = useAction();
  const [f, setF] = useState(settings);
  const [metodeBaru, setMetodeBaru] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(settings), [settings.updatedAt?.seconds, settings.nama]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ro = !isAdmin;

  return (
    <>
      <PageHeader help="pengaturan" title="Pengaturan" description={ro ? 'Hanya admin yang dapat mengubah pengaturan.' : 'Identitas lembaga dipakai di kwitansi, slip gaji, dan kop laporan.'}
        actions={!ro && <Button loading={busy} onClick={() => run(() => saveSettings({ ...f, saldoAwal: Number(f.saldoAwal) || 0 }), 'Pengaturan disimpan.')}>Simpan pengaturan</Button>} />
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <Panel title="Identitas lembaga">
          <fieldset disabled={ro} className="grid sm:grid-cols-2 gap-4">
            <Field label="Nama lembaga" className="sm:col-span-2"><Input value={f.nama || ''} onChange={set('nama')} /></Field>
            <Field label="Alamat" className="sm:col-span-2"><Textarea value={f.alamat || ''} onChange={set('alamat')} /></Field>
            <Field label="Kota" hint="Untuk tempat tanda tangan."><Input value={f.kota || ''} onChange={set('kota')} /></Field>
            <Field label="No. telepon"><Input value={f.telepon || ''} onChange={set('telepon')} /></Field>
            <Field label="Nama pimpinan / kepala"><Input value={f.pimpinan || ''} onChange={set('pimpinan')} /></Field>
            <Field label="Nama bendahara"><Input value={f.bendahara || ''} onChange={set('bendahara')} /></Field>
          </fieldset>
        </Panel>
        <div className="space-y-5">
          <Panel title="Kas">
            <fieldset disabled={ro} className="space-y-4">
              <Field label="Saldo awal kas" hint="Uang kas yang sudah ada sebelum mulai memakai aplikasi. Semua saldo dihitung dari angka ini.">
                <MoneyInput value={f.saldoAwal ?? 0} onChange={(v) => setF({ ...f, saldoAwal: v })} />
              </Field>
              <Field label="Per tanggal"><Input type="date" value={f.tanggalSaldoAwal || ''} onChange={set('tanggalSaldoAwal')} /></Field>
            </fieldset>
          </Panel>
          <Panel title="Metode pembayaran">
            <div className="flex flex-wrap gap-2">
              {(f.metode || []).map((m) => (
                <span key={m} className="inline-flex items-center gap-1 bg-paper border border-line rounded-lg pl-3 pr-1.5 h-8 text-sm">
                  {m}{!ro && <button onClick={() => setF({ ...f, metode: f.metode.filter((x) => x !== m) })} className="p-0.5 text-muted hover:text-rose-ink" aria-label={`Hapus ${m}`}><X className="size-3.5" /></button>}
                </span>
              ))}
            </div>
            {!ro && <div className="flex gap-2 mt-3">
              <Input value={metodeBaru} onChange={(e) => setMetodeBaru(e.target.value)} placeholder="Contoh: QRIS" />
              <Button variant="secondary" icon={Plus} disabled={!metodeBaru.trim()} onClick={() => { setF({ ...f, metode: [...new Set([...(f.metode || []), metodeBaru.trim()])] }); setMetodeBaru(''); }}>Tambah</Button>
            </div>}
          </Panel>
          {!ro && <Panel title="Data default">
            <p className="text-sm text-muted">Mengisi kelas, jenis kewajiban, komponen gaji, dan kategori kas bawaan — hanya untuk data yang masih kosong.</p>
            <Button className="mt-3" variant="secondary" icon={DatabaseZap} loading={busy}
              onClick={() => run(async () => { const r = await seedDefaults(); const n = Object.values(r).reduce((a, b) => a + b, 0); if (!n) throw new Error('Semua data master sudah terisi, tidak ada yang ditambahkan.'); }, 'Data default ditambahkan.')}>Isi data default</Button>
          </Panel>}
        </div>
      </div>
    </>
  );
}
