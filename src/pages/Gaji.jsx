import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Plus, Printer, Trash2, Wallet, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { COL, useLiveQuery } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { createGaji, deleteGaji } from '../lib/ops';
import { BULAN, rupiah, periodeLabel, todayISO, tanggal, downloadCSV } from '../lib/format';
import { Button, Field, Input, Select, MoneyInput, Modal, PageHeader, Panel, Empty, Toolbar, Stat, useAction, useToast, Badge } from '../components/ui';
import { PeriodePicker } from '../components/Periode';

const now = new Date();

export default function Gaji() {
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run] = useAction();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [open, setOpen] = useState(false);
  const { data, loading } = useLiveQuery(() => query(collection(db, COL.gaji), where('tahun', '==', Number(tahun))), [tahun]);
  const rows = useMemo(() => data.filter((g) => !bulan || g.bulan === Number(bulan)).sort((a, b) => a.ustadzNama.localeCompare(b.ustadzNama)), [data, bulan]);
  const tot = rows.reduce((a, g) => ({ b: a.b + g.bruto, p: a.p + g.potongan, n: a.n + g.neto }), { b: 0, p: 0, n: 0 });

  const hapus = async (g) => {
    if (!await confirm({ title: `Hapus slip ${g.no}?`, text: `Honor ${g.ustadzNama} ${periodeLabel(g.periodeKey)} dan catatan pengeluarannya di buku kas akan dihapus.`, ok: 'Hapus slip', danger: true })) return;
    run(() => deleteGaji(g), 'Slip gaji dihapus.');
  };

  return (
    <>
      <PageHeader title="Gaji & honor" description="Setiap slip yang disimpan otomatis tercatat sebagai pengeluaran kas kategori Gaji/Honor."
        actions={<>
          <Button variant="secondary" disabled={!rows.length} onClick={() => downloadCSV(`gaji-${tahun}-${bulan || 'semua'}.csv`,
            ['No', 'Tanggal', 'Periode', 'Nama', 'Jabatan', 'Bruto', 'Potongan', 'Diterima', 'Metode'],
            rows.map((g) => [g.no, g.tanggal, periodeLabel(g.periodeKey), g.ustadzNama, g.jabatan, g.bruto, g.potongan, g.neto, g.metode]))}>Ekspor CSV</Button>
          <Button icon={Plus} onClick={() => setOpen(true)}>Buat slip gaji</Button>
        </>} />
      <Toolbar>
        <Field label="Bulan"><Select value={bulan} placeholder="Semua bulan" options={BULAN.map((b, i) => ({ value: i + 1, label: b }))} onChange={(e) => setBulan(e.target.value ? Number(e.target.value) : '')} /></Field>
        <Field label="Tahun"><Input type="number" className="w-24" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} /></Field>
      </Toolbar>
      <div className="grid grid-cols-3 gap-px bg-line border border-line rounded-xl overflow-hidden mb-4">
        <div className="bg-white p-4"><Stat label="Total bruto" value={rupiah(tot.b)} sub={`${rows.length} slip`} /></div>
        <div className="bg-white p-4"><Stat label="Total potongan" value={rupiah(tot.p)} tone="rose" /></div>
        <div className="bg-white p-4"><Stat label="Total dibayarkan" value={rupiah(tot.n)} tone="brand" /></div>
      </div>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? (
          <Empty icon={Wallet} title="Belum ada slip gaji" text="Buat slip untuk ustadz/ustadzah pada periode ini." action={<Button icon={Plus} onClick={() => setOpen(true)}>Buat slip gaji</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>No. slip</th><th>Nama</th><th>Periode</th><th>Tanggal bayar</th><th className="money">Bruto</th><th className="money">Potongan</th><th className="money">Diterima</th><th /></tr></thead>
              <tbody>
                {rows.map((g) => (
                  <tr key={g.id}>
                    <td className="text-xs text-muted num">{g.no}</td>
                    <td><p className="font-semibold">{g.ustadzNama}</p><p className="text-xs text-muted">{g.jabatan}</p></td>
                    <td>{periodeLabel(g.periodeKey)}</td>
                    <td>{tanggal(g.tanggal)} <span className="text-xs text-muted">· {g.metode}</span></td>
                    <td className="money">{rupiah(g.bruto)}</td>
                    <td className="money text-rose-ink">{g.potongan ? rupiah(g.potongan) : '–'}</td>
                    <td className="money font-semibold">{rupiah(g.neto)}</td>
                    <td className="text-right whitespace-nowrap">
                      <button title="Cetak slip" onClick={() => window.open(`/cetak/slip/${g.id}`, '_blank')} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Printer className="size-4" /></button>
                      {isAdmin && <button title="Hapus" onClick={() => hapus(g)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <BuatSlip open={open} onClose={() => setOpen(false)} existing={data} bulanAwal={bulan || now.getMonth() + 1} tahunAwal={tahun} />
    </>
  );
}

function BuatSlip({ open, onClose, existing, bulanAwal, tahunAwal }) {
  const { ustadz, komponen, settings } = useData();
  const [run, busy] = useAction();
  const [f, setF] = useState(null);

  const itemsFor = (u) => komponen.filter((k) => k.status === 'Aktif' && (k.jenis === 'Pendapatan' ? (k.pakaiTarif || k.nominal > 0) : false))
    .map((k) => ({ nama: k.nama, jenis: k.jenis, nominal: k.pakaiTarif ? (u?.tarif || 0) : (k.nominal || 0) }));

  useEffect(() => {
    if (open) setF({ ustadzId: '', bulan: bulanAwal, tahun: tahunAwal, tanggal: todayISO(), metode: settings.metode?.[0] || 'Cash', keterangan: '', items: [] });
    else setF(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!f) return null;
  const u = ustadz.find((x) => x.id === f.ustadzId);
  const bruto = f.items.filter((i) => i.jenis === 'Pendapatan').reduce((a, i) => a + (Number(i.nominal) || 0), 0);
  const pot = f.items.filter((i) => i.jenis === 'Potongan').reduce((a, i) => a + (Number(i.nominal) || 0), 0);
  const dobel = u && existing.some((g) => g.ustadzId === u.id && g.bulan === Number(f.bulan) && g.tahun === Number(f.tahun));
  const setItem = (i, patch) => setF({ ...f, items: f.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const tambah = (id) => {
    const k = komponen.find((x) => x.id === id); if (!k) return;
    setF({ ...f, items: [...f.items, { nama: k.nama, jenis: k.jenis, nominal: k.pakaiTarif ? (u?.tarif || 0) : (k.nominal || 0) }] });
  };

  const simpan = () => run(async () => {
    if (!u) throw new Error('Pilih ustadz/ustadzah.');
    await createGaji({ ...f, ustadz: u });
    onClose();
  }, 'Slip gaji disimpan dan tercatat di buku kas.');

  return (
    <Modal open={open} onClose={onClose} title="Buat slip gaji" width="max-w-2xl"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={busy} disabled={!u || bruto - pot < 0 || bruto <= 0} onClick={simpan}>Simpan slip</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Ustadz / ustadzah" required className="sm:col-span-2">
          <Select value={f.ustadzId} placeholder="— pilih —" options={ustadz.filter((x) => x.status === 'Aktif').map((x) => ({ value: x.id, label: `${x.nama}${x.jabatan ? ` — ${x.jabatan}` : ''}` }))}
            onChange={(e) => { const nu = ustadz.find((x) => x.id === e.target.value); setF({ ...f, ustadzId: e.target.value, items: nu ? itemsFor(nu) : [] }); }} />
        </Field>
        <PeriodePicker bulan={f.bulan} tahun={f.tahun} onChange={(b, t) => setF({ ...f, bulan: b, tahun: t })} />
        <Field label="Tanggal bayar"><Input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field>
        <Field label="Metode"><Select value={f.metode} options={settings.metode || []} onChange={(e) => setF({ ...f, metode: e.target.value })} /></Field>
      </div>
      {dobel && <p className="mt-4 text-sm bg-brass-50 text-brass-700 rounded-lg px-3 py-2">Sudah ada slip untuk orang ini pada periode yang sama. Pastikan bukan pembayaran ganda.</p>}

      {u && <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold">Komponen</p>
          <Select className="w-56 h-9" value="" placeholder="+ Tambah komponen" options={komponen.filter((k) => k.status === 'Aktif').map((k) => ({ value: k.id, label: `${k.nama} (${k.jenis})` }))} onChange={(e) => tambah(e.target.value)} />
        </div>
        <div className="border border-line rounded-lg divide-y divide-line">
          {f.items.length === 0 && <p className="text-sm text-muted p-3">Tambahkan komponen gaji.</p>}
          {f.items.map((it, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{it.nama}</p></div>
              <Badge>{it.jenis}</Badge>
              <div className="w-40"><MoneyInput value={it.nominal} onChange={(n) => setItem(i, { nominal: n })} /></div>
              <button onClick={() => setF({ ...f, items: f.items.filter((_, j) => j !== i) })} className="p-1 text-muted hover:text-rose-ink" aria-label="Hapus komponen"><X className="size-4" /></button>
            </div>
          ))}
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div><dt className="text-xs text-muted font-semibold">Bruto</dt><dd className="num font-bold">{rupiah(bruto)}</dd></div>
          <div><dt className="text-xs text-muted font-semibold">Potongan</dt><dd className="num font-bold text-rose-ink">{rupiah(pot)}</dd></div>
          <div><dt className="text-xs text-muted font-semibold">Diterima</dt><dd className="num font-extrabold text-brand-700 text-lg">{rupiah(bruto - pot)}</dd></div>
        </dl>
        <Field label="Keterangan" className="mt-4"><Input value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} /></Field>
      </div>}
    </Modal>
  );
}
