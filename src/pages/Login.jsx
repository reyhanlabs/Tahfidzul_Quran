import { useEffect, useState } from 'react';
import { useAuth, isSetupDone, setupAdmin, authErrorText } from '../lib/auth';
import { Button, Field, Input, Spinner } from '../components/ui';
import Pattern from '../components/Pattern';

const AYAT = 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ﴿١﴾ خَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ ﴿٢﴾ اقْرَأْ وَرَبُّكَ الْأَكْرَمُ ﴿٣﴾ الَّذِي عَلَّمَ بِالْقَلَمِ ﴿٤﴾ عَلَّمَ الْإِنْسَانَ مَا لَمْ يَعْلَمْ ﴿٥﴾';
const ARTI = 'Bacalah dengan (menyebut) nama Tuhanmu yang menciptakan. Dia telah menciptakan manusia dari segumpal darah. Bacalah, dan Tuhanmulah Yang Mahamulia, yang mengajar (manusia) dengan pena. Dia mengajarkan manusia apa yang tidak diketahuinya.';

export default function Login() {
  const { login, resetPassword } = useAuth();
  const [mode, setMode] = useState(null); // 'login' | 'setup' | 'lupa' | 'terkirim'
  const [f, setF] = useState({ email: '', password: '', nama: '', lembaga: '' });
  const [err, setErr] = useState(''); const [info, setInfo] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    isSetupDone().then((d) => setMode(d ? 'login' : 'setup')).catch(() => setMode('login'));
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'lupa') {
        await resetPassword(f.email);
        setMode('terkirim');
      } else if (mode === 'setup') {
        if (!f.nama || !f.lembaga) throw new Error('Nama dan nama lembaga wajib diisi.');
        await setupAdmin({ nama: f.nama, email: f.email, password: f.password, lembaga: f.lembaga });
      } else {
        await login(f.email, f.password);
      }
    } catch (e2) { setErr(authErrorText(e2)); } finally { setBusy(false); }
  };

  const keMode = (m) => { setErr(''); setInfo(''); setMode(m); };

  return (
    <div className="min-h-full grid lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden lg:flex flex-col justify-between bg-brand-900 text-white p-12 overflow-hidden">
        <Pattern className="absolute inset-0 w-full h-full" />
        <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-brass-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/logo.svg" alt="" className="size-10 rounded-xl" />
          <span className="font-extrabold text-lg tracking-wide">PPMTQ</span>
        </div>
        <figure className="relative max-w-xl">
          <blockquote lang="ar" dir="rtl" className="font-arab text-2xl leading-[2] text-white/95">
            {AYAT}
          </blockquote>
          <figcaption className="mt-6 border-l-2 border-brass-500 pl-4">
            <p className="text-white/80 leading-relaxed">“{ARTI}”</p>
            <p className="mt-2 text-sm font-semibold text-brass-500">QS. Al-‘Alaq: 1–5</p>
          </figcaption>
        </figure>
        <p className="relative text-xs text-white/40">PPMTQ · Administrasi & Keuangan Lembaga · v{__VERSI__}</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        {!mode ? <Spinner /> : (
          mode === 'terkirim' ? (
            <div className="w-full max-w-sm">
              <img src="/logo.svg" alt="" className="size-11 rounded-xl lg:hidden mb-6" />
              <h2 className="text-2xl font-extrabold">Periksa email Anda</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Jika <b className="text-ink">{f.email}</b> terdaftar di aplikasi, tautan untuk membuat kata sandi baru sudah dikirim ke alamat itu.
              </p>
              <ul className="mt-5 space-y-2 text-sm bg-brand-50 border border-brand-100 rounded-lg px-4 py-3 leading-relaxed">
                <li>Belum masuk dalam beberapa menit? Periksa folder <b>Spam</b> atau <b>Promosi</b>. Pengirimnya berakhiran <i>firebaseapp.com</i>.</li>
                <li>Tautan hanya berlaku sekitar 1 jam dan hanya bisa dipakai sekali.</li>
                <li>Tetap tidak ada email? Pastikan penulisan email sama persis dengan yang didaftarkan admin, atau minta admin mengirimkan tautannya dari menu Pengguna.</li>
              </ul>
              <Button size="lg" className="w-full mt-6" onClick={() => keMode('login')}>Kembali ke halaman masuk</Button>
              <button type="button" onClick={() => keMode('lupa')} className="mt-4 text-sm text-brand-700 font-semibold hover:underline">Kirim ulang</button>
            </div>
          ) : (
          <form onSubmit={submit} className="w-full max-w-sm">
            <img src="/logo.svg" alt="" className="size-11 rounded-xl lg:hidden mb-6" />
            <h2 className="text-2xl font-extrabold">{mode === 'setup' ? 'Setup awal' : mode === 'lupa' ? 'Lupa kata sandi' : 'Masuk'}</h2>
            <p className="text-sm text-muted mt-1 mb-7">
              {mode === 'setup'
                ? 'Belum ada admin. Buat akun admin pertama — data default (kelas, jenis kewajiban, komponen gaji, kategori kas) akan diisi otomatis.'
                : mode === 'lupa'
                  ? 'Masukkan email akun Anda. Kami kirimkan tautan untuk membuat kata sandi baru.'
                  : 'Gunakan akun yang diberikan admin lembaga.'}
            </p>
            <div className="space-y-4">
              {mode === 'setup' && <>
                <Field label="Nama lembaga" required><Input value={f.lembaga} onChange={set('lembaga')} placeholder="TPQ Nurul Ilmi" /></Field>
                <Field label="Nama Anda" required><Input value={f.nama} onChange={set('nama')} /></Field>
              </>}
              <Field label="Email" required><Input type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></Field>
              {mode !== 'lupa' && (
                <Field label="Kata sandi" required hint={mode === 'setup' ? 'Minimal 6 karakter.' : null}>
                  <Input type="password" autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} required />
                </Field>
              )}
            </div>
            {err && <p className="mt-4 text-sm text-rose-ink bg-rose-ink/5 rounded-lg px-3 py-2">{err}</p>}
            {info && <p className="mt-4 text-sm text-brand-800 bg-brand-50 rounded-lg px-3 py-2">{info}</p>}
            <Button type="submit" size="lg" className="w-full mt-6" loading={busy}>
              {mode === 'setup' ? 'Buat akun admin' : mode === 'lupa' ? 'Kirim tautan' : 'Masuk'}
            </Button>
            {mode === 'login' && <button type="button" onClick={() => keMode('lupa')} className="mt-4 text-sm text-brand-700 font-semibold hover:underline">Lupa kata sandi</button>}
            {mode === 'lupa' && <button type="button" onClick={() => keMode('login')} className="mt-4 text-sm text-brand-700 font-semibold hover:underline">Kembali ke halaman masuk</button>}
          </form>
          )
        )}
      </div>
    </div>
  );
}
