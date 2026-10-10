/* หน้าแปลงห้ามขัดกันเอง — แผงผลตรวจ 7 หัวข้อ (land.js tier2Html) กับรายงานสุขภาพแปลง (health.js)
 *   รันด้วย:  node landconsist.test.js
 *
 * ที่มา (10 ต.ค. 2569): https://njteedinsure.com/land.html?id=OP-102 ขัดกันเองบนหน้าเดียว
 *   · หมุดหลักเขต — ผลตรวจ "ยังไม่ได้ตรวจหัวข้อนี้" แต่รายงานสุขภาพ "พบ 1 จาก 10 หมุด"
 *   · ทางเข้า-ออก — ผลตรวจ "เป็นที่สาธารณะ ✓" แต่รายงานสุขภาพ "ทางเข้าออกแบบอื่น · ต้องตรวจเพิ่ม"
 *   · เนื้อที่วัดจริง = "รังวัดก่อนซื้อ-ขาย" (ชื่อบริการ) ขึ้นใต้ราคาและในหลายแถวที่ "ยังไม่ได้ตรวจ"
 * แก้โดยให้ทั้งสองแผงอ่านผ่าน NJHealth.topic() ตัวเดียว (ดูคอมเมนต์ใน health.js)
 *
 * FIX = ก้อน land ของ 7 แปลงที่ขึ้นเว็บจริง ณ 10 ต.ค. 2569 (เฉพาะช่องที่เกี่ยวข้อง · จาก /api/public/listings/:id)
 * ⚠️ ไม่พึ่งไลบรารีภายนอก · DOM ไม่ต้องใช้ — ฟังก์ชันที่ทดสอบคืนสตริง HTML
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra != null ? ('  → ' + String(extra).slice(0, 200)) : '')); }
}
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

// ---- โหลด landvocab → verified → health (ลำดับเดียวกับ land.html) ----
const sb = { window: {}, document: { querySelector: () => null, querySelectorAll: () => [] } };
sb.window.document = sb.document;
vm.createContext(sb);
['landvocab.js', 'verified.js', 'health.js'].forEach(f => vm.runInContext(read(f), sb, { filename: f }));
const H = sb.window.NJHealth;
sb.NJHealth = H;   // ในเบราว์เซอร์ window คือ global เอง — ใน sandbox ต้องผูกชื่อให้ land.js เห็น

// ---- ดึงฟังก์ชันจริงจาก land.js (IIFE ที่เรียกจาก node ตรงๆ ไม่ได้) ----
const landSrc = read('land.js');
function fnSrc(name) {
  const i = landSrc.indexOf('  function ' + name + '(');
  if (i < 0) throw new Error('ไม่พบฟังก์ชัน ' + name + ' ใน land.js');
  let d = 0, j = landSrc.indexOf('{', i);
  for (; j < landSrc.length; j++) { if (landSrc[j] === '{') d++; else if (landSrc[j] === '}' && --d === 0) break; }
  return landSrc.slice(i, j + 1);
}
const checksDecl = landSrc.slice(landSrc.indexOf('  var CHECKS=['), landSrc.indexOf('];', landSrc.indexOf('  var CHECKS=[')) + 2);
vm.runInContext([checksDecl, fnSrc('esc'), fnSrc('thaiDate'), fnSrc('areaTh'), fnSrc('measuredArea'), fnSrc('tier2Html'),
  'this.tier2Html=tier2Html; this.measuredArea=measuredArea; this.CHECKS=CHECKS;'].join('\n'), sb);

const { FIX, C, h } = require('./landconsist.fixtures.js');

// ---- อ่านแถวจาก HTML ของสองแผง ----
// แผงผลตรวจ: ld-ico ok|warn|none + ชื่อ + ค่า · รายงานสุขภาพ: njh-row ok|warn|bad|none + ชื่อ + ค่า
function tierRows(html) {
  const out = {};
  html.split('<div class="ld-crow').slice(1).forEach(seg => {
    const st = (seg.match(/ld-ico (ok|warn|none)/) || [])[1];
    const label = (seg.match(/<b>([^<]*)<\/b>/) || [])[1];
    const val = (seg.match(/<span class="ld-val">([^<]*)<\/span>/) || [])[1] || '';
    out[label] = { st, val };
  });
  return out;
}
function healthRows(html) {
  const out = {};
  html.split('<div class="njh-row ').slice(1).forEach(seg => {
    const st = seg.slice(0, seg.indexOf('"'));
    const label = (seg.match(/<b>([^<]*)<\/b>/) || [])[1];
    const val = (seg.match(/<span class="njh-v">([^<]*)<\/span>/) || [])[1] || '';
    out[label] = { st, val };
  });
  return out;
}
const PAIR = [['เนื้อที่วัดจริงในสนาม', 'เนื้อที่จากผลรังวัดล่าสุด'], ['หมุดหลักเขต', 'หมุดหลักเขต'], ['ทางเข้า-ออก', 'ทางเข้า–ออก']];
const TIER_OF = { ok: 'ok', warn: 'warn', bad: 'warn', none: 'none' };   // แผงผลตรวจมีไอคอน 3 แบบ (แดง/เหลือง = "!")

console.log('\n1) ⭐ สองแผงไม่ขัดกันทั้ง 7 แปลงจริง (สถานะ + ค่า ของหัวข้อที่ซ้ำกัน)');
Object.keys(FIX).forEach(id => {
  const L = FIX[id];
  const tier = tierRows(sb.tier2Html(L));
  const hr = healthRows(H.tableHtml(L));
  PAIR.forEach(([tl, hl]) => {
    const a = tier[tl], b = hr[hl];
    ok(id + ' · ' + tl + ' สถานะตรงกัน', a && b && a.st === TIER_OF[b.st], JSON.stringify({ tier: a, health: b }));
    ok(id + ' · ' + tl + ' ค่าตรงกัน', a && b && a.val === b.val, JSON.stringify({ tier: a, health: b }));
  });
  const done = (sb.tier2Html(L).match(/ตรวจแล้ว <b>(\d+)<\/b>/) || [])[1];
  const nonNone = sb.CHECKS.filter(c => H.topic(L, c.k).state !== 'none').length;
  ok(id + ' · "ตรวจแล้ว N จาก 7" นับตรงกับแถวที่ไม่ใช่ขีด', Number(done) === nonNone, done + ' vs ' + nonNone);
});

console.log('\n2) ⭐ OP-102 — สามจุดที่เจ้าของเจอ');
{
  const L = FIX['OP-102'];
  const t2 = sb.tier2Html(L), tb = H.tableHtml(L);
  const tier = tierRows(t2), hr = healthRows(tb);
  ok('หมุดหลักเขต: แผงผลตรวจไม่ขึ้น "ยังไม่ได้ตรวจ" แล้ว · ขึ้นพบ 1 จาก 10 หมุดเหมือนรายงานสุขภาพ',
    tier['หมุดหลักเขต'].st === 'warn' && tier['หมุดหลักเขต'].val === 'พบ 1 จาก 10 หมุด' && hr['หมุดหลักเขต'].st === 'bad');
  ok('ทางเข้า-ออก: ไม่มีติ๊กถูก "เป็นที่สาธารณะ" คู่กับ "แบบอื่น" อีก', t2.indexOf('เป็นที่สาธารณะ') < 0 && tb.indexOf('เป็นที่สาธารณะ') < 0);
  ok('ทางเข้า-ออก: ทั้งสองแผงเป็น "ต้องตรวจเพิ่ม" (ระวังกว่า)', tier['ทางเข้า-ออก'].st === 'warn' && hr['ทางเข้า–ออก'].st === 'warn');
  ok('ชื่อบริการ "รังวัดก่อนซื้อ-ขาย" ไม่โผล่ในแผงผลตรวจ', t2.indexOf('รังวัดก่อนซื้อ-ขาย') < 0, t2);
  ok('ชื่อบริการ "รังวัดก่อนซื้อ-ขาย" ไม่โผล่ในรายงานสุขภาพ', tb.indexOf('รังวัดก่อนซื้อ-ขาย') < 0);
  ok('เนื้อที่วัดจริงไม่มีค่า (ใต้ราคา/ตารางขนาดจะไม่ขึ้น)', sb.measuredArea(L) === '' && H.measuredArea(L) === '');
  ok('แถวที่ยังไม่ตรวจขึ้น "ยังไม่ได้ตรวจหัวข้อนี้" ครบ 3 แถว (เนื้อที่ · อายัด · ภาษี)',
    (t2.match(/ยังไม่ได้ตรวจหัวข้อนี้/g) || []).length === 3);
  ok('สรุปบนแผง: ตรวจแล้ว 4 จาก 7', /ตรวจแล้ว <b>4<\/b> จาก 7/.test(t2));
}

console.log('\n3) เนื้อที่วัดจริงต้องเป็นตัวเลขเนื้อที่ (ห้ามเดาหน่วย)');
[['1-3-68', true], ['0-1-66 ไร่', true], ['6 - 1 - 20', true], ['33.9 ตารางวา', true], ['33.9 ตร.ว.', true],
 ['2 ไร่', true], ['120 ตร.ม.', true], ['166', false], ['6', false], ['รังวัดก่อนซื้อ-ขาย', false],
 ['ผ่านการตรวจสอบเเล้ว', false], ['', false], [null, false], ['1-2', false]].forEach(([v, want]) => {
  ok(JSON.stringify(v) + (want ? ' นับเป็นเนื้อที่' : ' ไม่นับเป็นเนื้อที่'), H.isAreaValue(v) === want);
});
ok('OP-025 "33.9 ตารางวา" ขึ้นเป็นเนื้อที่วัดจริง', H.measuredArea(FIX['OP-025']) === '33.9 ตารางวา');
ok('OP-023 "1-3-68" ขึ้นเป็นเนื้อที่วัดจริง', H.measuredArea(FIX['OP-023']) === '1-3-68');
ok('OP-024 สถานะว่าง + ชื่อบริการ = ไม่มีเนื้อที่วัดจริง', H.measuredArea(FIX['OP-024']) === '');
ok('ตรวจแล้วแต่ค่าไม่ใช่ตัวเลข = มีสถานะ ไม่มีค่า',
  (() => { const t = H.topic({ checks: { area: C('ok', 'ผ่านการตรวจสอบแล้ว') } }, 'area'); return t.state === 'ok' && t.value === ''; })());

console.log('\n4) สองแหล่งขัดกัน = ใช้สถานะที่ระวังกว่า ไม่เลือกข้างที่ดูดี');
{
  const blind = { checks: { access: C('ok', '', 'ติดถนนใหญ่') }, health: h({ access: 'none' }) };
  const t = H.topic(blind, 'access');
  ok('⭐ ที่ตาบอดยังแดงเสมอ แม้ผลตรวจเดิมติ๊กผ่าน', t.state === 'bad' && t.conflict);
  ok('หมายเหตุของแหล่งที่ขัด ("ติดถนนใหญ่") ไม่ถูกแสดง', H.tableHtml(blind).indexOf('ติดถนนใหญ่') < 0 && sb.tier2Html(blind).indexOf('ติดถนนใหญ่') < 0);
  const narrow = { checks: { access: C('warn', '', 'ทางแคบรถใหญ่เข้าไม่ได้') }, health: h({ access: 'public_road' }) };
  const n = H.topic(narrow, 'access');
  ok('ผลตรวจพบข้อควรรู้ชนะ "ติดถนนสาธารณะ" และหมายเหตุนั้นขึ้นทั้งสองแผง',
    n.state === 'warn' && H.tableHtml(narrow).indexOf('ทางแคบ') >= 0 && sb.tier2Html(narrow).indexOf('ทางแคบ') >= 0);
  const mk = { checks: { markers: C('ok', '4/4') }, health: h({ markerFound: 2, markerTotal: 4 }) };
  const m = H.topic(mk, 'markers');
  ok('หมุด: ผลตรวจเดิม "ผ่าน" ไม่ทับ "พบ 2 จาก 4" ของรายงานสุขภาพ', m.state === 'bad' && m.value === 'พบ 2 จาก 4 หมุด');
  const agree = { checks: { access: C('ok', '', 'ถนน อบต. กว้าง 6 ม.') }, health: h({ access: 'public_road' }) };
  ok('สองแหล่งตรงกัน = แสดงหมายเหตุของทีมได้', H.topic(agree, 'access').note === 'ถนน อบต. กว้าง 6 ม.' && !H.topic(agree, 'access').conflict);
}

console.log('\n5) ยังไม่ได้ตรวจ = ไม่มีผล ไม่มีค่า ไม่มีหมายเหตุ');
['area', 'markers', 'access', 'servitude', 'seizure', 'tax', 'mortgage'].forEach(k => {
  const L = { checks: { [k]: C('', 'อะไรก็ได้ที่ทีมพิมพ์', 'หมายเหตุลอยๆ') } };
  const t = H.topic(L, k);
  ok(k + ' สถานะว่าง → none + ไม่มีค่า/หมายเหตุ', t.state === 'none' && t.value === '' && t.note === '');
});

console.log('\n6) แปลงที่มีแค่ checks (ไม่มีรายงานสุขภาพ) หน้าตาแผงผลตรวจเหมือนเดิม');
{
  const old = { checks: { area: C('ok', '2-1-48'), markers: C('ok', '6/6'), access: C('ok', '62.28 ม.'), servitude: C('ok', 'ไม่มี'),
    seizure: C('ok', 'ไม่พบ'), tax: C('ok', 'ไม่ค้าง'), mortgage: C('ok', 'ไม่มี') } };
  const t2 = sb.tier2Html(old);
  const n = (t2.match(/<div><b>[^<]*<\/b><\/div>/g) || []).length;
  ok('ไม่มีหมายเหตุ = ไม่เติมข้อความอธิบายมาตรฐานให้ (7 แถวไม่มีบรรทัดรอง)', n === 7, t2);
  ok('ค่าที่ทีมกรอกยังขึ้นครบ', ['2-1-48', '6/6', '62.28 ม.', 'ไม่พบ', 'ไม่ค้าง'].every(v => t2.indexOf(v) >= 0));
  ok('ไม่มี health → ไม่มีตารางสุขภาพ (กติกาข้อแรกของ Phase 1)', H.tableHtml(old) === '');
}

console.log('\n7) ด่านซอร์ส — ห้ามกลับไปอ่านช่องซ้ำตรงๆ');
{
  const L2 = strip(landSrc);
  ok('land.js ไม่อ่าน .checks ตรงๆ (ทุกอย่างผ่าน NJHealth.topic / measuredArea)', !/\.checks\b/.test(L2));
  const hs = strip(read('health.js'));
  const rows = hs.slice(hs.indexOf('function rowsOf'), hs.indexOf('var STATE_TH'));
  ok('rowsOf ของ health.js ไม่อ่าน checks/markerTotal/access เอง', !/checks|markerTotal|H\.access/.test(rows));
}

console.log('\n' + (fail ? '❌' : '✅') + ' ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
