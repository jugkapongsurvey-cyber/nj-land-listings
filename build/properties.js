'use strict';
// ---------- สร้างหน้าแปลงเป็นไฟล์จริง ให้บอตอ่านได้ ----------
//
// รัน:  node build/properties.js            (ดึงข้อมูลจริงแล้วเขียน p/*.html + sitemaps/properties.xml)
//       node build/properties.js --dry-run  (บอกว่าจะเขียน/ลบอะไร แต่ไม่แตะไฟล์)
//       node build/properties.js --api http://127.0.0.1:8792   (ชี้ไปเซิร์ฟเวอร์ทดสอบ)
//
// ⚠️⚠️ หกข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **ปัญหาที่ไฟล์นี้แก้**: `land.html?id=…` ส่ง **HTML เปล่า** ให้บอตเสมอ เนื้อหามาทีหลังจาก JS
//    บอตของ LINE และ Facebook **ไม่รันสคริปต์** ลิงก์แปลงที่พนักงานส่งให้ลูกค้าทางไลน์ทุกแปลง
//    จึงขึ้นหัวข้อและรูปเหมือนกันหมด · และ Google ไม่มีเนื้อหาให้จัดอันดับ
//    (รายงานตรวจ SEO ข้อ H-06 และ H-07)
//
// 2. **ต้นแบบคือ `land.html` ตัวจริง ไม่ได้เขียนโครงหน้าใหม่**
//    ⚠️ แก้หัวเว็บ/สคริปต์ที่ `land.html` แล้ว **ต้องรันไฟล์นี้ใหม่** ไม่งั้นหน้าสแตติกค้างรุ่นเก่า
//    (รัน `node build/pages.js` ก่อนเสมอ แล้วค่อยรันตัวนี้)
//
// 3. **หน้าอยู่ในโฟลเดอร์ `p/` จึงต้องแปลงที่อยู่ไฟล์เป็นแบบเต็ม (`/tokens.css`)**
//    เว็บนี้อยู่ที่รากโดเมน (มี CNAME) ที่อยู่แบบเต็มจึงใช้ได้ · ที่อยู่แบบย่อจะพังทั้งหน้า
//
// 4. **ดึงข้อมูลไม่สำเร็จ = ไม่แตะไฟล์เดิมเลยแม้แต่ไฟล์เดียว แล้วออกด้วยรหัสไม่ศูนย์**
//    เขียนทับ/ลบตอนข้อมูลยังไม่ครบ = หน้าแปลงหายจากเว็บทั้งชุดโดยไม่มีใครสั่ง
//
// 5. **แปลงที่หายจาก API แล้ว ต้องลบไฟล์ทิ้ง** ไม่งั้นเหลือหน้าของแปลงที่ขายไปแล้วค้างในดัชนี
//    (หน้านั้นจะ noindex ตัวเองด้วยเมื่อ JS พบว่า API ตอบ 404 — แต่ลบทิ้งไปเลยตรงกว่า)
//
// 6. **ห้ามเติมข้อมูลที่ API ไม่ได้ส่งมา** (กติกาข้อ 5) ช่องไหนว่างให้ข้ามไป
//    Structured Data ที่ไม่ตรงกับหน้าจอ = โดนตัดสิทธิ์แสดงผลพิเศษทั้งเว็บ ไม่ใช่แค่หน้านี้
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'p');            // ที่อยู่ชุดเดิม (Sprint 5) — กลายเป็นหน้าพาไปที่ใหม่
const PROP_DIR = path.join(ROOT, 'properties');  // ที่อยู่ชุดใหม่ (สปรินต์ 3) — หน้าจริงอยู่ที่นี่
const REDIR_FILE = path.join(ROOT, 'redirects.json');
const MAP_DIR = path.join(ROOT, 'sitemaps');
const SITE = 'https://njteedinsure.com';

const argv = process.argv.slice(2);
const DRY = argv.indexOf('--dry-run') >= 0;
const apiAt = argv.indexOf('--api');
const API = apiAt >= 0 ? argv[apiAt + 1] : 'https://app.njteedinsure.com';

// ---------- คำศัพท์ชุดกลาง — โหลดไฟล์เบราว์เซอร์มาใช้ใน Node ----------
// ⚠️ ห้ามก๊อปคำศัพท์มาไว้ในไฟล์นี้ (กติกาเดียวกับ landvocab.js) · โหลดของจริงมาเลย
function loadVocab() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'landvocab.js'), 'utf8'), sandbox, { filename: 'landvocab.js' });
  return sandbox.window.NJVocab || {};
}
const VOCAB = loadVocab();
const META = require(path.join(ROOT, 'landmeta.js'));

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const baht = (n) => Number(n).toLocaleString('th-TH');

// ---------- เนื้อหาที่ฝังลงใน HTML ต้นทาง ----------
//
// ⚠️ นี่คือ "สิ่งที่บอตเห็น" — ต้องตรงกับสิ่งที่ผู้ใช้เห็นหลัง JS ทำงานเสร็จ
//    เขียนเกินกว่าที่หน้าจอแสดงจริงเมื่อไหร่ = ข้อมูลหลอกลวงตามเกณฑ์ของ Google
// ⚠️ `land.js` จะเขียนทับกล่องนี้ทั้งก้อนเมื่อโหลดข้อมูลสดเสร็จ จึงไม่มีทางที่ผู้ใช้
//    จะค้างอยู่กับตัวเลขเก่าจากรอบ build
function bodyHtml(l) {
  const L = l.land || {};
  const rows = [];
  const add = (k, v) => { if (v) rows.push('<div class="ldp-row"><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>'); };

  add('รหัสทรัพย์', l.id);
  if (Number(l.estValue) > 0) add('ราคา', baht(l.estValue) + ' บาท');
  if (Number(l.pricePerWa) > 0) add('ราคาต่อตารางวา', baht(l.pricePerWa) + ' บาท');
  add('เนื้อที่', L.deedArea);
  add('ที่ตั้ง', META.localityOf(l) || L.locality);
  if (L.deedType && VOCAB.DEED_TH && VOCAB.DEED_TH[L.deedType]) add('เอกสารสิทธิ์', VOCAB.DEED_TH[L.deedType]);
  if (L.propertyType && VOCAB.PROPERTY_TH && VOCAB.PROPERTY_TH[L.propertyType]) add('ประเภททรัพย์', VOCAB.PROPERTY_TH[L.propertyType]);
  if (L.zoneColor && VOCAB.ZONE_TH && VOCAB.ZONE_TH[L.zoneColor]) add('ผังสีผังเมือง', VOCAB.ZONE_TH[L.zoneColor]);

  // ⚠️ ระดับความน่าเชื่อถือ — ห้ามเขียน "รังวัดยืนยันแล้ว" ให้แปลง tier 1 เด็ดขาด (กติกาข้อ 10)
  add('ระดับข้อมูล', Number(l.tier) === 2 ? 'ตรวจเชิงลึกแล้ว — มีผลรังวัดยืนยันแนวเขต' : 'ข้อมูลเบื้องต้น — ยังไม่ได้รังวัดยืนยันแนวเขต');

  const photo = (l.photos || []).filter((u) => /^https:\/\//.test(u))[0] || '';
  return [
    '<article class="ldp">',
    photo ? '<img class="ldp-photo" src="' + esc(photo) + '" alt="" width="1200" height="675" fetchpriority="high">' : '',
    '<h1 class="ldp-title">' + esc(META.shortLabel(l, VOCAB)) + '</h1>',
    l.blurb ? '<p class="ldp-blurb">' + esc(String(l.blurb).replace(/\s+/g, ' ').trim()) + '</p>' : '',
    '<dl class="ldp-rows">' + rows.join('') + '</dl>',
    l.parcelInfo ? '<h2 class="ldp-h2">รายละเอียดแปลง</h2><p class="ldp-desc">' + esc(l.parcelInfo) + '</p>' : '',
    '<p class="ldp-note">กำลังโหลดข้อมูลล่าสุด รูปทั้งหมด แผนที่ ผลการตรวจสอบ และเครื่องคำนวณค่าโอน…</p>',
    '<p class="ldp-alt"><a href="/listings.html">ดูประกาศทั้งหมด</a> · <a href="/land.html?id=' + esc(l.id) + '">เปิดหน้าแบบเต็ม</a></p>',
    '</article>'
  ].filter(Boolean).join('\n      ');
}

// ---------- Structured Data ----------
//
// ⚠️ **ห้ามใส่ Review / AggregateRating** (ข้อกำหนดงานที่ 15) — เว็บนี้ไม่มีรีวิวจริงสักรายการ
//    ใส่ของปลอมเมื่อไหร่ = โดนตัดสิทธิ์แสดงผลพิเศษทั้งโดเมน
// ⚠️ ใส่ `offers.price` เฉพาะแปลงที่มีราคาจริง — แปลงที่ยังไม่ระบุราคาต้องไม่มีก้อนนี้เลย
function schemaFor(l) {
  const L = l.land || {};
  const out = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: META.shortLabel(l, VOCAB),
    description: META.metaDesc(l, VOCAB),
    url: META.pageUrl(l, VOCAB),
    identifier: l.id,
    datePosted: l.updatedAt || undefined
  };
  const photos = (l.photos || []).filter((u) => /^https:\/\//.test(u));
  if (photos.length) out.image = photos.slice(0, 6);
  if (L.province || L.amphoe || L.tambon) {
    out.address = {
      '@type': 'PostalAddress',
      addressCountry: 'TH',
      addressRegion: L.province || undefined,
      addressLocality: L.amphoe || undefined,
      streetAddress: L.tambon ? 'ต.' + L.tambon : undefined
    };
  }
  if (Number(l.estValue) > 0) {
    out.offers = { '@type': 'Offer', price: Number(l.estValue), priceCurrency: 'THB', availability: 'https://schema.org/InStock' };
  }
  if (Number(l.totalWa) > 0) {
    out.floorSize = { '@type': 'QuantitativeValue', value: Number(l.totalWa), unitText: 'ตารางวา' };
  }
  return JSON.parse(JSON.stringify(out));   // ตัดช่องที่เป็น undefined ทิ้ง
}

function breadcrumbFor(l) {
  const L = l.land || {};
  const items = [{ t: 'หน้าแรก', h: '' }, { t: 'ประกาศทั้งหมด', h: 'listings.html' }];
  if (L.province) items.push({ t: L.province, h: 'listings.html' });
  items.push({ t: l.id, h: META.pagePath(l, VOCAB) });
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => {
      const it = { '@type': 'ListItem', position: i + 1, name: c.t };
      it.item = SITE + '/' + c.h;
      return it;
    })
  };
}

// ---------- ประกอบหน้าจากต้นแบบ land.html ----------
function render(tpl, l) {
  const title = META.titleOf(l, VOCAB);
  const desc = META.metaDesc(l, VOCAB);
  const url = META.pageUrl(l, VOCAB);
  const photo = (l.photos || []).filter((u) => /^https:\/\//.test(u))[0] || (SITE + '/brand/og-image.png');
  let s = tpl;

  // 3) ที่อยู่ไฟล์แบบย่อ → แบบเต็ม (หน้าอยู่ในโฟลเดอร์ y่อย)
  s = s.replace(/(\s(?:href|src)=")(?!https?:|\/\/|#|mailto:|tel:|data:)([^"]+)(")/g, (m, a, p, z) => a + '/' + p + z);

  // ชื่อหน้า · คำโปรย · canonical
  s = s.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(title) + '</title>');
  s = s.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(desc) + '">');
  const encoded = META.encUrl(url);
  if (/rel="canonical"/.test(s)) s = s.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + esc(encoded) + '">');
  else s = s.replace('</title>', '</title>\n  <link rel="canonical" href="' + esc(encoded) + '">');

  // og — ตัวที่มีอยู่แล้วให้ทับ ตัวที่ยังไม่มีให้เติมท้าย <head>
  const og = {
    'og:title': title, 'og:description': desc, 'og:url': META.encUrl(url), 'og:image': photo,
    'og:type': 'website', 'og:site_name': 'ที่ดินชัวร์'
  };
  Object.keys(og).forEach((k) => {
    const re = new RegExp('<meta property="' + k + '" content="[^"]*">');
    const tag = '<meta property="' + k + '" content="' + esc(og[k]) + '">';
    if (re.test(s)) s = s.replace(re, tag);
    else s = s.replace('</head>', '  ' + tag + '\n</head>');
  });

  // Structured Data
  const ld = '  <script type="application/ld+json">' + JSON.stringify(schemaFor(l)) + '</script>\n' +
             '  <script type="application/ld+json">' + JSON.stringify(breadcrumbFor(l)) + '</script>\n';
  s = s.replace('</head>', ld + '</head>');

  // รหัสแปลง — `land.js` อ่านตัวนี้เมื่อไม่มี `?id=` ใน URL
  s = s.replace('<script src="/landmeta.js"></script>',
    '<script>window.NJ_LISTING_ID=' + JSON.stringify(String(l.id)) + ';</script>\n  <script src="/landmeta.js"></script>');

  // เนื้อหาที่บอตอ่านได้ — ใส่ไว้ในกล่องเดียวกับที่ land.js จะเขียนทับ
  s = s.replace(/(<div id="ld-root"[^>]*>)([\s\S]*?)(<\/div>)/,
    (m, open, inner, close) => open + '\n      ' + bodyHtml(l) + '\n    ' + close);

  return s;
}

// ---------- หน้าพาไปที่อยู่ใหม่ ----------
//
// ⚠️ **ที่อยู่ที่เคยเผยแพร่ออกไปแล้วต้องไม่ตาย** (ข้อกำหนดข้อ 3)
//    โฮสต์ปัจจุบันคือ GitHub Pages ซึ่ง **ทำ 301 จริงไม่ได้** จึงใช้สามชั้นพร้อมกัน:
//      1. `<link rel=canonical>` ชี้ที่อยู่ใหม่ — บอกเสิร์ชเอนจินว่าตัวจริงอยู่ไหน
//      2. `<meta http-equiv=refresh>` — พาผู้ใช้ไปเองแม้ปิดสคริปต์
//      3. ลิงก์ที่กดได้จริงบนหน้า — เผื่อทั้งสองอย่างข้างบนถูกบล็อก **ห้ามตัดออก**
//    ⚠️ ห้ามใส่ noindex ในหน้าพวกนี้ — noindex คู่กับ canonical เป็นคำสั่งที่ขัดกันเอง
//       และจะทำให้ที่อยู่เดิมหายจากดัชนีโดยไม่ส่งค่าอะไรต่อให้ที่อยู่ใหม่เลย
function stubHtml(title, toUrl) {
  const enc = META.encUrl(toUrl);
  return [
    '<!doctype html>',
    '<html lang="th">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>' + esc(title) + '</title>',
    '  <link rel="canonical" href="' + esc(enc) + '">',
    '  <meta http-equiv="refresh" content="0; url=' + esc(enc) + '">',
    '  <meta name="robots" content="follow">',
    '</head>',
    '<body>',
    '  <p>ที่อยู่ของหน้านี้เปลี่ยนแล้ว กำลังพาไปที่อยู่ใหม่…</p>',
    '  <p><a href="' + esc(enc) + '">' + esc(title) + '</a></p>',
    '  <script>location.replace(' + JSON.stringify(enc) + ');</script>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

// ลบโฟลเดอร์ที่ไม่มีอะไรเหลือแล้ว ไล่ขึ้นไปจนถึงรากของ properties/
function pruneEmpty(dir) {
  let cur = dir;
  while (cur.startsWith(PROP_DIR) && cur !== PROP_DIR) {
    let left = [];
    try { left = fs.readdirSync(cur); } catch (e) { break; }
    if (left.length) break;
    fs.rmdirSync(cur);
    cur = path.dirname(cur);
  }
}

// ไล่หาไฟล์ index.html ทุกอันใต้ properties/ (ใช้ตอนเก็บกวาดแปลงที่หายไปจาก API)
function walkIndexes(dir, out) {
  let items = [];
  try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory()) walkIndexes(full, out);
    else if (it.name === 'index.html') out.push(full);
  }
  return out;
}

// ---------- ลงมือ ----------
async function main() {
  const tplPath = path.join(ROOT, 'land.html');
  const tpl = fs.readFileSync(tplPath, 'utf8');
  if (tpl.indexOf('<div id="ld-root"') < 0) {
    console.log('⛔ land.html ไม่มี <div id="ld-root"> — ต้นแบบเปลี่ยนไป ต้องแก้ build/properties.js ตาม');
    process.exit(1);
  }

  let data;
  try {
    const r = await fetch(API + '/api/public/listings');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    data = await r.json();
  } catch (e) {
    // ⚠️ ข้อ 4 — ล้มแล้วห้ามแตะไฟล์เดิม
    console.log('⛔ ดึงข้อมูลจาก ' + API + ' ไม่สำเร็จ: ' + e.message);
    console.log('   ไม่ได้แตะไฟล์เดิมเลยสักไฟล์ — หน้าแปลงชุดเดิมยังอยู่ครบ');
    process.exit(1);
  }

  const list = Array.isArray(data.listings) ? data.listings : [];
  if (!list.length) {
    console.log('⛔ API ตอบสำเร็จแต่ไม่มีแปลงเลย — ไม่ลบของเดิมทิ้ง (อาจเป็นความผิดพลาดชั่วคราว)');
    process.exit(1);
  }

  // ---------- ทะเบียนที่อยู่เดิม ----------
  // เก็บ "ที่อยู่เก่า → ที่อยู่ใหม่" ของแปลงที่ย้ายที่อยู่ (เช่นทีมเพิ่งกรอกประเภททรัพย์)
  // ⚠️ ห้ามลบรายการเก่าทิ้ง — ที่อยู่ที่เคยเผยแพร่ออกไปแล้วต้องพาไปที่ใหม่ได้ตลอดไป
  let redir = {};
  try { redir = JSON.parse(fs.readFileSync(REDIR_FILE, 'utf8')); } catch (e) { redir = {}; }
  if (!redir || typeof redir !== 'object') redir = {};

  if (!DRY) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.mkdirSync(PROP_DIR, { recursive: true });
    fs.mkdirSync(MAP_DIR, { recursive: true });
  }

  const wantIndex = new Set();   // ที่อยู่ของหน้าจริงรอบนี้
  const wantStub = new Set();    // ที่อยู่ของหน้าพาไปรอบนี้
  let wrote = 0, same = 0, stubs = 0, moved = 0;

  for (const l of list) {
    if (!l || !l.id) continue;
    const id = String(l.id);
    const dirRel = META.pagePath(l, VOCAB);                 // properties/…/OP-xxx/
    const indexRel = dirRel + 'index.html';
    wantIndex.add(indexRel);

    const full = path.join(ROOT, indexRel);
    const html = render(tpl, l);
    const old = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (old === html) same++;
    else {
      wrote++;
      if (!DRY) { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, html); }
    }

    const newUrl = META.pageUrl(l, VOCAB);
    const title = META.titleOf(l, VOCAB);

    // หน้าพาไปที่ที่อยู่ชุดเดิมของ Sprint 5 (p/<รหัส>.html)
    const legacyRel = META.legacyPath(id);
    wantStub.add(legacyRel);
    const legacyFull = path.join(ROOT, legacyRel);
    const stub = stubHtml(title, newUrl);
    const legacyOld = fs.existsSync(legacyFull) ? fs.readFileSync(legacyFull, 'utf8') : null;
    if (legacyOld !== stub) { stubs++; if (!DRY) fs.writeFileSync(legacyFull, stub); }
    redir['/' + legacyRel] = '/' + dirRel;

    // แปลงที่ย้ายที่อยู่ (ข้อมูลที่ใช้ตั้งชื่อเปลี่ยน) — วางหน้าพาไปไว้ที่อยู่เดิมทุกอัน
    for (const from of Object.keys(redir)) {
      if (redir[from] !== '/' + dirRel) continue;
      if (from === '/' + legacyRel || from === '/' + dirRel) continue;
      const oldRel = from.replace(/^\//, '');
      if (!/^properties\//.test(oldRel)) continue;
      const oldFile = path.join(ROOT, oldRel + 'index.html');
      wantStub.add(oldRel + 'index.html');
      const cur = fs.existsSync(oldFile) ? fs.readFileSync(oldFile, 'utf8') : null;
      if (cur !== stub) { stubs++; if (!DRY) { fs.mkdirSync(path.dirname(oldFile), { recursive: true }); fs.writeFileSync(oldFile, stub); } }
    }
  }

  // ---------- แปลงที่ย้ายที่อยู่ระหว่างรอบนี้กับรอบก่อน ----------
  // ไฟล์ index.html เดิมที่ไม่อยู่ในรายการรอบนี้ และยังเป็นของแปลงที่ยังประกาศอยู่ → กลายเป็นหน้าพาไป
  // ส่วนของแปลงที่หายจาก API แล้ว → ลบทิ้ง (กติกาข้อ 5 ของไฟล์นี้)
  const liveIds = new Set(list.filter((l) => l && l.id).map((l) => String(l.id)));
  const urlById = new Map(list.filter((l) => l && l.id).map((l) => [String(l.id), META.pageUrl(l, VOCAB)]));
  const titleById = new Map(list.filter((l) => l && l.id).map((l) => [String(l.id), META.titleOf(l, VOCAB)]));
  let removed = 0;
  for (const file of walkIndexes(PROP_DIR, [])) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (wantIndex.has(rel) || wantStub.has(rel)) continue;
    const dirRel = rel.replace(/index\.html$/, '');
    const idFromPath = dirRel.replace(/\/$/, '').split('/').pop();
    if (liveIds.has(idFromPath)) {
      // ย้ายที่อยู่ — วางหน้าพาไปไว้ที่เดิม แล้วจำไว้ในทะเบียน
      const stub = stubHtml(titleById.get(idFromPath), urlById.get(idFromPath));
      moved++;
      if (!DRY) fs.writeFileSync(file, stub);
      redir['/' + dirRel] = '/' + META.pagePath(list.find((x) => String(x.id) === idFromPath), VOCAB);
    } else {
      removed++;
      if (!DRY) { fs.unlinkSync(file); pruneEmpty(path.dirname(file)); }
    }
  }
  // หน้าพาไปชุดเดิมของแปลงที่ถูกถอดออกแล้ว — ลบทิ้งเหมือนกัน
  if (fs.existsSync(OUT_DIR)) {
    for (const fName of fs.readdirSync(OUT_DIR)) {
      if (!fName.endsWith('.html')) continue;
      if (wantStub.has('p/' + fName)) continue;
      removed++;
      if (!DRY) fs.unlinkSync(path.join(OUT_DIR, fName));
    }
  }

  if (!DRY) fs.writeFileSync(REDIR_FILE, JSON.stringify(redir, null, 2) + '\n');

  // ---------- แผนผังเฉพาะหน้าแปลง ----------
  // ⚠️ ใส่เฉพาะที่อยู่จริงชุดใหม่ · หน้าพาไปห้ามอยู่ในแผนผัง (แผนผังคือรายการหน้าที่อยากให้เก็บดัชนี)
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    .concat(list.filter((l) => l && l.id).map((l) =>
      '  <url>\n    <loc>' + esc(META.encUrl(META.pageUrl(l, VOCAB))) + '</loc>\n' +
      (l.updatedAt ? '    <lastmod>' + String(l.updatedAt).slice(0, 10) + '</lastmod>\n' : '') +
      '  </url>'))
    .concat(['</urlset>', '']).join('\n');
  const mapFile = path.join(MAP_DIR, 'properties.xml');
  const mapOld = fs.existsSync(mapFile) ? fs.readFileSync(mapFile, 'utf8') : null;
  if (!DRY && mapOld !== xml) fs.writeFileSync(mapFile, xml);

  console.log((DRY ? '[ลองดูเฉยๆ] ' : '') +
    'หน้าแปลง ' + list.length + ' แปลง — เขียนใหม่ ' + wrote + ' · เหมือนเดิม ' + same +
    ' · หน้าพาไป ' + stubs + ' · ย้ายที่อยู่ ' + moved + ' · ลบ ' + removed);
  console.log('แผนผัง: sitemaps/properties.xml (' + list.length + ' URL) · ทะเบียนที่อยู่เดิม: redirects.json (' + Object.keys(redir).length + ' รายการ)');
  if (DRY) console.log('\n(ไม่ได้เขียนอะไรลงดิสก์)');
}

main();
