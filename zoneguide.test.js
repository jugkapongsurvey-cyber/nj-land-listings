// ทดสอบคู่มือผังสี (zoneguide.js) + ทางเข้าบน tools.html และในแชท
// รันด้วย:  node zoneguide.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const W = __dirname;
const read = f => fs.readFileSync(path.join(W, f), 'utf8');

global.window = {};
new Function(read('zoneguide.js'))();
const G = global.window.NJZoneGuide;
const V = {};
new Function('window', read('landvocab.js'))(V);

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

console.log('\n1) ข้อมูลในคู่มือ');
const keys = G.ZONES.map(z => z.key);
const vocabKeys = Object.keys(V.NJVocab.ZONE_TH);
ok('คีย์ตรงกับ NJVocab.ZONE_TH ทั้งชุดและลำดับ', JSON.stringify(keys) === JSON.stringify(vocabKeys), [keys, vocabKeys]);
ok('ทุกสีมีชื่อ สีตามกฎหมาย รหัสสี การใช้ และข้อจำกัด', G.ZONES.every(z => z.name && z.law && /^#[0-9A-F]{6}$/i.test(z.hex) && z.use && z.watch && z.codes));
ok('ชื่อประเภทตรงกับคำใน NJVocab (ส่วนหลัง " — ")',
   G.ZONES.filter(z => z.key !== 'blue' && z.key !== 'other').every(z => V.NJVocab.ZONE_TH[z.key].indexOf(z.name) >= 0),
   G.ZONES.map(z => [z.name, V.NJVocab.ZONE_TH[z.key]]));
ok('เขียวลายขาวมีลายทแยง ส่วนเขียวทึบไม่มี', G.ZONES.find(z => z.key === 'green_diag').hatch === true && !G.ZONES.find(z => z.key === 'green').hatch);
ok('ชื่อสีตามกฎกระทรวงของเขียวลายขาว', /เส้นทแยงสีเขียว/.test(G.ZONES.find(z => z.key === 'green_diag').law));

console.log('\n2) ห้ามรับปาก');
const text = G.ZONES.map(z => z.use + ' ' + z.watch + ' ' + z.name).join(' ') + ' ' + G.html();
['สร้างได้แน่นอน', 'ทำได้แน่นอน', 'รับประกัน', 'การันตี', 'ถูกต้องตามกฎหมายแน่นอน', 'ไม่มีข้อห้าม'].forEach(w => {
  ok('ไม่มีคำว่า "' + w + '"', text.indexOf(w) < 0);
});
ok('คำเตือนบอกว่าต่างกันตามผัง และต้องตรวจกับหน่วยงาน', /ต่างกันตามผัง/.test(G.DISCLAIM) && /ต้องตรวจกับ/.test(G.DISCLAIM));
const h = G.html();
ok('คำเตือนขึ้นในหน้าคู่มือ', h.indexOf(G.DISCLAIM.slice(0, 40)) >= 0);
ok('บอกว่าข้อมูลหน่วยงานใช้อ้างอิงทางกฎหมายไม่ได้', /ไม่ใช้อ้างอิงทางกฎหมาย/.test(h));

console.log('\n3) ลิงก์ตรวจผัง');
ok('ทุกลิงก์เป็น https ของหน่วยงานรัฐ (.go.th)', G.CHECK_LINKS.every(l => /^https:\/\/[^/]+\.go\.th\//.test(l.url)), G.CHECK_LINKS.map(l => l.url));
ok('มีลิงก์ระบบของกรมโยธาฯ', G.CHECK_LINKS.some(l => /landuseplan\.dpt\.go\.th/.test(l.url)));
ok('ร่างผัง กทม. ติดป้ายร่าง', G.CHECK_LINKS.filter(l => /bmaplanning/.test(l.url)).every(l => l.draft) && /ร่าง ยังไม่มีผลบังคับใช้/.test(h));
ok('ลิงก์ออกนอกเว็บมี noopener noreferrer', (h.match(/target="_blank"/g) || []).length === (h.match(/rel="noopener noreferrer"/g) || []).length);
ok('ปุ่มให้ทีมตรวจไปที่ฟอร์มตรวจทรัพย์', /href="verify\.html#form"/.test(h));

console.log('\n4) กติกาในไฟล์');
const src = read('zoneguide.js').replace(/\/\*[\s\S]*?\*\//g, '');
ok('ไม่ดึงข้อมูลจากภายนอก', !/fetch\(|XMLHttpRequest|longdo|dptgis|arcgis/i.test(src));
ok('mount คืน false เมื่อไม่มี element', G.mount(null) === false);

console.log('\n5) หน้าเว็บ');
const tools = read('tools.html');
const toolsJs = read('tools.js');
ok('tools.html มีส่วน #zoning + โหลดไฟล์ครบ', /id="zoning"/.test(tools) && /zoneguide\.js/.test(tools) && /zoneguide\.css/.test(tools));
ok('มีลิงก์กระโดดไป #zoning', /href="#zoning"/.test(tools));
ok('tools.js mount คู่มือ', /NJZoneGuide\.mount\(/.test(toolsJs));
ok('zoneguide.js โหลดก่อน tools.js', tools.indexOf('zoneguide.js') < tools.indexOf('tools.js"'));
const ag = read('agencies.js');
ok('หน้าทรัพย์หน่วยงานลิงก์ระบบตรวจผังของกรมฯ', /landuseplan\.dpt\.go\.th\/main/.test(ag));

console.log('\n6) แชท');
const w = { NJ_API_BASE: 'http://x', console, Promise, setTimeout, location: { pathname: '/tools.html', search: '' }, fetch: () => Promise.reject(new Error('no net')) };
w.window = w;
const ctx = vm.createContext(w);
['landvocab.js', 'listingcard.js', 'njchat.js'].forEach(f => vm.runInContext(read(f), ctx, { filename: f }));
const C = w.NJChat;
C._setListings([]);
(async () => {
  const a = await C.route('ผังสีเหลืองคืออะไร');
  ok('"ผังสีเหลืองคืออะไร" → คู่มือผังสี', a && /tools\.html#zoning/.test(a.html), a && a.html);
  ok('คำตอบไม่ฟันธงว่าสร้างอะไรได้', a && /ตอบแทนไม่ได้/.test(a.html));
  const b = await C.route('อยากเช็คผังเมืองของที่ดินตัวเอง');
  ok('"เช็คผังเมือง" → คู่มือผังสี', b && /tools\.html#zoning/.test(b.html), b && b.html);
  const c = await C.route('ที่ดินผังสีเขียวสร้างโรงงานได้ไหม');
  ok('"ผังเขียวสร้างโรงงานได้ไหม" → ไม่ฟันธง ส่งคู่มือ', c && /tools\.html#zoning/.test(c.html), c && c.html);
  const d = await C.route('หาที่ดินผังเหลืองในปทุมธานี');
  ok('โจทย์ค้นแปลงตามสี ยังเข้าโหมดค้นเหมือนเดิม', !d || !/tools\.html#zoning/.test(d.html), d && d.html);

  console.log('\n' + (fail ? '❌' : '✅') + ' zoneguide: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
