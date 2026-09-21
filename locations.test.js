/* หน้าพื้นที่ (จังหวัด/อำเภอ) — สปรินต์ 3 รอบ ข
 *   รันด้วย:  node locations.test.js
 *
 * ทำไมต้องมี: ข้อกำหนดงานที่ 6 สั่งสองอย่างที่พังเงียบได้ทั้งคู่
 *   1. หน้าพื้นที่ต้องเกิดจาก "แอดมินกดเผยแพร่" เท่านั้น — ห้ามสร้างจากรายชื่อจังหวัดที่มีแปลง
 *   2. ห้ามมี "หน้าจังหวัดที่เปลี่ยนแค่ชื่อ" — หน้าที่ไม่มีเนื้อหาจริงลากทั้งเว็บลงไปด้วย
 * และตัวสร้างเขียนไฟล์ลงดิสก์จริง ที่อยู่ที่ผิดรูปเพียงรายการเดียวเขียนทับหน้าแรกของเว็บได้
 *
 * ⚠️ ตรวจ "ผลลัพธ์ที่ commit ไว้" + ฟังก์ชันจริง ไม่ยิง API — CI รันได้โดยไม่ต้องต่อเน็ต
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LOC = require('./build/locations.js');
const META = require('./landmeta.js');

const NL = String.fromCharCode(10);
let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 220) : '')); }
}

// ---------- ข้อมูลตัวอย่าง ----------
const INTRO = 'ปทุมธานีเป็นพื้นที่ที่ทีมช่างรังวัดลงพื้นที่บ่อย แปลงส่วนใหญ่อยู่ในคลองหลวงและธัญบุรี ' +
  'ทีมงานตรวจแนวเขตและเอกสารสิทธิ์ให้ก่อนประกาศขายทุกแปลง';
const PROV = { path: 'locations/ปทุมธานี/', province: 'ปทุมธานี', amphoe: '', title: 'ที่ดินปทุมธานี | ที่ดินชัวร์', description: 'รวมที่ดินปทุมธานี', intro: INTRO, parentPath: '' };
const AMP = { path: 'locations/ปทุมธานี/คลองหลวง/', province: 'ปทุมธานี', amphoe: 'คลองหลวง', title: 'ที่ดินคลองหลวง | ที่ดินชัวร์', description: 'ที่ดินคลองหลวง', intro: INTRO, parentPath: 'locations/ปทุมธานี/' };
const VOCAB = { DEED_TH: { chanote: 'โฉนด (น.ส.4)' }, PROPERTY_TH: { land: 'ที่ดินเปล่า' } };
const L1 = { id: 'OP-001', type: 'sell', estValue: 8500000, pricePerWa: 8947, updatedAt: '2026-09-20T00:00:00.000Z',
  land: { province: 'ปทุมธานี', amphoe: 'คลองหลวง', tambon: 'คลองหนึ่ง', deedArea: '2-1-50', deedType: 'chanote' } };
const L2 = { id: 'OP-002', type: 'sell', estValue: 3200000, pricePerWa: 16000, updatedAt: '2026-09-21T00:00:00.000Z',
  land: { province: 'ปทุมธานี', amphoe: 'ธัญบุรี', tambon: 'ประชาธิปัตย์', deedArea: '1-0-00' } };
const L3 = { id: 'OP-003', type: 'sell', estValue: 1000000, updatedAt: '2026-09-19T00:00:00.000Z',
  land: { province: 'นครปฐม', amphoe: 'สามพราน' } };

console.log('\n1) ⭐ ด่านที่อยู่ของหน้า — กันรายการที่ตั้ง path ผิดไปเขียนทับหน้าจริงของเว็บ');
ok('รับที่อยู่ระดับจังหวัด', LOC.areaPathOk('locations/ปทุมธานี/'));
ok('รับที่อยู่ระดับอำเภอ', LOC.areaPathOk('locations/ปทุมธานี/คลองหลวง/'));
ok('⭐ ปฏิเสธ index.html (ของจริงตั้งแบบนี้ได้ ระบบไม่ได้ห้าม)', !LOC.areaPathOk('index.html'));
ok('ปฏิเสธหน้าอื่นของเว็บ', !LOC.areaPathOk('listings.html'));
ok('ปฏิเสธที่อยู่ที่ไม่ปิดด้วยทับ', !LOC.areaPathOk('locations/ปทุมธานี'));
ok('ปฏิเสธการไต่ขึ้นโฟลเดอร์แม่', !LOC.areaPathOk('locations/../index.html/'));
ok('ปฏิเสธจุดเดี่ยว', !LOC.areaPathOk('locations/./'));
ok('ปฏิเสธแบ็กสแลช (วินโดวส์)', !LOC.areaPathOk('locations/a\\b/'));
ok('ปฏิเสธอักขระที่แบ่งส่วนของที่อยู่', !LOC.areaPathOk('locations/a?b/') && !LOC.areaPathOk('locations/a#b/') && !LOC.areaPathOk('locations/a%2f/'));
ok('ปฏิเสธที่อยู่ลึกเกินสองชั้น', !LOC.areaPathOk('locations/a/b/c/'));
ok('ค่าที่ไม่ใช่ข้อความไม่ทำให้พัง', !LOC.areaPathOk(null) && !LOC.areaPathOk(undefined) && !LOC.areaPathOk(12));

console.log('\n2) ⭐ หัวข้อของหน้า — ไม่เติมคำว่า "อำเภอ" หรือ "เขต" ให้เอง');
ok('หน้าจังหวัด', LOC.areaHeading(PROV) === 'ที่ดินในปทุมธานี', LOC.areaHeading(PROV));
ok('หน้าอำเภอ', LOC.areaHeading(AMP) === 'ที่ดินในคลองหลวง ปทุมธานี', LOC.areaHeading(AMP));
ok('⭐ ไม่เดาคำนำหน้าเขตการปกครอง (กทม.ใช้ "เขต" ต่างจังหวัดใช้ "อำเภอ")',
   !/อำเภอ|เขต/.test(LOC.areaHeading(AMP)));
ok('ไม่มีจังหวัด = ไม่มีหัวข้อ ไม่ใช่เดาแทน', LOC.areaHeading({ province: '', amphoe: 'x' }) === '');
ok('ป้ายสั้นของหน้าอำเภอมีจังหวัดกำกับ', LOC.areaLabel(AMP) === 'คลองหลวง · ปทุมธานี');

console.log('\n3) ⭐ แปลงที่อยู่ในพื้นที่ — เทียบตรงตัว ไม่เดาจากข้อความ');
ok('หน้าจังหวัดได้ทุกอำเภอในจังหวัดนั้น', LOC.inArea(L1, PROV) && LOC.inArea(L2, PROV));
ok('หน้าจังหวัดไม่ดูดแปลงจังหวัดอื่น', !LOC.inArea(L3, PROV));
ok('หน้าอำเภอกรองถึงระดับอำเภอ', LOC.inArea(L1, AMP) && !LOC.inArea(L2, AMP));
ok('⭐ แปลงที่ยังไม่กรอกจังหวัดไม่ขึ้นหน้าไหนเลย',
   !LOC.inArea({ id: 'X', land: {}, parcelInfo: 'ที่ดินปทุมธานีแปลงสวย' }, PROV));
ok('ช่องว่างหัวท้ายไม่ทำให้พลาด', LOC.inArea({ id: 'Y', land: { province: ' ปทุมธานี ' } }, PROV));
const sorted = LOC.sortItems([L1, L2, L3]).map((x) => x.id);
ok('เรียงใหม่สุดก่อน และผลเหมือนเดิมทุกครั้ง', sorted.join(',') === 'OP-002,OP-001,OP-003', sorted.join(','));

console.log('\n4) ⭐ เนื้อหาของหน้าพื้นที่');
const body = LOC.bodyHtml(PROV, [L1, L2], [Object.assign({}, AMP, { count: 1 })], META, VOCAB);
ok('มีหัวข้อเดียว', (body.match(/<h1/g) || []).length === 1);
ok('เนื้อหาที่คนเขียนอยู่ในหน้า', body.indexOf('ทีมงานตรวจแนวเขต') >= 0);
ok('ลิงก์ไปหน้าแปลงเป็นที่อยู่จริงของแปลงนั้น', body.indexOf(META.encUrl(META.pagePath(L1, VOCAB))) >= 0);
ok('บอกจำนวนแปลงตามจริง', body.indexOf('(2 แปลง)') >= 0);
ok('⭐ บรรทัดกำกับว่าข้อมูลเป็น ณ ตอนสร้างหน้า ห้ามตัดทิ้ง', body.indexOf('ข้อมูลล่าสุดตอนสร้างหน้านี้') >= 0);
ok('มีทางกลับไปดัชนีและหน้ารวมประกาศ', body.indexOf('/locations.html') >= 0 && body.indexOf('/listings.html') >= 0);
ok('หน้าอำเภอมีลิงก์กลับหน้าจังหวัดใน breadcrumb',
   LOC.bodyHtml(AMP, [L1], [], META, VOCAB).indexOf(META.encUrl(AMP.parentPath)) >= 0);
const empty = LOC.bodyHtml({ path: 'locations/ระยอง/', province: 'ระยอง', amphoe: '', intro: INTRO }, [], [], META, VOCAB);
ok('⭐ ไม่มีแปลง = บอกตรงๆ ไม่เติมแปลงจากพื้นที่ข้างเคียง', empty.indexOf('ยังไม่มีแปลงที่ประกาศอยู่ในพื้นที่นี้') >= 0);
ok('ไม่มีแปลง = ไม่พิมพ์จำนวนในวงเล็บ', empty.indexOf('(0 แปลง)') < 0);
const xss = LOC.bodyHtml(Object.assign({}, PROV, { intro: '<img src=x onerror=alert(1)>' }), [], [], META, VOCAB);
ok('⭐ เนื้อหาจากช่องกรอกถูก escape', xss.indexOf('<img src=x') < 0 && xss.indexOf('&lt;img') >= 0);

console.log('\n5) ⭐ ห้ามมีถ้อยคำรับประกันในหน้าที่สร้างขึ้น');
const BAD = ['รับประกัน', 'การันตี', 'แน่นอน 100', 'ปลอดภัย 100', 'คุ้มที่สุด', 'ทำเลทอง'];
BAD.forEach((w) => ok('ไม่มีคำว่า "' + w + '"', body.indexOf(w) < 0 && empty.indexOf(w) < 0));

console.log('\n6) หน้าดัชนี');
const idxEmpty = LOC.indexHtml([], () => 0, META);
ok('ยังไม่มีพื้นที่ไหนเผยแพร่ = บอกตรงๆ', idxEmpty.indexOf('ยังไม่มีหน้าพื้นที่ที่เผยแพร่') >= 0);
ok('หน้าดัชนีมีหัวข้อของตัวเองเสมอ', (idxEmpty.match(/<h1/g) || []).length === 1);
const idx = LOC.indexHtml([PROV, AMP], (a) => (a.amphoe ? 1 : 2), META);
ok('ดัชนีลิงก์ไปหน้าจังหวัดและหน้าอำเภอ',
   idx.indexOf(META.encUrl(PROV.path)) >= 0 && idx.indexOf(META.encUrl(AMP.path)) >= 0);
const orphan = LOC.indexHtml([AMP], () => 0, META);
ok('⭐ จังหวัดที่เผยแพร่เฉพาะหน้าอำเภอ ต้องไม่หายจากดัชนี', orphan.indexOf('ปทุมธานี') >= 0);
ok('จังหวัดที่ยังไม่มีหน้าของตัวเองไม่ถูกทำเป็นลิงก์เสีย', orphan.indexOf('href="//"') < 0);

console.log('\n7) ⭐ ข้อมูลโครงสร้าง — ต้องเป็นของหน้านั้น ไม่ใช่ของหน้าดัชนี');
const TPLG = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', '@id': 'https://njteedinsure.com/#website' },
    { '@type': 'WebPage', '@id': 'https://njteedinsure.com/locations.html#webpage', url: 'https://njteedinsure.com/locations.html', name: 'ดัชนี', description: 'x', breadcrumb: { '@id': 'https://njteedinsure.com/locations.html#breadcrumb' } },
    { '@type': 'BreadcrumbList', '@id': 'https://njteedinsure.com/locations.html#breadcrumb', itemListElement: [] }
  ]
};
const url = 'https://njteedinsure.com/locations/x/';
const g = LOC.graphFor(TPLG, { url: url, name: 'ที่ดินในปทุมธานี', desc: 'คำอธิบาย', crumbs: [{ name: 'หน้าแรก', url: 'https://njteedinsure.com/' }, { name: 'ปทุมธานี', url: url }], items: [{ name: 'แปลง', url: url + 'a/' }] });
const wp = g['@graph'].find((x) => x['@type'] === 'WebPage');
const bc = g['@graph'].find((x) => x['@type'] === 'BreadcrumbList');
const il = g['@graph'].find((x) => x['@type'] === 'ItemList');
ok('WebPage ชี้ที่อยู่ของหน้านั้น', wp.url === url && wp['@id'] === url + '#webpage');
ok('WebPage ใช้ชื่อและคำอธิบายของหน้านั้น', wp.name === 'ที่ดินในปทุมธานี' && wp.description === 'คำอธิบาย');
ok('breadcrumb ชี้ก้อนของหน้านั้น', wp.breadcrumb['@id'] === url + '#breadcrumb' && bc['@id'] === url + '#breadcrumb');
ok('breadcrumb มีรายการตามที่ส่งไป', bc.itemListElement.length === 2 && bc.itemListElement[1].name === 'ปทุมธานี');
ok('ItemList นับตามจำนวนที่แสดงจริง', il && il.numberOfItems === 1);
ok('⭐ ต้นแบบไม่ถูกแก้ (คัดลอกก่อนเขียน)', TPLG['@graph'][1].url === 'https://njteedinsure.com/locations.html');
ok('ไม่มีแปลง = ไม่มี ItemList', !LOC.graphFor(TPLG, { url: url, name: 'a', desc: 'b', crumbs: [], items: [] })['@graph'].some((x) => x['@type'] === 'ItemList'));
const raw = JSON.stringify(g);
ok('⭐ ไม่มีรีวิว เรตติ้ง หรือราคาในข้อมูลโครงสร้าง',
   !/aggregateRating|reviewCount|ratingValue|"offers"/i.test(raw));

console.log('\n7b) ⭐ ต้นแบบที่ยังไม่มีบล็อก JSON-LD (ดัชนีว่าง = noindex · schema.js ถอดออกให้)');
const BARE = '<html><head><title>x</title><meta name="description" content="y"><link rel="canonical" href="https://njteedinsure.com/locations.html"></head><body>' +
  '<!-- nj-locbody:start --><p>เดิม</p><!-- nj-locbody:end --></body></html>';
const bare = LOC.render(BARE, PROV, '<p>ใหม่</p>', g);
ok('⭐ หน้าพื้นที่หน้าแรกที่ทีมเผยแพร่ต้องได้ JSON-LD ด้วย', /nj-schema:start/.test(bare) && /application\/ld\+json/.test(bare));
ok('ไม่ใส่บล็อกซ้ำ', (bare.match(/nj-schema:start/g) || []).length === 1);
ok('เนื้อหาถูกแทนที่', bare.indexOf('<p>ใหม่</p>') >= 0 && bare.indexOf('<p>เดิม</p>') < 0);
ok('canonical ชี้หน้าพื้นที่นั้น ไม่ใช่ดัชนี', bare.indexOf(encodeURI('https://njteedinsure.com/' + PROV.path)) >= 0);
const twice = LOC.render(bare, PROV, '<p>ใหม่</p>', g);
ok('⭐ ประกอบซ้ำจากผลลัพธ์เดิมแล้วยังมีบล็อกเดียว', (twice.match(/nj-schema:start/g) || []).length === 1);

console.log('\n8) แผนผังเว็บ');
const xml = LOC.xmlFor([{ path: 'locations/ปทุมธานี/', updatedAt: '2026-09-21T10:00:00.000Z' }]);
ok('เข้ารหัสที่อยู่ภาษาไทยก่อนเขียนลงไฟล์', xml.indexOf('%E0%B8%9B') >= 0 && xml.indexOf('<loc>https://njteedinsure.com/locations/ปทุมธานี') < 0);
ok('lastmod เป็นวันที่ล้วน', /<lastmod>2026-09-21<\/lastmod>/.test(xml));
ok('ไม่มี priority/changefreq (งานที่ 3 ห้ามไว้)', !/priority|changefreq/.test(xml));
ok('ไม่มี lastmod เมื่อไม่รู้วันที่', LOC.xmlFor([{ path: 'locations/a/' }]).indexOf('lastmod') < 0);

console.log('\n9) บรรทัด Sitemap ใน robots.txt');
const BASE = read('robots.txt').split('\n').filter((l) => l.indexOf('locations.xml') < 0).join('\n');
const on1 = LOC.robotsWith(BASE, true);
ok('เพิ่มบรรทัดเมื่อมีหน้าพื้นที่', on1.indexOf('Sitemap: https://njteedinsure.com/sitemaps/locations.xml') >= 0);
ok('วางต่อจากแผนผังหน้าแปลง', on1.indexOf('properties.xml') < on1.indexOf('locations.xml'));
ok('⭐ ใส่ซ้ำไม่ทำให้มีสองบรรทัด', (LOC.robotsWith(on1, true).match(/sitemaps\/locations\.xml/g) || []).length === 2);
ok('⭐ ไม่มีหน้าพื้นที่ = ถอดบรรทัดออก (ไม่ชี้ไปไฟล์ที่ไม่มีอยู่)', LOC.robotsWith(on1, false).indexOf('locations.xml') < 0);
ok('ถอดแล้วไม่กระทบแผนผังอื่น', LOC.robotsWith(on1, false).indexOf('sitemaps/properties.xml') >= 0);

console.log('\n10) ⭐ ตัวแทนที่เนื้อหา — รันซ้ำต้องได้ผลเท่าเดิม');
const tpl = read('locations.html');
ok('ต้นแบบมีเครื่องหมายขอบเขตครบ', tpl.indexOf('nj-locbody:start') >= 0 && tpl.indexOf('nj-locbody:end') >= 0);
const one = LOC.replaceBody(tpl, '<p>ก</p>');
const two = LOC.replaceBody(one, '<p>ก</p>');
ok('⭐ แทนที่สองรอบได้ผลเท่ากัน (ไม่มีเนื้อหาซ้อน)', one === two);
ok('เนื้อหาเก่าถูกแทนที่จริง', LOC.replaceBody(one, '<p>ข</p>').indexOf('<p>ก</p>') < 0);
ok('ต้นแบบที่ไม่มีเครื่องหมายต้องล้มดังๆ', (() => { try { LOC.replaceBody('<html></html>', 'x'); return false; } catch (e) { return true; } })());

console.log('\n11) ⭐ กติกาที่อ่านจากซอร์สของตัวสร้าง');
const gen = read('build/locations.js');
// ⚠️ ตัดบรรทัดคอมเมนต์ทิ้งก่อนตรวจ — คำเตือนที่หัวไฟล์ยกตัวอย่าง "ประโยคโฆษณาที่ห้ามเขียน" ไว้
//    ตรวจทั้งไฟล์เมื่อไหร่ ด่านนี้จะฟ้องคำเตือนของตัวเอง (กับดักเดียวกับด่าน q.flow ฝั่งระบบ)
const genCode = gen.split(NL).filter(function (l) { return !/^\s*\/\//.test(l); }).join(NL);
ok('⭐ ดึงข้อมูลไม่สำเร็จ = ไม่แตะไฟล์เดิม', /ไม่ได้แตะไฟล์เดิมเลยสักไฟล์/.test(gen));
ok('⭐ อ่านรายการจากเส้นทางหน้าพื้นที่ที่เผยแพร่แล้วเท่านั้น', /\/api\/public\/seo\/areas/.test(gen));
ok('⭐ ไม่มีรายชื่อจังหวัดฝังไว้ในตัวสร้าง (ห้ามสร้างหน้าจากจังหวัดที่มีแปลง)',
   !/ปทุมธานี|สมุทรปราการ|ชลบุรี|นนทบุรี/.test(genCode));
ok('⭐ ไม่มีประโยคโฆษณาสำเร็จรูป', !/ทำเลทอง|น่าลงทุน|ราคาดีที่สุด/.test(genCode));
ok('ที่อยู่ทุกอันเข้ารหัสก่อนเขียน', /encUrl|encodeURI/.test(gen));
// ⚠️ ประกอบช่วงอักขระจากรหัส ไม่เขียนไบต์ควบคุมลงไฟล์ตรงๆ —
//    เครื่องมือเขียนไฟล์บางตัวแปลงลำดับ escape เป็นไบต์จริง แล้ว git มองไฟล์เป็นไบนารี
const C = String.fromCharCode;
const CTRL_RE = new RegExp('[' + C(0) + '-' + C(8) + C(11) + C(12) + C(14) + '-' + C(31) + ']', 'g');
const ctrl = (gen.match(CTRL_RE) || []).length;
ok('⭐ ไม่มีไบต์ควบคุมดิบในซอร์ส (git จะมองไฟล์เป็นไบนารี แล้วอ่าน diff ไม่ออก)', ctrl === 0, ctrl + ' ตัว');

console.log('\n12) ⭐ สภาพของไฟล์ที่ commit ไว้ต้องสอดคล้องกันเอง');
const hasDir = fs.existsSync(path.join(ROOT, 'locations'));
const pages = hasDir ? (function walk(d, out) {
  for (const it of fs.readdirSync(d, { withFileTypes: true })) {
    const full = path.join(d, it.name);
    if (it.isDirectory()) walk(full, out); else if (it.name === 'index.html') out.push(full);
  }
  return out;
})(path.join(ROOT, 'locations'), []) : [];
const hasMap = fs.existsSync(path.join(ROOT, 'sitemaps', 'locations.xml'));
const robotsHas = read('robots.txt').indexOf('sitemaps/locations.xml') >= 0;
ok('มีหน้าพื้นที่ = ต้องมีแผนผังของมัน', pages.length === 0 || hasMap, pages.length + ' หน้า · แผนผัง ' + hasMap);
ok('มีแผนผัง = robots.txt ต้องชี้ไปด้วย', !hasMap || robotsHas);
ok('⭐ ไม่มีหน้าพื้นที่ = robots.txt ต้องไม่ชี้ไปไฟล์ที่ไม่มีอยู่', hasMap || !robotsHas);
const locBlock = (tpl.match(/<!-- nj-loc:start[\s\S]*?-->([\s\S]*?)<!-- nj-loc:end -->/) || [])[1] || '';
const locNoindex = /<meta[^>]+name="robots"[^>]+noindex/.test(locBlock);
ok('ดัชนีที่ยังว่างต้องไม่ถูกเก็บเข้าดัชนี (หน้าบาง)',
   pages.length > 0 || locNoindex);
ok('ดัชนีที่มีพื้นที่แล้วต้องเก็บดัชนีได้',
   pages.length === 0 || !locNoindex);
pages.forEach((f) => {
  const s = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  ok(rel + ' มีหัวข้อเดียว', (s.match(/<h1/g) || []).length === 1);
  ok(rel + ' ชี้ canonical มาที่ตัวเอง', s.indexOf(encodeURI('https://njteedinsure.com/' + rel.replace(/index\.html$/, ''))) >= 0);
});

console.log('\n' + (fail ? '❌' : '✅') + ' locations: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
