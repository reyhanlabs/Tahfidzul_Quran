"""Tarif khusus jenis kewajiban: SPP per angkatan, LKS per kelas (Rp0 = tidak dikenai)."""
import sys, os, re; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
def db(pg): return fs(pg)['db']

def ubah_kewajiban(pg, nama):
    pg.goto(BASE+"/master/kewajiban"); pg.wait_for_timeout(600)
    pg.locator("table.ledger tbody tr", has_text=nama).first.locator('button[title=Ubah]').click()
    return modal(pg)

def harap(s, kw, kelas_id):
    """Nominal yang seharusnya untuk santri s (tarif, lalu keringanan)."""
    dasar = kw.get('dasarTarif', 'tetap'); base = kw['nominal']
    kunci = str(s.get('tahunMasuk') or '') if dasar == 'angkatan' else kelas_id.get(s.get('kelas'), '')
    for t in kw.get('tarif', []):
        if str(t['kunci']) == kunci: base = t['nominal']
    for k in s.get('keringanan', []):
        if k['kewajibanId'] == kw['id'] and float(k['nilai']) > 0:
            pot = round(base * min(100, float(k['nilai'])) / 100) if k['tipe'] == 'persen' else min(base, round(float(k['nilai'])))
            base -= pot
    return base

with sync_playwright() as p:
    b = p.chromium.launch(**BROWSER)
    ctx = b.new_context(viewport={"width": 1400, "height": 900}, storage_state=OUT+"/state3.json"); pg = ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.wait_for_timeout(1500)

    # 1. SPP per angkatan
    m = ubah_kewajiban(pg, "Syahriyah/SPP")
    m.locator("select").filter(has=pg.locator("option[value=angkatan]")).select_option("angkatan"); pg.wait_for_timeout(200)
    m.get_by_label("Tarif Angkatan 2025").fill("75000")
    m.get_by_label("Tarif Angkatan 2024").fill("60000")
    m.get_by_label("Tahun angkatan baru").fill("2027"); m.get_by_role("button", name="Tambah angkatan").click()
    m.get_by_label("Tarif Angkatan 2027").fill("90000")
    m.get_by_role("button", name="Simpan").click(); toast(pg, "disimpan"); pg.wait_for_timeout(400)
    import datetime; ini = str(datetime.date.today().year)
    baris = lambda: pg.locator("table.ledger tbody tr", has_text="Syahriyah/SPP").first.inner_text().replace("\xa0", " ")
    row = baris(); print("kolom SPP (tahun berjalan):", row.replace("\n", " | "))
    assert f"Angkatan {ini}" in row and "Per angkatan" in row and "2025" not in row
    pg.get_by_label("Tarif angkatan", exact=True).select_option("2025"); pg.wait_for_timeout(200)
    row = baris(); print("kolom SPP 2025:", row.replace("\n", " | ")); assert "Rp 75.000" in row and "Angkatan 2025" in row
    pg.get_by_label("Tarif angkatan", exact=True).select_option("2027"); pg.wait_for_timeout(200)
    assert "Rp 90.000" in baris()

    # 2. LKS per kelas: Kelas A 30rb, Tahfidz A tidak dikenai, lainnya default
    m = ubah_kewajiban(pg, "LKS")
    m.locator("select").filter(has=pg.locator("option[value=kelas]")).select_option("kelas"); pg.wait_for_timeout(200)
    m.get_by_label("Tarif Kelas A", exact=True).fill("30000")
    m.get_by_label("Tarif Tahfidz A", exact=True).fill("0")
    m.get_by_role("button", name="Simpan").click(); toast(pg, "disimpan"); pg.wait_for_timeout(400)
    lks = lambda: pg.locator("table.ledger tbody tr", has_text="LKS").first.inner_text().replace("\xa0", " ")
    print("kolom LKS semua kelas:", lks().replace("\n", " | ")); assert "Rp 25.000 – Rp 30.000" in lks() and "2 kelas diatur" in lks()
    pg.get_by_label("Tarif semua kelas", exact=True).select_option("Kelas A"); pg.wait_for_timeout(200); assert "Rp 30.000" in lks()
    pg.get_by_label("Tarif semua kelas", exact=True).select_option("Tahfidz A"); pg.wait_for_timeout(200); assert "Tidak dikenai" in lks()

    d = db(pg); kw = {k['nama']: {**k, 'id': i} for i, k in d['kewajiban'].items()}
    print("tarif SPP:", kw['Syahriyah/SPP'].get('dasarTarif'), kw['Syahriyah/SPP'].get('tarif'))
    print("tarif LKS:", kw['LKS'].get('dasarTarif'), kw['LKS'].get('tarif'))
    assert kw['Syahriyah/SPP']['dasarTarif'] == 'angkatan' and len(kw['Syahriyah/SPP']['tarif']) == 3
    kelas_id = {k['nama']: i for i, k in d['kelas'].items()}
    aktif = [{**s, 'id': i} for i, s in d['santri'].items() if s['status'] == 'Aktif']

    # 3. Buat tagihan SPP Maret 2027 → rincian per angkatan
    pg.goto(BASE+"/tagihan"); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Buat tagihan").first.click(); m = modal(pg)
    fld(m, "Jenis kewajiban").select_option(label="Syahriyah/SPP")
    fld(m, "Bulan").select_option(label="Maret"); fld(m, "Tahun").fill("2027"); pg.wait_for_timeout(900)
    assert m.get_by_test_id("nominal-tarif").count() == 1
    rinci = m.get_by_test_id("rincian-tarif").inner_text(); print("rincian SPP:", rinci.replace("\n", " | "))
    assert "Angkatan 2025" in rinci and "75.000" in rinci
    # filter angkatan
    fld(m, "Angkatan (tahun masuk)").select_option("2024"); pg.wait_for_timeout(300)
    print("tombol filter 2024:", m.get_by_role("button", name=re.compile(r"Buat \d+ tagihan")).inner_text())
    fld(m, "Angkatan (tahun masuk)").select_option(""); pg.wait_for_timeout(300)
    m.get_by_role("button", name=re.compile(r"Buat \d+ tagihan")).click(); toast(pg, "tagihan dibuat"); pg.wait_for_timeout(500)

    d = db(pg)
    spp = {t['santriId']: t['nominal'] for t in d['tagihan'].values() if t['periodeKey'] == 202703 and t['kewajibanId'] == kw['Syahriyah/SPP']['id']}
    salah = [(s['nama'], s.get('tahunMasuk'), spp.get(s['id']), harap(s, kw['Syahriyah/SPP'], kelas_id)) for s in aktif if spp.get(s['id']) != harap(s, kw['Syahriyah/SPP'], kelas_id)]
    print("SPP 2027-03:", {s['nama']: spp.get(s['id']) for s in aktif}, "salah:", salah); assert not salah and len(spp) == len(aktif)

    # 4. Tagihan LKS Maret 2027 → Tahfidz A dilewati (Rp0)
    pg.get_by_role("button", name="Buat tagihan").first.click(); m = modal(pg)
    fld(m, "Jenis kewajiban").select_option(label="LKS")
    fld(m, "Bulan").select_option(label="Maret"); fld(m, "Tahun").fill("2027"); pg.wait_for_timeout(900)
    info = m.locator("div.rounded-lg.bg-brand-50").inner_text(); print("info LKS:", info.replace("\n", " | "))
    assert "tidak dikenai" in info
    m.get_by_role("button", name=re.compile(r"Buat \d+ tagihan")).click(); toast(pg, "tagihan dibuat"); pg.wait_for_timeout(500)
    d = db(pg)
    lks = {t['santriId']: t['nominal'] for t in d['tagihan'].values() if t['periodeKey'] == 202703 and t['kewajibanId'] == kw['LKS']['id']}
    exp = {s['id']: harap(s, kw['LKS'], kelas_id) for s in aktif}
    exp = {k: v for k, v in exp.items() if not (v == 0 and any(str(t['kunci']) == kelas_id.get(next(s for s in aktif if s['id'] == k).get('kelas')) for t in kw['LKS']['tarif']))}
    print("LKS 2027-03:", {s['nama']: lks.get(s['id']) for s in aktif}); assert lks == exp

    # 5. Matikan "ikuti tarif" → satu nominal sama
    pg.get_by_role("button", name="Buat tagihan").first.click(); m = modal(pg)
    fld(m, "Jenis kewajiban").select_option(label="Syahriyah/SPP")
    fld(m, "Bulan").select_option(label="April"); fld(m, "Tahun").fill("2027"); pg.wait_for_timeout(900)
    m.get_by_label(re.compile("Ikuti tarif per angkatan")).uncheck(); pg.wait_for_timeout(200)
    assert fld(m, "Nominal per santri").input_value() == "50.000", fld(m, "Nominal per santri").input_value()
    m.get_by_role("button", name="Batal").click(); pg.wait_for_timeout(300)

    # 6. Tagihan bulanan menampilkan rincian tarif
    pg.get_by_role("button", name="Tagihan bulanan").click(); m = modal(pg)
    fld(m, "Bulan").select_option(label="April"); fld(m, "Tahun").fill("2027"); pg.wait_for_timeout(900)
    baris = m.locator(".divide-y label", has_text="Syahriyah").inner_text(); print("bulanan SPP:", baris.replace("\n", " | "))
    assert "tarif per angkatan" in baris and "Angkatan 2025: Rp" in baris.replace("\xa0", " ")
    m.get_by_role("button", name="Batal").click()

    # 7. Kembali ke tarif sama → daftar tarif dikosongkan
    m = ubah_kewajiban(pg, "LKS")
    m.locator("select").filter(has=pg.locator("option[value=kelas]")).select_option("tetap")
    m.get_by_role("button", name="Simpan").click(); toast(pg, "disimpan"); pg.wait_for_timeout(400)
    l = next(k for k in db(pg)['kewajiban'].values() if k['nama'] == 'LKS'); print("LKS kembali:", l.get('dasarTarif'), l.get('tarif'))
    assert l['dasarTarif'] == 'tetap' and l['tarif'] == []
    # 8. Data santri: kolom & filter angkatan
    pg.goto(BASE+"/master/santri"); pg.wait_for_timeout(700)
    head = pg.locator("table.ledger thead").inner_text(); assert "Angkatan" in head, head
    sel = pg.locator("main select").filter(has=pg.locator("option", has_text="Semua angkatan"))
    sel.select_option("2025"); pg.wait_for_timeout(300)
    nama = pg.locator("table.ledger tbody tr").all_inner_texts(); print("angkatan 2025:", [n.split("\n")[1] if "\n" in n else n for n in nama])
    assert len(nama) == 1 and "2025" in nama[0]
    sel.select_option("__kosong"); pg.wait_for_timeout(300)
    kosong = pg.locator("table.ledger tbody tr").all_inner_texts(); print("belum diisi:", len(kosong)); assert len(kosong) == 1 and "belum diisi" in kosong[0]
    pg.locator("table.ledger tbody tr").first.locator('button[title=Ubah]').click(); m = modal(pg)
    fld(m, "Angkatan (tahun masuk)").fill("2026"); m.get_by_role("button", name="Simpan").click(); toast(pg, "disimpan"); pg.wait_for_timeout(400)
    print("sisa belum diisi:", pg.locator("table.ledger tbody tr").count())
    pg.screenshot(path=OUT+"/tarif.png")
    print("ERRORS:", [e for e in errors]); ctx.storage_state(path=OUT+"/state4.json"); b.close()
