// ล็อกกติกาชื่อหน้าแปลง — ห้ามเดาประเภททรัพย์ · เพิ่ม 2026-09-20
// รันด้วย:  node landlabel.test.js
//
// ที่มา: OP-072 เป็นบ้านแฝด 2 ชั้น แต่ <title> ขึ้นว่า "ขายที่ดิน · ..." เพราะ shortLabel()
// เขียนคำว่า "ที่ดิน" ตายตัวจาก l.type อย่างเดียว ไม่เคยอ่าน land.propertyType เลย
// และชื่อชุดนี้ถูกส่งต่อเข้า Structured Data ด้วย จึงบอกประเภทผิดให้ Google ตามไปด้วย
//
// ⚠️ **ตั้งแต่ Sprint 5 ตัวประกอบชื่ออยู่ใน `landmeta.js` ซึ่ง require เข้า Node ได้ตรงๆ**
//    เทสต์นี้จึง **เรียกฟังก์ชันจริง** ไม่ใช่ไล่จับข้อความในโค้ดเหมือนรอบก่อน
//    (ส่วนที่ยังตรวจด้วยข้อความคือกติกาที่อยู่ใน `land.js` ซึ่งเป็น IIFE แตะ DOM รันใน node ไม่ได้)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

const META = require('./landmeta.js');
const landSrc = read('land.js');
const vocabSrc = read('landvocab.js');

// คำศัพท์ชุดกลาง — โหลดไฟล์เบราว์เซอร์มาใช้ใน Node (วิธีเดียวกับ build/properties.js)
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(vocabSrc, sandbox, { filename: 'landvocab.js' });
const VOCAB = sandbox.window.NJVocab;

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}

// ตัดคอมเมนต์ออกก่อนตรวจ — คอมเมนต์อธิบายบั๊กเดิมย่อมมีคำว่า 'ขายที่ดิน' อยู่โดยตั้งใจ
const code = landSrc.replace(/^\s*\/\/.*$/gm, '');
const metaCode = read('landmeta.js').replace(/^\s*\/\/.*$/gm, '');

console.log('\n1) ห้ามเขียนประเภททรัพย์ตายตัวในชื่อหน้า');
[['land.js', code], ['landmeta.js', metaCode]].forEach(p => {
  ok(p[0] + ": ไม่มี 'ขายที่ดิน' เป็นสตริงตายตัว", !/['"]ขายที่ดิน['"]/.test(p[1]),
     (p[1].match(/.{40}['"]ขายที่ดิน['"].{20}/) || [''])[0]);
  ok(p[0] + ": ไม่มี 'ให้เช่าที่ดิน' เป็นสตริงตายตัว", !/['"]ให้เช่าที่ดิน['"]/.test(p[1]));
});

console.log('\n2) ⭐ เรียกของจริง — ชื่อหน้าต้องอ่านประเภททรัพย์จากข้อมูล');
const HOUSE = { id: 'OP-072', type: 'sell', land: { propertyType: 'townhouse', province: 'สมุทรปราการ', amphoe: 'พระสมุทรเจดีย์', tambon: 'ในคลองบางปลากด', deedArea: '0-0-16.3' } };
const houseTh = VOCAB.PROPERTY_TH.townhouse;
ok('PROPERTY_TH มีรหัส townhouse ให้แปล', !!houseTh, houseTh);
ok('⭐ แปลงที่กรอกประเภทไว้ ต้องได้ชื่อตามประเภทนั้น',
   META.shortLabel(HOUSE, VOCAB).indexOf(houseTh) >= 0, META.shortLabel(HOUSE, VOCAB));
ok('ที่ตั้งเรียง ตำบล → อำเภอ → จังหวัด',
   META.shortLabel(HOUSE, VOCAB).indexOf('ต.ในคลองบางปลากด อ.พระสมุทรเจดีย์ จ.สมุทรปราการ') >= 0);
ok('เนื้อที่รูปแบบ ไร่-งาน-วา ได้หน่วยกำกับ',
   /0-0-16\.3 ไร่/.test(META.shortLabel(HOUSE, VOCAB)), META.shortLabel(HOUSE, VOCAB));
ok('ประกาศให้เช่าขึ้นคำว่า "ให้เช่า"',
   META.shortLabel(Object.assign({}, HOUSE, { type: 'rent' }), VOCAB).indexOf('ให้เช่า') === 0);

console.log('\n3) ⭐ ช่องว่าง = ยังไม่ได้กรอก ไม่ใช่ "ที่ดินเปล่า"');
// PROPERTY_TH มีค่า land = 'ที่ดินเปล่า' อยู่แล้วเป็นตัวเลือกหนึ่ง
// แปลงที่ยังไม่กรอกจึงไม่ได้แปลว่าเป็นที่ดินเปล่า — ห้ามถอยไปใช้ค่านั้นแทน
ok('PROPERTY_TH มี land = ที่ดินเปล่า เป็นตัวเลือกจริง', /land:\s*['"]ที่ดินเปล่า['"]/.test(vocabSrc));
const BLANK = { id: 'OP-001', type: 'sell', land: { province: 'ระยอง' } };
ok('⭐ ยังไม่กรอกประเภท → ไม่ขึ้นว่า "ที่ดิน" หรือ "ที่ดินเปล่า"',
   !/ที่ดิน/.test(META.shortLabel(BLANK, VOCAB)), META.shortLabel(BLANK, VOCAB));
ok('ใช้คำกลางว่า "ทรัพย์" แทน', META.FALLBACK_KIND === 'ทรัพย์', META.FALLBACK_KIND);
ok('ค่าตั้งต้นไม่ใช่สตริงว่าง (ชื่อหน้าต้องอ่านออก)', String(META.FALLBACK_KIND).trim().length > 0);
ok('รหัสประเภทที่ไม่รู้จักก็ถอยไปใช้คำกลาง ไม่ขึ้นรหัสดิบ',
   META.kindOf({ land: { propertyType: 'ไม่มีรหัสนี้' } }, VOCAB) === META.FALLBACK_KIND);

console.log('\n4) คำโปรยและชื่อหน้า');
const FULL = Object.assign({}, HOUSE, { estValue: 3500000, pricePerWa: 214724, blurb: 'ติดถนนใหญ่' });
const d = META.metaDesc(FULL, VOCAB);
ok('คำโปรยมีราคา', /3,500,000/.test(d), d.slice(0, 80));
ok('คำโปรยมีรหัสทรัพย์', d.indexOf('OP-072') >= 0);
ok('⭐ คำโปรยยาวไม่เกิน 300 ตัวอักษร (Google ตัดทิ้ง)', d.length <= 300, d.length);
ok('⭐ แปลงที่ยังไม่ระบุราคา ต้องไม่มีคำว่าราคาในคำโปรย',
   !/ราคา /.test(META.metaDesc(BLANK, VOCAB)), META.metaDesc(BLANK, VOCAB).slice(0, 80));
ok('ชื่อหน้าลงท้ายด้วยชื่อแบรนด์', /\| ที่ดินชัวร์$/.test(META.titleOf(FULL, VOCAB)));

console.log('\n5) ที่อยู่ของหน้า');
ok('หน้าสแตติกอยู่ที่ p/<รหัส>.html', META.pagePath('OP-072') === 'p/OP-072.html');
ok('canonical เป็นที่อยู่เต็ม', META.pageUrl('OP-072') === 'https://njteedinsure.com/p/OP-072.html');
ok('ที่อยู่แบบ query ยังใช้ได้ (การ์ดทุกใบชี้มาที่นี่)',
   META.dynamicUrl('OP-072') === 'https://njteedinsure.com/land.html?id=OP-072');

console.log('\n6) กติกาเดิมใน land.js ที่ต้องไม่หายไป');
ok('ยังตั้ง canonical จาก JS (หน้าเดียวหลายแปลง)', /rel\s*=\s*['"]canonical['"]/.test(code));
ok('⭐ canonical ชี้ไปหน้าสแตติก ไม่ใช่ที่อยู่ของตัวเอง', /NJLandMeta\.pageUrl\(/.test(code));
ok('Structured Data ใช้ชื่อชุดเดียวกับ <title> (shortLabel)', /name\s*:\s*shortLabel\(/.test(code));
ok('businessFunction ยังแยกขาย/เช่าตาม l.type', /businessFunction/.test(code) && /LeaseOut/.test(code) && /#Sell/.test(code));
ok('⭐ land.js ไม่ประกอบชื่อเองอีกแล้ว อ่านจาก landmeta.js', /NJLandMeta\.shortLabel\(/.test(code));

console.log('\n' + (fail ? '❌' : '✅') + ' landlabel: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
