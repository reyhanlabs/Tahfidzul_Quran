import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import {
  Printer, IdCard, HandCoins, Phone, MapPin, CalendarDays, Users, BookOpenCheck, CalendarCheck, Percent, Receipt,
} from 'lucide-react';
import { pesanKwitansi, pesanTagihan, kirimTeksWA } from '../../lib/share';
import { tautanPortal } from '../../lib/portal';
import { db } from '../../lib/firebase';
import { COL, useLiveQuery, useLiveDoc } from '../../lib/db';
import { useData } from '../../lib/data';
import { useAuth } from '../../lib/auth';
import { rupiah, periodeLabel, periodeKey, tanggal, todayISO, waLink } from '../../lib/format';
import { namaSurah, TOTAL_AYAT } from '../../lib/quran';
import { Button, Field, Badge, PageHeader, Panel, Empty, Toolbar, Tabs, cx } from '../../components/ui';
import SantriPicker from '../../components/SantriPicker';
import { Kop, TandaTangan } from '../../components/Kop';
import PortalPanel from '../../components/PortalPanel';
import WaIcon from '../../components/WaIcon';
import JuzGrid from '../../components/JuzGrid';

const inisial = (nama = '') => nama.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();

function umur(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number); const n = new Date();
  let u = n.getFullYear() - y;
  if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < d)) u -= 1;
  return u >= 0 && u < 100 ? `${u} tahun` : '';
}

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-2.5 min-w-0">
      {Icon && <Icon className="size-4 text-muted shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <div className="text-sm break-words">{children || <span className="text-muted">–</span>}</div>
      </div>
    </div>
  );
}

export default function KartuSantri() {
  const { santriMap, settings, kewajiban } = useData();
  const { boleh } = useAuth();
  const [params, setParams] = useSearchParams();
  const id = params.get('santri') || '';
  const setId = (v) => setParams(v ? { santri: v } : {}, { replace: true });
  const [lihat, setLihat] = useState('belum');
  const s = santriMap[id];
  const akademik = boleh('lihatAkademik');

  const tg = useLiveQuery(() => (id ? query(collection(db, COL.tagihan), where('santriId', '==', id)) : null), [id]);
  const by = useLiveQuery(() => (id ? query(collection(db, COL.pembayaran), where('santriId', '==', id)) : null), [id]);
  const hf = useLiveDoc('hafalanRingkas', akademik ? id : '');
  const now = new Date(); const bulanIni = periodeKey(now.getMonth() + 1, now.getFullYear());
  const ab = useLiveQuery(() => (akademik && s?.kelas
    ? query(collection(db, 'absensi'), where('jenis', '==', 'santri'), where('grup', '==', s.kelas), where('periodeKey', '==', bulanIni))
    : null), [akademik, s?.kelas, bulanIni]);

  const tagihan = useMemo(() => [...tg.data].sort((a, b) => b.periodeKey - a.periodeKey || a.kewajibanNama.localeCompare(b.kewajibanNama)), [tg.data]);
  const bayar = useMemo(() => [...by.data].sort((a, b) => b.tanggal.localeCompare(a.tanggal)), [by.data]);
  const tot = tagihan.reduce((a, t) => ({ n: a.n + t.nominal, d: a.d + t.dibayar, s: a.s + t.sisa, pot: a.pot + (t.potongan || 0) }), { n: 0, d: 0, s: 0, pot: 0 });
  const belum = tagihan.filter((t) => t.sisa > 0);
  const bulanMenunggak = new Set(belum.map((t) => t.periodeKey)).size;
  const persen = tot.n ? Math.round((tot.d / tot.n) * 100) : 0;
  const tampil = lihat === 'belum' ? belum : tagihan;
  const perTahun = useMemo(() => {
    const m = new Map();
    tampil.forEach((t) => { const y = Math.floor(t.periodeKey / 100); if (!m.has(y)) m.set(y, []); m.get(y).push(t); });
    return [...m.entries()];
  }, [tampil]);

  const hadir = useMemo(() => {
    const r = { H: 0, I: 0, S: 0, A: 0, hari: 0 };
    ab.data.forEach((d) => { const st = d.data?.[id]; if (st) { r[st] = (r[st] || 0) + 1; r.hari += 1; } });
    return r;
  }, [ab.data, id]);

  const wali = s && (s.namaWali || [s.namaAyah, s.namaIbu].filter(Boolean).join(' & '));
  const portal = s?.portalToken ? tautanPortal(s.portalToken) : '';
  const keringanan = (s?.keringanan || []).map((k) => ({ ...k, nama: kewajiban.find((x) => x.id === k.kewajibanId)?.nama || '?' }));

  return (
    <>
      <PageHeader help="laporan" title="Kartu santri" description="Profil, ringkasan keuangan, riwayat tagihan & pembayaran, serta perkembangan hafalan satu santri."
        actions={s && <>
          {belum.length > 0 && <Button variant="secondary" icon={WaIcon} onClick={() => kirimTeksWA(s.hp, pesanTagihan(s, belum, settings, { portal }))}>Kirim tagihan</Button>}
          {belum.length > 0 && boleh('terimaBayar') && <Link to={`/pembayaran?santri=${s.id}`}><Button variant="secondary" icon={HandCoins}>Terima pembayaran</Button></Link>}
          <Button icon={Printer} onClick={() => window.print()}>Cetak kartu</Button>
        </>} />
      <Toolbar><Field label="Santri" className="w-full sm:w-96"><SantriPicker value={id} onChange={setId} onlyActive={false} /></Field></Toolbar>
      {!s ? <Panel><Empty icon={IdCard} title="Pilih santri" text="Cari santri untuk menampilkan kartunya. Kartu juga bisa dibuka dari Tagihan atau Tunggakan." /></Panel> : (
        <div data-testid="kartu-santri">
          <style>{'@page { size: A4 portrait; margin: 12mm; }'}</style>
          <Kop judul="Kartu santri" sub={`Per ${tanggal(todayISO(), true)}`} />

          {/* Profil */}
          <section className="rounded-2xl border border-line bg-white overflow-hidden mb-5 break-inside-avoid">
            <div className="relative bg-brand-800 text-white px-5 py-5 sm:px-6 flex flex-wrap items-center gap-4 print:bg-white print:text-ink print:border-b print:border-line">
              <div className="size-16 rounded-2xl bg-white/15 print:bg-brand-50 grid place-items-center text-2xl font-extrabold tracking-tight shrink-0">{inisial(s.nama)}</div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-extrabold leading-tight break-words">{s.nama}</h2>
                <p className="text-sm opacity-80 num">{s.kode}{s.nis && ` · NIS ${s.nis}`}{s.nik && ` · NIK/NISN ${s.nik}`}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="rounded-md bg-white/15 print:bg-paper px-2 py-0.5 text-xs font-semibold">{s.kelas || 'Tanpa kelas'}</span>
                  <span className="rounded-md bg-white/15 print:bg-paper px-2 py-0.5 text-xs font-semibold">Angkatan {s.tahunMasuk || '–'}</span>
                  <span className={cx('rounded-md px-2 py-0.5 text-xs font-semibold', s.status === 'Aktif' ? 'bg-emerald-400/25 print:bg-paper' : 'bg-white/10 print:bg-paper')}>{s.status}</span>
                  {keringanan.length > 0 && <span className="rounded-md bg-brass-500/30 print:bg-paper px-2 py-0.5 text-xs font-semibold">Keringanan</span>}
                </div>
              </div>
              <div className="w-full sm:w-auto sm:text-right border-t border-white/15 pt-3 sm:border-0 sm:pt-0 print:border-0">
                <p className="text-xs opacity-75">Sisa kewajiban</p>
                <p className={cx('text-2xl font-extrabold num', tot.s > 0 ? 'text-amber-200 print:text-rose-ink' : '')}>{rupiah(tot.s)}</p>
                <p className="text-xs opacity-75">{tot.s > 0 ? `${belum.length} tagihan · ${bulanMenunggak} periode` : 'Semua tagihan lunas'}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 p-5 sm:p-6">
              <Info icon={CalendarDays} label="Tempat, tanggal lahir">{(s.tempatLahir || s.tanggalLahir) && <>{[s.tempatLahir, s.tanggalLahir && tanggal(s.tanggalLahir, true)].filter(Boolean).join(', ')}{umur(s.tanggalLahir) && <span className="text-muted"> · {umur(s.tanggalLahir)}</span>}</>}</Info>
              <Info icon={Users} label="Jenis kelamin">{s.jk}</Info>
              <Info icon={Users} label="Orang tua / wali">{wali}{s.namaWali && (s.namaAyah || s.namaIbu) && <p className="text-xs text-muted">Ayah {s.namaAyah || '–'} · Ibu {s.namaIbu || '–'}</p>}</Info>
              <Info icon={Phone} label="No. HP wali">{s.hp && <a href={waLink(s.hp, `Assalamu'alaikum Bapak/Ibu wali ananda ${s.nama}.`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-700 font-semibold hover:underline num">{s.hp}<WaIcon className="size-3.5 no-print" /></a>}</Info>
              <Info icon={MapPin} label="Alamat"><span className="whitespace-pre-line">{s.alamat}</span></Info>
              <Info icon={Percent} label="Keringanan tetap">{keringanan.length > 0 && keringanan.map((k) => <p key={k.kewajibanId}>{k.nama}: <b>{k.tipe === 'persen' ? `${k.nilai}%` : rupiah(k.nilai)}</b>{k.ket && <span className="text-muted"> ({k.ket})</span>}</p>)}</Info>
              {s.keterangan && <Info label="Keterangan"><span className="whitespace-pre-line">{s.keterangan}</span></Info>}
            </div>
          </section>

          {/* Ringkasan keuangan */}
          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6 mb-5 break-inside-avoid">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div><p className="text-xs font-semibold text-muted">Total tagihan</p><p className="text-lg font-extrabold num">{rupiah(tot.n)}</p><p className="text-xs text-muted">{tagihan.length} tagihan{tot.pot > 0 && ` · potongan ${rupiah(tot.pot)}`}</p></div>
              <div><p className="text-xs font-semibold text-muted">Sudah dibayar</p><p className="text-lg font-extrabold num text-brand-700">{rupiah(tot.d)}</p><p className="text-xs text-muted">{bayar.length} kali pembayaran</p></div>
              <div><p className="text-xs font-semibold text-muted">Sisa</p><p className={cx('text-lg font-extrabold num', tot.s > 0 ? 'text-rose-ink' : 'text-ink')}>{rupiah(tot.s)}</p><p className="text-xs text-muted">{bulanMenunggak ? `${bulanMenunggak} periode belum lunas` : 'tidak ada tunggakan'}</p></div>
              <div><p className="text-xs font-semibold text-muted">Pembayaran terakhir</p><p className="text-lg font-extrabold">{bayar[0] ? tanggal(bayar[0].tanggal) : '–'}</p><p className="text-xs text-muted num">{bayar[0] ? `${rupiah(bayar[0].total)} · ${bayar[0].metode}` : 'belum pernah'}</p></div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted mb-1"><span>Kelunasan</span><span className="num font-semibold text-ink">{persen}%</span></div>
              <div className="h-2.5 rounded-full bg-paper border border-line overflow-hidden"><div className="h-full bg-brand-600" style={{ width: `${persen}%` }} /></div>
            </div>
          </section>

          {/* Akademik */}
          {akademik && (
            <section className={cx('grid lg:grid-cols-[1fr_auto] gap-5 mb-5 break-inside-avoid [&>*]:min-w-0', !hf.data && hadir.hari === 0 && 'print:hidden')}>
              <Panel title={<span className="inline-flex items-center gap-2"><BookOpenCheck className="size-4 text-brand-700" />Hafalan</span>}>
                {hf.loading ? <p className="text-sm text-muted">Memuat…</p> : !hf.data ? <p className="text-sm text-muted">Belum ada setoran hafalan.</p> : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
                      <div><p className="text-xs text-muted font-semibold">Juz selesai</p><p className="text-lg font-extrabold num">{hf.data.juzSelesai || 0} <span className="text-sm font-semibold text-muted">/ 30</span></p></div>
                      <div><p className="text-xs text-muted font-semibold">Ayat dihafal</p><p className="text-lg font-extrabold num">{(hf.data.totalAyat || 0).toLocaleString('id-ID')}</p><p className="text-xs text-muted">{((hf.data.totalAyat || 0) / TOTAL_AYAT * 100).toFixed(1)}% Al-Qur'an</p></div>
                      <div><p className="text-xs text-muted font-semibold">Hafalan terakhir</p><p className="font-semibold">{hf.data.terakhir ? `${namaSurah(hf.data.terakhir.surat)} : ${hf.data.terakhir.ayat}` : '–'}</p></div>
                      <div><p className="text-xs text-muted font-semibold">Setoran terakhir</p><p className="font-semibold">{tanggal(hf.data.setoranTerakhir)}</p><p className="text-xs text-muted">{hf.data.jumlahSetoran || 0} setoran</p></div>
                    </div>
                    <JuzGrid perJuz={hf.data.perJuz} kecil />
                  </>
                )}
              </Panel>
              <Panel title={<span className="inline-flex items-center gap-2"><CalendarCheck className="size-4 text-brand-700" />Kehadiran {periodeLabel(bulanIni)}</span>} className="lg:w-72">
                {hadir.hari === 0 ? <p className="text-sm text-muted">Belum ada absensi bulan ini.</p> : (
                  <>
                    <p className="text-3xl font-extrabold num">{Math.round((hadir.H / hadir.hari) * 100)}%</p>
                    <p className="text-xs text-muted mb-3">hadir {hadir.H} dari {hadir.hari} hari</p>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {[['Izin', hadir.I], ['Sakit', hadir.S], ['Alpa', hadir.A]].map(([l, v]) => <div key={l} className="rounded-lg bg-paper border border-line py-1.5"><p className="font-bold num text-sm">{v}</p><p className="text-muted">{l}</p></div>)}
                    </div>
                  </>
                )}
              </Panel>
            </section>
          )}

          <div className="mb-5 no-print"><PortalPanel santri={s} /></div>

          <div className="space-y-5 [&>*]:min-w-0">
            <Panel title="Tagihan" pad={false}
              action={<Tabs items={[['belum', `Belum lunas (${belum.length})`], ['semua', `Semua (${tagihan.length})`]]} value={lihat} onChange={setLihat} kecil />}>
              <div className="overflow-x-auto"><table className="ledger">
                <thead><tr><th>Periode</th><th>Kewajiban</th><th className="money">Nominal</th><th className="money">Dibayar</th><th className="money">Sisa</th><th>Status</th></tr></thead>
                <tbody>
                  {tampil.length === 0 && <tr><td colSpan={6} className="text-muted">{lihat === 'belum' ? 'Tidak ada tagihan yang belum lunas. Alhamdulillah.' : 'Belum ada tagihan.'}</td></tr>}
                  {perTahun.map(([y, list]) => [
                    <tr key={`y${y}`} className="bg-paper"><td colSpan={4} className="text-xs font-bold text-muted">{y}</td><td className="money text-xs font-bold">{rupiah(list.reduce((a, t) => a + t.sisa, 0))}</td><td /></tr>,
                    ...list.map((t) => (
                      <tr key={t.id}>
                        <td className="whitespace-nowrap">{periodeLabel(t.periodeKey)}</td>
                        <td>{t.kewajibanNama}{t.potongan > 0 && <p className="text-[11px] text-brass-700">potongan {rupiah(t.potongan)}</p>}</td>
                        <td className="money">{rupiah(t.nominal)}</td>
                        <td className="money">{rupiah(t.dibayar)}</td>
                        <td className={cx('money', t.sisa > 0 && 'text-rose-ink font-semibold')}>{rupiah(t.sisa)}</td>
                        <td><Badge>{t.status}</Badge></td>
                      </tr>
                    )),
                  ])}
                </tbody>
                {tampil.length > 0 && <tfoot><tr><td colSpan={2}>Total</td><td className="money">{rupiah(tampil.reduce((a, t) => a + t.nominal, 0))}</td><td className="money">{rupiah(tampil.reduce((a, t) => a + t.dibayar, 0))}</td><td className="money">{rupiah(tampil.reduce((a, t) => a + t.sisa, 0))}</td><td /></tr></tfoot>}
              </table></div>
            </Panel>
            <Panel title="Riwayat pembayaran" pad={false}>
              <div className="overflow-x-auto"><table className="ledger">
                <thead><tr><th>Tanggal</th><th>No.</th><th>Untuk</th><th className="money">Jumlah</th><th className="no-print" /></tr></thead>
                <tbody>
                  {bayar.length === 0 && <tr><td colSpan={5} className="text-muted">Belum ada pembayaran.</td></tr>}
                  {bayar.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{tanggal(p.tanggal)}<p className="text-[11px] text-muted">{p.metode}</p></td><td className="text-xs text-muted num">{p.no}</td>
                      <td className="text-xs">{p.items.map((i) => <p key={i.tagihanId}>{i.kewajibanNama} {periodeLabel(i.periodeKey)} · <span className="num">{rupiah(i.bayar)}</span></p>)}</td>
                      <td className="money font-semibold">{rupiah(p.total)}</td>
                      <td className="no-print whitespace-nowrap text-right">
                        <button onClick={() => window.open(`/cetak/kwitansi/${p.id}`, '_blank')} className="p-1.5 rounded-md text-muted hover:text-brand-700" title="Cetak kwitansi"><Receipt className="size-4" /></button>
                        <button onClick={() => kirimTeksWA(s.hp, pesanKwitansi(p, settings))} className="p-1.5 rounded-md hover:bg-brand-50" title="Kirim kwitansi ke WhatsApp"><WaIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {bayar.length > 0 && <tfoot><tr><td colSpan={3}>Total dibayar</td><td className="money">{rupiah(bayar.reduce((a, p) => a + p.total, 0))}</td><td className="no-print" /></tr></tfoot>}
              </table></div>
            </Panel>
          </div>
          <TandaTangan />
        </div>
      )}
    </>
  );
}
