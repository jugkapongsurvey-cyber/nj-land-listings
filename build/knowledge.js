'use strict';
// ---------- สร้างหน้าบทความความรู้จากฐานความรู้ของระบบหลังบ้าน ----------
//
// รัน:  node build/knowledge.js            (ดึงข้อมูลจริงแล้วเขียนไฟล์)
//       node build/knowledge.js --dry-run  (บอกว่าจะเขียน/ลบอะไร แต่ไม่แตะไฟล์)
//       node build/knowledge.js --api http://127.0.0.1:8793   (ชี้ไปเซิร์ฟเวอร์ทดสอบ)
//
// ทำงานอัตโนมัติด้วย .github/workflows/knowledge.yml (ทุก 30 นาที)
// ต้นทางคือ GET /api/public/kb/articles ของ nj-survey-system (Phase 10 สปรินต์ 4 รอบ ก)
//
// ⚠️ ลำดับทั้งชุด: pages.js → properties.js → locations.js → journal.js → **knowledge.js** → schema.js → sitemap.js
//
// ⚠️⚠️ แปดข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **สร้างเฉพาะบทความที่ API ส่งมา** — API ส่งเฉพาะบทความที่มีคนกดขึ้นเว็บ ผ่านการตรวจ ระดับการเข้าถึง
//    "ทุกคน" และถึงวันตั้งเวลาแล้ว · **ห้ามสร้างหน้าจากที่อื่น** (ไม่มีบทความตัวอย่าง ไม่มีหน้าหมวดเปล่า)
//    บทความที่ถูกปลดออกจากเว็บจะหายจากรายการ แล้วรอบนี้ลบหน้าของมันทิ้ง
// 2. **ดึงข้อมูลไม่สำเร็จ = ไม่แตะไฟล์เดิมแม้แต่ไฟล์เดียว** แล้วออกด้วยรหัสไม่ศูนย์ (กติกาเดียวกับ journal.js ข้อ 2)
//    ⚠️ **สวิตช์ kb_web ปิด (API ตอบ 404) = ไม่แตะไฟล์เช่นกัน แต่ออกด้วยรหัสศูนย์** (Action ไม่แดงทุก 30 นาที)
//    ผลคือ ปิดสวิตช์แล้วหน้าที่สร้างไว้ยังค้างอยู่ — **จะเอาบทความลงจากเว็บ ให้กดปลดทีละบทความ ไม่ใช่ปิดสวิตช์**
//    (ไม่ตีความ 404 ว่า "ไม่มีบทความ" เพราะเส้นทางเปลี่ยนชื่อเมื่อไหร่ หน้าทั้งหมดจะถูกลบเงียบๆ)
// 3. **หมวดและสลักคือชื่อโฟลเดอร์ที่ไฟล์นี้เขียน** — ตรวจรูปแบบซ้ำที่นี่เสมอแม้ระบบหลังบ้านตรวจแล้ว
//    (ตัวอักษรไทย/อังกฤษ ตัวเลข ขีดกลาง · ไม่มีจุด ไม่มีทับ) และหมวดต้องมีอยู่ในทะเบียนที่ API ส่งมา
// 4. **เนื้อบทความเป็นข้อความ ไม่ใช่ HTML** — escape ทุกตัวอักษรแล้วค่อยแปลง "## " เป็น h2 · "### " เป็น h3 ·
//    "- " เป็นรายการ · บรรทัดว่างแบ่งย่อหน้า · **ห้ามเปลี่ยนเป็นวาง HTML ดิบ** (ทีมพิมพ์ในกล่องข้อความธรรมดา)
//    ⚠️ id ของหัวข้อ h2 ต้องตรงกับสารบัญที่ API ส่งมา (h1, h2, … นับเฉพาะบรรทัด "## ") — นับคนละแบบ = ลิงก์สารบัญพัง
// 5. **ข้อความกำกับท้ายบทความห้ามถอด** — บทความเป็นข้อมูลทั่วไป ไม่ใช่ความเห็นทางกฎหมายสำหรับกรณีเฉพาะ
//    และไม่ใช่การรับรองกรรมสิทธิ์ (กติกาเดิมของทั้งสอง repo)
// 6. **ลิงก์ภายในไม่ใส่เกินจำเป็น** (ข้อกำหนดงานที่ 9: ห้ามสร้างลิงก์จำนวนมากแบบสแปม)
//    บทความที่เกี่ยวข้องใช้รายการที่ทีมเลือกเองก่อน · เติมจากหมวดเดียวกันได้รวมไม่เกิน RELATED_MAX
//    แปลงที่เกี่ยวข้องใส่ได้เฉพาะแปลงที่ยังขึ้นเว็บอยู่จริง · แปลงที่ถูกถอดแล้วหายเองโดยไม่เหลือลิงก์เสีย
// 7. **ผลลัพธ์ต้องเหมือนเดิมทุกไบต์เมื่อข้อมูลไม่เปลี่ยน** — ห้ามใส่เวลาปัจจุบันลงไฟล์ใดๆ
// 8. **เขียนเฉพาะ** กล่อง nj-kbbody + กล่อง nj-kbidx ของ knowledge.html · knowledge/** · sitemaps/knowledge.xml ·
//    และบรรทัด Sitemap ใน robots.txt · ไม่แตะหัวไฟล์อื่นของ knowledge.html (schema.js/sitemap.js อ่านอยู่)
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TPL_FILE = path.join(ROOT, 'knowledge.html');
const OUT_DIR = path.join(ROOT, 'knowledge');
const MAP_FILE = path.join(ROOT, 'sitemaps', 'knowledge.xml');
const ROBOTS_FILE = path.join(ROOT, 'robots.txt');
const SITE = 'https://njteedinsure.com';
const INDEX_URL = SITE + '/knowledge.html';
const MAP_LINE = 'Sitemap: ' + SITE + '/sitemaps/knowledge.xml';
const MAP_NOTE = '#   sitemaps/knowledge.xml  = หน้าบทความความรู้ /knowledge/ (สร้างด้วย build/knowledge.js)';
const PUBLISHER = 'บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด';
const MARK = 'nj-kbpage';
const RELATED_MAX = 4;
const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
// ต้องตรงกับ SLUG_RE ของ lib/kb.js ฝั่งระบบ (ไทย/อังกฤษ ตัวเลข ขีดกลาง · ไม่ขึ้นหรือลงท้ายด้วยขีด)
const SLUG_RE = /^[0-9A-Za-z฀-๿](?:[0-9A-Za-z฀-๿-]*[0-9A-Za-z฀-๿])?$/;
const DISCLAIM = 'บทความนี้เป็นข้อมูลทั่วไปเพื่อความรู้ ไม่ใช่ความเห็นทางกฎหมายสำหรับกรณีเฉพาะ ' +
  'และไม่ใช่การรับรองกรรมสิทธิ์ของแปลงใด — ก่อนตัดสินใจซื้อขายหรือยื่นเรื่อง ควรตรวจเอกสารจริงและสอบถามผู้เชี่ยวชาญ';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function slugOk(s) { return typeof s === 'string' && s.length >= 2 && s.length <= 120 && SLUG_RE.test(s); }
function httpsUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try { const u = new URL(s); return u.protocol === 'https:' ? u.href : ''; } catch (e) { return ''; }
}
function webUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : ''; } catch (e) { return ''; }
}
const catPath = (cat) => 'knowledge/' + cat + '/';
const artPath = (a) => 'knowledge/' + a.category + '/' + a.slug + '/';
const hrefOf = (rel) => '/' + encodeURI(rel);
const urlOf = (rel) => SITE + '/' + encodeURI(rel);

// วันที่ไทยจากเวลา ISO (บวก 7 ชม. — ไทยไม่มี DST) หรือวันที่ล้วน · ผิดรูปแบบ = ค่าว่าง (ห้ามเดา)
function dayOf(v) {
  const s = String(v || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return '';
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return '';
  return new Date(t + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
function thaiDate(v) {
  const d = dayOf(v);
  if (!d) return '';
  const m = d.split('-');
  return Number(m[2]) + ' ' + MON[Number(m[1]) - 1] + ' ' + (Number(m[0]) + 543);
}

// ---------- เนื้อบทความ: ข้อความธรรมดา → HTML (ข้อ 4) ----------
function bodyHtml(text) {
  const out = [];
  let para = [];
  let list = [];
  let h2n = 0;
  const flushP = () => { if (para.length) { out.push('<p>' + para.map(esc).join('<br>') + '</p>'); para = []; } };
  const flushL = () => { if (list.length) { out.push('<ul>' + list.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>'); list = []; } };
  String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n').forEach((raw) => {
    const line = raw.replace(/\s+$/, '');
    let m;
    if ((m = /^###\s+(.+)$/.exec(line))) { flushP(); flushL(); out.push('<h3>' + esc(m[1].trim()) + '</h3>'); return; }
    // ⚠️ นิพจน์เดียวกับ toc() ของ lib/kb.js — id ต้องนับตรงกัน
    if ((m = /^##\s+(.+?)\s*$/.exec(line))) { flushP(); flushL(); h2n++; out.push('<h2 id="h' + h2n + '">' + esc(m[1].slice(0, 200)) + '</h2>'); return; }
    if ((m = /^\s*[-•*]\s+(.+)$/.exec(line))) { flushP(); list.push(m[1].trim()); return; }
    if (!line.trim()) { flushP(); flushL(); return; }
    flushL();
    para.push(line.trim());
  });
  flushP(); flushL();
  return out.join('\n');
}

function catName(cats, key) { const c = cats.find((x) => x.key === key); return c ? c.th : key; }

// ---------- คัดข้อมูลที่ใช้ได้ (ข้อ 1 และ 3) ----------
function clean(raw) {
  const cats = (Array.isArray(raw && raw.categories) ? raw.categories : [])
    .filter((c) => c && slugOk(c.key) && c.th)
    .map((c, i) => ({ key: c.key, th: String(c.th), order: Number.isFinite(Number(c.order)) ? Number(c.order) : i }))
    .sort((a, b) => a.order - b.order);
  const keys = new Set(cats.map((c) => c.key));
  const seen = new Set();
  const skipped = [];
  const articles = (Array.isArray(raw && raw.articles) ? raw.articles : []).filter((a) => {
    const why = !a ? 'ว่าง' : !slugOk(a.slug) ? 'สลักไม่ใช่รูปแบบที่ใช้ได้' : !keys.has(a.category) ? 'หมวดไม่มีในทะเบียน'
      : !a.title ? 'ไม่มีชื่อบทความ' : seen.has(a.category + '/' + a.slug) ? 'ที่อยู่ซ้ำกับบทความอื่น' : '';
    if (why) { skipped.push({ id: a && a.id, why }); return false; }
    seen.add(a.category + '/' + a.slug);
    return true;
  }).sort((x, y) => String(y.publishedAt || '').localeCompare(String(x.publishedAt || '')) || String(x.id).localeCompare(String(y.id)));
  return { cats, articles, skipped };
}

// ---------- บทความที่เกี่ยวข้อง (ข้อ 6) ----------
function relatedFor(a, articles) {
  const byId = new Map(articles.map((x) => [x.id, x]));
  const pick = [];
  ((a.related && a.related.articles) || []).forEach((id) => {
    const x = byId.get(id);
    if (x && x !== a && pick.indexOf(x) < 0 && pick.length < RELATED_MAX) pick.push(x);
  });
  articles.forEach((x) => {
    if (pick.length >= RELATED_MAX) return;
    if (x !== a && x.category === a.category && pick.indexOf(x) < 0) pick.push(x);
  });
  return pick;
}

// ---------- ชิ้นส่วนหน้า ----------
function cardHtml(a, cats, tag) {
  const h = tag || 'h2';
  const d = thaiDate(a.publishedAt);
  return '<li class="kb-card"><span class="kb-tag">' + esc(catName(cats, a.category)) + '</span>' +
    '<' + h + ' class="kb-title"><a href="' + hrefOf(artPath(a)) + '">' + esc(a.title) + '</a></' + h + '>' +
    (a.excerpt ? '<p class="kb-excerpt">' + esc(a.excerpt) + '</p>' : '') +
    (d ? '<span class="kb-date">เผยแพร่ ' + esc(d) + '</span>' : '') + '</li>';
}
const INDEX_HEAD = '<section class="kb-head"><div class="shell">\n' +
  '        <h1>ความรู้ที่ดิน</h1>\n' +
  '        <p>บทความเรื่องที่ดิน 7 หมวด เขียนและตรวจโดยทีมสำนักงานช่างรังวัดเอกชน ใบอนุญาต 351 ทุกบทความระบุผู้เขียน ผู้ตรวจ และแหล่งอ้างอิง</p>\n' +
  '      </div></section>';

function indexBody(cats, articles) {
  const count = (k) => articles.filter((a) => a.category === k).length;
  const out = [INDEX_HEAD, '<section class="shell kb-wrap">'];
  // ทะเบียนหมวดยังว่าง (ระบบหลังบ้านยังไม่ได้เติม 7 เสา) = ไม่มีหัวข้อหมวด ไม่ใช่รายการเปล่า
  if (cats.length) out.push('<h2 class="kb-h2">หมวดบทความ</h2>');
  if (cats.length) out.push('<ul class="kb-cats">' + cats.map((c) => {
    const n = count(c.key);
    // ⚠️ หมวดที่ยังไม่มีบทความไม่มีหน้า — ห้ามทำเป็นลิงก์ (ลิงก์เสีย/หน้าเปล่า)
    return '<li class="kb-cat">' + (n
      ? '<a class="kb-cat-name" href="' + hrefOf(catPath(c.key)) + '">' + esc(c.th) + '</a><span class="kb-n">' + n + ' บทความ</span>'
      : '<b>' + esc(c.th) + '</b><span class="kb-n">ยังไม่มีบทความ</span>') + '</li>';
  }).join('') + '</ul>');
  out.push('<h2 class="kb-h2">บทความล่าสุด</h2>');
  if (!articles.length) {
    out.push('<p class="kb-empty">ยังไม่มีบทความที่เผยแพร่ — ระหว่างนี้อ่าน <a href="/guides.html">คู่มือที่ดิน</a> หรือ <a href="/journal.html">วารสารที่ดินชัวร์</a></p>');
  } else {
    out.push('<ul class="kb-grid">' + articles.slice(0, 12).map((a) => cardHtml(a, cats, 'h3')).join('') + '</ul>');
  }
  out.push('</section>');
  return out.join('\n      ');
}

function categoryBody(cat, cats, list) {
  const out = ['<section class="kb-head"><div class="shell">'];
  out.push('<p class="kb-crumb"><a href="/">หน้าแรก</a> › <a href="/knowledge.html">ความรู้ที่ดิน</a> › ' + esc(cat.th) + '</p>');
  out.push('<h1>' + esc(cat.th) + '</h1>');
  out.push('<p>' + list.length + ' บทความในหมวดนี้ เขียนและตรวจโดยทีมสำนักงานช่างรังวัดเอกชน</p>');
  out.push('</div></section>');
  out.push('<section class="shell kb-wrap">');
  out.push('<ul class="kb-grid">' + list.map((a) => cardHtml(a, cats)).join('') + '</ul>');
  out.push('<p class="kb-note"><a href="/knowledge.html">ดูหมวดอื่น</a></p>');
  out.push('</section>');
  return out.join('\n      ');
}

function person(label, p) {
  if (!p || !p.name) return '';
  return label + ' <b>' + esc(p.name) + '</b>' + (p.credential ? ' (' + esc(p.credential) + ')' : '');
}

function articleBody(a, cats, related, listingLinks) {
  const cat = catName(cats, a.category);
  const out = ['<section class="kb-head"><div class="shell">'];
  out.push('<p class="kb-crumb"><a href="/">หน้าแรก</a> › <a href="/knowledge.html">ความรู้ที่ดิน</a> › ' +
    '<a href="' + hrefOf(catPath(a.category)) + '">' + esc(cat) + '</a></p>');
  out.push('<h1>' + esc(a.title) + '</h1>');
  const meta = [person('เขียนโดย', a.author), person('ตรวจโดย', a.reviewer)].filter(Boolean);
  const pub = thaiDate(a.publishedAt);
  const rev = thaiDate(a.reviewedAt);
  if (pub) meta.push('เผยแพร่ ' + esc(pub));
  if (rev) meta.push('ตรวจทานล่าสุด ' + esc(rev));
  if (a.version) meta.push('ฉบับที่ ' + esc(a.version));
  if (meta.length) out.push('<p class="kb-meta">' + meta.join(' · ') + '</p>');
  out.push('</div></section>');

  out.push('<section class="shell kb-wrap"><article class="kb-article">');
  if (a.excerpt) out.push('<p class="kb-lead">' + esc(a.excerpt) + '</p>');
  const cover = httpsUrl(a.cover && a.cover.url);
  if (cover && a.cover.alt) {
    out.push('<figure class="kb-cover"><img src="' + esc(cover) + '" alt="' + esc(a.cover.alt) + '" loading="lazy" decoding="async"></figure>');
  }
  const toc = Array.isArray(a.toc) ? a.toc.filter((t) => t && /^h\d+$/.test(t.id) && t.text) : [];
  if (toc.length >= 2) {
    out.push('<nav class="kb-toc" aria-label="สารบัญ"><b>สารบัญ</b><ol>' +
      toc.map((t) => '<li><a href="#' + t.id + '">' + esc(t.text) + '</a></li>').join('') + '</ol></nav>');
  }
  out.push('<div class="kb-body">' + bodyHtml(a.body) + '</div>');

  const faq = (a.faq || []).filter((f) => f && f.q && f.a);
  if (faq.length) {
    out.push('<h2 class="kb-h2">คำถามที่พบบ่อย</h2>');
    out.push('<dl class="kb-faq">' + faq.map((f) => '<dt>' + esc(f.q) + '</dt><dd>' + esc(f.a) + '</dd>').join('') + '</dl>');
  }
  const src = (a.sources || []).filter((x) => x && x.label);
  if (src.length) {
    out.push('<h2 class="kb-h2">แหล่งอ้างอิง</h2>');
    out.push('<ol class="kb-src">' + src.map((x) => {
      const u = webUrl(x.url);
      const d = thaiDate(x.date);
      return '<li>' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(x.label) + '</a>' : esc(x.label)) +
        (d ? ' (' + esc(d) + ')' : '') + '</li>';
    }).join('') + '</ol>');
  }
  const links = (a.links || []).map((l) => ({ label: l && l.label, url: webUrl(l && l.url) })).filter((l) => l.label && l.url);
  if (links.length) {
    out.push('<h2 class="kb-h2">ลิงก์ที่เกี่ยวข้อง</h2>');
    out.push('<ul class="kb-links">' + links.map((l) => '<li><a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + '</a></li>').join('') + '</ul>');
  }
  if (listingLinks.length) {
    out.push('<h2 class="kb-h2">แปลงที่เกี่ยวข้อง</h2>');
    out.push('<ul class="kb-links">' + listingLinks.map((l) => '<li><a href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>').join('') + '</ul>');
    out.push('<p class="kb-note">ราคาและรายละเอียดของแปลงดูที่หน้าแปลงนั้นๆ ซึ่งเป็นข้อมูลปัจจุบัน</p>');
  }
  // ⚠️ ข้อ 5 — ห้ามถอด
  out.push('<p class="kb-disclaim">' + esc(DISCLAIM) + '</p>');
  out.push('<div class="kb-cta"><a class="kb-btn" href="/verify.html">ส่งทรัพย์ให้ทีมตรวจก่อนซื้อ</a>' +
    '<a class="kb-btn kb-btn-alt" href="/services.html">ดูบริการของเรา</a></div>');
  out.push('</article>');
  if (related.length) {
    out.push('<h2 class="kb-h2">บทความที่เกี่ยวข้อง</h2>');
    out.push('<ul class="kb-grid">' + related.map((x) => cardHtml(x, cats, 'h3')).join('') + '</ul>');
  }
  out.push('</section>');
  return out.join('\n      ');
}

// ---------- JSON-LD ----------
const ORG = {
  '@type': 'Organization', name: PUBLISHER, url: SITE + '/',
  logo: { '@type': 'ImageObject', url: SITE + '/brand/logo-mark-512.png' }
};
function crumbList(url, items) {
  return {
    '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url }))
  };
}
function articleGraph(a, cats) {
  const url = urlOf(artPath(a));
  const art = {
    '@type': 'Article', '@id': url + '#article', headline: String(a.title).slice(0, 110),
    description: a.excerpt || '', mainEntityOfPage: url, inLanguage: 'th-TH',
    articleSection: catName(cats, a.category), publisher: ORG,
    author: (a.author && a.author.name)
      ? Object.assign({ '@type': 'Person', name: a.author.name }, a.author.credential ? { description: a.author.credential } : {})
      : ORG
  };
  const img = httpsUrl(a.cover && a.cover.url);
  art.image = [img || (SITE + '/brand/og-image.png')];
  if (dayOf(a.publishedAt)) art.datePublished = dayOf(a.publishedAt);
  if (dayOf(a.reviewedAt)) art.dateModified = dayOf(a.reviewedAt);
  if (a.tags && a.tags.length) art.keywords = a.tags.join(', ');
  const graph = [art, crumbList(url, [
    { name: 'หน้าแรก', url: SITE + '/' }, { name: 'ความรู้ที่ดิน', url: INDEX_URL },
    { name: catName(cats, a.category), url: urlOf(catPath(a.category)) }, { name: a.title, url: url }
  ])];
  const faq = (a.faq || []).filter((f) => f && f.q && f.a);
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage', '@id': url + '#faq',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
function categoryGraph(cat, list) {
  const url = urlOf(catPath(cat.key));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': url + '#webpage', url: url, name: cat.th, inLanguage: 'th-TH', publisher: ORG },
      crumbList(url, [{ name: 'หน้าแรก', url: SITE + '/' }, { name: 'ความรู้ที่ดิน', url: INDEX_URL }, { name: cat.th, url: url }]),
      {
        '@type': 'ItemList', '@id': url + '#items', numberOfItems: list.length,
        itemListElement: list.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: urlOf(artPath(a)) }))
      }
    ]
  };
}

// ---------- ประกอบหน้าจากต้นแบบ ----------
const BODY_RE = /(<!-- nj-kbbody:start -->)[\s\S]*?(<!-- nj-kbbody:end -->)/;
const IDX_RE = /(<!-- nj-kbidx:start[^>]*-->)[\s\S]*?(<!-- nj-kbidx:end -->)/;
function replaceBody(html, inner) {
  if (!BODY_RE.test(html)) throw new Error('ไม่เจอเครื่องหมาย nj-kbbody ในต้นแบบ knowledge.html');
  return html.replace(BODY_RE, (m, open, close) => open + '\n      ' + inner + '\n  ' + close);
}
// สถานะเก็บดัชนีของหน้ารวม — ไม่มีบทความเลย = หน้าบาง ไม่ให้เก็บดัชนี (sitemap.js ข้ามหน้า noindex ให้เอง)
function indexFlag(html, hasArticles) {
  if (!IDX_RE.test(html)) throw new Error('ไม่เจอเครื่องหมาย nj-kbidx ในต้นแบบ knowledge.html');
  return html.replace(IDX_RE, (m, open, close) => open + (hasArticles ? '\n  ' : '\n  <meta name="robots" content="noindex, follow">\n  ') + close);
}
function setMeta(s, attr, key, val) {
  const re = new RegExp('<meta ' + attr + '="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '" content="[^"]*">');
  const tag = '<meta ' + attr + '="' + key + '" content="' + esc(val) + '">';
  return re.test(s) ? s.replace(re, tag) : s.replace('</head>', '  ' + tag + '\n</head>');
}
function absolutize(s) {
  return s.replace(/(\s(?:href|src)=")(?!https?:|\/\/|#|mailto:|tel:|data:|\/)([^"]+)(")/g, (m, p1, p2, p3) => p1 + '/' + p2 + p3);
}
function renderPage(tpl, page) {
  let s = absolutize(tpl);
  s = s.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(page.title) + '</title>');
  s = s.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(page.desc) + '">');
  s = s.replace(/<link rel="canonical"[^>]*>/, '<link rel="canonical" href="' + esc(page.url) + '">');
  s = setMeta(s, 'property', 'og:type', page.ogType || 'website');
  s = setMeta(s, 'property', 'og:title', page.ogTitle || page.title);
  s = setMeta(s, 'property', 'og:description', page.desc);
  s = setMeta(s, 'property', 'og:url', page.url);
  s = setMeta(s, 'property', 'og:image', page.image || (SITE + '/brand/og-image.png'));
  if (page.published) s = setMeta(s, 'property', 'article:published_time', page.published);
  // หน้าย่อยที่สร้างแล้วเก็บดัชนีได้เสมอ (มีเนื้อหาจริง) — ถอดกล่องสถานะของหน้ารวมออก
  s = s.replace(IDX_RE, '$1$2');
  const ld = '<!-- nj-schema:start — สร้างด้วย build/knowledge.js · ห้ามแก้ด้วยมือ -->\n' +
    '  <script type="application/ld+json" data-nj-schema>\n' + JSON.stringify(page.graph, null, 2) +
    '\n  </script>\n  <!-- nj-schema:end -->';
  if (/<!-- nj-schema:start[\s\S]*?<!-- nj-schema:end -->/.test(s)) s = s.replace(/<!-- nj-schema:start[\s\S]*?<!-- nj-schema:end -->/, ld);
  else s = s.replace('</head>', '  ' + ld + '\n</head>');
  // ตัวบอกว่าไฟล์นี้ตัวสร้างเป็นคนเขียน — ใช้ตอนลบหน้าที่ไม่มีแล้ว (ไฟล์ที่คนวางเองไม่ถูกแตะ)
  s = s.replace('</head>', '  <!-- ' + MARK + ' — สร้างด้วย build/knowledge.js · ห้ามแก้ด้วยมือ -->\n</head>');
  return replaceBody(s, page.body);
}

const REDIRECT_HTML = ['<!doctype html>', '<html lang="th">', '<head>', '  <meta charset="utf-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1">',
  '  <title>ความรู้ที่ดิน | ที่ดินชัวร์</title>',
  '  <link rel="canonical" href="' + INDEX_URL + '">',
  '  <meta http-equiv="refresh" content="0; url=/knowledge.html">',
  '  <meta name="robots" content="follow">',
  '  <!-- ' + MARK + ' — หน้าพาไป สร้างด้วย build/knowledge.js · ห้ามแก้ด้วยมือ -->',
  '</head>', '<body>', '  <p>กำลังพาไปหน้ารวมบทความความรู้…</p>',
  '  <p><a href="/knowledge.html">ความรู้ที่ดิน</a></p>',
  '  <script>location.replace("/knowledge.html");</script>', '</body>', '</html>', ''].join('\n');

function sitemapXml(cats, articles) {
  const rows = [];
  cats.forEach((c) => {
    const list = articles.filter((a) => a.category === c.key);
    if (!list.length) return;
    const last = list.map((a) => dayOf(a.reviewedAt) || dayOf(a.publishedAt)).filter(Boolean).sort().pop() || '';
    rows.push({ loc: urlOf(catPath(c.key)), lastmod: last });
  });
  articles.forEach((a) => rows.push({ loc: urlOf(artPath(a)), lastmod: dayOf(a.reviewedAt) || dayOf(a.publishedAt) }));
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    .concat(rows.map((r) => '  <url>\n    <loc>' + esc(r.loc) + '</loc>\n' + (r.lastmod ? '    <lastmod>' + r.lastmod + '</lastmod>\n' : '') + '  </url>'))
    .concat(['</urlset>', '']).join('\n');
}
// ⚠️ บรรทัด Sitemap มีเฉพาะเมื่อมีบทความจริง — ชี้ไฟล์ที่ไม่มี = Search Console ขึ้นว่าอ่านแผนผังไม่ได้
function robotsWith(txt, on) {
  const nl = String(txt).indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  const lines = String(txt).split(/\r?\n/).filter((l) => l.trim() !== MAP_LINE && l.trim() !== MAP_NOTE.trim());
  if (!on) return lines.join(nl);
  const noteAt = lines.map((l) => l.indexOf('# ') === 0 && l.indexOf('sitemaps/') >= 0).lastIndexOf(true);
  if (noteAt >= 0) lines.splice(noteAt + 1, 0, MAP_NOTE);
  const mapAt = lines.map((l) => /^Sitemap:/.test(l)).lastIndexOf(true);
  if (mapAt >= 0) lines.splice(mapAt + 1, 0, MAP_LINE);
  else lines.push(MAP_LINE);
  return lines.join(nl);
}

// ---------- วางแผนไฟล์ทั้งหมด (ตรรกะล้วน · ไม่แตะดิสก์) ----------
// listings = ผลของ /api/public/listings (ใช้เฉพาะแปลงที่บทความอ้างถึง) · META/VOCAB = landmeta/landvocab
function plan(tpl, raw, opts) {
  const o = opts || {};
  const { cats, articles, skipped } = clean(raw);
  const NL = tpl.includes('\r\n') ? '\r\n' : '\n';
  const norm = (s) => s.replace(/\r?\n/g, NL);
  const files = new Map();
  const listingById = new Map((o.listings || []).map((l) => [String(l.id), l]));

  files.set('knowledge.html', norm(indexFlag(replaceBody(tpl, indexBody(cats, articles)), articles.length > 0)));
  files.set('knowledge/index.html', norm(REDIRECT_HTML));

  cats.forEach((c) => {
    const list = articles.filter((a) => a.category === c.key);
    if (!list.length) return;
    files.set(catPath(c.key) + 'index.html', norm(renderPage(tpl, {
      title: c.th + ' — ความรู้ที่ดิน | ที่ดินชัวร์',
      desc: 'บทความหมวด' + c.th + ' ' + list.length + ' บทความ เขียนและตรวจโดยทีมสำนักงานช่างรังวัดเอกชน ใบอนุญาต 351',
      url: urlOf(catPath(c.key)), graph: categoryGraph(c, list), body: categoryBody(c, cats, list)
    })));
  });

  articles.forEach((a) => {
    const listingLinks = [];
    ((a.related && a.related.listings) || []).forEach((id) => {
      const l = listingById.get(String(id));
      if (!l || !o.META || listingLinks.length >= RELATED_MAX) return;
      listingLinks.push({ href: '/' + o.META.encUrl(o.META.pagePath(l, o.VOCAB)), label: o.META.shortLabel(l, o.VOCAB) + ' (รหัส ' + l.id + ')' });
    });
    const img = httpsUrl(a.cover && a.cover.url);
    files.set(artPath(a) + 'index.html', norm(renderPage(tpl, {
      title: a.title + ' | ความรู้ที่ดิน ที่ดินชัวร์',
      ogTitle: a.title,
      desc: a.excerpt || a.title,
      url: urlOf(artPath(a)), image: img, ogType: 'article',
      published: dayOf(a.publishedAt),
      graph: articleGraph(a, cats), body: articleBody(a, cats, relatedFor(a, articles), listingLinks)
    })));
  });

  if (articles.length) files.set('sitemaps/knowledge.xml', sitemapXml(cats, articles));
  return { files, cats, articles, skipped };
}

// ---------- ไฟล์ที่ตัวสร้างเคยเขียนแต่รอบนี้ไม่มีแล้ว ----------
function staleFiles(keep) {
  const out = [];
  (function walk(dir) {
    let items = [];
    try { items = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const it of items) {
      const full = path.join(dir, it.name);
      if (it.isDirectory()) walk(full);
      else if (it.name === 'index.html') {
        const rel = path.relative(ROOT, full).split(path.sep).join('/');
        if (keep.has(rel)) continue;
        let txt = '';
        try { txt = fs.readFileSync(full, 'utf8'); } catch (e) { continue; }
        if (txt.indexOf(MARK) >= 0) out.push(rel);
      }
    }
  })(OUT_DIR);
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
function loadVocab() {
  const vm = require('vm');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'landvocab.js'), 'utf8'), sandbox, { filename: 'landvocab.js' });
  return sandbox.window.NJVocab || {};
}

async function main() {
  const argv = process.argv.slice(2);
  const apiAt = argv.indexOf('--api');
  const API = apiAt >= 0 ? argv[apiAt + 1] : 'https://app.njteedinsure.com';
  const DRY = argv.indexOf('--dry-run') >= 0;

  let data;
  let listings = [];
  try {
    const r = await fetch(API + '/api/public/kb/articles', { headers: { Accept: 'application/json' } });
    if (r.status === 404) {
      // ⚠️ ข้อ 2 — สวิตช์ kb_web ปิด: ไม่แตะไฟล์ ไม่ถือว่าล้ม
      console.log('ℹ สวิตช์ kb_web ของระบบหลังบ้านยังปิดอยู่ (404) — ไม่แตะไฟล์ใดเลย');
      return;
    }
    if (!r.ok) throw new Error('GET /api/public/kb/articles ตอบ ' + r.status);
    data = await r.json();
    if (!data || !Array.isArray(data.articles) || !Array.isArray(data.categories)) throw new Error('รูปแบบคำตอบไม่ใช่ {categories, articles}');
    const needListings = data.articles.some((a) => a && a.related && Array.isArray(a.related.listings) && a.related.listings.length);
    if (needListings) {
      const r2 = await fetch(API + '/api/public/listings', { headers: { Accept: 'application/json' } });
      if (!r2.ok) throw new Error('GET /api/public/listings ตอบ ' + r2.status);
      const j = await r2.json();
      listings = Array.isArray(j.listings) ? j.listings : [];
    }
  } catch (e) {
    console.log('⛔ ดึงบทความจาก ' + API + ' ไม่สำเร็จ: ' + e.message + ' — ไม่แตะไฟล์ใดเลย');
    process.exit(1);
  }

  const tpl = fs.readFileSync(TPL_FILE, 'utf8');
  const out = plan(tpl, data, { listings, META: require(path.join(ROOT, 'landmeta.js')), VOCAB: loadVocab() });
  out.skipped.forEach((s) => console.log('⚠ ข้ามบทความ ' + (s.id || '(ไม่มีรหัส)') + ': ' + s.why));

  const keep = new Set(Array.from(out.files.keys()));
  const stale = staleFiles(keep);
  let changed = 0;
  for (const [rel, body] of out.files) {
    const full = path.join(ROOT, rel);
    let cur = null;
    try { cur = fs.readFileSync(full, 'utf8'); } catch (e) { cur = null; }
    if (cur === body) continue;
    changed++;
    console.log((cur == null ? '  + ' : '  ✎ ') + rel);
    if (!DRY) { fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, body); }
  }
  stale.forEach((rel) => {
    changed++;
    console.log('  − ' + rel);
    if (!DRY) { fs.unlinkSync(path.join(ROOT, rel)); pruneEmpty(path.dirname(path.join(ROOT, rel))); }
  });
  if (!out.articles.length && fs.existsSync(MAP_FILE)) {
    changed++;
    console.log('  − sitemaps/knowledge.xml');
    if (!DRY) fs.unlinkSync(MAP_FILE);
  }
  const rTxt = fs.readFileSync(ROBOTS_FILE, 'utf8');
  const rNew = robotsWith(rTxt, out.articles.length > 0);
  if (rNew !== rTxt) { changed++; console.log('  ✎ robots.txt'); if (!DRY) fs.writeFileSync(ROBOTS_FILE, rNew); }

  console.log('\nบทความ ' + out.articles.length + ' บทความ · หมวด ' + out.cats.length + ' หมวด · ' +
    (changed ? ((DRY ? 'จะเปลี่ยน ' : 'เปลี่ยน ') + changed + ' ไฟล์') : 'ไม่มีไฟล์เปลี่ยน'));
}

if (require.main === module) main();

module.exports = {
  slugOk, thaiDate, dayOf, bodyHtml, clean, relatedFor, plan, robotsWith, sitemapXml,
  indexFlag, replaceBody, DISCLAIM, RELATED_MAX, SITE, MARK
};
