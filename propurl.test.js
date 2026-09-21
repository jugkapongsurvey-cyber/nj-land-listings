/* ที่อยู่ของหน้าแปลง (สปรินต์ 3) — /properties/{ประเภท}/{จังหวัด}/{อำเภอ}/{รหัส}/
 *   รันด้วย:  node propurl.test.js
 *
 * ทำไมต้องมี: รอบนี้ย้ายที่อยู่ของหน้าแปลงทั้งเว็บ ซึ่งเป็นการเปลี่ยนที่ **พังเงียบที่สุด**
 *   ที่อยู่เดิมที่ทีมส่งให้ลูกค้าทางไลน์ไปแล้วนับพันลิงก์ต้องยังเปิดได้
 *   และต้องไม่มีสองที่อยู่แข่งกันเองในดัชนี (canonical ต้องชี้ทางเดียวกันหมด)
 *
 * ⚠️ ตรวจ "ผลลัพธ์ที่ commit ไว้" เท่านั้น ไม่ยิง API — CI รันได้โดยไม่ต้องต่อเน็ต
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const META = require('./landmeta.js');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}

function walk(dir, rel, out) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const it of items) {
    if (it.isDirectory()) walk(path.join(dir, it.name), rel + it.name + '/', out);
    else if (it.name === 'index.html') out.push(rel);
  }
  return out;
}

const PROP_DIRS = walk(path.join(ROOT, 'properties'), 'properties/', []);
const STUBS = fs.existsSync(path.join(ROOT, 'p'))
  ? fs.readdirSync(path.join(ROOT, 'p')).filter((f) => f.endsWith('.html')) : [];
const REDIR = JSON.parse(read('redirects.json'));
const MAPXML = read('sitemaps/properties.xml');

console.log('\n1) ⭐ หน้าแปลงอยู่ในโครงที่อยู่ใหม่');
ok('มีหน้าแปลงอย่างน้อยหนึ่งหน้า', PROP_DIRS.length > 0, PROP_DIRS.length);
ok('ทุกหน้าอยู่ใต้ properties/ และลงท้ายด้วยรหัสทรัพย์',
   PROP_DIRS.every((d) => /^properties\/[^/]+\/(?:[^/]+\/){0,2}[A-Za-z0-9-]+\/$/.test(d)),
   PROP_DIRS.filter((d) => !/^properties\/[^/]+\/(?:[^/]+\/){0,2}[A-Za-z0-9-]+\/$/.test(d)).join(' · '));
ok('⭐ ไม่มีช่องว่างในที่อยู่', PROP_DIRS.every((d) => d.indexOf(' ') < 0),
   PROP_DIRS.filter((d) => d.indexOf(' ') >= 0).join(' · '));
ok('⭐ ไม่มีโฟลเดอร์ชื่อว่าง (ช่องข้อมูลที่ว่างต้องถูกข้าม ไม่ใช่เว้นช่อง)',
   PROP_DIRS.every((d) => d.split('/').filter((x, i, a) => i < a.length - 1).every((x) => x.length > 0)));

console.log('\n2) ⭐ แต่ละหน้าชี้ canonical มาที่ตัวเอง (ที่อยู่เข้ารหัสแล้ว)');
for (const d of PROP_DIRS) {
  const html = read(d + 'index.html');
  const want = META.encUrl(META.SITE_URL + '/' + d);
  ok(d + ' — canonical ชี้ที่อยู่ของตัวเอง', html.indexOf('<link rel="canonical" href="' + want + '">') >= 0, want);
  ok(d + ' — og:url ตรงกับ canonical', html.indexOf('content="' + want + '"') >= 0);
  ok(d + ' — มีข้อมูลโครงสร้าง', /application\/ld\+json/.test(html));
  ok(d + ' — มีเนื้อหาใน HTML ต้นทาง (บอตอ่านได้)', /class="ldp-title"/.test(html));
  ok(d + ' — ไม่ประกาศ noindex', !/name="robots"[^>]*noindex/.test(html));
}

console.log('\n3) ⭐ ที่อยู่ชุดเดิมยังเปิดได้ และพาไปที่ใหม่ครบสามชั้น');
ok('มีหน้าพาไปครบทุกแปลง', STUBS.length === PROP_DIRS.length, STUBS.length + ' vs ' + PROP_DIRS.length);
for (const f of STUBS) {
  const html = read('p/' + f);
  const m = html.match(/<link rel="canonical" href="([^"]+)">/);
  ok('p/' + f + ' — มี canonical ชี้ที่อยู่ใหม่', !!m && /\/properties\//.test(decodeURI(m[1])), m && m[1]);
  ok('p/' + f + ' — มี meta refresh', /http-equiv="refresh"/.test(html));
  ok('p/' + f + ' — มีลิงก์ที่กดได้จริง (เผื่อสคริปต์ถูกบล็อก)', /<a href="https:\/\/njteedinsure\.com\/properties\//.test(html));
  ok('⭐ p/' + f + ' — ห้ามใส่ noindex (ขัดกับ canonical และตัดค่าที่ส่งต่อทิ้ง)',
     !/noindex/.test(html));
}

console.log('\n4) ⭐ ทะเบียนที่อยู่เดิม (redirects.json)');
const keys = Object.keys(REDIR);
ok('มีรายการอย่างน้อยเท่าจำนวนแปลง', keys.length >= PROP_DIRS.length, keys.length);
ok('ทุกที่อยู่ต้นทางขึ้นต้นด้วย /', keys.every((k) => k.charAt(0) === '/'));
for (const k of keys) {
  const to = REDIR[k];
  ok('ปลายทางของ ' + k + ' มีอยู่จริง',
     typeof to === 'string' && fs.existsSync(path.join(ROOT, to.replace(/^\//, '') + 'index.html')), to);
  const fromFile = k.replace(/^\//, '');
  const full = /\.html$/.test(fromFile) ? fromFile : fromFile + 'index.html';
  ok('ที่อยู่เดิม ' + k + ' ยังมีไฟล์รออยู่ (ไม่ตาย)', fs.existsSync(path.join(ROOT, full)));
}

console.log('\n5) ⭐ แผนผังเว็บของหน้าแปลง');
const locs = (MAPXML.match(/<loc>([^<]+)<\/loc>/g) || []).map((x) => x.replace(/<\/?loc>/g, ''));
ok('จำนวน URL ตรงกับจำนวนหน้าแปลง', locs.length === PROP_DIRS.length, locs.length + ' vs ' + PROP_DIRS.length);
ok('⭐ ทุก URL เป็นที่อยู่ชุดใหม่', locs.every((u) => /\/properties\//.test(decodeURI(u))));
ok('⭐ ไม่มีหน้าพาไปอยู่ในแผนผัง (แผนผัง = หน้าที่อยากให้เก็บดัชนี)',
   !locs.some((u) => /\/p\/|land\.html/.test(u)), locs.filter((u) => /\/p\/|land\.html/.test(u)).join(' · '));
ok('⭐ ทุก URL เข้ารหัสแล้ว (ไม่มีอักษรไทยดิบใน XML)', !/[฀-๿]/.test(locs.join('')));
ok('ทุก URL ในแผนผังมีไฟล์อยู่จริง',
   locs.every((u) => fs.existsSync(path.join(ROOT, decodeURI(u.replace(META.SITE_URL + '/', '')) + 'index.html'))));

console.log('\n6) ⭐ land.html ยังเป็นทางเข้าที่ใช้ได้ (ลิงก์เดิมนับพันลิงก์)');
const landJs = read('land.js');
ok('land.html ยังอยู่', fs.existsSync(path.join(ROOT, 'land.html')));
ok('canonical ของ land.html ชี้ที่อยู่ชุดใหม่', /NJLandMeta\.pageUrl\(l,\s*vocab\(\)\)/.test(landJs));
ok('⭐ เข้ารหัสที่อยู่ก่อนใส่ลง href', /NJLandMeta\.encUrl\(/.test(landJs));
ok('การ์ดประกาศยังลิงก์ไป land.html?id= เหมือนเดิม (ไม่มีทางพาไป 404)',
   /land\.html\?id=/.test(read('listingcard.js')));

console.log('\n7) กติกาที่ห้ามผ่อนของตัวสร้าง');
const gen = read('build/properties.js');
ok('⭐ ดึงข้อมูลไม่สำเร็จ = ไม่แตะไฟล์เดิม', /ไม่ได้แตะไฟล์เดิมเลยสักไฟล์/.test(gen));
ok('⭐ ไม่มีรายการทิ้งจากทะเบียนที่อยู่เดิม', !/delete redir\[/.test(gen));
ok('หน้าพาไปไม่มี noindex ในตัวสร้าง', !/stubHtml[\s\S]{0,600}noindex/.test(gen));

console.log('\n' + (fail ? '❌' : '✅') + ' propurl: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
