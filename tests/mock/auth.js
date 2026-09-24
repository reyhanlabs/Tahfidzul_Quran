import { load, save } from './store.js';
const auths = new Map();
const listeners = new Set();
const wrap = (u) => (u ? { ...u, getIdToken: async () => 'mock-token-' + u.uid } : null);
export function getAuth(app) {
  const name = app?.name || '[DEFAULT]';
  if (!auths.has(name)) {
    const st = load();
    auths.set(name, { name, currentUser: name === '[DEFAULT]' && st.current ? wrap(st.users[st.current].user) : null });
  }
  return auths.get(name);
}
const err = (code) => Object.assign(new Error(code), { code });
function setUser(a, u0) {
  const u = wrap(u0);
  a.currentUser = u;
  if (a.name === '[DEFAULT]') { const st = load(); st.current = u ? u.uid : null; save(st); listeners.forEach((cb) => cb(u)); }
}
export function onAuthStateChanged(a, cb) { listeners.add(cb); setTimeout(() => cb(a.currentUser), 0); return () => listeners.delete(cb); }
export async function signInWithEmailAndPassword(a, email, pw) {
  const st = load(); const r = Object.values(st.users).find((x) => x.user.email === email);
  if (!r || r.pw !== pw) throw err('auth/invalid-credential');
  setUser(a, r.user); return { user: r.user };
}
export async function createUserWithEmailAndPassword(a, email, pw) {
  const st = load();
  if (Object.values(st.users).some((x) => x.user.email === email)) throw err('auth/email-already-in-use');
  if (pw.length < 6) throw err('auth/weak-password');
  const user = { uid: 'uid' + (st.seq++), email }; st.users[user.uid] = { user, pw }; save(st);
  setUser(a, user); return { user };
}
export async function signOut(a) { setUser(a, null); }
export async function sendPasswordResetEmail() {}

export const EmailAuthProvider = { credential: (email, password) => ({ email, password }) };
export async function reauthenticateWithCredential(u, cred) {
  const st = load(); const r = st.users[u.uid];
  if (!r || r.pw !== cred.password) throw err('auth/invalid-credential');
}
export async function updatePassword(u, pw) {
  if (pw.length < 6) throw err('auth/weak-password');
  const st = load(); st.users[u.uid].pw = pw; save(st);
}
