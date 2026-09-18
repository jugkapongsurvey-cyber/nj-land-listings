'use strict';
// ---------- ตัวไต่ลิงก์ในเว็บ — หาลิงก์เสีย จุดยึดที่ไม่มีจริง และหน้ากำพร้า ----------
//
// รัน:  node build/linkcheck.js
// คืนค่า: 0 = ไม่มีลิงก์เสีย · 1 = มีลิงก์เสียหรือจุดยึดที่ไม่มีจริง
//
// ⚠️⚠️ สี่ข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **ไม่มี dependency และจะไม่มี** — repo นี้เป็นเว็บสถิตล้วน ไม่มี package.json โดยตั้งใจ
//    (กติกาเดียวกับไฟล์ *.test.js ที่เขียน DOM ปลอมเองใน node:vm แทนการลง jsdom)
//
// 2. **ตัวนี้อ่านเฉพาะลิงก์ที่อยู่ใน HTML จริง** — ลิงก์ที่ JavaScript สร้างตอนรัน
//    (เช่นการ์ดแปลงใน listingcard.js ที่สร้าง <a href="land.html?id=...">) มองไม่เห็น
//    จึงแยกรายงาน "ลิงก์ที่มาจาก JS เท่านั้น" ไว้อีกหัวข้อ — **บอตของเสิร์ชเอนจินรอบแรก
//    ก็มองไม่เห็นเหมือนกัน** รายการนั้นจึงเป็นข้อมูลจริงที่ต้องดู ไม่ใช่ผลบวกปลอม
//
// 3. **หน้ากำพร้า = หน้าที่เก็บดัชนีได้ แต่ไม่มีหน้าที่เก็บดัชนีได้ด้วยกันลิงก์มาหา**
//    หน้า noindex ไม่นับเป็นทางเข้า เพราะบอตไม่เดินต่อจากหน้าเหล่านั้นในทางปฏิบัติ
//    (ตรวจ noindex จาก <meta name="robots"> ของหน้านั้นเอง ไม่ใช่จากรายชื่อที่พิมพ์ไว้)
//
// 4. **ไม่แตะไฟล์ใดๆ** — อ่านอย่างเดียว ไม่เขียน ไม่ลบ
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function htmlFiles() {
  return fs.readdirSync(ROOT).filter(f => /\.html$/i.test(f)).sort();
}
function jsFiles() {
  // ไม่นับไฟล์ทดสอบ — ลิงก์ในนั้นไม่ใช่ทางเข้าของผู้ใช้จริง
  return fs.readdirSync(ROOT).filter(f => /\.js$/i.test(f) && !/\.(test|e2e)\.js$/i.test(f)).sort();
}
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// หน้านี้ประกาศ noindex ไว้ในตัวหน้าหรือไม่
function isNoindex(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  return !!(m && /noindex/i.test(m[0]));
}

// ดึงลิงก์ในเอกสาร — เฉพาะ href/src ที่ชี้ไปที่ไฟล์ในเว็บนี้
const EXTERNAL = /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i;
// ⚠️ หน้าเว็บมีคอมเมนต์และสคริปต์ที่มีข้อความหน้าตาเหมือน href อยู่ด้วย (เช่นตัวอย่างคำสั่ง grep
//    ใน compare.html) จึงรับเฉพาะค่าที่หน้าตาเป็นเส้นทางไฟล์จริง — ตัวอักษรที่ใช้ในนิพจน์ปกติ
//    ([ ] \ * + ( ) ' ") ไม่มีวันอยู่ในชื่อไฟล์ของ repo นี้
const PATHLIKE = /^[^\s[\]\\*+()'"`<>|]+$/;
function localLinks(html) {
  const out = [];
  const re = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    if (!raw || EXTERNAL.test(raw)) continue;
    if (raw[0] === '#') continue;                 // จุดยึดในหน้าเดียวกัน
    if (!PATHLIKE.test(raw)) continue;
    out.push(raw);
  }
  return out;
}

// หน้านั้นสร้าง id ด้วย JavaScript ตอนรันหรือไม่ (เช่น videos.html ที่วนสร้างคลิปทีละอัน)
// รูปแบบที่เจอจริงในเว็บนี้: `id="' + v.id + '"` (ต่อสตริง) และ `id="${v.id}"` (template literal)
function buildsIdsInJs(html) {
  return /\bid\s*=\s*["']['"]?\s*\+/.test(html) || /\bid\s*=\s*["']?\$\{/.test(html);
}

// แยก "ไฟล์" ออกจาก "?query" และ "#anchor"
function splitTarget(link) {
  const hash = link.indexOf('#');
  const anchor = hash >= 0 ? link.slice(hash + 1) : '';
  let file = hash >= 0 ? link.slice(0, hash) : link;
  const q = file.indexOf('?');
  if (q >= 0) file = file.slice(0, q);
  file = file.replace(/^\.\//, '');
  return { file: file, anchor: anchor };
}

function exists(rel) {
  if (!rel) return true;                          // ลิงก์ที่มีแต่ ?query หรือ #anchor = หน้าเดิม
  if (rel.endsWith('/')) rel += 'index.html';
  const p = path.join(ROOT, rel);
  if (!p.startsWith(ROOT)) return false;          // กันลิงก์ที่ไต่ออกนอกโฟลเดอร์
  return fs.existsSync(p);
}

function hasAnchor(rel, anchor) {
  if (!anchor) return true;
  const target = rel || null;
  if (!target || !/\.html$/i.test(target)) return true;   // ตรวจจุดยึดเฉพาะไฟล์ HTML
  const html = fs.readFileSync(path.join(ROOT, target), 'utf8');
  // จุดยึดภาษาไทยใช้กันจริงในหน้าแรก (เช่น #ขั้นตอน) จึงเทียบแบบตรงตัว
  const re = new RegExp('\\b(?:id|name)\\s*=\\s*["\']' + anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']', 'i');
  return re.test(html);
}

const pages = htmlFiles();
const meta = {};
pages.forEach(f => {
  const html = read(f);
  meta[f] = { html: html, noindex: isNoindex(html) };
});

const broken = [];       // {from, link, why}
const jsAnchors = [];    // จุดยึดที่มีจริงก็ต่อเมื่อ JS ทำงานแล้ว
const inbound = {};      // ไฟล์ → จำนวนลิงก์เข้าจากหน้าที่เก็บดัชนีได้
pages.forEach(f => { inbound[f] = 0; });

pages.forEach(from => {
  const seen = new Set();
  localLinks(meta[from].html).forEach(link => {
    const t = splitTarget(link);
    if (!exists(t.file)) { broken.push({ from: from, link: link, why: 'ไม่มีไฟล์นี้' }); return; }
    if (!hasAnchor(t.file, t.anchor)) {
      // หน้าปลายทางสร้าง id ด้วย JS = ผู้ใช้จริงกดแล้วไปถึง แต่บอตรอบแรกไม่เห็น
      if (t.file && meta[t.file] && buildsIdsInJs(meta[t.file].html)) {
        jsAnchors.push({ from: from, link: link });
      } else {
        broken.push({ from: from, link: link, why: 'ไม่มีจุดยึด #' + t.anchor + ' ในหน้านั้น' });
      }
      return;
    }
    // นับลิงก์เข้า: เฉพาะลิงก์ไปหน้า HTML อื่น และนับหน้าละครั้ง
    if (t.file && t.file !== from && /\.html$/i.test(t.file) && !meta[from].noindex) {
      if (!seen.has(t.file)) { seen.add(t.file); inbound[t.file] = (inbound[t.file] || 0) + 1; }
    }
  });
});

// ลิงก์ที่ปรากฏเฉพาะในไฟล์ JavaScript (บอตรอบแรกมองไม่เห็น)
const fromJs = {};
jsFiles().forEach(jf => {
  const src = read(jf);
  pages.forEach(p => {
    if (p === 'index.html') return;
    const re = new RegExp('[\'"`/]' + p.replace('.', '\\.'), 'g');
    if (re.test(src)) {
      if (!fromJs[p]) fromJs[p] = [];
      fromJs[p].push(jf);
    }
  });
});

// รายงาน
let bad = 0;
console.log('ไฟล์ HTML ที่ตรวจ: ' + pages.length + ' หน้า');

console.log('\n1) ลิงก์เสีย');
if (!broken.length) console.log('  ไม่พบ');
else broken.forEach(b => { bad++; console.log('  ✗ ' + b.from + ' → ' + b.link + '  (' + b.why + ')'); });

console.log('\n1b) จุดยึดที่มีจริงเมื่อ JS ทำงานแล้ว (ผู้ใช้กดได้ · บอตรอบแรกมองไม่เห็น)');
if (!jsAnchors.length) console.log('  ไม่พบ');
else jsAnchors.forEach(b => console.log('  ⚠ ' + b.from + ' → ' + b.link));

console.log('\n2) หน้ากำพร้า (ไม่มีลิงก์เข้าจากหน้าที่เก็บดัชนีได้)');
const orphans = pages.filter(f => f !== 'index.html' && !meta[f].noindex && !inbound[f]);
if (!orphans.length) console.log('  ไม่พบ');
else orphans.forEach(f => {
  const js = fromJs[f] ? ' · มีลิงก์จาก JS: ' + fromJs[f].join(', ') : ' · ไม่มีลิงก์จากที่ใดเลย';
  console.log('  ⚠ ' + f + js);
});

console.log('\n3) หน้าที่เก็บดัชนีได้แต่ลิงก์เข้ามาจากหน้า noindex เท่านั้น');
const weak = pages.filter(f => f !== 'index.html' && !meta[f].noindex && inbound[f] === 0 && fromJs[f]);
if (!weak.length) console.log('  ไม่พบเพิ่มเติมจากข้อ 2');
else weak.forEach(f => console.log('  ⚠ ' + f));

console.log('\n4) หน้าที่ประกาศ noindex ไว้ในตัวหน้า');
const noidx = pages.filter(f => meta[f].noindex);
console.log('  ' + (noidx.length ? noidx.join(', ') : 'ไม่มี'));

console.log('\n== สรุป: ลิงก์เสีย ' + bad + ' · หน้ากำพร้า ' + orphans.length + ' ==');
process.exit(bad ? 1 : 0);
