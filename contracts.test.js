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

    // ประเภทสิ่งปลูกสร้าง (2026-09-11) — คีย์ต้องตรงกันเป๊ะ ไม่งั้นตัวกรองหน้ารวมประกาศกับการ์ด
    // จะขึ้นคีย์ดิบ ("house") แทนชื่อไทย หรือกรองแล้วไม่เจอแปลงที่มีจริง
    var propSrv = (listAfter(server, 'LAND_PROPERTY_TYPES =') || []).slice().sort();
    var propWeb = (objKeys(vocab, 'var PROPERTY_TH') || []).slice().sort();
    check('LAND_PROPERTY_TYPES ตรงกับ PROPERTY_TH ทุกคีย์', same(propSrv, propWeb),
      JSON.stringify(propSrv) + ' vs ' + JSON.stringify(propWeb));
    check('ทั้งสองฝั่งไม่มีคีย์สำหรับ "ยังไม่ระบุ" (ค่าว่างคือยังไม่ได้กรอก ไม่ใช่ตัวเลือก)',
      propSrv.indexOf('') < 0 && propWeb.indexOf('unknown') < 0);

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

console.log('\n8) ระลอก Phase 2 — นัดตรวจแปลง · ติดตามงานซื้อขาย');
{
  const leadsLib = path.join(SRV, 'lib', 'leads.js');
  if (!fs.existsSync(leadsLib)) {
    console.log('  ข้าม — ยังไม่มี lib/leads.js ที่ฝั่งเซิร์ฟเวอร์ (สาขา phase2 ยังไม่ถูก merge)');
  } else {
    const leads = read(leadsLib);
    const inspect = read(path.join(WEB, 'inspect.js'));

    // ⚠️ ติ๊กบริการที่เซิร์ฟเวอร์ไม่รู้จัก = ถูกทิ้งเงียบๆ เหมือนเดิมทุกรอบ
    //    (pickList กรองคีย์แปลกออกโดยไม่มี error) — เทียบทั้งชุดและลำดับ
    const srvLeadSvc = listAfter(leads, 'LEAD_SERVICES');
    const webLeadSvc = (inspect.match(/\{ k: '([a-z_]+)'/g) || []).map(s => (s.match(/'([a-z_]+)'/) || [])[1]);
    check('อ่านรายการบริการตรวจแปลงได้ทั้งสองฝั่ง',
      !!srvLeadSvc && srvLeadSvc.length > 0 && webLeadSvc.length > 0,
      (srvLeadSvc || []).length + ' / ' + webLeadSvc.length);
    check('คีย์บริการตรวจแปลงตรงกันทั้งชุดและลำดับ', same(srvLeadSvc || [], webLeadSvc),
      (srvLeadSvc || []).join(',') + '  vs  ' + webLeadSvc.join(','));

    // แหล่งที่มาของลีด — เว็บส่งค่าที่ไม่รู้จักไปก็ถูกเก็บเป็น 'other' เงียบๆ
    // แล้วสถิติ "โฆษณาลงที่ไหนได้ผล" กองรวมกันหมด
    const srvSrc = listAfter(leads, 'LEAD_SOURCES');
    const webSrc = listAfter(inspect, 'var SOURCES');
    check('รายชื่อแหล่งที่มาของลีดตรงกัน', same(srvSrc || [], webSrc || []),
      (srvSrc || []).join(',') + '  vs  ' + (webSrc || []).join(','));

    check('เซิร์ฟเวอร์รู้จัก inspect_view', (srvEvents || []).indexOf('inspect_view') >= 0);
    check('เซิร์ฟเวอร์รู้จัก inspect_submit', (srvEvents || []).indexOf('inspect_submit') >= 0);
    check('inspect_submit ไม่อยู่ในรายการฝั่งเบราว์เซอร์ (เซิร์ฟเวอร์บันทึกเองตอนสร้างใบ)',
      (webEvents || []).indexOf('inspect_submit') < 0);

    // ⚠️ หน้าเว็บสาธารณะห้ามมีฟอร์มเข้าสู่ระบบ — เว็บนี้เป็นสแตติกบน GitHub Pages
    //    (กติกาเดียวกับ portal.html · การรับรหัสผ่านที่โดเมนหนึ่งแล้วส่งข้ามโดเมน = สอนลูกค้าให้โดนฟิชชิ่ง)
    check('inspect.js ไม่มีช่องรหัสผ่าน', !/type="password"|type=.password./.test(inspect));
    // ต้องยืนยัน PDPA ก่อนส่งเสมอ ทั้งฝั่งหน้าจอและฝั่งเซิร์ฟเวอร์
    check('inspect.js กันการส่งเมื่อยังไม่ติ๊กยินยอม', /pdpaAt/.test(inspect) && /ins-pdpa/.test(inspect));
    check('เซิร์ฟเวอร์ปฏิเสธใบที่ยังไม่ยินยอม', /consentOk/.test(read(path.join(SRV, 'server.js'))));

    const dealsLib = path.join(SRV, 'lib', 'deals.js');
    const dealWeb = path.join(WEB, 'deal.js');
    if (fs.existsSync(dealsLib) && fs.existsSync(dealWeb)) {
      const srvSteps = listAfter(read(dealsLib), 'const DEAL_STEPS');
      const webSteps = listAfter(read(dealWeb), 'var STEPS');
      check('ขั้นตอนการซื้อ 11 ขั้นตรงกันทั้งชุดและลำดับ', same(srvSteps || [], webSteps || []),
        (srvSteps || []).join(',') + '  vs  ' + (webSteps || []).join(','));
    }
  }
}

console.log('\n9) ระลอก Phase 3 — คะแนนความพร้อมของแปลง');
{
  const scoreLib = path.join(SRV, 'lib', 'landscore.js');
  if (!fs.existsSync(scoreLib)) {
    console.log('  ข้าม — ยังไม่มี lib/landscore.js ที่ฝั่งเซิร์ฟเวอร์ (สาขา phase3 ยังไม่ถูก merge)');
  } else {
    const srvScore = read(scoreLib);
    const webScore = read(path.join(WEB, 'landscore.js'));

    // ⚠️ ชนิดของเหตุผลต้องรู้จักครบทั้งสองฝั่ง — ฝั่งเว็บไม่รู้จักชนิดไหน ชนิดนั้นจะถูกวาดเป็น
    //    "ยังไม่มีข้อมูล" ทั้งที่ความจริงคือ "ตรวจแล้วพบประเด็น" ซึ่งกลับความหมายกันคนละขั้ว
    ['ok', 'partial', 'missing', 'issue'].forEach(function (k) {
      check('ฝั่งเว็บรู้จักเหตุผลชนิด ' + k, new RegExp('\\b' + k + ':\\s*\\{').test(webScore));
      check('ฝั่งเซิร์ฟเวอร์ใช้เหตุผลชนิด ' + k, new RegExp("kind: '" + k + "'").test(srvScore));
    });

    // คำเตือนต้องมาจากเซิร์ฟเวอร์ที่เดียว ฝั่งเว็บพิมพ์ค่าที่ได้รับมาเท่านั้น
    check('ฝั่งเซิร์ฟเวอร์ประกาศคำเตือนไว้', /SCORE_DISCLAIM/.test(srvScore));
    check('คำเตือนบอกว่าไม่ใช่การรับประกันทางกฎหมาย', /ไม่ใช่การรับประกันทางกฎหมาย/.test(srvScore));
    check('คำเตือนบอกว่าไม่ได้วัดคุณภาพที่ดิน', /ไม่ใช่การให้คะแนนคุณภาพที่ดิน/.test(srvScore));
    check('ฝั่งเว็บพิมพ์คำเตือนที่ได้รับมา ไม่ได้เขียนเอง', /score\.disclaim/.test(webScore));

    // ⚠️ ห้ามคิดคะแนนซ้ำที่ฝั่งเว็บ — สองที่ปัดเศษไม่เหมือนกันแล้วตัวเลขบนการ์ดกับหน้ารายละเอียดไม่ตรง
    check('ฝั่งเว็บไม่มีน้ำหนักคะแนนของตัวเอง', !/SCORE_PARTS|DEFAULT_WEIGHTS/.test(webScore));
    // ⚠️ เช็คว่า "ไม่มีการรวมยอด" ไม่ใช่เช็คว่าไม่มีคำว่า earned — ฝั่งเว็บพิมพ์ `p.earned + ' / '`
    //    เพื่อแสดงผลอยู่แล้ว ซึ่งถูกต้อง (กับดักเดียวกับตอนเช็ค LEAD_FLOW ที่ไปเจอคำในคอมเมนต์)
    check('ฝั่งเว็บไม่รวมยอดคะแนนเอง', !/reduce\(|\+=/.test(webScore));
    check('ฝั่งเว็บอ่านคะแนนรวมจากเซิร์ฟเวอร์', /score\.total/.test(webScore));

    // ไม่มีคะแนน = ไม่วาดอะไรเลย (แปลงเก่าหน้าตาเหมือนเดิม)
    check('ป้ายบนการ์ดคืนค่าว่างเมื่อไม่มีคะแนน', /badgeHtml[\s\S]{0,220}return ''/.test(webScore));
    check('แผงในหน้าแปลงคืนค่าว่างเมื่อไม่มีคะแนน', /panelHtml[\s\S]{0,220}return ''/.test(webScore));

    check('ไฟล์คะแนนฝั่งเว็บไม่มีคำรับประกัน',
      !/รับประกันกรรมสิทธิ์|ปลอดภัย 100|สร้างได้แน่นอน|จัดสรรได้แน่นอน/.test(webScore));
    // น้ำหนักที่เจ้าของกิจการกำหนดไว้ ต้องยังเป็นค่าเริ่มต้นของระบบ
    [['documents', 20], ['owner', 15], ['boundary', 25], ['access', 15], ['zoning', 10], ['site', 10], ['fresh', 5]]
      .forEach(function (pair) {
        check('น้ำหนักเริ่มต้นของ ' + pair[0] + ' = ' + pair[1],
          new RegExp("key: '" + pair[0] + "'[^\\n]*weight: " + pair[1] + "\\b").test(srvScore));
      });
  }
}

console.log('\n10) ระลอก Phase 3 — ค้นหาตามวัตถุประสงค์ 8 แบบ');
{
  const purposeLib = path.join(SRV, 'lib', 'landpurpose.js');
  if (!fs.existsSync(purposeLib)) {
    console.log('  ข้าม — ยังไม่มี lib/landpurpose.js ที่ฝั่งเซิร์ฟเวอร์ (สาขา phase3 ยังไม่ถูก merge)');
  } else {
    const srvP = read(purposeLib);
    const webP = read(path.join(WEB, 'landpurpose.js'));
    const webPage = read(path.join(WEB, 'purpose.js'));
    // ตัดคอมเมนต์ทิ้งก่อนค้นคำต้องห้าม — คำพวกนี้ปรากฏได้เฉพาะในคอมเมนต์ที่ห้ามใช้มันเอง
    // ต้องตัดทั้งคอมเมนต์ก้อนหัวไฟล์และคอมเมนต์ท้ายบรรทัด ไม่งั้นกติกาที่เขียนกันไว้จะทำให้เทสต์แดงเอง
    // แล้วคนจะแก้ด้วยการลบกติกาออก ซึ่งกลับหัวกลับหางกับเจตนาของเทสต์ข้อนี้
    function bodyOf(src) {
      return src.replace(/\/\*[\s\S]*?\*\//g, ' ')
        .split(/\r?\n/)
        .filter(l => l.trim().indexOf('//') !== 0)
        .join('\n');
    }

    // ⚠️ คำต้องห้ามที่สุดของฟีเจอร์นี้ — การก่อสร้าง แบ่งแยกแปลง และจัดสรรที่ดิน
    //    ต้องขออนุญาตจากหน่วยงานเสมอ ระบบนี้ฟันธงแทนไม่ได้ไม่ว่าข้อมูลจะครบแค่ไหน
    ['สร้างได้แน่นอน', 'จัดสรรได้แน่นอน', 'แบ่งขายได้แน่นอน', 'รับประกัน', 'การันตี'].forEach(function (wd) {
      check('lib ฝั่งเซิร์ฟเวอร์ไม่มีคำว่า "' + wd + '"', bodyOf(srvP).indexOf(wd) < 0);
      check('landpurpose.js ฝั่งเว็บไม่มีคำว่า "' + wd + '"', bodyOf(webP).indexOf(wd) < 0);
      check('purpose.js ฝั่งเว็บไม่มีคำว่า "' + wd + '"', bodyOf(webPage).indexOf(wd) < 0);
    });

    // คีย์วัตถุประสงค์ต้องมาจากเซิร์ฟเวอร์ที่เดียว ฝั่งเว็บห้ามฝังรายการไว้เอง
    // (ฝังเมื่อไหร่ = วันหนึ่งปุ่มบนเว็บกับตัวคำนวณใช้คีย์คนละชุด แล้วกดแล้วได้ผลว่างโดยไม่มีอะไรเตือน)
    ['home', 'warehouse', 'factory', 'shop', 'subdivide', 'allocate', 'farm', 'invest'].forEach(function (k) {
      check('ฝั่งเซิร์ฟเวอร์ประกาศวัตถุประสงค์ ' + k, new RegExp("key: '" + k + "'").test(srvP));
    });
    check('ฝั่งเว็บไม่ได้ฝังรายชื่อวัตถุประสงค์ไว้เอง',
      !/PURPOSES\s*=\s*\[/.test(webP) && !/PURPOSES\s*=\s*\[/.test(webPage));
    check('ฝั่งเว็บดึงรายชื่อจาก /api/public/purposes', /api\/public\/purposes/.test(webP));
    check('เซิร์ฟเวอร์เปิดเส้นทาง /api/public/purposes', /'\/api\/public\/purposes'/.test(server));
    check('เซิร์ฟเวอร์รับตัวกรอง ?purpose= ที่หน้ารวมประกาศ', /pickPurpose\(req\.query/.test(server));
    check('ฝั่งเว็บยิงค้นด้วย ?purpose=', /listings\?purpose=/.test(webP));

    // ⚠️ ระดับผลลัพธ์ต้องรู้จักครบทั้งสองฝั่ง โดยเฉพาะ unknown ที่ห้ามถูกอ่านเป็น weak
    //    "ยังบอกไม่ได้" = ยังไม่มีใครไปตรวจ · "ยังไม่เข้าทาง" = ตรวจแล้วข้อมูลชี้ว่าติดขัด
    ['good', 'maybe', 'unknown', 'weak'].forEach(function (b) {
      check('ฝั่งเว็บรู้จักระดับ ' + b, webP.indexOf("'" + b + "'") >= 0);
      check('ฝั่งเซิร์ฟเวอร์ประกาศระดับ ' + b, new RegExp("key: '" + b + "'").test(srvP));
    });
    check('ฝั่งเซิร์ฟเวอร์แยก "ยังบอกไม่ได้" ออกจาก "ยังไม่เข้าทาง"',
      /UNKNOWN_BAND/.test(srvP) && /ยังบอกไม่ได้/.test(srvP));

    // ห้ามคิดเองฝั่งเว็บ (บทเรียนเดียวกับราคาต่อตารางวาและคะแนนความพร้อม)
    check('ฝั่งเว็บไม่คำนวณความเข้ากันเอง', !/reduce\(|\+=/.test(webP));
    check('ฝั่งเว็บอ่านค่าที่เซิร์ฟเวอร์คิดมา', /\.fit\b/.test(webP));
    check('แผงในหน้าแปลงคืนค่าว่างเมื่อ API ไม่ส่งข้อมูลมา', /panelHtml[\s\S]{0,220}return ''/.test(webP));
    check('ป้ายระดับคืนค่าว่างเมื่อไม่มีข้อมูล', /badgeHtml[\s\S]{0,220}return ''/.test(webP));

    // คำอธิบายต้องมาจากเซิร์ฟเวอร์ที่เดียว และฝั่งเว็บต้องพิมพ์ออกมาจริง
    check('ฝั่งเซิร์ฟเวอร์ประกาศคำอธิบายไว้', /PURPOSE_DISCLAIM/.test(srvP));
    check('คำอธิบายบอกว่าไม่ใช่การยืนยันตามกฎหมาย', /ไม่ใช่การยืนยัน/.test(srvP));
    check('คำอธิบายบอกว่าต้องขออนุญาตก่อน', /ขออนุญาตจากหน่วยงานที่เกี่ยวข้อง/.test(srvP));
    check('คำอธิบายบอกว่ายังไม่มีข้อมูลไม่เท่ากับไม่เหมาะ', /ไม่เท่ากับไม่เหมาะ/.test(srvP));
    check('แผงในหน้าแปลงพิมพ์คำอธิบายที่ได้รับมา', /disclaim/.test(webP));
    check('หน้าค้นหาพิมพ์คำอธิบายที่ได้รับมา', /disclaim/.test(webPage));

    // บริการที่แนะนำต่อ ต้องใช้คีย์ชุดเดียวกับ NJ_SERVICES ไม่งั้นผู้ซื้อกดแล้วบริการหายเงียบๆ
    const njSvcKeys = (server.match(/key: '[a-z]+', +by: '(?:nj|partner)'/g) || [])
      .map(s => s.match(/key: '([a-z]+)'/)[1]);
    check('เซิร์ฟเวอร์ยังประกาศ NJ_SERVICES ครบ 7 บริการ', njSvcKeys.length === 7, njSvcKeys.join(','));
    njSvcKeys.forEach(function (k) {
      check('lib วัตถุประสงค์รู้จักบริการ ' + k, new RegExp('\\b' + k + ':').test(srvP));
    });

    // ⚠️ ห้ามคัดแปลงที่ยังไม่มีข้อมูลออกจากผลค้น — เซิร์ฟเวอร์เรียงลำดับให้แล้วและไม่ได้คัดใครทิ้ง
    check('หน้าค้นหาไม่กรองแปลงออกเอง', !/\.filter\(/.test(webPage));
    check('หน้าค้นหาบอกจำนวนของแต่ละระดับ', /counts/.test(webPage));
    check('เซิร์ฟเวอร์เรียงลำดับแทนการกรอง', /sortByFit/.test(server));

    check('เหตุการณ์ purpose_view ขึ้นทะเบียนทั้งสองฝั่ง',
      /'purpose_view'/.test(server) && /'purpose_view'/.test(read(path.join(WEB, 'analytics.js'))));
    check('หน้า purpose.html อยู่ในแผนผังเว็บ', /purpose\.html/.test(read(path.join(WEB, 'sitemap.xml'))));
  }
}

console.log('\n11) ระลอก Phase 3 — ห้องข้อมูลแปลง');
{
  const roomLib = path.join(SRV, 'lib', 'dataroom.js');
  if (!fs.existsSync(roomLib)) {
    console.log('  ข้าม — ยังไม่มี lib/dataroom.js ที่ฝั่งเซิร์ฟเวอร์ (สาขา phase3 ยังไม่ถูก merge)');
  } else {
    const srvRoom = read(roomLib);
    const webRoom = read(path.join(WEB, 'room.js'));
    // ⚠️ ตัดคอมเมนต์ทิ้งก่อนค้นคำต้องห้าม — กติกาที่เขียนกันไว้ในคอมเมนต์ต้องไม่ทำให้เทสต์แดงเอง
    // (บทเรียนเดียวกับหัวข้อ 10 · ไม่งั้นคนจะแก้ด้วยการลบกติกาออก ซึ่งกลับหัวกลับหางกัน)
    const noComment = src => src.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split(/\r?\n/).filter(l => l.trim().indexOf('//') !== 0).join('\n');
    const webRoomBody = noComment(webRoom);
    const roomHtml = read(path.join(WEB, 'room.html'));
    const robots = read(path.join(WEB, 'robots.txt'));

    // ชนิดเอกสาร 8 ชนิดตามข้อกำหนด — ฝั่งเว็บไม่ฝังรายการเอง แต่ต้องมีครบฝั่งเซิร์ฟเวอร์
    ['deed', 'inspect', 'survey', 'map', 'photo', 'access', 'consent', 'sale'].forEach(function (k) {
      check('เซิร์ฟเวอร์ประกาศชนิดเอกสาร ' + k, new RegExp("key: '" + k + "'").test(srvRoom));
    });
    check('ฝั่งเว็บไม่ได้ฝังรายชื่อชนิดเอกสารไว้เอง', !/DOC_KINDS\s*=\s*\[/.test(webRoom));
    check('ฝั่งเว็บอ่านชื่อชนิดจากที่เซิร์ฟเวอร์ส่งมา', /kindTh/.test(webRoom));

    // ⚠️ เอกสารต้องไม่มี URL ตรง — ฝั่งเว็บต้องเรียกผ่านเส้นทางที่มีตั๋วเท่านั้น
    check('ฝั่งเว็บเปิดเอกสารผ่านเส้นทางที่ตรวจสิทธิ์', /dataroom\/[\s\S]{0,60}\/file\//.test(webRoom));
    check('ฝั่งเว็บไม่ได้ลิงก์ไปที่ /uploads ของเอกสารห้องข้อมูล', !/uploads/.test(webRoom));
    check('เซิร์ฟเวอร์เก็บเอกสารคนละโฟลเดอร์กับ /uploads', /ROOM_DIR/.test(server));
    check('เซิร์ฟเวอร์ไม่ได้ mount โฟลเดอร์ห้องข้อมูลเป็น static', !/express\.static\(\s*ROOM_DIR/.test(server));
    check('เซิร์ฟเวอร์ประทับลายน้ำก่อนส่งเอกสารออกเสมอ', /renderWatermarked/.test(server));

    // ⚠️ ห้ามให้เสิร์ชเอนจินเก็บ — กันสองชั้น
    check('room.html ประกาศ noindex ในหน้า', /name="robots"[^>]*noindex/.test(roomHtml));
    check('robots.txt กัน /room.html ไว้ด้วย', /Disallow: \/room\.html/.test(robots));
    check('เซิร์ฟเวอร์ส่งหัว X-Robots-Tag กับเอกสาร', /X-Robots-Tag/.test(server));
    check('room.html ไม่อยู่ในแผนผังเว็บ', !/room\.html/.test(read(path.join(WEB, 'sitemap.xml'))));

    // ยินยอม PDPA ก่อนเสมอ — กันทั้งสองฝั่ง
    check('ฝั่งเว็บปิดปุ่มส่งไว้จนกว่าจะติ๊กยินยอม', /disabled = !box\.checked/.test(webRoom));
    check('ฝั่งเว็บส่งเวลาที่ยินยอมไปด้วย', /pdpaAt/.test(webRoom));
    check('เซิร์ฟเวอร์ตรวจความยินยอมซ้ำอีกชั้น', /consentOk\(b\)/.test(server));

    // เหตุการณ์สถิติต้องตรงกันสองฝั่ง (บทเรียน messenger_click)
    check('dataroom_view ขึ้นทะเบียนทั้งสองฝั่ง',
      /'dataroom_view'/.test(server) && /'dataroom_view'/.test(read(path.join(WEB, 'analytics.js'))));
    check('dataroom_request บันทึกที่เซิร์ฟเวอร์ที่เดียว',
      /'dataroom_request'/.test(server) && !/'dataroom_request'/.test(noComment(read(path.join(WEB, 'analytics.js')))));

    // ⚠️ ข้อความที่ห้ามพูดบนหน้าเว็บ — ไม่มีทางได้ไฟล์ต้นฉบับจากห้องนี้
    check('ฝั่งเว็บไม่สัญญาว่าจะได้ไฟล์ต้นฉบับ', !/ไฟล์ต้นฉบับ|ดาวน์โหลดต้นฉบับ/.test(webRoomBody));
    check('ฝั่งเว็บเตือนว่าเอกสารมีชื่อผู้เปิดประทับอยู่', /ประทับ/.test(webRoom));
    check('ฝั่งเว็บเตือนว่าห้ามส่งลิงก์ต่อ', /อย่าส่งต่อ|ห้ามเผยแพร่ต่อ/.test(webRoom));

    // หน้ารายละเอียดแปลงต้องมีทางเข้า และต้องบอกว่าต้องขออนุมัติก่อน
    const landJs = read(path.join(WEB, 'land.js'));
    check('หน้ารายละเอียดแปลงมีทางเข้าห้องข้อมูล', /room\.html\?listing=/.test(landJs));
    check('ทางเข้าบอกว่าต้องผ่านการยืนยันตัวตนก่อน', /ยืนยันตัวตน/.test(landJs));
  }
}

// ---------- Phase 3 ข้อ 6 · หน้าตั้งค่าการแจ้งเตือนของผู้รับ ----------
{
  console.log('\n== ตั้งค่าการแจ้งเตือน (notify.html) ==');
  const stripCmt = src => src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split(/\r?\n/).filter(l => !/^\s*\/\//.test(l)).join('\n');
  const webNotify = read(path.join(WEB, 'notify.js'));
  const notifyHtml = read(path.join(WEB, 'notify.html'));
  const robots = read(path.join(WEB, 'robots.txt'));

  // ⚠️ ชื่อไฟล์ต้องตรงกับที่เซิร์ฟเวอร์ประกอบไว้ท้ายข้อความ — ไม่ตรง = ลิงก์ยกเลิกพาไป 404
  check('เซิร์ฟเวอร์ชี้มาที่ notify.html จริง', /notify\.html\?t=/.test(server));
  check('หน้านี้ห้ามเสิร์ชเอนจินเก็บ', /noindex/.test(notifyHtml));
  check('robots.txt กันอีกชั้น', /Disallow: \/notify\.html/.test(robots));

  // ⚠️ หน้าเว็บต้องดึงรายการเรื่องและช่องทางจาก API ห้ามก๊อปคีย์มาฝัง
  //    (บทเรียนเดียวกับ messenger_click ที่ตกหล่นใน analytics.js)
  check('หน้าเว็บไม่ก๊อปคีย์ของเรื่องมาฝัง',
    !/lead_new|appt_confirm|docs_missing|report_ready/.test(stripCmt(webNotify)));
  check('หน้าเว็บบอกว่าระบบยังไม่ส่งจริง', /ยังไม่ได้ส่ง/.test(webNotify));
  check('มีปุ่มยกเลิกทั้งหมดในหน้าเดียว', /unsubscribe/.test(webNotify));

  // ⛔ ต้องไม่มีตัวส่งจริงฝั่งระบบ
  check('ระบบหลังบ้านยังไม่เปิดการส่งจริง',
    /OUTBOUND_ENABLED = false/.test(read(path.join(SRV, 'lib', 'notifyout.js'))));
}


// ============================================================
// 12) ใบเสนอราคาที่ลูกค้ากดยอมรับเอง (Phase 4 รอบ 4)
// ============================================================
{
  const webQuote = read(path.join(WEB, 'quote.js'));
  const quoteHtml = read(path.join(WEB, 'quote.html'));
  const robots2 = read(path.join(WEB, 'robots.txt'));
  const analytics = read(path.join(WEB, 'analytics.js'));
  const srv = read(path.join(SRV, 'server.js'));

  // ⚠️ ชื่อไฟล์ต้องตรงกับที่เซิร์ฟเวอร์ประกอบไว้ในลิงก์ — ไม่ตรง = ลูกค้ากดลิงก์แล้วเจอ 404
  check('เซิร์ฟเวอร์ชี้มาที่ quote.html จริง', /quote\.html\?id=/.test(srv));
  check('หน้านี้ห้ามเสิร์ชเอนจินเก็บ', /noindex/.test(quoteHtml));
  check('ไม่ส่ง referrer (ตั๋วอยู่ใน URL)', /no-referrer/.test(quoteHtml));
  check('robots.txt กันอีกชั้น', /Disallow: \/quote\.html/.test(robots2));
  check('หน้าเรียกไฟล์ของตัวเองทั้งสองไฟล์',
    /quote\.js/.test(quoteHtml) && /quote\.css/.test(quoteHtml));

  // ⚠️ ห้ามคิดยอดเอง — ตัวเลขบนหน้านี้ต้องเท่ากับเอกสารที่ลูกค้าถืออยู่เสมอ
  check('⭐ หน้าเว็บไม่คิดยอดเอง', !/computeQuote|vatRate \* |\* 1\.07/.test(webQuote));
  // ⚠️ ข้อความกำกับเรื่องลายเซ็นห้ามถอด (ระบบยังไม่เชื่อมผู้ให้บริการลายเซ็นดิจิทัล)
  check('⭐ บอกว่าการกดยืนยันไม่ใช่ลายเซ็นอิเลกทรอนิกส์',
    /ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์/.test(webQuote));
  check('มีช่องยินยอม PDPA ก่อนกดยืนยัน', /qt-pdpa/.test(webQuote));
  check('ไม่มีฟอร์มเข้าสู่ระบบในหน้านี้',
    !/type="password"|type=.password./.test(quoteHtml + webQuote));

  // ⚠️ ชนิดเหตุการณ์ต้องขึ้นทะเบียนทั้งสองฝั่ง (บทเรียน messenger_click)
  check('quote_view ขึ้นทะเบียนทั้งสองฝั่ง',
    /'quote_view'/.test(analytics) && /'quote_view'/.test(srv));
}

console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
