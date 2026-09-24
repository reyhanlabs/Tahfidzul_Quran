import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, ShieldCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { rupiah, tanggal, periodeLabel } from '../lib/format';
import { namaSurah, TOTAL_AYAT } from '../lib/quran';
import Pattern from '../components/Pattern';
import JuzGrid from '../components/JuzGrid';

function Kotak({ judul, children, aksen }) {
  return (
    <section className="bg-white rounded-2xl border border-line overflow-hidden">
      <h2 className={`px-4 py-2.5 text-sm font-bold border-b border-line ${aksen || ''}`}>{judul}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Halaman untuk wali santri — tanpa login, hanya bisa dibuka dengan tautan rahasia. */
export default function PortalWali() {
  const { token } = useParams();
  const [p, setP] = useState(undefined);
  useEffect(() => {
    getDoc(doc(db, 'portal', token)).then((s) => setP(s.exists() ? s.data() : null)).catch(() => setP(null));
  }, [token]);
  useEffect(() => { if (p?.santri) document.title = `${p.santri.nama} · ${p.lembaga.nama}`; }, [p]);

  if (p === undefined) return <div className="min-h-full grid place-items-center text-muted"><Loader2 className="size-6 animate-spin" /></div>;
  if (!p) return (
    <div className="min-h-full grid place-items-center p-6 text-center">
      <div><p className="text-lg font-bold">Tautan tidak berlaku</p><p className="text-sm text-muted mt-1">Tautan ini sudah dinonaktifkan atau salah. Silakan minta tautan baru ke admin lembaga.</p></div>
    </div>
  );
  const h = p.hafalan;
  const upd = p.diperbarui?.seconds ? new Date(p.diperbarui.seconds * 1000) : null;

  return (
    <div className="min-h-full bg-paper pb-10">
      <header className="relative overflow-hidden bg-brand-900 text-white">
        <Pattern className="absolute inset-0 w-full h-full" id="portal" opacity={0.08} />
        <div className="relative max-w-xl mx-auto px-5 pt-6 pb-8">
          <div className="flex items-center gap-2.5 text-white/80 text-sm"><img src="/logo.svg" alt="" className="size-7 rounded-md" /><span className="font-semibold">{p.lembaga.nama}</span></div>
          <p className="text-xs text-white/60 mt-6">Informasi santri</p>
          <h1 className="text-2xl font-extrabold mt-0.5">{p.santri.nama}</h1>
          <p className="text-sm text-white/70">{p.santri.kode}{p.santri.kelas && ` · ${p.santri.kelas}`}</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 -mt-4 space-y-4 relative">
        <section className={`rounded-2xl p-5 shadow-sm ${p.totalSisa > 0 ? 'bg-white border-2 border-rose-ink/30' : 'bg-white border-2 border-brand-200'}`}>
          <p className="text-sm text-muted">Sisa kewajiban pembayaran</p>
          <p className={`text-3xl font-extrabold num mt-1 ${p.totalSisa > 0 ? 'text-rose-ink' : 'text-brand-700'}`}>{p.totalSisa > 0 ? rupiah(p.totalSisa) : 'Lunas semua'}</p>
          {p.tagihanTerbuka.length > 0 && (
            <ul className="mt-3 divide-y divide-line text-sm">
              {p.tagihanTerbuka.map((t, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span>{t.kewajiban} <span className="text-muted">· {periodeLabel(t.periodeKey)}</span>{t.dibayar > 0 && <span className="block text-xs text-muted">sudah dibayar {rupiah(t.dibayar)} dari {rupiah(t.nominal)}</span>}</span>
                  <span className="num font-semibold whitespace-nowrap">{rupiah(t.sisa)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {h && (
          <Kotak judul="Hafalan Al-Qur'an">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-extrabold num text-brand-700">{h.totalAyat} <span className="text-sm font-semibold text-muted">ayat</span></p>
              <p className="text-sm text-muted">{h.juzSelesai} juz selesai · {((h.totalAyat / TOTAL_AYAT) * 100).toFixed(1).replace('.', ',')}%</p>
            </div>
            <div className="mt-3"><JuzGrid perJuz={h.perJuz} kecil /></div>
            {p.setoran?.length > 0 && (
              <ul className="mt-4 text-sm divide-y divide-line">
                {p.setoran.map((s, i) => (
                  <li key={i} className="flex justify-between gap-3 py-1.5">
                    <span><span className="text-muted">{tanggal(s.tanggal)} · </span>{s.jenis === 'Ziyadah' ? '' : "Muraja'ah "}{namaSurah(s.surat)} {s.ayatDari}–{s.ayatSampai}</span>
                    <span className="text-xs font-semibold text-muted">{s.nilai}</span>
                  </li>
                ))}
              </ul>
            )}
          </Kotak>
        )}

        {p.kehadiranBulanIni && (
          <Kotak judul={`Kehadiran ${periodeLabel(p.periodeHadir)}`}>
            <div className="grid grid-cols-4 text-center">
              {[['Hadir', 'H'], ['Izin', 'I'], ['Sakit', 'S'], ['Alpa', 'A']].map(([l, k]) => (
                <div key={k}><p className="text-xl font-extrabold num">{p.kehadiranBulanIni[k]}</p><p className="text-xs text-muted">{l}</p></div>
              ))}
            </div>
          </Kotak>
        )}

        <Kotak judul="Riwayat pembayaran">
          {p.pembayaran.length === 0 ? <p className="text-sm text-muted">Belum ada pembayaran.</p> : (
            <ul className="divide-y divide-line text-sm">
              {p.pembayaran.map((b, i) => (
                <li key={i} className="py-2">
                  <div className="flex justify-between gap-3"><span className="font-semibold">{tanggal(b.tanggal, true)}</span><span className="num font-semibold">{rupiah(b.total)}</span></div>
                  <p className="text-xs text-muted">{b.rincian.map((r) => `${r.kewajiban} ${periodeLabel(r.periodeKey)}`).join(', ')} · {b.metode} · {b.no}</p>
                </li>
              ))}
            </ul>
          )}
        </Kotak>

        <p className="text-xs text-muted text-center flex items-center justify-center gap-1.5 pt-2">
          <ShieldCheck className="size-3.5" />Halaman pribadi — jangan bagikan tautan ini.{upd && ` Diperbarui ${upd.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`}
        </p>
        {p.lembaga.telepon && <p className="text-xs text-muted text-center">Pertanyaan: hubungi {p.lembaga.nama} · {p.lembaga.telepon}</p>}
      </main>
    </div>
  );
}
