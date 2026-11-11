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
// ทางเข้าบัญชีเจ้าของทรัพย์ (เจ้าของสั่งเพิ่มในเมนู 26 ก.ย. 2569)
// ⚠️ ชี้ไป seller.html บนโดเมนระบบ **ห้ามทำฟอร์มรหัสผ่านไว้บนเว็บนี้** (กรอกรหัสข้ามโดเมน
//    = หน้าตาเหมือนหน้าหลอกขโมยรหัส · เว็บนี้เป็นสแตติก ไม่มีฝั่งเซิร์ฟเวอร์)
// หน้านั้นเข้าสู่ระบบด้วยอีเมลหรือ LINE → ดูทุกแปลงที่ฝาก · ใบเสนอราคาจากทีม · กดยืนยันก่อนประกาศ
// เป็นลิงก์เดียวในเมนูที่ไม่ใช่ไฟล์ในเว็บนี้ — header.test.js ยกเว้นเฉพาะโดเมน app.njteedinsure.com
const SELLER_LOGIN = 'https://app.njteedinsure.com/seller.html';
// ปุ่มหลักบนหัวเว็บพาไปสมัครบัญชีเจ้าของทรัพย์ทันที (เจ้าของสั่ง 14 ต.ค. 2569 — ฝากขายต้องลงทะเบียนก่อน)
// ⚠️ ส่งแค่ #start=consign&tab=register (fragment ไม่ไปกับคำขอ HTTP) · ห้ามส่งชื่อ/เบอร์ทาง URL
const SELLER_REGISTER = SELLER_LOGIN + '#start=consign&tab=register';

const NAV = [
  {
    label: 'ซื้อ/เช่าทรัพย์', href: 'listings.html', all: true,
    desc: 'ทุกแปลงแสดงระดับข้อมูลที่ตรวจสอบแล้ว',
    feat: { img: 'listings', tag: 'ประกาศ', title: 'ดูแปลงที่ประกาศอยู่ตอนนี้', sub: 'กรองตามทำเล ราคา เนื้อที่ ผังสี', href: 'listings.html' },
    items: [
      { icon: 'list', label: 'ประกาศทั้งหมด', href: 'listings.html', note: 'กรองตามทำเล ราคา เนื้อที่ ผังสี' },
      { icon: 'target', label: 'ค้นตามวัตถุประสงค์', href: 'purpose.html', note: 'สร้างบ้าน โกดัง เกษตร ลงทุน' },
      { icon: 'bank', label: 'ทรัพย์หน่วยงาน', href: 'agency.html', note: 'บังคับคดี ธนาคาร BAM SAM' },
      { icon: 'find', label: 'ฝากหาที่ดิน', href: 'wanted.html', note: 'บอกโจทย์ไว้ ให้ทีมช่างรังวัดหาให้' }
    ]
  },
  {
    // ตัวกลุ่มพาไปสมัครบัญชีเจ้าของทรัพย์ตรง (เจ้าของสั่ง 14 ต.ค. 2569 · ฝากขายต้องสมัครก่อน)
    // `pages` = หน้าที่นับว่าอยู่ในกลุ่มนี้ทั้งที่ไม่มีรายการของตัวเอง → consign.html ยังได้ aria-current ที่ตัวกลุ่ม
    label: 'ขาย/ฝากทรัพย์', href: SELLER_REGISTER, pages: ['consign.html'],
    desc: 'ฝากขาย ฝากเช่า และบริการสำหรับเจ้าของทรัพย์',
    feat: { img: 'consign', tag: 'ลงประกาศฟรี', title: 'สมัครเพื่อฝากขาย', sub: 'ทีมงานเสนอราคาค่าตรวจสอบ/รังวัดให้ก่อนขึ้นประกาศ', href: SELLER_REGISTER },
    items: [
      // เมนูย่อย "ฝากขายที่ดิน" ถูกซ่อน (เจ้าของสั่ง 14 ต.ค. 2569) — ฝากขายต้องสมัครก่อน ทางเข้าคือปุ่ม CTA "สมัครเพื่อฝากขาย"
      //   ตัวกลุ่มยังชี้ consign.html (หน้าอธิบายบริการ + ด่านสมัคร) · header.test.js ล็อก
      { icon: 'box', label: 'แพ็กเกจบริการ', href: 'packages.html', note: 'ตรวจสอบ · เตรียมขาย · ฝากขาย' },
      { icon: 'user', label: 'เข้าสู่ระบบเจ้าของทรัพย์', href: SELLER_LOGIN, note: 'ดูแปลงที่ฝาก · ใบเสนอราคา · ยืนยันก่อนประกาศ' },
      { icon: 'hands', label: 'สมัครเป็นพันธมิตร', href: 'partner-apply.html', note: 'ผู้ให้บริการด้านที่ดิน' }
    ]
  },
  {
    label: 'ตรวจสอบและรังวัด', href: 'verify.html', all: true,
    desc: 'ตรวจเอกสารและแนวเขตก่อนตัดสินใจ โดยทีมช่างรังวัดเอกชน',
    feat: { img: 'verify', tag: 'ก่อนวางมัดจำ', title: 'ส่งทรัพย์ให้ตรวจก่อนซื้อ', sub: 'ตรวจเอกสารและแนวเขต', href: 'verify.html' },
    items: [
      { icon: 'survey', label: 'บริการของเรา', href: 'services.html', note: 'รังวัด ตรวจสอบ และดูแลหลังซื้อ' },
      { icon: 'doc', label: 'ส่งทรัพย์ให้ตรวจก่อนซื้อ', href: 'verify.html', note: 'ตรวจเอกสารและแนวเขต' },
      { icon: 'cal', label: 'นัดตรวจแปลงก่อนซื้อ', href: 'inspect.html', note: 'ให้ช่างรังวัดไปดูให้ก่อน' },
      { icon: 'check', label: 'เช็กลิสต์ก่อนซื้อ', href: 'checklist.html', note: '16 ข้อที่ควรตรวจก่อนวางมัดจำ' },
      { icon: 'shield', label: 'ระดับการตรวจสอบ 2 ระดับ', href: 'terms.html#levels', note: 'แต่ละระดับหมายถึงอะไร' }
    ]
  },
  {
    label: 'ความรู้และเครื่องมือ', href: 'guides.html', all: true,
    desc: 'คู่มือ บทความ และเครื่องคำนวณสำหรับคนซื้อ–ขายที่ดิน',
    feat: { img: 'guides', tag: 'ความรู้', title: 'คู่มือที่ดิน', sub: 'เอกสารสิทธิ์ การโอน ผังเมือง', href: 'guides.html' },
    items: [
      { icon: 'book', label: 'คู่มือที่ดิน', href: 'guides.html', note: 'เอกสารสิทธิ์ การโอน ผังเมือง' },
      { icon: 'article', label: 'บทความความรู้', href: 'knowledge.html', note: 'ก่อนซื้อ รังวัด ขาย กฎหมาย ภาษี' },
      { icon: 'calc', label: 'เครื่องมือคำนวณ', href: 'tools.html', note: 'ค่างวดสินเชื่อ ค่าโอนวันโอน' },
      { icon: 'video', label: 'วิดีโอให้ความรู้', href: 'videos.html', note: 'ดูจบใน 30 วินาที' },
      { icon: 'news', label: 'วารสาร', href: 'journal.html', note: 'สรุปข่าวที่ดินและกฎหมายรายสัปดาห์' },
      { icon: 'chat', label: 'แชทกับน้องเอ็นเจชัวร์', href: 'chat.html', note: 'ผู้ช่วย AI ตอบเรื่องที่ดิน' }
    ]
  },
  // หน้าแยก about.html (เจ้าของอนุมัติ 2 พ.ย. 2569) · หน้าแรกยังมีกล่องย่อ #ทีมเรา ที่ลิงก์มาหน้านี้
  { label: 'เกี่ยวกับเรา', href: 'about.html' },
  { label: 'ติดตามงาน', href: 'portal.html', portal: true }
];

const CTA = { label: 'สมัครเพื่อฝากขาย', href: SELLER_REGISTER };

// สไตล์ชีตกลาง — ต้องมาก่อนไฟล์อื่นเสมอ (tokens ถูกทับได้ แต่ทับใครไม่ได้)
// ⚠️ fonts.css ต้องมาก่อนเสมอ — เป็น @font-face ที่เสิร์ฟเอง (ดู build/fonts.js)
//    ของเดิมดึงจาก Google Fonts ซึ่งเป็นคนละโดเมน 2 โดเมน ทำให้ LCP ช้ากว่า ~160 ms
const CORE_CSS = ['fonts.css', 'tokens.css', 'components.css', 'header.css'];

// เปิดการเชื่อมต่อไปโดเมนของระบบหลังบ้านล่วงหน้า
//
// ⚠️ รูปการ์ดประกาศและข้อมูลทุกหน้ามาจาก app.njteedinsure.com ซึ่งเป็น **คนละโดเมน**
//    เบราว์เซอร์จึงต้องทำ DNS + TLS ก่อนจะเริ่มโหลดรูปใบแรกได้
//    Lighthouse (mobile) ตีว่าเสียเวลาไปกับเรื่องนี้ราว 310 ms
//    ⚠️ ต้องมี `crossorigin` เพราะรูปและ fetch เป็นคำขอข้ามโดเมน — ไม่ใส่แล้วได้การเชื่อมต่อ
//       ผิดชนิด เบราว์เซอร์ต้องเปิดใหม่อยู่ดี (เตือนไว้เพราะมองไม่เห็นจากหน้าจอ)
const PRECONNECT = ['https://app.njteedinsure.com'];

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
const CORE_JS = ['lazycss.js', 'attrib.js'];

const JS_START = '<!-- NJ:COREJS เริ่ม — สร้างด้วย build/pages.js ห้ามแก้ด้วยมือ -->';
const JS_END = '<!-- NJ:COREJS จบ -->';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// หน้าไหนถือว่า "อยู่ในกลุ่มนี้" — ใช้ตัดสิน aria-current
function pageOf(href) { return String(href).split('#')[0].split('?')[0]; }

// หน้าที่ไม่มีรายการของตัวเองในเมนู แต่เป็นหน้าคู่ของรายการหนึ่ง — ให้ทำเครื่องหมายหน้าปัจจุบันที่รายการนั้น
// (เช็กลิสต์ห้องชุดเป็นหน้าคู่ของเช็กลิสต์ที่ดิน · แถวเมนูเต็มแล้ว เพิ่มรายการใหม่ไม่ได้)
const CURRENT_AS = { 'checklist-condo.html': 'checklist.html' };

// ⭐ เมนูย่อยแบบ B "เมกะเมนู" (เจ้าของเลือก 12 พ.ย. 2569 จากตัวอย่าง menu-redesign-2026-11-11)
//    แผงเต็มความกว้าง: หัวกลุ่ม (desc + ดูทั้งหมด) · รายการ 2 คอลัมน์พร้อมไอคอน · การ์ดภาพแนะนำ (feat)
//    ⚠️ ไอคอนวางท้ายลิงก์ใน HTML (หลัง <b>/<small>) แล้ว CSS ย้ายไปซ้าย — header.test.js อ่านว่า <a ...><b>ชื่อ</b>
//    ⚠️ ภาพการ์ดใส่เป็น data-bg (ไม่ใช่ <img>) — menu.js โหลดเมื่อเมาส์/โฟกัสแตะเมนูครั้งแรก
//       ใส่ <img> = ทุกหน้าบนจอคอมโหลดภาพ 4 ใบทั้งที่ไม่มีใครเปิดเมนู · ไม่มี JS = การ์ดพื้นกรมท่า ยังกดได้
//    ⚠️ ลิงก์ "ดูทั้งหมด" และการ์ดภาพไม่อยู่ใน <li> — menu.js หยิบเฉพาะ `.njh-panel li > a` ไปลิ้นชักมือถือ
const ICONS = {
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  find: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',
  hands: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3 2.7-5 6-5 1.6 0 3 .5 4 1.2 1-.7 2.4-1.2 4-1.2 3.3 0 6 2 6 5"/>',
  survey: '<path d="M12 3v4M7 21l5-14 5 14M8.5 16h7"/>',
  doc: '<path d="M14 3H6v18h12V7l-4-4z"/><path d="M14 3v4h4M9 14l2 2 4-4"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3"/>',
  check: '<path d="M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
  book: '<path d="M4 4.5h6a2.5 2.5 0 012.5 2.5v13a2 2 0 00-2-2H4zM20 4.5h-6A2.5 2.5 0 0011.5 7v13a2 2 0 012-2H20z"/>',
  article: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7M8.5 11.5h7M8.5 15.5h4"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 01-2-2z"/><path d="M17 9h3v8a2 2 0 01-2 2M7.5 9h6M7.5 12.5h6M7.5 16h3"/>',
  chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>'
};
function iconHtml(k) {
  if (!ICONS[k]) throw new Error('ไม่รู้จักไอคอนเมนู: ' + k);
  return '<span class="njh-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" focusable="false">' + ICONS[k] + '</svg></span>';
}

function headerHtml(file, NL) {
  const cur = CURRENT_AS[file] || file;
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
    const inGroup = pageOf(g.href) === cur || (g.pages || []).indexOf(cur) >= 0 ||
      (g.items || []).some(it => pageOf(it.href) === cur);
    const cls = 'njh-item' + (g.items ? ' njh-has-menu' : '');
    L.push('        <li class="' + cls + '">');
    L.push('          <a class="njh-top" href="' + esc(g.href) + '"' +
      (inGroup ? ' aria-current="page"' : '') +
      (g.portal ? ' data-njportal' : '') + '>' + esc(g.label) +
      (g.items ? '<span class="njh-caret" aria-hidden="true">▾</span>' : '') + '</a>');
    if (g.items) {
      L.push('          <div class="njh-panel">');
      L.push('           <div class="njh-mega">');
      L.push('            <div class="njh-mh"><p class="njh-mh-t">' + esc(g.label) + '</p>' +
        (g.desc ? '<p class="njh-mh-d">' + esc(g.desc) + '</p>' : '') +
        (g.all ? '<a class="njh-all" href="' + esc(g.href) + '">ดูทั้งหมด<span class="nj-sr-only"> ใน' + esc(g.label) + '</span> <span aria-hidden="true">→</span></a>' : '') +
        '</div>');
      L.push('            <ul>');
      for (const it of g.items) {
        L.push('              <li><a href="' + esc(it.href) + '"' +
          (pageOf(it.href) === cur ? ' aria-current="page"' : '') + '>' +
          '<b>' + esc(it.label) + '</b>' +
          (it.note ? '<small>' + esc(it.note) + '</small>' : '') +
          (it.icon ? iconHtml(it.icon) : '') + '</a></li>');
      }
      L.push('            </ul>');
      if (g.feat) {
        const f = g.feat;
        L.push('            <a class="njh-feat" href="' + esc(f.href) + '" tabindex="-1">' +
          '<span class="njh-feat-img" data-bg="/photos/menu/' + esc(f.img) + '.webp" aria-hidden="true"></span>' +
          '<span class="njh-feat-tx"><em>' + esc(f.tag) + '</em><strong>' + esc(f.title) + '</strong><small>' + esc(f.sub) + '</small></span></a>');
      }
      L.push('           </div>');
      L.push('          </div>');
    }
    L.push('        </li>');
  }
  L.push('      </ul>');
  L.push('    </nav>');
  // ปุ่มเข้าสู่ระบบบนแถวหัวเว็บ — ต้องเห็นทุกขนาดจอ (เจ้าของสั่ง 10 ต.ค. 2569: "หน้าเข้าสู่ระบบหายไป")
  // ⚠️ ของเดิมซ่อนทั้งปุ่มที่จอต่ำกว่า 1280 → โน้ตบุ๊ก/แท็บเล็ต/มือถือหาทางเข้าไม่เจอ
  //    ตอนนี้ต่ำกว่า 1280 เหลือไอคอนรูปคน 44px (header.css ซ่อนข้อความ) เมนูจึงไม่ตัดบรรทัดเหมือนเดิม
  //    aria-label คงคำว่า "เข้าสู่ระบบ" ไว้ — โปรแกรมอ่านหน้าจออ่านได้แม้ข้อความถูกซ่อน
  L.push('    <a class="njh-login" href="' + esc(SELLER_LOGIN) + '" aria-label="เข้าสู่ระบบเจ้าของทรัพย์" title="เข้าสู่ระบบเจ้าของทรัพย์ — ลงประกาศฟรี ดูแปลงที่ฝากและใบเสนอราคา">' +
    '<svg class="njh-login-ic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '<span class="njh-login-t">เข้าสู่ระบบ</span></a>');
  L.push('    <a class="njh-cta" href="' + esc(CTA.href) + '">' + esc(CTA.label) + '</a>');
  L.push('  </div>');
  L.push('</header>');
  L.push(END);
  return L.join(NL);
}

// หนีอักขระพิเศษของ regex — ใช้กับเครื่องหมายเปิด/ปิดบล็อกที่มี `$`, `(`, `[` ปนอยู่
function rx(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ⚠️ **หน้า 404 ต้องใช้ที่อยู่ไฟล์แบบเต็มจากราก (/…) ทั้งหมด**
//    GitHub Pages เสิร์ฟ 404.html ที่ "ที่อยู่ที่คนเปิดมา" ไม่ใช่ที่ราก — เปิด /journal/<slug>/ ที่ยังไม่มี
//    แล้วเบราว์เซอร์ไปหา /journal/<slug>/tokens.css แทน → หน้าไม่มีสไตล์เลย เมนูกลายเป็นรายการหัวข้อ
//    (เจอจริง 29 ก.ย. 2569 ตอนวารสารฉบับที่ 2 ยังไม่ถูกสร้าง) · กติกาเดียวกับ build/journal.js
const ROOT_ABS = new Set(['404.html']);
function absolutize(s) {
  return s.replace(/(\s(?:href|src)=")(?!https?:|\/\/|#|mailto:|tel:|data:|\/)([^"]+)(")/g, (m, p1, p2, p3) => p1 + '/' + p2 + p3);
}

function cssHtml(NL) {
  return [CSS_START]
    .concat(PRECONNECT.map(u => '<link rel="preconnect" href="' + u + '" crossorigin>'))
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
    const fix = ROOT_ABS.has(file) ? absolutize : (s => s);

    // ---- 1) สไตล์ชีตกลาง ต้องเป็นชุดแรกใน <head> ----
    const css = fix(cssHtml(NL));
    if (src.includes(CSS_START)) {
      src = src.replace(new RegExp(CSS_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + CSS_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), css);
    } else {
      // วางไว้ก่อน <link rel="stylesheet"> ตัวแรกของหน้า · ไม่มีเลยก็วางก่อน </head>
      const m = src.match(/[ \t]*<link[^>]+rel="stylesheet"[^>]*>/);
      if (m) src = src.replace(m[0], css + NL + m[0]);
      else src = src.replace('</head>', css + NL + '</head>');
    }

    // ---- 1ข) สคริปต์กลาง ----
    const js = fix(jsHtml(NL));
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
    const head = fix(headerHtml(file, NL));
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
