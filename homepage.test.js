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

console.log('\n2) Hero');
ok('H1 เป็นข้อความชุดเดิมของแบรนด์', /ซื้อ–ขายที่ดิน มั่นใจกว่า/.test(home));
ok('มี H1 เดียวในหน้า', (home.match(/<h1[\s>]/g) || []).length === 1);
ok('คำอธิบายตรงตามโจทย์', /ค้นหาทรัพย์ ฝากขาย ตรวจเอกสารและแนวเขตก่อนตัดสินใจ/.test(home));
const hero = (home.match(/<section class="hero"[\s\S]*?<\/section>/) || [''])[0];
ok('hero มีอยู่จริง', hero.length > 200);
// ⚠️ **hero มีทางเดียวที่เป็นปุ่มหลัก คือปุ่มค้นหาในช่องค้นหา**
//    เหตุผลเดิมจากรอบก่อนไม่เปลี่ยน: ของเดิมเคยมีสามปุ่มขนาดใกล้กัน ทำให้ไม่มีปุ่มไหนเด่นจริง
//    ดีไซน์ใหม่แก้ด้วยการยุบเหลือ "ค้นหาที่ดิน" ปุ่มเดียว แล้วให้ปุ่มฝากขายอยู่บนหัวเว็บแทน
const heroBtns = (hero.match(/class="btn /g) || []).length;
ok('⭐ hero มีปุ่มหลักไม่เกิน 2 ปุ่ม', heroBtns <= 2, 'พบ ' + heroBtns + ' ปุ่ม');
ok('ปุ่มหลักคือปุ่มค้นหาของฟอร์ม', /<button class="btn btn-gold" type="submit">ค้นหาที่ดิน<\/button>/.test(hero));
ok('⭐ ไม่เหลือปุ่มเล่นคลิปใน hero แล้ว', !/data-nj-intro-play/.test(home));
ok('การ์ดเช็กลิสต์ในภาพมีชื่อกำกับให้เครื่องอ่านหน้าจอ', /class="hero-check" aria-label=/.test(hero));

console.log('\n3) ภาพ hero — WebP + หลายขนาด');
ok('มี <source> แบบ WebP', /type="image\/webp"/.test(home));
// ⚠️ ต้องมีไฟล์ JPEG ให้ถอยเสมอ — <source> ทุกอันเป็น WebP แล้วเบราว์เซอร์เก่าจะไม่ได้รูปเลย
ok('ยังมีไฟล์ JPEG ให้ถอยเสมอ', /<img src="photos\/hero-1280\.jpg"/.test(home));
ok('มีไฟล์แนวตั้งสำหรับจอเล็ก', /hero-mobile\.(webp|jpg)/.test(home));
['hero-mobile.webp', 'hero-mobile.jpg', 'hero-1280.webp', 'hero-1280.jpg']
  .forEach(f => ok('ไฟล์ photos/' + f + ' มีอยู่จริง', fs.existsSync(path.join(__dirname, 'photos', f))));
ok('hero ยังตั้ง fetchpriority สูง', /fetchpriority="high"/.test(home));
// ⚠️ ไม่มี width/height = หน้ากระโดดตอนรูปโหลดเสร็จ (CLS) ซึ่งเป็นเกณฑ์ที่ Google ใช้จัดอันดับ
ok('⭐ ภาพ hero บอกขนาดไว้ กันหน้ากระโดด', /<img src="photos\/hero-1280\.jpg" width="1200" height="900"/.test(home));
ok('⭐ ภาพ hero ไม่ lazy (อยู่ในจอแรก)', !/hero-1280\.jpg"[^>]*loading="lazy"/.test(home));

console.log('\n4) แถบความน่าเชื่อถือ');
ok('มีแถบความน่าเชื่อถือ', /<section class="trust"/.test(home));
const trust = (home.match(/<section class="trust"[\s\S]*?<\/section>/) || [''])[0];
// ⚠️ **สี่ข้อเท่านั้น ห้ามเพิ่ม** และทุกข้อต้องเป็นสิ่งที่ตรวจสอบได้จริง
ok('⭐ มี 4 ข้อพอดี', (trust.match(/class="trust-item"/g) || []).length === 4,
   (trust.match(/class="trust-item"/g) || []).length);
['ใบอนุญาต 351', '12 ปี', 'ยินยอม', 'ระดับ'].forEach(k => ok('พูดถึง "' + k + '"', trust.indexOf(k) >= 0));
// ⚠️ การ์ดบนหน้าเดียวกันติดป้าย "ข้อมูลเบื้องต้น" ซึ่งแปลว่ายังไม่ได้รังวัด
//    เขียนว่าทุกแปลงรังวัดแล้วเมื่อไหร่ = ข้อความขัดกับสิ่งที่หน้าเดียวกันแสดงอยู่
ok('⭐ ไม่มีคำที่อ่านแล้วเข้าใจว่าทุกแปลงรังวัดแล้ว',
   !/ทุกแปลง(ผ่านการ|จึงผ่าน)รังวัด|รังวัดครบ|ตรวจสอบครบ/.test(trust), trust.slice(0, 120));

console.log('\n5) โมดูลค้นหา');
ok('ช่องค้นหามีรายการเติมคำ', /list="nj-locations"/.test(home) && /<datalist id="nj-locations"/.test(home));
// ⚠️ รายการต้องมาจาก `list` ที่ API ส่งมา ไม่ใช่อาร์เรย์ชื่อจังหวัดที่พิมพ์ไว้ในไฟล์
ok('⭐ รายการเติมคำสร้างจากแปลงจริง', /function fillLocations\(list\)/.test(mk) &&
   /d\.province,\s*d\.amphoe,\s*d\.tambon/.test(mk));
ok('ไม่มีรายชื่อจังหวัดพิมพ์ไว้ในไฟล์', !/'กรุงเทพมหานคร'|"กรุงเทพมหานคร"/.test(mk));
ok('มีทางไปตัวกรองเพิ่มเติม', /class="more" href="listings\.html"/.test(home));
ok('ช่องค้นหามีคำอธิบายผูกด้วย aria-describedby', /aria-describedby="nj-search-hint"/.test(home));
ok('⭐ ที่อยู่หน้าเว็บเปลี่ยนตามการค้นหา', /history\.pushState/.test(mk));
ok('⭐ ปุ่มย้อนกลับคืนตัวกรองให้', /addEventListener\('popstate'/.test(mk) && /function readUrl/.test(mk));
ok('เปิดลิงก์ที่มีตัวกรองติดมาได้ผลเดิม', /readUrl\(\);/.test(mk));
// ⚠️ ค่าจาก URL เป็นข้อมูลที่ใครก็แต่งได้ ต้องเทียบกับตัวเลือกที่ช่องนั้นมีจริงก่อนใช้เสมอ
ok('⭐ ไม่เชื่อค่าจาก URL ตรงๆ (ตรวจกับตัวเลือกที่มีจริง)', /allowed\.indexOf\(v\)/.test(mk));
ok('ค่าในช่องกรอกถูกเขียนกลับให้ตรงกับ URL', /function paintControls/.test(mk));
// ตัวกรองที่ดีไซน์ใหม่เพิ่มเข้ามา ต้องกรองจริง ไม่ใช่ช่องที่กดแล้วไม่มีอะไรเกิดขึ้น
ok('ช่อง "ขนาด" มีอยู่และกรองจริงจาก totalWa', /id="size-filter"/.test(home) &&
   /rai=item\.totalWa\/WA_PER_RAI/.test(mk));
ok('ช่วงราคาเป็นช่วง (min-max) ไม่ใช่เพดานอย่างเดียว', /function range\(v\)/.test(mk) &&
   /value="0-5000000"/.test(home));
ok('ปุ่มเรียงลำดับทำงานจริง', /id="sort-filter"/.test(home) && /function sorted\(list\)/.test(mk));
// ⚠️ แปลงที่ยังไม่ระบุเนื้อที่/ราคา ต้องไม่ถูกนับว่า "ตรงเงื่อนไข" (บอกว่าตรงทั้งที่ไม่รู้ = โกหกผู้ซื้อ)
ok('⭐ "ยังไม่ระบุ" ไม่นับว่าตรงเงื่อนไขขนาด', /item\.totalWa>0&&rai>=sz\.min/.test(mk));
// ⚠️ ค่าตั้งต้นของปุ่มกรองระดับข้อมูลอยู่ **3 ที่ ต้องตรงกันเสมอ**
//    ปุ่มใน index.html (คลาส + aria-pressed) · state.tier ใน marketplace.js · ค่าถอยใน readUrl()
//    ไม่ตรงกันเมื่อไหร่ = ปุ่มขึ้นว่าเปิดอยู่แต่ผลไม่ได้ถูกกรอง (หรือกลับกัน) โดยไม่มี error ให้เห็น
ok('มีปุ่มกรองระดับข้อมูลครบสองระดับ', (home.match(/data-tier="[12]"/g) || []).length === 2);
// ⚠️ ตั้งต้น "โชว์ทุกแปลง" (เจ้าของกิจการสั่ง 22 ก.ย. 69) — เดิมตั้งต้นกรองเฉพาะรังวัดยืนยันแล้ว
//    ซึ่งซ่อนของไปครึ่งคลังตั้งแต่โหลดหน้า โดยผู้ซื้อไม่มีทางรู้ว่ามีอีก
ok('⭐ ไม่มีปุ่มกรองระดับข้อมูลปุ่มไหนตั้งต้นเปิด',
   !/data-tier="[12]"[^>]*class="[^"]*is-on/.test(home) &&
   !/class="[^"]*is-on[^"]*"[^>]*data-tier="[12]"/.test(home) &&
   !/aria-pressed="true"[^>]*data-tier="[12]"/.test(home) &&
   !/data-tier="[12]"[^>]*aria-pressed="true"/.test(home));
ok('⭐ ค่าตั้งต้นเป็น all และตรงกันทั้งสามที่',
   /var DEFAULT_TIER='all';/.test(mk) && /tier:DEFAULT_TIER/.test(mk) && /: *DEFAULT_TIER;/.test(mk));
// ⚠️ ต้องกดปิดได้เสมอ — ตัวกรองที่เปิดค้างโดยไม่มีทางปิดคือตัวกรองที่ซ่อนของโดยผู้ใช้ไม่รู้ตัว
ok('⭐ กดซ้ำที่ปุ่มเดิมแล้วปิดตัวกรองได้', /state\.tier===btn\.dataset\.tier\) \? 'all'/.test(mk));
ok('เปิดลิงก์ที่มี tier=all ติดมาได้ (แชร์ผลที่ปิดตัวกรองไว้)', /tier==='all'\)\?tier:DEFAULT_TIER/.test(mk));

console.log('\n6) ลำดับบล็อกหน้าแรก');
// ⚠️ ต้องเทียบจากแท็ก <section> จริง ไม่ใช่ชื่อคลาสลอยๆ — คอมเมนต์ในไฟล์ก็เอ่ยชื่อคลาสเหมือนกัน
const order = ['<section class="hero"', '<section class="trust"', '<nav class="quick"',
               '<section class="section listings" id="listings"', '<section class="standard" id="มาตรฐาน"',
               '<section class="section guide" id="คู่มือ"', '<section class="team" id="ทีมเรา"',
               '<section class="sell" id="ฝากขาย"'];
let at = -1, seq = true, bad = '';
order.forEach(k => { const i = home.indexOf(k); if (i < at || i < 0) { seq = false; bad = k; } at = i; });
ok('⭐ เรียงตามลำดับที่ดีไซน์กำหนด', seq, 'สะดุดที่ ' + bad);
ok('ทรัพย์แนะนำ 6 รายการ (ไม่ใช่ 9)', /PAGE_SIZE=6/.test(mk), (mk.match(/PAGE_SIZE=\d+/) || [])[0]);
// จุดยึดที่หน้าอื่นทั้งเว็บลิงก์เข้ามา — หายเมื่อไหร่ ลิงก์บนหัวเว็บทุกหน้าจะพาไปไหนไม่ได้
['top', 'main', 'listings', 'ทีมเรา', 'ฝากขาย', 'ค้นหา', 'คู่มือ', 'มาตรฐาน']
  .forEach(id => ok('⭐ ยังมีจุดยึด #' + id, home.indexOf('id="' + id + '"') >= 0));

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
// ⚠️ ปุ่มของวิดเจ็ตที่ไม่อยู่หน้านี้แล้ว = ปุ่มที่กดแล้วไม่มีอะไรเกิดขึ้น ต้องไม่เหลือค้างไว้
ok('⭐ ไม่มีปุ่มของวิดเจ็ตที่ย้ายออกไปแล้วค้างอยู่', !/data-sq-open|data-fc-open/.test(home));
ok('หน้าแรกเลิกโหลดสคริปต์ของวิดเจ็ตที่ย้ายไปแล้ว',
   !/src="surveyquote\.js"/.test(home) && !/src="feecalc\.js"/.test(home) &&
   !/src="njintro\.js"/.test(home) && !/src="njservices\.js"/.test(home));
ok('services.html โหลด njintro.js + njservices.js', /src="njintro\.js"/.test(services) && /src="njservices\.js"/.test(services));
ok('services.html มี <main> และ H1 เดียว',
   /<main id="main">/.test(services) && (services.match(/<h1[\s>]/g) || []).length === 1);
// services.html เคยยืมสไตล์จาก home.css ทั้งก้อน — หน้าแรกเปลี่ยนดีไซน์แล้วจึงต้องมีชุดของตัวเอง
ok('⭐ services.html ไม่ยืม home.css แล้ว (คนละดีไซน์)',
   !/href="home\.css"/.test(services) && /href="services\.css"/.test(services) &&
   fs.existsSync(path.join(__dirname, 'services.css')));

console.log('\n8) การ์ดประกาศบนหน้าแรก');
const lcJs = read('listingcard.js');
const lcCss = read('listingcard.css');
// ⚠️ **ห้ามมีการ์ดตัวอย่างในไฟล์เด็ดขาด** (กติกาข้อ 4) — ทุกแปลงมาจาก API เท่านั้น
//    การ์ดทุกใบติดป้าย "รังวัดยืนยันแล้ว" ผู้ซื้อจึงอ่านทุกบรรทัดเป็นข้อเท็จจริงที่ตรวจสอบได้
ok('⭐ ไม่มีการ์ดที่เขียนข้อมูลแปลงไว้ใน index.html',
   !/class="land-card/.test(home) && !/OP-0\d\d/.test(home));
ok('⭐ ตะแกรงเริ่มต้นเป็นข้อความกำลังโหลด ไม่ใช่การ์ดสมมติ',
   /<div class="grid-3" id="listing-grid"[\s\S]{0,200}class="loading"/.test(home));
ok('การ์ดถูกวาดจากตัวเรนเดอร์กลางตัวเดียว', /window\.NJListing\s*=/.test(lcJs) && /NJL\.card/.test(mk));
// รูปการ์ดต้องมีทั้งขนาดและ lazy ครบทุกใบ — ไม่มีขนาด = หน้ากระโดด · ไม่มี lazy = โหลดรูปที่ยังไม่เห็น
ok('⭐ รูปการ์ดบอกขนาด 800×600 และ lazy', /width="800" height="600" loading="lazy"/.test(lcJs));
ok('รูปการ์ดใช้ไฟล์ย่อก่อน แล้วค่อยถอยไปไฟล์ต้นฉบับ', /item\.thumbs\[0\] \|\| item\.photos\[0\]/.test(lcJs));
// ⚠️ ป้าย 2 ระดับต้อง map จาก tier จริง ห้ามเดา — tier 1 ห้ามขึ้นป้าย "รังวัดยืนยันแล้ว" เด็ดขาด
ok('⭐ ป้ายระดับ map จาก tier จริง',
   /item\.tier === 2[\s\S]{0,120}badge-verified[\s\S]{0,120}badge-basic/.test(lcJs));
// ⚠️ หัวการ์ดต้องเป็นชื่อทำเลสั้นบรรทัดเดียว ไม่ใช่ parcelInfo ทั้งก้อน
//    เจ้าของบางรายพิมพ์ข้อความโฆษณา 200+ ตัวอักษรลงในช่องนั้น (เจอจริง: OP-025)
ok('⭐ หัวการ์ดใช้ชื่อทำเลสั้น ไม่ใช่ที่อยู่เต็ม',
   /function shortTitleOf\(item\)/.test(lcJs) && /card-title"><a href="' \+ esc\(href\) \+ '">' \+ esc\(shortTitleOf\(item\)\)/.test(lcJs));
ok('ชื่อสั้นอ่านจาก field ของ API ก่อนเสมอ', /if \(item\.shortTitle\) return item\.shortTitle;/.test(lcJs));
ok('สไตล์การ์ดอยู่ในไฟล์กลางไฟล์เดียว', /\.land-card\{/.test(lcCss) &&
   home.indexOf('listingcard.css') >= 0 && read('listings.html').indexOf('listingcard.css') >= 0);
// ⚠️ ปุ่มติดต่อต้องอยู่ในการ์ดทุกใบ — ผู้สนใจไม่ต้องเลื่อนกลับไปหาเบอร์ที่ท้ายหน้า
//    และ `data-contact` คือสิ่งที่ bindGrid() ใช้นับลีด + กันไม่ให้คลิกทะลุไปหน้ารายละเอียด
// ตัดเอาเฉพาะตัวการ์ด — ไฟล์นี้มี data-contact อยู่ในกล่อง "โหลดไม่สำเร็จ" ด้วย ซึ่งคนละเรื่องกัน
const cardFn = lcJs.slice(lcJs.indexOf('function card(item)'), lcJs.indexOf('function emptyHtml'));
ok('⭐ การ์ดมีปุ่มติดต่อครบ 4 ช่องทาง', (lcCss.indexOf('.contact-mini') >= 0) &&
   ['data-contact="line"', 'data-contact="messenger"'].every(k => cardFn.indexOf(k) >= 0) &&
   (cardFn.match(/data-contact="tel"/g) || []).length === 2,
   (cardFn.match(/data-contact="[a-z]+"/g) || []).join(' '));
// ⚠️ เบอร์สำนักงานกับเบอร์มือถือต้องมาคู่กันทุกที่ (กติกาข้อ 6) ตัดอันใดอันหนึ่งไม่ได้
ok('⭐ เบอร์สำนักงานกับเบอร์มือถือมาคู่กัน', /TEL_TXT/.test(lcJs) && /TEL2_TXT/.test(lcJs));
ok('แถวติดต่อยังอยู่บนการ์ดแนวนอนของมือถือ (ย่อขนาด ไม่ใช่ซ่อน)',
   /\.land-card\.is-compact \.contact-mini a\{width:\d+px/.test(lcCss) &&
   !/\.land-card\.is-compact[^{]*\.contact-mini\{[^}]*display:none/.test(lcCss));

console.log('\n8ข) ทางเข้าเครื่องมือคำนวณ');
// ⚠️ ดีไซน์ถอดแถบที่เคยมีลิงก์สองอันนี้ออกทั้งก้อน เหลือทางเข้าทางเดียวคือเมนูหัวเว็บ
//    ซึ่งบนมือถือต้องกดแฮมเบอร์เกอร์ก่อนถึงจะเห็น — จึงวางกลับไว้ในแถบ pill ใต้ช่องค้นหา
ok('⭐ หน้าแรกมีทางเข้าเครื่องคำนวณค่างวดและค่าโอน',
   /href="tools\.html#loan"/.test(home) && /href="tools\.html#fee"/.test(home));
ok('จุดยึดปลายทางมีอยู่จริงใน tools.html',
   /id="loan"/.test(tools) && /id="fee"/.test(tools));

console.log('\n9) ฟอร์มฝากขายบนหน้าแรก');
const sell = read('sellform.js');
// ⚠️ ต้องยิงเข้าเส้นทางรับลีดเดิมของทั้งเว็บ ห้ามสร้างเส้นทางใหม่ ไม่งั้นทีมขายต้องเฝ้าสองกล่อง
ok('⭐ ต่อกับเส้นทางรับลีดเดิม /api/public/consign', /\/api\/public\/consign/.test(sell));
ok('ไม่ได้ส่งไปที่เส้นทางที่ไม่มีอยู่จริง', !/api\/sell-request/.test(home) && !/api\/sell-request/.test(sell));
ok('⭐ มีกับดักบอท (honeypot) ชื่อ website', /name="website"/.test(home) && /val\('website'\)/.test(sell));
ok('กับดักบอทต้องมองไม่เห็นและไม่ถูกโฟกัส', /name="website" tabindex="-1"[^>]*class="visually-hidden"/.test(home));
// ⚠️ ฟอร์มที่เก็บชื่อกับเบอร์ต้องมีช่องยินยอมเสมอ (กติกาเดียวกับฟอร์มอื่นทั้งเว็บ)
ok('⭐ มีช่องยินยอม PDPA และบล็อกการส่งเมื่อยังไม่ติ๊ก',
   /name="pdpa"/.test(home) && /pdpa && !pdpa\.checked/.test(sell));
ok('มีลิงก์ไปนโยบายความเป็นส่วนตัว', /href="privacy\.html"/.test(home));
ok('บังคับแค่ชื่อ เบอร์ ทำเล และการยินยอม', /!name\)/.test(sell) && /!phoneOk\(phone\)/.test(sell) && /!loc\)/.test(sell));
// ⚠️ เซิร์ฟเวอร์นับ consign_submit ให้แล้วตอนสร้างใบ — ยิงซ้ำที่นี่ = ลีดหนึ่งใบถูกนับสองครั้ง
ok('⭐ ไม่ยิงสถิติลีดซ้ำจากเบราว์เซอร์', !/consign_submit/.test(sell.replace(/\/\/[^\n]*/g, '')));
ok('ส่งที่มาของลีดไปด้วย', /NJAttrib/.test(sell));
ok('ส่งไม่สำเร็จต้องไม่เงียบ', /catch\(function \(err\)/.test(sell) && /โทร /.test(sell));

console.log('\n10) ค่าติดต่อมาจากที่เดียว (ไม่มี [เบอร์โทร] ค้างอยู่)');
const cfg = read('config.js');
// ⚠️ ดีไซน์ส่งมาเป็น [เบอร์โทร] [ไอดีไลน์] [ที่อยู่สำนักงาน] [จำนวน] — ห้ามเหลือหลุดขึ้นเว็บจริง
['[เบอร์โทร]', '[ไอดีไลน์]', '[ที่อยู่สำนักงาน]', '[จำนวน]', '[ราคา]']
  .forEach(k => ok('⭐ ไม่เหลือ ' + k + ' บนหน้า', home.indexOf(k) < 0));
ok('มีไฟล์ค่าติดต่อกลาง', /window\.NJ_CONFIG|w\.NJ_CONFIG/.test(cfg) && home.indexOf('src="config.js"') >= 0);
ok('config.js ถูกโหลดก่อน listingcard.js', home.indexOf('src="config.js"') < home.indexOf('src="listingcard.js"'));
['02-162-0405', '084-915-8601', '@716lffzt'].forEach(v =>
  ok('config.js มีค่า ' + v, cfg.indexOf(v) >= 0));
// ⚠️ ห้ามเดาจำนวนแปลงที่รังวัดแล้ว — ทั้งหน้าขายด้วยคำว่า "ข้อมูลที่ตรวจสอบได้"
ok('⭐ ไม่เดาตัวเลข "แปลงที่รังวัดแล้ว"', /surveyedParcels: null/.test(cfg) && /paintStat/.test(mk));

console.log('\n11) แถบล่างมือถือ · แบนเนอร์คุกกี้ · ปุ่มแชท');
// ⚠️ menu.js ใช้คลาส mobile-nav "ข้าม" แถบล่างตอนมองหา <nav> ตัวหลักไปทำลิ้นชัก
//    ถอดออกเมื่อไหร่ ลิ้นชักมือถือจะกลายเป็นสำเนาของแถบล่างแทนเมนูจริง
ok('⭐ แถบล่างยังมีคลาส mobile-nav ให้ menu.js ข้าม', /class="tabbar mobile-nav"/.test(home));
ok('แถบล่างสูง 64px ตามดีไซน์', /\.tabbar\{position:fixed[^}]*height:64px/.test(css));
// ⚠️ แบนเนอร์คุกกี้ต้องเป็นแถบล่างเตี้ย ห้ามบัง hero ตอนโหลด
ok('⭐ แบนเนอร์คุกกี้เป็นแถบล่าง ไม่ใช่กล่องกลางจอ',
   /#nj-consent\{[\s\S]{0,200}position:fixed;left:0;right:0;bottom:0/.test(css));
// ⚠️ บนมือถือต้องอยู่เหนือแถบล่าง ไม่งั้นแถบล่างกดไม่ได้จนกว่าจะตอบแบนเนอร์
ok('⭐ แบนเนอร์คุกกี้ยกพ้นแถบล่างบนมือถือ', /#nj-consent\{bottom:calc\(64px \+ env\(safe-area-inset-bottom\)\)/.test(css));
// ⚠️ ปุ่มแชทต้องอยู่เหนือแถบล่าง (โจทย์กำหนด bottom ≥ 76px) · njchat.css ยกให้เองที่ ≤640px
//    แต่แถบล่างของหน้านี้โผล่ตั้งแต่ ≤767px ช่วง 641–767 จึงต้องยกเองที่ home.css
ok('⭐ ปุ่มแชทอยู่เหนือแถบล่างครบทุกช่วงจอ',
   /@media \(min-width:641px\) and \(max-width:767px\)\{[\s\S]{0,160}\.njchat-launcher\{ bottom:calc\(84px/.test(css) &&
   /\.njchat-launcher\{ bottom:calc\(84px/.test(read('njchat.css')));
ok('กันที่ท้ายหน้าไว้ให้แถบล่าง', /body\{padding-bottom:calc\(72px/.test(css));

console.log('\n12) Design token ที่ดีไซน์กำหนด ต้องอยู่ครบใน :root');
// ⚠️ ห้ามแปลง token เป็นค่าตายตัว — เจ้าของแก้โทนแบรนด์ทีเดียวได้ที่นี่ที่เดียว
const rootBlock = (css.match(/:root\{[\s\S]*?\n\}/) || [''])[0];
['--navy', '--navy-2', '--gold', '--gold-light', '--green', '--green-dark', '--green-bg',
 '--orange', '--orange-bg', '--bronze', '--ink', '--ink-2', '--ink-3', '--line', '--line-2',
 '--bg', '--bg-2', '--bg-3', '--font', '--r-sm', '--r-md', '--r-lg', '--r-xl',
 '--shadow-sm', '--shadow-md', '--container', '--gutter']
  .forEach(t => ok('⭐ มี token ' + t, new RegExp('\\' + t + ':').test(rootBlock)));
ok('ขอบข้างย่อตาม 3 breakpoint ตามที่ออกแบบไว้',
   /@media \(max-width:1023px\)\{ :root\{ --gutter:32px; \} \}/.test(css) &&
   /@media \(max-width:767px\)\{ :root\{ --gutter:16px; \} \}/.test(css));
ok('ฟอนต์ยังเป็น IBM Plex Sans Thai ตระกูลเดียว',
   /--font:'IBM Plex Sans Thai'/.test(css) && !/Trirong|Sarabun|Manrope/.test(css));

console.log('\n' + (fail ? '❌' : '✅') + ' homepage: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
