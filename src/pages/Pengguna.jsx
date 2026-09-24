import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { UserPlus, Shield, Pencil, KeyRound, Mail, UserX, UserCheck, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/db';
import { useAuth, createAppUser, authErrorText, kirimResetSandi } from '../lib/auth';
import { aturAkunPengguna, hapusPengguna } from '../lib/adminApi';
import { catat } from '../lib/log';
import Menu from '../components/Menu';
import { SandiInput } from './Akun';
import AksesEditor from '../components/AksesEditor';
import { IZIN, izinDari, peranLabel } from '../lib/izin';
import { Button, Field, Input, Modal, Badge, PageHeader, Panel, useAction, useToast, cx } from '../components/ui';

export default function Pengguna() {
  const { isAdmin, user } = useAuth();
  const [run, busy] = useAction();
  const { confirm } = useToast();
  const { data } = useLiveQuery(() => collection(db, 'users'), []);
  const [f, setF] = useState(null);
  const [ganti, setGanti] = useState(null);
  const [atur, setAtur] = useState(null);
  const [akses, setAkses] = useState(null);
  if (!isAdmin) return <Navigate to="/" replace />;

  const tambah = () => run(async () => {
    if (!f.akses.admin && !f.akses.izin.length) throw new Error('Pilih minimal satu hak akses.');
    try { await createAppUser({ nama: f.nama, email: f.email, password: f.password, role: f.akses.admin ? 'admin' : 'staf', izin: f.akses.izin }); } catch (e) { throw new Error(authErrorText(e)); }
    setF(null);
  }, 'Pengguna ditambahkan. Berikan email & kata sandinya kepada yang bersangkutan.');

  const ubah = (u, patch, msg) => run(() => updateDoc(doc(db, 'users', u.id), patch), msg);

  const urut = [...data].sort((x, y) => (y.aktif === true) - (x.aktif === true) || (x.role === 'admin' ? -1 : 0) - (y.role === 'admin' ? -1 : 0) || String(x.nama).localeCompare(String(y.nama)));
  const jumlahAktif = data.filter((u) => u.aktif).length;

  const hapus = async (u) => {
    const ok = await confirm({
      title: `Hapus pengguna ${u.nama}?`,
      text: `Akun login ${u.email} dihapus permanen dan tidak bisa masuk lagi. Transaksi yang pernah ia catat tetap tersimpan. Jika hanya ingin menghentikan sementara, pilih Nonaktifkan.`,
      ok: 'Hapus permanen', danger: true,
    });
    if (!ok) return;
    run(async () => {
      await hapusPengguna(u.id);
      catat('hapus', 'pengguna', `${u.nama} (${u.email})`);
    }, 'Pengguna dihapus.');
  };

  return (
    <>
      <PageHeader help="pengguna" title="Pengguna" description="Atur siapa boleh mengakses apa. Hanya admin yang bisa mengelola pengguna."
        actions={<Button icon={UserPlus} onClick={() => setF({ nama: '', email: '', password: '', akses: { admin: false, izin: ['keuangan', 'laporan'] } })}>Tambah pengguna</Button>} />
      <p className="text-sm text-muted mb-3">{jumlahAktif} pengguna aktif dari {data.length}</p>
      <Panel pad={false}>
        <ul className="divide-y divide-line">
          {urut.map((u) => {
            const saya = u.id === user.uid;
            const izin = u.role === 'admin' ? [] : [...izinDari({ ...u, aktif: true })];
            return (
              <li key={u.id} className={cx('flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_84px_176px]', !u.aktif && 'bg-paper/70')}>
                <div className="flex items-center gap-3 min-w-0 flex-1 basis-64">
                  <div className={cx('size-10 rounded-full grid place-items-center font-bold shrink-0', u.aktif ? 'bg-brand-100 text-brand-800' : 'bg-black/5 text-muted')}>
                    {(u.nama || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={cx('font-semibold truncate', !u.aktif && 'text-muted')}>{u.nama}{saya && <span className="ml-1.5 text-xs font-normal text-muted">(Anda)</span>}</p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 basis-56">
                  <Badge tone={u.role === 'admin' ? 'admin' : 'bendahara'}>{peranLabel(u)}</Badge>
                  {izin.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {izin.map((i) => <span key={i} className="text-[11px] px-1.5 py-0.5 rounded bg-paper border border-line text-muted">{IZIN[i]?.label}</span>)}
                    </div>
                  )}
                </div>
                <div className="shrink-0">{u.aktif ? <Badge>Aktif</Badge> : <Badge>Nonaktif</Badge>}</div>
                <div className="flex items-center justify-end gap-2 shrink-0 ml-auto md:ml-0">
                  {!saya && <Button size="sm" variant="secondary" icon={Shield}
                    onClick={() => setAkses({ u, v: { admin: u.role === 'admin', izin: u.role === 'admin' ? [] : [...izinDari({ ...u, aktif: true })] } })}>Hak akses</Button>}
                  <Menu items={[
                    { label: 'Ubah nama', icon: Pencil, onClick: () => setGanti({ u, nama: u.nama }) },
                    { label: 'Atur email & kata sandi', icon: KeyRound, onClick: () => setAtur({ u, email: u.email, password: '' }) },
                    { label: 'Kirim tautan reset sandi', icon: Mail, onClick: () => run(async () => { try { await kirimResetSandi(u.email); } catch (e) { throw new Error(authErrorText(e)); } }, `Tautan atur ulang kata sandi dikirim ke ${u.email}. Minta ia memeriksa folder Spam juga.`) },
                    { divider: true, hidden: saya },
                    { label: u.aktif ? 'Nonaktifkan' : 'Aktifkan kembali', icon: u.aktif ? UserX : UserCheck, hidden: saya, onClick: () => ubah(u, { aktif: !u.aktif }, u.aktif ? 'Pengguna dinonaktifkan.' : 'Pengguna diaktifkan.') },
                    { label: 'Hapus pengguna', icon: Trash2, danger: true, hidden: saya, onClick: () => hapus(u) },
                  ]} />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Modal open={!!akses} onClose={() => setAkses(null)} title="Hak akses" subtitle={akses?.u.nama} width="max-w-lg"
        footer={<><Button variant="secondary" onClick={() => setAkses(null)}>Batal</Button>
          <Button loading={busy} disabled={!akses?.v.admin && !akses?.v.izin.length}
            onClick={() => { ubah(akses.u, { role: akses.v.admin ? 'admin' : 'staf', izin: akses.v.admin ? [] : akses.v.izin }, 'Hak akses diperbarui. Berlaku langsung.'); setAkses(null); }}>Simpan</Button></>}>
        {akses && <AksesEditor value={akses.v} onChange={(v) => setAkses({ ...akses, v })} />}
      </Modal>
      <Modal open={!!atur} onClose={() => setAtur(null)} title="Atur login pengguna" subtitle={atur?.u.nama} width="max-w-md"
        footer={<><Button variant="secondary" onClick={() => setAtur(null)}>Batal</Button>
          <Button loading={busy}
            disabled={!atur || ((atur.email || '').trim().toLowerCase() === atur.u.email && !atur.password) || (atur.password && atur.password.length < 6)}
            onClick={() => run(async () => {
              const emailBaru = atur.email.trim().toLowerCase();
              await aturAkunPengguna({ uid: atur.u.id, email: emailBaru !== atur.u.email ? emailBaru : undefined, password: atur.password || undefined });
              setAtur(null);
            }, 'Login pengguna diperbarui. Beri tahu yang bersangkutan email dan kata sandi barunya.')}>Simpan</Button></>}>
        {atur && <div className="space-y-4">
          <Field label="Email login"><Input type="email" value={atur.email} onChange={(e) => setAtur({ ...atur, email: e.target.value })} /></Field>
          <Field label="Kata sandi baru" hint="Kosongkan jika tidak ingin mengganti. Minimal 6 karakter."
            error={atur.password && atur.password.length < 6 ? 'Minimal 6 karakter.' : null}>
            <SandiInput value={atur.password} onChange={(e) => setAtur({ ...atur, password: e.target.value })} />
          </Field>
          <p className="text-xs text-muted">Kata sandi langsung berganti tanpa email. Jika mengganti kata sandi orang lain, ia otomatis dikeluarkan dari semua perangkat dan harus masuk lagi dengan kata sandi baru.</p>
        </div>}
      </Modal>
      <Modal open={!!ganti} onClose={() => setGanti(null)} title="Ubah nama pengguna" width="max-w-md"
        footer={<><Button variant="secondary" onClick={() => setGanti(null)}>Batal</Button><Button loading={busy} disabled={!ganti?.nama?.trim()} onClick={() => { ubah(ganti.u, { nama: ganti.nama.trim() }, 'Nama diperbarui.'); setGanti(null); }}>Simpan</Button></>}>
        {ganti && <Field label="Nama"><Input value={ganti.nama} onChange={(e) => setGanti({ ...ganti, nama: e.target.value })} /></Field>}
      </Modal>
      <Modal open={!!f} onClose={() => setF(null)} width="max-w-lg" title="Tambah pengguna"
        footer={<><Button variant="secondary" onClick={() => setF(null)}>Batal</Button><Button loading={busy} disabled={!f?.nama || !f?.email || (f?.password || '').length < 6} onClick={tambah}>Tambah pengguna</Button></>}>
        {f && <div className="space-y-4">
          <Field label="Nama" required><Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></Field>
          <Field label="Email" required><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Kata sandi awal" required hint="Minimal 6 karakter. Pengguna bisa menggantinya lewat 'Lupa kata sandi'."><Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <AksesEditor value={f.akses} onChange={(v) => setF({ ...f, akses: v })} />
        </div>}
      </Modal>
    </>
  );
}
