import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { DataProvider } from './lib/data';
import { configOk } from './lib/firebase';
import { ToastProvider, Spinner, Button } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';

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
          <Route path="/cetak/kwitansi/:id" element={<Kwitansi />} />
          <Route path="/cetak/slip/:id" element={<SlipGaji />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pembayaran" element={<Pembayaran />} />
            <Route path="tagihan" element={<Tagihan />} />
            <Route path="gaji" element={<Gaji />} />
            <Route path="pengeluaran" element={<KasManual jenis="pengeluaran" />} />
            <Route path="pemasukan" element={<KasManual jenis="pemasukan" />} />
            <Route path="buku-kas" element={<BukuKas />} />
            <Route path="hafalan" element={<Hafalan />} />
            <Route path="absensi" element={<Absensi />} />
            <Route path="rapor" element={<Rapor />} />
            <Route path="laporan/keuangan" element={<LapKeuangan />} />
            <Route path="laporan/tunggakan" element={<LapTunggakan />} />
            <Route path="laporan/kartu-santri" element={<KartuSantri />} />
            <Route path="master/:jenis" element={<MasterPage />} />
            <Route path="pengaturan" element={<Pengaturan />} />
            <Route path="pengguna" element={<Pengguna />} />
            <Route path="log" element={<LogAktivitas />} />
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
