import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, getDoc, query, where } from 'firebase/firestore';
import { Printer, MessageCircle, CheckCircle2, Trash2, Pencil, HandCoins, Download, ListChecks } from 'lucide-react';
import { db } from '../lib/firebase';
import { COL, useLiveQuery } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { createPembayaran, batalPembayaran, editPembayaran, MAKS_ITEM } from '../lib/ops';
import { pesanKwitansi, kirimTeksWA } from '../lib/share';
import { rupiah, periodeLabel, todayISO, tanggal, norm, awalBulan, akhirBulan } from '../lib/format';
import { downloadExcel } from '../lib/excel';
import {
  Button, Field, Input, Select, MoneyInput, Badge, PageHeader, Panel, Empty, SearchBox, Toolbar, Modal, useAction, useToast, cx,
} from '../components/ui';
import SantriPicker from '../components/SantriPicker';
import RekeningSelect from '../components/Rekening';
import { rekeningUntuk, terkunci } from '../lib/konteks';
import { Lock } from 'lucide-react';
import { RangePicker } from '../components/Periode';

export default function Pembayaran() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState('terima');
  return (
    <>
      <PageHeader help="pembayaran" title="Pembayaran santri" description="Terima pembayaran untuk satu atau beberapa tagihan sekaligus. Cicilan cukup diisi sebagian — sisanya tetap tercatat.">
        <div className="inline-flex p-1 bg-white rounded-lg border border-line no-print">
          {[['terima', 'Terima pembayaran'], ['riwayat', 'Riwayat']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={cx('px-4 h-9 rounded-md text-sm font-semibold', tab === v ? 'bg-brand-700 text-white' : 'text-muted hover:text-ink')}>{l}</button>
          ))}
        </div>
      </PageHeader>
      {tab === 'terima' ? <Terima initialSantri={params.get('santri') || ''} /> : <Riwayat />}
    </>
  );
}

function Terima({ initialSantri }) {
  const { santriMap, settings } = useData();
  const [run, busy] = useAction();
  const [santriId, setSantriId] = useState(initialSantri);
  const [tgl, setTgl] = useState(todayISO());
  const [metode, setMetode] = useState(settings.metode?.[0] || 'Cash');
  const [rekening, setRekening] = useState(() => rekeningUntuk(settings.metode?.[0] || 'Cash'));
  const [ket, setKet] = useState('');
  const [bayar, setBayar] = useState({}); // tagihanId -> nominal
  const [done, setDone] = useState(null);

  const { data, loading } = useLiveQuery(() => (santriId ? query(collection(db, COL.tagihan), where('santriId', '==', santriId)) : null), [santriId]);
  const terbuka = useMemo(() => data.filter((t) => t.sisa > 0).sort((a, b) => a.periodeKey - b.periodeKey || a.kewajibanNama.localeCompare(b.kewajibanNama)), [data]);
  useEffect(() => { setBayar({}); }, [santriId]);

  const s = santriMap[santriId];
  const total = Object.values(bayar).reduce((a, b) => a + (Number(b) || 0), 0);
  const invalid = terbuka.some((t) => (Number(bayar[t.id]) || 0) > t.sisa);
  const toggle = (t) => setBayar((b) => {
    const n = { ...b };
    if (n[t.id] !== undefined) delete n[t.id];
    else if (Object.keys(n).length < MAKS_ITEM) n[t.id] = t.sisa;
    return n;
  });
  const semua = () => setBayar(Object.fromEntries(terbuka.slice(0, MAKS_ITEM).map((t) => [t.id, t.sisa])));
  const penuh = Object.keys(bayar).length >= MAKS_ITEM;

  const simpan = () => run(async () => {
    const id = await createPembayaran({
      tanggal: tgl, santri: s, metode, rekening, keterangan: ket,
      items: Object.entries(bayar).map(([tagihanId, v]) => ({ tagihanId, bayar: v })),
    });
    setDone({ id, santri: s, total });
    setBayar({}); setKet('');
  }, 'Pembayaran disimpan dan tercatat di buku kas.');

  if (done) {
    return (
      <Panel>
        <div className="text-center py-8 max-w-md mx-auto">
          <CheckCircle2 className="size-12 mx-auto text-brand-500" strokeWidth={1.5} />
          <h2 className="text-xl font-extrabold mt-3">Pembayaran tersimpan</h2>
          <p className="text-muted text-sm mt-1">{done.santri.nama} · {rupiah(done.total)}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <Button icon={Printer} onClick={() => window.open(`/cetak/kwitansi/${done.id}`, '_blank')}>Cetak kwitansi</Button>
            <Button variant="secondary" icon={MessageCircle} onClick={async () => {
              const snap = await getDoc(doc(db, COL.pembayaran, done.id));
              if (snap.exists()) kirimTeksWA(done.santri.hp, pesanKwitansi({ id: snap.id, ...snap.data() }, settings));
            }}>Kirim ke WhatsApp wali</Button>
            <Button variant="ghost" onClick={() => { setDone(null); setSantriId(''); }}>Pembayaran berikutnya</Button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
      <Panel title="Tagihan yang belum lunas" action={terbuka.length > 1 && <Button size="sm" variant="secondary" icon={ListChecks} onClick={semua}>Pilih semua</Button>} pad={false}>
        <div className="p-4 border-b border-line"><SantriPicker value={santriId} onChange={setSantriId} onlyActive={false} autoFocus={!santriId} /></div>
        {!santriId ? <Empty icon={HandCoins} title="Pilih santri" text="Cari santri di atas untuk melihat tagihan yang belum lunas." />
          : loading ? <Empty title="Memuat tagihan…" />
            : terbuka.length === 0 ? <Empty icon={CheckCircle2} title="Semua tagihan sudah lunas" text="Tidak ada kewajiban yang tersisa untuk santri ini." />
              : (
                <ul className="divide-y divide-line">
                  {terbuka.map((t) => {
                    const on = bayar[t.id] !== undefined;
                    const over = (Number(bayar[t.id]) || 0) > t.sisa;
                    return (
                      <li key={t.id} className={cx('flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3', on && 'bg-brand-50/60')}>
                        <input type="checkbox" checked={on} disabled={!on && penuh} onChange={() => toggle(t)} className="size-4 accent-brand-700 disabled:opacity-40" aria-label={`Bayar ${t.kewajibanNama}`} />
                        <button type="button" onClick={() => toggle(t)} className="flex-1 min-w-0 text-left">
                          <p className="font-semibold">{t.kewajibanNama} <span className="font-normal text-muted">· {periodeLabel(t.periodeKey)}</span></p>
                          <p className="text-xs text-muted num">Tagihan {rupiah(t.nominal)}{t.dibayar > 0 && <> · sudah dibayar {rupiah(t.dibayar)}</>} · <span className="text-rose-ink font-semibold">sisa {rupiah(t.sisa)}</span></p>
                        </button>
                        <div className="w-full sm:w-44">
                          <MoneyInput value={on ? bayar[t.id] : ''} placeholder="0" disabled={!on}
                            onChange={(n) => setBayar({ ...bayar, [t.id]: n })} className={over ? 'border-rose-ink' : ''} />
                          {over && <p className="text-[11px] text-rose-ink mt-1">Melebihi sisa tagihan</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
      </Panel>

      <Panel title="Rincian pembayaran" className="lg:sticky lg:top-6">
        <div className="space-y-4">
          <Field label="Tanggal bayar"><Input type="date" value={tgl} onChange={(e) => setTgl(e.target.value)} /></Field>
          <Field label="Metode"><Select value={metode} options={settings.metode || []} onChange={(e) => { setMetode(e.target.value); setRekening(rekeningUntuk(e.target.value)); }} /></Field>
          <RekeningSelect value={rekening} onChange={setRekening} />
          <Field label="Keterangan"><Input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Opsional" /></Field>
          <div className="border-t border-dashed border-line pt-4">
            <p className="text-xs font-semibold text-muted">Total diterima</p>
            <p className="text-3xl font-extrabold num text-brand-700 mt-1">{rupiah(total)}</p>
            {s && <p className="text-xs text-muted mt-1">dari {s.nama}{s.kelas && ` · ${s.kelas}`}</p>}
            {penuh && <p className="text-xs text-brass-700 mt-2">Maksimal {MAKS_ITEM} tagihan per kwitansi. Sisanya dicatat sebagai pembayaran berikutnya.</p>}
          </div>
          <Button size="lg" className="w-full" loading={busy} disabled={!s || total <= 0 || invalid || !tgl} onClick={simpan}>Simpan pembayaran</Button>
        </div>
      </Panel>
    </div>
  );
}

function Riwayat() {
  const { isAdmin } = useAuth();
  const { santriMap, settings } = useData();
  const [ubah, setUbah] = useState(null);
  const { confirm } = useToast();
  const [run] = useAction();
  const n = new Date();
  const [dari, setDari] = useState(awalBulan(n.getFullYear(), n.getMonth() + 1));
  const [sampai, setSampai] = useState(akhirBulan(n.getFullYear(), n.getMonth() + 1));
  const [q, setQ] = useState('');
  const { data, loading } = useLiveQuery(() => query(collection(db, COL.pembayaran), where('tanggal', '>=', dari), where('tanggal', '<=', sampai)), [dari, sampai]);
  const rows = useMemo(() => {
    const nq = norm(q);
    return data.filter((p) => !nq || [p.no, p.santriNama, p.santriKode].some((x) => norm(x).includes(nq)))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.no.localeCompare(a.no));
  }, [data, q]);
  const total = rows.reduce((a, p) => a + p.total, 0);

  const hapus = async (p) => {
    if (!await confirm({ title: `Hapus pembayaran ${p.no}?`, text: `Pembayaran ${rupiah(p.total)} dari ${p.santriNama} akan dihapus. Tagihannya kembali terbuka dan catatan di buku kas ikut dihapus.`, ok: 'Hapus pembayaran', danger: true })) return;
    run(() => batalPembayaran(p), 'Pembayaran dihapus, tagihan kembali terbuka.');
  };

  return (
    <>
      <Toolbar>
        <RangePicker dari={dari} sampai={sampai} onChange={(a, b) => { setDari(a); setSampai(b); }} />
        <SearchBox value={q} onChange={setQ} placeholder="Cari no. / santri" className="w-full sm:w-64" />
        <Button variant="secondary" icon={Download} className="ml-auto" disabled={!rows.length}
          onClick={() => downloadExcel(`pembayaran-${dari}-${sampai}.xlsx`, ['No', 'Tanggal', 'ID Santri', 'Nama', 'Kelas', 'Rincian', 'Total', 'Metode'],
            rows.map((p) => [p.no, p.tanggal, p.santriKode, p.santriNama, p.kelas, p.items.map((i) => `${i.kewajibanNama} ${periodeLabel(i.periodeKey)}`).join(', '), p.total, p.metode]))}>Ekspor Excel</Button>
      </Toolbar>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? <Empty icon={HandCoins} title="Belum ada pembayaran pada rentang ini" /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>No.</th><th>Tanggal</th><th>Santri</th><th>Rincian</th><th>Metode</th><th className="money">Total</th><th /></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs text-muted num whitespace-nowrap">{p.no}</td>
                    <td className="whitespace-nowrap">{tanggal(p.tanggal)}</td>
                    <td><p className="font-semibold">{p.santriNama}</p><p className="text-xs text-muted">{p.kelas}</p></td>
                    <td className="text-xs">{p.items.map((i) => <p key={i.tagihanId}>{i.kewajibanNama} {periodeLabel(i.periodeKey)} · <span className="num">{rupiah(i.bayar)}</span> {i.sisaSesudah <= 0 ? <Badge>LUNAS</Badge> : null}</p>)}</td>
                    <td>{p.metode}</td>
                    <td className="money font-semibold">{rupiah(p.total)}</td>
                    <td className="text-right whitespace-nowrap">
                      <button title="Cetak kwitansi" onClick={() => window.open(`/cetak/kwitansi/${p.id}`, '_blank')} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Printer className="size-4" /></button>
                      <button title="Kirim ke WhatsApp" onClick={() => kirimTeksWA(santriMap[p.santriId]?.hp, pesanKwitansi(p, settings))} className="p-1.5 rounded-md text-muted hover:text-[#1ea952] hover:bg-brand-50"><MessageCircle className="size-4" /></button>
                      {terkunci(p.tanggal) ? <span title="Periode terkunci (tutup buku)" className="inline-flex p-1.5 text-muted"><Lock className="size-4" /></span> : <>
                        <button title="Ubah" onClick={() => setUbah(p)} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Pencil className="size-4" /></button>
                        {isAdmin && <button title="Hapus" onClick={() => hapus(p)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>}
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>Total {rows.length} transaksi</td><td className="money">{rupiah(total)}</td><td /></tr></tfoot>
            </table>
          </div>
        )}
      </Panel>
      <UbahPembayaran p={ubah} onClose={() => setUbah(null)} />
    </>
  );
}

function UbahPembayaran({ p, onClose }) {
  const { settings } = useData();
  const { isAdmin } = useAuth();
  const [run, busy] = useAction();
  const [f, setF] = useState(null);
  const [maks, setMaks] = useState({});

  useEffect(() => {
    if (!p) { setF(null); setMaks({}); return; }
    setF({ tanggal: p.tanggal, metode: p.metode, rekening: p.rekening || rekeningUntuk(p.metode), keterangan: p.keterangan || '', bayar: Object.fromEntries(p.items.map((i) => [i.tagihanId, i.bayar])) });
    // batas maksimal = sisa tagihan saat ini + nominal pembayaran ini
    Promise.all(p.items.map((i) => getDoc(doc(db, COL.tagihan, i.tagihanId))))
      .then((snaps) => setMaks(Object.fromEntries(snaps.map((s, k) => [p.items[k].tagihanId, s.exists() ? s.data().sisa + p.items[k].bayar : p.items[k].bayar]))));
  }, [p]);

  if (!p || !f) return null;
  const total = Object.values(f.bayar).reduce((a, b) => a + (Number(b) || 0), 0);
  const over = p.items.some((i) => maks[i.tagihanId] != null && (Number(f.bayar[i.tagihanId]) || 0) > maks[i.tagihanId])
    || (!isAdmin && p.items.some((i) => !(Number(f.bayar[i.tagihanId]) > 0)));

  const simpan = () => run(async () => {
    await editPembayaran(p, { ...f, items: p.items.map((i) => ({ tagihanId: i.tagihanId, bayar: f.bayar[i.tagihanId] })) }, { bolehHapusItem: isAdmin });
    onClose();
  }, 'Pembayaran diperbarui. Tagihan dan buku kas ikut disesuaikan.');

  return (
    <Modal open onClose={onClose} title={`Ubah pembayaran ${p.no}`} subtitle={`${p.santriNama} · ${p.kelas}`} width="max-w-xl"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={busy} disabled={over || total <= 0} onClick={simpan}>Simpan perubahan</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Tanggal bayar"><Input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></Field>
        <Field label="Metode"><Select value={f.metode} options={[...new Set([...(settings.metode || []), p.metode])]} onChange={(e) => setF({ ...f, metode: e.target.value, rekening: rekeningUntuk(e.target.value) })} /></Field>
        <RekeningSelect value={f.rekening} onChange={(v) => setF({ ...f, rekening: v })} />
        <Field label="Keterangan" className="sm:col-span-2"><Input value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} /></Field>
      </div>
      <p className="text-sm font-bold mt-5 mb-2">Nominal per tagihan</p>
      <div className="border border-line rounded-lg divide-y divide-line">
        {p.items.map((i) => {
          const v = Number(f.bayar[i.tagihanId]) || 0; const m = maks[i.tagihanId];
          return (
            <div key={i.tagihanId} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{i.kewajibanNama} <span className="font-normal text-muted">· {periodeLabel(i.periodeKey)}</span></p>
                <p className="text-xs text-muted">{m == null ? 'Memeriksa sisa…' : `Maksimal ${rupiah(m)}`}{v === 0 && ' · dikeluarkan dari pembayaran ini'}</p>
              </div>
              <div className="w-full sm:w-40"><MoneyInput value={f.bayar[i.tagihanId]} onChange={(n) => setF({ ...f, bayar: { ...f.bayar, [i.tagihanId]: n } })} className={m != null && v > m ? 'border-rose-ink' : ''} /></div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-4 text-sm"><span className="text-muted">Total baru</span><span className="text-lg font-extrabold num text-brand-700">{rupiah(total)}</span></div>
      <p className="text-xs text-muted mt-2">{isAdmin
        ? 'Isi 0 untuk mengeluarkan satu tagihan dari pembayaran ini. Untuk menghapus seluruh pembayaran, gunakan tombol Hapus.'
        : 'Nominal minimal Rp 1 per tagihan. Mengeluarkan tagihan dari pembayaran atau menghapus pembayaran hanya bisa dilakukan admin.'}</p>
    </Modal>
  );
}
