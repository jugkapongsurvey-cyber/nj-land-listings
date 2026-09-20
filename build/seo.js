'use strict';
// ---------- เขียนค่า SEO จากทะเบียนกลางลงหัวไฟล์ HTML ----------
//
// รัน:  node build/seo.js                  ดึงทะเบียนจาก API แล้วเขียนลงไฟล์ HTML ทุกหน้า
//       node build/seo.js --check          ตรวจว่าไฟล์ตรงกับที่ควรเป็นไหม · ไม่เขียนอะไร (คืน exit 1 ถ้าไม่ตรง)
//       node build/seo.js --from <ไฟล์>    อ่านทะเบียนจากไฟล์ JSON แทนการยิง API (ตอนไม่มีเน็ต)
//       node build/seo.js --offline        ไม่ยิง API เลย — เติมเฉพาะค่าที่หาได้เองจากหน้า
//
// ทะเบียนกลางอยู่ที่ระบบหลังบ้าน (`lib/seo.js` + เมนู "SEO และการตลาด" ใน nj-survey-system)
// ไฟล์นี้คือขาที่เอาค่าจากทะเบียนมาลงไฟล์จริง แทนการไล่แก้หัวไฟล์ 20 กว่าหน้าด้วยมือ
//
// ⚠️⚠️ หกข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **ไม่เขียนเนื้อหาให้เอง** — title · description · og:title · og:description · og:image
//    มาจากทะเบียนเท่านั้น (คนพิมพ์ คนรับผิดชอบ) ไฟล์นี้ไม่มีสูตรแต่งข้อความใดๆ ทั้งสิ้น
//    กติกาเดียวกับข้อ 2 ที่หัว lib/seo.js ของระบบหลังบ้าน
//
// 2. **ช่องที่ทะเบียนเว้นว่าง = ไม่แตะของเดิมในไฟล์** ไม่ใช่สั่งให้ลบ
//    หน้าที่ยังไม่มีในทะเบียนเลยก็ไม่ถูกแตะ (นอกจากค่าที่หาได้เองตามข้อ 3)
//
// 3. **เติมเองได้แค่ 3 ค่าที่เป็นกลไกล้วน ไม่ใช่เนื้อหา**: canonical · og:url · twitter:card
//    · canonical/og:url = ที่อยู่ของหน้านั้นเอง (คำนวณจากชื่อไฟล์ ไม่ได้เดา)
//    · twitter:card = summary_large_image เมื่อหน้ามี og:image ไม่งั้น summary
//    **ไม่เติม twitter:title/twitter:description** ทั้งที่ทะเบียนมีช่องให้ — เพราะ X ถอยไปอ่าน
//    og:title/og:description ให้เองอยู่แล้วเมื่อไม่มี twitter:* การเขียนซ้ำคือสร้างที่ที่สองให้ลืมแก้
//    (ช่องพวกนั้นยังใช้ได้ถ้าคนตั้งค่าในทะเบียนเองว่าอยากให้ข้อความบน X ต่างจากที่อื่น)
//
// 4. **หน้าที่ประกาศ noindex ไม่ได้ค่าที่คำนวณเองเลยสักตัว** — บอกบอตว่าอย่าเก็บ
//    แล้วยังชี้ canonical กลับมาหาตัวเองคือคำสั่งที่ขัดกันเอง · หน้า 404 ยิ่งห้ามมี
//    · หน้าพวกนี้ (404 · compare · deal · notify · quote · room) เป็นหน้าใช้งานเฉพาะกิจ
//      จะให้มีข้อความตอนแชร์หรือไม่ เป็นการตัดสินใจของคน ไม่ใช่ของตัวสร้างไฟล์
//    · ค่าที่คนตั้งไว้เองในไฟล์หรือในทะเบียนยังถูกเขียนลงตามปกติ
//
// 5. **แก้เฉพาะใน <head> และรันซ้ำได้ผลเท่าเดิม** — แท็กที่มีอยู่แล้วถูกแก้ค่าในที่เดิม
//    ส่วนแท็กที่เพิ่มใหม่อยู่ในบล็อก nj-seo:start/end ซึ่งถูกสร้างใหม่ทั้งบล็อกทุกรอบ
//    ⚠️ ห้ามแก้ข้างในบล็อกนั้นด้วยมือ รอบถัดไปจะถูกเขียนทับ
//
// 6. **ทะเบียนปิดอยู่ (API ตอบ 404) ไม่ใช่ข้อผิดพลาด** — สวิตช์ seo_center ค่าเริ่มต้นคือปิด
//    กรณีนั้นไฟล์นี้ยังทำงานต่อโดยเติมเฉพาะค่าตามข้อ 3 และบอกบนจอว่าทะเบียนยังไม่เปิด

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://njteedinsure.com';
// ⚠️ ต้องตรงกับ NJ_API_BASE ใน analytics.js — `seo.test.js` เทียบให้ทุกครั้งที่รัน
const API_BASE = 'https://app.njteedinsure.com';
const API_PATH = '/api/public/seo/pages';
const FETCH_TIMEOUT_MS = 15000;

const MANAGED_START = '<!-- nj-seo:start — สร้างด้วย build/seo.js จากทะเบียน SEO กลาง · ห้ามแก้ด้วยมือ -->';
const MANAGED_END = '<!-- nj-seo:end -->';

// เรียงตามลำดับเดียวกับ FIELDS ใน lib/seo.js ของระบบหลังบ้าน (อ่าน diff ง่าย)
const TAGS = {
  title: { kind: 'title' },
  description: { kind: 'meta', attr: 'name', key: 'description' },
  canonical: { kind: 'link', key: 'canonical' },
  robots: { kind: 'meta', attr: 'name', key: 'robots' },
  ogTitle: { kind: 'meta', attr: 'property', key: 'og:title' },
  ogDescription: { kind: 'meta', attr: 'property', key: 'og:description' },
  ogImage: { kind: 'meta', attr: 'property', key: 'og:image' },
  ogType: { kind: 'meta', attr: 'property', key: 'og:type' },
  ogUrl: { kind: 'meta', attr: 'property', key: 'og:url' },
  twitterCard: { kind: 'meta', attr: 'name', key: 'twitter:card' },
  twitterTitle: { kind: 'meta', attr: 'name', key: 'twitter:title' },
  twitterDescription: { kind: 'meta', attr: 'name', key: 'twitter:description' },
  twitterImage: { kind: 'meta', attr: 'name', key: 'twitter:image' },
};
const FIELDS = Object.keys(TAGS);
// ค่าที่ไฟล์นี้คำนวณเองได้ (ข้อ 3) — นอกจากสามตัวนี้ต้องมาจากทะเบียนเท่านั้น
const DERIVABLE = ['canonical', 'ogUrl', 'twitterCard'];

// ⚠️ หน้าที่ "ที่อยู่ของหน้า" คำนวณจากชื่อไฟล์ไม่ได้ — ห้ามเติม canonical/og:url ให้
//    (twitter:card ยังเติมได้ เพราะไม่ได้อ้างที่อยู่ของหน้า) · เขียนเหตุผลกำกับทุกบรรทัด
const NO_URL = {
  'land.html': 'หน้าแปลงรายแปลง — ที่อยู่จริงคือ land.html?id=… คนละหน้าต่อหนึ่งแปลง ' +
    'ใส่ canonical ชี้ land.html เปล่าๆ = บอก Google ว่าทุกแปลงคือหน้าเดียวกัน ' +
    '(ของจริงตั้งจาก land.js ตอนเปิดหน้า · หน้าที่เขียนค่าลงไฟล์จริงมาในสปรินต์ 3 พร้อม sitemaps/properties.xml)',
};

function esc(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function pathOfFile(file) { return file === 'index.html' ? 'index.html' : file; }
function urlOfFile(file) { return file === 'index.html' ? SITE + '/' : SITE + '/' + file; }

// ---------- อ่าน/เขียนหัวไฟล์ ----------
// ⚠️ หา <head> ด้วย </head> เป็นหลัก แล้วย้อนขึ้นไปหาแท็กเปิด — ค้นหา '<head' ตรงๆ ไม่ได้
//    เพราะทุกหน้ามี <header> ในเนื้อหาด้วย (เคยทำให้ตัวตรวจอ่านเลยหัวไฟล์ไปถึงท้ายหน้า)
function headRange(html) {
  const end = html.indexOf('</head>');
  if (end < 0) return null;
  const openTag = html.slice(0, end).search(/<head[\s>]/i);
  if (openTag < 0) return null;
  const openEnd = html.indexOf('>', openTag);
  return { start: openEnd + 1, end: end };
}
function metaRe(key) {
  // รับทั้ง name= และ property= และทั้งสองลำดับของแอตทริบิวต์ (ของเดิมในเว็บเขียนไม่เหมือนกันทุกหน้า)
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('<meta\\b(?=[^>]*\\b(?:name|property)\\s*=\\s*["\']' + k + '["\'])[^>]*>', 'i');
}
function tagRe(f) {
  const t = TAGS[f];
  if (t.kind === 'title') return /<title\b[^>]*>[\s\S]*?<\/title>/i;
  if (t.kind === 'link') return /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i;
  return metaRe(t.key);
}
function renderTag(f, value) {
  const t = TAGS[f];
  if (t.kind === 'title') return '<title>' + esc(value) + '</title>';
  if (t.kind === 'link') return '<link rel="canonical" href="' + esc(value) + '">';
  return '<meta ' + t.attr + '="' + t.key + '" content="' + esc(value) + '">';
}
function valueOfTag(tag, f) {
  const t = TAGS[f];
  if (t.kind === 'title') { const m = tag.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i); return m ? m[1].trim() : ''; }
  const m = tag.match(t.kind === 'link' ? /\bhref\s*=\s*["']([^"']*)["']/i : /\bcontent\s*=\s*["']([^"']*)["']/i);
  return m ? m[1] : '';
}
function replaceValue(tag, f, value) {
  const t = TAGS[f];
  if (t.kind === 'title') return '<title>' + esc(value) + '</title>';
  const attr = t.kind === 'link' ? 'href' : 'content';
  const re = new RegExp('(\\b' + attr + '\\s*=\\s*")[^"]*(")', 'i');
  if (re.test(tag)) return tag.replace(re, '$1' + esc(value) + '$2');
  const re2 = new RegExp("(\\b" + attr + "\\s*=\\s*')[^']*(')", 'i');
  if (re2.test(tag)) return tag.replace(re2, '$1' + esc(value) + '$2');
  return tag.replace(/\s*\/?>$/, ' ' + attr + '="' + esc(value) + '">');
}
function stripManaged(head) {
  const s = head.indexOf(MANAGED_START);
  if (s < 0) return head;
  const e = head.indexOf(MANAGED_END, s);
  if (e < 0) return head;
  // กินบรรทัดว่าง/ช่องว่างหน้าบล็อกไปด้วย เพื่อให้รันซ้ำแล้วไม่มีบรรทัดว่างงอกทีละรอบ
  let from = s;
  while (from > 0 && /[ \t]/.test(head[from - 1])) from--;
  if (head[from - 1] === '\n') from--;
  return head.slice(0, from) + head.slice(e + MANAGED_END.length);
}
function isNoindex(head) {
  const m = head.match(metaRe('robots'));
  return !!(m && /noindex/i.test(m[0]));
}

// ---------- ค่าที่หาได้เองจากหน้า (ข้อ 3) ----------
function deriveFor(file, head, wanted) {
  const out = {};
  const cur = f => (wanted[f] !== undefined ? wanted[f] : (tagRe(f).test(head) ? valueOfTag(head.match(tagRe(f))[0], f) : ''));
  const robots = cur('robots');
  const noindex = robots ? /noindex/i.test(robots) : isNoindex(head);
  // ข้อ 4 — หน้าที่สั่งบอตว่าอย่าเก็บ ไม่ได้ค่าที่คำนวณเองเลยสักตัว
  // (ค่าที่คนตั้งไว้เองในไฟล์หรือในทะเบียนยังอยู่ครบ ไฟล์นี้แค่ไม่เพิ่มอะไรให้)
  if (noindex) return out;

  if (!NO_URL[file]) {
    if (!cur('canonical')) out.canonical = urlOfFile(file);
    const canonical = out.canonical || cur('canonical');
    if (canonical && !cur('ogUrl')) out.ogUrl = canonical;
  }
  // การ์ดบน X ไม่ถอยไปอ่าน og:image ให้เอง ต้องประกาศชนิดการ์ดเสมอ (ช่องว่าง M1 ในรายงานตรวจเว็บ)
  // แต่หน้าที่ยังไม่มี og อะไรเลยก็ไม่ต้องเริ่มมีการ์ด — ปล่อยให้คนตั้งในทะเบียนเอง
  const hasOg = !!(cur('ogTitle') || cur('ogImage'));
  if (hasOg && !cur('twitterCard')) out.twitterCard = cur('ogImage') ? 'summary_large_image' : 'summary';
  return out;
}

// ---------- ลงค่าในไฟล์เดียว ----------
// entry = แถวของหน้านี้ในทะเบียน (หรือ null ถ้ายังไม่มี) · opts.derive=false = ไม่เติมค่าที่หาได้เอง
function applyToHtml(html, file, entry, opts) {
  const o = opts || {};
  const r = headRange(html);
  if (!r) throw new Error(file + ': หาหัวไฟล์ (<head>…</head>) ไม่เจอ');
  const head0 = stripManaged(html.slice(r.start, r.end));

  const wanted = {};
  FIELDS.forEach(f => {
    const v = entry && entry[f] != null ? String(entry[f]).trim() : '';
    if (v) wanted[f] = v;            // ข้อ 2: ช่องว่างในทะเบียน = ไม่แตะของเดิม
  });
  const derived = o.derive === false ? {} : deriveFor(file, head0, wanted);
  Object.keys(derived).forEach(f => { wanted[f] = derived[f]; });

  let head = head0;
  const updated = [], added = [];
  const fresh = [];
  FIELDS.forEach(f => {
    if (wanted[f] === undefined) return;
    const re = tagRe(f);
    const m = head.match(re);
    if (m) {
      const cur = valueOfTag(m[0], f);
      if (cur !== wanted[f]) { head = head.replace(re, replaceValue(m[0], f, wanted[f])); updated.push(f); }
      return;
    }
    fresh.push(f);
    added.push(f);
  });

  if (fresh.length) {
    const block = '  ' + MANAGED_START + '\n' +
      fresh.map(f => '  ' + renderTag(f, wanted[f])).join('\n') + '\n' +
      '  ' + MANAGED_END;
    // วางต่อจากแท็ก SEO ตัวสุดท้ายที่มีอยู่ ไม่ใช่ท้าย <head> (ท้ายหัวไฟล์เป็นแท็ก <script> ทั้งแถบ)
    let at = -1;
    FIELDS.forEach(f => {
      const m = head.match(tagRe(f));
      if (!m) return;
      const i = head.indexOf(m[0]) + m[0].length;
      if (i > at) at = i;
    });
    head = at < 0 ? (head.replace(/\s*$/, '') + '\n' + block + '\n')
                  : (head.slice(0, at) + '\n' + block + head.slice(at));
  }

  return {
    html: html.slice(0, r.start) + head + html.slice(r.end),
    changed: head !== html.slice(r.start, r.end),
    updated: updated, added: added, derived: Object.keys(derived),
  };
}

// ---------- ทะเบียน ----------
async function fetchRegistry() {
  const res = await fetch(API_BASE + API_PATH, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (res.status === 404) return { off: true, pages: [] };          // ข้อ 6 — สวิตช์ยังปิด ไม่ใช่ข้อผิดพลาด
  if (!res.ok) throw new Error('ทะเบียนตอบ HTTP ' + res.status);
  const j = await res.json();
  return { off: false, pages: Array.isArray(j.pages) ? j.pages : [] };
}
function indexRegistry(pages) {
  const by = {};
  (pages || []).forEach(p => { if (p && p.path) by[String(p.path)] = p; });
  return by;
}

// ---------- ตัวรัน ----------
async function main() {
  const argv = process.argv.slice(2);
  const CHECK = argv.indexOf('--check') >= 0;
  const OFFLINE = argv.indexOf('--offline') >= 0;
  const fromAt = argv.indexOf('--from');
  const FROM = fromAt >= 0 ? argv[fromAt + 1] : '';

  let reg = { off: true, pages: [] }, source = 'ไม่ได้ดึงทะเบียน (--offline)';
  if (FROM) {
    reg = { off: false, pages: (JSON.parse(fs.readFileSync(FROM, 'utf8')) || {}).pages || [] };
    source = 'ไฟล์ ' + FROM;
  } else if (!OFFLINE) {
    try {
      reg = await fetchRegistry();
      source = reg.off ? 'ทะเบียนยังปิดอยู่ (สวิตช์ seo_center) — เติมเฉพาะค่าที่หาได้เอง'
                       : API_BASE + API_PATH + ' (' + reg.pages.length + ' หน้า)';
    } catch (e) {
      console.log('⚠ ดึงทะเบียนไม่ได้: ' + e.message + ' — เติมเฉพาะค่าที่หาได้เอง');
      source = 'ดึงไม่ได้ · ' + e.message;
    }
  }
  const by = indexRegistry(reg.pages);

  const files = fs.readdirSync(ROOT).filter(f => /\.html$/i.test(f)).sort();
  const diffs = [];
  let touched = 0;
  files.forEach(file => {
    const p = path.join(ROOT, file);
    const html = fs.readFileSync(p, 'utf8');
    const r = applyToHtml(html, file, by[pathOfFile(file)] || null, {});
    if (!r.changed) return;
    touched++;
    diffs.push({ file: file, added: r.added, updated: r.updated });
    if (!CHECK) fs.writeFileSync(p, r.html, 'utf8');
  });

  console.log('ทะเบียน: ' + source);
  console.log('ไฟล์ HTML ที่ตรวจ: ' + files.length + ' หน้า');
  const unknown = Object.keys(by).filter(k => files.indexOf(k) < 0);
  if (unknown.length) console.log('⚠ มีในทะเบียนแต่ไม่มีไฟล์จริง: ' + unknown.join(', '));
  if (!diffs.length) { console.log('ทุกหน้าตรงกับทะเบียนแล้ว ไม่มีอะไรต้องแก้'); return 0; }
  diffs.forEach(d => console.log('  ' + (CHECK ? '≠ ' : '✓ ') + d.file +
    (d.added.length ? '  เพิ่ม: ' + d.added.join(',') : '') +
    (d.updated.length ? '  แก้: ' + d.updated.join(',') : '')));
  console.log((CHECK ? '⚠ ' + touched + ' หน้าไม่ตรง — รัน `node build/seo.js`' : 'เขียนแล้ว ' + touched + ' หน้า'));
  return CHECK ? 1 : 0;
}

module.exports = {
  SITE, API_BASE, API_PATH, TAGS, FIELDS, DERIVABLE, NO_URL, MANAGED_START, MANAGED_END,
  headRange, stripManaged, isNoindex, tagRe, valueOfTag, renderTag, esc,
  pathOfFile, urlOfFile, deriveFor, applyToHtml, indexRegistry,
};

if (require.main === module) {
  main().then(code => process.exit(code)).catch(e => { console.error(e); process.exit(1); });
}
