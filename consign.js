// หน้า "ฝากขายที่ดินฟรี" — ปลายทางของโฆษณาฝั่งผู้ขาย
// ส่งฟอร์มเข้า /api/public/consign ของ nj-survey-system → กลายเป็นโอกาสทางธุรกิจขั้นแรกทันที
// (ค่า NJ_API_BASE / njTrack / njTrackInternal มาจาก analytics.js ที่โหลดก่อนไฟล์นี้)

var LINE_OA_URL = 'https://line.me/R/ti/p/@716lffzt';
var COMPANY_TEL = '02-162-0405';
var COMPANY_TEL_ALT = '084-915-8601';

function telHref(t) { return 'tel:' + String(t).replace(/[^0-9+]/g, ''); }
function $(id) { return document.getElementById(id); }

// ---------- ลิงก์ติดต่อทุกจุดในหน้า ----------
function setupContactLinks() {
  [['cs-line', 'line'], ['cs-done-line', 'line'], ['cs-bar-line', 'line'],
   ['cs-tel', 'tel'], ['cs-done-tel', 'tel'], ['cs-bar-tel', 'tel']].forEach(function (pair) {
    var el = $(pair[0]);
    if (!el) return;
    if (pair[1] === 'line') {
      el.href = LINE_OA_URL;
      el.addEventListener('click', function () { njTrackInternal('line_click'); njTrack('Contact', { method: 'line' }); });
    } else {
      el.href = telHref(COMPANY_TEL);
      el.addEventListener('click', function () { njTrackInternal('tel_click'); njTrack('Contact', { method: 'phone' }); });
    }
  });
}

// ---------- ตรวจฟอร์มฝั่งหน้าเว็บ (เซิร์ฟเวอร์ตรวจซ้ำอีกชั้นเสมอ ห้ามเชื่อฝั่งนี้อย่างเดียว) ----------
function validate(v) {
  if (!v.name) return 'กรุณากรอกชื่อ–นามสกุล';
  if (v.phone.replace(/\D/g, '').length < 9) return 'กรุณากรอกเบอร์โทรให้ครบถ้วน';
  if (!v.pdpa) return 'กรุณากดยินยอมให้เราติดต่อกลับ';
  return '';
}

function showErr(msg) {
  var box = $('cs-err');
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function setupForm() {
  var form = $('consign-form');
  if (!form) return;
  var btn = $('cs-submit');
  var sending = false;

  // แตะช่องแรก = แสดงว่าเริ่มสนใจจริง ใช้เป็นสัญญาณกลางทางให้ Meta เรียนรู้กลุ่มเป้าหมายเร็วขึ้น
  var startedOnce = false;
  form.addEventListener('focusin', function () {
    if (startedOnce) return;
    startedOnce = true;
    njTrack('ViewContent', { content_name: 'consign_form_start' });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var fd = new FormData(form);
    var v = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      type: String(fd.get('type') || 'sell'),
      parcelInfo: String(fd.get('parcelInfo') || '').trim(),
      // ผู้ใช้พิมพ์ "2,500,000" หรือ "2.5 ล้าน" ได้ตามสะดวก — เก็บเฉพาะตัวเลขไปให้ระบบ
      estValue: Number(String(fd.get('estValue') || '').replace(/[^0-9]/g, '')) || 0,
      note: String(fd.get('note') || '').trim(),
      pdpa: !!fd.get('pdpa'),
      website: String(fd.get('website') || ''),        // honeypot — คนจริงมองไม่เห็นช่องนี้
      ref: location.search ? location.search.slice(1, 60) : 'consign_page'   // เก็บ utm ที่ติดมากับลิงก์โฆษณา
    };

    var err = validate(v);
    if (err) { showErr(err); return; }
    showErr('');

    sending = true;
    btn.disabled = true;
    btn.textContent = 'กำลังส่ง...';

    fetch(NJ_API_BASE + '/api/public/consign', {
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
      .then(function () {
        // ไม่ต้องยิง njTrackInternal('consign_submit') ที่นี่ — ฝั่งเซิร์ฟเวอร์บันทึกให้แล้วตอนสร้างโอกาส
        // (นับที่เดียวเท่านั้น ไม่งั้นตัวเลข conversion ในหน้าสถิติจะเป็นสองเท่าของจริง)
        njTrack('Lead', { content_name: 'consign', content_category: v.type });
        form.hidden = true;
        $('cs-done').hidden = false;
        $('cs-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function (e) {
        sending = false;
        btn.disabled = false;
        btn.textContent = 'ส่งข้อมูล — ให้ทีมงานติดต่อกลับ';
        // ส่งไม่ผ่านไม่ควรจบแค่ข้อความ error — เสนอช่องทางที่ใช้ได้แน่นอนให้ทันที ไม่งั้นลีดหลุด
        showErr((e.message || 'ส่งข้อมูลไม่สำเร็จ') + ' หรือโทรหาเราได้เลยที่ ' + COMPANY_TEL + ' / ' + COMPANY_TEL_ALT);
      });
  });
}

document.getElementById('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
setupContactLinks();
setupForm();
njTrackInternal('consign_view');
njTrack('ViewContent', { content_name: 'consign_page' });
