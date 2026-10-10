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

console.log('\n3) ไม่มีเขตบังคับรังวัดแล้ว (ยกเลิก 25 ก.ย. 2569) + ประเภททรัพย์มาจากระบบหลังบ้านที่เดียว');
// เดิมมีรายชื่อ กทม.+ปริมณฑล ที่ล็อกตัวเลือกเหลือ "ต้องรังวัด" · เจ้าของกิจการสั่งยกเลิกแล้ว
// รายชื่อนี้กลับมาที่ฝั่งใดฝั่งหนึ่งเมื่อไหร่ = หน้าเว็บกับเซิร์ฟเวอร์ตัดสินคนละแบบอีก
check('เซิร์ฟเวอร์ไม่มีรายชื่อจังหวัดบังคับรังวัด', !/const SURVEY_REQUIRED_PROVINCES\s*=/.test(server));
check('หน้าเว็บไม่มีรายชื่อจังหวัดบังคับรังวัด', !/var SURVEY_REQUIRED_PROVINCES\s*=/.test(consign));
check('เซิร์ฟเวอร์มีเส้นทางสเปกประเภททรัพย์', /app\.get\('\/api\/public\/consign\/spec'/.test(server));
check('หน้าเว็บดึงประเภททรัพย์จากเส้นทางนั้น (ไม่พิมพ์รายการเอง)', /\/api\/public\/consign\/spec/.test(consign));
const modes = listAfter(server, 'CONSIGN_SURVEY_MODES');
check('รูปแบบการรังวัดมี formal/informal', same(modes || [], ['formal', 'informal']), (modes || []).join(','));
const html = read(path.join(WEB, 'consign.html'));
check('ฟอร์มมีตัวเลือกรูปแบบการรังวัดครบสองค่า',
      /name="surveyMode" value="formal"/.test(html) && /name="surveyMode" value="informal"/.test(html));
check('หัวข้อใหม่ "รังวัดยืนยันเขตและกรรมสิทธิ์ก่อนประกาศขาย"', html.indexOf('รังวัดยืนยันเขตและกรรมสิทธิ์ก่อนประกาศขาย') >= 0);

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


console.log('\n7) ระลอก Teedin Sure Verified — บันได 2 ระดับ · รายงานสุขภาพแปลง · คำศัพท์ชุดกลาง');
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

    // 2 ระดับ (ตัดจาก 5 · 1 ต.ค. 2569) ต้องตรงกันทั้งคีย์และ **ลำดับ** — ลำดับคือบันไดที่ผู้ซื้อเห็น สลับเมื่อไหร่ความหมายเปลี่ยนทันที
    const srvLevels = listAfter(lv, 'const VERIFY_LEVELS');
    const webLevels = (verified.match(/\{ k: '([a-z]+)'/g) || []).map(s => s.slice(6, -1));
    check('ระดับตรงกันทั้งคีย์และลำดับ', same(srvLevels || [], webLevels),
      JSON.stringify(srvLevels) + ' vs ' + JSON.stringify(webLevels));
    check('มี 2 ระดับ (owner → transfer)', same(srvLevels || [], ['owner', 'transfer']), JSON.stringify(srvLevels));

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

    // รีสอร์ท/โรงแรม (2026-10-10): ทุกประเภทในฟอร์มฝากขายของระบบหลังบ้านที่จับคู่กับประเภทแปลงได้ ต้องมีชื่อไทยฝั่งเว็บ
    // ไม่งั้นแปลงของประเภทนั้นไปอยู่ที่อยู่ /properties/ทรัพย์/… และการ์ดไม่มีป้ายประเภท โดยไม่มีอะไรเตือน
    var csSrc = read(path.join(SRV, 'lib', 'consignspec.js'));
    var csMapped = (csSrc.match(/landPropertyType:\s*'([a-z_]+)'/g) || []).map(function (s) { return s.replace(/.*'([a-z_]+)'/, '$1'); });
    check('ประเภทฝากขายที่ผูกกับประเภทแปลงทุกตัว มีชื่อไทยใน PROPERTY_TH (อ่านจาก consignspec.js)',
      csMapped.length >= 9 && csMapped.every(function (k) { return propWeb.indexOf(k) >= 0; }),
      JSON.stringify(csMapped.filter(function (k) { return propWeb.indexOf(k) < 0; })));
    check('มีรีสอร์ทและโรงแรมเป็นประเภทของตัวเองทั้งสองฝั่ง (ไม่จัดใน "อื่นๆ")',
      /resort:\s*'รีสอร์ท'/.test(vocab) && /hotel:\s*'โรงแรม'/.test(vocab) && csMapped.indexOf('resort') >= 0 && csMapped.indexOf('hotel') >= 0);

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
    ['chanote', 'nor3gor', 'nor3', 'condo_title', 'other'].forEach(function (k) {
      check('DEED_TH มี ' + k + ' ครบทั้ง 3 สำเนา',
        vocab.indexOf(k + ':') >= 0 && listings.indexOf(k + ':') >= 0 && cmp.indexOf(k + ':') >= 0);
    });

    // ประเภทคอนโด (2026-10-10): คีย์ที่ผูกกับระบบหลังบ้าน + ราคาต่อ ตร.ม. ต้องมาจากเซิร์ฟเวอร์เท่านั้น
    var srvPropSlice = server.slice(server.indexOf('LAND_PROPERTY_TYPES ='), server.indexOf('LAND_PROPERTY_TYPES =') + 200);
    var srvDeedSlice = server.slice(server.indexOf('LAND_DEEDS ='), server.indexOf('LAND_DEEDS =') + 200);
    check('PROPERTY_TH มีคอนโด และ DEED_TH มีห้องชุด (อ.ช.2) ตรงกับระบบหลังบ้าน',
      /condo:\s*'คอนโด'/.test(vocab) && /condo_title:\s*'ห้องชุด \(อ\.ช\.2\)'/.test(vocab) &&
      srvPropSlice.indexOf("'condo'") >= 0 && srvDeedSlice.indexOf("'condo_title'") >= 0);
    var landJs = read(path.join(WEB, 'land.js')), cardJs = read(path.join(WEB, 'listingcard.js'));
    check('ราคาต่อ ตร.ม. ของห้องชุดคิดที่เซิร์ฟเวอร์ (pricePerSqm) — หน้าเว็บไม่หารเอง',
      /pricePerSqm,/.test(server) && !/estValue\s*\/\s*(?:sqm|roomSqm|area)/i.test(landJs + cardJs));
    check('ราคาต่อ ตร.ม. ที่ไม่มีข้อมูลต้องซ่อน (เงื่อนไข > 0) ทั้งการ์ดและหน้าแปลง',
      /pricePerSqm\s*>\s*0/.test(cardJs) && /Number\(l\.pricePerSqm\)\|\|0/.test(landJs));
    check('ห้องชุดไม่อยู่ในลำดับ "น.ส.3ก ขึ้นไป" ของตัวกรองโฉนด (ห้องชุดไม่ใช่ที่ดิน)',
      !/f\.deed === 'nor3gor'[^;]*condo_title/.test(listings) && !/nor3gor'[^;]*condo_title/.test(read(path.join(WEB, 'njchat.js'))));

    // ชุดตรวจเฉพาะห้องชุด (รอบคอนโด 2): หัวข้อ/ข้อความสถานะ/คำปฏิเสธมาจาก API เท่านั้น — เว็บไม่พิมพ์รายการซ้ำ
    var ccLib = read(path.join(SRV, 'lib', 'condochecks.js'));
    var ccKeys = (ccLib.match(/\{ k: '([a-z_]+)',\s+th:/g) || []).map(function (m) { return m.match(/'([a-z_]+)'/)[1]; });
    check('ชุดตรวจห้องชุดฝั่งระบบมี 5 หัวข้อ และเว็บไม่ฝังคีย์/ชื่อหัวข้อ/คำปฏิเสธซ้ำ',
      ccKeys.length === 5 && ccKeys.every(function (k) { return landJs.indexOf(k) < 0; }) &&
      !/ปลอดหนี้ค่าส่วนกลาง|โควตาต่างชาติ|ไม่ใช่การรับรองกรรมสิทธิ์/.test(landJs));
    check('หน้าแปลงอ่านชุดตรวจห้องชุดจาก l.condoChecks (ระดับบนสุดของประกาศ) และไม่วาดเมื่อไม่มีข้อมูล',
      /l\.condoChecks/.test(landJs) && /if\(!cc\|\|!cc\.items\|\|!cc\.items\.length\) return ''/.test(landJs) &&
      /condoChecks:\s*isCondoOpp\(o\)/.test(server));
    check('ชุดตรวจห้องชุดไม่ใช้ป้ายระดับ 1/2 (.t1/.t2) และไม่อ้างว่า "ตรวจโดย NJ" — ใช้ .tc แยกต่างหาก',
      /ld-tier tc/.test(landJs) && !/ตรวจโดย NJ/.test(landJs.slice(landJs.indexOf('function condoChecksHtml'), landJs.indexOf('function mapHtml'))));
    check('ข้อความที่ส่งออกสาธารณะของชุดตรวจห้องชุดไม่มีชื่อผู้ตรวจ (by ภายในไม่ออก)',
      /by:\s*PUBLIC_BY/.test(ccLib) && !/\bby:\s*x\.by/.test(ccLib.slice(ccLib.indexOf('function publicChecks'))));

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
    check('เซิร์ฟเวอร์ยังประกาศ NJ_SERVICES ครบ 10 บริการ (รวมตรวจห้องชุด 2 ตัว)', njSvcKeys.length === 10, njSvcKeys.join(','));
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
  check('⭐ ลิงก์ยกเลิกรับข่าวสารของเซิร์ฟเวอร์ชี้มาที่ unsubscribe.html ที่มีอยู่จริง',
        /unsubscribe\.html\?id=/.test(server) && fs.existsSync(path.join(WEB, 'unsubscribe.html')));
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

console.log('\nPhase 6 — สมัครพันธมิตร (partner-apply.html)');
{
  const lib = path.join(SRV, 'lib', 'partners.js');
  if (!fs.existsSync(lib)) {
    console.log('  ข้าม — ยังไม่มี lib/partners.js ที่ฝั่งเซิร์ฟเวอร์ (สาขา phase6 ยังไม่ถูก merge · ส่ง path ของ worktree มาเป็นอาร์กิวเมนต์ได้)');
  } else {
    const srvLib = read(lib);
    const at = srvLib.indexOf('DEFAULT_SERVICE_TYPES');
    const srvTypes = (srvLib.slice(at, srvLib.indexOf('];', at)).match(/key: '([a-z_]+)'/g) || []).map(s => s.slice(6, -1));
    const paJs = read(path.join(WEB, 'partner-apply.js'));
    const paHtml = read(path.join(WEB, 'partner-apply.html'));
    const webTypes = (paJs.match(/\{ k: '([a-z_]+)'/g) || []).map(s => (s.match(/'([a-z_]+)'/) || [])[1]);
    check('อ่านประเภทบริการพันธมิตรได้ทั้งสองฝั่ง', srvTypes.length === 11 && webTypes.length === 11, srvTypes.length + ' / ' + webTypes.length);
    // ⚠️ คีย์ที่เซิร์ฟเวอร์ไม่รู้จัก = ใบสมัครถูกปฏิเสธทั้งใบ
    check('⭐ คีย์ประเภทบริการพันธมิตรตรงกันทั้งชุดและลำดับ', same(srvTypes, webTypes), srvTypes.join(',') + '  vs  ' + webTypes.join(','));
    const srvDocKinds = listAfter(server, 'const PARTNER_DOC_KINDS') || [];
    const webDocKinds = (paJs.match(/\['([a-z_]+)', '/g) || []).map(s => s.slice(2, s.indexOf("'", 2)));
    check('ชนิดเอกสารที่ผู้สมัครแนบได้อยู่ในรายการของเซิร์ฟเวอร์',
      webDocKinds.length > 0 && webDocKinds.every(k => srvDocKinds.indexOf(k) >= 0), webDocKinds.join(','));
    check('เซิร์ฟเวอร์มีเส้นทางใบสมัครครบทั้งสามเส้นที่หน้าเว็บเรียก',
      /app\.post\('\/api\/public\/partner-apply'/.test(server) && /app\.get\('\/api\/public\/partner-apply\/:id'/.test(server) && /'\/api\/public\/partner-apply\/:id\/docs'/.test(server));
    check('⭐ ไม่มีช่องรหัสผ่านในหน้าสมัครพันธมิตร', !/type="password"|type=.password./.test(paHtml + paJs));
    check('⭐ กันการส่งเมื่อยังไม่ติ๊กยินยอม', /pa-pdpa/.test(paJs) && /pdpa: !!form\.elements\.pdpa\.checked/.test(paJs));
    check('กับดักบอทใช้ช่อง hp ตรงกับเซิร์ฟเวอร์', /name="hp"/.test(paJs) && /b\.hp/.test(server));
    check('หน้าไม่ส่งตั๋วไปกับ referrer', /strict-origin-when-cross-origin/.test(paHtml));
    check('robots.txt กันลิงก์ที่มีตั๋ว', /Disallow: \/partner-apply\.html\?\*t=/.test(read(path.join(WEB, 'robots.txt'))));
    check('หน้าสมัครพันธมิตรอยู่ในแผนผังเว็บ', /partner-apply\.html/.test(read(path.join(WEB, 'sitemap.xml'))));
    check('⭐ ไม่รับปากว่าจะได้งาน', /ไม่ใช่การรับประกันว่าจะได้รับงาน/.test(paJs) && /ไม่ใช่การรับประกันว่าจะได้รับงาน/.test(paHtml));
  }
}

// ---------------------------------------------------------------------------
// 12) ทุกเส้นทางฟอร์มสาธารณะต้องเก็บ "ที่มาของลีด"
//
// ⚠️ เขียนขึ้นเพราะพลาดมาแล้วจริง — Sprint 4 ต่อ `attrib` ให้ 5 เส้นทาง แล้ว **เขียนในบันทึก
//    ว่าครอบคลุมฟอร์มตรวจทรัพย์ด้วย ทั้งที่ช่องนั้นเป็นของฟอร์มฝากหาที่ดิน**
//    ฟอร์มตรวจทรัพย์ (ปลายทางของโฆษณาสายทรัพย์บังคับคดี/ธนาคาร) จึงไม่เก็บที่มาเลย
//    และไม่มีอะไรเตือน — จับได้ตอนยิงฟอร์มจริงเข้าเซิร์ฟเวอร์ทดสอบใน Sprint 6
console.log('\n12) ทุกเส้นทางฟอร์มสาธารณะเก็บที่มาของลีด');
{
  const uses = (server.match(/publicAttrib\(b\.attrib\)/g) || []).length;
  check('⭐ มีตัวคัดกรองที่มาของลีด (publicAttrib)', /function publicAttrib/.test(server));
  check('⭐ ตัดทุกอย่างตั้งแต่เครื่องหมายคำถาม (ตั๋วของลูกค้าอยู่ใน query)',
        /function attribCut[\s\S]{0,240}split\('\?'\)/.test(server));
  check('⭐ เส้นทางที่รับ b.attrib ครบ 6 จุด (ฝากขาย · ตรวจทรัพย์ · ฝากหา · สนใจบริการ · นัดตรวจ · ห้องข้อมูล)',
        uses >= 6, 'พบ ' + uses + ' จุด');
  [["db.table('opportunities').unshift(opp);", 'ฝากขาย + ตรวจทรัพย์'],
   ["db.table('buyerRequests').unshift(br);", 'ฝากหาที่ดิน'],
   ["db.table('inquiries').unshift(inq);", 'สนใจบริการ']].forEach(function (p) {
    check(p[1] + ': มีบล็อกสร้างใบอยู่จริง', server.indexOf(p[0]) > 0);
  });
  check('แยกสัมผัสแรกกับสัมผัสสุดท้ายในบรรทัดที่ทีมขายอ่าน',
        /ช่องทางล่าสุด/.test(server) && /ช่องทางแรกที่รู้จักเรา/.test(server));
  check('⛔ ที่มาของลีดไม่ถูกนับเป็นช่องทางติดต่อ (ห้ามบวกเข้า leads)',
        !/leads\s*\+=\s*[^;]*attrib/.test(server));
}

console.log('\nแพ็กเกจบริการ (รอบ 4) — packages.html · package-order.html');
{
  const pkgLib = path.join(SRV, 'lib', 'packages', 'pricing.js');
  if (!fs.existsSync(pkgLib)) {
    console.log('  ข้าม — ยังไม่มี lib/packages/pricing.js ที่ฝั่งเซิร์ฟเวอร์ (สาขาแพ็กเกจยังไม่ถูก merge · ส่ง path ของ worktree มาเป็นอาร์กิวเมนต์ได้)');
  } else {
    const pricing = read(pkgLib);
    const pkgHtml = read(path.join(WEB, 'packages.html'));
    const pkgJs = read(path.join(WEB, 'packages.js'));
    const orderHtml = read(path.join(WEB, 'package-order.html'));
    const orderJs = read(path.join(WEB, 'package-order.js'));
    const consignHtml = read(path.join(WEB, 'consign.html'));
    const indexHtml = read(path.join(WEB, 'index.html'));
    const njchat = read(path.join(WEB, 'njchat.js'));

    // ---------- ชนิดเหตุการณ์สถิติของหน้าแพ็กเกจ ----------
    ['packages_view', 'package_view', 'package_compare', 'package_reco_start', 'package_reco_done', 'package_lead']
      .forEach(function (e) {
        check('เหตุการณ์ ' + e + ' มีทั้งสองฝั่ง',
          (srvEvents || []).indexOf(e) >= 0 && (webEvents || []).indexOf(e) >= 0);
      });
    // ⚠️ ข้อกำหนดเรียกการกดไลน์/โทรว่า contact_line/call_staff — แต่เว็บใช้ชนิดเดิม ไม่งั้นนับคนเดิมสองครั้ง
    check('⭐ ไม่มีชนิดใหม่ซ้ำกับ line_click/tel_click',
      (webEvents || []).indexOf('contact_line') < 0 && (webEvents || []).indexOf('call_staff') < 0);
    check('หน้าแพ็กเกจยิงเหตุการณ์ผ่าน njTrackInternal ตัวกลาง', /njTrackInternal/.test(pkgJs));
    // ระบบหลังบ้านซ่อนแท็บ "เจ้าของทรัพย์" / "นักลงทุนฯ" ได้ด้วยสวิตช์ (7 ต.ค. 69) — หน้าเว็บวาดแท็บตาม config.groups เท่านั้น
    check('⭐ เหลือกลุ่มเดียวไม่วาดแถบแท็บ', pkgJs.indexOf('groups.length > 1 ?') >= 0);
    check('⭐ หน้าแพ็กเกจไม่ซ่อนกลุ่มเอง (ไม่มีคีย์กลุ่ม owner/investor ฝังไว้)', pkgJs.indexOf("'owner'") < 0 && pkgJs.indexOf("'investor'") < 0);

    // ---------- ราคาและรายการต้องมาจากเซิร์ฟเวอร์เท่านั้น (ข้อกำหนดข้อ 4) ----------
    check('⭐⭐ หน้าแพ็กเกจเรียกแคตตาล็อกจาก /api/public/packages', /\/api\/public\/packages/.test(pkgJs));
    check('⭐⭐ เครื่องคำนวณราคาเรียก /api/public/package-quote (ไม่คิดราคาเอง)', /\/api\/public\/package-quote/.test(pkgJs));
    check('แบบสอบถามเรียก /api/public/package-recommend', /\/api\/public\/package-recommend/.test(pkgJs));
    check('ฟอร์มส่งข้อมูลเรียก /api/public/package-lead', /\/api\/public\/package-lead/.test(pkgJs));
    check('เซิร์ฟเวอร์มีเส้นทางสาธารณะครบทั้งสี่เส้น',
      /app\.get\('\/api\/public\/packages'/.test(server) && /app\.post\('\/api\/public\/package-quote'/.test(server) &&
      /app\.post\('\/api\/public\/package-recommend'/.test(server) && /app\.post\('\/api\/public\/package-lead'/.test(server));
    // ตัวเลขราคาห้ามอยู่ในไฟล์ของหน้าเว็บ (ยกเว้นเบอร์โทรและเลขที่ใบอนุญาต)
    // ตัดสิ่งที่เป็นตัวเลขแต่ไม่ใช่ราคา (เบอร์โทร · ความยาวช่องกรอก · ไอดีไลน์) ออกก่อน
    const moneyInPkg = (pkgJs.replace(/02-162-0405|021620405|716lffzt/g, '')
      .replace(/maxlength=.\d+.|rows=.\d+./g, '').match(/\b\d{4,}\b/g) || []);
    check('⭐⭐ packages.js ไม่มีตัวเลขราคาฝังไว้เอง', moneyInPkg.length === 0, moneyInPkg.join(','));
    check('⭐ packages.js ไม่มีรายการคำถามของแบบสอบถามฝังไว้เอง',
      !/propertyType/.test(pkgJs) && !/lastSurvey/.test(pkgJs) && /data\.questions|S\.data\.questions/.test(pkgJs));
    check('⭐ หน้าแพ็กเกจไม่มีชื่อแพ็กเกจฝังใน HTML', !/Sale Readiness|Verified Property|sale_readiness/.test(pkgHtml));
    check('โหลดราคาไม่ได้ = ให้ทักไลน์/โทร ไม่ใช่โชว์ตัวเลขสำรอง', /ทักไลน์|02-162-0405/.test(pkgJs));

    // ---------- นโยบายลงประกาศฟรี (เจ้าของกิจการสั่ง 10 ต.ค. 2569) ----------
    // ⚠️ กติกาเดิมของบล็อกนี้คือ "ข้อความค่านายหน้าขั้นบันไดบนเว็บต้องตรงกับ pricing_rules" — ยกเลิกแล้ว
    //    ใหม่: เว็บสาธารณะต้องไม่ประกาศอัตราค่านายหน้า/ค่าบริการหลังการขายเลย (ตัวเลขหลังบ้านยังอยู่ครบ ใช้กับสัญญาเดิม/ข้อเสนอรายใบ)
    //    ถ้อยคำกลางต้องตรงกันทุกหน้า ห้ามมีตัวเลขราคาค่าตรวจ ห้ามมีคำรับประกัน
    const rates = (pricing.match(/ratePct: ([0-9.]+)/g) || []).map(function (s) { return s.replace('ratePct: ', ''); });
    check('ระบบหลังบ้านยังเก็บขั้นค่านายหน้าไว้ครบ (ไม่ลบข้อมูล/การคำนวณเดิม)', rates.length >= 3 && rates.indexOf('3') >= 0 && rates.indexOf('2.5') >= 0 && rates.indexOf('2') >= 0, rates.join(','));
    function visibleText(src) {
      return src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    }
    const FEE_WORDS = /ค่านายหน้า|ค่าคอม|คอมมิชชั่น|ขั้นตามราคาที่ขายได้|50,000 บาท|ไม่บวก VAT เพิ่ม/;
    const pubSources = {
      'consign.html': consignHtml, 'index.html': indexHtml, 'services.html': read(path.join(WEB, 'services.html')),
      'njchat.js': njchat, 'packages.html': pkgHtml, 'packages.js': pkgJs, 'consign.js': read(path.join(WEB, 'consign.js')),
      'terms.html': read(path.join(WEB, 'terms.html'))
    };
    Object.keys(pubSources).forEach(function (f) {
      const v = visibleText(pubSources[f]);
      check('⭐⭐ ' + f + ' ไม่มีข้อความค่านายหน้า/อัตรา/ขั้นต่ำ 50,000 บนหน้าเว็บสาธารณะ', !FEE_WORDS.test(v), (v.match(FEE_WORDS) || [])[0]);
      check('⭐⭐ ' + f + ' ไม่มีอัตราร้อยละคู่กับคำว่านายหน้า', !/นายหน้า[^<\n]{0,40}\d+(\.\d+)?\s*%|\d+(\.\d+)?\s*%[^<\n]{0,40}นายหน้า/.test(v));
    });
    check('⭐⭐ ไม่เหลือ id บล็อกค่านายหน้าและฟังก์ชันวาดค่านายหน้าในหน้าแพ็กเกจ', !/pk-commission/.test(pkgHtml + pkgJs) && !/drawCommission/.test(pkgJs));
    // ถ้อยคำกลางเดียวกันทั้งเว็บ
    const CENTRAL = 'ทีมงานเสนอราคาค่าตรวจสอบ/รังวัดให้ก่อนขึ้นประกาศ ผู้ฝากเลือกได้ว่าจะตรวจสอบหรือไม่';
    ['consign.html', 'index.html', 'services.html', 'njchat.js'].forEach(function (f) {
      check('⭐ ' + f + ' ใช้ถ้อยคำกลางของนโยบายลงประกาศฟรี', visibleText(pubSources[f]).indexOf(CENTRAL) >= 0 && /ลงประกาศฟรี/.test(visibleText(pubSources[f])));
    });
    check('⭐ meta description + FAQ JSON-LD ของหน้าฝากขายใช้ถ้อยคำกลาง (ไม่มีอัตรา)',
      (consignHtml.match(/ลงประกาศฟรี ทีมงานเสนอราคาค่าตรวจสอบ\/รังวัดให้ก่อนขึ้นประกาศ ผู้ฝากเลือกได้ว่าจะตรวจสอบหรือไม่/g) || []).length >= 2 &&
      !/\d%/.test((consignHtml.match(/<meta name="description"[^>]*>/) || [''])[0]) && !/\d%/.test((consignHtml.match(/"@type": "Question"[\s\S]*?"text": "[^"]*"/g) || []).join(' ')));
    check('⭐ ไม่มีตัวเลขราคาค่าตรวจ/รังวัดในถ้อยคำกลาง (ติดต่อเพื่อขอใบเสนอราคา)', !/ค่าตรวจ[^<\n]{0,20}\d[\d,]{3,}\s*บาท/.test(visibleText(consignHtml + indexHtml)));
    check('⭐ เมนู/หัวเว็บไม่มีรายการเมนูใหม่เกี่ยวกับค่าบริการ', !/<a[^>]*>[^<]*ค่านายหน้า[^<]*<\/a>/.test(indexHtml));

    // ---------- ห้ามใช้ถ้อยคำรับประกัน (ข้อกำหนดข้อ 9) ----------
    const banned = ['รับประกันกรรมสิทธิ์', 'การันตี', 'ขายได้แน่นอน', 'ขายออกแน่นอน', 'รับประกันราคาขาย', 'รับประกันผลการขาย'];
    banned.forEach(function (wtxt) {
      check('⭐⭐ ไม่มีคำว่า "' + wtxt + '" ในหน้าแพ็กเกจ (นอกข้อความปฏิเสธ)',
        [pkgHtml, pkgJs, orderHtml, orderJs].every(function (src) {
          // ประโยคที่ขึ้นต้นด้วย "ไม่ใช่การรับประกัน…" คือคำปฏิเสธ ไม่ใช่คำรับปาก
          return src.replace(/ไม่ใช่การรับประกัน[^<']*/g, '').indexOf(wtxt) < 0;
        }));
    });
    check('⭐ หน้าแพ็กเกจใช้คำว่า "ตามขอบเขตบริการ"', /ขอบเขตบริการ/.test(pkgHtml) || /ขอบเขตบริการ/.test(pkgJs));
    check('⭐ บอกตรงๆ ว่าไม่ใช่การรับประกันกรรมสิทธิ์ ราคาขาย หรือผลการขาย',
      /ไม่ใช่การรับประกันกรรมสิทธิ์ ราคาขาย หรือผลการขาย/.test(pkgJs));

    // ---------- หน้าติดตามใบสั่งงานของลูกค้า ----------
    check('เซิร์ฟเวอร์มีเส้นทางของลูกค้าครบ',
      /app\.get\('\/api\/public\/package-order\/:id'/.test(server) &&
      /'\/api\/public\/package-order\/:id\/status'/.test(server) &&
      /'\/api\/public\/package-order\/:id\/appointment'/.test(server) &&
      /'\/api\/public\/package-order\/:id\/files'/.test(server));
    check('⭐⭐ ปุ่มของลูกค้ามาจาก order.moves ของเซิร์ฟเวอร์', /o\.moves/.test(orderJs));
    check('⭐⭐ หน้าลูกค้าไม่ก๊อปตารางสถานะมาไว้เอง',
      !/CUSTOMER_MOVES/.test(orderJs) && !/'waiting_docs'\s*,\s*'under_review'/.test(orderJs));
    check('⭐ ชนิดเอกสารมาจากเซิร์ฟเวอร์ (docKindTh) ไม่ใช่รายการที่พิมพ์เอง',
      /docKindTh/.test(orderJs) && !/'id_card'/.test(orderJs) && !/'authorize'/.test(orderJs));
    check('หน้าลูกค้าไม่ส่งตั๋วไปกับ referrer', /strict-origin-when-cross-origin/.test(orderHtml));
    check('หน้าลูกค้าประกาศ noindex', /name="robots" content="noindex/.test(orderHtml));
    check('robots.txt กันหน้าติดตามใบสั่งงาน', /Disallow: \/package-order\.html/.test(read(path.join(WEB, 'robots.txt'))));
    check('⭐ ไม่เก็บตั๋วลง localStorage', !/localStorage\s*\./.test(orderJs) && !/localStorage\s*\./.test(pkgJs));

    // ---------- รับชำระแพ็กเกจ (รอบ 2 หน้าเว็บ) ----------
    const hasAccept = /'\/api\/public\/package-order\/:id\/accept-quote'/.test(server);
    if (!hasAccept) {
      console.log('  ข้าม — เซิร์ฟเวอร์ยังไม่มีเส้นทางรับชำระแพ็กเกจ (deploy ระบบก่อนเว็บเสมอ)');
    } else {
      // ⛔ เจ้าของสั่งยกเลิก QR พร้อมเพย์ของใบสั่งงาน 28 ก.ย. 2569 — รับโอนเข้าเลขบัญชีบริษัทอย่างเดียว
      check('⭐⭐ เซิร์ฟเวอร์ไม่มีเส้นทาง QR ของใบสั่งงานแล้ว', !/package-order\/:id\/pay-qr/.test(server));
      check('⭐⭐ หน้าลูกค้าเรียกยืนยันผ่าน /accept-quote และไม่มี QR', /'\/accept-quote'/.test(orderJs) && !/pay-qr|po-qr|QR พร้อมเพย์ ยอด/.test(orderJs));
      check('⭐ หน้าลูกค้าแสดงเลขบัญชีบริษัทจาก bank.configured ของเซิร์ฟเวอร์ และชวนทักไลน์เมื่อยังไม่ตั้ง',
        /b\.configured/.test(orderJs) && /bankAcctNo/.test(orderJs) && /ทีมงานจะแจ้งเลขบัญชี/.test(orderJs));
      check('⭐⭐ ปุ่มยืนยันโผล่ตาม order.canAcceptQuote ของเซิร์ฟเวอร์', /o\.canAcceptQuote/.test(orderJs));
      check('⭐⭐ หน้าลูกค้าไม่สร้าง QR พร้อมเพย์เอง (ไม่มี payload/CRC ในหน้าเว็บ)', !/A000000677010111|6304|crc/i.test(orderJs));
      check('⭐ บอกลูกค้าว่าการกดยืนยันไม่ใช่ลายเซ็นอิเล็กทรอนิกส์', /ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์/.test(orderJs));
      check('⭐ ต้องติ๊กยินยอมก่อนยืนยัน และมีลิงก์นโยบายความเป็นส่วนตัว', /po-acc-pdpa/.test(orderJs) && /privacy\.html/.test(orderJs));
      check('⭐ สลิปส่งเป็นชนิด slip และบอกว่ารอฝ่ายบัญชีตรวจ (สลิปไม่ใช่เงิน)',
        /append\('kind', 'slip'\)/.test(orderJs) && /รอฝ่ายบัญชี/.test(orderJs));
      check('⭐ หน้าลูกค้าไม่บวกลบยอดเงินเอง', !/amount\s*[-+*]\s*|[-+*]\s*[a-z.]*amount\b/i.test(orderJs.replace(/\/\*[\s\S]*?\*\//g, '')));
    }

    // ---------- ทางเข้าหน้าแพ็กเกจ ----------
    check('หน้าแพ็กเกจอยู่ในแผนผังเว็บ', /packages\.html/.test(read(path.join(WEB, 'sitemap.xml'))));
    check('หน้าแรกมีทางเข้าหน้าแพ็กเกจ', /href="packages\.html"/.test(indexHtml));
    check('⭐ ไม่ติ๊กยินยอม PDPA = ส่งไม่ได้', /pk-l-pdpa/.test(pkgJs) && /disabled/.test(pkgJs) && /pdpa/.test(pkgJs));
    check('กับดักบอทใช้ช่อง hp ตรงกับเซิร์ฟเวอร์', /pk-l-hp/.test(pkgJs) && /hp:/.test(pkgJs) && /b\.hp/.test(server));
  }
}


console.log('\nลิงก์ภายในของบทความ (งานที่ 9) — build/knowledge.js ↔ public/kblinks.js');
(function () {
  const f = path.join(SRV, 'public', 'kblinks.js');
  if (!fs.existsSync(f)) {
    console.log('  ข้าม — ยังไม่มี public/kblinks.js ที่ฝั่งเซิร์ฟเวอร์ (ส่ง path ของ worktree มาเป็นอาร์กิวเมนต์ได้)');
    return;
  }
  const ok = (cond, name) => check(name, cond);
  const LK = require(f);
  const KN = require(path.join(WEB, 'build', 'knowledge.js'));
  const pick = (arr) => JSON.stringify(arr.map((s) => [s.key, s.th, s.path]));
  ok(pick(KN.SERVICES) === pick(LK.SERVICES), '⭐ รายการบริการ (คีย์ · ข้อความลิงก์ · หน้าปลายทาง) ตรงกันสองฝั่ง');
  ok(KN.SVC_MAX === LK.CAP.services && KN.LOC_MAX === LK.CAP.locations, 'เพดานลิงก์บริการ/หน้าพื้นที่ ตรงกับ CAP ของระบบ');
  const samples = ['locations/ชลบุรี/', 'locations/ชลบุรี/บางละมุง/', '/locations/ชลบุรี/', 'index.html', 'locations/a/b/c/', 'locations/../x/'];
  ok(samples.every((p) => KN.areaPathOk(p) === LK.areaPathOk(p)), '⭐ กติการูปแบบที่อยู่หน้าพื้นที่ตรงกันสองฝั่ง');
  const LOCJS = fs.readFileSync(path.join(WEB, 'build', 'locations.js'), 'utf8');
  ok(LOCJS.indexOf(String(LK.AREA_PATH_RE)) >= 0, 'AREA_PATH_RE ของระบบตรงกับตัวสร้างหน้าพื้นที่ (build/locations.js)');
})();

console.log('\nบัญชีเจ้าของทรัพย์ — ลิงก์ "เก็บใบนี้ไว้ในบัญชีของฉัน" (consign.js ↔ seller.html ของระบบ)');
(function () {
  const sellerHtml = path.join(SRV, 'public', 'seller.html');
  if (!fs.existsSync(sellerHtml)) {
    console.log('  ข้าม — ยังไม่มี public/seller.html ที่ฝั่งเซิร์ฟเวอร์ (ส่ง path ของ worktree มาเป็นอาร์กิวเมนต์ได้)');
    return;
  }
  const cjs = read(path.join(WEB, 'consign.js'));
  const chtml = read(path.join(WEB, 'consign.html'));
  const sjs = read(path.join(SRV, 'public', 'seller.js'));
  const srv = read(path.join(SRV, 'server.js'));
  check('⭐ ลิงก์ส่งตั๋วใน #fragment ไม่ใช่ ?query', /'\/seller\.html#claim='/.test(cjs) && !/seller\.html\?/.test(cjs));
  check('ชื่อพารามิเตอร์ claim / t ตรงกับที่ seller.js อ่าน', /claim/.test(sjs) && /[?&#]?t=|\bt\b/.test(sjs) && /'&t='/.test(cjs));
  check('⭐ ลิงก์แสดงเฉพาะเมื่อ spec บอก sellerAccounts === true', /sp\.sellerAccounts === true/.test(cjs) && /id="cs-claim"[^>]*hidden/.test(chtml));
  check('ระบบส่ง sellerAccounts ไปกับ /api/public/consign/spec', /sellerAccounts:\s*featureflags\.isOn\('seller_accounts'/.test(srv));
  check('⭐ หน้าฝากขายไม่มีช่องกรอกรหัสผ่าน (ฟอร์มรหัสอยู่บน app.njteedinsure.com เท่านั้น)', !/type="password"/.test(chtml));
})();

console.log('\nรูปแบบบริการ A/B/C รอบ 2 — ป้ายใครดูแลการขาย · ส่งถึงเจ้าของ · อายุประกาศ');
(function () {
  const sm = path.join(SRV, 'lib', 'servicemodel.js');
  if (!fs.existsSync(sm)) { console.log('  ข้าม — ยังไม่มี lib/servicemodel.js ที่ฝั่งเซิร์ฟเวอร์'); return; }
  const smSrc = read(sm);
  const srv = read(path.join(SRV, 'server.js'));
  const card = read(path.join(WEB, 'listingcard.js'));
  const land = read(path.join(WEB, 'land.js'));
  const cjs = read(path.join(WEB, 'consign.js'));
  // ค่าของ saleBy ที่ระบบส่งออก — เว็บต้องรู้จักครบ ('owner' · 'nj') ไม่งั้นป้ายหายเงียบ
  // อ่านจาก SERVICES ของระบบตรงๆ (lib ล้วน require ได้ ไม่เปิดเซิร์ฟเวอร์)
  const saleVals = require(sm).SERVICES.map(x => x.saleBy).filter(Boolean).filter((x, i, arr) => arr.indexOf(x) === i).sort();
  check('⭐ ระบบส่งออก saleBy ใน publicListings', /saleBy:\s*servicemodel\.saleByOf\(o\)/.test(srv));
  check('ค่าของ saleBy ที่ระบบใช้ = owner/nj และเว็บรู้จักครบ', saleVals.join() === 'nj,owner' &&/item\.saleBy === 'owner' \|\| item\.saleBy === 'nj'/.test(card));
  check('⭐ ฟอร์มส่งถึงเจ้าของส่ง shareWithOwner + pdpa และใช้ช่องติ๊ก (ไม่ใช่กดส่ง = ยินยอม)', /shareWithOwner:true, pdpa:true/.test(land) && /name="pdpa"/.test(land) && /form\.elements\.pdpa\.checked/.test(land));
  check('ระบบรับ shareWithOwner และต้องติ๊กยินยอม (need_share_consent)', /b\.shareWithOwner === true/.test(srv) && /need_share_consent/.test(srv));
  check('หน้าแปลงอ่านปลายทางจากคำตอบ (route) ไม่เดาเอง', /d\.route==='owner'/.test(land) && /route: inq\.route \|\| 'nj'/.test(srv));
  check('ฟอร์มส่งถึงเจ้าของมีกับดักบอท website', /name="website" class="njsv-hp"/.test(land));
  const waitKeys = Object.keys((smSrc.match(/const BLOCK_TH = \{([\s\S]*?)\};/) || ['', ''])[1].split('\n').reduce((a, l) => { const m = /^\s*(\w+):/.exec(l); if (m) a[m[1]] = 1; return a; }, {}));
  check('⭐ หน้าฝากขายมีข้อความรอของทุกด่านบริการ (รวม expired)', waitKeys.length >= 4 && waitKeys.every(k => new RegExp('\\b' + k + ':').test(cjs)), waitKeys.join(','));
})();

console.log('\nรูปแบบบริการ A/B/C รอบ 3ค — ป้ายตรวจโดยที่ดินชัวร์ (inspected)');
(function () {
  const srv = read(path.join(SRV, 'server.js'));
  const card = read(path.join(WEB, 'listingcard.js'));
  const land = read(path.join(WEB, 'land.js'));
  if (!/function inspectedOf\(o\)/.test(srv)) { console.log('  ข้าม — ฝั่งระบบยังไม่ส่ง inspected (deploy ระบบก่อนเว็บ)'); }
  else check('⭐ ระบบส่ง inspected เฉพาะประกาศที่มีรูปแบบบริการ', /inspected:\s*servicemodel\.saleByOf\(o\) \? inspectedOf\(o\) : null/.test(srv));
  // รันฟังก์ชันจริงของการ์ด (ไม่ grep) — ⚠️ ตั้ง window ชั่วคราวแล้วคืนค่าเดิม
  const had = 'window' in global, prevW = global.window;
  global.window = {};
  new Function(read(path.join(WEB, 'landvocab.js')))();
  new Function(card)();
  const NJL = global.window.NJListing;
  const T = NJL.inspectedText;
  check('⭐ ไม่มีผลตรวจจริง = ไม่มีป้าย (undefined · null · any:false)', T(undefined) === '' && T(null) === '' && T({ any: false, checksDone: 3 }) === '' && T({ any: 'true', checksDone: 3 }) === '');
  check('ตรวจแล้วกี่หัวข้อ บอกจำนวนตามจริง', T({ any: true, checksDone: 2, checksTotal: 7 }) === 'ตรวจแล้ว 2 จาก 7 หัวข้อ');
  check('ไม่มีผลตรวจ 7 หัวข้อ → ใช้บันไดตรวจสอบ → ลงพื้นที่', T({ any: true, checksDone: 0, verifyReached: 1, verifyTotal: 2 }) === 'ยืนยันแล้ว 1 จาก 2 ระดับ' && T({ any: true, site: true }) === 'ลงพื้นที่แล้ว');
  check('ตัวเลขผิดรูปไม่ทำให้เกิดข้อความแปลก', T({ any: true, checksDone: 'abc', verifyReached: -3 }) === '');
  const it = NJL.normalize({ id: 'OP-1', saleBy: 'owner', inspected: { any: true, checksDone: 3, checksTotal: 7 } }, 0);
  check('การ์ดขายเองชัวร์ที่ตรวจแล้วขึ้น "ตรวจโดยที่ดินชัวร์"', /ตรวจโดยที่ดินชัวร์ · ตรวจแล้ว 3 จาก 7 หัวข้อ/.test(NJL.card(it)));
  const it0 = NJL.normalize({ id: 'OP-2', saleBy: 'owner', inspected: { any: false } }, 0);
  check('การ์ดขายเองชัวร์ที่ยังไม่ตรวจ = ข้อความเดิม ไม่มีป้าย', !/ตรวจโดยที่ดินชัวร์/.test(NJL.card(it0)) && /ติดต่อเจ้าของในหน้าประกาศ/.test(NJL.card(it0)));
  const it1 = NJL.normalize({ id: 'OP-3', saleBy: '' }, 0);
  check('ประกาศเงื่อนไขเดิมไม่มีป้าย', it1.inspected === null && !/ตรวจโดยที่ดินชัวร์/.test(NJL.card(it1)));
  check('หน้าแปลงใช้ตัวตัดสินเดียวกับการ์ด (NJListing.inspectedText)', /NJListing\.inspectedText\(l\.inspected\)/.test(land) && land.indexOf("(l.saleBy?inspectedLine(l):'')") >= 0);
  if (had) global.window = prevW; else delete global.window;
  const insSrc = (card.match(/function inspectedText[\s\S]*?\n  \}/) || [''])[0] + (land.match(/function inspectedLine[\s\S]*?\n  \}/) || [''])[0];
  check('⭐ ป้ายไม่ใช้ถ้อยคำรับรอง/การันตี', insSrc.length > 100 && !/รับรอง|การันตี|รับประกัน/.test(insSrc));
})();

// ---------------------------------------------------------------------------
console.log('\nแหล่งความจริงเดียวต่อหัวข้อ — ตัวนับ "ตรวจแล้ว N จาก 7" ของระบบ = หัวข้อที่หน้าแปลงแสดงว่าตรวจแล้ว (10 ต.ค. 2569)');
// เจอจริงบน OP-102: แผงผลตรวจกับรายงานสุขภาพขัดกันเอง · หน้าแปลงแก้ด้วย NJHealth.topic()
// การ์ดอ่านจำนวนจาก inspectedOf() ของระบบ → ต้องนับด้วยกติกาเดียวกัน ไม่งั้นการ์ดกับหน้าแปลงบอกคนละเลข
(function () {
  const lvPath = path.join(SRV, 'lib', 'landverify.js');
  const LV = fs.existsSync(lvPath) ? require(lvPath) : null;
  if (!LV || typeof LV.checksDoneOf !== 'function') { console.log('  ข้าม — ฝั่งระบบยังไม่มี landverify.checksDoneOf (deploy ระบบก่อนเว็บ)'); return; }
  const vm = require('vm');
  const sb = { window: {}, document: { querySelector: () => null, querySelectorAll: () => [] } };
  sb.window.document = sb.document;
  vm.createContext(sb);
  ['landvocab.js', 'verified.js', 'health.js'].forEach(f => vm.runInContext(read(path.join(WEB, f)), sb, { filename: f }));
  const H = sb.window.NJHealth;
  const { FIX } = require(path.join(WEB, 'landconsist.fixtures.js'));
  const KEYS = ['area', 'markers', 'access', 'servitude', 'seizure', 'tax', 'mortgage'];
  Object.keys(FIX).forEach(id => {
    const L = FIX[id];
    const web = KEYS.filter(k => H.topic(L, k).state !== 'none').length;
    const srvN = LV.checksDoneOf(L);
    check('⭐ ' + id + ' นับตรงกัน (เว็บ ' + web + ' · ระบบ ' + srvN + ')', web === srvN);
  });
  const HL = { health: { markerFound: 0, markerTotal: 3, access: 'none' } };
  check('ช่องโครงสร้างของรายงานสุขภาพนับเหมือนกัน (หมุด/ทางเข้าออก)',
    KEYS.filter(k => H.topic(HL, k).state !== 'none').length === LV.checksDoneOf(HL));
  const samples = ['6-1-20', '0-2-50 ไร่', '250 ตร.ว.', '250ตร.ว', '33.9 ตารางวา', '2 ไร่', '1,600 ตร.ม.', '400 ตารางเมตร',
    '250', 'รังวัดก่อนซื้อ-ขาย', 'ผ่านการตรวจสอบเเล้ว', '6/6', '', 'ประมาณ 2 ไร่'];
  const diff = samples.filter(v => H.isAreaValue(v) !== LV.isAreaValue(v));
  check('⭐ รูปแบบ "เนื้อที่วัดจริงต้องเป็นตัวเลขเนื้อที่" ตรงกันทั้งสองฝั่ง', diff.length === 0, diff.join(' · '));
})();

console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
