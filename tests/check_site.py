#!/usr/bin/env python3
"""
End-to-end browser checks for the dashboard (needs: pip install playwright && playwright install chromium).

  python3 -m http.server 8765 -d site &      # in one terminal
  python3 tests/check_site.py [http://localhost:8765/]

Checks every page on desktop (1440 px) and phones (390 px, 360 px; English and Bahasa Indonesia):
no script errors, no broken values (NaN, undefined, Infinity), no horizontal overflow, then core
interactions, then load time on a throttled "slow 4G" phone. Exits 1 on any failure.
"""
import asyncio
import sys

from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/"
PAGES = ["overview", "headcount", "attrition", "inout", "productivity", "cost", "ratios", "analysis", "ta",
         "performance", "development", "predictive"]
FAILS = []


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        FAILS.append(msg)


async def pages(b, width, lang, mobile):
    pg = await b.new_page(viewport={"width": width, "height": 860}, is_mobile=mobile, has_touch=mobile)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    for k in PAGES:
        await pg.goto(f"{URL}#page={k}&lang={lang}")
        await pg.wait_for_selector(".page", timeout=20000)
        await pg.wait_for_timeout(700)
        txt = await pg.inner_text("#content")
        bad = [w for w in ("NaN", "undefined", "Infinity", "[object") if w in txt]
        sw = await pg.evaluate("document.documentElement.scrollWidth")
        boxes = await pg.locator("#content .err").count()
        check(not bad and sw <= width + 1 and not boxes, f"{k:12s} {width}px {lang}: values ok, width {sw}px")
    check(not errs, f"no script errors at {width}px {lang} {errs[:2]}")
    await pg.close()


BANNED = [r"compa-?ratio", r"\bFTE\b", r"EBITDA", r"requisition", r"\bYTD\b", r"\bMTD\b", r"\bTTM\b", r"\bFY\d", r"\bAUC\b", r"\bmerit\b",
          r"run-rate", r"\bband\b", r"midpoint", r"annualis", r"calibrat", r"9-box\)\)", r"turnaround", r"successor", r"time-to-fill", r"cost-per-hire",
          r"\bROI\b", r"regretted", r"headcount effect", r"rate effect", r"back-test", r"hold-out", r"odds"]


async def plain_language(b):
    """Specialist terms must not appear in the visible text (the technical box for analysts is exempt)."""
    import re
    pg = await b.new_page(viewport={"width": 1440, "height": 900})
    for lang in ("en", "id"):
        bad = []
        for k in PAGES:
            await pg.goto(f"{URL}#page={k}&lang={lang}")
            await pg.wait_for_selector(".page .hero", timeout=20000)
            await pg.wait_for_timeout(500)
            txt = await pg.evaluate("""() => { const c = document.querySelector('#content').cloneNode(true);
                c.querySelectorAll('details.analyst').forEach(e => e.remove()); return c.innerText + ' ' + document.querySelector('.head').innerText + ' ' + document.querySelector('#filters').innerText }""")
            for pat in BANNED:
                m = re.search(pat, txt, flags=0 if pat.startswith(("\\bFTE", "\\bROI", "\\bAUC", "\\bYTD", "\\bMTD", "\\bTTM")) else re.I)
                if m:
                    bad.append(f"{k}: '{m.group(0)}'")
            has_guide = await pg.locator("details.guide").count()
            if not has_guide:
                bad.append(f"{k}: no how-to-read guide")
        check(not bad, f"plain language ({lang}): no specialist terms and a guide on every page {bad[:3]}")
    await pg.close()


async def density(b):
    """Text budget: readers should see charts, not paragraphs. Fails if a page grows wordy again."""
    pg = await b.new_page(viewport={"width": 1440, "height": 900})
    await pg.add_init_script("localStorage.removeItem('demo-guide')")
    over = []
    for k in PAGES:
        await pg.goto(f"{URL}#page={k}&lang=en")
        await pg.wait_for_selector(".page .hero", timeout=20000)
        await pg.wait_for_timeout(500)
        r = await pg.evaluate("""() => { const w = t => (t.trim().match(/\\S+/g) || []).length; const c = document.querySelector('#content');
            let prose = 0; c.querySelectorAll('p,.note,.sw-item,li,.tagline,.act,dd').forEach(el => { if (el.closest('details:not([open])') || el.querySelector('p,li')) return;
              const n = w(el.innerText); if (n >= 12) prose += n; });
            const it = [...document.querySelectorAll('.sw-item')].map(e => { const p = e.querySelectorAll('p'); return [w(p[0].innerText), w(p[1].innerText)]; });
            return { prose, f: Math.max(...it.map(x => x[0])), a: Math.max(...it.map(x => x[1])), sub: Math.max(0, ...[...document.querySelectorAll('.card-head .note')].map(e => w(e.innerText))),
                     page: w(document.querySelector('#page-sub').innerText), guide: !!document.querySelector('details.guide[open]') } }""")
        budget = 260 if k == "predictive" else 150
        why = []
        if r["prose"] > budget: why.append(f"prose {r['prose']}>{budget}")
        if r["f"] > 28: why.append(f"finding {r['f']}>28")
        if r["a"] > 22: why.append(f"action {r['a']}>22")
        if r["sub"] > 14: why.append(f"card subtitle {r['sub']}>14")
        if r["page"] > 14: why.append(f"page subtitle {r['page']}>14")
        if r["guide"]: why.append("how-to-read panel is open by default")
        if why: over.append(f"{k}: {', '.join(why)}")
    check(not over, f"text budget on all 12 pages (prose <=150 words, <=260 on Predictive; insights short; guide closed) {over[:3]}")
    await pg.close()


async def interactions(b):
    pg = await b.new_page(viewport={"width": 1366, "height": 900})
    await pg.goto(URL)
    await pg.wait_for_selector(".page .hero")
    await pg.wait_for_timeout(900)
    hc0 = await pg.inner_text(".hero-value")
    await pg.click("details[data-k=dept] > summary")
    await pg.click("details[data-k=dept] [data-fa=none]")
    await pg.check('details[data-k=dept] input[value="Production"]')
    await pg.wait_for_timeout(900)
    check(await pg.inner_text(".hero-value") != hc0, "department filter changes the numbers")
    await pg.click("#page-title")
    await pg.click("#f-reset")
    await pg.wait_for_timeout(900)
    check(await pg.inner_text(".hero-value") == hc0, "reset restores the numbers")
    await pg.click("[data-period=ytd]")
    await pg.wait_for_timeout(300)
    check("period=ytd" in pg.url, "period switch updates the link")
    await pg.click("[data-lang=id]")
    await pg.wait_for_timeout(300)
    check(await pg.inner_text("#page-title") == "Ringkasan Eksekutif", "language switch")
    await pg.focus(".stat .info")
    check(await pg.is_visible("#tip"), "formula tooltip opens on keyboard focus")
    await pg.goto(URL + "#page=predictive")
    await pg.wait_for_timeout(900)
    before = await pg.inner_text("#fc-out .stat-value >> nth=0")
    await pg.fill("#sl-hc", "8")
    await pg.dispatch_event("#sl-hc", "input")
    await pg.wait_for_timeout(200)
    check(await pg.inner_text("#fc-out .stat-value >> nth=0") != before, "what-if slider updates the forecast")
    await pg.goto(URL + "#page=inout&lang=en")
    await pg.wait_for_timeout(900)
    await pg.fill("#q-io", "Quality")
    await pg.wait_for_timeout(300)
    rows = await pg.locator("#list .tr:not(.th)").all_inner_texts()
    check(bool(rows) and all("Quality" in r for r in rows), "In/Out search filters the list")
    await pg.close()


async def load_time(b):
    ctx = await b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
    pg = await ctx.new_page()
    cdp = await ctx.new_cdp_session(pg)
    await cdp.send("Network.enable")
    await cdp.send("Network.emulateNetworkConditions", {"offline": False, "latency": 150, "downloadThroughput": 1600 * 128, "uploadThroughput": 750 * 128})
    await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
    t0 = asyncio.get_event_loop().time()
    await pg.goto(URL)
    await pg.wait_for_selector(".page .hero", timeout=30000)
    t = asyncio.get_event_loop().time() - t0
    check(t < 3.0, f"slow 4G phone (1.6 Mbps, 150 ms RTT, CPU x4): dashboard ready in {t:.2f}s (server must gzip)")
    await ctx.close()


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await pages(b, 1440, "en", False)
        await pages(b, 390, "en", True)
        await pages(b, 360, "id", True)
        await plain_language(b)
        await density(b)
        await interactions(b)
        if "--no-perf" not in sys.argv:
            await load_time(b)
        await b.close()
    print(f"\n{'ALL CHECKS PASSED' if not FAILS else str(len(FAILS)) + ' FAILED'}")
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    asyncio.run(main())
