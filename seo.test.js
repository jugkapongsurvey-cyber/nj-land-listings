'use strict';
// ---------- เทสต์ build/seo.js — ตัวเขียนค่า SEO จากทะเบียนกลางลงหัวไฟล์ HTML ----------
// รัน: node seo.test.js [path ของ nj-survey-system]
// ไม่มี dependency ภายนอก (repo นี้เป็นเว็บสแตติกล้วน ไม่มี package.json)

const fs = require('fs');
const path = require('path');
const S = require('./build/seo.js');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (extra ? ('  → ' + extra) : '')); }
}
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label, 'ได้ ' + JSON.stringify(a) + ' ควรเป็น ' + JSON.stringify(b)); }

const ROOT = __dirname;
const page = (head, body) => '<!doctype html>\n<html lang="th">\n<head>\n' + head + '\n</head>\n<body>\n' +
  '<header class="topbar"><nav><a href="index.html">หน้าแรก</a></nav></header>\n' + (body || '') + '\n</body>\n</html>\n';
const apply = (html, file, entry, opts) => S.applyToHtml(html, file, entry || null, opts || {});
const headOf = html => { const r = S.headRange(html); return html.slice(r.start, r.end); };
const has = (html, f) => S.tagRe(f).test(headOf(html));
const val = (html, f) => { const m = headOf(html).match(S.tagRe(f)); return m ? S.valueOfTag(m[0], f) : null; };

console.log('\n1) ⚠️ ค่าคงที่ที่ผูกกันข้ามไฟล์');
const analytics = fs.readFileSync(path.join(ROOT, 'analytics.js'), 'utf8');
const base = (analytics.match(/var\s+NJ_API_BASE\s*=\s*'([^']+)'/) || [])[1];
eq(S.API_BASE, base, 'API_BASE ตรงกับ NJ_API_BASE ใน analytics.js');
eq(S.SITE, 'https://njteedinsure.com', 'ที่อยู่เว็บตรงกับของจริง');
// รายชื่อช่องต้องตรงกับ FIELDS ใน lib/seo.js ของระบบหลังบ้าน (ไม่เจอ = ข้ามเงียบๆ เหมือน contracts.test.js)
const sys = [process.argv[2], '../nj-survey-system', '../nj-wt-p2b']
  .filter(Boolean).map(p => path.resolve(ROOT, p)).find(p => fs.existsSync(path.join(p, 'lib', 'seo.js')));
if (!sys) console.log('  (ข้าม) ไม่พบ lib/seo.js ของระบบหลังบ้าน — ข้ามการเทียบรายชื่อช่อง');
else {
  const F = require(path.join(sys, 'lib', 'seo.js')).FIELDS;
  eq(S.FIELDS.slice().sort(), F.slice().sort(), '⭐ 13 ช่องตรงกับทะเบียนของระบบหลังบ้าน');
  eq(S.FIELDS.length, 13, 'มี 13 ช่องพอดี');
}

console.log('\n2) ⭐ กติกาข้อ 1 — ไม่เขียนเนื้อหาให้เอง');
const bare = page('  <title>หน้าทดสอบ | ที่ดินชัวร์</title>\n  <meta name="description" content="คำอธิบายเดิม">');
const r2 = apply(bare, 'test.html', null);
['title', 'description', 'ogTitle', 'ogDescription', 'ogImage', 'ogType', 'twitterTitle', 'twitterDescription', 'twitterImage']
  .forEach(f => ok(r2.derived.indexOf(f) < 0, 'ไม่แต่ง ' + f + ' ให้เอง'));
ok(!has(r2.html, 'ogTitle') && !has(r2.html, 'ogImage'), '⭐ หน้าที่ไม่มี og อยู่เดิม ไม่ถูกเติม og ให้');
eq(S.DERIVABLE, ['canonical', 'ogUrl', 'twitterCard'], '⭐ คำนวณเองได้แค่ 3 ค่าที่เป็นกลไก');
const src = fs.readFileSync(path.join(ROOT, 'build', 'seo.js'), 'utf8');
ok(!/\bที่ดินชัวร์\b/.test(src.replace(/^\/\/.*$/gm, '')), '⭐ ไม่มีข้อความการตลาดฝังในโค้ด (นอกคอมเมนต์)');

console.log('\n3) ⭐ กติกาข้อ 2 — ช่องว่างในทะเบียนไม่ลบของเดิม');
const keep = apply(bare, 'test.html', { path: 'test.html', title: '', description: '   ', ogTitle: null });
eq(val(keep.html, 'title'), 'หน้าทดสอบ | ที่ดินชัวร์', 'ส่ง title ว่างมาแล้วชื่อเดิมยังอยู่');
eq(val(keep.html, 'description'), 'คำอธิบายเดิม', 'ส่งคำอธิบายเป็นช่องว่างแล้วของเดิมยังอยู่');
const over = apply(bare, 'test.html', { path: 'test.html', title: 'ชื่อใหม่จากทะเบียน' });
eq(val(over.html, 'title'), 'ชื่อใหม่จากทะเบียน', 'ทะเบียนมีค่า = เขียนทับของเดิม');
eq((headOf(over.html).match(/<title/gi) || []).length, 1, 'แก้ในที่เดิม ไม่เกิดแท็กซ้ำ');

console.log('\n4) ⭐ กติกาข้อ 3 — ค่าที่คำนวณเอง');
const withOg = page('  <title>ก | ที่ดินชัวร์</title>\n  <meta property="og:title" content="ก">\n  <meta property="og:image" content="https://njteedinsure.com/brand/og-image.png">');
const d4 = apply(withOg, 'guides.html', null);
eq(val(d4.html, 'canonical'), 'https://njteedinsure.com/guides.html', 'เติม canonical จากชื่อไฟล์');
eq(val(d4.html, 'ogUrl'), 'https://njteedinsure.com/guides.html', 'og:url ตามหลัง canonical');
eq(val(d4.html, 'twitterCard'), 'summary_large_image', 'มีรูปแชร์ = การ์ดใหญ่');
const noImg = page('  <title>ก | ที่ดินชัวร์</title>\n  <meta property="og:title" content="ก">');
eq(val(apply(noImg, 'guides.html', null).html, 'twitterCard'), 'summary', 'ไม่มีรูปแชร์ = การ์ดเล็ก');
ok(!has(apply(page('  <title>ก | ที่ดินชัวร์</title>'), 'guides.html', null).html, 'twitterCard'),
  '⭐ หน้าที่ยังไม่มี og เลย ไม่เริ่มมีการ์ด X ให้เอง');
eq(val(apply(withOg, 'index.html', null).html, 'canonical'), 'https://njteedinsure.com/', '⭐ หน้าแรกใช้ที่อยู่ที่ไม่มี index.html');
ok(!apply(page('  <title>ก</title>\n  <meta name="twitter:card" content="summary">\n  <meta property="og:image" content="https://x.njteedinsure.com/a.png">'), 'guides.html', null).updated.includes('twitterCard'),
  'มี twitter:card อยู่แล้ว ไม่ถูกเปลี่ยน');

console.log('\n5) ⭐ กติกาข้อ 4 — หน้า noindex ไม่ได้ค่าที่คำนวณเอง');
const noidx = page('  <title>ก | ที่ดินชัวร์</title>\n  <meta name="robots" content="noindex, nofollow">\n  <meta property="og:image" content="https://njteedinsure.com/a.png">');
const r5 = apply(noidx, 'quote.html', null);
eq(r5.derived, [], '⭐ ไม่คำนวณอะไรให้เลย');
ok(!has(r5.html, 'canonical') && !has(r5.html, 'ogUrl') && !has(r5.html, 'twitterCard'), 'ไม่มี canonical/og:url/twitter:card งอกขึ้นมา');
eq(val(apply(noidx, 'quote.html', { path: 'quote.html', canonical: 'https://njteedinsure.com/quote.html' }).html, 'canonical'),
  'https://njteedinsure.com/quote.html', 'แต่ค่าที่คนตั้งในทะเบียนยังถูกเขียนลงตามปกติ');
// ทะเบียนสั่ง noindex ได้ด้วย แม้ไฟล์เดิมจะยังไม่มี
const r5b = apply(withOg, 'guides.html', { path: 'guides.html', robots: 'noindex,follow' });
eq(r5b.derived, [], 'ทะเบียนสั่ง noindex = หยุดคำนวณทันที');

console.log('\n6) ⭐ หน้าที่ที่อยู่คำนวณจากชื่อไฟล์ไม่ได้');
ok(Object.keys(S.NO_URL).indexOf('land.html') >= 0, 'land.html อยู่ในรายการยกเว้น');
ok(String(S.NO_URL['land.html']).length > 40, 'มีเหตุผลกำกับ ไม่ใช่รายชื่อเปล่าๆ');
const r6 = apply(withOg, 'land.html', null);
ok(!has(r6.html, 'canonical') && !has(r6.html, 'ogUrl'), '⭐ ไม่เติม canonical/og:url ให้หน้าแปลงรายแปลง');
eq(val(r6.html, 'twitterCard'), 'summary_large_image', 'แต่ยังเติม twitter:card ได้ (ไม่ได้อ้างที่อยู่)');

console.log('\n7) ⭐ กติกาข้อ 5 — รันซ้ำได้ผลเท่าเดิม');
const once = apply(withOg, 'guides.html', { path: 'guides.html', title: 'ชื่อ' }).html;
const twice = apply(once, 'guides.html', { path: 'guides.html', title: 'ชื่อ' });
eq(twice.changed, false, 'รอบที่สองไม่มีอะไรเปลี่ยน');
eq(twice.html, once, 'เนื้อไฟล์เท่าเดิมทุกตัวอักษร');
eq((once.match(/nj-seo:start/g) || []).length, 1, 'มีบล็อกที่ระบบดูแลอันเดียว');
const third = apply(apply(once, 'guides.html', { path: 'guides.html', title: 'ชื่อสอง' }).html, 'guides.html', { path: 'guides.html', title: 'ชื่อสอง' });
eq((third.html.match(/nj-seo:start/g) || []).length, 1, 'แก้แล้วรันซ้ำก็ยังมีบล็อกเดียว');

console.log('\n8) ความปลอดภัยของข้อความ');
const evil = apply(bare, 'test.html', { path: 'test.html', ogTitle: 'a" onerror="alert(1)', ogDescription: 'ก & ข < ค' });
ok(headOf(evil.html).indexOf('onerror="alert(1)') < 0, '⭐ เครื่องหมายคำพูดถูกแปลง ไม่หลุดออกจากแอตทริบิวต์');
eq(val(evil.html, 'ogDescription'), 'ก &amp; ข &lt; ค', 'เครื่องหมาย & และ < ถูกแปลงก่อนเขียน');

console.log('\n9) ⚠️ หา <head> ไม่หลงไปเจอ <header>');
const r9 = S.headRange(page('  <title>ก</title>'));
const body9 = page('  <title>ก</title>');
ok(body9.slice(r9.start, r9.end).indexOf('<header') < 0, 'ช่วงหัวไฟล์ไม่กินเนื้อหาในหน้า');
ok(body9.slice(r9.start, r9.end).indexOf('<title>') >= 0, 'แต่ยังได้แท็กในหัวไฟล์ครบ');

console.log('\n10) ⭐ ไฟล์จริงในเว็บ (หลังรัน build/seo.js แล้ว)');
const files = fs.readdirSync(ROOT).filter(f => /\.html$/i.test(f)).sort();
const bad = [];
files.forEach(f => {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const head = headOf(html);
  S.FIELDS.forEach(fld => {
    const re = new RegExp(S.tagRe(fld).source, 'gi');
    const n = (head.match(re) || []).length;
    if (n > 1) bad.push(f + ' มี ' + fld + ' ' + n + ' อัน');
  });
});
eq(bad, [], '⭐ ไม่มีหน้าไหนมีแท็กซ้ำกันเอง');
const idx = files.filter(f => {
  const head = headOf(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  return !S.isNoindex(head);
});
const missing = idx.filter(f => !S.NO_URL[f]).filter(f => {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  return !has(html, 'canonical') || !has(html, 'ogUrl');
});
eq(missing, [], 'ทุกหน้าที่เก็บดัชนีได้มี canonical และ og:url ครบ');
const noCard = idx.filter(f => {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  return has(html, 'ogImage') && !has(html, 'twitterCard');
});
eq(noCard, [], '⭐ ปิดช่องว่าง M1 — หน้าที่มีรูปแชร์มี twitter:card ครบแล้ว');
const rogue = files.filter(f => {
  const head = headOf(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const s = head.indexOf(S.MANAGED_START);
  if (s < 0) return false;
  const block = head.slice(s, head.indexOf(S.MANAGED_END, s));
  return /twitter:title|twitter:description/i.test(block);
});
eq(rogue, [], '⭐ ไม่เขียน twitter:title/description ซ้ำกับ og (กติกาข้อ 3)');
ok(idx.indexOf('404.html') < 0, 'หน้า 404 ยังเป็น noindex และไม่มี canonical');

console.log('\n== สรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + ' ==');
process.exit(fail ? 1 : 0);
