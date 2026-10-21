# Acceptance checklist

Tested on 21 October 2026 with the data as of that day, in headless Chromium.
To re-run: `python3 generator/validate.py` and `python3 tests/check_site.py` (see the README).

| # | Requirement | How it was checked | Result |
|---|---|---|---|
| 1 | No trace of any real company: data, terms or structure | Forbidden-term scan (52 SHA-256-hashed terms) over every text file in the repo, plus the text of the LinkedIn carousel. Fictional company, products (polyolefins), sites (HQ + Plants A/B/C), departments, generic Indonesian job bands, Permanent/Contract, anonymous IDs (E-0001). No retirement or population metrics. | **Pass** · 0 hits. The scan caught one term during development, which was renamed. |
| 2 | Every page is filled | 12 pages × 3 viewports (1440 px EN, 390 px EN, 360 px ID): no empty error state, no NaN, undefined or Infinity, no script errors | **Pass** · 36/36 |
| 3 | Mobile responsive | Page width equals viewport width at 390 px and 360 px on every page; tap targets ≥ 44 px; formula tooltips open on tap | **Pass** |
| 4 | Load time under 3 s | Slow 4G phone emulation (1.6 Mbps, 150 ms RTT, CPU 4× slower), gzip on, first dashboard view | **Pass** · 2.2–2.7 s on a phone; 0.8 s on 10 Mbps desktop. About 240 KB transferred. |
| 5 | Public, no login, free hosting | GitHub Pages via GitHub Actions, no secrets, no database | **Pass** |
| 6 | Data feels live | Data regenerated daily as of today (07:15 WIB); "Data as of" chip; history stays identical when the date moves forward (verified) | **Pass** |
| 7 | "Demo, synthetic data" badge | Header chip on every page, sidebar note, Open Graph image, carousel | **Pass** |
| 8 | Requested navigation | Executive Overview · Workforce (Headcount & Department, Attrition, In/Out) · Productivity & Cost (Productivity, Manpower Cost, Cost Ratios, Cost Analysis) · Talent Acquisition · Talent Management (Performance, Development) · Predictive Insights | **Pass** |
| 9 | Formula on every metric | ⓘ buttons on headline numbers and chart titles (47 definitions, EN + ID), also in docs/METRICS.md | **Pass** |
| 10 | "So what?" card, 2–3 insights + actions, at most 6–8 visuals per page | Present on all 12 pages; text computed from data and filters | **Pass** |
| 11 | Data spec | About 1,200 employees, 8 departments, monthly since Jan 2023, USD; revenue growth 8.7–11.3% for every rolling 12 months; manpower cost 7.1–7.8% of revenue (6–10%, the realistic petrochemical range agreed in phase 1); turnover 12.2–14.7% for every rolling 12 months; time-to-fill 37–43 days | **Pass** · 75/75 validation checks |
| 12 | Planted correlations make the models meaningful | Voluntary exit ×3.4 for compa-ratio < 0.90 vs ≥ 1.00; ×3.8 for > 36 vs < 18 months since promotion; ×1.9 for tenure < 2 vs 5–10 years; ×2.4 for low training | **Pass** |
| 13 | Three predictive models, labelled illustrative, with methodology | Forecast (OLS + seasonality, 80% band, what-if sliders, back-test error 1.4%); attrition risk (logistic regression, AUC 0.69 on the 2025 hold-out, tiers and drivers by department); K-Means k = 4 with business names | **Pass** |
| 14 | Interactive filters | Department, location, employment type, job band, gender; period (last 12 months / YTD / last FY); language EN/ID; links keep page, period and language | **Pass** · 7/7 interaction checks |
| 15 | Accessibility basics | Keyboard navigation with visible focus, tooltips on focus, labelled controls, reduced-motion respected, AA contrast on text | **Pass** |
| 16 | README with purpose, methodology and how to regenerate data | README.md, docs/DATA.md, docs/METRICS.md, docs/VALIDATION.md | **Pass** |

**Known limits, stated in the product.**
- The attrition model ranks current employees. Its "expected resignations" exclude people who have not been hired yet, so it is lower than the total yearly resignations.
- Segments overlap (silhouette 0.22), as people data usually does.
- Revenue, EBITDA and production are company-level, so filters do not apply on the Productivity page.
