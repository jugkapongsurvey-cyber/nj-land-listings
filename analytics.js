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
var NJ_API_BASE = 'https://app.njteedinsure.com';

// ---- ชี้ API ไปที่เซิร์ฟเวอร์ทดสอบบนเครื่อง (เพิ่ม 2026-09-09) ----
// เติม `?api=http://127.0.0.1:8790` ท้าย URL ตอนเปิดจาก localhost แล้วทั้งเว็บจะคุยกับ
// เซิร์ฟเวอร์ตัวนั้นแทน · แนวเดียวกับ `?photos=dev` ที่มีอยู่แล้ว
//
// ⚠️ ทำงานเฉพาะเมื่อเปิดจาก localhost/127.0.0.1 เท่านั้น และรับเฉพาะที่อยู่ที่ชี้กลับมาที่เครื่องเอง
// เปิดกว้างกว่านี้เมื่อไหร่ = ใครส่งลิงก์ njteedinsure.com?api=<เว็บของเขา> ให้ลูกค้า
// แล้วหน้าเว็บของเราจะไปดึงข้อมูลแปลงจากเซิร์ฟเวอร์ของคนอื่นมาแสดงในนามเรา
(function () {
  try {
    var host = location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]') return;
    var v = new URLSearchParams(location.search).get('api') || '';
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(v)) NJ_API_BASE = v;
  } catch (e) {}
})();

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
  // ⚠️ กด "ปฏิเสธ" แล้ว **ไม่ถอน Pixel ที่โหลดไปแล้ว** ได้ — ถอนสคริปต์ที่รันไปแล้วไม่ได้จริง
  // กรณีนี้เกิดได้ทางเดียวคือผู้ใช้เคยกดยอมรับ แล้วเปิดแถบกลับมากดปฏิเสธในหน้าเดียวกัน
  // จึงต้องโหลดหน้าใหม่ให้ เพื่อให้สภาพจริงตรงกับสิ่งที่ผู้ใช้เพิ่งเลือก
  var needReload = (v === 'no' && trackersLoaded);
  var bar = document.getElementById('nj-consent');
  if (bar) bar.remove();
  setConsentH(0);           // คืนพื้นที่ขอบล่างให้แถบติดต่อติดหนึบทันที
  paintConsentState();
  if (needReload) location.reload();
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
                          'share_view', 'video_75', 'propcheck_view', 'buyer_request_view',
                          'listing_view', 'phone_reveal',
                          // ⚠️ ต้องตรงกับ PUBLIC_EVENT_TYPES ใน server.js เป๊ะ — เคยมีเคสที่ชนิดหนึ่ง
                          // มีฝั่งเซิร์ฟเวอร์แต่ไม่มีในรายการนี้ แล้วเหตุการณ์ถูกทิ้งตั้งแต่เบราว์เซอร์โดยไม่มี error
                          // inquiry_view = เปิดฟอร์มสนใจซื้อ · compare_open = เปิดตารางเปรียบเทียบ
                          // ทั้งคู่ **ไม่ใช่ลีด** (การดูไม่ใช่การติดต่อ) ห้ามบวกเข้า leads ใน track/summary
                          // ส่วน inquiry_submit เซิร์ฟเวอร์บันทึกเองตอนสร้างใบ ฝั่งนี้จึงไม่ต้องยิงซ้ำ
                          'inquiry_view', 'compare_open',
                          // quote_view = ลูกค้าเปิดหน้าใบเสนอราคาของตัวเอง — **ไม่ใช่ลีด** (เป็นลูกค้าอยู่แล้ว)
                          'quote_view',
                          'chat_open',   // เปิดแชทน้องเอ็นเจชัวร์ (ไม่ใช่ลีด — นับแค่ว่ามีคนใช้กี่ครั้ง)
                          // นัดตรวจแปลง (Phase 2) — inspect_submit เซิร์ฟเวอร์บันทึกเองเช่นกัน
                          'inspect_view',
                          // ค้นหาตามวัตถุประสงค์ (Phase 3) — เปิดหน้าเท่านั้น **ไม่ใช่ลีด** ห้ามบวกเข้า leads
                          'purpose_view',
                          // ห้องข้อมูลแปลง (Phase 3) — เปิดหน้าเท่านั้น **ไม่ใช่ลีด**
                          // ส่วน dataroom_request เซิร์ฟเวอร์บันทึกเองตอนสร้างคำขอ ฝั่งนี้จึงไม่ยิงซ้ำ
                          'dataroom_view',
                          // ---- พฤติกรรมบนหน้าเว็บ (Sprint 3 · 20 ก.ย. 2569) ----
                          // ⚠️ **ไม่ใช่ลีดสักตัว** ห้ามบวกเข้า leads ทั้งฝั่งนี้และฝั่ง server.js
                          //    ใช้ตอบว่า "เครื่องมือบนเว็บถูกใช้จริงไหม" ไม่ใช่ "มีคนติดต่อกี่ราย"
                          // ⚠️ ต้องตรงกับ PUBLIC_EVENT_TYPES ใน server.js เป๊ะ (contracts.test.js เทียบให้)
                          'homepage_search', 'filter_property', 'save_property',
                          'share_property', 'use_calculator', 'chat_to_human',
                          // ---- Sprint 5 (งานที่ 16) — สองตัวที่ยังไม่มีชื่อในระบบเลย ----
                          // ⚠️ ที่เหลือในรายการ 20 ชื่อของข้อกำหนด **มีอยู่แล้วใต้ชื่อเดิม ห้ามเปลี่ยนชื่อตาม**
                          //    เปลี่ยนเมื่อไหร่ = ตัวเลขเก่าขาดตอน และยอด leads ใน
                          //    /api/public/track/summary เพี้ยน · ตารางเทียบชื่ออยู่ใน CLAUDE.md
                          'view_survey_level',   // กางดูบันไดการตรวจสอบ 5 ระดับในหน้าแปลง
                          'download_report',    // กดดาวน์โหลด/สั่งพิมพ์ประกาศเป็น PDF
                          // แพ็กเกจบริการ (รอบ 4) — เปิดหน้า/เปิดดูแพ็กเกจ/เทียบ/ทำแบบสอบถาม **ไม่ใช่ลีด**
                          // มีแต่ package_lead ที่เป็นลีดจากฟอร์ม (นับรวมใน formLeads ฝั่งเซิร์ฟเวอร์)
                          // ⚠️ การกดไลน์/โทรบนหน้าแพ็กเกจใช้ line_click/tel_click เดิม ห้ามเพิ่มชนิดใหม่ให้สองอย่างนั้น
                          'packages_view', 'package_view', 'package_compare',
                          'package_reco_start', 'package_reco_done', 'package_lead',
                          // ทางเชื่อมไปเว็บ NJ (2026-09-23) — กดลิงก์ที่มี data-njlink · **ไม่ใช่ลีด**
                          // ลีดจริงนับที่ survey_request_submit ซึ่งเซิร์ฟเวอร์บันทึกเองตอนรับฟอร์ม
                          'nj_link_click',
                          // เครื่องมือเก็บลีด (25 ก.ย. 2569) — กดดูผลแบบประเมินความพร้อมขาย · **ไม่ใช่ลีด**
                          // ใช้เป็นตัวหารอัตราแปลงของแบบประเมินบนแดชบอร์ดการตลาด
                          // ⚠️ ไม่มี lead_tool_submit ในรายการนี้โดยตั้งใจ — เซิร์ฟเวอร์บันทึกเองตอนสร้างใบ (ยิงจากที่นี่ = นับซ้ำ)
                          'lead_tool_preview'];
// ลิงก์ไปเว็บ NJ ทุกจุดใส่ data-njlink="<รหัสทรัพย์หรือว่าง>" แล้วนับที่นี่ที่เดียว
// (หน้าแปลง · คู่มือตรวจที่ดิน · เพิ่มจุดใหม่ก็แค่ใส่แอตทริบิวต์ ไม่ต้องเขียนตัวดักคลิกใหม่)
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[data-njlink]') : null;
  if (a) njTrackInternal('nj_link_click', a.getAttribute('data-njlink') || '');
}, true);
// listingId เป็นตัวเลือก — ใส่เฉพาะเหตุการณ์ที่ผูกกับแปลงใดแปลงหนึ่ง (listing_view · phone_reveal)
// เซิร์ฟเวอร์เอาไปนับเป็นสถิติรายแปลง ตอบคำถามว่า "แปลงไหนมีคนดู แปลงไหนไม่มีใครแตะ"
// เหตุการณ์อื่นส่งมาโดยไม่มี listingId เหมือนเดิมทุกประการ (ตัวแปรที่ 2 ไม่ใส่ก็ได้)
function njTrackInternal(type, listingId) {
  if (NJ_INTERNAL_EVENTS.indexOf(type) < 0) return;
  try {
    var ref = njRef();
    var payload = { type: type };
    if (ref) payload.ref = ref;
    if (listingId) payload.listingId = String(listingId).slice(0, 20);
    var body = JSON.stringify(payload);
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
// ---------------------------------------------------------------------------
// แถบขอความยินยอม + ทางกลับมาเปลี่ยนใจ
//
// ⚠️ **ต้องมีทางกลับมาเปลี่ยนใจเสมอ** (เพิ่ม 2026-09-20)
// ของเดิมกดตอบครั้งเดียวแล้วจบถาวร — เปลี่ยนใจได้ทางเดียวคือล้างข้อมูลเว็บไซต์ทิ้งทั้งก้อน
// ซึ่งลบตั๋วใบฝากขายของลูกค้าไปด้วย · การถอนความยินยอมต้องง่ายพอๆ กับการให้
// ทางกลับคือลิงก์ "ตั้งค่าคุกกี้" ในแถบนโยบายท้ายทุกหน้า (`[data-njconsent]`)
//
// ⚠️ **ปุ่ม "ปฏิเสธ" ต้องอยู่ระดับเดียวกับ "ยอมรับ" ห้ามทำให้หายากกว่า**
// และต้องไม่มีปุ่มไหนถูกทำให้เด่นกว่าอีกปุ่มจนกลายเป็นการชี้นำ
//
// ⚠️ ปุ่ม "ตั้งค่าคุกกี้" ในแถบเป็นทางไปอ่านนโยบายฉบับเต็ม ไม่ใช่แผงติ๊กหลายหมวด
// เพราะตอนนี้มีของให้เลือกจริงหมวดเดียว (การตลาด) — ทำแผงติ๊กหมวดเดียวคือเพิ่มขั้นตอน
// ให้ผู้ใช้โดยไม่ได้เพิ่มทางเลือก · วันไหนมีหมวดที่สองค่อยเปลี่ยนเป็นแผงจริง
// ---------------------------------------------------------------------------
function buildConsentBar() {
  var bar = document.createElement('div');
  bar.id = 'nj-consent';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'การตั้งค่าคุกกี้');
  bar.innerHTML =
    // ⚠️ **สั้นที่สุดเท่าที่ยังบอกครบ** — วัดจริงที่ 375px แล้วแบนเนอร์กินจอ 17%
    //    ข้อความยาวขึ้นทุกบรรทัด = พื้นที่อ่านเนื้อหาหายไปอีกหนึ่งบรรทัดบนมือถือ
    //    คุกกี้ที่จำเป็นไม่ต้องขอความยินยอมอยู่แล้ว รายละเอียดทั้งหมดอยู่ในหน้านโยบาย
    '<div class="nj-consent-text">เราใช้คุกกี้การตลาดเพื่อวัดผลโฆษณา — เลือก "เฉพาะที่จำเป็น" ก็ใช้งานเว็บได้ครบ ' +
    '<a class="nj-consent-more" href="cookie.html">ตั้งค่าคุกกี้</a></div>' +
    '<div class="nj-consent-btns">' +
      '<button type="button" class="nj-consent-no">เฉพาะที่จำเป็น</button>' +
      '<button type="button" class="nj-consent-yes">ยอมรับทั้งหมด</button>' +
    '</div>';
  document.body.appendChild(bar);
  // ⚠️ ต้องวัดความสูงจริงแล้วบอกทั้งหน้า ไม่งั้นแบนเนอร์ทับของที่ติดขอบล่างอยู่ก่อนแล้ว
  measureConsent(bar);
  bar.querySelector('.nj-consent-yes').addEventListener('click', function () { setConsent('yes'); });
  bar.querySelector('.nj-consent-no').addEventListener('click', function () { setConsent('no'); });
  return bar;
}

// ---------- บอกทั้งหน้าว่าแบนเนอร์สูงเท่าไร ----------
//
// ทำไมต้องมี: แบนเนอร์คุกกี้เป็น fixed ที่ขอบล่างและ z-index 900 (สูงที่สุดรองจากลิ้นชักเมนู
// เพราะเป็นเรื่องกฎหมาย) · ของที่ติดขอบล่างอยู่ก่อนแล้วจึงถูกทับทันที —
// **แถบติดต่อติดหนึบในหน้ารายละเอียดแปลง** (`.ld-sticky` · z-index 150) เจอเต็มๆ
// ซึ่งแปลว่าผู้ซื้อที่ยังไม่ตอบแบนเนอร์ กดปุ่มโทร/ไลน์ของแปลงนั้นไม่ได้เลย
//
// ⚠️ ให้ค่าเป็นตัวแปร CSS ตัวเดียว (`--nj-consent-h`) แล้วให้แต่ละองค์ประกอบบวกเอง
//    ดีกว่าให้ analytics.js ไปไล่แก้ style ของคนอื่นทีละตัว (ซึ่งต้องรู้จักทุกหน้า)
// ⚠️ เทียบค่าเดิมก่อนเขียนเสมอ — กับดัก MutationObserver ชุดเดียวกับที่เคยทำให้สองหน้าค้าง
function setConsentH(px) {
  var root = document.documentElement;
  var want = px > 0 ? px + 'px' : '';
  if (root.style.getPropertyValue('--nj-consent-h') === want) return;
  if (want) root.style.setProperty('--nj-consent-h', want);
  else root.style.removeProperty('--nj-consent-h');
}
function measureConsent(bar) {
  bar = bar || document.getElementById('nj-consent');
  if (!bar) { setConsentH(0); return; }
  // ⚠️ DOM ปลอมใน consent.test.js ไม่มี getBoundingClientRect — วัดไม่ได้ก็แค่ไม่ยก ไม่ใช่พังทั้งไฟล์
  if (typeof bar.getBoundingClientRect !== 'function' || typeof window.innerHeight !== 'number') return;
  var r = bar.getBoundingClientRect();
  // ระยะจากขอบล่างจอถึงขอบบนแบนเนอร์ + ช่องไฟ — ไม่ใช่แค่ความสูงของตัวแบนเนอร์
  // เพราะบนจอเล็กแบนเนอร์ถูกยกขึ้นเหนือแถบเมนูล่างอยู่แล้ว (ดู consent.css)
  setConsentH(r.height > 0 ? Math.round(window.innerHeight - r.top + 8) : 0);
}
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('resize', function () { measureConsent(); });
}

// เปิดแถบอีกครั้งตามคำขอของผู้ใช้ — ใช้ได้แม้เคยตอบไปแล้ว
function openConsent() {
  var bar = document.getElementById('nj-consent') || buildConsentBar();
  var btn = bar.querySelector('.nj-consent-no');
  if (btn) btn.focus();
  return bar;
}

function initConsent() {
  var has = META_PIXEL_ID || GA4_ID;
  var val = consentValue();

  // ⚠️ ผูกลิงก์ "ตั้งค่าคุกกี้" ก่อนเสมอ ไม่ว่าจะเคยตอบไปแล้วหรือไม่
  // ของเดิม return ออกตั้งแต่บรรทัดถัดไปเมื่อเคยตอบแล้ว — ผูกทีหลังคือลิงก์ตาย
  bindConsentLinks();

  if (val === 'yes') { loadTrackers(); return; }
  if (val === 'no' || !has) return;

  buildConsentBar();
}

// แถบลิงก์นโยบายท้ายฟุตเตอร์มีปุ่ม [data-njconsent] และช่องบอกสถานะ [data-njconsent-state]
// ทั้งคู่ไม่บังคับ หน้าไหนไม่มีก็ข้ามไปเงียบๆ
function bindConsentLinks() {
  var btns = document.querySelectorAll('[data-njconsent]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function (e) {
      e.preventDefault();
      openConsent();
    });
  }
  paintConsentState();
}

function consentStateText() {
  var v = consentValue();
  if (v === 'yes') return 'ตอนนี้คุณเลือก “ยอมรับคุกกี้เพื่อการตลาด” ไว้';
  if (v === 'no') return 'ตอนนี้คุณเลือก “ปฏิเสธคุกกี้เพื่อการตลาด” ไว้';
  return 'คุณยังไม่ได้เลือก — ระบบจะยังไม่โหลดคุกกี้เพื่อการตลาดจนกว่าคุณจะกดยอมรับ';
}
function paintConsentState() {
  var els = document.querySelectorAll('[data-njconsent-state]');
  var txt = consentStateText();
  for (var i = 0; i < els.length; i++) {
    // ⚠️ เขียนทับด้วยค่าเดิมคือลบ text node แล้วสร้างใหม่ ซึ่งนับเป็น childList mutation
    // เทียบก่อนเขียนเสมอ (กับดัก MutationObserver ที่เคยทำให้สองหน้าค้างทั้งแท็บ)
    if (els[i].textContent !== txt) els[i].textContent = txt;
  }
}

window.NJConsent = { open: openConsent, value: consentValue, stateText: consentStateText };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initConsent);
else initConsent();
