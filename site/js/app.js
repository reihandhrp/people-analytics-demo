'use strict';
/* Demo Corp People Analytics - shell: navigation, filters, period, language, tooltips, routing. */

const IC = {
  overview: '<path d="M4 13h6V4H4z"/><path d="M14 20h6v-9h-6z"/><path d="M14 4h6v3h-6z"/><path d="M4 20h6v-3H4z"/>',
  workforce: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.7-3.2 2.8-5 5.5-5s4.8 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.3.2 3.9 1.8 4.5 4.8"/>',
  prodcost: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15l3-4 3 2 5-6"/>',
  ta: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/><path d="M11 8v6M8 11h6"/>',
  tm: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
  predictive: '<path d="M4 18c3-1 4-7 7-7s3 4 5 4 3-5 4-8"/><path d="M4 21h16"/><circle cx="20" cy="7" r="1.2"/>',
};
const GROUPS = [
  { key: 'overview', icon: IC.overview, label: ['Executive Overview', 'Ringkasan Eksekutif'], pages: ['overview'] },
  { key: 'workforce', icon: IC.workforce, label: ['Workforce', 'Tenaga Kerja'], pages: ['headcount', 'attrition', 'inout'] },
  { key: 'prodcost', icon: IC.prodcost, label: ['Productivity & Cost', 'Produktivitas & Biaya'], pages: ['productivity', 'cost', 'ratios', 'analysis'] },
  { key: 'ta', icon: IC.ta, label: ['Talent Acquisition', 'Talent Acquisition'], pages: ['ta'] },
  { key: 'tm', icon: IC.tm, label: ['Talent Management', 'Talent Management'], pages: ['performance', 'development'] },
  { key: 'predictive', icon: IC.predictive, label: ['Predictive Insights', 'Insight Prediktif'], pages: ['predictive'] },
];
const PAGES = {
  overview: { nav: ['Executive Overview', 'Ringkasan Eksekutif'], fn: () => pgOverview(), period: true, filters: true,
    sub: () => tt(`How Demo Corp's workforce, productivity and people cost are tracking, ${periodName()}`, `Kondisi tenaga kerja, produktivitas, dan biaya karyawan Demo Corp, ${periodName()}`) },
  headcount: { nav: ['Headcount & Department', 'Headcount & Department'], fn: () => pgHeadcount(), period: false, filters: true,
    sub: () => tt('Who works here today, by department, band, type and tenure', 'Siapa yang bekerja hari ini, per department, band, status, dan masa kerja') },
  attrition: { nav: ['Attrition', 'Attrition'], fn: () => pgAttrition(), period: true, filters: true, needY: true,
    sub: () => tt('Who leaves, when, why and from which groups', 'Siapa yang keluar, kapan, mengapa, dan dari kelompok mana') },
  inout: { nav: ['In / Out', 'Masuk & Keluar'], fn: () => pgInOut(), period: true, filters: true,
    sub: () => tt('Joiners and leavers month by month, with anonymous IDs', 'Karyawan masuk dan keluar per bulan, dengan ID anonim') },
  productivity: { nav: ['Productivity', 'Produktivitas'], fn: () => pgProductivity(), period: true, filters: false,
    sub: () => tt('Output and value per employee against the plan targets', 'Output dan nilai per karyawan terhadap target rencana') },
  cost: { nav: ['Manpower Cost', 'Manpower Cost'], fn: () => pgCost(), period: true, filters: true,
    sub: () => tt('People cost by month, type and department', 'Biaya karyawan per bulan, jenis, dan department') },
  ratios: { nav: ['Cost Ratios', 'Rasio Biaya'], fn: () => pgRatios(), period: true, filters: true,
    sub: () => tt('People cost relative to revenue, EBITDA and FTE', 'Biaya karyawan relatif terhadap revenue, EBITDA, dan FTE') },
  analysis: { nav: ['Cost Analysis', 'Analisis Biaya'], fn: () => pgAnalysis(), period: true, filters: true,
    sub: () => tt('What drove the change in people cost, and how it compares with budget', 'Apa yang mendorong perubahan biaya karyawan, dan bagaimana dibanding budget') },
  ta: { nav: ['Talent Acquisition', 'Talent Acquisition'], fn: () => pgTA(), period: true, filters: true, needY: true,
    sub: () => tt('How fast, how well and at what cost roles are filled', 'Seberapa cepat, seberapa baik, dan berapa biaya mengisi posisi') },
  performance: { nav: ['Performance', 'Kinerja'], fn: () => pgPerformance(), period: true, filters: true, needY: true,
    sub: () => tt(`KPI-based and behavior-based results, review cycle ${DB.CYCLE}`, `Hasil berbasis KPI dan perilaku, siklus penilaian ${DB.CYCLE}`) },
  development: { nav: ['Development', 'Pengembangan'], fn: () => pgDevelopment(), period: true, filters: true,
    sub: () => tt('Training, internal mobility and succession', 'Pelatihan, mobilitas internal, dan suksesi') },
  predictive: { nav: ['Predictive Insights', 'Insight Prediktif'], fn: () => pgPredictive(), period: false, filters: true,
    sub: () => tt('Forecast, attrition risk and employee segments', 'Forecast, risiko attrition, dan segmen karyawan') },
};
const FILTERS = [['dept', ['Department', 'Department']], ['loc', ['Location', 'Lokasi']], ['etype', ['Employment type', 'Status kerja']], ['band', ['Job band', 'Job band']], ['gender', ['Gender', 'Gender']]];
const L = (pair) => pair[S.lang === 'id' ? 1 : 0];

// ------------------------------------------------------------------ routing (hash = page&lang&period)
function readHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const pg = h.get('page'); if (pg && PAGES[pg]) S.page = pg;
  const lg = h.get('lang'); if (lg === 'id' || lg === 'en') S.lang = lg;
  const pr = h.get('period'); if (['ttm', 'ytd', 'fy'].indexOf(pr) > -1) S.period = pr;
}
const hashFor = (page) => '#page=' + page + (S.lang !== 'en' ? '&lang=' + S.lang : '') + (S.period !== 'ttm' ? '&period=' + S.period : '');
function writeHash(push) { const h = hashFor(S.page); if (location.hash !== h) { if (push) history.pushState(null, '', h); else history.replaceState(null, '', h); } }

// ------------------------------------------------------------------ chrome
function renderNav() {
  $('nav').innerHTML = GROUPS.map((g) => {
    if (g.pages.length === 1) { const k = g.pages[0]; return `<a href="${hashFor(k)}" data-page="${k}" ${S.page === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g.icon}</svg>${esc(L(PAGES[k].nav))}</a>`; }
    return `<div class="nav-group" role="group" aria-label="${esc(L(g.label))}"><span class="nav-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g.icon}</svg>${esc(L(g.label))}</span>${g.pages.map((k) => `<a href="${hashFor(k)}" data-page="${k}" ${S.page === k ? 'aria-current="page"' : ''}>${esc(L(PAGES[k].nav))}</a>`).join('')}</div>`;
  }).join('');
}
function renderChrome() {
  document.documentElement.lang = S.lang;
  const pg = PAGES[S.page], grp = GROUPS.find((g) => g.pages.indexOf(S.page) > -1);
  $('page-title').textContent = L(pg.nav);
  $('page-sub').textContent = DB.meta ? pg.sub() : '';
  document.title = L(pg.nav) + ' · Demo Corp People Analytics';
  $('brand-sub').textContent = tt('People Analytics', 'People Analytics');
  $('chip-demo').querySelector('span').textContent = tt('Demo · synthetic data', 'Demo · data sintetis');
  $('chip-demo').title = tt('Every person, number and the company itself are fictional, generated by a seeded script.', 'Semua orang, angka, dan perusahaannya fiktif, dibuat oleh script dengan seed tetap.');
  if (DB.meta) { const c = $('chip-date'); c.hidden = false; c.querySelector('span').textContent = tt('Data as of ', 'Data per ') + fmtDate(DB.AS_OF); c.title = tt('People data to this date; finance and cost to ', 'Data karyawan s.d. tanggal ini; keuangan dan biaya s.d. ') + ymFull(DB.LAST); }
  $('lang').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang)));
  $('lang').setAttribute('aria-label', tt('Language', 'Bahasa'));
  $('nav').setAttribute('aria-label', tt('Dashboard pages', 'Halaman dashboard'));
  $('filters').setAttribute('aria-label', tt('Filters', 'Filter'));
  renderNav();
  renderPeriod(pg);
  renderFilters(pg);
  renderFoot();
  void grp;
}
function renderPeriod(pg) {
  const el = $('period'); el.hidden = !pg.period; document.querySelector('.tb-div').hidden = !pg.period;
  if (!DB.meta) return;
  const opts = [['ttm', tt('Last 12 months', '12 bulan terakhir'), periodRange(periodMonths('ttm'))], ['ytd', 'YTD ' + DB.LAST.slice(0, 4), periodRange(periodMonths('ytd'))], ['fy', 'FY' + DB.LAST_FY, periodRange(periodMonths('fy'))]];
  el.innerHTML = `<span class="scope-label" id="period-lbl">${tt('Period', 'Periode')}</span><div class="scope-seg" role="group" aria-labelledby="period-lbl">${opts.map((o) => `<button type="button" data-period="${o[0]}" aria-pressed="${S.period === o[0]}" title="${esc(o[2])}">${esc(o[1])}</button>`).join('')}</div>`;
}
function renderFilters(pg) {
  const el = $('filters'); if (!DB.meta) { el.innerHTML = ''; return; }
  const open = el.querySelector('details[open]'); const openK = open ? open.dataset.k : null;
  el.innerHTML = FILTERS.map(([k, lab]) => {
    const vals = DB.DIMS[k], sel = S.F[k], all = !sel, txt = all ? tt('All', 'Semua') : sel.size === 0 ? tt('None', 'Tidak ada') : sel.size === 1 ? lbl(k, Array.from(sel)[0]) : sel.size + tt(' selected', ' dipilih');
    return `<details class="ms${all ? '' : ' active'}${pg.filters ? '' : ' off'}" data-k="${k}"${openK === k && pg.filters ? ' open' : ''}><summary aria-label="${esc(L(lab) + ': ' + txt)}"${pg.filters ? '' : ' tabindex="-1" aria-disabled="true"'}>${esc(L(lab))}<b style="font-weight:600;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(txt)}</b><span aria-hidden="true">▾</span></summary>
      <div class="ms-panel"><div class="ms-actions"><button type="button" data-fa="all" data-k="${k}">${tt('Select all', 'Pilih semua')}</button><button type="button" data-fa="none" data-k="${k}">${tt('Clear', 'Kosongkan')}</button></div>
      <div class="ms-list">${vals.map((v) => `<label><input type="checkbox" data-k="${k}" value="${esc(v)}" ${all || sel.has(v) ? 'checked' : ''}> <span>${esc(lbl(k, v))}</span></label>`).join('')}</div></div></details>`;
  }).join('') + (anyFilter() && pg.filters ? `<button class="reset" type="button" id="f-reset">${tt('Reset filters', 'Reset filter')}</button>` : '') + (!pg.filters ? `<span class="filters-note">${tt('Filters do not apply to this company-level page', 'Filter tidak berlaku di halaman tingkat perusahaan ini')}</span>` : '');
}
function renderFoot() {
  if (!DB.meta) return;
  const repo = window.REPO_URL && window.REPO_URL.indexOf('__') !== 0 ? window.REPO_URL : null;
  $('side-foot').innerHTML = `<span>${tt('Portfolio demo. All people, figures and the company are fictional.', 'Demo portofolio. Semua orang, angka, dan perusahaannya fiktif.')}</span>${repo ? `<a href="${esc(repo)}" target="_blank" rel="noopener">${tt('Source code & methodology', 'Kode & metodologi')}</a>` : ''}`;
  $('defs-sum').textContent = tt('About this demo', 'Tentang demo ini');
  $('defs-body').innerHTML = `<div><p><b>Demo Corp</b> ${tt('is a fictional polyolefin producer (polyethylene and polypropylene) with a corporate HQ and three plants. Every employee, requisition and dollar on this site is synthetic, produced by a seeded Python script, and the data refreshes so that dates stay relative to today.', 'adalah produsen poliolefin fiktif (polietilena dan polipropilena) dengan kantor pusat dan tiga pabrik. Setiap karyawan, requisition, dan dolar di situs ini sintetis, dibuat oleh script Python dengan seed tetap, dan datanya diperbarui sehingga tanggalnya selalu relatif terhadap hari ini.')}</p>
    <p>${tt('People data runs to ', 'Data karyawan s.d. ')}<b>${fmtDate(DB.AS_OF)}</b>${tt('; finance, cost and production to ', '; keuangan, biaya, dan produksi s.d. ')}<b>${ymFull(DB.LAST)}</b>. ${tt('Seed ', 'Seed ')}${DB.meta.seed}.</p></div>
    <div><p>${tt('Each metric has an ⓘ button with its formula. Insight text is computed from the data and the filters you choose. The three predictive models are illustrative and trained on the synthetic data only.', 'Setiap metrik punya tombol ⓘ berisi formulanya. Teks insight dihitung dari data dan filter yang Anda pilih. Ketiga model prediktif bersifat ilustratif dan hanya dilatih pada data sintetis.')}</p>
    ${repo ? `<p><a href="${esc(repo)}" target="_blank" rel="noopener">${tt('Repository, data generator and methodology', 'Repositori, generator data, dan metodologi')}</a></p>` : ''}</div>`;
}

// ------------------------------------------------------------------ render
let STATUS = 'loading';
function countUp(root) {
  if (RM.matches) return;
  const els = Array.from(root.querySelectorAll('.cnt[data-count]')).filter((e) => e.dataset.count !== '');
  if (!els.length) return;
  const t0 = performance.now(), dur = 650, items = els.map((e) => ({ e, v: +e.dataset.count, d: +e.dataset.dec, pre: e.dataset.pre, suf: e.dataset.suf }));
  const step = (t) => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3); items.forEach((x) => { const v = p >= 1 ? x.v : x.v * k; x.e.textContent = x.pre + NF(x.d ? v : Math.round(v), x.d) + x.suf; }); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function render(play) {
  renderChrome();
  const c = $('content');
  if (STATUS === 'loading') { c.innerHTML = `<div class="loading">${tt('Loading data…', 'Memuat data…')}</div>`; return; }
  if (STATUS === 'error') { c.innerHTML = `<div class="err" role="alert">${tt('The data files could not be loaded. Refresh the page; if it keeps failing, the site may still be deploying.', 'Berkas data tidak dapat dimuat. Muat ulang halaman; bila tetap gagal, situs mungkin masih dalam proses deploy.')}</div>`; return; }
  S.CW = c.clientWidth || 900;
  if (PAGES[S.page].needY && !DB.Y) { c.innerHTML = `<div class="loading">${tt('Loading review history…', 'Memuat riwayat penilaian…')}</div>`; loadYears().then(() => render(play)).catch(() => { STATUS = 'error'; render(false); }); return; }
  rebuild();
  const y = window.scrollY;
  c.classList.remove('play');
  let html;
  if (PAGES[S.page].filters && anyFilter() && !AG.E.length) html = `<div class="empty" style="min-height:220px;flex-direction:column;gap:10px">${tt('No employees match this filter combination.', 'Tidak ada karyawan untuk kombinasi filter ini.')}<button class="btn" type="button" data-act="reset">${tt('Reset filters', 'Reset filter')}</button></div>`;
  else { try { html = `<div class="page">${PAGES[S.page].fn()}</div>`; } catch (err) { console.error(err); html = `<div class="err" role="alert">${tt('This view could not be drawn for the current selection. Reset the filters or choose another period.', 'Tampilan ini tidak dapat digambar untuk pilihan sekarang. Reset filter atau pilih periode lain.')}</div>`; } }
  c.innerHTML = html;
  if (play) { void c.offsetWidth; c.classList.add('play'); countUp(c); } else window.scrollTo(0, y);
}
function go(page, push) {
  if (!PAGES[page]) return;
  const changed = page !== S.page; S.page = page; S.pg = {}; S.io = { month: 'all', kind: 'all', q: '' };
  writeHash(push); render(true); if (changed) { window.scrollTo(0, 0); $('page-title').focus({ preventScroll: true }); }
}

// ------------------------------------------------------------------ tooltips (chart values and formula definitions)
function bindTips() {
  const tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
  let lastKey = null, pinned = null;
  const place = (cx, cy) => { const w = tip.offsetWidth, h = tip.offsetHeight; let x = cx + 14, y = cy - h - 12; if (x + w > window.innerWidth - 8) x = cx - w - 14; if (x < 8) x = 8; if (y < 8) y = cy + 18; if (y + h > window.innerHeight - 8) y = Math.max(8, window.innerHeight - h - 8); tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
  const showData = (data, cx, cy, key) => { if (key !== lastKey) { tip.className = ''; tip.innerHTML = `<b>${esc(data[0])}</b>` + data[1].map((r) => `<span>${esc(r[0])}</span><em>${esc(r[1])}</em>`).join(''); lastKey = key; } tip.hidden = false; place(cx, cy); };
  const showDef = (btn) => { const d = DEF[btn.dataset.def]; if (!d) return; const lab = btn.closest('.stat,.hero,.card-head,h2'); const title = lab ? (lab.querySelector('.stat-label,.hero-label,h2') || lab).textContent.trim() : '';
    tip.className = 'def'; tip.innerHTML = `${title ? `<b>${esc(title)}</b>` : ''}<p>${esc(d[S.lang === 'id' ? 1 : 0])}</p>`; lastKey = 'def:' + btn.dataset.def; tip.hidden = false; const r = btn.getBoundingClientRect(); place(r.left + r.width / 2, r.top); };
  const clearLines = () => document.querySelectorAll('.hv-line,.hv-dot').forEach((el) => el.setAttribute('visibility', 'hidden'));
  const hide = () => { tip.hidden = true; lastKey = null; pinned = null; clearLines(); };
  const line = (svg, e) => {
    const d = svg._d || (svg._d = JSON.parse(svg.dataset.line)); const m = svg.getScreenCTM(); if (!m) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const lx = pt.matrixTransform(m.inverse()).x;
    let bi = 0; d.p.forEach((q, i) => { if (Math.abs(q[0] - lx) < Math.abs(d.p[bi][0] - lx)) bi = i; });
    const q = d.p[bi], ln = svg.querySelector('.hv-line'), dot = svg.querySelector('.hv-dot');
    ln.setAttribute('x1', q[0]); ln.setAttribute('x2', q[0]); ln.setAttribute('visibility', 'visible'); dot.setAttribute('cx', q[0]); dot.setAttribute('cy', q[1]); dot.setAttribute('visibility', 'visible');
    const sp = svg.createSVGPoint(); sp.x = q[0]; sp.y = q[1]; const s2 = sp.matrixTransform(m); showData(d.t[bi], s2.x, s2.y, svg.dataset.line.length + ':' + bi);
  };
  const onMove = (e) => {
    if (pinned) return;
    const info = e.target.closest && e.target.closest('[data-def]'); if (info) { showDef(info); return; }
    const svg = e.target.closest && e.target.closest('svg[data-line]'); if (svg) { line(svg, e); return; }
    clearLines();
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && $('main').contains(el)) showData(JSON.parse(el.dataset.tip), e.clientX, e.clientY, el.dataset.tip); else hide();
  };
  const main = $('main');
  main.addEventListener('pointermove', onMove);
  main.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !e.target.closest('[data-def]')) onMove(e); });
  main.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pinned) hide(); });
  main.addEventListener('click', (e) => { const b = e.target.closest('[data-def]'); if (!b) return; e.preventDefault(); if (pinned === b) { hide(); return; } showDef(b); pinned = b; });
  main.addEventListener('focusin', (e) => { const b = e.target.closest('[data-def]'); if (b) showDef(b); });
  main.addEventListener('focusout', (e) => { if (e.target.closest('[data-def]')) hide(); });
  window.addEventListener('scroll', () => { if (!pinned) hide(); else { const r = pinned.getBoundingClientRect(); place(r.left + r.width / 2, r.top); } }, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (!main.contains(e.target)) hide(); else if (pinned && !e.target.closest('[data-def]')) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
}

// ------------------------------------------------------------------ events
function bindUI() {
  $('nav').addEventListener('click', (e) => { const a = e.target.closest('a[data-page]'); if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); go(a.dataset.page, true); });
  $('lang').addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (!b || b.dataset.lang === S.lang) return; S.lang = b.dataset.lang; try { localStorage.setItem('demo-lang', S.lang); } catch (x) { /* storage unavailable */ } writeHash(false); render(false); });
  $('period').addEventListener('click', (e) => { const b = e.target.closest('[data-period]'); if (!b || b.dataset.period === S.period) return; S.period = b.dataset.period; S.pg = {}; S.io.month = 'all'; writeHash(false); render(true); const nb = $('period').querySelector(`[data-period="${S.period}"]`); if (nb) nb.focus({ preventScroll: true }); });
  const fl = $('filters');
  const setF = (k, sel) => { S.F[k] = sel.length >= DB.DIMS[k].length ? null : new Set(sel); S.pg = {}; S.io.month = 'all'; render(true); const d = fl.querySelector(`details[data-k="${k}"]`); if (d) { d.open = true; } };
  fl.addEventListener('change', (e) => { const c = e.target; if (c.type !== 'checkbox') return; const k = c.dataset.k; setF(k, Array.from(fl.querySelectorAll(`details[data-k="${k}"] input:checked`)).map((x) => x.value)); const nc = fl.querySelector(`details[data-k="${k}"] input[value="${CSS.escape(c.value)}"]`); if (nc) nc.focus({ preventScroll: true }); });
  fl.addEventListener('click', (e) => { const b = e.target.closest('[data-fa]'); if (b) { setF(b.dataset.k, b.dataset.fa === 'all' ? DB.DIMS[b.dataset.k].slice() : []); return; } if (e.target.id === 'f-reset') { Object.keys(S.F).forEach((k) => { S.F[k] = null; }); render(true); } });
  fl.addEventListener('toggle', (e) => { if (e.target.open) fl.querySelectorAll('details[open]').forEach((d) => { if (d !== e.target) d.open = false; }); }, true);
  document.addEventListener('click', (e) => { if (!e.target.closest('details.ms')) fl.querySelectorAll('details[open]').forEach((d) => { d.open = false; }); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fl.querySelectorAll('details[open]').forEach((d) => { d.open = false; d.querySelector('summary').focus(); }); });
  const c = $('content');
  c.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act, v = b.dataset.v;
    if (a === 'reset') { Object.keys(S.F).forEach((k) => { S.F[k] = null; }); render(true); return; }
    if (a === 'fcreset') { S.wi = null; render(false); return; }
    if (a === 'month') { S.io.month = S.io.month === v ? 'all' : v; S.io.kind = 'all'; S.pg.io = 0; }
    else if (a === 'kind') { S.io.kind = v; S.pg.io = 0; }
    else if (a === 'pg') { S.pg.io = (S.pg.io || 0) + (+v); }
    render(false);
    const nb = c.querySelector(`[data-act="${a}"]${v != null ? `[data-v="${CSS.escape(v)}"]` : ''}`); if (nb && !nb.disabled) nb.focus({ preventScroll: true });
    if (a === 'pg' || a === 'month') { const l = $('io-list'); if (l && l.getBoundingClientRect().top < 0) l.scrollIntoView({ block: 'start' }); }
  });
  c.addEventListener('input', (e) => {
    if (e.target.id === 'q-io') { S.io.q = e.target.value; S.pg.io = 0; const pos = e.target.selectionStart; render(false); const q = $('q-io'); if (q) { q.focus({ preventScroll: true }); q.setSelectionRange(pos, pos); } return; }
    const k = e.target.dataset && e.target.dataset.sl; if (!k) return;
    fcScenario(); S.wi[k] = +e.target.value; e.target.parentNode.querySelector('b').textContent = SIGN(S.wi[k], 1, '%');
    const o = $('fc-out'); if (o) o.innerHTML = fcOut();
  });
  c.addEventListener('change', (e) => { const k = e.target.dataset && e.target.dataset.sl; if (!k) return; render(false); const s = $('sl-' + k); if (s) s.focus({ preventScroll: true }); });
  let rt = null, lastW = window.innerWidth;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const cw = $('content').clientWidth; if (Math.abs(cw - S.CW) > 30 && STATUS === 'ok') render(false); lastW = window.innerWidth; }, 180); void lastW; });
  window.addEventListener('hashchange', () => { const before = S.page, lg = S.lang, pr = S.period; readHash(); if (S.page !== before || S.lang !== lg || S.period !== pr) render(S.page !== before); });
}

// ------------------------------------------------------------------ boot
(async function boot() {
  try { const l = localStorage.getItem('demo-lang'); if (l === 'id' || l === 'en') S.lang = l; } catch (e) { /* storage unavailable */ }
  readHash();
  bindUI(); bindTips();
  render(false);
  try { await loadAll(); companyInit(); STATUS = 'ok'; } catch (e) { console.error(e); STATUS = 'error'; }
  render(true);
  if (STATUS === 'ok') loadYears().catch((e) => console.error(e));
})();
