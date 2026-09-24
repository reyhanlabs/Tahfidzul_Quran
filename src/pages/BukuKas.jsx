import { useEffect, useMemo, useState } from 'react';
import { Printer, Download, BookOpen, ArrowLeftRight, Pencil, Trash2, Lock } from 'lucide-react';
import { useLiveQuery, kasRange, totalKas, saldoPerRekening } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { saveMutasi, deleteKasManual } from '../lib/ops';
import { namaRekening, terkunci } from '../lib/konteks';
import { rupiah, tanggal, awalBulan, akhirBulan, norm, todayISO } from '../lib/format';
import { downloadExcel } from '../lib/excel';
import { Button, Field, Input, Select, MoneyInput, Modal, PageHeader, Panel, Empty, Toolbar, Stat, SearchBox, useAction, useToast, cx } from '../components/ui';
import { RangePicker } from '../components/Periode';
import { Kop, TandaTangan } from '../components/Kop';

export const SUMBER = { pembayaran: 'Pembayaran santri', gaji: 'Gaji/honor', pengeluaran: 'Pengeluaran', pemasukan: 'Pemasukan lain', mutasi: 'Pindah dana' };
export const urutKas = (a, b) => a.tanggal.localeCompare(b.tanggal) || (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0) || String(a.no).localeCompare(String(b.no));

/** Saldo awal (seluruh rekening) sebelum tanggal `dari`. */
export function useSaldoAwal(dari, deps = []) {
  const { settings } = useData();
  const [v, setV] = useState(null);
  useEffect(() => {
    let alive = true; setV(null);
    totalKas('<', dari).then((t) => alive && setV((Number(settings.saldoAwal) || 0) + t.masuk - t.keluar)).catch(() => alive && setV(Number(settings.saldoAwal) || 0));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dari, settings.saldoAwal, ...deps]);
  return v;
}

/** Pengaruh satu catatan kas terhadap sebuah rekening (atau total bila rek kosong). */
export function efek(k, rek, def = 'tunai') {
  if (k.sumber === 'mutasi') {
    if (!rek) return { masuk: 0, keluar: 0 };
    return { masuk: k.ke === rek ? k.nominal : 0, keluar: k.dari === rek ? k.nominal : 0 };
  }
  if (rek && (k.rekening || def) !== rek) return { masuk: 0, keluar: 0 };
  return { masuk: k.masuk || 0, keluar: k.keluar || 0 };
}

export default function BukuKas() {
  const { rekening } = useData();
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run, busy] = useAction();
  const n = new Date();
  const [dari, setDari] = useState(awalBulan(n.getFullYear(), n.getMonth() + 1));
  const [sampai, setSampai] = useState(akhirBulan(n.getFullYear(), n.getMonth() + 1));
  const [rek, setRek] = useState('');
  const [sumber, setSumber] = useState(''); const [q, setQ] = useState('');
  const [mutasi, setMutasi] = useState(null);
  const { data, loading } = useLiveQuery(() => kasRange(dari, sampai), [dari, sampai]);
  const saldoAwalTotal = useSaldoAwal(dari, [data.length]);

  // Saldo awal per rekening (dipakai saat satu rekening dipilih)
  const [awalRek, setAwalRek] = useState(null);
  useEffect(() => {
    if (!rek) { setAwalRek(null); return undefined; }
    let alive = true; setAwalRek(null);
    const r = rekening.find((x) => x.id === rek);
    saldoPerRekening([r], '<', dari).then(([x]) => alive && setAwalRek(x.saldo)).catch(() => alive && setAwalRek(null));
    return () => { alive = false; };
  }, [rek, dari, data.length, rekening]);
  const saldoAwal = rek ? awalRek : saldoAwalTotal;

  const rows = useMemo(() => {
    let s = saldoAwal || 0;
    return [...data].sort(urutKas)
      .filter((k) => {
        if (!rek) return true;
        if (k.sumber === 'mutasi') return k.dari === rek || k.ke === rek;
        return (k.rekening || rekening[0]?.id) === rek;
      })
      .map((k) => { const e = efek(k, rek, rekening[0]?.id); s += e.masuk - e.keluar; return { ...k, ...e, saldo: s }; });
  }, [data, saldoAwal, rek, rekening]);
  const shown = rows.filter((k) => (!sumber || k.sumber === sumber) && (!q || [k.no, k.keterangan, k.kategori].some((x) => norm(x).includes(norm(q)))));
  const masuk = rows.reduce((a, k) => a + k.masuk, 0);
  const keluar = rows.reduce((a, k) => a + k.keluar, 0);
  const akhir = (saldoAwal || 0) + masuk - keluar;
  const judulRek = rek ? namaRekening(rek) : 'Semua rekening';

  const hapusMutasi = async (k) => {
    if (!await confirm({ title: `Hapus ${k.no}?`, text: `Pindah dana ${rupiah(k.nominal)} dari ${namaRekening(k.dari)} ke ${namaRekening(k.ke)}.`, ok: 'Hapus', danger: true })) return;
    run(() => deleteKasManual(k), 'Catatan pindah dana dihapus.');
  };

  return (
    <>
      <PageHeader help="bukukas" title="Buku kas" description="Tersusun otomatis dari pembayaran santri, gaji, pengeluaran, pemasukan lain, dan pindah dana antar rekening."
        actions={<>
          {rekening.length > 1 && <Button variant="secondary" icon={ArrowLeftRight} onClick={() => setMutasi({ id: null, v: { tanggal: todayISO(), dari: rekening[0].id, ke: rekening[1].id, nominal: '', keterangan: '' } })}>Pindah dana</Button>}
          <Button variant="secondary" icon={Download} disabled={!rows.length} onClick={() => downloadExcel(`buku-kas-${rek || 'semua'}-${dari}-${sampai}.xlsx`,
            ['Tanggal', 'No', 'Jenis', 'Kategori', 'Keterangan', 'Rekening', 'Masuk', 'Keluar', 'Saldo'],
            [['', '', '', '', 'Saldo awal', judulRek, '', '', saldoAwal], ...rows.map((k) => [k.tanggal, k.no, SUMBER[k.sumber], k.kategori, k.keterangan,
              k.sumber === 'mutasi' ? `${namaRekening(k.dari)} → ${namaRekening(k.ke)}` : namaRekening(k.rekening), k.masuk, k.keluar, k.saldo])])}>Ekspor Excel</Button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Cetak</Button>
        </>} />
      <style>{'@page { size: A4 landscape; margin: 12mm; }'}</style>
      <Kop judul="Buku kas umum" sub={`${judulRek} · Periode ${tanggal(dari, true)} s.d. ${tanggal(sampai, true)}`} />
      <Toolbar>
        <RangePicker dari={dari} sampai={sampai} onChange={(a, b) => { setDari(a); setSampai(b); }} />
        {rekening.length > 1 && <Field label="Rekening"><Select value={rek} placeholder="Semua rekening" options={rekening.map((r) => ({ value: r.id, label: r.nama }))} onChange={(e) => setRek(e.target.value)} /></Field>}
        <Field label="Jenis"><Select value={sumber} placeholder="Semua transaksi" options={Object.entries(SUMBER).map(([value, label]) => ({ value, label }))} onChange={(e) => setSumber(e.target.value)} /></Field>
        <SearchBox value={q} onChange={setQ} className="w-full sm:w-56" />
      </Toolbar>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border border-line rounded-xl overflow-hidden mb-4 print-area">
        <div className="bg-white p-4"><Stat label="Saldo awal" value={saldoAwal == null ? '…' : rupiah(saldoAwal)} sub={judulRek} /></div>
        <div className="bg-white p-4"><Stat label="Kas masuk" value={rupiah(masuk)} tone="brand" /></div>
        <div className="bg-white p-4"><Stat label="Kas keluar" value={rupiah(keluar)} tone="rose" /></div>
        <div className="bg-white p-4"><Stat label="Saldo akhir" value={saldoAwal == null ? '…' : rupiah(akhir)} tone={akhir < 0 ? 'rose' : 'ink'} /></div>
      </div>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>Tanggal</th><th>No.</th><th>Kategori</th><th>Keterangan</th><th className="money">Masuk</th><th className="money">Keluar</th><th className="money">Saldo</th><th className="no-print" /></tr></thead>
              <tbody>
                <tr className="bg-brand-50/50"><td colSpan={6} className="font-semibold">Saldo awal per {tanggal(dari, true)}</td><td className="money font-semibold">{saldoAwal == null ? '…' : rupiah(saldoAwal)}</td><td className="no-print" /></tr>
                {shown.length === 0 && <tr><td colSpan={8}><Empty icon={BookOpen} title="Tidak ada transaksi kas pada rentang ini" /></td></tr>}
                {shown.map((k) => (
                  <tr key={k.id}>
                    <td className="whitespace-nowrap">{tanggal(k.tanggal)}</td>
                    <td className="text-xs text-muted num whitespace-nowrap">{k.no}</td>
                    <td><p className="font-semibold">{k.kategori}</p><p className="text-[11px] text-muted">{SUMBER[k.sumber]}{k.sumber !== 'mutasi' && rekening.length > 1 && !rek ? ` · ${namaRekening(k.rekening)}` : ''}</p></td>
                    <td className="max-w-md">
                      {k.sumber === 'mutasi'
                        ? <><span className="font-semibold">{namaRekening(k.dari)} → {namaRekening(k.ke)}</span>{!rek && <span className="text-muted num"> · {rupiah(k.nominal)}</span>}{k.keterangan && <p className="text-xs text-muted">{k.keterangan}</p>}</>
                        : k.keterangan}
                    </td>
                    <td className="money text-brand-700">{k.masuk ? rupiah(k.masuk) : ''}</td>
                    <td className="money text-rose-ink">{k.keluar ? rupiah(k.keluar) : ''}</td>
                    <td className={cx('money font-semibold', k.saldo < 0 && 'text-rose-ink')}>{sumber || q ? '' : rupiah(k.saldo)}</td>
                    <td className="no-print text-right whitespace-nowrap">
                      {k.sumber === 'mutasi' && (terkunci(k.tanggal) ? <Lock className="size-4 text-muted inline" /> : <>
                        <button title="Ubah" onClick={() => setMutasi({ id: k.id, lama: k, v: { ...k } })} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Pencil className="size-4" /></button>
                        {isAdmin && <button title="Hapus" onClick={() => hapusMutasi(k)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>}
                      </>)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4}>Jumlah</td><td className="money">{rupiah(masuk)}</td><td className="money">{rupiah(keluar)}</td><td className="money">{saldoAwal == null ? '' : rupiah(akhir)}</td><td className="no-print" /></tr></tfoot>
            </table>
          </div>
        )}
      </Panel>
      {(sumber || q) && <p className="text-xs text-muted mt-2 no-print">Kolom saldo disembunyikan saat filter aktif agar tidak menyesatkan.</p>}
      {!rek && rekening.length > 1 && <p className="text-xs text-muted mt-2 no-print">Pindah dana antar rekening tidak mengubah saldo total, jadi tidak dihitung sebagai masuk/keluar di tampilan semua rekening. Pilih satu rekening untuk melihat mutasinya.</p>}
      <TandaTangan />

      <Modal open={!!mutasi} onClose={() => setMutasi(null)} title={mutasi?.id ? `Ubah ${mutasi.lama.no}` : 'Pindah dana antar rekening'}
        subtitle="Contoh: setor uang tunai ke bank, atau tarik tunai dari bank."
        footer={<><Button variant="secondary" onClick={() => setMutasi(null)}>Batal</Button>
          <Button loading={busy} onClick={() => run(async () => { await saveMutasi(mutasi.v, mutasi.id, mutasi.lama); setMutasi(null); }, 'Pindah dana dicatat.')}>Simpan</Button></>}>
        {mutasi && <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Dari rekening"><Select value={mutasi.v.dari} options={rekening.map((r) => ({ value: r.id, label: r.nama }))} onChange={(e) => setMutasi({ ...mutasi, v: { ...mutasi.v, dari: e.target.value } })} /></Field>
          <Field label="Ke rekening"><Select value={mutasi.v.ke} options={rekening.map((r) => ({ value: r.id, label: r.nama }))} onChange={(e) => setMutasi({ ...mutasi, v: { ...mutasi.v, ke: e.target.value } })} /></Field>
          <Field label="Tanggal"><Input type="date" value={mutasi.v.tanggal} onChange={(e) => setMutasi({ ...mutasi, v: { ...mutasi.v, tanggal: e.target.value } })} /></Field>
          <Field label="Nominal"><MoneyInput value={mutasi.v.nominal} onChange={(v) => setMutasi({ ...mutasi, v: { ...mutasi.v, nominal: v } })} /></Field>
          <Field label="Keterangan" className="sm:col-span-2"><Input value={mutasi.v.keterangan} placeholder="Contoh: setor syahriyah ke BSI" onChange={(e) => setMutasi({ ...mutasi, v: { ...mutasi.v, keterangan: e.target.value } })} /></Field>
        </div>}
      </Modal>
    </>
  );
}
