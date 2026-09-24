import sys, os, urllib.parse; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
with sync_playwright() as p:
    b=p.chromium.launch(**BROWSER)
    ctx=b.new_context(viewport={"width":1400,"height":900}, storage_state=OUT+"/state2.json", accept_downloads=True); pg=ctx.new_page(); attach(pg)
    pg.goto(BASE+"/pembayaran"); pg.wait_for_timeout(800); pg.get_by_role("button",name="Riwayat").click(); pg.wait_for_timeout(500)
    rows=pg.locator("table.ledger tbody tr")
    ah=rows.filter(has_text="Ahmad Fauzi")
    # WA text
    with ctx.expect_page() as np: ah.locator('button[title="Kirim ke WhatsApp"]').click()
    u=np.value.url; np.value.close(); print("WA url:", urllib.parse.unquote(u)[:230].replace("\n"," / "))
    # edit
    ah.locator('button[title=Ubah]').click(); m=modal(pg); pg.wait_for_timeout(400)
    print("edit modal:", m.inner_text().replace("\n"," | ")[:300])
    lks=m.locator(".divide-y > div").filter(has_text="LKS").locator("input")
    lks.fill("30000"); pg.wait_for_timeout(100); print("over disabled:", m.get_by_role("button",name="Simpan perubahan").is_disabled())
    lks.fill("25000"); m.get_by_role("button",name="Simpan perubahan").click(); toast(pg,"Pembayaran diperbarui"); pg.wait_for_timeout(400)
    d=fs(pg)['db']; t=[(x['kewajibanNama'],x['dibayar'],x['sisa'],x['status']) for x in d['tagihan'].values() if x['santriNama']=='Ahmad Fauzi']; print("ahmad tagihan:", sorted(t))
    pay=[x for x in d['pembayaran'].values() if x['santriNama']=='Ahmad Fauzi'][0]; print("pay total:", pay['total'], [(i['kewajibanNama'],i['bayar']) for i in pay['items']])
    print("kas ahmad:", sorted((k['kewajiban'],k['masuk']) for k in d['kas'].values() if k.get('refId') in [pid for pid,x in d['pembayaran'].items() if x['santriNama']=='Ahmad Fauzi']))
    # remove syahriyah from payment
    rows.filter(has_text="Ahmad Fauzi").locator('button[title=Ubah]').click(); m=modal(pg); pg.wait_for_timeout(400)
    m.locator(".divide-y > div").filter(has_text="Syahriyah").locator("input").fill("0"); m.get_by_role("button",name="Simpan perubahan").click(); toast(pg,"Pembayaran diperbarui"); pg.wait_for_timeout(400)
    d=fs(pg)['db']; pid=[k for k,x in d['pembayaran'].items() if x['santriNama']=='Ahmad Fauzi'][0]
    print("after remove: total", d['pembayaran'][pid]['total'], "kas docs:", sorted((k,v['masuk']) for k,v in d['kas'].items() if v.get('refId')==pid),
          "syahriyah:", [(x['dibayar'],x['status']) for x in d['tagihan'].values() if x['santriNama']=='Ahmad Fauzi' and x['kewajibanNama'].startswith('Syah')])
    # delete one Aisyah payment
    rows.filter(has_text="Aisyah").first.locator('button[title=Hapus]').click(); modal(pg).get_by_role("button",name="Hapus pembayaran").click(); toast(pg,"Pembayaran dihapus"); pg.wait_for_timeout(400)
    d=fs(pg)['db']; print("aisyah tagihan:", [(x['dibayar'],x['sisa'],x['status']) for x in d['tagihan'].values() if x['santriNama']=='Aisyah Putri'])
    # GAJI edit
    pg.goto(BASE+"/gaji"); pg.wait_for_timeout(600)
    g=pg.locator("table.ledger tbody tr", has_text="Ahmad Syauqi")
    with ctx.expect_page() as np: g.locator('button[title="Kirim ke WhatsApp"]').click()
    print("WA slip:", urllib.parse.unquote(np.value.url)[:160].replace("\n"," / ")); np.value.close()
    g.locator('button[title=Ubah]').click(); m=modal(pg); pg.wait_for_timeout(300)
    print("ustadz locked:", fld(m,"Ustadz / ustadzah").is_disabled())
    m.locator(".divide-y > div").filter(has_text="Potongan").locator("input").fill("100000")
    m.get_by_role("button",name="Simpan perubahan").click(); toast(pg,"Slip gaji diperbarui"); pg.wait_for_timeout(400)
    d=fs(pg)['db']; gj=[x for x in d['gaji'].values()][0]; print("gaji neto:", gj['neto'], "kas:", [v['keluar'] for k,v in d['kas'].items() if k.startswith('gaji_')], "rows:", pg.locator("table.ledger tbody tr").count())
    # buku kas totals
    pg.goto(BASE+"/buku-kas"); pg.wait_for_timeout(800); print("BUKU:", pg.locator("tfoot").inner_text().replace("\n"," "))
    # KWITANSI image send (desktop fallback: download + wa)
    pg.goto(BASE+"/cetak/kwitansi/"+pid); pg.wait_for_timeout(1500)
    with pg.expect_download() as dl, ctx.expect_page() as np:
        pg.get_by_role("button", name="Kirim ke WhatsApp").click()
    import os; path=dl.value.path(); print("image:", dl.value.suggested_filename, os.path.getsize(path), "wa:", np.value.url[:40]); np.value.close()
    os.system(f"cp {path} {OUT}/kw-image.png")
    for bg in (False, True):
        pg.pdf(path=OUT+f"/kw-print-{bg}.pdf", print_background=bg, prefer_css_page_size=True)
    gid=list(d['gaji'].keys())[0]
    sp=ctx.new_page(); sp.goto(BASE+"/cetak/slip/"+gid); sp.wait_for_timeout(1500); sp.pdf(path=OUT+"/slip-print.pdf", print_background=False, prefer_css_page_size=True)
    lp=ctx.new_page(); lp.goto(BASE+"/laporan/keuangan"); lp.wait_for_timeout(1500); lp.pdf(path=OUT+"/lap-print.pdf", print_background=True, format="A4")
    print("ERRORS:", [e for e in errors if "403" not in e and "fonts" not in e]); b.close()
