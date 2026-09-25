// ทดสอบงานแก้บนมือถือ 3 ข้อ (เจ้าของแจ้ง 25 ก.ย. 2569)
//   1) ลิ้นชักเมนูมือถือ: หัวกลุ่ม/เมนูย่อยมองไม่เห็นบนพื้นน้ำเงินเข้ม
//   2) หน้าฝากขาย: แตะช่องจังหวัดแล้วไม่มีรายชื่อให้เลือก (datalist ไม่ทำงานบนมือถือหลายรุ่น)
//   3) หัวข้อ hero หน้าแรก: "ที่" อ่านเป็น "ที" (ฟอนต์ Plex ตัวหนาวางไม้เอกทับหางสระ ี)
// รันด้วย:  node mobilefix.test.js
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

// ---------------------------------------------------------------------------
console.log('\n1) ลิ้นชักเมนูมือถือ — ห้ามใช้สีเข้ม/เทาบนพื้นน้ำเงินเข้ม');
const menu = noComments(read('menu.css'));
ok('ลิ้นชักยังเป็นพื้นน้ำเงินเข้ม #0B2549 (สีในข้อนี้คิดจากพื้นนี้)', /\.njmenu-panel\{[^}]*background:#0B2549/.test(menu));
function rule(sel) {
  const i = menu.indexOf(sel + ' {');
  return i < 0 ? '' : menu.slice(i, menu.indexOf('}', i));
}
const DARK = /var\(--nj-(navy|gray)-|#0B1F3A|#5A6B7D/i;
['.njmenu-list .njmenu-group', '.njmenu-list .njmenu-sub', '.njmenu-list a[aria-current="page"]'].forEach(sel => {
  const r = rule(sel);
  ok('มีกฎ ' + sel, !!r);
  ok('⭐ ' + sel + ' ไม่ใช้สีตัวอักษรโทนเข้ม/เทา', r && !/color:\s*(var\(--nj-(navy|gray)-|#0B1F3A|#5A6B7D)/i.test(r), r);
});
ok('หัวกลุ่มเป็นสีทอง', /color:\s*#D8B96B/.test(rule('.njmenu-list .njmenu-group')));
ok('เมนูย่อยเป็นสีตัวอักษรสว่าง', /color:\s*#EAF1FA/.test(rule('.njmenu-list .njmenu-sub')));
// ความต่างสี WCAG บนพื้น #0B2549
function lum(hex) {
  const c = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
ok('ทองบนพื้นลิ้นชักผ่าน AA (≥4.5:1)', ratio('#D8B96B', '#0B2549') >= 4.5, ratio('#D8B96B', '#0B2549').toFixed(2));
ok('ตัวอักษรเมนูย่อยบนพื้นลิ้นชักผ่าน AA', ratio('#EAF1FA', '#0B2549') >= 4.5);
ok('ไม่เหลือตัวแปรสีเข้มในบล็อกลิ้นชักแบบกลุ่ม', !DARK.test(menu.slice(menu.indexOf('.njmenu-list .njmenu-group {'))));

// ---------------------------------------------------------------------------
console.log('\n2) รายการให้แตะเลือก (แทน datalist) — ทดสอบพฤติกรรมด้วย DOM จำลอง');

// DOM จำลองขนาดเล็ก — พอสำหรับ picker() เท่านั้น
function El(tag) {
  this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.listeners = {};
  this.parentNode = null; this.hidden = false; this.value = ''; this.className = ''; this.id = '';
  this.textContent = ''; this.offsetTop = 0; this.offsetHeight = 44; this.scrollTop = 0; this.clientHeight = 248;
}
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); };
El.prototype.getAttribute = function (k) { return k === 'id' ? (this.id || null) : (k in this.attrs ? this.attrs[k] : null); };
El.prototype.hasAttribute = function (k) { return k in this.attrs; };
El.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
El.prototype.appendChild = function (c) {
  if (c.parentNode) c.parentNode.children.splice(c.parentNode.children.indexOf(c), 1);
  c.parentNode = this; this.children.push(c); return c;
};
El.prototype.insertBefore = function (c, ref) {
  if (c.parentNode) c.parentNode.children.splice(c.parentNode.children.indexOf(c), 1);
  c.parentNode = this; this.children.splice(this.children.indexOf(ref), 0, c); return c;
};
El.prototype.addEventListener = function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); };
El.prototype.dispatchEvent = function (e) {
  if (!e.target) e.target = this;
  (this.listeners[e.type] || []).forEach(fn => fn(e));
  if (e.bubbles && this.parentNode) this.parentNode.dispatchEvent(e);
  return !e.defaultPrevented;
};
El.prototype.closest = function (sel) {
  for (let n = this; n; n = n.parentNode) if (sel === 'li[role="option"]' && n.tagName === 'LI' && n.attrs.role === 'option') return n;
  return null;
};
Object.defineProperty(El.prototype, 'innerHTML', { set(v) { if (v === '') this.children.forEach(c => { c.parentNode = null; }); this.children = []; } });
Object.defineProperty(El.prototype, 'options', { get() { return this.children; } });
function Ev(type, o) { this.type = type; this.bubbles = !!(o && o.bubbles); this.defaultPrevented = false; this.isTrusted = !!(o && o.trusted); this.key = o && o.key; }
Ev.prototype.preventDefault = function () { this.defaultPrevented = true; };

const byId = {};
global.document = {
  getElementById: id => byId[id] || null,
  createElement: t => new El(t)
};
global.Event = function (t, o) { return new Ev(t, o); };
global.window = {};
new Function(read('landform.js'))();
const LF = global.window.NJLandForm;
ok('⭐ NJLandForm.picker เปิดให้หน้าอื่นใช้ (verify.js ใช้กับช่องแหล่งทรัพย์)', typeof LF.picker === 'function');

function setup(names) {
  const label = new El('label');
  const input = new El('input'); input.id = 'p'; input.setAttribute('list', 'p-list');
  const dl = new El('datalist'); dl.id = 'p-list';
  names.forEach(n => { const o = new El('option'); o.value = n; dl.appendChild(o); });
  label.appendChild(input); label.appendChild(dl);
  byId.p = input; byId['p-list'] = dl;
  LF.picker(input);
  const box = input.parentNode.children.find(c => c.className === 'njpick-list');
  const fired = [];
  input.addEventListener('input', e => fired.push('input'));
  input.addEventListener('change', e => fired.push('change'));
  return { label, input, dl, box, fired, opts: () => box.children.filter(c => c.attrs.role === 'option').map(c => c.textContent) };
}
const PROV = ['สมุทรปราการ', 'กรุงเทพมหานคร', 'ชลบุรี', 'ปทุมธานี', 'สมุทรสาคร'];
let t = setup(PROV);
ok('⭐ ถอด list ออกจากช่อง (ไม่ให้ datalist ของเบราว์เซอร์แย่งกับรายการของเรา)', !t.input.hasAttribute('list'));
ok('ช่องถูกห่อใน .njpick (จุดอ้างอิงตำแหน่ง) และยังอยู่ใน <label> เดิม', t.input.parentNode.className === 'njpick' && t.input.parentNode.parentNode === t.label);
ok('datalist ยังอยู่ (เป็นแหล่งรายชื่อ)', t.label.children.indexOf(t.dl) >= 0);
ok('ช่องเป็น combobox ชี้ไปที่รายการ', t.input.attrs.role === 'combobox' && t.input.attrs['aria-controls'] === t.box.id);
ok('เริ่มต้นรายการซ่อนอยู่', t.box.hidden === true && t.input.attrs['aria-expanded'] === 'false');

t.input.dispatchEvent(new Ev('focus'));
ok('⭐ แตะช่อง (focus) = เปิดรายชื่อทั้งหมด', !t.box.hidden && t.opts().length === PROV.length, t.opts());
ok('aria-expanded = true ตอนเปิด', t.input.attrs['aria-expanded'] === 'true');

t.input.value = 'สมุทร';
t.input.dispatchEvent(new Ev('input', { trusted: true }));
ok('⭐ พิมพ์แล้วกรองตามคำที่มีอยู่ในชื่อ', JSON.stringify(t.opts()) === JSON.stringify(['สมุทรปราการ', 'สมุทรสาคร']), t.opts());

t.fired.length = 0;
const md = new Ev('mousedown', { bubbles: true });
t.box.children[1].dispatchEvent(md);
ok('⭐ mousedown บนรายการถูกกัน (ช่องไม่เสียโฟกัส · แป้นพิมพ์มือถือไม่หุบ)', md.defaultPrevented);
const ck = new Ev('click', { bubbles: true });
t.box.children[1].dispatchEvent(ck);
ok('⭐ แตะชื่อแล้วค่าเข้าช่อง', t.input.value === 'สมุทรสาคร', t.input.value);
ok('⭐ ยิง input + change เหมือนผู้ใช้พิมพ์เอง (initAddress ฟังสองตัวนี้อยู่)', t.fired.join() === 'input,change', t.fired.join());
ok('เลือกแล้วรายการปิด', t.box.hidden === true);
ok('⭐ click ถูก preventDefault — ไม่งั้น <label> ส่งคลิกต่อให้ช่องแล้วรายการเด้งกลับ', ck.defaultPrevented);

t.input.dispatchEvent(new Ev('click'));
ok('กลับมาแตะช่องที่มีค่าตรงรายชื่อ = เห็นรายการทั้งหมด (เปลี่ยนใจได้)', !t.box.hidden && t.opts().length === PROV.length);
ok('ตัวที่เลือกอยู่ถูกเน้น', t.box.children.some(c => c.className === 'is-current' && c.textContent === 'สมุทรสาคร'));

const down = new Ev('keydown', { key: 'ArrowDown' });
t.input.dispatchEvent(down);
t.input.dispatchEvent(new Ev('keydown', { key: 'ArrowDown' }));
ok('ลูกศรลงเลื่อนตัวเลือก + aria-activedescendant', t.input.attrs['aria-activedescendant'] === t.box.children[1].id && down.defaultPrevented);
const enter = new Ev('keydown', { key: 'Enter' });
t.input.dispatchEvent(enter);
ok('⭐ Enter = เลือก ไม่ใช่ส่งฟอร์ม', enter.defaultPrevented && t.input.value === 'กรุงเทพมหานคร', t.input.value);

t.input.dispatchEvent(new Ev('focus'));
t.input.dispatchEvent(new Ev('keydown', { key: 'Escape' }));
ok('Escape ปิดรายการ', t.box.hidden === true);
t.input.dispatchEvent(new Ev('focus'));
t.input.dispatchEvent(new Ev('blur'));
ok('ออกจากช่อง (blur) ปิดรายการ', t.box.hidden === true);

t.input.value = 'ไม่มีจังหวัดนี้';
t.input.dispatchEvent(new Ev('input', { trusted: true }));
ok('พิมพ์ชื่อที่ไม่มี = บอกว่าไม่พบ แต่ยังพิมพ์ต่อได้ (ไม่บล็อก)', !t.box.hidden && t.opts().length === 0 &&
   t.box.children.some(c => c.className === 'njpick-none'));

const t2 = setup([]);
t2.input.dispatchEvent(new Ev('focus'));
ok('⭐ ยังไม่เลือกชั้นบน (รายชื่อว่าง) = ไม่เปิดกล่องเปล่า', t2.box.hidden === true);

const before = t2.input.parentNode;
LF.picker(t2.input);
ok('เรียกซ้ำไม่ห่อซ้อน', t2.input.parentNode === before);

console.log('\n2b) ต่อสายครบทุกหน้า');
const lf = read('landform.js');
ok('⭐ initAddress เรียก picker ครบสามช่อง (ฝากขาย · ส่งตรวจ · ฝากหา ได้หมด)', /\[pEl, aEl, tEl\]\.forEach\(picker\)/.test(lf));
ok('verify.js ใช้กับช่องแหล่งทรัพย์ด้วย', /NJLandForm\.picker\(\$\('vf-source'\)\)/.test(read('verify.js')));
const ui = read('ui.css');
ok('ui.css มีสไตล์ .njpick / .njpick-list', /\.njpick\{position:relative/.test(ui) && /\.njpick-list\{/.test(ui));
ok('แถวในรายการสูงอย่างน้อย 44px (เป้านิ้ว)', /\.njpick-list li\{[^}]*min-height:44px/.test(ui));
ok('ตัวอักษรในรายการ 16px (iOS ไม่ซูมหน้า)', /\.njpick-list li\{[^}]*font-size:16px/.test(ui));
['consign.html', 'verify.html', 'wanted.html'].forEach(f => {
  const h = read(f);
  ok(f + ' ยังเก็บ datalist ใน HTML (JS ไม่ทำงาน = ใช้ datalist ของเบราว์เซอร์ได้ตามเดิม)', /list="[^"]+"/.test(h) && /<datalist/.test(h));
  ok(f + ' โหลด ui.css', h.indexOf('href="ui.css"') >= 0);
});

// ---------------------------------------------------------------------------
console.log('\n3) หัวข้อ hero หน้าแรก — ฟอนต์ Anuphan');
const home = read('home.css');
const h1 = (home.match(/\.hero h1\{[^}]*\}/) || [''])[0];
ok('⭐ .hero h1 ใช้ Anuphan (ถอยไป Plex ถ้าโหลดไม่ได้)', /font-family:'Anuphan',var\(--font\)/.test(h1), h1);
const lh = parseFloat((h1.match(/line-height:([\d.]+)/) || [])[1]);
ok('⭐ line-height ≥ 1.25 (สระบน+วรรณยุกต์ซ้อนต้องมีที่)', lh >= 1.25, lh);
ok('⭐ ไม่มี letter-spacing ติดลบ', !/letter-spacing:-/.test(h1));
ok('@font-face ของ Anuphan อยู่ใน home.css (thai + latin)',
   /font-family:'Anuphan'[^}]*anuphan-thai-700\.woff2/.test(home) && /font-family:'Anuphan'[^}]*anuphan-latin-700\.woff2/.test(home));
ok('font-display:swap (ตัวหนังสือขึ้นทันที ไม่รอฟอนต์)', (home.match(/font-family:'Anuphan'[^}]*font-display:swap/g) || []).length === 2);
['fonts/anuphan-thai-700.woff2', 'fonts/anuphan-latin-700.woff2'].forEach(f =>
  ok('มีไฟล์ ' + f, fs.existsSync(path.join(__dirname, f)) && fs.statSync(path.join(__dirname, f)).size > 1000));
ok('⭐ มีสัญญาอนุญาต fonts/OFL-Anuphan.txt (SIL OFL 1.1 บังคับให้แนบ)',
   fs.existsSync(path.join(__dirname, 'fonts', 'OFL-Anuphan.txt')) && /Anuphan/.test(read('fonts/OFL-Anuphan.txt')));
ok('fonts.css ยังเป็นตระกูลเดียว (Anuphan ไม่หลุดไปโหลดทุกหน้า)', !/Anuphan/.test(read('fonts.css')));
const idx = read('index.html');
ok('index.html preload ฟอนต์หัวข้อ พร้อม crossorigin',
   /<link rel="preload" as="font" type="font\/woff2" href="fonts\/anuphan-thai-700\.woff2" crossorigin>/.test(idx));
ok('หัวข้อยังเขียนว่า "ที่ดิน" และ "ที่ตรวจสอบได้" (ข้อความไม่ถูกแตะ)',
   /<h1>ซื้อ–ขายที่ดิน มั่นใจกว่า<br><span>ด้วยข้อมูลที่ตรวจสอบได้<\/span><\/h1>/.test(idx));

console.log('\n' + (fail ? '❌' : '✅') + ' mobilefix: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
