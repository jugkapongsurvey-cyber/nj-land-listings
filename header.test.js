/* หัวเว็บชุดเดียว + Design Token (Sprint 1 · งานที่ 1–2) · เพิ่ม 2026-09-20
 *   รันด้วย:  node header.test.js
 *
 * ทำไมต้องมี: ก่อนหน้านี้หัวเว็บถูกคัดลอกลง HTML ทีละหน้า ผลคือตอนตรวจ 19 ก.ย. 2569
 * พบเมนู **10 รูปแบบใน 21 หน้า** และสิ่งเดียวกันถูกเรียกด้วยชื่อ 4 แบบ
 * เทสต์นี้กันไม่ให้กลับไปเป็นแบบนั้นอีก โดยตรวจ "ผลลัพธ์ที่ commit ไว้" ไม่ใช่ตรวจตัวสคริปต์
 * (ไฟล์ที่ขึ้นเว็บจริงคือไฟล์ในโฟลเดอร์ ไม่ใช่สิ่งที่ build ตั้งใจจะเขียน)
 */
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 180) : '')); }
}

const pages = fs.readdirSync(__dirname).filter(f => f.endsWith('.html')).sort();
const html = {};
pages.forEach(f => { html[f] = read(f); });

// ---------------------------------------------------------------------------
console.log('\n1) ทุกหน้าต้องมีหัวเว็บชุดเดียวกัน');
ok('มีหน้า HTML ให้ตรวจ', pages.length >= 20, pages.length);

const missing = pages.filter(f => !/<header class="njh"/.test(html[f]));
ok('⭐ ทุกหน้ามีหัวเว็บชุดกลาง', missing.length === 0, missing.join(', '));

const noMarker = pages.filter(f => !html[f].includes('NJ:HEADER เริ่ม') || !html[f].includes('NJ:HEADER จบ'));
ok('ทุกหน้ามีเครื่องหมายของ build ครบคู่', noMarker.length === 0, noMarker.join(', '));

// ⚠️ หัวเว็บต้องเป็นลูกตัวแรกของ <body> เท่านั้น
// เคยพลาดมาแล้ว: build รอบแรกแทนที่ <header> ตรงที่มันอยู่ ซึ่งบนหน้าแรกคือข้างใน
// `<div style="overflow-x:hidden">` → `<section data-r="hero">`
// บรรพบุรุษที่ overflow ไม่ใช่ visible ทำให้ position:sticky **ไม่ทำงานเลย**
const notFirst = pages.filter(f => {
  const b = html[f].match(/<body[^>]*>/);
  if (!b) return true;
  const after = html[f].slice(html[f].indexOf(b[0]) + b[0].length, html[f].indexOf('<!-- NJ:HEADER เริ่ม'));
  return after.replace(/<!--[\s\S]*?-->/g, '').trim() !== '';
});
ok('⭐ หัวเว็บเป็นลูกตัวแรกของ <body> ทุกหน้า (ไม่งั้น sticky ตาย)', notFirst.length === 0, notFirst.join(', '));

// รายการลิงก์ในเมนูต้องเหมือนกันเป๊ะทุกหน้า
function navLinks(src) {
  const m = src.match(/<nav class="njh-nav"[\s\S]*?<\/nav>/);
  if (!m) return null;
  return [...m[0].matchAll(/<a[^>]*href="([^"]*)"/g)].map(x => x[1]).join(' ');
}
const sigs = {};
pages.forEach(f => { const s = navLinks(html[f]); (sigs[s] = sigs[s] || []).push(f); });
ok('⭐ เมนูเหมือนกันทุกหน้า (เหลือรูปแบบเดียว)', Object.keys(sigs).length === 1,
   Object.keys(sigs).length + ' รูปแบบ: ' + Object.values(sigs).map(v => v.length + ' หน้า').join(' / '));

console.log('\n2) โครงเมนูตามโจทย์งานที่ 2');
const home = html['index.html'];
const tops = [...home.matchAll(/<a class="njh-top"[^>]*>([^<]*)/g)].map(x => x[1].trim());
ok('⭐ แถวแรกมี 6 กลุ่มพอดี (ของเดิม 11 ลิงก์จนเต็มความกว้าง)', tops.length === 6, tops.join(' · '));
['ซื้อ/เช่าทรัพย์', 'ขาย/ฝากทรัพย์', 'ตรวจสอบและรังวัด', 'ความรู้และเครื่องมือ', 'เกี่ยวกับเรา', 'ติดตามงาน']
  .forEach(t => ok('มีกลุ่ม "' + t + '"', tops.indexOf(t) >= 0, tops.join(' · ')));
ok('มีปุ่ม "ฝากขายฟรี" บนหัวเว็บ', /<a class="njh-cta"[^>]*>ฝากขายฟรี<\/a>/.test(home));
ok('มีเมนูย่อย 4 กลุ่ม', (home.match(/njh-has-menu/g) || []).length === 4,
   (home.match(/njh-has-menu/g) || []).length);

console.log('\n3) ปลายทางทุกอันต้องมีอยู่จริง');
const hrefs = (home.match(/<nav class="njh-nav"[\s\S]*?<\/nav>/) || [''])[0]
  .match(/href="([^"]*)"/g).map(s => s.slice(6, -1));
// ยกเว้นเฉพาะหน้าบนโดเมนระบบของบริษัท (ทางเข้าบัญชีเจ้าของทรัพย์) — โดเมนอื่นยังนับว่าเสีย
const bad = [...new Set(hrefs)].map(h => h.split('#')[0])
  .filter(h => h && !/^https:\/\/app\.njteedinsure\.com\/[\w-]+\.html$/.test(h) && !fs.existsSync(path.join(__dirname, h)));
ok('⭐ ไม่มีลิงก์ในเมนูที่ชี้ไปหน้าที่ไม่มีอยู่', bad.length === 0, bad.join(', '));
ok('⭐ เมนู "ขาย/ฝากทรัพย์" มีทางเข้าบัญชีเจ้าของทรัพย์',
   /<a href="https:\/\/app\.njteedinsure\.com\/seller\.html"><b>เข้าสู่ระบบเจ้าของทรัพย์<\/b>/.test(home));
ok('⭐ หัวเว็บมีปุ่ม "เข้าสู่ระบบ" ไปหน้า seller.html ของระบบ',
   /<a class="njh-login" href="https:\/\/app\.njteedinsure\.com\/seller\.html"[^>]*>เข้าสู่ระบบ<\/a>/.test(home));
ok('ปุ่มเข้าสู่ระบบซ่อนต่ำกว่า 1280px (ไม่งั้นเมนูตัดบรรทัด · เมนูย่อยมีรายการเดียวกันแล้ว)',
   /max-width: 1279px\)\s*\{\s*\.njh-login \{ display: none; \}/.test(fs.readFileSync(path.join(__dirname, 'header.css'), 'utf8')));
ok('จุดยึด terms.html#levels มีอยู่จริง', /id="levels"/.test(html['terms.html']));

console.log('\n4) บอกหน้าที่กำลังเปิดอยู่ (Active State)');
// เทียบเป็นคู่ ไฟล์ ↔ ข้อความที่ต้องถูกทำเครื่องหมาย
[['listings.html', 'ประกาศทั้งหมด'], ['consign.html', 'ฝากขายที่ดิน'],
 ['verify.html', 'ส่งทรัพย์ให้ตรวจก่อนซื้อ'], ['tools.html', 'เครื่องมือคำนวณ'],
 ['portal.html', 'ติดตามงาน'], ['guides.html', 'คู่มือที่ดิน']].forEach(function (p) {
  const f = p[0], label = p[1];
  const re = new RegExp('aria-current="page"[^>]*>(?:<b>)?' + label.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'));
  ok(f + ' ทำเครื่องหมายที่ "' + label + '"', re.test(html[f]));
});
// หน้าที่ "ไม่ควร" อยู่ในเมนูหลัก จึงไม่มี aria-current ได้อย่างถูกต้อง
//   · หน้ารายละเอียด/หน้าที่เข้าด้วยตั๋ว — ไม่ใช่ปลายทางของเมนู
//   · หน้านโยบาย 3 หน้า — อยู่ในแถบท้ายหน้า ไม่ใช่เมนูหลัก (ดู legal.css)
// ⚠️ รายการนี้ต้องตรงเป๊ะ ไม่ใช่แค่ "ไม่เกินกี่หน้า" — หน้าใหม่ที่หลุดเมนูโดยไม่ตั้งใจจะได้ถูกจับ
//   · locations.html — ดัชนีหน้าพื้นที่ ยังไม่ใส่ในเมนูเพราะตอนนี้ยังไม่มีพื้นที่ไหนเผยแพร่
//     (ลิงก์ไปหน้าที่ว่างเปล่าแย่กว่าไม่มีลิงก์) · ใส่ในรอบที่ทีมเผยแพร่หน้าพื้นที่หน้าแรก
//   · partners.html — ทำเนียบบริษัทพันธมิตร ยังไม่ใส่ในเมนูเพราะทำเนียบเปิดด้วยสวิตช์ partner_directory
//     (ค่าเริ่มต้นปิด) · ใส่ในรอบที่มีบริษัทขึ้นเว็บจริงแล้ว พร้อมเปลี่ยน noindex เป็น index
const EXPECT_NO_CURRENT = ['404.html', 'compare.html', 'cookie.html', 'deal.html', 'land.html', 'locations.html',
                           'notify.html', 'package-order.html', 'partners.html', 'privacy.html', 'quote.html', 'room.html',
                           'unsubscribe.html'];
const noCurrent = pages.filter(f => !/aria-current="page"/.test(html[f]));
ok('⭐ มีเฉพาะหน้าที่ตั้งใจไม่ใส่ไว้ในเมนูหลักเท่านั้นที่ไม่มีสถานะหน้าปัจจุบัน',
   noCurrent.join(',') === EXPECT_NO_CURRENT.join(','), noCurrent.join(', '));
ok('⭐ ห้ามมี aria-current มากกว่า 1 ตัวในแถวเมนูบนสุด',
   pages.every(f => (((html[f].match(/<nav class="njh-nav"[\s\S]*?<\/nav>/) || [''])[0]
     .match(/<a class="njh-top"[^>]*aria-current/g)) || []).length <= 1));

console.log('\n5) ลิงก์ข้ามไปเนื้อหาหลัก (Skip Link)');
const noSkip = pages.filter(f => !/class="njh-skip" href="#main"/.test(html[f]));
ok('⭐ ทุกหน้ามีลิงก์ข้ามไปเนื้อหาหลัก (ของเดิมไม่มีเลยสักหน้า)', noSkip.length === 0, noSkip.join(', '));
const dupSkip = pages.filter(f => (html[f].match(/href="#main"/g) || []).length > 1);
ok('ไม่มีหน้าที่มีลิงก์ข้ามซ้ำสองอัน', dupSkip.length === 0, dupSkip.join(', '));

console.log('\n6) สไตล์ชีตกลางต้องมาก่อนไฟล์อื่น');
// (*) อ่านรายชื่อจาก build/pages.js ตรงๆ ไม่พิมพ์ซ้ำไว้ที่นี่ —
//     สองที่เลื่อนออกจากกันเมื่อไหร่คือความผิดพลาดที่แพงที่สุดของรีโปนี้
const CORE = (function () {
  const m = /const CORE_CSS = \[([^\]]*)\]/.exec(read('build/pages.js'));
  return m[1].split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
})();
ok('อ่าน CORE_CSS จาก build/pages.js ได้', CORE.length >= 3, CORE.join(', '));
ok('⭐ fonts.css มาก่อนเสมอ (เป็น @font-face ที่เสิร์ฟเอง ต้องประกาศก่อนไฟล์ที่ใช้ฟอนต์)',
   CORE[0] === 'fonts.css', CORE.join(', '));
pages.forEach(f => {
  const links = [...html[f].matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]*)"/g)].map(x => x[1]);
  const localFirst = links.filter(h => !/^https?:/.test(h)).slice(0, CORE.length);
  ok(f + ' โหลดสไตล์ชีตกลางเป็นชุดแรก',
     CORE.every((c, i) => localFirst[i] === c), localFirst.join(', '));
});

console.log('\n6c) ⭐ สไตล์ชีตของของที่ JS สร้างทีหลัง ต้องไม่บล็อกการวาดหน้า');
// กติกาและตัวเลือกหน้าอยู่ที่ build/lazycss.js (ดูเหตุผลในไฟล์นั้น) · ตัวสลับ rel คือ lazycss.js
const lazyPages = pages.filter(f => html[f].indexOf('data-njcss') >= 0);
ok('⭐ มีหน้าที่โหลดสไตล์ชีตแบบไม่บล็อกจริง', lazyPages.length >= 15, String(lazyPages.length) + ' หน้า');
const noFallback = [];
lazyPages.forEach(f => {
  for (const m of html[f].matchAll(/data-njcss href="([^"]+)"/g)) {
    if (html[f].indexOf('<noscript><link rel=\"stylesheet\" href=\"' + m[1] + '\">') < 0) noFallback.push(f + ':' + m[1]);
  }
});
ok('⭐ ทุกอันมี <noscript> คู่กัน (ปิด JS แล้วต้องยังได้สไตล์ครบ)', noFallback.length === 0, noFallback.join(', '));
const swap = read('lazycss.js');
ok('lazycss.js สลับ rel ให้ลิงก์ที่ติด data-njcss', swap.indexOf('data-njcss') >= 0);
// ⚠️ ตัดคอมเมนต์ออกก่อน — หัวไฟล์อธิบายไว้เองว่าห้ามใช้ onload= จึงมีคำนั้นอยู่
ok('⚠️ ห้ามกลับไปใช้ on* บนแท็ก link (กติกา CSP ของรีโป)',
   !/on[a-z]+=/.test(swap.replace(/\/\*[\s\S]*?\*\//g, '')));
const coreJs = /const CORE_JS = \[([^\]]*)\]/.exec(read('build/pages.js'))[1];
ok('⭐ lazycss.js เป็นสคริปต์ตัวแรกของทุกหน้า (ไม่งั้นเห็นของที่ยังไม่มีสไตล์แวบหนึ่ง)',
   coreJs.split(',')[0].indexOf('lazycss.js') >= 0, coreJs);

console.log('\n6d) ⭐ เปิดการเชื่อมต่อไปโดเมนของระบบหลังบ้านล่วงหน้า');
// รูปการ์ดและข้อมูลทุกหน้ามาจาก app.njteedinsure.com ซึ่งเป็นคนละโดเมน
// ไม่ preconnect ไว้ เบราว์เซอร์ต้องทำ DNS+TLS ก่อนโหลดรูปใบแรก (Lighthouse ตีราว 310 ms)
const noPre = pages.filter(f => !/rel="preconnect" href="https:\/\/app\.njteedinsure\.com" crossorigin/.test(html[f]));
ok('⭐ ทุกหน้ามี preconnect ไป app.njteedinsure.com พร้อม crossorigin', noPre.length === 0, noPre.join(', '));

console.log('\n6b) ⭐ ฟอนต์ต้องเสิร์ฟจากโดเมนเดียวกับเว็บ ไม่ใช่ดึงจาก Google');
// ของเดิมดึงจาก fonts.googleapis.com + fonts.gstatic.com = ต้องเปิดการเชื่อมต่อใหม่ 2 โดเมน
// วัดบนเครื่อง 22 ก.ย. 69: ดึงจาก Google 85 คะแนน · เสิร์ฟเอง 89 คะแนน (LCP 3,500 -> 3,340 ms)
const gf = pages.filter(f => /fonts\.(googleapis|gstatic)\.com/.test(html[f]));
ok('⭐ ไม่มีหน้าไหนดึงฟอนต์จาก Google อีก', gf.length === 0, gf.join(', '));
const fcss = read('fonts.css');
ok('fonts.css ชี้ไฟล์ในโฟลเดอร์ fonts/ เท่านั้น',
   /url\(fonts\//.test(fcss) && !/url\(https?:/.test(fcss));
ok('ยังตั้ง font-display:swap (ตัวหนังสืออ่านได้ทันทีด้วยฟอนต์สำรองระหว่างรอ)',
   (fcss.match(/font-display:\s*swap/g) || []).length >= 4);
ok('⭐ มีไฟล์สัญญาอนุญาต fonts/OFL.txt (SIL OFL 1.1 บังคับให้แนบไปด้วย)',
   fs.existsSync(path.join(__dirname, 'fonts', 'OFL.txt')));
const missingFont = [...fcss.matchAll(/url\((fonts\/[^)]+)\)/g)]
  .map(m => m[1]).filter(u => !fs.existsSync(path.join(__dirname, u)));
ok('ไฟล์ฟอนต์ทุกตัวที่ fonts.css อ้างถึงมีอยู่จริง', missingFont.length === 0, missingFont.join(', '));

console.log('\n7) Design Token');
const tok = read('tokens.css');
[['สี Navy', '--nj-navy-900'], ['สี Gold', '--nj-gold-500'], ['สีเทากลาง', '--nj-gray-600'],
 ['ตัวอักษร', '--nj-font'], ['สเกลหัวข้อ', '--nj-fs-h1'], ['ระยะห่าง', '--nj-space-4'],
 ['มุมโค้ง', '--nj-radius-md'], ['เงา', '--nj-shadow-md'], ['ชั้นความสูง', '--nj-z-header'],
 ['ความกว้างบรรทัด', '--nj-measure']].forEach(p => ok('มี token ' + p[0], tok.indexOf(p[1]) >= 0));

// ขนาดตามที่โจทย์กำหนด
ok('H1 เดสก์ท็อปอยู่ในช่วง 48–56px', /--nj-fs-h1:\s*5[0-6]px/.test(tok), (tok.match(/--nj-fs-h1:[^;]*/) || [''])[0]);
ok('H2 เดสก์ท็อปอยู่ในช่วง 32–40px', /--nj-fs-h2:\s*(3[2-9]|40)px/.test(tok));
ok('Body เดสก์ท็อปอยู่ในช่วง 17–18px', /--nj-fs-body:\s*1[78]px/.test(tok));
ok('line-height อยู่ในช่วง 1.55–1.70', /--nj-lh-body:\s*1\.(5[5-9]|6[0-9]|70)/.test(tok));
ok('เมนูอยู่ในช่วง 15–16px', /--nj-fs-nav:\s*1[56]px/.test(tok));
ok('มีสเกลของจอเล็ก', /max-width:\s*640px/.test(tok) && /--nj-fs-h1:\s*3[2-8]px/.test(tok));

console.log('\n8) ⭐ ฟอนต์ตระกูลเดียวทั้งเว็บ');
const cssFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.css'));
const strays = [];
cssFiles.concat(pages).forEach(f => {
  const body = read(f).replace(/^\s*\/\*[\s\S]*?\*\//gm, '').replace(/<!--[\s\S]*?-->/g, '');
  if (/Trirong|Sarabun/.test(body)) strays.push(f);
});
ok('ไม่มี Trirong / Sarabun เหลืออยู่ที่ไหนอีก', strays.length === 0, strays.join(', '));
// ตั้งแต่ย้ายมาเสิร์ฟฟอนต์เอง ทุกหน้าได้ชุดเดียวกันโดยอัตโนมัติ เพราะ fonts.css
// อยู่ใน CORE_CSS ที่ build/pages.js ใส่ให้ทุกหน้า (ข้อ 6 ตรวจไว้แล้ว)
// เหลือตรวจว่าในไฟล์นั้นมีตระกูลฟอนต์เดียวจริง
const fams = new Set([...read('fonts.css').matchAll(/font-family:\s*'([^']+)'/g)].map(m => m[1]));
ok('⭐ fonts.css ประกาศตระกูลฟอนต์เดียว', fams.size === 1, [...fams].join(' | '));
ok('ชุดฟอนต์คือ IBM Plex Sans Thai', [...fams][0] === 'IBM Plex Sans Thai', [...fams][0]);
const noFontCss = pages.filter(f => read(f).indexOf("href=\"fonts.css\"") < 0);
ok('ทุกหน้าลิงก์ fonts.css', noFontCss.length === 0, noFontCss.join(', '));

console.log('\n9) หัวเว็บ — กติกาที่ห้ามผ่อน');
const hcss = read('header.css');
ok('หัวเว็บติดหนึบ', /\.njh\s*{[^}]*position:\s*sticky/.test(hcss));
ok('⭐ เมนูย่อยเปิดได้ด้วยโฟกัส ไม่ต้องพึ่ง JS', /:focus-within\s*>\s*\.njh-panel/.test(hcss));
ok('⭐ ขาเปิดไม่มี transition (กันแผงเปิดแล้วยังใสอยู่)',
   /:focus-within > \.njh-panel\s*{[^}]*transition:\s*none/.test(hcss));
ok('⭐ ซ่อนแถวเมนูที่จอต่ำกว่า 1024px ไม่ใช่ 1280px เหมือนเดิม',
   /max-width:\s*1023px\s*\)\s*{[^}]*\.njh-nav\s*{\s*display:\s*none/.test(hcss));
ok('สถานะหน้าปัจจุบันผูกกับ [aria-current] ไม่ใช่คลาสที่ตั้งเอง',
   /\.njh-top\[aria-current="page"\]/.test(hcss));
ok('ปุ่มบนหัวเว็บสูงไม่ต่ำกว่า 44px', /\.njh-top\s*{[^}]*min-height:\s*44px/.test(hcss));
ok('โลโก้สูงไม่ต่ำกว่า 44px', /\.njh-brand\s*{[^}]*min-height:\s*44px/.test(hcss));
ok('ปุ่มฝากขายฟรีสูงไม่ต่ำกว่า 44px', /\.njh-cta\s*{[^}]*min-height:\s*44px/.test(hcss));
ok('ชั้นความสูงของหัวเว็บอ่านจาก token', /z-index:\s*var\(--nj-z-header\)/.test(hcss));
ok('ค่าสีในหัวเว็บมาจาก token ไม่ใช่รหัสสีดิบ',
   !/#[0-9A-Fa-f]{6}/.test(hcss.replace(/\/\*[\s\S]*?\*\//g, '')));

console.log('\n10) ลิ้นชักจอเล็กต้องได้เมนูชุดเดียวกัน');
const mjs = read('menu.js');
ok('อ่านกลุ่มจาก DOM จริง ไม่ได้พิมพ์รายการซ้ำ', /querySelectorAll\('\.njh-item'\)/.test(mjs));
ok('ทำหัวกลุ่มกับลูกให้ต่างกัน', /njmenu-group/.test(mjs) && /njmenu-sub/.test(mjs));
ok('ยกสถานะหน้าปัจจุบันไปลิ้นชักด้วย', /aria-current/.test(mjs));
ok('⭐ กันลิงก์พอร์ทัลซ้ำหลังย้ายเข้า <nav>', /portal = null/.test(mjs));
ok('รู้จักปุ่มหลักของหัวเว็บชุดใหม่', /'\.njh-cta'/.test(mjs));
ok('ยังไม่ได้เขียนเลข breakpoint ทับลงในไฟล์', /getComputedStyle\(nav\)\.display/.test(mjs));

console.log('\n11) คอมโพเนนต์กลางครบตามโจทย์งานที่ 1');
const ccss = read('components.css');
[['Button', '.nj-btn'], ['Form', '.nj-input'], ['Card', '.nj-card'], ['Badge', '.nj-badge'],
 ['Alert', '.nj-alert'], ['Modal', '.nj-modal'], ['Loading', '.nj-skeleton'],
 ['Empty State', '.nj-empty'], ['Error State', '.nj-errorstate']]
  .forEach(p => ok('มีคอมโพเนนต์ ' + p[0], ccss.indexOf(p[1]) >= 0));
ok('⭐ ไม่มีรหัสสีดิบในคอมโพเนนต์ (ต้องมาจาก token)',
   !/#[0-9A-Fa-f]{6}/.test(ccss.replace(/\/\*[\s\S]*?\*\//g, '')));
ok('ปุ่มสูงไม่ต่ำกว่า 44px', /\.nj-btn\s*{[^}]*min-height:\s*44px/.test(ccss));
ok('ช่องกรอกตัวอักษรไม่ต่ำกว่า 16px (กัน iOS ซูมเอง)', /font-size:\s*16px/.test(ccss));
ok('เคารพ prefers-reduced-motion', /prefers-reduced-motion/.test(ccss));

console.log('\n' + (fail ? '❌' : '✅') + ' header: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
