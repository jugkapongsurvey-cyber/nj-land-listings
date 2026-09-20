'use strict';
// ---------- สร้าง sitemap.xml จากไฟล์จริงในเว็บ ----------
//
// รัน:  node build/sitemap.js          (เขียนทับ sitemap.xml)
//       node build/sitemap.js --check  (ตรวจว่าไฟล์ปัจจุบันตรงกับที่ควรเป็นไหม · ไม่เขียนอะไร)
//
// ⚠️⚠️ ห้าข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **ไม่ใส่ `priority` และ `changefreq`** — Google ประกาศเองว่าไม่ได้ใช้สองค่านี้
//    และข้อกำหนด Phase 10 งานที่ 3 สั่งไว้ตรงๆ ว่า "ไม่สร้าง fake priority หรือ changefreq"
//    ของเดิมใส่ไว้ทุก URL พร้อมตัวเลขที่ไม่มีที่มา
//
// 2. **`lastmod` มาจากวันที่ commit ล่าสุดของไฟล์นั้นจริงๆ** (`git log -1 --format=%cs`)
//    ไม่ใช่วันที่พิมพ์มือ · ไฟล์ที่ยังไม่เคย commit ใช้วันนี้ และขึ้นคำเตือน
//
// 3. **หน้าที่ประกาศ noindex ในตัวหน้า ไม่อยู่ใน sitemap** — ตรวจจาก `<meta name="robots">`
//    ของหน้านั้นเอง ไม่ใช่รายชื่อที่พิมพ์ไว้ (ตั้ง noindex เพิ่มแล้วสร้างใหม่ก็หายไปเอง)
//
// 4. **หน้าแปลงที่ดินรายแปลงอยู่ในไฟล์แยก** — `sitemaps/properties.xml` สร้างด้วย
//    `node build/properties.js` จากข้อมูลจริงของ API (เพิ่ม Sprint 5 · งานที่ 15)
//    · `robots.txt` ชี้ไปทั้งสองไฟล์ · Google รับหลายบรรทัด Sitemap ได้
//    · `land.html` ยังไม่อยู่ในแผนผังเหมือนเดิม เพราะมันชี้ canonical ไปหน้าสแตติกแล้ว
//
// 5. **ไม่แตะไฟล์อื่นเลย** — เขียนเฉพาะ sitemap.xml
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://njteedinsure.com';
const OUT = path.join(ROOT, 'sitemap.xml');
const CHECK = process.argv.indexOf('--check') >= 0;

// หน้าที่ไม่ใส่ในแผนผัง แม้จะไม่ได้ประกาศ noindex — เขียนเหตุผลกำกับทุกบรรทัด
const SKIP = {
  'land.html': 'หน้าแปลงรายแปลง — ชี้ canonical ไป p/<รหัส>.html ซึ่งอยู่ใน sitemaps/properties.xml แล้ว',
  'inspect.html': null,          // อยู่ในแผนผัง (ตั้งค่า null = ไม่ข้าม · เก็บบรรทัดไว้ให้อ่านง่าย)
};

function gitDate(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], { cwd: ROOT, encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : '';
  } catch (e) { return ''; }
}
// ⚠️ ไฟล์ที่แก้แล้วแต่ยังไม่ commit ต้องใช้วันนี้ ไม่ใช่วันที่ commit ก่อนหน้า —
//    ไม่งั้นแผนผังจะบอก Google ว่าหน้านี้แก้ล่าสุดเมื่อวานทั้งที่กำลังจะขึ้นของใหม่วันนี้
//    (สร้างแผนผังก่อน commit เป็นลำดับปกติ เพราะไฟล์แผนผังเองก็ต้องถูก commit ไปด้วย)
let DIRTY = new Set();
try {
  execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').forEach(line => {
      const f = line.slice(3).trim();
      if (f) DIRTY.add(f.replace(/^"|"$/g, ''));
    });
} catch (e) { /* ไม่ใช่ repo git ก็ใช้วันที่ commit ตามปกติ */ }
function todayISO() {
  // วันที่ตามเวลาไทย (เครื่อง CI/เซิร์ฟเวอร์อาจรันเป็น UTC)
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
}
function isNoindex(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  return !!(m && /noindex/i.test(m[0]));
}
function locOf(file) {
  return file === 'index.html' ? SITE + '/' : SITE + '/' + file;
}

const warn = [];
const pages = fs.readdirSync(ROOT)
  .filter(f => /\.html$/i.test(f))
  .sort()
  .filter(f => {
    if (SKIP[f]) return false;
    if (isNoindex(fs.readFileSync(path.join(ROOT, f), 'utf8'))) return false;
    return true;
  });

const rows = pages.map(f => {
  let d = DIRTY.has(f) ? todayISO() : gitDate(f);
  if (!d) { d = todayISO(); warn.push(f + ' — ยังไม่เคย commit จึงใช้วันที่วันนี้'); }
  return { file: f, loc: locOf(f), lastmod: d };
});
// หน้าแรกขึ้นก่อนเสมอ ที่เหลือเรียงตามชื่อไฟล์ (อ่าน diff ง่ายเวลาสร้างใหม่)
rows.sort((a, b) => (a.file === 'index.html' ? -1 : b.file === 'index.html' ? 1 : a.file.localeCompare(b.file)));

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!-- สร้างด้วย build/sitemap.js — ห้ามแก้ด้วยมือ (แก้แล้วจะถูกเขียนทับรอบถัดไป)',
  '     lastmod = วันที่ commit ล่าสุดของไฟล์นั้น · ไม่มี priority/changefreq โดยตั้งใจ',
  '     หน้าแปลงรายแปลงจะมาในไฟล์แยก (sitemaps/properties.xml) เมื่อสร้างหน้าจริงเสร็จ -->',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
].concat(rows.map(r =>
  '  <url>\n    <loc>' + r.loc + '</loc>\n    <lastmod>' + r.lastmod + '</lastmod>\n  </url>'
)).concat(['</urlset>', '']).join('\n');

if (CHECK) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const same = cur === xml;
  console.log(same ? 'sitemap.xml ตรงกับไฟล์จริงในเว็บแล้ว' : '⚠ sitemap.xml ไม่ตรง — รัน `node build/sitemap.js` เพื่อสร้างใหม่');
  console.log('URL ในแผนผัง: ' + rows.length + ' รายการ');
  process.exit(same ? 0 : 1);
}

fs.writeFileSync(OUT, xml, 'utf8');
console.log('เขียน sitemap.xml แล้ว — ' + rows.length + ' URL');
rows.forEach(r => console.log('  ' + r.lastmod + '  ' + r.loc));
Object.keys(SKIP).forEach(k => { if (SKIP[k]) console.log('  (ข้าม) ' + k + ' — ' + SKIP[k]); });
if (warn.length) { console.log('\nคำเตือน:'); warn.forEach(w => console.log('  ⚠ ' + w)); }
