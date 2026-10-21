#!/usr/bin/env python3
"""
Builds the sharing assets from the live dashboard (needs Playwright + Chromium and a local server):
  site/og.png              1200x630 link preview (Open Graph)
  linkedin/0*.png          high-resolution screenshots
  linkedin/carousel.pdf    7-slide 1080x1350 document post

Usage:  python3 -m http.server 8765 -d site &   then   python3 tests/make_assets.py [http://localhost:8765/]
"""
import asyncio
import base64
import os
import sys

from PIL import Image
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8765/"
OUT = os.path.join(ROOT, "linkedin")
FONT = "'IBM Plex Sans', system-ui, sans-serif"
NAVY, PURPLE, ORANGE, INK, MUTED = "#13405B", "#784791", "#F08A00", "#0F172A", "#5B6170"


def data_uri(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


async def shot(page, hash_, path, clip_h=None, width=1280, scroll_to=None):
    await page.set_viewport_size({"width": width, "height": 900})
    await page.goto(URL + "#" + hash_)
    await page.wait_for_selector(".page .hero")
    await page.wait_for_timeout(1600)
    if scroll_to:
        await page.add_style_tag(content=".toolbar{position:static!important;box-shadow:none!important}")
        await page.evaluate(f"document.querySelector('{scroll_to}').scrollIntoView({{block:'start'}})")
        await page.wait_for_timeout(300)
        box = await page.evaluate(f"(() => {{ const r = document.querySelector('{scroll_to}').getBoundingClientRect(); return [r.left, r.top, r.width] }})()")
        await page.screenshot(path=path, clip={"x": box[0] - 8, "y": max(0, box[1] - 8), "width": box[2] + 16, "height": clip_h})
        return
    main = await page.evaluate("(() => { const r = document.querySelector('#main').getBoundingClientRect(); return [r.left, r.width] })()")
    await page.screenshot(path=path, clip={"x": main[0], "y": 0, "width": main[1], "height": clip_h or 900}, full_page=True)


SLIDE_CSS = f"""<style>*{{box-sizing:border-box;margin:0}}body{{width:1080px;height:1350px;font-family:{FONT};background:#F5F6F8;color:{INK}}}
.s{{width:1080px;height:1350px;padding:70px 64px;display:flex;flex-direction:column;gap:30px}}
.tag{{align-self:flex-start;background:#FFF6EA;color:#8A4B00;border:1px solid #F6CF9A;border-radius:999px;padding:8px 18px;font-weight:600;font-size:22px}}
h1{{font-size:68px;line-height:1.05;letter-spacing:-.02em;color:{NAVY}}}h2{{font-size:52px;line-height:1.1;letter-spacing:-.015em;color:{NAVY}}}
p.lead{{font-size:28px;line-height:1.45;color:#374151;max-width:900px}}
.shot{{border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,.16);border:1px solid #E8E9EE;background:#fff}}.shot img{{display:block;width:100%}}
.foot{{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:22px;color:{MUTED}}}
.mark{{display:flex;align-items:center;gap:14px;font-weight:700;color:{NAVY};font-size:24px}}.mark i{{width:44px;height:44px;border-radius:12px;background:{PURPLE};color:#fff;font-style:normal;display:flex;align-items:center;justify-content:center;font-size:22px}}
.tiles{{display:grid;grid-template-columns:1fr 1fr;gap:20px}}.tile{{background:#fff;border:1px solid #E8E9EE;border-radius:22px;padding:30px 32px}}.tile b{{display:block;font-size:56px;color:{NAVY};letter-spacing:-.02em}}.tile span{{font-size:23px;color:{MUTED}}}
.tile.dark{{background:{NAVY};border-color:{NAVY}}}.tile.dark b{{color:#fff}}.tile.dark span{{color:#CFE0EA}}
ul{{list-style:none;padding:0;display:flex;flex-direction:column;gap:22px}}li{{font-size:28px;line-height:1.4;display:flex;gap:18px;background:#fff;border:1px solid #E8E9EE;border-radius:18px;padding:22px 26px}}li i{{flex:none;width:14px;height:14px;border-radius:50%;margin-top:12px}}
.n{{font-size:22px;color:{MUTED};font-weight:600}}</style>"""


def slide(body, n, total):
    return f"<html><head>{SLIDE_CSS}</head><body><div class='s'>{body}<div class='foot'><span class='mark'><i>D</i>Demo Corp · People Analytics</span><span class='n'>{n} / {total}</span></div></div></body></html>"


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(device_scale_factor=2)
        await pg.add_init_script("localStorage.setItem('demo-guide','0')")
        await pg.goto(URL)
        await pg.wait_for_selector(".page .hero")
        await pg.wait_for_timeout(1400)
        stats = await pg.evaluate("""() => { const v = [...document.querySelectorAll('.stat .stat-value')].map(e => e.textContent.trim());
            return { hc: document.querySelector('.hero-value').textContent.trim(), rev: v[0], mc: v[1], to: v[2], ttf: v[3], asof: document.querySelector('#chip-date span').textContent.trim() } }""")
        await pg.goto(URL + "#page=predictive")
        await pg.wait_for_selector(".page .hero")
        await pg.wait_for_timeout(800)
        auc = await pg.evaluate("[...document.querySelectorAll('.stat')].find(s => s.textContent.includes('accuracy')).querySelector('.stat-value').textContent.trim()")
        print("stats", stats, "auc", auc)

        s1 = os.path.join(OUT, "01-overview.png"); await shot(pg, "page=overview", s1, 1180)
        s2 = os.path.join(OUT, "02-cost-analysis.png"); await shot(pg, "page=analysis", s2, 1000)
        s3 = os.path.join(OUT, "03-performance.png"); await shot(pg, "page=performance", s3, 640, scroll_to=".grid2:nth-of-type(2)")
        s4 = os.path.join(OUT, "04-forecast.png"); await shot(pg, "page=predictive", s4, 820, scroll_to="#fc-box")
        s5 = os.path.join(OUT, "05-talent-acquisition.png"); await shot(pg, "page=ta", s5, 1000)
        # mobile
        mp = await b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
        await mp.add_init_script("localStorage.setItem('demo-guide','0')")
        await mp.goto(URL); await mp.wait_for_selector(".page .hero"); await mp.wait_for_timeout(1400)
        s6 = os.path.join(OUT, "06-mobile.png"); await mp.screenshot(path=s6, clip={"x": 0, "y": 0, "width": 390, "height": 1140}, full_page=True)

        # ---- Open Graph 1200x630
        og = await b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
        await og.set_content(f"""<html><head><style>*{{margin:0;box-sizing:border-box}}body{{width:1200px;height:630px;font-family:{FONT};background:{NAVY};overflow:hidden;position:relative}}
          .l{{position:absolute;left:64px;top:58px;width:500px;color:#fff;display:flex;flex-direction:column;gap:22px}}
          .mk{{display:flex;align-items:center;gap:12px;font-weight:600;font-size:20px;color:#CFE0EA}}.mk i{{width:40px;height:40px;border-radius:11px;background:{PURPLE};font-style:normal;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}}
          h1{{font-size:56px;line-height:1.04;letter-spacing:-.02em}}p{{font-size:21px;line-height:1.45;color:#CFE0EA}}
          .k{{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px}}.k div{{background:#1E5577;border-radius:14px;padding:14px 16px}}.k b{{display:block;font-size:28px}}.k span{{font-size:15px;color:#CFE0EA}}
          .tag{{align-self:flex-start;background:#FFF6EA;color:#8A4B00;border-radius:999px;padding:6px 14px;font-weight:600;font-size:16px}}
          .r{{position:absolute;left:610px;top:60px;width:820px;border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.18)}}.r img{{display:block;width:100%}}</style></head>
          <body><div class="l"><span class="mk"><i>D</i>Demo Corp · People Analytics</span><h1>HR dashboard on fully synthetic data</h1>
          <p>Workforce, productivity &amp; cost, talent and three predictive models for a fictional petrochemical manufacturer.</p>
          <div class="k"><div><b>{stats['hc']}</b><span>employees</span></div><div><b>{stats['to']}</b><span>turnover, last 12 months</span></div><div><b>{stats['rev']}</b><span>revenue per employee</span></div><div><b>{auc}</b><span>attrition model AUC</span></div></div>
          <span class="tag">Demo · synthetic data</span></div><div class="r"><img src="{data_uri(s1)}"></div></body></html>""")
        await og.wait_for_timeout(400)
        await og.screenshot(path=os.path.join(ROOT, "site", "og.png"))

        # ---- carousel
        sl = await b.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=1)
        T = 7
        slides = [
            f"""<span class='tag'>Demo · 100% synthetic data</span><h1>People analytics for a petrochemical manufacturer</h1>
            <p class='lead'>A full HR dashboard for fictional Demo Corp: workforce, productivity &amp; cost, talent and three predictive models. Refreshed daily from a seeded script.</p>
            <div class='tiles'><div class='tile dark'><b>{stats['hc']}</b><span>employees, 3 plants + HQ</span></div><div class='tile'><b>{stats['to']}</b><span>turnover, last 12 months</span></div>
            <div class='tile'><b>{stats['rev']}</b><span>revenue per employee</span></div><div class='tile'><b>{stats['ttf']}</b><span>median time-to-fill</span></div></div>""",
            f"""<h2>One page for the leadership team</h2><p class='lead'>Headline numbers, then a "So what?" card in plain words: what it means and what to do, recalculated for every filter.</p><div class='shot'><img src='{data_uri(s1)}'></div>""",
            f"""<h2>Where did the extra people cost come from?</h2><p class='lead'>A simple breakdown splits the change into the cost of having more people and the cost of paying each person more, next to actual vs budget by department.</p><div class='shot'><img src='{data_uri(s2)}'></div>""",
            f"""<h2>Results and behavior, side by side</h2><p class='lead'>Ratings combine 70% goal results and 30% behavior (safety, teamwork, integrity). The performance & potential grid and the "Results vs. Behavior" grid show who to grow and who to coach.</p><div class='shot'><img src='{data_uri(s3)}'></div>""",
            f"""<h2>Test the plan before the budget</h2><p class='lead'>A 12-month forecast with an 80% range and what-if sliders for revenue, pay and headcount. Also: who might resign (accuracy score {auc}) and four groups of similar employees.</p><div class='shot'><img src='{data_uri(s4)}'></div>""",
            f"""<h2>Built to be trusted</h2><ul>
            <li><i style='background:{PURPLE}'></i>Written for non-experts: a how-to-read guide on every page, plain words, a glossary, and each metric's formula one tap away.</li>
            <li><i style='background:{ORANGE}'></i>75 automated checks: ranges, consistency, planted correlations, no real-company footprint.</li>
            <li><i style='background:{NAVY}'></i>Models labelled illustrative, with back-tests and limits stated.</li>
            <li><i style='background:{PURPLE}'></i>No backend, no login, free hosting, loads in under 3 seconds.</li>
            <li><i style='background:{ORANGE}'></i>English and Bahasa Indonesia, keyboard and mobile friendly.</li></ul>""",
            f"""<h2>Explore it yourself</h2><p class='lead'>Live dashboard and full code, including the data generator and the models, are linked in the first comment.</p>
            <div style='display:flex;gap:26px;align-items:flex-start'><div class='shot' style='width:400px;flex:none;max-height:860px'><img src='{data_uri(s6)}'></div>
            <div style='display:flex;flex-direction:column;gap:18px;font-size:27px;line-height:1.45;color:#374151'><p>12 pages · 6 menu areas</p><p>Filters by department, location, employment type, job level and gender</p><p>Data as of today, every day</p><p style='color:{PURPLE};font-weight:600'>What would you add for a manufacturing HR team?</p></div></div>""",
        ]
        paths = []
        for i, body in enumerate(slides, 1):
            await sl.set_content(slide(body, i, T))
            await sl.wait_for_timeout(300)
            pth = os.path.join(OUT, f"slide-{i}.png")
            await sl.screenshot(path=pth)
            paths.append(pth)
        await b.close()
    imgs = [Image.open(x).convert("RGB") for x in paths]
    imgs[0].save(os.path.join(OUT, "carousel.pdf"), save_all=True, append_images=imgs[1:], resolution=144)
    for x in paths:
        os.remove(x)
    print("assets written")


if __name__ == "__main__":
    asyncio.run(main())
