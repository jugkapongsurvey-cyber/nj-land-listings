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
  tel:       { href: function () { return telHref(COMPANY_TEL); }, ev: 'tel_click',       method: 'phone' },
  // เบอร์มือถือเป็น "ช่องทางโทร" เดียวกับเบอร์สำนักงาน จึงนับเป็น tel_click เหมือนกัน
  // ไม่ตั้งชื่อเหตุการณ์ใหม่ ไม่งั้นต้องไปขึ้นทะเบียนที่ analytics.js + server.js ด้วย (กติกาข้อ 6)
  tel2:      { href: function () { return telHref(COMPANY_TEL_ALT); }, ev: 'tel_click',    method: 'phone' }
};
function setupContactLinks() {
  [['wt-line', 'line'], ['wt-done-line', 'line'], ['wt-bar-line', 'line'],
   ['wt-fb', 'messenger'], ['wt-done-fb', 'messenger'],
   ['wt-tel', 'tel'], ['wt-done-tel', 'tel'], ['wt-bar-tel', 'tel'],
   ['wt-tel2', 'tel2'], ['wt-done-tel2', 'tel2'], ['wt-bar-tel2', 'tel2']].forEach(function (pair) {
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
// กติกาขั้นต่ำอยู่ใน njform.js ที่เดียว — ทั้งสามฟอร์มใช้ชุดเดียวกัน ห้ามก๊อปมาเขียนซ้ำ
// njform.js โหลดไม่สำเร็จก็ยังตรวจได้ครบเหมือนเดิม แค่ไม่มีข้อความชี้ว่าผิดช่องไหน
function validate(v) {
  if (window.NJForm) return NJForm.checkLead(v);
  if (!v.name) return { field: 'name', msg: 'กรุณากรอกชื่อ–นามสกุล' };
  if (v.phone.replace(/\D/g, '').length < 9) return { field: 'phone', msg: 'กรุณากรอกเบอร์โทรให้ครบถ้วน' };
  if (!v.pdpa) return { field: 'pdpa', msg: 'กรุณากดยินยอมให้เราติดต่อกลับ' };
  // ไม่บังคับให้กรอกทำเล/งบ/เนื้อที่ — โจทย์ที่ยังไม่ชัดก็ยังเป็นลีดที่คุยต่อได้
  // บังคับให้กรอกครบ = คนที่ยังไม่รู้ว่าตัวเองอยากได้อะไรกดถอยตั้งแต่ยังไม่ได้คุยกับใคร
  return null;
}

// ⚠️ ขึ้นข้อความ **สองที่** — กล่องสรุปบนหัวฟอร์ม และใต้ช่องที่ผิดจริง
// บนมือถือกล่องบนหัวฟอร์มเลื่อนพ้นจอไปแล้วตอนผู้ใช้กดส่ง เขาจึงเห็นแต่ปุ่มที่กดแล้วเงียบ
var wtErrs = null;
function showErr(msg, field) {
  if (!wtErrs && window.NJForm) wtErrs = NJForm.errors($('wanted-form'));
  if (wtErrs) { wtErrs.clear(); if (msg && field) wtErrs.set(field, msg); }
  var box = $('wt-err');
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.textContent = msg;
  box.hidden = false;
  // พาไปที่ช่องที่ผิดเลย ดีกว่าเลื่อนไปกล่องสรุปแล้วให้ผู้ใช้ไล่หาเองว่าช่องไหน
  if (wtErrs && field && wtErrs.focusFirst()) return;
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
      ref: (window.NJAttrib && NJAttrib.refText()) || 'wanted_page'   // ที่มาจาก attrib.js — ห้ามยัด query string ดิบ (ตั๋ว/โทเคนจะหลุดเข้าใบ)
    };

    var err = validate(v);
    if (err) { showErr(err.msg, err.field); return; }
    showErr('');

    // ที่มาของลีด — ไม่มีข้อมูลส่วนบุคคลอยู่ในนี้ (ดูคำเตือนหัวไฟล์ attrib.js)
    if (window.NJAttrib) v.attrib = NJAttrib.value();

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

// ---------- เติมโจทย์จากปุ่ม "แจ้งเตือนเมื่อมีแปลงตรงเงื่อนไข" ของหน้ารวมประกาศ (10 ต.ค. 69) ----------
// listings.html ส่งเงื่อนไขที่ผู้ซื้อกรองอยู่มาทาง query string (?from=listings&province=…)
// ⚠️ ค่าใน query string ใครก็ตั้งได้ (กติกาเดียวกับ prefillFromQuery ของ verify.js):
//    · รับเฉพาะคีย์/ตัวเลือกที่มีอยู่จริงในฟอร์มหรือในคำศัพท์กลาง (NJVocab) · ตัวเลขต้องเป็นตัวเลขจริง
//    · ใส่ลงช่องด้วย .value / .checked เท่านั้น ไม่ประกอบเป็น HTML
//    · ⛔ ไม่เติมช่องข้อมูลส่วนบุคคล (ชื่อ · เบอร์ · ยินยอม) เด็ดขาด — ผู้ใช้กรอกเองทุกครั้ง
//    · ไม่ทับสิ่งที่ผู้ใช้พิมพ์ไว้แล้ว (เบราว์เซอร์เติมค่าเดิมคืนตอนกดย้อนกลับ)
// ช่องที่หน้านี้ไม่มี (ผังสี · ประเภททรัพย์ · ชั้น · เช่า · คำค้น) ประกอบเป็นข้อความในช่องหมายเหตุ จากคำศัพท์กลาง
// ⚠️ เรียกตอน DOMContentLoaded — landvocab.js โหลด *หลัง* ไฟล์นี้ (ลำดับเดิมของหน้า ห้ามสลับเพื่อเรื่องนี้)
var WT_FLOORS = { '1': 'ชั้นเดียว', '2': '2 ชั้น', '3+': '3 ชั้นขึ้นไป' };
function prefillFromListings() {
  var form = $('wanted-form');
  if (!form || typeof URLSearchParams === 'undefined') return;
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  if (q.get('from') !== 'listings') return;
  var V = window.NJVocab || {};
  var did = false;
  function setText(name, v) {
    var el = form.elements[name];
    if (el && !el.value && v) { el.value = v; did = true; }
  }
  function num(k) { var v = Number(q.get(k)); return isFinite(v) && v > 0 && v < 1e12 ? String(v) : ''; }

  var prov = String(q.get('province') || '').trim();
  var pEl = $('wt-province1');
  if (pEl && !pEl.value && /^[฀-๿ ]{2,40}$/.test(prov)) {
    pEl.value = prov;
    // ยิงเหมือนผู้ใช้พิมพ์เอง — NJLandForm.initAddress สร้างรายชื่ออำเภอจากจังหวัดผ่านตัวฟังเดิม
    pEl.dispatchEvent(new Event('input', { bubbles: true }));
    pEl.dispatchEvent(new Event('change', { bubbles: true }));
    did = true;
  }
  setText('budgetMin', num('budgetMin'));
  setText('budgetMax', num('budgetMax'));
  // หน้ารวมประกาศกรองเนื้อที่เป็นไร่ — ตั้งหน่วยเป็นไร่ด้วย (เซิร์ฟเวอร์แปลงหน่วยเอง ไม่แปลงที่นี่)
  if (num('areaMin') || num('areaMax')) {
    var rai = form.querySelector('input[name="areaUnit"][value="rai"]');
    if (rai) rai.checked = true;
    setText('areaMin', num('areaMin'));
    setText('areaMax', num('areaMax'));
  }
  var deed = q.get('deedType');
  var dEl = (deed === 'chanote' || deed === 'nor3gor') && form.querySelector('input[name="deedType"][value="' + deed + '"]');
  if (dEl) { dEl.checked = true; did = true; }
  String(q.get('features') || '').split(',').forEach(function (k) {
    if (!/^[a-z]{2,16}$/.test(k)) return;
    var el = form.querySelector('input[name="features"][value="' + k + '"]');
    if (el) { el.checked = true; did = true; }
  });

  var extra = [];
  if (q.get('deal') === 'rent') extra.push('สนใจเช่า');
  var prop = q.get('prop');
  if (prop === 'any_building') extra.push('ประเภททรัพย์: มีสิ่งปลูกสร้าง');
  else if (prop && V.PROPERTY_TH && Object.prototype.hasOwnProperty.call(V.PROPERTY_TH, prop)) extra.push('ประเภททรัพย์: ' + V.PROPERTY_TH[prop]);
  var fl = q.get('floors');
  if (fl && Object.prototype.hasOwnProperty.call(WT_FLOORS, fl)) extra.push('จำนวนชั้น: ' + WT_FLOORS[fl]);
  var zone = q.get('zone');
  if (zone === 'checked') extra.push('ตรวจผังสีแล้ว');
  else if (zone && V.ZONE_TH && Object.prototype.hasOwnProperty.call(V.ZONE_TH, zone)) extra.push('ผังสี: ' + V.ZONE_TH[zone]);
  var dOther = q.get('deedOther');
  if (dOther && V.DEED_TH && Object.prototype.hasOwnProperty.call(V.DEED_TH, dOther)) extra.push('เอกสารสิทธิ์: ' + V.DEED_TH[dOther]);
  // ตัวกรองคะแนนข้อมูลพร้อม — รับเฉพาะเกณฑ์ที่หน้ารวมประกาศมี (ตรงกับ SCORE_MINS ใน listings.js)
  var sc = q.get('score');
  if (sc === '50' || sc === '70' || sc === '80') extra.push('ข้อมูลพร้อมตั้งแต่ ' + sc + '/100 ขึ้นไป');
  // คำค้นของผู้ใช้เอง — รับเฉพาะตัวอักษรไทย/อังกฤษ/ตัวเลข/เว้นวรรค ไม่เกิน 60 ตัว (ไม่รับลิงก์หรือสัญลักษณ์แปลกๆ)
  var kw = String(q.get('q') || '').trim();
  if (/^[฀-๿a-zA-Z0-9 .\-]{1,60}$/.test(kw)) extra.push('คำค้น: ' + kw);
  if (extra.length) setText('note', 'เงื่อนไขจากหน้าประกาศ — ' + extra.join(' · '));

  var hint = $('wt-prefill');
  if (hint && did) hint.hidden = false;
}

document.getElementById('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
setupContactLinks();
setupForm();
document.addEventListener('DOMContentLoaded', prefillFromListings);
njTrackInternal('buyer_request_view');
njTrack('ViewContent', { content_name: 'wanted_page' });
