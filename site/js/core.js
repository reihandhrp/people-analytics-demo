'use strict';
/* Demo Corp People Analytics - core: state, i18n, data, metrics, chart components. All data is synthetic. */

const $ = (id) => document.getElementById(id);
const S = { lang: 'en', page: 'overview', period: 'ttm', F: { dept: null, loc: null, etype: null, band: null, gender: null },
  io: { month: 'all', kind: 'all', q: '' }, pg: {}, wi: null, CW: 1000 };
const tt = (en, id) => (S.lang === 'id' ? id : en);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOCALE = () => (S.lang === 'id' ? 'id-ID' : 'en-US');
const NF = (v, d) => (v == null || !isFinite(v) ? '–' : Number(v).toLocaleString(LOCALE(), { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }));
const P = (v, d) => (v == null || !isFinite(v) ? '–' : NF(v, d == null ? 1 : d) + '%');
const SIGN = (v, d, suf) => (v == null || !isFinite(v) ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '±') + NF(Math.abs(v), d) + (suf || ''));
function money(v, d) {
  if (v == null || !isFinite(v)) return '–';
  const a = Math.abs(v), s = v < 0 ? '−$' : '$', id = S.lang === 'id';
  if (a >= 1e9) return s + NF(a / 1e9, d == null ? 2 : d) + (id ? ' M' : 'B');
  if (a >= 1e6) return s + NF(a / 1e6, d == null ? 1 : d) + (id ? ' jt' : 'M');
  if (a >= 1e4) return s + NF(a / 1e3, d == null ? 0 : d) + (id ? ' rb' : 'k');
  if (a >= 1e3) return s + NF(a / 1e3, d == null ? 1 : d) + (id ? ' rb' : 'k');
  return s + NF(a, 0);
}
const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
const maxOf = (a, f) => a.reduce((m, x) => Math.max(m, f ? f(x) : x), 0);
const avg = (a, f) => (a.length ? sum(a, f) / a.length : null);
const pct = (n, d) => (d ? (100 * n) / d : null);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

const MONTHS = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] };
const MFULL = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'] };
const mon = (ym) => MONTHS[S.lang][+ym.slice(5, 7) - 1];
const ymLabel = (ym) => mon(ym) + ' ' + ym.slice(0, 4);
const ymShort = (ym) => mon(ym) + ' ' + ym.slice(2, 4);
const ymFull = (ym) => MFULL[S.lang][+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
const fmtDate = (d) => (d ? +d.slice(8, 10) + ' ' + MONTHS[S.lang][+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4) : '–');
const ymAdd = (ym, k) => { const n = +ym.slice(0, 4) * 12 + (+ym.slice(5, 7) - 1) + k; return Math.floor(n / 12) + '-' + String((n % 12) + 1).padStart(2, '0'); };
const mEnd = (ym) => { const y = +ym.slice(0, 4), m = +ym.slice(5, 7); return ym + '-' + String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0'); };
const daysBetween = (a, b) => (Date.parse(b) - Date.parse(a)) / 86400000;

// ------------------------------------------------------------------ labels for dimension values
const LBL = {
  dept: { 'Production': 'Produksi', 'Maintenance & Reliability': 'Pemeliharaan & Keandalan', 'HSE': 'HSE (K3L)', 'Quality & Laboratory': 'Mutu & Laboratorium',
    'Supply Chain': 'Rantai Pasok', 'Engineering & Projects': 'Teknik & Proyek', 'Commercial': 'Komersial', 'Corporate Services': 'Layanan Korporat' },
  loc: { 'Corporate HQ': 'Kantor Pusat', 'Plant A': 'Pabrik A', 'Plant B': 'Pabrik B', 'Plant C': 'Pabrik C' },
  band: { 'Operator': 'Operator', 'Staff': 'Staf', 'Supervisor': 'Supervisor', 'Manager': 'Manajer', 'General Manager': 'General Manager', 'Director': 'Direktur' },
  etype: { 'Permanent': 'Tetap (PKWTT)', 'Contract': 'Kontrak (PKWT)' },
  gender: { 'Male': 'Pria', 'Female': 'Wanita' },
  reason: { 'Resignation': 'Resign', 'Termination': 'PHK', 'End of contract': 'Kontrak berakhir' },
  source: { 'Referral': 'Referensi', 'Job board': 'Portal lowongan', 'LinkedIn': 'LinkedIn', 'Agency': 'Agensi', 'Careers site': 'Situs karier', 'Internal': 'Internal' },
  pot: { 'Low': 'Rendah', 'Medium': 'Sedang', 'High': 'Tinggi' },
  tier: { 'Low': 'Rendah', 'Medium': 'Sedang', 'High': 'Tinggi' },
  comp: { 'Safety Mindset': 'Pola pikir keselamatan', 'Integrity': 'Integritas', 'Collaboration': 'Kolaborasi', 'Continuous Improvement': 'Perbaikan berkelanjutan', 'Customer Focus': 'Fokus pelanggan' },
};
const lbl = (dim, v) => (S.lang === 'id' && LBL[dim] && LBL[dim][v]) ? LBL[dim][v] : (dim === 'etype' && S.lang === 'en' ? v : v);
const SEGS = {
  rising: { en: 'Rising Talent', id: 'Calon Bintang', color: 'var(--purple)' },
  established: { en: 'Established Core', id: 'Inti Mapan', color: 'var(--navy)' },
  ramping: { en: 'New & Ramping', id: 'Karyawan Baru', color: 'var(--orange)' },
  plateaued: { en: 'Plateaued Veterans', id: 'Veteran Stagnan', color: 'var(--sky)' },
};
const segName = (k) => SEGS[k][S.lang];
const COST_TYPES = ['base', 'bonus', 'benefits', 'overtime', 'training', 'others'];
const COST_COL = { base: 'var(--navy)', bonus: 'var(--purple)', benefits: 'var(--lilac)', overtime: 'var(--orange)', training: 'var(--sky)', others: 'var(--grey)' };
const costName = (k) => ({ base: tt('Base pay', 'Gaji pokok'), bonus: tt('Bonus', 'Bonus'), benefits: tt('Benefits', 'Tunjangan & jaminan'),
  overtime: tt('Overtime', 'Lembur'), training: tt('Training', 'Pelatihan'), others: tt('Others', 'Lainnya') }[k]);

// ------------------------------------------------------------------ metric definitions (formula tooltips)
const DEF = {
  headcount: ['Active employees on the date: hired on or before the date and not yet exited. Scheduled exits (notice given) still count.', 'Karyawan aktif pada tanggal itu: sudah masuk dan belum keluar. Yang sudah mengajukan resign (terjadwal) masih dihitung.'],
  net: ['Headcount at period end − headcount at period start = joins − exits.', 'Headcount akhir periode − headcount awal periode = masuk − keluar.'],
  turnover: ['Exits in the period ÷ average month-end headcount × 100. Year-to-date values are also shown annualised (× 12 ÷ months).', 'Keluar dalam periode ÷ rata-rata headcount akhir bulan × 100. Nilai YTD juga ditampilkan setara setahun (× 12 ÷ jumlah bulan).'],
  voluntary: ['Resignations ÷ average headcount × 100.', 'Resign ÷ rata-rata headcount × 100.'],
  involuntary: ['Terminations ÷ average headcount × 100.', 'PHK ÷ rata-rata headcount × 100.'],
  eoc: ['Fixed-term (PKWT) contracts not renewed ÷ average headcount × 100.', 'Kontrak PKWT yang tidak diperpanjang ÷ rata-rata headcount × 100.'],
  regretted: ['Resignations of employees whose last final rating was 4 or 5 ÷ average headcount × 100.', 'Resign karyawan dengan rating akhir terakhir 4 atau 5 ÷ rata-rata headcount × 100.'],
  early: ['Exits with tenure below 12 months ÷ all exits in the period.', 'Keluar dengan masa kerja di bawah 12 bulan ÷ semua yang keluar dalam periode.'],
  tenure: ['Years from hire date to the as-of date (or exit date).', 'Tahun dari tanggal masuk sampai tanggal data (atau tanggal keluar).'],
  contractShare: ['Active employees on a fixed-term (PKWT) contract ÷ active headcount.', 'Karyawan aktif berstatus kontrak (PKWT) ÷ headcount aktif.'],
  femaleShare: ['Active female employees ÷ active headcount.', 'Karyawan wanita aktif ÷ headcount aktif.'],
  revEmp: ['Revenue ÷ average FTE. Target = plan revenue ÷ plan average headcount for the year.', 'Revenue ÷ rata-rata FTE. Target = revenue rencana ÷ rata-rata headcount rencana tahun itu.'],
  ebitdaEmp: ['EBITDA ÷ average FTE. Target = plan EBITDA ÷ plan average headcount.', 'EBITDA ÷ rata-rata FTE. Target = EBITDA rencana ÷ rata-rata headcount rencana.'],
  tonFte: ['Production volume (tonnes) ÷ average FTE. A physical productivity measure that is not affected by polymer prices.', 'Volume produksi (ton) ÷ rata-rata FTE. Ukuran produktivitas fisik yang tidak terpengaruh harga polimer.'],
  mcTon: ['Manpower cost ÷ production volume (tonnes).', 'Manpower cost ÷ volume produksi (ton).'],
  hcroi: ['Human Capital ROI = (EBITDA + manpower cost) ÷ manpower cost. Value created per $1 spent on people.', 'Human Capital ROI = (EBITDA + manpower cost) ÷ manpower cost. Nilai yang dihasilkan per $1 biaya karyawan.'],
  otBase: ['Overtime cost ÷ base pay × 100.', 'Biaya lembur ÷ gaji pokok × 100.'],
  mc: ['Manpower cost = Base pay + Bonus + Benefits + Overtime + Training + Others.', 'Manpower cost = Gaji pokok + Bonus + Tunjangan & jaminan + Lembur + Pelatihan + Lainnya.'],
  mcRev: ['Manpower cost ÷ revenue × 100. With a department filter it shows the department\'s cost as a share of company revenue.', 'Manpower cost ÷ revenue × 100. Bila difilter per department, angkanya adalah biaya department itu sebagai porsi revenue perusahaan.'],
  cpf: ['Manpower cost ÷ average FTE, annualised.', 'Manpower cost ÷ rata-rata FTE, disetahunkan.'],
  mcEbitda: ['Manpower cost ÷ EBITDA × 100.', 'Manpower cost ÷ EBITDA × 100.'],
  bridge: ['Headcount effect = (FTE₁ − FTE₀) × cost per FTE₀. Rate effect = (cost per FTE₁ − cost per FTE₀) × FTE₁. The two add up exactly to the change in manpower cost.', 'Efek headcount = (FTE₁ − FTE₀) × biaya per FTE₀. Efek tarif = (biaya per FTE₁ − biaya per FTE₀) × FTE₁. Jumlah keduanya persis sama dengan perubahan manpower cost.'],
  budgetVar: ['(Actual manpower cost − budget) ÷ budget × 100, year to date. Positive = over budget.', '(Manpower cost aktual − budget) ÷ budget × 100, sejak awal tahun. Positif = di atas budget.'],
  hires: ['Requisitions filled (offer accepted) in the period.', 'Requisition yang terisi (offer diterima) dalam periode.'],
  openReqs: ['Requisitions open on the as-of date.', 'Requisition yang masih terbuka pada tanggal data.'],
  funnel: ['Applicants → Screened → Interviewed → Offered → Hired, for external requisitions filled in the period. Conversion = stage ÷ previous stage.', 'Pelamar → Lolos seleksi berkas → Wawancara → Offer → Diterima, untuk requisition eksternal yang terisi dalam periode. Konversi = tahap ÷ tahap sebelumnya.'],
  ttf: ['Offer-accepted date − requisition opened date, in calendar days, for requisitions filled in the period.', 'Tanggal offer diterima − tanggal requisition dibuka, dalam hari kalender, untuk requisition yang terisi dalam periode.'],
  oar: ['Accepted offers ÷ offers extended × 100.', 'Offer diterima ÷ offer diberikan × 100.'],
  cph: ['(Advertising + agency fees + referral bonuses + recruiter time + assessment & medical checks) ÷ hires.', '(Iklan + fee agensi + bonus referensi + waktu rekruter + asesmen & cek kesehatan) ÷ jumlah hire.'],
  source: ['Per hiring source: hires, applicant-to-hire conversion, time-to-fill, cost-per-hire and quality of hire.', 'Per sumber rekrutmen: jumlah hire, konversi pelamar ke hire, time-to-fill, cost-per-hire, dan quality of hire.'],
  aging: ['As-of date − opened date for open requisitions, grouped by days open.', 'Tanggal data − tanggal dibuka untuk requisition yang masih terbuka, dikelompokkan per lama terbuka.'],
  qoh: ['External hires with at least 12 months since joining: 50 × (first final rating ÷ 5) + 50 × (still employed at 12 months). Hires who left before their first review count as rating 2. Scale 0–100.', 'Hire eksternal yang sudah minimal 12 bulan: 50 × (rating akhir pertama ÷ 5) + 50 × (masih bekerja di bulan ke-12). Yang keluar sebelum penilaian pertama dihitung rating 2. Skala 0–100.'],
  internalFill: ['Requisitions filled by an internal candidate ÷ requisitions filled × 100.', 'Requisition yang diisi kandidat internal ÷ requisition terisi × 100.'],
  kpi: ['Average achievement of the employee\'s KPI targets, capped at 150%.', 'Rata-rata pencapaian target KPI karyawan, maksimal 150%.'],
  behavior: ['Average of five competencies rated 1–5: Safety Mindset, Integrity, Collaboration, Continuous Improvement, Customer Focus.', 'Rata-rata lima kompetensi bernilai 1–5: pola pikir keselamatan, integritas, kolaborasi, perbaikan berkelanjutan, fokus pelanggan.'],
  finalRating: ['Final rating = 70% KPI score + 30% behavioral score, mapped to 1 (Unsatisfactory) … 5 (Outstanding). KPI score: 60% achievement → 1, 80% → 2, 95% → 3, 108% → 4, 125% → 5.', 'Rating akhir = 70% skor KPI + 30% skor perilaku, dipetakan ke 1 (Tidak memuaskan) … 5 (Istimewa). Skor KPI: pencapaian 60% → 1, 80% → 2, 95% → 3, 108% → 4, 125% → 5.'],
  whatHow: ['KPI score (what is delivered) × behavioral score (how it is delivered). Low < 2.75, High ≥ 3.75.', 'Skor KPI (apa yang dicapai) × skor perilaku (bagaimana mencapainya). Rendah < 2,75, Tinggi ≥ 3,75.'],
  nineBox: ['Final rating (1–2 Low, 3 Medium, 4–5 High) × potential (Low/Medium/High), latest completed review cycle.', 'Rating akhir (1–2 Rendah, 3 Sedang, 4–5 Tinggi) × potensi (Rendah/Sedang/Tinggi), siklus penilaian terakhir yang selesai.'],
  goal: ['Mean KPI achievement and the share of employees at 100% or more.', 'Rata-rata pencapaian KPI dan porsi karyawan yang mencapai 100% atau lebih.'],
  promo: ['Promotions (move to a higher job band) in the period ÷ average headcount × 100.', 'Promosi (naik ke job band lebih tinggi) dalam periode ÷ rata-rata headcount × 100.'],
  trainH: ['Training hours in the period ÷ average headcount.', 'Jam pelatihan dalam periode ÷ rata-rata headcount.'],
  trainS: ['Training cost (the Training line of manpower cost) ÷ average headcount.', 'Biaya pelatihan (baris Pelatihan di manpower cost) ÷ rata-rata headcount.'],
  succession: ['Key positions with at least one ready-now successor ÷ key positions. Key positions: General Manager and Director roles, and Managers in Production, Maintenance & Reliability and HSE.', 'Posisi kunci dengan minimal satu penerus siap sekarang ÷ jumlah posisi kunci. Posisi kunci: General Manager dan Direktur, serta Manajer di Produksi, Pemeliharaan & Keandalan, dan HSE.'],
  compa: ['Annual base pay ÷ midpoint of the job band. Midpoints rise 4.5% every January.', 'Gaji pokok setahun ÷ titik tengah (midpoint) job band. Midpoint naik 4,5% setiap Januari.'],
  forecast: ['Ordinary least squares on monthly history: linear trend + 11 month-of-year dummies (cost and revenue on the log scale). Band = 80% prediction interval.', 'Regresi linear (OLS) pada riwayat bulanan: tren linear + 11 dummy bulan (biaya dan revenue dalam skala log). Pita = interval prediksi 80%.'],
  risk: ['Logistic regression: probability of resigning within 12 months from tenure, compa-ratio, last final rating, months since promotion and training hours. Tier High ≥ 2 × base rate, Medium ≥ base rate.', 'Regresi logistik: peluang resign dalam 12 bulan dari masa kerja, compa-ratio, rating akhir terakhir, bulan sejak promosi, dan jam pelatihan. Tier Tinggi ≥ 2 × tingkat dasar, Sedang ≥ tingkat dasar.'],
  segments: ['K-Means (k = 4) on standardised tenure, compa-ratio, last rating, months since promotion, training hours and potential. Names come from rules on the cluster centres.', 'K-Means (k = 4) pada fitur terstandar: masa kerja, compa-ratio, rating terakhir, bulan sejak promosi, jam pelatihan, dan potensi. Nama berasal dari aturan pada pusat cluster.'],
};
const INFO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/></svg>';
const info = (k) => `<button type="button" class="info" data-def="${k}" aria-label="${esc(tt('How this is calculated', 'Cara menghitung'))}">${INFO_SVG}</button>`;

// ------------------------------------------------------------------ data
const FILES = window.CORE_FILES || ['meta', 'employees', 'moves', 'cost_monthly', 'budget_monthly', 'finance_monthly', 'production_monthly',
  'requisitions', 'key_positions', 'model_forecast', 'model_attrition', 'model_segments'];
function decode(t) {
  if (!t || !t.columns) return t;
  const c = t.columns, dm = t.dims || {};
  return t.rows.map((r) => { const o = {}; for (let i = 0; i < c.length; i++) { const v = r[i]; o[c[i]] = dm[c[i]] && v != null ? dm[c[i]][v] : v; } return o; });
}
const DB = { Y: null, YMAP: null };
const getJSON = (f) => (window.PRE && window.PRE[f]) || fetch('data/' + f + '.json').then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
async function loadAll() {
  const res = await Promise.all(FILES.map(getJSON));
  const o = {}; FILES.forEach((f, i) => { o[f] = res[i]; });
  DB.meta = o.meta;
  DB.E = decode(o.employees); DB.MV = decode(o.moves); DB.C = decode(o.cost_monthly);
  DB.B = decode(o.budget_monthly); DB.FIN = decode(o.finance_monthly); DB.PROD = decode(o.production_monthly);
  DB.Q = decode(o.requisitions); DB.K = decode(o.key_positions); DB.FC = o.model_forecast; DB.AT = o.model_attrition; DB.SG = o.model_segments;
  DB.AT.rows = decode(DB.AT.scores); DB.SG.rows = decode(DB.SG.assign);
  const m = DB.meta;
  DB.AS_OF = m.as_of; DB.LAST = m.last_closed_month; DB.NOW_M = m.as_of.slice(0, 7);
  DB.MONTHS = []; for (let k = m.window_start.slice(0, 7); k <= DB.LAST; k = ymAdd(k, 1)) DB.MONTHS.push(k);
  DB.EMAP = {}; DB.E.forEach((e) => { DB.EMAP[e.emp_id] = e; });
  DB.RISK = {}; DB.AT.rows.forEach((r) => { DB.RISK[r.emp_id] = r; });
  DB.SEG = {}; DB.SG.rows.forEach((r) => { DB.SEG[r.emp_id] = r.segment; });
  DB.FINM = {}; DB.FIN.forEach((f) => { DB.FINM[f.month] = f; });
  DB.LAST_FY = String(+DB.LAST.slice(0, 4) - (DB.LAST.slice(5) === '12' ? 0 : 1));
  DB.CYCLE = m.latest_review_cycle;
  DB.PLANS = {}; m.plans.forEach((p) => { DB.PLANS[p.year] = p; });
  DB.DIMS = { dept: m.dims.dept, loc: m.dims.loc, etype: m.dims.etype, band: m.dims.band, gender: m.dims.gender };
}
// review-cycle history is the largest file and only a few pages need it, so it loads after first paint
let yPromise = null;
function loadYears() {
  if (!yPromise) yPromise = getJSON('emp_years').then((t) => { DB.Y = decode(t); DB.YMAP = {}; DB.Y.forEach((y) => { (DB.YMAP[y.emp_id] = DB.YMAP[y.emp_id] || {})[y.year] = y; }); });
  return yPromise;
}

// ------------------------------------------------------------------ filters & periods
const active = (e, d) => e.hire_date <= d && (!e.exit_date || e.exit_date > d);
const passE = (e) => { const F = S.F; return (!F.dept || F.dept.has(e.dept)) && (!F.loc || F.loc.has(e.loc)) && (!F.etype || F.etype.has(e.etype)) && (!F.band || F.band.has(e.band)) && (!F.gender || F.gender.has(e.gender)); };
const passC = (c) => { const F = S.F; return (!F.dept || F.dept.has(c.dept)) && (!F.loc || F.loc.has(c.loc)) && (!F.etype || F.etype.has(c.etype)) && (!F.band || F.band.has(c.band)); };
const passQ = (q) => { const F = S.F; return (!F.dept || F.dept.has(q.dept)) && (!F.loc || F.loc.has(q.loc)) && (!F.band || F.band.has(q.band)); };
const anyFilter = () => Object.keys(S.F).some((k) => S.F[k]);

function periodMonths(which) {
  const p = which || S.period, M = DB.MONTHS;
  if (p === 'ttm') return M.slice(-12);
  if (p === 'ytd') { const y = DB.LAST.slice(0, 4); return M.filter((m) => m.startsWith(y)); }
  return M.filter((m) => m.startsWith(DB.LAST_FY));
}
const priorMonths = (ms) => ms.map((m) => ymAdd(m, -12)).filter((m) => m >= DB.MONTHS[0]);
const periodLabel = () => (S.period === 'ttm' ? tt('Last 12 months', '12 bulan terakhir') : S.period === 'ytd' ? 'YTD ' + DB.LAST.slice(0, 4) : 'FY' + DB.LAST_FY);
const vsTarget = (g) => (g >= 0 ? P(g) + tt(' above target', ' di atas target') : P(-g) + tt(' below target', ' di bawah target'));
const periodName = () => (S.period === 'ttm' ? tt('last 12 months', '12 bulan terakhir') : S.period === 'ytd' ? tt('year to date', 'sejak awal tahun') : 'FY' + DB.LAST_FY);
function periodRange(ms) { ms = ms || periodMonths(); return ms.length ? (ms.length === 1 ? ymLabel(ms[0]) : ymShort(ms[0]) + ' – ' + ymShort(ms[ms.length - 1])) : ''; }

// cached aggregates, rebuilt when filters change
const AG = { key: null };
function rebuild() {
  const key = JSON.stringify(Object.keys(S.F).map((k) => (S.F[k] ? Array.from(S.F[k]).sort() : null)));
  if (AG.key === key) return;
  AG.key = key;
  AG.E = DB.E.filter(passE);
  AG.hcEnd = {};
  DB.MONTHS.forEach((m) => { const d = mEnd(m); AG.hcEnd[m] = AG.E.reduce((n, e) => n + (active(e, d) ? 1 : 0), 0); });
  AG.hcNow = AG.E.reduce((n, e) => n + (active(e, DB.AS_OF) ? 1 : 0), 0);
  AG.cost = {};
  DB.MONTHS.forEach((m) => { AG.cost[m] = { base: 0, bonus: 0, benefits: 0, overtime: 0, training: 0, others: 0, fte: 0, hc: 0, th: 0, mc: 0 }; });
  AG.costDept = {};
  DB.C.forEach((c) => {
    if (!passC(c)) return; const a = AG.cost[c.month]; if (!a) return;
    const mc = c.base + c.bonus + c.benefits + c.overtime + c.training + c.others;
    COST_TYPES.forEach((t) => { a[t] += c[t]; }); a.fte += c.fte; a.hc += c.headcount_end; a.th += c.training_hours; a.mc += mc;
    const k = c.dept + '|' + c.month; const dd = AG.costDept[k] || (AG.costDept[k] = { mc: 0, fte: 0, hc: 0, th: 0, training: 0 });
    dd.mc += mc; dd.fte += c.fte; dd.hc += c.headcount_end; dd.th += c.training_hours; dd.training += c.training;
  });
  AG.Q = DB.Q.filter(passQ);
}
const avgHC = (ms) => avg(ms, (m) => AG.hcEnd[m]);
const exitsIn = (ms, E) => { const a = ms[0], b = ms[ms.length - 1]; return (E || AG.E).filter((e) => e.exit_date && e.exit_date.slice(0, 7) >= a && e.exit_date.slice(0, 7) <= b && e.exit_date <= DB.AS_OF); };
const joinsIn = (ms, E) => { const a = ms[0], b = ms[ms.length - 1]; return (E || AG.E).filter((e) => e.hire_date.slice(0, 7) >= a && e.hire_date.slice(0, 7) <= b && e.hire_date <= DB.AS_OF); };
const csum = (ms, k) => sum(ms, (m) => (AG.cost[m] ? AG.cost[m][k] : 0));
const cavgFte = (ms) => avg(ms, (m) => AG.cost[m].fte);
const finSum = (ms, k) => sum(ms, (m) => (DB.FINM[m] ? DB.FINM[m][k] : 0));
function turnover(ms, filterFn) {
  const E = filterFn ? AG.E.filter(filterFn) : AG.E;
  const avgH = filterFn ? avg(ms, (m) => { const d = mEnd(m); return E.reduce((n, e) => n + (active(e, d) ? 1 : 0), 0); }) : avgHC(ms);
  const ex = exitsIn(ms, E);
  return { rate: avgH ? (100 * ex.length) / avgH : null, n: ex.length, avg: avgH, ex };
}
function lastRating(id, beforeYear) {
  const ys = DB.YMAP[id]; if (!ys) return null; let best = null;
  Object.keys(ys).forEach((y) => { if (ys[y].final_rating != null && +y < beforeYear && (best == null || +y > best)) best = +y; });
  return best == null ? null : ys[best].final_rating;
}
const annualise = (v, ms) => (v == null ? null : (v * 12) / ms.length);

// ------------------------------------------------------------------ small markup helpers
const card = (inner, cls, i) => `<section class="card fade ${cls || ''}" style="--i:${i || 0}">${inner}</section>`;
const head2 = (h, sub, right, def) => `<div class="card-head"><div><h2>${h}${def ? info(def) : ''}</h2>${sub ? `<p class="note">${sub}</p>` : ''}</div>${right || ''}</div>`;
const legend = (items) => `<div class="legend">${items.map((x) => x[2] === 'line' ? `<span><i class="ln" style="border-color:${x[1]}"></i>${x[0]}</span>` : `<span><i style="background:${x[1]}"></i>${x[0]}</span>`).join('')}</div>`;
const cnt = (v, d, pre, suf) => `<span class="cnt" data-count="${v == null || !isFinite(v) ? '' : v}" data-dec="${d || 0}" data-pre="${pre || ''}" data-suf="${esc(suf || '')}">${v == null || !isFinite(v) ? '–' : (pre || '') + NF(v, d) + (suf || '')}</span>`;
const stat = (label, valueHtml, sub, cls, def) => `<div class="stat"><span class="stat-label">${label}${def ? info(def) : ''}</span><span class="stat-value ${cls || ''}">${valueHtml}</span><span class="stat-sub">${sub || '&nbsp;'}</span></div>`;
const empty = (msg) => `<div class="empty">${msg || tt('No data for this filter combination.', 'Tidak ada data untuk kombinasi filter ini.')}</div>`;
const tipAttr = (t, rows) => ` data-tip="${esc(JSON.stringify([t, rows || []]))}"`;
const pill = (v, txt) => `<span class="${v > 0 ? 'pill-up' : v < 0 ? 'pill-down' : 'pill-flat'}">${txt}</span>`;
function hero(label, valueHtml, pillHtml, sideLabel, sideVal, def) {
  return `<div class="hero fade" style="--i:0"><div class="hero-row"><div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="hero-label">${label}${def ? info(def) : ''}</span><span class="hero-value">${valueHtml}</span>${pillHtml || ''}</div>
    ${sideLabel ? `<div class="hero-side"><span>${sideLabel}</span><b>${sideVal}</b></div>` : ''}</div></div>`;
}
const lead = (heroHtml, stats) => `<section class="lead" aria-label="${esc(tt('Key figures', 'Angka utama'))}">${heroHtml}<div class="strip fade" style="--i:1">${stats.join('')}</div></section>`;
function sowhat(items) {
  const cols = ['var(--purple)', 'var(--orange)', 'var(--navy)'];
  return `<section class="sowhat fade" style="--i:2" aria-label="So what"><h2>${tt('So what?', 'Jadi, apa artinya?')}</h2><div class="sw-list">${items.filter(Boolean).slice(0, 3).map((x, i) =>
    `<div class="sw-item"><span class="dot" style="background:${cols[i]}"></span><div><p>${x[0]}</p><p class="sw-act"><b>${tt('Action', 'Aksi')}:</b> ${x[1]}</p></div></div>`).join('')}</div></section>`;
}
const filtersNote = (msg) => `<p class="note fade" style="--i:3">${msg}</p>`;

// width of a chart drawing area (px) so SVG text renders at its real size
function chartW(span) {
  const cw = S.CW, wide = cw >= 776;
  if (span === 'full' || !wide) return Math.max(280, cw - 44);
  if (span === 'third') return cw >= 1100 ? (cw - 32) / 3 - 44 : wide ? (cw - 16) / 2 - 44 : cw - 44;
  return (cw - 16) / 2 - 44;
}
function niceTicks(lo, hi, n) {
  if (hi === lo) { hi = lo + 1; }
  const raw = (hi - lo) / (n || 4), mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const st = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => raw <= s) || 10 * mag;
  const a = Math.floor(lo / st) * st, b = Math.ceil(hi / st) * st, out = [];
  for (let v = a; v <= b + st * 1e-6; v += st) out.push(+v.toFixed(10));
  return out;
}

// ------------------------------------------------------------------ line chart (SVG, pixel-accurate)
// opts: {labels, series:[{name, color, vals, dash, area, w}], band:{lo,hi,color}, fmt, w, h, tip(i), yMin, yMax, mark:[{i,text}], refBand:{lo,hi,text}}
function lineChart(o) {
  const n = o.labels.length; const W = Math.round(o.w || 520);
  const all = []; o.series.forEach((s) => s.vals.forEach((v) => { if (v != null && isFinite(v)) all.push(v); }));
  if (o.band) { o.band.lo.forEach((v) => v != null && all.push(v)); o.band.hi.forEach((v) => v != null && all.push(v)); }
  if (o.refBand) all.push(o.refBand.lo, o.refBand.hi);
  if (!all.length) return empty();
  let lo = o.yMin != null ? o.yMin : Math.min.apply(null, all), hi = o.yMax != null ? o.yMax : Math.max.apply(null, all);
  const pad = (hi - lo) * 0.08 || 1; if (o.yMin == null) lo -= pad; if (o.yMax == null) hi += pad;
  const ticks = niceTicks(lo, hi, 4); lo = ticks[0]; hi = ticks[ticks.length - 1];
  const fmt = o.fmt || ((v) => NF(v));
  const tw = Math.max.apply(null, ticks.map((t) => fmt(t).length)) * 7 + 12;
  const X0 = tw + 4, X1 = W - 10, step = n > 1 ? (X1 - X0) / (n - 1) : 0;
  const lblTxt = o.labels.map((l, i) => (o.xfmt ? o.xfmt(l, i) : (i === 0 || l.endsWith('-01') ? ymShort(l) : mon(l))));
  const lw = Math.max.apply(null, lblTxt.map((t) => t.length)) * 6.4 + 6;
  const rot = n > 1 && step < lw;
  const H = o.h || 210, Y0 = 14, Y1 = H - (rot ? lw + 10 : 28);
  const x = (i) => (n === 1 ? (X0 + X1) / 2 : X0 + i * step), y = (v) => Y1 - ((v - lo) / (hi - lo)) * (Y1 - Y0);
  let g = '';
  ticks.forEach((t) => { g += `<line x1="${X0}" y1="${y(t).toFixed(1)}" x2="${X1}" y2="${y(t).toFixed(1)}" stroke="#EEF0F3"/><text x="${X0 - 8}" y="${(y(t) + 4).toFixed(1)}" font-size="12" fill="#5B6170" text-anchor="end">${esc(fmt(t))}</text>`; });
  if (o.refBand) g += `<rect x="${X0}" y="${y(o.refBand.hi).toFixed(1)}" width="${X1 - X0}" height="${(y(o.refBand.lo) - y(o.refBand.hi)).toFixed(1)}" fill="rgba(18,146,90,.07)"/>`;
  (o.shade || []).forEach((sh) => { g += `<rect x="${(x(sh.i) - step / 2).toFixed(1)}" y="${Y0}" width="${Math.max(step, 4).toFixed(1)}" height="${Y1 - Y0}" fill="${sh.color || 'rgba(240,138,0,.10)'}"/>`; });
  if (o.band) {
    const idx = []; o.band.lo.forEach((v, i) => { if (v != null) idx.push(i); });
    if (idx.length) g += `<polygon class="area" fill="${o.band.color || 'rgba(120,71,145,.14)'}" points="${idx.map((i) => x(i).toFixed(1) + ',' + y(o.band.hi[i]).toFixed(1)).join(' ')} ${idx.slice().reverse().map((i) => x(i).toFixed(1) + ',' + y(o.band.lo[i]).toFixed(1)).join(' ')}"/>`;
  }
  o.series.forEach((s) => {
    const seg = []; let cur = [];
    s.vals.forEach((v, i) => { if (v == null || !isFinite(v)) { if (cur.length) seg.push(cur); cur = []; } else cur.push([x(i), y(v)]); });
    if (cur.length) seg.push(cur);
    seg.forEach((pts) => {
      const ps = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      if (s.area && pts.length > 1) g += `<polygon class="area" fill="${s.area}" points="${pts[0][0].toFixed(1)},${Y1} ${ps} ${pts[pts.length - 1][0].toFixed(1)},${Y1}"/>`;
      g += pts.length > 1 ? `<polyline class="draw" pathLength="1" fill="none" stroke="${s.color}" stroke-width="${s.w || 2.5}" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="6 5"' : ''} points="${ps}"/>`
        : `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="4" fill="${s.color}"/>`;
    });
  });
  (o.dots || []).forEach((d) => { if (d.v != null) g += `<circle class="area" cx="${x(d.i).toFixed(1)}" cy="${y(d.v).toFixed(1)}" r="4.5" fill="${d.color}" stroke="#fff" stroke-width="2"/>`; });
  lblTxt.forEach((t, i) => {
    g += rot ? `<text x="${x(i).toFixed(1)}" y="${Y1 + 8}" font-size="11" fill="#5B6170" text-anchor="end" transform="rotate(-90 ${x(i).toFixed(1)} ${Y1 + 8})" dominant-baseline="middle">${esc(t)}</text>`
      : `<text x="${x(i).toFixed(1)}" y="${Y1 + 18}" font-size="12" fill="#5B6170" text-anchor="middle">${esc(t)}</text>`;
  });
  const tipData = { p: o.labels.map((_, i) => { const v = o.series.map((s) => s.vals[i]).find((q) => q != null && isFinite(q)); return [+x(i).toFixed(1), v == null ? Y1 : +y(v).toFixed(1)]; }),
    t: o.labels.map((_, i) => (o.tip ? o.tip(i) : [lblTxt[i], o.series.filter((s) => s.vals[i] != null).map((s) => [s.name, fmt(s.vals[i])])])) };
  return `<svg class="chart" data-line="${esc(JSON.stringify(tipData))}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${g}
    <line class="hv-line" x1="0" x2="0" y1="${Y0}" y2="${Y1}" stroke="#9AA3B2" stroke-width="1.5" stroke-dasharray="4 4" visibility="hidden"/><circle class="hv-dot" r="5.5" fill="#fff" stroke="var(--purple)" stroke-width="3" visibility="hidden"/></svg>`;
}

// ------------------------------------------------------------------ column charts (HTML)
// items: [{label, v, color, text, tip, tick}]  opts: {h, w, scale}
function colChart(items, o) {
  o = o || {}; if (!items.length || !items.some((x) => x.v)) return empty();
  const n = items.length, w = o.w || 500, gap = n > 18 ? 3 : n > 10 ? 6 : 12, colW = (w - gap * (n - 1)) / n;
  const mx = Math.max(maxOf(items, (x) => x.v), maxOf(items, (x) => x.tick || 0));
  const maxLen = maxOf(items, (x) => String(x.label).length);
  const vert = colW < Math.min(maxLen, 14) * 6.6;
  const showV = o.showV !== false && colW >= 26;
  const tpl = `repeat(${n},minmax(0,1fr))`, h = o.h || 180, sc = o.scale || 0.86;
  const cols = items.map((x, i) => `<div class="col"${x.tip ? tipAttr(x.tip[0], x.tip[1]) : ''}>${showV ? `<span class="v">${x.text != null ? x.text : NF(x.v)}</span>` : ''}<div class="b gy" style="height:${x.v ? Math.max(1.5, (100 * x.v / mx) * sc) : 0}%;background:${x.color || 'var(--purple)'};${colW < 20 ? 'width:78%;' : ''}--i:${i}"></div>${x.tick ? `<span class="tk" style="bottom:${(100 * x.tick / mx) * sc}%"></span>` : ''}</div>`).join('');
  const xl = items.map((x) => `<span${vert ? ' style="writing-mode:vertical-rl;transform:rotate(180deg);text-align:right;margin:0 auto;font-size:11px;line-height:1"' : ''}>${esc(x.label)}</span>`).join('');
  return `<div style="display:flex;flex-direction:column"><div class="cols" style="grid-template-columns:${tpl};gap:${gap}px;height:${h}px">${cols}</div><div class="xlabels" style="grid-template-columns:${tpl};gap:${gap}px">${xl}</div></div>`;
}
// stacked columns: items [{label, parts:[v,...], tip}] colors [..]
function stackCols(items, colors, o) {
  o = o || {}; const tot = items.map((x) => sum(x.parts)); if (!items.length || !maxOf(tot)) return empty();
  const n = items.length, w = o.w || 500, gap = n > 18 ? 3 : n > 10 ? 6 : 12, colW = (w - gap * (n - 1)) / n;
  const mx = maxOf(tot), h = o.h || 190, maxLen = maxOf(items, (x) => String(x.label).length), vert = colW < Math.min(maxLen, 14) * 6.6;
  const tpl = `repeat(${n},minmax(0,1fr))`;
  const cols = items.map((x, i) => `<div class="col"${x.tip ? tipAttr(x.tip[0], x.tip[1]) : ''}>${!o.hideV && colW >= 34 ? `<span class="v">${o.fmtT ? o.fmtT(tot[i]) : NF(tot[i])}</span>` : ''}<div class="stk gy" style="height:${(100 * tot[i] / mx) * 0.86}%;${colW < 20 ? 'width:80%;' : ''}--i:${i}">${x.parts.map((p, j) => `<div style="height:${tot[i] ? (100 * p) / tot[i] : 0}%;background:${colors[j]}"></div>`).join('')}</div></div>`).join('');
  const xl = items.map((x) => `<span${vert ? ' style="writing-mode:vertical-rl;transform:rotate(180deg);text-align:right;margin:0 auto;font-size:11px;line-height:1"' : ''}>${esc(x.label)}</span>`).join('');
  return `<div style="display:flex;flex-direction:column"><div class="cols" style="grid-template-columns:${tpl};gap:${gap}px;height:${h}px">${cols}</div><div class="xlabels" style="grid-template-columns:${tpl};gap:${gap}px">${xl}</div></div>`;
}
// horizontal bars: rows [{label, v, text, color, mk, faded, tip, sub}]
function hbars(rows, o) {
  o = o || {}; if (!rows.length) return empty();
  const mx = o.max || Math.max(maxOf(rows, (r) => r.v), maxOf(rows, (r) => r.mk || 0)) || 1;
  return `<div class="hbars">${rows.map((r, i) => `<div class="hrow"${r.tip ? tipAttr(r.tip[0], r.tip[1]) : ''}><div class="hrow-top"><span>${esc(r.label)}</span><span><b>${r.text != null ? r.text : NF(r.v)}</b>${r.sub ? ` <span class="note">${r.sub}</span>` : ''}</span></div>
    <div class="track"><div class="f gx" style="width:${clamp((100 * r.v) / mx, 0, 100)}%;background:${r.color || 'var(--purple)'};--i:${i};${r.faded ? 'opacity:.45' : ''}"></div>${r.mk != null ? `<span class="mk" style="left:${clamp((100 * r.mk) / mx, 0, 100)}%"></span>` : ''}</div></div>`).join('')}</div>`;
}
// diverging bars around zero: rows [{label, v, text, tip}]
function divBars(rows, o) {
  o = o || {}; if (!rows.length) return empty();
  const mx = o.max || maxOf(rows, (r) => Math.abs(r.v)) || 1;
  return `<div class="hbars" style="gap:10px">${rows.map((r, i) => { const w = (50 * Math.min(Math.abs(r.v), mx)) / mx; const pos = r.v >= 0;
    const col = r.color || (pos === !o.goodNeg ? 'var(--orange)' : 'var(--purple)');
    return `<div class="div-row"${r.tip ? tipAttr(r.tip[0], r.tip[1]) : ''}><span title="${esc(r.label)}">${esc(r.label)}</span><div class="div-track"><span class="z"></span><div class="bar gx" style="${pos ? `left:50%` : `left:${50 - w}%`};width:${w}%;background:${col};--i:${i};transform-origin:${pos ? 'left' : 'right'}"></div></div><span class="${pos ? (o.goodNeg ? 'c-orange' : '') : ''}">${r.text}</span></div>`; }).join('')}</div>`;
}
// 100% stacked rows: rows [{label, parts:[v..], tips:[..]}]
function stackRows(rows, colors, names) {
  if (!rows.length) return empty();
  return `<div class="hbars" style="gap:10px">${rows.map((r) => { const t = sum(r.parts) || 1; return `<div class="srow"><span title="${esc(r.label)}">${esc(r.label)}</span><div class="stack">${r.parts.map((p, j) => p ? `<div style="width:${(100 * p) / t}%;background:${colors[j]};color:${/navy|purple/.test(colors[j]) ? '#fff' : '#1F2937'}"${tipAttr(r.label, [[names[j], NF(p) + ' · ' + P((100 * p) / t)]])}>${(100 * p) / t >= 12 ? NF((100 * p) / t, 0) + '%' : ''}</div>` : '').join('')}</div></div>`; }).join('')}</div>`;
}
// joins (up) vs exits (down, two parts)
function flowChart(rows, o) {
  o = o || {}; if (!rows.length) return empty();
  const mj = maxOf(rows, (r) => r.up), ml = maxOf(rows, (r) => r.d1 + r.d2), s = Math.min(mj ? 100 / mj : 99, ml ? 66 / ml : 99, 12);
  const cols = rows.map((r, i) => `<div class="flow-col"${tipAttr(r.tipT, r.tip)}><div class="flow-up"><span class="v" style="color:var(--purple-ink)">${r.up ? '+' + r.up : ''}</span><div class="flow-bar gy" style="height:${r.up * s}px;background:var(--purple);border-radius:5px 5px 2px 2px;--i:${i}"></div></div>
    <div class="flow-zero"></div><div class="flow-dn"><div class="gyd" style="display:flex;flex-direction:column;align-items:center;width:100%;--i:${i}"><div class="flow-bar" style="height:${r.d1 * s}px;background:var(--orange);border-radius:${r.d2 ? '2px 2px 0 0' : '0 0 5px 5px'}"></div><div class="flow-bar" style="height:${r.d2 * s}px;background:var(--navy);border-radius:0 0 5px 5px"></div></div>
    <span class="v" style="color:var(--orange-ink);margin-top:4px">${r.d1 + r.d2 ? '−' + (r.d1 + r.d2) : ''}</span></div><span class="xl">${esc(r.label)}</span></div>`).join('');
  return `<div class="scrollx"><div class="flow" style="min-width:${Math.max(280, rows.length * 34)}px;grid-template-columns:repeat(${rows.length},minmax(0,1fr))">${cols}</div></div>`;
}
