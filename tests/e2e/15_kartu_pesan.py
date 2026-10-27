"""Kartu santri (profil, ringkasan, hafalan, tagihan per tahun), redaksi pesan tagihan WhatsApp,
info cara pembayaran di Pengaturan, dan pintasan ke kartu dari Tagihan/Data santri/Pembayaran."""
import sys, os, re, urllib.parse; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
def db(pg): return fs(pg)['db']
TANGKAP = "() => { window.__wa = []; window.open = (u) => { window.__wa.push(u); return { close(){}, set opener(v){}, location: { set href(x) { window.__wa.push(x); } } }; }; }"
def pesan_wa(pg):
    urls = [u for u in pg.evaluate("window.__wa") if u and 'wa.me' in u]
    return urllib.parse.unquote(urls[-1].split('text=')[1]) if urls else ''

with sync_playwright() as p:
    b = p.chromium.launch(**BROWSER)
    ctx = b.new_context(viewport={"width": 1400, "height": 900}, storage_state=OUT+"/state5.json"); pg = ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.wait_for_timeout(1200)

    # 1. Pengaturan: cara pembayaran + contoh pesan
    pg.goto(BASE+"/pengaturan"); pg.wait_for_timeout(800)
    fld(pg.locator("main"), "Cara pembayaran").fill("Transfer BSI 7123456789 a.n. TPQ Nurul Ilmi")
    contoh = pg.get_by_test_id("contoh-pesan").inner_text(); print("contoh pesan:\n" + contoh)
    assert "Transfer BSI 7123456789" in contoh and "Wassalamu'alaikum" in contoh and "Total: Rp" in contoh.replace("\xa0", " ")
    pg.locator("[role=status]", has_text="belum disimpan").get_by_role("button", name="Simpan").click(); toast(pg, "Pengaturan disimpan")
    assert db(pg)['settings']['lembaga']['infoPembayaran'].startswith("Transfer BSI")

    # 2. Data santri → tombol kartu → kartu lengkap
    d = db(pg)
    nunggak = {t['santriId'] for t in d['tagihan'].values() if t['sisa'] > 0}
    sid, s = next((i, x) for i, x in d['santri'].items() if i in nunggak and x['status'] == 'Aktif')
    pg.goto(BASE+"/master/santri"); pg.wait_for_timeout(600)
    pg.locator("table.ledger tbody tr", has_text=s['nama']).locator("a[title='Kartu santri']").click(); pg.wait_for_timeout(1200)
    assert f"santri={sid}" in pg.url, pg.url
    k = pg.get_by_test_id("kartu-santri"); teks = k.inner_text().replace("\xa0", " ")
    for x in ["Sisa kewajiban", "Orang tua / wali", "Sudah dibayar", "Kelunasan", "Hafalan", "Riwayat pembayaran", "Keringanan tetap", "Angkatan"]:
        assert x.lower() in teks.lower(), x
    print("kartu ringkas:", re.sub(r"\s+", " ", teks)[:400])
    n_belum = k.get_by_role("tab", name=re.compile("Belum lunas")).inner_text(); k.get_by_role("tab", name=re.compile("^Semua")).click(); pg.wait_for_timeout(200)
    print("tab:", n_belum, "| baris semua:", k.locator("table.ledger").first.locator("tbody tr").count())
    pg.screenshot(path=OUT+"/kartu.png", full_page=True)
    pg.emulate_media(media="print"); pg.pdf(path=OUT+"/kartu.pdf", format="A4", print_background=True); pg.emulate_media(media="screen")

    # 3. Kirim tagihan dari kartu → pesan lengkap
    pg.evaluate(TANGKAP)
    tg = [t for t in d['tagihan'].values() if t['santriId'] == sid and t['sisa'] > 0]
    assert tg
    if tg:
        pg.get_by_role("button", name="Kirim tagihan").click(); pg.wait_for_timeout(300)
        m = pesan_wa(pg); print("pesan kartu:\n" + m)
        assert "Yth. Bapak/Ibu wali ananda *" in m and "Transfer BSI" in m and "mohon abaikan" in m and m.count("\n1. ") == 1

    # 4. Tagihan → ⋯ → Kirim pengingat WhatsApp (semua periode)
    pg.goto(BASE+"/tagihan"); pg.wait_for_timeout(800); pg.evaluate(TANGKAP)
    row = pg.locator("table.ledger tbody tr").filter(has=pg.locator("td", has_text="Belum bayar")).first
    nama = row.locator("td").nth(1).inner_text().split("\n")[0]
    row.get_by_role("button", name="Tindakan lain").click(); pg.get_by_role("menuitem", name=re.compile("^Kirim pengingat WhatsApp")).click(); pg.wait_for_timeout(800)
    m = pesan_wa(pg); sid2 = next(i for i, x in db(pg)['santri'].items() if x['nama'] == nama)
    harus = sum(t['sisa'] for t in db(pg)['tagihan'].values() if t['santriId'] == sid2 and t['sisa'] > 0)
    print("pengingat", nama, "harus total", harus, "→", re.search(r"Total: (Rp [\d.]+)", m.replace("\xa0", " ")).group(1))
    assert f"{harus:,}".replace(",", ".") in m.replace("\xa0", " ")

    # 5. Tagihan → ⋯ → Lihat kartu; Pembayaran → tautan kartu
    pg.goto(BASE+"/tagihan"); pg.wait_for_timeout(800)
    aksi(pg, pg.locator("table.ledger tbody tr").first, "Lihat kartu santri"); pg.wait_for_timeout(800)
    assert "/laporan/kartu-santri?santri=" in pg.url
    pg.goto(BASE+f"/pembayaran?santri={sid}"); pg.wait_for_timeout(900)
    pg.locator("main").get_by_role("link", name="Kartu santri").first.click(); pg.wait_for_timeout(800); assert f"santri={sid}" in pg.url

    # 6. Kwitansi: redaksi baru
    pg.goto(BASE+"/pembayaran"); pg.wait_for_timeout(500); pg.get_by_role("tab", name="Riwayat").click(); pg.wait_for_timeout(700); pg.evaluate(TANGKAP)
    aksi(pg, pg.locator("table.ledger tbody tr").first, "Kirim ke WhatsApp"); pg.wait_for_timeout(300)
    m = pesan_wa(pg); print("kwitansi:\n" + m); assert "Alhamdulillah, pembayaran berikut telah kami terima" in m and "Total diterima" in m

    # 7. Kartu di HP tidak melebar
    pg.set_viewport_size({"width": 390, "height": 844}); pg.goto(BASE+f"/laporan/kartu-santri?santri={sid}"); pg.wait_for_timeout(1200)
    sw = pg.evaluate("document.documentElement.scrollWidth"); print("lebar HP:", sw); assert sw <= 392
    pg.screenshot(path=OUT+"/kartu-hp.png", full_page=True)
    print("ERRORS:", [e for e in errors if "permission" not in e.lower()]); b.close()
