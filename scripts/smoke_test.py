"""Smoke test: login + varredura de rotas privadas.

Uso (env vars obrigatorias):
  SMOKE_EMAIL=...  SMOKE_PASS=...  python scripts/smoke_test.py
"""
import asyncio, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from playwright.async_api import async_playwright

BASE = "http://192.168.20.131:5173"
ROUTES = ["/dashboard", "/rastreamento", "/jornada", "/frota", "/oc",
          "/motoristas", "/atrelamento", "/manutencao", "/historico", "/ferias", "/cercas"]

EMAIL = os.environ.get("SMOKE_EMAIL")
PASS  = os.environ.get("SMOKE_PASS")
if not EMAIL or not PASS:
    print("ERRO: defina SMOKE_EMAIL e SMOKE_PASS")
    sys.exit(2)

async def main():
    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1366, "height": 900})

        # ---------- LOGIN ----------
        page = await context.new_page()
        login_console = []
        login_pageerr = []
        page.on("console", lambda m: login_console.append((m.type, m.text)) if m.type == "error" else None)
        page.on("pageerror", lambda e: login_pageerr.append(str(e)))

        await page.goto(BASE + "/", wait_until="domcontentloaded", timeout=15000)
        await page.fill('input[type="email"]',    EMAIL)
        await page.fill('input[type="password"]', PASS)
        await page.click('button[type="submit"]')

        # Espera redirect ou erro
        try:
            await page.wait_for_url(lambda u: "/dashboard" in u or "/login" not in u and u.rstrip("/") != BASE,
                                    timeout=15000)
            login_ok = "/dashboard" in page.url or page.url.rstrip("/") != BASE
        except Exception:
            login_ok = False

        await page.wait_for_timeout(2500)
        login_url = page.url.replace(BASE, "")
        login_body = (await page.locator("body").inner_text())[:300]
        login_title = await page.title()

        print("=" * 80)
        print(f"LOGIN ATTEMPT — {EMAIL}")
        print("=" * 80)
        print(f"  result        : {'OK' if login_ok else 'FAIL'}")
        print(f"  url           : {login_url}")
        print(f"  title         : {login_title}")
        print(f"  body preview  : {login_body[:200].replace(chr(10), ' | ')}")
        if login_console:
            print(f"  console errors: {len(login_console)}")
            for t, m in login_console[:3]:
                print(f"    - [{t}] {m[:180]}")
        if login_pageerr:
            print(f"  page errors   : {len(login_pageerr)}")
            for e in login_pageerr[:3]:
                print(f"    - {e[:180]}")

        if not login_ok:
            await browser.close()
            return

        # ---------- VARRER ROTAS ----------
        for route in ROUTES:
            url = BASE + route
            console_errors = []
            page_errors = []
            p2 = await context.new_page()
            p2.on("console", lambda m, ce=console_errors: ce.append((m.type, m.text)) if m.type == "error" else None)
            p2.on("pageerror", lambda e, pe=page_errors: pe.append(str(e)))

            try:
                resp = await p2.goto(url, wait_until="domcontentloaded", timeout=20000)
                await p2.wait_for_timeout(3500)  # Firestore + render
                status = resp.status if resp else "no-resp"
                title = await p2.title()
                body = (await p2.locator("body").inner_text())[:600]
                final_url = p2.url.replace(BASE, "")
                results.append({
                    "route": route, "status": status, "title": title,
                    "final_url": final_url, "body_len": len(body),
                    "body_preview": body[:240].replace("\n", " | "),
                    "console_errors": console_errors[:5],
                    "page_errors": page_errors[:3],
                    "redirected": final_url != route,
                })
            except Exception as e:
                results.append({"route": route, "error": str(e)[:200]})

            await p2.close()

        await browser.close()

    print()
    print("=" * 80)
    print(f"ROTAS PRIVADAS — {BASE}")
    print("=" * 80)
    for r in results:
        if "error" in r:
            print(f"\n[FAIL] {r['route']}: {r['error']}")
            continue
        clean = r["status"] == 200 and not r["console_errors"] and not r["page_errors"]
        redir = " (redirecionou!)" if r["redirected"] else ""
        flag = "OK  " if clean else "WARN"
        print(f"\n[{flag}] {r['route']}{redir}  HTTP {r['status']}  -> {r['final_url']}")
        print(f"      body_len : {r['body_len']}")
        print(f"      preview  : {r['body_preview']}")
        if r["console_errors"]:
            print(f"      CONSOLE ERRORS ({len(r['console_errors'])}):")
            for t, m in r["console_errors"]:
                print(f"        - [{t}] {m[:220]}")
        if r["page_errors"]:
            print(f"      PAGE ERRORS ({len(r['page_errors'])}):")
            for e in r["page_errors"]:
                print(f"        - {e[:220]}")

if __name__ == "__main__":
    asyncio.run(main())
