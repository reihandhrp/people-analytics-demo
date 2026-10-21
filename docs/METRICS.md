# Metric definitions

Every number on the dashboard follows these definitions. The dashboard shows the same text in the ⓘ tooltip next to each metric (English and Bahasa Indonesia).

## Conventions

| Term | Meaning |
|---|---|
| As-of date | Data cut-off (today when the site is rebuilt). People events (joins, exits, promotions, requisitions) run to this date. |
| Last closed month | Finance, cost and production run to the previous calendar month (books close monthly). |
| FY | Calendar year (FY2023 … FY2025 are complete). |
| YTD | 1 January of the current year to the last closed month (people metrics: to the as-of date). |
| TTM | Trailing twelve months ending in the last closed month. |
| Active | Hire date ≤ date and (no exit date or exit date > date). Exit date = first day no longer employed. |
| Scheduled exit | Notice given, exit date after the as-of date. Still counted as active. |
| Headcount (month-end) | Active on the last day of the month. |
| Average headcount | Mean of month-end headcounts in the period. |
| FTE | Days employed in the month ÷ days in the month, summed (all roles are full-time). Average FTE = mean monthly FTE in the period. |
| Manpower cost (MC) | Base + Bonus + Benefits + Overtime + Training + Others. |

Filters: Department, Location, Employment type, Job band and Gender apply to all people metrics. Cost tables carry Department, Location, Job band and Employment type (not Gender). Revenue, EBITDA and production are company-level and are not filtered; ratios that divide a filtered cost by company revenue are labelled "share of company revenue".

## Workforce

| Metric | Formula |
|---|---|
| Headcount | Count of active employees on the date. |
| Net change | Headcount at period end − headcount at period start = joins − exits. |
| Turnover rate | Exits in period ÷ average headcount × 100. YTD values are also shown annualised (× 12 ÷ months elapsed). |
| Voluntary turnover | Resignations ÷ average headcount. |
| Involuntary turnover | Terminations ÷ average headcount. |
| End-of-contract rate | Fixed-term (PKWT) contracts not renewed ÷ average headcount. |
| Regretted attrition | Resignations with last final rating ≥ 4 ÷ average headcount. |
| Early attrition share | Exits with tenure < 12 months ÷ all exits. |
| New-hire attrition | Joiners in the period who already left ÷ joiners in the period. |
| Tenure | (As-of date or exit date − hire date) in years. |

## Productivity & cost

| Metric | Formula |
|---|---|
| Revenue per employee | Revenue ÷ average FTE (FY or TTM), compared with the plan target: plan revenue ÷ plan average headcount. |
| EBITDA per employee | EBITDA ÷ average FTE, compared with plan EBITDA ÷ plan average headcount. |
| Tonnes per FTE | Production volume (tonnes) ÷ average FTE. |
| Manpower cost per tonne | MC ÷ production volume (tonnes). |
| Human Capital ROI | (EBITDA + MC) ÷ MC. Value created per $1 of people cost (operating profit before people cost, per people cost). |
| Overtime % of base pay | Overtime cost ÷ base pay. |
| MC % revenue | MC ÷ revenue × 100. |
| Cost per FTE | MC ÷ average FTE (annual, TTM). |
| MC % EBITDA | MC ÷ EBITDA × 100. |
| Cost bridge | From period 0 to period 1: headcount effect = (FTE₁ − FTE₀) × CPF₀; rate effect = (CPF₁ − CPF₀) × FTE₁, where CPF = MC ÷ FTE. The two effects add up exactly to MC₁ − MC₀. |
| Budget variance | (Actual MC − budget MC) ÷ budget MC × 100, YTD, by department. Positive = over budget. |

## Talent acquisition

| Metric | Formula |
|---|---|
| Funnel | Applicants → Screened → Interviewed → Offered → Hired for requisitions filled in the period; stage conversion = stage ÷ previous stage. |
| Time-to-fill | Offer-accepted date − requisition opened date, calendar days (mean and median), requisitions filled in the period. |
| Offer acceptance rate | Accepted offers ÷ offers extended. |
| Cost-per-hire | (Advertising + agency fees + referral bonuses + recruiter time + assessment & medical checks) ÷ hires (SHRM/ANSI cost-per-hire structure). |
| Source effectiveness | Per source: share of hires, applicant-to-hire conversion, time-to-fill, cost-per-hire, quality of hire, 12-month retention. |
| Requisition aging | As-of date − opened date for open requisitions, grouped 0–30 / 31–60 / 61–90 / > 90 days. |
| Quality of hire | For external hires with ≥ 12 months since joining: 50 × (first final rating ÷ 5) + 50 × (still employed at 12 months ? 1 : 0). Hires who left before their first review count as rating 2. Scale 0–100. |
| Internal fill rate | Requisitions filled by an internal candidate ÷ requisitions filled. |

## Talent management

| Metric | Formula |
|---|---|
| KPI achievement | Average achievement of the employee's KPI targets (capped at 150%). Converted to a 1–5 KPI score: 60% → 1, 80% → 2, 95% → 3, 108% → 4, 125% → 5 (linear in between). |
| Behavioral score | Average of five competencies rated 1–5: Safety Mindset, Integrity, Collaboration, Continuous Improvement, Customer Focus. |
| Final rating | 0.7 × KPI score + 0.3 × behavioral score, mapped to 1 Unsatisfactory, 2 Needs improvement, 3 Meets, 4 Exceeds, 5 Outstanding. |
| What vs How | KPI score (what) × behavioral score (how), each split Low (< 2.75) / Medium / High (≥ 3.75). |
| 9-box | Final rating (1–2 Low, 3 Medium, 4–5 High) × potential (Low / Medium / High) for the latest completed cycle. |
| Goal achievement | Mean KPI achievement and % of employees at ≥ 100%. |
| Promotion rate | Promotions (move to a higher job band) in the period ÷ average headcount. |
| Training hours per employee | Training hours ÷ average headcount. |
| Training spend per employee | Training cost (same as the Training line in MC) ÷ average headcount. |
| Succession coverage | Key positions with ≥ 1 ready-now successor ÷ key positions; also shown with ready-in-1–2-years. Key positions: General Manager and Director roles, and Managers in Production, Maintenance & Reliability and HSE. |

## Predictive (illustrative models on synthetic data)

| Model | Method |
|---|---|
| 12-month forecast | Ordinary least squares on monthly history: trend + 11 month-of-year dummies, fitted separately for manpower cost and headcount; 80% prediction interval. What-if sliders rescale the baseline relative to the growth rates implied by the fitted model. |
| Attrition risk | Logistic regression on employee-year snapshots taken each 1 January (tenure, compa-ratio, last final rating, months since promotion, training hours in prior year); label = resignation within 12 months. Trained on earlier years, tested on the latest complete year (AUC reported). Risk tiers from predicted probability. |
| Segmentation | K-Means (k = 4, k-means++, fixed seed, standardised features) with cluster names assigned by rules on the centroids. |

Compa-ratio = annual base pay ÷ midpoint of the job band (midpoints move +4.5% every January).
