import { useEffect, useRef, useState } from 'react';
import { Plus, X, DatabaseZap, Lock, LockOpen, Download, Upload, FileSpreadsheet, Trash2 } from 'lucide-react';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { saveSettings, seedDefaults, isReferenced } from '../lib/ops';
import { unduhCadanganJson, unduhCadanganExcel, bacaCadangan, pulihkan } from '../lib/cadangan';
import { akhirBulan, tanggal, todayISO } from '../lib/format';
import { Button, Field, Input, Textarea, MoneyInput, Select, PageHeader, Panel, Modal, useAction, useToast } from '../components/ui';

const idBaru = () => `rek-${Date.now().toString(36)}`;

export default function Pengaturan() {
  const { settings } = useData();
  const { isAdmin } = useAuth();
  const { toast, confirm } = useToast();
  const [run, busy] = useAction();
  const [f, setF] = useState(settings);
  const [metodeBaru, setMetodeBaru] = useState('');
  const [info, setInfo] = useState('');
  const [pulih, setPulih] = useState(null);
  const fileRef = useRef(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setF(settings), [settings.updatedAt?.seconds, settings.nama, settings.kunciSampai, settings.cadanganTerakhir]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ro = !isAdmin;
  const rekening = f.rekening || [];
  const setRek = (i, patch) => setF({ ...f, rekening: rekening.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  const simpan = () => run(async () => {
    const rek = rekening.map((r) => ({ id: r.id, nama: String(r.nama || '').trim(), saldoAwal: Number(r.saldoAwal) || 0 }));
    if (rek.some((r) => !r.nama)) throw new Error('Nama rekening tidak boleh kosong.');
    const { kunciSampai, ...lain } = f; // kunci disimpan lewat tombolnya sendiri
    await saveSettings({ ...lain, rekening: rek, saldoAwal: rek.reduce((a, r) => a + r.saldoAwal, 0) });
  }, 'Pengaturan disimpan.');

  const hapusRek = async (i) => {
    const r = rekening[i];
    if (rekening.length === 1) { toast('Minimal harus ada satu rekening.', 'error'); return; }
    const dipakai = await isReferenced('kas', 'rekening', r.id) || await isReferenced('kas', 'dari', r.id) || await isReferenced('kas', 'ke', r.id);
    if (dipakai) { toast(`"${r.nama}" sudah punya transaksi dan tidak bisa dihapus.`, 'error'); return; }
    setF({ ...f, rekening: rekening.filter((_, j) => j !== i) });
  };

  const kunci = async (tgl) => {
    const ok = await confirm({
      title: tgl ? `Kunci periode s.d. ${tanggal(tgl, true)}?` : 'Buka kunci periode?',
      text: tgl ? 'Transaksi kas (pembayaran, gaji, pengeluaran, pemasukan, pindah dana) bertanggal pada atau sebelum tanggal itu tidak bisa ditambah, diubah, atau dihapus sampai kunci dibuka.'
        : 'Semua transaksi lama akan bisa diubah dan dihapus kembali.',
      ok: tgl ? 'Kunci' : 'Buka kunci',
    });
    if (ok) run(() => saveSettings({ kunciSampai: tgl }), tgl ? 'Periode dikunci.' : 'Kunci periode dibuka.');
  };
  const n = new Date();
  const akhirBulanLalu = akhirBulan(n.getMonth() === 0 ? n.getFullYear() - 1 : n.getFullYear(), n.getMonth() === 0 ? 12 : n.getMonth());
  const [kunciInput, setKunciInput] = useState('');

  const hariSejakCadangan = settings.cadanganTerakhir ? Math.floor((Date.parse(todayISO()) - Date.parse(settings.cadanganTerakhir)) / 864e5) : null;

  return (
    <>
      <PageHeader help="pengaturan" title="Pengaturan" description={ro ? 'Hanya admin yang dapat mengubah pengaturan.' : 'Identitas lembaga, rekening kas, tutup buku, dan cadangan data.'}
        actions={!ro && <Button loading={busy} onClick={simpan}>Simpan pengaturan</Button>} />
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <div className="space-y-5">
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

          <Panel title="Rekening kas">
            <p className="text-sm text-muted mb-3">Tempat uang lembaga disimpan, misalnya kas tunai di laci dan rekening bank. Saldo awal = uang yang sudah ada di masing-masing rekening sebelum memakai aplikasi.</p>
            <fieldset disabled={ro} className="space-y-2">
              {rekening.map((r, i) => (
                <div key={r.id} className="flex flex-wrap sm:flex-nowrap items-end gap-2">
                  <Field label={i === 0 ? 'Nama rekening' : null} className="flex-1 min-w-40"><Input value={r.nama} onChange={(e) => setRek(i, { nama: e.target.value })} /></Field>
                  <Field label={i === 0 ? 'Saldo awal' : null} className="w-full sm:w-48"><MoneyInput value={r.saldoAwal ?? 0} onChange={(v) => setRek(i, { saldoAwal: v })} /></Field>
                  {!ro && <button type="button" onClick={() => hapusRek(i)} className="h-10 px-2 text-muted hover:text-rose-ink" aria-label={`Hapus ${r.nama}`}><Trash2 className="size-4" /></button>}
                </div>
              ))}
              {!ro && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setF({ ...f, rekening: [...rekening, { id: idBaru(), nama: '', saldoAwal: 0 }] })}>Tambah rekening</Button>}
              <Field label="Saldo awal per tanggal" className="pt-2 max-w-60"><Input type="date" value={f.tanggalSaldoAwal || ''} onChange={set('tanggalSaldoAwal')} /></Field>
            </fieldset>
          </Panel>

          <Panel title="Metode pembayaran">
            <p className="text-sm text-muted mb-3">Setiap metode otomatis masuk ke rekening yang dipilih (masih bisa diganti saat mencatat transaksi).</p>
            <div className="space-y-2">
              {(f.metode || []).map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-sm font-semibold">{m}</span>
                  <span className="text-muted text-sm">→</span>
                  <Select className="flex-1" disabled={ro} value={f.metodeRekening?.[m] || rekening[0]?.id}
                    options={rekening.map((r) => ({ value: r.id, label: r.nama || '(tanpa nama)' }))}
                    onChange={(e) => setF({ ...f, metodeRekening: { ...(f.metodeRekening || {}), [m]: e.target.value } })} />
                  {!ro && <button onClick={() => setF({ ...f, metode: f.metode.filter((x) => x !== m) })} className="p-1.5 text-muted hover:text-rose-ink" aria-label={`Hapus ${m}`}><X className="size-4" /></button>}
                </div>
              ))}
            </div>
            {!ro && <div className="flex gap-2 mt-3">
              <Input value={metodeBaru} onChange={(e) => setMetodeBaru(e.target.value)} placeholder="Contoh: QRIS" />
              <Button variant="secondary" icon={Plus} disabled={!metodeBaru.trim()} onClick={() => { setF({ ...f, metode: [...new Set([...(f.metode || []), metodeBaru.trim()])] }); setMetodeBaru(''); }}>Tambah</Button>
            </div>}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Tutup buku (kunci periode)">
            {settings.kunciSampai
              ? <p className="text-sm flex items-start gap-2"><Lock className="size-4 mt-0.5 text-brand-700 shrink-0" /><span>Transaksi s.d. <b>{tanggal(settings.kunciSampai, true)}</b> terkunci dan tidak bisa diubah.</span></p>
              : <p className="text-sm text-muted">Belum ada periode yang dikunci. Kunci setelah laporan bulan dicetak dan dilaporkan, agar transaksi lama tidak berubah tanpa sengaja.</p>}
            {!ro && <div className="mt-4 space-y-3">
              <Button variant="secondary" icon={Lock} onClick={() => kunci(akhirBulanLalu)}>Kunci s.d. {tanggal(akhirBulanLalu, true)}</Button>
              <div className="flex gap-2 items-end">
                <Field label="Atau pilih tanggal" className="flex-1"><Input type="date" value={kunciInput} onChange={(e) => setKunciInput(e.target.value)} /></Field>
                <Button variant="secondary" disabled={!kunciInput} onClick={() => kunci(kunciInput)}>Kunci</Button>
              </div>
              {settings.kunciSampai && <Button variant="ghost" icon={LockOpen} onClick={() => kunci('')}>Buka kunci</Button>}
            </div>}
          </Panel>

          {!ro && <Panel title="Cadangan data">
            <p className="text-sm text-muted">
              {hariSejakCadangan == null ? 'Belum pernah membuat cadangan.' : `Cadangan terakhir: ${tanggal(settings.cadanganTerakhir, true)} (${hariSejakCadangan} hari lalu).`}
              {' '}Simpan file cadangan di Google Drive atau flashdisk, sebaiknya setiap minggu.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button icon={Download} loading={busy} onClick={() => run(async () => { await unduhCadanganJson(settings.nama, setInfo); setInfo(''); }, 'File cadangan (JSON) diunduh.')}>Unduh cadangan</Button>
              <Button variant="secondary" icon={FileSpreadsheet} loading={busy} onClick={() => run(async () => { await unduhCadanganExcel(setInfo); setInfo(''); }, 'Cadangan Excel diunduh.')}>Versi Excel</Button>
            </div>
            <div className="border-t border-dashed border-line mt-4 pt-4">
              <p className="text-sm font-semibold">Pulihkan dari cadangan</p>
              <p className="text-xs text-muted mt-1">Data dengan ID yang sama akan ditimpa isi cadangan. Gunakan hanya bila data rusak atau pindah ke project Firebase baru.</p>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden
                onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) run(async () => setPulih({ isi: await bacaCadangan(file), ketik: '' })); }} />
              <Button className="mt-2" variant="secondary" icon={Upload} onClick={() => fileRef.current?.click()}>Pilih file cadangan (.json)</Button>
            </div>
            {info && <p className="text-xs text-muted mt-3">{info}</p>}
          </Panel>}

          {!ro && <Panel title="Data default">
            <p className="text-sm text-muted">Mengisi kelas, jenis kewajiban, komponen gaji, dan kategori kas bawaan — hanya untuk data yang masih kosong.</p>
            <Button className="mt-3" variant="secondary" icon={DatabaseZap} loading={busy}
              onClick={() => run(async () => { const r = await seedDefaults(); const n2 = Object.values(r).reduce((a, b) => a + b, 0); if (!n2) throw new Error('Semua data master sudah terisi, tidak ada yang ditambahkan.'); }, 'Data default ditambahkan.')}>Isi data default</Button>
          </Panel>}
        </div>
      </div>

      <Modal open={!!pulih} onClose={() => !busy && setPulih(null)} title="Pulihkan data dari cadangan" width="max-w-lg"
        footer={<><Button variant="secondary" disabled={busy} onClick={() => setPulih(null)}>Batal</Button>
          <Button variant="danger" loading={busy} disabled={pulih?.ketik !== 'PULIHKAN'}
            onClick={() => run(async () => { const n2 = await pulihkan(pulih.isi, setInfo); setInfo(''); setPulih(null); return n2; }, 'Data berhasil dipulihkan dari cadangan.')}>Pulihkan sekarang</Button></>}>
        {pulih && <div className="space-y-3 text-sm">
          <p>Cadangan <b>{pulih.isi.lembaga}</b>, dibuat {pulih.isi.dibuat?.slice(0, 10)}:</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 bg-paper border border-line rounded-lg p-3">
            {Object.entries(pulih.isi.data).map(([c, d]) => <p key={c} className="flex justify-between"><span>{c}</span><b className="num">{Object.keys(d).length}</b></p>)}
          </div>
          <p className="text-rose-ink">Data di aplikasi dengan ID yang sama akan ditimpa. Tindakan ini tidak bisa dibatalkan. Buat cadangan data saat ini lebih dulu bila ragu.</p>
          <Field label='Ketik PULIHKAN untuk melanjutkan'><Input value={pulih.ketik} onChange={(e) => setPulih({ ...pulih, ketik: e.target.value })} /></Field>
          {info && <p className="text-xs text-muted">{info}</p>}
        </div>}
      </Modal>
    </>
  );
}
