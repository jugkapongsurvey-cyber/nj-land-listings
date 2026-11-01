// ป้าย "เจ้าของลงประกาศเอง" (ระบบ 1 พ.ย. 2569 · ลงประกาศเอง) — listingcard.js + land.js
// รันด้วย:  node selflisted.test.js
// กติกา: selfListed === true เท่านั้นที่ติดป้าย · ป้ายต้องบอกว่ายังไม่ผ่านการตรวจ · ไม่ขึ้นป้ายตรวจแล้ว/ระดับ 2 แทน
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 240) : '')); }
}
global.window = {}; global.document = {};
new Function(read('landvocab.js'))();
new Function(read('listingcard.js'))();
const NJL = global.window.NJListing;
function cardOf(extra) {
  return NJL.card(NJL.normalize(Object.assign({ id: 'OP-9', type: 'sell', parcelInfo: 'แปลงทดสอบ', estValue: 1000000, photos: [], tier: 1, land: {} }, extra || {}), 0));
}
const self = cardOf({ selfListed: true, saleBy: 'owner', tier: 2 });
ok('ใบลงเองติดป้าย "เจ้าของลงประกาศเอง"', /badge-self[^>]*>เจ้าของลงประกาศเอง</.test(self), self);
ok('ป้ายบอกว่ายังไม่ผ่านการตรวจ', /ยังไม่ผ่านการตรวจโดยที่ดินชัวร์/.test(self));
ok('ใบลงเองไม่ขึ้นป้ายตรวจสอบโดย NJ แม้ tier ส่งมา 2', !/ตรวจสอบโดย NJ/.test(self));
ok('ใบลงเองไม่ขึ้นบรรทัดตรวจโดยที่ดินชัวร์', !/[>(]ตรวจโดยที่ดินชัวร์/.test(self) && !/ตรวจแล้ว d+ จาก/.test(self));
const normal = cardOf({ saleBy: 'owner' });
ok('ใบปกติไม่มีป้ายลงเอง', !/badge-self/.test(normal) && /ข้อมูลเบื้องต้น/.test(normal));
ok('ค่าอื่นที่ไม่ใช่ true = ไม่ใช่ใบลงเอง', !/badge-self/.test(cardOf({ selfListed: 'true' })));
const land = read('land.js');
ok('หน้าแปลงมีบล็อกเจ้าของลงประกาศเอง + ทางขอให้ทีมตรวจ', /l\.selfListed===true/.test(land) && /เจ้าของลงประกาศเอง/.test(land) && /verify\.html/.test(land));
const css = read('listingcard.css') + read('home.css');
ok('มีสไตล์ .badge-self ทั้งชุดการ์ดกลางและหน้าแรก', (css.match(/\.badge-self\{/g) || []).length >= 2);
ok('ไม่มีคำรับประกันในป้าย', !/รับประกัน|การันตี|ชัวร์แน่นอน/.test(self));
console.log('selflisted: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
