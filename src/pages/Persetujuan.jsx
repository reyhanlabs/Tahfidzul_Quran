import { useState } from 'react';
import { PageHeader, Toolbar, cx } from '../components/ui';
import { RangePicker } from '../components/Periode';
import { DaftarPengajuan } from '../components/Pengajuan';
import { useData } from '../lib/data';
import { rupiah, awalBulan, akhirBulan } from '../lib/format';

export default function Persetujuan() {
  const { settings } = useData();
  const [tab, setTab] = useState('menunggu');
  const n = new Date();
  const [dari, setDari] = useState(awalBulan(n.getFullYear(), n.getMonth() + 1));
  const [sampai, setSampai] = useState(akhirBulan(n.getFullYear(), n.getMonth() + 1));
  const p = settings.persetujuan || {};
  return (
    <>
      <PageHeader help="persetujuan" title="Persetujuan pengeluaran"
        description={p.aktif ? `Pengeluaran di atas ${rupiah(p.batas || 0)} wajib disetujui sebelum tercatat di buku kas.` : 'Fitur persetujuan sedang tidak aktif (atur di Pengaturan). Pengajuan yang masih ada tetap bisa diputuskan.'}>
        <div className="inline-flex p-1 bg-white rounded-lg border border-line">
          {[['menunggu', 'Menunggu'], ['riwayat', 'Semua pengajuan']].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} className={cx('px-4 h-9 rounded-md text-sm font-semibold', tab === v ? 'bg-brand-700 text-white' : 'text-muted hover:text-ink')}>{l}</button>
          ))}
        </div>
      </PageHeader>
      {tab === 'riwayat' && <Toolbar><RangePicker dari={dari} sampai={sampai} onChange={(a, b) => { setDari(a); setSampai(b); }} /></Toolbar>}
      <DaftarPengajuan mode="penyetuju" hanyaMenunggu={tab === 'menunggu'} dari={dari} sampai={sampai} />
    </>
  );
}
