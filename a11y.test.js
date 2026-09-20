/* การเข้าถึง (งานที่ 14) — ตรวจจาก HTML ต้นทางของทุกหน้า · เพิ่ม 2026-09-20
 *   รันด้วย:  node a11y.test.js
 *
 * ทำไมต้องเป็นเทสต์ ไม่ใช่รายงานครั้งเดียว: ของพวกนี้พังทีละนิดทุกครั้งที่มีคนเพิ่มบล็อกใหม่
 * รายงานที่ทำครั้งเดียวจะเก่าภายในสัปดาห์เดียว · ตัวตรวจที่รันทุก push เท่านั้นที่กันได้จริง
 *
 * ⚠️ ตรวจได้เฉพาะสิ่งที่อ่านจาก HTML ต้นทางได้ — ความต่างสี การใช้คีย์บอร์ดจริง
 *    และขนาดเป้ากดหลัง CSS ทำงาน ต้องวัดในเบราว์เซอร์ (บันทึกผลไว้ใน docs/audit/)
 */
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}

const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
// `__*.html` = สำเนาชั่วคราวตอนทดสอบด้วยมือ ไม่ใช่หน้าจริง
const PAGES = fs.readdirSync(__dirname).filter(f => f.endsWith('.html') && !f.startsWith('__'));

// ---------- ตัวช่วยอ่าน HTML แบบหยาบ (พอสำหรับสิ่งที่ตรวจ) ----------
function strip(html) {
  // ตัดคอมเมนต์ สคริปต์ และสไตล์ทิ้งก่อนเสมอ — ไม่งั้นตัวอย่างโค้ดในคอมเมนต์ถูกนับเป็นของจริง
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}
function tags(html, name) {
  const out = [];
  const re = new RegExp('<' + name + '\\b([^>]*)>', 'gi');
  let m;
  while ((m = re.exec(html))) out.push(m[1] || '');
  return out;
}
function attr(s, k) {
  const m = s.match(new RegExp(k + '\\s*=\\s*"([^"]*)"', 'i'));
  return m ? m[1] : null;
}

console.log('\n1) ⭐ หนึ่งหน้าต้องมี <h1> เดียว');
// มากกว่าหนึ่ง = เครื่องอ่านหน้าจอบอกไม่ได้ว่าหน้านี้เรื่องอะไร · ไม่มีเลย = ไม่มีหัวเรื่อง
PAGES.forEach(f => {
  const n = (strip(read(f)).match(/<h1\b/gi) || []).length;
  // land.html วาด h1 ด้วย JS หลังโหลดข้อมูลแปลง (หน้าสแตติก p/*.html มีใน HTML ต้นทางแล้ว)
  if (f === 'land.html') { ok(f + ': h1 มาจาก JS (ยอมรับได้)', n === 0, 'เจอ ' + n); return; }
  ok(f + ': มี h1 เดียว', n === 1, 'เจอ ' + n + ' ตัว');
});

console.log('\n2) ลำดับหัวข้อห้ามข้ามขั้น (h1 → h3 โดยไม่มี h2)');
PAGES.forEach(f => {
  const hs = [];
  const re = /<h([1-6])\b/gi;
  let m; const src = strip(read(f));
  while ((m = re.exec(src))) hs.push(Number(m[1]));
  let bad = '';
  for (let i = 1; i < hs.length; i++) {
    if (hs[i] - hs[i - 1] > 1) { bad = 'h' + hs[i - 1] + ' → h' + hs[i]; break; }
  }
  ok(f + ': ลำดับหัวข้อต่อเนื่อง', !bad, bad);
});

console.log('\n3) ⭐ ช่องกรอกทุกช่องต้องมีชื่อกำกับ');
// ไม่มีชื่อกำกับ = เครื่องอ่านหน้าจออ่านว่า "ช่องแก้ไขข้อความ" เฉยๆ ผู้ใช้ไม่รู้ว่าต้องกรอกอะไร
PAGES.forEach(f => {
  const src = strip(read(f));
  const bad = [];
  ['input', 'select', 'textarea'].forEach(t => {
    tags(src, t).forEach(a => {
      const type = (attr(a, 'type') || '').toLowerCase();
      if (t === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].indexOf(type) >= 0) return;
      const id = attr(a, 'id');
      const named = attr(a, 'aria-label') || attr(a, 'aria-labelledby') || attr(a, 'title');
      // <label for="x"> หรือช่องที่อยู่ใน <label> — ตรวจแบบหยาบด้วยการหา for="id"
      const hasFor = id && new RegExp('<label[^>]+for="' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"').test(src);
      // ช่องที่ถูกห่อด้วย <label> โดยไม่มี for — หาโดยดูว่าอยู่หลัง <label> ที่ยังไม่ปิด
      const wrapped = new RegExp('<label[^>]*>(?:(?!</label>)[\\s\\S]){0,600}?' +
        (id ? 'id="' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"' : '<' + t + '\\b')).test(src);
      if (!named && !hasFor && !wrapped) bad.push(t + (id ? '#' + id : '') + (type ? '[' + type + ']' : ''));
    });
  });
  ok(f + ': ทุกช่องมีชื่อกำกับ', bad.length === 0, bad.join(', '));
});

console.log('\n4) ⭐ <img> ทุกตัวต้องมี alt (ว่างได้ ถ้าเป็นภาพตกแต่ง)');
// **ไม่มี alt เลย** ต่างจาก `alt=""` — ตัวแรกทำให้เครื่องอ่านหน้าจออ่านชื่อไฟล์ออกมา
PAGES.forEach(f => {
  const src = strip(read(f));
  const bad = tags(src, 'img').filter(a => attr(a, 'alt') === null)
    .map(a => attr(a, 'src') || '(ไม่มี src)');
  ok(f + ': img มี alt ครบ', bad.length === 0, bad.join(', '));
});

console.log('\n5) ลิงก์ข้ามไปเนื้อหาหลัก + จุดหมายของมัน');
PAGES.forEach(f => {
  const src = read(f);
  const hasSkip = /class="njh-skip" href="#main"/.test(src);
  const hasMain = /id="main"/.test(src);
  ok(f + ': มีลิงก์ข้ามไปเนื้อหา', hasSkip);
  ok(f + ': มีปลายทาง #main จริง', hasMain);
});

console.log('\n6) ⭐ ผลลัพธ์ที่เปลี่ยนเองต้องประกาศให้เครื่องอ่านหน้าจอรู้ (aria-live)');
// คนที่ใช้เครื่องอ่านหน้าจอไม่เห็นว่าการ์ดเปลี่ยนไปแล้ว ถ้าไม่ประกาศก็เหมือนกดแล้วไม่มีอะไรเกิดขึ้น
[['index.html', 'result-note'], ['listings.html', 'result-note'], ['land.html', 'ld-root']].forEach(p => {
  const src = read(p[0]);
  const re = new RegExp('id="' + p[1] + '"[^>]*aria-live');
  const re2 = new RegExp('aria-live[^>]*id="' + p[1] + '"');
  ok(p[0] + ': #' + p[1] + ' ประกาศ aria-live', re.test(src) || re2.test(src));
});
ok('กล่องข้อความผิดพลาดของฟอร์มประกาศตัวเอง (role=alert)',
   ['consign.html', 'verify.html', 'wanted.html'].every(f => /role="alert"/.test(read(f))));

console.log('\n7) เคารพ prefers-reduced-motion');
const cssFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.css'));
const withMotion = cssFiles.filter(f => /transition|animation/.test(read(f)));
const withGuard = withMotion.filter(f => /prefers-reduced-motion/.test(read(f)));
// token กลางตั้ง --nj-dur เป็น 0 ใต้ prefers-reduced-motion ให้ทั้งเว็บอยู่แล้ว
ok('⭐ token กลางตัด --nj-dur เป็น 0 ใต้ prefers-reduced-motion',
   /prefers-reduced-motion[\s\S]{0,200}--nj-dur/.test(read('tokens.css')));
ok('ไฟล์ที่มีอนิเมชันเองก็มีทางปิด (' + withGuard.length + '/' + withMotion.length + ')',
   withGuard.length >= Math.ceil(withMotion.length * 0.5),
   withMotion.filter(f => withGuard.indexOf(f) < 0).join(', '));

console.log('\n8) เป้ากดบนมือถือ ≥ 44px — กฎที่ประกาศไว้ในสไตล์กลาง');
ok('ปุ่มกลางสูงอย่างน้อย 44px', /min-height:\s*44px/.test(read('components.css')));
ok('ช่องกรอกกลางสูงอย่างน้อย 44px', (read('components.css').match(/min-height:\s*44px/g) || []).length >= 2);
ok('⭐ ช่องกรอกใช้ตัวอักษร 16px (ต่ำกว่านี้ iOS ซูมหน้าเองตอนแตะ)',
   /font-size:\s*16px/.test(read('components.css')));

console.log('\n9) ภาษาของหน้าและชื่อหน้า');
PAGES.forEach(f => {
  const src = read(f);
  ok(f + ': ประกาศ lang="th"', /<html[^>]+lang="th"/.test(src));
  const t = (src.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  ok(f + ': มีชื่อหน้าและไม่ยาวเกินไป', t.trim().length > 0 && t.trim().length <= 75, t.trim().length + ' ตัวอักษร');
});

console.log('\n' + (fail ? '❌' : '✅') + ' a11y: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
