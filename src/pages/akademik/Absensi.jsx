import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Download, CheckCheck } from 'lucide-react';
import { useData } from '../../lib/data';
import { ambilAbsensi, simpanAbsensi, rekapAbsensi, STATUS_HADIR } from '../../lib/akademik';
import { perbaruiPortalBanyak } from '../../lib/portal';
import { BULAN, periodeKey, todayISO, tanggal } from '../../lib/format';
import { downloadExcel } from '../../lib/excel';
import { Button, Field, Input, Select, PageHeader, Panel, Empty, Toolbar, useAction, cx } from '../../components/ui';

const WARNA = {
  H: 'bg-brand-600 text-white border-brand-600', I: 'bg-sky-600 text-white border-sky-600',
  S: 'bg-brass-500 text-white border-brass-500', A: 'bg-rose-ink text-white border-rose-ink',
};

export default function Absensi() {
  const [tab, setTab] = useState('isi');
  return (
    <>
      <PageHeader help="absensi" title="Absensi" description="Catat kehadiran santri per kelas dan kehadiran ustadz. Kehadiran ustadz bisa dipakai untuk menghitung honor per kehadiran.">
        <div className="inline-flex p-1 bg-white rounded-lg border border-line no-print">
          {[['isi', 'Isi absensi'], ['rekap', 'Rekap bulanan']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={cx('px-4 h-9 rounded-md text-sm font-semibold', tab === v ? 'bg-brand-700 text-white' : 'text-muted hover:text-ink')}>{l}</button>
          ))}
        </div>
      </PageHeader>
      {tab === 'isi' ? <Isi /> : <Rekap />}
    </>
  );
}

function useOrang(jenis, grup) {
  const { santri, ustadz } = useData();
  return useMemo(() => (jenis === 'ustadz'
    ? ustadz.filter((u) => u.status === 'Aktif')
    : santri.filter((s) => s.status === 'Aktif' && s.kelas === grup)), [jenis, grup, santri, ustadz]);
}

function Isi() {
  const { kelas } = useData();
  const [run, busy] = useAction();
  const [tgl, setTgl] = useState(todayISO());
  const [jenis, setJenis] = useState('santri');
  const [grup, setGrup] = useState('');
  const [data, setData] = useState(null);
  const [sudahAda, setSudahAda] = useState(false);
  const orang = useOrang(jenis, grup);
  const g = jenis === 'ustadz' ? 'ustadz' : grup;

  useEffect(() => { if (!grup && kelas[0]) setGrup(kelas[0].nama); }, [kelas, grup]);
  useEffect(() => {
    if (!g) return undefined;
    let alive = true; setData(null);
    ambilAbsensi(tgl, jenis, g).then((d) => { if (!alive) return; setSudahAda(!!d); setData(d?.data || {}); }).catch(() => alive && setData({}));
    return () => { alive = false; };
  }, [tgl, jenis, g]);

  const nilai = (id) => data?.[id] || 'H';
  const hitung = orang.reduce((a, o) => { a[nilai(o.id)] += 1; return a; }, { H: 0, I: 0, S: 0, A: 0 });
  const simpan = () => run(async () => {
    await simpanAbsensi(tgl, jenis, g, Object.fromEntries(orang.map((o) => [o.id, nilai(o.id)])));
    setSudahAda(true);
    if (jenis === 'santri') perbaruiPortalBanyak(orang);
  }, 'Absensi disimpan.');

  return (
    <>
      <Toolbar>
        <Field label="Tanggal"><Input type="date" value={tgl} onChange={(e) => setTgl(e.target.value || todayISO())} /></Field>
        <Field label="Untuk"><Select value={jenis} options={[{ value: 'santri', label: 'Santri' }, { value: 'ustadz', label: 'Ustadz/ustadzah' }]} onChange={(e) => setJenis(e.target.value)} /></Field>
        {jenis === 'santri' && <Field label="Kelas"><Select value={grup} options={kelas.map((k) => k.nama)} onChange={(e) => setGrup(e.target.value)} /></Field>}
      </Toolbar>
      <Panel pad={false} title={<span>{jenis === 'ustadz' ? 'Ustadz/ustadzah' : grup} · {tanggal(tgl, true)} {sudahAda && <span className="ml-2 text-xs font-semibold text-brand-700">tersimpan</span>}</span>}
        action={orang.length > 0 && <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => setData(Object.fromEntries(orang.map((o) => [o.id, 'H'])))}>Semua hadir</Button>}>
        {data == null ? <Empty title="Memuat…" /> : orang.length === 0 ? <Empty icon={CalendarCheck} title="Tidak ada orang aktif di daftar ini" /> : (
          <ul className="divide-y divide-line">
            {orang.map((o) => (
              <li key={o.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-2.5">
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{o.nama}</p><p className="text-xs text-muted">{o.kode}</p></div>
                <div className="flex gap-1.5" role="radiogroup" aria-label={`Kehadiran ${o.nama}`}>
                  {Object.entries(STATUS_HADIR).map(([k, label]) => (
                    <button key={k} type="button" role="radio" aria-checked={nilai(o.id) === k} title={label}
                      onClick={() => setData({ ...data, [o.id]: k })}
                      className={cx('size-9 rounded-lg border text-sm font-bold transition-colors', nilai(o.id) === k ? WARNA[k] : 'bg-white border-line text-muted hover:border-brand-200')}>{k}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {orang.length > 0 && data != null && (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <p className="text-sm text-muted">Hadir <b className="text-ink">{hitung.H}</b> · Izin <b className="text-ink">{hitung.I}</b> · Sakit <b className="text-ink">{hitung.S}</b> · Alpa <b className="text-ink">{hitung.A}</b></p>
          <Button loading={busy} onClick={simpan}>{sudahAda ? 'Simpan perubahan' : 'Simpan absensi'}</Button>
        </div>
      )}
    </>
  );
}

function Rekap() {
  const { kelas } = useData();
  const n = new Date();
  const [bulan, setBulan] = useState(n.getMonth() + 1);
  const [tahun, setTahun] = useState(n.getFullYear());
  const [jenis, setJenis] = useState('santri');
  const [grup, setGrup] = useState('');
  const [rekap, setRekap] = useState(null);
  const orang = useOrang(jenis, grup);
  useEffect(() => { if (!grup && kelas[0]) setGrup(kelas[0].nama); }, [kelas, grup]);
  useEffect(() => {
    let alive = true; setRekap(null);
    rekapAbsensi(periodeKey(bulan, tahun), jenis, jenis === 'ustadz' ? 'ustadz' : grup).then((r) => alive && setRekap(r)).catch(() => alive && setRekap({}));
    return () => { alive = false; };
  }, [bulan, tahun, jenis, grup]);

  const rows = orang.map((o) => {
    const r = rekap?.[o.id] || { H: 0, I: 0, S: 0, A: 0, hari: 0 };
    return { o, r, persen: r.hari ? Math.round((r.H / r.hari) * 100) : null };
  });

  return (
    <>
      <Toolbar>
        <Field label="Bulan"><Select value={bulan} options={BULAN.map((b, i) => ({ value: i + 1, label: b }))} onChange={(e) => setBulan(Number(e.target.value))} /></Field>
        <Field label="Tahun"><Input type="number" className="w-24" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} /></Field>
        <Field label="Untuk"><Select value={jenis} options={[{ value: 'santri', label: 'Santri' }, { value: 'ustadz', label: 'Ustadz/ustadzah' }]} onChange={(e) => setJenis(e.target.value)} /></Field>
        {jenis === 'santri' && <Field label="Kelas"><Select value={grup} options={kelas.map((k) => k.nama)} onChange={(e) => setGrup(e.target.value)} /></Field>}
        <Button variant="secondary" className="ml-auto" icon={Download} disabled={!rows.length} onClick={() => downloadExcel(`absensi-${jenis}-${jenis === 'ustadz' ? '' : `${grup}-`}${tahun}-${bulan}.xlsx`,
          ['ID', 'Nama', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Hari tercatat', '% hadir'], rows.map(({ o, r, persen }) => [o.kode, o.nama, r.H, r.I, r.S, r.A, r.hari, persen ?? '']))}>Ekspor Excel</Button>
      </Toolbar>
      <Panel pad={false}>
        {rekap == null ? <Empty title="Memuat…" /> : rows.length === 0 ? <Empty icon={CalendarCheck} title="Tidak ada data" /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>Nama</th><th className="money">Hadir</th><th className="money">Izin</th><th className="money">Sakit</th><th className="money">Alpa</th><th className="money">Hari</th><th className="money">% hadir</th></tr></thead>
              <tbody>
                {rows.map(({ o, r, persen }) => (
                  <tr key={o.id}>
                    <td><p className="font-semibold">{o.nama}</p><p className="text-xs text-muted">{o.kode}</p></td>
                    <td className="money">{r.H}</td><td className="money">{r.I}</td><td className="money">{r.S}</td>
                    <td className={cx('money', r.A > 0 && 'text-rose-ink font-semibold')}>{r.A}</td>
                    <td className="money text-muted">{r.hari}</td>
                    <td className="money font-semibold">{persen == null ? '–' : `${persen}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
