'use strict';
// ---------- สร้างหน้าพื้นที่ (จังหวัด/อำเภอ) จากทะเบียน SEO ----------
//
// รัน:  node build/locations.js            (ดึงข้อมูลจริงแล้วเขียน locations/**, sitemaps/locations.xml)
//       node build/locations.js --dry-run  (บอกว่าจะเขียน/ลบอะไร แต่ไม่แตะไฟล์)
//       node build/locations.js --api http://127.0.0.1:8793   (ชี้ไปเซิร์ฟเวอร์ทดสอบ)
//
// ⚠️ ลำดับทั้งชุด: pages.js → properties.js → **locations.js** → schema.js → sitemap.js
//    (ไฟล์นี้เปลี่ยนสถานะเก็บดัชนีของ locations.html ได้ · schema.js กับ sitemap.js อ่านสถานะนั้น
//     จึงต้องรันตามหลัง ไม่งั้นดัชนีหน้าพื้นที่ตกหล่นจากแผนผังไปอีกหนึ่งรอบ build)
//
// ⚠️⚠️ เจ็ดข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **หน้าพื้นที่เกิดจาก "แอดมินกดเผยแพร่" เท่านั้น** (ข้อกำหนดงานที่ 6)
//    ฝั่งระบบเปิด `GET /api/public/seo/areas` ซึ่งคืนเฉพาะรายการที่กดเผยแพร่แล้ว
//    **ห้ามสร้างหน้าจากรายชื่อจังหวัดที่มีแปลงประกาศอยู่** ไม่ว่าจะดูสมเหตุสมผลแค่ไหน —
//    นั่นคือ "หน้าจังหวัดที่เปลี่ยนแค่ชื่อ" ซึ่งข้อกำหนดห้ามไว้ตรงๆ และเป็นหน้าคุณภาพต่ำ
//    ที่ลากทั้งเว็บลงไปด้วย · ปิดสวิตช์เมื่อไหร่ รอบถัดไปหน้านั้นถูกลบทิ้ง
//
// 2. **เนื้อหาของพื้นที่มาจากช่อง `intro` ที่คนเขียนเอง** ระบบไม่แต่งประโยคให้
//    (ฝั่งระบบบังคับแล้วว่าต้องยาวอย่างน้อย 80 ตัวอักษรก่อนกดเผยแพร่ได้)
//    ⚠️ **ห้ามเติมประโยคอัตโนมัติแบบ "ที่ดินใน{จังหวัด} ทำเลดี ราคาน่าลงทุน"** ลงไฟล์นี้เด็ดขาด
//
// 3. **ที่อยู่ของหน้ามาจากช่อง `path` ของทะเบียน ไม่ได้ประกอบเอง**
//    `path` แก้ไม่ได้หลังสร้าง (กติกาของทะเบียน) ที่อยู่จึงไม่ขยับเองเมื่อทีมแก้ชื่อจังหวัด
//    ⚠️ **แต่ต้องตรวจรูปแบบก่อนเขียนทุกครั้ง** — รับเฉพาะ `locations/<อะไรสักอย่าง>[/<อะไรสักอย่าง>]/`
//       ไม่งั้นรายการที่ตั้ง path เป็น `index.html` จะเขียนทับหน้าแรกของเว็บทั้งหน้า
//
// 4. **ดึงข้อมูลไม่สำเร็จ = ไม่แตะไฟล์เดิมเลยแม้แต่ไฟล์เดียว** แล้วออกด้วยรหัสไม่ศูนย์
//    (กติกาเดียวกับ build/properties.js ข้อ 4)
//
// 5. **รายการแปลงบนหน้านี้เป็นข้อมูล ณ ตอนสร้างไฟล์** — หน้านี้ไม่มีสคริปต์ดึงข้อมูลสด
//    จึงต้องมีข้อความกำกับว่าให้กดเข้าไปดูราคาปัจจุบันที่หน้าแปลง **ห้ามตัดข้อความนั้นทิ้ง**
//    (จะทำให้สดได้ต้องเพิ่มสคริปต์ฝั่งเบราว์เซอร์ — เป็นงานรอบถัดไป ไม่ใช่การลบคำเตือน)
//
// 6. **ต้นแบบคือ `locations.html` ตัวจริง ไม่ได้เขียนโครงหน้าใหม่**
//    แก้หัวเว็บที่ `locations.html` แล้วต้องรันไฟล์นี้ใหม่ (รัน `node build/pages.js` ก่อนเสมอ)
//    · ก้อน JSON-LD ที่ติดมากับต้นแบบเป็นของ `locations.html` **ต้องเขียนทับให้เป็นของหน้านั้นๆ**
//      ไม่งั้นทุกหน้าพื้นที่จะประกาศกับ Google ว่าตัวเองคือหน้าดัชนี
//
// 7. **ไม่แตะหน้าอื่นของเว็บ** — เขียนเฉพาะ `locations/**` · `locations.html` (เฉพาะในกล่อง
//    `nj-locbody` กับกล่อง `nj-loc`) · `sitemaps/locations.xml` · และบรรทัด Sitemap ใน `robots.txt`
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const TPL_FILE = path.join(ROOT, 'locations.html');
const OUT_DIR = path.join(ROOT, 'locations');
const MAP_DIR = path.join(ROOT, 'sitemaps');
const MAP_FILE = path.join(MAP_DIR, 'locations.xml');
const ROBOTS_FILE = path.join(ROOT, 'robots.txt');
const SITE = 'https://njteedinsure.com';
const INDEX_URL = SITE + '/locations.html';
const MAP_LINE = 'Sitemap: ' + SITE + '/sitemaps/locations.xml';

// แสดงแปลงต่อหน้าได้มากสุดเท่านี้ — เกินแล้วบอกจำนวนจริงแล้วส่งต่อไปหน้ารวมประกาศ
// (หน้าที่มีลิงก์หลายร้อยอันอ่านยากสำหรับคน และเป็นสัญญาณไม่ดีสำหรับเสิร์ชเอนจิน)
const MAX_ITEMS = 60;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const baht = (n) => Number(n).toLocaleString('th-TH');

// ---------- ที่อยู่ของหน้าพื้นที่ต้องอยู่ใต้ locations/ เท่านั้น ----------
//
// ⚠️ ด่านนี้คือสิ่งเดียวที่กันไม่ให้รายการในทะเบียนที่ตั้ง path ผิด (เช่น `index.html`)
//    ไปเขียนทับหน้าจริงของเว็บ · ห้ามผ่อนให้รับรูปแบบอื่นโดยไม่คิดให้จบก่อน
const AREA_PATH_RE = /^locations\/[^/\\?#%]+(?:\/[^/\\?#%]+)?\/$/;
function areaPathOk(p) {
  if (typeof p !== 'string' || !AREA_PATH_RE.test(p)) return false;
  return p.split('/').every((seg) => seg !== '.' && seg !== '..');
}

// ---------- หัวข้อของหน้า ----------
//
// ⚠️ ใช้ชื่อจังหวัด/อำเภอตามที่ทีมกรอก **ไม่เติมคำว่า "อำเภอ" หรือ "เขต" ให้เอง**
//    กรุงเทพฯ ใช้ "เขต" ต่างจังหวัดใช้ "อำเภอ" — เดาผิดคือพิมพ์ผิดบนหัวข้อหน้าที่ขึ้น Google
function areaHeading(a) {
  const prov = String((a && a.province) || '').trim();
  const amp = String((a && a.amphoe) || '').trim();
  if (!prov) return '';
  return amp ? ('ที่ดินใน' + amp + ' ' + prov) : ('ที่ดินใน' + prov);
}
function areaLabel(a) {
  const prov = String((a && a.province) || '').trim();
  const amp = String((a && a.amphoe) || '').trim();
  return amp ? (amp + ' · ' + prov) : prov;
}
const areaUrl = (a) => SITE + '/' + a.path;

// ---------- แปลงที่อยู่ในพื้นที่นี้ ----------
//
// ⚠️ เทียบชื่อแบบตรงตัว ไม่เดา — แปลงที่ยังไม่ได้กรอกจังหวัดจะไม่ขึ้นหน้าไหนเลย ซึ่งถูกแล้ว
//    (เดาจากข้อความ `parcelInfo` เมื่อไหร่ = แปลงไปโผล่ผิดจังหวัดโดยไม่มีอะไรเตือน)
function inArea(l, a) {
  const L = (l && l.land) || {};
  if (!a.province || String(L.province || '').trim() !== a.province) return false;
  if (a.amphoe) return String(L.amphoe || '').trim() === a.amphoe;
  return true;
}

// เรียงใหม่สุดก่อน แล้วใช้รหัสทรัพย์ตัดสินเมื่อวันเท่ากัน — ผลลัพธ์ต้องเหมือนเดิมทุกครั้งที่รัน
function sortItems(list) {
  return list.slice().sort((x, y) => {
    const a = String(y.updatedAt || '').localeCompare(String(x.updatedAt || ''));
    return a !== 0 ? a : String(x.id || '').localeCompare(String(y.id || ''));
  });
}

function itemHtml(l, META, VOCAB) {
  const L = l.land || {};
  const bits = [];
  if (Number(l.estValue) > 0) bits.push(baht(l.estValue) + ' บาท');
  if (Number(l.pricePerWa) > 0) bits.push(baht(l.pricePerWa) + ' บาท/ตร.ว.');
  if (L.deedType && VOCAB.DEED_TH && VOCAB.DEED_TH[L.deedType]) bits.push(VOCAB.DEED_TH[L.deedType]);
  bits.push('รหัส ' + l.id);
  return '<li class="loc-item"><a href="/' + esc(META.encUrl(META.pagePath(l, VOCAB))) + '">' +
    esc(META.shortLabel(l, VOCAB)) + '</a>' +
    '<span class="loc-meta">' + esc(bits.join(' · ')) + '</span></li>';
}

// ---------- เนื้อหาในกล่อง nj-locbody ของหน้าพื้นที่หนึ่งหน้า ----------
function bodyHtml(a, items, kids, META, VOCAB) {
  const shown = items.slice(0, MAX_ITEMS);
  const crumb = ['<p class="loc-crumb"><a href="/">หน้าแรก</a> › <a href="/locations.html">ที่ดินตามจังหวัดและอำเภอ</a>'];
  if (a.amphoe && a.parentPath) crumb.push(' › <a href="/' + esc(META.encUrl(a.parentPath)) + '">' + esc(a.province) + '</a>');
  crumb.push(' › ' + esc(areaLabel(a)) + '</p>');

  // ⚠️ หัวข้อของหน้าต้องอยู่ในกล่องที่ตัวสร้างเขียนด้วย — ไม่งั้นหน้าพื้นที่จะได้หัวข้อของ
  //    หน้าดัชนีติดมาจากต้นแบบ กลายเป็น H1 สองอันคนละเรื่องในหน้าเดียว (เจอจริงตอนทดสอบ)
  const out = ['<section class="loc-head"><div class="shell">'];
  out.push(crumb.join(''));
  out.push('<h1>' + esc(areaHeading(a)) + '</h1>');
  out.push('</div></section>');
  out.push('<section class="shell loc-wrap">');
  // ⚠️ ข้อความของพื้นที่มาจากคนเขียนทั้งก้อน — ขึ้นบรรทัดใหม่เก็บไว้ด้วย CSS (white-space: pre-line)
  out.push('<div class="loc-intro">' + esc(a.intro || '') + '</div>');

  if (kids && kids.length) {
    out.push('<h2 class="loc-h2">พื้นที่ย่อยใน' + esc(a.province) + '</h2>');
    out.push('<ul class="loc-grid">' + kids.map((k) =>
      '<li class="loc-card"><a href="/' + esc(META.encUrl(k.path)) + '">' + esc(areaLabel(k)) + '</a>' +
      (k.count != null ? '<span class="loc-n">' + esc(k.count ? (k.count + ' แปลงที่ประกาศอยู่') : 'ยังไม่มีแปลงที่ประกาศอยู่') + '</span>' : '') +
      '</li>').join('') + '</ul>');
  }

  out.push('<h2 class="loc-h2">แปลงที่ประกาศอยู่ตอนนี้ในพื้นที่นี้' +
    (items.length ? (' (' + items.length + ' แปลง)') : '') + '</h2>');
  if (!items.length) {
    // ⚠️ ไม่มีแปลง = บอกตรงๆ ห้ามเขียนว่า "กำลังรวบรวม" หรือเติมแปลงจากพื้นที่ข้างเคียง
    out.push('<p class="loc-empty">ยังไม่มีแปลงที่ประกาศอยู่ในพื้นที่นี้ตอนนี้ — ' +
      '<a href="/listings.html">ดูประกาศทั้งหมด</a></p>');
  } else {
    out.push('<ul class="loc-list">' + shown.map((l) => itemHtml(l, META, VOCAB)).join('') + '</ul>');
    if (items.length > shown.length) {
      out.push('<p class="loc-note">แสดง ' + shown.length + ' จาก ' + items.length + ' แปลง · ' +
        '<a href="/listings.html">ดูทั้งหมดที่หน้ารวมประกาศ</a></p>');
    }
    // ⚠️ ข้อ 5 — ห้ามตัดบรรทัดนี้ทิ้ง
    out.push('<p class="loc-note">ราคาและรายละเอียดที่แสดงเป็นข้อมูลล่าสุดตอนสร้างหน้านี้ ' +
      'กดเข้าไปที่แปลงเพื่อดูข้อมูลปัจจุบัน</p>');
  }
  out.push('<p class="loc-more"><a href="/locations.html">ดูพื้นที่อื่น</a> · ' +
    '<a href="/listings.html">ประกาศทั้งหมด</a> · <a href="/purpose.html">ค้นตามวัตถุประสงค์</a></p>');
  out.push('</section>');
  return out.join('\n      ');
}

// ---------- เนื้อหาในกล่อง nj-locbody ของหน้าดัชนี ----------
const INDEX_HEAD = [
  '<section class="loc-head"><div class="shell">',
  '        <h1>ที่ดินตามจังหวัดและอำเภอ</h1>',
  '        <p>เลือกพื้นที่ที่สนใจ แต่ละหน้ามีข้อมูลของพื้นที่นั้นที่ทีมช่างรังวัดเขียนเอง และรายการแปลงที่ประกาศอยู่ตอนนี้ในพื้นที่นั้น</p>',
  '      </div></section>',
  '      <section class="shell loc-wrap">'
].join('\n      ');

function indexHtml(areas, countOf, META) {
  if (!areas.length) {
    return INDEX_HEAD + '\n        <p class="loc-empty">ยังไม่มีหน้าพื้นที่ที่เผยแพร่</p>\n      </section>';
  }
  const provs = areas.filter((a) => !a.amphoe);
  const byProv = {};
  areas.filter((a) => a.amphoe).forEach((a) => {
    (byProv[a.province] = byProv[a.province] || []).push(a);
  });
  // จังหวัดที่มีแต่หน้าอำเภอ (ยังไม่ได้เผยแพร่หน้าจังหวัด) ต้องไม่หายไปจากดัชนี
  Object.keys(byProv).forEach((p) => {
    if (!provs.some((x) => x.province === p)) provs.push({ province: p, amphoe: '', path: '', virtual: true });
  });
  provs.sort((x, y) => String(x.province).localeCompare(String(y.province), 'th'));

  const cards = provs.map((p) => {
    const kids = (byProv[p.province] || []).slice()
      .sort((x, y) => String(x.amphoe).localeCompare(String(y.amphoe), 'th'));
    const head = p.virtual
      ? '<b>' + esc(p.province) + '</b>'
      : '<a href="/' + esc(META.encUrl(p.path)) + '">' + esc(p.province) + '</a>';
    const n = p.virtual ? null : countOf(p);
    return '<li class="loc-card">' + head +
      (n != null ? '<span class="loc-n">' + esc(n ? (n + ' แปลงที่ประกาศอยู่') : 'ยังไม่มีแปลงที่ประกาศอยู่') + '</span>' : '') +
      (kids.length ? ('<p>' + kids.map((k) =>
        '<a href="/' + esc(META.encUrl(k.path)) + '">' + esc(k.amphoe) + '</a>').join(' · ') + '</p>') : '') +
      '</li>';
  });
  return INDEX_HEAD + '\n        <ul class="loc-grid">' + cards.join('') + '</ul>\n      </section>';
}

// ---------- JSON-LD ของหน้าพื้นที่ ----------
//
// ⚠️ ใช้ก้อนของต้นแบบเป็นฐาน (ข้อมูลบริษัท/เว็บไซต์มีที่มาเดียว) แล้วเขียนทับเฉพาะ
//    ส่วนที่เป็นของหน้านั้น — ปล่อยไว้เมื่อไหร่ ทุกหน้าพื้นที่จะประกาศว่าตัวเองคือหน้าดัชนี
function graphFor(tplGraph, page) {
  const g = JSON.parse(JSON.stringify(tplGraph));
  const arr = g['@graph'] || [];
  const wp = arr.find((x) => x['@type'] === 'WebPage');
  if (wp) {
    wp['@id'] = page.url + '#webpage';
    wp.url = page.url;
    wp.name = page.name;
    wp.description = page.desc;
    if (wp.breadcrumb) wp.breadcrumb = { '@id': page.url + '#breadcrumb' };
  }
  const bc = arr.find((x) => x['@type'] === 'BreadcrumbList');
  if (bc) {
    bc['@id'] = page.url + '#breadcrumb';
    bc.itemListElement = page.crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.url
    }));
  }
  if (page.items && page.items.length) {
    arr.push({
      '@type': 'ItemList',
      '@id': page.url + '#items',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: page.items.length,
      itemListElement: page.items.map((it, i) => ({
        '@type': 'ListItem', position: i + 1, name: it.name, url: it.url
      }))
    });
  }
  return g;
}

// ---------- แทนที่เนื้อหาในกล่องที่ตัวสร้างดูแล ----------
//
// ⚠️ ใช้เครื่องหมายคอมเมนต์เป็นขอบเขต **ห้ามกลับไปจับ `</div>` ตัวแรก**
//    เนื้อหาข้างในมี div ซ้อนอยู่ (section > div.shell) ตัวแทนที่จึงหยุดกลางทาง
//    แล้วเนื้อหาเก่าค้างต่อท้ายของใหม่ — รันสองรอบได้หน้าที่มีเนื้อหาซ้ำสองชุด (เจอจริงตอนทดสอบ)
const BODY_RE = /(<!-- nj-locbody:start -->)[\s\S]*?(<!-- nj-locbody:end -->)/;
function replaceBody(html, inner) {
  if (!BODY_RE.test(html)) throw new Error('ไม่เจอเครื่องหมาย nj-locbody ในต้นแบบ');
  return html.replace(BODY_RE, (m, open, close) => open + '\n      ' + inner + '\n  ' + close);
}

// ---------- ประกอบหน้าจากต้นแบบ ----------
function render(tpl, a, inner, graph) {
  const url = areaUrl(a);
  const enc = encodeURI(url);
  let s = tpl;

  // หน้าอยู่ในโฟลเดอร์ย่อย — ที่อยู่ไฟล์แบบย่อต้องกลายเป็นแบบเต็ม (กติกาเดียวกับ build/properties.js)
  s = s.replace(/(\s(?:href|src)=")(?!https?:|\/\/|#|mailto:|tel:|data:)([^"]+)(")/g, (m, p1, p2, p3) => p1 + '/' + p2 + p3);

  s = s.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(a.title) + '</title>');
  s = s.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(a.description) + '">');
  s = s.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + esc(enc) + '">');

  const photo = /^https:\/\//.test(String(a.ogImage || '')) ? a.ogImage : (SITE + '/brand/og-image.png');
  const og = {
    'og:title': a.title, 'og:description': a.description, 'og:url': enc, 'og:image': photo,
    'og:type': 'website', 'og:site_name': 'ที่ดินชัวร์'
  };
  Object.keys(og).forEach((k) => {
    const re = new RegExp('<meta property="' + k + '" content="[^"]*">');
    const tag = '<meta property="' + k + '" content="' + esc(og[k]) + '">';
    if (re.test(s)) s = s.replace(re, tag);
    else s = s.replace('</head>', '  ' + tag + '\n</head>');
  });

  // กล่อง nj-loc เป็นของหน้าดัชนีเท่านั้น — หน้าพื้นที่ที่เผยแพร่แล้วต้องเก็บดัชนีได้เสมอ
  s = s.replace(/(<!-- nj-loc:start[\s\S]*?-->)[\s\S]*?(<!-- nj-loc:end -->)/, '$1$2');

  // ⚠️ ต้นแบบอาจ **ไม่มี** บล็อกนี้ (ดัชนีที่ยังว่างเป็น noindex · build/schema.js ถอดออกให้)
  //    ต้องแทรกใหม่ ไม่ใช่แค่แทนที่ ไม่งั้นหน้าพื้นที่หน้าแรกที่ทีมเผยแพร่จะไม่มี JSON-LD เลย
  const ld = '  <!-- nj-schema:start — สร้างด้วย build/locations.js · ห้ามแก้ด้วยมือ -->\n' +
    '  <script type="application/ld+json" data-nj-schema>\n' + JSON.stringify(graph, null, 2) +
    '\n  </script>\n  <!-- nj-schema:end -->\n';
  if (/<!-- nj-schema:start[\s\S]*?<!-- nj-schema:end -->/.test(s)) {
    s = s.replace(/<!-- nj-schema:start[\s\S]*?<!-- nj-schema:end -->/, ld.trim());
  } else {
    s = s.replace('</head>', ld + '</head>');
  }

  s = replaceBody(s, inner);
  return s;
}

// ---------- แผนผังเฉพาะหน้าพื้นที่ ----------
function xmlFor(areas) {
  return ['<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    .concat(areas.map((a) =>
      '  <url>\n    <loc>' + esc(encodeURI(areaUrl(a))) + '</loc>\n' +
      (a.updatedAt ? '    <lastmod>' + String(a.updatedAt).slice(0, 10) + '</lastmod>\n' : '') +
      '  </url>'))
    .concat(['</urlset>', '']).join('\n');
}

// ---------- บรรทัด Sitemap ใน robots.txt ----------
//
// ⚠️ ชี้ไปไฟล์ที่ไม่มีอยู่จริง = Search Console ขึ้นว่าอ่านแผนผังไม่ได้
//    บรรทัดนี้จึงมีเมื่อมีหน้าพื้นที่จริง และหายไปเองเมื่อไม่มี
function robotsWith(txt, on) {
  const lines = String(txt).split('\n');
  const cleaned = lines.filter((l) => l.trim() !== MAP_LINE && l.trim() !== '#   sitemaps/locations.xml  = หน้าพื้นที่ (สร้างด้วย build/locations.js จากทะเบียน SEO)');
  if (!on) return cleaned.join('\n');
  const at = cleaned.findIndex((l) => l.trim() === 'Sitemap: ' + SITE + '/sitemaps/properties.xml');
  if (at < 0) return cleaned.concat([MAP_LINE]).join('\n');
  const head = cleaned.slice(0, at + 1);
  const tail = cleaned.slice(at + 1);
  // คำอธิบายอยู่เหนือบล็อก Sitemap — เติมบรรทัดของเราต่อท้ายรายการคำอธิบายนั้นด้วย
  const noteAt = head.findIndex((l) => l.indexOf('sitemaps/properties.xml = หน้าแปลงรายแปลง') >= 0);
  if (noteAt >= 0) head.splice(noteAt + 1, 0, '#   sitemaps/locations.xml  = หน้าพื้นที่ (สร้างด้วย build/locations.js จากทะเบียน SEO)');
  return head.concat([MAP_LINE]).concat(tail).join('\n');
}

// ---------- ตัวช่วยอ่านไฟล์ ----------
function loadVocab() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'landvocab.js'), 'utf8'), sandbox, { filename: 'landvocab.js' });
  return sandbox.window.NJVocab || {};
}
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
function pruneEmpty(dir) {
  let cur = dir;
  while (cur.startsWith(OUT_DIR) && cur !== OUT_DIR) {
    let left = [];
    try { left = fs.readdirSync(cur); } catch (e) { break; }
    if (left.length) break;
    fs.rmdirSync(cur);
    cur = path.dirname(cur);
  }
}

// ---------- ลงมือ ----------
async function main() {
  const argv = process.argv.slice(2);
  const DRY = argv.indexOf('--dry-run') >= 0;
  const apiAt = argv.indexOf('--api');
  const API = apiAt >= 0 ? argv[apiAt + 1] : 'https://app.njteedinsure.com';

  const tpl = fs.readFileSync(TPL_FILE, 'utf8');
  if (tpl.indexOf('nj-locbody:start') < 0 || tpl.indexOf('nj-locbody:end') < 0) {
    console.log('⛔ locations.html ไม่มีเครื่องหมาย nj-locbody — ต้นแบบเปลี่ยนไป ต้องแก้ build/locations.js ตาม');
    process.exit(1);
  }
  // ---------- ก้อน JSON-LD ต้นแบบ ----------
  //
  // ⚠️ ดัชนีที่ยังไม่มีพื้นที่ไหนเผยแพร่เป็น noindex และ `build/schema.js` **ถอดบล็อก JSON-LD
  //    ของหน้า noindex ออก** — ตัวสร้างจึงอ่านจากต้นแบบไม่ได้ในสภาพเริ่มต้น แล้วตายทันที
  //    ที่ทีมเผยแพร่พื้นที่แรก (เจอจริงตอนทดสอบ) · จึงถอยไปอ่านจากหน้าที่เก็บดัชนีได้แทน
  //    ข้อมูลบริษัท/เว็บไซต์ในก้อนนี้เหมือนกันทุกหน้าอยู่แล้ว (schema.js สร้างจาก index.html ที่เดียว)
  const readGraph = (html) => {
    const m = html && html.match(/<!-- nj-schema:start[\s\S]*?-->([\s\S]*?)<!-- nj-schema:end -->/);
    if (!m) return null;
    try { return JSON.parse(m[1].match(/\{[\s\S]*\}/)[0]); } catch (e) { return null; }
  };
  let tplGraph = readGraph(tpl);
  if (!tplGraph) {
    for (const f of ['listings.html', 'index.html', 'services.html']) {
      const p = path.join(ROOT, f);
      if (!fs.existsSync(p)) continue;
      tplGraph = readGraph(fs.readFileSync(p, 'utf8'));
      if (tplGraph) { console.log('ℹ อ่านก้อน JSON-LD ต้นแบบจาก ' + f + ' (ดัชนียังว่างจึงไม่มีบล็อกของตัวเอง)'); break; }
    }
  }
  if (!tplGraph) {
    console.log('⛔ อ่านก้อน JSON-LD ต้นแบบไม่ได้เลยสักหน้า — รัน node build/schema.js ก่อน');
    process.exit(1);
  }

  let areasRes, listRes;
  try {
    const [r1, r2] = await Promise.all([
      fetch(API + '/api/public/seo/areas'),
      fetch(API + '/api/public/listings')
    ]);
    if (!r1.ok) throw new Error('seo/areas HTTP ' + r1.status);
    if (!r2.ok) throw new Error('listings HTTP ' + r2.status);
    areasRes = await r1.json();
    listRes = await r2.json();
  } catch (e) {
    // ⚠️ ข้อ 4 — ล้มแล้วห้ามแตะไฟล์เดิม
    console.log('⛔ ดึงข้อมูลจาก ' + API + ' ไม่สำเร็จ: ' + e.message);
    console.log('   ไม่ได้แตะไฟล์เดิมเลยสักไฟล์ — หน้าพื้นที่ชุดเดิมยังอยู่ครบ');
    process.exit(1);
  }

  const META = require(path.join(ROOT, 'landmeta.js'));
  const VOCAB = loadVocab();
  const listings = Array.isArray(listRes.listings) ? listRes.listings : [];
  const raw = Array.isArray(areasRes.areas) ? areasRes.areas : [];

  const bad = raw.filter((a) => !areaPathOk(a && a.path));
  bad.forEach((a) => console.log('⚠ ข้ามรายการที่ที่อยู่ไม่ใช่รูปแบบของหน้าพื้นที่: ' + JSON.stringify(a && a.path)));
  const areas = raw.filter((a) => areaPathOk(a && a.path) && a.province && a.title && a.description && a.intro);
  const thin = raw.length - bad.length - areas.length;
  if (thin > 0) console.log('⚠ ข้ามรายการที่ข้อมูลไม่ครบ ' + thin + ' รายการ (ต้องมีจังหวัด ชื่อหน้า คำอธิบายหน้า และเนื้อหาแนะนำ)');

  // ผูกหน้าอำเภอเข้ากับหน้าจังหวัดของตัวเอง (ถ้าจังหวัดนั้นเผยแพร่หน้าไว้ด้วย)
  const provPath = {};
  areas.filter((a) => !a.amphoe).forEach((a) => { provPath[a.province] = a.path; });
  areas.forEach((a) => { a.parentPath = a.amphoe ? (provPath[a.province] || '') : ''; });

  const itemsOf = (a) => sortItems(listings.filter((l) => inArea(l, a)));
  const countOf = (a) => itemsOf(a).length;

  if (!DRY) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.mkdirSync(MAP_DIR, { recursive: true });
  }

  const want = new Set();
  let wrote = 0, same = 0;
  for (const a of areas) {
    const items = itemsOf(a);
    const kids = areas.filter((k) => k.amphoe && k.province === a.province && !a.amphoe)
      .map((k) => Object.assign({}, k, { count: countOf(k) }))
      .sort((x, y) => String(x.amphoe).localeCompare(String(y.amphoe), 'th'));
    const inner = bodyHtml(a, items, kids, META, VOCAB);

    const crumbs = [{ name: 'หน้าแรก', url: SITE + '/' }, { name: 'ที่ดินตามจังหวัดและอำเภอ', url: INDEX_URL }];
    if (a.amphoe && a.parentPath) crumbs.push({ name: a.province, url: encodeURI(SITE + '/' + a.parentPath) });
    crumbs.push({ name: areaLabel(a), url: encodeURI(areaUrl(a)) });
    const graph = graphFor(tplGraph, {
      url: encodeURI(areaUrl(a)), name: areaHeading(a), desc: a.description, crumbs: crumbs,
      items: items.slice(0, MAX_ITEMS).map((l) => ({
        name: META.shortLabel(l, VOCAB), url: encodeURI(SITE + '/' + META.pagePath(l, VOCAB))
      }))
    });

    const rel = a.path + 'index.html';
    want.add(rel);
    const full = path.join(ROOT, rel);
    const html = render(tpl, a, inner, graph);
    const old = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (old === html) same++;
    else { wrote++; if (!DRY) { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, html); } }
  }

  // ---------- หน้าที่ถูกปิดสวิตช์หรือเก็บเข้าคลังแล้ว ----------
  // ⚠️ ลบทิ้ง ไม่ใช่ปล่อยค้าง — แอดมินกดปิดเผยแพร่คือการสั่งให้หน้านั้นหายจากเว็บ
  let removed = 0;
  for (const file of walkIndexes(OUT_DIR, [])) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (want.has(rel)) continue;
    removed++;
    if (!DRY) { fs.unlinkSync(file); pruneEmpty(path.dirname(file)); }
  }

  // ---------- หน้าดัชนี ----------
  const idxInner = indexHtml(areas, countOf, META);
  let idx = replaceBody(tpl, idxInner);
  // ดัชนีที่ยังไม่มีพื้นที่ไหนเลย = หน้าบาง ไม่ควรให้เก็บเข้าดัชนี (build/sitemap.js ข้ามหน้า noindex ให้เอง)
  idx = idx.replace(/(<!-- nj-loc:start[\s\S]*?-->)[\s\S]*?(<!-- nj-loc:end -->)/,
    '$1' + (areas.length ? '' : '\n  <meta name="robots" content="noindex, follow">\n  ') + '$2');
  const idxChanged = idx !== tpl;
  if (!DRY && idxChanged) fs.writeFileSync(TPL_FILE, idx);

  // ---------- แผนผัง + robots.txt ----------
  let mapMsg = 'ไม่มีหน้าพื้นที่ — ไม่สร้างแผนผัง';
  if (areas.length) {
    const xml = xmlFor(areas);
    const old = fs.existsSync(MAP_FILE) ? fs.readFileSync(MAP_FILE, 'utf8') : null;
    if (!DRY && old !== xml) fs.writeFileSync(MAP_FILE, xml);
    mapMsg = 'sitemaps/locations.xml (' + areas.length + ' URL)';
  } else if (fs.existsSync(MAP_FILE)) {
    if (!DRY) fs.unlinkSync(MAP_FILE);
    mapMsg = 'ลบ sitemaps/locations.xml ทิ้ง (ไม่มีหน้าพื้นที่แล้ว)';
  }
  const rTxt = fs.readFileSync(ROBOTS_FILE, 'utf8');
  const rNew = robotsWith(rTxt, areas.length > 0);
  if (!DRY && rNew !== rTxt) fs.writeFileSync(ROBOTS_FILE, rNew);

  console.log((DRY ? '[ลองดูเฉยๆ] ' : '') +
    'หน้าพื้นที่ ' + areas.length + ' หน้า — เขียนใหม่ ' + wrote + ' · เหมือนเดิม ' + same + ' · ลบ ' + removed);
  console.log('ดัชนี locations.html: ' + (idxChanged ? 'อัปเดต' : 'เหมือนเดิม') + ' · ' + mapMsg +
    ' · robots.txt: ' + (rNew !== rTxt ? 'อัปเดตบรรทัด Sitemap' : 'เหมือนเดิม'));
  if (DRY) console.log('\n(ไม่ได้เขียนอะไรลงดิสก์)');
}

module.exports = {
  replaceBody,
  areaPathOk, areaHeading, areaLabel, inArea, sortItems,
  bodyHtml, indexHtml, graphFor, xmlFor, robotsWith, render, MAX_ITEMS, SITE
};

if (require.main === module) main();
