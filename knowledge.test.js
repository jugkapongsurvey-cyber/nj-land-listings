'use strict';
// ---------- เทสต์หน้าบทความความรู้ (build/knowledge.js · knowledge.html · knowledge.css) ----------
// ไม่ต่อเน็ต ไม่เขียนไฟล์ — ทดสอบตัววางแผนไฟล์ (plan) ด้วยข้อมูลสมมติ
const fs = require('fs');
const path = require('path');
const K = require('./build/knowledge');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (extra ? ('  → ' + extra) : '')); }
}
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const tpl = read('knowledge.html');

// 7 เสาเนื้อหาตามข้อกำหนดงานที่ 8 (ชุดเดียวกับ PILLARS ของ lib/kb.js ฝั่งระบบ)
const CATS = [
  ['before-buying', 'ตรวจสอบก่อนซื้อที่ดิน'], ['survey-boundary', 'งานรังวัดและแนวเขต'], ['selling-pricing', 'การขายและตั้งราคา'],
  ['law-title-deeds', 'กฎหมายและเอกสารสิทธิ'], ['zoning-development', 'ผังเมืองและพัฒนาโครงการ'],
  ['tax-transfer-costs', 'ภาษี ค่าโอน และค่าใช้จ่าย'], ['brokers-investors', 'ความรู้สำหรับนายหน้าและนักลงทุน']
].map((c, i) => ({ key: c[0], th: c[1], order: i }));
const BODY = 'ย่อหน้าแรก <script>alert(1)</script>\n\n## ตรวจโฉนดก่อน\nบรรทัดหนึ่ง\nบรรทัดสอง\n\n- ข้อหนึ่ง\n- ข้อสอง\n\n### หัวข้อย่อย\n## ถามสำนักงานที่ดิน\nจบ';
function art(n, over) {
  return Object.assign({
    id: 'KB-0000' + n, slug: 'บทความ-' + n, category: 'before-buying', type: 'guide',
    title: 'บทความที่ ' + n, excerpt: 'คำโปรยของบทความที่ ' + n + ' ยาวพอให้ผ่านเกณฑ์ขั้นต่ำห้าสิบตัวอักษรของระบบหลังบ้าน',
    body: BODY, toc: [{ id: 'h1', text: 'ตรวจโฉนดก่อน' }, { id: 'h2', text: 'ถามสำนักงานที่ดิน' }], tags: ['โฉนด'],
    cover: { url: '', alt: '' }, author: { name: 'สมชาย ช่างรังวัด', credential: 'ช่างรังวัดเอกชน' },
    reviewer: { name: 'สมหญิง', credential: '' }, sources: [{ label: 'กรมที่ดิน', url: 'https://www.dol.go.th/', date: '2026-09-01' }],
    faq: [{ q: 'ต้องใช้เอกสารอะไร', a: 'สำเนาโฉนด' }], related: { articles: [], services: [], listings: [] },
    links: [], version: 2, publishedAt: '2026-09-20T18:30:00.000Z', effectiveDate: '', reviewedAt: '2026-09-19T03:00:00.000Z', reviewDueDate: ''
  }, over || {});
}
const API = (arts) => ({ site: K.SITE, count: arts.length, categories: CATS, articles: arts });

console.log('\n1) ⭐ สร้างเฉพาะบทความที่ API ส่งมา');
const empty = K.plan(tpl, API([]));
ok(empty.files.has('knowledge.html') && empty.files.has('knowledge/index.html') && empty.files.size === 2, 'ไม่มีบทความ = หน้ารวม + หน้าพาไป (ไม่มีหน้าหมวดเปล่า ไม่มีแผนผัง)', Array.from(empty.files.keys()).join(','));
ok(/<meta name="robots" content="noindex, follow">/.test(empty.files.get('knowledge.html')), '⭐ ไม่มีบทความ = หน้ารวม noindex (หน้าบาง)');
ok(/ยังไม่มีบทความที่เผยแพร่/.test(empty.files.get('knowledge.html')), 'หน้ารวมบอกตรงๆ ว่ายังไม่มีบทความ');
ok(CATS.every((c) => empty.files.get('knowledge.html').indexOf(c.th) >= 0), 'หน้ารวมแสดงครบ 7 หมวด');
ok(!/href="\/knowledge\/before-buying\/"/.test(empty.files.get('knowledge.html')), '⭐ หมวดที่ยังไม่มีบทความไม่ทำเป็นลิงก์ (ไม่มีลิงก์เสีย)');

const two = K.plan(tpl, API([art(1), art(2, { category: 'survey-boundary', publishedAt: '2026-09-21T01:00:00.000Z' })]));
const keys = Array.from(two.files.keys()).sort();
ok(keys.indexOf('knowledge/before-buying/บทความ-1/index.html') >= 0 && keys.indexOf('knowledge/survey-boundary/บทความ-2/index.html') >= 0, 'หน้าบทความอยู่ที่ /knowledge/<หมวด>/<สลัก>/');
ok(keys.indexOf('knowledge/before-buying/index.html') >= 0 && keys.indexOf('knowledge/survey-boundary/index.html') >= 0, 'หน้าหมวดมีเฉพาะหมวดที่มีบทความ');
ok(keys.filter((k) => /^knowledge\/[^/]+\/index\.html$/.test(k)).length === 2, 'ไม่มีหน้าหมวดที่ไม่มีบทความ');
ok(keys.indexOf('sitemaps/knowledge.xml') >= 0, 'มีบทความ = มีแผนผัง');
ok(!/noindex/.test(two.files.get('knowledge.html')), 'มีบทความ = หน้ารวมเก็บดัชนีได้');

console.log('\n2) ⭐ ด่านหมวดและสลัก (ชื่อโฟลเดอร์)');
const bad = K.plan(tpl, API([art(1, { slug: '../../index' }), art(2, { slug: 'a/b' }), art(3, { category: 'no-such' }), art(4, { slug: 'x' }), art(5, { title: '' }), art(6), art(7, { slug: 'บทความ-6' })]));
ok(bad.articles.length === 1 && bad.articles[0].id === 'KB-00006', '⭐⭐ สลักมี ../ · มีทับ · หมวดไม่มีในทะเบียน · สั้นเกิน · ไม่มีชื่อ · ที่อยู่ซ้ำ = ข้ามทั้งหมด', bad.articles.map((a) => a.id).join(','));
ok(bad.skipped.length === 6 && bad.skipped.every((s) => s.why), 'ทุกบทความที่ข้ามมีเหตุผล');
ok(Array.from(bad.files.keys()).every((k) => k === 'sitemaps/knowledge.xml' || k === 'knowledge.html' || k.indexOf('knowledge/') === 0), '⭐ ไม่มีไฟล์ไหนหลุดออกนอก knowledge/');
ok(K.slugOk('ค่ารังวัด-2569') && K.slugOk('buy-land') && !K.slugOk('-x') && !K.slugOk('a.b') && !K.slugOk('ก ข'), 'ตัวตรวจสลักตรงกับ lib/kb.js (ไทย/อังกฤษ ตัวเลข ขีดกลาง)');

console.log('\n3) ⭐ เนื้อบทความเป็นข้อความ ไม่ใช่ HTML');
const h = K.bodyHtml(BODY);
ok(h.indexOf('<script>') < 0 && h.indexOf('&lt;script&gt;') >= 0, '⭐⭐ แท็กในเนื้อหาถูก escape ไม่ถูกวางดิบ');
ok(/<h2 id="h1">ตรวจโฉนดก่อน<\/h2>/.test(h) && /<h2 id="h2">ถามสำนักงานที่ดิน<\/h2>/.test(h), '⭐ id ของ h2 นับตรงกับสารบัญของ API (h1, h2)');
ok(/<h3>หัวข้อย่อย<\/h3>/.test(h) && !/id="h3"/.test(h), '### เป็น h3 และไม่ถูกนับในสารบัญ');
ok(/<ul><li>ข้อหนึ่ง<\/li><li>ข้อสอง<\/li><\/ul>/.test(h), '"- " เป็นรายการ');
ok(/<p>บรรทัดหนึ่ง<br>บรรทัดสอง<\/p>/.test(h), 'บรรทัดติดกันอยู่ย่อหน้าเดียว บรรทัดว่างแบ่งย่อหน้า');
ok(K.bodyHtml('a\r\n\r\nb') === '<p>a</p>\n<p>b</p>', 'รับข้อความที่ขึ้นบรรทัดแบบ CRLF');

console.log('\n4) หน้าบทความ');
const page = two.files.get('knowledge/before-buying/บทความ-1/index.html');
ok(/<title>บทความที่ 1 \| ความรู้ที่ดิน ที่ดินชัวร์<\/title>/.test(page), 'title ของบทความ');
ok(page.indexOf('<link rel="canonical" href="https://njteedinsure.com/knowledge/before-buying/%E0%B8%9A') >= 0, 'canonical เป็นที่อยู่เต็มที่เข้ารหัสแล้ว');
ok(/เขียนโดย <b>สมชาย ช่างรังวัด<\/b> \(ช่างรังวัดเอกชน\)/.test(page) && /ตรวจโดย <b>สมหญิง<\/b>/.test(page), 'แสดงผู้เขียน ผู้ตรวจ และคุณวุฒิ');
ok(/เผยแพร่ 21 ก\.ย\. 2569/.test(page), '⭐ วันเผยแพร่เป็นวันไทย (18:30Z = 21 ก.ย. ตามเวลาไทย ไม่ใช่ 20)');
ok(/<nav class="kb-toc"/.test(page) && /href="#h1"/.test(page), 'มีสารบัญเมื่อมีหัวข้อตั้งแต่ 2 ข้อ');
ok(/<dt>ต้องใช้เอกสารอะไร<\/dt><dd>สำเนาโฉนด<\/dd>/.test(page), 'คำถามที่พบบ่อย');
ok(/<a href="https:\/\/www\.dol\.go\.th\/" target="_blank" rel="noopener noreferrer">กรมที่ดิน<\/a> \(1 ก\.ย\. 2569\)/.test(page), 'แหล่งอ้างอิงพร้อมวันที่');
ok(page.indexOf(K.DISCLAIM) >= 0, '⭐⭐ ข้อความกำกับ (ไม่ใช่ความเห็นทางกฎหมาย/ไม่รับรองกรรมสิทธิ์) อยู่ทุกบทความ');
ok(!/noindex/.test(page) && page.indexOf('nj-kbidx') >= 0 && !/nj-kbidx:start[^>]*-->\s*<meta/.test(page), 'หน้าบทความเก็บดัชนีได้เสมอ');
ok(page.indexOf(K.MARK) >= 0, 'มีตัวบอกว่าตัวสร้างเป็นคนเขียน (ใช้ตอนลบหน้าที่ไม่มีแล้ว)');
ok((page.match(/<h1>/g) || []).length === 1, 'มี h1 หน้าละหนึ่งอัน');
const ld = JSON.parse(page.match(/data-nj-schema>\s*([\s\S]*?)\s*<\/script>/)[1]);
const types = ld['@graph'].map((x) => x['@type']);
ok(types.join() === 'Article,BreadcrumbList,FAQPage', 'JSON-LD: Article + Breadcrumb + FAQPage', types.join());
ok(ld['@graph'][0].author['@type'] === 'Person' && ld['@graph'][0].datePublished === '2026-09-21' && ld['@graph'][0].dateModified === '2026-09-19', 'ผู้เขียนเป็น Person · วันที่เป็นวันไทย');
ok(!/href="(?!https?:|\/|#|mailto:|tel:)[^"]+"/.test(page.replace(/<script[\s\S]*?<\/script>/g, '')), 'ที่อยู่ไฟล์ในหน้าย่อยเป็นแบบเต็มทั้งหมด (หน้าอยู่ในโฟลเดอร์ลึก)');
const cover = K.plan(tpl, API([art(1, { cover: { url: 'http://x.test/a.jpg', alt: 'ภาพ' } }), art(2, { cover: { url: 'https://x.test/b.jpg', alt: 'ภาพแปลง' } })]));
ok(cover.files.get('knowledge/before-buying/บทความ-1/index.html').indexOf('x.test/a.jpg') < 0, 'ภาพหน้าปกที่ไม่ใช่ https ไม่ถูกใช้');
ok(/<img src="https:\/\/x\.test\/b\.jpg" alt="ภาพแปลง"/.test(cover.files.get('knowledge/before-buying/บทความ-2/index.html')), 'ภาพหน้าปก https พร้อม alt');

console.log('\n5) ⭐ ลิงก์ภายในไม่เกินจำเป็น (งานที่ 9)');
const many = [1, 2, 3, 4, 5, 6, 7].map((n) => art(n, { publishedAt: '2026-09-1' + n + 'T00:00:00.000Z' }));
many[0].related.articles = ['KB-00007', 'KB-99999', 'KB-00001'];
const rel = K.relatedFor(many[0], K.clean(API(many)).articles);
ok(rel.length === K.RELATED_MAX, 'บทความที่เกี่ยวข้องไม่เกิน ' + K.RELATED_MAX + ' บทความ');
ok(rel[0].id === 'KB-00007' && rel.every((x) => x.id !== 'KB-00001'), 'รายการที่ทีมเลือกมาก่อน · ไม่ลิงก์หาตัวเอง · รหัสที่ไม่มีจริงถูกข้าม');
const META = { encUrl: encodeURI, pagePath: (l) => 'properties/x/' + l.id + '/', shortLabel: (l) => 'ที่ดิน ' + l.id };
const withL = K.plan(tpl, API([art(1, { related: { articles: [], services: [], listings: ['OP-001', 'OP-999'] } })]), { listings: [{ id: 'OP-001' }], META, VOCAB: {} });
const lp = withL.files.get('knowledge/before-buying/บทความ-1/index.html');
ok(/href="\/properties\/x\/OP-001\/"/.test(lp) && lp.indexOf('OP-999') < 0, '⭐ แปลงที่เกี่ยวข้องลิงก์เฉพาะแปลงที่ยังขึ้นเว็บอยู่ (ไม่มีลิงก์เสีย)');

console.log('\n6) แผนผังและ robots.txt');
const xml = two.files.get('sitemaps/knowledge.xml');
ok((xml.match(/<url>/g) || []).length === 4, 'แผนผังมีหน้าหมวด 2 + บทความ 2', xml);
ok(xml.indexOf('<lastmod>2026-09-19</lastmod>') >= 0, 'lastmod มาจากวันตรวจทานล่าสุด (วันไทย)');
const robots = read('robots.txt');
const on = K.robotsWith(robots, true);
ok(on.indexOf('Sitemap: https://njteedinsure.com/sitemaps/knowledge.xml') >= 0, 'มีบทความ = เพิ่มบรรทัด Sitemap');
ok(K.robotsWith(on, true) === on, 'รันซ้ำไม่เพิ่มซ้ำ');
ok(K.robotsWith(on, false) === robots.replace(/\r\n/g, robots.indexOf('\r\n') >= 0 ? '\r\n' : '\n'), '⭐ ไม่มีบทความ = บรรทัด Sitemap หายไป (ไม่ชี้ไฟล์ที่ไม่มี)');

console.log('\n7) ผลลัพธ์เหมือนเดิมทุกไบต์ + ต้นแบบ');
const again = K.plan(tpl, API([art(1), art(2, { category: 'survey-boundary', publishedAt: '2026-09-21T01:00:00.000Z' })]));
ok(Array.from(two.files.keys()).every((k) => two.files.get(k) === again.files.get(k)), '⭐ ข้อมูลเดิม = ไฟล์เดิมทุกไบต์ (ไม่มีเวลาปัจจุบันในไฟล์)');
ok(tpl.indexOf('<!-- nj-kbbody:start -->') >= 0 && tpl.indexOf('<!-- nj-kbbody:end -->') >= 0, 'ต้นแบบมีเครื่องหมาย nj-kbbody');
ok(/<link rel="stylesheet" href="knowledge\.css">/.test(tpl) && fs.existsSync(path.join(__dirname, 'knowledge.css')), 'ต้นแบบโหลด knowledge.css');
ok(!/#[0-9a-fA-F]{3,6}\b/.test(read('knowledge.css').replace(/\/\*[\s\S]*?\*\//g, '')), 'knowledge.css ไม่มีรหัสสีดิบ (ใช้ token)');
ok(/href="knowledge\.html"/.test(read('index.html')), '⭐ เมนูหลักมีลิงก์ไปหน้าบทความ (ไม่เป็นหน้ากำพร้า)');
const yml = read('.github/workflows/knowledge.yml');
ok(/node build\/knowledge\.js/.test(yml) && /มีไฟล์อื่นเปลี่ยนด้วย/.test(yml), 'Action สร้างหน้าอัตโนมัติ และหยุดเมื่อมีไฟล์อื่นเปลี่ยน');

console.log('\n== สรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + ' ==');
process.exit(fail ? 1 : 0);
