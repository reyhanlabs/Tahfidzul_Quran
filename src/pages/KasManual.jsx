import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ArrowUpFromLine, ArrowDownToLine, Download } from 'lucide-react';
import { useLiveQuery, kasRange } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { saveKasManual, deleteKasManual } from '../lib/ops';
import { rupiah, tanggal, todayISO, norm, awalBulan, akhirBulan, downloadCSV } from '../lib/format';
import { Button, Field, Input, Select, MoneyInput, Modal, PageHeader, Panel, Empty, SearchBox, Toolbar, useAction, useToast } from '../components/ui';
import { RangePicker } from '../components/Periode';

const TEKS = {
  pengeluaran: { title: 'Pengeluaran', desc: 'Belanja dan biaya operasional lembaga selain gaji. Setiap catatan langsung masuk buku kas sebagai kas keluar.', akun: 'Pengeluaran', pihak: 'Dibayar kepada', icon: ArrowUpFromLine, field: 'keluar' },
  pemasukan: { title: 'Pemasukan lain', desc: 'Donasi, sumbangan, bantuan, dan pemasukan selain pembayaran santri. Langsung masuk buku kas sebagai kas masuk.', akun: 'Pemasukan', pihak: 'Sumber / donatur', icon: ArrowDownToLine, field: 'masuk' },
};

export default function KasManual({ jenis }) {
  const T = TEKS[jenis];
  const { akun, settings } = useData();
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run, busy] = useAction();
  const n = new Date();
  const [dari, setDari] = useState(awalBulan(n.getFullYear(), n.getMonth() + 1));
  const [sampai, setSampai] = useState(akhirBulan(n.getFullYear(), n.getMonth() + 1));
  const [q, setQ] = useState(''); const [kat, setKat] = useState('');
  const [edit, setEdit] = useState(null);
  const kategori = akun.filter((a) => a.jenis === T.akun && !(jenis === 'pengeluaran' && a.nama === 'Gaji/Honor')).map((a) => a.nama);

  const { data, loading } = useLiveQuery(() => kasRange(dari, sampai), [dari, sampai]);
  const rows = useMemo(() => {
    const nq = norm(q);
    return data.filter((k) => k.sumber === jenis && (!kat || k.kategori === kat)
      && (!nq || [k.no, k.keterangan, k.pihak, k.kategori].some((x) => norm(x).includes(nq))))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || String(b.no).localeCompare(String(a.no)));
  }, [data, jenis, kat, q]);
  const total = rows.reduce((a, k) => a + k[T.field], 0);

  const baru = () => setEdit({ id: null, v: { tanggal: todayISO(), kategori: kategori[0] || '', keterangan: '', nominal: '', metode: settings.metode?.[0] || 'Cash', pihak: '', bukti: '' } });
  const simpan = () => run(async () => {
    if (!edit.v.kategori) throw new Error('Pilih kategori.');
    await saveKasManual(jenis, edit.v, edit.id); setEdit(null);
  }, `${T.title} disimpan.`);
  const hapus = async (k) => {
    if (!await confirm({ title: `Hapus ${k.no}?`, text: `${k.keterangan || k.kategori} · ${rupiah(k[T.field])}`, ok: 'Hapus', danger: true })) return;
    run(() => deleteKasManual(k.id), 'Catatan dihapus.');
  };

  return (
    <>
      <PageHeader title={T.title} description={T.desc}
        actions={<>
          <Button variant="secondary" icon={Download} disabled={!rows.length} onClick={() => downloadCSV(`${jenis}-${dari}-${sampai}.csv`,
            ['No', 'Tanggal', 'Kategori', 'Keterangan', T.pihak, 'Bukti', 'Metode', 'Nominal'],
            rows.map((k) => [k.no, k.tanggal, k.kategori, k.keterangan, k.pihak, k.bukti, k.metode, k[T.field]]))}>Ekspor CSV</Button>
          <Button icon={Plus} onClick={baru}>Catat {T.title.toLowerCase()}</Button>
        </>} />
      <Toolbar>
        <RangePicker dari={dari} sampai={sampai} onChange={(a, b) => { setDari(a); setSampai(b); }} />
        <Field label="Kategori"><Select value={kat} placeholder="Semua kategori" options={kategori} onChange={(e) => setKat(e.target.value)} /></Field>
        <SearchBox value={q} onChange={setQ} className="w-full sm:w-60" />
      </Toolbar>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? (
          <Empty icon={T.icon} title={`Belum ada ${T.title.toLowerCase()} pada rentang ini`} action={<Button icon={Plus} onClick={baru}>Catat {T.title.toLowerCase()}</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>No.</th><th>Tanggal</th><th>Kategori</th><th>Keterangan</th><th>{T.pihak}</th><th>Metode</th><th className="money">Nominal</th><th /></tr></thead>
              <tbody>
                {rows.map((k) => (
                  <tr key={k.id}>
                    <td className="text-xs text-muted num whitespace-nowrap">{k.no}</td>
                    <td className="whitespace-nowrap">{tanggal(k.tanggal)}</td>
                    <td className="font-semibold">{k.kategori}</td>
                    <td>{k.keterangan}{k.bukti && <p className="text-xs text-muted">Bukti: {k.bukti}</p>}</td>
                    <td>{k.pihak}</td><td>{k.metode}</td>
                    <td className="money font-semibold">{rupiah(k[T.field])}</td>
                    <td className="text-right whitespace-nowrap">
                      <button title="Ubah" onClick={() => setEdit({ id: k.id, v: { ...k, nominal: k[T.field] } })} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Pencil className="size-4" /></button>
                      {isAdmin && <button title="Hapus" onClick={() => hapus(k)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={6}>Total {rows.length} catatan</td><td className="money">{rupiah(total)}</td><td /></tr></tfoot>
            </table>
          </div>
        )}
      </Panel>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Ubah ${edit.v.no}` : `Catat ${T.title.toLowerCase()}`}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Batal</Button><Button loading={busy} onClick={simpan}>Simpan</Button></>}>
        {edit && <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Tanggal" required><Input type="date" value={edit.v.tanggal} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, tanggal: e.target.value } })} /></Field>
          <Field label="Kategori" required><Select value={edit.v.kategori} placeholder="— pilih —" options={kategori} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, kategori: e.target.value } })} /></Field>
          <Field label="Keterangan" className="sm:col-span-2"><Input value={edit.v.keterangan} placeholder={jenis === 'pengeluaran' ? 'Contoh: pembelian kertas HVS 2 rim' : 'Contoh: donasi jamaah Jumat'} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, keterangan: e.target.value } })} /></Field>
          <Field label="Nominal" required><MoneyInput value={edit.v.nominal} onChange={(v) => setEdit({ ...edit, v: { ...edit.v, nominal: v } })} /></Field>
          <Field label="Metode"><Select value={edit.v.metode} options={settings.metode || []} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, metode: e.target.value } })} /></Field>
          <Field label={T.pihak}><Input value={edit.v.pihak} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, pihak: e.target.value } })} /></Field>
          <Field label="No. nota / bukti"><Input value={edit.v.bukti} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, bukti: e.target.value } })} /></Field>
        </div>}
      </Modal>
    </>
  );
}
