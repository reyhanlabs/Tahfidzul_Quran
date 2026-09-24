import sys, os, re, json; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
def db(pg): return fs(pg)['db']
with sync_playwright() as p:
    b=p.chromium.launch(**BROWSER)
    ctx=b.new_context(viewport={"width":1400,"height":900}, storage_state=OUT+"/state3.json", accept_downloads=True); pg=ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.wait_for_timeout(1000); main=pg.locator("main")
    today=pg.evaluate("(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})()")
    # --- hafalan
    nav(pg,"Setoran hafalan"); pg.wait_for_timeout(500)
    def setoran(nama, surat, a, bb, nilai="Mumtaz", jenis=None):
        pg.get_by_role("button",name="Catat setoran").click(); m=modal(pg)
        m.get_by_placeholder("Ketik nama atau ID santri…").fill(nama); pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
        if jenis: fld(m,"Jenis").select_option(jenis)
        sug=(fld(m,"Surat").input_value(), fld(m,"Dari ayat").input_value())
        fld(m,"Surat").select_option(str(surat)); fld(m,"Dari ayat").fill(str(a)); fld(m,"Sampai ayat").fill(str(bb)); fld(m,"Nilai").select_option(nilai)
        fld(m,"Penyimak").select_option(index=1)
        m.get_by_role("button",name="Simpan").click(); toast(pg,"Setoran disimpan"); pg.wait_for_timeout(500); return sug
    setoran("Ahmad", 78, 1, 10)
    sug=setoran("Ahmad", 78, 11, 20); print("suggest after 1-10:", sug)
    setoran("Ahmad", 78, 21, 40, nilai="Ulang")
    setoran("Ahmad", 1, 1, 7, jenis="Muraja'ah")
    # invalid range
    pg.get_by_role("button",name="Catat setoran").click(); m=modal(pg); m.get_by_placeholder("Ketik nama atau ID santri…").fill("Aisyah"); pg.keyboard.press("Enter")
    fld(m,"Surat").select_option("114"); fld(m,"Sampai ayat").fill("9"); print("invalid msg:", m.locator("text=Rentang ayat tidak valid").count()); m.get_by_role("button",name="Simpan").click(); toast(pg,"tidak valid"); m.get_by_role("button",name="Batal").click()
    print("list today:", pg.locator("table.ledger tbody tr").count())
    rk=[r for r in db(pg)['hafalanRingkas'].values() if r['santriNama']=='Ahmad Fauzi'][0]; print("ringkas:", rk['totalAyat'], rk['perJuz'][29], rk['terakhir'], rk['jumlahSetoran'])
    pg.get_by_role("button",name="Progres santri").click(); pg.wait_for_timeout(500)
    print("progres row:", pg.locator("table.ledger tbody tr").first.inner_text().replace("\n"," | "))
    pg.locator("table.ledger tbody tr").first.click(); pg.wait_for_timeout(500); print("detail juz30 title:", modal(pg).locator("[title^='Juz 30']").get_attribute("title")); pg.screenshot(path=OUT+"/hafalan.png"); modal(pg).get_by_label("Tutup").click()
    # --- absensi
    nav(pg,"Absensi"); pg.wait_for_timeout(600)
    lis=main.locator("ul.divide-y li"); print("absen kelas A:", lis.count())
    lis.nth(1).get_by_role("radio", name=re.compile("")).nth(2).click()  # S
    pg.get_by_role("button",name="Simpan absensi").click(); toast(pg,"Absensi disimpan")
    fld(main,"Untuk").select_option("ustadz"); pg.wait_for_timeout(600); pg.get_by_role("button",name=re.compile("Simpan")).last.click(); toast(pg,"Absensi disimpan")
    pg.get_by_role("button",name="Rekap bulanan").click(); pg.wait_for_timeout(600); print("rekap santri:", pg.locator("table.ledger tbody").inner_text().replace("\n"," | ")[:160])
    # --- komponen per hadir + slip
    pg.goto(BASE+"/master/komponen"); pg.wait_for_timeout(400); pg.get_by_role("button",name="Tambah komponen").click(); m=modal(pg)
    fld(m,"Nama komponen").fill("Honor per pertemuan"); fld(m,"Nominal default").fill("25000"); fld(m,"Dikalikan jumlah hadir (absensi ustadz)").select_option("Ya"); m.get_by_role("button",name="Simpan").click(); toast(pg,"disimpan")
    pg.goto(BASE+"/gaji"); pg.wait_for_timeout(500); pg.get_by_role("button",name="Buat slip gaji").first.click(); m=modal(pg)
    fld(m,"Ustadz / ustadzah").select_option(label="Fatimah Az-Zahra"); pg.wait_for_timeout(800)
    print("perhadir item:", m.locator(".divide-y > div", has_text="Honor per pertemuan").inner_text().replace("\n"," | "))
    m.get_by_role("button",name="Simpan slip").click(); toast(pg,"Slip gaji disimpan"); pg.wait_for_timeout(300)
    print("slip items:", [i['nama'] for g in db(pg)['gaji'].values() if g['ustadzNama'].startswith('Fatimah') for i in g['items']])
    # --- rapor
    pg.goto(BASE+"/rapor"); pg.wait_for_timeout(500); pg.get_by_placeholder("Ketik nama atau ID santri…").fill("Ahmad"); pg.keyboard.press("Enter"); pg.wait_for_timeout(1500)
    art=main.locator("article"); print("rapor:", art.inner_text().replace("\n"," | ")[:420])
    fld(main,"Catatan ustadz/ustadzah").fill("Hafalan lancar, tingkatkan tajwid."); pg.get_by_role("button",name="Simpan isian").click(); toast(pg,"Isian rapor disimpan")
    pg.pdf(path=OUT+"/rapor.pdf", prefer_css_page_size=True)
    # --- portal
    pg.goto(BASE+"/laporan/kartu-santri"); pg.get_by_placeholder("Ketik nama atau ID santri…").fill("Ahmad"); pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
    pg.get_by_role("button",name="Buat tautan portal").click(); toast(pg,"Portal wali aktif"); pg.wait_for_timeout(600)
    url=main.locator("p.font-mono").inner_text(); print("portal url:", url[:40])
    ctx2=b.new_context(viewport={"width":390,"height":844}); pp=ctx2.new_page(); attach(pp,"portal")
    pp.goto(BASE); pp.evaluate("s=>localStorage.setItem('__mockfs__', s)", json.dumps({**fs(pg), 'current': None})); pp.goto(url); pp.wait_for_timeout(1500)
    print("portal:", pp.locator("main").inner_text().replace("\n"," | ")[:300]); pp.screenshot(path=OUT+"/portal.png", full_page=True)
    pp.goto(BASE+"/wali/salah-token-123"); pp.wait_for_timeout(1000); print("bad token:", pp.locator("p.text-lg").inner_text())
    # payment -> portal auto refresh
    pg.goto(BASE+"/pembayaran"); pg.get_by_placeholder("Ketik nama atau ID santri…").fill("Ahmad"); pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    before=[v['totalSisa'] for v in db(pg)['portal'].values()][0]
    pg.locator("ul.divide-y li").first.locator("input[type=checkbox]").check(); pg.get_by_role("button",name="Simpan pembayaran").click(); toast(pg,"Pembayaran disimpan"); pg.wait_for_timeout(1500)
    print("portal sisa:", before, "->", [v['totalSisa'] for v in db(pg)['portal'].values()][0])
    # --- log
    pg.goto(BASE+"/log"); pg.wait_for_timeout(800); print("log rows:", pg.locator("table.ledger tbody tr").count(), "|", pg.locator("table.ledger tbody tr").first.inner_text().replace("\n"," | ")[:120])
    # --- cadangan
    pg.goto(BASE+"/pengaturan"); pg.wait_for_timeout(500)
    with pg.expect_download() as dl: pg.get_by_role("button",name="Unduh cadangan").click()
    import shutil; shutil.copy(dl.value.path(), OUT+"/cadangan.json"); c=json.load(open(OUT+"/cadangan.json")); print("backup:", {k: len(v) for k,v in c['data'].items() if v})
    with pg.expect_download() as dl2: pg.get_by_role("button",name="Versi Excel").click()
    import openpyxl; wb=openpyxl.load_workbook(shutil.copy(dl2.value.path(), OUT+"/cad.xlsx")); print("excel sheets:", wb.sheetnames[:8])
    # restore: delete a santri field then restore
    pg.evaluate("()=>{const st=JSON.parse(localStorage.getItem('__mockfs__')); const k=Object.keys(st.db.pengeluaran||{}); for (const [id,d] of Object.entries(st.db.kas)) if(d.sumber==='pengeluaran'){ d.keterangan='RUSAK'; } localStorage.setItem('__mockfs__', JSON.stringify(st));}")
    pg.locator("input[type=file]").set_input_files(OUT+"/cadangan.json"); pg.wait_for_timeout(600); m=modal(pg)
    print("restore btn disabled:", m.get_by_role("button",name="Pulihkan sekarang").is_disabled())
    fld(m,"Ketik PULIHKAN untuk melanjutkan").fill("PULIHKAN"); m.get_by_role("button",name="Pulihkan sekarang").click(); toast(pg,"berhasil dipulihkan"); pg.wait_for_timeout(300)
    print("restored:", {k['keterangan'] for k in db(pg)['kas'].values() if k['sumber']=='pengeluaran'})
    print("dash backup reminder:", (pg.goto(BASE), pg.wait_for_timeout(1200), pg.locator("text=Cadangan data terakhir").count()+pg.locator("text=Belum pernah membuat cadangan").count())[2])
    print("ERRORS:", errors); b.close()
