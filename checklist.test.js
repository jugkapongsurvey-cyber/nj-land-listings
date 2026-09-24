// ทดสอบหน้า "เช็กลิสต์ตรวจที่ดินก่อนซื้อ" (checklist.html · checklist.js) + ทางเข้าจากหน้าอื่น
// ⚠️ ไม่มีเครือข่าย · อ่านไฟล์อย่างเดียว + รัน checklist.js กับ DOM จำลองขนาดเล็ก
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('checklist.html');
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

console.log('\n1) โครงหน้า');
const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
ok('มีชื่อหน้าและไม่เกิน 70 ตัวอักษร', t && t.length <= 70, t.length);
ok('canonical ชี้ checklist.html', /<link rel="canonical" href="https:\/\/njteedinsure\.com\/checklist\.html">/.test(html));
ok('มีหัวเว็บที่สร้างจาก build/pages.js', /NJ:HEADER เริ่ม/.test(html));
ok('มีข้อมูลโครงสร้างของหน้านี้', /checklist\.html#webpage/.test(html));
ok('มี h1 เดียว', (main.match(/<h1/g) || []).length === 1);

console.log('\n2) รายการตรวจ');
const keys = (main.match(/data-cl="([^"]+)"/g) || []).map(s => s.slice(9, -1));
ok('มี 16 ข้อ', keys.length === 16, keys.length);
ok('คีย์ไม่ซ้ำ (ใช้จำสิ่งที่ติ๊ก)', new Set(keys).size === keys.length);
ok('ตัวเลขในชื่อหน้าตรงกับจำนวนข้อจริง', /16 ข้อ/.test(t) && /16 ข้อ/.test(main));
const items = main.split('<li class="cl-item"').slice(1);
ok('ทุกข้อบอกว่าตรวจจากเอกสารหรือต้องลงพื้นที่', items.length === 16 && items.every(s => /data-where="(desk|field)"/.test(s) && /cl-tag cl-(desk|field)/.test(s)));
ok('ป้ายตรงกับ data-where', items.every(s => (s.indexOf('data-where="field"') >= 0) === (s.indexOf('cl-tag cl-field') >= 0)));
ok('ทุกข้อมีคำอธิบาย', items.every(s => /<p>[^<]{10,}/.test(s)));
const nums = (main.match(/<ol class="cl-list"(?: start="(\d+)")?/g) || []).map(s => Number((s.match(/start="(\d+)"/) || [0, 1])[1]));
ok('เลขข้อต่อเนื่องข้ามหมวด', JSON.stringify(nums) === JSON.stringify([1, 5, 9, 12, 14]), JSON.stringify(nums));

console.log('\n3) ถ้อยคำ');
const txt = main.replace(/<[^>]+>/g, ' ');
ok('มีข้อความว่าไม่ใช่คำแนะนำทางกฎหมายและไม่ใช่การรับรองกรรมสิทธิ์', /ไม่ใช่คำแนะนำทางกฎหมาย/.test(txt) && /ไม่ใช่การรับรองกรรมสิทธิ์/.test(txt));
ok('ไม่มีคำรับปาก (รับประกัน · การันตี · แน่นอน · 100%)', !/รับประกัน|การันตี|แน่นอน|100%/.test(txt));
ok('ไม่มีตัวเลขราคา/อัตรา (ให้เครื่องคำนวณเป็นคนบอก)', !/฿|บาท|\d+(\.\d+)?\s*%/.test(txt));

console.log('\n4) ลิงก์ในหน้าไปที่มีอยู่จริง');
const hrefs = Array.from(new Set((main.match(/href="([^"#]+\.html)(#[^"]*)?"/g) || []).map(s => s.slice(6, -1))));
hrefs.forEach(h => {
  const [file, hash] = h.split('#');
  const exists = fs.existsSync(path.join(__dirname, file));
  const anchorOk = !hash || new RegExp('id="' + hash + '"').test(read(file));
  ok('ลิงก์ ' + h, exists && anchorOk);
});
// เจ้าของกิจการเลือก 2026-09-25: ทางเข้าฝั่งผู้ขายชี้ไปที่เครื่องมือเก็บลีดตัวใหม่บนหน้าเครื่องมือ
ok('ทางเข้าแบบประเมินความพร้อมขาย (tools.html#assess)', /href="tools\.html#assess"/.test(main));
ok('ทางเข้าขอวิเคราะห์ราคาขาย (tools.html#price)', /href="tools\.html#price"/.test(main));
ok('ไม่ชี้ไปทางเข้าเดิมแล้ว', !/packages\.html#pk-quiz|consign\.html#form/.test(main));

console.log('\n4b) กล่องขอให้ทีมไปตรวจข้อที่เหลือ (รวมเป็นอันเดียว)');
ok('มีที่วาง lt-checklist หนึ่งที่พอดี', (main.split('id="lt-checklist"').length - 1) === 1);
ok('กล่องอยู่หลังรายการตรวจทั้งหมด (ท้ายหน้า)', main.indexOf('id="lt-checklist"') > main.lastIndexOf('data-cl="'));
ok('หน้าโหลด leadtools.js และ leadtools.css', /<script src="leadtools\.js" defer><\/script>/.test(html) && /href="leadtools\.css"/.test(html));
const tag = (f) => html.indexOf('<script src="' + f + '"');
ok('⭐ leadtools.js มาหลัง attrib.js และหลัง checklist.js', tag('attrib.js') >= 0 && tag('attrib.js') < tag('leadtools.js') &&
   tag('checklist.js') < tag('leadtools.js'));
ok('ไม่พิมพ์กล่องขอเบอร์ตอนสั่งพิมพ์เช็กลิสต์', /\.cl-ask/.test(read('checklist.css')));
ok('⭐ หน้าเครื่องมือไม่มีเช็กลิสต์ชุดที่สองแล้ว', !/id="lt-checklist"|id="checklist"/.test(read('tools.html')));
ok('ทางเข้าตรวจทรัพย์และนัดตรวจ', /href="verify\.html#form"/.test(main) && /href="inspect\.html"/.test(main));

console.log('\n5) ทางเข้าจากหน้าอื่น');
ok('เมนูหลัก (build/pages.js) มีเช็กลิสต์', /href: 'checklist\.html'/.test(read('build/pages.js')));
ok('หน้าเครื่องมือคำนวณลิงก์มา', /<a href="checklist\.html">/.test(read('tools.html')));
ok('คู่มือที่ดินลิงก์มา', /href="checklist\.html"/.test(read('guides.html')));
ok('อยู่ใน sitemap', /njteedinsure\.com\/checklist\.html/.test(read('sitemap.xml')));

console.log('\n6) checklist.js');
const js = read('checklist.js');
ok('ไม่ยิงเครือข่าย', !/fetch\(|XMLHttpRequest|sendBeacon/.test(js));
ok('ทุกการใช้ localStorage อยู่ใน try', (js.match(/localStorage\./g) || []).length === 2 && /try \{ var v = JSON\.parse\(localStorage/.test(js) && /try \{ localStorage\.setItem/.test(js));
ok('หน้าโหลด checklist.js', /<script src="checklist\.js" defer><\/script>/.test(html));

// DOM จำลอง: กล่องติ๊ก 3 กล่อง · localStorage ที่โยน error (โหมดส่วนตัว)
function fakeDom(storage) {
  const boxes = ['a', 'b', 'c'].map(k => {
    const li = { cls: new Set(), classList: { toggle(c, on) { on ? li.cls.add(c) : li.cls.delete(c); } } };
    const b = { checked: false, attr: k, handlers: {}, getAttribute() { return this.attr; }, addEventListener(e, f) { this.handlers[e] = f; }, closest() { return li; }, li };
    return b;
  });
  const count = { textContent: '' }, total = { textContent: '' };
  const doc = {
    querySelectorAll() { return boxes; },
    querySelector(sel) { return sel === '[data-cl-count]' ? count : sel === '[data-cl-total]' ? total : null; }
  };
  const win = { confirm: () => true, print() {} };
  vm.runInNewContext(js, { document: doc, window: win, localStorage: storage, JSON });
  return { boxes, count, total };
}
const mem = {};
const good = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
let d = fakeDom(good);
ok('นับเริ่มที่ 0 / 3', d.count.textContent === '0' && d.total.textContent === '3');
d.boxes[1].checked = true; d.boxes[1].handlers.change();
ok('ติ๊กแล้วนับเพิ่มและจำไว้', d.count.textContent === '1' && /"b":1/.test(mem.njChecklistV1) && d.boxes[1].li.cls.has('is-done'));
d = fakeDom(good);
ok('เปิดหน้าใหม่แล้วค่าที่ติ๊กกลับมา', d.boxes[1].checked === true && d.count.textContent === '1');
const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
let threw = false; try { d = fakeDom(bad); d.boxes[0].checked = true; d.boxes[0].handlers.change(); } catch (e) { threw = true; }
ok('ที่เก็บข้อมูลถูกบล็อก = ยังใช้งานได้ ไม่พัง', !threw && d.count.textContent === '1');

console.log('\n✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
