'use strict';
// ---------- สร้างหน้าวารสารที่ดินชัวร์จาก GET /api/journal ----------
//
// รัน:  node build/journal.js            (ดึงข้อมูลจริงแล้วเขียนไฟล์)
//       node build/journal.js --dry-run  (บอกว่าจะเขียน/ลบอะไร แต่ไม่แตะไฟล์)
//       node build/journal.js --api http://127.0.0.1:8793   (ชี้ไปเซิร์ฟเวอร์ทดสอบ)
//
// ทำงานอัตโนมัติด้วย .github/workflows/journal.yml (ทุก 30 นาที) — ระบบ nj-weekly ยิง
// PUT /api/journal เข้าระบบหลังบ้าน แล้วรอบถัดไปของ Action สร้างหน้าให้เองและ commit เข้า main
//
// ⚠️ ลำดับทั้งชุด: pages.js → properties.js → locations.js → **journal.js** → schema.js → sitemap.js
//
// ⚠️⚠️ เจ็ดข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **สร้างเฉพาะฉบับที่ API ส่งมา (= status published)** — ระบบหลังบ้านไม่ส่งร่างออกทางสาธารณะเลย
//    ฉบับที่ถูกถอนกลับเป็นร่าง จะหายจากรายการ แล้วรอบนี้ลบหน้าของมันทิ้ง
// 2. **ดึงข้อมูลไม่สำเร็จ = ไม่แตะไฟล์เดิมแม้แต่ไฟล์เดียว** แล้วออกด้วยรหัสไม่ศูนย์
//    (กติกาเดียวกับ build/properties.js ข้อ 4 · ไม่งั้น API ล่มหนึ่งรอบ = หน้าวารสารหายทั้งหมด)
// 3. **slug ต้องเป็น a-z 0-9 ขีดกลางเท่านั้น** ตรวจซ้ำที่นี่แม้ระบบหลังบ้านตรวจแล้ว —
//    slug คือชื่อโฟลเดอร์ที่ไฟล์นี้เขียน รับ ../ เข้ามาเมื่อไหร่ = เขียนทับไฟล์นอก journal/
// 4. **HTML ของวารสารวางลงหน้าตรงๆ ไม่กรองซ้ำ** (ระบบหลังบ้านตัด <script>/on*= ให้แล้วตอนรับ)
//    แต่ **CSS ของวารสารต้องถูกขังไว้ใต้ .jr-article เสมอ** (scopeCss) — ตัววารสารมี body{} h1{} p{}
//    ของตัวเอง วางดิบๆ เมื่อไหร่ หัวเว็บ ฟุตเตอร์ และฟอนต์ของทั้งหน้าเปลี่ยนตาม
//    · ตัดฟอนต์ของวารสาร (Sarabun/Bai Jamjuree) มาใช้ฟอนต์กลางของเว็บ — เว็บนี้ใช้ตระกูลเดียว
//      (เจ้าของตัดสิน 20 ก.ย. 2569 · header.test.js ล็อกไว้) · ตัดโหมดมืดของวารสาร (เว็บไม่มีโหมดมืด)
// 5. **ผลลัพธ์ต้องเหมือนเดิมทุกไบต์เมื่อข้อมูลไม่เปลี่ยน** — Action commit เฉพาะเมื่อมีไฟล์เปลี่ยน
//    ห้ามใส่เวลาปัจจุบันลงไฟล์ใดๆ (lastBuildDate ของ RSS ใช้ updated_at ล่าสุดของฉบับ)
// 6. **ไม่แตะ <head> ของ journal.html** — แตะเฉพาะกล่อง nj-jrbody · schema.js/sitemap.js อ่านหัวไฟล์นั้น
//    ถ้าไฟล์นี้เปลี่ยนหัว ตัวตรวจ --check ของสองตัวนั้นจะแดงในรอบ CI ถัดไปของคนอื่น
// 7. **เขียนเฉพาะ** กล่อง nj-jrbody ของ journal.html · journal/** · sitemaps/journal.xml
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TPL_FILE = path.join(ROOT, 'journal.html');
const OUT_DIR = path.join(ROOT, 'journal');
const MAP_FILE = path.join(ROOT, 'sitemaps', 'journal.xml');
const SITE = 'https://njteedinsure.com';
const LIST_URL = SITE + '/journal.html';
const PER_PAGE = 12;
const PUBLISHER = 'บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด';
const CONTACT_URL = 'https://njandconsulting.com/contact/';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MARK = 'nj-jrbody:start';
const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function slugOk(s) { return typeof s === 'string' && s.length <= 120 && SLUG_RE.test(s); }
function httpsUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try { const u = new URL(s); return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : ''; } catch (e) { return ''; }
}
function pageUrl(slug) { return SITE + '/journal/' + slug + '/'; }

// "2026-09-28" → "28 ก.ย. 2569" · ผิดรูปแบบ = ค่าว่าง (ห้ามเดา)
function thaiDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return '';
  return Number(m[3]) + ' ' + MON[Number(m[2]) - 1] + ' ' + (Number(m[1]) + 543);
}
// วันที่ของ RSS (RFC 822) — วันเผยแพร่ถือเป็น 06:00 น. เวลาไทย (รอบของ nj-weekly)
function rfc822(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 6, 0, 0));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  return dow + ', ' + m[3] + ' ' + MON_EN[+m[2] - 1] + ' ' + m[1] + ' 06:00:00 +0700';
}
function byNewest(a, b) {
  return String(b.publish_date).localeCompare(String(a.publish_date)) || (Number(b.issue_no) - Number(a.issue_no));
}

// ---------- ขัง CSS ของวารสารไว้ใต้ scope ----------
//
// ตัวแยก CSS แบบง่ายที่พอสำหรับไฟล์ที่ build_journal.py ของ nj-weekly สร้าง
// (กฎธรรมดา + @media ซ้อนได้) — ไม่ใช่ตัวแยก CSS ทั่วไป
//   · :root / html / body → scope (ตัวแปรสีของวารสารจึงอยู่ใต้กล่องวารสารเท่านั้น)
//   · ตัวเลือกอื่น → "scope ตัวเลือก"
//   · ตัดทิ้ง: @import · @charset · @font-face · @media (prefers-color-scheme: dark) · ตัวเลือกที่มี [data-theme
//   · font-family ทุกค่า → var(--nj-font)
function scopeSelector(sel, scope) {
  const s = sel.trim();
  if (!s) return '';
  if (/\[data-theme/i.test(s)) return '';
  const m = /^(:root|html|body)((?::[\w-]+(?:\([^)]*\))?)*)(.*)$/i.exec(s);
  if (m) {
    // :root:not([data-theme="light"]) ฯลฯ — ตัวกรองโหมดสีของวารสาร ไม่มีความหมายในเว็บนี้
    const rest = m[3].trim();
    return rest ? (scope + ' ' + rest) : scope;
  }
  return scope + ' ' + s;
}
function splitSelectors(s) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
function fixDecls(decls) {
  return decls.replace(/font-family\s*:[^;}]*/gi, 'font-family:var(--nj-font)').trim();
}
// อ่านบล็อก {…} ที่เริ่มที่ตำแหน่ง i (ตัวอักษร '{') คืนตำแหน่งหลัง '}' ที่ปิดคู่กัน
function matchBrace(css, i) {
  let depth = 0;
  for (let j = i; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') { depth--; if (depth === 0) return j + 1; }
  }
  return css.length;
}
function scopeCss(css, scope) {
  const src = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  let i = 0;
  while (i < src.length) {
    const open = src.indexOf('{', i);
    const semi = src.indexOf(';', i);
    if (open < 0) break;
    // คำสั่ง @ แบบไม่มีบล็อก (@import · @charset) — ตัดทิ้งทั้งบรรทัด
    if (semi >= 0 && semi < open && /^\s*@/.test(src.slice(i, semi))) { i = semi + 1; continue; }
    const head = src.slice(i, open).trim();
    const close = matchBrace(src, open);
    const inner = src.slice(open + 1, close - 1);
    i = close;
    if (!head) continue;
    if (head[0] === '@') {
      const at = head.toLowerCase();
      if (/^@(font-face|import|charset|page)/.test(at)) continue;
      if (/^@media/.test(at)) {
        if (/prefers-color-scheme\s*:\s*dark/.test(at)) continue;
        const body = scopeCss(inner, scope);
        if (body) out.push(head + '{' + body + '}');
        continue;
      }
      if (/^@supports/.test(at)) {
        const body = scopeCss(inner, scope);
        if (body) out.push(head + '{' + body + '}');
        continue;
      }
      out.push(head + '{' + inner.trim() + '}');   // @keyframes ฯลฯ — เก็บตามเดิม
      continue;
    }
    const sels = splitSelectors(head).map((x) => scopeSelector(x, scope)).filter(Boolean);
    if (!sels.length) continue;
    out.push(sels.join(',') + '{' + fixDecls(inner) + '}');
  }
  return out.join('\n');
}

// ---------- แยก HTML ของวารสารเป็น CSS + เนื้อหา ----------
function splitArticle(html) {
  let s = String(html || '');
  const styles = [];
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (m, css) => { styles.push(css); return ''; });
  s = s.replace(/<!doctype[^>]*>/gi, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, '')
    .replace(/<(?:link|meta)\b[^>]*>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')   // ด่านที่สอง — ระบบหลังบ้านตัดให้แล้ว
    .trim();
  return { css: styles.join('\n'), body: s };
}

// ---------- ฝังคลิปไฮไลต์ ----------
// ฝังได้เฉพาะ YouTube (ผ่าน youtube-nocookie) · TikTok/Facebook ใช้ปุ่มลิงก์
// เพราะตัวฝังของสองเจ้านั้นโหลดสคริปต์และตั้งคุกกี้ของบุคคลที่สามทันที ซึ่งขัดกับแบนเนอร์คุกกี้ของเว็บ
function youtubeId(url) {
  let u;
  try { u = new URL(url); } catch (e) { return ''; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id = '';
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
    else { const m = /^\/(?:shorts|embed|live)\/([^/?#]+)/.exec(u.pathname); if (m) id = m[1]; }
  }
  return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : '';
}
function videoHtml(v) {
  const url = httpsUrl(v && v.highlight);
  if (!url) return '';
  const yt = youtubeId(url);
  if (yt) {
    return '<div class="jr-video"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(yt) + '" ' +
      'title="คลิปไฮไลต์ของฉบับนี้" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" ' +
      'allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
  }
  return '<a class="jr-video-link" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">▶ ดูคลิปไฮไลต์ของฉบับนี้</a>';
}

// ---------- การ์ดในหน้ารายการ ----------
function cardHtml(it) {
  const href = '/journal/' + it.slug + '/';
  const cover = httpsUrl(it.cover_url)
    ? '<img src="' + esc(it.cover_url) + '" alt="" loading="lazy" decoding="async" width="640" height="360">'
    : '<div class="jr-cover-blank">วารสารที่ดินชัวร์<small>ฉบับที่ ' + esc(it.issue_no) + '</small></div>';
  const d = thaiDate(it.publish_date);
  return '<li class="jr-card"><div class="jr-cover">' + cover + '</div><div class="jr-body">' +
    '<span class="jr-issue">ฉบับที่ ' + esc(it.issue_no) + '</span>' +
    '<h2 class="jr-title"><a href="' + href + '">' + esc(it.title) + '</a></h2>' +
    (it.excerpt ? '<p class="jr-excerpt">' + esc(it.excerpt) + '</p>' : '') +
    (d ? '<span class="jr-date">' + esc(d) + '</span>' : '') +
    '<a class="jr-read" href="' + href + '" aria-label="อ่านฉบับเต็ม ฉบับที่ ' + esc(it.issue_no) + '">อ่านฉบับเต็ม</a>' +
    '</div></li>';
}
function listPath(n) { return n <= 1 ? '/journal.html' : ('/journal/page/' + n + '/'); }
function pagerHtml(page, pages) {
  if (pages <= 1) return '';
  const out = ['<nav class="jr-pager" aria-label="เปลี่ยนหน้าวารสาร">'];
  if (page > 1) out.push('<a href="' + listPath(page - 1) + '" rel="prev">← ใหม่กว่า</a>');
  for (let n = 1; n <= pages; n++) {
    out.push(n === page ? '<span aria-current="page">' + n + '</span>' : '<a href="' + listPath(n) + '">' + n + '</a>');
  }
  if (page < pages) out.push('<a href="' + listPath(page + 1) + '" rel="next">เก่ากว่า →</a>');
  out.push('</nav>');
  return out.join('');
}
const LIST_HEAD = '<section class="jr-head"><div class="shell">\n' +
  '        <h1>วารสารที่ดินชัวร์</h1>\n' +
  '        <p>สรุปข่าวอสังหาริมทรัพย์และกฎหมายที่ดินที่นายหน้า ผู้ซื้อ และผู้ขายต้องรู้ทุกสัปดาห์ พร้อมกล่องกฎหมายและทิปจากช่างรังวัด</p>\n' +
  '      </div></section>';
function listBody(items, page, pages) {
  if (!items.length) {
    return LIST_HEAD + '\n      <section class="shell jr-wrap">\n' +
      '        <p class="jr-empty">ยังไม่มีวารสารที่เผยแพร่ — <a href="/listings.html">ดูประกาศที่ดินทั้งหมด</a></p>\n' +
      '      </section>';
  }
  const from = (page - 1) * PER_PAGE;
  const shown = items.slice(from, from + PER_PAGE);
  return LIST_HEAD + '\n      <section class="shell jr-wrap">\n' +
    '        <ul class="jr-grid">' + shown.map(cardHtml).join('') + '</ul>\n' +
    '        ' + pagerHtml(page, pages) + '\n' +
    '        <p class="jr-note">ติดตามทุกฉบับได้ทาง <a href="/journal/feed.xml">RSS</a></p>\n' +
    '      </section>';
}

// ---------- หน้าอ่านฉบับเต็ม ----------
function articleBody(it, prev) {
  const url = pageUrl(it.slug);
  const enc = encodeURIComponent(url);
  const parts = splitArticle(it.html);
  const css = scopeCss(parts.css, '.jr-article');
  // หัวข้อหลักของหน้ามาจากตัววารสารเอง — ไม่มี h1 ในวารสารเลยค่อยใส่ชื่อฉบับให้ (หน้าต้องมี h1 หนึ่งอัน)
  const needH1 = !/<h1[\s>]/i.test(parts.body);
  const d = thaiDate(it.publish_date);
  const out = [];
  out.push('<div class="jr-page">');
  out.push('<div class="jr-top">');
  out.push('<p class="jr-crumb"><a href="/">หน้าแรก</a> › <a href="/journal.html">วารสารที่ดินชัวร์</a> › ฉบับที่ ' + esc(it.issue_no) + '</p>');
  out.push('<p class="jr-meta">ฉบับที่ ' + esc(it.issue_no) + (d ? ' · เผยแพร่ ' + esc(d) : '') + '</p>');
  out.push(videoHtml(it.video));
  out.push('<div class="jr-share" aria-label="แชร์ฉบับนี้">' +
    '<a href="https://www.facebook.com/sharer/sharer.php?u=' + enc + '" target="_blank" rel="noopener noreferrer">แชร์ Facebook</a>' +
    '<a href="https://social-plugins.line.me/lineit/share?url=' + enc + '" target="_blank" rel="noopener noreferrer">แชร์ LINE</a>' +
    '<button type="button" data-jr-copy="' + esc(url) + '">คัดลอกลิงก์</button></div>');
  out.push('<p class="jr-share-msg" data-jr-copy-msg role="status" aria-live="polite"></p>');
  out.push('</div>');
  if (css) out.push('<style>\n' + css + '\n</style>');
  out.push('<article class="jr-article">' + (needH1 ? '<h1>' + esc(it.title) + '</h1>' : '') + parts.body + '</article>');
  out.push('<div class="jr-cta"><div class="jr-cta-row">' +
    '<a class="jr-btn jr-btn-main" href="/">ดูประกาศที่ดินชัวร์</a>' +
    '<a class="jr-btn jr-btn-amber" href="' + CONTACT_URL + '" target="_blank" rel="noopener">ขอใบเสนอราคารังวัด</a>' +
    '</div>' +
    (httpsUrl(it.wordpress_url)
      ? '<p class="jr-note"><a href="' + esc(it.wordpress_url) + '" target="_blank" rel="noopener">อ่านฉบับนี้บน njandconsulting.com</a></p>' : '') +
    '</div>');
  if (prev.length) {
    out.push('<section class="jr-prev" aria-labelledby="jr-prev-h"><h2 id="jr-prev-h">ฉบับก่อนหน้า</h2>' +
      '<ul class="jr-grid">' + prev.map(cardHtml).join('').replace(/<h2 class="jr-title">/g, '<h3 class="jr-title">').replace(/<\/a><\/h2>/g, '</a></h3>') +
      '</ul><p class="jr-note"><a href="/journal.html">ดูวารสารทั้งหมด</a></p></section>');
  }
  out.push('</div>');
  return out.filter(Boolean).join('\n      ');
}

function articleGraph(it) {
  const url = pageUrl(it.slug);
  const img = httpsUrl(it.cover_url) || (SITE + '/brand/og-image.png');
  const org = {
    '@type': 'Organization', name: PUBLISHER, url: SITE + '/',
    logo: { '@type': 'ImageObject', url: SITE + '/brand/logo-mark-512.png' }
  };
  const art = {
    '@type': 'Article', '@id': url + '#article', headline: String(it.title).slice(0, 110),
    description: it.excerpt || '', image: [img], datePublished: it.publish_date,
    mainEntityOfPage: url, inLanguage: 'th-TH', author: org, publisher: org
  };
  if (it.updated_at) art.dateModified = String(it.updated_at).slice(0, 10);
  return {
    '@context': 'https://schema.org',
    '@graph': [art, {
      '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'วารสารที่ดินชัวร์', item: LIST_URL },
        { '@type': 'ListItem', position: 3, name: 'ฉบับที่ ' + it.issue_no, item: url }
      ]
    }]
  };
}

const REDIRECT_HTML = ['<!doctype html>', '<html lang="th">', '<head>', '  <meta charset="utf-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1">',
  '  <title>วารสารที่ดินชัวร์ | ที่ดินชัวร์</title>',
  '  <link rel="canonical" href="' + LIST_URL + '">',
  '  <meta http-equiv="refresh" content="0; url=/journal.html">',
  '  <meta name="robots" content="follow">',
  '  <!-- ' + MARK + ' — หน้าพาไป สร้างด้วย build/journal.js · ห้ามแก้ด้วยมือ -->',
  '</head>', '<body>', '  <p>กำลังพาไปหน้ารวมวารสารที่ดินชัวร์…</p>',
  '  <p><a href="/journal.html">วารสารที่ดินชัวร์</a></p>',
  '  <script>location.replace("/journal.html");</script>', '</body>', '</html>', ''].join('\n');

// ---------- ประกอบหน้าจากต้นแบบ ----------
const BODY_RE = /(<!-- nj-jrbody:start -->)[\s\S]*?(<!-- nj-jrbody:end -->)/;
function replaceBody(html, inner) {
  if (!BODY_RE.test(html)) throw new Error('ไม่เจอเครื่องหมาย nj-jrbody ในต้นแบบ journal.html');
  return html.replace(BODY_RE, (m, open, close) => open + '\n      ' + inner + '\n  ' + close);
}
function setMeta(s, attr, key, val) {
  const re = new RegExp('<meta ' + attr + '="' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '" content="[^"]*">');
  const tag = '<meta ' + attr + '="' + key + '" content="' + esc(val) + '">';
  return re.test(s) ? s.replace(re, tag) : s.replace('</head>', '  ' + tag + '\n</head>');
}
// หน้าอยู่ในโฟลเดอร์ย่อย — ที่อยู่ไฟล์แบบย่อต้องเป็นแบบเต็ม (กติกาเดียวกับ build/locations.js)
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
  if (page.graph) {
    const ld = '<!-- nj-schema:start — สร้างด้วย build/journal.js · ห้ามแก้ด้วยมือ -->\n' +
      '  <script type="application/ld+json" data-nj-schema>\n' + JSON.stringify(page.graph, null, 2) +
      '\n  </script>\n  <!-- nj-schema:end -->';
    if (/<!-- nj-schema:start[\s\S]*?<!-- nj-schema:end -->/.test(s)) s = s.replace(/<!-- nj-schema:start[\s\S]*?<!-- nj-schema:end -->/, ld);
    else s = s.replace('</head>', '  ' + ld + '\n</head>');
  } else {
    // หน้ารายการหน้า 2 ขึ้นไป ไม่มีข้อมูลโครงสร้างของตัวเอง — ห้ามพกก้อนของต้นแบบไปด้วย
    s = s.replace(/\s*<!-- nj-schema:start[\s\S]*?<!-- nj-schema:end -->/, '');
  }
  return replaceBody(s, page.body);
}

// ---------- RSS + แผนผัง ----------
function rssXml(items) {
  const top = items.slice(0, 10);
  const last = items.reduce((a, it) => (String(it.updated_at || '') > a ? String(it.updated_at || '') : a), '');
  const lastDate = last ? rfc822(last.slice(0, 10)) : '';
  const out = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">', '<channel>',
    '  <title>วารสารที่ดินชัวร์</title>',
    '  <link>' + LIST_URL + '</link>',
    '  <atom:link href="' + SITE + '/journal/feed.xml" rel="self" type="application/rss+xml"/>',
    '  <description>สรุปข่าวอสังหาริมทรัพย์และกฎหมายที่ดินรายสัปดาห์ โดยที่ดินชัวร์</description>',
    '  <language>th</language>'];
  if (lastDate) out.push('  <lastBuildDate>' + lastDate + '</lastBuildDate>');
  top.forEach((it) => {
    out.push('  <item>');
    out.push('    <title>' + esc(it.title) + '</title>');
    out.push('    <link>' + pageUrl(it.slug) + '</link>');
    out.push('    <guid isPermaLink="true">' + pageUrl(it.slug) + '</guid>');
    const d = rfc822(it.publish_date);
    if (d) out.push('    <pubDate>' + d + '</pubDate>');
    if (it.excerpt) out.push('    <description>' + esc(it.excerpt) + '</description>');
    out.push('  </item>');
  });
  out.push('</channel>', '</rss>', '');
  return out.join('\n');
}
function sitemapXml(items) {
  // journal.html อยู่ในแผนผังหลัก (build/sitemap.js) แล้ว — ไฟล์นี้มีเฉพาะหน้าอ่านฉบับเต็ม
  const urls = items.map((it) => ({
    loc: pageUrl(it.slug), lastmod: String(it.updated_at || it.publish_date || '').slice(0, 10)
  }));
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    .concat(urls.map((u) => '  <url>\n    <loc>' + esc(u.loc) + '</loc>\n' +
      (/^\d{4}-\d{2}-\d{2}$/.test(u.lastmod) ? '    <lastmod>' + u.lastmod + '</lastmod>\n' : '') + '  </url>'))
    .concat(['</urlset>', '']).join('\n');
}

// ---------- วางแผนไฟล์ทั้งหมด (ตรรกะล้วน · ไม่แตะดิสก์) ----------
// คืน Map<ชื่อไฟล์สัมพัทธ์จากรากเว็บ, เนื้อไฟล์>
function plan(tpl, raw) {
  const items = (Array.isArray(raw) ? raw : [])
    .filter((it) => it && slugOk(it.slug) && it.title && typeof it.html === 'string')
    .map((it) => Object.assign({}, it, { issue_no: Number(it.issue_no) || 0 }))
    .sort(byNewest);
  const files = new Map();
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const NL = tpl.includes('\r\n') ? '\r\n' : '\n';
  const norm = (s) => s.replace(/\r?\n/g, NL);

  // หน้ารายการ — journal.html (ต้นแบบ · แตะเฉพาะกล่อง nj-jrbody) · journal/index.html · journal/page/N/
  // หน้า 1 = journal.html เอง (แตะเฉพาะกล่อง nj-jrbody · กติกาข้อ 6)
  files.set('journal.html', norm(replaceBody(tpl, listBody(items, 1, pages))));
  // /journal/ = หน้าพาไป journal.html (แบบเดียวกับ p/*.html) — ทำให้ทั้ง /journal และ /journal/ เปิดได้เสมอ
  // ไม่ว่า GitHub Pages จะเลือกไฟล์หรือโฟลเดอร์ก่อน · noindex ไม่ได้ใส่ เพราะ canonical ชี้ไปหน้าจริงแล้ว
  files.set('journal/index.html', REDIRECT_HTML);
  for (let n = 2; n <= pages; n++) {
    files.set('journal/page/' + n + '/index.html', norm(renderPage(tpl, {
      title: 'วารสารที่ดินชัวร์ หน้า ' + n + ' | ที่ดินชัวร์',
      desc: 'วารสารที่ดินชัวร์ หน้า ' + n + ' — สรุปข่าวอสังหาริมทรัพย์และกฎหมายที่ดินรายสัปดาห์ ฉบับก่อนหน้า',
      url: SITE + listPath(n), body: listBody(items, n, pages), graph: null
    })));
  }

  // หน้าอ่านฉบับเต็ม
  items.forEach((it) => {
    const prev = items.filter((x) => x.slug !== it.slug && String(x.publish_date) <= String(it.publish_date) && byNewest(it, x) < 0).slice(0, 3);
    const img = httpsUrl(it.cover_url) || (SITE + '/brand/og-image.png');
    files.set('journal/' + it.slug + '/index.html', norm(renderPage(tpl, {
      title: it.title + ' | วารสารที่ดินชัวร์',
      ogTitle: it.title,
      desc: it.excerpt || ('วารสารที่ดินชัวร์ ฉบับที่ ' + it.issue_no),
      url: pageUrl(it.slug), image: img, ogType: 'article',
      published: /^\d{4}-\d{2}-\d{2}$/.test(String(it.publish_date)) ? it.publish_date : '',
      graph: articleGraph(it), body: articleBody(it, prev)
    })));
  });

  files.set('journal/feed.xml', rssXml(items));
  files.set('sitemaps/journal.xml', sitemapXml(items));
  return { files, items, pages };
}

// ---------- ไฟล์ที่ตัวสร้างเคยเขียนแต่รอบนี้ไม่มีแล้ว ----------
// ลบเฉพาะ index.html ใต้ journal/ ที่มีเครื่องหมายของเรา — ไฟล์ที่คนวางเองไม่ถูกแตะ
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

async function fetchAll(api) {
  const list = [];
  for (let offset = 0; offset < 5000; offset += 50) {
    const r = await fetch(api + '/api/journal?limit=50&offset=' + offset, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('GET /api/journal ตอบ ' + r.status);
    const page = await r.json();
    if (!Array.isArray(page)) throw new Error('GET /api/journal ไม่ได้ตอบเป็นรายการ');
    list.push.apply(list, page);
    const total = Number(r.headers.get('x-total-count'));
    if (page.length < 50 || (Number.isFinite(total) && list.length >= total)) break;
  }
  const full = [];
  for (const it of list) {
    if (!it || !slugOk(it.slug)) continue;
    const r = await fetch(api + '/api/journal/' + it.slug, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('GET /api/journal/' + it.slug + ' ตอบ ' + r.status);
    full.push(await r.json());
  }
  return full;
}

async function main() {
  const argv = process.argv.slice(2);
  const apiAt = argv.indexOf('--api');
  const API = apiAt >= 0 ? argv[apiAt + 1] : 'https://app.njteedinsure.com';
  const DRY = argv.indexOf('--dry-run') >= 0;

  let data;
  try {
    data = await fetchAll(API);
  } catch (e) {
    console.log('⛔ ดึงวารสารจาก ' + API + ' ไม่สำเร็จ: ' + e.message + ' — ไม่แตะไฟล์ใดเลย');
    process.exit(1);
  }
  const tpl = fs.readFileSync(TPL_FILE, 'utf8');
  const out = plan(tpl, data);
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
    if (!DRY) {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, body);
    }
  }
  stale.forEach((rel) => {
    changed++;
    console.log('  − ' + rel);
    if (!DRY) { fs.unlinkSync(path.join(ROOT, rel)); pruneEmpty(path.dirname(path.join(ROOT, rel))); }
  });
  console.log('\nวารสาร ' + out.items.length + ' ฉบับ · หน้ารายการ ' + out.pages + ' หน้า · ' +
    (changed ? ((DRY ? 'จะเปลี่ยน ' : 'เปลี่ยน ') + changed + ' ไฟล์') : 'ไม่มีไฟล์เปลี่ยน'));
}

if (require.main === module) main();

module.exports = { scopeCss, splitArticle, youtubeId, videoHtml, thaiDate, rfc822, plan, slugOk, rssXml, sitemapXml, PER_PAGE };
