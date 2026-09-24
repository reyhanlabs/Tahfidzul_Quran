import { collection, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { HandCoins, BookOpenCheck, CalendarCheck, ScrollText, IdCard } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/db';
import { useData } from '../lib/data';
import { useAuth } from '../lib/auth';
import { peranLabel } from '../lib/izin';
import { rupiah, tanggal, todayISO } from '../lib/format';
import { Button, Panel, Stat } from '../components/ui';

/** Beranda untuk pengguna tanpa akses laporan keuangan (kasir, bagian pendidikan). */
export default function DashboardRingkas() {
  const { profile, boleh } = useAuth();
  const { santri, kelas } = useData();
  const nav = useNavigate();
  const hari = todayISO();
  const kasir = boleh('terimaBayar');
  const akd = boleh('akademik');
  const { data: bayar } = useLiveQuery(() => (kasir ? query(collection(db, 'pembayaran'), where('tanggal', '==', hari)) : null), [kasir, hari]);
  const { data: setoran } = useLiveQuery(() => (akd ? query(collection(db, 'hafalan'), where('tanggal', '==', hari)) : null), [akd, hari]);
  const { data: absen } = useLiveQuery(() => (akd ? query(collection(db, 'absensi'), where('tanggal', '==', hari)) : null), [akd, hari]);
  const aktif = santri.filter((s) => s.status === 'Aktif');
  const kelasSudah = new Set(absen.filter((a) => a.jenis === 'santri').map((a) => a.grup));
  const kelasBelum = kelas.map((k) => k.nama).filter((k) => aktif.some((s) => s.kelas === k) && !kelasSudah.has(k));
  const jam = new Date().getHours();
  const salam = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{salam}, {profile?.nama?.split(' ')[0]} · {peranLabel(profile)}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">{tanggal(hari, true)}</h1>
      </div>

      {kasir && (
        <Panel title="Penerimaan pembayaran hari ini" action={<Button size="sm" icon={HandCoins} onClick={() => nav('/pembayaran')}>Terima pembayaran</Button>}>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Jumlah transaksi" value={bayar.length} />
            <Stat label="Total diterima" value={rupiah(bayar.reduce((a, p) => a + p.total, 0))} tone="brand" />
          </div>
          {bayar.length > 0 && (
            <ul className="mt-4 divide-y divide-line text-sm">
              {[...bayar].sort((a, b) => b.no.localeCompare(a.no)).slice(0, 8).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2"><span><b>{p.santriNama}</b> <span className="text-muted">· {p.no}</span></span><span className="num font-semibold">{rupiah(p.total)}</span></li>
              ))}
            </ul>
          )}
          <Button className="mt-4" size="sm" variant="ghost" icon={IdCard} onClick={() => nav('/laporan/kartu-santri')}>Cek kartu pembayaran santri</Button>
        </Panel>
      )}

      {akd && (
        <div className="grid md:grid-cols-2 gap-5">
          <Panel title="Setoran hafalan hari ini" action={<Button size="sm" icon={BookOpenCheck} onClick={() => nav('/hafalan')}>Catat setoran</Button>}>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Setoran" value={setoran.length} />
              <Stat label="Ayat ziyadah" value={setoran.filter((h) => h.jenis === 'Ziyadah' && h.lulus).reduce((a, h) => a + h.jumlahAyat, 0)} tone="brand" />
            </div>
          </Panel>
          <Panel title="Absensi hari ini" action={<Button size="sm" variant="secondary" icon={CalendarCheck} onClick={() => nav('/absensi')}>Isi absensi</Button>}>
            {kelasBelum.length === 0
              ? <p className="text-sm text-brand-700 font-semibold">Semua kelas sudah diabsen.</p>
              : <p className="text-sm">Belum diabsen: <b>{kelasBelum.join(', ')}</b></p>}
            <p className="text-xs text-muted mt-2">{aktif.length} santri aktif di {kelas.length} kelas.</p>
            <Button className="mt-3" size="sm" variant="ghost" icon={ScrollText} onClick={() => nav('/rapor')}>Buat rapor</Button>
          </Panel>
        </div>
      )}

      {!kasir && !akd && <Panel><p className="text-sm text-muted">Akun Anda belum diberi hak akses. Hubungi admin lembaga.</p></Panel>}
    </div>
  );
}
