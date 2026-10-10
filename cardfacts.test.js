// ทดสอบแถวข้อมูลที่ทีมตรวจ/บันทึกแล้วบนการ์ดประกาศ (listingcard.js → factsHtml) · เพิ่ม 2026-10-10 (รอบ 3)
// รันด้วย:  node cardfacts.test.js
// กติกาหลัก: ชิปบนการ์ดต้องไม่ขัดกับหน้าแปลง · ยังไม่ตรวจ = ไม่มีชิป · ไม่ขึ้นข้อความอิสระ · ไม่ขึ้นข้อมูลเจ้าของแจ้ง
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 240) : '')); }
}

function boot(withHealth) {
  global.window = {}; global.document = {};
  new Function(read('landvocab.js'))();
  if (withHealth) new Function('window', 'document', read('health.js'))(global.window, global.document);
  new Function(read('listingcard.js'))();
  return global.window;
}
let W = boot(true);
const H = W.NJHealth, NJL = W.NJListing;

function cardOf(land, tier, extra) {
  return NJL.card(NJL.normalize(Object.assign({ id: 'OP-9', type: 'sell', parcelInfo: 'แปลงทดสอบ', estValue: 1000000, photos: [], tier: tier || 1, land: land }, extra || {}), 0));
}
function factsOf(html) {
  const m = html.match(/<ul class="card-checked"[^>]*>([\s\S]*?)<\/ul>/);
  if (!m) return [];
  return (m[1].match(/<li class="card-ck[^"]*"[^>]*>[\s\S]*?<\/li>/g) || []).map(li => ({
    cls: (li.match(/class="([^"]*)"/) || [])[1] || '',
    html: li,
    text: li.replace(/<[^>]+>/g, '').trim()
  }));
}
function chip(facts, word) { return facts.find(f => f.text.indexOf(word) >= 0); }
function stateOf(f) { const m = f && f.cls.match(/is-(ok|warn|bad)/); return m ? m[1] : ''; }

// ข้อมูลจริงจาก production 10 ต.ค. 2569 (หน้าแปลง /api/public/listings/:id) — ตัดเหลือเฉพาะช่องที่การ์ด/หน้าแปลงอ่าน
// health ตรงกับรูปที่ slimLand ของระบบส่งในหน้ารวม {widthM, access, markerFound, markerTotal}
const REAL = [
  {"id": "OP-102", "tier": 2, "land": {"frontage": "หน้ากว้าง 46 เมตร  ลึก 13 เมตร", "roadSurface": "concrete", "deedType": "chanote", "zoneColor": "yellow", "checks": {"area": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}, "markers": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}, "access": {"status": "ok", "value": "รังวัดก่อนซื้อ-ขาย"}, "servitude": {"status": "ok", "value": "ไม่มี"}, "seizure": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}, "tax": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}, "mortgage": {"status": "ok", "value": "ไม่มี"}}, "health": {"widthM": null, "access": "other", "markerFound": 1, "markerTotal": 10}}},
  {"id": "OP-101", "tier": 1, "land": {"frontage": "8 เมตร", "roadSurface": "concrete", "deedType": "chanote", "checks": {"access": {"status": "ok", "value": "8 เมตร"}, "servitude": {"status": "ok", "value": "มี"}}, "health": {"widthM": null, "access": "servitude", "markerFound": null, "markerTotal": null}}},
  {"id": "OP-091", "tier": 2, "land": {"roadSurface": "concrete", "deedType": "chanote", "checks": {"area": {"status": "ok", "value": ""}, "markers": {"status": "ok", "value": ""}, "access": {"status": "ok", "value": ""}, "servitude": {"status": "ok", "value": ""}}, "health": {"widthM": null, "access": "servitude", "markerFound": null, "markerTotal": null}}},
  {"id": "OP-088", "tier": 1, "land": {"roadSurface": "concrete", "deedType": "chanote", "checks": {}, "health": {"widthM": null, "access": "servitude", "markerFound": null, "markerTotal": null}}},
  {"id": "OP-025", "tier": 2, "land": {"roadSurface": "concrete", "deedType": "chanote", "checks": {"area": {"status": "ok", "value": "33.9 ตารางวา"}, "markers": {"status": "ok", "value": "ผ่านการตรวจสอบเเล้ว"}, "access": {"status": "ok", "value": "ผ่านการตรวจสอบเเล้ว"}, "servitude": {"status": "ok", "value": "ผ่านการตรวจสอบเเล้ว"}, "seizure": {"status": "ok", "value": "ผ่านการตรวจสอบเเล้ว"}, "tax": {"status": "ok", "value": "ผ่านการตรวจสอบเเล้ว"}}, "health": {"widthM": null, "access": "public_road", "markerFound": null, "markerTotal": null}}},
  {"id": "OP-024", "tier": 2, "land": {"frontage": "6", "roadSurface": "concrete", "deedType": "chanote", "zoneColor": "green", "checks": {"area": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}, "markers": {"status": "warn", "value": "รังวัดก่อนซื้อ-ขาย"}, "access": {"status": "ok", "value": "6"}, "servitude": {"status": "ok", "value": "ไม่มี"}, "seizure": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}, "tax": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}, "mortgage": {"status": "", "value": "รังวัดก่อนซื้อ-ขาย"}}, "health": {"widthM": 6, "access": "public_road", "markerFound": null, "markerTotal": null}}},
  {"id": "OP-023", "tier": 2, "land": {"roadSurface": "asphalt", "deedType": "chanote", "zoneColor": "other", "checks": {"area": {"status": "warn", "value": "1-3-68"}, "markers": {"status": "warn", "value": ""}, "access": {"status": "ok", "value": "เป็นทางสาธารณประโยชน์"}, "servitude": {"status": "ok", "value": "ไม่มี"}, "seizure": {"status": "warn", "value": ""}, "tax": {"status": "warn", "value": ""}, "mortgage": {"status": "warn", "value": ""}}, "health": {"widthM": null, "access": "public_road", "markerFound": 0, "markerTotal": 0}}}
];

console.log('\n1) NJHealth.frontageM — หน้ากว้างเป็นเมตร (เลขเปล่าไม่นับ)');
const fm = (frontage, widthM) => H.frontageM({ frontage: frontage, health: widthM == null ? null : { widthM: widthM } });
ok('"หน้ากว้าง 46 เมตร  ลึก 13 เมตร" → 46', fm('หน้ากว้าง 46 เมตร  ลึก 13 เมตร') === 46, fm('หน้ากว้าง 46 เมตร  ลึก 13 เมตร'));
ok('"8 เมตร" → 8', fm('8 เมตร') === 8);
ok('"12.5 ม." → 12.5', fm('12.5 ม.') === 12.5);
ok('"1,200 เมตร" → 1200', fm('1,200 เมตร') === 1200);
ok('"กว้าง 20 ม. ลึก 40 ม." → 20', fm('กว้าง 20 ม. ลึก 40 ม.') === 20);
ok('⭐ เลขเปล่า "6" → null (ห้ามเดาหน่วย)', fm('6') === null);
ok('⭐ "ลึก 13 เมตร" (ไม่มีหน้ากว้าง) → null', fm('ลึก 13 เมตร') === null);
ok('⭐ "ถนนกว้าง 8 เมตร" (ความกว้างถนน) → null', fm('ถนนกว้าง 8 เมตร') === null);
ok('"รังวัดก่อนซื้อ-ขาย" (ข้อความอิสระ) → null', fm('รังวัดก่อนซื้อ-ขาย') === null);
ok('ว่าง → null', fm('') === null && H.frontageM({}) === null && H.frontageM(null) === null);
ok('health.widthM 6 + frontage "6" → 6 (ตัวเลขทีมกรอก)', fm('6', 6) === 6);
ok('health.widthM ล้วน → ใช้ได้', fm('', 15) === 15);
ok('⭐ สองแหล่งขัดกัน (widthM 10 · "12 เมตร") → null', fm('12 เมตร', 10) === null);
ok('สองแหล่งตรงกัน (widthM 46 · "หน้ากว้าง 46 เมตร") → 46', fm('หน้ากว้าง 46 เมตร', 46) === 46);

console.log('\n2) ⭐ ข้อมูลจริง 7 แปลง — ชิปบนการ์ดไม่ขัดกับหน้าแปลง');
ok('มีข้อมูลจริงครบ 7 แปลง', REAL.length === 7, REAL.length);
REAL.forEach(r => {
  const facts = factsOf(cardOf(r.land, r.tier));
  const detailShows = r.tier === 2 || !!r.land.health;   // หน้าแปลง: แผงผลตรวจ (ระดับ 2) หรือตารางสุขภาพ (มี health)
  [['access', 'ทางเข้าออก'], ['markers', 'หมุดหลักเขต']].forEach(([k, word]) => {
    const t = H.topic(r.land, k);
    const c = chip(facts, word);
    if (!detailShows || t.state === 'none') ok(r.id + ' ' + word + ': หน้าแปลงไม่แสดง/ยังไม่ตรวจ → ไม่มีชิป', !c, c && c.text);
    else ok(r.id + ' ' + word + ': สถานะชิป = สถานะบนหน้าแปลง (' + t.state + ')', c && stateOf(c) === t.state, c ? c.cls + ' ' + c.text : 'ไม่มีชิป');
  });
  ok(r.id + ': ชิปไม่เกิน 4', facts.length <= 4, facts.length);
  ok(r.id + ': ไม่มีข้อความอิสระจากผลตรวจหลุดขึ้นการ์ด',
    !/รังวัดก่อนซื้อ|ผ่านการตรวจสอบ|1-3-68|33\.9/.test(facts.map(f => f.text).join('|')), facts.map(f => f.text).join(' | '));
  ok(r.id + ': ไม่มีชิป "ไม่มี…"', !facts.some(f => /^[✓!✕]?\s*ไม่มี/.test(f.text)), facts.map(f => f.text).join(' | '));
});
const real = id => REAL.find(r => r.id === id);
const by = id => factsOf(cardOf(real(id).land, real(id).tier));
const f102 = by('OP-102');
ok('OP-102 ทางเข้าออกเป็น warn (health=other ชนะ checks=ok)', stateOf(chip(f102, 'ทางเข้าออก')) === 'warn', JSON.stringify(f102));
ok('OP-102 หมุดหลักเขต "พบ 1/10" แบบ bad', /พบ 1\/10/.test((chip(f102, 'หมุดหลักเขต') || {}).text) && stateOf(chip(f102, 'หมุดหลักเขต')) === 'bad');
ok('OP-102 ลำดับ ทางเข้าออก → หมุด → ผังสี → หน้ากว้าง',
  f102.length === 4 && /ทางเข้าออก/.test(f102[0].text) && /หมุด/.test(f102[1].text) && /ผังเหลือง/.test(f102[2].text) && /หน้ากว้าง ≈ 46 ม\./.test(f102[3].text),
  f102.map(f => f.text).join(' | '));
ok('OP-102 ชิปถนน/โฉนดถูกตัดเพราะเพดาน 4', !chip(f102, 'ถนน') && !chip(f102, 'โฉนด'));
const f088 = by('OP-088');
ok('⭐ OP-088 (ระดับ 1 แต่มีรายงานสุขภาพ) ทางเข้าออก "ภาระจำยอม" แบบ ok — ตรงกับตารางสุขภาพ',
  /ภาระจำยอม/.test((chip(f088, 'ทางเข้าออก') || {}).text) && stateOf(chip(f088, 'ทางเข้าออก')) === 'ok', JSON.stringify(f088));
const f023 = by('OP-023');
ok('OP-023 หมุด (markerTotal 0 · checks warn) → "ต้องตรวจเพิ่ม" ไม่ใช่ข้อความของทีม',
  /หมุดหลักเขต ต้องตรวจเพิ่ม/.test((chip(f023, 'หมุดหลักเขต') || {}).text), JSON.stringify(f023));
const f024 = by('OP-024');
ok('OP-024 หน้ากว้างจาก health.widthM 6 (frontage "6" เป็นเลขเปล่า)', !!chip(f024, 'หน้ากว้าง ≈ 6 ม.'), JSON.stringify(f024));

console.log('\n3) ⭐ API รุ่นเก่า (ไม่มีคีย์ health ในหน้ารวม) → ไม่ขึ้นชิปหมุด/ทางเข้า');
const oldLand = Object.assign({}, real('OP-102').land); delete oldLand.health;
const fo = factsOf(cardOf(oldLand, 2));
ok('ไม่มีชิปทางเข้าออก', !chip(fo, 'ทางเข้าออก'), JSON.stringify(fo));
ok('ไม่มีชิปหมุดหลักเขต', !chip(fo, 'หมุดหลักเขต'));
ok('ชิปอื่น (ผังสี · หน้ากว้าง · ถนน · โฉนด) ยังขึ้น',
  !!chip(fo, 'ผังเหลือง') && !!chip(fo, 'หน้ากว้าง') && !!chip(fo, 'ถนนคอนกรีต') && !!chip(fo, 'โฉนด'), fo.map(f => f.text).join(' | '));

console.log('\n4) ยังไม่ตรวจ = ไม่มีชิป · ห้ามเดา');
ok('แปลงเปล่า (health null · ไม่มี checks) → ไม่มีแถวเลย', !/card-checked/.test(cardOf({ health: null }, 2)));
ok('ไม่มี land → ไม่มีแถว', !/card-checked/.test(cardOf(null, 1)));
ok('checks สถานะว่างแต่มีค่า → ไม่มีชิป',
  !/card-checked/.test(cardOf({ health: null, checks: { access: { status: '', value: '8 เมตร' }, markers: { status: '', value: 'ครบ' } } }, 2)));
ok('ระดับ 1 ไม่มีรายงานสุขภาพ แต่ checks ok → ไม่มีชิป (หน้าแปลงไม่แสดงหัวข้อนี้)',
  !chip(factsOf(cardOf({ health: null, checks: { access: { status: 'ok', value: 'x' } } }, 1)), 'ทางเข้าออก'));
ok('ระดับ 2 checks ok (ไม่มี health) → ชิป "ทางเข้าออก ตรวจแล้ว" ไม่ใช่ค่าที่ทีมพิมพ์',
  /ทางเข้าออก ตรวจแล้ว$/.test((chip(factsOf(cardOf({ health: null, checks: { access: { status: 'ok', value: '8 เมตร' } } }, 2)), 'ทางเข้าออก') || {}).text));
ok('⭐ ที่ตาบอด (access none) ขึ้นแดง', stateOf(chip(factsOf(cardOf({ health: { access: 'none' } }, 1)), 'ทางเข้าออก')) === 'bad');
ok('ไม่มีถนน (roadSurface none) ขึ้นแดง', /is-bad/.test((chip(factsOf(cardOf({ roadSurface: 'none' }, 1)), 'ยังไม่มีถนน') || {}).cls || ''));
ok('ถนนลาดยาง 2 เลน', !!chip(factsOf(cardOf({ roadSurface: 'asphalt', roadLanes: 2 }, 1)), 'ถนนลาดยาง 2 เลน'));
ok('ค่าเอกสารสิทธิ์ที่ไม่รู้จัก → ไม่ขึ้น', !/card-checked/.test(cardOf({ deedType: 'xyz' }, 1)));

console.log('\n5) ข้อมูลที่เจ้าของแจ้งไม่ขึ้นแถวนี้');
const f5 = factsOf(cardOf({ health: null }, 1, { specs: { source: 'owner', items: [{ k: 'frontageM', th: 'หน้ากว้าง', v: 30 }, { k: 'roadAccess', th: 'ถนน', v: 'คอนกรีต' }] } }));
ok('specs ของเจ้าของไม่กลายเป็นชิป', f5.length === 0, JSON.stringify(f5));

console.log('\n6) ไม่มี health.js บนหน้า → การ์ดยังวาดได้ ขึ้นเฉพาะชิปที่ไม่ต้องใช้ NJHealth');
const W2 = boot(false);
const f6 = factsOf(W2.NJListing.card(W2.NJListing.normalize({ id: 'OP-9', type: 'sell', parcelInfo: 'x', estValue: 1, photos: [], tier: 2, land: real('OP-102').land }, 0)));
ok('ไม่ล้ม และมีผังสี/ถนน/โฉนด', !!chip(f6, 'ผังเหลือง') && !!chip(f6, 'ถนน') && !!chip(f6, 'โฉนด'), f6.map(f => f.text).join(' | '));
ok('ไม่มีชิปหมุด/ทางเข้า/หน้ากว้าง', !chip(f6, 'หมุด') && !chip(f6, 'ทางเข้าออก') && !chip(f6, 'หน้ากว้าง'));
W = boot(true);

console.log('\n7) ป้ายผังสียังเป็นคลาส card-zone · ย้ายออกจากแถวแท็ก');
const h7 = W.NJListing.card(W.NJListing.normalize({ id: 'OP-9', type: 'sell', parcelInfo: 'x', estValue: 1, photos: [], totalWa: 250, land: { zoneColor: 'yellow', deedType: 'chanote' } }, 0));
ok('ผังสีอยู่ในแถว card-checked', /<ul class="card-checked"[\s\S]*class="card-zone"[\s\S]*<\/ul>/.test(h7));
const tagsRow = (h7.match(/<div class="card-tags">([\s\S]*?)<\/div>/) || ['', ''])[1];
ok('แถวแท็กยังมีเนื้อที่ แต่ไม่มีผังสี/เอกสารสิทธิ์ซ้ำ', /ไร่|ตร\.ว\./.test(tagsRow) && !/card-zone|โฉนด/.test(tagsRow), tagsRow);
ok('ไอคอนสถานะกำกับทุกชิปที่มีสถานะ (ไม่บอกด้วยสีอย่างเดียว)',
  by('OP-102').filter(f => /is-/.test(f.cls)).every(f => /^[✓!✕]/.test(f.text)));

console.log('\n8) สไตล์และการโหลดสคริปต์');
const lc = read('listingcard.css');
ok('listingcard.css มี .card-checked + .card-ck สามสถานะ',
  /\.card-checked\{/.test(lc) && /\.card-ck\.is-ok\{/.test(lc) && /\.card-ck\.is-warn\{/.test(lc) && /\.card-ck\.is-bad\{/.test(lc));
const mob = (lc.match(/@media \(max-width:767px\)\{[\s\S]*$/) || [''])[0];
ok('⭐ มือถือไม่ซ่อนแถว card-checked ทั้งแถว', !/card-checked\s*\{[^}]*display:none/.test(mob));
ok('⭐ มือถือ: ชิปขึ้นได้ 2 บรรทัด (wrap + max-height) ไม่ใช่แถวเดียวที่ตัดกลางคำ', /\.is-compact \.card-checked\{[^}]*flex-wrap:wrap/.test(mob) && /\.is-compact \.card-checked\{[^}]*max-height:44px/.test(mob) && !/\.is-compact \.card-checked\{[^}]*nowrap/.test(mob));
ok('⭐ มือถือ: ชิปไม่ถูกบีบ (flex-shrink 0) และซ่อนเฉพาะค่า .ck-v ไม่ซ่อนชิปทั้งใบตามลำดับ', /\.is-compact \.card-ck\{[^}]*flex:0 0 auto/.test(mob) && /\.is-compact \.card-ck \.ck-v\{display:none\}/.test(mob) && !/card-checked > li:nth-child/.test(mob));
{
  const h = (() => { const f = factsOf(cardOf({ health: { markerFound: 1, markerTotal: 10, access: 'servitude' } }, 2)); return f; })();
  const acc = chip(h, 'ทางเข้าออก');
  ok('ชิปสถานะแยกชื่อหัวข้อ (.ck-l) กับค่า (.ck-v) — มือถือเหลือ "✓ ทางเข้าออก"', !!acc && /class="ck-l">ทางเข้าออก</.test(acc.html || '') && /class="ck-v">/.test(acc.html || ''), acc && acc.html);
}
ok('ข้อความชิปอยู่ใน span ให้ … ทำงาน (inline-flex ตัดข้อความตรงไม่ได้)', /\.card-ck > span\{[^}]*text-overflow:ellipsis/.test(lc));
ok('มือถือย่อชิปให้เล็กลง', /\.land-card\.is-compact \.card-ck/.test(lc));
ok('njchat.css มีสไตล์ชิปของการ์ดในแชท', /\.njchat-cards \.card-checked\{/.test(read('njchat.css')));
ok('ไม่ใช้ชื่อคลาส card-facts (ชนกับ marketplace.css รุ่นเก่า)', !/card-facts/.test(read('listingcard.js')));
['index.html', 'listings.html', 'purpose.html', 'chat.html', 'land.html'].forEach(p => {
  const s = read(p), a = s.indexOf('src="health.js"'), b = s.indexOf('src="listingcard.js"');
  ok(p + ' โหลด health.js ก่อน listingcard.js', a > 0 && b > 0 && a < b);
});
const src = read('listingcard.js');
ok('listingcard.js อ่านหมุด/ทางเข้าผ่าน NJHealth.topic เท่านั้น',
  /H\.topic\(L, 'access'\)/.test(src) && /H\.topic\(L, 'markers'\)/.test(src) && !/checks\.(access|markers)/.test(src));

console.log('\nสรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
