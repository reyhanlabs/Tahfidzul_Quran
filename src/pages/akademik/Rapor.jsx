import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { Printer, ScrollText, Save, MessageCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useData } from '../../lib/data';
import { ambilRapor, simpanRapor, hitungRekap } from '../../lib/akademik';
import { namaSurah, TOTAL_AYAT, gabung, global, totalDariRentang } from '../../lib/quran';
import { tanggal, todayISO } from '../../lib/format';
import { kirimGambarWA } from '../../lib/share';
import { Button, Field, Input, Select, Textarea, PageHeader, Panel, Empty, Toolbar, useAction, useToast } from '../../components/ui';
import SantriPicker from '../../components/SantriPicker';
import JuzGrid from '../../components/JuzGrid';

const PREDIKAT = ['Sangat baik', 'Baik', 'Cukup', 'Perlu bimbingan'];

function semesterIni() {
  const n = new Date(); const y = n.getFullYear();
  return n.getMonth() < 6 ? [`${y}-01-01`, `${y}-06-30`] : [`${y}-07-01`, `${y}-12-31`];
}

export default function Rapor() {
  const { santriMap, settings } = useData();
  const { toast } = useToast();
  const [run, busy] = useAction();
  const [id, setId] = useState('');
  const [[dari, sampai], setRentang] = useState(semesterIni);
  const [isi, setIsi] = useState(null);
  const [catatan, setCatatan] = useState({ adab: 'Baik', kedisiplinan: 'Baik', catatan: '', wali: '' });
  const ref = useRef(null);
  const s = santriMap[id];

  useEffect(() => {
    if (!s) { setIsi(null); return undefined; }
    let alive = true; setIsi(null);
    (async () => {
      const [hf, rk, ab, rp] = await Promise.all([
        getDocs(query(collection(db, 'hafalan'), where('santriId', '==', s.id))),
        getDoc(doc(db, 'hafalanRingkas', s.id)),
        s.kelas ? getDocs(query(collection(db, 'absensi'), where('jenis', '==', 'santri'), where('grup', '==', s.kelas))) : Promise.resolve({ docs: [] }),
        ambilRapor(s.id, dari, sampai),
      ]);
      const semua = hf.docs.map((d) => d.data());
      const dalam = semua.filter((h) => h.tanggal >= dari && h.tanggal <= sampai);
      const zi = dalam.filter((h) => h.jenis === 'Ziyadah' && h.lulus);
      const baru = totalDariRentang(gabung(zi.map((h) => [global(h.surat, h.ayatDari), global(h.surat, h.ayatSampai)])));
      const suratBaru = [...new Set(zi.map((h) => h.surat))].sort((a, b) => a - b);
      const absen = ab.docs.map((d) => d.data()).filter((d) => d.tanggal >= dari && d.tanggal <= sampai && d.data?.[s.id]);
      const hadir = hitungRekap(absen.map((d) => ({ data: { [s.id]: d.data[s.id] } })))[s.id] || { H: 0, I: 0, S: 0, A: 0, hari: 0 };
      if (!alive) return;
      setIsi({ ringkas: rk.exists() ? rk.data() : null, jumlahSetoran: dalam.length, murajaah: dalam.filter((h) => h.jenis !== 'Ziyadah').length, ayatBaru: baru, suratBaru, hadir });
      setCatatan(rp ? { adab: rp.adab || 'Baik', kedisiplinan: rp.kedisiplinan || 'Baik', catatan: rp.catatan || '', wali: rp.wali || '' } : { adab: 'Baik', kedisiplinan: 'Baik', catatan: '', wali: '' });
    })().catch((e) => { console.warn(e); if (alive) setIsi({ gagal: true }); });
    return () => { alive = false; };
  }, [s, dari, sampai]);

  const total = isi?.ringkas?.totalAyat || 0;
  const persenHadir = isi?.hadir?.hari ? Math.round((isi.hadir.H / isi.hadir.hari) * 100) : null;

  const kirim = async () => {
    try {
      const pesan = `Assalamu'alaikum. Berikut rapor ananda ${s.nama} periode ${tanggal(dari, true)} s.d. ${tanggal(sampai, true)}.\n\n${settings.nama}`;
      const r = await kirimGambarWA(ref.current, `Rapor-${s.kode}`, pesan, s.hp);
      if (r === 'download') toast('Gambar rapor diunduh. Lampirkan di chat WhatsApp yang terbuka.');
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader help="rapor" title="Rapor santri" description="Ringkasan hafalan, kehadiran, dan catatan ustadz untuk satu periode. Siap dicetak atau dikirim ke wali."
        actions={s && isi && !isi.gagal && <>
          <Button variant="secondary" icon={MessageCircle} onClick={kirim}>Kirim ke WhatsApp</Button>
          <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Cetak</Button>
        </>} />
      <style>{'@page { size: A4 portrait; margin: 14mm; }'}</style>
      <Toolbar>
        <Field label="Santri" className="w-full sm:w-80"><SantriPicker value={id} onChange={setId} onlyActive={false} /></Field>
        <Field label="Dari"><Input type="date" value={dari} onChange={(e) => setRentang([e.target.value, sampai])} /></Field>
        <Field label="Sampai"><Input type="date" value={sampai} onChange={(e) => setRentang([dari, e.target.value])} /></Field>
      </Toolbar>

      {!s ? <Panel><Empty icon={ScrollText} title="Pilih santri" text="Pilih santri dan periode untuk menyusun rapor." /></Panel>
        : !isi ? <Panel><Empty title="Menyusun rapor…" /></Panel>
          : isi.gagal ? <Panel><Empty title="Gagal memuat data rapor" /></Panel> : (
            <div className="grid xl:grid-cols-[1fr_320px] gap-5 items-start">
              <article ref={ref} className="bg-white border border-line rounded-xl p-6 sm:p-8 print:border-0 print:p-0 print:rounded-none">
                <header className="flex items-center gap-4 border-b-2 border-brand-700 pb-3">
                  <img src="/logo.svg" alt="" className="size-12" />
                  <div className="flex-1"><p className="text-lg font-extrabold uppercase">{settings.nama}</p><p className="text-xs text-muted">{settings.alamat}</p></div>
                </header>
                <h2 className="text-center font-extrabold tracking-[0.15em] text-brand-700 mt-4">RAPOR SANTRI</h2>
                <p className="text-center text-sm text-muted">Periode {tanggal(dari, true)} s.d. {tanggal(sampai, true)}</p>
                <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm mt-5">
                  <dt className="text-muted">Nama</dt><dd className="font-semibold">{s.nama}</dd>
                  <dt className="text-muted">No. induk</dt><dd>{s.kode}{s.nis && ` · NIS ${s.nis}`}</dd>
                  <dt className="text-muted">Kelas</dt><dd>{s.kelas || '–'}</dd>
                </dl>

                <h3 className="font-bold mt-6 mb-2">A. Hafalan Al-Qur'an</h3>
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="border border-line rounded-lg p-3"><p className="text-xs text-muted">Total hafalan</p><p className="text-lg font-extrabold num">{total} ayat</p><p className="text-xs text-muted">{((total / TOTAL_AYAT) * 100).toFixed(1).replace('.', ',')}% mushaf · {isi.ringkas?.juzSelesai || 0} juz selesai</p></div>
                  <div className="border border-line rounded-lg p-3"><p className="text-xs text-muted">Hafalan baru periode ini</p><p className="text-lg font-extrabold num">{isi.ayatBaru} ayat</p><p className="text-xs text-muted">{isi.jumlahSetoran} setoran, {isi.murajaah} muraja'ah</p></div>
                  <div className="border border-line rounded-lg p-3"><p className="text-xs text-muted">Surat yang disetor</p><p className="text-sm font-semibold leading-snug mt-1">{isi.suratBaru.length ? isi.suratBaru.map(namaSurah).join(', ') : '–'}</p></div>
                </div>
                <div className="mt-3"><JuzGrid perJuz={isi.ringkas?.perJuz} kecil /></div>

                <h3 className="font-bold mt-6 mb-2">B. Kehadiran</h3>
                <table className="w-full text-sm border border-line">
                  <tbody><tr className="text-center">
                    {[['Hadir', isi.hadir.H], ['Izin', isi.hadir.I], ['Sakit', isi.hadir.S], ['Alpa', isi.hadir.A], ['Persentase', persenHadir == null ? '–' : `${persenHadir}%`]].map(([l, v]) => (
                      <td key={l} className="border border-line py-2"><p className="text-xs text-muted">{l}</p><p className="font-bold num">{v}</p></td>
                    ))}
                  </tr></tbody>
                </table>

                <h3 className="font-bold mt-6 mb-2">C. Adab & kedisiplinan</h3>
                <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
                  <dt className="text-muted">Adab / akhlak</dt><dd className="font-semibold">{catatan.adab}</dd>
                  <dt className="text-muted">Kedisiplinan</dt><dd className="font-semibold">{catatan.kedisiplinan}</dd>
                </dl>

                <h3 className="font-bold mt-6 mb-2">D. Catatan ustadz/ustadzah</h3>
                <p className="text-sm border border-line rounded-lg p-3 min-h-16 whitespace-pre-line">{catatan.catatan || <span className="text-muted">–</span>}</p>

                <div className="grid grid-cols-3 text-center text-sm mt-10 gap-4">
                  <div><p>Orang tua/wali</p><div className="h-16" /><p className="font-bold underline">{catatan.wali || '....................'}</p></div>
                  <div><p>Wali kelas</p><div className="h-16" /><p className="font-bold underline">....................</p></div>
                  <div><p>{settings.kota ? `${settings.kota}, ` : ''}{tanggal(todayISO(), true)}</p><p>Pimpinan</p><div className="h-10" /><p className="font-bold underline">{settings.pimpinan || '....................'}</p></div>
                </div>
              </article>

              <Panel title="Isian rapor" className="no-print">
                <div className="space-y-4">
                  <Field label="Adab / akhlak"><Select value={catatan.adab} options={PREDIKAT} onChange={(e) => setCatatan({ ...catatan, adab: e.target.value })} /></Field>
                  <Field label="Kedisiplinan"><Select value={catatan.kedisiplinan} options={PREDIKAT} onChange={(e) => setCatatan({ ...catatan, kedisiplinan: e.target.value })} /></Field>
                  <Field label="Catatan ustadz/ustadzah"><Textarea rows={5} value={catatan.catatan} onChange={(e) => setCatatan({ ...catatan, catatan: e.target.value })} placeholder="Perkembangan, kekuatan, dan saran untuk ananda" /></Field>
                  <Field label="Nama orang tua/wali (tanda tangan)"><Input value={catatan.wali} onChange={(e) => setCatatan({ ...catatan, wali: e.target.value })} placeholder={s.namaWali || s.namaAyah || ''} /></Field>
                  <Button icon={Save} loading={busy} onClick={() => run(() => simpanRapor(s, dari, sampai, catatan), 'Isian rapor disimpan.')}>Simpan isian</Button>
                </div>
              </Panel>
            </div>
          )}
    </>
  );
}
