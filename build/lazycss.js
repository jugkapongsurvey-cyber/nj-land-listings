/* เปลี่ยนสไตล์ชีตที่ "ไม่ได้ใช้กับสิ่งที่อยู่ในหน้าตั้งแต่แรก" ให้โหลดแบบไม่บล็อกการวาดหน้า
 *
 *   รันด้วย:  node build/lazycss.js          (เขียนไฟล์จริง)
 *             node build/lazycss.js --check  (ตรวจอย่างเดียว · ใช้ใน CI)
 *
 * กติกาที่ใช้ตัดสิน — อ่านก่อนเพิ่มไฟล์เข้า CANDIDATES
 * ---------------------------------------------------------------------------
 * ไฟล์ใน CANDIDATES เป็นสไตล์ของ **ของที่ JS สร้างขึ้นทีหลัง** (ปุ่มบันทึก/เทียบแปลง
 * ป้ายระดับตรวจสอบ กล่องแชท แถบคุกกี้) แต่ไฟล์เดียวกันอาจเป็น **เนื้อหาหลักของอีกหน้า**
 * ได้ด้วย (เช่น legal.css คือหน้าตาของหน้านโยบาย · compare.css คือหน้าเทียบแปลง)
 *
 * สคริปต์นี้จึงไม่ตัดสินจากชื่อไฟล์ แต่ดูว่า **คลาสของไฟล์นั้นโผล่ในมาร์กอัปของหน้าไหม**
 *   ไม่โผล่เลย → ของถูกสร้างด้วย JS → ทำเป็น preload ได้ ไม่มีใครเห็นของที่ยังไม่มีสไตล์
 *   โผล่       → เป็นเนื้อหาของหน้านั้นจริง → ปล่อยเป็น stylesheet ตามเดิม
 *
 * ⚠️ ทุกอันที่เปลี่ยนต้องมี <noscript> คู่กันเสมอ — ปิด JS แล้วต้องยังได้สไตล์ครบ
 * ⚠️ ตัวสลับ rel อยู่ที่ lazycss.js ซึ่งเป็นสคริปต์ตัวแรกของทุกหน้า (CORE_JS)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

// สไตล์ชีตของ "ของที่ JS สร้างทีหลัง" — ดูกติกาข้างบนก่อนเพิ่ม
const CANDIDATES = ['njchat.css', 'compare.css', 'save.css', 'legal.css', 'landscore.css', 'verified.css'];

// คลาสทั้งหมดที่ไฟล์ CSS นั้นใช้ (เอาเฉพาะชื่อคลาส ไม่เอา pseudo/attribute)
function classesOf(file) {
  const css = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const set = new Set();
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) set.add(m[1]);
  return [...set];
}

// หน้ามีคลาสพวกนี้อยู่ในมาร์กอัปหรือยัง (ดูเฉพาะค่าใน class="...")
function usesAny(html, classes) {
  const used = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) used.add(c);
  }
  return classes.some((c) => used.has(c));
}

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
const classCache = {};
let changed = 0;
const report = [];

for (const page of pages) {
  const file = path.join(ROOT, page);
  let html = fs.readFileSync(file, 'utf8');
  const eol = html.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  const before = html;
  const lazy = [];

  for (const css of CANDIDATES) {
    const tag = '<link rel="stylesheet" href="' + css + '">';
    // ⚠️ แปลงไปแล้วต้องข้าม — ข้อความเดิมยังอยู่ใน <noscript> ที่เราใส่ให้คู่กัน
    //    ไม่เช็กตรงนี้ = รันซ้ำแล้วห่อซ้อนไปเรื่อยๆ และ --check จะฟ้องทั้งที่ไฟล์ถูกแล้ว
    if (html.indexOf('data-njcss href="' + css + '"') >= 0) continue;
    if (html.indexOf(tag) < 0) continue;
    if (!classCache[css]) classCache[css] = classesOf(css);
    if (usesAny(html, classCache[css])) continue;   // เป็นเนื้อหาของหน้านี้เอง — ปล่อยไว้
    html = html.replace(tag,
      '<link rel="preload" as="style" data-njcss href="' + css + '">' + eol +
      '  <noscript><link rel="stylesheet" href="' + css + '"></noscript>');
    lazy.push(css);
  }

  if (html !== before) {
    changed++;
    report.push('  ' + page.padEnd(22) + lazy.join(' '));
    if (!CHECK) fs.writeFileSync(file, html);
  }
}

if (CHECK) {
  if (changed) {
    console.error('⚠ มี ' + changed + ' หน้าที่ยังโหลดสไตล์ชีตของ JS แบบบล็อกการวาดหน้า — รัน `node build/lazycss.js`');
    report.forEach((r) => console.error(r));
    process.exit(1);
  }
  console.log('✅ ทุกหน้าโหลดสไตล์ชีตแบบไม่บล็อกครบแล้ว (' + pages.length + ' หน้า)');
} else {
  console.log('เปลี่ยนแล้ว ' + changed + ' หน้า');
  report.forEach((r) => console.log(r));
}
