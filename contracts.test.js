/* ตรวจ "รายการที่ต้องตรงกันข้าม repo" — เว็บ (nj-land-listings) ↔ ระบบหลังบ้าน (nj-survey-system)
 *   รันด้วย:  node contracts.test.js  [path ไปยัง nj-survey-system]
 *
 * ทำไมต้องมีไฟล์นี้: ความผิดพลาดที่แพงที่สุดของโปรเจกต์นี้ไม่ใช่โค้ดพัง แต่คือ
 * **รายการค่าตายตัวสองฝั่งเลื่อนออกจากกันโดยไม่มี error ให้เห็น** ซึ่งเคยเกิดมาแล้วจริง:
 *   · `messenger_click` มีใน server.js แต่ไม่มีใน analytics.js → คลิกทุกครั้งถูกทิ้งเงียบๆ (2026-08-28)
 *   · ค่าใน dropdown ไม่ตรง LAND_DEEDS → กรองไม่เจออะไรเลยทั้งที่ข้อมูลมีอยู่
 * เทสต์นี้อ่านไฟล์ทั้งสองฝั่งเป็นข้อความแล้วเทียบรายการที่ผูกกันไว้ ไม่ต้องรันเซิร์ฟเวอร์
 *
 * ⚠️ ตั้งใจอ่านด้วย regex ไม่ใช่ require() — server.js เป็นไฟล์ 8,000 บรรทัดที่เปิดเซิร์ฟเวอร์ทันทีที่ถูก require
 */
const fs = require('fs');
const path = require('path');

const WEB = __dirname;
const SRV = process.argv[2] || path.join(WEB, '..', 'nj-survey-system');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}
function read(p) { return fs.readFileSync(p, 'utf8'); }
function same(a, b) { return a.length === b.length && a.every((x, i) => x === b[i]); }
// ดึงรายการสตริงในวงเล็บเหลี่ยมที่ตามหลังชื่อตัวแปร — ใช้ได้กับทั้ง const และ var
function listAfter(src, name) {
  const i = src.indexOf(name);
  if (i < 0) return null;
  const open = src.indexOf('[', i);
  const close = src.indexOf(']', open);
  if (open < 0 || close < 0) return null;
  return (src.slice(open + 1, close).match(/'([^']*)'/g) || []).map(s => s.slice(1, -1));
}

if (!fs.existsSync(path.join(SRV, 'server.js'))) {
  console.log('ข้าม — ไม่พบ nj-survey-system ที่ ' + SRV + ' (ส่ง path มาเป็นอาร์กิวเมนต์ที่ 1 ได้)');
  process.exit(0);
}

const server = read(path.join(SRV, 'server.js'));
const analytics = read(path.join(WEB, 'analytics.js'));
const services = read(path.join(WEB, 'njservices.js'));
const consign = read(path.join(WEB, 'consign.js'));
const listings = read(path.join(WEB, 'listings.js'));

console.log('\n1) ชนิดเหตุการณ์สถิติ — ฝั่งเบราว์เซอร์ต้องเป็นสับเซตของฝั่งเซิร์ฟเวอร์');
// ฝั่งเซิร์ฟเวอร์รับได้มากกว่า (บางชนิดเซิร์ฟเวอร์บันทึกเอง เช่น consign_submit) แต่ฝั่งเบราว์เซอร์
// ห้ามมีชนิดที่เซิร์ฟเวอร์ไม่รู้จักเด็ดขาด — ยิงไปก็โดนตอบ 400 แล้วสถิติหายเงียบๆ
const srvEvents = listAfter(server, 'PUBLIC_EVENT_TYPES');
const webEvents = listAfter(analytics, 'NJ_INTERNAL_EVENTS');
check('อ่านรายการทั้งสองฝั่งได้', !!srvEvents && !!webEvents, srvEvents + ' / ' + webEvents);
const orphan = (webEvents || []).filter(e => (srvEvents || []).indexOf(e) < 0);
check('ไม่มีชนิดที่เบราว์เซอร์ยิงแต่เซิร์ฟเวอร์ไม่รู้จัก', orphan.length === 0, orphan.join(', '));
['inquiry_view', 'inquiry_submit', 'compare_open'].forEach(function (e) {
  check('เซิร์ฟเวอร์รู้จัก ' + e, (srvEvents || []).indexOf(e) >= 0);
});
check('inquiry_submit ไม่อยู่ในรายการฝั่งเบราว์เซอร์ (เซิร์ฟเวอร์บันทึกเองตอนสร้างใบ — นับที่เดียว)',
      (webEvents || []).indexOf('inquiry_submit') < 0);

console.log('\n2) รายการบริการเพิ่มเติม — คีย์ต้องตรงกันเป๊ะ');
// เซิร์ฟเวอร์ทิ้งคีย์ที่ไม่รู้จักโดยไม่มี error → ติ๊กแล้วเหมือนไม่ได้ติ๊ก
const srvSvc = (server.match(/\{ key: '([a-z]+)',\s+by: '(?:nj|partner)'/g) || [])
  .map(s => (s.match(/key: '([a-z]+)'/) || [])[1]);
const webSvc = (services.match(/\{ key: '([a-z]+)',\s+by: '(?:nj|partner)'/g) || [])
  .map(s => (s.match(/key: '([a-z]+)'/) || [])[1]);
check('อ่านรายการบริการได้ทั้งสองฝั่ง', srvSvc.length > 0 && webSvc.length > 0, srvSvc.length + ' / ' + webSvc.length);
check('คีย์บริการตรงกันทั้งชุดและลำดับ', same(srvSvc, webSvc), srvSvc.join(',') + '  vs  ' + webSvc.join(','));

console.log('\n3) จังหวัดที่บังคับรังวัดก่อนขึ้นประกาศ');
// ไม่ตรง = หน้าเว็บบอกว่าเลือกได้ แต่พอบันทึกแล้วค่ากลายเป็น "ต้องรังวัด" โดยไม่มีคำอธิบาย
const srvProv = listAfter(server, 'SURVEY_REQUIRED_PROVINCES');
const webProv = listAfter(consign, 'SURVEY_REQUIRED_PROVINCES');
check('อ่านรายชื่อจังหวัดได้ทั้งสองฝั่ง', !!srvProv && !!webProv);
check('รายชื่อจังหวัดตรงกันเป๊ะ', same(srvProv || [], webProv || []),
      (srvProv || []).join(',') + '  vs  ' + (webProv || []).join(','));
check('ครอบคลุม กทม. และปริมณฑลครบ 6 จังหวัด', (srvProv || []).length === 6, String((srvProv || []).length));

console.log('\n4) ตัวเลือกรังวัดที่เซิร์ฟเวอร์รับได้');
const opts = listAfter(server, 'CONSIGN_SURVEY_OPTS');
check('มีครบ 3 ค่า yes/no/undecided', same(opts || [], ['yes', 'no', 'undecided']), (opts || []).join(','));
check('ค่าตั้งต้นในฟอร์มคือ undecided ไม่ใช่ no (ยังไม่เลือก ≠ เลือกว่าไม่เอา)',
      /value="undecided" checked/.test(read(path.join(WEB, 'consign.html'))));

console.log('\n5) ค่าตายตัวของข้อมูลแปลง — หน้าเปรียบเทียบต้องใช้ชุดเดียวกับหน้ารวมประกาศ');
// สองหน้านี้แสดงข้อมูลชุดเดียวกันคนละรูปแบบ ใช้คีย์คนละชุดเมื่อไหร่ = ตารางเทียบขึ้น "—"
// ทั้งที่หน้ารวมประกาศกรองเจอ ซึ่งอ่านแล้วเหมือนข้อมูลหาย
const cmp = read(path.join(WEB, 'comparepage.js'));
// ดึง "ชื่อคีย์" ของ object literal ที่ตามหลังชื่อตัวแปร — อ่านด้วย regex ล้วน ไม่ผ่าน JSON.parse
// (ค่าข้างในเป็นภาษาไทยและใช้ single quote ซึ่งไม่ใช่ JSON ที่ถูกต้องอยู่แล้ว)
function objKeys(src, name) {
  const i = src.indexOf(name);
  if (i < 0) return null;
  const open = src.indexOf('{', i);
  let depth = 0, end = -1;
  for (let j = open; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) { end = j; break; } }
  }
  if (end < 0) return null;
  const body = src.slice(open + 1, end).replace(/'[^']*'/g, "''");   // ตัดค่าทิ้งก่อน เหลือแต่คีย์
  return (body.match(/(?:^|[{,\s])([A-Za-z_][A-Za-z_0-9]*)\s*:/g) || [])
    .map(s => s.replace(/[^A-Za-z_0-9]/g, ''));
}
[['LAND_DEEDS', 'DEED_TH'], ['LAND_ZONES', 'ZONE_TH'], ['PARCEL_FEATURES', 'FEATURES']].forEach(function (pair) {
  const srvList = listAfter(server, pair[0] + ' =');
  const cmpKeys = pair[1] === 'FEATURES'
    ? listAfter(cmp, 'var FEATURES =')
    : objKeys(cmp, 'var ' + pair[1]);
  check(pair[1] + ' ครบตาม ' + pair[0], same((srvList || []).slice().sort(), (cmpKeys || []).slice().sort()),
        (srvList || []).join(',') + '  vs  ' + (cmpKeys || []).join(','));
});
const lsFeat = listAfter(listings, 'var FEATURES =');
check('รายการ "สิ่งที่แปลงมี" ของหน้าเปรียบเทียบตรงกับหน้ารวมประกาศ',
      same(lsFeat || [], listAfter(cmp, 'var FEATURES =') || []));

console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
