@echo off
REM Uji live PPMTQ (Windows). Klik dua kali file ini.
cd /d "%~dp0\..\.."
python -m pip install --quiet playwright
python -m playwright install chromium
python tests\live\uji_live.py --tampil
pause
