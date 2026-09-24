import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { Plus, Pencil, Trash2, Download, ReceiptText, HandCoins } from 'lucide-react';
import { db } from '../lib/firebase';
import { COL, useLiveQuery, fetchWhere } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { createTagihan, updateNominalTagihan, deleteTagihan } from '../lib/ops';
import { BULAN, rupiah, norm, periodeKey, periodeLabel, todayISO, awalBulan } from '../lib/format';
import { downloadExcel } from '../lib/excel';
import {
  Button, Field, Input, Select, MoneyInput, Modal, Badge, PageHeader, Panel, Empty, SearchBox, Toolbar, Stat, useAction, useToast, cx,
} from '../components/ui';
import { PeriodePicker } from '../components/Periode';
import SantriPicker from '../components/SantriPicker';
import { itemTagihan } from '../lib/keringanan';
import { useSearchParams } from 'react-router-dom';
import { CalendarPlus, Percent } from 'lucide-react';

const now = new Date();

export default function Tagihan() {
  const { kelas, santriMap } = useData();
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run, busy] = useAction();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [fKelas, setFKelas] = useState(''); const [fStatus, setFStatus] = useState(''); const [q, setQ] = useState('');
  const [buat, setBuat] = useState(false);
  const [params, setParams] = useSearchParams();
  const [bulanan, setBulanan] = useState(params.get('bulanan') === '1');
  const [ubah, setUbah] = useState(null);

  const key = periodeKey(bulan, tahun);
  const { data, loading } = useLiveQuery(() => query(collection(db, COL.tagihan), where('periodeKey', '==', key)), [key]);

  const rows = useMemo(() => {
    const nq = norm(q);
    // Nama & kelas terbaru dari data santri (jika sempat diganti oleh bagian pendidikan)
    return data.map((t) => ({ ...t, santriNama: santriMap[t.santriId]?.nama || t.santriNama, kelas: santriMap[t.santriId]?.kelas ?? t.kelas })).filter((t) => (!fKelas || t.kelas === fKelas) && (!fStatus || t.status === fStatus)
      && (!nq || [t.santriNama, t.santriKode, t.no, t.kewajibanNama].some((x) => norm(x).includes(nq))))
      .sort((a, b) => a.santriNama.localeCompare(b.santriNama) || a.kewajibanNama.localeCompare(b.kewajibanNama));
  }, [data, fKelas, fStatus, q, santriMap]);

  const tot = rows.reduce((a, t) => ({ n: a.n + t.nominal, d: a.d + t.dibayar, s: a.s + t.sisa }), { n: 0, d: 0, s: 0 });

  const hapus = async (t) => {
    if (!await confirm({ title: 'Hapus tagihan?', text: `${t.kewajibanNama} ${periodeLabel(t.periodeKey)} untuk ${t.santriNama}.`, ok: 'Hapus', danger: true })) return;
    run(() => deleteTagihan(t), 'Tagihan dihapus.');
  };

  const ekspor = () => downloadExcel(`tagihan-${key}.xlsx`,
    ['No', 'ID Santri', 'Nama', 'Kelas', 'Kewajiban', 'Periode', 'Nominal', 'Dibayar', 'Sisa', 'Status'],
    rows.map((t) => [t.no, t.santriKode, t.santriNama, t.kelas, t.kewajibanNama, periodeLabel(t.periodeKey), t.nominal, t.dibayar, t.sisa, t.status]));

  return (
    <>
      <PageHeader help="tagihan" title="Tagihan santri"
        description="Kewajiban pembayaran per santri per periode. Status berubah otomatis setiap kali ada pembayaran."
        actions={<>
          <Button variant="secondary" icon={Download} onClick={ekspor} disabled={!rows.length}>Ekspor Excel</Button>
          <Button variant="secondary" icon={CalendarPlus} onClick={() => setBulanan(true)}>Tagihan bulanan</Button>
          <Button icon={Plus} onClick={() => setBuat(true)}>Buat tagihan</Button>
        </>} />
      <Toolbar>
        <PeriodePicker bulan={bulan} tahun={tahun} onChange={(b, t) => { setBulan(b); setTahun(t); }} />
        <Field label="Kelas"><Select value={fKelas} placeholder="Semua kelas" options={kelas.map((k) => k.nama)} onChange={(e) => setFKelas(e.target.value)} /></Field>
        <Field label="Status"><Select value={fStatus} placeholder="Semua status" options={[{ value: 'BELUM BAYAR', label: 'Belum bayar' }, { value: 'SEBAGIAN', label: 'Sebagian' }, { value: 'LUNAS', label: 'Lunas' }]} onChange={(e) => setFStatus(e.target.value)} /></Field>
        <SearchBox value={q} onChange={setQ} placeholder="Cari santri / no. tagihan" className="w-full sm:w-64" />
      </Toolbar>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden mb-4">
        {[
          ['Total tagihan', rupiah(tot.n), `${rows.length} tagihan`, 'ink'],
          ['Sudah dibayar', rupiah(tot.d), null, 'brand'],
          ['Sisa / piutang', rupiah(tot.s), null, 'rose'],
          ['Lunas', `${rows.filter((t) => t.status === 'LUNAS').length} dari ${rows.length}`, null, 'ink'],
        ].map(([l, v, s, tone]) => <div key={l} className="bg-white p-4"><Stat label={l} value={v} sub={s} tone={tone} /></div>)}
      </div>

      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? (
          <Empty icon={ReceiptText} title={`Belum ada tagihan ${BULAN[bulan - 1]} ${tahun}`}
            text="Buat tagihan untuk satu santri atau sekaligus satu kelas."
            action={<Button icon={Plus} onClick={() => setBuat(true)}>Buat tagihan</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>No. tagihan</th><th>Santri</th><th>Kelas</th><th>Kewajiban</th><th className="money">Nominal</th><th className="money">Dibayar</th><th className="money">Sisa</th><th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="text-xs text-muted num">{t.no}</td>
                    <td><p className="font-semibold">{t.santriNama}</p><p className="text-xs text-muted">{t.santriKode}</p></td>
                    <td>{t.kelas}</td>
                    <td>{t.kewajibanNama}{t.keterangan && <p className="text-xs text-muted">{t.keterangan}</p>}{t.potongan > 0 && <p className="text-[11px] text-brass-700 inline-flex items-center gap-1"><Percent className="size-3" />potongan {rupiah(t.potongan)} dari {rupiah(t.nominalAwal)}</p>}</td>
                    <td className="money">{rupiah(t.nominal)}</td>
                    <td className="money">{rupiah(t.dibayar)}</td>
                    <td className={cx('money font-semibold', t.sisa > 0 && 'text-rose-ink')}>{rupiah(t.sisa)}</td>
                    <td><Badge>{t.status}</Badge></td>
                    <td className="text-right whitespace-nowrap">
                      {t.sisa > 0 && <Link to={`/pembayaran?santri=${t.santriId}`} title="Terima pembayaran"
                        className="inline-flex p-1.5 rounded-md text-brand-700 hover:bg-brand-50"><HandCoins className="size-4" /></Link>}
                      <button onClick={() => setUbah({ t, nominal: t.nominal, keterangan: t.keterangan || '' })} title="Ubah nominal"
                        className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Pencil className="size-4" /></button>
                      {isAdmin && t.dibayar === 0 && <button onClick={() => hapus(t)} title="Hapus"
                        className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <BuatTagihan open={buat} onClose={() => setBuat(false)} bulanAwal={bulan} tahunAwal={tahun} />
      <BuatBulanan open={bulanan} onClose={() => { setBulanan(false); if (params.get('bulanan')) setParams({}, { replace: true }); }}
        bulanAwal={Number(params.get('bulan')) || bulan} tahunAwal={Number(params.get('tahun')) || tahun} />

      <Modal open={!!ubah} onClose={() => setUbah(null)} title="Ubah nominal tagihan"
        subtitle={ubah && `${ubah.t.kewajibanNama} · ${ubah.t.santriNama} · ${periodeLabel(ubah.t.periodeKey)}`}
        footer={<><Button variant="secondary" onClick={() => setUbah(null)}>Batal</Button>
          <Button loading={busy} onClick={() => run(async () => { await updateNominalTagihan(ubah.t, ubah.nominal, ubah.keterangan); setUbah(null); }, 'Tagihan diperbarui.')}>Simpan</Button></>}>
        {ubah && <div className="space-y-4">
          <Field label="Nominal" hint={ubah.t.dibayar > 0 ? `Sudah dibayar ${rupiah(ubah.t.dibayar)} — nominal tidak boleh kurang dari itu.` : 'Misalnya untuk potongan/keringanan.'}>
            <MoneyInput value={ubah.nominal} onChange={(n) => setUbah({ ...ubah, nominal: n })} />
          </Field>
          <Field label="Keterangan"><Input value={ubah.keterangan} onChange={(e) => setUbah({ ...ubah, keterangan: e.target.value })} placeholder="Contoh: keringanan anak yatim" /></Field>
        </div>}
      </Modal>
    </>
  );
}

function BuatTagihan({ open, onClose, bulanAwal, tahunAwal }) {
  const { kewajiban, santri, santriMap, kelas } = useData();
  const [run, busy] = useAction();
  const [f, setF] = useState(null);
  const [existing, setExisting] = useState(null);
  const [prog, setProg] = useState(null); // { done, total } selama proses simpan
  const [reload, setReload] = useState(0);

  // Cegah halaman ditutup/di-refresh saat tagihan sedang dibuat
  useEffect(() => {
    if (!prog) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [prog]);

  useEffect(() => {
    if (open) {
      const k = kewajiban.find((x) => x.status === 'Aktif');
      setF({ target: 'kelas', kelas: '', santriId: '', kewajibanId: k?.id || '', nominal: k?.nominal ?? '', bulan: bulanAwal, tahun: tahunAwal, tanggal: awalBulan(tahunAwal, bulanAwal), keterangan: '', pakaiKeringanan: true });
    } else { setF(null); setExisting(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const kw = f && kewajiban.find((k) => k.id === f.kewajibanId);
  const key = f ? periodeKey(f.bulan, f.tahun) : null;

  // muat tagihan yang sudah ada untuk periode ini (untuk mencegah dobel)
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    setExisting(null);
    fetchWhere(COL.tagihan, 'periodeKey', '==', key)
      .then((list) => alive && setExisting(list)).catch(() => alive && setExisting([]));
    return () => { alive = false; };
  }, [key, reload]);

  const target = !f ? [] : f.target === 'satu'
    ? (f.santriId && santriMap[f.santriId] ? [santriMap[f.santriId]] : [])
    : santri.filter((s) => s.status === 'Aktif' && (!f.kelas || s.kelas === f.kelas));
  const sudah = new Set((existing || []).filter((t) => t.kewajibanId === f?.kewajibanId).map((t) => t.santriId));
  const baru = target.filter((s) => !sudah.has(s.id));
  const items = kw && f ? baru.map((s) => itemTagihan(s, kw, f)) : [];
  const dapatKeringanan = items.filter((i) => i.potongan > 0);
  const totalNominal = items.reduce((a, i) => a + i.nominal, 0);

  const simpan = () => run(async () => {
    if (!kw) throw new Error('Pilih jenis kewajiban.');
    if (!baru.length) throw new Error('Tidak ada santri yang perlu ditagih.');
    const total = baru.length;
    let done = 0;
    setProg({ done: 0, total });
    try {
      await createTagihan(
        items,
        (d) => { done = d; setProg({ done: d, total }); },
      );
    } catch (e) {
      setReload((x) => x + 1); // hitung ulang santri yang belum ditagih
      throw new Error(done > 0
        ? `${done} dari ${total} tagihan sudah tersimpan, sisanya gagal (${e.message}). Klik "Buat tagihan" lagi untuk melanjutkan — yang sudah tersimpan otomatis dilewati.`
        : e.message);
    } finally {
      setProg(null);
    }
    onClose();
    return total;
  }, `${baru.length} tagihan dibuat.`);
  const persen = prog ? Math.round((prog.done / prog.total) * 100) : 0;

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Buat tagihan" width="max-w-2xl"
      subtitle="Santri yang sudah punya tagihan jenis & periode yang sama otomatis dilewati."
      footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Batal</Button>
        <Button loading={busy} disabled={!baru.length || existing == null} onClick={simpan}>
          {prog ? `Membuat ${prog.done} dari ${prog.total}…` : `Buat ${baru.length} tagihan`}
        </Button></>}>
      {f && <fieldset disabled={busy} className="space-y-4 min-w-0">
        <div className="inline-flex p-1 bg-paper rounded-lg border border-line">
          {[['kelas', 'Per kelas / massal'], ['satu', 'Satu santri']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setF({ ...f, target: v })}
              className={cx('px-3 h-8 rounded-md text-sm font-semibold', f.target === v ? 'bg-white shadow-sm text-ink' : 'text-muted')}>{l}</button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {f.target === 'satu'
            ? <Field label="Santri" className="sm:col-span-2" required><SantriPicker value={f.santriId} onChange={(id) => setF({ ...f, santriId: id })} /></Field>
            : <Field label="Kelas" className="sm:col-span-2"><Select value={f.kelas} placeholder="Semua santri aktif" options={kelas.map((k) => k.nama)} onChange={(e) => setF({ ...f, kelas: e.target.value })} /></Field>}
          <Field label="Jenis kewajiban" required>
            <Select value={f.kewajibanId} options={kewajiban.filter((k) => k.status === 'Aktif').map((k) => ({ value: k.id, label: k.nama }))}
              onChange={(e) => { const k = kewajiban.find((x) => x.id === e.target.value); setF({ ...f, kewajibanId: e.target.value, nominal: k?.nominal ?? '' }); }} />
          </Field>
          <Field label="Nominal per santri" hint="Default dari master; boleh diubah."><MoneyInput value={f.nominal} onChange={(n) => setF({ ...f, nominal: n })} /></Field>
          <PeriodePicker bulan={f.bulan} tahun={f.tahun} onChange={(b, t) => setF({ ...f, bulan: b, tahun: t, tanggal: awalBulan(t, b) })} />
          <Field label="Tanggal tagihan"><Input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value || todayISO() })} /></Field>
          <Field label="Keterangan"><Input value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} /></Field>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-brand-700" checked={f.pakaiKeringanan} onChange={(e) => setF({ ...f, pakaiKeringanan: e.target.checked })} />Terapkan keringanan tetap santri (diatur di data santri)</label>
        </div>
        {prog ? (
          <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3" role="status" aria-live="polite">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Membuat tagihan {prog.done} dari {prog.total}…</span>
              <span className="num text-muted">{persen}%</span>
            </div>
            <div className="h-2 mt-2 rounded-full bg-white overflow-hidden border border-brand-100">
              <div className="h-full bg-brand-600 transition-[width] duration-300" style={{ width: `${Math.max(persen, 3)}%` }} />
            </div>
            <p className="text-xs text-muted mt-2">Jangan tutup atau muat ulang halaman sampai selesai.</p>
          </div>
        ) : (
        <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 text-sm">
          {existing == null ? 'Memeriksa tagihan yang sudah ada…' : <>
            <b>{baru.length}</b> santri akan ditagih {kw?.nama} {BULAN[f.bulan - 1]} {f.tahun} sebesar <b>{rupiah(f.nominal)}</b>
            {' '}(total <b>{rupiah(totalNominal)}</b>).
            {dapatKeringanan.length > 0 && <span className="block mt-1 text-brass-700">{dapatKeringanan.length} santri mendapat keringanan: {dapatKeringanan.slice(0, 4).map((i) => `${i.santri.nama} ${rupiah(i.nominal)}`).join(', ')}{dapatKeringanan.length > 4 ? ', …' : ''}.</span>}
            {target.length - baru.length > 0 && <span className="text-muted"> {target.length - baru.length} santri dilewati karena sudah punya tagihan ini.</span>}
          </>}
        </div>
        )}
      </fieldset>}
    </Modal>
  );
}

/** Buat sekaligus semua tagihan berjenis Bulanan untuk satu periode (keringanan diterapkan). */
function BuatBulanan({ open, onClose, bulanAwal, tahunAwal }) {
  const { kewajiban, santri } = useData();
  const [run, busy] = useAction();
  const [f, setF] = useState(null);
  const [existing, setExisting] = useState(null);
  const [pilih, setPilih] = useState({});
  const [prog, setProg] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!prog) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [prog]);

  const bulananList = kewajiban.filter((k) => k.status === 'Aktif' && k.periode === 'Bulanan');
  useEffect(() => {
    if (open) {
      setF({ bulan: bulanAwal, tahun: tahunAwal, tanggal: awalBulan(tahunAwal, bulanAwal) });
      setPilih(Object.fromEntries(bulananList.map((k) => [k.id, true])));
    } else { setF(null); setExisting(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const key = f ? periodeKey(f.bulan, f.tahun) : null;
  useEffect(() => {
    if (!key) return undefined;
    let alive = true; setExisting(null);
    fetchWhere(COL.tagihan, 'periodeKey', '==', key).then((l) => alive && setExisting(l)).catch(() => alive && setExisting([]));
    return () => { alive = false; };
  }, [key, reload]);

  const aktif = santri.filter((s) => s.status === 'Aktif');
  const rencana = f ? bulananList.map((kw) => {
    const sudah = new Set((existing || []).filter((t) => t.kewajibanId === kw.id).map((t) => t.santriId));
    const items = aktif.filter((s) => !sudah.has(s.id)).map((s) => itemTagihan(s, kw, { nominal: kw.nominal, bulan: f.bulan, tahun: f.tahun, tanggal: f.tanggal, keterangan: '' }));
    return { kw, items, sudah: sudah.size, total: items.reduce((a, i) => a + i.nominal, 0), keringanan: items.filter((i) => i.potongan > 0).length };
  }) : [];
  const dipilih = rencana.filter((r) => pilih[r.kw.id] && r.items.length);
  const jumlah = dipilih.reduce((a, r) => a + r.items.length, 0);

  const simpan = () => run(async () => {
    let done = 0;
    setProg({ done: 0, total: jumlah });
    try {
      for (const r of dipilih) {
        const awal = done;
        await createTagihan(r.items, (d) => { done = awal + d; setProg({ done, total: jumlah }); });
      }
    } catch (e) {
      setReload((x) => x + 1);
      throw new Error(done > 0 ? `${done} dari ${jumlah} tagihan sudah tersimpan, sisanya gagal (${e.message}). Buka lagi untuk melanjutkan — yang sudah tersimpan otomatis dilewati.` : e.message);
    } finally { setProg(null); }
    onClose();
  }, `${jumlah} tagihan bulanan dibuat.`);
  const persen = prog ? Math.round((prog.done / prog.total) * 100) : 0;

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Tagihan bulanan" width="max-w-2xl"
      subtitle="Membuat semua kewajiban berperiode Bulanan untuk seluruh santri aktif sekaligus."
      footer={<><Button variant="secondary" disabled={busy} onClick={onClose}>Batal</Button>
        <Button loading={busy} disabled={!jumlah || existing == null} onClick={simpan}>{prog ? `Membuat ${prog.done} dari ${prog.total}…` : `Buat ${jumlah} tagihan`}</Button></>}>
      {f && <fieldset disabled={busy} className="space-y-4 min-w-0">
        <div className="grid sm:grid-cols-3 gap-4">
          <PeriodePicker bulan={f.bulan} tahun={f.tahun} onChange={(b, t) => setF({ ...f, bulan: b, tahun: t, tanggal: awalBulan(t, b) })} />
          <Field label="Tanggal tagihan"><Input type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value || todayISO() })} /></Field>
        </div>
        {bulananList.length === 0 ? <p className="text-sm text-muted">Belum ada jenis kewajiban berperiode <b>Bulanan</b> yang aktif. Atur di Data master → Jenis kewajiban.</p> : (
          <div className="border border-line rounded-lg divide-y divide-line">
            {rencana.map((r) => (
              <label key={r.kw.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <input type="checkbox" className="size-4 accent-brand-700" checked={!!pilih[r.kw.id]} disabled={!r.items.length} onChange={(e) => setPilih({ ...pilih, [r.kw.id]: e.target.checked })} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{r.kw.nama} <span className="font-normal text-muted">· {rupiah(r.kw.nominal)}</span></p>
                  <p className="text-xs text-muted">{existing == null ? 'Memeriksa…' : r.items.length ? `${r.items.length} santri baru${r.sudah ? `, ${r.sudah} sudah ditagih` : ''}${r.keringanan ? `, ${r.keringanan} dengan keringanan` : ''}` : `Semua santri aktif sudah ditagih (${r.sudah})`}</p>
                </div>
                <span className="num font-semibold">{rupiah(r.total)}</span>
              </label>
            ))}
          </div>
        )}
        {prog && (
          <div className="rounded-lg bg-brand-50 border border-brand-100 px-4 py-3" role="status" aria-live="polite">
            <div className="flex justify-between text-sm"><span className="font-semibold">Membuat tagihan {prog.done} dari {prog.total}…</span><span className="num text-muted">{persen}%</span></div>
            <div className="h-2 mt-2 rounded-full bg-white overflow-hidden border border-brand-100"><div className="h-full bg-brand-600 transition-[width] duration-300" style={{ width: `${Math.max(persen, 3)}%` }} /></div>
            <p className="text-xs text-muted mt-2">Jangan tutup atau muat ulang halaman sampai selesai.</p>
          </div>
        )}
      </fieldset>}
    </Modal>
  );
}
