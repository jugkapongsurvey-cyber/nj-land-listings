// หน้า "ฝากหาที่ดิน" — ปลายทางของแคมเปญฝั่ง "ผู้ซื้อ"
//
// กลับด้านกับ consign.js: คนกรอกคือผู้ซื้อที่บอกโจทย์ว่าอยากได้ที่ดินแบบไหน ไม่ใช่เจ้าของที่จะขาย
// ส่งเข้า /api/public/buyer-request ของ nj-survey-system → เก็บในตาราง buyerRequests
// (คนละตารางกับ opportunities โดยตั้งใจ — ใบฝากหาไม่ใช่แปลงที่ดิน ดูเหตุผลเต็มๆ ที่ server.js)
//
// ⚠️ หน้านี้ทำงานได้แม้คลังแปลงยังว่าง เพราะสิ่งที่เสนอคือ "เราจะไปหาให้"
// จึงเป็นหน้าเดียวที่ยิงโฆษณาหาผู้ซื้อได้ตั้งแต่ตอนที่ยังมีแปลงขึ้นเว็บไม่กี่แปลง
// (ค่า NJ_API_BASE / njTrack / njTrackInternal มาจาก analytics.js ที่โหลดก่อนไฟล์นี้)

var LINE_OA_URL = 'https://line.me/R/ti/p/@716lffzt';
var COMPANY_TEL = '02-162-0405';
var COMPANY_TEL_ALT = '084-915-8601';
var MAX_AREAS = 3;
// จังหวัดที่ดันขึ้นหัวรายการให้เลือกง่าย — ต้องตรงกับ SERVICE_PROVINCES ใน consign.js
// (สองฟอร์มควรเรียงจังหวัดเหมือนกัน ไม่งั้นคนกรอกทั้งสองหน้าจะรู้สึกว่าเว็บสองหน้าคนละระบบ)
// นี่เป็นแค่ลำดับการแสดงผล ไม่ใช่การจำกัดพื้นที่ให้บริการ — พิมพ์จังหวัดอื่นได้ทุกจังหวัด
var SERVICE_PROVINCES = ['สมุทรปราการ', 'กรุงเทพมหานคร', 'ฉะเชิงเทรา', 'ชลบุรี', 'ระยอง', 'ปทุมธานี', 'นครนายก'];

function telHref(t) { return 'tel:' + String(t).replace(/[^0-9+]/g, ''); }
function $(id) { return document.getElementById(id); }

// ---------- ลิงก์ติดต่อทุกจุดในหน้า ----------
var CONTACT_CHANNELS = {
  line:      { href: function () { return LINE_OA_URL; },          ev: 'line_click',      method: 'line' },
  messenger: { href: function () { return NJ_MESSENGER_URL; },     ev: 'messenger_click', method: 'messenger' },
  tel:       { href: function () { return telHref(COMPANY_TEL); }, ev: 'tel_click',       method: 'phone' }
};
function setupContactLinks() {
  [['wt-line', 'line'], ['wt-done-line', 'line'], ['wt-bar-line', 'line'],
   ['wt-fb', 'messenger'], ['wt-done-fb', 'messenger'],
   ['wt-tel', 'tel'], ['wt-done-tel', 'tel'], ['wt-bar-tel', 'tel']].forEach(function (pair) {
    var el = $(pair[0]), ch = CONTACT_CHANNELS[pair[1]];
    if (!el || !ch) return;
    el.href = ch.href();
    el.addEventListener('click', function () {
      njTrackInternal(ch.ev);
      njTrack('Contact', { method: ch.method });
    });
  });
}

// ---------- ตรวจฟอร์มฝั่งหน้าเว็บ (เซิร์ฟเวอร์ตรวจซ้ำอีกชั้นเสมอ ห้ามเชื่อฝั่งนี้อย่างเดียว) ----------
function validate(v) {
  if (!v.name) return 'กรุณากรอกชื่อ–นามสกุล';
  if (v.phone.replace(/\D/g, '').length < 9) return 'กรุณากรอกเบอร์โทรให้ครบถ้วน';
  if (!v.pdpa) return 'กรุณากดยินยอมให้เราติดต่อกลับ';
  // ไม่บังคับให้กรอกทำเล/งบ/เนื้อที่ — โจทย์ที่ยังไม่ชัดก็ยังเป็นลีดที่คุยต่อได้
  // บังคับให้กรอกครบ = คนที่ยังไม่รู้ว่าตัวเองอยากได้อะไรกดถอยตั้งแต่ยังไม่ได้คุยกับใคร
  return '';
}

function showErr(msg) {
  var box = $('wt-err');
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- ทำเลหลายย่าน ----------
// สร้างตัวช่วยเลือกที่ตั้งแยกกันคนละชุดต่อย่าน — NJLandForm.initAddress ผูกกับ element ที่ส่งเข้าไป
// เท่านั้น ไม่มีสถานะร่วมกัน จึงสร้างพร้อมกันหลายชุดได้
var addrPickers = [];
function setupAreas() {
  for (var i = 1; i <= MAX_AREAS; i++) {
    addrPickers.push(NJLandForm.initAddress({
      province: 'wt-province' + i, amphoe: 'wt-amphoe' + i, tambon: 'wt-tambon' + i,
      provinceList: 'wt-province-list' + i, amphoeList: 'wt-amphoe-list' + i, tambonList: 'wt-tambon-list' + i,
      note: 'wt-loc-note' + i,
      pinned: SERVICE_PROVINCES
    }));
  }
  var btn = $('wt-addarea');
  if (!btn) return;
  btn.addEventListener('click', function () {
    // เปิดทีละย่าน — เปิดหมดทีเดียวทำให้ฟอร์มยาวขึ้นสองเท่าทันทีโดยที่คนส่วนใหญ่ไม่ได้ใช้
    var next = $('wt-area2').hidden ? $('wt-area2') : ($('wt-area3').hidden ? $('wt-area3') : null);
    if (!next) return;
    next.hidden = false;
    next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!$('wt-area3').hidden) btn.hidden = true;      // ครบ 3 ย่านแล้ว ซ่อนปุ่ม
  });
}
function areaValues() {
  return addrPickers.map(function (p, i) {
    // ย่านที่ยังซ่อนอยู่ไม่ถูกนับ แม้เบราว์เซอร์จะเติมค่าอัตโนมัติไว้ก็ตาม
    if (i > 0 && $('wt-area' + (i + 1)).hidden) return null;
    return p ? p.value() : null;
  }).filter(function (a) { return a && a.province; });
}

function setupForm() {
  var form = $('wanted-form');
  if (!form) return;
  var btn = $('wt-submit');
  var sending = false;

  setupAreas();

  // แตะช่องแรก = เริ่มสนใจจริง ใช้เป็นสัญญาณกลางทางให้ Meta เรียนรู้กลุ่มเป้าหมายเร็วขึ้น
  var startedOnce = false;
  form.addEventListener('focusin', function () {
    if (startedOnce) return;
    startedOnce = true;
    njTrack('ViewContent', { content_name: 'wanted_form_start' });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var fd = new FormData(form);
    var v = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      contactPref: String(fd.get('contactPref') || 'phone'),
      purpose: String(fd.get('purpose') || 'other'),
      timeframe: String(fd.get('timeframe') || 'looking'),
      deedType: String(fd.get('deedType') || 'any'),
      features: fd.getAll('features').map(String),
      areas: areaValues(),
      // ส่งค่าดิบไปให้เซิร์ฟเวอร์แปลงหน่วยเอง — แปลงสองที่เมื่อไหร่ ตัวเลขจะเพี้ยนคนละทาง
      areaUnit: String(fd.get('areaUnit') || 'rai'),
      areaMin: String(fd.get('areaMin') || '').trim(),
      areaMax: String(fd.get('areaMax') || '').trim(),
      budgetMin: String(fd.get('budgetMin') || '').trim(),
      budgetMax: String(fd.get('budgetMax') || '').trim(),
      note: String(fd.get('note') || '').trim(),
      pdpa: !!fd.get('pdpa'),
      website: String(fd.get('website') || ''),   // honeypot — คนจริงมองไม่เห็นช่องนี้
      ref: location.search ? location.search.slice(1, 60) : 'wanted_page'   // เก็บ utm ที่ติดมากับลิงก์โฆษณา
    };

    var err = validate(v);
    if (err) { showErr(err); return; }
    showErr('');

    sending = true;
    btn.disabled = true;
    btn.textContent = 'กำลังส่ง...';

    fetch(NJ_API_BASE + '/api/public/buyer-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v)
    })
      .then(function (r) {
        if (r.ok) return r.status === 204 ? {} : r.json();
        return r.json().catch(function () { return {}; }).then(function (d) {
          throw new Error(d.error || 'ส่งข้อมูลไม่สำเร็จ');
        });
      })
      .then(function (res) {
        // ไม่ยิง njTrackInternal('buyer_request_submit') ที่นี่ — เซิร์ฟเวอร์บันทึกให้แล้วตอนสร้างใบ
        // (นับที่เดียวเท่านั้น ไม่งั้นตัวเลขในหน้าสถิติจะเป็นสองเท่าของจริง)
        njTrack('Lead', { content_name: 'buyer_request', content_category: v.purpose });
        form.hidden = true;
        $('wt-done').hidden = false;
        $('wt-ref').textContent = (res && res.id) || '—';
        $('wt-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (e) {
        sending = false;
        btn.disabled = false;
        btn.textContent = 'ฝากหาที่ดิน — ให้ทีมงานติดต่อกลับ';
        // ส่งไม่ผ่านไม่ควรจบแค่ข้อความ error — เสนอช่องทางที่ใช้ได้แน่นอนให้ทันที ไม่งั้นลีดหลุด
        showErr((e.message || 'ส่งข้อมูลไม่สำเร็จ') + ' หรือโทรหาเราได้เลยที่ ' + COMPANY_TEL + ' / ' + COMPANY_TEL_ALT);
      });
  });
}

document.getElementById('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
setupContactLinks();
setupForm();
njTrackInternal('buyer_request_view');
njTrack('ViewContent', { content_name: 'wanted_page' });
