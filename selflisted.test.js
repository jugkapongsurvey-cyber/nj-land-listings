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
// รอบ 3 (2 พ.ย. 69) — ชวนผู้ซื้อให้ทีมตรวจแปลงก่อนซื้อ ข้างฟอร์มและหลังส่ง · ไม่ส่งอีเมลถึงผู้ซื้อ
const chk = land.slice(land.indexOf('function selfVerifyHref'), land.indexOf('function ownerFormHtml'));
const has = (s, t) => s.indexOf(t) >= 0;
ok('มีกล่องชวนตรวจเฉพาะใบลงเอง', has(chk, "if(l.selfListed!==true) return ''") && has(chk, 'ส่งให้ทีมตรวจแปลงนี้'));
ok('ลิงก์ไป verify.html พร้อมแหล่ง อื่นๆ + ลิงก์หน้าประกาศ + หัวข้อ selflisted',
  has(chk, "'verify.html?source='+encodeURIComponent('อื่นๆ')+'&url='+encodeURIComponent(SITE_URL+'/land.html?id='+l.id)+'&topic=selflisted#form'"));
const own = land.slice(land.indexOf('function ownerFormHtml'), land.indexOf('// ---------- การ์ดติดต่อในแถบข้าง'));
ok('กล่องอยู่ใต้ฟอร์มและในข้อความหลังส่งสำเร็จ', own.split('selfVerifyHtml(l)').length - 1 === 2);
ok('ไม่มีการส่งอีเมล/บันทึกเพิ่มจากกล่องนี้', !has(chk, 'fetch(') && !/mail/i.test(chk));
const verifyJs = read('verify.js');
ok('verify.js รู้จักหัวข้อ selflisted + แหล่ง อื่นๆ อยู่ในรายการ', /^\s*selflisted: '/m.test(verifyJs) && has(verifyJs, "'อื่นๆ']"));
ok('ใบลงเองไม่เรียกตัวเองว่า ขายเองชัวร์ ในฟอร์มเจ้าของ', has(own, "l.selfListed===true?'เจ้าของลงประกาศเอง':'ขายเองชัวร์'"));
ok('ไม่มีคำรับประกัน/เร่งเวลาในกล่อง', !/รับประกัน|การันตี|เร็วขึ้น|ไม่กี่นาที/.test(chk));
ok('มีสไตล์ .ld-selfchk', has(read('land.css'), '.ld-selfchk{'));
// แสดงเบอร์ผู้ลงประกาศ (20 พ.ย. 69) — ผู้ลงเลือกเองในบัญชี · ระบบส่งแค่ธง selfPhone · ตัวเบอร์ดึงตอนกด
const ph = land.slice(land.indexOf('function ownerPhoneOn'), land.indexOf('function ownerFormHtml'));
ok('ปุ่มดูเบอร์ผู้ลงประกาศ เฉพาะใบลงเองที่ selfPhone === true', has(ph, "l.selfListed===true && l.selfPhone===true") && has(ph, 'data-ownphone'));
ok('ปุ่มดูเบอร์ผู้ลงประกาศไม่มี data-contact (นับเป็น phone_reveal ครั้งเดียว)', !has(ph, 'data-contact'));
ok('มีคำเตือนว่าไม่ได้ตรวจตัวตนผู้ลงประกาศ', has(ph, 'ไม่ได้ตรวจสอบตัวตนผู้ลงประกาศ'));
ok('ไม่มีคำรับประกันในกล่องเบอร์', !/รับประกัน|การันตี/.test(ph));
const rvo = land.slice(land.indexOf('function revealOwnerPhone'), land.indexOf('// แมปช่องทาง'));
ok('ดึงเบอร์จาก /owner-phone ตอนกดเท่านั้น + ยิง phone_reveal', has(rvo, "'/owner-phone'") && has(rvo, "njTrackInternal('phone_reveal', id)"));
ok('ดึงไม่สำเร็จ = บอกตรงๆ ไม่เงียบ', has(rvo, 'ดูเบอร์ไม่สำเร็จ'));
ok('ไม่มีเบอร์ผู้ลงประกาศจากข้อมูลประกาศ (ไม่อ่าน l.ownerPhone/l.phone)', !/\bl\.(ownerPhone|phone)\b/.test(land));
ok('กล่องเบอร์อยู่ทั้งการ์ดข้างและกล่องติดต่อเจ้าของ', (land.match(/ownerPhoneHtml\(l\)\+/g) || []).length === 2);
ok('มีสไตล์ .ld-ownphone', has(read('land.css'), '.ld-ownphone{'));
console.log('selflisted: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
