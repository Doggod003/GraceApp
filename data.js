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
// Layout per input:
//   Label                          [+/- bump cluster]
//   ─────●─────────  (slider)
//   [−]  [$ 1,234 ]  [+]   (number row with unit prefix/suffix)
// All three controls (slider, text, bumps) stay in sync.
// ─────────────────────────────────────────────────────────────────────────

const SLIDER_CONFIG = [
  { id: 'trade', label: 'Trade-in value',  min: 0,    max: 50000, step: 50,   default: 0,    bump: 50,   format: 'dollar',    prefix: '$' },
  { id: 'down',  label: 'Down payment',    min: 0,    max: 30000, step: 50,   default: 3000, bump: 50,   format: 'dollar',    prefix: '$' },
  { id: 'apr',   label: 'APR',             min: 0,    max: 20,    step: 0.01, default: 6.99, bump: 0.01, format: 'percent',   suffix: '%', decimals: 2 },
  { id: 'term',  label: 'Loan term',       min: 12,   max: 96,    step: 1,    default: 60,   bump: 1,    format: 'months',    suffix: 'mo' },
  { id: 'miles', label: 'Miles / month',   min: 100,  max: 5000,  step: 10,   default: 1000, bump: 10,   format: 'number' },
  { id: 'gas',   label: 'Gas price / gal', min: 1.00, max: 7.00,  step: 0.01, default: 3.50, bump: 0.01, format: 'dollarDec', prefix: '$', decimals: 2 },
  { id: 'ins',   label: 'Insurance / mo.', min: 0,    max: 800,   step: 1,    default: 150,  bump: 1,    format: 'dollar',    prefix: '$' },
  { id: 'tax',   label: 'Sales tax',       min: 0,    max: 12,    step: 0.01, default: 6.00, bump: 0.01, format: 'percent',   suffix: '%', decimals: 2 },
];

function formatVal(val, format, decimals) {
  if (format === 'dollar')    return Math.round(val).toLocaleString('en-US');
  if (format === 'dollarDec') return val.toFixed(decimals || 2);
  if (format === 'percent')   return val.toFixed(decimals || 2);
  if (format === 'months')    return Math.round(val);
  if (format === 'number')    return Math.round(val).toLocaleString('en-US');
  return val;
}

function parseVal(text) {
  const cleaned = String(text).replace(/[$,%\s]|mo/gi, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function buildSidebar(container, onUpdate) {
  let html = `<div class="sidebar-title">Your Numbers</div>`;
  let drivingAdded = false;

  SLIDER_CONFIG.forEach(cfg => {
    if (cfg.id === 'miles' && !drivingAdded) {
      html += `<div class="divider-label">Driving &amp; Costs</div>`;
      drivingAdded = true;
    }

    const prefixHtml = cfg.prefix ? `<span class="num-prefix">${cfg.prefix}</span>` : '';
    const suffixHtml = cfg.suffix ? `<span class="num-suffix">${cfg.suffix}</span>` : '';
    const inputClass = `num-input${cfg.prefix ? ' has-prefix' : ''}${cfg.suffix ? ' has-suffix' : ''}`;

    html += `
      <div class="input-group" data-cfg="${cfg.id}">
        <div class="input-label">
          <span>${cfg.label}</span>
        </div>
        <input type="range" id="s-${cfg.id}" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${cfg.default}">
        <div class="num-row">
          <button class="bump-btn" data-bump="-" data-target="${cfg.id}" aria-label="Decrease">−</button>
          <div class="num-wrap">
            ${prefixHtml}
            <input type="text" inputmode="decimal" class="${inputClass}" id="v-${cfg.id}" value="${formatVal(cfg.default, cfg.format, cfg.decimals)}" />
            ${suffixHtml}
          </div>
          <button class="bump-btn" data-bump="+" data-target="${cfg.id}" aria-label="Increase">+</button>
        </div>
      </div>`;
  });

  // Reset to defaults button
  html += `<button class="reset-btn" id="reset-defaults">Reset to defaults</button>`;

  container.innerHTML = html;

  // ─── Wire up sliders → text inputs ───
  SLIDER_CONFIG.forEach(cfg => {
    const slider = document.getElementById(`s-${cfg.id}`);
    const text   = document.getElementById(`v-${cfg.id}`);

    slider.addEventListener('input', () => {
      text.value = formatVal(+slider.value, cfg.format, cfg.decimals);
      text.classList.remove('invalid');
      onUpdate();
    });

    // Text → slider (commit on blur or Enter)
    const commitText = () => {
      const parsed = parseVal(text.value);
      if (parsed === null) {
        text.classList.add('invalid');
        return;
      }
      const clamped = clamp(parsed, cfg.min, cfg.max);
      slider.value = clamped;
      text.value = formatVal(clamped, cfg.format, cfg.decimals);
      text.classList.remove('invalid');
      onUpdate();
    };

    text.addEventListener('blur', commitText);
    text.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        text.blur();
      }
      // Arrow keys for fine-tune from the input
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 1 : -1;
        const stepSize = e.shiftKey ? cfg.bump * 10 : cfg.bump;
        const current = +slider.value;
        const next = clamp(
          Math.round((current + direction * stepSize) * 100) / 100,
          cfg.min, cfg.max
        );
        slider.value = next;
        text.value = formatVal(next, cfg.format, cfg.decimals);
        text.classList.remove('invalid');
        onUpdate();
      }
    });
    text.addEventListener('focus', () => setTimeout(() => text.select(), 0));
  });

  // ─── Wire up bump buttons (precision + hold-to-repeat) ───
  container.querySelectorAll('.bump-btn').forEach(btn => {
    const id = btn.dataset.target;
    const direction = btn.dataset.bump === '+' ? 1 : -1;
    const cfg = SLIDER_CONFIG.find(c => c.id === id);

    const doBump = () => {
      const slider = document.getElementById(`s-${id}`);
      const text   = document.getElementById(`v-${id}`);
      const current = +slider.value;
      const next = clamp(
        Math.round((current + direction * cfg.bump) * 100) / 100,
        cfg.min, cfg.max
      );
      slider.value = next;
      text.value = formatVal(next, cfg.format, cfg.decimals);
      text.classList.remove('invalid');
      onUpdate();
    };

    btn.addEventListener('click', doBump);

    // Hold-to-repeat
    let holdTimer, repeatTimer;
    const startHold = () => {
      holdTimer = setTimeout(() => {
        repeatTimer = setInterval(doBump, 60);
      }, 350);
    };
    const stopHold = () => {
      clearTimeout(holdTimer);
      clearInterval(repeatTimer);
    };
    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('touchstart', startHold, { passive: true });
    btn.addEventListener('mouseup', stopHold);
    btn.addEventListener('mouseleave', stopHold);
    btn.addEventListener('touchend', stopHold);
    btn.addEventListener('touchcancel', stopHold);
  });

  // ─── Reset button ───
  document.getElementById('reset-defaults').addEventListener('click', () => {
    SLIDER_CONFIG.forEach(cfg => {
      const slider = document.getElementById(`s-${cfg.id}`);
      const text   = document.getElementById(`v-${cfg.id}`);
      slider.value = cfg.default;
      text.value = formatVal(cfg.default, cfg.format, cfg.decimals);
      text.classList.remove('invalid');
    });
    onUpdate();
  });
}

function refreshSidebarLabels() {
  // No-op: text inputs now drive themselves. Kept for backwards compatibility
  // with existing pages that call this.
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
