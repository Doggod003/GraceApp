// ─────────────────────────────────────────────────────────────────────────
// VEHICLE DATABASE
// To add cars: append new objects to this array. Each car needs:
//   id, year, make, model, trim, price, mpg, maintMo, regMo
// (maintMo and regMo are estimated monthly maintenance + registration)
// ─────────────────────────────────────────────────────────────────────────

const VEHICLES = [
  {
    id: 'ford-bronco-sport-big-bend-2026',
    year: 2026,
    make: 'Ford',
    model: 'Bronco Sport',
    trim: 'Big Bend',
    price: 31845,
    mpg: 27,
    maintMo: 50,
    regMo: 25,
    notes: '1.5L EcoBoost · AWD · 181 hp'
  },
  {
    id: 'ford-bronco-sport-outer-banks-2026',
    year: 2026,
    make: 'Ford',
    model: 'Bronco Sport',
    trim: 'Outer Banks',
    price: 36945,
    mpg: 27,
    maintMo: 55,
    regMo: 28,
    notes: '1.5L EcoBoost · AWD · 181 hp'
  },
  {
    id: 'ford-bronco-sport-badlands-2026',
    year: 2026,
    make: 'Ford',
    model: 'Bronco Sport',
    trim: 'Badlands',
    price: 40265,
    mpg: 23,
    maintMo: 60,
    regMo: 30,
    notes: '2.0L EcoBoost · AWD · 238 hp'
  },
  {
    id: 'kia-telluride-x-pro-sx-2027',
    year: 2027,
    make: 'Kia',
    model: 'Telluride',
    trim: 'X-Pro SX',
    price: 55980,
    mpg: 23,
    maintMo: 75,
    regMo: 35,
    notes: '2.5L Turbo · AWD · 274 hp · 7-seat'
  },
  {
    id: 'kia-telluride-sx-prestige-2027',
    year: 2027,
    make: 'Kia',
    model: 'Telluride',
    trim: 'SX Prestige',
    price: 52480,
    mpg: 24,
    maintMo: 70,
    regMo: 33,
    notes: '2.5L Turbo · AWD · 274 hp · 7-seat'
  },
  {
    id: 'toyota-rav4-xle-2026',
    year: 2026,
    make: 'Toyota',
    model: 'RAV4',
    trim: 'XLE Hybrid AWD',
    price: 35470,
    mpg: 39,
    maintMo: 45,
    regMo: 25,
    notes: '2.5L Hybrid · AWD · 219 hp combined'
  },
  {
    id: 'honda-cr-v-ex-l-2026',
    year: 2026,
    make: 'Honda',
    model: 'CR-V',
    trim: 'EX-L AWD',
    price: 35655,
    mpg: 30,
    maintMo: 50,
    regMo: 25,
    notes: '1.5L Turbo · AWD · 190 hp'
  },
  {
    id: 'mazda-cx-50-preferred-2026',
    year: 2026,
    make: 'Mazda',
    model: 'CX-50',
    trim: 'Preferred AWD',
    price: 33425,
    mpg: 27,
    maintMo: 55,
    regMo: 26,
    notes: '2.5L · AWD · 187 hp'
  }
];

// ─────────────────────────────────────────────────────────────────────────
// SHARED FORMATTERS
// ─────────────────────────────────────────────────────────────────────────

function dollar(n) {
  if (!isFinite(n)) return '$—';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function vehicleLabel(v) {
  return `${v.year} ${v.make} ${v.model} ${v.trim}`;
}

// ─────────────────────────────────────────────────────────────────────────
// CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────

function pmt(principal, annualRatePct, months) {
  if (months <= 0) return 0;
  if (annualRatePct === 0) return principal / months;
  const r = annualRatePct / 100 / 12;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function calcCar(vehicle, inp) {
  const taxedPrice = vehicle.price * (1 + inp.tax / 100);
  const loan = Math.max(0, taxedPrice - inp.down - inp.trade);
  const payment = pmt(loan, inp.apr, inp.term);
  const fuel = (inp.miles / vehicle.mpg) * inp.gas;
  const ins = inp.ins;
  const maint = vehicle.maintMo;
  const reg = vehicle.regMo;
  const total = payment + fuel + ins + maint + reg;
  const totalPaid = payment * inp.term;
  const interest = Math.max(0, totalPaid - loan);
  return { payment, fuel, ins, maint, reg, total, loan, totalPaid, interest, taxedPrice };
}

function buildForecast(vehicle, inp, breakdown) {
  // Returns periodic cumulative totals across 5 years with 3% annual gas inflation
  const GAS_INC = 0.03;
  const periods = [
    { label: '6 months', months: 6 },
    { label: '1 year',   months: 12 },
    { label: '2 years',  months: 24 },
    { label: '3 years',  months: 36 },
    { label: '5 years',  months: 60 },
  ];
  const out = [];
  let cum = 0;
  let prev = 0;
  for (const p of periods) {
    let periodCost = 0;
    for (let m = prev; m < p.months; m++) {
      const yr = Math.floor(m / 12);
      const gasM = inp.gas * Math.pow(1 + GAS_INC, yr);
      const fuelM = (inp.miles / vehicle.mpg) * gasM;
      periodCost += breakdown.payment + fuelM + inp.ins + vehicle.maintMo + vehicle.regMo;
    }
    cum += periodCost;
    prev = p.months;
    out.push({ label: p.label, cum, months: p.months });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// SHARED INPUT BUILDER (sidebar UI)
// ─────────────────────────────────────────────────────────────────────────

function buildSidebar(container, onUpdate) {
  container.innerHTML = `
    <div class="sidebar-title">Your Numbers</div>

    <div class="input-group">
      <div class="input-label"><span>Trade-in value</span><span class="val" id="v-trade">$0</span></div>
      <input type="range" id="s-trade" min="0" max="20000" step="500" value="0">
    </div>
    <div class="input-group">
      <div class="input-label"><span>Down payment</span><span class="val" id="v-down">$3,000</span></div>
      <input type="range" id="s-down" min="0" max="15000" step="250" value="3000">
    </div>
    <div class="input-group">
      <div class="input-label"><span>APR</span><span class="val" id="v-apr">6.99%</span></div>
      <input type="range" id="s-apr" min="2" max="15" step="0.25" value="6.99">
    </div>
    <div class="input-group">
      <div class="input-label"><span>Loan term</span><span class="val" id="v-term">60 mo.</span></div>
      <input type="range" id="s-term" min="24" max="84" step="12" value="60">
    </div>

    <div class="divider-label">Driving &amp; Costs</div>

    <div class="input-group">
      <div class="input-label"><span>Miles / month</span><span class="val" id="v-miles">1,000</span></div>
      <input type="range" id="s-miles" min="300" max="3000" step="100" value="1000">
    </div>
    <div class="input-group">
      <div class="input-label"><span>Gas price / gal</span><span class="val" id="v-gas">$3.50</span></div>
      <input type="range" id="s-gas" min="2.50" max="5.50" step="0.05" value="3.50">
    </div>
    <div class="input-group">
      <div class="input-label"><span>Insurance / mo.</span><span class="val" id="v-ins">$150</span></div>
      <input type="range" id="s-ins" min="80" max="400" step="10" value="150">
    </div>
    <div class="input-group">
      <div class="input-label"><span>PA sales tax</span><span class="val" id="v-tax">6.0%</span></div>
      <input type="range" id="s-tax" min="0" max="10" step="0.5" value="6">
    </div>
  `;

  const ids = ['s-trade','s-down','s-apr','s-term','s-miles','s-gas','s-ins','s-tax'];
  ids.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      refreshSidebarLabels();
      onUpdate();
    });
  });
}

function refreshSidebarLabels() {
  const inp = getInputs();
  document.getElementById('v-trade').textContent = dollar(inp.trade);
  document.getElementById('v-down').textContent  = dollar(inp.down);
  document.getElementById('v-apr').textContent   = inp.apr.toFixed(2) + '%';
  document.getElementById('v-term').textContent  = inp.term + ' mo.';
  document.getElementById('v-miles').textContent = inp.miles.toLocaleString();
  document.getElementById('v-gas').textContent   = '$' + inp.gas.toFixed(2);
  document.getElementById('v-ins').textContent   = dollar(inp.ins);
  document.getElementById('v-tax').textContent   = parseFloat(inp.tax).toFixed(1) + '%';
}

function getInputs() {
  return {
    trade: +document.getElementById('s-trade').value,
    down:  +document.getElementById('s-down').value,
    apr:   +document.getElementById('s-apr').value,
    term:  +document.getElementById('s-term').value,
    miles: +document.getElementById('s-miles').value,
    gas:   +document.getElementById('s-gas').value,
    ins:   +document.getElementById('s-ins').value,
    tax:   +document.getElementById('s-tax').value,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// VEHICLE SELECT BUILDER
// ─────────────────────────────────────────────────────────────────────────

function buildVehicleSelect(currentId, excludeIds = []) {
  // Group by Make
  const byMake = {};
  for (const v of VEHICLES) {
    if (excludeIds.includes(v.id) && v.id !== currentId) continue;
    if (!byMake[v.make]) byMake[v.make] = [];
    byMake[v.make].push(v);
  }
  const makes = Object.keys(byMake).sort();
  let html = '';
  for (const make of makes) {
    html += `<optgroup label="${make}">`;
    for (const v of byMake[make]) {
      const selected = v.id === currentId ? ' selected' : '';
      html += `<option value="${v.id}"${selected}>${v.year} ${v.model} ${v.trim}</option>`;
    }
    html += `</optgroup>`;
  }
  return html;
}
