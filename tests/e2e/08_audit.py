import sys, os, re, urllib.parse; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
def db(pg): return fs(pg)['db']
with sync_playwright() as p:
    b=p.chromium.launch(**BROWSER)
    ctx=b.new_context(viewport={"width":1400,"height":900}, storage_state=OUT+"/state2.json", accept_downloads=True); pg=ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.wait_for_timeout(900)
    def rename(path, old, new, label):
        pg.goto(BASE+path); pg.wait_for_timeout(600)
        if path=='/master/santri': pg.get_by_placeholder("Cari…").fill(old); pg.wait_for_timeout(200)
        pg.locator("table.ledger tbody tr", has_text=old).first.locator('button[title=Ubah]').click(); m=modal(pg)
        fld(m,label).fill(new); m.get_by_role("button",name="Simpan").click(); toast(pg,"disimpan"); pg.wait_for_timeout(700)
    rename('/master/akun','Pembayaran Syahriyah','Syahriyah Santri','Nama kategori')
    d=db(pg)
    print("akun cascade: kewajiban", [k['akun'] for k in d['kewajiban'].values() if k['nama'].startswith('Syah')],
          "tagihan", {t['akun'] for t in d['tagihan'].values() if t['kewajibanNama'].startswith('Syah')},
          "kas", {k['kategori'] for k in d['kas'].values() if k.get('kewajiban','').startswith('Syah')})
    rename('/master/santri','Aisyah Putri','Aisyah Putri Z','Nama santri')
    d=db(pg); print("santri cascade:", {t['santriNama'] for t in d['tagihan'].values() if t['santriKode']=='S0002'}, {x['santriNama'] for x in d['pembayaran'].values() if x['santriKode']=='S0002'})
    rename('/master/kewajiban','Syahriyah/SPP','Syahriyah','Nama kewajiban')
    d=db(pg); print("kewajiban cascade:", {t['kewajibanNama'] for t in d['tagihan'].values() if t['kewajibanId'] in [k for k,v in d['kewajiban'].items() if v['nama']=='Syahriyah']}, {k.get('kewajiban') for k in d['kas'].values() if k['sumber']=='pembayaran'})
    pg.goto(BASE+"/laporan/keuangan"); pg.wait_for_timeout(800); print("laporan has new akun:", "Syahriyah Santri" in pg.locator("main").inner_text(), "old:", "Pembayaran Syahriyah" in pg.locator("main").inner_text())
    # bulk: import 21 santri -> massal 25 in Oktober
    pg.goto(BASE+"/master/santri"); pg.wait_for_timeout(500); pg.get_by_role("button",name="Impor").click(); m=modal(pg)
    rows="\n".join(f"30{i:02d}\tSantri Uji {i}\tL\t\t\t\t\t\t\t0812{i:04d}\tKelas A\t2026" for i in range(21))
    m.locator("textarea").fill(rows); m.get_by_role("button", name=re.compile("Impor 21")).click(); toast(pg,"berhasil diimpor"); pg.wait_for_timeout(500)
    pg.goto(BASE+"/tagihan"); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Buat tagihan").first.click(); m=modal(pg); fld(m,"Bulan").select_option(label="Oktober"); pg.wait_for_timeout(600)
    print("massal:", m.locator(".bg-brand-50").inner_text()[:80])
    m.get_by_role("button", name=re.compile(r"Buat \d+ tagihan")).click(); toast(pg,"tagihan dibuat"); pg.wait_for_timeout(600)
    d=db(pg); okt=[t for t in d['tagihan'].values() if t['periodeKey']==202610]; nos=[t['no'] for t in d['tagihan'].values()]
    print("oktober tagihan:", len(okt), "unique numbers:", len(nos)==len(set(nos)), "counter:", d['counters']['tagihan-2026'])
    # >8 items: create 9 more tagihan for Umar (kewajiban K02..K09 + Kegiatan etc) in Oktober
    for kw in ["LKS","Daftar Ulang","Seragam","Ujian","Kegiatan","Administrasi","Buku","Wisuda","Uji Jenis kewajiban"]:
        pg.get_by_role("button", name="Buat tagihan").first.click(); m=modal(pg); m.get_by_role("button", name="Satu santri").click()
        m.get_by_placeholder("Ketik nama atau ID santri…").fill("Umar"); pg.keyboard.press("Enter"); fld(m,"Jenis kewajiban").select_option(label=kw)
        fld(m,"Bulan").select_option(label="Oktober"); pg.wait_for_timeout(350)
        if not fld(m,"Nominal per santri").input_value(): fld(m,"Nominal per santri").fill("5000")
        m.get_by_role("button", name=re.compile(r"Buat 1 tagihan")).click(); pg.wait_for_timeout(350)
    pg.goto(BASE+"/pembayaran"); pg.get_by_placeholder("Ketik nama atau ID santri…").fill("Umar"); pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
    print("umar open:", pg.locator("ul.divide-y li").count())
    pg.get_by_role("button",name="Pilih semua").click(); pg.wait_for_timeout(200)
    print("checked:", pg.locator("ul.divide-y li input[type=checkbox]:checked").count(), "disabled:", pg.locator("ul.divide-y li input[type=checkbox]:disabled").count(), "note:", pg.locator("text=Maksimal 8 tagihan").count())
    pg.get_by_role("button",name="Simpan pembayaran").click(); toast(pg,"Pembayaran disimpan"); pg.wait_for_timeout(400)
    d=db(pg); pay=sorted(d['pembayaran'].values(), key=lambda x:x['no'])[-1]; print("big payment items:", len(pay['items']), "kas docs:", sum(1 for k in d['kas'].values() if k.get('refId') in [pid for pid,x in d['pembayaran'].items() if x['no']==pay['no']]))
    # CSV injection
    pg.goto(BASE+"/master/santri"); pg.get_by_role("button",name="Tambah santri").click(); m=modal(pg); fld(m,"Nama santri").fill('=HYPERLINK("x")'); fld(m,"No. HP orang tua/wali").fill("812345678"); m.get_by_role("button",name="Simpan").click(); pg.wait_for_timeout(500)
    with pg.expect_download() as dl: pg.get_by_role("button", name="Ekspor Excel").click()
    import openpyxl; ws=openpyxl.load_workbook(__import__('shutil').copy(dl.value.path(), OUT+'/dl.xlsx')).active
    cells=[c for row in ws.iter_rows() for c in row if isinstance(c.value,str) and 'HYPERLINK' in c.value]
    print("xlsx inj:", cells[0].value, cells[0].data_type)
    print("wa 8xx:", pg.evaluate("import('/src/lib/format.js').then(m=>m.waLink('812345678','x'))"))
    # bendahara
    pg.locator('button[title=Keluar]').click(); pg.wait_for_timeout(400)
    pg.get_by_label("Email").fill("bend@tpq.id"); pg.get_by_label("Kata sandi").fill("rahasia2"); pg.get_by_role("button",name="Masuk").click(); pg.wait_for_timeout(1200)
    pg.goto(BASE+"/pembayaran"); pg.get_by_role("button",name="Riwayat").click(); pg.wait_for_timeout(600)
    pg.locator("table.ledger tbody tr", has_text="Ahmad Fauzi").locator('button[title=Ubah]').click(); m=modal(pg); pg.wait_for_timeout(400)
    inp=m.locator(".divide-y > div").first.locator("input"); inp.fill("0"); pg.wait_for_timeout(100)
    print("bendahara zero disabled:", m.get_by_role("button",name="Simpan perubahan").is_disabled(), "| note:", "hanya bisa dilakukan admin" in m.inner_text())
    inp.fill("40000"); m.get_by_role("button",name="Simpan perubahan").click(); toast(pg,"Pembayaran diperbarui")
    # bendahara name change self
    pg.goto(BASE+"/akun"); fld(pg.locator("main"),"Nama tampilan").fill("Bendahara Satu S"); pg.get_by_role("button",name="Simpan nama").click(); toast(pg,"Nama diperbarui")
    # bendahara tries settings (read-only) ok; direct delete via console should be denied by mock rules
    r=pg.evaluate("""import('/tests/mock/firestore.js').then(async f=>{ try{ await f.deleteDoc(f.doc({}, 'kas', 'x')); return 'allowed'}catch(e){return e.code}})""")
    print("bendahara raw delete:", r)
    print("ERRORS:", [e for e in errors if "permission" not in e.lower()]); b.close()
