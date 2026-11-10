// รังวัดก่อนโอน (listingcard.js · land.js · consign) — รันด้วย node presurvey.test.js
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
global.window = {};
new Function(read('landvocab.js'))();
new Function(read('listingcard.js'))();
const NJL = global.window.NJListing;
let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}
const cardOf = ps => NJL.card(NJL.normalize({ id: 'OP-1', type: 'sell', parcelInfo: 'แปลงทดสอบ', estValue: 1000000, tier: 1, updatedAt: '2026-11-09', preSurvey: ps }));
const FORMAL = { mode: 'formal', modeTh: 'x' };
ok('ไม่มี preSurvey = ไม่มีแถบ', !/card-presurvey/.test(cardOf(null)));
ok('สถานะไม่รู้จัก = ไม่มีแถบ', !/card-presurvey/.test(cardOf(Object.assign({ state: 'zzz' }, FORMAL))));
const w = cardOf(Object.assign({ state: 'wait', result: null }, FORMAL));
ok('รอผู้ซื้อ: แถบรังวัดก่อนโอน', /รังวัดก่อนโอน/.test(w));
ok('⭐ รอผู้ซื้อ: ไม่อ้างว่ารังวัดแล้ว', !/รังวัดแล้ว|รังวัดยืนยันแล้ว/.test(w));
ok('⭐ ป้ายเหลืองข้อมูลเบื้องต้นยังอยู่', /ข้อมูลเบื้องต้น/.test(w));
ok('⭐ รอผู้ซื้อไม่ใช้สีเขียว', !/is-done/.test(w));
const b = cardOf(Object.assign({ state: 'busy', result: null }, FORMAL));
ok('วางมัดจำแล้ว: กำลังรังวัด ติดจอง', /กำลังรังวัด/.test(b) && /ติดจอง/.test(b));
ok('รังวัดเสร็จแต่ไม่มีผล = ไม่มีแถบ', !/card-presurvey/.test(cardOf(Object.assign({ state: 'done', result: null }, FORMAL))));
const d = cardOf(Object.assign({ state: 'done', result: { actualWa: 408, deedWa: 412, diffWa: -4 } }, FORMAL));
ok('รังวัดเสร็จ: บอกส่วนต่าง', /รังวัดแล้ว/.test(d) && /ต่างจากโฉนด 4 ตร\.ว\./.test(d), d);
ok('ช่างเอกชนบอกชัด', /ช่างเอกชน/.test(cardOf({ state: 'done', mode: 'informal', modeTh: 'x', result: { actualWa: 408, deedWa: 412, diffWa: -4 } })));
const land = read('land.js');
ok('หน้าแปลงมีแผงเด่น', land.indexOf('preSurveyHtml(l)+') > 0);
ok('บอกตรงว่ายังไม่ได้เปิดงานรังวัด', land.indexOf('ยังไม่ได้เปิดงานรังวัด') > 0);
ok('ข้อความกำกับไม่ใช่การรับรอง', land.indexOf('ไม่ใช่การรับรองผลรังวัด') > 0);
ok('ไม่คำนวณราคาเองในหน้าเว็บ', !/adjustedPrice\s*=/.test(land));
const banned = /รับประกัน|การันตี|แน่นอน|เร็วขึ้น|ไม่กี่นาที/;
const start = land.indexOf('function preSurveyHtml'), end = land.indexOf('function selfVerifyHref');
ok('⭐ แผงไม่มีคำรับประกัน/เร่งเวลา', !banned.test(land.slice(start, end)));
const html = read('consign.html');
ok('ตัวเลือกซ่อนจนระบบเปิด', /id="cs-sv-onsale" hidden/.test(html));
ok('ค่าเริ่มต้นยังเป็นยังไม่ตัดสินใจ', /value="undecided" checked/.test(html));
const form = html.slice(html.indexOf('id="cs-sv-onsale"'), html.indexOf('cs-sv-agree-note'));
ok('⭐ ฟอร์มบอกข้อแลกเปลี่ยน', /สิ่งที่ต้องแลก/.test(form) && !banned.test(form));
const css = read('marketplace.css') + read('home.css') + read('njchat.css');
ok('สไตล์การ์ดครบ 3 ชุด', css.split('card-presurvey{').length - 1 >= 3);
console.log('presurvey: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
