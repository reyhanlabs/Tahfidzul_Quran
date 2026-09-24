import { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Download, Upload, Inbox } from 'lucide-react';
import { useData } from '../../lib/data';
import { useAuth } from '../../lib/auth';
import { saveMaster, deleteMaster, isReferenced, perbaruiMassal } from '../../lib/ops';
import { perbaruiPortalSantri } from '../../lib/portal';
import { rupiah, norm, todayISO } from '../../lib/format';
import { downloadExcel } from '../../lib/excel';
import {
  Button, Field, Input, Textarea, Select, MoneyInput, Modal, Badge, PageHeader, Panel, Empty, SearchBox, Toolbar, useAction, useToast,
} from '../../components/ui';
import { MASTERS } from './config';
import ImportSantri from './ImportSantri';
import KeringananField from './KeringananField';

function optionsOf(f, data) {
  if (f.options) return f.options;
  if (f.optionsFrom === 'kelas') return data.kelas.map((k) => k.nama);
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
          case 'bool': input = <Select value={v ? 'Ya' : 'Tidak'} options={['Tidak', 'Ya']} onChange={(e) => set(f.name, e.target.value === 'Ya')} />; break;
          default: input = <Input value={v} onChange={(e) => set(f.name, e.target.value)} />;
        }
        return <Field key={f.name} label={f.label} required={f.required} hint={f.hint} className={f.span === 2 ? 'sm:col-span-2' : ''}>{input}</Field>;
      })}
    </div>
  );
}

export default function MasterPage() {
  const { jenis } = useParams();
  const cfg = MASTERS[jenis];
  const data = useData();
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run, busy] = useAction();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(() => Object.fromEntries((cfg?.filters || []).map((f) => [f.name, f.default || ''])));
  const [edit, setEdit] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const rows = useMemo(() => {
    if (!cfg) return [];
    let list = data[jenis] || [];
    if (jenis === 'kelas') {
      list = list.map((k) => ({ ...k, jumlah: data.santri.filter((s) => s.kelas === k.nama && s.status === 'Aktif').length }));
    }
    const nq = norm(q);
    return list.filter((r) => (!nq || cfg.search.some((k) => norm(r[k]).includes(nq)))
      && Object.entries(filter).every(([k, v]) => !v || r[k] === v));
  }, [cfg, data, jenis, q, filter]);

  if (!cfg) return <Navigate to="/" replace />;

  const openNew = () => setEdit({ id: null, value: Object.fromEntries(cfg.fields.filter((f) => f.default).map((f) => [f.name, f.default])) });

  const save = () => {
    const miss = cfg.fields.find((f) => f.required && !String(edit.value[f.name] ?? '').trim());
    const kr = (edit.value.keringanan || []);
    if (kr.some((k) => !k.kewajibanId || !(Number(k.nilai) > 0))) { run(async () => { throw new Error('Lengkapi jenis kewajiban dan besar keringanan, atau hapus barisnya.'); }); return; }
    if (new Set(kr.map((k) => k.kewajibanId)).size !== kr.length) { run(async () => { throw new Error('Satu jenis kewajiban hanya boleh punya satu keringanan.'); }); return; }
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
        for (const c of cfg.cascade) {
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
        {(cfg.filters || []).map((f) => (
          <Select key={f.name} className="w-44" value={filter[f.name]} placeholder={f.label}
            options={optionsOf(f, data)} onChange={(e) => setFilter({ ...filter, [f.name]: e.target.value })} />
        ))}
        <span className="text-sm text-muted ml-auto self-center">{rows.length} data</span>
      </Toolbar>
      <Panel pad={false}>
        {rows.length === 0 ? (
          <Empty icon={Inbox} title={data.loading ? 'Memuat…' : `Belum ada ${cfg.singular}`}
            text={data.loading ? null : 'Tambahkan data baru, atau ubah pencarian dan filter.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr>{cfg.columns.map((c) => <th key={c.key} className={c.money ? 'money' : ''}>{c.label}</th>)}<th className="w-24" /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {cfg.columns.map((c) => (
                      <td key={c.key} className={c.money ? 'money' : c.key === 'kode' ? 'text-muted num text-xs' : c.num ? 'num' : c.strong ? 'font-semibold' : ''}>
                        {c.render ? c.render(r) : c.badge ? (r[c.key] ? <Badge>{r[c.key]}</Badge> : '') : c.money ? rupiah(r[c.key]) : r[c.key]}
                      </td>
                    ))}
                    <td className="text-right whitespace-nowrap">
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
      {cfg.importable && <ImportSantri open={importOpen} onClose={() => setImportOpen(false)} />}
    </>
  );
}
