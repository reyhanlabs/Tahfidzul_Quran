import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

/**
 * Konfigurasi Firebase project tahfizulquran-b6b7c.
 * Nilai ini aman berada di kode (API key web Firebase memang publik);
 * keamanan data dijaga oleh firestore.rules.
 * Jika variabel VITE_FIREBASE_* diisi (di .env.local / Vercel), nilai itu yang dipakai.
 */
const env = import.meta.env;
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDymWgjBm5PPueesGF4mCVYJKU_jygpGN4',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'tahfizulquran-b6b7c.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'tahfizulquran-b6b7c',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'tahfizulquran-b6b7c.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '843124750828',
  appId: env.VITE_FIREBASE_APP_ID || '1:843124750828:web:124109fc03e0c1e0d1e8c9',
};

export const configOk = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const app = getApps()[0] || initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
