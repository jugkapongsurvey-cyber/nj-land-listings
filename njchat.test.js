// ทดสอบ "สมอง" ของน้องเอ็นเจชัวร์ (njchat.js) — ตัวอ่านโจทย์ · ตัวกรอง · ตัวจ่ายงาน
//   รันด้วย:  node njchat.test.js            (ไม่มี dependency · ไม่ยิงเน็ต · ตารางราคาอ่านจาก ../nj-survey-system ถ้ามี)
//
// สิ่งที่ล็อกไว้:
//   · "ยังไม่ได้ระบุ" ไม่นับว่าตรง แต่ต้องนับจำนวนที่ถูกซ่อน (กติกาเดียวกับ listings.js)
//   · โจทย์เรื่องบ้าน/จำนวนชั้น ต้องไม่ถูกแปลงเป็นตัวกรองที่ API ไม่มี (ต้องบอกตามจริง)
//   · คำถามทั่วไป ("น้ำท่วมไหม") ต้องไม่หลุดเข้าโหมดค้นแปลง → ไปให้ AI
//   · ราคาค่ารังวัดต้องมาจาก NJPricing เท่านั้น — ไม่มีตารางราคาต้องไม่มีตัวเลขในคำตอบ
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 240) : '')); }
}

// DOM ปลอมขั้นต่ำ — njchat.js ไม่แตะ DOM จนกว่า document จะมี (boot() เช็ค typeof document)
const w = { NJ_API_BASE: 'http://x', console, Promise, setTimeout, location: { pathname: '/listings.html', search: '' }, fetch: function () { return Promise.reject(new Error('no net')); } };
w.window = w;
const ctx = vm.createContext(w);
['landvocab.js', 'listingcard.js', 'njchat.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f }));
const C = w.NJChat;

const SRV = process.argv[2] || path.join(__dirname, '..', 'nj-survey-system');
let P = null;
try { P = require(path.join(SRV, 'public', 'pricing.js')); } catch (e) { console.log('  (ไม่พบ pricing.js ที่ ' + SRV + ' — ข้ามข้อที่ต้องใช้ตารางราคา)'); }

const L = [
  { id: 'A', type: 'sell', parcelInfo: 'ที่ดินพร้อมบ้านชั้นเดียว บางบ่อ', estValue: 2500000, totalWa: 850, pricePerWa: 2941, blurb: 'บ้านชั้นเดียว', photos: [], tier: 2, updatedAt: '2026-09-08', land: { province: 'สมุทรปราการ', amphoe: 'บางบ่อ', tambon: 'บางบ่อ', deedType: 'chanote', zoneColor: 'yellow', features: ['road', 'electric'] } },
  { id: 'B', type: 'sell', parcelInfo: 'ที่ดินเปล่า คลองหลวง', estValue: 4000000, totalWa: 400, pricePerWa: 10000, blurb: '', photos: [], tier: 1, updatedAt: '2026-09-07', land: { province: 'ปทุมธานี', amphoe: 'คลองหลวง', tambon: 'คลองสอง', deedType: '', zoneColor: '', features: [] } },
  { id: 'C', type: 'rent', parcelInfo: 'ที่ดินสวน บ้านค่าย', estValue: 0, totalWa: 2000, pricePerWa: 0, blurb: '', photos: [], tier: 1, updatedAt: '2026-09-06', land: { province: 'ระยอง', amphoe: 'บ้านค่าย', tambon: 'หนองละลอก', deedType: 'nor3gor', zoneColor: 'green', features: ['road'] } }
];
C._setListings(L);

console.log('\n1) ตัวอ่านตัวเลข');
check('5 ล้าน / 8 แสน / 500,000', JSON.stringify(C.parseMoney('งบ 5 ล้าน')) === '[5000000]' && JSON.stringify(C.parseMoney('8 แสน')) === '[800000]' && JSON.stringify(C.parseMoney('500,000 บาท')) === '[500000]');
check('ช่วง 2-5 ล้าน → สองค่า', JSON.stringify(C.parseMoney('ระหว่าง 2-5 ล้าน')) === '[2000000,5000000]');
check('เลขเล็ก (ไร่/ชั้น) ไม่ถูกอ่านเป็นราคา', C.parseMoney('2 ไร่ 1 ชั้น 80 ตารางวา').length === 0);
check('เนื้อที่ 2 ไร่ 1 งาน 50 วา = 950 ตร.ว.', C.parseAreaWa('2 ไร่ 1 งาน 50 ตารางวา') === 950 && C.parseAreaWa('2-1-50') === 950 && C.parseAreaWa('1.5 ไร่') === 600 && C.parseAreaWa('80 ตร.ว.') === 80);
check('ไม่มีเนื้อที่ = 0', C.parseAreaWa('หาที่ดินถูกๆ') === 0);

console.log('\n2) ตัวอ่านโจทย์ค้นแปลง');
let f = C.parseSearch('ต้องการบ้านที่มีสิ่งปลูกสร้าง 1 ชั้น ในกรุงเทพฯปริมณฑล ส่งมาให้ฉันดูเปรียบเทียบ มีกี่หลัง');
check('ปริมณฑล → 6 จังหวัดโซน A · บ้าน 1 ชั้น = ธง building (ไม่ใช่ตัวกรอง)', f.provinces.length === 6 && f.provinces.indexOf('กรุงเทพมหานคร') >= 0 && f.building === true && f.floors === 1 && f.deed === 'all', JSON.stringify(f));
f = C.parseSearch('หาที่ดินในปทุมธานี ไม่เกิน 5 ล้าน 2 ไร่ โฉนด ผังเหลือง ติดถนน');
check('จังหวัด + งบ + เนื้อที่ ±20% + โฉนด + ผังเหลือง + ติดถนน', f.provinces[0] === 'ปทุมธานี' && f.pmax === 5000000 && f.amin === 1.6 && f.amax === 2.5 && f.deed === 'chanote' && f.zone === 'yellow' && f.feats[0] === 'road', JSON.stringify(f));
f = C.parseSearch('ที่ดินเช่า ไม่เกิน 2 ไร่ ผังเขียวลายขาว ถูกสุด');
check('เช่า · ไม่เกิน 2 ไร่ = amax · เขียวลายขาว (ไม่ใช่เขียว) · เรียงถูกสุด', f.type === 'rent' && f.amax === 2 && !f.amin && f.zone === 'green_diag' && f.sort === 'price_asc', JSON.stringify(f));
f = C.parseSearch('ที่ดิน 5 ไร่ขึ้นไป ราคา 3 ล้านขึ้นไป');
check('"ขึ้นไป" = ขั้นต่ำ ทั้งเนื้อที่และราคา', f.amin === 5 && !f.amax && f.pmin === 3000000 && !f.pmax, JSON.stringify(f));
f = C.parseSearch('น้ำท่วมไหมช่วงหน้าฝน');
check('"น้ำ" โดดๆ ไม่กลายเป็นตัวกรองน้ำประปา', f.feats.length === 0 && f.provinces.length === 0);
check('ชื่อจังหวัดจากแปลงที่มีจริง (knownProv) ใช้ได้แม้ไม่มีตารางราคา', C.parseSearch('มีที่ดินในระยองไหม').provinces[0] === 'ระยอง');

console.log('\n3) ตัวกรอง — "ยังไม่ระบุ" ≠ "ไม่ตรง"');
let r = C.applySearch(L, C.parseSearch('ที่ดินโฉนด'), 'ที่ดินโฉนด');
check('กรองโฉนด: A ตรง · B ยังไม่ระบุ (ซ่อน 1) · C น.ส.3ก ไม่ตรง', r.list.length === 1 && r.list[0].id === 'A' && r.hiddenUnknown === 1, JSON.stringify(r.list.map(x => x.id)) + ' hidden=' + r.hiddenUnknown);
r = C.applySearch(L, C.parseSearch('น.ส.3ก ขึ้นไป'), 'น.ส.3ก ขึ้นไป');
check('น.ส.3ก = "น.ส.3ก ขึ้นไป" นับโฉนดด้วย (A + C)', r.list.length === 2, JSON.stringify(r.list.map(x => x.id)));
r = C.applySearch(L, C.parseSearch('ไม่เกิน 3 ล้าน'), 'ไม่เกิน 3 ล้าน');
check('กรองราคา: C ไม่มีราคา = ซ่อนแล้วนับ ไม่ใช่ถือว่า 0 บาทตรงเงื่อนไข', r.list.length === 1 && r.list[0].id === 'A' && r.hiddenUnknown === 1);
r = C.applySearch(L, C.parseSearch('ที่ดินในกรุงเทพฯ ปริมณฑล'), 'ที่ดินในกรุงเทพฯ ปริมณฑล');
check('ปริมณฑล = A + B (ระยองตก)', r.list.length === 2 && r.list.every(x => x.id !== 'C'));
r = C.applySearch(L, C.parseSearch('ถูกที่สุด'), 'ถูกที่สุด');
check('เรียงถูกสุด: ไม่มีราคาไปท้ายแถว', r.list.map(x => x.id).join('') === 'ABC');
const fp = C.parseSearch('ที่ดินแถวบางบ่อ'); fp.placeRequired = true;
r = C.applySearch(L, fp, 'ที่ดินแถวบางบ่อ');
check('จับชื่ออำเภอจากข้อมูลแปลงจริง', r.list.length === 1 && r.list[0].id === 'A');

console.log('\n4) ตัวจ่ายงาน (route) — ตอบเองหรือส่ง AI');
(async () => {
  const html = async (t) => { const x = await C.route(t); return x ? x.html : null; };
  check('คำถามนอกฐานความรู้ → null (ให้ AI)', (await html('ที่ดินแปลงนี้น้ำท่วมไหมช่วงหน้าฝน')) === null);
  // เดิมข้อนี้ล็อกว่า "ปัญหาแนวเขต" ต้องไม่หลุดเข้าโหมดค้นแปลง (คำว่า "หา" ซ่อนอยู่ใน "ปัญหา")
  // ตอนนี้มีกฎข้อพิพาทแนวเขตแล้ว จึงต้องตอบเอง — แต่เจตนาเดิมยังอยู่: ต้องไม่มีการ์ดประกาศติดมา
  const disp = await C.route('มีปัญหาแนวเขตกับข้างบ้าน');
  check('"ปัญหาแนวเขต" → กฎข้อพิพาท ไม่ใช่โหมดค้นแปลง', /หลักเขต/.test(disp.html) && !disp.cards, disp.html);
  check('เพื่อนบ้านรุกล้ำ → ตอบเอง ไม่ส่ง AI + ลิงก์คู่มือ', /guides\.html#survey/.test(await html('เพื่อนบ้านปลูกต้นไม้ล้ำแนวรั้วเข้ามา ควรทำยังไง')));
  check('ข้อพิพาทแนวเขต → ไม่ให้คำแนะนำทางกฎหมาย บอกว่าไม่ปรึกษากฎหมาย', /ไม่ให้คำปรึกษา/.test(await html('ที่ดินทับซ้อนกับแปลงข้างเคียง')));
  // "ข้างบ้าน" ที่ไม่ได้มีเรื่อง ต้องไม่ถูกกฎข้อพิพาทดูด — คำถามซื้อขายต้องไปทางเดิมของมัน
  const nb1 = await C.route('ที่ดินข้างบ้านมีขายไหม');
  check('"ที่ดินข้างบ้านมีขายไหม" ไม่เข้ากฎข้อพิพาท (ไม่มีคำเรื่องแนวเขต)', nb1 === null || !/หลักเขต/.test(nb1.html));
  const nb2 = await C.route('มีที่ดินข้างบ้านในสมุทรปราการขายไหม');
  check('ระบุจังหวัดด้วย → เข้าโหมดค้นแปลงตามเดิม', !!(nb2 && nb2.cards));
  check('ขั้นตอนฝากขาย → ตอบเอง + 3% + ลิงก์ consign.html', /3%/.test(await html('ขั้นตอนฝากขายที่ดิน')) && /consign\.html/.test(await html('อยากขายที่ดิน')));
  check('เอกสาร → รายการเอกสารรังวัด', /โฉนดที่ดินฉบับจริง/.test(await html('ต้องเตรียมเอกสารอะไรบ้าง')));
  check('เอกสารฝากขาย → ตอบเรื่องฝากขาย ไม่ใช่รังวัด', /รูปโฉนด/.test(await html('ฝากขายต้องใช้เอกสารอะไร')));
  check('ค่าโอน → ไม่มีตัวเลข % ในคำตอบ + ลิงก์เครื่องคำนวณ', !/%/.test(await html('ค่าโอนมีอะไรบ้าง')) && /guides\.html#calc/.test(await html('ค่าโอนมีอะไรบ้าง')));
  check('คิวรังวัด → ระยะเวลาโดยประมาณ', /30-60 วัน/.test(await html('คิวรังวัดกี่วัน')));
  check('เป็นบอทไหม → บอกว่าเป็น AI', /เป็น AI/.test(await html('นี่คุยกับบอทใช่ไหม')));
  check('ทักทาย', /สวัสดี/.test(await html('สวัสดีครับ')));
  check('เวลาทำการ', /08:30/.test(await html('เปิดกี่โมง')));
  check('คุยกับคน → ปุ่ม 3 ช่องทาง + data-contact', (await html('ขอคุยกับคนจริง')).split('data-contact=').length === 4);
  check('ตรวจทรัพย์ขายทอดตลาด → verify.html', /verify\.html/.test(await html('ทรัพย์ขายทอดตลาด ตรวจให้ได้ไหม')));
  check('ค้นแปลง → ตอบพร้อมการ์ด', (await C.route('หาที่ดินในสมุทรปราการ')).cards.length === 1);
  check('ค้น + เปรียบเทียบในประโยคเดียว → มีตารางเทียบ', /njchat-table/.test(await html('หาที่ดินในกรุงเทพฯ ปริมณฑล เปรียบเทียบให้หน่อย')));
  check('เทียบต่อจากผลค้น → ตาราง 2 คอลัมน์ + "—" ช่องที่ยังไม่ระบุ', (await html('เปรียบเทียบ')).split('<td>').length > 9 && /njchat-none/.test(await html('เทียบ')));
  check('ค่ารังวัดไม่บอกเนื้อที่ → ถามเนื้อที่ ไม่มีตัวเลขเงิน', /เนื้อที่ประมาณเท่าไหร่/.test(await html('ค่ารังวัดสอบเขตเท่าไหร่')) && !/฿/.test(await html('ค่ารังวัดสอบเขตเท่าไหร่')));
  if (P) {
    C._setPricing(P);
    const q = await html('2 ไร่ ที่เชียงใหม่ 3 โฉนด');
    const zi = P.TRAVEL_ZONES.find(z => z.code === P.zoneOf('เชียงใหม่'));
    const exp = P.computeQuote({ jobType: 'สอบเขต', rai: 2, deeds: 3, splitPlots: 0, vatRate: 0, fees: [], travel: { province: 'เชียงใหม่', zone: zi.code, nights: zi.nights } });
    const fmt = n => '฿' + Math.round(n).toLocaleString('th-TH');
    check('ตอบเนื้อที่ต่อจากคำถาม → คิดจาก pricing.js จริง (ตั้งต้น+โฉนด+โซน+คืนพัก) รวม ' + fmt(exp.subtotal), q.indexOf('รวมประมาณ ' + fmt(exp.subtotal)) >= 0 && q.indexOf(fmt(exp.travelTotal)) >= 0 && /ประมาณการ/.test(q), q);
    const q2 = await html('ถ้าเป็นแบ่งแยกโฉนดล่ะ');
    const exp2 = P.computeQuote({ jobType: 'รวม-แบ่งแยก', rai: 2, deeds: 3, splitPlots: 0, vatRate: 0, fees: [], travel: { province: 'เชียงใหม่', zone: zi.code, nights: zi.nights } });
    check('เปลี่ยนประเภทงานจำเนื้อที่/จังหวัด/โฉนดเดิม รวม ' + fmt(exp2.subtotal), q2.indexOf('รวมประมาณ ' + fmt(exp2.subtotal)) >= 0, q2);
    const q3 = await html('สอบเขต 1 ไร่ กรุงเทพ');
    check('ถามใหม่ระบุประเภทงาน = โจทย์ใหม่ (โฉนด 3 ใบของคำถามก่อนไม่ติดมา) · กทม. โซน A ไม่มีค่าเดินทาง', !/นอกพื้นที่/.test(q3) && !/ยังไม่รวมค่าเดินทาง/.test(q3) && !/3 โฉนด/.test(q3), q3);
    const qq = await html('ขอใบเสนอราคาจริง');
    check('ขอใบเสนอราคาจริง → ส่งต่อไลน์ (ทีมขายออกใบจริง) ไม่คิดซ้ำ', /line\.me/.test(qq) && /ทีมขายออกให้/.test(qq) && !/รวมประมาณ/.test(qq), qq);
    C._reset();
    const q4 = await html('สอบเขต 1 ไร่');
    check('ไม่บอกจังหวัด → เตือนว่ายังไม่รวมค่าเดินทาง (กติกาข้อ 14)', /ยังไม่รวมค่าเดินทาง/.test(q4), q4);
  }
  console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
