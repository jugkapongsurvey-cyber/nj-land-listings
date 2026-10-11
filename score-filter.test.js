// ทดสอบตัวกรอง/การเรียงตาม "คะแนนความพร้อมของข้อมูล" บนหน้ารวมประกาศ (11 ต.ค. 69)
// รันด้วย:  node score-filter.test.js [path ของ nj-survey-system]
// ⚠️ รัน listings.js ของจริงใน node:vm กับ DOM ปลอมที่เขียนเอง (repo นี้ไม่มี package.json · ไม่พึ่งไลบรารีภายนอก)
//    ข้อมูลทดสอบ = คะแนนของ 7 แปลงจริงบน production (11 ต.ค. 69) + แปลงไม่มีคะแนน + ประกาศเด่น
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}

const html = read('listings.html');
const js = read('listings.js');

// ---------- DOM ปลอม ----------
// element ต่อ id สร้างตามที่ถูกเรียก · <select> อ่านตัวเลือกจาก listings.html · innerHTML ที่มี <option> แปลงเป็น options
function parseOptions(s) {
  const out = [];
  String(s).replace(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g, (_, v, t) => { out.push({ value: v, textContent: t }); return _; });
  return out;
}
function makeEl(id) {
  const handlers = {};
  const attrs = {};
  const el = {
    id, hidden: false, checked: false, textContent: '', _html: '', options: [], _value: '',
    style: {}, attrs,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, on) { if (on === undefined) on = !this._s.has(c); if (on) this._s.add(c); else this._s.delete(c); return on; },
      contains(c) { return this._s.has(c); }
    },
    get value() { return this.options.length ? (this._value || this.options[0].value) : this._value; },
    set value(v) { this._value = String(v); },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); const o = parseOptions(v); if (o.length) { this.options = o; this._value = ''; } },
    addEventListener(t, fn) { (handlers[t] = handlers[t] || []).push(fn); },
    fire(t, ev) { (handlers[t] || []).forEach(fn => fn(ev || { target: el, preventDefault() {} })); },
    setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return k in attrs ? attrs[k] : null; },
    hasAttribute(k) { return k in attrs; },
    remove(i) { this.options.splice(i, 1); },
    appendChild(o) { this.options.push(o); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    reset() {}, focus() {}, scrollIntoView() {}
  };
  return el;
}
function boot(search, listings) {
  const els = {};
  const $ = id => {
    if (!els[id]) {
      const e = els[id] = makeEl(id);
      const m = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
      if (m) e.options = parseOptions(m[1]);
    }
    return els[id];
  };
  // ชิปในแถบ — อ่านจาก HTML จริง
  const chips = [];
  html.replace(/<button type="button" class="ls-chip" data-chip="([a-z]+)"[^>]*>([^<]*)<\/button>/g, (_, k, t) => {
    const c = makeEl('chip-' + k); c.setAttribute('data-chip', k); c.textContent = t; chips.push(c); return _;
  });
  const loc = { pathname: '/listings.html', search: search || '', hash: '' };
  const doc = {
    getElementById: $,
    querySelectorAll: sel => sel.indexOf('data-chip') >= 0 ? chips : [],
    addEventListener() {},
    body: makeEl('body'), documentElement: makeEl('html')
  };
  let resolveLoad;
  const loaded = new Promise(r => { resolveLoad = r; });
  const NJListing = {
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    card: x => '<i data-id="' + x.id + '"></i>',
    emptyHtml: f => '<div class="empty-result">' + (f ? 'filter' : 'none') + '</div>',
    loadFailedHtml: () => 'failed',
    bindGrid() {},
    fetchListings: () => Promise.resolve(listings).then(l => { setTimeout(resolveLoad, 0); return l; })
  };
  const win = {
    NJListing, NJLandMeta: require('./landmeta.js'),
    NJVocab: { PROPERTY_TH: {} }
  };
  const history = { replaceState(_, __, url) { const i = url.indexOf('?'); loc.search = i >= 0 ? url.slice(i).replace(/#.*$/, '') : ''; } };
  win.history = history;
  // ในเบราว์เซอร์ window = global — ตั้ง ctx.window ชี้ตัวเอง ให้ทั้ง window.NJX และ NJX เฉยๆ ใช้ได้
  const ctx = Object.assign(win, {
    document: doc, location: loc, history, URLSearchParams, setTimeout, clearTimeout,
    console, Date, Number, String, Object, Array, Math, isFinite, Infinity
  });
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(js, ctx);
  const ids = () => ((els['listing-grid'] || {})._html || '').match(/data-id="[^"]+"/g) || [];
  return {
    $, chips, loc, loaded,
    ids: () => ids().map(s => s.slice(9, -1)),
    set(id, v) { $(id).value = v; $(id).fire('change'); }
  };
}

// ข้อมูลจริง (คะแนน ณ 11 ต.ค. 69) + แปลงไม่มีคะแนน + ประกาศเด่น
const D = (d) => '2026-10-' + d + 'T00:00:00Z';
const FIX = [
  { id: 'OP-102', type: 'sell', score: { total: 79, band: 'medium' }, updatedAt: D('05'), land: {} },
  { id: 'OP-101', type: 'sell', score: { total: 56, band: 'medium' }, updatedAt: D('09'), land: {} },
  { id: 'OP-091', type: 'sell', score: { total: 48, band: 'low' },    updatedAt: D('08'), land: {} },
  { id: 'OP-088', type: 'sell', score: { total: 49, band: 'low' },    updatedAt: D('07'), land: {} },
  { id: 'OP-025', type: 'sell', score: { total: 67, band: 'medium' }, updatedAt: D('06'), land: {} },
  { id: 'OP-024', type: 'sell', score: { total: 73, band: 'medium' }, updatedAt: D('04'), land: {} },
  { id: 'OP-023', type: 'sell', score: { total: 73, band: 'medium' }, updatedAt: D('03'), land: {} },
  { id: 'OP-900', type: 'sell', score: null, updatedAt: D('10'), land: {} },
  { id: 'OP-901', type: 'rent', score: { total: 80, band: 'high' }, updatedAt: D('01'), land: {}, featured: true }
];
const SCORE = {}; FIX.forEach(x => { SCORE[x.id] = x.score ? x.score.total : null; });
const LM = require('./landmeta.js');
const byNew = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);

(async function () {
  console.log('\n1) โครงหน้า listings.html');
  const form = (html.match(/<form class="ls-filters" id="ls-form"[\s\S]*?<\/form>/) || [''])[0];
  ok('ช่อง #f-score อยู่ในแผงตัวกรอง', form.indexOf('id="f-score"') >= 0);
  const opts = parseOptions((html.match(/<select id="f-score"[^>]*>([\s\S]*?)<\/select>/) || [])[1] || '').map(o => o.value);
  ok('ตัวเลือก ไม่เกี่ยง / 50 / 70 / 80 (ตามลำดับ)', JSON.stringify(opts) === '["all","50","70","80"]', JSON.stringify(opts));
  ok('ชิป "ข้อมูลพร้อม" อยู่ในแถบชิป', /data-chip="score"[^>]*>ข้อมูลพร้อม</.test(html));
  ok('ตัวเลือกเรียง "ข้อมูลพร้อม มาก → น้อย"', /<option value="score_desc">ข้อมูลพร้อม มาก → น้อย<\/option>/.test(html));
  ok('ข้อความกำกับใต้ช่อง (ไม่ใช่คุณภาพที่ดิน) + aria-describedby',
    /id="f-score-hint">[^<]*ไม่ใช่คุณภาพที่ดิน/.test(form) && /id="f-score"[^>]*aria-describedby="f-score-hint"/.test(form));
  ok('กล่องข้อความกำกับอยู่นอก #listing-grid (เห็นทั้งรายการและแผนที่)', html.indexOf('id="score-note"') > 0 && html.indexOf('id="score-note"') < html.indexOf('id="listing-grid"'));
  ok('กล่องข้อความกำกับซ่อนไว้ตั้งต้น', /id="score-note" hidden/.test(html));
  const css = read('listings.css');
  ok('⭐ CSS ซ่อนปุ่มล้างที่ติด [hidden] ได้จริง (.outline-btn มี display ของตัวเอง)', /\.ls-score-note \[hidden\]\{display:none\}/.test(css));

  console.log('\n2) ห้ามคิดคะแนนเอง');
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
  ok('อ่าน score.total เท่านั้น (ไม่อ่าน parts/weight)', /score\.total/.test(code) && !/score\.parts|\.weight\b|ratio/.test(code));
  ok('ไม่ปัดคะแนนเอง (ไม่มี Math.round กับคะแนน)', !/Math\.round\([^)]*score/i.test(code));

  console.log('\n3) ไม่มีตัวกรอง = ผลเหมือนเดิม');
  let P = boot('', FIX); await P.loaded;
  const expectDefault = LM.featuredFirst(FIX.slice().sort(byNew)).map(x => x.id);
  ok('ลำดับตั้งต้น = อัปเดตล่าสุด + ประกาศเด่นขึ้นก่อน (กติกาเดิม)', JSON.stringify(P.ids()) === JSON.stringify(expectDefault), P.ids().join(','));
  ok('ทุกแปลงขึ้นรวมแปลงไม่มีคะแนน (OP-900)', P.ids().length === FIX.length && P.ids().indexOf('OP-900') >= 0);
  ok('ไม่มี score ใน URL', P.loc.search.indexOf('score') < 0, P.loc.search);
  ok('กล่องข้อความกำกับซ่อน', P.$('score-note').hidden === true);
  ok('ชิปข้อมูลพร้อมไม่ติดสถานะเลือก', !P.chips.find(c => c.getAttribute('data-chip') === 'score').classList.contains('is-on'));
  ok('ไม่มีข้อความ "แปลงถูกซ่อน"', P.$('unknown-note').hidden === true);
  ok('ปุ่มแจ้งเตือนไม่มีเงื่อนไขคะแนน', (P.$('ls-alert').getAttribute('href') || '').indexOf('score=') < 0);

  console.log('\n4) กรอง ≥70');
  P.set('f-score', '70');
  const got70 = P.ids();
  ok('ได้เฉพาะแปลงคะแนน ≥ 70', got70.length > 0 && got70.every(id => SCORE[id] !== null && SCORE[id] >= 70), got70.join(','));
  ok('ได้ครบทุกแปลงที่ ≥ 70 (OP-102 OP-024 OP-023 OP-901)', ['OP-102', 'OP-024', 'OP-023', 'OP-901'].every(id => got70.indexOf(id) >= 0) && got70.length === 4, got70.join(','));
  ok('แปลงไม่มีคะแนนไม่ผ่านเกณฑ์', got70.indexOf('OP-900') < 0);
  ok('แปลงไม่มีคะแนนถูกนับเป็น "ยังไม่ได้ระบุ" (ไม่หายเงียบ)', P.$('unknown-note').hidden === false && /อีก 1 แปลง/.test(P.$('unknown-note').textContent));
  ok('URL มี score=70', /[?&]score=70(&|$)/.test(P.loc.search), P.loc.search);
  const chip = P.chips.find(c => c.getAttribute('data-chip') === 'score');
  ok('ชิปบอกค่า "ข้อมูลพร้อม 70+" และติดสถานะเลือก', chip.textContent === 'ข้อมูลพร้อม 70+' && chip.classList.contains('is-on'), chip.textContent);
  ok('ตัวนับตัวกรองที่ใช้อยู่ = (1)', P.$('ls-open-n').textContent === '(1)');
  ok('ข้อความกำกับขึ้น + บอกว่าไม่ใช่คุณภาพที่ดิน', P.$('score-note').hidden === false && /ไม่ใช่การให้คะแนนคุณภาพที่ดิน/.test(P.$('score-note-t').textContent));
  ok('ผลไม่ว่าง = ไม่มีปุ่มล้างในกล่องคะแนน', P.$('score-clear').hidden === true);
  ok('ปุ่มแจ้งเตือนส่ง score=70 ไปหน้าฝากหา', /[?&]score=70(&|$)/.test(P.$('ls-alert').getAttribute('href') || ''));
  ok('ตอนกรองยังคงประกาศเด่นขึ้นก่อน (เรียงตั้งต้น)', got70[0] === 'OP-901');
  P.set('f-score', '80');
  ok('กรอง ≥80 → OP-901 (80 พอดี นับว่าผ่าน)', JSON.stringify(P.ids()) === '["OP-901"]', P.ids().join(','));
  P.set('f-score', '50');
  ok('กรอง ≥50 → ไม่มี OP-088 (49) / OP-091 (48)', P.ids().indexOf('OP-088') < 0 && P.ids().indexOf('OP-091') < 0 && P.ids().length === 6, P.ids().join(','));

  console.log('\n5) query string คงค่าหลังรีเฟรช');
  P = boot('?score=70&sort=score_desc', FIX); await P.loaded;
  ok('เปิดด้วย ?score=70 → ช่องถูกตั้งเป็น 70', P.$('f-score').value === '70');
  ok('เปิดด้วย ?sort=score_desc → การเรียงถูกตั้ง', P.$('f-sort').value === 'score_desc');
  ok('ผลเหมือนตอนเลือกเอง (เฉพาะ ≥ 70)', P.ids().length === 4 && P.ids().every(id => SCORE[id] >= 70), P.ids().join(','));
  ok('URL ยังคงค่าเดิม', /score=70/.test(P.loc.search) && /sort=score_desc/.test(P.loc.search), P.loc.search);
  P = boot('?score=65', FIX); await P.loaded;
  ok('ค่าแปลกปลอมใน URL (65) ถูกเมิน = ไม่กรอง', P.$('f-score').value === 'all' && P.ids().length === FIX.length);
  P = boot('?score=%3Cb%3E', FIX); await P.loaded;
  ok('ค่าที่ไม่ใช่ตัวเลือก (<b>) ถูกเมิน', P.$('f-score').value === 'all' && P.loc.search.indexOf('score') < 0);

  console.log('\n6) เรียง "ข้อมูลพร้อม มาก → น้อย"');
  P = boot('', FIX); await P.loaded;
  P.set('f-sort', 'score_desc');
  const s = P.ids();
  const scored = s.filter(id => SCORE[id] !== null).map(id => SCORE[id]);
  ok('เรียงคะแนนจากมากไปน้อย', scored.every((v, i) => i === 0 || scored[i - 1] >= v), s.map(id => id + ':' + SCORE[id]).join(' '));
  ok('แปลงไม่มีคะแนนอยู่ท้ายสุด (ไม่ถือเป็น 0 แล้วขึ้นหัว)', s[s.length - 1] === 'OP-900');
  ok('คะแนนเท่ากัน (73) = อัปเดตล่าสุดก่อน (OP-024 ก่อน OP-023)', s.indexOf('OP-024') < s.indexOf('OP-023'));
  ok('⭐ ประกาศเด่นไม่ถูกแทรกขึ้นหัว — อยู่ตามคะแนนจริง (80 = อันดับแรกเพราะคะแนนสูงสุด)', s[0] === 'OP-901' && s[1] === 'OP-102');
  const FIX2 = FIX.map(x => x.id === 'OP-901' ? Object.assign({}, x, { score: { total: 20, band: 'low' } }) : x);
  P = boot('?sort=score_desc', FIX2); await P.loaded;
  ok('⭐ ประกาศเด่นคะแนนต่ำอยู่ท้ายตามคะแนน (ไม่ขึ้นก่อน)', P.ids().indexOf('OP-901') === P.ids().length - 2 && P.ids()[0] === 'OP-102', P.ids().join(','));
  ok('เรียงด้วยคะแนนแล้วขึ้นข้อความกำกับ', P.$('score-note').hidden === false);
  ok('URL มี sort=score_desc', /sort=score_desc/.test(P.loc.search));

  console.log('\n7) ผลว่าง');
  const LOW = FIX.filter(x => SCORE[x.id] !== null && SCORE[x.id] < 70 && x.id !== 'OP-901');
  P = boot('?score=80', LOW); await P.loaded;
  ok('ไม่มีแปลงผ่าน → ตะแกรงว่าง', P.ids().length === 0);
  const t = P.$('score-note-t').textContent;
  ok('บอกว่าแปลงที่ยังไม่ได้ตรวจคะแนนต่ำเป็นเรื่องปกติ', /ยังไม่มีใครไปตรวจจะได้คะแนนน้อยเป็นเรื่องปกติ/.test(t), t);
  ok('ผลว่างยังบอกว่าไม่ใช่คุณภาพที่ดิน', /ไม่ใช่การให้คะแนนคุณภาพที่ดิน/.test(t));
  ok('กล่องเป็นแบบผลว่าง + มีปุ่มล้างตัวกรอง', P.$('score-note').classList.contains('is-empty') && P.$('score-clear').hidden === false);
  P.$('score-clear').fire('click');
  ok('กดล้าง → กลับมาทุกแปลง + ช่องเป็นไม่เกี่ยง + URL ไม่มี score', P.ids().length === LOW.length && P.$('f-score').value === 'all' && P.loc.search.indexOf('score') < 0);
  ok('หลังล้าง กล่องข้อความซ่อน', P.$('score-note').hidden === true);

  console.log('\n8) หน้าฝากหาที่ดินรับเงื่อนไขคะแนน');
  const wj = read('wanted.js');
  ok('wanted.js รับเฉพาะ 50/70/80', /sc === '50' \|\| sc === '70' \|\| sc === '80'/.test(wj));
  ok('ประกอบเป็นหมายเหตุ ไม่รับข้อความอิสระ', /extra\.push\('ข้อมูลพร้อมตั้งแต่ ' \+ sc \+ '\/100 ขึ้นไป'\)/.test(wj));

  console.log('\n9) ถ้อยคำตรงกับข้อความกำกับของระบบ (SCORE_DISCLAIM)');
  const sysDir = process.argv[2] || path.join(__dirname, '..', 'nj-survey-system');
  const ls = path.join(sysDir, 'lib', 'landscore.js');
  if (!fs.existsSync(ls)) console.log('  (ข้าม — ไม่เจอ ' + ls + ')');
  else {
    const sys = fs.readFileSync(ls, 'utf8');
    const disc = ((sys.match(/const SCORE_DISCLAIM =([\s\S]*?);/) || [])[1] || '').replace(/'\s*\+\s*'/g, '').replace(/^\s*'|'\s*$/g, '');
    ['ถูกตรวจและบันทึกไว้ครบแค่ไหน', 'ไม่ใช่การให้คะแนนคุณภาพที่ดิน', 'แปลงที่ยังไม่มีใครไปตรวจจะได้คะแนนน้อยเป็นเรื่องปกติ'].forEach(ph => {
      ok('ระบบยังใช้วลี "' + ph + '" และหน้าเว็บใช้ตรงกัน', disc.indexOf(ph) >= 0 && js.indexOf(ph) >= 0);
    });
    const bands = (sys.match(/SCORE_BANDS = \[([\s\S]*?)\];/) || [])[1] || '';
    ok('ขอบช่วงคะแนนของระบบยังเป็น 80 / 50 (ตรงกับตัวเลือก 80 / 50)', /min: 80/.test(bands) && /min: 50/.test(bands));
  }

  console.log('\nผล: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
