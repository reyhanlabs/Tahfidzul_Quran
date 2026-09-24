import { auth } from './firebase';

/** Panggil fungsi server /api/admin-user (hanya admin). */
export async function hapusPengguna(uid) {
  return panggil({ aksi: 'hapus', uid });
}

export async function aturAkunPengguna({ uid, email, password }) {
  return panggil({ uid, email: email || undefined, password: password || undefined });
}

async function panggil(body) {
  const token = await auth.currentUser?.getIdToken();
  let res;
  try {
    res = await fetch('/api/admin-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Tidak dapat menghubungi server. Periksa koneksi internet.');
  }
  const data = await res.json().catch(() => null);
  if (!data) {
    throw new Error('Fungsi server belum tersedia. Fitur ini berjalan setelah aplikasi di-deploy ke Vercel (atau saat memakai "vercel dev").');
  }
  if (!res.ok) throw new Error(data.error || 'Gagal mengubah akun.');
  return data;
}
