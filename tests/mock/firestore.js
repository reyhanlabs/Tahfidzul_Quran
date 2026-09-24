import { load, save } from './store.js';
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const listeners = new Set();
export const writes = { count: 0 };
let st = load();
const col = (c) => (st.db[c] ||= {});
const deny = (m) => Object.assign(new Error('Missing or insufficient permissions. ' + m), { code: 'permission-denied' });
const DATA = ['kelas','santri','ustadz','kewajiban','komponen','akun','tagihan','pembayaran','gaji','kas','counters','hafalan','hafalanRingkas','absensi','rapor','portal','log'];
/** Tiruan sederhana firestore.rules + batas 20 get() per batch (kita pakai ≤18). */
function rules(ops) {
  if (ops.length > 18) throw deny(`batch ${ops.length} tulis > 18`);
  const uid = st.current; const me = uid && col('users')[uid];
  const member = me && me.aktif === true; const admin = member && me.role === 'admin';
  const setupDone = !!col('meta').setup;
  for (const o of ops) {
    const c = o.ref.col;
    if (c === 'meta') { if (setupDone || !ops.some((x) => x.ref.col === 'users' && x.data?.role === 'admin')) throw deny('meta'); continue; }
    if (c === 'users') {
      if (o.t === 'delete') throw deny('users delete');
      const exists = !!col('users')[o.ref.id];
      if (!exists) { if (admin || (!setupDone && o.ref.id === uid && o.data.role === 'admin')) continue; throw deny('users create'); }
      if (admin) continue;
      if (member && o.ref.id === uid && o.t === 'update' && Object.keys(o.data).every((k) => k === 'nama')) continue;
      throw deny('users update');
    }
    if (c === 'settings') { if (admin) continue; throw deny('settings'); }
    if (!DATA.includes(c)) throw deny('coll ' + c);
    if (o.t === 'delete') { if (admin && c !== 'counters') continue; throw deny('delete ' + c); }
    if (!member) throw deny('not member');
  }
}
function commit(ops) {
  st = load();
  rules(ops);
  for (const o of ops) {
    const c = col(o.ref.col);
    if (o.t === 'delete') delete c[o.ref.id];
    else if (o.t === 'update') { if (!c[o.ref.id]) throw Object.assign(new Error('not-found: ' + o.ref.path), { code: 'not-found' }); Object.assign(c[o.ref.id], clone(o.data)); }
    else c[o.ref.id] = o.merge ? { ...(c[o.ref.id] || {}), ...clone(o.data) } : clone(o.data);
  }
  writes.count += ops.length; save(st);
  queueMicrotask(() => listeners.forEach((l) => l()));
}
let auto = 0;
const rid = () => 'd' + Date.now().toString(36) + (auto++).toString(36) + Math.random().toString(36).slice(2, 6);
export function initializeFirestore() { return {}; }
export const persistentLocalCache = () => ({}); export const persistentMultipleTabManager = () => ({});
export function collection(_db, c) { return { type: 'col', col: c }; }
export function doc(a, c, id) {
  if (a?.type === 'col') return { type: 'doc', col: a.col, id: rid(), path: `${a.col}` };
  return { type: 'doc', col: c, id, path: `${c}/${id}` };
}
export const where = (f, op, v) => ({ k: 'where', f, op, v });
export const limit = (n) => ({ k: 'limit', n });
export const query = (c, ...cs) => ({ type: 'query', col: c.col, cs });
export const serverTimestamp = () => ({ seconds: Math.floor(Date.now() / 1000) });
export const sum = (f) => ({ sum: f });
const OPS = { '==': (a, b) => a === b, '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b };
function run(q) {
  st = load();
  let rows = Object.entries(col(q.col)).map(([id, d]) => ({ id, d }));
  let lim = Infinity;
  for (const c of q.cs || []) {
    if (c.k === 'where') {
      if (!OPS[c.op]) throw new Error('op ' + c.op);
      rows = rows.filter((r) => r.d[c.f] !== undefined && typeof r.d[c.f] === typeof c.v && OPS[c.op](r.d[c.f], c.v));
    }
    if (c.k === 'limit') lim = c.n;
    if (c.k === 'orderBy') rows.sort((a, b) => { const x = a.d[c.f]?.seconds ?? a.d[c.f]; const y = b.d[c.f]?.seconds ?? b.d[c.f]; return (x > y ? 1 : x < y ? -1 : 0) * (c.dir === 'desc' ? -1 : 1); });
  }
  return rows.slice(0, lim);
}
const mk = (c, r) => ({ id: r.id, ref: { type: 'doc', col: c, id: r.id }, exists: () => true, data: () => clone(r.d) });
function snapOf(ref) {
  st = load();
  if (ref.type === 'doc') { const d = col(ref.col)[ref.id]; return { id: ref.id, exists: () => !!d, data: () => clone(d) }; }
  const docs = run(ref).map((r) => mk(ref.col, r));
  return { docs, empty: docs.length === 0, size: docs.length };
}
export function onSnapshot(ref, next, error) {
  const fire = () => { try { next(snapOf(ref)); } catch (e) { error?.(e); } };
  listeners.add(fire); setTimeout(fire, 0);
  return () => listeners.delete(fire);
}
export async function getDocs(q) { return snapOf(q); }
export async function getDoc(r) { return snapOf(r); }
export async function setDoc(ref, data, o) { commit([{ t: 'set', ref, data, merge: o?.merge }]); }
export async function updateDoc(ref, data) { commit([{ t: 'update', ref, data }]); }
export async function deleteDoc(ref) { commit([{ t: 'delete', ref }]); }
export function writeBatch() {
  const ops = [];
  return { set: (ref, data, o) => ops.push({ t: 'set', ref, data, merge: o?.merge }), update: (ref, data) => ops.push({ t: 'update', ref, data }),
    delete: (ref) => ops.push({ t: 'delete', ref }), commit: async () => { if (ops.length > 500) throw new Error('batch > 500'); commit(ops); } };
}
let txCount = 0;
export async function runTransaction(_db, fn) {
  // pengaturan uji: window.__lat (ms jeda), window.__failAfter (gagal setelah n transaksi)
  if (window.__lat) await new Promise((r) => setTimeout(r, window.__lat));
  if (window.__failAfter != null && txCount++ >= window.__failAfter) { window.__failAfter = null; txCount = 0; throw Object.assign(new Error('Koneksi terputus'), { code: 'unavailable' }); }
  const ops = [];
  const tx = {
    get: async (ref) => { if (ops.length) throw new Error('Firestore transactions require all reads to be executed before all writes.'); return snapOf(ref); },
    set: (ref, data, o) => { ops.push({ t: 'set', ref, data, merge: o?.merge }); return tx; },
    update: (ref, data) => { ops.push({ t: 'update', ref, data }); return tx; },
    delete: (ref) => { ops.push({ t: 'delete', ref }); return tx; },
  };
  const r = await fn(tx);
  if (ops.length > 500) throw new Error('transaction > 500 writes');
  commit(ops); return r;
}
export async function getAggregateFromServer(q, spec) {
  const rows = run(q); const out = {};
  for (const [k, v] of Object.entries(spec)) out[k] = rows.reduce((a, r) => a + (Number(r.d[v.sum]) || 0), 0);
  return { data: () => out };
}

export const Timestamp = { fromMillis: (ms) => ({ seconds: Math.floor(ms / 1000), toMillis: () => ms }) };
export async function addDoc(c, data) { const ref = doc(c); commit([{ t: 'set', ref, data }]); return ref; }
export const orderBy = (f, dir = 'asc') => ({ k: 'orderBy', f, dir });
