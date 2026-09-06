/* ล็อกบั๊กที่เคยทำให้หน้าแรกและหน้ารวมประกาศค้างทั้งแท็บ (เจอ 2026-09-06)
 *   รันด้วย:  node compare.test.js
 *
 * เกิดอะไรขึ้น: compare.js แปะปุ่ม "เทียบ" ลงในตะแกรงประกาศ แล้วเฝ้าตะแกรงเดียวกันด้วย
 * MutationObserver (childList + subtree) เพื่อรอการ์ดชุดใหม่ · ทุกครั้งที่ syncMarks() เขียน
 * textContent ทับด้วย "ค่าเดิม" เบราว์เซอร์จะลบ text node เดิมแล้วสร้างใหม่ ซึ่งนับเป็น
 * childList mutation → observer ยิง → syncMarks เขียนอีก → วนไม่รู้จบ กินซีพียู 100%
 * ทันทีที่ประกาศโหลดเสร็จ แท็บค้างจนต้องปิด
 *
 * บทเรียนที่ล็อกไว้ที่นี่: **การเขียนค่าเดิมทับ ไม่ใช่ "การไม่เปลี่ยนอะไร"** ในสายตาของ MutationObserver
 *
 * ใช้ DOM ปลอมเล็กๆ ที่เขียนเอง ไม่พึ่งไลบรารีภายนอก — repo นี้เป็นเว็บสแตติกล้วน ไม่มี package.json
 * และไม่ควรมี node_modules เพียงเพื่อเทสต์ข้อเดียว
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}

// ---------- DOM ปลอมเท่าที่ compare.js ต้องใช้ ----------
let textWrites = 0;
function makeEl(tag, attrs) {
  const el = {
    tagName: tag,
    attrs: Object.assign({}, attrs || {}),
    children: [],
    _text: '',
    classes: new Set(),
    get textContent() { return this._text; },
    set textContent(v) { textWrites++; this._text = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    appendChild(c) { this.children.push(c); return c; },
    querySelector(sel) { return this.children.filter(c => matches(c, sel))[0] || null; },
    querySelectorAll(sel) { return all(this).filter(c => matches(c, sel)); },
    addEventListener() {},
    classList: {
      contains: (c) => el.classes.has(c),
      add: (c) => el.classes.add(c),
      remove: (c) => el.classes.delete(c),
      toggle: (c, on) => { if (on === undefined) on = !el.classes.has(c); on ? el.classes.add(c) : el.classes.delete(c); }
    }
  };
  return el;
}
function all(root) {
  const out = [];
  (function walk(n) { n.children.forEach(c => { out.push(c); walk(c); }); })(root);
  return out;
}
// รองรับเฉพาะตัวเลือกที่ compare.js ใช้จริง — '.คลาส' และ '[แอตทริบิวต์]'
function matches(el, sel) {
  if (sel.startsWith('.')) return el.classes.has(sel.slice(1));
  if (sel.startsWith('[')) return sel.slice(1, -1) in el.attrs;
  return false;
}

const root = makeEl('root');
const store = {};
const sandbox = {
  console,
  setTimeout, clearTimeout,
  JSON, Array, Object, String,
  sessionStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  },
  document: {
    readyState: 'complete',
    body: root,
    getElementById: () => null,               // ไม่มีตะแกรงประกาศในเทสต์นี้ → ไม่ตั้งตัวเฝ้า
    querySelectorAll: (sel) => all(root).filter(c => matches(c, sel)),
    querySelector: (sel) => all(root).filter(c => matches(c, sel))[0] || null,
    createElement: (t) => makeEl(t),
    addEventListener: () => {}
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

// สร้างปุ่มแบบเดียวกับที่ decorate() แปะบนการ์ด
const btn = makeEl('button', { 'data-njcmp': 'OP-001' });
btn.classes.add('njcmp-btn');
const txt = makeEl('span');
txt.classes.add('njcmp-txt');
txt.textContent = 'เทียบ';
btn.appendChild(txt);
root.appendChild(btn);
textWrites = 0;   // ไม่นับการตั้งค่าเริ่มต้นข้างบน

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'compare.js'), 'utf8'), sandbox, { filename: 'compare.js' });
const C = sandbox.window.NJCompare;

console.log('\n1) เขียน textContent ทับด้วยค่าเดิม = ห้ามเขียนเลย (กันลูป MutationObserver)');
check('โหลด compare.js ได้ใน DOM ปลอม', !!C);
C.sync();
check('⭐ เรียก sync() ตอนสถานะไม่เปลี่ยน ต้องไม่เขียน textContent เลย', textWrites === 0, 'เขียนไป ' + textWrites + ' ครั้ง');
C.sync(); C.sync(); C.sync();
check('⭐ เรียกซ้ำอีก 3 รอบก็ยังไม่เขียน (นี่คือสิ่งที่ทำให้ลูปหยุด)', textWrites === 0, 'เขียนไป ' + textWrites + ' ครั้ง');

console.log('\n2) แต่ตอนสถานะเปลี่ยนจริง ต้องเขียน');
C.toggle('OP-001');
check('เลือกแปลงแล้วป้ายเปลี่ยนเป็น "เลือกแล้ว"', txt.textContent === 'เลือกแล้ว', txt.textContent);
check('มีการเขียน textContent เกิดขึ้นจริง 1 ครั้ง', textWrites === 1, String(textWrites));
C.sync(); C.sync();
check('⭐ sync() ซ้ำหลังเปลี่ยนสถานะ ก็ยังไม่เขียนเพิ่ม', textWrites === 1, String(textWrites));
C.toggle('OP-001');
check('กดซ้ำแล้วกลับเป็น "เทียบ"', txt.textContent === 'เทียบ' && textWrites === 2, txt.textContent + ' / ' + textWrites);

console.log('\n3) ป้ายเฉพาะของแต่ละที่ (data-on/data-off)');
btn.setAttribute('data-off', '＋ เทียบกับแปลงอื่น');
btn.setAttribute('data-on', '✓ อยู่ในรายการเทียบแล้ว');
C.sync();
check('ปุ่มบนหน้ารายละเอียดแปลงใช้ข้อความยาวของตัวเองได้', txt.textContent === '＋ เทียบกับแปลงอื่น', txt.textContent);
const wroteOnce = textWrites;
C.sync();
check('⭐ แล้วก็ยังไม่เขียนซ้ำอีก', textWrites === wroteOnce, String(textWrites));

console.log('\n4) เพดานจำนวนแปลงที่เทียบได้');
['A', 'B', 'C', 'D', 'E'].forEach(id => C.toggle(id));
check('เก็บได้ไม่เกิน ' + C.MAX + ' แปลง', C.count() === C.MAX, String(C.count()));

console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
