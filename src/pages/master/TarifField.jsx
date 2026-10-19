import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Input, Select, MoneyInput } from '../../components/ui';
import { rupiah } from '../../lib/format';
import { DASAR_TARIF, dasarDari } from '../../lib/tarif';

/**
 * Editor tarif khusus jenis kewajiban.
 * Angkatan: satu baris per tahun masuk (diambil dari santri aktif + yang ditambahkan manual).
 * Kelas   : satu baris per kelas.
 * Kosong = memakai nominal default. Rp0 = tidak dikenai.
 */
export default function TarifField({ value, onChange, data }) {
  const dasar = dasarDari(value);
  const tarif = Array.isArray(value.tarif) ? value.tarif : [];
  const [tahunBaru, setTahunBaru] = useState('');
  const def = Number(value.nominal) || 0;

  const nilai = (kunci) => tarif.find((t) => String(t.kunci) === String(kunci))?.nominal ?? '';
  const setNilai = (kunci, n) => {
    const lain = tarif.filter((t) => String(t.kunci) !== String(kunci));
    onChange({ tarif: n === '' ? lain : [...lain, { kunci: String(kunci), nominal: n }] });
  };

  const aktif = data.santri.filter((s) => s.status === 'Aktif');
  let baris = [];
  if (dasar === 'angkatan') {
    const tahun = new Set([
      ...aktif.map((s) => s.tahunMasuk).filter(Boolean).map(String),
      ...tarif.map((t) => String(t.kunci)),
    ]);
    baris = [...tahun].sort().reverse().map((th) => ({
      kunci: th, label: `Angkatan ${th}`, jumlah: aktif.filter((s) => String(s.tahunMasuk) === th).length,
    }));
  } else if (dasar === 'kelas') {
    baris = data.kelas.map((k) => ({ kunci: k.id, label: k.nama, jumlah: aktif.filter((s) => s.kelas === k.nama).length }));
  }
  const tanpaKunci = dasar === 'angkatan' ? aktif.filter((s) => !s.tahunMasuk).length
    : dasar === 'kelas' ? aktif.filter((s) => !data.kelas.some((k) => k.nama === s.kelas)).length : 0;

  const tambahTahun = () => {
    const th = String(tahunBaru).trim();
    if (!/^\d{4}$/.test(th)) return;
    if (!tarif.some((t) => String(t.kunci) === th)) onChange({ tarif: [...tarif, { kunci: th, nominal: def }] });
    setTahunBaru('');
  };

  return (
    <div className="space-y-3">
      <Select value={dasar} options={DASAR_TARIF}
        onChange={(e) => onChange({ dasarTarif: e.target.value, tarif: e.target.value === dasar ? tarif : [] })} />
      {dasar === 'tetap' && <p className="text-xs text-muted">Semua santri ditagih sebesar nominal default. Pilih "per angkatan" untuk SPP yang tetap sejak masuk, atau "per kelas" untuk LKS/kegiatan.</p>}
      {dasar !== 'tetap' && (
        <div className="rounded-lg border border-line">
          <div className="px-3 py-2 text-xs text-muted border-b border-line bg-paper rounded-t-lg">
            Kosongkan untuk memakai nominal default ({rupiah(def)}). Isi <b>0</b> bila {dasar === 'kelas' ? 'kelas' : 'angkatan'} tersebut tidak dikenai.
          </div>
          {baris.length === 0 && <p className="px-3 py-3 text-sm text-muted">{dasar === 'kelas' ? 'Belum ada data kelas.' : 'Belum ada santri aktif dengan tahun masuk. Tambahkan angkatan di bawah.'}</p>}
          <div className="divide-y divide-line">
            {baris.map((b) => {
              const v = nilai(b.kunci);
              return (
                <div key={b.kunci} className="flex items-center gap-3 px-3 py-2" data-tarif={b.label}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.label}</p>
                    <p className="text-xs text-muted">{b.jumlah} santri aktif{v === '' ? ' · default' : Number(v) === 0 ? ' · tidak dikenai' : ''}</p>
                  </div>
                  <div className="w-40"><MoneyInput value={v} placeholder={String(def).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} onChange={(n) => setNilai(b.kunci, n)} aria-label={`Tarif ${b.label}`} /></div>
                </div>
              );
            })}
          </div>
          {dasar === 'angkatan' && (
            <div className="flex gap-2 px-3 py-2 border-t border-line">
              <Input type="number" className="w-32" value={tahunBaru} placeholder="Tahun, mis. 2027" onChange={(e) => setTahunBaru(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); tambahTahun(); } }} aria-label="Tahun angkatan baru" />
              <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={tambahTahun} disabled={!/^\d{4}$/.test(String(tahunBaru))}>Tambah angkatan</Button>
            </div>
          )}
          {tanpaKunci > 0 && <p className="px-3 py-2 text-xs text-brass-700 border-t border-line">{tanpaKunci} santri aktif belum punya {dasar === 'kelas' ? 'kelas' : 'tahun masuk'} — mereka memakai nominal default.</p>}
        </div>
      )}
    </div>
  );
}
