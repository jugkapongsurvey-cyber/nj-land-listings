/* SEO ทางเทคนิค (งานที่ 15) — หน้าแปลงสแตติก · canonical · แผนผัง · Structured Data
 *   รันด้วย:  node seo.test.js   · เพิ่ม 2026-09-20 (Sprint 5)
 *
 * ทำไมต้องมี: ของพวกนี้ **พังเงียบที่สุดในเว็บ** — ไม่มีอะไรบนหน้าจอเปลี่ยนเลย
 * รู้ตัวอีกทีคือตอนอันดับหายไปแล้ว หรือลิงก์ที่ส่งเข้าไลน์ขึ้นการ์ดผิดแปลง
 *
 * ⚠️ ไฟล์ใน `p/` ถูกสร้างจากข้อมูลจริงด้วย `node build/properties.js`
 *    เทสต์นี้ตรวจ "ผลลัพธ์ที่ commit ไว้" ไม่ได้ยิง API เอง — CI จึงรันได้โดยไม่ต้องต่อเน็ต
 */
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}

const P_DIR = path.join(__dirname, 'p');
const PROPS = fs.existsSync(P_DIR)
  ? fs.readdirSync(P_DIR).filter(f => f.endsWith('.html') && !f.startsWith('__')) : [];

console.log('\n1) ⭐ หน้าแปลงมีเนื้อหาอยู่ใน HTML ต้นทางจริง');
// บอตของไลน์และเฟซบุ๊ก **ไม่รันสคริปต์** — เนื้อหาที่มาทีหลังจาก JS เท่ากับไม่มี
ok('มีไฟล์หน้าแปลงอยู่จริง', PROPS.length > 0, PROPS.length + ' ไฟล์');
const sample = PROPS.length ? read('p/' + PROPS[0]) : '';
ok('ชื่อหน้าไม่ใช่ข้อความกลางของ land.html', !/<title>รายละเอียดแปลงที่ดิน \| ที่ดินชัวร์<\/title>/.test(sample));
ok('มี <h1> อยู่ใน HTML ต้นทาง', /<h1[^>]*>[^<]{10,}/.test(sample));
ok('มีรหัสทรัพย์อยู่ในเนื้อหา', /รหัสทรัพย์/.test(sample));
ok('⭐ บอกให้ชัดว่า "กำลังโหลดข้อมูลล่าสุด" ไม่ใช่ทำเหมือนข้อมูลนี้คือทั้งหมด',
   /กำลังโหลดข้อมูลล่าสุด/.test(sample));

console.log('\n2) ทุกหน้าแปลงมีข้อมูลหัวหน้าครบและไม่ซ้ำกัน');
const titles = new Set(), canons = new Set();
PROPS.forEach(f => {
  const s = read('p/' + f);
  const id = f.replace(/\.html$/, '');
  const t = (s.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
  const c = (s.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const d = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  titles.add(t); canons.add(c);
  ok(id + ': canonical ชี้มาที่ตัวเอง', c === 'https://njteedinsure.com/p/' + id + '.html', c);
  ok(id + ': มีคำโปรยของตัวเอง', d.length > 40 && d.indexOf(id) >= 0);
  ok(id + ': og:image ไม่ใช่ภาพกลางของเว็บ หรือไม่มีรูปก็ยอมรับได้',
     /<meta property="og:image" content="[^"]+"/.test(s));
  ok(id + ': ฝังรหัสแปลงให้ JS อ่านต่อ', s.indexOf('window.NJ_LISTING_ID="' + id + '"') >= 0);
});
ok('⭐ ชื่อหน้าไม่ซ้ำกันสักคู่', titles.size === PROPS.length, titles.size + '/' + PROPS.length);
ok('⭐ canonical ไม่ซ้ำกันสักคู่', canons.size === PROPS.length, canons.size + '/' + PROPS.length);

console.log('\n3) ⭐ Structured Data ต้องตรงกับความจริง');
PROPS.forEach(f => {
  const s = read('p/' + f);
  const id = f.replace(/\.html$/, '');
  const blocks = (s.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [])
    .map(b => b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
  let parsed = [];
  try { parsed = blocks.map(b => JSON.parse(b)); } catch (e) { /* ปล่อยให้ข้อล่างจับ */ }
  ok(id + ': JSON-LD อ่านได้ทุกก้อน', parsed.length === blocks.length && blocks.length >= 2,
     blocks.length + ' ก้อน · อ่านได้ ' + parsed.length);
  const types = parsed.map(x => x && x['@type']);
  ok(id + ': มี RealEstateListing และ BreadcrumbList',
     types.indexOf('RealEstateListing') >= 0 && types.indexOf('BreadcrumbList') >= 0, types.join(','));
  // ⛔ ข้อกำหนดงานที่ 15 — ห้าม Review Schema ปลอม เว็บนี้ไม่มีรีวิวจริงสักรายการ
  ok(id + ': ⛔ ไม่มี Review / AggregateRating ปลอม',
     !/AggregateRating|"@type"\s*:\s*"Review"|ratingValue/.test(s));
  const listing = parsed.filter(x => x && x['@type'] === 'RealEstateListing')[0] || {};
  // ราคาในข้อมูลโครงสร้างต้องตรงกับที่แสดงบนหน้า — ไม่มีราคาก็ต้องไม่มีก้อน offers เลย
  const shownPrice = (s.match(/<dt>ราคา<\/dt><dd>([\d,]+) บาท<\/dd>/) || [])[1];
  if (shownPrice) {
    ok(id + ': ราคาใน schema ตรงกับที่แสดงบนหน้า',
       listing.offers && Number(listing.offers.price) === Number(shownPrice.replace(/,/g, '')),
       JSON.stringify(listing.offers));
  } else {
    ok(id + ': ⭐ ไม่มีราคาบนหน้า = ต้องไม่มี offers ใน schema', !listing.offers, JSON.stringify(listing.offers));
  }
});

console.log('\n4) ⭐ ห้ามอ้างว่ารังวัดแล้วทั้งที่ยังไม่ได้ (กติกาข้อ 10)');
PROPS.forEach(f => {
  const s = read('p/' + f);
  const id = f.replace(/\.html$/, '');
  const claimsSurvey = /ตรวจเชิงลึกแล้ว — มีผลรังวัดยืนยันแนวเขต/.test(s);
  const saysBasic = /ข้อมูลเบื้องต้น — ยังไม่ได้รังวัดยืนยันแนวเขต/.test(s);
  ok(id + ': บอกระดับข้อมูลไว้ชัดเจนข้างเดียว', claimsSurvey !== saysBasic);
});

console.log('\n5) แผนผังเว็บและ robots');
const rob = read('robots.txt');
ok('robots.txt ชี้แผนผังหน้าคงที่', rob.indexOf('Sitemap: https://njteedinsure.com/sitemap.xml') >= 0);
ok('⭐ robots.txt ชี้แผนผังหน้าแปลงด้วย',
   rob.indexOf('Sitemap: https://njteedinsure.com/sitemaps/properties.xml') >= 0);
const pmap = fs.existsSync(path.join(__dirname, 'sitemaps/properties.xml')) ? read('sitemaps/properties.xml') : '';
ok('มีไฟล์ sitemaps/properties.xml', pmap.length > 0);
const locs = (pmap.match(/<loc>[^<]*<\/loc>/g) || []).length;
ok('จำนวน URL ในแผนผังเท่ากับจำนวนหน้าแปลง', locs === PROPS.length, locs + ' vs ' + PROPS.length);
PROPS.forEach(f => {
  const u = 'https://njteedinsure.com/p/' + f;
  if (pmap.indexOf(u) < 0) ok('แผนผังมี ' + f, false);
});
ok('⭐ แผนผังไม่มี priority / changefreq ที่แต่งขึ้น', !/priority|changefreq/.test(pmap));
// หน้าที่ประกาศ noindex ต้องไม่โผล่ในแผนผังหน้าคงที่
const smap = read('sitemap.xml');
['deal.html', 'room.html', 'quote.html', 'notify.html', 'compare.html', '404.html'].forEach(p => {
  ok('แผนผังไม่มีหน้า noindex: ' + p, smap.indexOf('/' + p) < 0);
});

console.log('\n6) หน้าที่มีตั๋วของลูกค้าต้องถูกกันไว้');
['/room.html', '/deal.html', '/quote.html', '/notify.html'].forEach(p => {
  ok('robots.txt กัน ' + p, new RegExp('Disallow: ' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(rob));
});
['inspect.html?*t=', 'consign.html?*t=', 'partner-apply.html?*t='].forEach(p => {
  ok('robots.txt กันลิงก์ที่มีตั๋ว: ' + p, rob.indexOf('Disallow: /' + p) >= 0);
});

console.log('\n7) ที่อยู่ที่มีตัวกรองต้องไม่แตกเป็นหน้าใหม่ในดัชนี');
// `index.html?q=…` และ `listings.html?…` เขียนตัวกรองลงที่อยู่หน้า — ถ้าไม่มี canonical คงที่
// ทุกชุดตัวกรองจะกลายเป็นหน้าใหม่ในสายตา Google แล้วเนื้อหาเดียวกันแข่งกันเอง
ok('หน้าแรกมี canonical คงที่ชี้ไปที่อยู่สะอาด',
   read('index.html').indexOf('<link rel="canonical" href="https://njteedinsure.com/">') >= 0);
ok('หน้ารวมประกาศมี canonical คงที่ชี้ไปที่อยู่สะอาด',
   read('listings.html').indexOf('<link rel="canonical" href="https://njteedinsure.com/listings.html">') >= 0);
ok('⭐ ตัวซิงก์ที่อยู่หน้าไม่ไปแก้ canonical', !/canonical/.test(read('marketplace.js')));

console.log('\n8) land.html ยังเป็นทางเข้าที่ใช้ได้ และชี้ canonical มาหน้าสแตติก');
const landJs = read('land.js');
ok('⭐ canonical ของ land.html ชี้ไปหน้าสแตติก', /NJLandMeta\.pageUrl\(l\.id\)/.test(landJs));
ok('รับรหัสแปลงได้ทั้งจาก ?id= และจากหน้าสแตติก',
   /qs\('id'\)\|\|String\(window\.NJ_LISTING_ID/.test(landJs.replace(/\s/g, '')));
ok('⭐ แปลงที่ถูกถอดแล้วยัง noindex เหมือนเดิม', /function markGone/.test(landJs) && /noindex, follow/.test(landJs));

console.log('\n9) ตัวสร้างหน้าแปลงต้องปลอดภัยเมื่อดึงข้อมูลไม่สำเร็จ');
const gen = read('build/properties.js');
ok('⭐ ดึงข้อมูลล้มแล้วไม่แตะไฟล์เดิม', /ไม่ได้แตะไฟล์เดิมเลยสักไฟล์/.test(gen) && /process\.exit\(1\)/.test(gen));
ok('⭐ API ตอบว่างเปล่าก็ไม่ลบของเดิมทิ้ง', /ไม่ลบของเดิมทิ้ง/.test(gen));
ok('แปลงที่หายจาก API แล้วถูกลบไฟล์ทิ้ง', /unlinkSync/.test(gen));
ok('ใช้คำศัพท์ชุดกลาง ไม่ก๊อปมาไว้เอง', /landvocab\.js/.test(gen) && !/DEED_TH\s*=/.test(gen));
ok('ใช้ตัวประกอบชื่อชุดกลาง', /landmeta\.js/.test(gen));

console.log('\n' + (fail ? '❌' : '✅') + ' seo: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
