'use strict';
/* Demo Corp People Analytics - page renderers. Every sentence on these pages is computed from the data and filters. */

// ------------------------------------------------------------------ extra chart components
function groupCols(items, colors, o) {
  // items: [{label, vals:[a,b], tip}]  side-by-side columns per group
  o = o || {}; if (!items.length) return empty();
  const mx = maxOf(items, (x) => Math.max.apply(null, x.vals)) || 1, n = items.length, tpl = `repeat(${n},minmax(0,1fr))`, h = o.h || 170;
  const cols = items.map((x, i) => `<div class="col" style="flex-direction:row;align-items:flex-end;justify-content:center;gap:4px"${x.tip ? tipAttr(x.tip[0], x.tip[1]) : ''}>${x.vals.map((v, j) =>
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;flex:1;max-width:30px;gap:3px"><span class="v" style="font-size:10.5px">${o.fmt ? o.fmt(v) : NF(v)}</span><div class="b gy" style="width:100%;height:${(100 * v / mx) * 0.84}%;background:${colors[j]};--i:${i}"></div></div>`).join('')}</div>`).join('');
  const xl = items.map((x) => `<span>${esc(x.label)}</span>`).join('');
  return `<div style="display:flex;flex-direction:column"><div class="cols" style="grid-template-columns:${tpl};gap:10px;height:${h}px">${cols}</div><div class="xlabels" style="grid-template-columns:${tpl};gap:10px">${xl}</div></div>`;
}
function funnel(stages) {
  if (!stages[0] || !stages[0].v) return empty();
  const mx = stages[0].v;
  return `<div class="funnel">${stages.map((s, i) => { const w = Math.max(6, Math.sqrt(s.v / mx) * 100); const cv = i ? pct(s.v, stages[i - 1].v) : null;
    return `<div class="fn-row"${tipAttr(s.label, [[tt('Count', 'Jumlah'), NF(s.v)], [tt('From previous stage', 'Dari tahap sebelumnya'), cv == null ? '–' : P(cv)], [tt('From applicants', 'Dari pelamar'), P(pct(s.v, mx), 1)]])}><span>${esc(s.label)}</span><div style="display:flex"><div class="fb gx" style="width:${w}%;--i:${i};background:${i === stages.length - 1 ? 'var(--navy)' : 'var(--purple)'}">${NF(s.v)}</div></div><span class="cv">${cv == null ? '' : tt('conv. ', 'konv. ') + P(cv)}</span></div>`; }).join('')}</div>`;
}
function grid9(cells, o) {
  // cells[r][c] r: 0 = high (top) .. 2 = low ; c: 0 = low .. 2 = high
  const tot = sum(cells.flat(), (x) => x.n) || 1, mx = maxOf(cells.flat(), (x) => x.n) || 1;
  const shade = (n, hot) => { const a = 0.06 + 0.34 * (n / mx); return hot ? `rgba(120,71,145,${(a + 0.04).toFixed(2)})` : `rgba(19,64,91,${(a * 0.75).toFixed(2)})`; };
  let h = '';
  for (let r = 0; r < 3; r++) {
    h += `<span class="yl">${esc(o.yl[r])}</span>`;
    for (let c = 0; c < 3; c++) { const x = cells[r][c];
      h += `<div class="cell"${tipAttr(x.name, [[tt('Employees', 'Karyawan'), NF(x.n)], [tt('Share', 'Porsi'), P(pct(x.n, tot))]])} style="background:${shade(x.n, x.hot)};color:var(--ink)"><span>${esc(x.name)}</span><b>${NF(x.n)} <small style="font-size:11px;font-weight:500">${NF(pct(x.n, tot), 0)}%</small></b></div>`; }
  }
  h += '<span></span>' + o.xl.map((t) => `<span class="xl">${esc(t)}</span>`).join('');
  return `<div class="g9" role="img" aria-label="${esc(o.aria)}">${h}</div><p class="g9-ax">${tt('Columns', 'Kolom')}: ${esc(o.xa)} · ${tt('rows', 'baris')}: ${esc(o.ya)}</p>`;
}
function waterfall(steps, w) {
  // steps: [{label, v, kind:'total'|'delta'}]
  const W = Math.round(w || 500), H = 230, X0 = 70, X1 = W - 10, Y0 = 16, Y1 = 180;
  let run = 0; const bars = steps.map((s) => { if (s.kind === 'total') { run = s.v; return { s, a: 0, b: s.v }; } const a = run; run += s.v; return { s, a, b: run }; });
  const lo0 = Math.min.apply(null, bars.map((b) => Math.min(b.a, b.b)).filter((v, i) => bars[i].s.kind !== 'total')), hi0 = Math.max.apply(null, bars.map((b) => Math.max(b.a, b.b)));
  const base = Math.max(0, lo0 - (hi0 - lo0) * 0.8);
  const ticks = niceTicks(base, hi0, 4), lo = ticks[0], hi = ticks[ticks.length - 1];
  const y = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0), n = steps.length, slot = (X1 - X0) / n, bw = Math.min(64, slot * 0.56);
  let g = ticks.map((t) => `<line x1="${X0}" x2="${X1}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="#EEF0F3"/><text x="${X0 - 8}" y="${(y(t) + 4).toFixed(1)}" font-size="12" fill="#5B6170" text-anchor="end">${esc(money(t))}</text>`).join('');
  bars.forEach((b, i) => {
    const cx = X0 + slot * i + slot / 2, top = y(Math.max(b.a, b.b)), bot = b.s.kind === 'total' ? Y1 : y(Math.min(b.a, b.b));
    const col = b.s.kind === 'total' ? 'var(--navy)' : b.s.v >= 0 ? 'var(--orange)' : 'var(--purple)';
    g += `<rect class="gy" x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1.5, bot - top).toFixed(1)}" rx="4" fill="${col}" style="transform-box:fill-box"${tipAttr(b.s.label, [[tt('Value', 'Nilai'), b.s.kind === 'total' ? money(b.s.v) : (b.s.v >= 0 ? '+' : '−') + money(Math.abs(b.s.v)).replace('−', '')]])}/>`;
    g += `<text x="${cx.toFixed(1)}" y="${(top - 6).toFixed(1)}" font-size="${slot < 72 ? 10.5 : 12}" font-weight="700" fill="#13405B" text-anchor="middle">${esc(b.s.kind === 'total' ? money(b.s.v) : (b.s.v >= 0 ? '+' : '−') + money(Math.abs(b.s.v)).replace('−', ''))}</text>`;
    if (i < n - 1) g += `<line x1="${(cx + bw / 2).toFixed(1)}" x2="${(cx + slot - bw / 2).toFixed(1)}" y1="${y(b.b).toFixed(1)}" y2="${y(b.b).toFixed(1)}" stroke="#9AA3B2" stroke-dasharray="3 3"/>`;
    const words = String(b.s.label).split(' '); const l1 = [], l2 = []; const lim = Math.max(8, slot / 7); words.forEach((wd) => { (!l1.length || ((l1.join(' ') + ' ' + wd).length <= lim && !l2.length) ? l1 : l2).push(wd); });
    const fs = slot < 72 ? 10 : slot < 90 ? 11 : 12;
    g += `<text x="${cx.toFixed(1)}" y="${Y1 + 18}" font-size="${fs}" fill="#374151" text-anchor="middle">${esc(l1.join(' '))}</text>${l2.length ? `<text x="${cx.toFixed(1)}" y="${Y1 + 33}" font-size="${fs}" fill="#374151" text-anchor="middle">${esc(l2.join(' '))}</text>` : ''}`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tt('Cost bridge', 'Jembatan biaya'))}">${g}</svg>`;
}
function scatter(pts, o) {
  // pts [{x, y, color, tip}]
  if (!pts.length) return empty();
  const W = Math.round(o.w || 500), H = 270, X0 = 48, X1 = W - 12, Y0 = 30, Y1 = H - 40;
  const xt = niceTicks(o.xmin, o.xmax, 5), yt = niceTicks(o.ymin, o.ymax, 6);
  const xl = xt[0], xh = xt[xt.length - 1], yl = yt[0], yh = yt[yt.length - 1];
  const x = (v) => X0 + ((v - xl) / (xh - xl)) * (X1 - X0), y = (v) => Y1 - ((v - yl) / (yh - yl)) * (Y1 - Y0);
  let g = yt.map((t) => `<line x1="${X0}" x2="${X1}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="#EEF0F3"/><text x="${X0 - 6}" y="${(y(t) + 4).toFixed(1)}" font-size="11.5" fill="#5B6170" text-anchor="end">${NF(t)}</text>`).join('');
  g += xt.map((t) => `<text x="${x(t).toFixed(1)}" y="${Y1 + 16}" font-size="11.5" fill="#5B6170" text-anchor="middle">${o.xfmt ? o.xfmt(t) : NF(t, 2)}</text>`).join('');
  if (o.vline != null) g += `<line x1="${x(o.vline)}" x2="${x(o.vline)}" y1="${Y0}" y2="${Y1}" stroke="#9AA3B2" stroke-dasharray="4 4"/>`;
  g += `<text x="${(X0 + X1) / 2}" y="${H - 6}" font-size="12" fill="#374151" text-anchor="middle">${esc(o.xlabel)}</text><text x="${X0 - 40}" y="14" font-size="12" fill="#374151">${esc(o.ylabel)}</text>`;
  g += pts.map((p) => `<circle cx="${x(clamp(p.x, xl, xh)).toFixed(1)}" cy="${y(clamp(p.y, yl, yh)).toFixed(1)}" r="3.6" fill="${p.color}" fill-opacity=".62" stroke="#fff" stroke-width=".6"${p.tip ? tipAttr(p.tip[0], p.tip[1]) : ''}/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${g}</svg>`;
}
const monLabel = (m, i) => (i === 0 || m.endsWith('-01') ? ymShort(m) : mon(m));
const M24 = () => DB.MONTHS.slice(-24);

// ------------------------------------------------------------------ company-level aggregates (no filters)
const CO = {};
function companyInit() {
  DB.MONTHS.forEach((m) => { CO[m] = { mc: 0, fte: 0, base: 0, bonus: 0, overtime: 0, training: 0, th: 0 }; });
  DB.C.forEach((c) => { const a = CO[c.month]; if (!a) return; a.mc += c.base + c.bonus + c.benefits + c.overtime + c.training + c.others; a.fte += c.fte; a.base += c.base; a.bonus += c.bonus; a.overtime += c.overtime; a.training += c.training; a.th += c.training_hours; });
}
const coSum = (ms, k) => sum(ms, (m) => CO[m][k]);
const coFte = (ms) => avg(ms, (m) => CO[m].fte);
function planHC(d) {
  const pts = DB.meta.plan_headcount; let v = pts[pts.length - 1].headcount;
  for (let i = 0; i < pts.length - 1; i++) if (d >= pts[i].date && d <= pts[i + 1].date) v = pts[i].headcount + (pts[i + 1].headcount - pts[i].headcount) * daysBetween(pts[i].date, d) / daysBetween(pts[i].date, pts[i + 1].date);
  return v;
}
const planYear = (ms) => DB.PLANS[+ms[ms.length - 1].slice(0, 4)] || DB.PLANS[+DB.LAST.slice(0, 4)];
function yearSets() {
  const ys = []; for (let y = 2023; y <= +DB.LAST_FY; y++) ys.push({ label: String(y), ms: DB.MONTHS.filter((m) => m.startsWith(String(y))), year: y });
  ys.push({ label: tt('Last 12 mo.', '12 bln terakhir'), ms: DB.MONTHS.slice(-12), year: +DB.LAST.slice(0, 4), ttm: true }); return ys;
}
const dimRows = (dim) => DB.DIMS[dim].filter((v) => !S.F[dim] || S.F[dim].has(v));
const minus1y = (d) => (+d.slice(0, 4) - 1) + d.slice(4);
const ageAt = (e, d) => Math.floor(daysBetween(e.birth_date, d) / 365.25);
const tenureY = (e, d) => daysBetween(e.hire_date, d) / 365.25;
const TEN_B = [[0, 1, '<1'], [1, 2, '1–2'], [2, 5, '2–5'], [5, 10, '5–10'], [10, 20, '10–20'], [20, 99, '20+']];
const tenLbl = (b) => b[2] + (S.lang === 'id' ? ' thn' : ' yr');
const exitRate = (ms, fn) => turnover(ms, fn).rate;

// ------------------------------------------------------------------ 1. Executive overview
function pgOverview() {
  const ms = periodMonths(), m24 = M24(), now = DB.AS_OF;
  const hc = AG.hcNow, hcYA = AG.E.reduce((n, e) => n + (active(e, minus1y(now)) ? 1 : 0), 0);
  const rev = finSum(ms, 'revenue'), fteC = coFte(ms), revEmp = annualise(rev, ms) / fteC, plan = planYear(ms), tgt = plan.rev_per_emp_target;
  const mcF = csum(ms, 'mc'), mcRev = pct(mcF, rev);
  const tv = turnover(ms), tvA = S.period === 'ytd' ? annualise(tv.rate, ms) : tv.rate;
  const filled = AG.Q.filter((q) => q.status === 'Filled' && ms.indexOf(q.closed.slice(0, 7)) > -1), ttf = filled.map((q) => daysBetween(q.opened, q.closed)).sort((a, b) => a - b);
  const ttfMed = ttf.length ? ttf[Math.floor(ttf.length / 2)] : null;
  const risk = DB.AT.rows.filter((r) => passE(DB.EMAP[r.emp_id])), hi = risk.filter((r) => r.tier === 'High');
  const d = hc - hcYA;
  const heroH = hero(tt('Active headcount', 'Headcount aktif'), cnt(hc), pill(d, (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + NF(Math.abs(d)) + tt(' vs a year ago', ' dibanding setahun lalu')),
    anyFilter() ? tt('A year ago', 'Setahun lalu') : tt('Plan for today', 'Rencana hari ini'), NF(anyFilter() ? hcYA : planHC(now)), 'headcount');
  const st = [
    stat(tt('Revenue / employee', 'Revenue / karyawan'), money(revEmp), tt('Target ', 'Target ') + money(tgt) + ' · ' + SIGN(pct(revEmp - tgt, tgt), 1, '%'), revEmp >= tgt ? 'c-green' : 'c-orange', 'revEmp'),
    stat(anyFilter() ? tt('Manpower cost, share of revenue', 'Manpower cost, porsi revenue') : tt('Manpower cost % revenue', 'Manpower cost % revenue'), cnt(mcRev, 1, '', '%'), money(mcF) + ' ' + tt('people cost', 'biaya karyawan'), '', 'mcRev'),
    stat(tt('Turnover', 'Turnover'), cnt(tvA, 1, '', '%'), NF(tv.n) + tt(' exits', ' keluar') + (S.period === 'ytd' ? tt(' · annualised', ' · setara setahun') : ''), 'c-orange', 'turnover'),
    stat(tt('Time-to-fill (median)', 'Time-to-fill (median)'), ttfMed == null ? '–' : cnt(ttfMed, 0) + ` <small>${tt('days', 'hari')}</small>`, NF(filled.length) + tt(' roles filled', ' posisi terisi'), '', 'ttf'),
  ];
  // insights
  const revG = pct(rev - finSum(priorMonths(ms), 'revenue'), finSum(priorMonths(ms), 'revenue')), fteG = pct(fteC - coFte(priorMonths(ms)), coFte(priorMonths(ms)));
  const byDept = dimRows('dept').map((g) => ({ g, r: exitRate(ms, (e) => e.dept === g), n: AG.E.filter((e) => e.dept === g && active(e, now)).length })).filter((x) => x.n >= 15 && x.r != null).sort((a, b) => b.r - a.r);
  const hiDept = {}; hi.forEach((r) => { const dp = DB.EMAP[r.emp_id].dept; hiDept[dp] = (hiDept[dp] || 0) + 1; });
  const topHi = Object.keys(hiDept).sort((a, b) => hiDept[b] - hiDept[a])[0];
  const ins = [
    [tt(`Revenue per employee is ${money(revEmp)} (${periodName()}), ${vsTarget(pct(revEmp - tgt, tgt))} for ${plan.year}. Revenue grew ${SIGN(revG, 1, '%')} while FTE grew ${SIGN(fteG, 1, '%')}.`,
      `Revenue per karyawan ${money(revEmp)} (${periodName()}), ${vsTarget(pct(revEmp - tgt, tgt))} ${plan.year}. Revenue tumbuh ${SIGN(revG, 1, '%')}, sementara FTE tumbuh ${SIGN(fteG, 1, '%')}.`),
      revEmp >= tgt ? tt('plan the number of employees to grow more slowly than revenue; add roles only where a plant is running at full capacity (such as the Plant C ramp-up).', 'rencanakan jumlah karyawan tumbuh lebih lambat dari revenue; tambah posisi hanya di pabrik yang sudah berjalan penuh (misalnya ramp-up Pabrik C).')
        : tt('review open growth requisitions against the revenue plan before approving new hires.', 'tinjau requisition pertumbuhan yang masih terbuka terhadap rencana revenue sebelum menyetujui rekrutmen baru.')],
    byDept.length ? [tt(`${lbl('dept', byDept[0].g)} has the highest turnover (${P(byDept[0].r)} vs ${P(tv.rate)} overall). The resignation-risk model flags ${NF(hi.length)} employees as being at high risk of resigning${topHi ? `, most of them in ${lbl('dept', topHi)}` : ''}.`,
      `${lbl('dept', byDept[0].g)} punya turnover tertinggi (${P(byDept[0].r)} vs ${P(tv.rate)} keseluruhan). Model risiko resign menandai ${NF(hi.length)} karyawan berisiko tinggi untuk resign${topHi ? `, terbanyak di ${lbl('dept', topHi)}` : ''}.`),
      tt('hold stay conversations with high-risk employees this quarter, starting with those paid below band midpoint.', 'lakukan stay interview dengan karyawan berisiko tinggi kuartal ini, mulai dari yang gajinya di bawah midpoint band.')] : null,
    [tt(`People cost is ${P(mcRev)} of ${anyFilter() ? 'company ' : ''}revenue. Overtime is ${P(pct(csum(ms, 'overtime'), csum(ms, 'base')))} of base pay, and peaks during plant turnarounds.`,
      `Biaya karyawan ${P(mcRev)} dari revenue${anyFilter() ? ' perusahaan' : ''}. Lembur ${P(pct(csum(ms, 'overtime'), csum(ms, 'base')))} dari gaji pokok, dan memuncak saat turnaround pabrik.`),
      tt('plan turnaround crews 3 months ahead (cross-trained operators and contractors) to cap overtime and fatigue risk.', 'rencanakan kru turnaround 3 bulan sebelumnya (operator lintas fungsi dan kontraktor) untuk menekan lembur dan risiko kelelahan.')],
  ];
  // charts
  const w2 = chartW('half');
  const planS = anyFilter() ? null : { name: tt('Plan', 'Rencana'), color: '#9AA3B2', vals: m24.map((m) => Math.round(planHC(mEnd(m)))), dash: true, w: 1.6 };
  const hcChart = lineChart({ labels: m24, w: w2, series: [{ name: tt('Headcount', 'Headcount'), color: 'var(--purple)', vals: m24.map((m) => AG.hcEnd[m]), area: 'rgba(120,71,145,.10)' }].concat(planS ? [planS] : []),
    aria: tt('Month-end headcount, last 24 months', 'Headcount akhir bulan, 24 bulan terakhir') });
  const ys = yearSets();
  const revCols = colChart(ys.map((y) => { const v = finSum(y.ms, 'revenue') / coFte(y.ms), t = DB.PLANS[y.year].rev_per_emp_target;
    return { label: y.label, v, text: money(v), color: y.ttm ? 'var(--navy)' : 'var(--purple)', tick: t, tip: [y.label, [[tt('Revenue / employee', 'Revenue / karyawan'), money(v)], [tt('Target', 'Target'), money(t)], [tt('Gap', 'Selisih'), SIGN(pct(v - t, t), 1, '%')]]] }; }), { w: w2, h: 170 });
  const tvRows = dimRows('dept').map((g) => { const t = turnover(ms, (e) => e.dept === g); return { label: lbl('dept', g), v: t.rate || 0, text: P(t.rate), sub: NF(t.n) + tt(' exits', ' keluar'), faded: (t.avg || 0) < 10, color: 'var(--orange)' }; }).sort((a, b) => b.v - a.v);
  const rollMC = DB.MONTHS.slice(11).slice(-24).map((m) => { const w = DB.MONTHS.slice(DB.MONTHS.indexOf(m) - 11, DB.MONTHS.indexOf(m) + 1); return pct(csum(w, 'mc'), finSum(w, 'revenue')); });
  const mcLine = lineChart({ labels: DB.MONTHS.slice(11).slice(-24), w: w2, series: [{ name: tt('Manpower cost % revenue (12-month rolling)', 'Manpower cost % revenue (12 bulan bergulir)'), color: 'var(--navy)', vals: rollMC }], fmt: (v) => NF(v, 1) + '%' });
  const tierRows = dimRows('dept').map((g) => { const rr = risk.filter((r) => DB.EMAP[r.emp_id].dept === g); return { label: lbl('dept', g), parts: ['Low', 'Medium', 'High'].map((t) => rr.filter((r) => r.tier === t).length), hs: rr.length ? rr.filter((r) => r.tier === 'High').length / rr.length : 0 }; }).filter((r) => sum(r.parts)).sort((a, b) => b.hs - a.hs);
  return lead(heroH, st) + sowhat(ins) +
    `<div class="grid2">${card(head2(tt('Headcount, month-end', 'Headcount akhir bulan'), tt('Last 24 months', '24 bulan terakhir'), legend([[tt('Headcount', 'Headcount'), 'var(--purple)']].concat(planS ? [[tt('Plan', 'Rencana'), '#9AA3B2', 'line']] : [])), 'headcount') + hcChart, '', 3)}
    ${card(head2(tt('Revenue per employee vs target', 'Revenue per karyawan vs target'), tt('Company level · dashed line = plan target', 'Tingkat perusahaan · garis putus = target rencana'), '', 'revEmp') + revCols, '', 4)}</div>
    <div class="grid2">${card(head2(tt('Turnover by department', 'Turnover per department'), periodRange(ms) + tt(' · faded = fewer than 10 people', ' · pudar = kurang dari 10 orang'), '', 'turnover') + hbars(tvRows), '', 5)}
    ${card(head2(tt('Manpower cost % revenue', 'Manpower cost % revenue'), tt('12-month rolling, last 24 months', '12 bulan bergulir, 24 bulan terakhir'), '', 'mcRev') + mcLine, '', 6)}</div>
    ${card(head2(tt('Who might leave: risk of resigning by department', 'Siapa yang mungkin keluar: risiko resign per department'), tt('Share of each department\'s employees the model rates at low, medium or high risk of resigning in the next 12 months (illustrative model, synthetic data)', 'Porsi karyawan tiap department yang dinilai model berisiko rendah, sedang, atau tinggi untuk resign dalam 12 bulan ke depan (model ilustratif, data sintetis)'), legend([[tt('Low risk', 'Risiko rendah'), '#D5DAE1'], [tt('Medium risk', 'Risiko sedang'), 'var(--lilac)'], [tt('High risk', 'Risiko tinggi'), 'var(--orange)']]), 'risk') + stackRows(tierRows, ['#D5DAE1', 'var(--lilac)', 'var(--orange)'], [tt('Low risk', 'Risiko rendah'), tt('Medium risk', 'Risiko sedang'), tt('High risk', 'Risiko tinggi')]), '', 7)}`;
}

// ------------------------------------------------------------------ 2. Headcount & department
function pgHeadcount() {
  const now = DB.AS_OF, act = AG.E.filter((e) => active(e, now)), hc = act.length;
  const y0 = (+now.slice(0, 4) - 1) + '-12-31', hc0 = AG.E.filter((e) => active(e, y0)).length, d = hc - hc0;
  const perm = act.filter((e) => e.etype === 'Permanent').length, fem = act.filter((e) => e.gender === 'Female').length, ten = avg(act, (e) => tenureY(e, now));
  const heroH = hero(tt('Active headcount', 'Headcount aktif'), cnt(hc), pill(d, (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + NF(Math.abs(d)) + tt(' since 1 Jan', ' sejak 1 Jan')), tt('Start of year', 'Awal tahun'), NF(hc0), 'headcount');
  const st = [
    stat(tt('Permanent', 'Tetap'), cnt(pct(perm, hc), 1, '', '%'), NF(perm) + tt(' people', ' orang'), '', null),
    stat(tt('Contract (PKWT)', 'Kontrak (PKWT)'), cnt(pct(hc - perm, hc), 1, '', '%'), NF(hc - perm) + tt(' people', ' orang'), 'c-orange', 'contractShare'),
    stat(tt('Average tenure', 'Rata-rata masa kerja'), cnt(ten, 1) + ` <small>${tt('yrs', 'thn')}</small>`, P(pct(act.filter((e) => tenureY(e, now) < 2).length, hc), 0) + tt(' under 2 years', ' di bawah 2 tahun'), '', 'tenure'),
    stat(tt('Female', 'Wanita'), cnt(pct(fem, hc), 1, '', '%'), NF(fem) + tt(' people', ' orang'), 'c-purple', 'femaleShare'),
  ];
  if (!hc) return lead(heroH, st) + empty();
  const deptNow = dimRows('dept').map((g) => ({ g, n: act.filter((e) => e.dept === g).length, n0: AG.E.filter((e) => e.dept === g && active(e, minus1y(now))).length })).sort((a, b) => b.n - a.n);
  const grow = deptNow.slice().sort((a, b) => (b.n - b.n0) - (a.n - a.n0))[0];
  const conDept = deptNow.map((x) => ({ g: x.g, n: x.n, c: act.filter((e) => e.dept === x.g && e.etype === 'Contract').length })).filter((x) => x.n >= 15).sort((a, b) => b.c / b.n - a.c / a.n)[0];
  const under2 = act.filter((e) => tenureY(e, now) < 2).length;
  const plan = planHC(now);
  const ins = [
    [tt(`Headcount is ${NF(hc)}${anyFilter() ? '' : `, ${SIGN(pct(hc - plan, plan), 1, '%')} against plan`}. ${grow && grow.n - grow.n0 > 0 ? `${lbl('dept', grow.g)} added the most people in 12 months (${SIGN(grow.n - grow.n0)}).` : ''}`,
      `Headcount ${NF(hc)}${anyFilter() ? '' : `, ${SIGN(pct(hc - plan, plan), 1, '%')} terhadap rencana`}. ${grow && grow.n - grow.n0 > 0 ? `${lbl('dept', grow.g)} paling banyak bertambah dalam 12 bulan (${SIGN(grow.n - grow.n0)}).` : ''}`),
      tt('tie the next headcount plan to output per FTE by plant, not to last year\'s budget.', 'kaitkan rencana headcount berikutnya dengan output per FTE per pabrik, bukan dengan budget tahun lalu.')],
    conDept && conDept.c ? [tt(`${lbl('dept', conDept.g)} relies most on fixed-term contracts (${P(pct(conDept.c, conDept.n))} of its people vs ${P(pct(hc - perm, hc))} overall).`,
      `${lbl('dept', conDept.g)} paling bergantung pada kontrak (${P(pct(conDept.c, conDept.n))} dari karyawannya vs ${P(pct(hc - perm, hc))} keseluruhan).`),
      tt('review which contract roles are permanent work; converting good performers lowers end-of-contract turnover.', 'tinjau posisi kontrak yang sebenarnya pekerjaan tetap; mengangkat karyawan berkinerja baik menurunkan turnover kontrak berakhir.')] : null,
    [tt(`${P(pct(under2, hc), 0)} of employees have less than 2 years of tenure, the group with the highest resignation risk.`, `${P(pct(under2, hc), 0)} karyawan bermasa kerja kurang dari 2 tahun, kelompok dengan risiko resign tertinggi.`),
      tt('assign a buddy and a 90-day plan to every new joiner in operations; track 6- and 12-month retention.', 'tetapkan buddy dan rencana 90 hari untuk setiap karyawan baru di operasi; pantau retensi bulan ke-6 dan ke-12.')],
  ];
  const wF = chartW('full'), w2 = chartW('half');
  const ms = DB.MONTHS;
  const trend = stackCols(ms.map((m, i) => { const dd = mEnd(m); const p = AG.E.filter((e) => e.etype === 'Permanent' && active(e, dd)).length, c = AG.hcEnd[m] - p;
    return { label: monLabel(m, i), parts: [p, c], tip: [ymFull(m), [[tt('Permanent', 'Tetap'), NF(p)], [tt('Contract', 'Kontrak'), NF(c)], [tt('Total', 'Total'), NF(p + c)]]] }; }), ['var(--navy)', 'var(--orange)'], { w: wF, h: 170, hideV: true });
  const deptBars = hbars(deptNow.map((x) => ({ label: lbl('dept', x.g), v: x.n, sub: P(pct(x.n, hc), 0), tip: [lbl('dept', x.g), [[tt('Active', 'Aktif'), NF(x.n)], [tt('A year ago', 'Setahun lalu'), NF(x.n0)], [tt('Change', 'Perubahan'), SIGN(x.n - x.n0)]]] })));
  const bands = colChart(dimRows('band').map((b) => { const n = act.filter((e) => e.band === b).length; return { label: lbl('band', b), v: n, color: 'var(--purple)', tip: [lbl('band', b), [[tt('People', 'Orang'), NF(n)], [tt('Share', 'Porsi'), P(pct(n, hc))]]] }; }), { w: w2, h: 170 });
  const mix = stackRows(deptNow.map((x) => ({ label: lbl('dept', x.g), parts: ['Permanent', 'Contract'].map((t) => act.filter((e) => e.dept === x.g && e.etype === t).length) })), ['var(--navy)', 'var(--orange)'], [tt('Permanent', 'Tetap'), tt('Contract', 'Kontrak')]);
  const tenC = colChart(TEN_B.map((b) => { const n = act.filter((e) => { const t = tenureY(e, now); return t >= b[0] && t < b[1]; }).length; return { label: tenLbl(b), v: n, color: b[0] < 2 ? 'var(--orange)' : 'var(--purple)', tip: [tt('Tenure ', 'Masa kerja ') + tenLbl(b), [[tt('People', 'Orang'), NF(n)], [tt('Share', 'Porsi'), P(pct(n, hc))]]] }; }), { w: w2, h: 170 });
  const locB = hbars(dimRows('loc').map((l) => { const n = act.filter((e) => e.loc === l).length; return { label: lbl('loc', l), v: n, sub: P(pct(n, hc), 0), color: 'var(--navy)' }; }).sort((a, b) => b.v - a.v));
  return lead(heroH, st) + sowhat(ins) +
    card(head2(tt('Headcount by employment type', 'Headcount per status kerja'), tt('Month-end, since January 2023', 'Akhir bulan, sejak Januari 2023'), legend([[tt('Permanent', 'Tetap'), 'var(--navy)'], [tt('Contract', 'Kontrak'), 'var(--orange)']])) + trend, '', 3) +
    `<div class="grid2">${card(head2(tt('Headcount by department', 'Headcount per department'), tt('Active today', 'Aktif hari ini')) + deptBars, '', 4)}${card(head2(tt('Employment type mix by department', 'Komposisi status kerja per department'), '', legend([[tt('Permanent', 'Tetap'), 'var(--navy)'], [tt('Contract', 'Kontrak'), 'var(--orange)']]), 'contractShare') + mix, '', 5)}</div>
    <div class="grid3">${card(head2(tt('Job band', 'Job band')) + bands, '', 6)}${card(head2(tt('Tenure', 'Masa kerja'), tt('Orange = under 2 years', 'Oranye = di bawah 2 tahun'), '', 'tenure') + tenC, '', 7)}${card(head2(tt('Location', 'Lokasi')) + locB, '', 8)}</div>`;
}

// ------------------------------------------------------------------ 3. Attrition
function pgAttrition() {
  const ms = periodMonths(), pm = priorMonths(ms), t = turnover(ms), tp = pm.length === ms.length ? turnover(pm) : null;
  const A = (v) => (S.period === 'ytd' ? annualise(v, ms) : v);
  const ex = t.ex, vol = ex.filter((e) => e.exit_reason === 'Resignation'), inv = ex.filter((e) => e.exit_reason === 'Termination'), eoc = ex.filter((e) => e.exit_reason === 'End of contract');
  const reg = vol.filter((e) => (lastRating(e.emp_id, +e.exit_date.slice(0, 4)) || 0) >= 4);
  const early = ex.filter((e) => daysBetween(e.hire_date, e.exit_date) < 365);
  const r = (n) => (t.avg ? A((100 * n) / t.avg) : null);
  const dpp = tp ? A(t.rate) - A(tp.rate) : null;
  const heroH = hero(tt('Turnover', 'Turnover') + ' · ' + periodName(), cnt(A(t.rate), 1, '', '%'), dpp == null ? '' : pill(-dpp, SIGN(dpp, 1, tt(' pts vs prior year', ' poin vs tahun sebelumnya'))), tt('Exits', 'Keluar'), NF(t.n), 'turnover');
  const st = [
    stat(tt('Resigned by choice', 'Resign (pilihan sendiri)'), cnt(r(vol.length), 1, '', '%'), NF(vol.length) + tt(' resignations', ' resign'), 'c-orange', 'voluntary'),
    stat(tt('Dismissed + contract ended', 'PHK + kontrak berakhir'), cnt(r(inv.length + eoc.length), 1, '', '%'), NF(inv.length) + tt(' terminations · ', ' PHK · ') + NF(eoc.length) + tt(' contract ends', ' kontrak'), '', 'involuntary'),
    stat(tt('Regretted', 'Regretted'), cnt(r(reg.length), 1, '', '%'), NF(reg.length) + tt(' resigned, rated 4–5', ' resign, berating 4–5'), 'c-purple', 'regretted'),
    stat(tt('Early attrition', 'Early attrition'), cnt(pct(early.length, ex.length), 1, '', '%'), tt('of leavers had worked < 1 year', 'dari yang keluar bekerja < 1 tahun'), '', 'early'),
  ];
  // insights
  const byBand = dimRows('band').map((b) => ({ b, t: turnover(ms, (e) => e.band === b) })).filter((x) => (x.t.avg || 0) >= 50 && x.t.rate != null).sort((a, b) => b.t.rate - a.t.rate);
  const compaLeft = avg(vol.filter((e) => e.compa_ratio != null), (e) => e.compa_ratio), compaStay = avg(AG.E.filter((e) => active(e, DB.AS_OF) && !e.notice_date), (e) => e.compa_ratio);
  const ins = [
    [tt(`Voluntary turnover is ${P(r(vol.length))}${S.period === 'ytd' ? ' (annualised)' : ''}; ${byBand.length ? `${lbl('band', byBand[0].b)} roles have the highest rate among large groups (${P(byBand[0].t.rate)}).` : ''} Leavers were paid on average ${P(100 * compaLeft, 0)} of the middle of their pay range, against ${P(100 * compaStay, 0)} for those who stay.`,
      `Turnover sukarela ${P(r(vol.length))}${S.period === 'ytd' ? ' (setara setahun)' : ''}; ${byBand.length ? `posisi ${lbl('band', byBand[0].b)} memiliki tingkat tertinggi di antara kelompok besar (${P(byBand[0].t.rate)}).` : ''} Gaji rata-rata yang resign adalah ${P(100 * compaLeft, 0)} dari titik tengah rentang gajinya, dibanding ${P(100 * compaStay, 0)} untuk yang bertahan.`),
      tt('check the pay of employees paid below 90% of the middle of their pay range before the April pay review.', 'tinjau gaji karyawan yang di bawah 90% titik tengah rentang gajinya sebelum penyesuaian gaji April.')],
    [tt(`${NF(reg.length)} of the people who resigned were top performers (rated 4–5), ${P(pct(reg.length, vol.length), 0)} of all resignations.`, `${NF(reg.length)} dari yang resign adalah karyawan unggul (berating 4–5), ${P(pct(reg.length, vol.length), 0)} dari semua resign.`),
      tt('make a retention plan (pay, next role, development) for every high performer with no promotion in 3 years.', 'buat rencana retensi (gaji, peran berikutnya, pengembangan) untuk setiap high performer yang belum promosi dalam 3 tahun.')],
    [tt(`${P(pct(early.length, ex.length), 0)} of leavers left within their first year.`, `${P(pct(early.length, ex.length), 0)} yang keluar pergi dalam tahun pertamanya.`),
      tt('review how new operators are welcomed and trained, and whether the job was described honestly when they were hired; ask managers why people leave in the first 90 days.', 'tinjau bagaimana operator baru disambut dan dilatih, serta apakah pekerjaannya digambarkan jujur saat direkrut; tanyakan kepada atasan mengapa orang keluar dalam 90 hari pertama.')],
  ];
  const w2 = chartW('half'), wF = chartW('full');
  const roll = DB.MONTHS.slice(11), rollV = roll.map((m) => { const i = DB.MONTHS.indexOf(m); return turnover(DB.MONTHS.slice(i - 11, i + 1)).rate; });
  const rollC = lineChart({ labels: roll, w: wF, series: [{ name: tt('Turnover, 12-month rolling', 'Turnover, 12 bulan bergulir'), color: 'var(--orange)', vals: rollV }], fmt: (v) => NF(v, 1) + '%', h: 200,
    tip: (i) => { const m = roll[i], k = DB.MONTHS.indexOf(m), w = DB.MONTHS.slice(k - 11, k + 1), tr = turnover(w); return [tt('12 months to ', '12 bulan s.d. ') + ymLabel(m), [[tt('Turnover', 'Turnover'), P(tr.rate)], [tt('Exits', 'Keluar'), NF(tr.n)], [tt('Avg headcount', 'Rata-rata headcount'), NF(tr.avg, 0)]]]; } });
  const m24 = M24();
  const reasons = ['Resignation', 'Termination', 'End of contract'];
  const exitsM = stackCols(m24.map((m, i) => { const e2 = exitsIn([m]); const parts = reasons.map((rr) => e2.filter((e) => e.exit_reason === rr).length);
    return { label: monLabel(m, i), parts, tip: [ymFull(m), reasons.map((rr, j) => [lbl('reason', rr), NF(parts[j])]).concat([[tt('Turnover (month)', 'Turnover (bulan)'), P(pct(sum(parts), AG.hcEnd[m]), 2)]])] }; }), ['var(--orange)', 'var(--navy)', 'var(--lilac)'], { w: w2, h: 170 });
  const tvRows = (dim) => dimRows(dim).map((g) => { const x = turnover(ms, (e) => e[dim] === g); return { label: lbl(dim, g), v: A(x.rate) || 0, text: P(A(x.rate)), sub: NF(x.n), faded: (x.avg || 0) < 10, color: 'var(--orange)', tip: [lbl(dim, g), [[tt('Turnover', 'Turnover'), P(A(x.rate))], [tt('Exits', 'Keluar'), NF(x.n)], [tt('Avg headcount', 'Rata-rata headcount'), NF(x.avg, 0)]]] }; }).sort((a, b) => b.v - a.v);
  const tenX = colChart(TEN_B.map((b) => { const n = ex.filter((e) => { const tq = daysBetween(e.hire_date, e.exit_date) / 365.25; return tq >= b[0] && tq < b[1]; }).length; return { label: tenLbl(b), v: n, color: 'var(--orange)', tip: [tt('Tenure at exit ', 'Masa kerja saat keluar ') + tenLbl(b), [[tt('Exits', 'Keluar'), NF(n)], [tt('Share', 'Porsi'), P(pct(n, ex.length))]]] }; }), { w: chartW('third'), h: 150 });
  const AGES = [[0, 25, '<25'], [25, 35, '25–34'], [35, 45, '35–44'], [45, 99, '45+']];
  const ageX = colChart(AGES.map((b) => { const n = ex.filter((e) => { const a = ageAt(e, e.exit_date); return a >= b[0] && a < b[1]; }).length; return { label: b[2], v: n, color: 'var(--navy)', tip: [tt('Age at exit ', 'Usia saat keluar ') + b[2], [[tt('Exits', 'Keluar'), NF(n)], [tt('Share', 'Porsi'), P(pct(n, ex.length))]]] }; }), { w: chartW('third'), h: 150 });
  return lead(heroH, st) + sowhat(ins) +
    card(head2(tt('Turnover trend', 'Tren turnover'), tt('Each point is turnover over the previous 12 months. Lower is better.', 'Tiap titik adalah turnover 12 bulan sebelumnya. Makin rendah makin baik.'), '', 'turnover') + rollC, '', 3) +
    `<div class="grid2">${card(head2(tt('Exits by reason', 'Keluar per alasan'), tt('Last 24 months', '24 bulan terakhir'), legend(reasons.map((rr, j) => [lbl('reason', rr), ['var(--orange)', 'var(--navy)', 'var(--lilac)'][j]]))) + exitsM, '', 4)}
    ${card(head2(tt('Turnover by department', 'Turnover per department'), periodRange(ms) + tt(' · faded = fewer than 10 people', ' · pudar = kurang dari 10 orang')) + hbars(tvRows('dept')), '', 5)}</div>
    <div class="grid3">${card(head2(tt('By job band', 'Per job band'), periodRange(ms)) + hbars(tvRows('band')), '', 6)}${card(head2(tt('By location', 'Per lokasi'), periodRange(ms)) + hbars(tvRows('loc')), '', 7)}
    ${card(head2(tt('Who leaves', 'Siapa yang keluar'), tt('Tenure and age at exit, ', 'Masa kerja dan usia saat keluar, ') + periodRange(ms)) + `<p class="note">${tt('Tenure at exit', 'Masa kerja saat keluar')}</p>` + tenX + `<p class="note">${tt('Age at exit', 'Usia saat keluar')}</p>` + ageX, '', 8)}</div>`;
}

// ------------------------------------------------------------------ 4. In / Out
function pgInOut() {
  let ms = periodMonths().slice(); const withMTD = S.period !== 'fy' && DB.NOW_M > DB.LAST; if (withMTD) ms.push(DB.NOW_M);
  const joins = joinsIn(ms), exits = exitsIn(ms);
  const sched = AG.E.filter((e) => e.exit_date && e.exit_date > DB.AS_OF && e.hire_date <= DB.AS_OF), upcoming = AG.E.filter((e) => e.hire_date > DB.AS_OF);
  const net = joins.length - exits.length;
  const heroH = hero(tt('Net change', 'Perubahan bersih') + ' · ' + periodName(), cnt(Math.abs(net), 0, net > 0 ? '+' : net < 0 ? '−' : ''), pill(net, NF(joins.length) + tt(' in · ', ' masuk · ') + NF(exits.length) + tt(' out', ' keluar')),
    tt('Headcount today', 'Headcount hari ini'), NF(AG.hcNow), 'net');
  const st = [
    stat(tt('Joined', 'Masuk'), cnt(joins.length), withMTD ? tt('incl. this month to date', 'termasuk bulan ini') : periodRange(), 'c-purple', null),
    stat(tt('Left', 'Keluar'), cnt(exits.length), NF(exits.filter((e) => e.exit_reason === 'Resignation').length) + tt(' resignations', ' resign'), 'c-orange', null),
    stat(tt('Scheduled exits', 'Keluar terjadwal'), cnt(sched.length), tt('notice given, still active', 'sudah resign, masih aktif'), '', null),
    stat(tt('Starting soon', 'Akan bergabung'), cnt(upcoming.length), tt('offers accepted', 'offer sudah diterima'), '', null),
  ];
  const rows = ms.map((m) => { const j = joinsIn([m]), x = exitsIn([m]); return { m, j: j.length, v: x.filter((e) => e.exit_reason === 'Resignation').length, o: x.filter((e) => e.exit_reason !== 'Resignation').length, hc: m === DB.NOW_M ? AG.hcNow : AG.hcEnd[m] }; });
  const busiest = rows.slice().sort((a, b) => (b.v + b.o) - (a.v + a.o))[0];
  const openR = AG.Q.filter((q) => q.status === 'Open').length;
  const ins = [
    [tt(`Net change is ${SIGN(net)} people ${periodName()}: ${NF(joins.length)} joined and ${NF(exits.length)} left. For every leaver, ${NF(joins.length / Math.max(1, exits.length), 2)} people joined.`,
      `Perubahan bersih ${SIGN(net)} orang ${periodName()}: ${NF(joins.length)} masuk dan ${NF(exits.length)} keluar. Untuk setiap yang keluar, ${NF(joins.length / Math.max(1, exits.length), 2)} orang masuk.`),
      tt('check that growth hires land in the plants that need capacity, and replacement hires are not delayed.', 'pastikan rekrutmen pertumbuhan masuk ke pabrik yang butuh kapasitas, dan rekrutmen pengganti tidak tertunda.')],
    busiest && busiest.v + busiest.o ? [tt(`${ymFull(busiest.m)} had the most exits (${NF(busiest.v + busiest.o)}). ${NF(sched.length)} more people have given notice and will leave soon.`,
      `${ymFull(busiest.m)} adalah bulan dengan keluar terbanyak (${NF(busiest.v + busiest.o)}). ${NF(sched.length)} orang lagi sudah mengajukan resign dan akan segera keluar.`),
      tt('start knowledge transfer for scheduled leavers in critical roles and open backfills before their last day.', 'mulai alih pengetahuan untuk yang akan keluar di posisi kritis dan buka requisition pengganti sebelum hari terakhir mereka.')] : null,
    [tt(`${NF(upcoming.length)} accepted offers are due to start, against ${NF(openR)} requisitions still open.`, `${NF(upcoming.length)} offer yang sudah diterima akan mulai bekerja, sementara ${NF(openR)} requisition masih terbuka.`),
      tt('confirm start dates, medical checks and safety induction slots for upcoming joiners.', 'konfirmasi tanggal mulai, cek kesehatan, dan jadwal induksi keselamatan untuk karyawan yang akan bergabung.')],
  ];
  const flow = flowChart(rows.map((x, i) => ({ label: monLabel(x.m, i) + (x.m === DB.NOW_M ? '*' : ''), up: x.j, d1: x.v, d2: x.o, tipT: ymFull(x.m) + (x.m === DB.NOW_M ? tt(' (to date)', ' (s.d. hari ini)') : ''),
    tip: [[tt('Joined', 'Masuk'), '+' + x.j], [tt('Resigned', 'Resign'), x.v ? '−' + x.v : '0'], [tt('Other exits', 'Keluar lainnya'), x.o ? '−' + x.o : '0'], [tt('Net', 'Bersih'), SIGN(x.j - x.v - x.o)], [tt('Headcount', 'Headcount'), NF(x.hc)]] })));
  const sel = S.io.month;
  const tbl = `<div class="tbl scrollx" role="table"><div style="min-width:330px"><div class="tr th" role="row" style="grid-template-columns:minmax(104px,1.4fr) repeat(4,minmax(46px,1fr))"><span>${tt('Month', 'Bulan')}</span><span class="num">${tt('In', 'Masuk')}</span><span class="num">${tt('Out', 'Keluar')}</span><span class="num">${tt('Net', 'Bersih')}</span><span class="num">${tt('Headcount', 'Headcount')}</span></div>
    ${rows.slice().reverse().map((x) => `<div class="tr${sel === x.m ? ' sel' : ''}" role="row" style="grid-template-columns:minmax(104px,1.4fr) repeat(4,minmax(46px,1fr))"><span><button class="monthbtn" type="button" data-act="month" data-v="${x.m}" aria-pressed="${sel === x.m}">${ymLabel(x.m)}${x.m === DB.NOW_M ? tt(' (so far)', ' (sejauh ini)') : ''}</button></span><span class="num c-purple">+${x.j}</span><span class="num c-orange">${x.v + x.o ? '−' + (x.v + x.o) : '0'}</span><span class="num">${SIGN(x.j - x.v - x.o)}</span><span class="num">${NF(x.hc)}</span></div>`).join('')}</div></div>`;
  return lead(heroH, st) + sowhat(ins) +
    card(head2(tt('Joins and exits by month', 'Masuk dan keluar per bulan'), periodRange(ms) + (withMTD ? tt(' · * = this month so far', ' · * = bulan ini sejauh ini') : ''), legend([[tt('Joined', 'Masuk'), 'var(--purple)'], [tt('Resigned', 'Resign'), 'var(--orange)'], [tt('Terminated / contract ended', 'PHK / kontrak berakhir'), 'var(--navy)']])) + flow, '', 3) +
    `<div class="grid-io">${card(head2(tt('Summary by month', 'Ringkasan per bulan'), tt('Click a month to filter the list', 'Klik bulan untuk menyaring daftar')) + tbl, '', 4)}
    ${card(`<div id="io-list">${ioList(ms, sched, upcoming)}</div>`, '', 5)}</div>`;
}
function ioList(ms, sched, upcoming) {
  const m = S.io.month, kind = S.io.kind, q = S.io.q.toLowerCase();
  const inM = (d) => d && (m === 'all' ? ms.indexOf(d.slice(0, 7)) > -1 : d.slice(0, 7) === m);
  let items = [];
  AG.E.forEach((e) => {
    if (inM(e.hire_date) && e.hire_date <= DB.AS_OF) items.push({ e, k: 'in', d: e.hire_date });
    if (e.exit_date && inM(e.exit_date) && e.exit_date <= DB.AS_OF) items.push({ e, k: 'out', d: e.exit_date });
  });
  if (m === 'all') { sched.forEach((e) => items.push({ e, k: 'sched', d: e.exit_date })); upcoming.forEach((e) => items.push({ e, k: 'up', d: e.hire_date })); }
  const counts = { all: items.length, in: 0, out: 0, sched: 0, up: 0 }; items.forEach((x) => { counts[x.k] += 1; });
  if (kind !== 'all') items = items.filter((x) => x.k === kind);
  if (q) items = items.filter((x) => [x.e.emp_id, lbl('dept', x.e.dept), lbl('loc', x.e.loc), lbl('band', x.e.band)].join(' ').toLowerCase().indexOf(q) > -1);
  items.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.e.emp_id < b.e.emp_id ? -1 : 1));
  const size = 25, pages = Math.max(1, Math.ceil(items.length / size)); let p = S.pg.io || 0; if (p >= pages) p = pages - 1; S.pg.io = p;
  const tag = (x) => x.k === 'in' ? `<span class="tag t-in">${tt('Joined', 'Masuk')}</span>` : x.k === 'up' ? `<span class="tag t-ok">${tt('Starting', 'Akan masuk')}</span>` : x.k === 'sched' ? `<span class="tag t-sched">${tt('Scheduled', 'Terjadwal')}</span>` : `<span class="tag t-out">${esc(lbl('reason', x.e.exit_reason))}</span>`;
  const gt = 'grid-template-columns:72px minmax(0,1.5fr) minmax(0,1fr) 92px 104px';
  const kinds = [['all', tt('All', 'Semua')], ['in', tt('Joined', 'Masuk')], ['out', tt('Left', 'Keluar')]].concat(m === 'all' ? [['sched', tt('Scheduled', 'Terjadwal')], ['up', tt('Starting', 'Akan masuk')]] : []);
  return `<div class="card-head"><div><h2>${tt('People who joined and left', 'Karyawan masuk dan keluar')}</h2><p class="note">${m === 'all' ? periodRange(ms) : ymFull(m)} · ${tt('anonymous IDs', 'ID anonim')}${m !== 'all' ? ` · <button class="reset" type="button" data-act="month" data-v="all" style="min-height:24px;padding:0">${tt('show all months', 'tampilkan semua bulan')}</button>` : ''}</p></div></div>
    <div class="tools"><div class="seg" role="group" aria-label="${esc(tt('Event type', 'Jenis'))}">${kinds.map((k) => `<button type="button" data-act="kind" data-v="${k[0]}" aria-pressed="${kind === k[0]}">${k[1]}<span>${NF(counts[k[0]])}</span></button>`).join('')}</div>
    <label class="search">${tt('Search', 'Cari')} <input type="search" id="q-io" value="${esc(S.io.q)}" placeholder="${esc(tt('ID, department, band', 'ID, department, band'))}" autocomplete="off"></label></div>
    <div class="tbl scrollx" id="list" role="table"><div style="min-width:470px"><div class="tr th" role="row" style="${gt}"><span>ID</span><span>${tt('Department', 'Department')}</span><span>${tt('Band', 'Band')}</span><span>${tt('Date', 'Tanggal')}</span><span>${tt('Event', 'Jenis')}</span></div>
    ${items.slice(p * size, p * size + size).map((x) => `<div class="tr" role="row" style="${gt}"><span><b>${x.e.emp_id}</b></span><span class="cell-t" title="${esc(lbl('dept', x.e.dept) + ' · ' + lbl('loc', x.e.loc))}">${esc(lbl('dept', x.e.dept))}<br><small class="note">${esc(lbl('loc', x.e.loc))} · ${esc(lbl('etype', x.e.etype))}</small></span><span class="cell-t">${esc(lbl('band', x.e.band))}</span><span>${fmtDate(x.d)}</span><span>${tag(x)}</span></div>`).join('') || `<div class="empty" style="margin:10px 0">${tt('No one matches this selection.', 'Tidak ada yang cocok dengan pilihan ini.')}</div>`}</div></div>
    <div class="pager"><span>${items.length > size ? `${NF(p * size + 1)}–${NF(Math.min(items.length, p * size + size))} ${tt('of', 'dari')} <b>${NF(items.length)}</b>` : NF(items.length) + tt(' rows', ' baris')}</span>${items.length > size ? `<div><button class="btn" type="button" data-act="pg" data-v="-1" ${p === 0 ? 'disabled' : ''}>${tt('Previous', 'Sebelumnya')}</button><button class="btn" type="button" data-act="pg" data-v="1" ${p >= pages - 1 ? 'disabled' : ''}>${tt('Next', 'Berikutnya')}</button></div>` : ''}</div>`;
}

// ------------------------------------------------------------------ 5. Productivity (company level)
function pgProductivity() {
  const ms = periodMonths(), pm = priorMonths(ms), plan = planYear(ms);
  const fte = coFte(ms), revE = annualise(finSum(ms, 'revenue'), ms) / fte, ebE = annualise(finSum(ms, 'ebitda'), ms) / fte;
  const ton = annualise(finSum(ms, 'production_kt') * 1000, ms) / fte, mc = coSum(ms, 'mc'), roi = (finSum(ms, 'ebitda') + mc) / mc, ot = pct(coSum(ms, 'overtime'), coSum(ms, 'base'));
  const tgt = plan.rev_per_emp_target, etg = plan.ebitda_per_emp_target, g = pct(revE - tgt, tgt);
  const heroH = hero(tt('Revenue per employee', 'Revenue per karyawan') + ' · ' + periodName(), money(revE), pill(g, SIGN(g, 1, '%') + tt(' vs target', ' vs target')), tt('Target ', 'Target ') + plan.year, money(tgt), 'revEmp');
  const st = [
    stat(tt('EBITDA / employee', 'EBITDA / karyawan'), money(ebE), tt('Target ', 'Target ') + money(etg) + ' · ' + SIGN(pct(ebE - etg, etg), 1, '%'), ebE >= etg ? 'c-green' : 'c-orange', 'ebitdaEmp'),
    stat(tt('Tonnes per FTE', 'Ton per FTE'), cnt(ton, 0), tt('per year', 'per tahun'), '', 'tonFte'),
    stat(tt('Human Capital ROI', 'Human Capital ROI'), cnt(roi, 2, '', '×'), tt('value per $1 of people cost', 'nilai per $1 biaya karyawan'), 'c-purple', 'hcroi'),
    stat(tt('Overtime % of base', 'Lembur % gaji pokok'), cnt(ot, 1, '', '%'), money(coSum(ms, 'overtime')), 'c-orange', 'otBase'),
  ];
  const M = DB.MONTHS, prodM = M.map((m) => DB.FINM[m].production_kt * 1000 / CO[m].fte);
  const taM = M.map((m) => DB.PROD.some((p) => p.month === m && p.turnaround === 'shutdown')), taIdx = taM.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  const normal = avg(prodM.filter((_, i) => !taM[i])), inTA = avg(prodM.filter((_, i) => taM[i]));
  const otTA = avg(M.filter((_, i) => taM[i]), (m) => pct(CO[m].overtime, CO[m].base)), otN = avg(M.filter((_, i) => !taM[i]), (m) => pct(CO[m].overtime, CO[m].base));
  const revG = pct(finSum(ms, 'revenue') - finSum(pm, 'revenue'), finSum(pm, 'revenue')), fteG = pct(fte - coFte(pm), coFte(pm));
  const ins = [
    [tt(`Revenue per employee is ${money(revE)}, ${vsTarget(g)}: revenue grew ${SIGN(revG, 1, '%')} and FTE ${SIGN(fteG, 1, '%')} on the prior year.`, `Revenue per karyawan ${money(revE)}, ${vsTarget(g)}: revenue tumbuh ${SIGN(revG, 1, '%')} dan FTE ${SIGN(fteG, 1, '%')} dibanding tahun sebelumnya.`),
      tt('use output per employee at each plant as the test before adding operating roles; part of the gain comes from prices, not from people.', 'gunakan output per karyawan di tiap pabrik sebagai syarat sebelum menambah posisi operasional; sebagian kenaikan berasal dari harga, bukan dari orang.')],
    taIdx.length ? [tt(`In turnaround months tonnes per FTE drop ${NF(Math.abs(pct(inTA - normal, normal)), 0)}% while overtime climbs to ${P(otTA)} of base pay (vs ${P(otN)} normally).`,
      `Saat bulan turnaround, ton per FTE turun ${NF(Math.abs(pct(inTA - normal, normal)), 0)}% sementara lembur naik ke ${P(otTA)} dari gaji pokok (vs ${P(otN)} biasanya).`),
      tt('staff turnarounds with a shared crew across plants and cap individual overtime hours for safety.', 'isi turnaround dengan kru bersama lintas pabrik dan batasi jam lembur per orang demi keselamatan.')] : null,
    [tt(`For every $1 spent on employees, $${NF(roi, 2)} of operating profit (before people cost) comes back.`, `Untuk setiap $1 yang dikeluarkan untuk karyawan, kembali $${NF(roi, 2)} laba operasional (sebelum biaya karyawan).`),
      tt('show this return next to the number of employees in the monthly business review, so people decisions are judged on the value they bring.', 'tampilkan imbal hasil ini di samping jumlah karyawan pada business review bulanan, agar keputusan SDM dinilai dari nilai yang dihasilkan.')],
  ];
  const w2 = chartW('half'), wF = chartW('full'), ys = yearSets();
  const perYear = (k, t) => colChart(ys.map((y) => { const v = finSum(y.ms, k) / coFte(y.ms) * (12 / y.ms.length), tg = DB.PLANS[y.year][t];
    return { label: y.label, v, text: money(v), tick: tg, color: y.ttm ? 'var(--navy)' : 'var(--purple)', tip: [y.label, [[tt('Actual', 'Aktual'), money(v)], [tt('Target', 'Target'), money(tg)], [tt('Gap', 'Selisih'), SIGN(pct(v - tg, tg), 1, '%')]]] }; }), { w: w2, h: 170 });
  const tonC = colChart(M.map((m, i) => ({ label: monLabel(m, i), v: prodM[i], text: NF(prodM[i], 0), color: taM[i] ? 'var(--orange)' : 'var(--navy)', tip: [ymFull(m), [[tt('Tonnes per FTE (month)', 'Ton per FTE (bulan)'), NF(prodM[i], 1)], [tt('Production', 'Produksi'), NF(DB.FINM[m].production_kt, 1) + ' kt'], [tt('Turnaround', 'Turnaround'), taM[i] ? tt('yes', 'ya') : tt('no', 'tidak')]]] })), { w: wF, h: 150, showV: false });
  const mct = lineChart({ labels: M, w: w2, series: [{ name: tt('Manpower cost per tonne, excl. annual bonus', 'Manpower cost per ton, tanpa bonus tahunan'), color: 'var(--purple)', vals: M.map((m) => (CO[m].mc - CO[m].bonus) / (DB.FINM[m].production_kt * 1000)) }], fmt: (v) => '$' + NF(v, 0), shade: taIdx.map((i) => ({ i })) });
  const roiC = colChart(ys.map((y) => { const mcy = coSum(y.ms, 'mc'), v = (finSum(y.ms, 'ebitda') + mcy) / mcy; return { label: y.label, v, text: NF(v, 2) + '×', color: y.ttm ? 'var(--navy)' : 'var(--purple)' }; }), { w: w2, h: 150 });
  return lead(heroH, st) + sowhat(ins) +
    `<div class="grid2">${card(head2(tt('Revenue per employee vs target', 'Revenue per karyawan vs target'), tt('Dashed line = plan target', 'Garis putus = target rencana'), '', 'revEmp') + perYear('revenue', 'rev_per_emp_target'), '', 4)}${card(head2(tt('EBITDA per employee vs target', 'EBITDA per karyawan vs target'), tt('Dashed line = plan target', 'Garis putus = target rencana'), '', 'ebitdaEmp') + perYear('ebitda', 'ebitda_per_emp_target'), '', 5)}</div>` +
    card(head2(tt('Tonnes per FTE by month', 'Ton per FTE per bulan'), tt('Orange = plant turnaround (planned maintenance shutdown)', 'Oranye = turnaround pabrik (shutdown perawatan terencana)'), legend([[tt('Normal month', 'Bulan normal'), 'var(--navy)'], [tt('Turnaround', 'Turnaround'), 'var(--orange)']]), 'tonFte') + tonC, '', 6) +
    `<div class="grid2">${card(head2(tt('Manpower cost per tonne', 'Manpower cost per ton'), tt('Excluding the March annual bonus · shaded = turnaround months', 'Tanpa bonus tahunan bulan Maret · arsir = bulan turnaround'), '', 'mcTon') + mct, '', 7)}${card(head2(tt('Human Capital ROI', 'Human Capital ROI'), tt('(EBITDA + people cost) ÷ people cost', '(EBITDA + biaya karyawan) ÷ biaya karyawan'), '', 'hcroi') + roiC, '', 8)}</div>`;
}

// ------------------------------------------------------------------ 6. Manpower cost
function genderNote() { return S.F.gender ? filtersNote(tt('Cost data is recorded by department, location, band and employment type; the gender filter does not apply to cost figures.', 'Data biaya dicatat per department, lokasi, band, dan status kerja; filter gender tidak berlaku untuk angka biaya.')) : ''; }
function pgCost() {
  const ms = periodMonths(), pm = priorMonths(ms), same = pm.length === ms.length;
  const mc = csum(ms, 'mc'), mc0 = same ? csum(pm, 'mc') : null, g = mc0 ? pct(mc - mc0, mc0) : null, fte = cavgFte(ms), cpf = annualise(mc, ms) / fte;
  const heroH = hero(tt('Manpower cost', 'Manpower cost') + ' · ' + periodName(), money(mc), g == null ? '' : pill(g, SIGN(g, 1, '%') + tt(' vs prior year', ' vs tahun sebelumnya')), tt('Cost per FTE', 'Biaya per FTE'), money(cpf), 'mc');
  const typeStat = (k, def) => { const v = csum(ms, k), v0 = same ? csum(pm, k) : null; return stat(costName(k), money(v), P(pct(v, mc), 0) + tt(' of total', ' dari total') + (v0 ? ' · ' + SIGN(pct(v - v0, v0), 1, '%') : ''), k === 'overtime' ? 'c-orange' : '', def); };
  const st = [typeStat('base'), typeStat('bonus'), typeStat('benefits'), typeStat('overtime', 'otBase')];
  const fte0 = same ? cavgFte(pm) : null, fteG = fte0 ? pct(fte - fte0, fte0) : null, cpf0 = same ? csum(pm, 'mc') / fte0 : null, cpfG = cpf0 ? pct(mc / fte - cpf0, cpf0) : null;
  const tg = COST_TYPES.map((k) => ({ k, g: same && csum(pm, k) ? pct(csum(ms, k) - csum(pm, k), csum(pm, k)) : null })).filter((x) => x.g != null).sort((a, b) => b.g - a.g);
  const depts = dimRows('dept').map((dp) => { const c = sum(ms, (m) => (AG.costDept[dp + '|' + m] || { mc: 0 }).mc), f = avg(ms, (m) => (AG.costDept[dp + '|' + m] || { fte: 0 }).fte); return { dp, c, cpf: f ? annualise(c, ms) / f : null }; }).filter((x) => x.c).sort((a, b) => b.c - a.c);
  const ins = [
    g != null ? [tt(`Manpower cost grew ${SIGN(g, 1, '%')}: ${SIGN(fteG, 1, '%')} from more FTE and ${SIGN(cpfG, 1, '%')} from a higher cost per FTE.`, `Manpower cost tumbuh ${SIGN(g, 1, '%')}: ${SIGN(fteG, 1, '%')} dari tambahan FTE dan ${SIGN(cpfG, 1, '%')} dari biaya per FTE yang lebih tinggi.`),
      tt('see Cost Analysis for the full breakdown; keep the pay-rise budget close to how much pay ranges move each year (4.5%).', 'lihat Cost Analysis untuk rinciannya; jaga budget kenaikan gaji dekat dengan pergerakan rentang gaji tiap tahun (4,5%).')] : null,
    tg.length ? [tt(`${costName(tg[0].k)} is the fastest-growing cost line (${SIGN(tg[0].g, 1, '%')}); ${costName(tg[tg.length - 1].k).toLowerCase()} grew least (${SIGN(tg[tg.length - 1].g, 1, '%')}).`, `${costName(tg[0].k)} adalah pos biaya dengan pertumbuhan tercepat (${SIGN(tg[0].g, 1, '%')}); ${costName(tg[tg.length - 1].k).toLowerCase()} tumbuh paling lambat (${SIGN(tg[tg.length - 1].g, 1, '%')}).`),
      tg[0].k === 'overtime' ? tt('set an overtime budget per plant and review weekly during turnarounds.', 'tetapkan budget lembur per pabrik dan tinjau mingguan selama turnaround.') : tt('check whether the increase is a one-off (bonus factor, turnaround) or a run-rate change before re-forecasting.', 'pastikan kenaikan itu sekali saja (faktor bonus, turnaround) atau perubahan permanen sebelum membuat forecast ulang.')] : null,
    depts.length ? [tt(`${lbl('dept', depts[0].dp)} carries ${P(pct(depts[0].c, mc), 0)} of manpower cost at ${money(depts[0].cpf)} per FTE.`, `${lbl('dept', depts[0].dp)} menanggung ${P(pct(depts[0].c, mc), 0)} manpower cost dengan ${money(depts[0].cpf)} per FTE.`),
      tt('benchmark cost per FTE by department against role mix before setting next year\'s budget.', 'bandingkan biaya per FTE per department dengan komposisi posisinya sebelum menyusun budget tahun depan.')] : null,
  ];
  const wF = chartW('full'), w2 = chartW('half'), M = DB.MONTHS;
  const monthly = stackCols(M.map((m, i) => ({ label: monLabel(m, i), parts: COST_TYPES.map((k) => AG.cost[m][k]), tip: [ymFull(m), COST_TYPES.map((k) => [costName(k), money(AG.cost[m][k])]).concat([[tt('Total', 'Total'), money(AG.cost[m].mc)]])] })), COST_TYPES.map((k) => COST_COL[k]), { w: wF, h: 190, hideV: true });
  const ys = yearSets().filter((y) => !y.ttm); const ytd = periodMonths('ytd'); if (ytd.length < 12) ys.push({ label: tt(DB.LAST.slice(0, 4) + ' so far', DB.LAST.slice(0, 4) + ' sejauh ini'), ms: ytd });
  const annual = stackCols(ys.map((y) => ({ label: y.label, parts: COST_TYPES.map((k) => csum(y.ms, k)), tip: [y.label, COST_TYPES.map((k) => [costName(k), money(csum(y.ms, k))]).concat([[tt('Total', 'Total'), money(csum(y.ms, 'mc'))]])] })), COST_TYPES.map((k) => COST_COL[k]), { w: w2, h: 170, fmtT: (v) => money(v) });
  const yoy = same ? divBars(COST_TYPES.map((k) => { const v = csum(ms, k), v0 = csum(pm, k), gg = v0 ? pct(v - v0, v0) : 0; return { label: costName(k), v: gg, text: SIGN(gg, 1, '%'), color: COST_COL[k], tip: [costName(k), [[periodName(), money(v)], [tt('Prior year', 'Tahun sebelumnya'), money(v0)]]] }; }), { max: 25 }) : empty(tt('No prior-year period in the data window.', 'Periode tahun sebelumnya belum ada di rentang data.'));
  const deptB = hbars(depts.map((x) => ({ label: lbl('dept', x.dp), v: x.c, text: money(x.c), sub: money(x.cpf) + tt(' per employee', ' per karyawan'), color: 'var(--navy)' })));
  return lead(heroH, st) + sowhat(ins) + genderNote() +
    card(head2(tt('Manpower cost by month and type', 'Manpower cost per bulan dan jenis'), tt('The yearly bonus is paid in March; pay rises start in April', 'Bonus tahunan dibayar Maret; kenaikan gaji mulai April'), legend(COST_TYPES.map((k) => [costName(k), COST_COL[k]])), 'mc') + monthly, '', 4) +
    `<div class="grid2">${card(head2(tt('Manpower cost by year', 'Manpower cost per tahun'), tt('Stacked by type', 'Bertumpuk per jenis')) + annual, '', 5)}${card(head2(tt('Growth by cost type', 'Pertumbuhan per jenis biaya'), periodRange(ms) + tt(' vs same months a year earlier', ' vs bulan yang sama setahun sebelumnya')) + yoy, '', 6)}</div>` +
    card(head2(tt('Manpower cost by department', 'Manpower cost per department'), periodRange(ms) + tt(' · cost per FTE annualised', ' · biaya per FTE disetahunkan'), '', 'cpf') + deptB, '', 7);
}

// ------------------------------------------------------------------ 7. Cost ratios
function pgRatios() {
  const ms = periodMonths(), pm = priorMonths(ms), same = pm.length === ms.length;
  const mc = csum(ms, 'mc'), rev = finSum(ms, 'revenue'), eb = finSum(ms, 'ebitda'), r1 = pct(mc, rev), r0 = same ? pct(csum(pm, 'mc'), finSum(pm, 'revenue')) : null;
  const cpf = annualise(mc, ms) / cavgFte(ms), cpf0 = same ? csum(pm, 'mc') / cavgFte(pm) : null;
  const heroH = hero((anyFilter() ? tt('Manpower cost, share of revenue', 'Manpower cost, porsi revenue') : tt('Manpower cost % revenue', 'Manpower cost % revenue')) + ' · ' + periodName(), cnt(r1, 2, '', '%'), r0 == null ? '' : pill(-(r1 - r0), SIGN(r1 - r0, 2, tt(' pts vs prior year', ' poin vs tahun sebelumnya'))), tt('Prior year', 'Tahun sebelumnya'), r0 == null ? '–' : P(r0, 2), 'mcRev');
  const mcG = same ? pct(mc - csum(pm, 'mc'), csum(pm, 'mc')) : null, revG = same ? pct(rev - finSum(pm, 'revenue'), finSum(pm, 'revenue')) : null;
  const st = [
    stat(tt('Cost per FTE', 'Biaya per FTE'), money(cpf), cpf0 ? SIGN(pct(cpf - cpf0, cpf0), 1, '%') + tt(' vs prior year', ' vs tahun sebelumnya') : '', '', 'cpf'),
    stat(tt('Manpower cost % EBITDA', 'Manpower cost % EBITDA'), cnt(pct(mc, eb), 1, '', '%'), tt('EBITDA ', 'EBITDA ') + money(eb), '', 'mcEbitda'),
    stat(tt('Revenue per $1 of people cost', 'Revenue per $1 biaya karyawan'), cnt(rev / mc, 1, '$'), '', 'c-purple', 'mcRev'),
    stat(tt('Cost growth vs revenue growth', 'Pertumbuhan biaya vs revenue'), mcG == null ? '–' : SIGN(mcG - revG, 1, tt(' pts', ' poin')), mcG == null ? '' : tt('cost ', 'biaya ') + SIGN(mcG, 1, '%') + ' · revenue ' + SIGN(revG, 1, '%'), mcG != null && mcG > revG ? 'c-orange' : 'c-green', null),
  ];
  const depts = dimRows('dept').map((dp) => { const c = sum(ms, (m) => (AG.costDept[dp + '|' + m] || { mc: 0 }).mc), f = avg(ms, (m) => (AG.costDept[dp + '|' + m] || { fte: 0 }).fte); return { dp, cpf: f ? annualise(c, ms) / f : 0 }; }).filter((x) => x.cpf).sort((a, b) => b.cpf - a.cpf);
  const ins = [
    r0 != null ? [tt(`People cost ${r1 < r0 ? 'fell' : 'rose'} from ${P(r0, 2)} to ${P(r1, 2)} of revenue because cost grew ${SIGN(mcG, 1, '%')} and revenue ${SIGN(revG, 1, '%')}.`, `Biaya karyawan ${r1 < r0 ? 'turun' : 'naik'} dari ${P(r0, 2)} menjadi ${P(r1, 2)} dari revenue karena biaya tumbuh ${SIGN(mcG, 1, '%')} dan revenue ${SIGN(revG, 1, '%')}.`),
      tt('in a price-driven upswing, lock in efficiency rather than adding permanent cost that stays when prices fall.', 'saat kenaikan didorong harga, kunci efisiensi daripada menambah biaya tetap yang akan tertinggal saat harga turun.')] : null,
    [tt(`Cost per FTE is ${money(cpf)}${cpf0 ? `, ${SIGN(pct(cpf - cpf0, cpf0), 1, '%')} on the prior year` : ''}, above the 4.5% yearly rise in pay ranges once promotions and bonuses are added.`, `Biaya per FTE ${money(cpf)}${cpf0 ? `, ${SIGN(pct(cpf - cpf0, cpf0), 1, '%')} dibanding tahun sebelumnya` : ''}, di atas kenaikan rentang gaji 4,5% per tahun setelah promosi dan bonus ditambahkan.`),
      tt('track cost per employee by job level, to tell pay rises apart from having more senior roles.', 'pantau biaya per karyawan per level jabatan, untuk membedakan kenaikan gaji dari bertambahnya posisi senior.')],
    depts.length > 1 ? [tt(`${lbl('dept', depts[0].dp)} has the highest cost per FTE (${money(depts[0].cpf)}), ${lbl('dept', depts[depts.length - 1].dp)} the lowest (${money(depts[depts.length - 1].cpf)}).`, `${lbl('dept', depts[0].dp)} memiliki biaya per FTE tertinggi (${money(depts[0].cpf)}), ${lbl('dept', depts[depts.length - 1].dp)} terendah (${money(depts[depts.length - 1].cpf)}).`),
      tt('the gap mostly reflects the mix of roles (managers vs operators); compare within the same job level before acting.', 'selisih ini terutama mencerminkan komposisi posisi (manajer vs operator); bandingkan dalam level jabatan yang sama sebelum bertindak.')] : null,
  ];
  const w2 = chartW('half'), wF = chartW('full'), roll = DB.MONTHS.slice(11);
  const line = lineChart({ labels: roll, w: wF, series: [{ name: tt('Manpower cost % revenue, 12-month rolling', 'Manpower cost % revenue, 12 bulan bergulir'), color: 'var(--navy)', vals: roll.map((m) => { const k = DB.MONTHS.indexOf(m), w = DB.MONTHS.slice(k - 11, k + 1); return pct(csum(w, 'mc'), finSum(w, 'revenue')); }), area: 'rgba(19,64,91,.07)' }], fmt: (v) => NF(v, 1) + '%', h: 200 });
  const ys = yearSets();
  const cpfC = colChart(ys.map((y) => { const v = csum(y.ms, 'mc') / cavgFte(y.ms) * (12 / y.ms.length); return { label: y.label, v, text: money(v), color: y.ttm ? 'var(--navy)' : 'var(--purple)' }; }), { w: w2, h: 160 });
  const ebC = colChart(ys.map((y) => { const v = pct(csum(y.ms, 'mc'), finSum(y.ms, 'ebitda')); return { label: y.label, v, text: P(v, 0), color: y.ttm ? 'var(--navy)' : 'var(--purple)' }; }), { w: w2, h: 160 });
  const coAvg = annualise(coSum(ms, 'mc'), ms) / coFte(ms);
  const deptB = hbars(depts.map((x) => ({ label: lbl('dept', x.dp), v: x.cpf, text: money(x.cpf), mk: coAvg, color: 'var(--purple)' })));
  return lead(heroH, st) + sowhat(ins) + genderNote() +
    card(head2(tt('Manpower cost as a share of revenue', 'Manpower cost sebagai porsi revenue'), tt('12-month rolling', '12 bulan bergulir'), '', 'mcRev') + line, '', 4) +
    `<div class="grid3">${card(head2(tt('Cost per FTE', 'Biaya per FTE'), tt('Annualised', 'Disetahunkan'), '', 'cpf') + cpfC, '', 5)}${card(head2(tt('Manpower cost % EBITDA', 'Manpower cost % EBITDA'), '', '', 'mcEbitda') + ebC, '', 6)}${card(head2(tt('Cost per FTE by department', 'Biaya per FTE per department'), tt('Line = company average', 'Garis = rata-rata perusahaan')) + deptB, '', 7)}</div>`;
}

// ------------------------------------------------------------------ 8. Cost analysis
function pgAnalysis() {
  const ms = periodMonths(), pm = priorMonths(ms);
  const yr = DB.LAST.slice(0, 4), ytd = DB.MONTHS.filter((m) => m.startsWith(yr));
  const deptOK = (dp) => !S.F.dept || S.F.dept.has(dp);
  const bud = {}, act = {};
  DB.B.forEach((b) => { if (b.month.startsWith(yr) && b.month <= DB.LAST && deptOK(b.dept)) bud[b.dept] = (bud[b.dept] || 0) + b.budget_cost; });
  DB.C.forEach((c) => { if (c.month.startsWith(yr) && deptOK(c.dept)) act[c.dept] = (act[c.dept] || 0) + c.base + c.bonus + c.benefits + c.overtime + c.training + c.others; });
  const bT = sum(Object.values(bud)), aT = sum(Object.values(act)), bv = pct(aT - bT, bT), over = Object.keys(bud).filter((d) => act[d] > bud[d]).length;
  const otherF = S.F.loc || S.F.band || S.F.etype || S.F.gender;
  if (pm.length !== ms.length) {
    return lead(hero(tt('Change in manpower cost', 'Perubahan manpower cost'), '–', '', '', ''), [stat(tt('Budget variance YTD', 'Selisih budget YTD'), P(bv), '', '', 'budgetVar')]) + empty(tt('The bridge needs the same months a year earlier, which are before the data window. Choose another period.', 'Jembatan biaya membutuhkan bulan yang sama setahun sebelumnya, yang berada di luar rentang data. Pilih periode lain.'));
  }
  const mc1 = csum(ms, 'mc'), mc0 = csum(pm, 'mc'), f1 = cavgFte(ms), f0 = cavgFte(pm), c1 = mc1 / f1, c0 = mc0 / f0;
  const hcE = (f1 - f0) * c0, rtE = (c1 - c0) * f1, dmc = mc1 - mc0;
  const heroH = hero(tt('Change in manpower cost', 'Perubahan manpower cost') + ' · ' + periodName(), (dmc >= 0 ? '+' : '−') + money(Math.abs(dmc)).replace('−', ''), pill(dmc, SIGN(pct(dmc, mc0), 1, '%') + tt(' vs prior year', ' vs tahun sebelumnya')), periodLabel(), money(mc1), 'bridge');
  const st = [
    stat(tt('Headcount effect', 'Efek headcount'), (hcE >= 0 ? '+' : '−') + money(Math.abs(hcE)).replace('−', ''), P(pct(hcE, dmc), 0) + tt(' of the change', ' dari perubahan'), '', 'bridge'),
    stat(tt('Rate effect', 'Efek tarif'), (rtE >= 0 ? '+' : '−') + money(Math.abs(rtE)).replace('−', ''), P(pct(rtE, dmc), 0) + tt(' of the change', ' dari perubahan'), 'c-orange', 'bridge'),
    stat(tt('Budget variance YTD ', 'Selisih budget YTD ') + yr, cnt(Math.abs(bv), 1, bv > 0 ? '+' : bv < 0 ? '−' : '', '%'), money(aT) + tt(' vs ', ' vs ') + money(bT), bv > 0 ? 'c-orange' : 'c-green', 'budgetVar'),
    stat(tt('Departments over budget', 'Department di atas budget'), cnt(over), tt('of ', 'dari ') + Object.keys(bud).length, '', 'budgetVar'),
  ];
  const deptBr = dimRows('dept').map((dp) => { const g = (ms2, k) => sum(ms2, (m) => (AG.costDept[dp + '|' + m] || {})[k] || 0); const a1 = g(ms, 'mc'), a0 = g(pm, 'mc'), q1 = avg(ms, (m) => (AG.costDept[dp + '|' + m] || { fte: 0 }).fte), q0 = avg(pm, (m) => (AG.costDept[dp + '|' + m] || { fte: 0 }).fte);
    if (!q0 || !q1) return null; const cc0 = a0 / q0, cc1 = a1 / q1; return { dp, h: (q1 - q0) * cc0, r: (cc1 - cc0) * q1, t: a1 - a0 }; }).filter(Boolean).sort((a, b) => b.t - a.t);
  const vars = Object.keys(bud).map((d) => ({ d, v: pct(act[d] - bud[d], bud[d]) })).sort((a, b) => b.v - a.v);
  const ins = [
    [tt(`Manpower cost rose ${money(Math.abs(dmc))} (${SIGN(pct(dmc, mc0), 1, '%')}): ${P(pct(rtE, dmc), 0)} came from a higher cost per FTE and ${P(pct(hcE, dmc), 0)} from more FTE.`, `Manpower cost naik ${money(Math.abs(dmc))} (${SIGN(pct(dmc, mc0), 1, '%')}): ${P(pct(rtE, dmc), 0)} dari biaya per FTE yang lebih tinggi dan ${P(pct(hcE, dmc), 0)} dari tambahan FTE.`),
      rtE > hcE ? tt('higher cost per person dominates, so the lever is pay policy (yearly pay rises, promotions, overtime), not hiring.', 'kenaikan biaya per orang dominan, jadi pengungkitnya adalah kebijakan gaji (kenaikan gaji tahunan, promosi, lembur), bukan rekrutmen.') : tt('having more people dominates, so the lever is the hiring plan and managing vacancies.', 'bertambahnya orang dominan, jadi pengungkitnya adalah rencana rekrutmen dan pengelolaan lowongan.')],
    vars.length ? [tt(`Year to date, ${lbl('dept', vars[0].d)} is ${SIGN(vars[0].v, 1, '%')} against budget; ${NF(over)} of ${Object.keys(bud).length} departments are over.`, `Sejak awal tahun, ${lbl('dept', vars[0].d)} ${SIGN(vars[0].v, 1, '%')} terhadap budget; ${NF(over)} dari ${Object.keys(bud).length} department di atas budget.`),
      tt('ask the departments furthest over budget what will keep driving their cost (overtime, unplanned hires) before the next forecast.', 'minta department dengan selisih terbesar menjelaskan apa yang akan terus mendorong biayanya (lembur, rekrutmen di luar rencana) sebelum forecast berikutnya.')] : null,
    deptBr.length ? [tt(`${lbl('dept', deptBr[0].dp)} added the most cost (${money(deptBr[0].t)}), mainly through ${deptBr[0].r > deptBr[0].h ? 'cost per FTE' : 'more FTE'}.`, `${lbl('dept', deptBr[0].dp)} menambah biaya terbesar (${money(deptBr[0].t)}), terutama lewat ${deptBr[0].r > deptBr[0].h ? 'biaya per FTE' : 'tambahan FTE'}.`),
      tt('review its promotion and overtime decisions against plan.', 'tinjau keputusan promosi dan lemburnya terhadap rencana.')] : null,
  ];
  const w2 = chartW('half');
  const wf = waterfall([{ label: tt('Prior year', 'Tahun sebelumnya'), v: mc0, kind: 'total' }, { label: tt('Headcount effect', 'Efek headcount'), v: hcE }, { label: tt('Rate effect', 'Efek tarif'), v: rtE }, { label: periodLabel(), v: mc1, kind: 'total' }], w2);
  const gt = 'grid-template-columns:minmax(0,1.6fr) repeat(3,minmax(70px,1fr))';
  const tbl = `<div class="tbl scrollx"><div style="min-width:400px"><div class="tr th" style="${gt}"><span>${tt('Department', 'Department')}</span><span class="num">${tt('More people', 'Orang bertambah')}</span><span class="num">${tt('Higher cost per person', 'Biaya per orang naik')}</span><span class="num">${tt('Total', 'Total')}</span></div>${deptBr.map((x) => `<div class="tr" style="${gt}"><span class="cell-t">${esc(lbl('dept', x.dp))}</span><span class="num">${(x.h >= 0 ? '+' : '−') + money(Math.abs(x.h)).replace('−', '')}</span><span class="num">${(x.r >= 0 ? '+' : '−') + money(Math.abs(x.r)).replace('−', '')}</span><span class="num"><b>${(x.t >= 0 ? '+' : '−') + money(Math.abs(x.t)).replace('−', '')}</b></span></div>`).join('')}</div></div>`;
  const budB = hbars(Object.keys(bud).map((d) => ({ label: lbl('dept', d), v: act[d], text: money(act[d]), mk: bud[d], sub: SIGN(pct(act[d] - bud[d], bud[d]), 1, '%'), color: act[d] > bud[d] ? 'var(--orange)' : 'var(--purple)', tip: [lbl('dept', d), [[tt('Actual YTD', 'Aktual YTD'), money(act[d])], [tt('Budget YTD', 'Budget YTD'), money(bud[d])], [tt('Variance', 'Selisih'), SIGN(pct(act[d] - bud[d], bud[d]), 1, '%')]]] })).sort((a, b) => b.v - a.v));
  let ca = 0, cb = 0; const cumA = [], cumB = [];
  ytd.forEach((m) => { DB.C.forEach((c) => { if (c.month === m && deptOK(c.dept)) ca += c.base + c.bonus + c.benefits + c.overtime + c.training + c.others; }); DB.B.forEach((b) => { if (b.month === m && deptOK(b.dept)) cb += b.budget_cost; }); cumA.push(ca); cumB.push(cb); });
  const mv = ytd.map((m, i) => { const a1 = cumA[i] - (i ? cumA[i - 1] : 0), b1 = cumB[i] - (i ? cumB[i - 1] : 0); return { label: ymLabel(m), v: pct(a1 - b1, b1), text: SIGN(pct(a1 - b1, b1), 1, '%'), tip: [ymFull(m), [[tt('Actual', 'Aktual'), money(a1)], [tt('Budget', 'Budget'), money(b1)], [tt('Cumulative variance', 'Selisih kumulatif'), SIGN(pct(cumA[i] - cumB[i], cumB[i]), 1, '%')]]] }; });
  const cum = divBars(mv, { max: Math.max(10, maxOf(mv, (x) => Math.abs(x.v))) });
  return lead(heroH, st) + sowhat(ins) + (otherF ? filtersNote(tt('Budgets are set by department, so the budget cards use the department filter only.', 'Budget disusun per department, jadi kartu budget hanya memakai filter department.')) : '') +
    `<div class="grid2">${card(head2(tt('What changed the cost', 'Apa yang mengubah biaya'), tt('Start: cost a year earlier. Add the cost of more people, add the cost of higher pay per person. End: cost now. ', 'Awal: biaya setahun sebelumnya. Tambah biaya karena orang bertambah, tambah biaya karena biaya per orang naik. Akhir: biaya sekarang. ') + periodRange(pm) + ' → ' + periodRange(ms), legend([[tt('Total', 'Total'), 'var(--navy)'], [tt('Increase', 'Kenaikan'), 'var(--orange)'], [tt('Decrease', 'Penurunan'), 'var(--purple)']]), 'bridge') + wf, '', 4)}${card(head2(tt('Change by department', 'Perubahan per department'), tt('More people + higher cost per person = total change', 'Orang bertambah + biaya per orang naik = total perubahan'), '', 'bridge') + tbl, '', 5)}</div>
    <div class="grid2">${card(head2(tt('Actual vs budget by department', 'Aktual vs budget per department'), 'YTD ' + yr + tt(' · line = budget', ' · garis = budget'), legend([[tt('Over budget', 'Di atas budget'), 'var(--orange)'], [tt('Within budget', 'Dalam budget'), 'var(--purple)']]), 'budgetVar') + budB, '', 6)}${card(head2(tt('Variance vs budget by month', 'Selisih terhadap budget per bulan'), 'YTD ' + yr + tt(' · orange = over budget', ' · oranye = di atas budget'), '', 'budgetVar') + cum, '', 7)}</div>`;
}

// ------------------------------------------------------------------ 9. Talent acquisition
const STAGES = () => [['applicants', tt('Applicants', 'Pelamar')], ['screened', tt('Screened', 'Lolos berkas')], ['interviewed', tt('Interviewed', 'Wawancara')], ['offers', tt('Offered', 'Offer')], ['accepted', tt('Hired', 'Diterima')]];
const reqCost = (q) => q.cost_ads + q.cost_agency + q.cost_referral + q.cost_recruiter + q.cost_assessment;
function qohCohort() {
  const hi = minus1y(DB.AS_OF), lo = minus1y(hi);
  const rows = AG.E.filter((e) => e.hire_source && e.hire_source !== 'Internal' && e.hire_date > lo && e.hire_date <= hi).map((e) => {
    const yrs = DB.YMAP[e.emp_id] || {}, hy = +e.hire_date.slice(0, 4), r = (yrs[hy] && yrs[hy].final_rating) || (yrs[hy + 1] && yrs[hy + 1].final_rating) || null;
    const ret = !e.exit_date || daysBetween(e.hire_date, e.exit_date) >= 365; const rr = r == null ? (ret ? null : 2) : r;
    return rr == null ? null : { e, q: 50 * rr / 5 + 50 * (ret ? 1 : 0), ret };
  }).filter(Boolean);
  return { rows, lo, hi };
}
function pgTA() {
  const ms = periodMonths(), pm = priorMonths(ms), inP = (q, m2) => q.status === 'Filled' && m2.indexOf(q.closed.slice(0, 7)) > -1;
  const filled = AG.Q.filter((q) => inP(q, ms)), f0 = pm.length === ms.length ? AG.Q.filter((q) => inP(q, pm)).length : null, open = AG.Q.filter((q) => q.status === 'Open');
  const ttf = filled.map((q) => daysBetween(q.opened, q.closed)).sort((a, b) => a - b), med = ttf.length ? ttf[Math.floor(ttf.length / 2)] : null;
  const offers = sum(filled, (q) => q.offers), cph = filled.length ? sum(AG.Q.filter((q) => q.closed && ms.indexOf(q.closed.slice(0, 7)) > -1), reqCost) / filled.length : null;
  const QH = qohCohort(), qoh = avg(QH.rows, (x) => x.q);
  const heroH = hero(tt('Hires', 'Hire') + ' · ' + periodName(), cnt(filled.length), f0 ? pill(filled.length - f0, SIGN(pct(filled.length - f0, f0), 0, '%') + tt(' vs prior year', ' vs tahun sebelumnya')) : '', tt('Open requisitions', 'Requisition terbuka'), NF(open.length), 'hires');
  const st = [
    stat(tt('Time-to-fill (median)', 'Time-to-fill (median)'), med == null ? '–' : cnt(med) + ` <small>${tt('days', 'hari')}</small>`, tt('mean ', 'rata-rata ') + NF(avg(ttf), 1) + tt(' days', ' hari'), '', 'ttf'),
    stat(tt('Offer acceptance', 'Penerimaan offer'), cnt(pct(filled.length, offers), 1, '', '%'), NF(offers) + tt(' offers made', ' offer diberikan'), 'c-purple', 'oar'),
    stat(tt('Cost-per-hire', 'Cost-per-hire'), money(cph), money(cph * filled.length) + tt(' recruiting spend', ' biaya rekrutmen'), '', 'cph'),
    stat(tt('Quality of hire', 'Quality of hire'), cnt(qoh, 0) + ' <small>/100</small>', tt('hires ', 'hire ') + fmtDate(QH.lo) + ' – ' + fmtDate(QH.hi), 'c-green', 'qoh'),
  ];
  const ext = filled.filter((q) => !q.internal);
  const stages = STAGES().map((s) => ({ label: s[1], v: sum(ext, (q) => q[s[0]]) }));
  const srcs = DB.meta.dims.sources.map((s) => { const f = filled.filter((q) => q.source === s), all = AG.Q.filter((q) => q.source === s && q.closed && ms.indexOf(q.closed.slice(0, 7)) > -1), qq = QH.rows.filter((x) => x.e.hire_source === s);
    return { s, n: f.length, conv: pct(f.length, sum(f, (q) => q.applicants)), ttf: avg(f, (q) => daysBetween(q.opened, q.closed)), cph: f.length ? sum(all, reqCost) / f.length : null, qoh: qq.length >= 5 ? avg(qq, (x) => x.q) : null, nq: qq.length }; }).filter((x) => x.n);
  const bestQ = srcs.filter((x) => x.qoh != null && x.s !== 'Internal').sort((a, b) => b.qoh - a.qoh)[0], costly = srcs.filter((x) => x.s !== 'Internal').sort((a, b) => b.cph - a.cph)[0];
  const bandT = dimRows('band').map((b) => { const f = filled.filter((q) => q.band === b); return { b, n: f.length, t: avg(f, (q) => daysBetween(q.opened, q.closed)) }; }).filter((x) => x.n);
  const slow = bandT.filter((x) => x.n >= 8).sort((a, b) => b.t - a.t)[0], aged = open.filter((q) => daysBetween(q.opened, DB.AS_OF) > 60);
  const ins = [
    slow ? [tt(`${lbl('band', slow.b)} roles take longest to fill (${NF(slow.t, 0)} days on average vs ${NF(avg(ttf), 0)} overall).`, `Posisi ${lbl('band', slow.b)} paling lama terisi (rata-rata ${NF(slow.t, 0)} hari vs ${NF(avg(ttf), 0)} keseluruhan).`),
      tt('keep a ready list of candidates and named internal backups for senior and hard-to-find technical roles, instead of starting each search from zero.', 'siapkan daftar kandidat dan pengganti internal untuk posisi senior dan teknis yang sulit dicari, alih-alih memulai pencarian dari nol.')] : null,
    bestQ && costly ? [tt(`${lbl('source', bestQ.s)} hires score the highest quality of hire (${NF(bestQ.qoh, 0)}); ${lbl('source', costly.s)} is the most expensive channel (${money(costly.cph)} per hire).`, `Hire dari ${lbl('source', bestQ.s)} memiliki quality of hire tertinggi (${NF(bestQ.qoh, 0)}); ${lbl('source', costly.s)} adalah kanal termahal (${money(costly.cph)} per hire).`),
      tt('shift budget toward referrals (raise the bonus for hard-to-fill plant roles) and reserve agencies for senior searches.', 'alihkan budget ke referensi (naikkan bonus untuk posisi pabrik yang sulit diisi) dan gunakan agensi hanya untuk pencarian senior.')] : null,
    [tt(`${NF(open.length)} jobs are still unfilled; ${NF(aged.length)} have been open for more than 60 days.`, `${NF(open.length)} lowongan masih kosong; ${NF(aged.length)} sudah terbuka lebih dari 60 hari.`),
      aged.length ? tt('review the oldest open jobs weekly with hiring managers: change the job, raise the pay offered, or close it.', 'tinjau lowongan terlama tiap minggu bersama manajer perekrut: ubah isi pekerjaan, naikkan gaji yang ditawarkan, atau tutup.') : tt('keep the weekly review of open jobs so none of them goes stale.', 'pertahankan tinjauan mingguan lowongan terbuka agar tidak ada yang berlarut-larut.')],
  ];
  const w2 = chartW('half'), m24 = M24();
  const ttfM = colChart(m24.map((m, i) => { const f = AG.Q.filter((q) => q.status === 'Filled' && q.closed.slice(0, 7) === m), t = f.map((q) => daysBetween(q.opened, q.closed)).sort((a, b) => a - b), md = t.length ? t[Math.floor(t.length / 2)] : 0;
    return { label: monLabel(m, i), v: md, color: 'var(--purple)', tip: [ymFull(m), [[tt('Median time-to-fill', 'Median time-to-fill'), NF(md) + tt(' days', ' hari')], [tt('Roles filled', 'Posisi terisi'), NF(f.length)]]] }; }), { w: w2, h: 160, showV: false });
  const bandB = hbars(bandT.map((x) => ({ label: lbl('band', x.b), v: x.t, text: NF(x.t, 0) + tt(' days', ' hari'), sub: NF(x.n) + tt(' filled', ' terisi'), color: 'var(--navy)' })));
  const gt = 'grid-template-columns:minmax(0,1.3fr) repeat(5,minmax(58px,1fr))';
  const tbl = `<div class="tbl scrollx"><div style="min-width:520px"><div class="tr th" style="${gt}"><span>${tt('Source', 'Sumber')}</span><span class="num">${tt('Hires', 'Hire')}</span><span class="num">${tt('Appl. → hire', 'Pelamar → hire')}</span><span class="num">${tt('Time-to-fill', 'Time-to-fill')}</span><span class="num">${tt('Cost/hire', 'Biaya/hire')}</span><span class="num">${tt('Quality', 'Kualitas')}</span></div>
    ${srcs.sort((a, b) => b.n - a.n).map((x) => `<div class="tr" style="${gt}"><span><b>${esc(lbl('source', x.s))}</b></span><span class="num">${NF(x.n)} <small class="note">${P(pct(x.n, filled.length), 0)}</small></span><span class="num">${x.s === 'Internal' ? '–' : P(x.conv, 1)}</span><span class="num">${NF(x.ttf, 0)} ${tt('d', 'hr')}</span><span class="num">${money(x.cph)}</span><span class="num">${x.qoh == null ? '–' : `<b class="${bestQ && x.s === bestQ.s ? 'c-green' : ''}">${NF(x.qoh, 0)}</b>`}</span></div>`).join('')}</div></div><p class="note">${tt('Quality of hire uses external hires that joined 12–24 months ago (internal moves excluded); shown when a source has at least 5 such hires.', 'Quality of hire memakai hire eksternal yang bergabung 12–24 bulan lalu (mutasi internal tidak dihitung); ditampilkan bila sumber punya minimal 5 hire.')}</p>`;
  const AGB = [[0, 30, '0–30'], [31, 60, '31–60'], [61, 90, '61–90'], [91, 9999, '> 90']];
  const ag = colChart(AGB.map((b, i) => { const r = open.filter((q) => { const d = daysBetween(q.opened, DB.AS_OF); return d >= b[0] && d <= b[1]; });
    return { label: b[2] + tt(' days', ' hari'), v: r.length, color: i >= 2 ? 'var(--orange)' : 'var(--purple)', tip: [b[2] + tt(' days open', ' hari terbuka'), [[tt('Requisitions', 'Requisition'), NF(r.length)]].concat(r.slice(0, 4).map((q) => [q.req_id, lbl('band', q.band) + ' · ' + lbl('dept', q.dept)]))] }; }), { w: chartW('third'), h: 150 });
  const note = (S.F.etype || S.F.gender) ? filtersNote(tt('Requisitions are recorded by department, location and band; employment type and gender filters do not apply on this page.', 'Requisition dicatat per department, lokasi, dan band; filter status kerja dan gender tidak berlaku di halaman ini.')) : '';
  return lead(heroH, st) + sowhat(ins) + note +
    `<div class="grid2">${card(head2(tt('Hiring funnel', 'Funnel rekrutmen'), tt('Of everyone who applied, how many reached each step (jobs filled from outside, ', 'Dari semua pelamar, berapa yang sampai ke tiap tahap (lowongan yang diisi dari luar, ') + periodRange(ms) + ')', '', 'funnel') + funnel(stages), '', 4)}${card(head2(tt('Time-to-fill by month', 'Time-to-fill per bulan'), tt('Median days, last 24 months', 'Median hari, 24 bulan terakhir'), '', 'ttf') + ttfM, '', 5)}</div>` +
    card(head2(tt('Source effectiveness', 'Efektivitas sumber'), periodRange(ms), '', 'source') + tbl, '', 6) +
    `<div class="grid2">${card(head2(tt('Time-to-fill by job band', 'Time-to-fill per job band'), tt('Mean days', 'Rata-rata hari'), '', 'ttf') + bandB, '', 7)}${card(head2(tt('Requisition aging', 'Umur requisition'), tt('Open on ', 'Terbuka per ') + fmtDate(DB.AS_OF), '', 'aging') + ag, '', 8)}</div>`;
}

// ------------------------------------------------------------------ 10. Performance
function cycleRows(year) { return DB.Y.filter((y) => y.year === year && y.final_rating != null && passE(DB.EMAP[y.emp_id])); }
function pgPerformance() {
  const cy = DB.CYCLE, R = cycleRows(cy), R0 = cycleRows(cy - 1), ms = periodMonths();
  if (!R.length) return empty();
  const kpi = avg(R, (y) => y.kpi_pct), kpi0 = avg(R0, (y) => y.kpi_pct), at100 = pct(R.filter((y) => y.kpi_pct >= 100).length, R.length), beh = avg(R, (y) => y.behavior_score);
  const hiP = pct(R.filter((y) => y.final_rating >= 4).length, R.length), loP = pct(R.filter((y) => y.final_rating <= 2).length, R.length);
  const prom = DB.MV.filter((m) => m.type === 'Promotion' && ms.indexOf(m.date.slice(0, 7)) > -1 && passE(DB.EMAP[m.emp_id])).length, promR = pct(annualise(prom, ms), avgHC(ms));
  const heroH = hero(tt('Goal achievement (KPI) · review year ', 'Pencapaian target (KPI) · tahun penilaian ') + cy, cnt(kpi, 1, '', '%'), pill(at100 - 50, P(at100, 0) + tt(' reached 100% or more', ' mencapai 100% atau lebih')), tt('Cycle ', 'Siklus ') + (cy - 1), P(kpi0), 'goal');
  const st = [
    stat(tt('Behavioral score', 'Skor perilaku'), cnt(beh, 2) + ' <small>/5</small>', tt('5 competencies', '5 kompetensi'), 'c-purple', 'behavior'),
    stat(tt('Rated 4–5', 'Rating 4–5'), cnt(hiP, 1, '', '%'), tt('exceeds or outstanding', 'melampaui atau istimewa'), 'c-green', 'finalRating'),
    stat(tt('Rated 1–2', 'Rating 1–2'), cnt(loP, 1, '', '%'), tt('below expectations', 'di bawah harapan'), 'c-orange', 'finalRating'),
    stat(tt('Promotion rate', 'Tingkat promosi'), cnt(promR, 1, '', '%'), NF(prom) + tt(' promotions · ', ' promosi · ') + periodName(), '', 'promo'),
  ];
  const lvl = (v) => (v < 2.75 ? 0 : v < 3.75 ? 1 : 2);
  const wh = [0, 1, 2].map(() => [0, 0, 0]); R.forEach((y) => { wh[2 - lvl(y.behavior_score)][lvl(y.kpi_score)] += 1; });
  const pf = (r) => (r <= 2 ? 0 : r === 3 ? 1 : 2), pt = { Low: 0, Medium: 1, High: 2 };
  const nb = [0, 1, 2].map(() => [0, 0, 0]); R.forEach((y) => { if (y.potential) nb[2 - pt[y.potential]][pf(y.final_rating)] += 1; });
  const riskHiKpiLoBeh = R.filter((y) => lvl(y.kpi_score) === 2 && lvl(y.behavior_score) === 0).length;
  const stars = nb[0][2], hiPotLow = nb[0][0] + nb[0][1];
  const dist = (rows) => [1, 2, 3, 4, 5].map((k) => pct(rows.filter((y) => y.final_rating === k).length, rows.length));
  const d1 = dist(R), d0 = dist(R0);
  const ins = [
    [tt(`In cycle ${cy}, ${P(hiP, 0)} were rated 4–5 and ${P(loP, 0)} 1–2 (prior cycle ${P(d0[3] + d0[4], 0)} and ${P(d0[0] + d0[1], 0)}). Average KPI achievement was ${P(kpi)}.`, `Pada siklus ${cy}, ${P(hiP, 0)} mendapat rating 4–5 dan ${P(loP, 0)} rating 1–2 (siklus sebelumnya ${P(d0[3] + d0[4], 0)} dan ${P(d0[0] + d0[1], 0)}). Rata-rata pencapaian KPI ${P(kpi)}.`),
      tt('compare and align ratings across departments before bonuses and pay rises are set; require evidence of goal results for every rating of 4–5 or 1–2.', 'samakan standar rating antar department sebelum bonus dan kenaikan gaji ditetapkan; wajibkan bukti hasil target untuk setiap rating 4–5 atau 1–2.')],
    [tt(`${NF(riskHiKpiLoBeh)} employees deliver strong goal results but score low on behavior, a group that can hurt teamwork and safety culture if left unchecked.`, `${NF(riskHiKpiLoBeh)} karyawan mencapai target tinggi tetapi berperilaku kurang baik, kelompok yang bisa merusak kerja sama dan budaya keselamatan bila dibiarkan.`),
      tt('do not promote on results alone: require a behavior score of at least 3.5, and coach this group together with their managers.', 'jangan promosikan hanya karena hasil: syaratkan skor perilaku minimal 3,5, dan lakukan coaching bersama atasannya.')],
    [tt(`${NF(stars)} employees sit in the high-performance, high-potential box; ${NF(hiPotLow)} high-potential employees are not yet rated high.`, `${NF(stars)} karyawan berada di kotak kinerja tinggi dan potensi tinggi; ${NF(hiPotLow)} karyawan berpotensi tinggi belum mendapat rating tinggi.`),
      tt('give stars a named next role and stretch assignment; check whether high-potential under-performers are in the wrong role.', 'berikan peran berikutnya dan penugasan menantang untuk bintang; periksa apakah karyawan berpotensi tinggi yang kinerjanya rendah berada di peran yang salah.')],
  ];
  const w2 = chartW('half'), labels = [tt('Unsatisfactory', 'Tidak memuaskan'), tt('Needs improvement', 'Perlu perbaikan'), tt('Meets', 'Sesuai'), tt('Exceeds', 'Melampaui'), tt('Outstanding', 'Istimewa')];
  const distC = groupCols([1, 2, 3, 4, 5].map((k, i) => ({ label: S.CW < 560 ? String(k) : k + ' ' + labels[i], vals: [d0[i], d1[i]], tip: [k + ' · ' + labels[i], [[tt('Cycle ', 'Siklus ') + (cy - 1), P(d0[i])], [tt('Cycle ', 'Siklus ') + cy, P(d1[i])]]] })), ['#C9CDD6', 'var(--purple)'], { h: 170, fmt: (v) => NF(v, 0) + '%' });
  const N9 = [[tt('Enigma', 'Teka-teki'), tt('Growth employee', 'Bertumbuh'), tt('Star', 'Bintang')], [tt('Dilemma', 'Dilema'), tt('Core player', 'Andalan'), tt('High performer', 'Kinerja tinggi')], [tt('Under-performer', 'Kinerja rendah'), tt('Effective', 'Efektif'), tt('Trusted professional', 'Profesional andal')]];
  const g9 = grid9(nb.map((row, r) => row.map((n, c) => ({ n, name: N9[r][c], hot: r === 0 && c === 2 }))), { yl: [tt('High', 'Tinggi'), tt('Med', 'Sedang'), tt('Low', 'Rendah')], xl: [tt('Low', 'Rendah'), tt('Medium', 'Sedang'), tt('High', 'Tinggi')], xa: tt('performance (final rating)', 'kinerja (rating akhir)'), ya: tt('potential to grow', 'potensi berkembang'), aria: '9-box' });
  const gW = grid9(wh.map((row, r) => row.map((n, c) => ({ n, name: [[tt('Good behavior, low results', 'Perilaku baik, hasil rendah'), tt('Good citizen', 'Warga teladan'), tt('Role model', 'Panutan')], [tt('Coach on results', 'Coaching hasil'), tt('Solid', 'Solid'), tt('Rising contributor', 'Kontributor naik')], [tt('Act now', 'Perlu tindakan'), tt('Coach on behavior', 'Coaching perilaku'), tt('Results, poor behavior', 'Hasil baik, perilaku buruk')]][r][c], hot: r === 0 && c === 2 }))),
    { yl: [tt('High', 'Tinggi'), tt('Med', 'Sedang'), tt('Low', 'Rendah')], xl: [tt('Low', 'Rendah'), tt('Medium', 'Sedang'), tt('High', 'Tinggi')], xa: tt('goal results', 'hasil target'), ya: tt('behavior', 'perilaku'), aria: 'Results vs Behavior' });
  const kd = hbars(dimRows('dept').map((dp) => { const rr = R.filter((y) => DB.EMAP[y.emp_id].dept === dp); return rr.length ? { label: lbl('dept', dp), v: avg(rr, (y) => y.kpi_pct), text: P(avg(rr, (y) => y.kpi_pct)), sub: P(pct(rr.filter((y) => y.kpi_pct >= 100).length, rr.length), 0) + ' ≥100%', mk: 100, color: 'var(--purple)' } : null; }).filter(Boolean).sort((a, b) => b.v - a.v), { max: 125 });
  const comps = DB.meta.dims.competencies;
  const cb = hbars(comps.map((c, i) => { const v = avg(R, (y) => y['c' + (i + 1)]); return { label: lbl('comp', c), v, text: NF(v, 2), mk: 3, color: 'var(--navy)' }; }), { max: 5 });
  return lead(heroH, st) + sowhat(ins) +
    `<div class="grid2">${card(head2(tt('Final rating distribution', 'Distribusi rating akhir'), tt('70% goal results + 30% behavior. Compared with the previous review year.', '70% hasil target + 30% perilaku. Dibandingkan dengan tahun penilaian sebelumnya.'), legend([[tt('Cycle ', 'Siklus ') + (cy - 1), '#C9CDD6'], [tt('Cycle ', 'Siklus ') + cy, 'var(--purple)']]), 'finalRating') + distC, '', 4)}${card(head2(tt('KPI achievement by department', 'Pencapaian KPI per department'), tt('Line = 100% of target', 'Garis = 100% target'), '', 'kpi') + kd, '', 5)}</div>
    <div class="grid2">${card(head2(tt('Performance & potential grid (9-box)', 'Matriks kinerja & potensi (9-box)'), tt('Each box counts people by recent performance (left to right) and potential to grow (bottom to top). Review year ', 'Tiap kotak menghitung orang menurut kinerja terkini (kiri ke kanan) dan potensi berkembang (bawah ke atas). Tahun penilaian ') + cy, '', 'nineBox') + g9, '', 6)}${card(head2(tt('Results vs. Behavior', 'Hasil vs Perilaku'), tt('Each box counts people by goal results (left to right) and behavior (bottom to top)', 'Tiap kotak menghitung orang menurut hasil target (kiri ke kanan) dan perilaku (bawah ke atas)'), '', 'whatHow') + gW, '', 7)}</div>` +
    card(head2(tt('Behavioral competencies', 'Kompetensi perilaku'), tt('Average score 1–5 · line = 3 (meets)', 'Rata-rata skor 1–5 · garis = 3 (sesuai)'), '', 'behavior') + cb, '', 8);
}

// ------------------------------------------------------------------ 11. Development
function pgDevelopment() {
  const ms = periodMonths(), aH = avg(ms, (m) => AG.cost[m].hc);
  const th = csum(ms, 'th'), ts = csum(ms, 'training'), thE = annualise(th, ms) / aH, tsE = annualise(ts, ms) / aH;
  const filled = AG.Q.filter((q) => q.status === 'Filled' && ms.indexOf(q.closed.slice(0, 7)) > -1), intR = pct(filled.filter((q) => q.internal).length, filled.length);
  const K = DB.K.filter((k) => (!S.F.dept || S.F.dept.has(k.dept)) && (!S.F.loc || S.F.loc.has(k.loc)) && (!S.F.band || S.F.band.has(k.band)));
  const now = pct(K.filter((k) => k.ready_now > 0).length, K.length), anyS = pct(K.filter((k) => k.ready_now + k.ready_1_2y > 0).length, K.length);
  const risk = DB.AT.rows.filter((r) => passE(DB.EMAP[r.emp_id])), low = risk.filter((r) => r.training_hours < 15);
  const heroH = hero(tt('Training hours per employee', 'Jam pelatihan per karyawan') + ' · ' + periodName(), cnt(thE, 1) + ` <small>${tt('h / yr', 'jam / thn')}</small>`, '', tt('Spend per employee', 'Biaya per karyawan'), money(tsE), 'trainH');
  const st = [
    stat(tt('Internal fill rate', 'Internal fill rate'), cnt(intR, 1, '', '%'), NF(filled.filter((q) => q.internal).length) + tt(' of ', ' dari ') + NF(filled.length) + tt(' roles', ' posisi'), 'c-purple', 'internalFill'),
    stat(tt('Key roles with a backup ready now', 'Posisi kunci dengan pengganti siap sekarang'), cnt(now, 0, '', '%'), NF(K.filter((k) => k.ready_now > 0).length) + tt(' of ', ' dari ') + NF(K.length) + tt(' key positions', ' posisi kunci'), '', 'succession'),
    stat(tt('Key roles with any backup', 'Posisi kunci dengan pengganti apa pun'), cnt(anyS, 0, '', '%'), tt('ready now or in 1–2 years', 'siap sekarang atau 1–2 tahun'), '', 'succession'),
    stat(tt('Under 15 training hours', 'Di bawah 15 jam pelatihan'), cnt(pct(low.length, risk.length), 0, '', '%'), NF(low.length) + tt(' employees, last 12 months', ' karyawan, 12 bulan terakhir'), 'c-orange', 'trainH'),
  ];
  const deptT = dimRows('dept').map((dp) => { const h = sum(ms, (m) => (AG.costDept[dp + '|' + m] || { th: 0 }).th), s2 = sum(ms, (m) => (AG.costDept[dp + '|' + m] || { training: 0 }).training), hh = avg(ms, (m) => (AG.costDept[dp + '|' + m] || { hc: 0 }).hc);
    return hh ? { dp, h: annualise(h, ms) / hh, s: annualise(s2, ms) / hh } : null; }).filter(Boolean).sort((a, b) => b.h - a.h);
  const noSucc = K.filter((k) => k.ready_now + k.ready_1_2y === 0), schedNo = noSucc.filter((k) => k.incumbent_exit);
  const lowRisk = avg(low, (r) => r.p), okRisk = avg(risk.filter((r) => r.training_hours >= 30), (r) => r.p);
  const ins = [
    low.length ? [tt(`${P(pct(low.length, risk.length), 0)} of employees logged under 15 training hours in the last year; their modelled resignation risk is ${P(100 * lowRisk)} vs ${P(100 * okRisk)} for those with 30+ hours.`, `${P(pct(low.length, risk.length), 0)} karyawan tercatat kurang dari 15 jam pelatihan dalam setahun terakhir; risiko resign menurut model ${P(100 * lowRisk)} vs ${P(100 * okRisk)} untuk yang 30+ jam.`),
      tt('give managers a list of their low-training staff and book them into the next safety and skills modules.', 'berikan daftar karyawan dengan pelatihan rendah kepada atasannya dan daftarkan mereka ke modul keselamatan dan keterampilan berikutnya.')] : null,
    [tt(`${P(now, 0)} of key roles have someone ready to step in today; ${NF(noSucc.length)} have nobody lined up at all${schedNo.length ? `, ${NF(schedNo.length)} of them with the current holder already leaving` : ''}.`, `${P(now, 0)} posisi kunci punya pengganti yang siap hari ini; ${NF(noSucc.length)} belum punya pengganti sama sekali${schedNo.length ? `, ${NF(schedNo.length)} di antaranya pemegangnya sudah akan keluar` : ''}.`),
      tt('name at least one backup person for every key role this quarter, starting with plant management roles.', 'tetapkan minimal satu pengganti untuk setiap posisi kunci kuartal ini, mulai dari posisi manajemen pabrik.')],
    [tt(`${P(intR, 0)} of roles were filled internally ${periodName()}.`, `${P(intR, 0)} posisi diisi dari internal ${periodName()}.`),
      tt('post Supervisor-and-above vacancies internally first for two weeks; internal moves fill faster and retain know-how.', 'umumkan lowongan Supervisor ke atas secara internal dulu selama dua minggu; pengisian internal lebih cepat dan menjaga pengetahuan.')],
  ];
  const w2 = chartW('half'), m24 = M24();
  const thM = colChart(m24.map((m, i) => { const v = AG.cost[m].hc ? AG.cost[m].th / AG.cost[m].hc : 0; return { label: monLabel(m, i), v, text: NF(v, 1), color: 'var(--sky)', tip: [ymFull(m), [[tt('Hours per employee', 'Jam per karyawan'), NF(v, 2)], [tt('Total hours', 'Total jam'), NF(AG.cost[m].th, 0)]]] }; }), { w: w2, h: 160, showV: false });
  const dB = hbars(deptT.map((x) => ({ label: lbl('dept', x.dp), v: x.h, text: NF(x.h, 1) + tt(' h', ' jam'), sub: money(x.s), color: 'var(--sky)' })));
  const ib = hbars(dimRows('band').map((b) => { const f = filled.filter((q) => q.band === b); return f.length ? { label: lbl('band', b), v: pct(f.filter((q) => q.internal).length, f.length), text: P(pct(f.filter((q) => q.internal).length, f.length), 0), sub: NF(f.length) + tt(' filled', ' terisi'), color: 'var(--purple)' } : null; }).filter(Boolean), { max: 100 });
  const sd = stackRows(dimRows('dept').map((dp) => { const kk = K.filter((k) => k.dept === dp); return { label: lbl('dept', dp), parts: [kk.filter((k) => k.ready_now > 0).length, kk.filter((k) => !k.ready_now && k.ready_1_2y > 0).length, kk.filter((k) => !k.ready_now && !k.ready_1_2y).length] }; }).filter((r) => sum(r.parts)),
    ['var(--navy)', 'var(--lilac)', 'var(--orange)'], [tt('Ready now', 'Siap sekarang'), tt('Ready in 1–2 years', 'Siap 1–2 tahun'), tt('No successor', 'Tanpa penerus')]);
  const gt = 'grid-template-columns:70px minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)';
  const kt = noSucc.length ? `<div class="tbl scrollx"><div style="min-width:420px"><div class="tr th" style="${gt}"><span>${tt('Position', 'Posisi')}</span><span>${tt('Department', 'Department')}</span><span>${tt('Band', 'Band')}</span><span>${tt('Incumbent', 'Pejabat')}</span></div>${noSucc.slice(0, 10).map((k) => `<div class="tr" style="${gt}"><span><b>${k.pos_id}</b></span><span class="cell-t">${esc(lbl('dept', k.dept))}</span><span class="cell-t">${esc(lbl('band', k.band))}</span><span>${k.incumbent_exit ? `<span class="tag t-out">${tt('Leaving ', 'Keluar ') + fmtDate(k.incumbent_exit)}</span>` : `<span class="note">${k.incumbent_id}</span>`}</span></div>`).join('')}</div></div>${noSucc.length > 10 ? `<p class="note">${tt('Showing 10 of ', 'Menampilkan 10 dari ') + NF(noSucc.length)}</p>` : ''}` : empty(tt('Every key position in this selection has a successor.', 'Semua posisi kunci pada pilihan ini punya penerus.'));
  return lead(heroH, st) + sowhat(ins) + genderNote() +
    `<div class="grid2">${card(head2(tt('Training hours per employee by month', 'Jam pelatihan per karyawan per bulan'), tt('Last 24 months · dips in December and in turnaround months', '24 bulan terakhir · turun di Desember dan bulan turnaround'), '', 'trainH') + thM, '', 4)}${card(head2(tt('Training by department', 'Pelatihan per department'), tt('Hours and spend per employee, annualised', 'Jam dan biaya per karyawan, disetahunkan'), '', 'trainS') + dB, '', 5)}</div>
    <div class="grid2">${card(head2(tt('Succession coverage by department', 'Cakupan suksesi per department'), NF(K.length) + tt(' key positions', ' posisi kunci'), legend([[tt('Ready now', 'Siap sekarang'), 'var(--navy)'], [tt('1–2 years', '1–2 tahun'), 'var(--lilac)'], [tt('None', 'Tidak ada'), 'var(--orange)']]), 'succession') + sd, '', 6)}${card(head2(tt('Internal fill rate by band', 'Internal fill rate per band'), periodRange(ms), '', 'internalFill') + ib, '', 7)}</div>` +
    card(head2(tt('Key positions without a successor', 'Posisi kunci tanpa penerus'), tt('Anonymous position and employee IDs', 'ID posisi dan karyawan anonim'), '', 'succession') + kt, '', 8);
}

// ------------------------------------------------------------------ 12. Predictive insights
function fcScenario() {
  const fc = DB.FC, im = fc.implied, w = S.wi || (S.wi = { rev: +(100 * im.revenue_growth).toFixed(1), sal: +(100 * im.cost_per_fte_growth).toFixed(1), hc: +(100 * im.headcount_growth).toFixed(1) });
  const p = im.pay_linked_share, s = fc.series, out = { mc: [], mcLo: [], mcHi: [], hc: [], hcLo: [], hcHi: [], rev: [] };
  for (let k = 1; k <= 12; k++) {
    const fh = Math.pow((1 + w.hc / 100) / (1 + im.headcount_growth), k / 12), fs = 1 + p * (Math.pow((1 + w.sal / 100) / (1 + im.cost_per_fte_growth), k / 12) - 1), fr = Math.pow((1 + w.rev / 100) / (1 + im.revenue_growth), k / 12);
    out.mc.push(s.manpower_cost.mean[k - 1] * fh * fs); out.mcLo.push(s.manpower_cost.lo[k - 1] * fh * fs); out.mcHi.push(s.manpower_cost.hi[k - 1] * fh * fs);
    out.hc.push(s.headcount.mean[k - 1] * fh); out.hcLo.push(s.headcount.lo[k - 1] * fh); out.hcHi.push(s.headcount.hi[k - 1] * fh); out.rev.push(s.revenue.mean[k - 1] * fr);
  }
  return { w, out };
}
function fcBox() {
  const fc = DB.FC, { w } = fcScenario(), im = fc.implied;
  const sl = (k, label, min, max, def, implied) => `<div class="sl"><label for="sl-${k}">${label}<b>${SIGN(w[k], 1, '%')}</b></label><input type="range" id="sl-${k}" data-sl="${k}" min="${min}" max="${max}" step="0.5" value="${w[k]}"><small>${tt('Model\'s own forecast ', 'Perkiraan model sendiri ')}${SIGN(implied, 1, '%')}</small></div>`;
  return `<div class="card-head"><div><h2>${tt('12-month forecast: manpower cost and headcount', 'Forecast 12 bulan: manpower cost dan headcount')}${info('forecast')}</h2><p class="note">${tt('Company level. Solid line = what happened. Dashed purple = forecast for the next 12 months under the scenario you set with the sliders. Shaded area = the range the model is 80% sure the result will fall in.', 'Tingkat perusahaan. Garis penuh = yang terjadi. Ungu putus-putus = perkiraan 12 bulan ke depan sesuai skenario yang Anda atur dengan slider. Area arsir = rentang yang diyakini model 80% akan memuat hasilnya.')}</p></div><button class="btn" type="button" data-act="fcreset">${tt('Reset to baseline', 'Kembali ke baseline')}</button></div>
    <div class="sliders">${sl('rev', tt('Revenue growth', 'Pertumbuhan revenue'), -5, 20, w.rev, 100 * im.revenue_growth)}${sl('sal', tt('Pay increase per FTE', 'Kenaikan biaya per FTE'), 0, 12, w.sal, 100 * im.cost_per_fte_growth)}${sl('hc', tt('Headcount growth', 'Pertumbuhan headcount'), -8, 12, w.hc, 100 * im.headcount_growth)}</div>
    <div id="fc-out" style="display:flex;flex-direction:column;gap:14px">${fcOut()}</div>`;
}
function fcOut() {
  const fc = DB.FC, s = fc.series, { out } = fcScenario();
  const hist = fc.months_history.slice(-24), H = s.manpower_cost.actual.slice(-24), HH = s.headcount.actual.slice(-24), labels = hist.concat(fc.horizon);
  const mcT = sum(s.manpower_cost.actual.slice(-12)), revT = sum(s.revenue.actual.slice(-12)), hcT = avg(s.headcount.actual.slice(-12));
  const mcN = sum(out.mc), revN = sum(out.rev), hcN = avg(out.hc);
  const wF = chartW('full');
  const mk = (hist2, mean, lo, hi, fmt, name) => { const n = hist2.length; const a = hist2.concat(Array(12).fill(null)), f = Array(n - 1).fill(null).concat([hist2[n - 1]]).concat(mean);
    return lineChart({ labels, w: wF, h: 210, series: [{ name: tt('Actual', 'Aktual'), color: 'var(--navy)', vals: a }, { name: tt('Forecast (your scenario)', 'Perkiraan (skenario Anda)'), color: 'var(--purple)', vals: f, dash: true }], band: { lo: Array(n).fill(null).concat(lo), hi: Array(n).fill(null).concat(hi) }, fmt,
      tip: (i) => [ymFull(labels[i]), i < n ? [[tt('Actual', 'Aktual'), fmt(a[i])]] : [[tt('Forecast', 'Forecast'), fmt(mean[i - n])], [tt('Likely range (80% sure)', 'Rentang kemungkinan (yakin 80%)'), fmt(lo[i - n]) + ' – ' + fmt(hi[i - n])]]], aria: name }); };
  return `<div class="strip" style="flex:none">${stat(tt('Manpower cost, next 12 months', 'Manpower cost, 12 bulan ke depan'), money(mcN), SIGN(pct(mcN - mcT, mcT), 1, '%') + tt(' vs last 12 months', ' vs 12 bulan terakhir'))}${stat(tt('Average headcount', 'Rata-rata headcount'), NF(hcN), SIGN(pct(hcN - hcT, hcT), 1, '%'))}${stat(tt('Manpower cost % revenue', 'Manpower cost % revenue'), P(pct(mcN, revN), 2), tt('now ', 'kini ') + P(pct(mcT, revT), 2))}${stat(tt('Cost per FTE', 'Biaya per FTE'), money(mcN / hcN), tt('now ', 'kini ') + money(mcT / hcT))}</div>
    <div style="display:flex;flex-direction:column;gap:16px">${`<div><p class="note" style="margin-bottom:6px">${tt('Manpower cost per month', 'Manpower cost per bulan')}</p>${legend([[tt('Actual', 'Aktual'), 'var(--navy)'], [tt('Forecast (your scenario)', 'Perkiraan (skenario Anda)'), 'var(--purple)', 'line'], [tt('Likely range (80% sure)', 'Rentang kemungkinan (yakin 80%)'), 'rgba(120,71,145,.25)']])}${mk(H, out.mc, out.mcLo, out.mcHi, (v) => money(v), 'manpower cost')}</div>`}<div><p class="note" style="margin-bottom:8px">${tt('Headcount', 'Headcount')}</p>${mk(HH, out.hc, out.hcLo, out.hcHi, (v) => NF(v), 'headcount')}</div></div>
    <p class="note">${tt(`Accuracy check: when we hid the last 12 months and let the model forecast them, it was off by ${P(100 * s.manpower_cost.mape_backtest)} on cost and ${P(100 * s.headcount.mape_backtest)} on the number of employees, on average.`, `Uji akurasi: saat 12 bulan terakhir kami sembunyikan lalu diramal model, rata-rata meleset ${P(100 * s.manpower_cost.mape_backtest)} untuk biaya dan ${P(100 * s.headcount.mape_backtest)} untuk jumlah karyawan.`)}</p>`;
}
const SEGTXT = {
  rising: ['High performers who still have room to grow, but are paid slightly below the middle of their pay range.', 'Berkinerja tinggi dan masih bisa berkembang, tetapi gajinya sedikit di bawah titik tengah rentang gaji.', 'Protect them: bring pay up to the middle of the range and name their next role.', 'Lindungi mereka: naikkan gaji ke titik tengah rentang dan tetapkan peran berikutnya.'],
  established: ['Experienced, well paid, with good ratings. They are the most settled group.', 'Berpengalaman, bergaji baik, dan berating baik. Kelompok yang paling mapan.', 'Use them as mentors and as backups for key roles; watch that their pay does not creep up faster than their output.', 'Jadikan mentor dan pengganti posisi kunci; pastikan gaji mereka tidak naik lebih cepat dari output.'],
  ramping: ['Joined recently and are still learning the job.', 'Baru bergabung dan masih belajar pekerjaannya.', 'Give them a buddy, a 90-day plan and early training; this is the group that most needs a good start.', 'Beri buddy, rencana 90 hari, dan pelatihan awal; kelompok ini paling butuh awal yang baik.'],
  plateaued: ['Long-serving, but with no promotion for years and average to low ratings.', 'Sudah lama bekerja, tetapi bertahun-tahun tanpa promosi dan berating sedang hingga rendah.', 'Refresh them: moves to other teams, a skills programme and clear expectations.', 'Segarkan mereka: pindah ke tim lain, program keterampilan, dan ekspektasi yang jelas.'],
};
function pgPredictive() {
  const AT = DB.AT, risk = AT.rows.filter((r) => passE(DB.EMAP[r.emp_id])), hi = risk.filter((r) => r.tier === 'High'), md = risk.filter((r) => r.tier === 'Medium'), exp = sum(risk, (r) => r.p);
  const { w, out } = fcScenario(), fc = DB.FC, mcT = sum(fc.series.manpower_cost.actual.slice(-12)), mcN = sum(out.mc);
  const heroH = hero(tt('Employees expected to resign, next 12 months', 'Karyawan yang diperkirakan resign, 12 bulan ke depan'), cnt(exp, 0), pill(0, NF(hi.length) + tt(' at high risk', ' berisiko tinggi')), tt('Current employees checked', 'Karyawan aktif yang dicek'), NF(risk.length), 'risk');
  const st = [
    stat(tt('High risk of resigning', 'Risiko resign tinggi'), cnt(hi.length), P(pct(hi.length, risk.length), 0) + tt(' of staff · chance of ', ' karyawan · peluang ') + P(100 * AT.thresholds.high, 0) + tt(' or more', ' atau lebih'), 'c-orange', 'risk'),
    stat(tt('Medium risk', 'Risiko sedang'), cnt(md.length), P(pct(md.length, risk.length), 0) + tt(' of staff', ' karyawan'), '', 'risk'),
    stat(tt('Model accuracy score', 'Skor akurasi model'), cnt(AT.test_auc, 2), tt('0.5 = coin flip · 1.0 = perfect', '0,5 = tebak acak · 1,0 = sempurna'), 'c-purple', 'auc'),
    stat(tt('Manpower cost, next 12 months', 'Manpower cost, 12 bulan ke depan'), money(mcN), SIGN(pct(mcN - mcT, mcT), 1, '%') + tt(' in this scenario', ' pada skenario ini'), '', 'forecast'),
  ];
  // ---- employee groups
  const KEYS = ['rising', 'established', 'ramping', 'plateaued'];
  const segRows = risk.map((r) => ({ r, s: DB.SEG[r.emp_id], e: DB.EMAP[r.emp_id] })).filter((x) => x.s);
  const prof = KEYS.map((k) => { const rows = segRows.filter((x) => x.s === k); return { k, rows, n: rows.length, tenure: avg(rows, (x) => x.r.tenure), pay: avg(rows, (x) => x.r.compa), rating: avg(rows, (x) => x.r.rating), promo: (avg(rows, (x) => x.r.months_since_promo) || 0) / 12, risk: avg(rows, (x) => x.r.p) }; });
  const T = [['risk', tt('Most likely to resign', 'Paling mungkin resign'), 'warn', tt('Least likely to resign', 'Paling kecil kemungkinan resign'), 'good'],
    ['rating', tt('Highest ratings', 'Rating tertinggi'), 'good', tt('Lowest ratings', 'Rating terendah'), 'warn'],
    ['pay', tt('Best paid for their level', 'Gaji tertinggi untuk levelnya'), 'neutral', tt('Lowest pay for their level', 'Gaji terendah untuk levelnya'), 'warn'],
    ['promo', tt('Longest without a promotion', 'Terlama tanpa promosi'), 'warn', tt('Most recently promoted', 'Promosi paling baru'), 'neutral'],
    ['tenure', tt('Longest at the company', 'Terlama di perusahaan'), 'neutral', tt('Newest to the company', 'Paling baru di perusahaan'), 'neutral']];
  const ok = prof.filter((p) => p.n >= 5), chips = {}; prof.forEach((p) => { chips[p.k] = []; });
  if (ok.length >= 3) T.forEach((t) => { const o = ok.slice().sort((a, b) => b[t[0]] - a[t[0]]); chips[o[0].k].push([t[1], t[2]]); chips[o[o.length - 1].k].push([t[3], t[4]]); });
  const avgRisk = avg(segRows, (x) => x.r.p);
  const cards = prof.map((p) => { const d = SEGTXT[p.k];
    return `<div class="seg-card"><h3><i style="background:${SEGS[p.k].color}"></i>${esc(segName(p.k))}</h3><p class="tagline">${esc(tt(d[0], d[1]))}</p>
      <span class="big">${NF(p.n)} <small class="note">${tt('people', 'orang')} · ${P(pct(p.n, segRows.length), 0)}</small></span>
      <div class="traits">${chips[p.k].slice(0, 3).map((c) => `<span class="trait ${c[1]}">${esc(c[0])}</span>`).join('')}</div>
      <dl><dt>${tt('Years at the company', 'Lama bekerja')}</dt><dd>${NF(p.tenure, 1)} ${tt('yrs', 'thn')}</dd><dt>${tt('Pay vs middle of pay range', 'Gaji vs titik tengah rentang')}</dt><dd>${P(100 * p.pay, 0)}</dd><dt>${tt('Last rating (1–5)', 'Rating terakhir (1–5)')}</dt><dd>${NF(p.rating, 1)}</dd><dt>${tt('Since last promotion', 'Sejak promosi terakhir')}</dt><dd>${NF(p.promo, 1)} ${tt('yrs', 'thn')}</dd><dt>${tt('Chance of resigning, next 12 months', 'Peluang resign, 12 bulan ke depan')}</dt><dd>${P(100 * (p.risk || 0), 1)}</dd></dl>
      <p class="act"><b>${tt('What to do', 'Yang bisa dilakukan')}:</b> ${esc(tt(d[2], d[3]))}</p></div>`; }).join('');
  const intro = `<div class="seg-intro"><div><h3>${tt('What did we do?', 'Apa yang kami lakukan?')}</h3><p>${tt('We gave the computer six facts about each employee and asked it to sort everyone into four groups of people who look alike. We did not tell it who belongs where. The group names and the advice are written by us, not by the computer.', 'Kami memberi komputer enam fakta tentang tiap karyawan dan memintanya mengelompokkan semua orang menjadi empat kelompok yang mirip. Kami tidak memberi tahu siapa masuk kelompok mana. Nama kelompok dan sarannya kami tulis sendiri, bukan oleh komputer.')}</p>
      <p style="margin-top:8px">${tt('Companywide, the average chance that a current employee resigns in the next 12 months is ', 'Secara keseluruhan, rata-rata peluang karyawan saat ini resign dalam 12 bulan ke depan adalah ')}<b>${P(100 * avgRisk, 1)}</b>.</p></div>
    <div><h3>${tt('The six facts used', 'Enam fakta yang dipakai')}</h3><ul class="facts"><li>${tt('Years at the company', 'Lama bekerja di perusahaan')}</li><li>${tt('Pay level: salary compared with the middle of the pay range for the job level (100% = exactly the middle)', 'Level gaji: gaji dibanding titik tengah rentang gaji untuk level jabatan (100% = tepat di tengah)')}</li><li>${tt('Last performance rating (1 to 5)', 'Rating kinerja terakhir (1 sampai 5)')}</li><li>${tt('Time since the last promotion (or since joining, if never promoted)', 'Waktu sejak promosi terakhir (atau sejak masuk, bila belum pernah dipromosikan)')}</li><li>${tt('Training hours last year', 'Jam pelatihan tahun lalu')}</li><li>${tt('Potential to grow, as judged by the manager (low, medium, high)', 'Potensi berkembang menurut atasan (rendah, sedang, tinggi)')}</li></ul>
      <p class="note">${tt('Not used: gender, age, department, location or the actual salary amount.', 'Tidak dipakai: gender, usia, department, lokasi, atau besar gaji.')}</p></div></div>`;
  const pts = segRows.map((x) => ({ x: x.r.compa * 100, y: Math.min(x.r.months_since_promo / 12, 10), color: SEGS[x.s].color, tip: [x.r.emp_id + ' · ' + segName(x.s), [[tt('Pay vs middle of range', 'Gaji vs titik tengah'), P(100 * x.r.compa, 0)], [tt('Since last promotion', 'Sejak promosi terakhir'), NF(x.r.months_since_promo / 12, 1) + tt(' yrs', ' thn')], [tt('Chance of resigning', 'Peluang resign'), P(100 * x.r.p, 1)]]] }));
  const scat = scatter(pts, { w: chartW('full'), xmin: 80, xmax: 130, ymin: 0, ymax: 10, vline: 100, xfmt: (v) => NF(v, 0) + '%', xlabel: tt('Pay vs the middle of the pay range (100% = exactly the middle)', 'Gaji vs titik tengah rentang gaji (100% = tepat di tengah)'), ylabel: tt('Years since last promotion (capped at 10)', 'Tahun sejak promosi terakhir (maks. 10)'), aria: tt('Each dot is one employee, placed by pay level and time since last promotion, coloured by group', 'Tiap titik adalah satu karyawan, diletakkan menurut level gaji dan waktu sejak promosi terakhir, diberi warna menurut kelompok') });
  const segMap = `<div class="how"><h3>${tt('How to read the dot chart', 'Cara membaca grafik titik')}</h3><p>${tt('Each dot is one employee. Further right = paid more compared with the middle of their pay range (the dashed line is 100%). Higher up = more years since the last promotion. Colours show the group. Newer employees sit near the bottom because they have had little time to be promoted; long-serving staff without promotion sit near the top.', 'Tiap titik adalah satu karyawan. Makin ke kanan = gaji makin tinggi dibanding titik tengah rentang gajinya (garis putus adalah 100%). Makin ke atas = makin lama sejak promosi terakhir. Warna menunjukkan kelompok. Karyawan baru ada di dekat bagian bawah karena belum sempat dipromosikan; senior lama tanpa promosi ada di bagian atas.')}</p></div>`;
  // ---- insights
  const rt = segRows.filter((x) => x.s === 'rising'), gap = sum(rt, (x) => Math.max(0, 1 - x.r.compa) * x.e.base_salary), rtLow = rt.filter((x) => x.r.compa < 0.95).length;
  const drivers = {}; hi.forEach((r) => (r.drivers || []).forEach((d) => { drivers[d] = (drivers[d] || 0) + 1; }));
  const topD = Object.keys(drivers).sort((a, b) => drivers[b] - drivers[a])[0];
  const fname = (f) => ({ tenure: tt('a short time at the company', 'masa kerja yang pendek'), compa: tt('pay below the middle of their pay range', 'gaji di bawah titik tengah rentang gajinya'), rating: tt('their last rating', 'rating terakhir mereka'), msp: tt('a long time since their last promotion', 'sudah lama tidak dipromosikan'), training: tt('little training', 'pelatihan yang sedikit') }[f] || f);
  const ins = [
    [tt(`The scenario puts manpower cost at ${money(mcN)} over the next 12 months (${SIGN(pct(mcN - mcT, mcT), 1, '%')}), with cost per person ${SIGN(w.sal, 1, '%')} and the number of employees ${SIGN(w.hc, 1, '%')}.`, `Skenario ini memperkirakan manpower cost ${money(mcN)} dalam 12 bulan ke depan (${SIGN(pct(mcN - mcT, mcT), 1, '%')}), dengan biaya per orang ${SIGN(w.sal, 1, '%')} dan jumlah karyawan ${SIGN(w.hc, 1, '%')}.`),
      tt('plan around the shaded area, not just the line: budget towards the top of the range for plants with a maintenance shutdown next year.', 'rencanakan berdasarkan area arsir, bukan hanya garisnya: anggarkan mendekati batas atas untuk pabrik yang akan shutdown perawatan tahun depan.')],
    [tt(`About ${NF(exp, 0)} current employees are expected to resign in the next 12 months. Among those at high risk, the most common reason in the data is ${topD ? fname(topD) : '–'}.`, `Sekitar ${NF(exp, 0)} karyawan saat ini diperkirakan resign dalam 12 bulan ke depan. Di antara yang berisiko tinggi, alasan paling umum dalam data adalah ${topD ? fname(topD) : '–'}.`),
      tt('give each manager the list of high-risk people in their team and talk to them. Treat the scores as a reason to start a conversation, never as a verdict on one person.', 'berikan setiap atasan daftar anggota timnya yang berisiko tinggi dan ajak bicara. Anggap skor sebagai alasan memulai percakapan, bukan vonis atas satu orang.')],
    rt.length ? [tt(`${NF(rt.length)} employees are in the "${SEGS.rising.en}" group, ${NF(rtLow)} of them paid below 95% of the middle of their pay range. Raising all of them to the middle would cost about ${money(gap)} a year.`, `${NF(rt.length)} karyawan berada di kelompok "${SEGS.rising.id}", ${NF(rtLow)} di antaranya digaji di bawah 95% titik tengah rentang gajinya. Menaikkan semuanya ke titik tengah butuh sekitar ${money(gap)} per tahun.`),
      tt('fund a targeted pay adjustment for this group; it costs less than replacing strong performers who resign.', 'siapkan penyesuaian gaji terarah untuk kelompok ini; biayanya lebih kecil daripada mengganti karyawan unggul yang akhirnya resign.')] : null,
  ];
  const tierRows = dimRows('dept').map((g) => { const rr = risk.filter((r) => DB.EMAP[r.emp_id].dept === g); return { label: lbl('dept', g), parts: ['Low', 'Medium', 'High'].map((t) => rr.filter((r) => r.tier === t).length), hs: rr.length ? rr.filter((r) => r.tier === 'High').length / rr.length : 0 }; }).filter((r) => sum(r.parts)).sort((a, b) => b.hs - a.hs);
  // ---- what drives the risk (plain words)
  const DRV = { tenure: ['Longer time at the company', 'Lebih lama di perusahaan', 'Shorter time at the company', 'Lebih singkat di perusahaan'], compa: ['Higher pay for the job level', 'Gaji lebih tinggi untuk level jabatan', 'Lower pay for the job level', 'Gaji lebih rendah untuk level jabatan'],
    msp: ['Longer since the last promotion', 'Lebih lama sejak promosi terakhir', 'More recently promoted', 'Promosi lebih baru'], training: ['More training hours', 'Lebih banyak jam pelatihan', 'Fewer training hours', 'Lebih sedikit jam pelatihan'], rating: ['Higher last rating', 'Rating terakhir lebih tinggi', 'Lower last rating', 'Rating terakhir lebih rendah'] };
  const STEP = { compa: (c) => tt(`+${NF(100 * c.sd, 0)} points of pay level`, `+${NF(100 * c.sd, 0)} poin level gaji`), msp: (c) => tt(`+${NF(c.sd / 12, 1)} years`, `+${NF(c.sd / 12, 1)} tahun`), training: (c) => tt(`+${NF(c.sd, 0)} hours`, `+${NF(c.sd, 0)} jam`), rating: (c) => tt(`+${NF(c.sd, 1)} rating points`, `+${NF(c.sd, 1)} poin rating`), tenure: () => tt('a typical step up', 'satu langkah yang umum') };
  const co = AT.coefficients.slice().sort((a, b) => Math.abs(b.beta_std) - Math.abs(a.beta_std));
  const drv = divBars(co.map((c) => { const chg = (c.odds_ratio_per_sd - 1) * 100, up = c.beta_std > 0, d = DRV[c.feature];
    return { label: S.lang === 'id' ? d[1] : d[0], v: c.beta_std, text: Math.abs(chg) < 8 ? tt('~0%', '~0%') : SIGN(chg, 0, '%'), color: up ? 'var(--orange)' : 'var(--purple)',
      tip: [S.lang === 'id' ? d[1] : d[0], [[tt('Effect on the chance of resigning', 'Pengaruh pada peluang resign'), SIGN(chg, 0, '%')], [tt('For a step of', 'Untuk langkah sebesar'), STEP[c.feature](c)]]] }; }), { max: 1 });
  const split = (c) => c;
  void split;
  return lead(heroH, st) + sowhat(ins) +
    card(`<div id="fc-box">${fcBox()}</div>`, '', 3) +
    `<div class="grid2">${card(head2(tt('Who might leave: risk of resigning by department', 'Siapa yang mungkin keluar: risiko resign per department'), tt('Share of each department\'s employees the model rates at low, medium or high risk of resigning in the next 12 months', 'Porsi karyawan tiap department yang dinilai model berisiko rendah, sedang, atau tinggi untuk resign dalam 12 bulan ke depan'), legend([[tt('Low risk', 'Risiko rendah'), '#D5DAE1'], [tt('Medium risk', 'Risiko sedang'), 'var(--lilac)'], [tt('High risk', 'Risiko tinggi'), 'var(--orange)']]), 'risk') + stackRows(tierRows, ['#D5DAE1', 'var(--lilac)', 'var(--orange)'], [tt('Low risk', 'Risiko rendah'), tt('Medium risk', 'Risiko sedang'), tt('High risk', 'Risiko tinggi')]), '', 4)}
    ${card(head2(tt('What makes people more or less likely to resign', 'Apa yang membuat orang lebih atau kurang mungkin resign'), tt('Orange bars to the right = more likely to resign. Purple bars to the left = less likely. The number is the change in the chance of resigning for a typical step up in that factor.', 'Batang oranye ke kanan = lebih mungkin resign. Batang ungu ke kiri = kurang mungkin. Angkanya adalah perubahan peluang resign untuk satu langkah umum kenaikan faktor itu.'), '', 'risk') + drv + `<p class="note">${tt(`The model learned this from ${AT.train_years.join(' and ')} (${NF(AT.n_train)} employee-years) and was tested on ${AT.test_year} (${NF(AT.n_test)}). Its accuracy score is ${NF(AT.test_auc, 2)}: better than guessing, good for deciding where to look first, not precise enough to judge one person. The percentages are approximate.`, `Model mempelajari ini dari ${AT.train_years.join(' dan ')} (${NF(AT.n_train)} karyawan-tahun) dan diuji pada ${AT.test_year} (${NF(AT.n_test)}). Skor akurasinya ${NF(AT.test_auc, 2)}: lebih baik dari menebak, cukup untuk menentukan ke mana melihat lebih dulu, tetapi belum cukup tepat untuk menilai satu orang. Persentasenya perkiraan.`)}</p>`, '', 5)}</div>` +
    card(head2(tt('Employee groups: four kinds of employees', 'Kelompok karyawan: empat jenis karyawan'), tt('The computer sorted employees into four groups of similar people (K-Means)', 'Komputer mengelompokkan karyawan menjadi empat kelompok orang yang mirip (K-Means)'), '', 'segments') + intro + `<div class="seg-cards">${cards}</div>` + legend(KEYS.map((k) => [segName(k), SEGS[k].color])) + segMap + scat +
      `<p class="note">${tt(`Groups blend at the edges, as is normal for people data (separation score ${NF(DB.SG.silhouette, 2)} on a scale up to 1). Someone near the border could sit in a neighbouring group.`, `Kelompok saling berbaur di tepinya, hal yang wajar pada data karyawan (skor keterpisahan ${NF(DB.SG.silhouette, 2)} pada skala hingga 1). Orang di dekat batas bisa saja masuk kelompok sebelah.`)}</p>`, '', 6) +
    card(head2(tt('How these three models work', 'Cara kerja ketiga model')) + `<div class="grid3" style="gap:12px 24px"><p class="note"><b>${tt('Forecast', 'Forecast')}.</b> ${tt('The model looks at the monthly pattern since January 2023: the overall trend plus the usual ups and downs through the year (for example the March bonus). It continues that pattern for 12 months. The sliders let you ask "what if sales grow faster?" or "what if we raise pay more?".', 'Model melihat pola bulanan sejak Januari 2023: tren keseluruhan ditambah naik-turun yang biasa terjadi sepanjang tahun (misalnya bonus Maret). Pola itu dilanjutkan selama 12 bulan. Slider memungkinkan Anda bertanya "bagaimana jika penjualan tumbuh lebih cepat?" atau "bagaimana jika gaji dinaikkan lebih besar?".')}</p>
      <p class="note"><b>${tt('Risk of resigning', 'Risiko resign')}.</b> ${tt('For each past year, the model looked at five facts about every employee on 1 January (time at the company, pay level, last rating, time since promotion, training hours) and whether that person resigned during the year. It learned which facts go with leaving, then applied that to today\'s employees. "High risk" = a chance of ', 'Untuk tiap tahun lalu, model melihat lima fakta tentang setiap karyawan pada 1 Januari (lama bekerja, level gaji, rating terakhir, waktu sejak promosi, jam pelatihan) dan apakah orang itu resign pada tahun itu. Model mempelajari fakta mana yang berkaitan dengan keluar, lalu menerapkannya pada karyawan saat ini. "Risiko tinggi" = peluang ')}${P(100 * AT.thresholds.high, 0)}${tt(' or more (twice the average); "medium" = at least ', ' atau lebih (dua kali rata-rata); "sedang" = minimal ')}${P(100 * AT.thresholds.medium, 0)}.</p>
      <p class="note"><b>${tt('Employee groups', 'Kelompok karyawan')}.</b> ${tt('The computer starts with four guesses for the centre of each group, puts every employee with the closest centre, moves each centre to the average of its members, and repeats until nothing changes. It does this 20 times from different starting points and keeps the best result.', 'Komputer memulai dengan empat tebakan pusat kelompok, memasukkan tiap karyawan ke pusat terdekat, memindahkan tiap pusat ke rata-rata anggotanya, dan mengulang sampai tidak ada perubahan. Proses ini diulang 20 kali dari titik awal berbeda dan hasil terbaik dipakai.')}</p></div>
      <details class="analyst"><summary>${tt('For analysts: technical details', 'Untuk analis: detail teknis')}</summary><p>${tt('Forecast: ordinary least squares with a linear trend and 11 month-of-year dummies (cost and revenue on the log scale), 80% prediction interval, 12-month back-test. Risk model: logistic regression (IRLS, L2 penalty 1.0) on 1 January snapshots, trained on ' + AT.train_years.join(' and ') + ', tested on ' + AT.test_year + ' (AUC ' + NF(AT.test_auc, 2) + '), tiers at 1× and 2× the base rate. Segmentation: K-Means k = 4 on six standardised features, k-means++ initialisation, 20 restarts, fixed seed, silhouette ' + NF(DB.SG.silhouette, 2) + '.', 'Forecast: regresi kuadrat terkecil dengan tren linear dan 11 dummy bulan (biaya dan revenue dalam skala log), interval prediksi 80%, back-test 12 bulan. Model risiko: regresi logistik (IRLS, penalti L2 1,0) pada snapshot 1 Januari, dilatih pada ' + AT.train_years.join(' dan ') + ', diuji pada ' + AT.test_year + ' (AUC ' + NF(AT.test_auc, 2) + '), tier pada 1× dan 2× tingkat dasar. Segmentasi: K-Means k = 4 pada enam fitur terstandar, inisialisasi k-means++, 20 kali ulang, seed tetap, silhouette ' + NF(DB.SG.silhouette, 2) + '.')}</p></details>`, '', 7);
}
