'use strict';
// ---------- เขียนข้อมูลโครงสร้าง (JSON-LD) ลงหัวไฟล์ HTML ----------
//
// รัน:  node build/schema.js          เขียนบล็อก JSON-LD ลงทุกหน้าที่ควรมี
//       node build/schema.js --check  ตรวจว่าไฟล์ตรงกับที่ควรเป็นไหม · ไม่เขียนอะไร (exit 1 ถ้าไม่ตรง)
//
// ⚠️ รันหลัง `node build/seo.js` เสมอ — ชื่อหน้าใน breadcrumb และคำอธิบายใน WebPage
//    อ่านมาจาก <title>/<meta description> ที่อยู่ในไฟล์ ณ ตอนนั้น (ซึ่งมาจากทะเบียน SEO กลาง)
//
// ⚠️⚠️ หกข้อที่ต้องรู้ก่อนแก้ไฟล์นี้
//
// 1. **ทุกค่าต้องเป็นความจริงที่ตรวจสอบได้** — ไม่มีรีวิว ไม่มีเรตติ้ง ไม่มีราคา ไม่มีเวลาทำการ
//    ที่ไม่ได้มาจากของจริงในเว็บ · Google ลงโทษข้อมูลปลอมด้วยการตัดสิทธิ์แสดงผลพิเศษ
//    **ทั้งเว็บ ไม่ใช่แค่หน้าเดียว** (คำเตือนเดียวกับที่เขียนไว้เหนือบล็อกเดิมใน index.html)
//
// 2. **ข้อมูลบริษัทไม่พิมพ์ซ้ำในไฟล์นี้** — อ่านจากบล็อกที่เขียนด้วยมือใน index.html
//    แล้วคัดมาเฉพาะช่องที่จำเป็น (@id · @type · ชื่อ · url · โลโก้) ถ้า index.html แก้ ที่เหลือตามเอง
//    ⚠️ ไฟล์นี้ **ไม่แตะบล็อกเดิมของ index.html เลย** มันเขียนบล็อกของตัวเองแยกต่างหาก
//
// 3. **FAQPage มาจากคำถาม–คำตอบจริงในหน้านั้น** (`<details><summary>`) ไม่ได้แต่งขึ้น
//    หน้าที่ไม่มีหัวข้อ "คำถามที่พบบ่อย" จะไม่ถูกใส่ FAQPage แม้จะมี <details> อยู่
//    (Google ห้าม FAQ ที่ไม่ปรากฏบนหน้าให้คนอ่านเห็นจริง)
//
// 4. **VideoObject เฉพาะคลิปที่มีไฟล์อยู่จริงบนดิสก์** — ไม่มีไฟล์ = ไม่มีรายการ
//    · `uploadDate` มาจากวันที่ commit ของไฟล์คลิปนั้น ไม่ใช่วันที่พิมพ์มือ (กติกาเดียวกับ lastmod ใน sitemap.js)
//    · ไม่ใส่ `duration` เพราะยังไม่มีทางอ่านความยาวจริงโดยไม่ลง ffprobe — เดาไม่ได้ก็ไม่ใส่
//
// 5. **หน้าที่ประกาศ noindex ไม่ได้บล็อกนี้** — ข้อมูลโครงสร้างมีไว้ให้บอตเข้าใจหน้าที่จะถูกเก็บดัชนี
//    หน้าที่สั่งว่าอย่าเก็บ ใส่ไปก็ไม่มีใครอ่าน
//
// 6. **รันซ้ำได้ผลเท่าเดิม** — บล็อก nj-schema:start/end ถูกสร้างใหม่ทั้งบล็อกทุกรอบ
//    ⚠️ ห้ามแก้ข้างในด้วยมือ

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://njteedinsure.com';
const HOME = SITE + '/';
const LANG = 'th-TH';

const MANAGED_START = '<!-- nj-schema:start — สร้างด้วย build/schema.js · ห้ามแก้ด้วยมือ -->';
const MANAGED_END = '<!-- nj-schema:end -->';

// หน้าที่ไม่ใส่บล็อกนี้ แม้จะเก็บดัชนีได้ — เขียนเหตุผลกำกับทุกบรรทัด
const SKIP = {
  'land.html': 'หน้าแปลงรายแปลง — ข้อมูลจริงต่างกันทุกแปลง และ land.js ตั้ง JSON-LD ให้ตอนเปิดหน้าอยู่แล้ว ' +
    '(หน้าที่เขียนค่าลงไฟล์จริงมาในสปรินต์ 3)',
};
const FAQ_HEADING = 'คำถามที่พบบ่อย';

// ---------- เครื่องมืออ่าน HTML ----------
function headRange(html) {
  const end = html.indexOf('</head>');
  if (end < 0) return null;
  const openTag = html.slice(0, end).search(/<head[\s>]/i);
  if (openTag < 0) return null;
  return { start: html.indexOf('>', openTag) + 1, end: end };
}
function decode(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function text(html) { return decode(String(html).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim(); }
function metaOf(head, key) {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = head.match(new RegExp('<meta\\b(?=[^>]*\\b(?:name|property)\\s*=\\s*["\']' + k + '["\'])[^>]*>', 'i'));
  if (!m) return '';
  const c = m[0].match(/\bcontent\s*=\s*["']([^"']*)["']/i);
  return c ? decode(c[1]) : '';
}
function titleOf(head) {
  const m = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decode(m[1]).trim() : '';
}
function canonicalOf(head, file) {
  const m = head.match(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i);
  const h = m && m[0].match(/\bhref\s*=\s*["']([^"']*)["']/i);
  if (h) return h[1];
  return file === 'index.html' ? HOME : SITE + '/' + file;
}
function isNoindex(head) { return /noindex/i.test(metaOf(head, 'robots')); }
// ชื่อหน้าใน breadcrumb = <title> ตัดท้ายที่ " | " แล้วตัดคำขยายหลัง " — "
// (รูปแบบนี้ใช้เหมือนกันทุกหน้าอยู่แล้ว — ไม่ได้ตั้งชื่อใหม่ให้หน้าไหน)
function pageName(head) {
  let t = titleOf(head).split('|')[0].trim();
  const dash = t.indexOf(' — ');
  if (dash > 0) t = t.slice(0, dash).trim();
  return t;
}
function stripManaged(head) {
  const s = head.indexOf(MANAGED_START);
  if (s < 0) return head;
  const e = head.indexOf(MANAGED_END, s);
  if (e < 0) return head;
  let from = s;
  while (from > 0 && /[ \t]/.test(head[from - 1])) from--;
  if (head[from - 1] === '\n') from--;
  return head.slice(0, from) + head.slice(e + MANAGED_END.length);
}

// ---------- ข้อมูลบริษัท: อ่านจาก index.html ห้ามพิมพ์ซ้ำ (ข้อ 2) ----------
function readBrand(indexHtml) {
  const head = indexHtml.slice(headRange(indexHtml).start, headRange(indexHtml).end);
  const hand = stripManaged(head);
  const m = hand.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) throw new Error('index.html: ไม่มีบล็อก JSON-LD ที่เขียนด้วยมือ — ข้อมูลบริษัทต้องมาจากที่นั่น');
  let data;
  try { data = JSON.parse(m[1]); } catch (e) { throw new Error('index.html: บล็อก JSON-LD อ่านไม่ออก — ' + e.message); }
  const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
  const typeOf = n => [].concat(n['@type'] || []);
  const org = nodes.find(n => typeOf(n).some(t => /Organization|RealEstateAgent|ProfessionalService|LocalBusiness/.test(t)));
  const site = nodes.find(n => typeOf(n).indexOf('WebSite') >= 0);
  if (!org || !org['@id']) throw new Error('index.html: หาโหนดข้อมูลบริษัท (@id) ในบล็อก JSON-LD ไม่เจอ');
  if (!site || !site['@id']) throw new Error('index.html: หาโหนด WebSite (@id) ในบล็อก JSON-LD ไม่เจอ');
  return {
    org: { '@type': org['@type'], '@id': org['@id'], name: org.name, url: org.url, logo: org.logo },
    site: { '@type': 'WebSite', '@id': site['@id'], url: site.url, name: site.name, inLanguage: site.inLanguage || LANG,
            publisher: { '@id': org['@id'] } },
  };
}

// ---------- คำถามที่พบบ่อยจริงในหน้า (ข้อ 3) ----------
function faqOf(html) {
  if (html.indexOf(FAQ_HEADING) < 0) return [];
  const out = [];
  const re = /<details\b[^>]*>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = re.exec(html))) {
    const inner = m[1];
    const s = inner.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
    if (!s) continue;
    const q = text(s[1]);
    const a = text(inner.slice(inner.indexOf(s[0]) + s[0].length));
    if (!q || !a) continue;              // ถามหรือตอบว่าง = ไม่ใช่คำถามจริง ไม่เอา
    out.push({ q: q, a: a });
  }
  return out;
}

// ---------- คลิปที่มีไฟล์อยู่จริง (ข้อ 4) ----------
function gitDate(rel) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : '';
  } catch (e) { return ''; }
}
function clipsOf(html, warn) {
  const lists = [];
  ['VIDEOS', 'TEAM', 'OFFICE'].forEach(name => {
    const m = html.match(new RegExp('var\\s+' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\]);'));
    if (!m) { warn.push('videos.html: อ่านรายการ ' + name + ' ไม่ออก — คลิปชุดนี้ไม่ถูกใส่ในข้อมูลโครงสร้าง'); return; }
    let arr;
    // รายการคลิปเป็นค่าคงที่ในหน้าเว็บ อ่านด้วย vm ในกล่องเปล่า (ไม่มี require/process ให้เรียก)
    try { arr = vm.runInNewContext('(' + m[1] + ')', Object.create(null), { timeout: 1000 }); }
    catch (e) { warn.push('videos.html: รายการ ' + name + ' ไม่ใช่ค่าคงที่ที่อ่านได้ — ' + e.message); return; }
    if (Array.isArray(arr)) lists.push(arr);
  });
  const out = [];
  lists.forEach(arr => arr.forEach(v => {
    if (!v || !v.id || !v.title) return;
    const dir = v.dir || 'video/';
    const mp4 = dir + v.id + '.mp4', jpg = dir + v.id + '.jpg';
    if (!fs.existsSync(path.join(ROOT, mp4))) { warn.push('ไม่มีไฟล์ ' + mp4 + ' — ข้ามคลิป ' + v.id); return; }
    const up = gitDate(mp4);
    if (!up) { warn.push('ยังไม่เคย commit ' + mp4 + ' — ข้ามคลิป ' + v.id + ' (ไม่เดาวันที่เผยแพร่)'); return; }
    const o = {
      '@type': 'VideoObject',
      '@id': SITE + '/videos.html#' + v.id + '-video',
      name: v.title,
      description: v.desc || v.title,
      contentUrl: SITE + '/' + mp4,
      uploadDate: up,
      inLanguage: LANG,
      isPartOf: { '@id': SITE + '/videos.html#webpage' },
    };
    if (fs.existsSync(path.join(ROOT, jpg))) o.thumbnailUrl = SITE + '/' + jpg;
    out.push(o);
  }));
  return out;
}

// ---------- ประกอบกราฟของหน้าหนึ่ง ----------
function graphFor(file, html, brand, warn) {
  const r = headRange(html);
  if (!r) throw new Error(file + ': หาหัวไฟล์ไม่เจอ');
  const head = stripManaged(html.slice(r.start, r.end));
  if (isNoindex(head)) return null;                   // ข้อ 5

  const url = canonicalOf(head, file);
  const name = pageName(head);
  const desc = metaOf(head, 'description');
  const isHome = file === 'index.html';

  const page = {
    '@type': 'WebPage', '@id': url + '#webpage', url: url, name: name,
    isPartOf: { '@id': brand.site['@id'] }, inLanguage: LANG,
  };
  if (desc) page.description = desc;

  const nodes = [];
  // หน้าแรกมีข้อมูลบริษัท/เว็บไซต์เขียนด้วยมืออยู่แล้วในหน้าเดียวกัน — ไม่ต้องใส่ซ้ำ (ข้อ 2)
  if (!isHome) { nodes.push(brand.org); nodes.push(brand.site); }
  nodes.push(page);

  // เส้นทางของเว็บนี้แบนราบ หน้าแรก → หน้านี้ · หน้าแรกไม่มี breadcrumb (มีขั้นเดียว)
  if (!isHome && name) {
    page.breadcrumb = { '@id': url + '#breadcrumb' };
    nodes.push({
      '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'หน้าแรก', item: HOME },
        { '@type': 'ListItem', position: 2, name: name, item: url },
      ],
    });
  }

  const faq = faqOf(html);
  if (faq.length) {
    nodes.push({
      '@type': 'FAQPage', '@id': url + '#faq', isPartOf: { '@id': url + '#webpage' }, inLanguage: LANG,
      mainEntity: faq.map(x => ({
        '@type': 'Question', name: x.q,
        acceptedAnswer: { '@type': 'Answer', text: x.a },
      })),
    });
  } else if (/<details\b/i.test(html)) {
    warn.push(file + ': มี <details> แต่ไม่มีหัวข้อ "' + FAQ_HEADING + '" — ไม่ใส่ FAQPage (ข้อ 3)');
  }

  if (file === 'videos.html') {
    const clips = clipsOf(html, warn);
    if (clips.length) {
      page.hasPart = clips.map(c => ({ '@id': c['@id'] }));
      clips.forEach(c => nodes.push(c));
    }
  }

  return { '@context': 'https://schema.org', '@graph': nodes };
}

function blockFor(graph) {
  const json = JSON.stringify(graph, null, 2).split('\n').map(l => '  ' + l).join('\n');
  return '  ' + MANAGED_START + '\n' +
    '  <script type="application/ld+json" data-nj-schema>\n' + json + '\n  </script>\n' +
    '  ' + MANAGED_END;
}
function applyToHtml(html, file, brand, warn) {
  const r = headRange(html);
  const head0 = stripManaged(html.slice(r.start, r.end));
  const graph = SKIP[file] ? null : graphFor(file, html, brand, warn);
  const head = graph ? (head0.replace(/\s*$/, '') + '\n' + blockFor(graph) + '\n') : head0;
  return {
    html: html.slice(0, r.start) + head + html.slice(r.end),
    changed: head !== html.slice(r.start, r.end),
    nodes: graph ? graph['@graph'].map(n => [].concat(n['@type'])[0]) : [],
  };
}

// ---------- ตัวรัน ----------
function main() {
  const CHECK = process.argv.indexOf('--check') >= 0;
  const brand = readBrand(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'));
  const warn = [];
  const files = fs.readdirSync(ROOT).filter(f => /\.html$/i.test(f)).sort();
  const rows = [];
  files.forEach(file => {
    const p = path.join(ROOT, file);
    const html = fs.readFileSync(p, 'utf8');
    const r = applyToHtml(html, file, brand, warn);
    if (r.changed) { rows.push({ file: file, nodes: r.nodes }); if (!CHECK) fs.writeFileSync(p, r.html, 'utf8'); }
  });
  console.log('ข้อมูลบริษัทอ่านจาก index.html: ' + brand.org.name + ' (' + brand.org['@id'] + ')');
  console.log('ไฟล์ HTML ที่ตรวจ: ' + files.length + ' หน้า');
  Object.keys(SKIP).forEach(k => console.log('  (ข้าม) ' + k + ' — ' + SKIP[k]));
  if (!rows.length) console.log('ทุกหน้าตรงแล้ว ไม่มีอะไรต้องแก้');
  else {
    rows.forEach(d => console.log('  ' + (CHECK ? '≠ ' : '✓ ') + d.file + '  ' + (d.nodes.join(', ') || '(ไม่ใส่บล็อก)')));
    console.log(CHECK ? '⚠ ' + rows.length + ' หน้าไม่ตรง — รัน `node build/schema.js`' : 'เขียนแล้ว ' + rows.length + ' หน้า');
  }
  if (warn.length) { console.log('\nคำเตือน:'); warn.forEach(w => console.log('  ⚠ ' + w)); }
  return CHECK && rows.length ? 1 : 0;
}

module.exports = {
  SITE, HOME, LANG, SKIP, FAQ_HEADING, MANAGED_START, MANAGED_END,
  headRange, stripManaged, isNoindex, pageName, titleOf, metaOf, canonicalOf, text,
  readBrand, faqOf, clipsOf, graphFor, blockFor, applyToHtml,
};

if (require.main === module) process.exit(main());
