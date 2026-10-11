// ประกาศเด่น (Featured Listing) รอบ 2 ฝั่งเว็บ · เพิ่ม 2026-10-04
// รันด้วย:  node featured.test.js  [path ไปยัง nj-survey-system]
//
// ล็อกสี่เรื่อง:
// 1. ลำดับหมุนวันละครั้ง ไม่สุ่ม — ทุกใบได้ขึ้นอันดับแรกเท่ากัน และเปิดซ้ำในวันเดียวกันได้ลำดับเดิม
// 2. ป้ายบนการ์ดอ่านเฉพาะ featured === true และมีข้อความว่าไม่ใช่การรับรองแปลง
// 3. หน้ารวมประกาศให้ประกาศเด่นขึ้นก่อนเฉพาะการเรียงตั้งต้น — ผู้ใช้เลือกเรียงตามราคาเอง = ไม่แทรก
// 4. ระบบหลังบ้านส่งออกแค่ boolean (ไม่มีวันที่ ราคา แหล่งที่มา) — ตรวจเมื่อเจอ repo ระบบ
const fs = require('fs');
const path = require('path');
const WEB = __dirname;
const read = f => fs.readFileSync(path.join(WEB, f), 'utf8');

global.window = {};
new Function(read('landvocab.js'))();
const LM = require(path.join(WEB, 'landmeta.js'));
global.window.NJLandMeta = LM;
new Function(read('listingcard.js'))();
const NJL = global.window.NJListing;

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 220) : '')); }
}
const DAY = 86400000;
const T0 = Date.parse('2026-10-04T05:00:00+07:00');
const L = (id, featured) => ({ id, featured });
const ids = a => a.map(x => x.id).join(',');

console.log('\n1) ลำดับประกาศเด่น — หมุนวันละครั้ง');
const list = [L('OP-5'), L('OP-3', true), L('OP-9'), L('OP-1', true), L('OP-7', true), L('OP-2')];
const a = LM.featuredFirst(list, T0);
ok('ประกาศเด่น 3 ใบขึ้นก่อน', a.slice(0, 3).every(x => x.featured === true), ids(a));
ok('⭐ ที่เหลือคงลำดับเดิมที่ส่งเข้ามา', ids(a.slice(3)) === 'OP-5,OP-9,OP-2', ids(a));
ok('ไม่แก้อาร์เรย์ที่ส่งเข้ามา', ids(list) === 'OP-5,OP-3,OP-9,OP-1,OP-7,OP-2');
ok('⭐ วันเดียวกันได้ลำดับเดิม (ไม่สุ่มทุกครั้งที่เปิด)', ids(LM.featuredFirst(list, T0 + 3600000)) === ids(a));
const firsts = [0, 1, 2].map(d => LM.featuredFirst(list, T0 + d * DAY)[0].id).sort().join(',');
ok('⭐ 3 วันติดกัน ทุกใบได้ขึ้นอันดับแรกครบ', firsts === 'OP-1,OP-3,OP-7', firsts);
ok('วันที่ 4 วนกลับมาเหมือนวันแรก', ids(LM.featuredFirst(list, T0 + 3 * DAY)) === ids(a));
ok('เปลี่ยนวันตามเวลาไทย (00:00 น.) ไม่ใช่ UTC',
  LM.bkkDayIndex(Date.parse('2026-10-04T23:59:00+07:00')) === LM.bkkDayIndex(Date.parse('2026-10-04T00:00:00+07:00')) &&
  LM.bkkDayIndex(Date.parse('2026-10-05T00:00:00+07:00')) === LM.bkkDayIndex(Date.parse('2026-10-04T00:00:00+07:00')) + 1);
ok('ไม่มีประกาศเด่น = ลำดับเดิมทุกใบ', ids(LM.featuredFirst([L('A'), L('B')], T0)) === 'A,B');
ok('⭐ ค่าที่ไม่ใช่ true (เช่น "true", 1) ไม่นับเป็นประกาศเด่น', ids(LM.featuredFirst([L('A'), { id: 'B', featured: 'true' }, { id: 'C', featured: 1 }], T0)) === 'A,B,C');
ok('อาร์เรย์ว่าง/ไม่ใช่อาร์เรย์ ไม่พัง', LM.featuredFirst(null).length === 0 && LM.featuredFirst([]).length === 0);

console.log('\n2) ป้ายบนการ์ด');
const card = raw => NJL.card(NJL.normalize(Object.assign({ id: 'OP-1', type: 'sell', parcelInfo: 'แปลงทดสอบ', estValue: 1000000 }, raw), 0));
const hf = card({ featured: true });
ok('featured: true = มีป้าย ★ ประกาศเด่น', /class="badge badge-featured"[^>]*>★ ประกาศเด่น</.test(hf));
ok('⭐ ป้ายบอกว่าเป็นพื้นที่ชำระค่าบริการ ไม่ใช่การรับรองแปลง (title + aria-label)',
  /title="[^"]*ไม่ใช่การรับรองแปลง[^"]*"/.test(hf) && /aria-label="ประกาศเด่น — [^"]*ไม่ใช่การรับรองแปลง/.test(hf));
ok('ไม่ส่งช่องนี้มา (API รุ่นเก่า) = ไม่มีป้าย', card({}).indexOf('badge-featured') < 0);
ok('⭐ ค่าที่ไม่ใช่ true = ไม่มีป้าย (ห้ามเดา)', ['true', 1, 'yes', {}].every(v => card({ featured: v }).indexOf('badge-featured') < 0));
ok('ป้ายตรวจสอบเดิมยังอยู่คู่กัน', /badge-verified|badge-basic/.test(hf));
ok('normalize เก็บเป็น boolean', NJL.normalize({ featured: true }, 0).featured === true && NJL.normalize({ featured: 'x' }, 0).featured === false);

console.log('\n3) หน้ารวมประกาศ · CSS · ข้อความกำกับ');
const lsJs = read('listings.js');
ok('⭐ ขึ้นก่อนเฉพาะการเรียงตั้งต้น "อัปเดตล่าสุด"', /if \(\(f\.sort \|\| 'new'\) === 'new' && window\.NJLandMeta && NJLandMeta\.featuredFirst\) list = NJLandMeta\.featuredFirst\(list\);/.test(lsJs));
ok('จัดลำดับหลังกรอง (กรองจังหวัดแล้วประกาศเด่นยังขึ้นก่อนในจังหวัดนั้น)', lsJs.indexOf('list.sort(by[f.sort]') < lsJs.indexOf('NJLandMeta.featuredFirst(list)'));
const lsHtml = read('listings.html');
ok('มีช่องข้อความกำกับ (ซ่อนไว้จนมีประกาศเด่นในผลลัพธ์)', /<p class="ls-note ls-featured-note" id="featured-note" hidden><\/p>/.test(lsHtml));
ok('landmeta.js โหลดก่อน listings.js', lsHtml.indexOf('src="landmeta.js"') > 0 && lsHtml.indexOf('src="landmeta.js"') < lsHtml.indexOf('src="listings.js"'));
const css = read('listingcard.css');
// ป้าย "ให้เช่า" (.badge-rent) ก็ต้องไม่ถูกซ่อนเหมือนกัน (ค่าเช่ารายเดือน 11 ต.ค. 69) — ต่อท้ายตัวเลือกได้
ok('⭐ ป้ายไม่ถูกซ่อนบนการ์ดแนวนอนของมือถือ', /:not\(\.badge-verified\):not\(\.badge-basic\):not\(\.badge-featured\)(:not\(\.badge-rent\))?\{display:none\}/.test(css));
ok('ป้ายไม่ใช้สีเขียวของ "ตรวจสอบโดย NJ"', /\.badge-featured\{[^}]*\}/.test(css) && !/\.badge-featured\{[^}]*#15803d/.test(css));
ok('⭐ ไม่มีคำรับประกันในข้อความกำกับ', !/(รับรองว่า|การันตี|ขายได้แน่นอน)/.test(LM.FEATURED_NOTE) && /ไม่ใช่การรับรองแปลง/.test(LM.FEATURED_NOTE));

console.log('\n4) สัญญากับระบบหลังบ้าน');
const SRV = process.argv[2] || path.join(WEB, '..', 'nj-survey-system');
if (!fs.existsSync(path.join(SRV, 'server.js')) || !fs.existsSync(path.join(SRV, 'lib', 'featured.js'))) {
  console.log('  ข้าม — ไม่พบระบบที่มี lib/featured.js ที่ ' + SRV + ' (ส่ง path มาเป็นอาร์กิวเมนต์ที่ 1 ได้)');
} else {
  const server = fs.readFileSync(path.join(SRV, 'server.js'), 'utf8');
  ok('⭐ ระบบส่งออก featured จาก publicFlag ใน publicListings', /featured: featuredLib\.publicFlag\(o, \{ on: featuredOn\(\), today: thaidate\.todayISO\(\) \}\)/.test(server));
  const F = require(path.join(SRV, 'lib', 'featured.js'));
  const v = F.publicFlag({ type: 'sell', featured: { from: '2026-10-01T00:00:00Z', until: '2026-11-01T00:00:00Z' }, land: { verify: { owner: { status: 'passed', at: '2026-10-01', until: '2027-10-01' } } } }, { on: true, today: '2026-10-04', now: Date.parse('2026-10-04T00:00:00Z') });
  ok('⭐ publicFlag คืน boolean ล้วน', v === true);
}

console.log('\nสรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
