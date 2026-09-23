'use strict';
// ---------- เทสต์วารสารที่ดินชัวร์ฝั่งเว็บ (build/journal.js · journal.html · journalhome.js · หน้าแรก) ----------
// ไม่ต่อเน็ต ไม่เขียนไฟล์ — ทดสอบตัววางแผนไฟล์ (plan) ด้วยข้อมูลสมมติ
const fs = require('fs');
const path = require('path');
const J = require('./build/journal');

let pass = 0, fail = 0;
function ok(cond, label, extra) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (extra ? ('  → ' + extra) : '')); }
}
function eq(a, b, label) { ok(JSON.stringify(a) === JSON.stringify(b), label, 'ได้ ' + JSON.stringify(a) + ' ควรเป็น ' + JSON.stringify(b)); }
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

// หน้าตาแบบเดียวกับที่ build_journal.py ของ nj-weekly สร้าง (ย่อ)
const CSS = ':root{--green:#0F5C3F;--paper:#F7F8F5}\n' +
  '@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){--paper:#101613} }\n' +
  ':root[data-theme="dark"]{--paper:#101613}\n' +
  'body{background:var(--paper);font-family:"Sarabun",system-ui,sans-serif;margin:0}\n' +
  '.wrap{max-width:760px;margin:0 auto}\nh1,h2{font-family:"Bai Jamjuree",sans-serif}\n' +
  '@media (max-width:600px){ .mast{display:block} }\n@import url("x.css");';
function edition(n, over) {
  return Object.assign({
    edition: '2026-W' + String(38 + n).padStart(2, '0'), issue_no: n, slug: 'teedinsure-weekly-' + n,
    title: 'วารสารที่ดินชัวร์ ฉบับที่ ' + n, excerpt: 'สรุปข่าว ' + n,
    publish_date: '2026-' + String(9 + Math.floor((n + 20) / 30)).padStart(2, '0') + '-' + String(((n + 20) % 30) + 1).padStart(2, '0'),
    status: 'published', cover_url: null, video: { highlight: null, shorts: [] }, wordpress_url: null,
    updated_at: '2026-09-23T10:00:00.000Z',
    html: '<title>ฉบับ ' + n + '</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun">\n<style>' + CSS + '</style>\n' +
      '<div class="wrap"><header class="mast">วารสาร</header><h1>หัวข้อฉบับ ' + n + '</h1><p>เนื้อหา</p></div>'
  }, over || {});
}
const tpl = read('journal.html');

console.log('\n1) ขัง CSS ของวารสาร');
const sc = J.scopeCss(CSS, '.jr-article');
ok(!/(^|[\s,}])body\s*\{/.test(sc) && !/:root/.test(sc), 'ไม่มีกฎ body/:root หลุดออกมานอกกล่อง');
ok(/\.jr-article\{--green:#0F5C3F/.test(sc), ':root → .jr-article (ตัวแปรสีอยู่ใต้กล่อง)');
ok(/\.jr-article\{background:var\(--paper\)/.test(sc), 'body → .jr-article');
ok(/\.jr-article \.wrap\{/.test(sc), 'ตัวเลือกทั่วไปถูกเติม scope');
ok(/\.jr-article h1,\.jr-article h2\{/.test(sc), 'ตัวเลือกหลายตัวในกฎเดียวถูกเติมครบทุกตัว');
ok(!/101613/.test(sc) && !/data-theme/.test(sc), 'ตัดโหมดมืดของวารสารทิ้ง (เว็บไม่มีโหมดมืด)');
ok(!/Sarabun|Bai Jamjuree/.test(sc) && /font-family:var\(--nj-font\)/.test(sc), 'ฟอนต์ของวารสาร → ฟอนต์กลางของเว็บ');
ok(/@media \(max-width:600px\)\{\.jr-article \.mast\{/.test(sc), '@media ถูกขังด้วย');
ok(!/@import/.test(sc), 'ตัด @import');

console.log('\n2) แยก HTML ของวารสาร');
const sp = J.splitArticle(edition(1).html + '<script>alert(1)</script>');
ok(!/<title|<link|<style|<script/i.test(sp.body), 'ตัด title/link/style/script ออกจากเนื้อหา');
ok(/<h1>หัวข้อฉบับ 1<\/h1>/.test(sp.body) && /class="wrap"/.test(sp.body), 'เนื้อหาและ .wrap อยู่ครบ');

console.log('\n3) คลิปไฮไลต์');
eq(J.youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'youtu.be');
eq(J.youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'youtube.com/watch');
eq(J.youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ', 'shorts');
eq(J.youtubeId('https://evil.example/watch?v=dQw4w9WgXcQ'), '', 'โดเมนอื่นไม่นับ');
ok(/youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(J.videoHtml({ highlight: 'https://youtu.be/dQw4w9WgXcQ' })), 'ฝัง YouTube ผ่าน youtube-nocookie');
ok(/class="jr-video-link"/.test(J.videoHtml({ highlight: 'https://www.tiktok.com/@x/video/1' })) &&
   !/iframe/.test(J.videoHtml({ highlight: 'https://www.tiktok.com/@x/video/1' })), 'TikTok = ปุ่มลิงก์ ไม่ฝัง (คุกกี้บุคคลที่สาม)');
eq(J.videoHtml({ highlight: 'javascript:alert(1)' }), '', 'ลิงก์ที่ไม่ใช่ http(s) ไม่แสดง');
eq(J.videoHtml(null), '', 'ไม่มีคลิป = ไม่มีอะไร');

console.log('\n4) วันที่');
eq(J.thaiDate('2026-09-28'), '28 ก.ย. 2569', 'วันที่ไทย');
eq(J.thaiDate('28/09/2026'), '', 'ผิดรูปแบบ = ค่าว่าง ไม่เดา');
eq(J.rfc822('2026-09-28'), 'Mon, 28 Sep 2026 06:00:00 +0700', 'RFC 822 ของ RSS');

console.log('\n5) ไม่มีฉบับเผยแพร่');
const empty = J.plan(tpl, []);
ok(/ยังไม่มีวารสารที่เผยแพร่/.test(empty.files.get('journal.html')), 'journal.html ขึ้นข้อความว่ายังไม่มี');
ok(!/กำลังรวบรวม/.test(empty.files.get('journal.html')), 'ไม่เขียนว่ากำลังรวบรวม');
ok(/location\.replace\("\/journal\.html"\)/.test(empty.files.get('journal/index.html')), '/journal/ พาไป journal.html');
ok(/<link rel="canonical" href="https:\/\/njteedinsure\.com\/journal\.html">/.test(empty.files.get('journal/index.html')), 'หน้าพาไปชี้ canonical ไปหน้าจริง');
eq(Array.from(empty.files.keys()).sort(), ['journal.html', 'journal/feed.xml', 'journal/index.html', 'sitemaps/journal.xml'], 'เขียนเฉพาะไฟล์ของวารสาร');

console.log('\n6) ฉบับที่เผยแพร่');
const items = [1, 2, 3].map((n) => edition(n));
items[2].video = { highlight: 'https://youtu.be/dQw4w9WgXcQ', shorts: [] };
items[2].wordpress_url = 'https://njandconsulting.com/?p=4395249';
items[2].cover_url = 'https://njteedinsure.com/uploads/cover.jpg';
const out = J.plan(tpl, items);
const page3 = out.files.get('journal/teedinsure-weekly-3/index.html');
ok(!!page3, 'มีหน้า journal/<slug>/index.html');
ok(/<title>วารสารที่ดินชัวร์ ฉบับที่ 3 \| วารสารที่ดินชัวร์<\/title>/.test(page3), '<title> ของฉบับ');
ok(/<link rel="canonical" href="https:\/\/njteedinsure\.com\/journal\/teedinsure-weekly-3\/">/.test(page3), 'canonical ของฉบับ');
ok(/<meta property="og:type" content="article">/.test(page3), 'og:type article');
ok(/<meta property="og:title" content="วารสารที่ดินชัวร์ ฉบับที่ 3">/.test(page3), 'og:title');
ok(/<meta property="og:description" content="สรุปข่าว 3">/.test(page3), 'og:description = excerpt');
ok(/<meta property="og:image" content="https:\/\/njteedinsure\.com\/uploads\/cover\.jpg">/.test(page3), 'og:image = รูปปก');
ok(/<meta property="og:url" content="https:\/\/njteedinsure\.com\/journal\/teedinsure-weekly-3\/">/.test(page3), 'og:url');
ok(/<meta property="article:published_time" content="2026-/.test(page3), 'article:published_time');
const ld = JSON.parse((page3.match(/<script type="application\/ld\+json" data-nj-schema>([\s\S]*?)<\/script>/) || [])[1] || '{}');
const art = (ld['@graph'] || []).find((x) => x['@type'] === 'Article') || {};
eq(art.publisher && art.publisher.name, 'บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด', 'JSON-LD Article · publisher ตามสเปก');
eq(art.headline, 'วารสารที่ดินชัวร์ ฉบับที่ 3', 'JSON-LD headline');
ok((page3.match(/data-nj-schema/g) || []).length === 1, 'ก้อน JSON-LD ก้อนเดียว (ไม่พกของต้นแบบมาด้วย)');
ok(/<article class="jr-article"><div class="wrap">/.test(page3), 'เนื้อหาวารสารอยู่ใน .jr-article');
ok((page3.match(/<h1[\s>]/g) || []).length === 1, 'h1 หนึ่งอัน (มาจากตัววารสาร)');
ok(!/fonts\.googleapis/.test(page3), 'ไม่โหลดฟอนต์ของวารสารซ้ำ');
ok(/youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(page3), 'ฝังคลิปไฮไลต์ด้านบนเนื้อหา');
ok(page3.indexOf('jr-video') < page3.indexOf('jr-article"'), 'คลิปอยู่ก่อนเนื้อหา');
ok(/sharer\.php\?u=https%3A%2F%2Fnjteedinsure\.com%2Fjournal%2Fteedinsure-weekly-3%2F/.test(page3), 'ปุ่มแชร์ Facebook');
ok(/lineit\/share\?url=https%3A%2F%2F/.test(page3), 'ปุ่มแชร์ LINE');
ok(/data-jr-copy="https:\/\/njteedinsure\.com\/journal\/teedinsure-weekly-3\/"/.test(page3), 'ปุ่มคัดลอกลิงก์');
ok(/<a class="jr-btn jr-btn-main" href="\/">ดูประกาศที่ดินชัวร์<\/a>/.test(page3), 'ปุ่ม "ดูประกาศที่ดินชัวร์" → /');
ok(/href="https:\/\/njandconsulting\.com\/contact\/"[^>]*>ขอใบเสนอราคารังวัด/.test(page3), 'ปุ่ม "ขอใบเสนอราคารังวัด"');
ok(/อ่านฉบับนี้บน njandconsulting\.com/.test(page3), 'ลิงก์ wordpress_url');
ok(!/อ่านฉบับนี้บน njandconsulting/.test(out.files.get('journal/teedinsure-weekly-1/index.html')), 'ไม่มี wordpress_url = ไม่มีลิงก์');
ok(/ฉบับก่อนหน้า/.test(page3) && /teedinsure-weekly-2\//.test(page3.slice(page3.indexOf('ฉบับก่อนหน้า'))), 'ส่วนฉบับก่อนหน้า');
ok(!/ฉบับก่อนหน้า/.test(out.files.get('journal/teedinsure-weekly-1/index.html')), 'ฉบับแรกสุดไม่มีส่วนฉบับก่อนหน้า');
ok(/href="\/marketplace\.css"/.test(page3) && !/href="marketplace\.css"/.test(page3), 'ที่อยู่ไฟล์เป็นแบบเต็ม (หน้าอยู่ในโฟลเดอร์ย่อย)');

const list = out.files.get('journal.html');
const order = ['teedinsure-weekly-3', 'teedinsure-weekly-2', 'teedinsure-weekly-1'].map((s) => list.indexOf('/journal/' + s + '/'));
ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), 'หน้ารายการเรียงใหม่ → เก่า');
ok(/class="jr-issue">ฉบับที่ 3</.test(list) && /class="jr-excerpt">สรุปข่าว 3</.test(list) && /class="jr-date">/.test(list), 'การ์ดมีป้ายฉบับ · excerpt · วันที่ไทย');
ok(/อ่านฉบับเต็ม/.test(list), 'ปุ่มอ่านฉบับเต็ม');
ok(/src="https:\/\/njteedinsure\.com\/uploads\/cover\.jpg"/.test(list) && /jr-cover-blank/.test(list), 'มีปก = รูป · ไม่มีปก = พื้นสีวารสาร');
const headOf = (s) => s.slice(0, s.indexOf('</head>'));
eq(headOf(list), headOf(tpl), '⭐ ไม่แตะ <head> ของ journal.html (schema/sitemap --check ไม่แดง)');

const rss = out.files.get('journal/feed.xml');
ok(/<rss version="2\.0"/.test(rss) && (rss.match(/<item>/g) || []).length === 3, 'RSS มีทุกฉบับ');
ok(/<lastBuildDate>Wed, 23 Sep 2026/.test(rss), 'lastBuildDate มาจาก updated_at (ไม่ใช่เวลาปัจจุบัน)');
const map = out.files.get('sitemaps/journal.xml');
eq((map.match(/<loc>/g) || []).length, 3, 'แผนผังมีทุกฉบับ');

console.log('\n7) กันข้อมูลผิด');
const bad = J.plan(tpl, [edition(9, { slug: '../../index' }), edition(8, { slug: 'A B' }), edition(7, { html: undefined })]);
ok(!Array.from(bad.files.keys()).some((k) => /\.\.|index\.html$/.test(k) && k !== 'journal/index.html'), 'slug ที่มี ../ ไม่ถูกเขียน');
eq(bad.items.length, 0, 'รายการผิดรูปแบบถูกข้ามทั้งหมด');
const xss = J.plan(tpl, [edition(1, { title: '<img src=x onerror=alert(1)>', excerpt: '"><script>alert(1)</script>' })]);
ok(!/<img src=x onerror/.test(xss.files.get('journal.html')) && !/"><script>alert/.test(xss.files.get('journal.html')), 'ชื่อ/excerpt ถูก escape ในหน้ารายการ');

console.log('\n8) แบ่งหน้า 12 ฉบับต่อหน้า');
const many = J.plan(tpl, Array.from({ length: 13 }, (x, i) => edition(i + 1)));
eq(many.pages, 2, '13 ฉบับ = 2 หน้า');
ok(many.files.has('journal/page/2/index.html'), 'มีหน้า 2');
ok(/<link rel="canonical" href="https:\/\/njteedinsure\.com\/journal\/page\/2\/">/.test(many.files.get('journal/page/2/index.html')), 'canonical ของหน้า 2');
ok(!/data-nj-schema/.test(many.files.get('journal/page/2/index.html')), 'หน้า 2 ไม่พก JSON-LD ของหน้า 1');
eq((many.files.get('journal.html').match(/class="jr-card"/g) || []).length, 12, 'หน้า 1 แสดง 12 ฉบับ');
ok(/href="\/journal\/page\/2\/"/.test(many.files.get('journal.html')), 'หน้า 1 มีลิงก์ไปหน้า 2');

console.log('\n9) ผลเหมือนเดิมทุกไบต์');
const again = J.plan(tpl, items);
ok(Array.from(out.files.keys()).every((k) => out.files.get(k) === again.files.get(k)), 'รันสองรอบได้ผลเท่ากัน');
const reTpl = J.plan(out.files.get('journal.html'), items);
eq(reTpl.files.get('journal.html'), out.files.get('journal.html'), 'รันซ้ำบนต้นแบบที่เขียนแล้ว ไม่งอก');

console.log('\n10) หน้าแรก · เมนู · ฟุตเตอร์');
const home = read('index.html');
const iL = home.indexOf('id="listings"'), iJ = home.indexOf('id="วารสาร"'), iS = home.indexOf('id="มาตรฐาน"');
ok(iL > 0 && iJ > iL && iS > iJ, 'บล็อกวารสารอยู่ใต้ส่วนประกาศ');
ok(/id="journal-home"/.test(home) && /วารสารที่ดินชัวร์ ฉบับล่าสุด/.test(home), 'หัวข้อ + ที่วางการ์ด');
ok(/href="journal\.html">ดูวารสารทั้งหมด/.test(home), 'ปุ่มดูวารสารทั้งหมด');
ok(home.indexOf('src="analytics.js"') < home.indexOf('src="journalhome.js"'), 'journalhome.js มาหลัง analytics.js');
ok(!/class="jr-card"/.test(home), 'ไม่มีการ์ดตัวอย่างในหน้าแรก (กติกาข้อ 4)');
const pagesSrc = read('build/pages.js');
ok(/label: 'วารสาร', href: 'journal\.html'/.test(pagesSrc), 'เมนู "วารสาร" ใน NAV (เดสก์ท็อป + ลิ้นชักมือถือ)');
ok(/<a href="journal\.html"[^>]*><b>วารสาร<\/b>/.test(read('listings.html')), 'หัวเว็บที่สร้างแล้วมีเมนูวารสาร');
ok(/href="journal\.html"[^>]*>วารสารที่ดินชัวร์/.test(home), 'ลิงก์ในฟุตเตอร์หน้าแรก');
const hj = read('journalhome.js');
ok(!/innerHTML/.test(hj), 'journalhome.js ไม่ใช้ innerHTML (ข้อความจาก API ใส่ด้วย textContent)');
ok(/\/api\/journal\?limit=3/.test(hj), 'หน้าแรกดึง ?limit=3');
ok(/sec\.hidden = true/.test(hj), 'ไม่มีฉบับ = ซ่อนบล็อก');
ok(!/#[0-9A-Fa-f]{3,8}\b/.test(read('journal.css').replace(/\/\*[\s\S]*?\*\//g, '')), 'journal.css ไม่มีรหัสสีดิบ (ใช้ token)');
const tok = read('tokens.css');
['#0F5C3F', '#B8730A', '#F7F8F5'].forEach((c) => ok(tok.indexOf(c) >= 0, 'token สีวารสาร ' + c));
ok(/Sitemap: https:\/\/njteedinsure\.com\/sitemaps\/journal\.xml/.test(read('robots.txt')), 'robots.txt ชี้แผนผังวารสาร');

console.log('\nสรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
