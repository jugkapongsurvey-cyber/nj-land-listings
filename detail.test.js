/* หน้ารายละเอียดแปลง + การ์ดประกาศ + บันทึกแปลง (Sprint 3 · งานที่ 7–8) · เพิ่ม 2026-09-20
 *   รันด้วย:  node detail.test.js
 *
 * ทำไมต้องมี: รอบนี้แตะสามอย่างที่พังเงียบได้ง่ายที่สุด —
 *   (1) ลำดับโหลดสคริปต์ (listings.js อ่าน window.NJSave ตอนเริ่มทำงานทันที)
 *   (2) กับดัก MutationObserver ในตัวแปะปุ่มบนการ์ด
 *   (3) ชื่อเหตุการณ์สถิติที่ต้องตรงกันสองรีโป
 */
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 170) : '')); }
}

const land = read('land.js');
const card = read('listingcard.js');
const save = read('save.js');
const ver = read('verified.js');
const lst = read('listings.js');
const ana = read('analytics.js');

console.log('\n1) การ์ดประกาศ (งานที่ 7)');
// ⚠️ รหัสทรัพย์ย้ายไปอยู่แถวท้ายการ์ด (.card-foot) ตามดีไซน์ใหม่ 2026-09-22 แต่ **ยังต้องเห็นด้วยตา**
//    เหตุผลเดิมไม่เปลี่ยน: ผู้ซื้อทักไลน์มาว่า "สนใจแปลงนึงในเว็บ" โดยไม่บอกว่าแปลงไหน
//    ทีมจับคู่กลับไม่ได้ เจ้าของที่ดินจึงไม่เคยรู้ว่ามีคนสนใจแปลงตัวเอง
ok('⭐ แสดงรหัสทรัพย์ให้ผู้ใช้เห็น', /รหัส <b>' \+ esc\(item\.id\)/.test(card));
// ⚠️ ดีไซน์ใหม่ไม่มีลิงก์ "ดูรายละเอียดแปลง" แยกต่างหาก — ชื่อแปลงเป็นลิงก์จริงแทน
//    สิ่งที่ข้อนี้คุ้มครองคือ "ต้องมีลิงก์จริงที่คีย์บอร์ดและโปรแกรมอ่านหน้าจอเดินไปถึงได้"
//    ไม่ใช่คลาสชื่อใดชื่อหนึ่ง · การ์ดที่กดได้ด้วยเมาส์อย่างเดียวคือการ์ดที่คนใช้คีย์บอร์ดเปิดไม่ได้
ok('⭐ มีลิงก์จริงไปหน้ารายละเอียด (ไม่ใช่กดได้ด้วยเมาส์อย่างเดียว)',
   /class="card-title"><a href="' \+ esc\(href\)/.test(card));
['listingcard.css', 'marketplace.css', 'njchat.css'].forEach(f => {
  const css = read(f);
  ok('สไตล์รหัสทรัพย์บนการ์ดอยู่ใน ' + f, /\.card-code|\.card-foot b/.test(css));
});
// ความต่างสีของป้ายระดับข้อมูล — ตรวจด้วยการคำนวณจริง ไม่ใช่จับคู่รหัสสีตายตัว
// (ของเดิมล็อกสตริง `#6B571E` ไว้ พอเปลี่ยนดีไซน์ก็แดงทั้งที่สีใหม่ยังผ่านเกณฑ์)
function lum(hex) {
  const v = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
function contrast(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const lcCss = read('listingcard.css');
function bgOf(cls) {
  const m = lcCss.match(new RegExp('\\.' + cls + '\\{background:(#[0-9a-fA-F]{6})\\}'));
  return m ? m[1] : '';
}
['badge-verified', 'badge-basic'].forEach(cls => {
  const bg = bgOf(cls);
  ok('อ่านสีพื้นของ .' + cls + ' ได้', !!bg, bg);
  // ป้ายบนรูปเป็นตัวอักษรขาว 12px ตัวหนา = ข้อความขนาดปกติ ต้องได้ 4.5:1 ขึ้นไป
  ok('⭐ .' + cls + ' ความต่างสีผ่าน AA (4.5:1)', bg && contrast('#ffffff', bg) >= 4.5,
     bg ? contrast('#ffffff', bg).toFixed(2) + ':1' : '');
});

console.log('\n2) ระดับการตรวจสอบ 1–5 (งานที่ 7)');
[['owner', 'ข้อมูลจากเจ้าของ'], ['document', 'ตรวจเอกสารเบื้องต้น'], ['site', 'ลงพื้นที่ตรวจสอบ'],
 ['survey', 'รังวัดยืนยันแนวเขต'], ['transfer', 'พร้อมรายงานตรวจสอบ']].forEach(p => {
  ok('ระดับ ' + p[0] + ' ใช้ชื่อ "' + p[1] + '"',
     new RegExp("k: '" + p[0] + "',\\s*th: '" + p[1] + "'").test(ver));
});
ok('⭐ คีย์ในฐานข้อมูลไม่เปลี่ยน (ไม่มี migration)',
   ['owner', 'document', 'site', 'survey', 'transfer'].every(k => ver.indexOf("k: '" + k + "'") >= 0));
ok('มีเลขระดับกำกับชื่อ', /function levelName/.test(ver));
ok('ป้ายบนการ์ดบอกชื่อระดับที่ถึงแล้ว ไม่ใช่แค่เศษส่วน', /LEVELS\[i\] \? LEVELS\[i\]\.th/.test(ver));
ok('⭐ ยังไม่ถึงระดับใดเลย = ไม่ขึ้นป้าย', /if \(!v \|\| !v\.total \|\| !v\.reached\) return/.test(ver));

console.log('\n3) บันทึกแปลง (งานที่ 7)');
// ⚠️ เทียบเฉพาะการ "เรียกใช้" ไม่ใช่ทั้งไฟล์ — คอมเมนต์หัวไฟล์พูดถึง sessionStorage โดยตั้งใจ
ok('⭐ เก็บใน localStorage (ต่างจาก compare ที่ใช้ sessionStorage)',
   /localStorage\.setItem\(KEY/.test(save) && !/sessionStorage\.[a-z]/i.test(save));
ok('เก็บแค่รหัส ไม่เก็บข้อมูลแปลง', !/parcelInfo|estValue/.test(save));
ok('⭐ หยุดคลิกในเฟส capture (ไม่งั้นกดแล้วเด้งเข้าหน้ารายละเอียด)',
   /stopPropagation\(\)/.test(save) && /\}, true\);/.test(save));
ok('⭐ เทียบค่าเดิมก่อนเขียน (กับดัก MutationObserver)',
   /!== want\) b\.setAttribute/.test(save) && /!== label\) t\.textContent/.test(save));
ok('⭐ disconnect ก่อนแก้ DOM ในตัวเฝ้า', /mo\.disconnect\(\);/.test(save));
ok('เขียน localStorage ใน try/catch (โหมดส่วนตัวเขียนไม่ได้)', /try \{ localStorage\.setItem/.test(save));
ok('สถานะเปลี่ยนทั้งสีและข้อความ ไม่ใช่สีอย่างเดียว', save.indexOf("'บันทึกแล้ว' : 'บันทึก'") >= 0);

console.log('\n4) ⭐ ลำดับโหลดสคริปต์ — save.js ต้องมาก่อนสคริปต์ของหน้า');
// listings.js/marketplace.js อ่าน window.NJSave ตอนเริ่มทำงานทันที · มาทีหลัง = ตัวเลขไม่ขึ้นเงียบๆ
['listings.html', 'index.html'].forEach(f => {
  const h = read(f);
  const s = h.indexOf('src="save.js"');
  const pageJs = Math.max(h.indexOf('src="listings.js"'), h.indexOf('src="marketplace.js"'));
  ok(f + ': save.js มาก่อนสคริปต์ของหน้า', s >= 0 && pageJs >= 0 && s < pageJs, 'save@' + s + ' page@' + pageJs);
});
const withCards = fs.readdirSync(__dirname).filter(f => f.endsWith('.html') && read(f).indexOf('compare.js') >= 0);
ok('ทุกหน้าที่มีการ์ดโหลด save.js', withCards.every(f => read(f).indexOf('src="save.js"') >= 0),
   withCards.filter(f => read(f).indexOf('src="save.js"') < 0).join(', '));
ok('ทุกหน้าที่มีการ์ดโหลด save.css', withCards.every(f => read(f).indexOf('href="save.css"') >= 0));

console.log('\n5) หน้ารายละเอียดแปลง (งานที่ 8)');
ok('⭐ H1 เป็นชื่อสั้น ไม่ใช่ parcelInfo ทั้งก้อน', land.indexOf('<h1 class="ld-title">\'+esc(shortLabel(l))') >= 0);
ok('รายละเอียดเต็มย้ายลงมาเป็นหัวข้อของตัวเอง', /class="ld-desc"/.test(land) && /รายละเอียดแปลง/.test(land));
ok('มีเส้นทางนำทาง (breadcrumb)', /function breadcrumbHtml/.test(land) && /class="ld-crumbs"/.test(land));
ok('มี BreadcrumbList ให้เสิร์ชเอนจิน', /BreadcrumbList/.test(land));
ok('⭐ meta description เปลี่ยนตามแปลง', /function metaDescOf/.test(land) && /setMeta\('name','description',desc\)/.test(land));
ok('⭐ og:title / og:description / og:url เปลี่ยนตามแปลง',
   /setMeta\('property','og:title'/.test(land) && /setMeta\('property','og:description'/.test(land) && /setMeta\('property','og:url'/.test(land));
ok('og:image ใช้รูปของแปลงนั้น', /setMeta\('property','og:image',img\)/.test(land));
ok('⭐ แปลงที่ไม่มีแล้วต้อง noindex (กัน soft 404)', /function markGone/.test(land) && /noindex, follow/.test(land));
ok('markGone ถูกเรียกตอนไม่พบแปลง', /markGone\(\); fail\(/.test(land));
ok('markGone ถอด canonical ออกด้วย', /if\(c\) c\.remove\(\);/.test(land));

console.log('\n6) เครื่องมือของผู้ซื้อในหน้าแปลง (งานที่ 8)');
ok('ปุ่มบันทึก', /data-njsave="/.test(land));
ok('ปุ่มแชร์ + มีทางถอยเมื่อไม่มี navigator.share',
   /id="ld-share"/.test(land) && /navigator\.share/.test(land) && land.indexOf("prompt('คัดลอกลิงก์นี้ไว้'") >= 0);
ok('⭐ ปุ่มแจ้งข้อมูลไม่ถูกต้อง แนบรหัสแปลงไปด้วยเสมอ', /function reportHref/.test(land) && /รหัส '\+l\.id/.test(land));
ok('⭐ ปุ่มแจ้งข้อมูลไม่นับเป็นช่องทางติดต่อ (ไม่มี data-contact)', !/id="ld-report"[^>]*data-contact/.test(land));
ok('แถบติดต่อแบบติดหนึบบนมือถือ', /class="ld-sticky"/.test(land));
ok('แถบติดหนึบแสดงรหัสแปลง', /ld-sticky-code">รหัส/.test(land));
const lcss = read('land.css');
ok('⭐ แถบติดหนึบซ่อนบนเดสก์ท็อป', /\.ld-sticky \{ display: none; \}/.test(lcss));
ok('⭐ แถบติดหนึบอยู่ต่ำกว่าแบนเนอร์คุกกี้', /z-index: var\(--nj-z-sticky\)/.test(lcss));
// 69px = ความสูงแถบเมนูล่าง · ตัวแปรที่บวกเพิ่มคือความสูงแบนเนอร์คุกกี้ (เพิ่ม Sprint 4 · งานที่ 12)
ok('แถบติดหนึบยกพ้นแถบเมนูล่าง', /bottom: calc\(69px \+ var\(--nj-consent-h, 0px\)\)/.test(lcss));
ok('ซ่อนตอนสั่งพิมพ์', /@media print[\s\S]*\.ld-sticky/.test(lcss));

console.log('\n7) แปลงใกล้เคียง + แปลงที่เพิ่งดู (งานที่ 8)');
ok('มีบล็อกแปลงใกล้เคียง', /function renderRelated/.test(land) && /แปลงใกล้เคียง/.test(land));
ok('เลือกจังหวัดเดียวกันก่อน', /province===prov/.test(land));
ok('มีบล็อกแปลงที่เพิ่งดู', /แปลงที่คุณเพิ่งดู/.test(land));
ok('⭐ เก็บแค่รหัสแปลงที่เพิ่งดู ไม่เก็บข้อมูล', /localStorage\.setItem\(SEEN_KEY/.test(land));
ok('ไม่แสดงแปลงตัวเองในรายการ', /x\.id!==current\.id/.test(land));
ok('⭐ โหลดไม่สำเร็จ = ไม่ขึ้นอะไรเลย ไม่ใช่กล่องว่าง', /ไม่มีแปลงใกล้เคียงก็ไม่ต้องขึ้นอะไร/.test(land));
ok('การ์ดในบล็อกนี้ได้ปุ่มเทียบ/บันทึกเหมือนที่อื่น',
   /NJCompare\.decorate\(host\)/.test(land) && /NJSave\.decorate\(host\)/.test(land));
ok('ใช้ตัวเรนเดอร์การ์ดกลาง ไม่ก๊อปมาเขียนใหม่', /NJListing\.card/.test(land));

console.log('\n8) ตัวกรอง "เฉพาะที่บันทึกไว้" + แผงตัวกรองจอเล็ก (งานที่ 4)');
const lsHtml = read('listings.html');
ok('มีช่องกรองเฉพาะที่บันทึกไว้', /id="f-saved"/.test(lsHtml));
ok('อ่านรายการจาก NJSave ที่เดียว', /NJSave\.has\(item\.id\)/.test(lst) && !/njSaved/.test(lst));
ok('⭐ ไม่นับแปลงที่ไม่ได้บันทึกเป็น hiddenUnknown', /f\.saved && !\(window\.NJSave && NJSave\.has\(item\.id\)\)/.test(lst));
ok('ตัวเลขจำนวนที่บันทึกอัปเดตสด', /NJSave\.onChange/.test(lst));
ok('เทียบค่าเดิมก่อนเขียนตัวเลข', /el\.textContent !== txt/.test(lst));
ok('มีปุ่มเปิดแผงตัวกรอง', /id="ls-open"/.test(lsHtml) && /aria-expanded="false"/.test(lsHtml));
ok('⭐ ซ่อนแผงด้วยคลาสที่ JS ใส่ (JS พัง = แผงยังใช้ได้)',
   /classList\.add\('ls-js'\)/.test(lst) && /body\.ls-js \.ls-filters/.test(read('listings.css')));
ok('ปิดด้วยปุ่ม Escape ได้', /e\.key === 'Escape'/.test(lst));
ok('กดค้นหาแล้วปิดแผงให้เอง', /form\.addEventListener\('submit'/.test(lst));

console.log('\n9) เหตุการณ์สถิติใหม่');
const NEW = ['homepage_search', 'filter_property', 'save_property', 'share_property', 'use_calculator', 'chat_to_human'];
NEW.forEach(e => ok('ขึ้นทะเบียนใน analytics.js: ' + e, ana.indexOf("'" + e + "'") >= 0));
ok('homepage_search ถูกยิงจริง', read('marketplace.js').indexOf("njTrackInternal('homepage_search')") >= 0);
ok('filter_property ถูกยิงจริง (และหน่วงเวลา)', lst.indexOf("njTrackInternal('filter_property')") >= 0 && /filterTimer/.test(lst));
ok('⭐ save_property นับเฉพาะตอนกดเพิ่ม ไม่นับตอนเอาออก', /if \(on\) \{[\s\S]{0,400}save_property/.test(save));
ok('share_property ถูกยิงจริง', land.indexOf("njTrackInternal('share_property'") >= 0);
ok('use_calculator ถูกยิงจริง', read('feecalc.js').indexOf("njTrackInternal('use_calculator')") >= 0);
ok('chat_to_human ถูกยิงจริง', read('njchat.js').indexOf("njTrackInternal('chat_to_human')") >= 0);

console.log('\n' + (fail ? '❌' : '✅') + ' detail: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
