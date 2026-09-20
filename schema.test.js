'use strict';
// ---------- เทสต์ build/schema.js — ตัวเขียนข้อมูลโครงสร้าง (JSON-LD) ลงหัวไฟล์ HTML ----------
// รัน: node schema.test.js   (ไม่มี dependency ภายนอก)

const fs = require('fs');
const path = require('path');
const C = require('./build/schema.js');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (extra ? ('  → ' + extra) : '')); }
}
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label, 'ได้ ' + JSON.stringify(a) + ' ควรเป็น ' + JSON.stringify(b)); }

const ROOT = __dirname;
const files = fs.readdirSync(ROOT).filter(f => /\.html$/i.test(f)).sort();
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const BRAND = C.readBrand(read('index.html'));

// อ่านบล็อกที่ build/schema.js เขียนไว้ในไฟล์จริง
function blockOf(file) {
  const m = read(file).match(/<script type="application\/ld\+json" data-nj-schema>([\s\S]*?)<\/script>/);
  return m ? m[1] : null;
}
function graphOf(file) {
  const b = blockOf(file);
  if (!b) return null;
  return JSON.parse(b)['@graph'];
}
const typesOf = n => [].concat(n['@type']);
const findType = (g, t) => (g || []).filter(n => typesOf(n).indexOf(t) >= 0);

console.log('\n1) ⭐ ข้อมูลบริษัทอ่านจาก index.html ไม่ได้พิมพ์ซ้ำในโค้ด');
const src = fs.readFileSync(path.join(ROOT, 'build', 'schema.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
ok(src.indexOf('162-0405') < 0 && src.indexOf('เอ็นเจ แอนด์ คอนซัลติ้ง') < 0 && src.indexOf('121/124') < 0,
  '⭐ เบอร์ · ชื่อนิติบุคคล · ที่อยู่ ไม่ได้ฝังในตัวสร้าง');
ok(src.indexOf('"351"') < 0 && src.indexOf('ใบอนุญาต') < 0, 'เลขใบอนุญาตก็ไม่ได้ฝัง');
ok(BRAND.org['@id'] === 'https://njteedinsure.com/#org' && !!BRAND.org.name, 'อ่าน @id และชื่อบริษัทจาก index.html ได้');
ok(BRAND.site['@id'] === 'https://njteedinsure.com/#website', 'อ่าน @id ของเว็บไซต์ได้');
ok(BRAND.org.telephone === undefined && BRAND.org.address === undefined,
  'คัดมาเฉพาะช่องที่จำเป็น — เบอร์/ที่อยู่ไม่ถูกทำซ้ำลงทุกหน้า');
let threw = '';
try { C.readBrand('<html><head><title>x</title></head><body></body></html>'); } catch (e) { threw = e.message; }
ok(/JSON-LD/.test(threw), 'ไม่มีบล็อกของ index.html = ล้มดังๆ ไม่ใช่เดาข้อมูลบริษัทเอง');

console.log('\n2) ⭐ กติกาข้อ 5 — หน้า noindex ไม่ได้บล็อกนี้');
const noidxFiles = files.filter(f => {
  const html = read(f);
  const r = C.headRange(html);
  return C.isNoindex(C.stripManaged(html.slice(r.start, r.end)));
});
ok(noidxFiles.length >= 5, 'มีหน้า noindex ให้ตรวจจริง (' + noidxFiles.length + ' หน้า)');
eq(noidxFiles.filter(f => blockOf(f)), [], '⭐ ไม่มีหน้า noindex ไหนมีบล็อกข้อมูลโครงสร้าง');
ok(noidxFiles.indexOf('404.html') >= 0, 'หน้า 404 อยู่ในกลุ่มนั้น');

console.log('\n3) หน้าที่ตั้งใจข้าม');
Object.keys(C.SKIP).forEach(f => {
  ok(!blockOf(f), f + ' ไม่มีบล็อก (ข้ามตามที่ตั้งใจ)');
  ok(String(C.SKIP[f]).length > 30, f + ' มีเหตุผลกำกับ');
});

console.log('\n4) ⭐ ทุกบล็อกเป็น JSON ที่อ่านออก และอ้างอิงกันได้ในหน้าเดียวกัน');
const withBlock = files.filter(f => blockOf(f));
ok(withBlock.length >= 12, 'มีหน้าที่ได้บล็อก ' + withBlock.length + ' หน้า');
const badJson = [], dangling = [];
withBlock.forEach(f => {
  let g = null;
  try { g = graphOf(f); } catch (e) { badJson.push(f + ': ' + e.message); return; }
  if (!Array.isArray(g)) { badJson.push(f + ': ไม่มี @graph'); return; }
  const ids = {};
  g.forEach(n => { if (n['@id']) ids[n['@id']] = 1; });
  // index.html มีโหนดบริษัท/เว็บไซต์อยู่ในบล็อกที่เขียนด้วยมือบนหน้าเดียวกัน
  if (f === 'index.html') { ids[BRAND.org['@id']] = 1; ids[BRAND.site['@id']] = 1; }
  JSON.stringify(g).replace(/\{"@id":"([^"]+)"\}/g, (m, id) => { if (!ids[id]) dangling.push(f + ' → ' + id); return m; });
});
eq(badJson, [], 'ทุกบล็อกเป็น JSON ที่อ่านออก');
eq(dangling, [], '⭐ ไม่มีการอ้าง @id ที่ไม่มีอยู่ในหน้าเดียวกัน');

console.log('\n5) เส้นทางนำทาง (BreadcrumbList)');
const home = graphOf('index.html');
eq(findType(home, 'BreadcrumbList').length, 0, 'หน้าแรกไม่มี breadcrumb (มีขั้นเดียว)');
eq(findType(home, 'Organization').length + findType(home, 'WebSite').length, 0,
  '⭐ หน้าแรกไม่ใส่ข้อมูลบริษัท/เว็บไซต์ซ้ำ (มีที่เขียนด้วยมืออยู่แล้ว)');
const gg = graphOf('guides.html');
const bc = findType(gg, 'BreadcrumbList')[0];
eq(bc.itemListElement.length, 2, 'เว็บนี้แบนราบ — หน้าแรก แล้วหน้านี้');
eq([bc.itemListElement[0].name, bc.itemListElement[0].item], ['หน้าแรก', C.HOME], 'ขั้นแรกคือหน้าแรก');
eq(bc.itemListElement[1].item, 'https://njteedinsure.com/guides.html', 'ขั้นที่สองคือหน้านี้');
ok(bc.itemListElement[1].name.indexOf('|') < 0 && bc.itemListElement[1].name.indexOf('ที่ดินชัวร์') < 0,
  'ชื่อหน้าถูกตัดส่วนท้ายของ <title> ออกแล้ว');
eq(C.pageName('<title>ก — ข ค | ที่ดินชัวร์</title>'), 'ก', 'ตัดทั้ง " | " และ " — "');

console.log('\n6) ⭐ กติกาข้อ 3 — FAQ มาจากคำถามจริงในหน้า');
const faqFiles = withBlock.filter(f => findType(graphOf(f), 'FAQPage').length);
eq(faqFiles, ['consign.html', 'inspect.html', 'portal.html', 'verify.html', 'wanted.html'],
  '⭐ มี FAQPage เฉพาะ 5 หน้าที่มีคำถาม–คำตอบจริง');
const mismatch = [], emptyA = [], tagLeft = [];
faqFiles.forEach(f => {
  const html = read(f);
  const n = (html.match(/<details\b/gi) || []).length;
  const q = findType(graphOf(f), 'FAQPage')[0].mainEntity;
  if (q.length !== n) mismatch.push(f + ': ' + q.length + '/' + n);
  q.forEach(x => {
    if (!x.acceptedAnswer || !String(x.acceptedAnswer.text).trim()) emptyA.push(f + ' → ' + x.name);
    if (/<[a-z/]/i.test(x.name + x.acceptedAnswer.text)) tagLeft.push(f + ' → ' + x.name);
    if (html.indexOf(x.name) < 0) mismatch.push(f + ': คำถามไม่มีในหน้า — ' + x.name);
  });
});
eq(mismatch, [], '⭐ จำนวนคำถามตรงกับ <details> ในหน้า และทุกคำถามมีอยู่จริงในหน้า');
eq(emptyA, [], 'ทุกคำถามมีคำตอบ');
eq(tagLeft, [], 'ไม่มีแท็ก HTML ติดไปในข้อความ');
eq(C.faqOf('<h2>หัวข้ออื่น</h2><details><summary>ถาม</summary><div>ตอบ</div></details>'), [],
  '⭐ หน้าที่ไม่มีหัวข้อ "' + C.FAQ_HEADING + '" ไม่ถูกทำเป็น FAQ แม้จะมี <details>');
eq(C.faqOf('<h2>' + C.FAQ_HEADING + '</h2><details><summary>ถาม</summary><div>  </div></details>'), [],
  'คำตอบว่าง = ไม่นับเป็นคำถามจริง');

console.log('\n7) ⭐ กติกาข้อ 4 — VideoObject เฉพาะคลิปที่มีไฟล์จริง');
const vids = findType(graphOf('videos.html'), 'VideoObject');
ok(vids.length >= 4, 'มีคลิปในข้อมูลโครงสร้าง ' + vids.length + ' รายการ');
const noFile = [], noDate = [], hasDur = [], badThumb = [];
vids.forEach(v => {
  const rel = String(v.contentUrl).replace(C.SITE + '/', '');
  if (!fs.existsSync(path.join(ROOT, rel))) noFile.push(rel);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v.uploadDate))) noDate.push(v['@id']);
  if (v.duration !== undefined) hasDur.push(v['@id']);
  if (v.thumbnailUrl && !fs.existsSync(path.join(ROOT, String(v.thumbnailUrl).replace(C.SITE + '/', '')))) badThumb.push(v.thumbnailUrl);
});
eq(noFile, [], '⭐ ทุกคลิปมีไฟล์อยู่จริงบนดิสก์');
eq(noDate, [], 'ทุกคลิปมีวันเผยแพร่ในรูปแบบวันที่');
eq(hasDur, [], '⭐ ไม่ใส่ความยาวคลิป (อ่านของจริงไม่ได้ ก็ไม่เดา)');
eq(badThumb, [], 'รูปปกที่อ้างถึงมีอยู่จริง');
const warn = [];
eq(C.clipsOf('<html><script>var VIDEOS = [{ id: "ไม่มีไฟล์นี้", title: "x" }];</script></html>', warn), [],
  'คลิปที่ไม่มีไฟล์ถูกข้าม');
ok(warn.some(w => /ไม่มีไฟล์/.test(w)), 'และขึ้นคำเตือน ไม่หายเงียบ');

console.log('\n8) ⭐ ไม่มีคำรับปากและไม่มีข้อมูลที่เราไม่มีจริง');
const banned = ['รับประกัน', 'การันตี', 'aggregateRating', 'reviewCount', 'ratingValue', 'priceRange', 'openingHours'];
const found = [];
withBlock.forEach(f => { const b = blockOf(f); banned.forEach(w => { if (b.indexOf(w) >= 0) found.push(f + ' → ' + w); }); });
eq(found, [], '⭐ ไม่มีรีวิว เรตติ้ง ราคา เวลาทำการ หรือคำรับประกันในข้อมูลโครงสร้าง');

console.log('\n9) ⭐ กติกาข้อ 6 — รันซ้ำได้ผลเท่าเดิม');
const sample = read('guides.html');
const w = [];
const first = C.applyToHtml(sample, 'guides.html', BRAND, w);
const second = C.applyToHtml(first.html, 'guides.html', BRAND, w);
eq(second.changed, false, 'รอบที่สองไม่มีอะไรเปลี่ยน');
eq(second.html, first.html, 'เนื้อไฟล์เท่าเดิมทุกตัวอักษร');
const dup = withBlock.filter(f => (read(f).match(/data-nj-schema/g) || []).length !== 1);
eq(dup, [], 'ทุกหน้ามีบล็อกที่ระบบดูแลอันเดียว');
ok((read('index.html').match(/application\/ld\+json/g) || []).length === 2,
  '⭐ index.html มีสองบล็อก — ของเดิมที่เขียนด้วยมือ กับของที่ระบบเขียน (ไม่ทับกัน)');
ok(read('index.html').indexOf('"telephone"') >= 0, '⭐ บล็อกเดิมของ index.html ไม่ถูกแตะ');

console.log('\n10) หน้าแต่ละหน้ามี WebPage ที่ชี้ที่อยู่ถูก');
const wrong = [];
withBlock.forEach(f => {
  const p = findType(graphOf(f), 'WebPage')[0];
  if (!p) { wrong.push(f + ': ไม่มี WebPage'); return; }
  const want = f === 'index.html' ? C.HOME : C.SITE + '/' + f;
  if (p.url !== want) wrong.push(f + ': ' + p.url);
  if (!p.name) wrong.push(f + ': ไม่มีชื่อหน้า');
  if (p.inLanguage !== C.LANG) wrong.push(f + ': ภาษาไม่ถูก');
});
eq(wrong, [], 'ทุกหน้ามี WebPage ที่ชี้ที่อยู่ของตัวเองและมีชื่อหน้า');

console.log('\n== สรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + ' ==');
process.exit(fail ? 1 : 0);
