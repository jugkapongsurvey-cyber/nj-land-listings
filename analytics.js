// ---------------------------------------------------------------------------
// ที่ดินชัวร์ — ตัวเก็บสถิติกลาง (Meta Pixel + Google Analytics 4 + สถิติภายในของเราเอง)
//
// ⚠️ กรอก ID 2 ค่าข้างล่างก่อนยิงโฆษณา — ถ้าเว้นว่างไว้ ไฟล์นี้จะ "ไม่โหลดสคริปต์ภายนอกเลย"
//    (เว็บทำงานปกติทุกอย่าง แค่ไม่มีข้อมูลส่งเข้า Meta/Google) จึงปลอดภัยที่จะ deploy ทั้งที่ยังว่างอยู่
//
//    META_PIXEL_ID : business.facebook.com → ตัวจัดการเหตุการณ์ (Events Manager) → เชื่อมต่อแหล่งข้อมูล
//                    → เว็บ → Meta Pixel → ตั้งชื่อ "ที่ดินชัวร์" → คัดลอกตัวเลข 15-16 หลัก
//    GA4_ID        : analytics.google.com → ผู้ดูแลระบบ → สร้างพร็อพเพอร์ตี้ → สตรีมข้อมูลเว็บ
//                    → คัดลอกรหัสวัดผลที่ขึ้นต้นด้วย G-
// ---------------------------------------------------------------------------
var META_PIXEL_ID = '2478386206003868';   // ชุดข้อมูล 'ที่ดินชัวร์' ในพอร์ตโฟลิโอ NJ GROUP
var GA4_ID        = '';        // เช่น 'G-XXXXXXXXXX'

// ระบบงานรังวัดของเราเอง — เก็บสถิติแบบไม่มีคุกกี้ ไม่มี PII ใช้ตัดสินเกณฑ์ผ่าน Phase 2
var NJ_API_BASE = 'https://nj-survey-system.onrender.com';

// ---------------------------------------------------------------------------
// ช่องทางติดต่อ — ประกาศไว้ที่เดียว ทุกหน้าโหลด analytics.js อยู่แล้ว
// (LINE ยังกระจายอยู่หลายไฟล์จากของเดิม · ของใหม่ให้อ้างจากตรงนี้)
//
// m.me ใช้ "ชื่อผู้ใช้ของเพจ" ไม่ใช่ชื่อเพจ — ถ้าเปลี่ยนชื่อผู้ใช้เพจเมื่อไหร่ ลิงก์นี้จะพังทันที
// ตรวจได้ที่เพจ → เกี่ยวกับ → ชื่อผู้ใช้ (ต้องตรงกับที่อยู่ facebook.com/<ชื่อผู้ใช้>)
// ---------------------------------------------------------------------------
var NJ_MESSENGER_URL = 'https://m.me/NJTeeDinSure';
var NJ_FB_PAGE_URL   = 'https://www.facebook.com/NJTeeDinSure/';
var NJ_LINE_OA_ID    = '@716lffzt';

// ---------------------------------------------------------------------------
// รหัสพนักงานที่แชร์คลิป — มาจาก ?e= ท้ายลิงก์ที่พนักงานแชร์ (เช่น /s/?e=som)
//
// เก็บใน sessionStorage ไม่ใช่ localStorage โดยตั้งใจ: เครดิตควรผูกกับ "การเข้าครั้งนี้"
// ถ้าเก็บข้ามวันไว้ คนที่เคยกดลิงก์ของสมชายเมื่อเดือนก่อน แล้ววันนี้เข้าเว็บเองแล้วทักเข้ามา
// จะถูกนับเป็นผลงานของสมชายทั้งที่ไม่เกี่ยว — และไม่ใช่ PII เพราะเป็นรหัสพนักงานเรา ไม่ใช่ของผู้ใช้
//
// ⚠️ ค่านี้ถูกเอาไปต่อท้ายข้อความที่ลูกค้าจะกดส่งเข้า LINE จึงต้องกรองให้เหลือแค่ a-z0-9
//    รหัสที่ผิดรูปแบบให้ทิ้งไปเลย ไม่ใช่ตัดตัวอักษรแปลกออกแล้วใช้ต่อ
// ---------------------------------------------------------------------------
var NJ_REF_KEY = 'njts_ref';
function njRef() {
  try { return sessionStorage.getItem(NJ_REF_KEY) || ''; } catch (e) { return ''; }
}
(function captureRef() {
  var m = /[?&]e=([^&#]*)/.exec(location.search);
  if (!m) return;
  var code;
  try { code = decodeURIComponent(m[1]).toLowerCase(); } catch (e) { return; }
  if (!/^[a-z0-9]{2,8}$/.test(code)) return;
  try { sessionStorage.setItem(NJ_REF_KEY, code); } catch (e) { /* โหมดส่วนตัวเขียนไม่ได้ ถือว่าไม่มีรหัส */ }
})();

// ลิงก์เปิดแชท LINE OA พร้อมพิมพ์ข้อความรอไว้ให้ลูกค้ากดส่ง
// นี่คือจุดเดียวที่ยืนยันได้ว่าลูกค้ามาจากการแชร์ของใคร — ข้อความที่ลูกค้ากดส่งจะมี [ref:xxx] ติดไปถึง OA
// ถ้าไม่มีรหัส ก็ยังพิมพ์ข้อความตั้งต้นให้อยู่ดี (ลดกำแพงการทักครั้งแรก) แค่ไม่มีวงเล็บ ref
function njLineAskUrl(text) {
  var ref = njRef();
  var msg = (text || 'สนใจสอบถามงานรังวัดที่ดินครับ/ค่ะ') + (ref ? ' [ref:' + ref + ']' : '');
  return 'https://line.me/R/oaMessage/' + encodeURIComponent(NJ_LINE_OA_ID) + '/?' + encodeURIComponent(msg);
}

// ลิงก์ Messenger พร้อมรหัสอ้างอิง — Facebook ส่ง ref กลับมาทาง webhook ตอนลูกค้าเริ่มแชท
// (ต้องตั้ง webhook ฝั่งเพจก่อนถึงจะได้ค่านี้ · ยังไม่ได้ตั้งก็ไม่พัง แค่ไม่ได้ข้อมูลย้อนกลับ)
function njMessengerUrl() {
  var ref = njRef();
  return NJ_MESSENGER_URL + (ref ? '?ref=' + encodeURIComponent(ref) : '');
}

// ---------------------------------------------------------------------------
// ความยินยอมก่อนติดตาม (PDPA)
// Meta Pixel และ GA4 วางคุกกี้และติดตามข้ามเว็บ — ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล
// ต้องได้รับความยินยอมก่อน จึงโหลด "หลัง" ผู้ใช้กดยอมรับเท่านั้น
// ส่วนสถิติภายในของเราเอง (/api/public/track) นับแค่จำนวนครั้ง ไม่มีคุกกี้/ไม่มี PII จึงยิงได้เสมอ
//
// หมายเหตุ: แบนเนอร์นี้เป็นการทำตามหลักการเบื้องต้นเท่านั้น ไม่ใช่คำแนะนำทางกฎหมาย
// ก่อนใช้งานจริงจริงจังควรให้ผู้เชี่ยวชาญตรวจนโยบายความเป็นส่วนตัวของเว็บอีกครั้ง
// ---------------------------------------------------------------------------
var CONSENT_KEY = 'njts_consent';

function consentValue() {
  try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
}
function setConsent(v) {
  try { localStorage.setItem(CONSENT_KEY, v); } catch (e) { /* โหมดส่วนตัวเขียนไม่ได้ ไม่เป็นไร */ }
  if (v === 'yes') loadTrackers();
  var bar = document.getElementById('nj-consent');
  if (bar) bar.remove();
}

var trackersLoaded = false;
function loadTrackers() {
  if (trackersLoaded) return;
  trackersLoaded = true;

  if (META_PIXEL_ID) {
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
  }

  if (GA4_ID) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA4_ID);
  }

  // เหตุการณ์ที่เกิดก่อนผู้ใช้กดยอมรับ ส่งตามหลังทีเดียว จะได้ไม่หายไปทั้งชุด
  pending.forEach(function (e) { forward(e.name, e.params); });
  pending = [];
}

// ---------------------------------------------------------------------------
// njTrack(name, params) — เรียกที่เดียว กระจายไปทุกปลายทางที่เปิดใช้อยู่
// name ใช้ชื่อมาตรฐานของ Meta เมื่อมี (Lead, Contact, ViewContent) เพื่อให้ตั้ง
// campaign optimization ในตัวจัดการโฆษณาได้ตรงๆ โดยไม่ต้องตั้ง custom conversion เอง
// ---------------------------------------------------------------------------
var META_STANDARD = ['PageView', 'ViewContent', 'Lead', 'Contact', 'CompleteRegistration', 'Search'];
var pending = [];

function forward(name, params) {
  if (window.fbq) {
    if (META_STANDARD.indexOf(name) >= 0) fbq('track', name, params || {});
    else fbq('trackCustom', name, params || {});
  }
  if (window.gtag) gtag('event', name, params || {});
}

function njTrack(name, params) {
  if (consentValue() === 'yes') forward(name, params);
  else if (pending.length < 20) pending.push({ name: name, params: params });   // เผื่อกดยอมรับทีหลัง
}

// สถิติภายใน — ไม่มีคุกกี้/ไม่มี PII จึงไม่ต้องรอความยินยอม
// sendBeacon ส่งได้แม้หน้าเว็บกำลัง unload (เช่นตอนกด tel:/line: แล้วเบราว์เซอร์สลับแอป)
// ⚠️ รายการนี้คือ "ที่ที่ 4" ที่ต้องแก้เวลาเพิ่มช่องทางติดต่อ นอกเหนือจาก 3 ที่ในกติกาข้อ 6 ของ CLAUDE.md
//    เหตุการณ์ที่ไม่มีชื่ออยู่ในนี้จะถูกทิ้งเงียบๆ ตั้งแต่ฝั่งเบราว์เซอร์ ไม่มี error ให้เห็น
//    (messenger_click เคยตกหล่นตรงนี้มาก่อน ทั้งที่ server.js รับอยู่แล้ว — คลิก Messenger ทุกครั้งจึงหายไปเฉยๆ)
var NJ_INTERNAL_EVENTS = ['pageview', 'line_click', 'tel_click', 'messenger_click', 'consign_view', 'consign_submit', 'consign_files',
                          'share_view', 'video_75', 'propcheck_view'];
function njTrackInternal(type) {
  if (NJ_INTERNAL_EVENTS.indexOf(type) < 0) return;
  try {
    var ref = njRef();
    var body = JSON.stringify(ref ? { type: type, ref: ref } : { type: type });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(NJ_API_BASE + '/api/public/track', new Blob([body], { type: 'application/json' }));
    } else {
      fetch(NJ_API_BASE + '/api/public/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(function () {});
    }
  } catch (e) { /* เก็บสถิติไม่ได้ก็ไม่ควรกระทบการใช้งานเว็บ */ }
}

// ---------------------------------------------------------------------------
// แบนเนอร์ขอความยินยอม — ขึ้นเฉพาะเมื่อ (ก) ยังไม่เคยตอบ และ (ข) มี ID ให้โหลดจริง
// ถ้ายังไม่ได้กรอก ID ก็ไม่มีอะไรให้ขอความยินยอม จึงไม่รบกวนผู้ใช้เปล่าๆ
// ---------------------------------------------------------------------------
function initConsent() {
  var has = META_PIXEL_ID || GA4_ID;
  var val = consentValue();
  if (val === 'yes') { loadTrackers(); return; }
  if (val === 'no' || !has) return;

  var bar = document.createElement('div');
  bar.id = 'nj-consent';
  bar.innerHTML =
    '<div class="nj-consent-text">เราใช้คุกกี้เพื่อวัดผลโฆษณาและปรับปรุงเว็บไซต์ ' +
    'คุณเลือกปฏิเสธได้โดยยังใช้งานเว็บได้ครบทุกส่วน</div>' +
    '<div class="nj-consent-btns">' +
      '<button type="button" class="nj-consent-no">ปฏิเสธ</button>' +
      '<button type="button" class="nj-consent-yes">ยอมรับ</button>' +
    '</div>';
  document.body.appendChild(bar);
  bar.querySelector('.nj-consent-yes').addEventListener('click', function () { setConsent('yes'); });
  bar.querySelector('.nj-consent-no').addEventListener('click', function () { setConsent('no'); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initConsent);
else initConsent();
