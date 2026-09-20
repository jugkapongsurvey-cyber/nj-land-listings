// ทดสอบตัวอ่านลิงก์ทรัพย์หน่วยงาน (agencies.js) + หน้า agency.html / tools.html / manifest
// รันด้วย:  node agency.test.js
const fs = require('fs');
const path = require('path');
const W = __dirname;
global.window = {};
new Function(fs.readFileSync(path.join(W, 'agencies.js'), 'utf8'))();
const A = global.window.NJAgency;

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
const read = f => fs.readFileSync(path.join(W, f), 'utf8');

console.log('\n1) จับแหล่งทรัพย์จากโดเมน');
[
  ['https://asset.led.go.th/newbid-old/asset_open.asp?law_suit_no=12345&deed_no=678', 'บังคับคดี'],
  ['https://www.led.go.th/x', 'บังคับคดี'],
  ['https://www.bam.co.th/property/ABC123', 'BAM'],
  ['https://sam.or.th/npa/detail/99001', 'SAM'],
  ['https://www.ghbhomecenter.com/property-detail?id=445566', 'ธอส.'],
  ['https://npa.krungthai.com/detail/7788', 'ธนาคารกรุงไทย'],
  ['https://www.krungsriproperty.com/home/1234', 'ธนาคารกรุงศรีอยุธยา'],
  ['https://www.kasikornbank.com/th/propertyforsale/detail/5555.html', 'ธนาคารกสิกรไทย'],
  ['https://www.gsb.or.th/npa/1', 'ธนาคารออมสิน']
].forEach(([u, src]) => {
  const d = A.detect(u);
  ok(src + ' ← ' + u, d.ok && d.kind === 'agency' && d.source === src, d);
});

console.log('\n2) โดเมนหลอก / ไม่รู้จัก ต้องไม่ถูกนับเป็นหน่วยงาน');
[
  'https://led.go.th.evil.com/x',
  'https://fakebam.co.th/x',
  'https://bam.co.th.example.net/',
  'https://notsam.or.th/'
].forEach(u => {
  const d = A.detect(u);
  ok('ไม่ใช่หน่วยงาน: ' + u, d.ok && d.kind !== 'agency' && d.source === 'อื่นๆ', d);
});
ok('เว็บตรวจสอบ (LandsMaps) ไม่ใช่แหล่งทรัพย์', A.detect('https://landsmaps.dol.go.th/').source === 'อื่นๆ');

console.log('\n3) ลิงก์ย่อ / เว็บประกาศทั่วไป');
ok('bit.ly = short', A.detect('http://bit.ly/abc').kind === 'short');
ok('lin.ee = short', A.detect('https://lin.ee/xyz').kind === 'short');
ok('facebook = portal', A.detect('https://www.facebook.com/marketplace/item/998877').kind === 'portal');
ok('m.facebook (subdomain) = portal', A.detect('https://m.facebook.com/x').kind === 'portal');
ok('ddproperty = portal', A.detect('https://www.ddproperty.com/listing/1').kind === 'portal');
ok('portal มีรายการตรวจผู้ประกาศ', A.checklist(A.detect('https://www.facebook.com/x')).some(c => /มอบอำนาจ/.test(c.t)));

console.log('\n4) ลิงก์อันตราย/ผิดรูปแบบ ถูกปฏิเสธ');
ok('ว่าง', A.detect('').reason === 'empty');
ok('javascript:', A.detect('javascript:alert(1)').ok === false);
ok('data:', A.detect('data:text/html,<b>x</b>').ok === false);
ok('ftp:', A.detect('ftp://led.go.th/x').ok === false);
ok('ข้อความไม่มีลิงก์', A.detect('ที่ดินสวยมาก').reason === 'invalid');
ok('มี user:pass ในลิงก์', A.detect('https://user:pw@bam.co.th/x').ok === false);
ok('ข้อความ HTML ไม่หลุดเข้า label (ใช้ hostname ที่ URL แปลงแล้ว)',
   !/</.test(A.detect('https://evil.com/<script>').label));

console.log('\n5) ข้อความที่แชร์มาจากมือถือ');
let d = A.detect('ทรัพย์ขายทอดตลาด - กรมบังคับคดี https://asset.led.go.th/x.asp?id=4455, ดูเลย');
ok('หยิบลิงก์จากกลางข้อความ', d.ok && d.source === 'บังคับคดี' && d.url === 'https://asset.led.go.th/x.asp?id=4455', d);
ok('ตัดเครื่องหมายวรรคตอนท้ายลิงก์', A.firstUrl('ดู (https://bam.co.th/a).') === 'https://bam.co.th/a');

console.log('\n6) ตัดพารามิเตอร์ติดตาม + เลขอ้างอิง + ความยาว');
d = A.detect('https://www.bam.co.th/p/ABC123?utm_source=fb&fbclid=XYZ&id=778899');
ok('ตัด utm_/fbclid ออก', !/utm_|fbclid/.test(d.url) && /id=778899/.test(d.url), d.url);
ok('อ่านเลขอ้างอิงจาก query', d.refs.some(r => r.key === 'id' && r.value === '778899'), d.refs);
ok('อ่านรหัสท้าย path', d.refs.some(r => r.value === 'ABC123'), d.refs);
ok('ลิงก์สั้นไม่ติดธงยาวเกิน', d.tooLong === false);
const long = 'https://asset.led.go.th/x?q=' + 'a'.repeat(400);
ok('ลิงก์ยาวเกิน 300 ติดธง', A.detect(long).tooLong === true);
ok('verifyHref ตัดลิงก์ไม่เกิน 300 ตัว', decodeURIComponent(A.verifyHref(A.detect(long)).split('&url=')[1]).replace(/#form$/, '').length <= 300);

console.log('\n7) ลิงก์ไปฟอร์มตรวจทรัพย์');
d = A.detect('https://asset.led.go.th/a?b=1&c=2');
const href = A.verifyHref(d);
ok('ขึ้นต้นด้วย verify.html?source=', /^verify\.html\?source=/.test(href), href);
ok('ค่าถูก encode (ไม่มี & ของลิงก์หลุดเป็นพารามิเตอร์ใหม่)', (href.match(/&/g) || []).length === 1, href);
ok('ถอดกลับได้ลิงก์เดิม', new URLSearchParams(href.split('?')[1].replace(/#form$/, '')).get('url') === d.url);
ok('ลิงก์ผิด → ไปฟอร์มเปล่า', A.verifyHref(A.detect('')) === 'verify.html#form');

console.log('\n8) รายการตรวจแยก "ตรวจเอกสาร" กับ "ลงพื้นที่" เสมอ');
const cl = A.checklist(A.detect('https://asset.led.go.th/x'));
ok('มีทั้งสองแบบ', cl.some(c => c.where === 'desk') && cl.some(c => c.where === 'field'));
ok('ทรัพย์ขายทอดตลาดมีเรื่องผู้อยู่อาศัย', cl.some(c => /ผู้อยู่อาศัย/.test(c.t)));
ok('ธนาคารไม่มีเรื่องขายทอดตลาด', !A.checklist(A.detect('https://bam.co.th/x')).some(c => /ผู้อยู่อาศัย/.test(c.t)));

console.log('\n9) รายชื่อหน่วยงาน');
const cats = A.CATS.map(c => c.key);
ok('ทุกรายการมีหมวดที่รู้จัก', A.SOURCES.every(s => cats.indexOf(s.cat) >= 0));
ok('ทุกลิงก์เป็น https', A.SOURCES.every(s => /^https:\/\//.test(s.url)));
ok('คีย์ไม่ซ้ำ', new Set(A.SOURCES.map(s => s.key)).size === A.SOURCES.length);
ok('ลิงก์ของแต่ละหน่วยงานจับกลับเป็นหน่วยงานเดียวกัน',
   A.SOURCES.filter(s => s.source).every(s => A.detect(s.url).source === s.source));
const verifyJs = read('verify.js');
const vList = (verifyJs.match(/PROPCHECK_SOURCES = \[([\s\S]*?)\]/) || [])[1] || '';
ok('source ทุกตัวอยู่ใน PROPCHECK_SOURCES ของ verify.js',
   A.SOURCES.filter(s => s.source).every(s => vList.indexOf("'" + s.source + "'") >= 0));

console.log('\n10) หน้าเว็บ');
const html = read('agency.html');
const pageJs = read('agency.js');
ok('agency.html โหลด agencies.js ก่อน agency.js', html.indexOf('agencies.js') > 0 && html.indexOf('agencies.js') < html.indexOf('agency.js"'));
ok('agency.html ผูก manifest', /rel="manifest" href="manifest\.webmanifest"/.test(html));
ok('ไม่มี fetch ไปเว็บปลายทาง (ห้าม scraping)', !/fetch\(/.test(pageJs + read('agencies.js')));
ok('ลิงก์ที่ผู้ใช้วางไม่ถูกทำเป็น <a href=d.url>', !/href="'\s*\+\s*esc\(d\.url/.test(pageJs));
ok('ผลตรวจผ่าน esc() ทุกช่องข้อความ', /esc\(d\.label\)/.test(pageJs) && /esc\(refs/.test(pageJs));
ok('ลิงก์ออกนอกเว็บมี noopener noreferrer', /rel="noopener noreferrer"/.test(pageJs));
// ⚠️ ตั้งแต่ Sprint 5 หน้าทั่วไปโหลด `njchatload.js` (ตัวโหลดเล็ก) แทน `njchat.js` ตัวเต็ม
//    เพื่อไม่ให้ทุกคนจ่ายค่าไฟล์ 101 KB ตั้งแต่วินาทีแรก · `chat.html` ยังโหลดตัวเต็มตรงๆ
ok('หน้านี้มีวิดเจ็ตแชทและเมนูมือถือ', /njchatload\.js/.test(html) && /menu\.js/.test(html));
ok('verify.js กรอกแหล่งเฉพาะค่าที่อยู่ในรายการ', /PROPCHECK_SOURCES\.indexOf\(src\) >= 0/.test(verifyJs));
ok('verify.js รับลิงก์เฉพาะ http(s) ไม่เกิน 300', /\^https\?:\\\/\\\//.test(verifyJs) && /url\.length <= 300/.test(verifyJs));
ok('verify.js ใส่ค่าด้วย .value ไม่ประกอบ HTML', !/innerHTML[^;]*sourceUrl/.test(verifyJs));

const mf = JSON.parse(read('manifest.webmanifest'));
ok('manifest มี share_target ไป agency.html แบบ GET', mf.share_target && mf.share_target.action === '/agency.html' && mf.share_target.method === 'GET');
ok('manifest ส่ง title/text/url', ['title', 'text', 'url'].every(k => mf.share_target.params[k] === k));
ok('manifest ไอคอนมีไฟล์จริง', mf.icons.every(i => fs.existsSync(path.join(W, i.src))));
ok('manifest ไอคอน 512', mf.icons.some(i => i.sizes === '512x512'));
ok('agency.js อ่านทั้ง url/text/title', /q\.get\('url'\)/.test(pageJs) && /q\.get\('text'\)/.test(pageJs) && /q\.get\('title'\)/.test(pageJs));

const sitemap = read('sitemap.xml');
ok('sitemap มี agency.html', /agency\.html/.test(sitemap));
ok('sitemap มี tools.html', /tools\.html/.test(sitemap));
const index = read('index.html');
ok('หน้าแรกมีทางเข้า agency.html', /href="agency\.html"/.test(index));
ok('หน้าแรกมีทางเข้า tools.html', /href="tools\.html"/.test(index));
ok('หน้าแรกผูก manifest', /rel="manifest"/.test(index));

const tools = read('tools.html');
ok('tools.html โหลด feecalc.js และ loancalc.js', /feecalc\.js/.test(tools) && /loancalc\.js/.test(tools));
ok('tools.html ไม่มีกล่อง #fee-calc (กัน bootPage ซ่อนกล่อง)', !/id="fee-calc"/.test(tools));

console.log('\n' + (fail ? '❌' : '✅') + ' agency: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
