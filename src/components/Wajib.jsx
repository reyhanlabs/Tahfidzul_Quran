import { Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';

/** Tampilkan halaman hanya bila pengguna punya akses; selain itu pesan "tidak punya akses". */
export default function Wajib({ akses, children }) {
  const { boleh } = useAuth();
  if (boleh(akses)) return children;
  return (
    <div className="max-w-sm mx-auto text-center py-20">
      <Lock className="size-9 mx-auto text-brand-200" strokeWidth={1.5} />
      <h1 className="text-lg font-bold mt-3">Tidak punya akses</h1>
      <p className="text-sm text-muted mt-1">Halaman ini tidak termasuk hak akses akun Anda. Hubungi admin bila Anda memerlukannya.</p>
    </div>
  );
}
