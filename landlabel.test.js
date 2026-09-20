// ล็อกกติกาชื่อหน้าแปลง — ห้ามเดาประเภททรัพย์ (land.js) · เพิ่ม 2026-09-20
// รันด้วย:  node landlabel.test.js
//
// ที่มา: OP-072 เป็นบ้านแฝด 2 ชั้น แต่ <title> ขึ้นว่า "ขายที่ดิน · ..." เพราะ shortLabel()
// เขียนคำว่า "ที่ดิน" ตายตัวจาก l.type อย่างเดียว ไม่เคยอ่าน land.propertyType เลย
// และชื่อชุดนี้ถูกส่งต่อเข้า Structured Data ด้วย จึงบอกประเภทผิดให้ Google ตามไปด้วย
//
// ⚠️ เทสต์นี้อ่าน land.js เป็น "ข้อความ" ไม่ได้รันจริง เพราะ land.js เป็น IIFE ที่แตะ DOM
// และยิง fetch ทันทีที่โหลด — รันใน node ไม่ได้ถ้าไม่ยก DOM ทั้งชุดขึ้นมา
// (ใช้วิธีเดียวกับ zonechip.test.js หัวข้อ 3 ที่ตรวจว่า listingcard.js ไม่มีรหัสสีของตัวเอง)
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

const src = read('land.js');
const vocabSrc = read('landvocab.js');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}

// ตัดคอมเมนต์ออกก่อนตรวจ — คอมเมนต์อธิบายบั๊กเดิมย่อมมีคำว่า 'ขายที่ดิน' อยู่โดยตั้งใจ
const code = src.replace(/^\s*\/\/.*$/gm, '');

console.log('\n1) ห้ามเขียนประเภททรัพย์ตายตัวในชื่อหน้า');
ok('⭐ ไม่มี \'ขายที่ดิน\' เป็นสตริงตายตัวในโค้ด', !/['"]ขายที่ดิน['"]/.test(code),
   (code.match(/.{40}['"]ขายที่ดิน['"].{20}/) || [''])[0]);
ok('⭐ ไม่มี \'ให้เช่าที่ดิน\' เป็นสตริงตายตัวในโค้ด', !/['"]ให้เช่าที่ดิน['"]/.test(code),
   (code.match(/.{40}['"]ให้เช่าที่ดิน['"].{20}/) || [''])[0]);

console.log('\n2) ชื่อหน้าต้องอ่านประเภททรัพย์จากข้อมูลจริง');
ok('มีฟังก์ชัน kindOf', /function\s+kindOf\s*\(/.test(code));
ok('kindOf อ่าน land.propertyType', /kindOf[\s\S]{0,300}?land\.propertyType/.test(code));
ok('kindOf แปลรหัสด้วย NJVocab.PROPERTY_TH ไม่แปลเอง', /kindOf[\s\S]{0,300}?PROPERTY_TH/.test(code));
ok('shortLabel เรียก kindOf', /function\s+shortLabel[\s\S]{0,200}?kindOf\(/.test(code));

console.log('\n3) ช่องว่าง = ยังไม่ได้กรอก ไม่ใช่ "ที่ดินเปล่า"');
// PROPERTY_TH มีค่า land = 'ที่ดินเปล่า' อยู่แล้วเป็นตัวเลือกหนึ่ง
// แปลงที่ยังไม่กรอกจึงไม่ได้แปลว่าเป็นที่ดินเปล่า — ห้ามถอยไปใช้ค่านั้นแทน
ok('PROPERTY_TH มี land = ที่ดินเปล่า เป็นตัวเลือกจริง', /land:\s*['"]ที่ดินเปล่า['"]/.test(vocabSrc));
ok('มีค่าตั้งต้นกลางไว้ใช้ตอนยังไม่กรอก (FALLBACK_KIND)', /FALLBACK_KIND\s*=/.test(code));
ok('⭐ ค่าตั้งต้นไม่ใช่ "ที่ดิน" หรือ "ที่ดินเปล่า" (ห้ามเดาแทนแปลงที่มีบ้านจริง)',
   !/FALLBACK_KIND\s*=\s*['"]ที่ดิน(เปล่า)?['"]/.test(code),
   (code.match(/FALLBACK_KIND\s*=\s*['"][^'"]*['"]/) || [''])[0]);
ok('ค่าตั้งต้นไม่ใช่สตริงว่าง (ชื่อหน้าต้องอ่านออก)',
   !/FALLBACK_KIND\s*=\s*['"]\s*['"]/.test(code));

console.log('\n4) กติกาเดิมที่ต้องไม่หายไป');
ok('ยังตั้ง canonical จาก JS (หน้าเดียวหลายแปลง)', /rel\s*=\s*['"]canonical['"]/.test(code));
ok('Structured Data ใช้ชื่อชุดเดียวกับ <title> (shortLabel)', /name\s*:\s*shortLabel\(/.test(code));
ok('businessFunction ยังแยกขาย/เช่าตาม l.type', /businessFunction/.test(code) && /LeaseOut/.test(code) && /#Sell/.test(code));

console.log('\n' + (fail ? '❌' : '✅') + ' landlabel: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
