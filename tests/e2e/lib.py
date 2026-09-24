import re, json
from playwright.sync_api import sync_playwright, expect
import os
BASE = os.environ.get("PPMTQ_URL", "http://localhost:5299")
OUT = os.environ.get("PPMTQ_OUT", os.path.join(os.path.dirname(__file__), "_hasil"))
os.makedirs(OUT, exist_ok=True)
BROWSER = {"executable_path": os.environ["CHROMIUM"]} if os.environ.get("CHROMIUM") else {}
errors=[]
def attach(pg, tag="main"):
    pg.on("pageerror", lambda e: errors.append(f"[{tag}] PAGEERROR {e}"))
    pg.on("console", lambda m: m.type=="error" and errors.append(f"[{tag}] CONSOLE {m.text}"))
def modal(pg): return pg.locator('[role=dialog]').last
def toast(pg, text):
    expect(pg.locator('div.fixed[aria-live=polite]')).to_contain_text(text, timeout=20000)
def fs(pg):
    return pg.evaluate("JSON.parse(localStorage.getItem('__mockfs__'))")
def nav(pg, label):
    pg.locator('aside nav a', has_text=label).first.click(); pg.wait_for_timeout(300)
def fld(scope, text):
    return scope.locator(f"xpath=.//label[span[normalize-space(text())='{text}']]").locator("input,select,textarea").first
