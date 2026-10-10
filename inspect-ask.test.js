// ทดสอบแผง "ให้ NJ ตรวจสอบทรัพย์นี้" ของทรัพย์ทุกประเภทที่ไม่ใช่ห้องชุด (นโยบายลงฟรี ขั้น ③ ข · 10 ต.ค. 2569)
// ⚠️ ไม่มีเครือข่าย · อ่านไฟล์อย่างเดียว + รันตัวสร้างฟอร์มจริงด้วย node:vm
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
const land = read('land.js');
const svc = read('njservices.js');
function between(src, from, to) {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  return a >= 0 && b > a ? src.slice(a, b) : '';
}
const askFn = between(land, 'function inspectAskHtml', '// ส่วน "ให้ NJ ตรวจสอบห้องชุดนี้"');
const formFn = between(svc, 'function inspectFormHtml', '// ---------- แผง "ให้ NJ ตรวจสอบห้องชุดนี้"');

console.log('\n1) แผงหน้าแปลง (land.js)');
ok('มีฟังก์ชัน inspectAskHtml และไม่ขึ้นกับห้องชุด/ประกาศเช่า', askFn.length > 200 && /isCondo\(l\)/.test(askFn) && /l\.type==='rent'/.test(askFn));
ok('⛔ ไม่มีตัวเลขราคา / ฿ / "บาท" ในแผง', !/฿|\bบาท\b|\d{3,}/.test(askFn.replace(/ld-ic-form|ld-cc/g, '')));
ok('ข้อความบอกว่าติดต่อเพื่อขอใบเสนอราคา', /ติดต่อเพื่อขอใบเสนอราคา/.test(askFn));
ok('บอกว่าติ๊ก = ขอให้ตรวจ ไม่ใช่การว่าจ้าง/ผลตรวจ และรังวัดไม่บังคับ', /ขอให้ตรวจ/.test(askFn) && /ไม่ใช่การว่าจ้าง/.test(askFn) && /การรังวัดไม่บังคับ/.test(askFn));
ok('⛔ ไม่มีคำผ่าน/ปลอดภัย/รับประกัน/รับรอง ในแผง', !/ผ่าน|ปลอดภัย|รับประกัน|รับรอง/.test(askFn));
ok('ไม่ใช่การยืนยันกรรมสิทธิ์', /ไม่ใช่การยืนยันกรรมสิทธิ์/.test(askFn));
ok('วางแผงต่อจากแผงห้องชุด ก่อนทางเข้าอื่น (ld-next)', land.indexOf("secHtml('ld-s-condoask'") < land.indexOf("secHtml('ld-s-inspectask'") && land.indexOf("secHtml('ld-s-inspectask'") < land.indexOf('<div class="ld-next">'));
ok('mount ด้วย inspect:true ใช้ท่อ NJServices เดียวกัน ไม่มี fetch ใหม่', /NJServices\.mount\(icHost,\{ inspect:true, listingId:l\.id, ref:'land_inspect_check'/.test(land) && !/fetch\(/.test(askFn));
ok('ไม่มี NJServices = ตัดหัวข้อทิ้ง (ไม่ปล่อยกล่องเปล่า)', /ld-s-inspectask'\); if\(icSec\) icSec\.remove\(\)/.test(land));

console.log('\n2) ฟอร์มใน njservices.js');
ok('มี inspectFormHtml และต่อสายใน mount (opt.inspect)', formFn.length > 300 && /if \(opt\.inspect\) return inspectFormHtml\(opt, id\)/.test(svc));
ok('ใช้เฉพาะคีย์เดิมที่ระบบรู้จัก (title · survey) ไม่เพิ่มคีย์ใหม่', /var INSPECT_KEYS = \['title', 'survey'\]/.test(svc) && !/key: 'inspect/.test(svc));
ok('checklistHtml เลือกตาม opt.keys', /opt\.keys \? opt\.keys\.indexOf\(s\.key\) >= 0/.test(svc));
ok('⚠️ ไม่ติ๊กรังวัดไว้ให้ (ไม่มี checked)', !/checked/.test(formFn));
ok('⛔ ไม่มีตัวเลขราคา / ฿ ในฟอร์ม', !/฿|\bบาท\b/.test(formFn));
ok('ข้อความปุ่ม/ค่าบริการ: ติดต่อเพื่อขอใบเสนอราคา', /ติดต่อเพื่อขอใบเสนอราคา/.test(formFn) && /ขอใบเสนอราคาการตรวจทรัพย์นี้/.test(formFn));
ok('ไม่ส่ง shareWithOwner (ลีดไปที่ทีมงาน ไม่ส่งถึงเจ้าของ)', !/shareWithOwner/.test(formFn));
ok('ต้องติ๊กอย่างน้อย 1 รายการ (เหมือนแผงห้องชุด)', /\(opt\.condo \|\| opt\.inspect\) && !services\.length/.test(svc));
ok('แผงห้องชุดเดิมไม่เปลี่ยน (ยังมี condoFormHtml และกรอง only:condo)', /function condoFormHtml/.test(svc) && /checklistHtml\(\{ only: 'condo', name: 'njsv-condo' \}\)/.test(svc));

console.log('\n3) รันตัวสร้างจริง');
const sandbox = { window: {}, document: {}, console };
sandbox.window = sandbox;
let html = '';
try {
  vm.createContext(sandbox);
  // ดึงเฉพาะส่วนที่ต้องใช้ — checklistHtml + inspectFormHtml + ค่าคงที่ (ไม่รันทั้งไฟล์ซึ่งแตะ DOM)
  const lst = between(svc, 'var LIST = [', '];') + '];';
  const pieces = [
    'function esc(s){return String(s==null?"":s).replace(/[&<>"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c];});}',
    lst,
    'function providerOf(s){return s.by==="nj"?"ทีมเอ็นเจ":"พันธมิตร";}',
    between(svc, 'function checklistHtml', '// ---------- แผง "ให้ NJ ตรวจสอบทรัพย์นี้"'),
    between(svc, 'var INSPECT_KEYS', '// ---------- แผง "ให้ NJ ตรวจสอบห้องชุดนี้"'),
    'this.__out = inspectFormHtml({}, "OP-001");'
  ].join('\n');
  vm.runInContext(pieces, sandbox);
  html = String(sandbox.__out || '');
} catch (e) { html = 'ERR ' + e.message; }
ok('สร้าง HTML ได้', html.length > 500 && !/^ERR/.test(html), html.slice(0, 200));
const boxes = (html.match(/type="checkbox"/g) || []).length;
ok('มีช่องติ๊กสองรายการ: ตรวจกรรมสิทธิ์ · รังวัด', boxes === 2 && /value="title"/.test(html) && /value="survey"/.test(html), String(boxes));
ok('ไม่มีรายการของห้องชุดหรือบริการพันธมิตรปนมา', !/condotitle|condoarea|value="permit"|value="design"|value="build"|value="fill"/.test(html));
ok('ช่องติ๊กไม่ถูกติ๊กไว้', !/checked/.test(html));
ok('ซ่อนรหัสทรัพย์ไว้ในฟอร์ม', /data-njsv="listingId" value="OP-001"/.test(html));
ok('⛔ HTML ที่ได้ไม่มี ฿', !/฿/.test(html));

console.log('\n== สรุป inspect-ask: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + ' ==');
process.exit(fail ? 1 : 0);
