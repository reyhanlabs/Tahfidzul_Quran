"""
Uji langsung (live) PPMTQ ke aplikasi yang sudah di-deploy + Firebase sungguhan.

Yang dilakukan:
  1. Masuk sebagai admin, membuat 4 akun penguji (Bendahara, Kasir, Guru, Pimpinan)
     dan data uji berlabel "UJI-<kode>" (1 kelas, 1 santri).
  2. Menjalankan alur nyata per peran: tagihan, pembayaran + kwitansi, pengeluaran/pengajuan,
     persetujuan, hafalan, absensi, portal wali, atur login, dan memastikan setiap peran
     tidak bisa membuka halaman di luar haknya.
  3. MEMBERSIHKAN semua data uji (pembayaran, tagihan, pengeluaran, hafalan, santri, kelas)
     dan menonaktifkan akun penguji.

Tidak mengubah Pengaturan lembaga. Akun penguji dihapus (atau dinonaktifkan bila fungsi server
belum siap; pakai --simpan-penguji untuk selalu menonaktifkan saja). Yang tersisa setelah uji:
catatan log aktivitas, 1 dokumen absensi kelas uji, dan (bila persetujuan aktif) riwayat
pengajuan uji berstatus disetujui — semuanya tidak memengaruhi saldo maupun laporan keuangan.

Persiapan (sekali):
  pip install playwright
  python -m playwright install chromium

Menjalankan:
  set PPMTQ_URL=https://nama-app.vercel.app      (Windows: set ..., Mac/Linux: export ...)
  set ADMIN_EMAIL=admin@lembaga.id
  set ADMIN_PASSWORD=********
  python tests/live/uji_live.py --yakin

Opsi: --tampil  (browser terlihat, jalan pelan — enak untuk ditonton)
Hasil: tests/live/_hasil/laporan-<waktu>.md + screenshot bila ada yang gagal.
"""
import os, re, sys, json, time, datetime
from playwright.sync_api import sync_playwright, expect, TimeoutError as PWTimeout

URL = os.environ.get("PPMTQ_URL", "").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PW = os.environ.get("ADMIN_PASSWORD", "")
SANDI_UJI = os.environ.get("TESTER_PASSWORD", "Uji-PPMTQ-2026")
STATE = os.environ.get("PPMTQ_STATE")  # khusus uji ke server tiruan
CHROMIUM = os.environ.get("CHROMIUM")
TAMPIL = "--tampil" in sys.argv
HAPUS_PENGUJI = "--simpan-penguji" not in sys.argv  # default: akun penguji dihapus permanen setelah uji
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "_hasil"); os.makedirs(OUT, exist_ok=True)

# Tanyakan langsung bila belum diisi lewat environment variable
if sys.stdin.isatty():
    import getpass
    if not URL: URL = input("Alamat aplikasi (mis. https://ppmtq.vercel.app): ").strip().rstrip("/")
    if not ADMIN_EMAIL: ADMIN_EMAIL = input("Email admin: ").strip()
    if not ADMIN_PW: ADMIN_PW = getpass.getpass("Kata sandi admin (tidak terlihat saat diketik): ")
    if "--yakin" not in sys.argv and URL:
        print(f"\nUji ini akan MENULIS data uji ke {URL} lalu menghapusnya kembali.")
        if input('Ketik YA untuk melanjutkan: ').strip().upper() == "YA": sys.argv.append("--yakin")
if not (URL and ADMIN_EMAIL and ADMIN_PW) or "--yakin" not in sys.argv:
    print(__doc__); print("\n>> Isi PPMTQ_URL, ADMIN_EMAIL, ADMIN_PASSWORD lalu jalankan dengan --yakin."); sys.exit(2)

KODE = datetime.datetime.now().strftime("%m%d%H%M")
DOMAIN = os.environ.get("TESTER_DOMAIN", "uji.ppmtq.id")
PENGUJI = {
    "bendahara": ("UJI Bendahara", f"uji-bendahara-{KODE}@{DOMAIN}", "Bendahara"),
    "kasir": ("UJI Kasir", f"uji-kasir-{KODE}@{DOMAIN}", "Kasir / penerima pembayaran"),
    "guru": ("UJI Guru", f"uji-guru-{KODE}@{DOMAIN}", "Guru / bagian pendidikan"),
    "pimpinan": ("UJI Pimpinan", f"uji-pimpinan-{KODE}@{DOMAIN}", "Pimpinan"),
}
KELAS = f"UJI-{KODE}"
SANTRI = f"UJI Santri {KODE}"
KET = f"UJI-{KODE}"

hasil = []  # (status, nama, catatan)
masalah_konsol = []

def catat(status, nama, ket=""):
    hasil.append((status, nama, ket))
    ikon = {"LULUS": "✔", "GAGAL": "✖", "PERINGATAN": "!", "LEWATI": "–"}[status]
    print(f"  {ikon} {status:10} {nama}{(' — ' + ket) if ket else ''}")

def main():
    with sync_playwright() as p:
        b = p.chromium.launch(headless=not TAMPIL, slow_mo=250 if TAMPIL else 0, **({"executable_path": CHROMIUM} if CHROMIUM else {}))
        ctx = b.new_context(viewport={"width": 1366, "height": 900}, **({"storage_state": STATE} if STATE else {}))
        pg = ctx.new_page()
        pg.set_default_timeout(30000)  # Firebase lewat internet lebih lambat daripada server tiruan
        pg.on("pageerror", lambda e: masalah_konsol.append(f"PAGEERROR {e}"))
        pg.on("console", lambda m: m.type == "error" and "favicon" not in m.text and masalah_konsol.append(m.text[:300]))

        def shot(nama):
            f = os.path.join(OUT, f"{KODE}-{re.sub('[^a-z0-9]+', '-', nama.lower())[:50]}.png")
            try: pg.screenshot(path=f, full_page=True)
            except Exception: pass
            return f

        def cek(nama, fn, wajib=True):
            try:
                r = fn()
                if r is False: raise AssertionError("kondisi tidak terpenuhi")
                catat("LULUS", nama, r if isinstance(r, str) else "")
                return True
            except Exception as e:
                f = shot(nama)
                catat("GAGAL" if wajib else "PERINGATAN", nama, f"{str(e).splitlines()[0][:200]} (lihat {os.path.basename(f)})")
                return False

        def modal(): return pg.locator("[role=dialog]").last
        def fld(scope, label):
            return scope.locator(f"xpath=.//label[span[normalize-space(text())='{label}']]").locator("input,select,textarea").first
        def toast(teks, timeout=20000):
            expect(pg.locator("div.fixed[aria-live=polite]")).to_contain_text(teks, timeout=timeout)
        def toast_merah():
            t = pg.locator("div.fixed[aria-live=polite] .bg-rose-ink").all_inner_texts()
            return [x for x in t if "Gagal memuat" in x or "akses ditolak" in x]
        def buka(path):
            # Jangan menunggu "networkidle": Firestore menjaga koneksi realtime tetap terbuka, jadi jaringan tidak pernah diam.
            pg.goto(URL + path, wait_until="domcontentloaded")
            # Tunggu aplikasi selesai memuat: halaman login, sidebar (sudah login), atau halaman cetak
            pg.locator("aside, input[type=email], article, [role=status]").first.wait_for(timeout=45000)
            pg.wait_for_timeout(1500)
        def judul(): return pg.locator("main h1").first.inner_text(timeout=10000)
        def menu(): return [t.strip().split("\n")[0] for t in pg.locator("aside nav a").all_inner_texts()]
        def keluar():
            if pg.locator('button[title=Keluar]').count():
                pg.locator('button[title=Keluar]').first.click(); pg.wait_for_timeout(800)
        def masuk(email, pw):
            buka("/"); keluar()
            pg.locator("input[type=email]").first.wait_for(timeout=30000)
            if pg.get_by_role("heading", name="Setup awal").count():
                raise AssertionError("Aplikasi menampilkan Setup awal — belum ada admin di project ini.")
            pg.get_by_label("Email").fill(email); pg.get_by_label("Kata sandi").fill(pw)
            pg.get_by_role("button", name="Masuk").click()
            pg.locator("aside").first.wait_for(timeout=45000); pg.wait_for_timeout(2000)
        def pilih_santri(scope=None):
            s = scope or pg
            s.get_by_placeholder("Ketik nama atau ID santri…").fill(SANTRI); pg.wait_for_timeout(400); pg.keyboard.press("Enter"); pg.wait_for_timeout(900)

        ctx_data = {}
        print(f"\nUji live PPMTQ · {URL} · kode uji {KODE}\n")

        class Berhenti(Exception): pass

        def hapus_semua(baris, tombol_konfirmasi, maks=15):
            n = 0
            while baris().count() and n < maks:
                baris().first.locator('button[title=Hapus]').click()
                modal().get_by_role("button", name=tombol_konfirmasi).click(); pg.wait_for_timeout(1500); n += 1
            if baris().count(): raise AssertionError(f"masih tersisa {baris().count()} baris")
            return f"{n} dihapus"

        def bersihkan():
            print("\n7. Pembersihan data uji")
            if not cek("Admin masuk untuk pembersihan", lambda: masuk(ADMIN_EMAIL, ADMIN_PW)):
                catat("GAGAL", "Pembersihan dibatalkan", f"hapus manual data berlabel {KET} / {SANTRI}"); return
            def byr():
                buka("/pembayaran"); pg.get_by_role("button", name="Riwayat").click(); pg.wait_for_timeout(1000)
                pg.get_by_placeholder("Cari no. / santri").fill(SANTRI); pg.wait_for_timeout(500)
                return hapus_semua(lambda: pg.locator("table.ledger tbody tr", has_text=SANTRI), "Hapus pembayaran")
            cek("Hapus pembayaran uji", byr)
            def klr():
                buka("/pengeluaran"); pg.get_by_placeholder("Cari…").fill(KET); pg.wait_for_timeout(500)
                r = hapus_semua(lambda: pg.locator("table.ledger tbody tr", has_text=KET), "Hapus")
                pg.get_by_role("button", name="Pengajuan").click(); pg.wait_for_timeout(1000)
                # pengajuan yang sudah disetujui tetap tersimpan sebagai riwayat (tidak ada tombol hapus)
                return r + "; pengajuan " + hapus_semua(lambda: pg.locator("main li", has_text=KET).filter(has=pg.locator("button[title=Hapus]")), "Hapus")
            cek("Hapus pengeluaran/pengajuan uji", klr)
            def tgh():
                buka("/tagihan"); pg.get_by_placeholder("Cari santri / no. tagihan").fill(SANTRI); pg.wait_for_timeout(500)
                return hapus_semua(lambda: pg.locator("table.ledger tbody tr", has_text=SANTRI), "Hapus")
            cek("Hapus tagihan uji", tgh)
            def hfl():
                buka("/hafalan"); pg.wait_for_timeout(800)
                return hapus_semua(lambda: pg.locator("table.ledger tbody tr", has_text=SANTRI), "Hapus")
            cek("Hapus setoran hafalan uji", hfl)
            def snt():
                buka("/master/santri"); pg.get_by_placeholder("Cari…").fill(SANTRI); pg.wait_for_timeout(500)
                r = hapus_semua(lambda: pg.locator("table.ledger tbody tr", has_text=SANTRI), "Hapus")
                buka("/master/kelas"); pg.wait_for_timeout(500)
                return r + "; kelas " + hapus_semua(lambda: pg.locator("table.ledger tbody tr", has_text=KELAS), "Hapus")
            cek("Hapus santri & kelas uji", snt)
            def usr():
                buka("/pengguna")
                for _, email, _ in PENGUJI.values():
                    row = pg.locator("main ul li", has_text=email).first
                    if not row.count(): continue
                    row.get_by_role("button", name="Tindakan lain").click()
                    if HAPUS_PENGUJI:
                        pg.get_by_role("menuitem", name="Hapus pengguna").click()
                        modal().get_by_role("button", name="Hapus permanen").click(); pg.wait_for_timeout(2500)
                        if pg.locator("main ul li", has_text=email).count():  # fungsi server belum siap → cukup nonaktifkan
                            row.get_by_role("button", name="Tindakan lain").click()
                            pg.get_by_role("menuitem", name="Nonaktifkan").click(); pg.wait_for_timeout(1200)
                    else:
                        pg.get_by_role("menuitem", name="Nonaktifkan").click(); pg.wait_for_timeout(1200)
                sisa = sum(pg.locator("main ul li", has_text=e).count() for _, e, _ in PENGUJI.values())
                return "4 akun penguji dihapus" if HAPUS_PENGUJI and not sisa else "akun penguji dinonaktifkan"
            cek("Hapus / nonaktifkan akun penguji", usr)

        try:

            # ------------------------------------------------------------ 1. Admin & persiapan
            print("1. Admin & persiapan data uji")
            if not cek("Admin bisa masuk", lambda: masuk(ADMIN_EMAIL, ADMIN_PW)): raise Berhenti()
            cek("Dashboard admin tampil tanpa galat", lambda: (buka("/"), not toast_merah())[1])

            def buat_penguji():
                buka("/pengguna")
                for key, (nama, email, peran) in PENGUJI.items():
                    pg.get_by_role("button", name="Tambah pengguna").click(); m = modal()
                    fld(m, "Nama").fill(nama); fld(m, "Email").fill(email); fld(m, "Kata sandi awal").fill(SANDI_UJI)
                    m.get_by_role("button", name=peran, exact=True).click()
                    m.get_by_role("button", name="Tambah pengguna").click(); toast("Pengguna ditambahkan"); pg.wait_for_timeout(600)
                return f"{len(PENGUJI)} akun, sandi: {SANDI_UJI}"
            if not cek("Membuat 4 akun penguji", buat_penguji): raise Berhenti()

            def buat_kelas_santri():
                buka("/master/kelas"); pg.get_by_role("button", name="Tambah kelas").click(); m = modal()
                fld(m, "Nama kelas / kelompok").fill(KELAS); m.get_by_role("button", name="Simpan").click(); toast("disimpan"); pg.wait_for_timeout(500)
                buka("/master/santri"); pg.get_by_role("button", name="Tambah santri").click(); m = modal()
                fld(m, "Nama santri").fill(SANTRI); fld(m, "Kelas / kelompok").select_option(KELAS)
                m.get_by_role("button", name="Simpan").click(); toast("disimpan"); pg.wait_for_timeout(500)
            if not cek("Membuat kelas & santri uji", buat_kelas_santri): raise Berhenti()

            # ------------------------------------------------------------ 2. Bendahara
            print("\n2. Bendahara")
            cek("Bendahara bisa masuk", lambda: masuk(PENGUJI["bendahara"][1], SANDI_UJI))
            cek("Menu bendahara berisi keuangan, tanpa Pengguna", lambda: (lambda m: "Tagihan santri" in m and "Buku kas" in m and "Pengguna" not in m)(menu()))

            def tagihan():
                buka("/tagihan"); pg.get_by_role("button", name="Buat tagihan").first.click(); m = modal()
                m.get_by_role("button", name="Satu santri").click(); pilih_santri(m)
                fld(m, "Nominal per santri").fill("1000"); pg.wait_for_timeout(800)
                m.get_by_role("button", name=re.compile(r"Buat 1 tagihan")).click(); toast("tagihan dibuat")
            cek("Membuat tagihan untuk santri uji (Rp1.000)", tagihan)

            def bayar(nominal, cetak=False):
                buka("/pembayaran"); pilih_santri()
                item = pg.locator("ul.divide-y li").first; item.locator("input[type=checkbox]").check()
                item.locator("input[inputmode=numeric]").fill(str(nominal))
                pg.get_by_role("button", name="Simpan pembayaran").click(); toast("Pembayaran disimpan")
                if cetak:
                    with ctx.expect_page() as np: pg.get_by_role("button", name="Cetak kwitansi").click()
                    kw = np.value; kw.locator("article").first.wait_for(timeout=45000); kw.wait_for_timeout(1500)
                    ok = SANTRI in kw.locator("article").inner_text(timeout=15000)
                    kw.close()
                    if not ok: raise AssertionError("kwitansi tidak memuat nama santri")
            cek("Menerima pembayaran sebagian + kwitansi terbuka", lambda: bayar(400, cetak=True))
            cek("Buku kas terbuka tanpa galat (indeks aktif)", lambda: (buka("/buku-kas"), pg.wait_for_timeout(2500), not toast_merah() and "…" not in pg.locator("main").inner_text()[:600])[2])

            def pengeluaran():
                buka("/pengeluaran"); pg.get_by_role("button", name="Catat pengeluaran").first.click(); m = modal()
                fld(m, "Kategori").select_option(index=1); fld(m, "Keterangan").fill(KET); fld(m, "Nominal").fill("1000"); pg.wait_for_timeout(300)
                jadi = "pengajuan" if "Ajukan" in m.locator("h2").inner_text() else "kas"
                m.get_by_role("button", name=re.compile("Simpan|Kirim pengajuan")).click(); pg.wait_for_timeout(1500)
                ctx_data["pengeluaran"] = jadi
                return "tercatat langsung (di bawah batas / persetujuan tidak aktif)" if jadi == "kas" else "menjadi pengajuan"
            cek("Mencatat pengeluaran uji Rp1.000", pengeluaran)

            # ------------------------------------------------------------ 3. Kasir
            print("\n3. Kasir")
            cek("Kasir bisa masuk", lambda: masuk(PENGUJI["kasir"][1], SANDI_UJI))
            cek("Menu kasir hanya penerimaan", lambda: (lambda m: "Terima pembayaran" in m and "Buku kas" not in m and "Tagihan santri" not in m)(menu()))
            cek("Beranda kasir tanpa galat akses", lambda: (buka("/"), not toast_merah())[1])
            cek("Kasir menerima pembayaran", lambda: bayar(300))
            cek("Kasir tidak bisa membuka Buku kas", lambda: (buka("/buku-kas"), judul() == "Tidak punya akses")[1])
            cek("Kasir tidak bisa membuka Gaji", lambda: (buka("/gaji"), judul() == "Tidak punya akses")[1])

            # ------------------------------------------------------------ 4. Guru
            print("\n4. Guru / pendidikan")
            cek("Guru bisa masuk", lambda: masuk(PENGUJI["guru"][1], SANDI_UJI))
            cek("Menu guru tanpa keuangan", lambda: (lambda m: "Setoran hafalan" in m and not any(x in m for x in ["Buku kas", "Terima pembayaran", "Gaji & honor"]))(menu()))
            cek("Beranda guru tanpa galat akses", lambda: (buka("/"), not toast_merah())[1])

            def setoran():
                buka("/hafalan"); pg.get_by_role("button", name="Catat setoran").click(); m = modal()
                pilih_santri(m); fld(m, "Surat").select_option("114")
                m.get_by_role("button", name="Simpan").click(); toast("Setoran disimpan"); pg.wait_for_timeout(1500)
                if toast_merah(): raise AssertionError(toast_merah()[0])
            cek("Guru mencatat setoran hafalan", setoran)

            def absen():
                buka("/absensi"); fld(pg.locator("main"), "Kelas").select_option(KELAS); pg.wait_for_timeout(1200)
                pg.get_by_role("button", name=re.compile("Simpan")).last.click(); toast("Absensi disimpan")
            cek("Guru mengisi absensi kelas uji", absen)
            cek("Guru tidak bisa membuka Terima pembayaran", lambda: (buka("/pembayaran"), judul() == "Tidak punya akses")[1])
            cek("Guru tidak melihat tarif honor ustadz", lambda: (buka("/master/ustadz"), pg.locator("th", has_text="Tarif").count() == 0)[1])

            # ------------------------------------------------------------ 5. Pimpinan
            print("\n5. Pimpinan")
            cek("Pimpinan bisa masuk", lambda: masuk(PENGUJI["pimpinan"][1], SANDI_UJI))
            cek("Pimpinan membuka laporan keuangan tanpa galat", lambda: (buka("/laporan/keuangan"), pg.wait_for_timeout(1500), not toast_merah())[2])
            def setujui():
                buka("/persetujuan"); pg.wait_for_timeout(1000)
                if ctx_data.get("pengeluaran") != "pengajuan": return "tidak ada pengajuan uji (pengeluaran tercatat langsung) — halaman terbuka normal"
                item = pg.locator("li", has_text=KET).first
                item.get_by_role("button", name="Setujui").click(); modal().get_by_role("button", name="Setujui & catat").click(); toast("Disetujui")
                ctx_data["pengeluaran"] = "kas"
                return "pengajuan uji disetujui"
            cek("Halaman Persetujuan & menyetujui pengajuan uji", setujui)
            cek("Pimpinan tidak bisa membuka Tagihan", lambda: (buka("/tagihan"), judul() == "Tidak punya akses")[1])

            # ------------------------------------------------------------ 6. Admin: atur login & portal
            print("\n6. Admin: atur login & portal wali")
            cek("Admin masuk kembali", lambda: masuk(ADMIN_EMAIL, ADMIN_PW))
            def atur_login():
                buka("/pengguna")
                row = pg.locator("main ul li", has_text=PENGUJI["kasir"][1]).first
                row.get_by_role("button", name="Tindakan lain").click(); pg.get_by_role("menuitem", name="Atur email & kata sandi").click(); m = modal()
                fld(m, "Kata sandi baru").fill(SANDI_UJI + "x"); m.get_by_role("button", name="Simpan").click()
                pg.wait_for_timeout(4000)
                t = pg.locator("div.fixed[aria-live=polite]").inner_text()
                if "diperbarui" not in t: raise AssertionError(t.strip().splitlines()[-1] if t.strip() else "tidak ada respons")
                masuk(PENGUJI["kasir"][1], SANDI_UJI + "x"); masuk(ADMIN_EMAIL, ADMIN_PW)
            cek("Atur login (fungsi server + service account)", atur_login, wajib=False)

            def portal():
                buka("/laporan/kartu-santri"); pilih_santri()
                pg.get_by_role("button", name="Buat tautan portal").click(); toast("Portal wali aktif"); pg.wait_for_timeout(800)
                url = pg.locator("p.font-mono").inner_text()
                c2 = b.new_context(viewport={"width": 390, "height": 844}); p2 = c2.new_page()
                if STATE:  # server tiruan: data ada di localStorage, salin ke konteks tanpa login
                    raw = pg.evaluate("localStorage.getItem('__mockfs__')"); p2.goto(URL)
                    p2.evaluate("s => { const o = JSON.parse(s); o.current = null; localStorage.setItem('__mockfs__', JSON.stringify(o)); }", raw)
                p2.goto(url, wait_until="domcontentloaded"); p2.locator("main, p.text-lg").first.wait_for(timeout=45000); p2.wait_for_timeout(2000)
                ok = SANTRI in p2.locator("body").inner_text(); c2.close()
                pg.get_by_role("button", name="Nonaktifkan").click(); modal().get_by_role("button", name="Nonaktifkan").click(); toast("Portal dinonaktifkan")
                if not ok: raise AssertionError("portal tidak menampilkan nama santri")
            cek("Portal wali terbuka tanpa login, lalu dinonaktifkan", portal)

        except Berhenti:
            pass
        finally:
            if any(n == "Membuat 4 akun penguji" and st == "LULUS" for st, n, _ in hasil):
                bersihkan()
            b.close()
            tulis_laporan()

def tulis_laporan():
    lulus = sum(1 for h in hasil if h[0] == "LULUS"); gagal = sum(1 for h in hasil if h[0] == "GAGAL")
    f = os.path.join(OUT, f"laporan-{KODE}.md")
    with open(f, "w", encoding="utf-8") as w:
        w.write(f"# Laporan uji live PPMTQ\n\n- Aplikasi: {URL}\n- Waktu: {datetime.datetime.now():%d-%m-%Y %H:%M}\n- Kode uji: {KODE}\n- Hasil: **{lulus} lulus, {gagal} gagal**\n\n")
        w.write("| Status | Pemeriksaan | Catatan |\n|---|---|---|\n")
        for s, n, k in hasil: w.write(f"| {s} | {n} | {k.replace('|', '/')} |\n")
        if masalah_konsol:
            w.write("\n## Galat di console browser\n\n" + "\n".join(f"- `{m}`" for m in dict.fromkeys(masalah_konsol)) + "\n")
    print(f"\nSelesai: {lulus} lulus, {gagal} gagal. Laporan: {f}")
    sys.exit(1 if gagal else 0)

if __name__ == "__main__":
    main()
