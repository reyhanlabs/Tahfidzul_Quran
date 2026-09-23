import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { UserPlus } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/db';
import { useAuth, createAppUser, authErrorText } from '../lib/auth';
import { Button, Field, Input, Select, Modal, Badge, PageHeader, Panel, useAction } from '../components/ui';

export default function Pengguna() {
  const { isAdmin, user } = useAuth();
  const [run, busy] = useAction();
  const { data } = useLiveQuery(() => collection(db, 'users'), []);
  const [f, setF] = useState(null);
  const [ganti, setGanti] = useState(null);
  if (!isAdmin) return <Navigate to="/" replace />;

  const tambah = () => run(async () => {
    try { await createAppUser(f); } catch (e) { throw new Error(authErrorText(e)); }
    setF(null);
  }, 'Pengguna ditambahkan. Berikan email & kata sandinya kepada yang bersangkutan.');

  const ubah = (u, patch, msg) => run(() => updateDoc(doc(db, 'users', u.id), patch), msg);

  return (
    <>
      <PageHeader help="pengguna" title="Pengguna" description="Admin dapat mengelola semua data termasuk menghapus dan membatalkan transaksi. Bendahara dapat mencatat transaksi dan mengelola data, tetapi tidak dapat menghapus."
        actions={<Button icon={UserPlus} onClick={() => setF({ nama: '', email: '', password: '', role: 'bendahara' })}>Tambah pengguna</Button>} />
      <Panel pad={false}>
        <table className="ledger">
          <thead><tr><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.nama}{u.id === user.uid && <span className="text-xs text-muted font-normal"> (Anda)</span>}</td>
                <td>{u.email}</td>
                <td><Badge tone={u.role}>{u.role}</Badge></td>
                <td>{u.aktif ? <Badge>Aktif</Badge> : <Badge>Nonaktif</Badge>}</td>
                <td className="text-right whitespace-nowrap space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => setGanti({ u, nama: u.nama })}>Ubah nama</Button>
                  {u.id !== user.uid && <>
                    <Button size="sm" variant="ghost" loading={busy} onClick={() => ubah(u, { role: u.role === 'admin' ? 'bendahara' : 'admin' }, 'Peran diperbarui.')}>
                      Jadikan {u.role === 'admin' ? 'bendahara' : 'admin'}
                    </Button>
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
      <Modal open={!!ganti} onClose={() => setGanti(null)} title="Ubah nama pengguna" width="max-w-md"
        footer={<><Button variant="secondary" onClick={() => setGanti(null)}>Batal</Button><Button loading={busy} disabled={!ganti?.nama?.trim()} onClick={() => { ubah(ganti.u, { nama: ganti.nama.trim() }, 'Nama diperbarui.'); setGanti(null); }}>Simpan</Button></>}>
        {ganti && <Field label="Nama"><Input value={ganti.nama} onChange={(e) => setGanti({ ...ganti, nama: e.target.value })} /></Field>}
      </Modal>
      <Modal open={!!f} onClose={() => setF(null)} title="Tambah pengguna"
        footer={<><Button variant="secondary" onClick={() => setF(null)}>Batal</Button><Button loading={busy} disabled={!f?.nama || !f?.email || (f?.password || '').length < 6} onClick={tambah}>Tambah pengguna</Button></>}>
        {f && <div className="space-y-4">
          <Field label="Nama" required><Input value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></Field>
          <Field label="Email" required><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Kata sandi awal" required hint="Minimal 6 karakter. Pengguna bisa menggantinya lewat 'Lupa kata sandi'."><Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Field label="Peran"><Select value={f.role} options={[{ value: 'bendahara', label: 'Bendahara' }, { value: 'admin', label: 'Admin' }]} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
        </div>}
      </Modal>
    </>
  );
}
