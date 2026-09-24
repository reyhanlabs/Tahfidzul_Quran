import sys, os, re; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
def db(pg): return fs(pg)['db']
def masuk(pg, email, pw):
    if pg.locator('button[title=Keluar]').count(): pg.locator('button[title=Keluar]').click(); pg.wait_for_timeout(500)
    pg.get_by_label("Email").fill(email); pg.get_by_label("Kata sandi").fill(pw); pg.get_by_role("button", name="Masuk").click(); pg.wait_for_timeout(1300)
def menu(pg): return [t.strip() for t in pg.locator("aside nav a").all_inner_texts()]
RAW = "([c, op, data]) => import('/tests/mock/firestore.js').then(async f => { try { if (op==='read') { await f.getDocs(f.collection({}, c)); return 'allowed'; } await f.setDoc(f.doc({}, c, 'x'+Date.now()), data); return 'allowed'; } catch (e) { return e.code; } })"
with sync_playwright() as p:
    b=p.chromium.launch(**BROWSER)
    ctx=b.new_context(viewport={"width":1400,"height":900}, storage_state=OUT+"/state2.json"); pg=ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.wait_for_timeout(1000)
    # --- admin: pengguna baru dengan peran
    pg.goto(BASE+"/pengguna"); pg.wait_for_timeout(500)
    for nama, email, peran in [("Kasir Satu","kasir@tpq.id","Kasir / penerima pembayaran"),("Guru Satu","guru@tpq.id","Guru / bagian pendidikan"),("Pak Kyai","kyai@tpq.id","Pimpinan")]:
        pg.get_by_role("button", name="Tambah pengguna").click(); m=modal(pg)
        fld(m,"Nama").fill(nama); fld(m,"Email").fill(email); fld(m,"Kata sandi awal").fill("rahasia7")
        m.get_by_role("button", name=peran, exact=True).click()
        m.get_by_role("button", name="Tambah pengguna").click(); toast(pg,"Pengguna ditambahkan"); pg.wait_for_timeout(300)
    print("tabel:", [r.replace("\n"," | ")[:90] for r in pg.locator("table.ledger tbody tr").all_inner_texts()])
    # --- persetujuan aktif, batas 100rb
    pg.goto(BASE+"/pengaturan"); pg.wait_for_timeout(500)
    pg.get_by_label("Pengeluaran wajib disetujui sebelum tercatat di buku kas").check()
    fld(pg.locator("main"),"Hanya untuk pengeluaran di atas").fill("100000")
    pg.get_by_role("button", name="Simpan pengaturan").click(); toast(pg,"Pengaturan disimpan")
    # --- bendahara
    masuk(pg, "bend@tpq.id", "rahasia2"); print("menu bendahara:", "Persetujuan" in menu(pg), len(menu(pg)))
    pg.goto(BASE+"/pengeluaran"); pg.wait_for_timeout(500)
    def catat(nom, ket):
        pg.get_by_role("button", name="Catat pengeluaran").first.click(); m=modal(pg)
        fld(m,"Kategori").select_option("ATK"); fld(m,"Keterangan").fill(ket); fld(m,"Nominal").fill(str(nom)); pg.wait_for_timeout(150)
        judul=m.locator("h2").inner_text(); m.get_by_role("button", name=re.compile("Simpan|Kirim pengajuan")).click(); pg.wait_for_timeout(600); return judul
    print("50rb:", catat(50000,"Spidol")); print("250rb:", catat(250000,"Printer"))
    print("tab pengajuan:", pg.locator("main").inner_text().count("Menunggu"), "| kas printer:", sum(1 for k in db(pg)['kas'].values() if k.get('keterangan')=='Printer'))
    print("raw kas 500rb:", pg.evaluate(RAW, ["kas","write",{"sumber":"pengeluaran","keluar":500000,"tanggal":"2026-09-01"}]))
    # --- pimpinan menolak
    masuk(pg, "kyai@tpq.id", "rahasia7"); m1=menu(pg); print("menu pimpinan:", [x for x in m1 if x][:30])
    print("dash banner:", pg.locator("text=menunggu persetujuan").count())
    pg.goto(BASE+"/persetujuan"); pg.wait_for_timeout(600)
    pg.get_by_role("button", name="Tolak").first.click(); m=modal(pg); m.locator("textarea").fill("Pakai printer lama dulu"); m.get_by_role("button", name="Tolak pengajuan").click(); toast(pg,"Pengajuan ditolak")
    # --- bendahara ajukan ulang
    masuk(pg, "bend@tpq.id", "rahasia2"); pg.goto(BASE+"/pengeluaran"); pg.wait_for_timeout(400); pg.get_by_role("button", name="Pengajuan").click(); pg.wait_for_timeout(500)
    print("alasan terlihat:", pg.locator("text=Pakai printer lama dulu").count())
    pg.get_by_role("button", name="Perbaiki & ajukan ulang").click(); m=modal(pg); fld(m,"Nominal").fill("200000"); m.get_by_role("button", name="Kirim pengajuan").click(); pg.wait_for_timeout(700)
    # --- pimpinan setujui
    masuk(pg, "kyai@tpq.id", "rahasia7"); pg.goto(BASE+"/persetujuan"); pg.wait_for_timeout(600)
    print("badge:", pg.locator("aside nav a", has_text="Persetujuan").inner_text().replace("\n"," "))
    pg.get_by_role("button", name="Setujui").first.click(); modal(pg).get_by_role("button", name="Setujui & catat").click(); toast(pg,"Disetujui")
    k=[k for k in db(pg)['kas'].values() if k.get('keterangan')=='Printer']; print("kas setelah setuju:", [(x['keluar'], x['no'], x.get('disetujuiOleh')) for x in k])
    print("pimpinan /tagihan:", (pg.goto(BASE+"/tagihan"), pg.wait_for_timeout(500), pg.locator("main h1").first.inner_text())[2])
    # --- kasir
    masuk(pg, "kasir@tpq.id", "rahasia7"); print("menu kasir:", [x for x in menu(pg) if x])
    print("dash kasir:", pg.locator("main h2").all_inner_texts())
    pg.goto(BASE+"/pembayaran"); pg.get_by_placeholder("Ketik nama atau ID santri…").fill("Umar"); pg.keyboard.press("Enter"); pg.wait_for_timeout(600)
    pg.locator("ul.divide-y li").first.locator("input[type=checkbox]").check(); pg.get_by_role("button", name="Simpan pembayaran").click(); toast(pg,"Pembayaran disimpan")
    pg.get_by_role("button", name="Pembayaran berikutnya").click(); pg.get_by_role("button", name="Riwayat").click(); pg.wait_for_timeout(500)
    print("kasir riwayat ubah/hapus:", pg.locator("button[title=Ubah]").count(), pg.locator("button[title=Hapus]").count(), "WA:", pg.locator("button[title='Kirim ke WhatsApp']").count())
    print("kasir /buku-kas:", (pg.goto(BASE+"/buku-kas"), pg.wait_for_timeout(500), pg.locator("main h1").first.inner_text())[2])
    _st=fs(pg); print("current:", _st['current'], _st['db']['users'].get(_st['current'],{}).get('izin'))
    print("kasir raw read kas/gaji/hafalan:", [pg.evaluate(RAW, [c,"read",None]) for c in ["kas","gaji","hafalan"]], "tagihan:", pg.evaluate(RAW, ["tagihan","read",None]))
    # --- guru
    masuk(pg, "guru@tpq.id", "rahasia7"); print("menu guru:", [x for x in menu(pg) if x])
    print("guru raw read:", {c: pg.evaluate(RAW, [c,"read",None]) for c in ["tagihan","pembayaran","kas","gaji","pengajuan","hafalan"]})
    pg.goto(BASE+"/master/santri"); pg.wait_for_timeout(500)
    pg.locator("table.ledger tbody tr", has_text="Umar Faruq").locator("button[title=Ubah]").click(); m=modal(pg)
    print("form guru punya keringanan:", m.locator("text=Keringanan tetap").count())
    fld(m,"Nama santri").fill("Umar Faruq Al-Hafidz"); m.get_by_role("button", name="Simpan").click(); toast(pg,"disimpan"); pg.wait_for_timeout(500)
    pg.goto(BASE+"/master/ustadz"); pg.wait_for_timeout(400); print("guru lihat tarif:", pg.locator("th", has_text="Tarif").count())
    pg.goto(BASE+"/pembayaran"); pg.wait_for_timeout(400); print("guru /pembayaran:", pg.locator("main h1").first.inner_text())
    pg.goto(BASE+"/hafalan"); pg.wait_for_timeout(500); pg.get_by_role("button", name="Catat setoran").click(); m=modal(pg)
    m.get_by_placeholder("Ketik nama atau ID santri…").fill("Umar"); pg.keyboard.press("Enter"); pg.wait_for_timeout(400)
    fld(m,"Surat").select_option("114"); m.get_by_role("button", name="Simpan").click(); toast(pg,"Setoran disimpan"); pg.wait_for_timeout(1200)
    # --- admin: nama baru tampil di tagihan
    masuk(pg, "admin@tpq.id", "rahasia1"); pg.goto(BASE+"/tagihan"); pg.wait_for_timeout(700)
    print("tagihan nama baru:", pg.locator("table.ledger", has_text="Umar Faruq Al-Hafidz").count())
    print("ERRORS:", [e for e in errors if "permission" not in e.lower()]); b.close()
