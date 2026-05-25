/* ═══════════════════════════════════════════════════════════════
   BuildTrue V2 — Material Upgrade Estimator
   app.js  ·  All logic, calculations, navigation, charts
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────────────────────────
// GLOBAL STATE
// ──────────────────────────────────────────────────────────────────
let TOTAL_AREA = 0; // sq.ft — set on home page, used by all modules

// ──────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────
const el = id => document.getElementById(id);
const nv = (id, fallback = 0) => parseFloat(el(id)?.value) || fallback;
const sv = (id, fallback = '') => el(id)?.value?.trim() || fallback;
const fmt = n => '₹' + Math.max(0, Math.round(n)).toLocaleString('en-IN');
const fmtN = n => Math.max(0, Math.round(n)).toLocaleString('en-IN');
const clamp0 = n => Math.max(0, n);

// Build a breakdown row HTML string
// type: 'allowance' | 'upgrade' | 'total' | 'zero' | '' (default grey)
function brow(label, value, type = '', unit = '₹') {
  const cls = type === 'allowance' ? 'allowance-item'
            : type === 'upgrade'   ? 'upgrade-item'
            : type === 'total'     ? 'total-item'
            : type === 'zero'      ? 'zero-item'
            : '';
  const negFlag = value < 0 ? ' <span style="color:var(--green);font-size:12px">(credit)</span>' : '';
  
  let display;
  if (unit === 'sqft') {
    display = Math.round(Math.abs(value)).toLocaleString('en-IN') + ' sq.ft';
  } else {
    display = value < 0 ? '₹' + Math.abs(Math.round(value)).toLocaleString('en-IN') + ' credit' : fmt(value);
  }
  
  return `<div class="brow ${cls}">
    <span class="brow-label">${label}</span>
    <span class="brow-val">${display}${negFlag}</span>
  </div>`;
}

// ──────────────────────────────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────────────────────────────
function startApp() {
  el('page-home').classList.remove('active');
  el('app-shell').classList.remove('hidden');
  // recalc all modules with the current area
  calcTiles();
  calcKitchen();
  calcBathroom();
  calcDoors();
  calcAccessories();
}

function goHome() {
  el('app-shell').classList.add('hidden');
  el('page-home').classList.add('active');
}

function switchPage(pageId, btn) {
  const pageIds = ['tiles', 'kitchen', 'bathroom', 'doors', 'accessories', 'dashboard'];
  pageIds.forEach(id => {
    el('page-' + id).classList.add('hidden');
    el('page-' + id).classList.remove('active');
  });
  el('page-' + pageId).classList.remove('hidden');
  el('page-' + pageId).classList.add('active');

  document.querySelectorAll('.nav-tab[data-page]').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (pageId === 'dashboard') renderDashboard();
  window.scrollTo(0, 0);
}

// ──────────────────────────────────────────────────────────────────
// HOME PAGE — AREA CALCULATOR
// ──────────────────────────────────────────────────────────────────
function calcHomeArea() {
  const length = nv('h-length');
  const breadth = nv('h-breadth');
  const floors  = Math.max(1, nv('h-floors', 1));
  const area = length * breadth * floors;

  TOTAL_AREA = area;

  const btn = el('cta-start');
  const resultBox = el('home-area-result');
  const display = el('h-area-display');

  if (area > 0) {
    el('home-area-val').textContent = fmtN(area) + ' sq.ft';
    el('home-builder-val').textContent = fmt(area * 2350);
    el('home-area-sub').textContent =
      `${length} ft × ${breadth} ft × ${floors} floor(s) = ${fmtN(area)} sq.ft`;
    resultBox.classList.remove('hidden');
    display.value = fmtN(area) + ' sq.ft';
    btn.disabled = false;
  } else {
    resultBox.classList.add('hidden');
    display.value = '';
    btn.disabled = true;
  }

  // propagate to modules if app shell is visible
  if (!el('app-shell').classList.contains('hidden')) {
    calcTiles();
    calcKitchen();
    calcBathroom();
    calcDoors();
    calcAccessories();
  }
}

// ──────────────────────────────────────────────────────────────────
// MODULE 1 — TILES
// ──────────────────────────────────────────────────────────────────
// Allowances
const ALLOW_HALL = 125;
const ALLOW_HALL_GRANITE = 180;
const ALLOW_KITCHEN  = 125;
const ALLOW_KITCHEN_GRANITE = 180;
const ALLOW_BALCONY  = 60;
const ALLOW_BALCONY_GRANITE = 100;
const ALLOW_BATH_WAL = 60;
const BATH_AREA_PER  = 60; // sq.ft per bathroom

let TILE_TOTAL = 0;

function calcTiles() {
  const totalArea   = TOTAL_AREA;
  const kitchenArea = nv('t-kitchen-area');
  const balconyArea = nv('t-balcony-area');
  const numBaths    = nv('t-baths');
  const bathArea    = numBaths * BATH_AREA_PER;
  const hallArea    = clamp0(totalArea - kitchenArea - balconyArea - bathArea);

  // update stat boxes
  el('t-bath-area-val').textContent = fmtN(bathArea) + ' sq.ft';
  el('t-hall-area-val').textContent = fmtN(hallArea) + ' sq.ft';
  el('t-total-area-val').textContent = totalArea ? fmtN(totalArea) + ' sq.ft' : '—';

  // ── Hall + Room ──
  const hallPrice = nv('t-hall-price');
  const hallType  = sv('t-hall-type', 'Tiles');
  const hallAllow = hallType === 'Granite' ? ALLOW_HALL_GRANITE : ALLOW_HALL;
const hallExtra = clamp0(hallPrice - hallAllow) * hallArea;
  el('hall-breakdown').innerHTML =
    brow(`Area used`, hallArea, 'allowance', 'sqft') +
    brow(`Builder allowance (₹${hallAllow}/sq.ft × ${fmtN(hallArea)} sq.ft)`, hallAllow * hallArea, 'allowance') +
    (hallPrice > 0 ? brow(`Your ${hallType} (₹${hallAllow}/sq.ft × ${fmtN(hallArea)} sq.ft)`, hallAllow * hallArea, '') : '') +
    (hallPrice > 0 ? brow('Hall + Room Additional Cost', hallExtra, hallExtra > 0 ? 'upgrade' : 'zero') : '');

  // ── Kitchen Flooring ──
  const kitchenPrice = nv('t-kitchen-price');
  const kitchenType  = sv('t-kitchen-type', 'Tiles');
  const kitchenAllow = kitchenType === 'Granite' ? ALLOW_KITCHEN_GRANITE : ALLOW_KITCHEN;
  const kitchenExtra = clamp0(kitchenPrice - ALLOW_KITCHEN) * kitchenArea;
  el('kitchen-floor-breakdown').innerHTML =
    brow('Area used:', kitchenArea, 'allowance', 'sqft') +
    brow(`Builder allowance (₹${kitchenAllow}/sq.ft × ${fmtN(kitchenArea)} sq.ft)`, kitchenAllow * kitchenArea, 'allowance') +
    (kitchenPrice > 0 ? brow(`Your ${kitchenType} (₹${kitchenAllow}/sq.ft × ${fmtN(kitchenArea)} sq.ft)`, kitchenAllow * kitchenArea, '') : '') +
    (kitchenPrice > 0 ? brow('Kitchen Additional Cost', kitchenExtra, kitchenExtra > 0 ? 'upgrade' : 'zero') : '');

  // ── Balcony ──
  const balconyPrice = nv('t-balcony-price');
  const balconyType  = sv('t-balcony-type', 'Tiles');
  const balconyAllow = balconyType === 'Granite' ? ALLOW_BALCONY_GRANITE : ALLOW_BALCONY;
  const balconyExtra = clamp0(balconyPrice - ALLOW_BALCONY) * balconyArea;
  el('balcony-breakdown').innerHTML =
    brow('Area used:', balconyArea, 'allowance', 'sqft') +
    brow(`Builder allowance (₹${balconyAllow}/sq.ft × ${fmtN(balconyArea)} sq.ft)`, balconyAllow * balconyArea, 'allowance') +
    (balconyPrice > 0 ? brow(`Your ${balconyType} (₹${balconyAllow}/sq.ft × ${fmtN(balconyArea)} sq.ft)`, balconyAllow * balconyArea, '') : '') +
    (balconyPrice > 0 ? brow('Balcony Additional Cost', balconyExtra, balconyExtra > 0 ? 'upgrade' : 'zero') : '');

  // ── Bathroom Wall Tiles ──
  const bathPrice = nv('t-bath-price');
  const bathExtra = clamp0(bathPrice - ALLOW_BATH_WAL) * bathArea;
  el('bath-tile-breakdown').innerHTML =
    brow(`Area used (${numBaths} baths × ${BATH_AREA_PER} sq.ft)`, bathArea, 'allowance', 'sqft') +
    brow(`Builder allowance (₹${ALLOW_BATH_WAL}/sq.ft × ${fmtN(bathArea)} sq.ft)`, ALLOW_BATH_WAL * bathArea, 'allowance') +
    (bathPrice > 0 ? brow(`Your tiles (₹${bathPrice}/sq.ft × ${fmtN(bathArea)} sq.ft)`, bathPrice * bathArea, '') : '') +
    (bathPrice > 0 ? brow('Bathroom Wall Tile Additional Cost', bathExtra, bathExtra > 0 ? 'upgrade' : 'zero') : '');

  TILE_TOTAL = hallExtra + kitchenExtra + balconyExtra + bathExtra;
  el('tiles-total-val').textContent = fmt(TILE_TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// MODULE 2 — KITCHEN
// ──────────────────────────────────────────────────────────────────
const ALLOW_COUNTER = 180;
const ALLOW_SINK    = 7000;
const ALLOW_UTILITY = 3000;

let KITCHEN_TOTAL = 0;

function calcKitchen() {
  // Countertop
  const cArea  = nv('k-counter-area');
  const cPrice = nv('k-counter-price');
  const cType  = sv('k-counter-type', 'Quartz');
  const cExtra = clamp0(cPrice - ALLOW_COUNTER) * cArea;
  el('counter-breakdown').innerHTML =
    brow(`Builder allowance (₹${ALLOW_COUNTER}/sq.ft × ${fmtN(cArea)} sq.ft)`, ALLOW_COUNTER * cArea, 'allowance') +
    (cPrice > 0 ? brow(`Your ${cType} countertop (₹${cPrice}/sq.ft × ${fmtN(cArea)} sq.ft)`, cPrice * cArea, '') : '') +
    (cPrice > 0 ? brow('Countertop Additional Cost', cExtra, cExtra > 0 ? 'upgrade' : 'zero') : '');

  // Kitchen Sink
  const sinkCost  = nv('k-sink-cost');
  const sinkExtra = clamp0(sinkCost - ALLOW_SINK);
  el('sink-breakdown').innerHTML =
    brow(`Builder allowance`, ALLOW_SINK, 'allowance') +
    (sinkCost > 0 ? brow('Your selected sink', sinkCost, '') : '') +
    (sinkCost > 0 ? brow('Sink Additional Cost', sinkExtra, sinkExtra > 0 ? 'upgrade' : 'zero') : '');

  // Utility Sink & Faucet
  const utilityCost  = nv('k-utility-cost');
  const utilityExtra = clamp0(utilityCost - ALLOW_UTILITY);
  el('utility-breakdown').innerHTML =
    brow(`Builder allowance`, ALLOW_UTILITY, 'allowance') +
    (utilityCost > 0 ? brow('Your selected utility sink & faucet', utilityCost, '') : '') +
    (utilityCost > 0 ? brow('Utility Sink Additional Cost', utilityExtra, utilityExtra > 0 ? 'upgrade' : 'zero') : '');

  KITCHEN_TOTAL = cExtra + sinkExtra + utilityExtra;
  el('kitchen-total-val').textContent = fmt(KITCHEN_TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// MODULE 3 — BATHROOM
// ──────────────────────────────────────────────────────────────────
const ALLOW_COMMODE = 8000;
const ALLOW_BASIN   = 3500;
const ALLOW_SHOWER  = 4000;
const ALLOW_FAUCET  = 1500;

let BATHROOM_TOTAL = 0;

function calcBathroom() {
  function fixtureBrow(elId, qty, price, allowance, label) {
    const extra = clamp0(price - allowance) * qty;
    const html =
      brow(`Builder allowance (₹${allowance.toLocaleString('en-IN')} × ${qty} units)`, allowance * qty, 'allowance') +
      (price > 0 ? brow(`Your ${label} (₹${price.toLocaleString('en-IN')} × ${qty} units)`, price * qty, '') : '') +
      (price > 0 ? brow(`${label} Additional Cost`, extra, extra > 0 ? 'upgrade' : 'zero') : '');
    el(elId).innerHTML = html;
    return extra;
  }

  const qCommode = nv('b-commode-qty'); const pCommode = nv('b-commode-price');
  const qBasin   = nv('b-basin-qty');   const pBasin   = nv('b-basin-price');
  const qShower  = nv('b-shower-qty');  const pShower  = nv('b-shower-price');
  const qFaucet  = nv('b-faucet-qty');  const pFaucet  = nv('b-faucet-price');

  const eCommode = fixtureBrow('commode-breakdown', qCommode, pCommode, ALLOW_COMMODE, 'Commode');
  const eBasin   = fixtureBrow('basin-breakdown',   qBasin,   pBasin,   ALLOW_BASIN,   'Wash Basin');
  const eShower  = fixtureBrow('shower-breakdown',  qShower,  pShower,  ALLOW_SHOWER,  'Shower');
  const eFaucet  = fixtureBrow('faucet-breakdown',  qFaucet,  pFaucet,  ALLOW_FAUCET,  'Faucet');

  BATHROOM_TOTAL = eCommode + eBasin + eShower + eFaucet;
  el('bathroom-total-val').textContent = fmt(BATHROOM_TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// MODULE 4 — DOORS & WINDOWS
// ──────────────────────────────────────────────────────────────────
const ALLOW_MAIN_DOOR     = 25000;
const ALLOW_INTERNAL_DOOR = 8000;
const ALLOW_WINDOW        = 6000;

let DOORS_TOTAL = 0;

function calcDoors() {
  function doorBrow(elId, qty, price, allowance, label) {
    const extra = clamp0(price - allowance) * qty;
    el(elId).innerHTML =
      brow(`Builder allowance (₹${allowance.toLocaleString('en-IN')} × ${qty} units)`, allowance * qty, 'allowance') +
      (price > 0 ? brow(`Your ${label} (₹${price.toLocaleString('en-IN')} × ${qty} units)`, price * qty, '') : '') +
      (price > 0 ? brow(`${label} Additional Cost`, extra, extra > 0 ? 'upgrade' : 'zero') : '');
    return extra;
  }

  const eMain   = doorBrow('main-door-breakdown',     nv('d-main-qty'),     nv('d-main-price'),     ALLOW_MAIN_DOOR,     'Main Door');
  const eInt    = doorBrow('internal-door-breakdown',  nv('d-internal-qty'), nv('d-internal-price'), ALLOW_INTERNAL_DOOR, 'Internal Door');
  const eWindow = doorBrow('window-breakdown',          nv('d-window-qty'),   nv('d-window-price'),   ALLOW_WINDOW,        'Window');

  DOORS_TOTAL = eMain + eInt + eWindow;
  el('doors-total-val').textContent = fmt(DOORS_TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// MODULE 5 — ACCESSORIES
// ──────────────────────────────────────────────────────────────────
const ALLOW_HANDLE = 500;
const ALLOW_LOCK   = 1200;

let ACC_TOTAL = 0;

function calcAccessories() {
  const qHandle = nv('a-handle-qty'); const pHandle = nv('a-handle-price');
  const qLock   = nv('a-lock-qty');   const pLock   = nv('a-lock-price');
  const otherCost = nv('a-other-cost');
  const otherDesc = sv('a-other-desc', 'Other accessories');

  const eHandle = clamp0(pHandle - ALLOW_HANDLE) * qHandle;
  el('handle-breakdown').innerHTML =
    brow(`Builder allowance (₹${ALLOW_HANDLE} × ${qHandle} units)`, ALLOW_HANDLE * qHandle, 'allowance') +
    (pHandle > 0 ? brow(`Your handles (₹${pHandle.toLocaleString('en-IN')} × ${qHandle} units)`, pHandle * qHandle, '') : '') +
    (pHandle > 0 ? brow('Handle Additional Cost', eHandle, eHandle > 0 ? 'upgrade' : 'zero') : '');

  const eLock = clamp0(pLock - ALLOW_LOCK) * qLock;
  el('lock-breakdown').innerHTML =
    brow(`Builder allowance (₹${ALLOW_LOCK} × ${qLock} units)`, ALLOW_LOCK * qLock, 'allowance') +
    (pLock > 0 ? brow(`Your locks (₹${pLock.toLocaleString('en-IN')} × ${qLock} units)`, pLock * qLock, '') : '') +
    (pLock > 0 ? brow('Lock Additional Cost', eLock, eLock > 0 ? 'upgrade' : 'zero') : '');

  el('other-acc-breakdown').innerHTML =
    (otherCost > 0 ? brow(otherDesc, otherCost, 'upgrade') : brow('No other accessories entered', 0, ''));

  ACC_TOTAL = eHandle + eLock + otherCost;
  el('accessories-total-val').textContent = fmt(ACC_TOTAL);
}

// ──────────────────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────────────────
const DASH_COLORS = ['#E8A838', '#2DD4BF', '#F87171', '#818CF8', '#34D399'];
let pieChart = null, compareChart = null, barChart = null;

function destroyCharts() {
  if (pieChart)    { pieChart.destroy();    pieChart    = null; }
  if (compareChart){ compareChart.destroy(); compareChart = null; }
  if (barChart)    { barChart.destroy();    barChart    = null; }
}

const chartDefaults = {
  plugins: {
    legend: {
      labels: {
        color: '#6B7080',
        font: { family: "'DM Sans'", size: 12 },
        boxWidth: 10, padding: 12
      }
    },
    tooltip: {
      backgroundColor: '#1C1E28',
      borderColor: '#2A2D3E', borderWidth: 1,
      titleColor: '#6B7080', bodyColor: '#E8E9F0',
      callbacks: { label: ctx => ' ' + fmt(ctx.raw) }
    }
  }
};

// Compute builder allowances from current inputs for dashboard comparison
function computeAllowances() {
  // Tiles allowances
  const kitchenArea = nv('t-kitchen-area');
  const balconyArea = nv('t-balcony-area');
  const numBaths    = nv('t-baths');
  const bathArea    = numBaths * BATH_AREA_PER;
  const hallArea    = clamp0(TOTAL_AREA - kitchenArea - balconyArea - bathArea);

  const tilesAllow = ALLOW_HALL * hallArea + ALLOW_KITCHEN * kitchenArea +
                     ALLOW_BALCONY * balconyArea + ALLOW_BATH_WAL * bathArea;

  // Kitchen allowances
  const kitchenAllow = ALLOW_COUNTER * nv('k-counter-area') + ALLOW_SINK + ALLOW_UTILITY;

  // Bathroom allowances
  const bathAllow = ALLOW_COMMODE * nv('b-commode-qty') + ALLOW_BASIN * nv('b-basin-qty') +
                    ALLOW_SHOWER  * nv('b-shower-qty')  + ALLOW_FAUCET * nv('b-faucet-qty');

  // Doors allowances
  const doorsAllow = ALLOW_MAIN_DOOR * nv('d-main-qty') +
                     ALLOW_INTERNAL_DOOR * nv('d-internal-qty') +
                     ALLOW_WINDOW * nv('d-window-qty');

  // Accessories allowances
  const accAllow = ALLOW_HANDLE * nv('a-handle-qty') + ALLOW_LOCK * nv('a-lock-qty');

  return { tilesAllow, kitchenAllow, bathAllow, doorsAllow, accAllow };
}

function renderDashboard() {
  const gridColor = 'rgba(42,45,62,0.8)';
  const categories = ['Tiles & Flooring', 'Kitchen', 'Bathroom', 'Doors & Windows', 'Accessories'];
  const upgrades   = [TILE_TOTAL, KITCHEN_TOTAL, BATHROOM_TOTAL, DOORS_TOTAL, ACC_TOTAL];
  const catColors  = DASH_COLORS;
  const catBoxColors = ['gold', 'teal', 'red', 'indigo', 'green'];

  const allow = computeAllowances();
  const allowances = [allow.tilesAllow, allow.kitchenAllow, allow.bathAllow, allow.doorsAllow, allow.accAllow];

  const totalUpgrade   = upgrades.reduce((a, b) => a + b, 0);
  const totalAllowance = TOTAL_AREA * 2350
  const totalSelected  = totalAllowance + totalUpgrade;
  const pct = totalAllowance > 0 ? ((totalUpgrade / totalAllowance) * 100).toFixed(1) : '—';

  // KPI
  el('d-allowance').textContent = fmt(totalAllowance);
  el('d-upgrade').textContent   = fmt(totalUpgrade);
  el('d-selected').textContent  = fmt(totalSelected);
  el('d-pct').innerHTML         = totalUpgrade > 0
    ? `<span class="pct-badge">+${pct}% above package</span>`
    : '<span style="color:var(--green);font-size:13px">No upgrades yet</span>';

  // per-category stat boxes
  el('d-cat-boxes').innerHTML = categories.map((cat, i) => `
    <div class="stat-box ${catBoxColors[i]}">
      <div class="stat-label">${cat}</div>
      <div class="stat-val" style="font-size:24px">${fmt(upgrades[i])}</div>
      <div class="stat-sub">upgrade cost</div>
    </div>
  `).join('');

  // Summary breakdown rows
  const summaryRows = categories.map((cat, i) =>
    `<div class="brow ${upgrades[i] > 0 ? 'upgrade-item' : ''}">
      <span class="brow-label">${cat}</span>
      <span class="brow-val" style="color:${upgrades[i] > 0 ? 'var(--orange)' : 'var(--green)'}">${fmt(upgrades[i])}</span>
    </div>`
  ).join('');
  el('d-summary').innerHTML =
    summaryRows +
    `<div class="brow total-item">
      <span class="brow-label">TOTAL UPGRADE COST</span>
      <span class="brow-val">${fmt(totalUpgrade)}</span>
    </div>`;

  // Progress bars
  const progressColors = DASH_COLORS;
  el('d-progress').innerHTML = (totalUpgrade === 0)
    ? '<p style="color:var(--muted);font-size:14px">No upgrade costs entered yet.</p>'
    : categories.map((cat, i) => `
      <div class="progress-row">
        <div class="progress-header">
          <span>${cat}</span>
          <span>${fmt(upgrades[i])}</span>
        </div>
        <div class="progress-wrap">
          <div class="progress-fill" style="width:${totalUpgrade > 0 ? (upgrades[i]/totalUpgrade*100).toFixed(1) : 0}%;background:${progressColors[i]}"></div>
        </div>
      </div>
    `).join('');

  // Charts
  destroyCharts();

  // ── DOUGHNUT — upgrade distribution
  const nonZeroUpgrades = upgrades.map(u => Math.max(0, Math.round(u)));
  pieChart = new Chart(el('chart-pie'), {
    type: 'doughnut',
    data: {
      labels: categories,
      datasets: [{
        data: nonZeroUpgrades,
        backgroundColor: catColors,
        borderWidth: 2,
        borderColor: '#1C1E28',
        hoverBorderColor: '#1C1E28'
      }]
    },
    options: {
      ...chartDefaults,
      cutout: '55%',
      plugins: { ...chartDefaults.plugins }
    }
  });

  // ── BAR — allowance vs selected total
  compareChart = new Chart(el('chart-compare'), {
    type: 'bar',
    data: {
      labels: ['Builder Package', 'Your Selection'],
      datasets: [{
        data: [Math.round(totalAllowance), Math.round(totalSelected)],
        backgroundColor: ['#2DD4BF', '#E8A838'],
        borderRadius: 8, borderSkipped: false
      }]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: '#6B7080' }, grid: { color: gridColor } },
        y: { ticks: { color: '#6B7080', callback: v => '₹' + (v / 1000).toFixed(0) + 'K' }, grid: { color: gridColor } }
      },
      plugins: { ...chartDefaults.plugins, legend: { display: false } }
    }
  });

  // ── STACKED BAR — allowance vs upgrade per category
  barChart = new Chart(el('chart-bar'), {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [
        { label: 'Builder Allowance', data: allowances.map(v => Math.round(v)), backgroundColor: '#2DD4BF', borderRadius: 4, stack: 'a' },
        { label: 'Your Upgrade',      data: upgrades.map(v => Math.round(v)),   backgroundColor: '#FB923C', borderRadius: 4, stack: 'a' }
      ]
    },
    options: {
      ...chartDefaults,
      scales: {
        x: { ticks: { color: '#6B7080' }, grid: { color: gridColor }, stacked: true },
        y: { ticks: { color: '#6B7080', callback: v => '₹' + (v / 1000).toFixed(0) + 'K' }, grid: { color: gridColor }, stacked: true }
      },
      plugins: { ...chartDefaults.plugins }
    }
  });

  // ── Insight text
  const topIdx  = upgrades.indexOf(Math.max(...upgrades));
  const topCat  = categories[topIdx];
  el('d-insight').innerHTML = totalUpgrade > 0
    ? `Your builder's package covers <strong style="color:#2DD4BF">${fmt(totalAllowance)}</strong> worth of materials across all categories.
       By upgrading to your selected materials, you will pay an additional <strong style="color:#FB923C">${fmt(totalUpgrade)}</strong>
       — that's <strong style="color:#E8A838">${pct}%</strong> above the base package.
       Your highest upgrade category is <strong style="color:#F87171">${topCat}</strong> at ${fmt(Math.max(...upgrades))}.
       Use this breakdown when negotiating with your builder or budgeting for your home.`
    : `No upgrade costs have been entered yet. Fill in the module tabs to see your personalised upgrade breakdown.`;
}

// ──────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // init all breakdowns to empty placeholders
  calcTiles();
  calcKitchen();
  calcBathroom();
  calcDoors();
  calcAccessories();
});

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ===== DATA =====
    const today = new Date().toLocaleDateString("en-IN");
    const builderRate = 2350; // change if needed
    const packageCost = TOTAL_AREA * builderRate;
    const tilesCost = TILE_TOTAL;
    const kitchenCost = KITCHEN_TOTAL;
    const bathroomCost = BATHROOM_TOTAL;
    const doorsCost = DOORS_TOTAL;
    const accessoriesCost = ACC_TOTAL;

    const totalUpgrade =
        tilesCost +
        kitchenCost +
        bathroomCost +
        doorsCost +
        accessoriesCost;
    const finalCost = packageCost + totalUpgrade;

    // ===== PDF DESIGN =====
    let y = 20;
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("BUILDTRUE", 20, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Construction Material Upgrade Report", 20, y);
    y += 10;
    doc.text(`Date: ${today}`, 20, y);
    y += 10;
    doc.line(20, y, 190, y);

    // ===== HOUSE DETAILS =====
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("HOUSE DETAILS", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Area`, 20, y);
    doc.text(`${TOTAL_AREA} sq.ft`, 120, y);
    y += 8;
    doc.text(`Builder Rate`, 20, y);
    doc.text(`Rs.${builderRate}/sq.ft`, 120, y);
    y += 8;
    doc.text(`Package Cost`, 20, y);
    doc.text(`Rs.${packageCost.toLocaleString("en-IN")}`, 120, y);
    y += 10;
    doc.line(20, y, 190, y);

    // ===== UPGRADE SUMMARY =====
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("UPGRADE SUMMARY", 20, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text("Tiles", 20, y);
    doc.text(`Rs.${tilesCost.toLocaleString("en-IN")}`, 120, y);
    y += 8;
    doc.text("Kitchen", 20, y);
    doc.text(`Rs.${kitchenCost.toLocaleString("en-IN")}`, 120, y);
    y += 8;
    doc.text("Bathroom", 20, y);
    doc.text(`Rs.${bathroomCost.toLocaleString("en-IN")}`, 120, y);
    y += 8;
    doc.text("Doors", 20, y);
    doc.text(`Rs.${doorsCost.toLocaleString("en-IN")}`, 120, y);
    y += 8;
    doc.text("Accessories", 20, y);
    doc.text(`Rs.${accessoriesCost.toLocaleString("en-IN")}`, 120, y);
    y += 10;
    doc.line(20, y, 190, y);
    // ===== FINAL TOTALS =====
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL UPGRADE", 20, y);
    doc.text(`Rs.${totalUpgrade.toLocaleString("en-IN")}`, 120, y);
    y += 10;
    doc.text("FINAL COST", 20, y);
    doc.text(`Rs.${finalCost.toLocaleString("en-IN")}`, 120, y);
    y += 10;
    doc.line(20, y, 190, y);
    // ===== SAVE =====
    doc.save("BuildTrue_Estimate_Report.pdf");
}