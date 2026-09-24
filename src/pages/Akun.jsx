import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth, gantiSandiSendiri } from '../lib/auth';
import { Button, Field, Input, PageHeader, Panel, Badge, useAction } from '../components/ui';

export function SandiInput({ value, onChange, autoComplete = 'new-password', ...p }) {
  const [lihat, setLihat] = useState(false);
  return (
    <div className="relative">
      <Input type={lihat ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} className="pr-10" {...p} />
      <button type="button" onClick={() => setLihat(!lihat)} aria-label={lihat ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink">{lihat ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
    </div>
  );
}

export default function Akun() {
  const { user, profile } = useAuth();
  const [run, busy] = useAction();
  const [nama, setNama] = useState(profile?.nama || '');
  const [s, setS] = useState({ lama: '', baru: '', ulang: '' });

  const beda = s.baru && s.ulang && s.baru !== s.ulang;
  const pendek = s.baru && s.baru.length < 6;

  const simpanSandi = (e) => {
    e.preventDefault();
    run(async () => {
      if (s.baru !== s.ulang) throw new Error('Konfirmasi kata sandi tidak sama.');
      if (s.baru === s.lama) throw new Error('Kata sandi baru harus berbeda dari yang lama.');
      await gantiSandiSendiri(s.lama, s.baru);
      setS({ lama: '', baru: '', ulang: '' });
    }, 'Kata sandi berhasil diganti. Gunakan kata sandi baru saat masuk berikutnya.');
  };

  return (
    <>
      <PageHeader help="akun-saya" title="Akun saya" description="Ganti nama tampilan dan kata sandi Anda sendiri." />
      <div className="grid lg:grid-cols-2 gap-5 items-start max-w-4xl">
        <Panel title="Profil">
          <dl className="grid grid-cols-[90px_1fr] gap-y-2 text-sm mb-5">
            <dt className="text-muted">Email</dt><dd className="font-semibold break-all">{user?.email}</dd>
            <dt className="text-muted">Peran</dt><dd><Badge tone={profile?.role}>{profile?.role}</Badge></dd>
          </dl>
          <Field label="Nama tampilan"><Input value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
          <Button className="mt-4" loading={busy} disabled={!nama.trim() || nama.trim() === profile?.nama}
            onClick={() => run(() => updateDoc(doc(db, 'users', user.uid), { nama: nama.trim() }), 'Nama diperbarui.')}>Simpan nama</Button>
          <p className="text-xs text-muted mt-4">Email login hanya bisa diganti oleh admin dari menu Pengguna.</p>
        </Panel>

        <Panel title="Ganti kata sandi">
          <form onSubmit={simpanSandi} className="space-y-4">
            <input type="email" autoComplete="username" value={user?.email || ''} readOnly hidden />
            <Field label="Kata sandi lama" required><SandiInput autoComplete="current-password" value={s.lama} onChange={(e) => setS({ ...s, lama: e.target.value })} /></Field>
            <Field label="Kata sandi baru" required error={pendek ? 'Minimal 6 karakter.' : null}><SandiInput value={s.baru} onChange={(e) => setS({ ...s, baru: e.target.value })} /></Field>
            <Field label="Ulangi kata sandi baru" required error={beda ? 'Tidak sama dengan kata sandi baru.' : null}><SandiInput value={s.ulang} onChange={(e) => setS({ ...s, ulang: e.target.value })} /></Field>
            <Button type="submit" loading={busy} disabled={!s.lama || !s.baru || !s.ulang || beda || pendek}>Ganti kata sandi</Button>
          </form>
          <p className="text-xs text-muted mt-4">Lupa kata sandi lama? Keluar, lalu gunakan "Lupa kata sandi" di halaman masuk, atau minta admin mengaturkan kata sandi baru.</p>
        </Panel>
      </div>
    </>
  );
}
