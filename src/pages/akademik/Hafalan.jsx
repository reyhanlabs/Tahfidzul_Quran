import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Plus, Pencil, Trash2, BookOpenCheck, Download } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useLiveQuery } from '../../lib/db';
import { useData } from '../../lib/data';
import { useAuth } from '../../lib/auth';
import { simpanSetoran, hapusSetoran } from '../../lib/akademik';
import { SURAH, NILAI, namaSurah, jumlahAyat, JUZ_JUMLAH, TOTAL_AYAT } from '../../lib/quran';
import { tanggal, todayISO, norm } from '../../lib/format';
import { downloadExcel } from '../../lib/excel';
import {
  Button, Field, Input, Select, Textarea, Modal, Badge, PageHeader, Panel, Empty, Toolbar, SearchBox, useAction, useToast, cx,
} from '../../components/ui';
import SantriPicker from '../../components/SantriPicker';
import JuzGrid from '../../components/JuzGrid';
export { JuzGrid };

const NILAI_WARNA = { Mumtaz: 'LUNAS', 'Jayyid Jiddan': 'LUNAS', Jayyid: 'SEBAGIAN', Maqbul: 'SEBAGIAN', Ulang: 'BELUM BAYAR' };
const opsiSurah = SURAH.map(([nama, n], i) => ({ value: i + 1, label: `${i + 1}. ${nama} (${n})` }));

export default function Hafalan() {
  const [tab, setTab] = useState('setoran');
  return (
    <>
      <PageHeader help="hafalan" title="Setoran hafalan" description="Catat setoran ziyadah (hafalan baru) dan muraja'ah santri. Progres juz dihitung otomatis dari setoran ziyadah yang lulus.">
        <div className="inline-flex p-1 bg-white rounded-lg border border-line no-print">
          {[['setoran', 'Setoran harian'], ['progres', 'Progres santri']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={cx('px-4 h-9 rounded-md text-sm font-semibold', tab === v ? 'bg-brand-700 text-white' : 'text-muted hover:text-ink')}>{l}</button>
          ))}
        </div>
      </PageHeader>
      {tab === 'setoran' ? <Setoran /> : <Progres />}
    </>
  );
}

function Setoran() {
  const { kelas, santriMap } = useData();
  const { isAdmin } = useAuth();
  const { confirm } = useToast();
  const [run] = useAction();
  const [tgl, setTgl] = useState(todayISO());
  const [fKelas, setFKelas] = useState('');
  const [edit, setEdit] = useState(null);
  const { data, loading } = useLiveQuery(() => query(collection(db, 'hafalan'), where('tanggal', '==', tgl)), [tgl]);
  const rows = useMemo(() => data.filter((h) => !fKelas || h.kelas === fKelas)
    .sort((a, b) => a.santriNama.localeCompare(b.santriNama) || (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)), [data, fKelas]);

  const hapus = async (h) => {
    if (!await confirm({ title: 'Hapus setoran?', text: `${h.santriNama}: ${namaSurah(h.surat)} ${h.ayatDari}–${h.ayatSampai}`, ok: 'Hapus', danger: true })) return;
    run(() => hapusSetoran(h, santriMap[h.santriId]), 'Setoran dihapus.');
  };

  return (
    <>
      <Toolbar>
        <Field label="Tanggal"><Input type="date" value={tgl} onChange={(e) => setTgl(e.target.value || todayISO())} /></Field>
        <Field label="Kelas / halaqah"><Select value={fKelas} placeholder="Semua kelas" options={kelas.map((k) => k.nama)} onChange={(e) => setFKelas(e.target.value)} /></Field>
        <Button className="ml-auto" icon={Plus} onClick={() => setEdit({ id: null, v: { tanggal: tgl, jenis: 'Ziyadah', nilai: 'Jayyid', santriId: '', surat: '', ayatDari: '', ayatSampai: '', penyimakId: '', catatan: '' } })}>Catat setoran</Button>
      </Toolbar>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? (
          <Empty icon={BookOpenCheck} title={`Belum ada setoran ${tanggal(tgl, true)}`} text="Klik Catat setoran untuk mencatat hafalan santri." />
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>Santri</th><th>Jenis</th><th>Surat & ayat</th><th className="money">Ayat</th><th>Nilai</th><th>Penyimak</th><th /></tr></thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td><p className="font-semibold">{h.santriNama}</p><p className="text-xs text-muted">{h.kelas}</p></td>
                    <td>{h.jenis}</td>
                    <td><p className="font-semibold">{namaSurah(h.surat)}</p><p className="text-xs text-muted num">ayat {h.ayatDari}–{h.ayatSampai}</p>{h.catatan && <p className="text-xs text-muted">{h.catatan}</p>}</td>
                    <td className="money">{h.jumlahAyat}</td>
                    <td><Badge tone={NILAI_WARNA[h.nilai]}>{h.nilai}</Badge></td>
                    <td className="text-sm">{h.penyimakNama}</td>
                    <td className="text-right whitespace-nowrap">
                      <button title="Ubah" onClick={() => setEdit({ id: h.id, v: { ...h } })} className="p-1.5 rounded-md text-muted hover:text-brand-700 hover:bg-brand-50"><Pencil className="size-4" /></button>
                      {isAdmin && <button title="Hapus" onClick={() => hapus(h)} className="p-1.5 rounded-md text-muted hover:text-rose-ink hover:bg-rose-ink/5"><Trash2 className="size-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <FormSetoran edit={edit} onClose={() => setEdit(null)} />
    </>
  );
}

function FormSetoran({ edit, onClose }) {
  const { santriMap, ustadz } = useData();
  const [run, busy] = useAction();
  const [v, setV] = useState(null);
  const [ringkas, setRingkas] = useState(null);
  useEffect(() => { setV(edit ? { ...edit.v } : null); }, [edit]);

  // Saran: lanjutkan dari ziyadah terakhir santri
  const { data: rk } = useLiveQuery(() => (v?.santriId ? query(collection(db, 'hafalanRingkas'), where('santriId', '==', v.santriId)) : null), [v?.santriId]);
  useEffect(() => { setRingkas(rk[0] || null); }, [rk]);
  useEffect(() => {
    if (!v || edit?.id || v.jenis !== 'Ziyadah' || v.surat || !ringkas?.terakhir) return;
    const { surat, ayat } = ringkas.terakhir;
    if (ayat < jumlahAyat(surat)) setV((x) => ({ ...x, surat, ayatDari: ayat + 1, ayatSampai: Math.min(jumlahAyat(surat), ayat + 5) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringkas, v?.santriId]);

  if (!v || !edit) return null;
  const maks = jumlahAyat(Number(v.surat));
  const set = (k, x) => setV({ ...v, [k]: x });
  const simpan = () => run(async () => {
    await simpanSetoran({ ...v, santri: santriMap[v.santriId], penyimak: ustadz.find((u) => u.id === v.penyimakId) }, edit.id);
    onClose();
  }, 'Setoran disimpan.');

  return (
    <Modal open onClose={onClose} title={edit.id ? 'Ubah setoran' : 'Catat setoran hafalan'} width="max-w-xl"
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button loading={busy} disabled={!v.santriId || !v.surat || !v.ayatDari || !v.ayatSampai} onClick={simpan}>Simpan</Button></>}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Santri" required className="sm:col-span-2"><SantriPicker value={v.santriId} onChange={(id) => setV({ ...v, santriId: id, surat: edit.id ? v.surat : '', ayatDari: edit.id ? v.ayatDari : '', ayatSampai: edit.id ? v.ayatSampai : '' })} /></Field>
        {ringkas && <p className="sm:col-span-2 -mt-2 text-xs text-muted">Hafalan saat ini: <b className="text-ink">{ringkas.totalAyat} ayat</b> ({Math.round((ringkas.totalAyat / TOTAL_AYAT) * 1000) / 10}% mushaf){ringkas.terakhir && <> · ziyadah terakhir {namaSurah(ringkas.terakhir.surat)} ayat {ringkas.terakhir.ayat}</>}</p>}
        <Field label="Tanggal"><Input type="date" value={v.tanggal} onChange={(e) => set('tanggal', e.target.value)} /></Field>
        <Field label="Jenis"><Select value={v.jenis} options={[{ value: 'Ziyadah', label: 'Ziyadah (hafalan baru)' }, { value: "Muraja'ah", label: "Muraja'ah (mengulang)" }]} onChange={(e) => set('jenis', e.target.value)} /></Field>
        <Field label="Surat" required className="sm:col-span-2"><Select value={v.surat} placeholder="— pilih surat —" options={opsiSurah} onChange={(e) => setV({ ...v, surat: Number(e.target.value), ayatDari: 1, ayatSampai: jumlahAyat(Number(e.target.value)) })} /></Field>
        <Field label="Dari ayat" required hint={maks ? `1–${maks}` : null}><Input type="number" min={1} max={maks} value={v.ayatDari} onChange={(e) => set('ayatDari', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
        <Field label="Sampai ayat" required error={v.ayatSampai && v.ayatDari && (v.ayatSampai < v.ayatDari || v.ayatSampai > maks) ? 'Rentang ayat tidak valid' : null}><Input type="number" min={1} max={maks} value={v.ayatSampai} onChange={(e) => set('ayatSampai', e.target.value === '' ? '' : Number(e.target.value))} /></Field>
        <Field label="Nilai"><Select value={v.nilai} options={NILAI} onChange={(e) => set('nilai', e.target.value)} /></Field>
        <Field label="Penyimak"><Select value={v.penyimakId} placeholder="— pilih —" options={ustadz.filter((u) => u.status === 'Aktif').map((u) => ({ value: u.id, label: u.nama }))} onChange={(e) => set('penyimakId', e.target.value)} /></Field>
        <Field label="Catatan" className="sm:col-span-2"><Textarea rows={2} value={v.catatan} onChange={(e) => set('catatan', e.target.value)} placeholder="Mis. perbaiki makhraj huruf ع" /></Field>
      </div>
      <p className="text-xs text-muted mt-3">Nilai <b>Ulang</b> berarti belum lulus — tidak dihitung sebagai hafalan.</p>
    </Modal>
  );
}

function Progres() {
  const { kelas, santri } = useData();
  const [fKelas, setFKelas] = useState(''); const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const { data, loading } = useLiveQuery(() => collection(db, 'hafalanRingkas'), []);
  const map = Object.fromEntries(data.map((r) => [r.santriId, r]));
  const rows = santri.filter((s) => s.status === 'Aktif' && (!fKelas || s.kelas === fKelas) && (!q || norm(s.nama).includes(norm(q))))
    .map((s) => ({ s, r: map[s.id] })).sort((a, b) => (b.r?.totalAyat || 0) - (a.r?.totalAyat || 0));

  return (
    <>
      <Toolbar>
        <Field label="Kelas / halaqah"><Select value={fKelas} placeholder="Semua kelas" options={kelas.map((k) => k.nama)} onChange={(e) => setFKelas(e.target.value)} /></Field>
        <SearchBox value={q} onChange={setQ} placeholder="Cari santri" className="w-full sm:w-60" />
        <Button variant="secondary" className="ml-auto" icon={Download} disabled={!rows.length} onClick={() => downloadExcel(`progres-hafalan-${todayISO()}.xlsx`,
          ['ID', 'Nama', 'Kelas', 'Total ayat', 'Persen mushaf', 'Juz selesai', ...JUZ_JUMLAH.map((_, i) => `Juz ${i + 1}`), 'Setoran terakhir'],
          rows.map(({ s, r }) => [s.kode, s.nama, s.kelas, r?.totalAyat || 0, Math.round(((r?.totalAyat || 0) / TOTAL_AYAT) * 1000) / 10, r?.juzSelesai || 0, ...JUZ_JUMLAH.map((_, i) => r?.perJuz?.[i] || 0), r?.setoranTerakhir || '']))}>Ekspor Excel</Button>
      </Toolbar>
      <Panel pad={false}>
        {loading ? <Empty title="Memuat…" /> : rows.length === 0 ? <Empty icon={BookOpenCheck} title="Tidak ada santri" /> : (
          <div className="overflow-x-auto">
            <table className="ledger">
              <thead><tr><th>Santri</th><th>Kelas</th><th className="money">Ayat hafal</th><th className="w-56">Progres mushaf</th><th className="money">Juz selesai</th><th>Setoran terakhir</th></tr></thead>
              <tbody>
                {rows.map(({ s, r }) => {
                  const p = ((r?.totalAyat || 0) / TOTAL_AYAT) * 100;
                  return (
                    <tr key={s.id} className="cursor-pointer" onClick={() => setDetail({ s, r })}>
                      <td><p className="font-semibold text-brand-700 hover:underline">{s.nama}</p><p className="text-xs text-muted">{s.kode}</p></td>
                      <td>{s.kelas}</td>
                      <td className="money font-semibold">{r?.totalAyat || 0}</td>
                      <td>
                        <div className="h-2 rounded-full bg-paper border border-line overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${Math.max(p, r?.totalAyat ? 1 : 0)}%` }} /></div>
                        <p className="text-[11px] text-muted mt-0.5 num">{p.toFixed(1).replace('.', ',')}%</p>
                      </td>
                      <td className="money">{r?.juzSelesai || 0}</td>
                      <td>{r?.setoranTerakhir ? tanggal(r.setoranTerakhir) : <span className="text-muted">–</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {detail && <DetailSantri s={detail.s} r={detail.r} onClose={() => setDetail(null)} />}
    </>
  );
}

function DetailSantri({ s, r, onClose }) {
  const { data } = useLiveQuery(() => query(collection(db, 'hafalan'), where('santriId', '==', s.id)), [s.id]);
  const riwayat = [...data].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 40);
  return (
    <Modal open onClose={onClose} title={s.nama} subtitle={`${s.kode} · ${s.kelas || '-'} · ${r?.totalAyat || 0} ayat hafal`} width="max-w-2xl">
      <p className="text-sm font-bold mb-2">Progres per juz</p>
      <JuzGrid perJuz={r?.perJuz} />
      <p className="text-xs text-muted mt-2">Kotak terisi penuh = juz selesai dihafal. Arahkan kursor ke kotak untuk melihat jumlah ayatnya.</p>
      <p className="text-sm font-bold mt-5 mb-2">Riwayat setoran</p>
      {riwayat.length === 0 ? <p className="text-sm text-muted">Belum ada setoran.</p> : (
        <div className="border border-line rounded-lg divide-y divide-line max-h-72 overflow-y-auto">
          {riwayat.map((h, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-24 shrink-0 text-muted">{tanggal(h.tanggal)}</span>
              <span className="flex-1">{h.jenis === 'Ziyadah' ? '' : <span className="text-muted">Muraja'ah · </span>}{namaSurah(h.surat)} <span className="text-muted num">{h.ayatDari}–{h.ayatSampai}</span></span>
              <Badge tone={NILAI_WARNA[h.nilai]}>{h.nilai}</Badge>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
