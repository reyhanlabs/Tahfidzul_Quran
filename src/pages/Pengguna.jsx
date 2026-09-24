import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { UserPlus } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/db';
import { useAuth, createAppUser, authErrorText, kirimResetSandi } from '../lib/auth';
import { aturAkunPengguna } from '../lib/adminApi';
import { SandiInput } from './Akun';
import AksesEditor from '../components/AksesEditor';
import { IZIN, izinDari, peranLabel } from '../lib/izin';
import { Button, Field, Input, Select, Modal, Badge, PageHeader, Panel, useAction } from '../components/ui';

export default function Pengguna() {
  const { isAdmin, user } = useAuth();
  const [run, busy] = useAction();
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

  return (
    <>
      <PageHeader help="pengguna" title="Pengguna" description="Atur siapa boleh mengakses apa: keuangan, penerimaan pembayaran, pendidikan, laporan, dan persetujuan pengeluaran. Hanya admin yang bisa menghapus data dan mengelola pengguna."
        actions={<Button icon={UserPlus} onClick={() => setF({ nama: '', email: '', password: '', akses: { admin: false, izin: ['keuangan', 'laporan'] } })}>Tambah pengguna</Button>} />
      <Panel pad={false}>
        <table className="ledger">
          <thead><tr><th>Nama</th><th>Email</th><th>Hak akses</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.nama}{u.id === user.uid && <span className="text-xs text-muted font-normal"> (Anda)</span>}</td>
                <td>{u.email}</td>
                <td>
                  <Badge tone={u.role === 'admin' ? 'admin' : 'bendahara'}>{peranLabel(u)}</Badge>
                  {u.role !== 'admin' && <p className="text-[11px] text-muted mt-1">{[...izinDari({ ...u, aktif: true })].map((i) => IZIN[i]?.label).filter(Boolean).join(' · ') || 'Belum ada izin'}</p>}
                </td>
                <td>{u.aktif ? <Badge>Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                <td className="text-right whitespace-nowrap space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => setGanti({ u, nama: u.nama })}>Ubah nama</Button>
                  <Button size="sm" variant="secondary" onClick={() => setAtur({ u, email: u.email, password: '' })}>Atur login</Button>
                  <Button size="sm" variant="ghost" onClick={() => run(async () => { try { await kirimResetSandi(u.email); } catch (e) { throw new Error(authErrorText(e)); } }, `Tautan atur ulang kata sandi dikirim ke ${u.email}. Minta ia memeriksa folder Spam juga.`)}>Kirim reset sandi</Button>
                  {u.id !== user.uid && <>
                    <Button size="sm" variant="secondary" onClick={() => setAkses({ u, v: { admin: u.role === 'admin', izin: u.role === 'admin' ? [] : [...izinDari({ ...u, aktif: true })] } })}>Hak akses</Button>
                    <Button size="sm" variant={u.aktif ? 'danger' : 'secondary'} onClick={() => ubah(u, { aktif: !u.aktif }, u.aktif ? 'Pengguna dinonaktifkan.' : 'Pengguna diaktifkan.')}>
                      {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
