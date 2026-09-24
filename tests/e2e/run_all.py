"""Jalankan semua uji ujung-ke-ujung berurutan (tiap uji memakai data hasil uji sebelumnya).
Persiapan:  pip install playwright openpyxl pillow && python -m playwright install chromium
Jalankan server tiruan di terminal lain:  npm run test:server
Lalu:  python tests/e2e/run_all.py
"""
import subprocess, sys, os, glob, time
here = os.path.dirname(os.path.abspath(__file__))
gagal = []
for f in sorted(glob.glob(os.path.join(here, "[0-9][0-9]_*.py"))):
    t = time.time()
    r = subprocess.run([sys.executable, f], capture_output=True, text=True)
    ok = r.returncode == 0 and "Traceback" not in r.stderr + r.stdout
    err_line = [l for l in r.stdout.splitlines() if l.startswith("ERRORS:")]
    if err_line and err_line[-1].strip() not in ("ERRORS: []",) and "404" not in err_line[-1] and "409" not in err_line[-1]:
        ok = False
    print(f"{'LULUS' if ok else 'GAGAL'}  {os.path.basename(f)}  ({time.time()-t:.0f} dtk)")
    if not ok:
        gagal.append(f); print((r.stdout + r.stderr)[-2000:])
print("\nSemua uji lulus." if not gagal else f"\n{len(gagal)} uji gagal.")
sys.exit(1 if gagal else 0)
