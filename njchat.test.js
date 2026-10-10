// ทดสอบ "สมอง" ของน้องเอ็นเจชัวร์ (njchat.js) — ตัวอ่านโจทย์ · ตัวกรอง · ตัวจ่ายงาน
//   รันด้วย:  node njchat.test.js            (ไม่มี dependency · ไม่ยิงเน็ต · ตารางราคาอ่านจาก ../nj-survey-system ถ้ามี)
//
// สิ่งที่ล็อกไว้:
//   · "ยังไม่ได้ระบุ" ไม่นับว่าตรง แต่ต้องนับจำนวนที่ถูกซ่อน (กติกาเดียวกับ listings.js)
//   · โจทย์เรื่องบ้าน/จำนวนชั้น กรองได้จริงตั้งแต่ 2026-09-11 (API มีช่องแล้ว) แต่แปลงที่ยังไม่ได้กรอกช่องนี้
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
  { id: 'A', type: 'sell', parcelInfo: 'ที่ดินพร้อมบ้านชั้นเดียว บางบ่อ', estValue: 2500000, totalWa: 850, pricePerWa: 2941, blurb: 'บ้านชั้นเดียว', photos: [], tier: 2, updatedAt: '2026-09-08', land: { province: 'สมุทรปราการ', amphoe: 'บางบ่อ', tambon: 'บางบ่อ', deedType: 'chanote', zoneColor: 'yellow', features: ['road', 'electric'], propertyType: 'house', floors: 1 } },
  { id: 'B', type: 'sell', parcelInfo: 'ที่ดินเปล่า คลองหลวง', estValue: 4000000, totalWa: 400, pricePerWa: 10000, blurb: '', photos: [], tier: 1, updatedAt: '2026-09-07', land: { province: 'ปทุมธานี', amphoe: 'คลองหลวง', tambon: 'คลองสอง', deedType: '', zoneColor: '', features: [], propertyType: 'land', floors: null } },
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
check('ปริมณฑล → 6 จังหวัดโซน A · "บ้าน...1 ชั้น" = ตัวกรองจริง (prop/floors) ไม่ใช่แค่ธง', f.provinces.length === 6 && f.provinces.indexOf('กรุงเทพมหานคร') >= 0 && f.prop === 'house' && f.floors === 1 && f.building === true && f.deed === 'all', JSON.stringify(f));
f = C.parseSearch('อยากได้รีสอร์ทในชลบุรี');
check('รีสอร์ท/รีสอร์ต = ตัวกรองประเภท resort', f.prop === 'resort' && C.parseSearch('หารีสอร์ตริมทะเล').prop === 'resort', JSON.stringify(f));
check('โรงแรม = ตัวกรองประเภท hotel (ไม่ชนกับ โรงงาน → warehouse)', C.parseSearch('มีโรงแรมขายไหม').prop === 'hotel' && C.parseSearch('หาโรงงาน').prop === 'warehouse');
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
  check('ขั้นตอนฝากขาย → ตอบเอง + ถ้อยคำลงประกาศฟรี (ไม่มีอัตราค่านายหน้า) + ลิงก์ consign.html', /ลงประกาศฟรี/.test(await html('ขั้นตอนฝากขายที่ดิน')) && !/\d%|ค่านายหน้า|50,000/.test(await html('ขั้นตอนฝากขายที่ดิน')) && /consign\.html/.test(await html('อยากขายที่ดิน')));
  check('เอกสาร → รายการเอกสารรังวัด', /โฉนดที่ดินฉบับจริง/.test(await html('ต้องเตรียมเอกสารอะไรบ้าง')));
  check('เอกสารฝากขาย → ตอบเรื่องฝากขาย ไม่ใช่รังวัด', /รูปโฉนด/.test(await html('ฝากขายต้องใช้เอกสารอะไร')));
  check('ค่าโอน → ไม่มีตัวเลข % ในคำตอบ + ลิงก์เครื่องคำนวณ', !/%/.test(await html('ค่าโอนมีอะไรบ้าง')) && /guides\.html#calc/.test(await html('ค่าโอนมีอะไรบ้าง')));
  check('คิวรังวัด → ระยะเวลาโดยประมาณ', /30-60 วัน/.test(await html('คิวรังวัดกี่วัน')));
  check('เป็นบอทไหม → บอกว่าเป็น AI', /เป็น AI/.test(await html('นี่คุยกับบอทใช่ไหม')));
  check('ทักทาย', /สวัสดี/.test(await html('สวัสดีครับ')));
  check('เวลาทำการ', /08:30/.test(await html('เปิดกี่โมง')));
  // 4 ปุ่ม = ไลน์ · เมสเซนเจอร์ · โทรสำนักงาน · โทรมือถือ (เบอร์ที่สองเพิ่ม 12 ก.ย. 69)
  check('คุยกับคน → ปุ่มครบ 4 ใบ + data-contact ครบทุกใบ', (await html('ขอคุยกับคนจริง')).split('data-contact=').length === 5);
  check('คุยกับคน → มีทั้งเบอร์สำนักงานและเบอร์มือถือ', /02-162-0405/.test(await html('ขอคุยกับคนจริง')) && /084-915-8601/.test(await html('ขอคุยกับคนจริง')));
  check('ตรวจทรัพย์ขายทอดตลาด → verify.html', /verify\.html/.test(await html('ทรัพย์ขายทอดตลาด ตรวจให้ได้ไหม')));
  check('ค้นแปลง → ตอบพร้อมการ์ด', (await C.route('หาที่ดินในสมุทรปราการ')).cards.length === 1);
  // ประเภทสิ่งปลูกสร้าง/จำนวนชั้น — กรองได้จริงแล้ว (API มีช่องตั้งแต่ 2026-09-11)
  const rH = await C.route('หาบ้านชั้นเดียวในสมุทรปราการ');
  check('กรองบ้าน 1 ชั้น → ได้เฉพาะแปลงที่กรอกว่าเป็นบ้าน 1 ชั้น', rH.cards.length === 1 && rH.cards[0].id === 'A', JSON.stringify((rH.cards || []).map(function (x) { return x.id; })));
  const rL = await C.route('หาที่ดินเปล่าในปทุมธานี');
  check('กรองที่ดินเปล่า → ไม่ติดแปลงที่มีบ้านมาด้วย', rL.cards.length === 1 && rL.cards[0].id === 'B', JSON.stringify((rL.cards || []).map(function (x) { return x.id; })));
  // ⭐ กติกาข้อ 5 — แปลงที่ยังไม่ได้กรอกช่องนี้ต้องถูกนับว่า "ยังไม่ระบุ" แล้วบอกจำนวน ไม่ใช่เงียบหาย
  const rU = await C.route('หาบ้านเช่าในระยอง');
  check('⭐ แปลงที่ยังไม่ได้กรอกประเภท → นับเป็น "ยังไม่ได้ระบุ" และบอกจำนวน', !rU.cards && /ยังไม่ได้ระบุ/.test(rU.html), rU.html.slice(0, 160));
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
  // วางลิงก์ประกาศในแชท (P1 · 2026-09-17)
  C._reset();
  const lk = await html('ช่วยดูแปลงนี้ให้หน่อย https://asset.led.go.th/x.asp?id=12&a="><img src=x>');
  check('วางลิงก์ → ส่งไปหน้าทรัพย์หน่วยงานพร้อมลิงก์', /agency\.html\?url=https%3A%2F%2Fasset\.led\.go\.th/.test(lk), lk);
  check('ลิงก์ของลูกค้าไม่ถูกทำเป็นปุ่มกดไปตรงๆ และไม่มี HTML หลุด', !/href="https:\/\/asset/.test(lk) && !/<img/.test(lk), lk);
  check('ไม่รู้จัก NJAgency (หน้าที่ไม่ได้โหลด agencies.js) ก็ยังตอบได้', /ได้รับลิงก์แล้ว/.test(lk), lk);
  w.URL = URL; w.URLSearchParams = URLSearchParams;   // agencies.js ใช้ URL ของเบราว์เซอร์ — context ของ vm ไม่มีให้เอง
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'agencies.js'), 'utf8'), ctx, { filename: 'agencies.js' });
  const lk2 = await html('https://www.bam.co.th/property/ABC123');
  check('โหลด agencies.js แล้ว → บอกชื่อหน่วยงาน', /BAM/.test(lk2), lk2);
  check('คำว่า "ลิงก์" เฉยๆ ไม่เข้ากฎนี้', !/agency\.html/.test(String(await html('ส่งลิงก์ให้ได้ไหม'))));

  // ==========================================================================
  // ชุดความรู้รอบ 30 ก.ย. 2569 — น้องต้องตอบได้ทุกเรื่องที่ระบบ/เว็บมีจริง
  console.log('\n9) ครอบคลุมทุกระบบ — คำถามลูกค้า → ตอบเองจากกฎ (ไม่ต้องรอ AI)');
  C._reset();
  const NEW_KEYS = ['surveyOpt', 'consignMore', 'sellerAccount', 'verifiedLevels', 'toolsAll', 'loan', 'areaTool', 'assess', 'priceAnalysis', 'sample',
    'checklist', 'payment', 'orderTrack', 'partners', 'partnerApply', 'journal', 'news', 'guides', 'videos', 'inspect', 'room', 'deal', 'purpose',
    'saveCompare', 'listingDetail', 'agency', 'privacy', 'terms', 'wantedMore'];
  check('KB ชุดใหม่ครบ ' + NEW_KEYS.length + ' หัวข้อ', NEW_KEYS.every(k => typeof C.KB[k] === 'string' && C.KB[k].length > 60), NEW_KEYS.filter(k => !C.KB[k]).join(','));
  // ⛔ ไม่มีตัวเลขเงิน (ราคาแพ็กเกจ/ค่าโอน/ค่ารังวัด) ในข้อความตายตัว — ตัวเลขมาจาก API และเครื่องคำนวณเท่านั้น
  check('⛔ ข้อความชุดใหม่ไม่มีจำนวนเงินบาท/฿', NEW_KEYS.every(k => !/฿|\d[\d,]*\s*บาท/.test(C.KB[k])), NEW_KEYS.filter(k => /฿|\d[\d,]*\s*บาท/.test(C.KB[k])).join(','));
  check('⛔ ข้อความชุดใหม่ไม่มีเบอร์โทรอื่นนอกจากของบริษัท', NEW_KEYS.every(k => (C.KB[k].match(/0\d{1,2}[- ]?\d{3}[- ]?\d{4}/g) || []).every(t => /021620405|0849158601/.test(t.replace(/\D/g, '')))));
  let badPromise = [];
  NEW_KEYS.forEach(k => { const t = C.KB[k].replace(/หนังสือรับรอง/g, 'หนังสือ…').replace(/ที่กรมที่ดินรับรอง/g, 'ที่…'); const re = /(รับรอง|รับประกัน|การันตี)/g; let m; while ((m = re.exec(t))) { if (t.slice(Math.max(0, m.index - 10), m.index).indexOf('ไม่') < 0) badPromise.push(k + ':' + t.slice(Math.max(0, m.index - 10), m.index + 14)); } });
  check('⛔ คำรับปาก (รับรอง/รับประกัน/การันตี) โผล่ได้เฉพาะในประโยคปฏิเสธ', badPromise.length === 0, badPromise.join(' | '));

  const cases = [
    ['ฝากขายต้องรังวัดไหม', /ไม่บังคับ/], ['รังวัดแบบไม่เป็นทางการ ลดเท่าไหร่', /50%/], ['ที่ดินยังไม่รังวัดขายได้ไหม', /ข้อมูลเบื้องต้น/],
    ['ที่ดินติดจำนองฝากขายได้ไหม', /จำนอง/], ['ยกเลิกฝากขายได้ไหม', /ถอนประกาศ|ยกเลิก/], ['ฝากขายกับที่ดินชัวร์ไม่ผูกขาดใช่ไหม', /ไม่ผูกขาด|ไม่ผูก/],
    ['ระดับการตรวจสอบมีกี่ระดับ', /2 ระดับ/], ['ป้ายเหลือง คืออะไร', /ข้อมูลเบื้องต้น/], ['ที่ตาบอดขึ้นสีอะไร', null],
    ['เช็กลิสต์ก่อนซื้อ', /16 ข้อ/], ['ก่อนซื้อที่ดินต้องตรวจอะไรบ้าง', /checklist\.html/],
    ['ค่างวดสินเชื่อผ่อนบ้านคำนวณยังไง', /tools\.html#loan/], ['วัดพื้นที่ที่ดินจากแผนที่', /LandsMaps/], ['แบบประเมินความพร้อมขาย', /tools\.html#assess/],
    ['ช่วยตั้งราคาขายให้หน่อย', /tools\.html#price/], ['ขอตัวอย่างรายงาน', /tools\.html#sample/],
    ['ยืนยันใบเสนอราคาแล้วต้องจ่ายยังไง', /ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์/], ['ส่งสลิปตรงไหน', /สลิป/], ['เลขบัญชีบริษัท', /บัญชีบริษัท/],
    ['ติดตามใบสั่งงานยังไง', /ห้ามส่งต่อ/], ['ลืมรหัสผ่านเจ้าของทรัพย์', /ทีมงานจะโทรหรือทักไลน์/],
    ['ลืมรหัสเข้าระบบติดตามงานรังวัด', /portal\.html/], ['สมัครเป็นพันธมิตร', /partner-apply\.html/],
    ['ขออนุญาตก่อสร้างมีบริการไหม', /ค่าแนะนำ/], ['ค่าแนะนำจากพันธมิตรบวกในราคาไหม', /ไม่บวกเพิ่ม/],
    ['ทรัพย์ bam ตรวจให้ได้ไหม', /agency\.html/], ['ห้องข้อมูลแปลงคืออะไร', /room\.html/], ['เส้นทางการซื้อมีกี่ขั้น', /11 ขั้น/],
    ['ขอนัดตรวจแปลงก่อนซื้อ', /inspect\.html/], ['มีวิดีโออะไรบ้าง', /videos\.html/], ['สมัครรับข่าวสาร', /ยกเลิกได้/],
    ['ข้อมูลส่วนบุคคล PDPA', /privacy\.html/], ['ข้อกำหนดการใช้งานเว็บ', /terms\.html/], ['ฝากหาที่ดินฟรีไหม', /wanted\.html/],
    ['เครื่องมือคำนวณฟรีมีอะไรบ้าง', /tools\.html/], ['บันทึกแปลงไว้ดูทีหลังได้ไหม', /บันทึก/], ['รายงานสุขภาพแปลงคืออะไร', /สุขภาพแปลง|แผนที่แนวเขต/]
  ];
  for (const [q, re] of cases) {
    if (!re) continue;
    C._reset();
    const h = await html(q);
    check('«' + q + '» → ตอบเอง', h !== null && re.test(h), h === null ? '(ไม่เข้ากฎ — ไป AI)' : h.slice(0, 200));
  }

  console.log('\n10) เรื่องเดิมต้องไม่ถูกแย่ง (คำที่ซ้อนกัน: ใบเสนอราคา · นายหน้า · เทียบ · ค่าโอน · ลืมรหัส)');
  C._reset();
  check('ค่ารังวัดยังเป็นเรื่องรังวัด ไม่ถูกดูดไปเครื่องมือวัดพื้นที่', !/LandsMaps/.test(await html('ค่ารังวัดสอบเขต 2 ไร่ เท่าไหร่')));
  check('ค่าโอนที่ดิน → ค่าโอน ไม่ใช่การชำระเงินแพ็กเกจ', /guides\.html#calc/.test(await html('ค่าโอนที่ดินต้องจ่ายเงินเท่าไหร่')));
  check('อยากขายที่ดิน → ฝากขาย (ลงประกาศฟรี · ไม่ประกาศค่านายหน้า)', /ลงประกาศฟรี/.test(await html('อยากขายที่ดิน')) && !/ค่านายหน้า/.test(await html('อยากขายที่ดิน')));
  check('ขอใบเสนอราคาจริง ยังส่งต่อไลน์ ไม่ใช่การชำระเงิน', /line\.me/.test(await html('ขอใบเสนอราคาจริง')));
  check('ทำไมต้องรังวัดก่อนซื้อ → เหตุผลรังวัด ไม่ใช่ตัวเลือกรังวัดตอนฝากขาย', /คลาดเคลื่อน/.test(await html('ทำไมต้องรังวัดก่อนซื้อ')));
  check('ผังสีเหลืองคืออะไร → คู่มือผังสี', /tools\.html#zoning/.test(await html('ผังสีเหลืองคืออะไร')));
  check('ตรวจทรัพย์ขายทอดตลาด → verify.html (ไม่ถูกกฎใหม่แย่ง)', /verify\.html/.test(await html('ทรัพย์ขายทอดตลาด ตรวจให้ได้ไหม')));
  C._reset();
  check('มีที่ดินในสมุทรปราการไหม → ยังเป็นโหมดค้นแปลง', !!(await C.route('มีที่ดินในสมุทรปราการไหม')).cards);
  check('ขั้นตอนโอนกรรมสิทธิ์ → ยังตอบเรื่องวันโอน', /สำนักงานที่ดิน/.test(await html('ขั้นตอนโอนกรรมสิทธิ์')));
  check('น้ำท่วมไหมช่วงหน้าฝน → ยังไป AI (ไม่เข้ากฎใหม่)', (await C.route('น้ำท่วมไหมช่วงหน้าฝน')) === null);
  check('ค่าเดินทางต่างจังหวัด → ยังเป็นพื้นที่ให้บริการ', /ทั่วประเทศ/.test(await html('ต่างจังหวัดรับไหม')));

  console.log('\n11) ชิปทุกใบต้องกดแล้วมีคำตอบ (ชิปที่ตอบไม่ได้ = ปุ่มที่ทำให้ลูกค้าเจอทางตัน)');
  const chipSet = {};
  C.HOME_CHIPS.forEach(c => { chipSet[c] = 1; });
  for (const [q] of cases) { C._reset(); const r = await C.route(q); if (r && r.chips) r.chips.forEach(c => { chipSet[c] = 1; }); }
  const chipList = Object.keys(chipSet);
  let deadChips = [];
  for (const c of chipList) { C._reset(); const r = await C.route(c); if (r === null) deadChips.push(c); }
  check('ชิป ' + chipList.length + ' ใบ ทุกใบมีคำตอบ ไม่ตกไป AI', deadChips.length === 0, deadChips.join(' | '));
  check('หน้าแรกโชว์ชิปเรื่องใหม่ (แพ็กเกจ · ระดับตรวจสอบ · เครื่องมือ)', /แพ็กเกจ/.test(C.HOME_CHIPS.join('|')) && /ระดับการตรวจสอบ/.test(C.HOME_CHIPS.join('|')) && /เครื่องมือ/.test(C.HOME_CHIPS.join('|')));

  console.log('\n12) แพ็กเกจ — ราคา/ชื่อมาจาก API เท่านั้น (โหลดไม่ได้ = ไม่บอกตัวเลข)');
  C._reset();
  w.fetch = function () { return Promise.reject(new Error('no net')); };
  const pf = await html('แพ็กเกจบริการมีอะไรบ้าง');
  check('API ล่ม → ไม่มีตัวเลขเงินสักตัว + ชี้หน้าแพ็กเกจ + ไม่เดา', !/฿|\d\s*บาท/.test(pf) && /packages\.html/.test(pf) && /ไม่อยากเดา/.test(pf), pf);
  const PK = { packages: [
    { key: 'owner_scan', name: 'ประเมินเบื้องต้นฟรี', group: 'owner', subtitle: 'ให้ทีมดูข้อมูลเบื้องต้น', priceMode: 'range', priceFrom: 0, priceTo: 990, priceUnit: 'job', durationText: '2-3 วันทำการ', included: ['ตรวจเอกสารสิทธิ์เบื้องต้น', 'สรุปผลให้'], excluded: ['งานรังวัด'] },
    { key: 'owner_verified', name: 'Verified Property', group: 'owner', priceMode: 'from', priceFrom: 29900, priceUnit: 'job', included: ['ตรวจเอกสาร'], excluded: [] },
    { key: 'inv_corp', name: 'Corporate Subscription', group: 'investor', priceMode: 'quote', priceFrom: null, included: [], excluded: [] },
    { key: 'addon_x', name: 'บริการเสริมตัวอย่าง', group: 'addon', priceMode: 'fixed', priceFrom: 5000, priceUnit: 'job', included: [], excluded: [] }
  ], config: { groups: [{ key: 'owner', th: 'สำหรับเจ้าของทรัพย์' }, { key: 'investor', th: 'นักลงทุนและผู้พัฒนาโครงการ' }, { key: 'addon', th: 'บริการเสริม' }] } };
  let pkFetches = 0;
  w.fetch = function (u) { pkFetches++; return Promise.resolve({ ok: true, json: () => Promise.resolve(PK) }); };
  const pa = await html('แพ็กเกจบริการมีอะไรบ้าง');
  check('รายการแพ็กเกจ → ชื่อครบจาก API + ราคา (0 = "ฟรี" ไม่ใช่ ฿0 · quote = ขอใบเสนอราคา)', /ประเมินเบื้องต้นฟรี — ฟรี – ฿990/.test(pa) && /Verified Property — เริ่มต้น ฿29,900/.test(pa) && /Corporate Subscription — ขอใบเสนอราคา/.test(pa) && !/฿0/.test(pa), pa);
  check('มีข้อความกำกับ: ประมาณการ + ไม่ใช่การรับประกัน + ลิงก์ packages.html', /ราคาเป็นประมาณการ/.test(pa) && /ไม่ใช่การรับประกัน/.test(pa) && /packages\.html/.test(pa));
  check('ถามเฉพาะกลุ่มเจ้าของทรัพย์ → ไม่โผล่กลุ่มอื่น', !/Corporate Subscription/.test(await html('แพ็กเกจสำหรับเจ้าของทรัพย์มีอะไรบ้าง')) && /Verified Property/.test(await html('แพ็กเกจสำหรับเจ้าของทรัพย์มีอะไรบ้าง')));
  const pd = await html('Verified Property ราคาเท่าไหร่ แพ็กเกจนี้');
  check('ถามชื่อแพ็กเกจ → รายละเอียดใบนั้น', /Verified Property/.test(pd) && /เริ่มต้น ฿29,900/.test(pd) && !/Corporate Subscription/.test(pd), pd);
  const before = pkFetches; await html('แพ็กเกจมีอะไรบ้าง'); await html('แพ็กเกจมีอะไรบ้าง');
  check('แคชผลจาก API (ไม่ยิงซ้ำทุกคำถาม)', pkFetches === before, pkFetches - before);

  console.log('\n13) วารสาร — ฉบับล่าสุดจาก API (slug ตรวจรูปแบบก่อนทำลิงก์)');
  C._reset();
  w.fetch = function () { return Promise.resolve({ ok: true, json: () => Promise.resolve([{ slug: '2026-w40', title: 'ฉบับที่ 2 ทดสอบ', issue_no: 2 }, { slug: '../evil"><script>', title: 'ไม่ควรเป็นลิงก์' }]) }); };
  const jr = await html('มีวารสารอะไรให้อ่านบ้าง');
  check('วารสาร → ลิงก์ฉบับล่าสุด journal/<slug>/ · slug แปลกไม่ถูกทำเป็นลิงก์', /journal\/2026-w40\//.test(jr) && !/evil/.test(jr) && !/<script/.test(jr), jr);
  w.fetch = function () { return Promise.reject(new Error('no net')); };
  const jr2 = await html('มีวารสารไหม');
  check('ดึงวารสารไม่ได้ → ตอบแบบไม่ระบุฉบับ + ลิงก์หน้าวารสาร', /journal\.html/.test(jr2) && /ทุกสัปดาห์/.test(jr2), jr2);
  w.fetch = function () { return Promise.reject(new Error('no net')); };

  console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
