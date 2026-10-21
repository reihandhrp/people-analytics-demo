#!/usr/bin/env python3
"""
Demo Corp - three illustrative models trained on the synthetic data (Python standard library only).

1. Forecast: 12-month manpower cost, headcount and revenue. OLS with a linear trend and 11
   month-of-year dummies (cost and revenue on the log scale), 80% prediction interval,
   plus a 12-month back-test.
2. Attrition risk: logistic regression (Newton/IRLS, small L2 penalty) on 1-January employee
   snapshots; label = resignation within the calendar year. Trained on earlier years, tested on
   the latest complete year (AUC), refitted on all years, then used to score active employees.
3. Segmentation: K-Means (k=4, k-means++, fixed seed, 20 restarts) on standardised features,
   with business names assigned by rules on the cluster centres.

Usage: python3 models/train.py   (reads and writes site/data/)
"""
import datetime as dt
import itertools
import json
import math
import os
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "site", "data")
SEED = 42


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        obj = json.load(f)
    if "columns" not in obj:
        return obj
    cols, dims = obj["columns"], obj.get("dims", {})
    return [{c: (dims[c][v] if (c in dims and v is not None) else v) for c, v in zip(cols, r)} for r in obj["rows"]]


def save(name, obj):
    with open(os.path.join(DATA, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)


D = dt.date.fromisoformat

# ----------------------------------------------------------------------------- linear algebra
def solve(A, b):
    """Gauss-Jordan with partial pivoting; A is n x n, b is a list."""
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        piv = M[c][c]
        if abs(piv) < 1e-12:
            raise ValueError("singular matrix")
        M[c] = [v / piv for v in M[c]]
        for r in range(n):
            if r != c and M[r][c] != 0:
                f = M[r][c]
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[i][n] for i in range(n)]


def inverse(A):
    n = len(A)
    cols = [solve(A, [1.0 if i == j else 0.0 for i in range(n)]) for j in range(n)]
    return [[cols[j][i] for j in range(n)] for i in range(n)]


def t_quantile(p, df):
    """Student-t quantile (Cornish-Fisher expansion around the normal quantile)."""
    z = {0.90: 1.2815516, 0.95: 1.6448536, 0.975: 1.9599640}[p]
    return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2)

# ----------------------------------------------------------------------------- 1. forecast
def ols_season(y, months, log=False):
    """y_t = a + b*t + sum_m s_m * D_m (+ e). Returns fitted function and residual sigma."""
    n = len(y)
    yy = [math.log(v) for v in y] if log else list(y)

    def row(t, mo):
        return [1.0, float(t)] + [1.0 if mo == k else 0.0 for k in range(2, 13)]

    X = [row(t, int(m[5:7])) for t, m in enumerate(months)]
    p = len(X[0])
    XtX = [[sum(X[r][i] * X[r][j] for r in range(n)) for j in range(p)] for i in range(p)]
    Xty = [sum(X[r][i] * yy[r] for r in range(n)) for i in range(p)]
    beta = solve(XtX, Xty)
    inv = inverse(XtX)
    fit = [sum(b * x for b, x in zip(beta, X[r])) for r in range(n)]
    sse = sum((a - f) ** 2 for a, f in zip(yy, fit))
    df = n - p
    sigma = math.sqrt(sse / df)
    tq = t_quantile(0.90, df)
    ybar = sum(yy) / n
    r2 = 1 - sse / sum((a - ybar) ** 2 for a in yy)

    def predict(t, m):
        x = row(t, m)
        mu = sum(b * v for b, v in zip(beta, x))
        lev = sum(x[i] * sum(inv[i][j] * x[j] for j in range(p)) for i in range(p))
        half = tq * sigma * math.sqrt(1 + lev)
        if log:
            return math.exp(mu), math.exp(mu - half), math.exp(mu + half)
        return mu, mu - half, mu + half

    back = lambda f: math.exp(f) if log else f
    return predict, [back(f) for f in fit], {"r2": r2, "sigma": sigma, "df": df, "beta_trend": beta[1]}


def add_month(k, n):
    y, m = int(k[:4]), int(k[5:7])
    t = y * 12 + m - 1 + n
    return f"{t // 12:04d}-{t % 12 + 1:02d}"


def forecast(meta, cost, fin):
    months = sorted({c["month"] for c in cost})
    mc = {m: 0.0 for m in months}
    hc = {m: 0 for m in months}
    pay = 0.0
    tot_ttm = 0.0
    for c in cost:
        v = c["base"] + c["bonus"] + c["benefits"] + c["overtime"] + c["training"] + c["others"]
        mc[c["month"]] += v
        hc[c["month"]] += c["headcount_end"]
        if c["month"] in months[-12:]:
            pay += c["base"] + c["bonus"] + c["benefits"]
            tot_ttm += v
    rev = {f["month"]: f["revenue"] for f in fin}
    series = {"manpower_cost": ([mc[m] for m in months], True), "headcount": ([hc[m] for m in months], False),
              "revenue": ([rev[m] for m in months], True)}
    out = {"months_history": months, "horizon": [add_month(months[-1], k) for k in range(1, 13)], "series": {}}
    n = len(months)
    for key, (y, log) in series.items():
        pred, fitted, stats = ols_season(y, months, log)
        fc = [pred(n - 1 + k, int(add_month(months[-1], k)[5:7])) for k in range(1, 13)]
        # back-test: fit without the last 12 months, forecast them
        pb, _, _ = ols_season(y[:-12], months[:-12], log)
        bt = [pb(n - 13 + k, int(months[n - 13 + k][5:7]))[0] for k in range(1, 13)]
        mape_bt = sum(abs(a - b) / a for a, b in zip(y[-12:], bt)) / 12
        mape_in = sum(abs(a - b) / a for a, b in zip(y, fitted)) / n
        out["series"][key] = {
            "actual": [round(v, 2) for v in y], "fitted": [round(v, 2) for v in fitted],
            "mean": [round(v[0], 2) for v in fc], "lo": [round(v[1], 2) for v in fc], "hi": [round(v[2], 2) for v in fc],
            "backtest": [round(v, 2) for v in bt], "r2": round(stats["r2"], 4),
            "mape_in_sample": round(mape_in, 4), "mape_backtest": round(mape_bt, 4)}
    s = out["series"]
    hc_now = s["headcount"]["actual"][-1]
    hc_g = s["headcount"]["mean"][-1] / hc_now - 1
    avg_hc_ttm = sum(s["headcount"]["actual"][-12:]) / 12
    avg_hc_fc = sum(s["headcount"]["mean"]) / 12
    cpf_g = (sum(s["manpower_cost"]["mean"]) / avg_hc_fc) / (sum(s["manpower_cost"]["actual"][-12:]) / avg_hc_ttm) - 1
    rev_g = sum(s["revenue"]["mean"]) / sum(s["revenue"]["actual"][-12:]) - 1
    out["implied"] = {"headcount_growth": round(hc_g, 4), "cost_per_fte_growth": round(cpf_g, 4),
                      "revenue_growth": round(rev_g, 4), "pay_linked_share": round(pay / tot_ttm, 4)}
    out["method"] = ("OLS on monthly history (Jan 2023 onward): linear trend + 11 month-of-year dummies; manpower cost and "
                     "revenue fitted on the log scale. Band = 80% prediction interval. Back-test = model fitted without the "
                     "last 12 months, scored on them.")
    return out

# ----------------------------------------------------------------------------- 2. attrition
FEATURES = [("tenure", "Tenure (log years)"), ("compa", "Compa-ratio"), ("rating", "Last final rating"),
            ("msp", "Months since promotion"), ("training", "Training hours, prior year")]


def feat_row(tenure, compa, rating, msp, training):
    return [math.log1p(max(0.0, tenure)), compa, rating if rating is not None else 3.0, min(msp, 120.0), training]


def logistic_fit(X, y, lam=1.0, iters=50):
    p = len(X[0]) + 1
    w = [0.0] * p
    for _ in range(iters):
        g = [0.0] * p
        H = [[0.0] * p for _ in range(p)]
        for xi, yi in zip(X, y):
            z = [1.0] + xi
            s = sum(a * b for a, b in zip(w, z))
            mu = 1 / (1 + math.exp(-max(-30, min(30, s))))
            r = mu * (1 - mu)
            for i in range(p):
                g[i] += (yi - mu) * z[i]
                zi = r * z[i]
                for j in range(i, p):
                    H[i][j] += zi * z[j]
        for i in range(p):
            for j in range(i):
                H[i][j] = H[j][i]
            if i > 0:
                g[i] -= lam * w[i]
                H[i][i] += lam
        step = solve(H, g)
        w = [a + b for a, b in zip(w, step)]
        if max(abs(v) for v in step) < 1e-8:
            break
    return w


def predict_p(w, x):
    s = w[0] + sum(a * b for a, b in zip(w[1:], x))
    return 1 / (1 + math.exp(-max(-30, min(30, s))))


def auc(scores, labels):
    pairs = sorted(zip(scores, labels))
    pos = sum(labels)
    neg = len(labels) - pos
    rank_sum, i = 0.0, 0
    while i < len(pairs):
        j = i
        while j + 1 < len(pairs) and pairs[j + 1][0] == pairs[i][0]:
            j += 1
        avg = (i + j) / 2 + 1
        rank_sum += avg * sum(1 for k in range(i, j + 1) if pairs[k][1])
        i = j + 1
    return (rank_sum - pos * (pos + 1) / 2) / (pos * neg)


def attrition(meta, emps, years):
    as_of = D(meta["as_of"])
    emp = {e["emp_id"]: e for e in emps}
    complete = [y for y in sorted({r["year"] for r in years}) if 2023 <= y and dt.date(y + 1, 1, 1) <= as_of]
    rows = []
    for r in years:
        if r["year"] not in complete or r["compa_jan"] is None:
            continue
        e = emp[r["emp_id"]]
        lab = 1 if (e["exit_reason"] == "Resignation" and e["notice_date"] and e["notice_date"][:4] == str(r["year"])) else 0
        rows.append((r["year"], feat_row(r["tenure_jan"], r["compa_jan"], r["last_rating_jan"], r["months_since_promo_jan"],
                                         r["train_hours_prev"] or 0.0), lab))
    k = len(FEATURES)
    mean = [sum(x[i] for _, x, _ in rows) / len(rows) for i in range(k)]
    sd = [math.sqrt(sum((x[i] - mean[i]) ** 2 for _, x, _ in rows) / len(rows)) for i in range(k)]
    zf = lambda x: [(x[i] - mean[i]) / sd[i] for i in range(k)]
    test_year = complete[-1]
    tr = [(zf(x), y) for yr, x, y in rows if yr != test_year]
    te = [(zf(x), y) for yr, x, y in rows if yr == test_year]
    w_tr = logistic_fit([x for x, _ in tr], [y for _, y in tr])
    p_te = [predict_p(w_tr, x) for x, _ in te]
    y_te = [y for _, y in te]
    test_auc = auc(p_te, y_te)
    dec = sorted(zip(p_te, y_te))
    deciles = []
    for d in range(10):
        chunk = dec[d * len(dec) // 10:(d + 1) * len(dec) // 10]
        deciles.append({"decile": d + 1, "predicted": round(sum(p for p, _ in chunk) / len(chunk), 4),
                        "actual": round(sum(y for _, y in chunk) / len(chunk), 4)})
    allz = [(zf(x), y) for _, x, y in rows]
    w = logistic_fit([x for x, _ in allz], [y for _, y in allz])
    base = sum(y for _, y in allz) / len(allz)
    t_med, t_high = round(base, 3), round(2 * base, 3)

    # score active employees (not under notice) on the as-of date
    by_emp = {}
    for r in years:
        by_emp.setdefault(r["emp_id"], {})[r["year"]] = r
    ytd_months = max(1, (as_of.month - 1) + as_of.day / 31)
    scored = []
    for e in emps:
        if not (D(e["hire_date"]) <= as_of and (e["exit_date"] is None or D(e["exit_date"]) > as_of)) or e["notice_date"]:
            continue
        yrs = by_emp.get(e["emp_id"], {})
        ratings = [(y, r["final_rating"]) for y, r in yrs.items() if r["final_rating"] is not None]
        last_rating = max(ratings)[1] if ratings else None
        hire = D(e["hire_date"])
        prev = yrs.get(as_of.year - 1, {}).get("training_hours")
        if hire < dt.date(as_of.year - 1, 1, 1) and prev is not None:
            th = prev
        else:
            th = (yrs.get(as_of.year, {}).get("training_hours") or 0.0) * 12 / ytd_months
        msp = (as_of - D(e["last_promo_date"] or e["hire_date"])).days / 30.4375
        x = feat_row((as_of - hire).days / 365.25, e["compa_ratio"], last_rating, msp, th)
        z = zf(x)
        p = predict_p(w, z)
        contrib = sorted(((w[i + 1] * z[i], i) for i in range(k)), reverse=True)
        drivers = [FEATURES[i][0] for c, i in contrib if c > 0.10][:2]
        scored.append([e["emp_id"], round(p, 4), "High" if p >= t_high else ("Medium" if p >= t_med else "Low"), drivers,
                       round(x[1], 3), x[2], round(x[3], 1), round(x[4], 1), round((as_of - hire).days / 365.25, 2)])
    coefs = [{"feature": FEATURES[i][0], "label": FEATURES[i][1], "beta_std": round(w[i + 1], 4),
              "odds_ratio_per_sd": round(math.exp(w[i + 1]), 3), "mean": round(mean[i], 4), "sd": round(sd[i], 4)}
             for i in range(k)]
    return {
        "method": ("Logistic regression on employee-year snapshots taken each 1 January; label = resignation notice within the "
                   "calendar year. Features standardised; L2 penalty 1.0. Trained on " + ", ".join(map(str, complete[:-1])) +
                   ", tested on " + str(test_year) + ", then refitted on all years to score active employees."),
        "train_years": complete[:-1], "test_year": test_year, "n_train": len(tr), "n_test": len(te),
        "test_auc": round(test_auc, 4), "base_rate": round(base, 4), "intercept": round(w[0], 4),
        "thresholds": {"medium": t_med, "high": t_high}, "coefficients": coefs, "test_deciles": deciles,
        "scores": {"columns": ["emp_id", "p", "tier", "drivers", "compa", "rating", "months_since_promo", "training_hours", "tenure"],
                   "rows": scored}}

# ----------------------------------------------------------------------------- 3. segmentation
SEG_FEATURES = ["tenure", "compa", "rating", "msp", "training", "potential"]
SEG_NAMES = {
    "rising": lambda z: z["rating"] + z["potential"] - 0.3 * z["msp"],
    "ramping": lambda z: -z["tenure"] - 0.5 * z["msp"],
    "established": lambda z: z["compa"] + 0.5 * z["rating"],
    "plateaued": lambda z: z["msp"] - z["potential"] - 0.5 * z["rating"],
}


def kmeans(X, k, rng, iters=100):
    n = len(X)
    cents = [X[rng.randrange(n)][:]]
    while len(cents) < k:
        d2 = [min(sum((a - b) ** 2 for a, b in zip(x, c)) for c in cents) for x in X]
        tot = sum(d2)
        r, acc = rng.random() * tot, 0.0
        for i, v in enumerate(d2):
            acc += v
            if acc >= r:
                cents.append(X[i][:])
                break
    assign = [0] * n
    for _ in range(iters):
        changed = False
        for i, x in enumerate(X):
            j = min(range(k), key=lambda c: sum((a - b) ** 2 for a, b in zip(x, cents[c])))
            if j != assign[i]:
                assign[i], changed = j, True
        for c in range(k):
            members = [X[i] for i in range(n) if assign[i] == c]
            if members:
                cents[c] = [sum(col) / len(members) for col in zip(*members)]
        if not changed:
            break
    inertia = sum(sum((a - b) ** 2 for a, b in zip(X[i], cents[assign[i]])) for i in range(n))
    return assign, cents, inertia


def silhouette(X, assign, k):
    n = len(X)
    tot = 0.0
    for i in range(n):
        dist = [0.0] * k
        cnt = [0] * k
        for j in range(n):
            if i == j:
                continue
            d = math.sqrt(sum((a - b) ** 2 for a, b in zip(X[i], X[j])))
            dist[assign[j]] += d
            cnt[assign[j]] += 1
        own = assign[i]
        a = dist[own] / cnt[own] if cnt[own] else 0.0
        b = min(dist[c] / cnt[c] for c in range(k) if c != own and cnt[c])
        tot += (b - a) / max(a, b) if max(a, b) > 0 else 0.0
    return tot / n


def segmentation(meta, attr):
    cols = attr["scores"]["columns"]
    S = [dict(zip(cols, r)) for r in attr["scores"]["rows"]]
    pot = {e["emp_id"]: e["potential"] for e in load("employees.json")}
    pv = {"Low": 0.0, "Medium": 1.0, "High": 2.0}
    raw = [[math.log1p(s["tenure"]), s["compa"], s["rating"], math.log1p(s["months_since_promo"]), s["training_hours"],
            pv.get(pot[s["emp_id"]], 1.0)] for s in S]
    k = len(SEG_FEATURES)
    mean = [sum(r[i] for r in raw) / len(raw) for i in range(k)]
    sd = [math.sqrt(sum((r[i] - mean[i]) ** 2 for r in raw) / len(raw)) or 1.0 for i in range(k)]
    X = [[(r[i] - mean[i]) / sd[i] for i in range(k)] for r in raw]
    rng = random.Random(SEED)
    best = None
    for _ in range(20):
        res = kmeans(X, 4, rng)
        if best is None or res[2] < best[2]:
            best = res
    assign, cents, inertia = best
    sil = silhouette(X, assign, 4)
    zc = [dict(zip(SEG_FEATURES, c)) for c in cents]
    keys = list(SEG_NAMES)
    perm = max(itertools.permutations(range(4)), key=lambda p: sum(SEG_NAMES[keys[i]](zc[p[i]]) for i in range(4)))
    name_of = {perm[i]: keys[i] for i in range(4)}
    clusters = []
    for c in range(4):
        idx = [i for i in range(len(S)) if assign[i] == c]
        m = lambda f: sum(S[i][f] for i in idx) / len(idx)
        clusters.append({"key": name_of[c], "size": len(idx), "z": {f: round(v, 3) for f, v in zc[c].items()},
                         "mean_tenure": round(m("tenure"), 2), "mean_compa": round(m("compa"), 3),
                         "mean_rating": round(m("rating"), 2), "mean_msp": round(m("months_since_promo"), 1),
                         "mean_training": round(m("training_hours"), 1),
                         "share_high_potential": round(sum(1 for i in idx if pot[S[i]["emp_id"]] == "High") / len(idx), 3),
                         "mean_risk": round(m("p"), 4),
                         "share_high_risk": round(sum(1 for i in idx if S[i]["tier"] == "High") / len(idx), 3)})
    order = ["rising", "established", "ramping", "plateaued"]
    clusters.sort(key=lambda c: order.index(c["key"]))
    return {"method": ("K-Means, k = 4, on standardised features: log tenure, compa-ratio, last final rating, log months since "
                       "promotion, training hours (prior year) and potential. k-means++ initialisation, 20 restarts with a fixed "
                       "seed; the lowest-inertia solution is kept. Names come from rules on the cluster centres."),
            "features": SEG_FEATURES, "silhouette": round(sil, 3), "inertia": round(inertia, 1), "clusters": clusters,
            "assign": {"columns": ["emp_id", "segment"], "rows": [[S[i]["emp_id"], name_of[assign[i]]] for i in range(len(S))]}}


def main():
    meta = load("meta.json")
    cost, fin = load("cost_monthly.json"), load("finance_monthly.json")
    emps, years = load("employees.json"), load("emp_years.json")
    fc = forecast(meta, cost, fin)
    save("model_forecast.json", fc)
    at = attrition(meta, emps, years)
    save("model_attrition.json", at)
    sg = segmentation(meta, at)
    save("model_segments.json", sg)
    s = fc["series"]
    print("forecast  R2 cost %.3f hc %.3f rev %.3f | back-test MAPE cost %.1f%% hc %.1f%% rev %.1f%%" % (
        s["manpower_cost"]["r2"], s["headcount"]["r2"], s["revenue"]["r2"], 100 * s["manpower_cost"]["mape_backtest"],
        100 * s["headcount"]["mape_backtest"], 100 * s["revenue"]["mape_backtest"]))
    print("          implied:", fc["implied"])
    print("attrition AUC test %.3f (train %s, test %d, n=%d/%d) base %.3f" % (at["test_auc"], at["train_years"], at["test_year"],
                                                                          at["n_train"], at["n_test"], at["base_rate"]))
    for c in at["coefficients"]:
        print("          %-10s beta %+.3f  OR/SD %.2f" % (c["feature"], c["beta_std"], c["odds_ratio_per_sd"]))
    tiers = {}
    for r in at["scores"]["rows"]:
        tiers[r[2]] = tiers.get(r[2], 0) + 1
    print("          tiers", tiers, "thresholds", at["thresholds"])
    print("segments  silhouette %.3f" % sg["silhouette"])
    for c in sg["clusters"]:
        print("          %-8s n=%4d tenure %5.1f compa %.2f rating %.2f msp %5.1f train %4.1f hiPot %.0f%% risk %.1f%%  z=%s" % (
            c["key"], c["size"], c["mean_tenure"], c["mean_compa"], c["mean_rating"], c["mean_msp"], c["mean_training"],
            100 * c["share_high_potential"], 100 * c["mean_risk"], c["z"]))


if __name__ == "__main__":
    main()
