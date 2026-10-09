// ทดสอบหน้า "เช็กลิสต์ตรวจห้องชุดก่อนซื้อ" (checklist-condo.html · รอบคอนโด 2 · 10 ต.ค. 2569)
// ⚠️ ไม่มีเครือข่าย · อ่านไฟล์อย่างเดียว · ชุดแยกจาก 16 ข้อของที่ดิน (checklist.html) — ห้ามยุบรวม
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
const html = read('checklist-condo.html');
const land = read('checklist.html');
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const landMain = land.slice(land.indexOf('<main'), land.indexOf('</main>'));

console.log('\n1) โครงหน้า');
const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
ok('มีชื่อหน้าและไม่เกิน 70 ตัวอักษร', t && t.length <= 70, t.length);
ok('canonical และ og:url ชี้ checklist-condo.html',
  /<link rel="canonical" href="https:\/\/njteedinsure\.com\/checklist-condo\.html">/.test(html) &&
  /og:url" content="https:\/\/njteedinsure\.com\/checklist-condo\.html"/.test(html));
ok('ไม่เหลือ canonical/ข้อมูลโครงสร้างของหน้าที่ดิน', !/checklist\.html#|href="https:\/\/njteedinsure\.com\/checklist\.html">/.test(html.slice(0, html.indexOf('<body'))));
ok('มีหัวเว็บที่สร้างจาก build/pages.js', /NJ:HEADER เริ่ม/.test(html));
ok('มีข้อมูลโครงสร้างของหน้านี้', /checklist-condo\.html#webpage/.test(html));
ok('มี h1 เดียว', (main.match(/<h1/g) || []).length === 1);

console.log('\n2) รายการตรวจ');
const keys = (main.match(/data-cl="([^"]+)"/g) || []).map(s => s.slice(9, -1));
ok('มี 14 ข้อ', keys.length === 14, keys.length);
ok('คีย์ไม่ซ้ำ (ใช้จำสิ่งที่ติ๊ก)', new Set(keys).size === keys.length);
const landKeys = (landMain.match(/data-cl="([^"]+)"/g) || []).map(s => s.slice(9, -1));
ok('⭐ คีย์ไม่ซ้ำกับชุดที่ดิน (ที่เก็บเครื่องเดียวกัน ติ๊กอีกชุดไม่ข้ามมา)', keys.every(k => /^cd-/.test(k) && landKeys.indexOf(k) < 0));
ok('ตัวเลขในชื่อหน้าตรงกับจำนวนข้อจริง', /14 ข้อ/.test(t) && /14 ข้อ/.test(main) && /<span data-cl-total>14<\/span>/.test(main));
const items = main.split('<li class="cl-item"').slice(1);
ok('ทุกข้อบอกว่าตรวจจากเอกสารหรือต้องไปดูที่ห้อง', items.length === 14 && items.every(s => /data-where="(desk|field)"/.test(s) && /cl-tag cl-(desk|field)/.test(s)));
ok('ป้ายตรงกับ data-where', items.every(s => (s.indexOf('data-where="field"') >= 0) === (s.indexOf('cl-tag cl-field') >= 0)));
ok('ทุกข้อมีคำอธิบาย', items.every(s => /<p>[^<]{10,}/.test(s)));
const nums = (main.match(/<ol class="cl-list"(?: start="(\d+)")?/g) || []).map(s => Number((s.match(/start="(\d+)"/) || [0, 1])[1]));
ok('เลขข้อต่อเนื่องข้ามหมวด', JSON.stringify(nums) === JSON.stringify([1, 4, 7, 11, 12]), JSON.stringify(nums));
ok('มีข้อที่เป็นของห้องชุดโดยเฉพาะครบ (อ.ช.2 · ปลอดหนี้ค่าส่วนกลาง · ต่างชาติ · ข้อบังคับนิติบุคคล)',
  /อ\.ช\.2/.test(main) && /ปลอดหนี้ค่าส่วนกลาง/.test(main) && /ต่างชาติ/.test(main) && /ข้อบังคับของนิติบุคคล/.test(main) && /จำนอง/.test(main));
ok('ไม่มีข้อเฉพาะที่ดินเปล่า (หมุดหลักเขต · ผังสี · ทางเข้า-ออกของแปลง)', !/หมุดหลักเขต|ผังสี|ภาระจำยอม/.test(main));

console.log('\n3) ถ้อยคำ');
const txt = main.replace(/<[^>]+>/g, ' ');
ok('มีข้อความว่าไม่ใช่คำแนะนำทางกฎหมายและไม่ใช่การรับรองกรรมสิทธิ์', /ไม่ใช่คำแนะนำทางกฎหมาย/.test(txt) && /ไม่ใช่การรับรองกรรมสิทธิ์/.test(txt));
ok('ไม่มีคำรับปาก (รับประกัน · การันตี · แน่นอน · 100%)', !/รับประกัน|การันตี|แน่นอน|100%/.test(txt));
ok('⭐ ไม่ใช้คำว่า ผ่าน / ปลอดภัย (ติ๊กครบไม่ได้แปลว่าห้องไม่มีปัญหา)', !/ผ่าน|ปลอดภัย/.test(txt));
ok('⭐ ไม่มีตัวเลขราคา/อัตรา/สัดส่วน (ให้เครื่องคำนวณและผู้เชี่ยวชาญเป็นคนบอก)', !/฿|บาท|\d+(\.\d+)?\s*%|\d+\s*เปอร์เซ็นต์|ร้อยละ/.test(txt));

console.log('\n4) ลิงก์ในหน้าไปที่มีอยู่จริง');
const hrefs = Array.from(new Set((main.match(/href="([^"#]+\.html)(#[^"]*)?"/g) || []).map(s => s.slice(6, -1))));
hrefs.forEach(h => {
  const [file, hash] = h.split('#');
  const exists = fs.existsSync(path.join(__dirname, file));
  const anchorOk = !hash || new RegExp('id="' + hash + '"').test(read(file));
  ok('ลิงก์ ' + h, exists && anchorOk);
});
ok('ลิงก์กลับไปเช็กลิสต์ที่ดิน และจากหน้าที่ดินมาที่หน้านี้',
  /href="checklist\.html"/.test(main) && /href="checklist-condo\.html"/.test(landMain));
ok('ชี้ไปเครื่องคำนวณค่าโอน (tools.html#fee) และค่างวด (tools.html#loan)', /href="tools\.html#fee"/.test(main) && /href="tools\.html#loan"/.test(main));

console.log('\n4b) กล่องขอให้ทีมไปตรวจข้อที่เหลือ (ใช้ leadtools เดิม · ส่ง {done,total,left})');
ok('มีที่วาง lt-checklist หนึ่งที่พอดี', (main.split('id="lt-checklist"').length - 1) === 1);
ok('กล่องอยู่หลังรายการตรวจทั้งหมด (ท้ายหน้า)', main.indexOf('id="lt-checklist"') > main.lastIndexOf('data-cl="'));
ok('หน้าโหลด leadtools.js และ leadtools.css', /<script src="leadtools\.js" defer><\/script>/.test(html) && /href="leadtools\.css"/.test(html));
const tag = (f) => html.indexOf('<script src="' + f + '"');
ok('⭐ leadtools.js มาหลัง attrib.js และหลัง checklist.js', tag('attrib.js') >= 0 && tag('attrib.js') < tag('leadtools.js') && tag('checklist.js') < tag('leadtools.js'));
const lt = read('leadtools.js');
ok('⭐ leadtools อ่านรายการข้อจากหน้าเอง ไม่ฝังรายการ (ไม่มีคีย์ cd- ในไฟล์)', !/cd-/.test(lt) && /input\[data-cl\]/.test(lt));
ok('⭐ ยังส่ง done/total/left เหมือนเดิม', /done: boxes\.length - l\.length, total: boxes\.length, left: l\.map\(nameOf\)/.test(lt));

console.log('\n5) ทางเข้า');
ok('อยู่ใน sitemap', /njteedinsure\.com\/checklist-condo\.html/.test(read('sitemap.xml')));
ok('ไม่ใช่หน้า noindex', !/noindex/.test(html.slice(0, html.indexOf('<body'))));

console.log('\n6) checklist.js ที่ใช้ร่วมกัน — ล้างที่ติ๊กเฉพาะข้อของหน้านั้น');
const js = read('checklist.js');
function run(keys, mem) {
  const boxes = keys.map(k => {
    const li = { cls: new Set(), classList: { toggle(c, on) { on ? li.cls.add(c) : li.cls.delete(c); } } };
    return { checked: false, attr: k, handlers: {}, getAttribute() { return this.attr; }, addEventListener(e, f) { this.handlers[e] = f; }, closest() { return li; } };
  });
  const handlers = {};
  const reset = { addEventListener(e, f) { handlers.reset = f; } };
  const noop = { addEventListener() {}, textContent: '' };
  const doc = { querySelectorAll() { return boxes; },
    querySelector(sel) { return sel === '[data-cl-reset]' ? reset : noop; } };
  const storage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  vm.runInNewContext(js, { document: doc, window: { confirm: () => true, print() {} }, localStorage: storage, JSON });
  return { boxes, handlers };
}
const mem = { njChecklistV1: JSON.stringify({ 'deed-type': 1, 'cd-title': 1, 'cd-loan': 1 }) };
const page = run(['cd-title', 'cd-loan', 'cd-fee'], mem);
ok('เปิดหน้าห้องชุด: เห็นเฉพาะข้อของตัวเองที่เคยติ๊ก', page.boxes[0].checked && page.boxes[1].checked && !page.boxes[2].checked);
page.handlers.reset();
const after = JSON.parse(mem.njChecklistV1);
ok('⭐ ล้างที่ติ๊กหน้าห้องชุด ไม่ล้างที่ติ๊กของหน้าที่ดิน', after['deed-type'] === 1 && !('cd-title' in after) && !('cd-loan' in after));

console.log('\n✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
