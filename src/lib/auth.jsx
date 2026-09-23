import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { auth, db, firebaseConfig } from './firebase';
import { seedDefaults } from './ops';

export const AuthCtx = createContext(null);
const Ctx = AuthCtx;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = memuat
  const [profile, setProfile] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u || null)), []);

  useEffect(() => {
    if (!user) { setProfile(null); setRetry(0); return undefined; }
    let t;
    const unsub = onSnapshot(doc(db, 'users', user.uid),
      (s) => setProfile(s.exists() ? { id: s.id, ...s.data() } : { missing: true }),
      () => {
        // Saat setup awal, profil baru dibuat beberapa detik setelah login → coba lagi.
        setProfile({ missing: true });
        if (retry < 8) t = setTimeout(() => setRetry((r) => r + 1), 1500);
      });
    return () => { unsub(); clearTimeout(t); };
  }, [user, retry]);

  const value = {
    user, profile,
    // Profil yang belum terbaca dianggap masih memuat selama percobaan ulang berjalan (mis. saat setup awal).
    loading: user === undefined || (user && !profile) || (profile?.missing && retry < 8),
    isAdmin: profile?.role === 'admin' && profile?.aktif,
    allowed: Boolean(profile && !profile.missing && profile.aktif),
    login: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
    logout: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

export async function isSetupDone() {
  const s = await getDoc(doc(db, 'meta', 'setup'));
  return s.exists();
}

/** Setup awal: buat akun admin pertama + isi data default. */
export async function setupAdmin({ nama, email, password, lembaga }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const b = writeBatch(db);
  b.set(doc(db, 'users', cred.user.uid), { nama, email, role: 'admin', aktif: true, createdAt: serverTimestamp() });
  b.set(doc(db, 'meta', 'setup'), { done: true, by: email, at: serverTimestamp() });
  await b.commit();
  await setDoc(doc(db, 'settings', 'lembaga'), {
    nama: lembaga, alamat: '', telepon: '', kota: '', pimpinan: '', bendahara: nama,
    saldoAwal: 0, tanggalSaldoAwal: new Date().toISOString().slice(0, 10), metode: ['Cash', 'Transfer', 'Bank', 'Lainnya'],
  }, { merge: true });
  await seedDefaults();
}

/**
 * Admin menambah pengguna baru tanpa ter-logout: akun dibuat lewat instance
 * Firebase kedua, lalu profilnya ditulis oleh admin yang sedang login.
 */
export async function createAppUser({ nama, email, password, role }) {
  const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  try {
    const cred = await createUserWithEmailAndPassword(getAuth(secondary), email, password);
    await setDoc(doc(db, 'users', cred.user.uid), { nama, email, role, aktif: true, createdAt: serverTimestamp() });
    await signOut(getAuth(secondary));
  } finally {
    await deleteApp(secondary);
  }
}

export function authErrorText(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Email atau kata sandi salah.';
  if (c.includes('email-already-in-use')) return 'Email ini sudah terdaftar.';
  if (c.includes('weak-password')) return 'Kata sandi minimal 6 karakter.';
  if (c.includes('invalid-email')) return 'Format email tidak valid.';
  if (c.includes('too-many-requests')) return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
  if (c.includes('network')) return 'Tidak ada koneksi internet.';
  if (c.includes('permission-denied')) return 'Akses ditolak oleh aturan keamanan database.';
  return e?.message || 'Terjadi kesalahan.';
}
