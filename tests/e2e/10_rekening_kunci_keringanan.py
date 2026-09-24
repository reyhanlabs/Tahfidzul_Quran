import sys, os, re, json; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
def db(pg): return fs(pg)['db']
with sync_playwright() as p:
    b=p.chromium.launch(**BROWSER)
    ctx=b.new_context(viewport={"width":1400,"height":900}, storage_state=OUT+"/state2.json", accept_downloads=True); pg=ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.wait_for_timeout(1500)
    d=db(pg); print("1 migrasi:", d['settings']['lembaga'].get('migrasiRekening'), "kas tanpa rekening:", sum(1 for k in d['kas'].values() if not k.get('rekening') and k['sumber']!='mutasi'))
    # rekening
    nav(pg,"Pengaturan"); main=pg.locator("main")
    pg.get_by_role("button",name="Tambah rekening").click()
    rows=main.locator("xpath=.//fieldset[.//button[normalize-space()='Tambah rekening']]/div[contains(@class,'flex')]")
    last=rows.last; last.locator("input").first.fill("Bank BSI"); last.locator("input[inputmode=numeric]").fill("1000000")
    main.locator("div.flex", has_text="Transfer").locator("select").select_option(label="Bank BSI")
    pg.get_by_role("button",name="Simpan pengaturan").click(); toast(pg,"Pengaturan disimpan"); pg.wait_for_timeout(500)
    st=db(pg)['settings']['lembaga']; print("rekening:", [(r['nama'],r['saldoAwal']) for r in st['rekening']], "saldoAwal total:", st['saldoAwal'], "map:", st['metodeRekening'])
    # pembayaran via Transfer -> bank
    pg.goto(BASE+"/pembayaran"); pg.get_by_placeholder("Ketik nama atau ID santri…").fill("Umar"); pg.keyboard.press("Enter"); pg.wait_for_timeout(500)
    pg.locator("ul.divide-y li").first.locator("input[type=checkbox]").check()
    fld(main,"Metode").select_option("Transfer"); print("rek default:", fld(main,"Masuk ke rekening").locator("option:checked").inner_text())
    pg.get_by_role("button",name="Simpan pembayaran").click(); toast(pg,"Pembayaran disimpan"); pg.wait_for_timeout(300)
    d=db(pg); print("kas umar rekening:", {k['rekening'] for k in d['kas'].values() if 'Umar' in k.get('keterangan','')})
    # pindah dana
    pg.goto(BASE+"/buku-kas"); pg.wait_for_timeout(700)
    pg.get_by_role("button",name="Pindah dana").click(); m=modal(pg); fld(m,"Nominal").fill("300000"); fld(m,"Keterangan").fill("Setor ke bank"); m.get_by_role("button",name="Simpan").click(); toast(pg,"Pindah dana dicatat"); pg.wait_for_timeout(600)
    print("semua:", pg.locator("tfoot").inner_text().replace("\n"," "))
    fld(main,"Rekening").select_option(label="Bank BSI"); pg.wait_for_timeout(900)
    print("bank:", pg.locator("div.grid.grid-cols-2").first.inner_text().replace("\n"," | "))
    fld(main,"Rekening").select_option(label="Kas tunai"); pg.wait_for_timeout(900)
    print("tunai:", pg.locator("div.grid.grid-cols-2").first.inner_text().replace("\n"," | "))
    pg.goto(BASE); pg.wait_for_timeout(1500); print("dash rekening:", pg.locator("section").first.locator("p.text-sm").all_inner_texts()[-2:])
    print("reminder:", [t[:90] for t in pg.locator("div.rounded-xl.border p.text-sm").all_inner_texts()])
    # tagihan bulanan via reminder
    pg.get_by_role("button",name="Buat sekarang").click(); pg.wait_for_timeout(900); m=modal(pg)
    print("bulanan modal:", m.locator(".divide-y").inner_text().replace("\n"," | ")[:250])
    m.get_by_role("button", name=re.compile(r"Buat \d+ tagihan")).click(); toast(pg,"tagihan bulanan dibuat"); pg.wait_for_timeout(500)
    pg.goto(BASE); pg.wait_for_timeout(1200); print("reminder after:", pg.locator("text=belum dibuat").count())
    # keringanan
    pg.goto(BASE+"/master/santri"); pg.wait_for_timeout(500)
    pg.locator("table.ledger tbody tr", has_text="Umar Faruq").locator('button[title=Ubah]').click(); m=modal(pg)
    m.get_by_role("button",name="Tambah keringanan").click(); k=m.locator("div.rounded-lg.border").last
    k.locator("select").first.select_option(label="Syahriyah/SPP"); k.locator("input[type=number]").fill("50"); k.locator("input").last.fill("anak yatim")
    print("preview:", k.locator("p.text-xs").inner_text())
    m.get_by_role("button",name="Simpan").click(); toast(pg,"disimpan"); pg.wait_for_timeout(300)
    pg.goto(BASE+"/tagihan"); pg.wait_for_timeout(500); pg.get_by_role("button",name="Tagihan bulanan").click(); m=modal(pg)
    fld(m,"Bulan").select_option(label="Desember"); pg.wait_for_timeout(700); print("des plan:", m.locator(".divide-y label").first.inner_text().replace("\n"," | "))
    m.get_by_role("button", name=re.compile(r"Buat \d+ tagihan")).click(); toast(pg,"tagihan bulanan dibuat"); pg.wait_for_timeout(400)
    d=db(pg); u=[t for t in d['tagihan'].values() if t['santriNama']=='Umar Faruq' and t['periodeKey']==202612 and t['kewajibanNama'].startswith('Syah')]
    print("umar des:", [(t['nominal'],t.get('nominalAwal'),t.get('potongan'),t['keterangan']) for t in u])
    # kunci
    pg.goto(BASE+"/pengaturan"); pg.wait_for_timeout(400)
    fld(main,"Atau pilih tanggal").fill("2026-12-31"); pg.locator("main").get_by_role("button",name="Kunci",exact=True).click(); modal(pg).get_by_role("button",name="Kunci").click(); toast(pg,"Periode dikunci"); pg.wait_for_timeout(300)
    pg.goto(BASE+"/pengeluaran"); pg.wait_for_timeout(600); print("lock icons:", pg.locator("span[title^='Periode terkunci']").count(), "edit btns:", pg.locator("button[title=Ubah]").count())
    pg.get_by_role("button",name="Catat pengeluaran").first.click(); m=modal(pg); fld(m,"Kategori").select_option("ATK"); fld(m,"Nominal").fill("1000"); m.get_by_role("button",name="Simpan").click(); toast(pg,"sudah dikunci"); m.get_by_role("button",name="Batal").click()
    pg.goto(BASE+"/pengaturan"); pg.wait_for_timeout(400); pg.get_by_role("button",name="Buka kunci").click(); modal(pg).get_by_role("button",name="Buka kunci").click(); toast(pg,"Kunci periode dibuka")
    print("ERRORS:", [e for e in errors]); ctx.storage_state(path=OUT+"/state3.json"); b.close()
