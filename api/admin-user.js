/**
 * Vercel Serverless Function — admin mengubah email / kata sandi pengguna lain
 * tanpa email reset. Berjalan di server dengan Firebase Admin SDK.
 *
 * Wajib: Environment Variable FIREBASE_SERVICE_ACCOUNT di Vercel berisi isi file JSON
 * service account (Firebase Console → Project settings → Service accounts →
 * Generate new private key). Boleh JSON mentah atau base64.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    const e = new Error('Server belum dikonfigurasi: FIREBASE_SERVICE_ACCOUNT belum diisi di Vercel.');
    e.status = 500; throw e;
  }
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  return initializeApp({ credential: cert(JSON.parse(text)) });
}

const fail = (res, status, error) => res.status(status).json({ error });

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Metode tidak diizinkan.');
  let deps;
  try { const app = adminApp(); deps = { auth: getAuth(app), db: getFirestore(app) }; }
  catch (e) { return fail(res, e.status || 500, e.status ? e.message : 'Konfigurasi server tidak valid (FIREBASE_SERVICE_ACCOUNT).'); }
  return proses(deps, req, res);
}

/** Logika inti (dipisah agar bisa diuji tanpa Firebase sungguhan). */
export async function proses({ auth, db }, req, res) {
  try {
    // 1. Pastikan pemanggil login dan berperan admin aktif
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return fail(res, 401, 'Sesi login tidak ditemukan. Silakan masuk ulang.');
    let caller;
    try { caller = await auth.verifyIdToken(token); } catch { return fail(res, 401, 'Sesi login kedaluwarsa. Silakan masuk ulang.'); }
    const me = await db.doc(`users/${caller.uid}`).get();
    if (!me.exists || me.data().role !== 'admin' || me.data().aktif !== true) {
      return fail(res, 403, 'Hanya admin yang boleh mengubah akun pengguna lain.');
    }

    // 2. Validasi input
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const uid = String(body.uid || '');
    const patch = {};
    if (body.password) {
      if (String(body.password).length < 6) return fail(res, 400, 'Kata sandi minimal 6 karakter.');
      patch.password = String(body.password);
    }
    if (body.email) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Format email tidak valid.');
      patch.email = email;
    }
    if (!uid || !Object.keys(patch).length) return fail(res, 400, 'Tidak ada perubahan yang dikirim.');
    const target = await db.doc(`users/${uid}`).get();
    if (!target.exists) return fail(res, 404, 'Pengguna tidak ditemukan.');

    // 3. Terapkan
    await auth.updateUser(uid, patch);
    if (patch.email) await db.doc(`users/${uid}`).update({ email: patch.email });
    // Kata sandi diganti admin → sesi lama pengguna itu diakhiri (kecuali admin mengubah akunnya sendiri)
    if (patch.password && uid !== caller.uid) await auth.revokeRefreshTokens(uid);

    return res.status(200).json({ ok: true });
  } catch (e) {
    const code = e?.errorInfo?.code || e?.code || '';
    if (code.includes('email-already-exists')) return fail(res, 409, 'Email ini sudah dipakai akun lain.');
    if (code.includes('user-not-found')) return fail(res, 404, 'Akun login pengguna ini tidak ditemukan di Firebase Authentication.');
    if (code.includes('invalid-password')) return fail(res, 400, 'Kata sandi minimal 6 karakter.');
    console.error(e);
    return fail(res, e.status || 500, e.status ? e.message : 'Terjadi kesalahan di server.');
  }
}
