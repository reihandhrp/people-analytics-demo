# Data dictionary

All files live in `site/data/` and are produced by `generator/generate.py`. Everything is synthetic: the company, people, IDs and figures are fictional.

**Format.** Each table is `{"columns": [...], "dims": {...}, "rows": [[...], ...]}`. Columns listed in `dims` hold an index into that list (e.g. `dept: 2` means `dims.dept[2]`). Dates are ISO `YYYY-MM-DD`; months are `YYYY-MM`; money is whole US dollars; `null` means not applicable.

## Company design

Demo Corp is a fictional polyolefin producer (polyethylene and polypropylene) with a Corporate HQ and three plants (A, B, C). Data starts 1 January 2023 and ends on the as-of date. Plant C is expanded from July 2025. Planned turnarounds (maintenance shutdowns): Plant B May–Jun 2024, Plant A Aug–Sep 2025, Plant C Feb–Mar 2026.

| Dimension | Values |
|---|---|
| Department (8) | Production, Maintenance & Reliability, HSE, Quality & Laboratory, Supply Chain, Engineering & Projects, Commercial, Corporate Services |
| Location (4) | Corporate HQ, Plant A, Plant B, Plant C |
| Job band (6) | Operator, Staff, Supervisor, Manager, General Manager, Director |
| Employment type | Permanent (PKWTT), Contract (PKWT, 12 or 24 months, renewable once) |
| Exit reason | Resignation (voluntary), Termination (involuntary), End of contract |
| Hire source | Referral, Job board, LinkedIn, Agency, Careers site, Internal |

## Files

| File | Grain | Columns |
|---|---|---|
| `meta.json` | one object | company, as_of, last_closed_month, window_start, dims, band_midpoints per year, performance weights, plans per FY (plan revenue, EBITDA, average headcount, per-employee targets), turnarounds, plan_headcount |
| `employees.json` | one row per person ever employed in the window (incl. accepted offers starting after the as-of date) | emp_id (E-0001), dept, loc, band, etype, gender, birth_date, hire_date, exit_date, exit_reason, notice_date, base_salary (current or at exit), compa_ratio, potential, last_promo_date, hire_source, req_id, contract_end |
| `emp_years.json` | person × year | 1 January snapshot (band_jan, dept_jan, loc_jan, etype_jan, compa_jan, months_since_promo_jan, tenure_jan, train_hours_prev, last_rating_jan); review cycle results for that year (kpi_pct, kpi_score, c1–c5 competency scores in the order of `meta.dims.competencies`, behavior_score, final_rating, potential); training_hours in the year; promoted (0/1) |
| `moves.json` | one row per promotion or transfer | emp_id, date, type, via (Annual cycle / Internal fill), from/to dept, from/to band, req_id |
| `cost_monthly.json` | month × dept × location × band × employment type | headcount_end, fte, base, bonus, benefits, overtime, training, others, training_hours |
| `budget_monthly.json` | month × dept (full years) | budget_headcount, budget_cost |
| `finance_monthly.json` | month (company) | revenue, ebitda, production_kt, sales_kt, avg_price_per_t |
| `production_monthly.json` | month × plant | capacity_kt, production_kt, utilization, turnaround (prep / shutdown / restart) |
| `requisitions.json` | one row per requisition | req_id, dept, loc, band, reason (Replacement / Backfill / Growth), opened, closed, status (Open / Filled / Cancelled), source, internal, applicants, screened, interviewed, offers, accepted, hire_emp_id, cost_ads, cost_agency, cost_referral, cost_recruiter, cost_assessment |
| `key_positions.json` | one row per key position (as-of date) | pos_id, dept, loc, band, incumbent_id, incumbent_exit, ready_now, ready_1_2y |

## How the data is generated

1. **Operations and finance.** Monthly plant capacity × utilisation × seasonality, with turnarounds reducing output (inventory built beforehand cushions sales). Polymer price has a trend, seasonality and noise; a smooth price index is calibrated so calendar-year revenue grows 9–11%. EBITDA margin moves around 12.5% with a cycle and dips in turnaround months.
2. **People.** About 1,080 employees on 1 January 2023, simulated month by month. Every month each employee's resignation probability comes from a logistic score with planted drivers: compa-ratio (below midpoint raises risk), months since promotion (beyond 2 years raises risk; a recent promotion lowers it), tenure (first two years are riskiest), training hours, an extra effect for high performers paid below midpoint, contract status, department and location. A common intercept is calibrated each month so total turnover stays on a smooth 12–14% path; the relative drivers are untouched. Terminations depend on the last rating; contract renewals are decided 30 days before the end date.
3. **Hiring.** Exits open replacement requisitions; a headcount plan opens growth requisitions where the department × band mix is short. Time-to-fill depends on band, source, department and a hard-to-fill tail; funnel counts, offer declines and costs are drawn per requisition. Supervisor-and-above roles are often filled internally (a promotion that opens a backfill).
4. **Pay and performance.** Band midpoints rise 4.5% each January; merit increases in April depend on the last rating (and nudge low compa-ratios up). Annual reviews on 31 December combine KPI achievement (70%) and five behavioral competencies (30%). Bonuses are paid in March from rating × band target × company factor (EBITDA vs plan).

**Reproducibility.** Every random draw is keyed by entity and period (not by draw order) and events are processed in date order, so the same seed and as-of date give byte-identical files, and moving the as-of date forward appends history without changing the past. `generator/validate.py` checks ranges, consistency, the planted correlations and the forbidden-term scan.
