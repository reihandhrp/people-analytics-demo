#!/usr/bin/env python3
"""
Sanity and consistency checks for the Demo Corp synthetic dataset.

Recomputes the headline metrics with the same definitions used by the dashboard
(docs/METRICS.md), checks them against target ranges, checks internal consistency
and the planted correlations, and scans the repository for forbidden terms.
Writes docs/VALIDATION.md. Exit code 2 = forbidden-term scan failed (blocks deployment),
1 = another check failed (reported as a warning), 0 = all checks passed.

Usage: python3 generator/validate.py
"""
import datetime as dt
import glob
import gzip
import hashlib
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "site", "data")

# SHA-256 of lower-cased words / word pairs that must never appear in the public repository
# (terms from an unrelated private project). Stored as hashes so the list itself leaks nothing.
FORBIDDEN = {
    "06ddd2e54a3ad4cbc96b0cd5a034e18b85d0f9be64e87dcb7a4c4a0470a6d722",
    "0778e8bf90e31956b3cbd0080c27d734c6d1387bc22972850e3eef7ed1bc9527",
    "07cdea3e773e2434cec2825618f79263d0a6c78ac2bb2be585f00034da553e93",
    "0ac03aead151b7d220ead2ff71155447605ba2d7d571866fae18d773eb0e5a7f",
    "0f4ef3359d11d34df2296f54d978ecdd518816988edb6fd3c4c4b20212cb1626",
    "10f1a5f53fecd0a7f9602025357648da3a29d1f593a38a666273f0dc635d8119",
    "1a69cd362d7425e469626b79be77c0f17e4443badf1a5ad1677964ddbcda2cad",
    "2217bfba3687317cdae7560635310b0d3f12a8b1672f4dce81c8765df8c1734b",
    "2f0e9f30c33022155b1cb64b8e12d265cabc4258606caaf6f855d32ab2230bcc",
    "3597d0e330d40768b9524feb38f7d8d6dfcc5b5b55790c239222c9dc0b28204b",
    "36a473176b828f05222d33f6177bb687646c5199c6744d7fb487053e3d661b09",
    "3cb4e62bf1f2d79e1bd39b913b11b5c9903362171d527098cbee3ee22e495c0a",
    "3e083c63b041c36c0fee04c8932172e410f417ecba1a4e45fb2ff43274dccc72",
    "40f41fcafd1444dbed84c40ce0b568ecfe7303aa6c5a9821bdd63b7a8df32958",
    "454966237be3ea6ef70077f92fec60f29d3cb446d8d0f30dfa2dd9892be995c8",
    "4d7594e57f7d03f35ede2d316cda4cdb7df66b28963738e836a2f16d9fc9eb4d",
    "5b37d4b719b3c0985a284e481fd490f78f430b88d526c9d82f795e8245e94aa8",
    "5b889e32d4c2d60b11cbf5f5b54114b939bc214c0c7ba0071b2ef2558a0df885",
    "5d5f0bbe8aedc5b69decf7ddab38d2ec03b96c0db2b09d4b6e516cefa7e26e33",
    "60e14627031247bea6473ac627dbd428fba5ac5f866e35b9a8a106e7fa30edbd",
    "671e209dd6fbcb3bf648093c35171e4e149a707b05bf1f2b7a0feb6dbef47e17",
    "6fda5e0cc22de43695f3a12ecd03763fb40bb5b5f1e3b4befb53563e81b0d4ab",
    "7b5d79a920de07d590c0583d738c45c822767bf60691f0d05ec66ea643d87310",
    "7fe31ac7dd514a97833924cf013f2391538a3ae7ad7a37a58c69063f9cd6ed29",
    "82808a62f3f9c33fa55098437277f1083b37f0b25e19c5c39e13c659da513588",
    "856886096f4eb068eb1eb25a101985da5f073333299098d230773bec95adda44",
    "86913eaeb364f8b16e16509eda8557a97aa63e5ed033c04c0fa2653b46e5160b",
    "9bef9ae1594a50de15757c11a3750139ce910b0a69bbfd45dcc618736da0bce4",
    "9cbf0bef05d64994b9c68a9d664619410c34248246dc60a1f4383df6da9f9c34",
    "9f80e56fd8cb817c3c854febbda6e4382794cce250eae007177e5c4cd817abc5",
    "a273453768e9b76a006795534f4e6e33a681e8b33dc7dac87ca1d62eb361a89c",
    "a28219a9f47ef904b106d0a21434d060afc5a44a06fc7fa9eeda288831ee2aaf",
    "a3024e0d1ae3d4bf1988b17a1e0e36e4f57935b514c8da189ffd6bf99fcbf306",
    "a807d8514f9cbcb366d5973a3b3fc1791fe518f4f689b20fb40326340079decf",
    "ab587e98c585ad4818a147172ae3389107ce2c07c84f66b735be01eab454b663",
    "adcf4f988d539fd965550d67036b6038ae92bd71a68cbfd1894209bc02bb321d",
    "bea03fc7e1962c0a31aa17c12521a6c42836c62b6796e3a6909b1e6bf421b899",
    "bfdf4f789801dfa3bdf44a757c4eec65f5fcf5755ab03e8ec93e3777ee885866",
    "c754c7f17e01936261e8880b51f869e7177833fd405e86e8580662754f060c17",
    "d5453df45cd784dc58e8ffade822e2a89e59eca459346a9b11c97b6dc158c053",
    "dc9b5ac0069854612f021ff4f6fa0969f6b6207e4e3cb995d4dfaa192c9bacde",
    "dd975d118df5960842a42a8deca52133e7437929225464626372b125df9a37bc",
    "dfd915bcdc60c9efcbd3fb336241abdcf1b702093d9ac6b1337987e5e91090ae",
    "e43a84a984a7312fd40de685e65371117f4526efaa50cac8bba6ca9438b6c20b",
    "e45e4d2d01e6b63ecd76e3eab6b891177414bdbd95c239d0ff62065d2378fa6f",
    "eac1f5ef5a0ca0039f5daa78161f85dd48b8cbad51f1ec5a45d8b608c6519de2",
    "eceae64007b36f0961e51065826e7ef6308665c04131a0620d5405e648587be8",
    "efde0a51ac9b9bd8446a89202205daa19727a08417a6e4ab59469c5d4278e12e",
    "f42a5d799b942203790280516dbb84d40dd57d5e25767cf355ee1ad027539134",
    "f6864096fe39b7325e70845b7df38611ac6baccd9c704ae5217437655ea56ad3",
    "f776828f74c23c1b07d1a33b24197a8c2e8b38adad58515437a2001dd92592eb",
    "fd7f38e44989c15d7bb887045ab7f0ac6e9de2e60f3e49a032fcece5e308aeba",
}


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        obj = json.load(f)
    if "columns" not in obj:
        return obj
    cols, dims = obj["columns"], obj.get("dims", {})
    out = []
    for r in obj["rows"]:
        o = {}
        for c, v in zip(cols, r):
            o[c] = dims[c][v] if (c in dims and v is not None) else v
        out.append(o)
    return out


D = dt.date.fromisoformat
def ym(d): return d[:7]
def months(a, b):
    y, m = int(a[:4]), int(a[5:7])
    out = []
    while f"{y:04d}-{m:02d}" <= b:
        out.append(f"{y:04d}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out
def mend(k):
    y, m = int(k[:4]), int(k[5:7])
    ny, nm = (y + 1, 1) if m == 12 else (y, m + 1)
    return dt.date(ny, nm, 1) - dt.timedelta(days=1)


class Report:
    def __init__(self):
        self.rows, self.fail = [], 0

    def check(self, group, name, value, lo=None, hi=None, fmt="{:.1f}", cond=None, note=""):
        ok = cond if cond is not None else ((lo is None or value >= lo) and (hi is None or value <= hi))
        rng = "" if lo is None and hi is None else f"{'' if lo is None else fmt.format(lo)} – {'' if hi is None else fmt.format(hi)}"
        val = fmt.format(value) if isinstance(value, (int, float)) else str(value)
        self.rows.append((group, name, val, rng, "PASS" if ok else "FAIL", note))
        if not ok:
            self.fail += 1


def main():
    rep = Report()
    meta = load("meta.json")
    E = load("employees.json")
    Y = load("emp_years.json")
    C = load("cost_monthly.json")
    B = load("budget_monthly.json")
    F = load("finance_monthly.json")
    Q = load("requisitions.json")
    K = load("key_positions.json")
    MV = load("moves.json")
    as_of = D(meta["as_of"])
    last = meta["last_closed_month"]
    allm = months("2023-01", last)

    def active(e, d):
        return D(e["hire_date"]) <= d and (e["exit_date"] is None or D(e["exit_date"]) > d)

    hc_end = {k: sum(1 for e in E if active(e, mend(k))) for k in allm}
    hc_now = sum(1 for e in E if active(e, as_of))

    def turnover(ms, filt=lambda e: True, reason=None):
        avg = sum(sum(1 for e in E if filt(e) and active(e, mend(k))) for k in ms) / len(ms)
        ex = [e for e in E if filt(e) and e["exit_date"] and ms[0] <= ym(e["exit_date"]) <= ms[-1]
              and (reason is None or e["exit_reason"] == reason)]
        return 100 * len(ex) / avg if avg else 0.0, len(ex), avg

    fy_years = [y for y in range(2023, as_of.year) if f"{y}-12" <= last]
    ttm = allm[-12:]
    prev_ttm = allm[-24:-12]
    periods = [(f"FY{y}", [m for m in allm if m.startswith(str(y))]) for y in fy_years] + [("TTM", ttm)]

    # ---------------- workforce
    pts = [(D(p["date"]), p["headcount"]) for p in meta["plan_headcount"]]
    plan_now = pts[-1][1]
    for (a0, v0), (b0, v1) in zip(pts, pts[1:]):
        if a0 <= as_of <= b0:
            plan_now = v0 + (v1 - v0) * (as_of - a0).days / (b0 - a0).days
    rep.check("Workforce", f"Active headcount on {as_of} vs plan {plan_now:.0f} (±4%)", hc_now, plan_now * 0.96, plan_now * 1.04, "{:.0f}")
    rep.check("Workforce", "Headcount 31 Dec 2022 → now", f"{sum(1 for e in E if active(e, dt.date(2022, 12, 31)))} → {hc_now}", cond=True)
    act = [e for e in E if active(e, as_of)]
    rep.check("Workforce", "Departments in use", len({e['dept'] for e in act}), 8, 8, "{:.0f}")
    rep.check("Workforce", "Employment types (Permanent/Contract only)", ", ".join(sorted({e['etype'] for e in E})),
              cond={e['etype'] for e in E} <= {"Permanent", "Contract"})
    rep.check("Workforce", "Contract share of active (%)", 100 * sum(e['etype'] == 'Contract' for e in act) / len(act), 10, 22)
    rep.check("Workforce", "Female share of active (%)", 100 * sum(e['gender'] == 'Female' for e in act) / len(act), 12, 22)
    bands = Counter(e['band'] for e in act)
    rep.check("Workforce", "Band mix O/S/Sp/M/GM/D (%)", " / ".join(f"{100 * bands[b] / len(act):.1f}" for b in meta['dims']['band']),
              cond=bands['Operator'] / len(act) > 0.35 and bands['Director'] >= 4)
    rep.check("Workforce", "Employee IDs anonymous (E-0001)", "all match", cond=all(re.fullmatch(r"E-\d{4}", e['emp_id']) for e in E))
    for label, ms in periods:
        t, n, avg = turnover(ms)
        rep.check("Attrition", f"Turnover {label} (%)", t, 11, 15, note=f"{n} exits / avg HC {avg:.0f}")
    rt = [turnover(allm[i - 11:i + 1])[0] for i in range(11, len(allm))]
    rep.check("Attrition", f"Turnover, every rolling 12-month window ({len(rt)})", f"{min(rt):.1f} … {max(rt):.1f}", cond=min(rt) >= 11 and max(rt) <= 15)
    for label, ms in periods[-1:]:
        rep.check("Attrition", f"  Voluntary {label} (%)", turnover(ms, reason="Resignation")[0], 5, 11)
        rep.check("Attrition", f"  Involuntary {label} (%)", turnover(ms, reason="Termination")[0], 0.5, 4)
        rep.check("Attrition", f"  End of contract {label} (%)", turnover(ms, reason="End of contract")[0], 0.5, 5)
    ex_ttm = [e for e in E if e['exit_date'] and ttm[0] <= ym(e['exit_date']) <= ttm[-1]]
    early = sum(1 for e in ex_ttm if (D(e['exit_date']) - D(e['hire_date'])).days < 365)
    rep.check("Attrition", "Early attrition (<1 yr) share of exits TTM (%)", 100 * early / len(ex_ttm), 15, 45)
    sched = sum(1 for e in E if e['exit_date'] and D(e['exit_date']) > as_of and D(e['hire_date']) <= as_of)
    rep.check("Attrition", "Scheduled exits (notice given, not yet left)", sched, 1, 40, "{:.0f}")

    # identity: month-end HC change = joins - exits
    bad = 0
    for a, b in zip(allm, allm[1:]):
        j = sum(1 for e in E if ym(e['hire_date']) == b and not (e['exit_date'] and D(e['exit_date']) <= mend(b)))
        x = sum(1 for e in E if e['exit_date'] and ym(e['exit_date']) == b and D(e['hire_date']) <= mend(a))
        if hc_end[b] - hc_end[a] != j - x:
            bad += 1
    rep.check("Consistency", "Month-end headcount = previous + joins − exits", f"{bad} mismatches", cond=bad == 0)
    rep.check("Consistency", "Exit date after hire date", "ok", cond=all(not e['exit_date'] or e['exit_date'] > e['hire_date'] for e in E))
    chc = defaultdict(int)
    for c in C:
        chc[c['month']] += c['headcount_end']
    bad = sum(1 for k in allm if chc[k] != hc_end[k])
    rep.check("Consistency", "Cost table headcount = employee headcount", f"{bad} months differ", cond=bad == 0)

    # ---------------- finance & cost
    fin = {f['month']: f for f in F}
    tot = defaultdict(float)
    fte = defaultdict(float)
    by_type = defaultdict(float)
    for c in C:
        mc = c['base'] + c['bonus'] + c['benefits'] + c['overtime'] + c['training'] + c['others']
        tot[c['month']] += mc
        fte[c['month']] += c['fte']
        if c['month'] in ttm:
            for t in ("base", "bonus", "benefits", "overtime", "training", "others"):
                by_type[t] += c[t]
    def s(d, ms): return sum(d[k] for k in ms)
    def rev(ms): return sum(fin[k]['revenue'] for k in ms)
    def ebitda(ms): return sum(fin[k]['ebitda'] for k in ms)
    def avg_fte(ms): return s(fte, ms) / len(ms)
    for label, ms in periods:
        rep.check("Finance", f"Revenue {label} ($M)", rev(ms) / 1e6, None, None, "{:.1f}", cond=True)
    for i in range(1, len(fy_years)):
        a = [m for m in allm if m.startswith(str(fy_years[i - 1]))]
        b = [m for m in allm if m.startswith(str(fy_years[i]))]
        rep.check("Finance", f"Revenue growth FY{fy_years[i]} (%)", 100 * (rev(b) / rev(a) - 1), 8, 12)
    rep.check("Finance", "Revenue growth TTM vs prior TTM (%)", 100 * (rev(ttm) / rev(prev_ttm) - 1), 8, 12)
    roll = [allm[i - 11:i + 1] for i in range(23, len(allm))]
    g = [100 * (rev(w) / rev(allm[allm.index(w[0]) - 12:allm.index(w[0])]) - 1) for w in roll]
    rep.check("Finance", f"Revenue growth, every rolling 12-month window ({len(g)})", f"{min(g):.1f} … {max(g):.1f}", cond=min(g) >= 8 and max(g) <= 12)
    for label, ms in periods:
        rep.check("Finance", f"EBITDA margin {label} (%)", 100 * ebitda(ms) / rev(ms), 10, 16)
    for label, ms in periods:
        rep.check("Cost", f"Manpower cost % revenue {label}", 100 * s(tot, ms) / rev(ms), 6, 10)
    rm = [100 * s(tot, allm[i - 11:i + 1]) / rev(allm[i - 11:i + 1]) for i in range(11, len(allm))]
    rep.check("Cost", f"Manpower cost % revenue, every rolling window ({len(rm)})", f"{min(rm):.1f} … {max(rm):.1f}", cond=min(rm) >= 6 and max(rm) <= 10)
    rep.check("Cost", "Manpower cost % EBITDA TTM", 100 * s(tot, ttm) / ebitda(ttm), 40, 90)
    rep.check("Cost", "Cost per FTE TTM ($k)", s(tot, ttm) / avg_fte(ttm) / 1000, 35, 70)
    rep.check("Cost", "Revenue per employee TTM ($k)", rev(ttm) / avg_fte(ttm) / 1000, None, None, cond=True)
    mix = {t: 100 * v / sum(by_type.values()) for t, v in by_type.items()}
    rep.check("Cost", "Mix TTM Base/Bonus/Benefits/OT/Training/Others (%)",
              " / ".join(f"{mix[t]:.1f}" for t in ("base", "bonus", "benefits", "overtime", "training", "others")),
              cond=55 < mix['base'] < 75 and mix['overtime'] > 3)
    rep.check("Cost", "Overtime % of base pay TTM", 100 * by_type['overtime'] / by_type['base'], 5, 15)
    tons = sum(fin[k]['production_kt'] for k in ttm) * 1000
    rep.check("Productivity", "Tonnes per FTE TTM", tons / avg_fte(ttm), 350, 900, "{:.0f}")
    rep.check("Productivity", "Manpower cost per tonne TTM ($)", s(tot, ttm) / tons, 60, 160)
    rep.check("Productivity", "Human Capital ROI TTM (x)", (ebitda(ttm) + s(tot, ttm)) / s(tot, ttm), 1.5, 4.0, "{:.2f}")
    plans = {p['year']: p for p in meta['plans']}
    for y in fy_years:
        ms = [m for m in allm if m.startswith(str(y))]
        a = rev(ms) / avg_fte(ms)
        rep.check("Productivity", f"Revenue/employee FY{y} vs target", f"{a / 1000:.0f}k vs {plans[y]['rev_per_emp_target'] / 1000:.0f}k "
                  f"({100 * (a / plans[y]['rev_per_emp_target'] - 1):+.1f}%)", cond=abs(a / plans[y]['rev_per_emp_target'] - 1) < 0.12)
    bud = defaultdict(float)
    for b in B:
        if b['month'].startswith(str(as_of.year)) and b['month'] <= last:
            bud[b['dept']] += b['budget_cost']
    act_d = defaultdict(float)
    for c in C:
        if c['month'].startswith(str(as_of.year)):
            act_d[c['dept']] += c['base'] + c['bonus'] + c['benefits'] + c['overtime'] + c['training'] + c['others']
    var = {d: 100 * (act_d[d] / bud[d] - 1) for d in bud}
    rep.check("Cost", f"Budget variance YTD {as_of.year} by dept (%)", ", ".join(f"{d.split()[0]} {v:+.1f}" for d, v in var.items()),
              cond=all(-12 < v < 12 for v in var.values()) and max(var.values()) - min(var.values()) > 2)

    # ---------------- talent acquisition
    filled = [q for q in Q if q['status'] == 'Filled' and q['closed'] and ttm[0] <= ym(q['closed']) <= ttm[-1]]
    for label, ms in periods:
        f = [q for q in Q if q['status'] == 'Filled' and ms[0] <= ym(q['closed']) <= ms[-1]]
        ttf = [(D(q['closed']) - D(q['opened'])).days for q in f]
        rep.check("Talent acquisition", f"Time-to-fill mean {label} (days)", sum(ttf) / len(ttf), 35, 50, note=f"median {sorted(ttf)[len(ttf) // 2]}")
    rep.check("Talent acquisition", "Offer acceptance TTM (%)", 100 * len(filled) / sum(q['offers'] for q in filled), 75, 92)
    cost = sum(q['cost_ads'] + q['cost_agency'] + q['cost_referral'] + q['cost_recruiter'] + q['cost_assessment'] for q in filled)
    rep.check("Talent acquisition", "Cost-per-hire TTM ($)", cost / len(filled), 800, 4000, "{:.0f}")
    rep.check("Talent acquisition", "Internal fill rate TTM (%)", 100 * sum(q['internal'] for q in filled) / len(filled), 8, 25)
    op = [q for q in Q if q['status'] == 'Open']
    aging = Counter(min(3, (as_of - D(q['opened'])).days // 30) for q in op)
    rep.check("Talent acquisition", "Open requisitions (0-30 / 31-60 / 61-90 / 90+)", f"{len(op)}: " + " / ".join(str(aging[i]) for i in range(4)),
              cond=10 <= len(op) <= 80)
    fun = [q for q in Q if q['status'] == 'Filled' and q['internal'] == 0 and ttm[0] <= ym(q['closed']) <= ttm[-1]]
    st = [sum(q[k] for q in fun) for k in ("applicants", "screened", "interviewed", "offers", "accepted")]
    rep.check("Talent acquisition", "Funnel external TTM (appl→scr→int→off→hire)", " → ".join(map(str, st)),
              cond=all(a >= b for a, b in zip(st, st[1:])))
    emp = {e['emp_id']: e for e in E}
    rating = {(y['emp_id'], y['year']): y['final_rating'] for y in Y if y['final_rating']}
    qoh = defaultdict(list)
    for e in E:
        if not e['hire_source'] or e['hire_source'] == 'Internal' or D(e['hire_date']) > as_of - dt.timedelta(days=365):
            continue
        hy = D(e['hire_date']).year
        r = rating.get((e['emp_id'], hy)) or rating.get((e['emp_id'], hy + 1))
        ret = 1 if (not e['exit_date'] or (D(e['exit_date']) - D(e['hire_date'])).days >= 365) else 0
        if r is None and ret == 0:
            r = 2
        if r is None:
            continue
        qoh[e['hire_source']].append(50 * r / 5 + 50 * ret)
    qs = {k: sum(v) / len(v) for k, v in qoh.items()}
    rep.check("Talent acquisition", "Quality of hire by source", ", ".join(f"{k} {v:.0f}" for k, v in sorted(qs.items(), key=lambda t: -t[1])),
              cond=qs.get('Referral', 0) >= max(qs.values()) - 1e-9)

    # ---------------- performance & development
    cyc = max(y['year'] for y in Y if y['final_rating'])
    fr = Counter(y['final_rating'] for y in Y if y['year'] == cyc and y['final_rating'])
    n = sum(fr.values())
    dist = [100 * fr[i] / n for i in range(1, 6)]
    rep.check("Performance", f"Final rating 1-5 cycle {cyc} (%)", " / ".join(f"{v:.0f}" for v in dist),
              cond=1 <= dist[0] <= 6 and 7 <= dist[1] <= 17 and 40 <= dist[2] <= 60 and 20 <= dist[3] <= 35 and 3 <= dist[4] <= 12)
    kp = [y['kpi_pct'] for y in Y if y['year'] == cyc and y['kpi_pct'] is not None]
    rep.check("Performance", f"KPI achievement mean / ≥100% (cycle {cyc})", f"{sum(kp) / len(kp):.1f}% / {100 * sum(k >= 100 for k in kp) / len(kp):.0f}%",
              cond=95 <= sum(kp) / len(kp) <= 106)
    pairs = [(y['kpi_score'], y['behavior_score']) for y in Y if y['year'] == cyc and y['kpi_score'] is not None]
    mx, my = sum(p[0] for p in pairs) / len(pairs), sum(p[1] for p in pairs) / len(pairs)
    cov = sum((a - mx) * (b - my) for a, b in pairs)
    corr = cov / math.sqrt(sum((a - mx) ** 2 for a, _ in pairs) * sum((b - my) ** 2 for _, b in pairs))
    rep.check("Performance", "Correlation KPI vs behavioral score", corr, 0.25, 0.65, "{:.2f}", note="related but distinct")
    pot = Counter(y['potential'] for y in Y if y['year'] == cyc and y['potential'])
    rep.check("Performance", "Potential Low/Medium/High (%)", " / ".join(f"{100 * pot[p] / sum(pot.values()):.0f}" for p in ("Low", "Medium", "High")),
              cond=10 <= 100 * pot['High'] / sum(pot.values()) <= 30)
    avg_hc_ttm = sum(hc_end[k] for k in ttm) / 12
    prom = sum(1 for m in MV if m['type'] == 'Promotion' and ttm[0] <= ym(m['date']) <= ttm[-1])
    rep.check("Development", "Promotion rate TTM (%)", 100 * prom / avg_hc_ttm, 3, 10)
    th = sum(c['training_hours'] for c in C if c['month'] in ttm)
    rep.check("Development", "Training hours per employee TTM", th / avg_hc_ttm, 25, 50)
    rep.check("Development", "Training spend per employee TTM ($)", by_type['training'] / avg_hc_ttm, 600, 2500, "{:.0f}")
    cov_now = 100 * sum(k['ready_now'] > 0 for k in K) / len(K)
    cov_any = 100 * sum(k['ready_now'] + k['ready_1_2y'] > 0 for k in K) / len(K)
    rep.check("Development", f"Succession coverage ready-now / any ({len(K)} key positions, %)", f"{cov_now:.0f} / {cov_any:.0f}",
              cond=35 <= cov_now <= 75 and cov_any >= cov_now + 10)

    # ---------------- planted correlations (annual snapshots: exit within 12 months of 1 Jan)
    snaps = [y for y in Y if y['compa_jan'] is not None and y['year'] >= 2023 and y['year'] < as_of.year]
    def left_vol(y):
        e = emp[y['emp_id']]
        return 1 if (e['exit_reason'] == 'Resignation' and e['notice_date'] and e['notice_date'][:4] == str(y['year'])) else 0
    def rate(rows):
        return 100 * sum(left_vol(r) for r in rows) / len(rows) if rows else 0
    def ratio(name, a, b, lo):
        ra, rb = rate(a), rate(b)
        mult = f"×{ra / rb:.1f}" if rb > 0 else "×∞"
        rep.check("Correlations", name, f"{ra:.1f}% vs {rb:.1f}% ({mult})", cond=(rb == 0 and ra > 0) or (rb > 0 and ra / rb >= lo),
                  note=f"n={len(a)} vs {len(b)}")
    ratio("Voluntary exit: compa < 0.90 vs ≥ 1.00", [r for r in snaps if r['compa_jan'] < 0.9], [r for r in snaps if r['compa_jan'] >= 1.0], 1.5)
    t3 = [r for r in snaps if r['tenure_jan'] >= 3]
    ratio("Voluntary exit: >36 vs <18 months since promotion (tenure ≥3 yrs)", [r for r in t3 if r['months_since_promo_jan'] > 36],
          [r for r in t3 if r['months_since_promo_jan'] < 18], 1.3)
    ratio("Voluntary exit: tenure <2 yrs vs 5-10 yrs", [r for r in snaps if r['tenure_jan'] < 2], [r for r in snaps if 5 <= r['tenure_jan'] < 10], 1.5)
    ratio("Voluntary exit: training <15 h vs ≥30 h prior year", [r for r in snaps if r['train_hours_prev'] < 15],
          [r for r in snaps if r['train_hours_prev'] >= 30], 1.2)
    ratio("Voluntary exit: rating ≥4 & compa <0.95 vs rating ≥4 & compa ≥1.0",
          [r for r in snaps if (r['last_rating_jan'] or 0) >= 4 and r['compa_jan'] < 0.95],
          [r for r in snaps if (r['last_rating_jan'] or 0) >= 4 and r['compa_jan'] >= 1.0], 1.5)

    # ---------------- footprint
    sizes = {os.path.basename(p): os.path.getsize(p) for p in glob.glob(os.path.join(DATA, "*.json"))}
    gz = sum(len(gzip.compress(open(os.path.join(DATA, n), "rb").read(), 6)) for n in sizes)
    rep.check("Footprint", "Data size raw / gzip (KB)", f"{sum(sizes.values()) / 1024:.0f} / {gz / 1024:.0f}", cond=gz < 600 * 1024)

    hits = []
    for path in glob.glob(os.path.join(ROOT, "**", "*"), recursive=True):
        if os.path.isdir(path) or "/.git/" in path or path.endswith((".png", ".jpg", ".ico", ".woff2")):
            continue
        try:
            text = open(path, encoding="utf-8").read().lower()
        except (UnicodeDecodeError, OSError):
            continue
        words = re.findall(r"[a-z0-9_]+", text)
        grams = set(words) | {a + " " + b for a, b in zip(words, words[1:])}
        for g in grams:
            if hashlib.sha256(g.encode()).hexdigest() in FORBIDDEN:
                hits.append(os.path.relpath(path, ROOT))
                break
    rep.check("Footprint", f"Forbidden-term scan ({len(FORBIDDEN)} hashed terms)", "clean" if not hits else "hits in " + ", ".join(sorted(set(hits))),
              cond=not hits)

    # ---------------- report
    lines = [f"# Data validation report", "",
             f"Dataset as of **{meta['as_of']}** (seed {meta['seed']}, generator v{meta['generator_version']}). "
             f"Last closed finance month: {last}. Generated by `generator/validate.py`.", "",
             "| Area | Check | Value | Target | Result | Note |", "|---|---|---|---|---|---|"]
    for g, nme, v, r, res, note in rep.rows:
        lines.append(f"| {g} | {nme} | {v} | {r} | {res} | {note} |")
    lines += ["", f"**{len(rep.rows) - rep.fail} of {len(rep.rows)} checks passed.**", ""]
    os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
    with open(os.path.join(ROOT, "docs", "VALIDATION.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    w = max(len(r[1]) for r in rep.rows)
    for g, nme, v, r, res, note in rep.rows:
        print(f"{res:4s}  {g[:12]:12s} {nme:{w}s}  {v:>28s}  [{r}] {note}")
    print(f"\n{len(rep.rows) - rep.fail}/{len(rep.rows)} checks passed")
    # exit 2 = footprint problem (blocks deployment), 1 = a range/consistency check failed (warning), 0 = all passed
    footprint_fail = any(r[0] == "Footprint" and r[4] == "FAIL" for r in rep.rows)
    sys.exit(2 if footprint_fail else (1 if rep.fail else 0))


if __name__ == "__main__":
    main()
