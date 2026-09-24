import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Catat aktivitas pengguna (siapa, kapan, apa). Ditulis setelah operasi berhasil;
 * kegagalan mencatat tidak membatalkan operasi utamanya.
 */
export function catat(aksi, objek, ringkas = '') {
  const u = auth.currentUser;
  if (!u) return;
  addDoc(collection(db, 'log'), {
    waktu: serverTimestamp(), uid: u.uid, oleh: u.email || '-', aksi, objek, ringkas: String(ringkas).slice(0, 300),
  }).catch((e) => console.warn('log gagal', e));
}
