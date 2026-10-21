import { useState } from 'react';
import { PageHeader, Toolbar, Tabs } from '../components/ui';
import { RangePicker, useRentangBulanIni } from '../components/Periode';
import { DaftarPengajuan } from '../components/Pengajuan';
import { useData } from '../lib/data';
import { rupiah } from '../lib/format';

export default function Persetujuan() {
  const { settings } = useData();
  const [tab, setTab] = useState('menunggu');
  const [dari, sampai, setRentang] = useRentangBulanIni();
  const p = settings.persetujuan || {};
  return (
    <>
      <PageHeader help="persetujuan" title="Persetujuan pengeluaran"
        description={p.aktif ? `Pengeluaran di atas ${rupiah(p.batas || 0)} wajib disetujui sebelum tercatat di buku kas.` : 'Fitur persetujuan sedang tidak aktif (atur di Pengaturan). Pengajuan yang masih ada tetap bisa diputuskan.'}>
        <Tabs items={[['menunggu', 'Menunggu'], ['riwayat', 'Semua pengajuan']]} value={tab} onChange={setTab} />
      </PageHeader>
      {tab === 'riwayat' && <Toolbar><RangePicker dari={dari} sampai={sampai} onChange={setRentang} /></Toolbar>}
      <DaftarPengajuan mode="penyetuju" hanyaMenunggu={tab === 'menunggu'} dari={dari} sampai={sampai} />
    </>
  );
}
