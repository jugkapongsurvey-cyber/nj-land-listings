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

console.log('\n6) ค่าดำเนินการนอกพื้นที่ (โซนเดินทาง) — เว็บต้องคิดเท่ากับใบเสนอราคาจริง');
// เพิ่ม 2026-09-08 · โซนเดินทาง 7 ขั้น (12,000–75,000) ขึ้นระบบหลังบ้านเมื่อ 8 ก.ย. แต่เครื่อง
// ประเมินราคาบนเว็บไม่ได้บวกให้เลยจนถึงวันนั้น = ลูกค้าต่างจังหวัดเห็นราคาที่ขาดไปหลักหมื่น
// ข้อนี้ล็อกไว้ไม่ให้หลุดซ้ำ — และ pricing.js require ได้ (UMD) จึงพิสูจน์ด้วยตัวเลขจริงได้ ไม่ใช่แค่ regex
const quoteJs = read(path.join(WEB, 'surveyquote.js'));
let NJP = null;
try { NJP = require(path.join(SRV, 'public', 'pricing.js')); } catch (e) { NJP = null; }
check('require pricing.js ของระบบหลังบ้านได้', !!(NJP && NJP.computeQuote));

if (NJP && NJP.computeQuote) {
  check('pricing.js ยังส่งออก zoneOf · TRAVEL_ZONES · ZONE_PROVINCES ครบ (เว็บเรียกใช้ทั้งสามตัว)',
        typeof NJP.zoneOf === 'function' && Array.isArray(NJP.TRAVEL_ZONES) && !!NJP.ZONE_PROVINCES);

  // เว็บต้องส่ง travel เข้า computeQuote — ทั้งกล่องหน้าแรกและตัวที่หน้าฝากขายเรียกใช้
  check('surveyquote.js ส่ง travel เข้า computeQuote ครบทั้ง 2 จุด',
        (quoteJs.match(/travel:\s*travelInput\(/g) || []).length >= 2);
  check('หน้าฝากขายส่งจังหวัดเข้าไปด้วย (ไม่งั้นกล่องราคาบนหน้าฝากขายยังขาดค่าเดินทาง)',
        /quoteFromWa\([^)]*province:\s*getProvince\(\)/.test(consign));

  // คืนพักต้องใช้ค่าเริ่มต้นเดียวกับฟอร์มใบเสนอราคาในระบบ (travelNightsDefault → zone.nights)
  const appJs = read(path.join(SRV, 'public', 'app.js'));
  check('ระบบหลังบ้านยังตั้งคืนพักเริ่มต้น = คืนที่แนะนำของโซน (travelNightsDefault)',
        /function travelNightsDefault[\s\S]{0,240}zi\s*\?\s*zi\.nights/.test(appJs));
  check('เว็บก็ส่งคืนพักไปด้วย (ไม่ส่ง = ต่ำกว่าใบเสนอราคาจริง)',
        /nights:\s*zi\s*\?\s*zi\.nights/.test(quoteJs));

  // พิสูจน์เป็นตัวเลข: โซนที่ต้องค้างคืน ถ้าไม่ส่ง nights ยอดจะต่ำกว่าจริง
  const zoneWithNights = NJP.TRAVEL_ZONES.filter(z => z.nights > 0)[0];
  const provOfZone = zoneWithNights ? (NJP.ZONE_PROVINCES[zoneWithNights.code] || [])[0] : '';
  const noNights = NJP.computeTravel({ province: provOfZone });
  const withNights = NJP.computeTravel({ province: provOfZone, nights: zoneWithNights.nights });
  check('ตัวอย่างจริง (' + provOfZone + '): ส่ง nights แล้วยอดสูงกว่าไม่ส่ง — เหตุผลที่เว็บต้องส่ง',
        !!(noNights && withNights && withNights.total > noNights.total),
        (noNights && noNights.total) + ' → ' + (withNights && withNights.total));

  // ส่วนลดคอมโบ 5% ห้ามกินค่าเดินทาง (กติกาเดียวกับส่วนลดลูกค้าเดิม 40% ใน pricing.js)
  check('ส่วนลดคอมโบคิดจากฐานที่หักค่าเดินทางออกแล้ว (comboBase)',
        (quoteJs.match(/comboBase\(pre\)\s*\*\s*COMBO_RATE/g) || []).length >= 2 &&
        /function comboBase[\s\S]{0,160}travelTotal/.test(quoteJs));

  // ห้ามก๊อปตารางโซนมาไว้ฝั่งเว็บ — เหตุผลเดียวกับตารางราคา (ดูหัวไฟล์ surveyquote.js)
  const zoneFees = NJP.TRAVEL_ZONES.map(z => z.fee).filter(f => f > 0);
  const hardcoded = zoneFees.filter(f => new RegExp('[^0-9]' + f + '[^0-9]').test(quoteJs));
  check('surveyquote.js ไม่มีค่าโซนฝังไว้เอง (ต้องอ่านจาก pricing.js เท่านั้น)',
        hardcoded.length === 0, hardcoded.join(', '));
  check('surveyquote.js ไม่มีรายชื่อจังหวัดฝังไว้เอง',
        !/กรุงเทพมหานคร|เชียงใหม่|สงขลา/.test(quoteJs));
}


console.log('\n7) ระลอก Teedin Sure Verified — บันได 5 ระดับ · รายงานสุขภาพแปลง · คำศัพท์ชุดกลาง');
{
  const lvPath = path.join(SRV, 'lib', 'landverify.js');
  if (!fs.existsSync(lvPath)) {
    check('พบ lib/landverify.js ฝั่งเซิร์ฟเวอร์', false, lvPath);
  } else {
    const lv = read(lvPath);
    const vocab = read(path.join(WEB, 'landvocab.js'));
    const verified = read(path.join(WEB, 'verified.js'));
    const health = read(path.join(WEB, 'health.js'));
    const parcelmap = read(path.join(WEB, 'parcelmap.js'));

    // 5 ระดับ ต้องตรงกันทั้งคีย์และ **ลำดับ** — ลำดับคือบันไดที่ผู้ซื้อเห็น สลับเมื่อไหร่ความหมายเปลี่ยนทันที
    const srvLevels = listAfter(lv, 'const VERIFY_LEVELS');
    const webLevels = (verified.match(/\{ k: '([a-z]+)'/g) || []).map(s => s.slice(6, -1));
    check('ระดับตรงกันทั้งคีย์และลำดับ', same(srvLevels || [], webLevels),
      JSON.stringify(srvLevels) + ' vs ' + JSON.stringify(webLevels));
    check('มีครบ 5 ระดับ', (srvLevels || []).length === 5, String((srvLevels || []).length));

    // สถานะที่เซิร์ฟเวอร์ส่งออกได้ ฝั่งเว็บต้องรู้จักครบ
    // ไม่รู้จักเมื่อไหร่ = ระดับที่ "พบประเด็น" จะถูกวาดเป็น "ยังไม่ได้ตรวจ" เงียบๆ ซึ่งเป็นการปิดบัง
    ['passed', 'issue'].forEach(function (s) {
      check('verified.js รู้จักสถานะ ' + s, verified.indexOf("'" + s + "'") >= 0);
    });
    check('verified.js รู้จักสถานะหมดอายุ (expired)', verified.indexOf('expired') >= 0);

    // คำศัพท์ชุดใหม่ — คีย์ต้องตรงกันเป๊ะ ไม่งั้นหน้าเว็บขึ้นคีย์ดิบแทนชื่อไทย
    [['const LAND_SHAPES', 'var SHAPE_TH'],
     ['const LAND_ACCESS', 'var ACCESS_TH'],
     ['const LAND_STRUCTURES', 'var STRUCTURE_TH']].forEach(function (pair) {
      const srvKeys = (listAfter(lv, pair[0]) || []).slice().sort();
      const i = vocab.indexOf(pair[1]);
      const seg = i < 0 ? '' : vocab.slice(i, vocab.indexOf('};', i));
      const webKeys = (seg.match(/[{,\s]([a-z_]+):/g) || [])
        .map(function (s) { return s.replace(/[^a-z_]/g, ''); }).sort();
      check(pair[0].replace('const ', '') + ' ตรงกันทุกคีย์', same(srvKeys, webKeys),
        JSON.stringify(srvKeys) + ' vs ' + JSON.stringify(webKeys));
    });

    // ⚠️ ที่ตาบอดและแนวรุกล้ำ = ข้อมูลที่ผู้ซื้อต้องรู้ที่สุดในรายงานสุขภาพแปลง
    // ถอดออกจากฝั่งใดฝั่งหนึ่งเมื่อไหร่ = ปิดบังสิ่งที่กระทบการตัดสินใจซื้อโดยตรง
    check('ทั้งสองฝั่งยังมีตัวเลือก "ที่ตาบอด"',
      lv.indexOf('ที่ตาบอด') >= 0 && vocab.indexOf('ที่ตาบอด') >= 0);
    check('ทั้งสองฝั่งยังมีตัวเลือก "พบแนวรุกล้ำ"',
      lv.indexOf('encroach') >= 0 && vocab.indexOf('encroach') >= 0);
    check('health.js ขึ้นสถานะแดงให้ที่ตาบอด', /access === 'none'[\s\S]{0,200}'bad'/.test(health));
    check('health.js ขึ้นสถานะแดงให้แนวรุกล้ำ', /structures === 'encroach'[\s\S]{0,200}'bad'/.test(health));

    // สำเนาคำศัพท์ชุดเดิมที่ยังกระจายอยู่ 3 ที่ (landvocab.js · listings.js · comparepage.js)
    const cmp = read(path.join(WEB, 'comparepage.js'));
    ['chanote', 'nor3gor', 'nor3', 'other'].forEach(function (k) {
      check('DEED_TH มี ' + k + ' ครบทั้ง 3 สำเนา',
        vocab.indexOf(k + ':') >= 0 && listings.indexOf(k + ':') >= 0 && cmp.indexOf(k + ':') >= 0);
    });

    // ⚠️ กติกาที่ห้ามผ่อน — ไฟล์ที่ผู้ซื้ออ่านห้ามมีคำรับประกัน
    [['verified.js', verified], ['health.js', health], ['parcelmap.js', parcelmap]].forEach(function (pair) {
      check(pair[0] + ' ไม่มีคำรับประกัน',
        !/ปลอดภัย 100|รับประกันกรรมสิทธิ์|ปลอดภัยแน่นอน|การันตี/.test(pair[1]));
    });

    // ⚠️ รูปแปลงต้องไม่มีทางส่งพิกัดเต็มความละเอียดออกไป
    const pg = read(path.join(SRV, 'lib', 'plotgeo.js'));
    check('plotgeo ปัดพิกัดก่อนส่งออกเสมอ', /GEO_DECIMALS\s*=\s*5/.test(pg));
    check('plotgeo คืน null เมื่อยังไม่กดเปิดเผย', /!P\.published\)\s*return null/.test(pg));
    // ความยาวด้านและพื้นที่ต้องมาจากเซิร์ฟเวอร์เท่านั้น คิดซ้ำที่ฝั่งเว็บ = ปัดเศษคนละแบบ
    // แล้วตัวเลขบนรูปแปลงกับในตารางจะไม่ตรงกันโดยไม่มีอะไรเตือน
    check('parcelmap.js อ่านความยาวด้านจาก plot.sides ที่เซิร์ฟเวอร์คิดมา',
      /plot.sides/.test(parcelmap));
    check('parcelmap.js อ่านพื้นที่จาก plot.areaWa ที่เซิร์ฟเวอร์คิดมา',
      /plot.areaWa/.test(parcelmap));
    check('parcelmap.js ไม่มีสูตรพื้นที่ (shoelace) ของตัวเอง',
      !/areaOf|shoelace/.test(parcelmap));
  }
}

console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
