/* แถบขอความยินยอมคุกกี้ + ทางกลับมาเปลี่ยนใจ (analytics.js) · เพิ่ม 2026-09-20
 *   รันด้วย:  node consent.test.js
 *
 * ทำไมต้องมีเทสต์นี้: เดิมผู้ใช้กดตอบครั้งเดียวแล้วจบถาวร เปลี่ยนใจได้ทางเดียวคือ
 * ล้างข้อมูลเว็บไซต์ทิ้งทั้งก้อน ซึ่งลบตั๋วใบฝากขายของลูกค้าไปด้วย
 * การถอนความยินยอมต้องง่ายพอๆ กับการให้ — ข้อนี้คือสิ่งที่เทสต์นี้ล็อกไว้
 *
 * ใช้ DOM ปลอมเล็กๆ ที่เขียนเอง ไม่พึ่งไลบรารีภายนอก (แนวเดียวกับ compare.test.js)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 160) : '')); }
}

// ---------- DOM ปลอมเท่าที่ analytics.js ต้องใช้ ----------
function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    attrs: {},
    children: [],
    parent: null,
    _text: '',
    _html: '',
    textWrites: 0,
    listeners: {},
    get textContent() {
      if (this.children.length) return this.children.map(c => c.textContent).join('');
      return this._text;
    },
    set textContent(v) { this.textWrites++; this._text = String(v); this.children = []; },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); this.children = parseHtml(String(v), this); },
    // ⚠️ `el.id = 'x'` กับ `el.setAttribute('id','x')` ต้องลงที่เดียวกัน
    // analytics.js ใช้แบบแรก ส่วนตัวหา element ของเทสต์อ่านจาก attrs
    get id() { return this.attrs.id || ''; },
    set id(v) { this.attrs.id = String(v); },
    get src() { return this.attrs.src || ''; },
    set src(v) { this.attrs.src = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    appendChild(c) { c.parent = this; this.children.push(c); return c; },
    remove() {
      if (!this.parent) return;
      const i = this.parent.children.indexOf(this);
      if (i >= 0) this.parent.children.splice(i, 1);
      this.parent = null;
    },
    focus() { el.focused = true; },
    // แบนเนอร์เป็น fixed ขอบล่าง — คืนกรอบจำลองให้ measureConsent() วัดได้
    getBoundingClientRect() { return { top: 700, bottom: 780, height: 80, left: 0, right: 390, width: 390 }; },
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    click() { (this.listeners.click || []).forEach(fn => fn({ preventDefault() {} })); },
    querySelector(sel) { return descendants(this).filter(c => matches(c, sel))[0] || null; },
    querySelectorAll(sel) { return descendants(this).filter(c => matches(c, sel)); },
    get classList() {
      const self = this;
      return {
        contains: c => (self.attrs.class || '').split(/\s+/).indexOf(c) >= 0,
        add(c) { if (!this.contains(c)) self.attrs.class = ((self.attrs.class || '') + ' ' + c).trim(); },
        remove(c) { self.attrs.class = (self.attrs.class || '').split(/\s+/).filter(x => x !== c).join(' '); }
      };
    }
  };
  return el;
}
function descendants(root) {
  const out = [];
  (function walk(n) { n.children.forEach(c => { out.push(c); walk(c); }); })(root);
  return out;
}
// รองรับเฉพาะตัวเลือกที่ analytics.js ใช้จริง: '.คลาส' · '[แอตทริบิวต์]' · 'a[href="x"]'
function matches(el, sel) {
  let m = sel.match(/^([a-z]*)\[([a-zA-Z-]+)(?:="([^"]*)")?\]$/);
  if (m) {
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    if (!(m[2] in el.attrs)) return false;
    return m[3] === undefined || el.attrs[m[2]] === m[3];
  }
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  return el.tagName === sel.toUpperCase();
}
// ตัวอ่าน HTML แบบหยาบมาก — พอสำหรับ innerHTML ที่ analytics.js เขียนเอง
function parseHtml(html, parent) {
  const out = [];
  const re = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const el = makeEl(m[1]);
    el.parent = parent;
    const ar = /([a-zA-Z-]+)(?:="([^"]*)")?/g;
    let a;
    while ((a = ar.exec(m[2]))) el.attrs[a[1]] = a[2] === undefined ? '' : a[2];
    if (/<\w+/.test(m[3])) el.children = parseHtml(m[3], el);
    else el._text = m[3].replace(/<[^>]*>/g, '');
    out.push(el);
  }
  return out;
}

const SRC = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');

// รันไฟล์ในสภาพแวดล้อมจำลองหนึ่งรอบ แล้วคืนของที่ใช้ตรวจ
function run(opts) {
  opts = opts || {};
  const store = Object.assign({}, opts.storage || {});
  const body = makeEl('body');
  const head = makeEl('head');
  (opts.extra || []).forEach(e => body.appendChild(e));
  const loaded = [];        // สคริปต์ภายนอกที่ถูกเพิ่มเข้า head/body
  let reloaded = 0;
  const win = {};
  // <html> ปลอม — analytics.js ตั้งตัวแปร CSS --nj-consent-h ไว้ที่นี่ เพื่อให้แถบติดต่อ
  // ติดหนึบในหน้าแปลงหลบแบนเนอร์คุกกี้ได้ (ดู measureConsent)
  const cssVars = {};
  const docEl = {
    style: {
      setProperty(k, v) { cssVars[k] = String(v); },
      removeProperty(k) { delete cssVars[k]; },
      getPropertyValue(k) { return k in cssVars ? cssVars[k] : ''; }
    }
  };
  const sandbox = {
    console, JSON, Array, Object, String, Number, Boolean, Date, RegExp, Math,
    setTimeout, clearTimeout, encodeURIComponent, decodeURIComponent,
    window: win,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    sessionStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    innerHeight: 812, innerWidth: 390,
    location: { hostname: 'njteedinsure.com', search: '', reload() { reloaded++; } },
    navigator: { sendBeacon() { return true; } },
    fetch() { return Promise.resolve({ ok: true }); },
    Blob: function () {},
    document: {
      readyState: 'complete',
      body, head,
      documentElement: docEl,
      createElement: t => { const e = makeEl(t); if (t === 'script') loaded.push(e); return e; },
      getElementById: id => descendants(body).filter(e => e.attrs.id === id)[0] || null,
      querySelector: sel => descendants(body).filter(e => matches(e, sel))[0] || null,
      querySelectorAll: sel => descendants(body).filter(e => matches(e, sel)),
      getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }],
      addEventListener() {}
    }
  };
  sandbox.window = sandbox;      // analytics.js อ่าน window.NJConsent เป็นต้น
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox, { filename: 'analytics.js' });
  return {
    sandbox, body, store, loaded, cssVars,
    get reloaded() { return reloaded; },
    bar: () => descendants(body).filter(e => e.attrs.id === 'nj-consent')[0] || null,
    pixelLoaded: () => loaded.some(e => /connect\.facebook\.net|googletagmanager/.test(e.src || '')) || !!sandbox.fbq
  };
}

console.log('\n1) ยังไม่เคยตอบ — ต้องถาม และต้องยังไม่โหลดตัวติดตาม');
let r = run({});
check('⭐ แถบขอความยินยอมขึ้นมา', !!r.bar());
check('⭐ ยังไม่โหลด Meta Pixel ก่อนได้รับความยินยอม', !r.pixelLoaded());
check('มีปุ่มปฏิเสธ', !!r.bar().querySelector('.nj-consent-no'));
check('มีปุ่มยอมรับ', !!r.bar().querySelector('.nj-consent-yes'));
check('⭐ แถบมีลิงก์ไปนโยบายคุกกี้', !!r.bar().querySelector('a[href="cookie.html"]'),
      r.bar().innerHTML.slice(0, 160));
check('แถบประกาศตัวเองให้เครื่องอ่านหน้าจอรู้', r.bar().getAttribute('role') === 'region' &&
      !!r.bar().getAttribute('aria-label'));

console.log('\n2) กดปฏิเสธ');
r = run({});
r.bar().querySelector('.nj-consent-no').click();
check('จำคำตอบไว้เป็น no', r.store.njts_consent === 'no');
check('แถบหายไป', !r.bar());
check('⭐ ยังไม่โหลด Meta Pixel', !r.pixelLoaded());

console.log('\n3) กดยอมรับ');
r = run({});
r.bar().querySelector('.nj-consent-yes').click();
check('จำคำตอบไว้เป็น yes', r.store.njts_consent === 'yes');
check('โหลดตัวติดตามแล้ว', r.pixelLoaded());
check('แถบหายไป', !r.bar());

console.log('\n4) เคยตอบไปแล้ว — ต้องไม่ถามซ้ำเอง');
r = run({ storage: { njts_consent: 'no' } });
check('ตอบ no ไว้ → ไม่ขึ้นแถบเอง', !r.bar());
check('ตอบ no ไว้ → ไม่โหลดตัวติดตาม', !r.pixelLoaded());
r = run({ storage: { njts_consent: 'yes' } });
check('ตอบ yes ไว้ → ไม่ขึ้นแถบเอง', !r.bar());
check('ตอบ yes ไว้ → โหลดตัวติดตามให้เลย', r.pixelLoaded());

console.log('\n5) ⭐ ทางกลับมาเปลี่ยนใจ — ข้อสำคัญที่สุดของไฟล์นี้');
function withFooterLink(consent) {
  const btn = makeEl('button');
  btn.attrs['data-njconsent'] = '';
  const state = makeEl('p');
  state.attrs['data-njconsent-state'] = '';
  return run({ storage: consent ? { njts_consent: consent } : {}, extra: [btn, state] });
}
r = withFooterLink('no');
check('ตอนโหลดยังไม่มีแถบ (เพราะเคยตอบแล้ว)', !r.bar());
r.body.querySelector('[data-njconsent]').click();
check('⭐ กดลิงก์ "ตั้งค่าคุกกี้" แล้วแถบกลับมา', !!r.bar());
check('โฟกัสไปที่ปุ่มในแถบ เพื่อให้คนใช้คีย์บอร์ดไปต่อได้', !!r.bar().querySelector('.nj-consent-no').focused);

r = withFooterLink('yes');
r.body.querySelector('[data-njconsent]').click();
r.bar().querySelector('.nj-consent-no').click();
check('เปลี่ยนจากยอมรับเป็นปฏิเสธได้', r.store.njts_consent === 'no');
check('⭐ ถอนความยินยอมหลังโหลด Pixel ไปแล้ว ต้องโหลดหน้าใหม่ (ถอนสคริปต์ที่รันแล้วไม่ได้จริง)',
      r.reloaded === 1, 'reloaded=' + r.reloaded);

console.log('\n6) ข้อความบอกสถานะปัจจุบัน');
r = withFooterLink('yes');
let st = r.body.querySelector('[data-njconsent-state]');
check('บอกว่าตอนนี้ยอมรับอยู่', /ยอมรับ/.test(st.textContent), st.textContent);
r = withFooterLink('no');
st = r.body.querySelector('[data-njconsent-state]');
check('บอกว่าตอนนี้ปฏิเสธอยู่', /ปฏิเสธ/.test(st.textContent), st.textContent);
r = withFooterLink(null);
st = r.body.querySelector('[data-njconsent-state]');
check('ยังไม่ได้เลือก → บอกว่ายังไม่ได้เลือก', /ยังไม่ได้เลือก/.test(st.textContent), st.textContent);

console.log('\n7) กับดัก MutationObserver — ห้ามเขียน textContent ทับด้วยค่าเดิม');
r = withFooterLink('no');
st = r.body.querySelector('[data-njconsent-state]');
const before = st.textWrites;
r.sandbox.window.NJConsent.open();     // เปิดแถบ → paintConsentState ถูกเรียกอีกรอบ
r.bar().querySelector('.nj-consent-no').click();
check('⭐ ค่าเท่าเดิม → ต้องไม่เขียนซ้ำ', st.textWrites === before,
      'เขียนเพิ่ม ' + (st.textWrites - before) + ' ครั้ง');

console.log('\n8) API ที่หน้าอื่นเรียกใช้');
r = run({});
check('เปิด window.NJConsent ให้เรียกได้', typeof r.sandbox.window.NJConsent === 'object');
check('มี open()', typeof r.sandbox.window.NJConsent.open === 'function');
check('มี value()', typeof r.sandbox.window.NJConsent.value === 'function');

console.log('\n9) ถ้อยคำบนแบนเนอร์ (Sprint 4 · งานที่ 12)');
r = run({});
let btns = r.bar().querySelector('.nj-consent-btns').textContent;
check('⭐ ปุ่มยอมรับบอกว่ายอมรับ "ทั้งหมด"', /ยอมรับทั้งหมด/.test(btns), btns);
check('⭐ ปุ่มปฏิเสธบอกว่าได้ "เฉพาะที่จำเป็น" ไม่ใช่คำว่าปฏิเสธลอยๆ',
      /เฉพาะที่จำเป็น/.test(btns), btns);
// อ่านจาก innerHTML ไม่ใช่ textContent — ตัวอ่าน HTML แบบหยาบข้างบนทิ้งข้อความที่อยู่ก่อน <a>
check('บอกว่าเลือกเฉพาะที่จำเป็นแล้วยังใช้เว็บได้ครบ', /ใช้งานเว็บได้ครบ/.test(r.bar().innerHTML));
check('มีทางไปหน้าตั้งค่า/นโยบายคุกกี้', !!r.bar().querySelector('a[href="cookie.html"]'));
// ⚠️ ยังมีของให้เลือกจริงหมวดเดียว (การตลาด) จึงตั้งใจไม่ทำแผงติ๊กหมวด — ดูเหตุผลใน CLAUDE.md
check('ยังไม่มีแผงติ๊กหมวด (ตั้งใจ) จึงมีปุ่มแค่ 2 ปุ่ม',
      r.bar().querySelectorAll('button').length === 2);

console.log('\n10) ⭐ แบนเนอร์ต้องไม่บังแถบติดต่อติดหนึบในหน้าแปลง');
// แบนเนอร์เป็น fixed ขอบล่าง z-index 900 · แถบติดต่อของหน้าแปลงอยู่ 150 จึงถูกทับเต็มๆ
// ซึ่งแปลว่าผู้ซื้อที่ยังไม่ตอบแบนเนอร์ กดปุ่มโทร/ไลน์ของแปลงนั้นไม่ได้เลย
const landCss = fs.readFileSync(path.join(__dirname, 'land.css'), 'utf8');
check('⭐ .ld-sticky บวกความสูงแบนเนอร์เข้าไปในระยะขอบล่าง',
      landCss.indexOf('bottom: calc(69px + var(--nj-consent-h, 0px))') >= 0);
const anaSrc = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');
check('analytics.js เป็นคนตั้งค่าตัวแปรนี้', anaSrc.indexOf('--nj-consent-h') >= 0);
check('วัดจากตัวแบนเนอร์จริง ไม่ใช่ตัวเลขที่เดา', /getBoundingClientRect/.test(anaSrc));
check('⭐ เทียบค่าเดิมก่อนเขียน (กับดัก MutationObserver)',
      anaSrc.indexOf("getPropertyValue('--nj-consent-h') === want") >= 0);
r = run({});
check('⭐ มีแบนเนอร์อยู่ = ตั้งตัวแปรให้ของอื่นหลบ',
      '--nj-consent-h' in r.cssVars, JSON.stringify(r.cssVars));
r.bar().querySelector('.nj-consent-yes').click();
check('⭐ ตอบแล้ว = คืนพื้นที่ทันที ไม่ทิ้งช่องว่างค้างไว้',
      !('--nj-consent-h' in r.cssVars), JSON.stringify(r.cssVars));

console.log('\n' + (fail ? '❌' : '✅') + ' consent: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
