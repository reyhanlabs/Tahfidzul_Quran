// Penyimpanan bersama (localStorage) supaya tab baru (kwitansi) melihat data yang sama.
const KEY = '__mockfs__';
export function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { db: {}, users: {}, current: null, seq: 1 }; } catch { return { db: {}, users: {}, current: null, seq: 1 }; } }
export function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
