/* สร้างส่วนที่ทุกหน้าใช้ร่วมกัน (หัวเว็บ + สไตล์ชีตกลาง) ลงไฟล์ HTML ทุกหน้า
 *
 *   รันด้วย:  node build/pages.js          (เขียนไฟล์จริง)
 *             node build/pages.js --check  (ตรวจอย่างเดียว ไม่เขียน · ใช้ใน CI)
 *
 * ทำไมต้องมีไฟล์นี้
 * ---------------------------------------------------------------------------
 * เว็บนี้เป็นสแตติกล้วนบน GitHub Pages ไม่มีระบบ include ของฝั่งเซิร์ฟเวอร์
 * หัวเว็บจึงถูก "คัดลอกลง HTML ทีละหน้า" มาตลอด ผลคือตอนตรวจเมื่อ 19 ก.ย. 2569
 * พบเมนู **10 รูปแบบใน 21 หน้า** และสิ่งเดียวกันถูกเรียกด้วยชื่อ 4 แบบ
 * (ซื้อที่ดิน / แปลงที่ดิน / ที่ดินประกาศขาย / ดูประกาศทั้งหมด)
 *
 * ⚠️ **ผลลัพธ์ของสคริปต์นี้ถูก commit ลง repo ตามเดิม** — ไม่ได้เปลี่ยนวิธี deploy
 *    GitHub Pages ยังเสิร์ฟไฟล์จากรากของ repo เหมือนเดิมทุกประการ
 *    (แนวเดียวกับ `build/sitemap.js` ที่สร้าง sitemap.xml แล้ว commit ไว้)
 *
 * ⚠️ **ห้ามแก้ HTML ระหว่างเครื่องหมาย NJ:HEADER ด้วยมือ** — รอบถัดไปจะถูกเขียนทับ
 *    แก้ที่ `NAV` ในไฟล์นี้ที่เดียว แล้วรัน `node build/pages.js`
 *
 * ⚠️ repo นี้เก็บไฟล์เป็น LF แต่ `core.autocrlf=true` แปลงเป็น CRLF ในโฟลเดอร์ทำงาน
 *    สคริปต์นี้จึงอ่านตัวจบบรรทัดของไฟล์เดิมแล้วเขียนกลับด้วยแบบเดียวกัน
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

// ---------------------------------------------------------------------------
// โครงเมนู — แหล่งความจริงเดียวของทั้งเว็บ
//
// ⚠️ **แถวแรกมีได้ 6 กลุ่มเท่านั้น** ของเดิมมี 11 ลิงก์เรียงยาวจนเต็มความกว้างพอดี
//    ที่จอ 1440 (วัดไว้ใน CLAUDE.md) เติมอีกอันเดียวเมนูตัดสองบรรทัดทันที
//    ต้องการเพิ่มปลายทางใหม่ ให้ใส่เป็น `items` ใต้กลุ่มที่มีอยู่ ไม่ใช่เพิ่มกลุ่มที่ 7
//
// ⚠️ `href` ของตัวกลุ่มต้องเป็นหน้าจริงเสมอ ไม่ใช่ '#' — เมนูย่อยเปิดด้วย hover/โฟกัส
//    คนที่กดตัวกลุ่มตรงๆ (และคนที่ JS ไม่ทำงาน) ต้องไปถึงที่ที่ใช้ได้
// ---------------------------------------------------------------------------
const NAV = [
  {
    label: 'ซื้อ/เช่าทรัพย์', href: 'listings.html', items: [
      { label: 'ประกาศทั้งหมด', href: 'listings.html', note: 'กรองตามทำเล ราคา เนื้อที่ ผังสี' },
      { label: 'ค้นตามวัตถุประสงค์', href: 'purpose.html', note: 'สร้างบ้าน โกดัง เกษตร ลงทุน' },
      { label: 'ทรัพย์หน่วยงาน', href: 'agency.html', note: 'บังคับคดี ธนาคาร BAM SAM' },
      { label: 'ฝากหาที่ดิน', href: 'wanted.html', note: 'บอกโจทย์ไว้ ให้ทีมช่างรังวัดหาให้' }
    ]
  },
  {
    label: 'ขาย/ฝากทรัพย์', href: 'consign.html', items: [
      { label: 'ฝากขายที่ดิน', href: 'consign.html', note: 'ไม่มีค่าใช้จ่ายล่วงหน้า' },
      { label: 'แพ็กเกจบริการ', href: 'packages.html', note: 'ตรวจสอบ · เตรียมขาย · ฝากขาย' },
      { label: 'สมัครเป็นพันธมิตร', href: 'partner-apply.html', note: 'ผู้ให้บริการด้านที่ดิน' }
    ]
  },
  {
    label: 'ตรวจสอบและรังวัด', href: 'verify.html', items: [
      { label: 'บริการของเรา', href: 'services.html', note: 'รังวัด ตรวจสอบ และดูแลหลังซื้อ' },
      { label: 'ส่งทรัพย์ให้ตรวจก่อนซื้อ', href: 'verify.html', note: 'ตรวจเอกสารและแนวเขต' },
      { label: 'นัดตรวจแปลงก่อนซื้อ', href: 'inspect.html', note: 'ให้ช่างรังวัดไปดูให้ก่อน' },
      { label: 'ระดับการตรวจสอบ 5 ระดับ', href: 'terms.html#levels', note: 'แต่ละระดับหมายถึงอะไร' }
    ]
  },
  {
    label: 'ความรู้และเครื่องมือ', href: 'guides.html', items: [
      { label: 'คู่มือที่ดิน', href: 'guides.html', note: 'เอกสารสิทธิ์ การโอน ผังเมือง' },
      { label: 'เครื่องมือคำนวณ', href: 'tools.html', note: 'ค่างวดสินเชื่อ ค่าโอนวันโอน' },
      { label: 'วิดีโอให้ความรู้', href: 'videos.html', note: 'ดูจบใน 30 วินาที' },
      { label: 'แชทกับน้องเอ็นเจชัวร์', href: 'chat.html', note: 'ผู้ช่วย AI ตอบเรื่องที่ดิน' }
    ]
  },
  { label: 'เกี่ยวกับเรา', href: 'index.html#ทีมเรา' },
  { label: 'ติดตามงาน', href: 'portal.html', portal: true }
];

const CTA = { label: 'ฝากขายฟรี', href: 'consign.html' };

// สไตล์ชีตกลาง — ต้องมาก่อนไฟล์อื่นเสมอ (tokens ถูกทับได้ แต่ทับใครไม่ได้)
const CORE_CSS = ['tokens.css', 'components.css', 'header.css'];

const START = '<!-- NJ:HEADER เริ่ม — สร้างด้วย build/pages.js ห้ามแก้ด้วยมือ -->';
const END = '<!-- NJ:HEADER จบ -->';
const CSS_START = '<!-- NJ:CORECSS เริ่ม — สร้างด้วย build/pages.js ห้ามแก้ด้วยมือ -->';
const CSS_END = '<!-- NJ:CORECSS จบ -->';

// สคริปต์กลาง — ต้องอยู่ทุกหน้า ไม่ใช่เฉพาะหน้าที่มีฟอร์ม
//
// ⚠️ `attrib.js` เก็บ "สัมผัสแรก" ของผู้ใช้ ซึ่งเกิดที่หน้าไหนก็ได้ ไม่ใช่หน้าฟอร์ม
//    คนคลิกโฆษณาเข้าหน้าแปลง อ่านสามหน้า แล้วค่อยไปกรอกฟอร์ม — ถ้าโหลดเฉพาะหน้าฟอร์ม
//    เราจะบันทึกว่าเขามาจาก "ในเว็บเราเอง" ทุกราย ซึ่งไร้ประโยชน์ทั้งหมด
// ⚠️ ใช้ `defer` เพื่อไม่ให้บล็อกการวาดหน้า และให้รันก่อน DOMContentLoaded เสมอ
const CORE_JS = ['fontcss.js', 'attrib.js'];

const JS_START = '<!-- NJ:COREJS เริ่ม — สร้างด้วย build/pages.js ห้ามแก้ด้วยมือ -->';
const JS_END = '<!-- NJ:COREJS จบ -->';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// หน้าไหนถือว่า "อยู่ในกลุ่มนี้" — ใช้ตัดสิน aria-current
function pageOf(href) { return String(href).split('#')[0].split('?')[0]; }

function headerHtml(file, NL) {
  const cur = file;
  const L = [];
  L.push(START);
  L.push('<a class="njh-skip" href="#main">ข้ามไปเนื้อหาหลัก</a>');
  L.push('<header class="njh" data-njh>');
  L.push('  <div class="njh-in">');
  L.push('    <a class="njh-brand" href="index.html">');
  L.push('      <img src="brand/logo-mark.svg" alt="" width="34" height="34">');
  L.push('      <span><b>ที่ดินชัวร์</b><small>TEEDIN SURE</small></span>');
  L.push('    </a>');
  L.push('    <nav class="njh-nav" aria-label="เมนูหลัก">');
  L.push('      <ul class="njh-list">');
  for (const g of NAV) {
    const inGroup = pageOf(g.href) === cur ||
      (g.items || []).some(it => pageOf(it.href) === cur);
    const cls = 'njh-item' + (g.items ? ' njh-has-menu' : '');
    L.push('        <li class="' + cls + '">');
    L.push('          <a class="njh-top" href="' + esc(g.href) + '"' +
      (inGroup ? ' aria-current="page"' : '') +
      (g.portal ? ' data-njportal' : '') + '>' + esc(g.label) +
      (g.items ? '<span class="njh-caret" aria-hidden="true">▾</span>' : '') + '</a>');
    if (g.items) {
      L.push('          <div class="njh-panel">');
      L.push('            <ul>');
      for (const it of g.items) {
        L.push('              <li><a href="' + esc(it.href) + '"' +
          (pageOf(it.href) === cur ? ' aria-current="page"' : '') + '>' +
          '<b>' + esc(it.label) + '</b>' +
          (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</a></li>');
      }
      L.push('            </ul>');
      L.push('          </div>');
    }
    L.push('        </li>');
  }
  L.push('      </ul>');
  L.push('    </nav>');
  L.push('    <a class="njh-cta" href="' + esc(CTA.href) + '">' + esc(CTA.label) + '</a>');
  L.push('  </div>');
  L.push('</header>');
  L.push(END);
  return L.join(NL);
}

// หนีอักขระพิเศษของ regex — ใช้กับเครื่องหมายเปิด/ปิดบล็อกที่มี `$`, `(`, `[` ปนอยู่
function rx(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function cssHtml(NL) {
  return [CSS_START]
    .concat(CORE_CSS.map(f => '<link rel="stylesheet" href="' + f + '">'))
    .concat([CSS_END]).join(NL);
}

function jsHtml(NL) {
  return [JS_START]
    .concat(CORE_JS.map(f => '<script src="' + f + '" defer></script>'))
    .concat([JS_END]).join(NL);
}

// ---------------------------------------------------------------------------
function build() {
  const files = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  const changed = [];
  const problems = [];

  for (const file of files) {
    const full = path.join(ROOT, file);
    let src = fs.readFileSync(full, 'utf8');
    const NL = src.includes('\r\n') ? '\r\n' : '\n';
    const before = src;

    // ---- 1) สไตล์ชีตกลาง ต้องเป็นชุดแรกใน <head> ----
    const css = cssHtml(NL);
    if (src.includes(CSS_START)) {
      src = src.replace(new RegExp(CSS_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + CSS_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), css);
    } else {
      // วางไว้ก่อน <link rel="stylesheet"> ตัวแรกของหน้า · ไม่มีเลยก็วางก่อน </head>
      const m = src.match(/[ \t]*<link[^>]+rel="stylesheet"[^>]*>/);
      if (m) src = src.replace(m[0], css + NL + m[0]);
      else src = src.replace('</head>', css + NL + '</head>');
    }

    // ---- 1ข) สคริปต์กลาง ----
    const js = jsHtml(NL);
    if (src.includes(JS_START)) {
      src = src.replace(new RegExp(rx(JS_START) + '[\\s\\S]*?' + rx(JS_END)), js);
    } else {
      // วางต่อท้ายบล็อกสไตล์ชีตกลาง — ยังอยู่ใน <head> และมาก่อนสคริปต์ของหน้าเสมอ
      src = src.replace(CSS_END, CSS_END + NL + js);
    }

    // ---- 2) หัวเว็บ ----
    //
    // ⚠️ **ต้องวางเป็นลูกตัวแรกของ `<body>` เสมอ ห้ามวางทับที่เดิมของแต่ละหน้า**
    // ของเดิมใช้วิธีแทนที่ `<header>` ตรงที่มันอยู่ ซึ่งพังบนหน้าแรก เพราะที่นั่น
    // `<header>` ซ้อนอยู่ใน `<div style="overflow-x:hidden">` → `<section data-r="hero">`
    // · บรรพบุรุษที่มี `overflow` ไม่ใช่ `visible` ทำให้ `position:sticky` **ไม่ทำงานเลย**
    // · และต่อให้ทำงาน มันก็หนึบอยู่ได้แค่ในกรอบของ hero แล้วเลื่อนหายไปพร้อม hero
    // เจอจริงหลัง Sprint 1 — หัวเว็บบนหน้าแรกไม่หนึบทั้งที่ CSS ถูกต้อง
    const head = headerHtml(file, NL);
    // ถอดของเก่าออกก่อน (ไม่ว่าจะอยู่ที่ไหน) แล้วค่อยวางใหม่ที่ตำแหน่งที่ถูกต้อง
    if (src.includes(START)) {
      src = src.replace(new RegExp('[ \\t]*' + START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\r?\\n?'), '');
    } else {
      const m = src.match(/[ \t]*<header[\s\S]*?<\/header>\r?\n?/);
      if (!m) { problems.push(file + ' — ไม่พบ <header> ให้แทนที่'); continue; }
      src = src.replace(m[0], '');
      // ลิงก์ข้ามไปเนื้อหาหลักซ้ำกับของเดิม (สามหน้านโยบายใส่ไว้เองก่อนหน้านี้)
      src = src.replace(/[ \t]*<a class="skip-link" href="#main">[^<]*<\/a>\r?\n/, '');
    }
    const bodyOpen = src.match(/<body[^>]*>/);
    if (!bodyOpen) { problems.push(file + ' — ไม่พบ <body>'); continue; }
    const at = src.indexOf(bodyOpen[0]) + bodyOpen[0].length;
    // ⚠️ ต้องล้างช่องว่างหลัง <body> ให้หมดก่อนวางใหม่ทุกครั้ง
    //    ไม่ล้าง = รันซ้ำแล้วบรรทัดว่างงอกขึ้นเรื่อยๆ และ `--check` จะบอกว่าไฟล์ไม่ตรงตลอดไป
    const rest = src.slice(at).replace(/^[\s\r\n]+/, '');
    src = src.slice(0, at) + NL + head + NL + NL + rest;

    // ---- 3) เนื้อหาหลักต้องมีที่ยึด #main ----
    //
    // ⚠️ **สคริปต์นี้เป็นคนใส่ลิงก์ "ข้ามไปเนื้อหาหลัก" (href="#main") จึงต้องรับผิดชอบ
    //    ให้ปลายทางมีอยู่จริงด้วย** — ตรวจ 20 ก.ย. 2569 พบว่า 21 จาก 25 หน้ามีลิงก์นี้
    //    แต่ **ไม่มี id="main" เลย** ลิงก์จึงพาไปไหนไม่ได้ตั้งแต่ Sprint 1
    //    (a11y.test.js หัวข้อ 5 ล็อกไว้แล้ว)
    // ⚠️ หน้าที่ยังไม่มี <main> ให้ห่อทุกอย่างระหว่างท้ายหัวเว็บกับ <footer> —
    //    ได้ทั้งที่ยึดของลิงก์ข้าม และได้ landmark ที่เครื่องอ่านหน้าจอใช้กระโดดด้วย
    if (!/id="main"/.test(src)) {
      const mainTag = src.match(/<main[^>]*>/);
      if (mainTag) {
        src = src.replace(mainTag[0], mainTag[0].replace(/^<main/, '<main id="main"'));
      } else {
        const at = src.indexOf(END);
        const foot = src.indexOf('<footer');
        if (at < 0 || foot < 0 || foot < at) { problems.push(file + ' — ห่อ <main> ไม่ได้ (ไม่เจอหัวเว็บหรือ <footer>)'); }
        else {
          const from = at + END.length;
          const inner = src.slice(from, foot);
          src = src.slice(0, from) + NL + '<main id="main">' + inner.replace(/\s+$/, '') + NL + '</main>' + NL + src.slice(foot);
        }
      }
    }

    if (src !== before) {
      changed.push(file);
      if (!CHECK) fs.writeFileSync(full, src);
    }
  }

  if (problems.length) {
    console.log('\n⛔ มีปัญหา');
    problems.forEach(p => console.log('   ' + p));
  }
  if (CHECK) {
    if (changed.length) {
      console.log('\n⛔ ไฟล์เหล่านี้ไม่ตรงกับ build/pages.js — ต้องรัน `node build/pages.js` แล้ว commit ผลลัพธ์');
      changed.forEach(f => console.log('   ' + f));
    } else {
      console.log('\n✅ ทุกหน้าตรงกับ build/pages.js แล้ว (' + files.length + ' หน้า)');
    }
    process.exit(changed.length || problems.length ? 1 : 0);
  }

  console.log('\nหัวเว็บ + สไตล์ชีตกลาง — เขียนแล้ว ' + changed.length + ' จาก ' + files.length + ' หน้า');
  changed.forEach(f => console.log('  ✎ ' + f));
  if (problems.length) process.exit(1);
}

build();
