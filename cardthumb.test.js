// ทดสอบว่าการ์ดประกาศใช้ "ไฟล์ย่อ" ที่ฝั่งระบบสร้างให้ (ปิดช่องว่าง H-04) · เพิ่ม 2026-09-22
// รันด้วย:  node cardthumb.test.js
//
// ⚠️ ทดสอบพฤติกรรมจริงของ NJListing.card() ไม่ใช่ grep ซอร์ส
//    เพราะสิ่งที่ต้องกันคือ "การ์ดหยิบรูปผิดใบ" ไม่ใช่ "โค้ดหน้าตาเปลี่ยน"
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

// โหลดแบบเดียวกับหน้าเว็บ: landvocab.js ต้องมาก่อน listingcard.js
global.window = {};
new Function(read('landvocab.js'))();
new Function(read('listingcard.js'))();
const NJL = global.window.NJListing;

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 220) : '')); }
}
function cardOf(raw) {
  return NJL.card(NJL.normalize(Object.assign({ id: 'OP-1', type: 'sell', parcelInfo: 'แปลงทดสอบ', estValue: 1000000 }, raw), 0));
}
function srcOf(html) { const m = html.match(/<img src="([^"]*)"/); return m ? m[1] : null; }

const BIG = 'https://app.njteedinsure.com/uploads/up-111.jpg';
const BIG2 = 'https://app.njteedinsure.com/uploads/up-222.jpg';
const SMALL = 'https://app.njteedinsure.com/uploads/up-111-800x600.webp';

console.log('\n1) มีไฟล์ย่อ → ต้องใช้ไฟล์ย่อ ไม่ใช่ไฟล์ต้นฉบับ');
let h = cardOf({ photos: [BIG], thumbs: [SMALL] });
ok('การ์ดชี้ไฟล์ย่อ', srcOf(h) === SMALL, srcOf(h));
ok('⭐ ไม่มีไฟล์ต้นฉบับโผล่ใน src เลย', h.indexOf('src="' + BIG + '"') < 0);

console.log('\n2) ไม่มีไฟล์ย่อ → ถอยไปไฟล์ต้นฉบับ ห้ามซ่อนรูปทิ้ง');
ok('API รุ่นเก่าไม่ส่งช่อง thumbs มาเลย → ใช้ photos', srcOf(cardOf({ photos: [BIG] })) === BIG);
ok('thumbs เป็นอาร์เรย์ว่าง → ใช้ photos', srcOf(cardOf({ photos: [BIG], thumbs: [] })) === BIG);
ok('thumbs ไม่ใช่อาร์เรย์ (null) → ใช้ photos', srcOf(cardOf({ photos: [BIG], thumbs: null })) === BIG);
ok('thumbs เป็นสตริงเดี่ยว (ค่าผิดรูป) → ใช้ photos', srcOf(cardOf({ photos: [BIG], thumbs: SMALL })) === BIG);

console.log('\n3) ไม่มีรูปเลย → กรอบเปล่า ไม่ใช่ <img> ที่ชี้ค่าว่าง');
h = cardOf({ photos: [], thumbs: [] });
ok('ไม่มีแท็ก img', !/<img/.test(h));
ok('ขึ้นกรอบสำรองแทน', /fallback-land/.test(h));
h = cardOf({ photos: [], thumbs: [SMALL] });
ok('⚠️ มีไฟล์ย่อแต่ไม่มี photos → ยังแสดงได้ ไม่ตกหล่น', srcOf(h) === SMALL, srcOf(h));

console.log('\n4) จำนวนรูปบนการ์ดนับจากรูปจริง ไม่ใช่นับไฟล์ย่อ');
h = cardOf({ photos: [BIG, BIG2], thumbs: [SMALL] });
ok('รูป 2 ใบ → ขึ้นเลข 2 (ถึงไฟล์ย่อจะมีใบเดียว)', /photo-count">▣ 2</.test(h), h.match(/photo-count[^<]*<?[^<]*/) || '');
ok('และยังใช้ไฟล์ย่อของใบแรก', srcOf(h) === SMALL);
ok('รูปใบเดียว → ไม่ขึ้นตัวเลข', !/photo-count/.test(cardOf({ photos: [BIG], thumbs: [SMALL] })));

console.log('\n5) normalize คืนช่อง thumbs เป็นอาร์เรย์เสมอ');
ok('ไม่ส่งมา → []', Array.isArray(NJL.normalize({ id: 'x' }, 0).thumbs));
ok('ส่งค่าผิดรูป → []', NJL.normalize({ id: 'x', thumbs: 'เอ๊ะ' }, 0).thumbs.length === 0);
ok('ส่งมาถูก → เก็บครบ', NJL.normalize({ id: 'x', thumbs: [SMALL] }, 0).thumbs[0] === SMALL);

console.log('\n6) ค่าจาก API เป็นข้อมูลไม่น่าเชื่อถือ ต้อง escape');
h = cardOf({ photos: [BIG], thumbs: ['a" onerror="alert(1)'] });
// สิ่งที่ต้องกันคือเครื่องหมายคำพูด "ดิบ" ที่ปิด src ก่อนกำหนดแล้วแทรกแอตทริบิวต์ใหม่
// ไม่ใช่กันคำว่า onerror ซึ่งอยู่ในค่าของ src แบบถูก escape แล้วก็ไม่มีพิษ
ok('⭐ เครื่องหมายคำพูดถูก escape ไม่ปิด src ก่อนกำหนด', /src="a&quot; onerror=&quot;alert\(1\)"/.test(h), h.match(/<img[^>]*/) || '');
ok('⭐ ไม่มีแอตทริบิวต์ onerror จริงเกิดขึ้น', !/onerror="/.test(h), h.match(/<img[^>]*/) || '');
ok('alt ยังมาจาก parcelInfo ตามเดิม', /alt="แปลงทดสอบ"/.test(cardOf({ photos: [BIG], thumbs: [SMALL] })));

console.log('\n== สรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + ' ==');
process.exit(fail ? 1 : 0);
