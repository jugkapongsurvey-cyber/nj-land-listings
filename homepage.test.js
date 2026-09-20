/* หน้าแรกหลังจัดใหม่ — Hero · Search · Trust Bar · ลำดับบล็อก (Sprint 2 · งานที่ 3–6)
 *   รันด้วย:  node homepage.test.js
 *
 * ทำไมต้องมี: หน้าแรกถูกจัดใหม่ทั้งหน้า และมีของที่ "ย้ายออกไปอยู่หน้าอื่น"
 * สิ่งที่พังได้เงียบที่สุดคือ id ที่ `marketplace.js` ผูกไว้แบบไม่เช็ก null —
 * ขาดตัวเดียว JS ตายทั้งไฟล์ ประกาศไม่ขึ้นเลย และไม่มี error ให้เห็นบนหน้าจอ
 */
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 170) : '')); }
}

const home = read('index.html');
const services = read('services.html');
const tools = read('tools.html');
const mk = read('marketplace.js');
const css = read('home.css');

console.log('\n1) ⭐ id ที่ marketplace.js ผูกไว้แบบไม่เช็ก null ต้องอยู่ครบ');
// ขาดตัวใดตัวหนึ่ง = ประกาศไม่ขึ้นเลยทั้งหน้า
['search-form', 'search-input', 'type-filter', 'price-filter', 'listing-grid', 'result-note', 'listings', 'year']
  .forEach(id => ok('มี #' + id, home.indexOf('id="' + id + '"') >= 0));
ok('มีปุ่มซื้อ/เช่า [data-purpose]', (home.match(/data-purpose=/g) || []).length >= 2);
ok('มีทางลัด [data-quick]', (home.match(/data-quick=/g) || []).length >= 1);
// ⚠️ compare.js เฝ้า DOM ในตะแกรง — ตัวแบ่งหน้าต้องอยู่นอก #listing-grid
const grid = home.indexOf('id="listing-grid"');
const pager = home.indexOf('id="listing-pager"');
ok('⭐ #listing-pager อยู่นอก #listing-grid', pager < 0 || pager > home.indexOf('</div>', grid));

console.log('\n2) Hero (งานที่ 3)');
ok('H1 เป็นข้อความชุดใหม่', /ซื้อ–ขายที่ดิน มั่นใจกว่า/.test(home));
ok('มี H1 เดียวในหน้า', (home.match(/<h1[\s>]/g) || []).length === 1);
ok('คำอธิบายตรงตามโจทย์', /ค้นหาทรัพย์ ฝากขาย ตรวจเอกสารและแนวเขตก่อนตัดสินใจ/.test(home));
const ctas = (home.match(/class="nj-hero-btn/g) || []).length;
ok('⭐ ปุ่มหลักใน hero มีไม่เกิน 2 ปุ่ม', ctas === 2, 'พบ ' + ctas + ' ปุ่ม');
ok('ปุ่มแรกคือ "ค้นหาทรัพย์"', /nj-hero-btn-1" href="listings\.html">ค้นหาทรัพย์</.test(home));
ok('ปุ่มที่สองคือ "ฝากขายกับเรา"', /nj-hero-btn-2" href="consign\.html">ฝากขายกับเรา</.test(home));
ok('ทางที่สามเป็นลิงก์ ไม่ใช่ปุ่ม', /class="nj-hero-link" href="verify\.html"/.test(home));
ok('⭐ ไม่เหลือปุ่มเล่นคลิปใน hero แล้ว', !/data-nj-intro-play/.test(home));

console.log('\n3) ภาพ hero — WebP + หลายขนาด (งานที่ 3 · 13)');
ok('มี <source> แบบ WebP', /type="image\/webp"/.test(home));
ok('ยังมีไฟล์ JPEG ให้ถอยเสมอ', /<img src="photos\/hero\.jpg"/.test(home));
ok('มีไฟล์แนวตั้งสำหรับจอเล็ก', /hero-mobile\.(webp|jpg)/.test(home));
ok('มีไฟล์ขนาดกลางสำหรับจอกลาง', /hero-1280\.(webp|jpg)/.test(home));
['hero.webp', 'hero-mobile.webp', 'hero-1280.webp', 'hero-1280.jpg']
  .forEach(f => ok('ไฟล์ photos/' + f + ' มีอยู่จริง', fs.existsSync(path.join(__dirname, 'photos', f))));
ok('hero ยังตั้ง fetchpriority สูง', /fetchpriority="high"/.test(home));

console.log('\n4) Trust Bar (งานที่ 5)');
ok('มีแถบความน่าเชื่อถือ', /class="nj-trust"/.test(home));
const trust = (home.match(/<section class="nj-trust"[\s\S]*?<\/section>/) || [''])[0];
ok('⭐ มี 4 ข้อพอดี', (trust.match(/<li>/g) || []).length === 4, (trust.match(/<li>/g) || []).length);
['ใบอนุญาต 351', '12 ปี', 'ยินยอม', 'ระดับ'].forEach(k => ok('พูดถึง "' + k + '"', trust.indexOf(k) >= 0));
ok('⭐ ไม่มีคำที่อ่านแล้วเข้าใจว่าทุกแปลงรังวัดแล้ว',
   !/ทุกแปลง(ผ่านการ|จึงผ่าน)รังวัด|รังวัดครบ|ตรวจสอบครบ/.test(trust), trust.slice(0, 120));

console.log('\n5) โมดูลค้นหา (งานที่ 4)');
ok('ช่องค้นหามีรายการเติมคำ', /list="nj-locations"/.test(home) && /<datalist id="nj-locations"/.test(home));
// ⚠️ รายการต้องมาจาก `list` ที่ API ส่งมา ไม่ใช่อาร์เรย์ชื่อจังหวัดที่พิมพ์ไว้ในไฟล์
ok('⭐ รายการเติมคำสร้างจากแปลงจริง', /function fillLocations\(list\)/.test(mk) &&
   /d\.province,\s*d\.amphoe,\s*d\.tambon/.test(mk));
ok('ไม่มีรายชื่อจังหวัดพิมพ์ไว้ในไฟล์', !/'กรุงเทพมหานคร'|"กรุงเทพมหานคร"/.test(mk));
ok('มีทางไปตัวกรองเพิ่มเติม', /nj-search-more" href="listings\.html"/.test(home));
ok('ช่องค้นหามีคำอธิบายผูกด้วย aria-describedby', /aria-describedby="nj-search-hint"/.test(home));
ok('⭐ ที่อยู่หน้าเว็บเปลี่ยนตามการค้นหา', /history\.pushState/.test(mk));
ok('⭐ ปุ่มย้อนกลับคืนตัวกรองให้', /addEventListener\('popstate'/.test(mk) && /function readUrl/.test(mk));
ok('เปิดลิงก์ที่มีตัวกรองติดมาได้ผลเดิม', /readUrl\(\);/.test(mk));
ok('⭐ ไม่เชื่อค่าจาก URL ตรงๆ (ตรวจกับตัวเลือกที่มีจริง)', /allowed\.indexOf\(pr\)/.test(mk));
ok('ค่าในช่องกรอกถูกเขียนกลับให้ตรงกับ URL', /function paintControls/.test(mk));

console.log('\n6) ลำดับบล็อกหน้าแรก (งานที่ 6)');
// ⚠️ ต้องเทียบจากแท็ก <section> จริง ไม่ใช่ชื่อคลาสลอยๆ — คอมเมนต์ในไฟล์ก็เอ่ยชื่อคลาสเหมือนกัน
const order = ['class="nj-hero"', '<section class="nj-search"', '<section class="nj-trust"',
               '<section id="listings"', '<section id="มาตรฐาน"', '<section id="จุดเด่น"',
               '<section id="คู่มือ"', '<section id="ทีมเรา"', '<section id="ฝากขาย"'];
let at = 0, seq = true, bad = '';
order.forEach(k => { const i = home.indexOf(k); if (i < at) { seq = false; bad = k; } at = i; });
ok('⭐ เรียงตามลำดับที่โจทย์กำหนด', seq, 'สะดุดที่ ' + bad);
ok('ทรัพย์แนะนำ 6 รายการ (ไม่ใช่ 9)', /PAGE_SIZE=6/.test(mk), (mk.match(/PAGE_SIZE=\d+/) || [])[0]);

console.log('\n7) ของที่ย้ายออกจากหน้าแรก ต้องไปโผล่ที่ปลายทางจริง');
ok('services.html มีอยู่จริง', fs.existsSync(path.join(__dirname, 'services.html')));
['บริการ', 'บริการเพิ่มเติม', 'ขั้นตอน', 'แนะนำระบบ', 'ตรวจก่อนโอน']
  .forEach(id => {
    ok('#' + id + ' อยู่ที่ services.html แล้ว', services.indexOf('id="' + id + '"') >= 0);
    ok('#' + id + ' ไม่เหลือบนหน้าแรก', home.indexOf('id="' + id + '"') < 0);
  });
ok('เครื่องประเมินค่ารังวัดย้ายไป tools.html', tools.indexOf('id="survey-quote"') >= 0 && home.indexOf('id="survey-quote"') < 0);
ok('เครื่องคำนวณค่าโอนไม่ซ้ำบนหน้าแรกแล้ว', home.indexOf('id="fee-calc"') < 0 && tools.indexOf('id="tl-fee"') >= 0);
ok('tools.html โหลด surveyquote.js', /src="surveyquote\.js"/.test(tools));
ok('⭐ ปุ่มในการ์ดบริการกลายเป็นลิงก์ไปหน้าเครื่องมือ (วิดเจ็ตไม่อยู่หน้านี้แล้ว)',
   !/data-sq-open|data-fc-open/.test(home) && /tools\.html#survey/.test(home) && /tools\.html#fee/.test(home));
ok('หน้าแรกเลิกโหลดสคริปต์ของวิดเจ็ตที่ย้ายไปแล้ว',
   !/src="surveyquote\.js"/.test(home) && !/src="feecalc\.js"/.test(home) &&
   !/src="njintro\.js"/.test(home) && !/src="njservices\.js"/.test(home));
ok('services.html โหลด njintro.js + njservices.js', /src="njintro\.js"/.test(services) && /src="njservices\.js"/.test(services));
ok('services.html มี <main> และ H1 เดียว',
   /<main id="main">/.test(services) && (services.match(/<h1[\s>]/g) || []).length === 1);

console.log('\n8) ความสูงและสเกล — กติกาที่ห้ามผ่อน');
ok('hero เดสก์ท็อปสูงไม่เกิน 500px', /\.nj-hero\s*{[^}]*min-height:\s*4[0-9]{2}px/.test(css),
   (css.match(/\.nj-hero\s*{[^}]*min-height:[^;]*/) || [''])[0].slice(-24));
ok('⭐ hero จอเล็กต้องมี !important (มีกฎเก่า 560px !important อยู่)',
   /\.nj-hero\s*{\s*min-height:\s*420px\s*!important/.test(css));
ok('พาดหัวจำกัดความกว้างไม่ให้เกิน 2 บรรทัด', /\.nj-hero-h1\s*{[^}]*max-width:\s*\d+ch/.test(css));
ok('คำอธิบายจำกัดความกว้าง', /\.nj-hero-lead\s*{[^}]*max-width:\s*\d+ch/.test(css));
ok('⭐ บล็อกใหม่ไม่มีรหัสสีดิบนอกจากม่านไล่สี (ใช้ token)',
   (css.split('Sprint 2 — Hero')[1] || '').split('#').length - 1 <= 0 ||
   !/#[0-9A-Fa-f]{6}/.test((css.split('Sprint 2 — Hero')[1] || '')),
   ((css.split('Sprint 2 — Hero')[1] || '').match(/#[0-9A-Fa-f]{6}/g) || []).join(' '));

console.log('\n' + (fail ? '❌' : '✅') + ' homepage: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
