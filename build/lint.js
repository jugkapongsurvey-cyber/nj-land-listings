'use strict';
// ---------- ตรวจความถูกต้องพื้นฐานของทั้ง repo ก่อนขึ้นเว็บ (Sprint 6 · งานที่ 18) ----------
//
// รัน:  node build/lint.js
//
// เว็บนี้ไม่มี bundler ไม่มี type checker และไม่มี lint มาก่อนเลย แปลว่าความผิดพลาด
// ประเภท "พิมพ์ชื่อไฟล์ผิด" หรือ "ลืมปิดวงเล็บ" จะไปโผล่เอาตอนผู้ใช้เปิดหน้านั้นจริง
// โดยไม่มีอะไรเตือนระหว่างทาง — ไฟล์นี้คือด่านที่ถูกที่สุดที่จะจับของพวกนั้น
//
// ⚠️ ตรวจเฉพาะสิ่งที่ตรวจได้โดย **ไม่ต้องเปิดเบราว์เซอร์และไม่ต้องต่อเน็ต**
//    พฤติกรรมจริงบนหน้าจอเป็นหน้าที่ของชุด *.test.js และการทดสอบในเบราว์เซอร์
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let problems = 0;
function bad(msg) { problems++; console.log('  ✗ ' + msg); }

// `__*.html` = สำเนาชั่วคราวตอนทดสอบด้วยมือ · `p/` = หน้าแปลงที่สร้างอัตโนมัติ
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.startsWith('__'));
const scripts = fs.readdirSync(ROOT).filter((f) => f.endsWith('.js'));
const pDir = path.join(ROOT, 'p');
const pStubs = fs.existsSync(pDir)
  ? fs.readdirSync(pDir).filter((f) => f.endsWith('.html') && !f.startsWith('__')).map((f) => 'p/' + f) : [];

// ⚠️ หน้าแปลงตัวจริงย้ายไปอยู่ใต้ properties/{ประเภท}/{จังหวัด}/{อำเภอ}/{รหัส}/index.html (สปรินต์ 3)
//    ด่านนี้ต้องเดินเข้าไปดูด้วย ไม่งั้นลิงก์เสียในหน้าแปลงจะไม่มีใครเห็นอีกเลย
//    ส่วน p/*.html กลายเป็นหน้าพาไปที่อยู่ใหม่ — ยังตรวจอยู่ เพราะลิงก์ในนั้นต้องไม่ตาย
function walkHtml(dir, rel, out) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const it of items) {
    if (it.isDirectory()) walkHtml(path.join(dir, it.name), rel + it.name + '/', out);
    else if (it.name.endsWith('.html') && !it.name.startsWith('__')) out.push(rel + it.name);
  }
  return out;
}
const propPages = walkHtml(path.join(ROOT, 'properties'), 'properties/', []);
// หน้าวารสาร journal/<slug>/ (build/journal.js) — ตรวจที่อยู่ไฟล์เหมือนหน้าแปลง
const jrPages = walkHtml(path.join(ROOT, 'journal'), 'journal/', []);
// หน้าบทความ knowledge/<หมวด>/<สลัก>/ (build/knowledge.js) — ตรวจที่อยู่ไฟล์เหมือนหน้าวารสาร
const kbPages = walkHtml(path.join(ROOT, 'knowledge'), 'knowledge/', []);
const pPages = pStubs.concat(propPages).concat(jrPages).concat(kbPages);

// ---------- 1) ไวยากรณ์ของไฟล์ JavaScript ทุกไฟล์ ----------
console.log('\n1) ไวยากรณ์ JavaScript (' + scripts.length + ' ไฟล์)');
for (const f of scripts) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
  } catch (e) {
    bad(f + ' — ไวยากรณ์ผิด: ' + String(e.stderr || e.message).split('\n').slice(0, 3).join(' '));
  }
}

// ---------- 2) ของที่ไม่ควรหลุดขึ้นเว็บจริง ----------
console.log('\n2) ของที่ไม่ควรหลุดขึ้นเว็บจริง');
for (const f of scripts) {
  if (/\.(test|e2e)\.js$/.test(f)) continue;     // ไฟล์ทดสอบไม่ได้ขึ้นเว็บ
  const src = read(f);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/\bdebugger\b/.test(code)) bad(f + ' — มีคำสั่ง debugger ค้างอยู่');
  // ⚠️ `console.error` ปล่อยไว้ได้ (มีไว้แจ้งเหตุจริง) · ห้ามเฉพาะ console.log ที่ลืมลบ
  const m = code.match(/console\.log\s*\(/g);
  if (m) bad(f + ' — มี console.log ค้างอยู่ ' + m.length + ' จุด');
}

// ---------- 3) ทุก <script src> และ <link href> ต้องชี้ไปไฟล์ที่มีอยู่จริง ----------
//
// ⚠️ นี่คือข้อที่จับบั๊กได้บ่อยที่สุด — พิมพ์ชื่อไฟล์ผิดหนึ่งตัวอักษร หน้านั้นจะเงียบสนิท
//    ไม่มี error บนหน้าจอ มีแต่ 404 ใน console ที่ไม่มีใครเปิดดู
console.log('\n3) ที่อยู่ไฟล์ในหน้า HTML (' + (pages.length + pPages.length) + ' หน้า)');
function localAssets(html) {
  const out = [];
  // ⚠️ ต้องตัดเนื้อในของ <script> ที่เขียนโค้ดไว้ตรงๆ ออกก่อน — โค้ดข้างในมักต่อสตริง
  //    อย่าง `src="' + dir + v.id + '.mp4"` ซึ่งไม่ใช่ที่อยู่ไฟล์จริง (เจอจริงที่ videos.html)
  //    แต่ต้องเก็บแท็ก <script src="..."> ไว้ เพราะนั่นคือสิ่งที่เรากำลังตรวจ
  // คอมเมนต์ก็ต้องตัด — หลายหน้าเขียนคำสั่ง grep ตัวอย่างไว้ในคอมเมนต์ ซึ่งมี src="…" ปนอยู่
  html = html.replace(/<!--[\s\S]*?-->/g, '')
             .replace(/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/gi, '<script></script>');
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/^(https?:|\/\/|#|mailto:|tel:|data:|javascript:)/i.test(u)) continue;
    if (!/\.(js|css|png|jpe?g|svg|webp|webmanifest|xml|json|mp4|ico)$/i.test(u.split('?')[0])) continue;
    out.push(u.split('?')[0].split('#')[0]);
  }
  return out;
}
for (const page of pages.concat(pPages)) {
  const html = read(page);
  const dir = path.dirname(path.join(ROOT, page));
  for (const u of localAssets(html)) {
    // ที่อยู่แบบเต็ม (/x.css) นับจากรากเว็บ · ที่อยู่แบบย่อ นับจากโฟลเดอร์ของหน้านั้น
    const full = u.startsWith('/') ? path.join(ROOT, u.slice(1)) : path.join(dir, u);
    if (!fs.existsSync(full)) bad(page + ' — ชี้ไปไฟล์ที่ไม่มีอยู่: ' + u);
  }
}

// ---------- 4) id ซ้ำในหน้าเดียวกัน ----------
//
// id ซ้ำทำให้ `getElementById` คืนตัวแรกเสมอ — ตัวที่สองจะไม่มีวันถูกเรียกใช้
// และ `aria-describedby` / `<label for=…>` จะชี้ผิดตัวโดยไม่มีอะไรเตือน
console.log('\n4) id ซ้ำในหน้าเดียวกัน');
for (const page of pages) {
  const html = read(page).replace(/<!--[\s\S]*?-->/g, '');
  const seen = new Map();
  const re = /\sid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  for (const [id, n] of seen) if (n > 1) bad(page + ' — id="' + id + '" ซ้ำ ' + n + ' ครั้ง');
}

// ---------- 5) สคริปต์ที่ต้องมาก่อนกัน ----------
//
// ⚠️ ลำดับผิด = ตัวแปรที่ต้องการยังไม่มีตอนไฟล์ถัดไปเริ่มทำงาน **และไม่มี error ให้เห็น**
//    (เจอจริงสองครั้งแล้ว: save.js มาหลัง listings.js · zoneguide.js มาก่อน landvocab.js)
const ORDER = [
  ['landvocab.js', 'listings.js'],
  ['landvocab.js', 'zoneguide.js'],
  ['verified.js', 'listingcard.js'],
  ['listingcard.js', 'marketplace.js'],
  ['listingcard.js', 'listings.js'],
  ['save.js', 'listings.js'],
  ['save.js', 'marketplace.js'],
  ['compare.js', 'comparepage.js'],
  ['landmeta.js', 'land.js'],
  ['consignpreview.js', 'consign.js'],
  ['landform.js', 'arealink.js'],
  ['arealink.js', 'tools.js'],
  ['analytics.js', 'njchat.js']
];
console.log('\n5) ลำดับการโหลดสคริปต์');
for (const page of pages) {
  const html = read(page);
  for (const [first, then] of ORDER) {
    const a = html.indexOf('src="' + first + '"');
    const b = html.indexOf('src="' + then + '"');
    if (a >= 0 && b >= 0 && a > b) bad(page + ' — ' + first + ' ต้องมาก่อน ' + then);
    if (a < 0 && b >= 0) bad(page + ' — โหลด ' + then + ' แต่ไม่ได้โหลด ' + first);
  }
}

// ---------- 6) ไฟล์ที่ไม่มีหน้าไหนเรียกใช้เลย ----------
//
// ไม่ถือว่าผิด แต่ต้องรู้ตัว — ไฟล์ที่ไม่มีใครเรียกคือไฟล์ที่ไม่มีใครทดสอบ
console.log('\n6) ไฟล์ที่ไม่มีหน้าไหนเรียกใช้ (แจ้งให้ทราบ ไม่ใช่ข้อผิดพลาด)');
const allHtml = pages.map(read).join('\n') + pPages.map(read).join('\n');
const orphans = scripts.filter((f) =>
  !/\.(test|e2e)\.js$/.test(f) && allHtml.indexOf(f) < 0);
if (orphans.length) console.log('  • ' + orphans.join(', '));
else console.log('  (ไม่มี)');

// ---------- 7) ลิงก์ในหน้าแปลงสแตติก ----------
//
// ⚠️ `build/linkcheck.js` สแกนเฉพาะไฟล์ที่รากของ repo — หน้าใน `p/` จึงไม่เคยถูกตรวจ
//    และหน้าพวกนั้นใช้ที่อยู่แบบเต็ม (`/listings.html`) ซึ่งเป็นคนละแบบกับหน้าอื่นทั้งเว็บ
console.log('\n7) ลิงก์ในหน้าแปลงสแตติก (' + pPages.length + ' หน้า)');
for (const page of pPages) {
  const html = read(page).replace(/<!--[\s\S]*?-->/g, '');
  const re = /<a[^>]+href="([^"]+)"/g;
  let m;
  const seenBad = new Set();
  while ((m = re.exec(html))) {
    const u = m[1];
    if (/^(https?:|\/\/|#|mailto:|tel:|javascript:)/i.test(u)) continue;
    const file = u.split('?')[0].split('#')[0];
    if (!file || !/\.html$/i.test(file)) continue;
    const full = file.startsWith('/') ? path.join(ROOT, file.slice(1)) : path.join(ROOT, path.dirname(page), file);
    if (!fs.existsSync(full) && !seenBad.has(file)) { seenBad.add(file); bad(page + ' — ลิงก์ไปหน้าที่ไม่มีอยู่: ' + u); }
  }
}

// ---------- สรุป ----------
console.log('\n' + (problems ? '⛔ พบปัญหา ' + problems + ' จุด' : '✅ ผ่านทั้งหมด'));
process.exit(problems ? 1 : 0);
