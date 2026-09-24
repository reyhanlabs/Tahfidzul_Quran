import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { DataProvider } from './lib/data';
import { configOk } from './lib/firebase';
import { ToastProvider, Spinner, Button } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Wajib from './components/Wajib';

// Halaman dimuat hanya saat dibuka → aplikasi pertama kali terbuka lebih cepat
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tagihan = lazy(() => import('./pages/Tagihan'));
const Pembayaran = lazy(() => import('./pages/Pembayaran'));
const Gaji = lazy(() => import('./pages/Gaji'));
const KasManual = lazy(() => import('./pages/KasManual'));
const BukuKas = lazy(() => import('./pages/BukuKas'));
const Pengaturan = lazy(() => import('./pages/Pengaturan'));
const Pengguna = lazy(() => import('./pages/Pengguna'));
const Akun = lazy(() => import('./pages/Akun'));
const LogAktivitas = lazy(() => import('./pages/LogAktivitas'));
const Panduan = lazy(() => import('./pages/panduan/Panduan'));
const MasterPage = lazy(() => import('./pages/master/MasterPage'));
const LapKeuangan = lazy(() => import('./pages/laporan/LapKeuangan'));
const LapTunggakan = lazy(() => import('./pages/laporan/LapTunggakan'));
const KartuSantri = lazy(() => import('./pages/laporan/KartuSantri'));
const Hafalan = lazy(() => import('./pages/akademik/Hafalan'));
const Absensi = lazy(() => import('./pages/akademik/Absensi'));
const Rapor = lazy(() => import('./pages/akademik/Rapor'));
const Kwitansi = lazy(() => import('./pages/cetak/Kwitansi'));
const SlipGaji = lazy(() => import('./pages/cetak/SlipGaji'));
const PortalWali = lazy(() => import('./pages/PortalWali'));
const Persetujuan = lazy(() => import('./pages/Persetujuan'));

const Muat = ({ children }) => <Suspense fallback={<Spinner />}>{children}</Suspense>;

function Gate() {
  const { user, profile, loading, allowed, logout } = useAuth();
  if (loading) return <Spinner label="Menyiapkan aplikasi…" />;
  if (!user) return <Login />;
  if (!allowed) {
    return (
      <div className="min-h-full grid place-items-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold">Akun belum punya akses</h1>
          <p className="text-sm text-muted mt-2">
            {profile?.missing ? 'Akun ini belum didaftarkan sebagai pengguna aplikasi.' : 'Akun ini sedang dinonaktifkan.'} Hubungi admin lembaga.
          </p>
          <Button className="mt-5" variant="secondary" onClick={logout}>Keluar</Button>
        </div>
      </div>
    );
  }
  return (
    <DataProvider>
      <Muat>
        <Routes>
          <Route path="/cetak/kwitansi/:id" element={<Wajib akses="lihatTagihan"><Kwitansi /></Wajib>} />
          <Route path="/cetak/slip/:id" element={<Wajib akses="lihatKeuangan"><SlipGaji /></Wajib>} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pembayaran" element={<Wajib akses="terimaBayar"><Pembayaran /></Wajib>} />
            <Route path="tagihan" element={<Wajib akses="keuangan"><Tagihan /></Wajib>} />
            <Route path="gaji" element={<Wajib akses="keuangan"><Gaji /></Wajib>} />
            <Route path="pengeluaran" element={<Wajib akses="keuangan"><KasManual jenis="pengeluaran" /></Wajib>} />
            <Route path="pemasukan" element={<Wajib akses="keuangan"><KasManual jenis="pemasukan" /></Wajib>} />
            <Route path="buku-kas" element={<Wajib akses="lihatKeuangan"><BukuKas /></Wajib>} />
            <Route path="persetujuan" element={<Wajib akses="setujui"><Persetujuan /></Wajib>} />
            <Route path="hafalan" element={<Wajib akses="akademik"><Hafalan /></Wajib>} />
            <Route path="absensi" element={<Wajib akses="akademik"><Absensi /></Wajib>} />
            <Route path="rapor" element={<Wajib akses="lihatAkademik"><Rapor /></Wajib>} />
            <Route path="laporan/keuangan" element={<Wajib akses="lihatKeuangan"><LapKeuangan /></Wajib>} />
            <Route path="laporan/tunggakan" element={<Wajib akses="lihatKeuangan"><LapTunggakan /></Wajib>} />
            <Route path="laporan/kartu-santri" element={<Wajib akses="lihatTagihan"><KartuSantri /></Wajib>} />
            <Route path="master/:jenis" element={<MasterPage />} />
            <Route path="pengaturan" element={<Wajib akses="admin"><Pengaturan /></Wajib>} />
            <Route path="pengguna" element={<Wajib akses="admin"><Pengguna /></Wajib>} />
            <Route path="log" element={<Wajib akses="admin"><LogAktivitas /></Wajib>} />
            <Route path="panduan" element={<Panduan />} />
            <Route path="akun" element={<Akun />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Muat>
    </DataProvider>
  );
}

export default function App() {
  if (!configOk) {
    return (
      <div className="min-h-full grid place-items-center p-6">
        <div className="max-w-md bg-white border border-line rounded-xl p-6">
          <h1 className="text-lg font-bold">Konfigurasi Firebase belum diisi</h1>
          <p className="text-sm text-muted mt-2">Isi variabel <code>VITE_FIREBASE_*</code> di file <code>.env.local</code> (lokal) atau di Vercel → Settings → Environment Variables, lalu build ulang.</p>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      {/* Portal wali: publik, tanpa login */}
      <Route path="/wali/:token" element={<Muat><PortalWali /></Muat>} />
      <Route path="*" element={<AuthProvider><ToastProvider><Gate /></ToastProvider></AuthProvider>} />
    </Routes>
  );
}
