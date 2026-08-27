// หน้า "ฝากขายที่ดินฟรี" — ปลายทางของโฆษณาฝั่งผู้ขาย
// ส่งฟอร์มเข้า /api/public/consign ของ nj-survey-system → กลายเป็นโอกาสทางธุรกิจขั้นแรกทันที
// (ค่า NJ_API_BASE / njTrack / njTrackInternal มาจาก analytics.js ที่โหลดก่อนไฟล์นี้)

var LINE_OA_URL = 'https://line.me/R/ti/p/@716lffzt';
var COMPANY_TEL = '02-162-0405';
var COMPANY_TEL_ALT = '084-915-8601';

function telHref(t) { return 'tel:' + String(t).replace(/[^0-9+]/g, ''); }
function $(id) { return document.getElementById(id); }

// ---------- ลิงก์ติดต่อทุกจุดในหน้า ----------
// ปลายทาง + ชื่อเหตุการณ์ที่จะนับ แยกตามช่องทาง — เพิ่มช่องทางใหม่ = เพิ่มบรรทัดเดียวตรงนี้
var CONTACT_CHANNELS = {
  line:      { href: function () { return LINE_OA_URL; },        ev: 'line_click',      method: 'line' },
  messenger: { href: function () { return NJ_MESSENGER_URL; },   ev: 'messenger_click', method: 'messenger' },
  tel:       { href: function () { return telHref(COMPANY_TEL); }, ev: 'tel_click',     method: 'phone' }
};
function setupContactLinks() {
  [['cs-line', 'line'], ['cs-done-line', 'line'], ['cs-bar-line', 'line'],
   ['cs-fb', 'messenger'], ['cs-done-fb', 'messenger'], ['cs-bar-fb', 'messenger'],
   ['cs-tel', 'tel'], ['cs-done-tel', 'tel'], ['cs-bar-tel', 'tel']].forEach(function (pair) {
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
  var box = $('cs-err');
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// จังหวัดที่บริษัทให้บริการอยู่จริง — ยกขึ้นบนสุดของ dropdown เพราะคนส่วนใหญ่ที่เข้าฟอร์มนี้อยู่ในกลุ่มนี้
var SERVICE_PROVINCES = ['สมุทรปราการ', 'กรุงเทพมหานคร', 'ฉะเชิงเทรา', 'ชลบุรี', 'ระยอง', 'ปทุมธานี', 'นครนายก'];

// ประกอบข้อความที่ตั้งจากช่องที่เลือกไว้ ให้ทีมขายอ่านรวดเดียวจบในการ์ดโอกาสทางธุรกิจ
// กรุงเทพฯ ใช้ "แขวง/เขต" ต่างจังหวัดใช้ "ต./อ." — ชื่ออำเภอในกรุงเทพฯ มีคำว่า "เขต" นำมาอยู่แล้ว
function locationText(a, detail) {
  var bkk = a.province === 'กรุงเทพมหานคร';
  var parts = [];
  if (a.tambon) parts.push((bkk ? 'แขวง' : 'ต.') + a.tambon);
  if (a.amphoe) parts.push(/^เขต/.test(a.amphoe) ? a.amphoe : 'อ.' + a.amphoe);
  if (a.province) parts.push(bkk ? a.province : 'จ.' + a.province);
  if (a.zip) parts.push(a.zip);
  var s = parts.join(' ');
  if (detail) s = s ? s + ' · ' + detail : detail;
  return s;
}

function setupForm() {
  var form = $('consign-form');
  if (!form) return;
  var btn = $('cs-submit');
  var sending = false;

  var addr = NJLandForm.initAddress({
    province: 'cs-province', amphoe: 'cs-amphoe', tambon: 'cs-tambon',
    provinceList: 'cs-province-list', amphoeList: 'cs-amphoe-list', tambonList: 'cs-tambon-list',
    zip: 'cs-zip', note: 'cs-loc-note', pinned: SERVICE_PROVINCES
  });
  var areaPrice = NJLandForm.initAreaPrice({
    rai: 'cs-rai', ngan: 'cs-ngan', wa: 'cs-wa',
    price: 'cs-price', unitName: 'priceUnit',
    areaOut: 'cs-area-out', priceOut: 'cs-price-out', priceLabel: 'cs-price-label'
  });

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
    var a = addr ? addr.value() : { province: '', amphoe: '', tambon: '', zip: '' };
    var ap = areaPrice ? areaPrice.value()
      : { rai: 0, ngan: 0, wa: 0, totalWa: 0, areaText: '', priceUnit: 'wa', unitPrice: 0, estValue: 0 };
    var detail = String(fd.get('locDetail') || '').trim();
    var loc = locationText(a, detail);

    var v = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      type: String(fd.get('type') || 'sell'),
      // parcelInfo = บรรทัดสรุปที่ทีมขายและหน้าประกาศใช้แสดง (ที่ตั้ง · เนื้อที่)
      parcelInfo: [loc, ap.areaText].filter(Boolean).join(' · '),
      // ส่งค่าที่แยกช่องไว้ไปด้วย เพื่อให้ระบบหลังบ้านเก็บเป็นข้อมูลจริง ไม่ใช่ข้อความก้อนเดียว
      province: a.province, amphoe: a.amphoe, tambon: a.tambon, zip: a.zip,
      locDetail: detail,
      rai: ap.rai, ngan: ap.ngan, wa: ap.wa, totalWa: ap.totalWa,
      priceUnit: ap.priceUnit, unitPrice: ap.unitPrice,
      // ราคารวมที่คำนวณได้ — เซิร์ฟเวอร์คำนวณซ้ำจาก unitPrice × เนื้อที่เสมอ ไม่เชื่อค่านี้อย่างเดียว
      estValue: ap.estValue,
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
