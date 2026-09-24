import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
with sync_playwright() as p:
    b=p.chromium.launch(**BROWSER)
    ctx=b.new_context(viewport={"width":1400,"height":900}); pg=ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(800)
    # SETUP
    expect(pg.get_by_role("heading", name="Setup awal")).to_be_visible()
    pg.get_by_label("Nama lembaga").fill("TPQ Nurul Ilmi")
    pg.get_by_label("Nama Anda").fill("Siti Aminah")
    pg.get_by_label("Email").fill("admin@tpq.id"); pg.get_by_label("Kata sandi").fill("rahasia1")
    pg.get_by_role("button", name="Buat akun admin").click()
    expect(pg.get_by_text("Ringkasan")).to_be_visible(timeout=15000)
    d=fs(pg)['db']; print("seed:", {k:len(v) for k,v in d.items()})
    # menu order
    groups=pg.locator('aside nav p').all_inner_texts(); print("menu:", groups)
    # MASTER USTADZ - type in NIP (bug check)
    nav(pg,"Ustadz")
    pg.get_by_role("button", name="Tambah ustadz/ustadzah").click()
    m=modal(pg)
    m.get_by_label("Nama").first.fill("Ahmad Syauqi")
    nip=m.get_by_label("NIP / ID"); nip.click(); pg.keyboard.type("UST-001", delay=40)
    assert nip.input_value()=="UST-001", "NIP typing bug: "+nip.input_value()
    assert m.get_by_label("Nama").first.input_value()=="Ahmad Syauqi"
    m.get_by_label("Jabatan").fill("Kepala TPQ")
    m.get_by_label("Tarif honor").fill("1000000")
    m.get_by_role("button", name="Simpan").click(); toast(pg,"disimpan")
    for nama,tarif in [("Fatimah Az-Zahra","750000"),("Hasan Ali","750000")]:
        pg.get_by_role("button", name="Tambah ustadz/ustadzah").click(); m=modal(pg)
        m.get_by_label("Nama").first.fill(nama); m.get_by_label("Tarif honor").fill(tarif)
        m.get_by_role("button", name="Simpan").click(); pg.wait_for_timeout(400)
    rows=pg.locator("table.ledger tbody tr"); print("ustadz rows:", rows.count(), rows.first.inner_text().replace("\n"," | "))
    # edit ustadz
    rows.filter(has_text="Hasan Ali").locator('button[title=Ubah]').click(); m=modal(pg)
    m.get_by_label("Jabatan").fill("Pengajar Tahfidz"); m.get_by_role("button",name="Simpan").click(); pg.wait_for_timeout(400)
    assert "Pengajar Tahfidz" in pg.locator("table.ledger").inner_text()
    # delete ustadz (no refs)
    rows.filter(has_text="Hasan Ali").locator('button[title=Hapus]').click()
    modal(pg).get_by_role("button",name="Hapus").click(); toast(pg,"dihapus"); pg.wait_for_timeout(300)
    assert "Hasan Ali" not in pg.locator("table.ledger").inner_text()
    # MASTER KELAS rename cascade later; add kelas
    nav(pg,"Kelas")
    print("kelas:", pg.locator("table.ledger tbody tr").count())
    # SANTRI add via form
    nav(pg,"Santri")
    pg.get_by_role("button", name="Tambah santri").click(); m=modal(pg)
    m.get_by_label("Nama santri").fill("Ahmad Fauzi")
    m.get_by_label("NIS", exact=True).click(); pg.keyboard.type("2026001", delay=30)
    assert m.get_by_label("NIS", exact=True).input_value()=="2026001"
    m.get_by_label("Kelas / kelompok").select_option("Kelas A")
    m.get_by_label("Jenis kelamin").select_option("Laki-laki")
    m.get_by_label("Nama ayah").fill("Budi"); m.get_by_label("No. HP orang tua/wali").fill("081200000001")
    m.get_by_role("button",name="Simpan").click(); toast(pg,"disimpan")
    # required validation
    pg.get_by_role("button", name="Tambah santri").click(); m=modal(pg)
    m.get_by_role("button",name="Simpan").click(); toast(pg,"wajib diisi"); m.get_by_role("button",name="Batal").click()
    # IMPORT
    pg.get_by_role("button", name="Impor").click(); m=modal(pg)
    data="\n".join([
      "NIS\tNama\tJK","2026002\tAisyah Putri\tP\tJakarta\t02/07/2016\tJl. Mawar\tHendra\tLina\t\t081200000002\tKelas A\t2025",
      "2026003\tMuhammad Rizki\tL\tBekasi\t20/01/2015\tJl. Kenanga\tJoko\tSari\t\t081200000003\tKelas B\t2024",
      "2026004\tZahra Nabila\tP\tBogor\t05/11/2015\t\tDedi\tMaya\t\t081200000004\tKelas B\t2024",
      "2026005\tUmar Faruq\tL\tBekasi\t17/04/2014\t\tAnton\tWati\t\t081200000005\tKelas Baru X\t2023"])
    m.locator("textarea").fill(data); pg.wait_for_timeout(200)
    print("import text:", m.locator("p.text-sm").last.inner_text())
    m.get_by_role("button", name=re.compile("Impor 4")).click(); toast(pg,"berhasil diimpor"); pg.wait_for_timeout(500)
    print("santri rows:", pg.locator("table.ledger tbody tr").count())
    d=fs(pg)['db']; print("santri kode:", sorted(x['kode'] for x in d['santri'].values()), "kelas:", sorted(x['nama'] for x in d['kelas'].values()))
    print("tgl lahir import:", [x.get('tanggalLahir') for x in d['santri'].values()])
    # Search + filter
    pg.get_by_placeholder("Cari…").fill("zahra"); pg.wait_for_timeout(200)
    print("search zahra:", pg.locator("table.ledger tbody tr").count()); pg.get_by_placeholder("Cari…").fill("")
    # rename kelas cascade
    nav(pg,"Kelas")
    pg.locator("table.ledger tbody tr", has_text="Kelas Baru X").locator('button[title=Ubah]').click(); m=modal(pg)
    m.get_by_label("Nama kelas / kelompok").fill("Tahfidz A"); m.get_by_role("button",name="Simpan").click(); pg.wait_for_timeout(600)
    d=fs(pg)['db']; print("umar kelas after rename:", [x['kelas'] for x in d['santri'].values() if x['nama']=='Umar Faruq'])
    print("kelas table:", pg.locator("table.ledger tbody tr", has_text="Tahfidz A").inner_text().replace("\n"," | "))
    # kewajiban/komponen/akun edit
    for label, btn in [("Jenis kewajiban","Tambah jenis kewajiban"),("Komponen gaji","Tambah komponen"),("Kategori kas","Tambah kategori")]:
        nav(pg,label); n0=pg.locator("table.ledger tbody tr").count()
        pg.get_by_role("button", name=btn).click(); m=modal(pg)
        m.locator("input").first.fill("Uji "+label)
        if label=="Jenis kewajiban": m.get_by_label("Nominal default").fill("15000"); m.get_by_label("Kategori kas (pemasukan)").select_option("Donasi")
        m.get_by_role("button",name="Simpan").click(); pg.wait_for_timeout(400)
        print(label, n0, "->", pg.locator("table.ledger tbody tr").count())
    # nonaktif santri
    nav(pg,"Santri")
    pg.locator("table.ledger tbody tr", has_text="Zahra Nabila").locator('button[title=Ubah]').click(); m=modal(pg)
    fld(m,"Status").select_option("Nonaktif"); m.get_by_role("button",name="Simpan").click(); pg.wait_for_timeout(400)
    print("aktif rows:", pg.locator("table.ledger tbody tr").count())
    # CSV export
    with pg.expect_download() as dl: pg.get_by_role("button", name="Ekspor Excel").click()
    import openpyxl; wb=openpyxl.load_workbook(__import__('shutil').copy(dl.value.path(), OUT+'/dl.xlsx')); ws=wb.active
    print("xlsx:", [c.value for c in ws[1]][:5], [c.value for c in ws[2]][:5])
    ctx.storage_state(path=OUT+"/state.json")
    print("ERRORS:", errors)
    b.close()
