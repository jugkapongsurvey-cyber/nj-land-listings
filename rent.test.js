// ทดสอบการแสดงค่าเช่ารายเดือนของประกาศ "ให้เช่า" (11 ต.ค. 2569)
// รันด้วย:  node rent.test.js
// กติกาหลัก:
//   · ⭐ ประกาศขายหน้าตาเดิมทุกไบต์ (การ์ด · คำบรรยาย SEO · หน้าแปลง)
//   · ประกาศเช่า: "฿x /เดือน" + ค่าเช่าต่อ ตร.ว./ตร.ม. จากก้อน rent ของเซิร์ฟเวอร์ (ห้ามหารเอง) · ป้าย "ให้เช่า" ไม่ถูกซ่อนบนมือถือ
//   · ประกาศเช่าไม่มีเครื่องคำนวณค่าโอน · ราคาประเมินราชการ · ราคาเทียบเคียง · มีกล่องเงื่อนไขการเช่า
//   · ตัวกรองราคาเปลี่ยนเป็นค่าเช่า/เดือนเมื่อเลือก "ให้เช่า" · เรียงตามค่าเช่าได้ · หมุดแผนที่ "฿x/ด."
//   · ลิงก์ SEO/หน้าพื้นที่ "เช่า…" ขึ้นเฉพาะเมื่อมีประกาศเช่าจริง
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 300) : '')); }
}

// ---------- 1) การ์ดประกาศ (listingcard.js) ----------
global.window = {}; global.document = {};
new Function(read('landvocab.js'))();
new Function('window', 'document', read('health.js'))(global.window, global.document);
new Function(read('listingcard.js'))();
const NJL = global.window.NJListing;
const card = it => NJL.card(NJL.normalize(Object.assign({ photos: [], tier: 1 }, it), 0));

const sell = card({ id: 'OP-S', type: 'sell', estValue: 4000000, totalWa: 400, pricePerWa: 10000, pricePerRai: 4000000, rent: null });
ok('ขาย: ราคาพาดหัวแบบเดิม', /<div class="card-price"><b>฿4,000,000<\/b><span>฿10,000\/ตร\.ว\.<\/span><\/div>/.test(sell), sell);
ok('ขาย: ป้าย "ขาย" แบบเดิม (ไม่มีคลาสใหม่)', sell.indexOf('<span class="badge">ขาย</span>') >= 0);
ok('ขาย: ไม่มี "/เดือน"', sell.indexOf('เดือน') < 0);

const rent = card({ id: 'OP-R', type: 'rent', estValue: 30000, totalWa: 1600, pricePerWa: 0,
  rent: { monthly: 30000, perWa: 18.75, perSqm: 4.69, perSqmBasis: 'land', terms: [], termsSource: '' } });
ok('เช่า: "฿30,000 /เดือน" ตัวใหญ่', /<b>฿30,000<small class="card-pm">\/เดือน<\/small><\/b>/.test(rent), rent);
ok('เช่า: ค่าเช่าต่อ ตร.ว. และต่อ ตร.ม. (ทศนิยม 2 ตำแหน่ง)', rent.indexOf('<span>฿18.75/ตร.ว.</span>') >= 0 && rent.indexOf('<span>฿4.69/ตร.ม.</span>') >= 0, rent);
ok('เช่า: ป้าย "ให้เช่า" มีคลาส badge-rent', rent.indexOf('<span class="badge badge-rent">ให้เช่า</span>') >= 0);

const oldApi = card({ id: 'OP-O', type: 'rent', estValue: 25000, totalWa: 400 });
ok('API รุ่นเก่า (ไม่มี rent): ใช้ estValue เป็นค่าเช่า · ไม่มีบรรทัดต่อหน่วย (ไม่หารเอง)',
  /<b>฿25,000<small class="card-pm">\/เดือน<\/small><\/b><\/div>/.test(oldApi), oldApi);
const noPrice = card({ id: 'OP-N', type: 'rent', estValue: 0, rent: { monthly: 0 } });
ok('เช่า ไม่มีค่าเช่า = ติดต่อสอบถาม (ไม่มี /เดือน)', noPrice.indexOf('ค่าเช่าติดต่อสอบถาม') >= 0 && noPrice.indexOf('card-pm') < 0);

const lcCss = read('listingcard.css');
ok('⭐ ป้าย "ให้เช่า" ไม่ถูกซ่อนบนการ์ดแนวนอนของมือถือ', /:not\(\.badge-rent\)\{display:none\}/.test(lcCss));
['listingcard.css', 'home.css', 'njchat.css'].forEach(f => {
  const c = read(f);
  ok(f + ' มีสไตล์ .badge-rent และ .card-pm', /badge-rent\s*\{/.test(c) && /card-pm\s*\{/.test(c));
});

// ---------- 2) หน้าแปลง (land.js) ----------
const land = read('land.js');
const helpers = land.slice(land.indexOf('function isRent('), land.indexOf('// ---------- ห้องชุด (รอบคอนโด 3)'));
ok('มีตัวช่วยค่าเช่าครบ', /function rentOf\(/.test(helpers) && /function rentTermsHtml\(/.test(helpers) && /function rentPriceHtml\(/.test(helpers));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const box = {};
vm.runInNewContext(helpers + '\nthis.F={isRent,rentOf,rentPriceHtml,rentPerText,rentTermsHtml};', Object.assign(box, { esc: esc }));
const F = box.F;
const L1 = { type: 'rent', estValue: 30000, rent: { monthly: 30000, perWa: 18.75, perSqm: 4.69, perSqmBasis: 'land', depositBaht: 90000, advanceBaht: 30000,
  termsSource: 'owner', regNote: 'สัญญาเช่าเกิน 3 ปี ต้องจดทะเบียน (ป.พ.พ. มาตรา 538)',
  terms: [{ k: 'leaseScope', th: 'รูปแบบการให้เช่า', text: 'ให้เช่าทั้งแปลง' }, { k: 'minLeaseMo', th: 'สัญญาเช่าขั้นต่ำ', text: '5 ปี' }] } };
ok('ราคาหน้าแปลง "฿30,000/เดือน"', F.rentPriceHtml(L1) === '฿30,000<span class="ld-pm">/เดือน</span>', F.rentPriceHtml(L1));
ok('บรรทัดต่อหน่วย', F.rentPerText(L1) === '฿18.75/ตร.ว. · ฿4.69/ตร.ม.', F.rentPerText(L1));
const terms = F.rentTermsHtml(L1);
ok('กล่องเงื่อนไข: ป้ายที่มา + เงื่อนไข + เงินประกัน + หมายเหตุจดทะเบียน',
  /ข้อมูลที่เจ้าของแจ้ง/.test(terms) && /ให้เช่าทั้งแปลง/.test(terms) && /฿90,000/.test(terms) && /538/.test(terms) && /เป็นไปตามสัญญาเช่า/.test(terms), terms);
ok('ไม่มีเงื่อนไขเลย = กล่องว่าง (ซ่อนทั้งหัวข้อ)', F.rentTermsHtml({ type: 'rent', estValue: 1, rent: { monthly: 1 } }) === '');
ok('ประกาศขาย = ไม่มีตัวช่วยค่าเช่าทำงาน', F.rentOf({ type: 'sell', estValue: 1 }) === null && F.rentTermsHtml({ type: 'sell' }) === '');
ok('ห้องชุด: ต่อ ตร.ม. บอกว่าคิดจากขนาดห้อง', /ขนาดห้อง/.test(F.rentPerText({ type: 'rent', rent: { monthly: 15000, perSqm: 468.75, perSqmBasis: 'room' } })));
ok('⭐ เช่า: ไม่มีเครื่องคำนวณค่าโอน (กล่องเงื่อนไขการเช่าแทน)',
  /isRent\(l\) \? secHtml\('ld-s-rent','เงื่อนไขการเช่า', rentTermsHtml\(l\)\)\s*:\s*secHtml\('ld-s-fee'/.test(land));
ok('⭐ เช่า: ไม่แสดงราคาประเมินราชการ', /function apprOf\(l\)\{[\s\S]{0,200}if\(isRent\(l\)\) return null;/.test(land));
ok('⭐ เช่า: ไม่แสดงราคาเทียบเคียง', /isRent\(l\) \? '' : secHtml\('ld-s-comps'/.test(land));
ok('เช่า: ไม่มีลิงก์ "ราคานี้คำนวณอย่างไร"', /l\.estValue&&!isRent\(l\)\?'<a class="ld-vlink"/.test(land));
ok('เครื่องคำนวณค่าโอนไม่ mount เมื่อไม่มีกล่อง', /if\(window\.NJFeeCalc && feeHost\)/.test(land));
ok('JSON-LD: ค่าเช่าต่อเดือน (unitCode MON)', /unitCode:'MON'/.test(land));
ok('สินเชื่อยังเฉพาะห้องชุดที่ขาย (กติกาเดิม)', /isCondo\(l\) && l\.type!=='rent' && Number\(l\.estValue\)>0/.test(land));
ok('land.css มีสไตล์ป้ายเช่า + กล่องเงื่อนไข', /\.ld-badge\.type\.rent\{/.test(read('land.css')) && /\.ld-rent-terms\{/.test(read('land.css')));

// ---------- 3) หน้ารวมประกาศ (listings.js) ----------
const ls = read('listings.js');
ok('⭐ ประเภท=ทั้งหมด + กรองราคา = ไม่เอาประกาศเช่ามาเทียบช่วงราคาขาย',
  /if \(\(f\.pmin \|\| f\.pmax\) && f\.type === 'all' && item\.type === 'rent'\) return false;/.test(ls));
ok('ป้ายช่องราคาเปลี่ยนเป็นค่าเช่า/เดือนเมื่อเลือกให้เช่า', /ค่าเช่าต่ำสุด \(บาท\/เดือน\)/.test(ls) && /ค่าเช่าสูงสุด \(บาท\/เดือน\)/.test(ls) && /syncPriceLabels\(f\.type\)/.test(ls));
ok('ตัวเลือกการเรียงตามค่าเช่า', /ค่าเช่า\/เดือน ต่ำ → สูง/.test(ls) && /ค่าเช่าต่อ ตร\.ว\. ต่ำ → สูง/.test(ls));
ok('ป้ายขายเดิมยังอยู่ครบ (ตรงกับ listings.html)', /ราคาต่ำสุด \(บาท\)/.test(ls) && /ราคารวม ต่ำ → สูง/.test(ls) &&
  /<option value="price_asc">ราคารวม ต่ำ → สูง<\/option>/.test(read('listings.html')));
ok('เรียงค่าเช่าต่อ ตร.ว. จากก้อน rent (ไม่หารเอง)', /x\.type === 'rent' \? \(\(x\.rent && x\.rent\.perWa\) \|\| 0\)/.test(ls));
ok('ประเภท=ทั้งหมด เรียงราคา: ขายก่อน แล้วค่อยเช่า', /var grouped = function \(cmp\)/.test(ls));
ok('ชิปค่าเช่า "/ด."', /'ค่าเช่า ' \+ rangeText\(f\.pmin, f\.pmax, rentShort\)/.test(ls));
ok('⭐ ลิงก์ "เช่า…" ตามจังหวัดอยู่ใน if (types.rent) เท่านั้น',
  /if \(types\.rent\) \{[\s\S]{0,900}'เช่าที่ดิน ' : 'ประกาศให้เช่า '\) \+ k/.test(ls));

// ---------- 4) หมุดแผนที่ ----------
const mapBox = { window: {}, document: undefined, console };
mapBox.self = mapBox.window;
vm.runInNewContext(read('listmap.js'), mapBox);
const NJLM = mapBox.window.NJListMap || mapBox.NJListMap;
ok('หมุดเช่า "฿30,000/ด."', NJLM && NJLM.priceLabel(30000, true) === '฿30,000/ด.', NJLM && NJLM.priceLabel(30000, true));
ok('หมุดขายเหมือนเดิม', NJLM && NJLM.priceLabel(3500000) === '฿3.5 ล้าน' && NJLM.priceLabel(950000) === '฿950,000');

// ---------- 5) คำบรรยาย SEO + หน้าสแตติก ----------
const META = require('./landmeta.js');
const V = global.window.NJVocab || {};
const dSell = META.metaDesc({ id: 'OP-S', type: 'sell', estValue: 4000000, pricePerWa: 10000, land: {} }, V);
const dRent = META.metaDesc({ id: 'OP-R', type: 'rent', estValue: 30000, pricePerWa: 0, land: {} }, V);
ok('คำบรรยายขาย: "ราคา 4,000,000 บาท" แบบเดิม', /ราคา 4,000,000 บาท · 10,000 บาท\/ตร\.ว\./.test(dSell), dSell);
ok('คำบรรยายเช่า: "ค่าเช่า 30,000 บาท/เดือน"', /ค่าเช่า 30,000 บาท\/เดือน/.test(dRent) && !/ราคา 30,000/.test(dRent), dRent);
const props = read('build/properties.js');
ok('หน้าแปลงสแตติก: ค่าเช่า/เดือน + ต่อหน่วยจากก้อน rent · ขายแบบเดิม',
  /add\('ค่าเช่า', baht\(monthly\) \+ ' บาท\/เดือน'\)/.test(props) && /if \(!rent && Number\(l\.estValue\) > 0\) add\('ราคา'/.test(props));
const locs = read('build/locations.js');
ok('หน้าพื้นที่: ข้อความเช่าขึ้นเฉพาะเมื่อมีประกาศเช่าจริง', /const rents = items\.filter\(\(x\) => x\.type === 'rent'\);\s*if \(rents\.length\)/.test(locs));

// ---------- 6) ฟอร์มฝากเช่า ----------
const lf = read('landform.js');
ok('ฟอร์ม: ป้ายค่าเช่าต่อเดือนเมื่อเลือกฝากเช่า', /ค่าเช่าต่อตารางวา ต่อเดือน \(บาท\)/.test(lf) && /ค่าเช่าที่ต้องการ \(ต่อเดือน\)/.test(lf));
ok('ฟอร์มขายไม่ส่ง dealName = ป้ายเดิม', /if \(!opt\.dealName\) return false;/.test(lf));
ok('หน้าฝากขายส่ง dealName/priceTitle', /dealName: 'type', priceTitle: 'cs-price-title'/.test(read('consign.js')) && /id="cs-price-title"/.test(read('consign.html')));
ok('ช่อง rentMonth ไม่วาดซ้ำในกลุ่มค่าเช่า (กรอกในกลุ่มราคา)', /filter\(function \(k\) \{ return k !== 'rentMonth'; \}\)/.test(read('consign.js')));
const P = require('./consignpreview.js');
if (P && P.model) {
  const m = P.model({ type: 'rent', estValue: 20000, priceUnit: 'wa', unitPrice: 50, title: 'x' });
  ok('ตัวอย่างประกาศ: ค่าเช่า /เดือน', m && /\/เดือน/.test(m.price), m && m.price);
}

console.log('\nสรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
