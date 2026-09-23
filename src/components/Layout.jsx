import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, HandCoins, ReceiptText, Wallet, ArrowUpFromLine, ArrowDownToLine, BookOpen, FileBarChart,
  AlertCircle, IdCard, Users, GraduationCap, School, ListChecks, Layers, Tags, Settings, UserCog, LogOut, Menu, X,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { cx } from './ui';

const NAV = [
  { group: null, items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { group: 'Data master', items: [
    { to: '/master/santri', label: 'Santri', icon: GraduationCap },
    { to: '/master/ustadz', label: 'Ustadz/ustadzah', icon: Users },
    { to: '/master/kelas', label: 'Kelas', icon: School },
    { to: '/master/kewajiban', label: 'Jenis kewajiban', icon: ListChecks },
    { to: '/master/komponen', label: 'Komponen gaji', icon: Layers },
    { to: '/master/akun', label: 'Kategori kas', icon: Tags },
  ] },
  { group: 'Transaksi', items: [
    { to: '/pembayaran', label: 'Terima pembayaran', icon: HandCoins },
    { to: '/tagihan', label: 'Tagihan santri', icon: ReceiptText },
    { to: '/gaji', label: 'Gaji & honor', icon: Wallet },
    { to: '/pengeluaran', label: 'Pengeluaran', icon: ArrowUpFromLine },
    { to: '/pemasukan', label: 'Pemasukan lain', icon: ArrowDownToLine },
  ] },
  { group: 'Kas & laporan', items: [
    { to: '/buku-kas', label: 'Buku kas', icon: BookOpen },
    { to: '/laporan/keuangan', label: 'Laporan keuangan', icon: FileBarChart },
    { to: '/laporan/tunggakan', label: 'Tunggakan', icon: AlertCircle },
    { to: '/laporan/kartu-santri', label: 'Kartu santri', icon: IdCard },
  ] },
  { group: 'Sistem', items: [
    { to: '/pengaturan', label: 'Pengaturan', icon: Settings },
    { to: '/pengguna', label: 'Pengguna', icon: UserCog, admin: true },
  ] },
];

function Sidebar({ onNavigate }) {
  const { profile, isAdmin, logout } = useAuth();
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
        {NAV.map((g, gi) => (
          <div key={gi} className="mt-3">
            {g.group && <p className="px-2 mb-1 text-[11px] font-semibold text-brass-500/90">{g.group}</p>}
            {g.items.filter((i) => !i.admin || isAdmin).map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} onClick={onNavigate}
                className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  isActive ? 'bg-white text-brand-900 font-semibold' : 'hover:bg-white/8 hover:text-white')}>
                <i.icon className="size-4 shrink-0" strokeWidth={2} />{i.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3 flex items-center gap-3">
        <div className="size-8 rounded-full bg-brass-500 text-white grid place-items-center text-sm font-bold shrink-0">
          {(profile?.nama || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{profile?.nama}</p>
          <p className="text-[11px] text-white/50 capitalize">{profile?.role}</p>
        </div>
        <button onClick={logout} title="Keluar" className="p-2 rounded-lg hover:bg-white/10"><LogOut className="size-4" /></button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { settings } = useData();
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
        <Outlet />
      </main>
    </div>
  );
}
