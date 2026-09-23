import { ArrowLeft, Printer, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui';

/** Bilah atas halaman cetak: tutup, kirim WhatsApp, cetak. Tidak ikut tercetak. */
export default function CetakBar({ label, onWa, onWaTeks, busy, hp }) {
  return (
    <div className="no-print sticky top-0 z-10 bg-brand-900 text-white px-4 min-h-14 py-2 flex flex-wrap items-center justify-between gap-2">
      <button onClick={() => window.close()} className="text-sm text-white/70 hover:text-white inline-flex items-center gap-2"><ArrowLeft className="size-4" />Tutup</button>
      <p className="text-sm font-semibold hidden sm:block">{label}</p>
      <div className="flex items-center gap-2">
        {onWaTeks && <button onClick={onWaTeks} className="text-xs text-white/70 hover:text-white underline-offset-2 hover:underline">Kirim teks saja</button>}
        {onWa && <Button size="sm" variant="secondary" className="!bg-[#25D366] !text-white !border-transparent hover:!bg-[#1ebe5b]" icon={busy ? Loader2 : MessageCircle} disabled={busy} onClick={onWa}>
          {hp ? 'Kirim ke WhatsApp' : 'Kirim ke WhatsApp'}
        </Button>}
        <Button variant="brass" size="sm" icon={Printer} onClick={() => window.print()}>Cetak</Button>
      </div>
    </div>
  );
}
