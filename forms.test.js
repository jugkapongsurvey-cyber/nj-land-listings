/* ฟอร์มลีด · ที่มาของลีด · แชท · คู่มือ (Sprint 4 · งานที่ 10–12) · เพิ่ม 2026-09-20
 *   รันด้วย:  node forms.test.js
 *
 * ทำไมต้องมี: รอบนี้แตะเส้นทางที่ "พังแล้วไม่มีใครรู้" มากที่สุดของทั้งเว็บ —
 *   (1) ฟอร์มเก็บลีด 7 ชุด ซึ่งถ้าพังคือเงินหาย แต่หน้าจอยังดูปกติ
 *   (2) ที่มาของลีด ซึ่งถ้าเก็บผิดจะพาตั๋วของลูกค้าไปโผล่ในใบลีด
 *   (3) แบนเนอร์คุกกี้ที่ทับของอื่นจนกดไม่ได้
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 170) : '')); }
}

const njform = read('njform.js');
const attrib = read('attrib.js');

// ฟอร์มเก็บลีดทั้งหมดของเว็บ — ไฟล์ที่ยิงเข้า /api/public/* แล้วกลายเป็นใบงานจริง
const LEAD_FILES = ['consign.js', 'verify.js', 'wanted.js', 'inspect.js', 'room.js', 'partner-apply.js', 'njservices.js'];

console.log('\n1) ⭐ ที่มาของลีด — ห้ามมีข้อมูลส่วนบุคคลและห้ามพาตั๋วหลุด');
ok('⭐ เก็บ "หน้าที่เข้า" จาก pathname ไม่ใช่ทั้ง URL', /cut\(location\.pathname\)/.test(attrib));
ok('⭐ ไม่เคยอ่าน location.href หรือ location.search มาเก็บทั้งก้อน',
   !/location\.href/.test(attrib) && !/cut\(location\.search\)/.test(attrib));
ok('⭐ แหล่งอ้างอิงตัด query ทิ้ง (คำค้นของผู้ใช้อยู่ในนั้น)',
   attrib.indexOf('u.hostname + (u.pathname') >= 0 && !/u\.search/.test(attrib));
ok('มาจากโดเมนเราเอง = ไม่นับเป็นสัมผัสใหม่', /u\.hostname === location\.hostname\) return ''/.test(attrib));
ok('⭐ เดินในเว็บเราเองไม่ทับค่าสัมผัสสุดท้าย', /if \(!utm && !ref\) return null/.test(attrib));
ok('⭐ สัมผัสแรกเขียนครั้งเดียว ห้ามทับ', /if \(!readJson\(K_FIRST\)\) writeJson\(K_FIRST, t\)/.test(attrib));
ok('เก็บ gclid/fbclid เป็นชื่อช่องทาง ไม่เก็บค่ารายคน',
   /q\.get\('gclid'\)/.test(attrib) && !/out\.gclid/.test(attrib));
ok('เขียน localStorage ใน try/catch', /try \{ localStorage\.setItem/.test(attrib));
ok('ข้อมูลเก่าเกินกำหนดถือว่าไม่มี', /MAXAGE/.test(attrib) && /> MAXAGE\) return null/.test(attrib));
ok('⭐ ช่อง ref ของหน้าฝากขายเลิกยัด query string ดิบ',
   !/location\.search\.slice\(1, 60\)/.test(read('consign.js')) &&
   read('consign.js').indexOf('NJAttrib.refText()') >= 0);
ok('⭐ ช่อง ref ของกล่องสนใจบริการก็เลิกเช่นกัน',
   !/location\.search\.slice\(1, 60\)/.test(read('njservices.js')));

console.log('\n2) ทุกฟอร์มลีดแนบที่มาไปด้วย');
LEAD_FILES.forEach(f => {
  ok(f + ' แนบ attrib', read(f).indexOf('NJAttrib.value()') >= 0);
  ok(f + ' เช็ก window.NJAttrib ก่อน (ไฟล์โหลดไม่สำเร็จต้องยังส่งฟอร์มได้)',
     /window\.NJAttrib/.test(read(f)));
});

console.log('\n3) ⭐ attrib.js ต้องโหลดทุกหน้า ไม่ใช่เฉพาะหน้าที่มีฟอร์ม');
// คนคลิกโฆษณาเข้าหน้าแปลง อ่านสามหน้า แล้วค่อยไปกรอกฟอร์ม — โหลดเฉพาะหน้าฟอร์มคือ
// บันทึกว่าทุกคน "มาจากในเว็บเราเอง" ซึ่งไร้ประโยชน์ทั้งหมด
// `__fresh_*.html` คือสำเนาชั่วคราวที่สร้างตอนทดสอบด้วยมือ (เติม ?cb= กันแคช) ไม่ใช่หน้าจริง
const pages = fs.readdirSync(__dirname).filter(f => f.endsWith('.html') && !f.startsWith('__'));
const noAttrib = pages.filter(f => read(f).indexOf('src="attrib.js"') < 0);
ok('ทุกหน้า (' + pages.length + ' หน้า) โหลด attrib.js', noAttrib.length === 0, noAttrib.join(', '));
ok('⭐ build/pages.js เป็นคนใส่ให้ ไม่ได้ใส่มือทีละหน้า', /CORE_JS = \['attrib\.js'\]/.test(read('build/pages.js')));
ok('ใช้ defer — ไม่บล็อกการวาดหน้า', read('index.html').indexOf('src="attrib.js" defer') >= 0);

console.log('\n4) ตัวช่วยฟอร์มกลาง (njform.js)');
ok('⭐ กติกาขั้นต่ำอยู่ที่เดียว ไม่ก๊อปซ้ำ', /function checkLead/.test(njform));
['consign.js', 'verify.js', 'wanted.js'].forEach(f => {
  ok(f + ' เรียก NJForm.checkLead', read(f).indexOf('NJForm.checkLead(v)') >= 0);
  ok(f + ': njform โหลดไม่สำเร็จก็ยังตรวจได้ครบ',
     /if \(window\.NJForm\) return NJForm\.checkLead\(v\);/.test(read(f)) &&
     read(f).indexOf("field: 'pdpa'") >= 0);
});
ok('⭐ บังคับแค่ ชื่อ · เบอร์ · ยินยอม (ห้ามเพิ่มช่องบังคับ)',
   (njform.match(/return \{ field:/g) || []).length === 3);
ok('ข้อความผิดพลาดผูกกับช่องด้วย aria-invalid', /setAttribute\('aria-invalid', 'true'\)/.test(njform));
ok('และผูกด้วย aria-describedby ให้เครื่องอ่านหน้าจออ่านได้', /setAttribute\('aria-describedby', p\.id\)/.test(njform));
ok('⭐ เทียบค่าเดิมก่อนเขียน (กับดัก MutationObserver)', /p\.textContent !== msg/.test(njform));
ok('ผู้ใช้เริ่มแก้แล้วข้อความผิดหายเอง', /addEventListener\('input', function \(\) \{ set\(el, ''\); \}\)/.test(njform));
ok('⭐ ไม่บอกว่าผิดด้วยสีอย่างเดียว — มีทั้งสัญลักษณ์และข้อความ',
   read('components.css').indexOf('.njf-err::before { content: "⚠ "; }') >= 0);

console.log('\n5) จัดรูปเบอร์โทรและจำนวนเงิน');
const ctx = { window: {}, document: { querySelectorAll: () => [], addEventListener: () => {}, readyState: 'complete' } };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(njform, ctx, { filename: 'njform.js' });
const F = ctx.window.NJForm;
[['0812345678', '081-234-5678'], ['0812', '081-2'], ['021620405', '02-162-0405'],
 ['038123456', '038-123-456'], ['+66812345678', '+66-812-345-678']].forEach(p => {
  ok('เบอร์ ' + p[0] + ' → ' + p[1], F.fmtPhone(p[0]) === p[1], F.fmtPhone(p[0]));
});
ok('ตัวอักษรที่ไม่ใช่ตัวเลขถูกตัด', F.fmtPhone('08a1b2c34567') === '081-234-567', F.fmtPhone('08a1b2c34567'));
ok('เกิน 10 หลักไม่ยาวเกินรูปแบบ', F.fmtPhone('08123456789999') === '081-234-5678', F.fmtPhone('08123456789999'));
ok('จำนวนเงินใส่คั่นหลักพัน', F.fmtMoney('5000000') === '5,000,000', F.fmtMoney('5000000'));
ok('เลขศูนย์นำหน้าถูกตัด', F.fmtMoney('0005000') === '5,000', F.fmtMoney('0005000'));
ok('ช่องว่างคืนค่าว่าง ไม่ใช่ 0', F.fmtMoney('') === '', F.fmtMoney(''));
ok('⭐ จัดรูปเฉพาะตอนเคอร์เซอร์อยู่ท้ายช่อง (ไม่งั้นแก้กลางข้อความไม่ได้)',
   /el\.selectionStart === el\.value\.length/.test(njform));

console.log('\n6) ⭐ ห้ามเก็บข้อมูลส่วนบุคคลลงร่าง');
ok('มีรายการชื่อช่องต้องห้าม', /var PII = /.test(njform));
['name', 'phone', 'email', 'lineId', 'contact-phone'].forEach(n => {
  const re = new RegExp('(^|[-_])(name|fullname|phone|tel|mobile|email|line|lineid|address|idcard)([-_]|$)', 'i');
  ok('ช่อง "' + n + '" ถูกปฏิเสธจากร่าง', re.test(n));
});
ok('ช่องที่ไม่ใช่ PII ยังเก็บร่างได้', !/(^|[-_])(name|fullname|phone|tel|mobile|email|line|lineid|address|idcard)([-_]|$)/i.test('budget'));

console.log('\n7) ฟอร์มที่ JS วาดเองต้องเรียก attach เอง');
// ตัวติดตั้งอัตโนมัติของ njform.js ทำงานตอน DOMContentLoaded — ฟอร์มที่วาดทีหลังจึงไม่ถูกมองเห็น
['njservices.js', 'room.js', 'partner-apply.js', 'inspect.js'].forEach(f => {
  ok(f + ' เรียก NJForm.attach', /NJForm\.attach\(/.test(read(f)));
});
ok('ฟอร์มลีดทุกชุดติดป้าย data-njform',
   ['consign.html', 'verify.html', 'wanted.html', 'inspect.js', 'room.js', 'partner-apply.js', 'njservices.js']
     .every(f => /data-njform/.test(read(f))));

console.log('\n8) แชท — บริบทหน้าและรหัสแปลง (งานที่ 12)');
const chat = read('njchat.js');
ok('⭐ ส่งรหัสแปลงที่ผู้ใช้กำลังดูไปด้วย', /listingId: currentListingId\(\)/.test(chat));
ok('อ่านรหัสเฉพาะจากหน้า land.html', /!== 'land\.html'\) return ''/.test(chat));
ok('⭐ กรองรูปแบบรหัสก่อนส่ง (ค่ามาจาก URL = ไม่น่าเชื่อถือ)', /replace\(\/\[\^A-Z0-9-\]\/g, ''\)/.test(chat));
ok('ยังส่งชื่อหน้าไปด้วยเหมือนเดิม', /page: location\.pathname\.split/.test(chat));
// ⚠️ ข้อห้ามเดิมไม่เปลี่ยน: ที่โผล่ทีหลังคือ "ปุ่ม" ไม่ใช่ "แผง"
//    revealLater ต้องแตะแค่คลาสของปุ่ม ห้ามเรียก toggle() เด็ดขาด
const revealAt = chat.indexOf('function revealLater');
const reveal = revealAt < 0 ? '' : chat.slice(revealAt, chat.indexOf('function trackOpen'));
ok('⭐ ตัวทำให้ปุ่มโผล่ ห้ามเปิดแผงแชทเอง', reveal.length > 0 && !/toggle\(/.test(reveal), reveal.slice(0, 120));
ok('ปุ่มแชทโผล่ทีหลัง ไม่ใช่ตั้งแต่วินาทีแรก', /function revealLater/.test(chat));
ok('หน่วงอยู่ในช่วง 15–30 วินาทีตามข้อกำหนด', /REVEAL_MS = (1[5-9]|2[0-9]|30)000/.test(chat));
ok('หรือโผล่เมื่อผู้ใช้เลื่อนจอลงไป', /REVEAL_SCROLL/.test(chat) && /addEventListener\('scroll'/.test(chat));
ok('⭐ ซ่อนด้วยคลาสที่ JS ใส่เอง (JS พัง = ปุ่มต้องไม่หายถาวร)',
   /classList\.add\('njchat-hold'\)/.test(chat) && read('njchat.css').indexOf('.njchat-launcher.njchat-hold') >= 0);
ok('เคารพ prefers-reduced-motion ผ่าน token กลาง', read('njchat.css').indexOf('var(--nj-dur)') >= 0);
// กติกาเดียวกับเมนูย่อยบนหัวเว็บ (Sprint 1 ข้อ 6) — ขาโผล่ห้ามมี transition
const holdRule = read('njchat.css').slice(read('njchat.css').indexOf('.njchat-launcher.njchat-hold'));
ok('⭐ ปุ่มที่ยังไม่โผล่ต้อง visibility:hidden ด้วย ไม่ใช่ opacity อย่างเดียว',
   /visibility:\s*hidden/.test(holdRule.slice(0, 400)));
ok('⭐ กฎฐานของปุ่มต้องไม่มี transition (กันปุ่มใสที่กดได้)',
   !/\.njchat-launcher\{[^}]*transition/.test(read('njchat.css')));

console.log('\n9) คู่มือที่ดิน — ผู้เรียบเรียง · วันที่ตรวจทาน · แหล่งอ้างอิง (งานที่ 10)');
const guides = read('guides.html');
ok('มีชื่อผู้เรียบเรียง', /class="gd-byline"/.test(guides) && /เรียบเรียงโดย/.test(guides));
ok('อ้างใบอนุญาตจริงของบริษัท', /ใบอนุญาต 351/.test(guides));
ok('มีวันที่ตรวจทานในรูปแบบที่เครื่องอ่านได้', /<time datetime="\d{4}-\d{2}-\d{2}">/.test(guides));
const d = (guides.match(/<time datetime="(\d{4}-\d{2}-\d{2})">/) || [])[1];
ok('⭐ วันที่ตรวจทานต้องไม่เป็นวันในอนาคต', !!d && new Date(d) <= new Date(), d);
ok('⭐ ยังไม่ใส่ชื่อผู้ตรวจทานปลอม — ขึ้นกล่องบอกว่ายังรอจากบริษัท',
   /class="gd-todo"/.test(guides) && /ห้ามใส่ชื่อสมมติ/.test(guides));
['dol.go.th', 'dpt.go.th', 'treasury.go.th', 'rd.go.th'].forEach(h => {
  ok('มีแหล่งอ้างอิง ' + h, guides.indexOf(h) >= 0);
});
ok('คำเตือนว่าไม่ใช่คำแนะนำทางกฎหมายยังอยู่', /ไม่ใช่คำแนะนำทางกฎหมาย/.test(guides));

console.log('\n' + (fail ? '❌' : '✅') + ' forms: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
