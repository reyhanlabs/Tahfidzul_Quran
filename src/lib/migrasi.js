/** Pembaruan data lama agar sesuai fitur baru. Dijalankan sekali oleh admin. */
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { MAX_TULIS } from './ops';
import { rekeningUntuk } from './konteks';

let berjalan = false;
export async function migrasiRekening() {
  if (berjalan) return 0;
  berjalan = true;
  try {
    const s = await getDocs(collection(db, 'kas'));
    const perlu = s.docs.filter((d) => !d.data().rekening && d.data().sumber !== 'mutasi');
    for (let i = 0; i < perlu.length; i += MAX_TULIS) {
      const b = writeBatch(db);
      perlu.slice(i, i + MAX_TULIS).forEach((d) => b.update(d.ref, { rekening: rekeningUntuk(d.data().metode) }));
      await b.commit();
    }
    await setDoc(doc(db, 'settings', 'lembaga'), { migrasiRekening: 1 }, { merge: true });
    return perlu.length;
  } finally { berjalan = false; }
}
