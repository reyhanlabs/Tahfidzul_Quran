import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, HandCoins, ReceiptText, Wallet, ArrowUpFromLine, ArrowDownToLine, BookOpen, FileBarChart,
  AlertCircle, IdCard, Users, GraduationCap, School, ListChecks, Layers, Tags, Settings, UserCog, LogOut, Menu, X, LifeBuoy, KeyRound, ShieldCheck, BookOpenCheck, CalendarCheck, ScrollText, History,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { cx, Spinner } from './ui';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/db';
import { migrasiRekening } from '../lib/migrasi';
import { peranLabel } from '../lib/izin';
import ErrorBoundary from './ErrorBoundary';

/** Menu; `akses` = kunci di lib/izin.js AKSES. Grup tanpa item yang boleh dibuka tidak ditampilkan. */
export const NAV = [
  { group: null, items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, akses: 'semua' }] },
  { group: 'Data master', items: [
    { to: '/master/santri', label: 'Santri', icon: GraduationCap, akses: 'masterSantri' },
    { to: '/master/ustadz', label: 'Ustadz/ustadzah', icon: Users, akses: 'masterSantri' },
    { to: '/master/kelas', label: 'Kelas', icon: School, akses: 'masterSantri' },
    { to: '/master/kewajiban', label: 'Jenis kewajiban', icon: ListChecks, akses: 'keuangan' },
    { to: '/master/komponen', label: 'Komponen gaji', icon: Layers, akses: 'keuangan' },
    { to: '/master/akun', label: 'Kategori kas', icon: Tags, akses: 'keuangan' },
  ] },
  { group: 'Transaksi', items: [
    { to: '/pembayaran', label: 'Terima pembayaran', icon: HandCoins, akses: 'terimaBayar' },
    { to: '/tagihan', label: 'Tagihan santri', icon: ReceiptText, akses: 'keuangan' },
    { to: '/gaji', label: 'Gaji & honor', icon: Wallet, akses: 'keuangan' },
    { to: '/pengeluaran', label: 'Pengeluaran', icon: ArrowUpFromLine, akses: 'keuangan' },
    { to: '/pemasukan', label: 'Pemasukan lain', icon: ArrowDownToLine, akses: 'keuangan' },
    { to: '/persetujuan', label: 'Persetujuan', icon: ShieldCheck, akses: 'setujui', badge: 'pengajuan' },
  ] },
  { group: 'Akademik', items: [
    { to: '/hafalan', label: 'Setoran hafalan', icon: BookOpenCheck, akses: 'akademik' },
    { to: '/absensi', label: 'Absensi', icon: CalendarCheck, akses: 'akademik' },
    { to: '/rapor', label: 'Rapor santri', icon: ScrollText, akses: 'lihatAkademik' },
  ] },
  { group: 'Kas & laporan', items: [
    { to: '/buku-kas', label: 'Buku kas', icon: BookOpen, akses: 'lihatKeuangan' },
    { to: '/laporan/keuangan', label: 'Laporan keuangan', icon: FileBarChart, akses: 'lihatKeuangan' },
    { to: '/laporan/tunggakan', label: 'Tunggakan', icon: AlertCircle, akses: 'lihatKeuangan' },
    { to: '/laporan/kartu-santri', label: 'Kartu santri', icon: IdCard, akses: 'lihatTagihan' },
  ] },
  { group: 'Sistem', items: [
    { to: '/panduan', label: 'Panduan', icon: LifeBuoy, akses: 'semua' },
    { to: '/pengaturan', label: 'Pengaturan', icon: Settings, akses: 'admin' },
    { to: '/akun', label: 'Akun saya', icon: KeyRound, akses: 'semua' },
    { to: '/pengguna', label: 'Pengguna', icon: UserCog, akses: 'admin' },
    { to: '/log', label: 'Log aktivitas', icon: History, akses: 'admin' },
  ] },
];

function Sidebar({ onNavigate }) {
  const { profile, boleh, logout } = useAuth();
  // Jumlah pengajuan menunggu (hanya untuk penyetuju)
  const bolehSetuju = boleh('setujui');
  const { data: menunggu } = useLiveQuery(() => (bolehSetuju ? query(collection(db, 'pengajuan'), where('status', '==', 'menunggu')) : null), [bolehSetuju]);
  const { settings } = useData();
  return (
    <div className="h-full flex flex-col bg-brand-900 text-white/85">
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <img src="/logo.svg" alt="" className="size-9 rounded-lg ring-1 ring-white/15" />
        <div className="min-w-0">
          <p className="font-extrabold text-white leading-tight truncate">{settings.nama}</p>
          <p className="text-[11px] text-white/50">Administrasi & keuangan</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((g, gi) => {
          const items = g.items.filter((i) => boleh(i.akses));
          if (!items.length) return null;
          return (
            <div key={gi} className="mt-3">
              {g.group && <p className="px-2 mb-1 text-[11px] font-semibold text-brass-500/90">{g.group}</p>}
              {items.map((i) => (
                <NavLink key={i.to} to={i.to} end={i.end} onClick={onNavigate}
                  className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                    isActive ? 'bg-white text-brand-900 font-semibold' : 'hover:bg-white/8 hover:text-white')}>
                  <i.icon className="size-4 shrink-0" strokeWidth={2} /><span className="flex-1">{i.label}</span>
                  {i.badge === 'pengajuan' && menunggu.length > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-brass-500 text-white text-[11px] font-bold grid place-items-center">{menunggu.length}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3 flex items-center gap-3">
        <NavLink to="/akun" onClick={onNavigate} title="Akun saya" className="flex items-center gap-3 min-w-0 flex-1 rounded-lg -m-1 p-1 hover:bg-white/8">
          <div className="size-8 rounded-full bg-brass-500 text-white grid place-items-center text-sm font-bold shrink-0">
            {(profile?.nama || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{profile?.nama}</p>
            <p className="text-[11px] text-white/50">{peranLabel(profile)} · <span title="Versi aplikasi (waktu build)">v{__VERSI__}</span></p>
          </div>
        </NavLink>
        <button onClick={logout} title="Keluar" className="p-2 rounded-lg hover:bg-white/10"><LogOut className="size-4" /></button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { settings, loading } = useData();
  const { isAdmin } = useAuth();
  // Sekali saja: tandai catatan kas lama dengan rekening (fitur kas per rekening)
  useEffect(() => {
    if (isAdmin && !loading && !settings.migrasiRekening) migrasiRekening().catch((e) => console.warn(e));
  }, [isAdmin, loading, settings.migrasiRekening]);
  return (
    <div className="min-h-full lg:pl-64">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 no-print"><Sidebar /></aside>
      <header className="lg:hidden sticky top-0 z-30 bg-brand-900 text-white flex items-center gap-3 px-4 h-14 no-print">
        <button onClick={() => setOpen(true)} aria-label="Buka menu" className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10"><Menu className="size-5" /></button>
        <p className="font-bold truncate">{settings.nama}</p>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 z-10 text-white/70" aria-label="Tutup menu"><X className="size-5" /></button>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
      <main key={loc.pathname} className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1400px]">
        <ErrorBoundary resetKey={loc.pathname}><Suspense fallback={<Spinner />}><Outlet /></Suspense></ErrorBoundary>
      </main>
    </div>
  );
}
