"""Ubah santri sekaligus (naik kelas/angkatan), filter master tidak terbawa antar halaman,
dan aturan keamanan baru: field keuangan di data master, penomoran tidak mundur, kunci periode di buku kas."""
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
from lib import *
def db(pg): return fs(pg)['db']
def masuk(pg, email, pw):
    if pg.locator('button[title=Keluar]').count(): pg.locator('button[title=Keluar]').click(); pg.wait_for_timeout(500)
    pg.get_by_label("Email").fill(email); pg.get_by_label("Kata sandi").fill(pw); pg.get_by_role("button", name="Masuk").click(); pg.wait_for_timeout(1300)
TULIS = """([c, id, data, merge]) => import('/tests/mock/firestore.js').then(async f => {
  try { if (merge === 'update') await f.updateDoc(f.doc({}, c, id), data); else await f.setDoc(f.doc({}, c, id), data, merge ? { merge: true } : undefined); return 'allowed'; }
  catch (e) { return e.code; } })"""

with sync_playwright() as p:
    b = p.chromium.launch(**BROWSER)
    ctx = b.new_context(viewport={"width": 1400, "height": 900}, storage_state=OUT+"/state5.json"); pg = ctx.new_page(); attach(pg)
    pg.goto(BASE); pg.wait_for_timeout(1200)
    if not pg.locator('button[title=Keluar]').count(): masuk(pg, "admin@tpq.id", "rahasia1")

    # 1. Ubah sekaligus: 2 santri pindah ke Kelas C + angkatan 2026
    nav(pg, "Santri"); pg.wait_for_timeout(500)
    rows = pg.locator("table.ledger tbody tr")
    nama = [rows.nth(i).locator("td").nth(2).inner_text().split("\n")[0] for i in range(2)]
    for i in range(2): rows.nth(i).get_by_role("checkbox").check()
    assert "2 santri dipilih" in pg.locator("main [role=status]").first.inner_text()
    pg.get_by_role("button", name="Ubah sekaligus").click(); m = modal(pg)
    fld(m, "Pindah ke kelas").select_option("Kelas C"); fld(m, "Angkatan (tahun masuk)").fill("2026")
    info = m.locator("[role=status]").inner_text(); print("ringkasan:", info.replace("\n", " ")); assert "Kelas C" in info and "2026" in info
    m.get_by_role("button", name="Terapkan").click(); toast(pg, "2 santri diperbarui"); pg.wait_for_timeout(400)
    d = db(pg); ubah = [s for s in d['santri'].values() if s['nama'] in nama]
    print("hasil:", [(s['nama'], s['kelas'], s['tahunMasuk']) for s in ubah])
    assert all(s['kelas'] == 'Kelas C' and s['tahunMasuk'] == 2026 for s in ubah) and len(ubah) == 2
    assert pg.locator("main [role=status]", has_text="dipilih").count() == 0
    assert any('2 santri' in l.get('ket', '') or '2 santri' in str(l) for l in d.get('log', {}).values())

    # 2. Filter tidak terbawa ke halaman master lain
    pg.locator("main select").filter(has=pg.locator("option", has_text="Semua kelas")).select_option("Kelas C"); pg.wait_for_timeout(300)
    nav(pg, "Kelas"); pg.wait_for_timeout(500)
    n_kelas = pg.locator("table.ledger tbody tr").count(); print("baris kelas setelah pindah halaman:", n_kelas, "dari", len(d['kelas']))
    assert n_kelas == len(d['kelas'])

    # 3. Kunci periode ditegakkan di aturan buku kas (bukan hanya tampilan)
    print("admin kunci:", pg.evaluate(TULIS, ["settings", "lembaga", {"kunciSampai": "2026-06-30"}, True]))
    masuk(pg, "bend@tpq.id", "rahasia2")
    lama = pg.evaluate(TULIS, ["kas", "uji-lama", {"sumber": "pemasukan", "masuk": 1000, "keluar": 0, "tanggal": "2026-06-15"}, False])
    baru = pg.evaluate(TULIS, ["kas", "uji-baru", {"sumber": "pemasukan", "masuk": 1000, "keluar": 0, "tanggal": "2026-07-01"}, False])
    pindah = pg.evaluate(TULIS, ["kas", "uji-baru", {"tanggal": "2026-06-01"}, "update"])
    print("bendahara kas periode terkunci / terbuka / dipindah ke terkunci:", lama, baru, pindah)
    assert lama == "permission-denied" and baru == "allowed" and pindah == "permission-denied"

    # 4. Penomoran tidak boleh mundur
    naik = pg.evaluate(TULIS, ["counters", "uji", {"last": 5}, True]); mundur = pg.evaluate(TULIS, ["counters", "uji", {"last": 2}, True])
    print("counter naik/mundur:", naik, mundur); assert naik == "allowed" and mundur == "permission-denied"

    # 5. Guru (akademik) boleh mengubah data santri, tetapi tidak keringanan / tarif honor
    masuk(pg, "guru@tpq.id", "rahasia7")
    sid = next(i for i, s in db(pg)['santri'].items() if s['status'] == 'Aktif')
    uid = next(iter(db(pg)['ustadz']))
    r = {
        "nama santri": pg.evaluate(TULIS, ["santri", sid, {"keterangan": "diubah guru"}, "update"]),
        "keringanan": pg.evaluate(TULIS, ["santri", sid, {"keringanan": [{"kewajibanId": "x", "tipe": "persen", "nilai": 100}]}, "update"]),
        "santri baru + keringanan": pg.evaluate(TULIS, ["santri", "baru-guru", {"nama": "X", "keringanan": [{"kewajibanId": "x", "tipe": "persen", "nilai": 100}]}, False]),
        "tarif ustadz": pg.evaluate(TULIS, ["ustadz", uid, {"tarif": 9999999}, "update"]),
        "hp ustadz": pg.evaluate(TULIS, ["ustadz", uid, {"hp": "0811"}, "update"]),
    }
    print("guru:", r)
    assert r == {"nama santri": "allowed", "keringanan": "permission-denied", "santri baru + keringanan": "permission-denied", "tarif ustadz": "permission-denied", "hp ustadz": "allowed"}

    masuk(pg, "admin@tpq.id", "rahasia1")
    print("buka kunci:", pg.evaluate(TULIS, ["settings", "lembaga", {"kunciSampai": ""}, True]))
    print("ERRORS:", [e for e in errors if "permission" not in e.lower()]); b.close()
