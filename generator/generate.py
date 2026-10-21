#!/usr/bin/env python3
"""
Demo Corp - synthetic HR, cost and operations dataset generator.

* Python 3.9+ standard library only (no installs).
* Deterministic: the same SEED and the same --as-of date always produce identical files.
* History is stable: every random draw is keyed by entity + period (not by draw order), and
  events are processed in date order, so moving --as-of forward only appends new history.

Usage:  python3 generator/generate.py [--as-of YYYY-MM-DD] [--out site/data]
All people, numbers and the company are fictional.
"""
import argparse
import datetime as dt
import heapq
import json
import math
import os
import random

SEED = 42
START = dt.date(2023, 1, 1)
FIN_LAST_YEAR = 2027          # finance/production simulated to a fixed horizon (stable history)
VERSION = "1.0"

# ----------------------------------------------------------------------------- helpers
def R(*key):
    """Independent, reproducible random stream for one entity/period."""
    return random.Random("|".join(str(k) for k in (SEED,) + key))


def mstart(y, m): return dt.date(y, m, 1)
def mnext(y, m): return (y + 1, 1) if m == 12 else (y, m + 1)
def mend(y, m): ny, nm = mnext(y, m); return mstart(ny, nm) - dt.timedelta(days=1)
def dim(y, m): return mend(y, m).day
def ym(y, m): return f"{y:04d}-{m:02d}"
def add_days(d, k): return d + dt.timedelta(days=int(k))
def add_months(d, k):
    y, m = d.year + (d.month - 1 + k) // 12, (d.month - 1 + k) % 12 + 1
    return dt.date(y, m, min(d.day, dim(y, m)))
def months_between(a, b): return (b - a).days / 30.4375
def years_between(a, b): return (b - a).days / 365.25
def clamp(v, lo, hi): return max(lo, min(hi, v))
def sigmoid(x): return 1.0 / (1.0 + math.exp(-x))
def iso(d): return d.isoformat() if d else None
def wchoice(r, items, weights):
    t = r.random() * sum(weights)
    for it, w in zip(items, weights):
        t -= w
        if t <= 0:
            return it
    return items[-1]


def month_list(first, last):
    y, m = first
    out = []
    while (y, m) <= last:
        out.append((y, m))
        y, m = mnext(y, m)
    return out

# ----------------------------------------------------------------------------- company design
BANDS = ["Operator", "Staff", "Supervisor", "Manager", "General Manager", "Director"]
MID_2023 = [15500, 26000, 42000, 72000, 125000, 220000]   # annual base-pay band midpoints (USD)
MIDPOINT_INCREASE = 0.045                                  # structure update every 1 January
BONUS_TARGET = [0.083, 0.10, 0.125, 0.17, 0.25, 0.35]      # % of annual base
BONUS_MULT = {1: 0.0, 2: 0.5, 3: 1.0, 4: 1.3, 5: 1.6}
MERIT = {1: 0.0, 2: 0.02, 3: 0.045, 4: 0.065, 5: 0.085}
BENEFIT_RATE = [0.21, 0.21, 0.21, 0.24, 0.24, 0.24]
OT_BAND = [1.0, 0.45, 0.30, 0.0, 0.0, 0.0]
TRAIN_BAND = [1.0, 0.9, 1.05, 1.0, 0.8, 0.6]
TRAIN_EXT = [0, 300, 300, 1200, 1800, 2400]                # external courses, USD per year
TRAIN_RATE = 28.0                                          # USD per training hour (internal delivery)
ATTR_BAND = [0.0, 0.15, -0.05, -0.20, -0.40, -0.60]
AGE_AT_HIRE = [23, 25, 30, 35, 41, 46]

LOCS = ["Corporate HQ", "Plant A", "Plant B", "Plant C"]
PLANT_W = [0.40, 0.33, 0.27]
LOC_ATTR = {"Corporate HQ": 0.20, "Plant A": 0.0, "Plant B": -0.05, "Plant C": 0.15}

# name, share, band mix, HQ share, female share, overtime rate, training h/yr, attrition effect
DEPTS = [
    ("Production",                0.34, (70, 12, 12, 4.5, 1.2, 0.3), 0.02, 0.06, 0.26, 42, 0.05),
    ("Maintenance & Reliability", 0.18, (62, 18, 13, 5, 1.5, 0.5),   0.02, 0.03, 0.28, 46, 0.15),
    ("HSE",                       0.06, (20, 48, 20, 9, 2.5, 0.5),   0.10, 0.18, 0.10, 55, 0.10),
    ("Quality & Laboratory",      0.08, (45, 30, 15, 8, 1.5, 0.5),   0.03, 0.35, 0.16, 34, 0.00),
    ("Supply Chain",              0.11, (40, 35, 14, 8, 2.5, 0.5),   0.20, 0.18, 0.12, 26, 0.15),
    ("Engineering & Projects",    0.08, (5, 55, 20, 15, 4, 1),       0.35, 0.15, 0.08, 32, 0.20),
    ("Commercial",                0.06, (0, 55, 20, 17, 6, 2),       0.85, 0.40, 0.00, 22, 0.30),
    ("Corporate Services",        0.09, (5, 58, 17, 14, 4.5, 1.5),   0.80, 0.48, 0.03, 20, 0.10),
]
DN = [d[0] for d in DEPTS]
DI = {d[0]: d for d in DEPTS}
PLANT_DEPTS = {"Production", "Maintenance & Reliability", "HSE", "Quality & Laboratory"}
KEY_MANAGER_DEPTS = {"Production", "Maintenance & Reliability", "HSE"}

COMPETENCIES = ["Safety Mindset", "Integrity", "Collaboration", "Continuous Improvement", "Customer Focus"]
COMP_BIAS = [0.15, 0.20, 0.0, -0.20, -0.10]
KPI_WEIGHT, BEHAVIOR_WEIGHT = 0.70, 0.30
YEAR_KPI = {2022: 0.0, 2023: 1.0, 2024: -1.0, 2025: 1.0, 2026: 0.5, 2027: 0.0}
YEAR_ATTR = {2023: 0.0, 2024: -0.05, 2025: -0.12, 2026: 0.10, 2027: 0.0}

# recruiting
EXT_SOURCES = ["Referral", "Job board", "LinkedIn", "Agency", "Careers site"]
SRC_MIX = [
    (0.30, 0.40, 0.05, 0.05, 0.20),
    (0.22, 0.30, 0.25, 0.08, 0.15),
    (0.20, 0.20, 0.30, 0.15, 0.15),
    (0.15, 0.08, 0.37, 0.32, 0.08),
    (0.12, 0.00, 0.30, 0.55, 0.03),
    (0.10, 0.00, 0.20, 0.68, 0.02),
]
SRC_TALENT = {"Referral": 0.50, "Job board": -0.15, "LinkedIn": 0.10, "Agency": 0.05, "Careers site": -0.05, "Internal": 0.0}
SRC_TTF = {"Referral": 0.90, "Job board": 1.05, "LinkedIn": 1.00, "Agency": 0.80, "Careers site": 1.10, "Internal": 0.70}
SRC_APPL = {"Referral": 0.35, "Job board": 1.40, "LinkedIn": 1.20, "Agency": 0.40, "Careers site": 1.00}
SRC_SCREEN = {"Referral": 0.50, "Agency": 0.55}
SRC_ACCEPT = {"Referral": 1.04, "Agency": 0.96, "Internal": 1.08}
TTF_BASE = [29, 35, 42, 55, 72, 86]
TTF_DEPT = {"Engineering & Projects": 1.12, "Maintenance & Reliability": 1.08, "HSE": 1.05, "Commercial": 0.95}
TTF_YEAR = {2022: 1.05, 2023: 1.05, 2024: 1.0, 2025: 0.97, 2026: 1.0, 2027: 1.0}
APPL_BASE = [70, 95, 55, 40, 22, 12]
ACCEPT_BASE = [0.90, 0.87, 0.85, 0.80, 0.76, 0.75]
INTERNAL_P = [0.04, 0.12, 0.40, 0.50, 0.55, 0.60]
REF_BONUS = [300, 600, 900, 1500, 2500, 3000]
RECRUITER_H = [10, 16, 22, 32, 45, 55]
RECRUITER_RATE = 38.0
AGENCY_FEE = 0.18

# operations: capacity in kilotonnes per month
PLANT_CAP = {"Plant A": 24.0, "Plant B": 19.0, "Plant C": 14.0}
PLANT_C_EXPANSION = (dt.date(2025, 7, 1), 4.5, 4)          # start, extra kt/month, ramp months
TURNAROUNDS = [("Plant B", 2024, 5), ("Plant A", 2025, 8), ("Plant C", 2026, 2)]
TA_UTIL = {0: 0.25, 1: 0.75}                               # utilisation factor in TA month 1 and 2
TA_OT_ACTUAL = {-1: 1.3, 0: 2.6, 1: 1.8}
TA_OT_PLAN = {-1: 1.2, 0: 2.0, 1: 1.5}
VOL_SEAS = [0.95, 0.96, 1.00, 1.00, 1.01, 1.00, 0.99, 1.00, 1.01, 1.02, 1.03, 1.03]
PRICE_SEAS = [0.97, 0.97, 0.99, 1.00, 1.00, 1.00, 1.00, 1.01, 1.01, 1.02, 1.03, 1.02]
OT_SEAS = [0.95, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.08, 1.12, 1.10]
TRAIN_SEAS = [0.8, 1.05, 1.1, 1.05, 1.05, 1.0, 0.95, 1.05, 1.1, 1.1, 1.05, 0.7]

# planned headcount path (company plan, used for growth requisitions, budget and targets)
PLAN_HC = [(dt.date(2023, 1, 1), 1080), (dt.date(2023, 12, 31), 1118), (dt.date(2024, 12, 31), 1148),
           (dt.date(2025, 12, 31), 1186), (dt.date(2026, 12, 31), 1212), (dt.date(2027, 12, 31), 1236)]
N_INITIAL = 1080
N_INITIAL_REQS = 35


def plan_hc(d):
    if d <= PLAN_HC[0][0]:
        return PLAN_HC[0][1]
    for (a, va), (b, vb) in zip(PLAN_HC, PLAN_HC[1:]):
        if d <= b:
            return va + (vb - va) * (d - a).days / (b - a).days
    return PLAN_HC[-1][1]


def ta_phase(plant, y, m):
    """-1 preparation month, 0 first TA month, 1 second TA month, None otherwise."""
    for p, ty, tm in TURNAROUNDS:
        if p != plant:
            continue
        k = (y - ty) * 12 + (m - tm)
        if k in (-1, 0, 1):
            return k
    return None

# ----------------------------------------------------------------------------- finance & production
def simulate_finance():
    months = month_list((2023, 1), (FIN_LAST_YEAR, 12))
    rows = []
    for i, (y, m) in enumerate(months):
        prod = {}
        sales = 0.0
        for p in PLANT_CAP:
            cap = PLANT_CAP[p]
            if p == "Plant C":
                s, extra, ramp = PLANT_C_EXPANSION
                k = (y - s.year) * 12 + (m - s.month)
                if k >= 0:
                    cap += extra * min(1.0, (k + 1) / ramp)
            r = R("util", p, ym(y, m))
            util = clamp(0.86 + 0.008 * (i / 12) + r.gauss(0, 0.015), 0.70, 0.97)
            normal = cap * util * VOL_SEAS[m - 1]
            ph = ta_phase(p, y, m)
            f = TA_UTIL.get(ph, 1.0) if ph in (0, 1) else 1.0
            out = normal * f
            prod[p] = (cap, out, util * f, ph)
            sales += 0.35 * out + 0.65 * normal        # inventory built before a turnaround cushions sales
        r = R("price", ym(y, m))
        price = 1120.0 * (1.06 ** (i / 12)) * PRICE_SEAS[m - 1] * (1 + r.gauss(0, 0.012))
        ta_any = [ph for (_, _, _, ph) in prod.values() if ph in (0, 1)]
        pen = 0.025 if 0 in ta_any else (0.010 if 1 in ta_any else 0.0)
        margin = 0.125 + 0.012 * math.sin(2 * math.pi * i / 30 + 0.8) + R("margin", ym(y, m)).gauss(0, 0.005) - pen
        rows.append({"y": y, "m": m, "prod": prod, "sales_kt": sales, "price_nat": price, "margin": margin})

    # calibrate a smooth price index so calendar-year revenue growth lands in an 8.7-11.3% band
    years = sorted({r["y"] for r in rows})
    growth = {Y: R("growth", Y).uniform(0.092, 0.108) for Y in years[1:]}
    anchor = {Y: 1.0 for Y in years}
    pos = {Y: (Y - 2023) * 12 + 5.5 for Y in years}

    def scale(i):
        ys = years
        if i <= pos[ys[0]]:
            return anchor[ys[0]]
        if i >= pos[ys[-1]]:
            return anchor[ys[-1]]
        for a, b in zip(ys, ys[1:]):
            if pos[a] <= i <= pos[b]:
                t = (i - pos[a]) / (pos[b] - pos[a])
                return anchor[a] * (1 - t) + anchor[b] * t
        return 1.0

    for _ in range(60):
        rev = {Y: 0.0 for Y in years}
        for i, r in enumerate(rows):
            rev[r["y"]] += r["sales_kt"] * 1000 * r["price_nat"] * scale(i)
        for Y in years[1:]:
            anchor[Y] *= (rev[Y - 1] * (1 + growth[Y])) / rev[Y]
    for i, r in enumerate(rows):
        r["price"] = r["price_nat"] * scale(i)
        r["revenue"] = r["sales_kt"] * 1000 * r["price"]
        r["ebitda"] = r["revenue"] * r["margin"]

    fy = {Y: {"revenue": 0.0, "ebitda": 0.0} for Y in years}
    for r in rows:
        fy[r["y"]]["revenue"] += r["revenue"]
        fy[r["y"]]["ebitda"] += r["ebitda"]
    plans = {}
    for Y in years:
        prior = fy[Y - 1]["revenue"] if Y - 1 in fy else fy[Y]["revenue"] / 1.095
        plan_rev = prior * 1.10
        plan_ebitda = plan_rev * 0.125
        months_y = [mend(Y, m) for m in range(1, 13)]
        plan_avg_hc = sum(plan_hc(d) for d in months_y) / 12
        plans[Y] = {"plan_revenue": plan_rev, "plan_ebitda": plan_ebitda, "plan_avg_hc": plan_avg_hc,
                    "bonus_factor": clamp(fy[Y]["ebitda"] / plan_ebitda, 0.8, 1.2)}
    plans[2022] = {"bonus_factor": 1.0}
    return rows, plans

# ----------------------------------------------------------------------------- people
class Emp:
    __slots__ = ("id", "dept", "loc", "band", "etype", "gender", "birth", "hire", "exit", "reason",
                 "notice", "base", "talent", "conduct", "potential", "last_promo", "contract_end",
                 "renewals", "source", "req", "low_eng", "train", "ratings", "bonus_due", "promoted")

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))
        self.train = self.train or {}
        self.ratings = self.ratings or {}
        self.bonus_due = self.bonus_due or {}
        self.promoted = self.promoted or set()
        self.renewals = self.renewals or 0

    def active(self, d):
        return self.hire <= d and (self.exit is None or self.exit > d)


class Req:
    __slots__ = ("id", "dept", "loc", "band", "reason", "opened", "closed", "status", "source", "internal",
                 "ttf", "applicants", "screened", "interviewed", "offers", "hire_emp", "replaces",
                 "cost_ads", "cost_agency", "cost_referral", "cost_recruiter", "cost_assessment", "_ads_u")

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))


def pick_loc(r, dept):
    if r.random() < DI[dept][3]:
        return "Corporate HQ"
    return wchoice(r, LOCS[1:], PLANT_W)


def pick_band(r, dept):
    return wchoice(r, list(range(6)), DI[dept][2])


def kpi_to_score(k):
    pts = [(60, 1.0), (80, 2.0), (95, 3.0), (108, 4.0), (125, 5.0)]
    if k <= pts[0][0]:
        return 1.0
    for (a, va), (b, vb) in zip(pts, pts[1:]):
        if k <= b:
            return va + (vb - va) * (k - a) / (b - a)
    return 5.0


def final_rating(score):
    for t, v in ((2.02, 1), (2.57, 2), (3.69, 3), (4.46, 4)):
        if score < t:
            return v
    return 5


class Sim:
    def __init__(self, as_of, fin_rows, plans):
        self.as_of = as_of
        self.fin = {(r["y"], r["m"]): r for r in fin_rows}
        self.plans = plans
        self.mid = {2023: list(MID_2023)}
        self.emps = []
        self.by_id = {}
        self.reqs = []
        self.moves = []
        self.heap = []
        self.seq = 0
        self.cost = {}
        self.budget = []
        self.snap = {}            # (emp_id, year) -> Jan-1 features
        self.next_emp = 1
        self.next_req = 1

    # ---------------- utilities
    def mids(self, year):
        if year < 2023:
            return [v / (1 + MIDPOINT_INCREASE) ** (2023 - year) for v in MID_2023]
        if year not in self.mid:
            prev = self.mids(year - 1)
            self.mid[year] = [v * (1 + MIDPOINT_INCREASE) for v in prev]
        return self.mid[year]

    def band_targets(self, d):
        tot = plan_hc(d)
        out = {}
        for dn, share, mix, *_ in DEPTS:
            for b in range(6):
                out[(dn, b)] = tot * share * mix[b] / sum(mix)
        return out

    def band_counts(self, d, pipeline=False):
        c = {(dn, b): 0 for dn in DN for b in range(6)}
        for e in self.emps:
            if (e.active(d) and e.exit is None) or (pipeline and e.hire > d):
                c[(e.dept, e.band)] += 1
        if pipeline:
            for q in self.reqs:
                if q.status == "Open":
                    c[(q.dept, q.band)] += 1
        return c

    def push(self, d, kind, payload):
        self.seq += 1
        heapq.heappush(self.heap, (d, self.seq, kind, payload))

    def last_rating(self, e, d):
        ys = [y for y in e.ratings if mend(y, 12) < d]
        return e.ratings[max(ys)]["final"] if ys else None

    def train12(self, e, y, m):
        tot = 0.0
        yy, mm = y, m
        for _ in range(12):
            mm -= 1
            if mm == 0:
                yy, mm = yy - 1, 12
            tot += e.train.get(ym(yy, mm), 0.0)
        return tot

    def annual_hours(self, e, year):
        r = R("th", e.id, year)
        h = DI[e.dept][6] * TRAIN_BAND[e.band] * r.lognormvariate(0, 0.35)
        return h * (0.4 if e.low_eng else 1.0)

    def new_emp_id(self):
        eid = f"E-{self.next_emp:04d}"
        self.next_emp += 1
        return eid

    # ---------------- initial population at 1 Jan 2023
    def init_population(self):
        people = []
        mids = self.mids(2023)
        for i in range(N_INITIAL):
            r = R("init", i)
            dept = wchoice(r, DN, [d[1] for d in DEPTS])
            band = pick_band(r, dept)
            loc = pick_loc(r, dept)
            gender = "Female" if r.random() < DI[dept][4] else "Male"
            mean_t = [6, 7, 9, 11, 13, 15][band]
            for _ in range(20):
                tenure = min(30.0, r.expovariate(1 / mean_t) + (0.2 if band > 2 else 0.05))
                age_h = max(19.0, r.gauss(AGE_AT_HIRE[band] - (3 if tenure > 10 else 0), 3.5))
                if age_h + tenure <= 56:
                    break
            hire = add_days(START, -int(tenure * 365.25))
            birth = add_days(hire, -int(age_h * 365.25 + r.random() * 300))
            talent, conduct = r.gauss(0, 1), r.gauss(0, 1)
            etype, cend = "Permanent", None
            if band <= 1 and tenure < 4 and r.random() < 0.45:
                etype, cend = "Contract", add_days(START, 45 + int(r.random() * 540))
            msp = None
            if tenure > 2 and band > 0 and r.random() < 0.7:
                msp = add_days(START, -int(r.uniform(0.5, min(tenure, 9)) * 365.25))
            compa = clamp(r.gauss(0.99, 0.09) - 0.02 * (months_between(msp or hire, START) / 60), 0.75, 1.30)
            people.append(dict(dept=dept, loc=loc, band=band, etype=etype, gender=gender, birth=birth, hire=hire,
                               base=mids[band] * compa, talent=talent, conduct=conduct, last_promo=msp,
                               contract_end=cend, source=None, low_eng=r.random() < 0.15))
        people.sort(key=lambda p: (p["hire"], p["birth"]))
        for p in people:
            e = Emp(id=self.new_emp_id(), **p)
            e.potential = self.potential(e, 2022, R("pot0", e.id))
            self.emps.append(e)
            self.by_id[e.id] = e
            h = self.annual_hours(e, 2022)
            for m in range(1, 13):
                if mend(2022, m) >= e.hire:
                    e.train[ym(2022, m)] = h / 12 * TRAIN_SEAS[m - 1]
            if e.hire <= dt.date(2022, 10, 1):
                self.rate(e, 2022)
        for i in range(N_INITIAL_REQS):
            r = R("initreq", i)
            dept = wchoice(r, DN, [d[1] for d in DEPTS])
            spec = dict(dept=dept, band=pick_band(r, dept), loc=pick_loc(r, dept), reason="Replacement", replaces=None)
            self.push(add_days(dt.date(2022, 10, 1), int(r.random() * 91)), "open", spec)

    # ---------------- performance
    def potential(self, e, year, r):
        age = years_between(e.birth, mend(year, 12))
        s = e.talent + 0.4 * r.gauss(0, 1) + (0.3 if age < 35 else 0) - (0.3 if age > 50 else 0)
        return "High" if s > 0.95 else ("Low" if s < -0.30 else "Medium")

    def rate(self, e, year):
        r = R("rate", e.id, year)
        e.talent = 0.95 * e.talent + r.gauss(0, 0.25)
        kpi = clamp(100 + 12 * e.talent + 8 * r.gauss(0, 1) + YEAR_KPI.get(year, 0), 55, 150)
        shared = r.gauss(0, 1)
        comps = [round(clamp(3.3 + 0.35 * e.talent + 0.5 * e.conduct + 0.25 * shared + 0.35 * r.gauss(0, 1) + b, 1, 5), 1)
                 for b in COMP_BIAS]
        beh = sum(comps) / len(comps)
        ks = kpi_to_score(kpi)
        score = KPI_WEIGHT * ks + BEHAVIOR_WEIGHT * beh
        e.potential = self.potential(e, year, r)
        e.ratings[year] = {"kpi": round(kpi, 1), "kpi_score": round(ks, 2), "comps": comps, "behavior": round(beh, 2),
                           "final": final_rating(score), "potential": e.potential}

    # ---------------- requisitions
    def open_req(self, d, spec):
        rid = f"R-{self.next_req:04d}"
        self.next_req += 1
        r = R("req", rid)
        band = spec["band"]
        internal = r.random() < INTERNAL_P[band]
        src_draw = wchoice(r, EXT_SOURCES, SRC_MIX[band])
        source = "Internal" if internal else src_draw
        cancel = r.random() < (0.08 if spec["reason"] == "Growth" else 0.04)
        ttf = TTF_BASE[band] * SRC_TTF[source] * TTF_DEPT.get(spec["dept"], 1.0) * TTF_YEAR.get(d.year, 1.0) * r.lognormvariate(0, 0.28)
        if r.random() < (0.06 if band <= 1 else 0.25):          # hard-to-fill roles (scarce skills)
            ttf *= 2.3
        ttf = int(clamp(round(ttf), 10, 240))
        appl_ext = max(4, round(APPL_BASE[band] * SRC_APPL.get(src_draw, 1.0) * r.lognormvariate(0, 0.35)))
        appl_int = 2 + int(r.random() * 5)
        scr_rate = SRC_SCREEN.get(src_draw, r.uniform(0.22, 0.38))
        int_rate = r.uniform(0.30, 0.50)
        acc = min(0.97, ACCEPT_BASE[band] * SRC_ACCEPT.get(source, 1.0))
        declines = 0
        while r.random() > acc and declines < 4:
            declines += 1
        ads_u, cancel_days = r.random(), 20 + int(r.random() * 70)
        req = Req(id=rid, dept=spec["dept"], loc=spec["loc"], band=band, reason=spec["reason"], opened=d,
                  closed=None, status="Open", source=source, internal=internal, ttf=ttf, hire_emp=None,
                  replaces=spec.get("replaces"))
        req.offers = 1 + declines
        if internal:
            req.applicants = appl_int
            req.screened = appl_int
            req.interviewed = max(req.offers, min(appl_int, 2 + declines))
        else:
            req.interviewed = max(req.offers + 1, round(appl_ext * scr_rate * int_rate))
            req.screened = max(req.interviewed, round(appl_ext * scr_rate))
            req.applicants = max(appl_ext, req.screened)
        req._ads_u = ads_u
        req.cost_ads, req.cost_agency, req.cost_referral = 0.0, 0.0, 0.0
        req.cost_recruiter = RECRUITER_H[band] * RECRUITER_RATE * (0.4 if internal else 1.0)
        req.cost_assessment = (100 if internal else (140 if band <= 2 else 450))
        self.apply_ads(req)
        self.reqs.append(req)
        if cancel:
            self.push(add_days(d, cancel_days), "cancel", req)
        else:
            self.push(add_days(d, ttf), "fill", req)

    def apply_ads(self, req):
        u, b = req._ads_u, req.band
        req.cost_ads = {"Job board": (150 + 300 * u) * (1 + 0.15 * b), "LinkedIn": (400 + 500 * u) * (1 + 0.3 * b),
                        "Careers site": 50 + 70 * u}.get(req.source, 0.0)

    def find_internal(self, req, d):
        r = R("cand", req.id)
        lateral = req.band == 0 or r.random() < 0.15
        pool = []
        for e in self.emps:
            if not e.active(d) or e.exit is not None or (d - e.hire).days < 365:
                continue
            lr = self.last_rating(e, d) or 3
            if lr < 3:
                continue
            if lateral:
                ok = e.band == req.band and e.dept != req.dept
            else:
                ok = e.band == req.band - 1 and e.dept == req.dept
            if ok:
                pool.append((lr + {"High": 0.8, "Medium": 0.3, "Low": 0.0}[e.potential] + 0.3 * e.talent
                             + R("cs", req.id, e.id).random() * 0.5, e))
        if not pool:
            return None, lateral
        pool.sort(key=lambda t: (-t[0], t[1].id))
        return pool[0][1], lateral

    def fill_req(self, req, d):
        req.status, req.closed = "Filled", d
        if req.internal:
            cand, lateral = self.find_internal(req, d)
            if cand is None:
                req.internal = False
                req.source = wchoice(R("reqfb", req.id), EXT_SOURCES, SRC_MIX[req.band])
                req.applicants = max(req.applicants, round(APPL_BASE[req.band] * SRC_APPL[req.source] * 0.8))
                req.screened = max(req.screened, round(req.applicants * 0.3))
                req.interviewed = max(req.interviewed, req.offers + 1)
                req.cost_recruiter /= 0.4
                req.cost_assessment = 140 if req.band <= 2 else 450
                self.apply_ads(req)
            else:
                old = (cand.dept, cand.loc, cand.band)
                mids = self.mids(d.year)
                if lateral:
                    cand.dept, cand.loc = req.dept, req.loc
                    cand.base *= 1.03
                    kind = "Transfer"
                else:
                    cand.band = req.band
                    cand.loc = req.loc
                    cand.base = max(cand.base * 1.10, 0.88 * mids[cand.band])
                    cand.last_promo = d
                    cand.promoted.add(d.year)
                    kind = "Promotion"
                    if cand.etype == "Contract":
                        cand.etype, cand.contract_end = "Permanent", None
                self.moves.append({"emp_id": cand.id, "date": d, "type": kind, "via": "Internal fill",
                                   "from_dept": old[0], "to_dept": cand.dept, "from_band": old[2], "to_band": cand.band,
                                   "req_id": req.id})
                req.hire_emp = cand.id
                if R("bfi", req.id).random() < 0.9:
                    self.push(add_days(d, 3), "open", dict(dept=old[0], loc=old[1], band=old[2], reason="Backfill", replaces=cand.id))
                return
        r = R("hire", req.id)
        band = req.band
        notice = r.randint(7, 21) if band <= 1 else (r.randint(14, 30) if band == 2 else r.randint(30, 60))
        hire = add_days(d, notice)
        mids = self.mids(hire.year)
        compa = clamp(r.gauss(0.96 + (0.03 if req.source == "Agency" else 0), 0.07), 0.80, 1.20)
        age_h = max(19.0, r.gauss(AGE_AT_HIRE[band], 3.5))
        p_contract = [0.70, 0.50, 0.20, 0.05, 0.05, 0.05][band]
        etype = "Contract" if r.random() < p_contract else "Permanent"
        cend = add_months(hire, 24 if r.random() < 0.3 else 12) if etype == "Contract" else None
        e = Emp(id=self.new_emp_id(), dept=req.dept, loc=req.loc, band=band, etype=etype,
                gender="Female" if r.random() < DI[req.dept][4] else "Male",
                birth=add_days(hire, -int(age_h * 365.25 + r.random() * 300)), hire=hire, base=mids[band] * compa,
                talent=r.gauss(SRC_TALENT[req.source], 1.0), conduct=r.gauss(0, 1), last_promo=None,
                contract_end=cend, source=req.source, req=req.id, low_eng=r.random() < 0.15)
        e.potential = self.potential(e, hire.year - 1, r)
        self.emps.append(e)
        self.by_id[e.id] = e
        req.hire_emp = e.id
        req.cost_agency = AGENCY_FEE * e.base if req.source == "Agency" else 0.0
        req.cost_referral = REF_BONUS[band] if req.source == "Referral" else 0.0

    # ---------------- leaving
    def backfill(self, e, d, p, reason="Replacement"):
        rb = R("bf", e.id, d)
        if rb.random() < (1.0 if e.band >= 4 else p):
            self.push(add_days(d, int(rb.random() * 7)), "open",
                      dict(dept=e.dept, loc=e.loc, band=e.band, reason=reason, replaces=e.id))

    def handle(self, d, kind, x):
        if kind == "open":
            self.open_req(d, x)
        elif kind == "fill":
            self.fill_req(x, d)
        elif kind == "cancel":
            x.status, x.closed = "Cancelled", d
        elif kind in ("notice", "term"):
            e = x
            if e.exit is not None or not e.active(d):
                return
            e.notice = d
            if kind == "notice":
                e.exit, e.reason = add_days(d, 30 if e.band < 3 else 60), "Resignation"
                self.backfill(e, d, 0.93)
            else:
                e.exit, e.reason = add_days(d, 1), "Termination"
                self.backfill(e, d, 0.90)
        elif kind == "cend":
            e = x
            # renewal decision is taken and communicated 30 days before the contract ends
            if e.exit is not None or e.etype != "Contract" or e.contract_end != add_days(d, 30):
                return
            r = R("ce", e.id, e.renewals)
            lr = self.last_rating(e, d) or 3
            u = r.random()
            if lr >= 3:
                conv, ren = (0.45, 0.33) if e.renewals == 0 else (0.70, 0.0)
            else:
                conv, ren = (0.05, 0.20) if e.renewals == 0 else (0.10, 0.0)
            if u < conv:
                e.etype, e.contract_end = "Permanent", None
            elif u < conv + ren:
                e.contract_end = add_months(e.contract_end, 12)
                e.renewals += 1
            else:
                e.notice, e.exit, e.reason = d, add_days(e.contract_end, 1), "End of contract"
                self.backfill(e, d, 0.80)

    def vol_target(self, y, m):
        """Expected resignations this month that keep total turnover on a smooth ~13% path.
        Other exits expected over the next 12 months (terminations from current ratings, contract
        ends from the contract pipeline) are netted off, using only the current state."""
        t = (y - 2023) * 12 + (m - 1)
        total = 0.126 + 0.003 * math.sin(2 * math.pi * t / 40 + 0.5)
        ms = mstart(y, m)
        horizon = add_months(ms, 12)
        act = [e for e in self.emps if e.active(ms)]
        other = 0.0
        for e in act:
            if e.exit is not None:
                continue
            other += self.pa_involuntary(e, ms)
            if e.etype == "Contract" and e.contract_end and e.contract_end < horizon:
                lr = self.last_rating(e, ms) or 3
                other += (0.22 if e.renewals == 0 else 0.30) if lr >= 3 else (0.60 if e.renewals == 0 else 0.90)
        rate = clamp(total - other / max(1, len(act)), 0.04, 0.11)
        return len(act) * rate / 12

    def x_voluntary(self, e, d, y, m):
        lr = self.last_rating(e, d) or 3
        compa = e.base / self.mids(y)[e.band]
        msp = months_between(e.last_promo or e.hire, d) / 12
        ten = years_between(e.hire, d)
        t_eff = 2.30 if ten < 1 else 1.45 if ten < 2 else 0.30 if ten < 5 else -0.60 if ten < 10 else -0.90
        if e.source == "Referral" and ten < 2:
            t_eff -= 0.55
        x = (-3.88 + DI[e.dept][7] + ATTR_BAND[e.band] + LOC_ATTR[e.loc] + t_eff
             - 4.0 * (compa - 1.0)
             + 0.42 * clamp(msp - 2, 0, 3) - (0.65 if msp < 1.5 else 0.0)
             - 0.015 * (self.train12(e, y, m) - 30)
             + (0.80 if (lr >= 4 and compa < 0.95) else 0.0)
             + (0.25 if lr <= 2 else 0.0)
             + (0.25 if e.etype == "Contract" else 0.0)
             + 0.10 * e.talent + YEAR_ATTR.get(y, 0.0))
        return x

    def pa_involuntary(self, e, d):
        lr = self.last_rating(e, d)
        pa = {1: 0.30, 2: 0.07, 3: 0.006, 4: 0.003, 5: 0.002}.get(lr, 0.004)
        if (d - e.hire).days < 180 and e.talent < -1.2:
            pa += 0.25
        return pa

    def p_involuntary(self, e, d):
        return 1 - (1 - self.pa_involuntary(e, d)) ** (1 / 12)

    # ---------------- annual cycles
    def jan_snapshot(self, y):
        d = mstart(y, 1)
        mids = self.mids(y)
        for e in self.emps:
            if e.active(d):
                prev = sum(v for k, v in e.train.items() if k.startswith(f"{y - 1}-"))
                self.snap[(e.id, y)] = {"band": e.band, "dept": e.dept, "loc": e.loc, "etype": e.etype,
                                        "compa": e.base / mids[e.band],
                                        "msp": months_between(e.last_promo or e.hire, d),
                                        "tenure": years_between(e.hire, d), "train_prev": prev,
                                        "last_rating": self.last_rating(e, d)}

    def make_budget(self, y):
        d = mstart(y, 1)
        hc0 = plan_hc(d)
        ratio = plan_hc(mend(y, 12)) / hc0
        per = {dn: {"run": 0.0, "ot": [0.0] * 12, "bonus": 0.0, "hc": 0} for dn in DN}
        for e in self.emps:
            if not e.active(d):
                continue
            b = per[e.dept]
            bm = e.base / 12
            b["hc"] += 1
            b["run"] += bm * (1 + BENEFIT_RATE[e.band] + 0.055) + 45 + (DI[e.dept][6] * TRAIN_BAND[e.band] * TRAIN_RATE + TRAIN_EXT[e.band]) / 12
            for m in range(1, 13):
                f = OT_SEAS[m - 1]
                ph = ta_phase(e.loc, y, m) if e.dept in PLANT_DEPTS else None
                if ph is not None:
                    f *= TA_OT_PLAN[ph]
                b["ot"][m - 1] += bm * DI[e.dept][5] * OT_BAND[e.band] * f
            b["bonus"] += e.base * BONUS_TARGET[e.band] * 0.97
        for dn in DN:
            b = per[dn]
            bias = 1 + R("budgetbias", dn, y).gauss(0, 0.03)     # planning assumptions differ by department
            for m in range(1, 13):
                hcf = (1 + (ratio - 1) * m / 12) * 1.01
                merit = 1.05 if m >= 4 else 1.0
                cost = ((b["run"] + b["ot"][m - 1]) * hcf * merit + (b["bonus"] if m == 3 else 0.0)) * bias
                self.budget.append({"month": ym(y, m), "dept": dn, "budget_headcount": round(b["hc"] * (1 + (ratio - 1) * m / 12)),
                                    "budget_cost": round(cost)})

    def pay_bonus(self, y):
        d = mstart(y, 3)
        cyc = y - 1
        fac = self.plans.get(cyc, {"bonus_factor": 1.0})["bonus_factor"]
        for e in self.emps:
            if e.active(d) and cyc in e.ratings:
                a, b = max(e.hire, mstart(cyc, 1)), mend(cyc, 12)
                frac = clamp(((b - a).days + 1) / 365, 0, 1)
                e.bonus_due[y] = e.base * BONUS_TARGET[e.band] * BONUS_MULT[e.ratings[cyc]["final"]] * fac * frac

    def april_cycle(self, y):
        d = mstart(y, 4)
        mids = self.mids(y)
        prob = [0.25, 0.20, 0.13, 0.08, 0.03]
        target = self.band_targets(d)
        count = self.band_counts(d)
        for e in self.emps:
            if not e.active(d) or e.exit is not None:
                continue
            r = R("apr", e.id, y)
            u, noise = r.random(), r.gauss(0, 0.005)
            lr = self.last_rating(e, d) or 3
            promoted = False
            if (e.band < 5 and lr >= 4 and e.potential != "Low" and months_between(e.last_promo or e.hire, d) >= 24
                    and (d - e.hire).days >= 730):
                p = prob[e.band] * (1.3 if e.potential == "High" else 1.0)
                if u < p and count[(e.dept, e.band + 1)] < target[(e.dept, e.band + 1)] * 1.10:
                    count[(e.dept, e.band + 1)] += 1
                    count[(e.dept, e.band)] -= 1
                    old = e.band
                    e.band += 1
                    e.base = max(e.base * 1.12, 0.88 * mids[e.band])
                    e.last_promo = d
                    e.promoted.add(y)
                    if e.etype == "Contract":
                        e.etype, e.contract_end = "Permanent", None
                    self.moves.append({"emp_id": e.id, "date": d, "type": "Promotion", "via": "Annual cycle",
                                       "from_dept": e.dept, "to_dept": e.dept, "from_band": old, "to_band": e.band,
                                       "req_id": None})
                    promoted = True
            if not promoted:
                compa = e.base / mids[e.band]
                adj = 0.015 if compa < 0.90 else (-0.01 if compa > 1.10 else 0.0)
                e.base *= 1 + max(0.0, MERIT[lr] + adj + noise)

    # ---------------- monthly costs
    def accrue(self, y, m):
        ms, me, nd = mstart(y, m), mend(y, m), dim(y, m)
        key_ym = ym(y, m)
        for e in self.emps:
            if e.hire > me or (e.exit is not None and e.exit <= ms):
                continue
            last = me if e.exit is None else min(me, add_days(e.exit, -1))
            days = (last - max(ms, e.hire)).days + 1
            if days <= 0:
                continue
            fte = days / nd
            r = R("c", e.id, key_ym)
            ot_ind, oth_u = r.lognormvariate(0, 0.25), r.random()
            bm = e.base / 12 * fte
            ph = ta_phase(e.loc, y, m) if e.dept in PLANT_DEPTS else None
            otf = OT_SEAS[m - 1] * (TA_OT_ACTUAL[ph] if ph is not None else 1.0)
            ot = bm * DI[e.dept][5] * OT_BAND[e.band] * otf * ot_ind
            hrs = self.annual_hours(e, y) / 12 * TRAIN_SEAS[m - 1] * (0.3 if ph in (0, 1) else 1.0) * fte
            e.train[key_ym] = hrs
            training = hrs * TRAIN_RATE + TRAIN_EXT[e.band] / 12 * fte
            others = bm * 0.055 + 45 * fte + (120 * fte if ph in (0, 1) else 0.0) + 15 * oth_u
            bonus = e.bonus_due.pop(y, 0.0) if m == 3 else 0.0
            k = (key_ym, e.dept, e.loc, e.band, e.etype)
            c = self.cost.setdefault(k, [0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
            c[0] += 1 if e.active(me) else 0
            c[1] += fte
            c[2] += bm
            c[3] += bonus
            c[4] += bm * BENEFIT_RATE[e.band]
            c[5] += ot
            c[6] += training
            c[7] += others
            c[8] += hrs

    # ---------------- main loop
    def run(self):
        self.init_population()
        last = (self.as_of.year, self.as_of.month)
        for (y, m) in month_list((2023, 1), last):
            ms, me = mstart(y, m), mend(y, m)
            self.mids(y)
            if m == 1:
                self.jan_snapshot(y)
                self.make_budget(y)
            if m == 3:
                self.pay_bonus(y)
            if m == 4:
                self.april_cycle(y)
            # growth requisitions to follow the headcount plan (3-month look-ahead)
            active = sum(1 for e in self.emps if e.active(ms))
            pending = sum(1 for e in self.emps if e.active(ms) and e.exit is not None)
            upcoming = sum(1 for e in self.emps if e.hire > ms)
            open_r = sum(1 for q in self.reqs if q.status == "Open")
            gap = round(plan_hc(add_months(ms, 3)) - (active - pending + upcoming + open_r))
            n_growth = int(clamp(gap, 0, 12))
            if n_growth:
                target = self.band_targets(add_months(ms, 3))
                have = self.band_counts(ms, pipeline=True)
                for i in range(n_growth):
                    cell = max(target, key=lambda c: (target[c] - have[c], c))
                    have[cell] += 1
                    dept, band = cell
                    rg = R("gr", ym(y, m), i)
                    if y == 2025 and dept in PLANT_DEPTS and rg.random() < 0.5:
                        loc = "Plant C"
                    else:
                        loc = pick_loc(rg, dept)
                    self.push(add_days(ms, int(rg.random() * dim(y, m))), "open",
                              dict(dept=dept, loc=loc, band=band, reason="Growth", replaces=None))
            # leaving risk, drawn from the state at the start of the month. The intercept is shifted
            # so the average annual resignation probability follows a smooth target path; the shift is
            # the same for everyone, so relative drivers (compa-ratio, promotion, tenure...) are untouched.
            at_risk = [e for e in self.emps if e.active(ms)]
            xs = {e.id: self.x_voluntary(e, ms, y, m) for e in at_risk if e.exit is None}
            shift = 0.0
            if xs:
                tgt = self.vol_target(y, m)                 # expected resignations this month
                lo, hi = -6.0, 6.0
                for _ in range(40):                         # bisection on the common intercept shift
                    mid = (lo + hi) / 2
                    exp_n = sum(1 - (1 - sigmoid(x + mid)) ** (1 / 12) for x in xs.values())
                    lo, hi = (mid, hi) if exp_n < tgt else (lo, mid)
                shift = (lo + hi) / 2
            for e in at_risk:
                r = R("m", e.id, ym(y, m))
                u1, d1, u2, d2 = r.random(), r.random(), r.random(), r.random()
                if e.exit is not None:
                    continue
                if u1 < 1 - (1 - sigmoid(xs[e.id] + shift)) ** (1 / 12):
                    self.push(add_days(ms, int(d1 * dim(y, m))), "notice", e)
                if u2 < self.p_involuntary(e, ms):
                    self.push(add_days(ms, int(d2 * dim(y, m))), "term", e)
                if e.etype == "Contract" and e.contract_end and ms <= add_days(e.contract_end, -30) <= me:
                    self.push(add_days(e.contract_end, -30), "cend", e)
            # process events in date order, never beyond the as-of date
            stop = min(me, self.as_of)
            while self.heap and self.heap[0][0] <= stop:
                d, _, kind, x = heapq.heappop(self.heap)
                self.handle(d, kind, x)
            if me <= self.as_of:
                self.accrue(y, m)
            else:
                for e in self.emps:          # partial month: keep training history for features only
                    if e.active(ms):
                        e.train.setdefault(ym(y, m), 0.0)
            if m == 12 and me <= self.as_of:
                for e in self.emps:
                    if e.active(me) and e.hire <= dt.date(y, 10, 1):
                        self.rate(e, y)

# ----------------------------------------------------------------------------- export
def r10(v):
    """Round money to the nearest $10: invisible on the dashboard, much smaller files."""
    return int(round(v / 10.0)) * 10


def table(columns, rows, dims=None):
    dims = dims or {}
    idx = {c: {v: i for i, v in enumerate(vals)} for c, vals in dims.items()}
    out = []
    for r in rows:
        out.append([idx[c][r[c]] if (c in idx and r[c] is not None) else r[c] for c in columns])
    return {"columns": columns, "dims": dims, "rows": out}


def write(out_dir, name, obj):
    path = os.path.join(out_dir, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    return path


def key_positions(sim):
    d = sim.as_of
    incumbents = [e for e in sim.emps if e.active(d) and
                  (e.band >= 4 or (e.band == 3 and e.dept in KEY_MANAGER_DEPTS))]
    incumbents.sort(key=lambda e: (-e.band, DN.index(e.dept), e.id))
    load = {}
    rows = []
    for i, inc in enumerate(incumbents):
        cands = []
        for e in sim.emps:
            if not e.active(d) or e.exit is not None or e.band != inc.band - 1 or e is inc:
                continue
            if inc.band < 5 and e.dept != inc.dept:
                continue
            lr = sim.last_rating(e, d) or 0
            if lr < 3 or e.potential == "Low":
                continue
            now = ((lr >= 4 and e.potential == "High") or (lr == 5 and e.potential == "Medium")) and \
                months_between(e.last_promo or e.hire, d) >= 18
            later = lr >= 4 or (lr == 3 and e.potential == "High")
            if not (now or later):
                continue
            cands.append((0 if now else 1, -lr, e.id, now, e))
        cands.sort(key=lambda t: t[:3])
        rn = rl = 0
        for _, _, _, now, e in cands:
            if load.get(e.id, 0) >= 2:
                continue
            if now and rn < 2:
                rn += 1
            elif not now and rl < 2:
                rl += 1
            else:
                continue
            load[e.id] = load.get(e.id, 0) + 1
        rows.append({"pos_id": f"K-{i + 1:03d}", "dept": inc.dept, "loc": inc.loc, "band": BANDS[inc.band],
                     "incumbent_id": inc.id, "incumbent_exit": iso(inc.exit), "ready_now": rn, "ready_1_2y": rl})
    return rows


def export(sim, fin_rows, plans, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    as_of = sim.as_of
    ly, lm = (as_of.year, as_of.month - 1) if as_of.month > 1 else (as_of.year - 1, 12)
    last_closed = ym(ly, lm)
    dims_common = {"dept": DN, "loc": LOCS, "band": BANDS}
    files = {}

    emp_rows = []
    for e in sim.emps:
        yr = (e.exit - dt.timedelta(days=1)).year if (e.exit and e.exit <= as_of) else as_of.year
        emp_rows.append({"emp_id": e.id, "dept": e.dept, "loc": e.loc, "band": BANDS[e.band], "etype": e.etype,
                         "gender": e.gender, "birth_date": iso(e.birth), "hire_date": iso(e.hire),
                         "exit_date": iso(e.exit), "exit_reason": e.reason, "notice_date": iso(e.notice),
                         "base_salary": round(e.base), "compa_ratio": round(e.base / sim.mids(yr)[e.band], 3),
                         "potential": e.potential, "last_promo_date": iso(e.last_promo), "hire_source": e.source,
                         "req_id": e.req, "contract_end": iso(e.contract_end)})
    files["employees.json"] = table(
        ["emp_id", "dept", "loc", "band", "etype", "gender", "birth_date", "hire_date", "exit_date", "exit_reason",
         "notice_date", "base_salary", "compa_ratio", "potential", "last_promo_date", "hire_source", "req_id", "contract_end"],
        emp_rows, dict(dims_common, etype=["Permanent", "Contract"], gender=["Male", "Female"],
                       exit_reason=["Resignation", "Termination", "End of contract"], potential=["Low", "Medium", "High"],
                       hire_source=EXT_SOURCES + ["Internal"]))

    yr_rows = []
    years = sorted({y for (_, y) in sim.snap} | {y for e in sim.emps for y in e.ratings})
    for e in sim.emps:
        for y in years:
            s = sim.snap.get((e.id, y))
            rt = e.ratings.get(y)
            hrs = sum(v for k, v in e.train.items() if k.startswith(f"{y}-"))
            if not s and not rt and hrs == 0:
                continue
            row = {"emp_id": e.id, "year": y,
                   "band_jan": BANDS[s["band"]] if s else None, "dept_jan": s["dept"] if s else None,
                   "loc_jan": s["loc"] if s else None, "etype_jan": s["etype"] if s else None,
                   "compa_jan": round(s["compa"], 3) if s else None, "months_since_promo_jan": round(s["msp"], 1) if s else None,
                   "tenure_jan": round(s["tenure"], 2) if s else None, "train_hours_prev": round(s["train_prev"], 1) if s else None,
                   "last_rating_jan": s["last_rating"] if s else None,
                   "kpi_pct": rt["kpi"] if rt else None, "kpi_score": rt["kpi_score"] if rt else None,
                   "behavior_score": rt["behavior"] if rt else None, "final_rating": rt["final"] if rt else None,
                   "potential": rt["potential"] if rt else None,
                   "training_hours": round(hrs, 1) if y >= 2023 else None,
                   "promoted": 1 if y in e.promoted else 0}
            for i, c in enumerate(COMPETENCIES):
                row["c%d" % (i + 1)] = rt["comps"][i] if rt else None
            yr_rows.append(row)
    files["emp_years.json"] = table(
        ["emp_id", "year", "band_jan", "dept_jan", "loc_jan", "etype_jan", "compa_jan", "months_since_promo_jan",
         "tenure_jan", "train_hours_prev", "last_rating_jan", "kpi_pct", "kpi_score", "c1", "c2", "c3", "c4", "c5",
         "behavior_score", "final_rating", "potential", "training_hours", "promoted"],
        yr_rows, {"band_jan": BANDS, "dept_jan": DN, "loc_jan": LOCS, "etype_jan": ["Permanent", "Contract"],
                  "potential": ["Low", "Medium", "High"]})

    mv = [dict(x, date=iso(x["date"]), from_band=BANDS[x["from_band"]], to_band=BANDS[x["to_band"]]) for x in sim.moves]
    mv.sort(key=lambda x: (x["date"], x["emp_id"]))
    files["moves.json"] = table(["emp_id", "date", "type", "via", "from_dept", "to_dept", "from_band", "to_band", "req_id"], mv,
                                {"type": ["Promotion", "Transfer"], "via": ["Annual cycle", "Internal fill"], "from_dept": DN,
                                 "to_dept": DN, "from_band": BANDS, "to_band": BANDS})

    cost_rows = []
    for (k_ym, dept, loc, band, et), c in sorted(sim.cost.items()):
        if k_ym > last_closed:
            continue
        cost_rows.append({"month": k_ym, "dept": dept, "loc": loc, "band": BANDS[band], "etype": et,
                          "headcount_end": c[0], "fte": round(c[1], 1), "base": r10(c[2]), "bonus": r10(c[3]),
                          "benefits": r10(c[4]), "overtime": r10(c[5]), "training": r10(c[6]), "others": r10(c[7]),
                          "training_hours": round(c[8])})
    files["cost_monthly.json"] = table(["month", "dept", "loc", "band", "etype", "headcount_end", "fte", "base", "bonus", "benefits",
                                        "overtime", "training", "others", "training_hours"], cost_rows,
                                       dict(dims_common, etype=["Permanent", "Contract"]))
    files["budget_monthly.json"] = table(["month", "dept", "budget_headcount", "budget_cost"], sim.budget, {"dept": DN})

    fin, prod = [], []
    for r in fin_rows:
        k = ym(r["y"], r["m"])
        if k > last_closed:
            continue
        fin.append({"month": k, "revenue": round(r["revenue"]), "ebitda": round(r["ebitda"]),
                    "production_kt": round(sum(v[1] for v in r["prod"].values()), 2), "sales_kt": round(r["sales_kt"], 2),
                    "avg_price_per_t": round(r["price"], 1)})
        for p, (cap, out, util, ph) in r["prod"].items():
            prod.append({"month": k, "plant": p, "capacity_kt": round(cap, 2), "production_kt": round(out, 2),
                         "utilization": round(util, 3), "turnaround": None if ph is None else ["prep", "shutdown", "restart"][ph + 1]})
    files["finance_monthly.json"] = table(["month", "revenue", "ebitda", "production_kt", "sales_kt", "avg_price_per_t"], fin)
    files["production_monthly.json"] = table(["month", "plant", "capacity_kt", "production_kt", "utilization", "turnaround"], prod,
                                             {"plant": LOCS[1:], "turnaround": ["prep", "shutdown", "restart"]})

    rq = []
    for q in sim.reqs:
        o = {"req_id": q.id, "dept": q.dept, "loc": q.loc, "band": BANDS[q.band], "reason": q.reason, "opened": iso(q.opened),
             "closed": iso(q.closed), "status": q.status, "source": q.source, "internal": 1 if q.internal else 0,
             "applicants": q.applicants, "screened": q.screened, "interviewed": q.interviewed, "offers": q.offers,
             "accepted": 1 if q.status == "Filled" else 0, "hire_emp_id": q.hire_emp,
             "cost_ads": round(q.cost_ads), "cost_agency": round(q.cost_agency), "cost_referral": round(q.cost_referral),
             "cost_recruiter": round(q.cost_recruiter), "cost_assessment": round(q.cost_assessment)}
        if q.status == "Open":
            frac = clamp((as_of - q.opened).days / max(1, q.ttf), 0, 1)
            o.update(applicants=round(q.applicants * min(1, frac / 0.5)), screened=round(q.screened * min(1, frac / 0.7)),
                     interviewed=round(q.interviewed * max(0.0, (frac - 0.4) / 0.6)), offers=0,
                     cost_recruiter=round(q.cost_recruiter * frac), cost_assessment=round(q.cost_assessment * frac))
        elif q.status == "Cancelled":
            o.update(offers=0, interviewed=round(q.interviewed * 0.5), cost_assessment=round(q.cost_assessment * 0.5))
        rq.append(o)
    files["requisitions.json"] = table(list(rq[0].keys()), rq,
                                       dict(dims_common, reason=["Replacement", "Backfill", "Growth"],
                                            status=["Open", "Filled", "Cancelled"], source=EXT_SOURCES + ["Internal"]))
    kp = key_positions(sim)
    files["key_positions.json"] = table(list(kp[0].keys()), kp, dims_common)

    files["meta.json"] = {
        "company": "Demo Corp", "industry": "Petrochemical manufacturing (polyolefins: polyethylene & polypropylene)",
        "currency": "USD", "synthetic": True, "seed": SEED, "generator_version": VERSION,
        "as_of": iso(as_of), "window_start": iso(START), "last_closed_month": last_closed,
        "latest_review_cycle": max((y for e in sim.emps for y in e.ratings), default=None),
        "dims": {"dept": DN, "loc": LOCS, "band": BANDS, "etype": ["Permanent", "Contract"], "gender": ["Male", "Female"],
                 "plants": list(PLANT_CAP), "competencies": COMPETENCIES, "sources": EXT_SOURCES + ["Internal"]},
        "band_midpoints": {str(y): [round(v) for v in sim.mids(y)] for y in sorted(sim.mid)},
        "performance": {"kpi_weight": KPI_WEIGHT, "behavior_weight": BEHAVIOR_WEIGHT, "scale": [1, 5],
                        "rating_labels": ["Unsatisfactory", "Needs improvement", "Meets expectations", "Exceeds expectations", "Outstanding"]},
        "plans": [{"year": y, "plan_revenue": round(p["plan_revenue"]), "plan_ebitda": round(p["plan_ebitda"]),
                   "plan_avg_hc": round(p["plan_avg_hc"], 1),
                   "rev_per_emp_target": round(p["plan_revenue"] / p["plan_avg_hc"]),
                   "ebitda_per_emp_target": round(p["plan_ebitda"] / p["plan_avg_hc"])}
                  for y, p in sorted(plans.items()) if 2023 <= y <= as_of.year],
        "turnarounds": [{"plant": p, "start": ym(y, m), "months": 2} for p, y, m in TURNAROUNDS if mstart(y, m) <= as_of],
        "plan_headcount": [{"date": iso(d), "headcount": v} for d, v in PLAN_HC if d.year <= as_of.year],
        "notes": "All people, figures and the company are fictional, generated by a seeded script."}

    sizes = {}
    for name, obj in files.items():
        p = write(out_dir, name, obj)
        sizes[name] = os.path.getsize(p)
    return sizes


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    ap.add_argument("--as-of", default=dt.date.today().isoformat(), help="data cut-off date (default: today)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "data"))
    a = ap.parse_args()
    as_of = dt.date.fromisoformat(a.as_of)
    if as_of < dt.date(2023, 3, 1):
        raise SystemExit("--as-of must be on or after 2023-03-01")
    fin_rows, plans = simulate_finance()
    sim = Sim(as_of, fin_rows, plans)
    sim.run()
    sizes = export(sim, fin_rows, plans, os.path.abspath(a.out))
    total = sum(sizes.values())
    print(f"Demo Corp data as of {as_of}: {len(sim.emps)} employee records, {len(sim.reqs)} requisitions")
    for k, v in sorted(sizes.items()):
        print(f"  {k:26s} {v / 1024:8.1f} KB")
    print(f"  {'total':26s} {total / 1024:8.1f} KB")


if __name__ == "__main__":
    main()
