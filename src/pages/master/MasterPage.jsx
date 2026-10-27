import { useMemo, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Download, Upload, Inbox, ListChecks, IdCard } from 'lucide-react';
import { useData } from '../../lib/data';
import { useAuth } from '../../lib/auth';
import { saveMaster, deleteMaster, isReferenced, perbaruiMassal } from '../../lib/ops';
import { perbaruiPortalSantri } from '../../lib/portal';
import { rupiah, norm, todayISO } from '../../lib/format';
import { downloadExcel } from '../../lib/excel';
import {
  Button, Field, Input, Textarea, Select, MoneyInput, Modal, Badge, PageHeader, Panel, Empty, SearchBox, Toolbar, useAction, useToast, cx,
} from '../../components/ui';
import { MASTERS } from './config';
import ImportSantri from './ImportSantri';
import KeringananField from './KeringananField';
import TarifField from './TarifField';
import UbahMassal from './UbahMassal';
import { teksTarif, dasarDari } from '../../lib/tarif';
import Wajib from '../../components/Wajib';

function optionsOf(f, data) {
  if (f.options) return f.options;
  if (f.optionsFrom === 'kelas') return data.kelas.map((k) => k.nama);
  if (f.optionsFrom === 'angkatan') {
    const th = [...new Set(data.santri.map((s) => s.tahunMasuk).filter(Boolean).map(String))].sort().reverse();
    return [...th.map((t) => ({ value: t, label: `Angkatan ${t}` })), { value: '__kosong', label: 'Angkatan belum diisi' }];
  }
  if (f.optionsFrom === 'angkatanTarif') {
    const th = new Set([String(new Date().getFullYear()), ...data.santri.map((s) => s.tahunMasuk).filter(Boolean).map(String)]);
    data.kewajiban.forEach((k) => { if (k.dasarTarif === 'angkatan') (k.tarif || []).forEach((t) => th.add(String(t.kunci))); });
    return [...th].sort().reverse().map((t) => ({ value: t, label: `Tarif angkatan ${t}` }));
  }
  if (f.optionsFrom === 'akunMasuk') return data.akun.filter((a) => a.jenis === 'Pemasukan').map((a) => a.nama);
  return [];
}

export function FormFields({ fields, value, onChange, data }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {fields.map((f) => {
        const v = value[f.name] ?? '';
        let input;
        switch (f.type) {
          case 'textarea': input = <Textarea value={v} onChange={(e) => set(f.name, e.target.value)} />; break;
          case 'money': input = <MoneyInput value={v} onChange={(n) => set(f.name, n)} />; break;
          case 'number': input = <Input type="number" value={v} onChange={(e) => set(f.name, e.target.value === '' ? '' : Number(e.target.value))} />; break;
          case 'date': input = <Input type="date" value={v} onChange={(e) => set(f.name, e.target.value)} />; break;
          case 'select': input = <Select value={v} placeholder="— pilih —" options={optionsOf(f, data)} onChange={(e) => set(f.name, e.target.value)} />; break;
          case 'keringanan': return (
            <div key={f.name} className="sm:col-span-2">
              <span className="block text-xs font-semibold text-muted mb-1.5">{f.label}</span>
              <KeringananField value={value[f.name]} onChange={(v) => set(f.name, v)} kewajiban={data.kewajiban} />
            </div>
          );
          case 'tarif': return (
            <div key={f.name} className="sm:col-span-2">
              <span className="block text-xs font-semibold text-muted mb-1.5">{f.label}</span>
              <TarifField value={value} onChange={(patch) => onChange({ ...value, ...patch })} data={data} />
            </div>
          );
          case 'bool': input = <Select value={v ? 'Ya' : 'Tidak'} options={['Tidak', 'Ya']} onChange={(e) => set(f.name, e.target.value === 'Ya')} />; break;
          default: input = <Input value={v} onChange={(e) => set(f.name, e.target.value)} />;
        }
        return <Field key={f.name} label={f.label} required={f.required} hint={f.hint} className={f.span === 2 ? 'sm:col-span-2' : ''}>{input}</Field>;
      })}
    </div>
  );
}

/** Pasang ulang halaman saat jenis master berganti agar filter & pencarian tidak terbawa. */
export default function MasterRoute() {
  const { jenis } = useParams();
  return <MasterPage key={jenis} jenis={jenis} />;
}

function MasterPage({ jenis }) {
  const { boleh } = useAuth();
  const cfg0 = MASTERS[jenis];
  // Sembunyikan field/kolom yang butuh izin tertentu (mis. tarif honor & keringanan hanya untuk keuangan)
  const cfg = useMemo(() => cfg0 && { ...cfg0, fields: cfg0.fields.filter((f) => !f.akses || boleh(f.akses)), columns: cfg0.columns.filter((c) => !c.akses || boleh(c.akses)) }, [cfg0, boleh]);
  const data = useData();
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run, busy] = useAction();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(() => Object.fromEntries((cfg?.filters || []).map((f) => [f.name, f.default || ''])));
  const [edit, setEdit] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pilih, setPilih] = useState(() => new Set());
  const [massalOpen, setMassalOpen] = useState(false);

  const rows = useMemo(() => {
    if (!cfg) return [];
    let list = data[jenis] || [];
    if (jenis === 'kelas') {
      list = list.map((k) => ({ ...k, jumlah: data.santri.filter((s) => s.kelas === k.nama && s.status === 'Aktif').length }));
    }
    const nq = norm(q);
    return list.filter((r) => (!nq || cfg.search.some((k) => norm(r[k]).includes(nq)))
      && Object.entries(filter).every(([k, v]) => !v || cfg.filters.find((f) => f.name === k)?.view || (v === '__kosong' ? !r[k] : String(r[k] ?? '') === v)));
  }, [cfg, data, jenis, q, filter]);

  if (!cfg) return <Navigate to="/" replace />;
  const bisaMassal = !!cfg.massal;
  const terpilih = rows.filter((r) => pilih.has(r.id));
  const semuaTerpilih = rows.length > 0 && terpilih.length === rows.length;
  const togglePilih = (id) => setPilih((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglSemua = () => setPilih(semuaTerpilih ? new Set() : new Set(rows.map((r) => r.id)));
  if (!boleh(cfg.akses)) return <Wajib akses={cfg.akses} />;

  const openNew = () => setEdit({ id: null, value: Object.fromEntries(cfg.fields.filter((f) => f.default).map((f) => [f.name, f.default])) });

  const save = () => {
    const miss = cfg.fields.find((f) => f.required && !String(edit.value[f.name] ?? '').trim());
    const kr = (edit.value.keringanan || []);
    if (kr.some((k) => !k.kewajibanId || !(Number(k.nilai) > 0))) { run(async () => { throw new Error('Lengkapi jenis kewajiban dan besar keringanan, atau hapus barisnya.'); }); return; }
    if (new Set(kr.map((k) => k.kewajibanId)).size !== kr.length) { run(async () => { throw new Error('Satu jenis kewajiban hanya boleh punya satu keringanan.'); }); return; }
    if (dasarDari(edit.value) === 'angkatan' && (edit.value.tarif || []).some((t) => !/^\d{4}$/.test(String(t.kunci)))) { run(async () => { throw new Error('Tahun angkatan harus 4 digit.'); }); return; }
    if (edit.value.dasarTarif === 'tetap') edit.value.tarif = [];
    if (miss) { run(async () => { throw new Error(`${miss.label} wajib diisi.`); }); return; }
    run(async () => {
      const before = edit.id ? data[jenis].find((x) => x.id === edit.id) : null;
      const nama = String(edit.value.nama || '').trim();
      edit.value.nama = nama;
      if (cfg.unique && data[jenis].some((x) => x.id !== edit.id && norm(x.nama) === norm(nama))) throw new Error(`"${nama}" sudah ada.`);
      if (cfg.locked && before && cfg.locked.includes(before.nama) && before.nama !== nama) throw new Error(`Nama "${before.nama}" dipakai sistem dan tidak boleh diganti.`);
      await saveMaster(jenis, edit.value, edit.id);
      // Nama berubah → perbarui salinan nama di data lain agar laporan tetap konsisten
      if (cfg.cascade && before && before.nama !== nama) {
        const KEUANGAN = ['tagihan', 'pembayaran', 'kas', 'gaji', 'kewajiban'];
        for (const c of cfg.cascade) {
          if (KEUANGAN.includes(c.col) && !boleh('keuangan')) continue; // tanpa izin keuangan: data keuangan tidak disentuh
          await perbaruiMassal(c.col, c.where, c.by === 'id' ? before.id : before.nama, { [c.set]: nama });
        }
      }
      if (jenis === 'santri' && edit.id) perbaruiPortalSantri(edit.id);
      setEdit(null);
    }, `Data ${cfg.singular} disimpan.`);
  };

  const remove = async (r) => {
    const ok = await confirm({ title: `Hapus ${r.nama}?`, text: 'Data yang dihapus tidak bisa dikembalikan.', ok: 'Hapus', danger: true });
    if (!ok) return;
    run(async () => {
      if (cfg.locked?.includes(r.nama)) throw new Error(`"${r.nama}" dipakai sistem dan tidak boleh dihapus.`);
      if (cfg.refCheck && await isReferenced(cfg.refCheck.col, cfg.refCheck.field, cfg.refCheck.by ? r[cfg.refCheck.by] : r.id)) throw new Error(cfg.refCheck.msg);
      await deleteMaster(jenis, r.id, r.nama);
    }, 'Data dihapus.');
  };

  const exportCsv = () => downloadExcel(`${jenis}-${todayISO()}.xlsx`,
    ['Kode', ...cfg.fields.map((f) => f.label)],
    rows.map((r) => [r.kode, ...cfg.fields.map((f) => (f.type === 'bool' ? (r[f.name] ? 'Ya' : 'Tidak')
      : f.type === 'tarif' ? [dasarDari(r) === 'tetap' ? 'Sama' : `Per ${dasarDari(r)}`, teksTarif(r, data.kelas)].filter(Boolean).join(': ')
      : f.type === 'keringanan' ? (r[f.name] || []).map((k) => `${data.kewajiban.find((x) => x.id === k.kewajibanId)?.nama || '?'} ${k.tipe === 'persen' ? `${k.nilai}%` : k.nilai}`).join('; ')
      : r[f.name] ?? ''))]));

  return (
    <>
      <PageHeader help={jenis} title={cfg.title} description={cfg.description}
        actions={<>
          {cfg.importable && <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Impor</Button>}
          <Button variant="secondary" icon={Download} onClick={exportCsv}>Ekspor Excel</Button>
          <Button icon={Plus} onClick={openNew}>Tambah {cfg.singular}</Button>
        </>} />
      <Toolbar>
        <SearchBox value={q} onChange={setQ} className="w-full sm:w-72" />
        {(cfg.filters || []).filter((f) => !f.hanyaJika || f.hanyaJika(data)).map((f) => (
          <Select key={f.name} className={f.view ? "w-56" : "w-48"} value={filter[f.name]} placeholder={f.tanpaKosong ? undefined : f.label} aria-label={f.label}
            options={optionsOf(f, data)} onChange={(e) => setFilter({ ...filter, [f.name]: e.target.value })} />
        ))}
        <span className="text-sm text-muted ml-auto self-center">{rows.length} data</span>
      </Toolbar>
      {bisaMassal && terpilih.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm" role="status">
          <span><b>{terpilih.length}</b> {cfg.singular} dipilih</span>
          <Button size="sm" icon={ListChecks} onClick={() => setMassalOpen(true)}>Ubah sekaligus</Button>
          <button type="button" className="text-muted hover:text-ink underline-offset-2 hover:underline" onClick={() => setPilih(new Set())}>Batal pilih</button>
        </div>
      )}
      <Panel pad={false}>
        {rows.length === 0 ? (
          <Empty icon={Inbox} title={data.loading ? 'Memuat…' : `Belum ada ${cfg.singular}`}
            text={data.loading ? null : 'Tambahkan data baru, atau ubah pencarian dan filter.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr>{bisaMassal && <th className="w-10"><input type="checkbox" className="size-4 accent-brand-700 align-middle" aria-label="Pilih semua" checked={semuaTerpilih} onChange={togglSemua} /></th>}{cfg.columns.map((c) => <th key={c.key} className={cx(c.money && 'money', c.key === 'kode' && 'hidden sm:table-cell')}>{c.label}</th>)}<th className="w-24" /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={pilih.has(r.id) ? 'bg-brand-50/60' : ''}>
                    {bisaMassal && <td><input type="checkbox" className="size-4 accent-brand-700 align-middle" aria-label={`Pilih ${r.nama}`} checked={pilih.has(r.id)} onChange={() => togglePilih(r.id)} /></td>}
                    {cfg.columns.map((c) => (
                      <td key={c.key} className={c.money ? 'money' : c.key === 'kode' ? 'text-muted num text-xs hidden sm:table-cell' : c.num ? 'num' : c.strong ? 'font-semibold' : ''}>
                        {c.render ? c.render(r, data, filter) : c.badge ? (r[c.key] ? <Badge>{r[c.key]}</Badge> : '') : c.money ? rupiah(r[c.key]) : r[c.key]}
                      </td>
                    ))}
                    <td className="text-right whitespace-nowrap">
                      {cfg.kartu && boleh('lihatTagihan') && <Link to={`/laporan/kartu-santri?santri=${r.id}`} className="inline-flex p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50" title="Kartu santri"><IdCard className="size-4" /></Link>}
                      <button className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50" title="Ubah"
                        onClick={() => setEdit({ id: r.id, value: { ...r } })}><Pencil className="size-4" /></button>
                      {isAdmin && <button className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5" title="Hapus"
                        onClick={() => remove(r)}><Trash2 className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Modal open={!!edit} onClose={() => setEdit(null)} width="max-w-2xl"
        title={edit?.id ? `Ubah ${cfg.singular}` : `Tambah ${cfg.singular}`}
        subtitle={edit?.id ? edit.value.kode : 'Kode dibuat otomatis saat disimpan.'}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Batal</Button><Button loading={busy} onClick={save}>Simpan</Button></>}>
        {edit && <FormFields fields={cfg.fields} value={edit.value} data={data} onChange={(value) => setEdit({ ...edit, value })} />}
      </Modal>
      {bisaMassal && <UbahMassal open={massalOpen} onClose={() => setMassalOpen(false)} santri={terpilih} onSelesai={() => setPilih(new Set())} />}
      {cfg.importable && <ImportSantri open={importOpen} onClose={() => setImportOpen(false)} />}
    </>
  );
}
