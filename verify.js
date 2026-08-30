// หน้า "ส่งทรัพย์ให้ NJ ตรวจสอบก่อนซื้อ" — ปลายทางสำหรับคนที่เจอทรัพย์จากบังคับคดี/ธนาคาร/BAM/SAM
// (ไม่ใช่เจ้าของที่ดิน ต่างจากหน้า "ฝากขายที่ดิน" ใน consign.js)
// ส่งฟอร์มเข้า /api/public/property-check ของ nj-survey-system → กลายเป็นโอกาสทางธุรกิจ
// ประเภท "แนะนำรังวัดก่อนขาย" ทันที ซึ่งไม่มีทางขึ้นเป็นประกาศขาย/เช่าบนเว็บ (เซิร์ฟเวอร์ล็อกไว้)
// (ค่า NJ_API_BASE / njTrack / njTrackInternal มาจาก analytics.js ที่โหลดก่อนไฟล์นี้)

var LINE_OA_URL = 'https://line.me/R/ti/p/@716lffzt';
var COMPANY_TEL = '02-162-0405';
var COMPANY_TEL_ALT = '084-915-8601';

function telHref(t) { return 'tel:' + String(t).replace(/[^0-9+]/g, ''); }
function $(id) { return document.getElementById(id); }

// ---------- ลิงก์ติดต่อทุกจุดในหน้า ----------
var CONTACT_CHANNELS = {
  line:      { href: function () { return LINE_OA_URL; },        ev: 'line_click',      method: 'line' },
  messenger: { href: function () { return NJ_MESSENGER_URL; },   ev: 'messenger_click', method: 'messenger' },
  tel:       { href: function () { return telHref(COMPANY_TEL); }, ev: 'tel_click',     method: 'phone' }
};
function setupContactLinks() {
  [['vf-line', 'line'], ['vf-done-line', 'line'], ['vf-bar-line', 'line'],
   ['vf-fb', 'messenger'], ['vf-done-fb', 'messenger'],
   ['vf-tel', 'tel'], ['vf-done-tel', 'tel'], ['vf-bar-tel', 'tel']].forEach(function (pair) {
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
  return '';
}

function showErr(msg) {
  var box = $('vf-err');
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// รายชื่อแหล่งที่มาของทรัพย์ — ต้องตรงกับ PROPCHECK_SOURCES ใน server.js (nj-survey-system)
// ไม่ตรงก็ไม่พัง (เซิร์ฟเวอร์เก็บเป็น "อื่นๆ" ให้เอง) แต่ตรงกันไว้ทีมขายจะกรอง/รายงานได้แม่นกว่า
var PROPCHECK_SOURCES = ['บังคับคดี', 'BAM', 'SAM', 'IAM', 'ธนาคารกสิกรไทย', 'ธนาคารกรุงไทย',
                          'ธนาคารกรุงศรีอยุธยา', 'ธนาคารออมสิน', 'ธอส.', 'อื่นๆ'];
function setupSourceList() {
  var dl = $('vf-source-list');
  if (!dl) return;
  PROPCHECK_SOURCES.forEach(function (name) {
    var o = document.createElement('option');
    o.value = name;
    dl.appendChild(o);
  });
}

// ประกอบข้อความที่ตั้งจากช่องที่เลือกไว้ ให้ทีมขายอ่านรวดเดียวจบในการ์ดโอกาสทางธุรกิจ
function locationText(a) {
  var bkk = a.province === 'กรุงเทพมหานคร';
  var parts = [];
  if (a.tambon) parts.push((bkk ? 'แขวง' : 'ต.') + a.tambon);
  if (a.amphoe) parts.push(/^เขต/.test(a.amphoe) ? a.amphoe : 'อ.' + a.amphoe);
  if (a.province) parts.push(bkk ? a.province : 'จ.' + a.province);
  return parts.join(' ');
}

function setupForm() {
  var form = $('verify-form');
  if (!form) return;
  var btn = $('vf-submit');
  var sending = false;

  var addr = NJLandForm.initAddress({
    province: 'vf-province', amphoe: 'vf-amphoe', tambon: 'vf-tambon',
    provinceList: 'vf-province-list', amphoeList: 'vf-amphoe-list', tambonList: 'vf-tambon-list',
    note: 'vf-loc-note'
  });

  // แตะช่องแรก = เริ่มสนใจจริง ใช้เป็นสัญญาณกลางทางให้ Meta เรียนรู้กลุ่มเป้าหมายเร็วขึ้น
  var startedOnce = false;
  form.addEventListener('focusin', function () {
    if (startedOnce) return;
    startedOnce = true;
    njTrack('ViewContent', { content_name: 'verify_form_start' });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var fd = new FormData(form);
    var a = addr ? addr.value() : { province: '', amphoe: '', tambon: '' };

    var v = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      source: String(fd.get('source') || '').trim(),
      sourceUrl: String(fd.get('sourceUrl') || '').trim(),
      deedNo: String(fd.get('deedNo') || '').trim(),
      province: a.province, amphoe: a.amphoe, tambon: a.tambon,
      price: String(fd.get('price') || '').trim(),
      auctionDate: String(fd.get('auctionDate') || '').trim(),
      note: String(fd.get('note') || '').trim(),
      pdpa: !!fd.get('pdpa'),
      website: String(fd.get('website') || '')   // honeypot — คนจริงมองไม่เห็นช่องนี้
    };

    var err = validate(v);
    if (err) { showErr(err); return; }
    showErr('');

    sending = true;
    btn.disabled = true;
    btn.textContent = 'กำลังส่ง...';

    fetch(NJ_API_BASE + '/api/public/property-check', {
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
        // ไม่ต้องยิง njTrackInternal('propcheck_submit') ที่นี่ — ฝั่งเซิร์ฟเวอร์บันทึกให้แล้วตอนสร้างโอกาส
        // (นับที่เดียวเท่านั้น ไม่งั้นตัวเลขในหน้าสถิติจะเป็นสองเท่าของจริง)
        njTrack('Lead', { content_name: 'property_check', content_category: v.source || 'unknown' });
        form.hidden = true;
        $('vf-done').hidden = false;
        $('vf-ref').textContent = (res && res.id) || '—';
        $('vf-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
setupSourceList();
setupForm();
njTrackInternal('propcheck_view');
njTrack('ViewContent', { content_name: 'verify_page' });
