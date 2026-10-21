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
const GUIDE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>';
const PAGES = {
  overview: { nav: ['Executive Overview', 'Ringkasan Eksekutif'], fn: () => pgOverview(), period: true, filters: true,
    sub: () => tt(`A health check of the company: how many people work here, what each person produces, what people cost and how many leave (${periodName()})`, `Pemeriksaan kesehatan perusahaan: berapa orang bekerja, apa yang dihasilkan tiap orang, berapa biaya karyawan, dan berapa yang keluar (${periodName()})`),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('A one-page summary for leaders: the number of employees, how much business each person brings in, what employees cost, and how many people leave.', 'Ringkasan satu halaman untuk pimpinan: jumlah karyawan, seberapa besar bisnis yang dihasilkan tiap orang, biaya karyawan, dan berapa yang keluar.')],
      [tt('How to read it', 'Cara membacanya'), tt('The dark box is the headline number; the white boxes next to it support it. Orange means "keep an eye on this", green means "on or better than target".', 'Kotak gelap adalah angka utama; kotak putih di sebelahnya pendukungnya. Oranye berarti "perlu diperhatikan", hijau berarti "sesuai atau lebih baik dari target".')],
      [tt('Where to start', 'Mulai dari mana'), tt('Read the "So what?" box: it says in plain words what the numbers mean and what to do. Then use the filters to look at one department or location.', 'Baca kotak "Jadi, apa artinya?": isinya arti angka dalam bahasa biasa beserta saran tindakan. Lalu pakai filter untuk melihat satu department atau lokasi.')]] },
  headcount: { nav: ['Headcount & Department', 'Headcount & Department'], fn: () => pgHeadcount(), period: false, filters: true,
    sub: () => tt('Who works here today: by department, job level, contract type and years at the company', 'Siapa yang bekerja hari ini: per department, level jabatan, jenis kontrak, dan lama bekerja'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('A snapshot of everyone employed today, split by department, job level, permanent or contract status, and years at the company.', 'Potret semua karyawan hari ini, dibagi per department, level jabatan, status tetap atau kontrak, dan lama bekerja.')],
      [tt('How to read it', 'Cara membacanya'), tt('Longer bars or taller columns mean more people. In the monthly chart, navy is permanent staff and orange is staff on a fixed-term contract.', 'Batang lebih panjang atau kolom lebih tinggi berarti lebih banyak orang. Pada grafik bulanan, biru tua adalah karyawan tetap dan oranye karyawan kontrak.')],
      [tt('Why it matters', 'Mengapa penting'), tt('Many new joiners or contract workers means more hiring and training effort. Many long-serving staff means experience, but also knowledge that leaves with them.', 'Banyak karyawan baru atau kontrak berarti lebih banyak upaya rekrutmen dan pelatihan. Banyak karyawan lama berarti pengalaman, tetapi juga pengetahuan yang ikut pergi saat mereka keluar.')]] },
  attrition: { nav: ['Attrition', 'Attrition'], fn: () => pgAttrition(), period: true, filters: true, needY: true,
    sub: () => tt('People leaving the company: how many, who, when and why', 'Karyawan yang keluar dari perusahaan: berapa banyak, siapa, kapan, dan mengapa'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('How many people leave, who they are, when they leave and why. Turnover (also called attrition) is the number of people who left divided by the average number of employees.', 'Berapa banyak orang keluar, siapa mereka, kapan, dan mengapa. Turnover (disebut juga attrition) adalah jumlah yang keluar dibagi rata-rata jumlah karyawan.')],
      [tt('How to read it', 'Cara membacanya'), tt('Lower is better. The trend line shows turnover over the previous 12 months, so one unusual month does not distort it. "Resignation" is leaving by choice, "Termination" is a company decision, "End of contract" is a fixed-term contract not renewed.', 'Makin rendah makin baik. Garis tren menunjukkan turnover 12 bulan sebelumnya, sehingga satu bulan yang ganjil tidak mengganggu. "Resign" adalah keluar atas pilihan sendiri, "PHK" keputusan perusahaan, "Kontrak berakhir" kontrak waktu tertentu yang tidak diperpanjang.')],
      [tt('Why it matters', 'Mengapa penting'), tt('Every person who leaves costs money to replace: hiring, training and lost output. Top performers leaving, and people leaving in their first year, are the costliest.', 'Setiap karyawan yang keluar menimbulkan biaya pengganti: rekrutmen, pelatihan, dan hilangnya output. Karyawan unggul yang keluar, dan yang keluar di tahun pertama, paling mahal.')]] },
  inout: { nav: ['In / Out', 'Masuk & Keluar'], fn: () => pgInOut(), period: true, filters: true,
    sub: () => tt('Everyone who joined and left, month by month, with anonymous IDs', 'Semua yang masuk dan keluar, bulan demi bulan, dengan ID anonim'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('Everyone who joined or left, month by month, so you can see whether the team is growing or shrinking.', 'Semua yang masuk atau keluar, bulan demi bulan, supaya terlihat apakah tim bertambah atau berkurang.')],
      [tt('How to read it', 'Cara membacanya'), tt('Purple above the line = people who joined. Orange and navy below the line = people who left. Click a month in the table to see who joined or left in that month.', 'Ungu di atas garis = yang masuk. Oranye dan biru tua di bawah garis = yang keluar. Klik satu bulan di tabel untuk melihat siapa yang masuk atau keluar pada bulan itu.')],
      [tt('Good to know', 'Perlu diketahui'), tt('"Scheduled" = already gave notice but still working. "Starting" = accepted a job offer but has not started yet. Names are fake IDs such as E-0001.', '"Terjadwal" = sudah mengajukan resign tetapi masih bekerja. "Akan masuk" = sudah menerima penawaran tetapi belum mulai. Nama adalah ID fiktif seperti E-0001.')]] },
  productivity: { nav: ['Productivity', 'Produktivitas'], fn: () => pgProductivity(), period: true, filters: false,
    sub: () => tt('How much each employee produces and earns for the company, compared with the plan', 'Seberapa banyak yang dihasilkan dan dihasilkan untuk perusahaan oleh tiap karyawan, dibanding rencana'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('How much business each employee generates: sales and operating profit per employee, and tonnes of product made per employee.', 'Seberapa besar bisnis yang dihasilkan tiap karyawan: penjualan dan laba operasional per karyawan, serta ton produk per karyawan.')],
      [tt('How to read it', 'Cara membacanya'), tt('Columns are actual results; the dashed line is the plan target, so reaching or passing the line is good. Orange columns in the monthly chart are maintenance shutdowns, when a plant stops for planned repairs.', 'Kolom adalah hasil aktual; garis putus adalah target rencana, jadi mencapai atau melewati garis itu baik. Kolom oranye pada grafik bulanan adalah shutdown perawatan, saat pabrik berhenti untuk perbaikan terencana.')],
      [tt('Why it matters', 'Mengapa penting'), tt('It shows whether we get more output from the same people. Prices also move sales, so tonnes per employee gives the fairer picture.', 'Menunjukkan apakah kita mendapat output lebih banyak dari orang yang sama. Harga juga memengaruhi penjualan, jadi ton per karyawan memberi gambaran yang lebih adil.')]] },
  cost: { nav: ['Manpower Cost', 'Manpower Cost'], fn: () => pgCost(), period: true, filters: true,
    sub: () => tt('What the company spends on its employees: salary, bonus, benefits, overtime and training', 'Berapa yang dikeluarkan perusahaan untuk karyawan: gaji, bonus, tunjangan, lembur, dan pelatihan'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('Manpower cost is everything the company spends on its employees: salary, bonus, benefits, overtime, training and other costs.', 'Manpower cost adalah semua yang dikeluarkan perusahaan untuk karyawan: gaji, bonus, tunjangan, lembur, pelatihan, dan biaya lain.')],
      [tt('How to read it', 'Cara membacanya'), tt('Each column is one month, split by type of cost. The tall column every March is the yearly bonus. "Growth by cost type" shows which cost line grew fastest.', 'Tiap kolom adalah satu bulan, dibagi per jenis biaya. Kolom tinggi tiap Maret adalah bonus tahunan. "Pertumbuhan per jenis biaya" menunjukkan pos biaya yang tumbuh paling cepat.')],
      [tt('Why it matters', 'Mengapa penting'), tt('People cost is one of the largest costs a company can influence. Watch overtime: it rises during plant shutdowns.', 'Biaya karyawan adalah salah satu biaya terbesar yang bisa dikendalikan perusahaan. Perhatikan lembur: naik saat pabrik shutdown.')]] },
  ratios: { nav: ['Cost Ratios', 'Rasio Biaya'], fn: () => pgRatios(), period: true, filters: true,
    sub: () => tt('Is people cost reasonable for the size of the business? Compared with sales, profit and number of employees', 'Apakah biaya karyawan wajar untuk ukuran bisnisnya? Dibandingkan dengan penjualan, laba, dan jumlah karyawan'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('Is people cost reasonable for the size of the business? We compare it with sales, profit and the number of employees.', 'Apakah biaya karyawan wajar untuk ukuran bisnis? Kami membandingkannya dengan penjualan, laba, dan jumlah karyawan.')],
      [tt('How to read it', 'Cara membacanya'), tt('"Manpower cost % revenue" means: out of every $100 of sales, how many dollars go to employees. Lower usually means people are used more efficiently, but too low can mean underpaying.', '"Manpower cost % revenue" artinya: dari setiap $100 penjualan, berapa dolar untuk karyawan. Lebih rendah biasanya berarti karyawan dimanfaatkan lebih efisien, tetapi terlalu rendah bisa berarti gaji kurang.')],
      [tt('Why it matters', 'Mengapa penting'), tt('If people cost grows faster than sales, profit gets squeezed.', 'Bila biaya karyawan tumbuh lebih cepat dari penjualan, laba tergerus.')]] },
  analysis: { nav: ['Cost Analysis', 'Analisis Biaya'], fn: () => pgAnalysis(), period: true, filters: true,
    sub: () => tt('Why did people cost change, and are we on budget?', 'Mengapa biaya karyawan berubah, dan apakah sesuai budget?'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('It explains why people cost changed compared with a year ago, and whether spending is on budget.', 'Menjelaskan mengapa biaya karyawan berubah dibanding setahun lalu, dan apakah pengeluaran sesuai budget.')],
      [tt('How to read it', 'Cara membacanya'), tt('The first chart starts with last year\'s cost, adds the cost of having more people, adds the cost of paying each person more, and ends at today\'s cost. In the budget chart, the bar is actual spending and the black line is the budget.', 'Grafik pertama dimulai dari biaya tahun lalu, menambah biaya karena orang bertambah, menambah biaya karena tiap orang dibayar lebih, dan berakhir di biaya sekarang. Pada grafik budget, batang adalah pengeluaran aktual dan garis hitam adalah budget.')],
      [tt('Why it matters', 'Mengapa penting'), tt('If the rise comes from more people, the lever is hiring. If it comes from higher cost per person, the lever is pay and overtime policy.', 'Jika kenaikan berasal dari jumlah orang, pengungkitnya adalah rekrutmen. Jika dari biaya per orang, pengungkitnya adalah kebijakan gaji dan lembur.')]] },
  ta: { nav: ['Talent Acquisition', 'Talent Acquisition'], fn: () => pgTA(), period: true, filters: true, needY: true,
    sub: () => tt('Hiring: how fast, at what cost, from which sources, and how good the new hires turn out', 'Rekrutmen: seberapa cepat, berapa biaya, dari sumber mana, dan seberapa baik karyawan barunya'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('How well the company hires: how fast, at what cost, from which sources, and how good the new hires turn out.', 'Seberapa baik perusahaan merekrut: seberapa cepat, berapa biaya, dari sumber mana, dan seberapa baik karyawan barunya.')],
      [tt('How to read it', 'Cara membacanya'), tt('The funnel shows how many people drop out at each step. "Days to fill a job" counts from the day a job opens to the day an offer is accepted. Fewer days and lower cost are better.', 'Funnel menunjukkan berapa orang gugur di tiap tahap. "Lama mengisi lowongan" dihitung dari lowongan dibuka sampai penawaran diterima. Makin singkat dan murah makin baik.')],
      [tt('Why it matters', 'Mengapa penting'), tt('Empty jobs mean lost output and overworked teams. Knowing which sources bring the best employees shows where to spend the recruiting budget.', 'Lowongan kosong berarti hilangnya output dan tim yang kelelahan. Mengetahui sumber mana yang menghasilkan karyawan terbaik menunjukkan ke mana anggaran rekrutmen sebaiknya dipakai.')]] },
  performance: { nav: ['Performance', 'Kinerja'], fn: () => pgPerformance(), period: true, filters: true, needY: true,
    sub: () => tt(`How employees performed in the ${DB.CYCLE} yearly review: results on goals (KPI) and on behavior`, `Kinerja karyawan pada penilaian tahunan ${DB.CYCLE}: hasil target (KPI) dan perilaku`),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('How employees did in the latest yearly review. The final rating (1 to 5) mixes results on goals (70%) with behavior such as safety, teamwork and integrity (30%).', 'Bagaimana kinerja karyawan pada penilaian tahunan terbaru. Rating akhir (1 sampai 5) menggabungkan hasil target (70%) dengan perilaku seperti keselamatan, kerja sama, dan integritas (30%).')],
      [tt('How to read it', 'Cara membacanya'), tt('5 = outstanding, 3 = meets expectations, 1 = unsatisfactory. The two grids place each person by what they achieved, how they behaved, and how far they could grow.', '5 = istimewa, 3 = sesuai harapan, 1 = tidak memuaskan. Dua matriks menempatkan tiap orang berdasarkan apa yang dicapai, bagaimana perilakunya, dan seberapa jauh bisa berkembang.')],
      [tt('Why it matters', 'Mengapa penting'), tt('Rewarding results and good behavior together builds the right culture. The grids show who to develop, who to coach and who to watch.', 'Menghargai hasil sekaligus perilaku yang baik membangun budaya yang tepat. Matriks menunjukkan siapa yang dikembangkan, di-coach, atau perlu diperhatikan.')]] },
  development: { nav: ['Development', 'Pengembangan'], fn: () => pgDevelopment(), period: true, filters: true,
    sub: () => tt('How the company grows its people: training, filling jobs from within, and backups for key roles', 'Bagaimana perusahaan mengembangkan karyawan: pelatihan, mengisi lowongan dari dalam, dan pengganti untuk posisi kunci'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('How the company grows its people: training, filling jobs with its own employees, and having backups ready for key roles.', 'Bagaimana perusahaan mengembangkan karyawannya: pelatihan, mengisi lowongan dengan karyawan sendiri, dan menyiapkan pengganti untuk posisi kunci.')],
      [tt('How to read it', 'Cara membacanya'), tt('The backup chart shows, for each key role (senior managers and plant leaders), whether someone could step in now, within 1–2 years, or nobody is lined up.', 'Grafik pengganti menunjukkan, untuk tiap posisi kunci (manajer senior dan pimpinan pabrik), apakah ada yang bisa menggantikan sekarang, dalam 1–2 tahun, atau belum ada.')],
      [tt('Why it matters', 'Mengapa penting'), tt('Training and internal moves keep people engaged. A key role with no backup is a business risk if that person leaves.', 'Pelatihan dan perpindahan internal menjaga keterlibatan karyawan. Posisi kunci tanpa pengganti adalah risiko bisnis bila pemegangnya keluar.')]] },
  predictive: { nav: ['Predictive Insights', 'Insight Prediktif'], fn: () => pgPredictive(), period: false, filters: true,
    sub: () => tt('Three simple models: a 12-month forecast, who might resign, and groups of similar employees', 'Tiga model sederhana: forecast 12 bulan, siapa yang mungkin resign, dan kelompok karyawan yang mirip'),
    guide: () => [[tt('What this page is', 'Halaman ini tentang apa'), tt('Three simple statistical models trained on the demo data: a forecast of the next 12 months, an estimate of who might resign, and groups of similar employees. They are illustrations, not crystal balls.', 'Tiga model statistik sederhana yang dilatih pada data demo: forecast 12 bulan ke depan, perkiraan siapa yang mungkin resign, dan kelompok karyawan yang mirip. Ini ilustrasi, bukan ramalan pasti.')],
      [tt('How to read it', 'Cara membacanya'), tt('Forecast: solid line = what happened, dashed = forecast, shaded = likely range. Risk of resigning: the share of people rated low, medium or high risk. Employee groups: each dot is one employee.', 'Forecast: garis penuh = yang terjadi, putus-putus = perkiraan, arsir = rentang yang mungkin. Risiko resign: porsi orang yang dinilai berisiko rendah, sedang, atau tinggi. Kelompok karyawan: tiap titik adalah satu karyawan.')],
      [tt('Use with care', 'Gunakan dengan hati-hati'), tt('Models find patterns across groups of people. Use them to start conversations, never to judge one individual.', 'Model menemukan pola pada kelompok orang. Gunakan untuk memulai percakapan, bukan untuk menilai satu individu.')]] },
};
const FILTERS = [['dept', ['Department', 'Department']], ['loc', ['Location', 'Lokasi']], ['etype', ['Employment type', 'Status kerja']], ['band', ['Job level', 'Level jabatan']], ['gender', ['Gender', 'Gender']]];
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
const periodLabel2 = (k) => (k === 'ytd' ? tt(DB.LAST.slice(0, 4) + ' so far', DB.LAST.slice(0, 4) + ' sejauh ini') : tt('Full year ' + DB.LAST_FY, 'Tahun penuh ' + DB.LAST_FY));
function renderPeriod(pg) {
  const el = $('period'); el.hidden = !pg.period; document.querySelector('.tb-div').hidden = !pg.period;
  if (!DB.meta) return;
  const opts = [['ttm', tt('Last 12 months', '12 bulan terakhir'), periodRange(periodMonths('ttm'))], ['ytd', periodLabel2('ytd'), periodRange(periodMonths('ytd'))], ['fy', periodLabel2('fy'), periodRange(periodMonths('fy'))]];
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
  $('side-foot').innerHTML = `<span>${tt('Portfolio demo. All people, figures and the company are fictional.', 'Demo portofolio. Semua orang, angka, dan perusahaannya fiktif.')}</span><button type="button" class="linklike" data-act="gloss">${tt('Plain-language glossary', 'Glosarium istilah')}</button>${repo ? `<a href="${esc(repo)}" target="_blank" rel="noopener">${tt('Source code & methodology', 'Kode & metodologi')}</a>` : ''}`;
  $('defs-sum').textContent = tt('About this demo and glossary', 'Tentang demo ini dan glosarium');
  $('defs-body').innerHTML = `<div><p><b>Demo Corp</b> ${tt('is a fictional polyolefin producer (polyethylene and polypropylene) with a corporate HQ and three plants. Every employee, job opening and dollar on this site is synthetic: produced by a seeded Python script and refreshed daily so dates stay relative to today.', 'adalah produsen poliolefin fiktif (polietilena dan polipropilena) dengan kantor pusat dan tiga pabrik. Setiap karyawan, lowongan, dan dolar di situs ini sintetis: dibuat oleh script Python dengan seed tetap dan diperbarui setiap hari sehingga tanggalnya selalu relatif terhadap hari ini.')}</p>
    <p>${tt('People data runs to ', 'Data karyawan s.d. ')}<b>${fmtDate(DB.AS_OF)}</b>${tt('; finance, cost and production to ', '; keuangan, biaya, dan produksi s.d. ')}<b>${ymFull(DB.LAST)}</b>.</p></div>
    <div><p>${tt('Each page starts with a short guide on how to read it. The ⓘ button next to a metric explains it in plain words and then gives the formula. The "So what?" text is calculated from the data and from the filters you choose. The three predictive models are illustrative and use only the synthetic data.', 'Setiap halaman diawali panduan singkat cara membacanya. Tombol ⓘ di samping metrik menjelaskan artinya dalam bahasa biasa, lalu rumusnya. Teks "Jadi, apa artinya?" dihitung dari data dan filter yang Anda pilih. Ketiga model prediktif bersifat ilustratif dan hanya memakai data sintetis.')}</p>
    ${repo ? `<p><a href="${esc(repo)}" target="_blank" rel="noopener">${tt('Repository, data generator and methodology', 'Repositori, generator data, dan metodologi')}</a></p>` : ''}</div>`;
  let g = $('gloss');
  if (!g) { g = document.createElement('details'); g.id = 'gloss'; g.className = 'defs'; $('main').appendChild(g); }
  const wasOpen = g.open;
  g.innerHTML = `<summary>${tt('Plain-language glossary', 'Glosarium istilah')}</summary><dl class="defs-body glossary">${GLOSS.map((x) => `<div><dt>${esc(S.lang === 'id' ? x[1] : x[0])}</dt><dd>${esc(S.lang === 'id' ? x[3] : x[2])}</dd></div>`).join('')}</dl>`;
  g.open = wasOpen;
}

// ------------------------------------------------------------------ render
let STATUS = 'loading';
function guideOpen() { if (S.guide == null) { let v = null; try { v = localStorage.getItem('demo-guide'); } catch (e) { /* storage unavailable */ } S.guide = v ? v === '1' : window.innerWidth >= 761; } return S.guide; }
function guideHtml() {
  const g = PAGES[S.page].guide; if (!g) return '';
  return `<details class="guide fade" id="guide"${guideOpen() ? ' open' : ''}><summary>${GUIDE_ICON}${tt('New to HR data? How to read this page', 'Baru mengenal data HR? Cara membaca halaman ini')}</summary><div class="guide-body">${g().map((x) => `<div><h3>${esc(x[0])}</h3><p>${esc(x[1])}</p></div>`).join('')}</div></details>`;
}
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
  else { try { html = `<div class="page">${guideHtml()}${PAGES[S.page].fn()}</div>`; } catch (err) { console.error(err); html = `<div class="err" role="alert">${tt('This view could not be drawn for the current selection. Reset the filters or choose another period.', 'Tampilan ini tidak dapat digambar untuk pilihan sekarang. Reset filter atau pilih periode lain.')}</div>`; } }
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
    const ix = S.lang === 'id' ? 1 : 0, sh = SHORT[btn.dataset.def];
    tip.className = 'def'; tip.innerHTML = `${title ? `<b>${esc(title)}</b>` : ''}${sh ? `<p>${esc(plainify(sh[ix]))}</p><p>${esc(tt('How it is calculated: ', 'Cara menghitung: ') + plainify(d[ix]))}</p>` : `<p>${esc(plainify(d[ix]))}</p>`}`; lastKey = 'def:' + btn.dataset.def; tip.hidden = false; const r = btn.getBoundingClientRect(); place(r.left + r.width / 2, r.top); };
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
    if (a === 'gloss') { const d = $('gloss'); d.open = true; d.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' }); return; }
    if (a === 'reset') { Object.keys(S.F).forEach((k) => { S.F[k] = null; }); render(true); return; }
    if (a === 'fcreset') { S.wi = null; render(false); return; }
    if (a === 'month') { S.io.month = S.io.month === v ? 'all' : v; S.io.kind = 'all'; S.pg.io = 0; }
    else if (a === 'kind') { S.io.kind = v; S.pg.io = 0; }
    else if (a === 'pg') { S.pg.io = (S.pg.io || 0) + (+v); }
    render(false);
    const nb = c.querySelector(`[data-act="${a}"]${v != null ? `[data-v="${CSS.escape(v)}"]` : ''}`); if (nb && !nb.disabled) nb.focus({ preventScroll: true });
    if (a === 'pg' || a === 'month') { const l = $('io-list'); if (l && l.getBoundingClientRect().top < 0) l.scrollIntoView({ block: 'start' }); }
  });
  c.addEventListener('toggle', (e) => { if (e.target.id === 'guide') { S.guide = e.target.open; try { localStorage.setItem('demo-guide', S.guide ? '1' : '0'); } catch (x) { /* storage unavailable */ } } }, true);
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-act="gloss"]'); if (b) { e.preventDefault(); const d = $('gloss'); d.open = true; d.scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'start' }); } });
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
