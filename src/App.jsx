import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { DataProvider } from './lib/data';
import { configOk } from './lib/firebase';
import { ToastProvider, Spinner, Button } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tagihan from './pages/Tagihan';
import Pembayaran from './pages/Pembayaran';
import Gaji from './pages/Gaji';
import KasManual from './pages/KasManual';
import BukuKas from './pages/BukuKas';
import Pengaturan from './pages/Pengaturan';
import Pengguna from './pages/Pengguna';
import Panduan from './pages/panduan/Panduan';
import MasterPage from './pages/master/MasterPage';
import LapKeuangan from './pages/laporan/LapKeuangan';
import LapTunggakan from './pages/laporan/LapTunggakan';
import KartuSantri from './pages/laporan/KartuSantri';
import Kwitansi from './pages/cetak/Kwitansi';
import SlipGaji from './pages/cetak/SlipGaji';

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
          <Route path="laporan/keuangan" element={<LapKeuangan />} />
          <Route path="laporan/tunggakan" element={<LapTunggakan />} />
          <Route path="laporan/kartu-santri" element={<KartuSantri />} />
          <Route path="master/:jenis" element={<MasterPage />} />
          <Route path="pengaturan" element={<Pengaturan />} />
          <Route path="pengguna" element={<Pengguna />} />
          <Route path="panduan" element={<Panduan />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
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
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}
