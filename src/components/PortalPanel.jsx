import { useState } from 'react';
import { Link2, Copy, MessageCircle, RefreshCw, Link2Off } from 'lucide-react';
import { aktifkanPortal, nonaktifkanPortal, perbaruiPortalSantri, tautanPortal } from '../lib/portal';
import { kirimTeksWA } from '../lib/share';
import { useData } from '../lib/data';
import { Button, Panel, useAction, useToast } from './ui';

/** Kelola tautan portal wali untuk satu santri. */
export default function PortalPanel({ santri: s }) {
  const { settings } = useData();
  const { toast, confirm } = useToast();
  const [run, busy] = useAction();
  const [baru, setBaru] = useState('');
  const url = s.portalToken ? tautanPortal(s.portalToken) : baru;

  const salin = async (u) => {
    try { await navigator.clipboard.writeText(u); toast('Tautan disalin.'); } catch { toast(u); }
  };
  const pesan = (u) => `Assalamu'alaikum. Bapak/Ibu dapat memantau tagihan, riwayat pembayaran, hafalan, dan kehadiran ananda ${s.nama} melalui tautan berikut:\n${u}\n\nMohon tautan ini tidak dibagikan ke orang lain.\n${settings.nama}`;

  return (
    <Panel title="Portal wali" className="no-print">
      {url ? (
        <>
          <p className="text-sm text-muted">Wali bisa melihat tagihan, riwayat pembayaran, hafalan, dan kehadiran lewat tautan ini tanpa login. Data diperbarui otomatis.</p>
          <p className="mt-3 text-xs bg-paper border border-line rounded-lg px-3 py-2 break-all font-mono">{url}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" icon={Copy} onClick={() => salin(url)}>Salin</Button>
            <Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => kirimTeksWA(s.hp, pesan(url))}>Kirim ke wali</Button>
            <Button size="sm" variant="ghost" icon={RefreshCw} loading={busy} onClick={() => run(() => perbaruiPortalSantri(s.id), 'Portal diperbarui.')}>Perbarui</Button>
            <Button size="sm" variant="ghost" icon={Link2Off} onClick={async () => {
              if (await confirm({ title: 'Nonaktifkan portal?', text: 'Tautan lama tidak bisa dibuka lagi. Anda bisa membuat tautan baru kapan saja.', ok: 'Nonaktifkan', danger: true })) {
                run(async () => { await nonaktifkanPortal(s); setBaru(''); }, 'Portal dinonaktifkan.');
              }
            }}>Nonaktifkan</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Buat tautan khusus agar wali bisa memantau tagihan, pembayaran, hafalan, dan kehadiran ananda dari HP tanpa login.</p>
          <Button className="mt-3" icon={Link2} loading={busy} onClick={() => run(async () => { const u = await aktifkanPortal(s); setBaru(u); }, 'Portal wali aktif.')}>Buat tautan portal</Button>
        </>
      )}
    </Panel>
  );
}
