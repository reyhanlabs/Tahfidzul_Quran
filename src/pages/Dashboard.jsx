import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from 'recharts';
import { HandCoins, ReceiptText, ArrowUpFromLine } from 'lucide-react';
import { db } from '../lib/firebase';
import { COL, useLiveQuery, kasRange, totalPiutang } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { saldoPerRekening } from '../lib/db';
import { DatabaseBackup, CalendarPlus } from 'lucide-react';
import { todayISO } from '../lib/format';
import { BULAN, BULAN_SINGKAT, rupiah, rupiahRingkas, periodeKey, awalBulan, akhirBulan, isoOf } from '../lib/format';
import { Panel, Button, Select, Input, cx } from '../components/ui';
import Pattern from '../components/Pattern';
import { useSaldoAwal } from './BukuKas';

const n0 = new Date();
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #dfe4dd', fontSize: 12 }, formatter: (v) => rupiah(v) };

export default function Dashboard() {
  const { santri, ustadz, kewajiban, rekening, settings } = useData();
  const { isAdmin } = useAuth();
  const { profile } = useAuth();
  const nav = useNavigate();
  const [bulan, setBulan] = useState(n0.getMonth() + 1);
  const [tahun, setTahun] = useState(n0.getFullYear());
  const start = awalBulan(tahun, bulan), end = akhirBulan(tahun, bulan);

  const kasTahun = useLiveQuery(() => kasRange(isoOf(tahun, 1, 1), isoOf(tahun, 12, 31)), [tahun]);
  const tagihan = useLiveQuery(() => query(collection(db, COL.tagihan), where('periodeKey', '==', periodeKey(bulan, tahun))), [bulan, tahun]);
  const saldoAwal = useSaldoAwal(start, [kasTahun.data.length]);
  const [piutang, setPiutang] = useState(null);
  useEffect(() => { totalPiutang().then(setPiutang).catch(() => setPiutang(null)); }, [tagihan.data]);

  const bulanIni = kasTahun.data.filter((k) => k.tanggal >= start && k.tanggal <= end);
  const masuk = bulanIni.reduce((a, k) => a + (k.masuk || 0), 0);
  const keluar = bulanIni.reduce((a, k) => a + (k.keluar || 0), 0);
  const saldo = saldoAwal == null ? null : saldoAwal + masuk - keluar;

  const perBulan = useMemo(() => BULAN_SINGKAT.map((b, i) => {
    const pre = `${tahun}-${String(i + 1).padStart(2, '0')}`;
    const list = kasTahun.data.filter((k) => k.tanggal.startsWith(pre));
    return { bulan: b, Pemasukan: list.reduce((a, k) => a + (k.masuk || 0), 0), Pengeluaran: list.reduce((a, k) => a + (k.keluar || 0), 0) };
  }), [kasTahun.data, tahun]);

  const group = (list, key, val) => Object.entries(list.reduce((m, k) => { m[k[key]] = (m[k[key]] || 0) + (k[val] || 0); return m; }, {}))
    .map(([nama, total]) => ({ nama, total })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  const perKewajiban = group(bulanIni.filter((k) => k.sumber === 'pembayaran'), 'kewajiban', 'masuk');
  const perKategori = group(bulanIni.filter((k) => k.keluar > 0), 'kategori', 'keluar');

  const t = tagihan.data;
  const totTagihan = t.reduce((a, x) => a + x.nominal, 0);
  const totDibayar = t.reduce((a, x) => a + x.dibayar, 0);
  const perSantri = Object.values(t.reduce((m, x) => {
    const s = m[x.santriId] || (m[x.santriId] = { id: x.santriId, nama: x.santriNama, kelas: x.kelas, nominal: 0, dibayar: 0 });
    s.nominal += x.nominal; s.dibayar += x.dibayar; return m;
  }, {}));
  const st = { lunas: 0, sebagian: 0, belum: 0 };
  perSantri.forEach((s) => { if (s.dibayar >= s.nominal) st.lunas++; else if (s.dibayar > 0) st.sebagian++; else st.belum++; });
  const nSantri = perSantri.length || 1;
  const teratas = perSantri.map((s) => ({ ...s, sisa: s.nominal - s.dibayar })).filter((s) => s.sisa > 0).sort((a, b) => b.sisa - a.sisa).slice(0, 6);

  const aktif = santri.filter((s) => s.status === 'Aktif').length;

  // Saldo per rekening di akhir bulan terpilih
  const [perRek, setPerRek] = useState(null);
  useEffect(() => {
    if (rekening.length < 2) { setPerRek(null); return undefined; }
    let alive = true;
    saldoPerRekening(rekening, '<=', end).then((r) => alive && setPerRek(r)).catch(() => alive && setPerRek(null));
    return () => { alive = false; };
  }, [rekening, end, kasTahun.data.length]);

  // Pengingat: tagihan bulanan belum dibuat & cadangan data
  const bulananBelum = aktif > 0 && !tagihan.loading ? kewajiban.filter((k) => k.status === 'Aktif' && k.periode === 'Bulanan' && !t.some((x) => x.kewajibanId === k.id)) : [];
  const hariCadangan = settings.cadanganTerakhir ? Math.floor((Date.parse(todayISO()) - Date.parse(settings.cadanganTerakhir)) / 864e5) : null;
  const perluCadangan = isAdmin && (hariCadangan == null || hariCadangan > 7);
  const jam = n0.getHours();
  const salam = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{salam}, {profile?.nama?.split(' ')[0]}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Ringkasan {BULAN[bulan - 1]} {tahun}</h1>
        </div>
        <div className="flex gap-2">
          <Select className="w-36" value={bulan} onChange={(e) => setBulan(Number(e.target.value))} options={BULAN.map((b, i) => ({ value: i + 1, label: b }))} />
          <Input type="number" className="w-24" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} />
        </div>
      </div>

      {(bulananBelum.length > 0 || perluCadangan) && (
        <div className="space-y-2">
          {bulananBelum.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brass-500/40 bg-brass-50 px-4 py-3">
              <CalendarPlus className="size-5 text-brass-700 shrink-0" />
              <p className="text-sm flex-1 min-w-48"><b>Tagihan {bulananBelum.map((k) => k.nama).join(', ')} {BULAN[bulan - 1]} {tahun}</b> belum dibuat.</p>
              <Button size="sm" onClick={() => nav(`/tagihan?bulanan=1&bulan=${bulan}&tahun=${tahun}`)}>Buat sekarang</Button>
            </div>
          )}
          {perluCadangan && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
              <DatabaseBackup className="size-5 text-brand-700 shrink-0" />
              <p className="text-sm flex-1 min-w-48">{hariCadangan == null ? 'Belum pernah membuat cadangan data.' : `Cadangan data terakhir ${hariCadangan} hari lalu.`} Sebaiknya unduh cadangan setiap minggu.</p>
              <Button size="sm" variant="secondary" onClick={() => nav('/pengaturan')}>Buat cadangan</Button>
            </div>
          )}
        </div>
      )}

      {/* Saldo kas — elemen utama halaman */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-900 text-white">
        <Pattern className="absolute inset-0 w-full h-full" id="dash-khatam" opacity={0.07} />
        <div className="relative grid md:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_1fr] gap-6 p-6 md:p-8">
          <div>
            <p className="text-sm text-white/60">Saldo kas per {end.split('-')[2]} {BULAN[bulan - 1]}</p>
            <p className={cx('text-4xl xl:text-5xl font-extrabold num tracking-tight mt-2 whitespace-nowrap', saldo != null && saldo < 0 && 'text-red-300')}>{saldo == null ? '…' : rupiah(saldo)}</p>
            <p className="text-sm text-white/60 mt-2 num">Saldo awal bulan {saldoAwal == null ? '…' : rupiah(saldoAwal)}</p>
          </div>
          {[['Pemasukan bulan ini', masuk, 'text-brand-200'], ['Pengeluaran bulan ini', keluar, 'text-red-200'], ['Selisih', masuk - keluar, masuk - keluar < 0 ? 'text-red-200' : 'text-brass-500']].map(([l, v, c]) => (
            <div key={l} className="xl:border-l xl:border-white/10 xl:pl-6 self-end">
              <p className="text-xs text-white/55">{l}</p>
              <p className={cx('text-lg 2xl:text-xl font-bold num mt-1 whitespace-nowrap', c)}>{rupiah(v)}</p>
            </div>
          ))}
        </div>
        {perRek && (
          <div className="relative border-t border-white/10 px-6 md:px-8 py-3 flex flex-wrap gap-x-8 gap-y-1">
            {perRek.map((r) => (
              <p key={r.id} className="text-sm"><span className="text-white/55">{r.nama}</span> <b className={cx('num', r.saldo < 0 && 'text-red-300')}>{rupiah(r.saldo)}</b></p>
            ))}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-3 gap-5">
        <Panel title="Tagihan santri bulan ini" action={<Link to="/tagihan" className="text-xs font-semibold text-brand-700 hover:underline whitespace-nowrap">Lihat tagihan</Link>}>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted font-semibold">Total tagihan</p><p className="text-lg font-bold num">{rupiah(totTagihan)}</p></div>
            <div><p className="text-xs text-muted font-semibold">Sudah dibayar</p><p className="text-lg font-bold num text-brand-700">{rupiah(totDibayar)}</p></div>
            <div><p className="text-xs text-muted font-semibold">Piutang bulan ini</p><p className="text-lg font-bold num text-rose-ink">{rupiah(totTagihan - totDibayar)}</p></div>
            <div><p className="text-xs text-muted font-semibold">Piutang keseluruhan</p><p className="text-lg font-bold num text-rose-ink">{piutang == null ? '…' : rupiah(piutang)}</p></div>
          </div>
          <div className="mt-5">
            <div className="flex h-3 rounded-full overflow-hidden bg-paper">
              <div className="bg-brand-600" style={{ width: `${(st.lunas / nSantri) * 100}%` }} />
              <div className="bg-brass-500" style={{ width: `${(st.sebagian / nSantri) * 100}%` }} />
              <div className="bg-rose-ink/70" style={{ width: `${(st.belum / nSantri) * 100}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs">
              <span><i className="inline-block size-2 rounded-full bg-brand-600 mr-1.5" />Lunas <b>{st.lunas}</b></span>
              <span><i className="inline-block size-2 rounded-full bg-brass-500 mr-1.5" />Sebagian <b>{st.sebagian}</b></span>
              <span><i className="inline-block size-2 rounded-full bg-rose-ink/70 mr-1.5" />Belum bayar <b>{st.belum}</b></span>
            </div>
            <p className="text-xs text-muted mt-1">Dihitung per santri yang punya tagihan bulan ini ({perSantri.length} santri).</p>
          </div>
        </Panel>

        <Panel title="Belum lunas terbesar" action={<Link to="/laporan/tunggakan" className="text-xs font-semibold text-brand-700 hover:underline whitespace-nowrap">Semua tunggakan</Link>} pad={false}>
          {teratas.length === 0 ? <p className="text-sm text-muted p-4">Tidak ada tunggakan untuk bulan ini.</p> : (
            <ul className="divide-y divide-line">
              {teratas.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{s.nama}</p><p className="text-xs text-muted">{s.kelas}</p></div>
                  <p className="text-sm font-bold num text-rose-ink">{rupiah(s.sisa)}</p>
                  <Link to={`/pembayaran?santri=${s.id}`} className="p-1.5 rounded-md text-brand-700 hover:bg-brand-50" title="Terima pembayaran"><HandCoins className="size-4" /></Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Lembaga">
          <dl className="grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-muted font-semibold">Santri aktif</dt><dd className="text-2xl font-extrabold num">{aktif}</dd></div>
            <div><dt className="text-xs text-muted font-semibold">Total santri</dt><dd className="text-2xl font-extrabold num">{santri.length}</dd></div>
            <div><dt className="text-xs text-muted font-semibold">Nonaktif / lulus</dt><dd className="text-2xl font-extrabold num text-muted">{santri.length - aktif}</dd></div>
            <div><dt className="text-xs text-muted font-semibold">Ustadz aktif</dt><dd className="text-2xl font-extrabold num">{ustadz.filter((u) => u.status === 'Aktif').length}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button size="sm" icon={HandCoins} onClick={() => nav('/pembayaran')}>Terima pembayaran</Button>
            <Button size="sm" variant="secondary" icon={ReceiptText} onClick={() => nav('/tagihan')}>Buat tagihan</Button>
            <Button size="sm" variant="secondary" icon={ArrowUpFromLine} onClick={() => nav('/pengeluaran')}>Catat pengeluaran</Button>
          </div>
        </Panel>
      </div>

      <Panel title={`Pemasukan dan pengeluaran ${tahun}`}>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={perBulan} barGap={2} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="#e8ebe6" />
              <XAxis dataKey="bulan" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={rupiahRingkas} tickLine={false} axisLine={false} fontSize={11} width={56} />
              <Tooltip {...tip} cursor={{ fill: '#eef6f3' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Pemasukan" fill="#176a59" radius={[4, 4, 0, 0]}>
                {perBulan.map((_, i) => <Cell key={i} fillOpacity={i + 1 === bulan ? 1 : 0.55} />)}
              </Bar>
              <Bar dataKey="Pengeluaran" fill="#a8352a" radius={[4, 4, 0, 0]}>
                {perBulan.map((_, i) => <Cell key={i} fillOpacity={i + 1 === bulan ? 1 : 0.45} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-5">
        <HBar title={`Pembayaran santri per jenis — ${BULAN[bulan - 1]}`} data={perKewajiban} color="#176a59" empty="Belum ada pembayaran bulan ini." />
        <HBar title={`Pengeluaran per kategori — ${BULAN[bulan - 1]}`} data={perKategori} color="#a8352a" empty="Belum ada pengeluaran bulan ini." />
      </div>
    </div>
  );
}

function HBar({ title, data, color, empty }) {
  return (
    <Panel title={title}>
      {data.length === 0 ? <p className="text-sm text-muted py-10 text-center">{empty}</p> : (
        <div style={{ height: Math.max(160, data.length * 38 + 20) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 64 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nama" width={140} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip {...tip} cursor={{ fill: '#f4f6f3' }} />
              <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 11, formatter: rupiahRingkas }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}
