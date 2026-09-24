#!/usr/bin/env bash
# Uji live PPMTQ (Mac/Linux)
cd "$(dirname "$0")/../.."
python3 -m pip install --quiet playwright
python3 -m playwright install chromium
python3 tests/live/uji_live.py --tampil
