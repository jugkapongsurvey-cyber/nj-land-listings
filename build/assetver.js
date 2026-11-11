#!/usr/bin/env node
/* build/assetver.js — เติมเลขเวอร์ชันท้ายไฟล์ CSS/JS ในทุกหน้า (`x.css?v=<แฮช 8 ตัว>`)
 *
 *   node build/assetver.js           เขียนเลขใหม่ทุกหน้า
 *   node build/assetver.js --check   ตรวจอย่างเดียว (ใช้ใน CI) — เลขไม่ตรงเนื้อไฟล์ = ล้ม
 *
 * ปัญหาที่แก้ (12 พ.ย. 2569 · หลังขึ้นเมนูแบบ B #131):
 *   GitHub Pages ส่ง Cache-Control: max-age=600 ให้ทุกไฟล์ — หลังอัปเดต เบราว์เซอร์ที่เพิ่งเข้าเว็บ
 *   ได้ HTML ใหม่แต่ใช้ CSS/JS เก่าที่จำไว้ (หรือกลับกัน) นานสูงสุด 10 นาที → หน้าเพี้ยน
 *   (เจอจริง: แผงเมนูใหม่จัดวางด้วย header.css เก่า · ลิ้นชักมือถือมีลิงก์เกินเพราะ menu.js เก่า)
 *   เลขเวอร์ชัน = แฮชของเนื้อไฟล์ → ไฟล์เปลี่ยน = ที่อยู่ใหม่ = เบราว์เซอร์ต้องโหลดใหม่ทันที
 *
 * ⚠️ กติกา
 *   1. เลขมาจากเนื้อไฟล์เท่านั้น (md5 8 ตัวแรก) — รันซ้ำได้ผลเดิม · ไฟล์ไม่เปลี่ยน = เลขไม่เปลี่ยน = แคชยังใช้ได้
 *   2. แตะเฉพาะ href/src ที่ชี้ไฟล์ .css/.js ในเว็บนี้ที่มีอยู่จริง · ลิงก์นอกเว็บ / ไฟล์ที่หาไม่เจอ = ไม่แตะ
 *   3. build/pages.js เรียก versionHtml() กับทุกหน้าที่มันเขียน → `pages.js --check` กับไฟล์นี้ไม่ตีกัน
 *   4. แก้ CSS/JS ไฟล์ไหนก็ตาม ต้องรันไฟล์นี้ก่อน commit — CI (`--check`) จะบอกถ้าลืม
 *      ลำดับเต็ม: build/pages.js → build/assetver.js → commit → build/sitemap.js
 *   5. ไฟล์ที่ JS โหลดเองภายหลัง (njchatload.js → njchat.js · lazycss.js) ยังไม่มีเลขเวอร์ชัน — อยู่นอกขอบเขตไฟล์นี้
 *   6. เทสต์ที่ค้นแท็กด้วยชื่อไฟล์ตรงๆ ให้ตัด `?v=…` ก่อนเทียบ (ดู stripVer ข้างล่าง)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'build', 'docs', 'data', 'fonts', 'photos', 'video', 'brand', 'illustrations']);
const TAG = /(\s(?:href|src)=")((?!https?:|\/\/|data:)[^"?#]+\.(?:css|js))(?:\?v=[0-9a-f]{8})?(")/g;

const hashes = new Map();
function hashOf(full) {
  if (hashes.has(full)) return hashes.get(full);
  let h = null;
  try { h = crypto.createHash('md5').update(fs.readFileSync(full)).digest('hex').slice(0, 8); } catch (e) { h = null; }
  hashes.set(full, h);
  return h;
}

// htmlDir = โฟลเดอร์ของไฟล์ HTML (ใช้แปลงที่อยู่แบบสัมพัทธ์) · ที่อยู่ขึ้นต้น / = จากรากเว็บ
function versionHtml(html, htmlDir) {
  return String(html).replace(TAG, (m, pre, url, post) => {
    const full = url.startsWith('/') ? path.join(ROOT, url.slice(1)) : path.join(htmlDir || ROOT, url);
    if (!full.startsWith(ROOT)) return m;
    const h = hashOf(full);
    return h ? pre + url + '?v=' + h + post : pre + url + post;
  });
}

// สำหรับเทสต์: ตัดเลขเวอร์ชันทิ้งก่อนค้นแท็กด้วยชื่อไฟล์
function stripVer(html) { return String(html).replace(/(\.(?:css|js))\?v=[0-9a-f]{8}(?=")/g, '$1'); }

function htmlFiles(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) htmlFiles(path.join(dir, e.name), out); }
    else if (e.name.endsWith('.html')) out.push(path.join(dir, e.name));
  }
  return out;
}

if (require.main === module) {
  const CHECK = process.argv.includes('--check');
  const files = htmlFiles(ROOT, []);
  const changed = [];
  for (const full of files) {
    const src = fs.readFileSync(full, 'utf8');
    const out = versionHtml(src, path.dirname(full));
    if (out !== src) {
      changed.push(path.relative(ROOT, full).replace(/\\/g, '/'));
      if (!CHECK) fs.writeFileSync(full, out);
    }
  }
  if (CHECK) {
    if (changed.length) {
      console.log('⛔ เลขเวอร์ชัน CSS/JS ไม่ตรงเนื้อไฟล์ ' + changed.length + ' หน้า — รัน node build/assetver.js แล้ว commit');
      changed.slice(0, 20).forEach(f => console.log('   ' + f));
      process.exit(1);
    }
    console.log('✅ เลขเวอร์ชัน CSS/JS ตรงทุกหน้า (' + files.length + ' หน้า)');
  } else {
    console.log('เลขเวอร์ชัน CSS/JS — ' + files.length + ' หน้า · เขียนใหม่ ' + changed.length);
  }
}

module.exports = { versionHtml, stripVer };
