// การ์ดผู้ลงประกาศ (เจ้าของ / ผู้รับมอบอำนาจ / นายหน้า) — ฟอร์มในหน้าฝากขาย (consign.html)
// ส่งไป POST /api/public/consign/:id/agent-card ของ nj-survey-system · เพิ่ม 2026-10-10
//
// ⚠️⚠️ กติกา (ต้นฉบับอยู่ที่ lib/agentcard.js ของระบบหลังบ้าน — ที่นี่แค่แสดงผล):
//   1. **ข้อความยินยอมมาจาก GET /api/public/consign/spec (agentCard.consentText) ที่เดียว** ห้ามพิมพ์ซ้ำในไฟล์นี้
//      · ไม่มีก้อน agentCard ใน spec (สวิตช์ปิด) = ไม่แสดงกล่องนี้เลย
//   2. การ์ดไม่ขึ้นหน้าประกาศจนกว่าทีม NJ จะกด "รับรอง" — หน้านี้ต้องบอกผู้ใช้ตรงๆ ไม่ใช่ทำให้คิดว่าส่งแล้วขึ้นเลย
//      · สถานะ/ข้อความทั้งหมดมาจากเซิร์ฟเวอร์ (status · statusTh · live · reason) ห้ามตัดสินเอง
//   3. ไม่รับ/ไม่แสดงเบอร์โทร อีเมล ลิงก์ ไลน์ ในช่องชื่อ-บริษัท — เซิร์ฟเวอร์เป็นคนตัดสิน หน้านี้แค่แสดงข้อความที่ตอบกลับ
//   4. ข้อความจากผู้ใช้ใส่ผ่าน textContent เท่านั้น ห้ามต่อเป็น HTML
//   5. ถอนความยินยอมต้องง่ายพอๆ กับให้ — ปุ่มลบการ์ดอยู่ในกล่องเดียวกัน (ลบการ์ดและรูปจริง)
//   6. ไม่ใช้คำว่า ผ่าน/ปลอดภัย/รับประกัน/ยืนยันตัวตนแล้ว กับการ์ด — การรับรอง = ทีมตรวจรูปและข้อความ ไม่ใช่การยืนยันสิทธิ์ในทรัพย์
(function () {
  'use strict';
  var API = (typeof NJ_API_BASE !== 'undefined') ? NJ_API_BASE : '';
  var SPEC = null, CUR = null, PHOTO_FILE = null, REMOVE_PHOTO = false, BUSY = false;
  function $(id) { return document.getElementById(id); }
  function lead() { return (typeof LEAD !== 'undefined' && LEAD && LEAD.id) ? LEAD : null; }
  function url() {
    var L = lead();
    return L ? API + '/api/public/consign/' + encodeURIComponent(L.id) + '/agent-card?t=' + encodeURIComponent(L.token) : '';
  }
  function msg(text, kind) {
    var el = $('cs-ac-msg');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'cs-ac-msg' + (kind ? ' ' + kind : '');
    el.hidden = !text;
  }
  function say(el, text) { if (el) el.textContent = text; }

  // ---------- วาดสถานะ + ค่าในฟอร์ม ----------
  function paint(d) {
    var box = $('cs-ac');
    if (!box) return;
    // ไม่มีก้อนใน spec (สวิตช์ปิด) · ยังไม่มีใบ · ใบนี้เป็นผู้ซื้อ (ตรวจชัวร์ ไม่ลงประกาศ) · ยกเลิกแล้ว = ซ่อน
    var role = d && d.submitterRole;
    box.hidden = !(SPEC && d && role !== 'buyer' && !d.cancelled);
    if (box.hidden) return;
    CUR = d.agentCard || null;
    var st = $('cs-ac-status'), del = $('cs-ac-del'), save = $('cs-ac-save');
    if (st) {
      st.className = 'cs-ac-status' + (CUR ? ' s-' + CUR.status : '');
      if (!CUR) { st.textContent = 'ยังไม่ได้ทำการ์ด — ไม่บังคับ ประกาศขึ้นเว็บได้ตามปกติโดยไม่มีการ์ด'; }
      else if (CUR.live) { st.textContent = '✓ ' + (CUR.statusTh || 'ทีมงานรับรองการ์ดแล้ว') + ' — จะแสดงบนหน้าประกาศเมื่อประกาศขึ้นเว็บ'; }
      else if (CUR.status === 'rejected') { st.textContent = 'ทีมงานขอให้แก้ไข: ' + (CUR.reason || '—') + ' · แก้แล้วกดส่งอีกครั้ง'; }
      else { st.textContent = '⏳ ' + (CUR.statusTh || 'รอทีมตรวจ') + ' — ยังไม่ขึ้นหน้าประกาศจนกว่าทีมงานจะรับรอง'; }
    }
    if (del) del.hidden = !CUR;
    if (save) save.textContent = CUR ? 'บันทึกและส่งให้ทีมตรวจอีกครั้ง' : 'ส่งการ์ดให้ทีมงานตรวจ';
    var nm = $('cs-ac-name'), co = $('cs-ac-co');
    if (CUR && nm && document.activeElement !== nm && !nm.dataset.dirty) nm.value = CUR.name || '';
    if (CUR && co && document.activeElement !== co && !co.dataset.dirty) co.value = CUR.company || '';
    var prev = $('cs-ac-prev');
    if (prev) {
      var u = PHOTO_FILE ? URL.createObjectURL(PHOTO_FILE) : (!REMOVE_PHOTO && CUR && CUR.photo && CUR.photo.url ? (CUR.photo.url.charAt(0) === '/' ? API + CUR.photo.url : CUR.photo.url) : '');
      prev.hidden = !u;
      if (u) prev.src = u; else prev.removeAttribute('src');
    }
    var rm = $('cs-ac-rmphoto');
    if (rm) rm.hidden = !(PHOTO_FILE || (CUR && CUR.photo && !REMOVE_PHOTO));
    sync();
  }
  // ปุ่มส่งเปิดได้ต่อเมื่อมีชื่อ + ติ๊กยินยอม (เซิร์ฟเวอร์ตรวจซ้ำเสมอ)
  function sync() {
    var save = $('cs-ac-save');
    if (!save) return;
    var name = ($('cs-ac-name') && $('cs-ac-name').value || '').trim();
    var yes = $('cs-ac-consent') && $('cs-ac-consent').checked;
    save.disabled = BUSY || !name || !yes;
  }

  function submit(ev) {
    if (ev) ev.preventDefault();
    var L = lead();
    if (!L || BUSY) return;
    var fd = new FormData();
    fd.append('name', ($('cs-ac-name').value || '').trim());
    fd.append('company', ($('cs-ac-co').value || '').trim());
    fd.append('consent', $('cs-ac-consent').checked ? 'true' : 'false');
    if (PHOTO_FILE) fd.append('photo', PHOTO_FILE, PHOTO_FILE.name || 'photo.jpg');
    else if (REMOVE_PHOTO) fd.append('removePhoto', '1');
    BUSY = true; sync(); msg('กำลังส่ง…', '');
    fetch(url(), { method: 'POST', body: fd }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || 'ส่งการ์ดไม่สำเร็จ ลองใหม่อีกครั้ง');
        return d;
      });
    }).then(function (d) {
      BUSY = false; PHOTO_FILE = null; REMOVE_PHOTO = false;
      ['cs-ac-name', 'cs-ac-co'].forEach(function (id) { var e = $(id); if (e) delete e.dataset.dirty; });
      var c = $('cs-ac-consent'); if (c) c.checked = false;
      var pf = $('cs-ac-photo'); if (pf) pf.value = '';
      if (L.data) L.data.agentCard = d.agentCard;
      paint(L.data);
      msg('ส่งการ์ดให้ทีมงานตรวจแล้ว — ยังไม่ขึ้นหน้าประกาศจนกว่าทีมงานจะรับรอง', 'ok');
    }).catch(function (e) {
      BUSY = false; sync();
      msg(e.message || 'ส่งการ์ดไม่สำเร็จ', 'err');
    });
  }

  function withdraw() {
    var L = lead();
    if (!L || BUSY || !CUR) return;
    if (!window.confirm('ลบการ์ดผู้ลงประกาศและรูปของคุณออกจากระบบ (ถอนความยินยอม)?\nการ์ดจะหายจากหน้าประกาศทันที')) return;
    BUSY = true; sync(); msg('กำลังลบ…', '');
    fetch(url(), { method: 'DELETE' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.error || 'ลบการ์ดไม่สำเร็จ ลองใหม่อีกครั้ง');
        return d;
      });
    }).then(function () {
      BUSY = false; PHOTO_FILE = null; REMOVE_PHOTO = false;
      ['cs-ac-name', 'cs-ac-co'].forEach(function (id) { var e = $(id); if (e) { e.value = ''; delete e.dataset.dirty; } });
      if (L.data) L.data.agentCard = null;
      paint(L.data);
      msg('ลบการ์ดและรูปแล้ว', 'ok');
    }).catch(function (e) { BUSY = false; sync(); msg(e.message || 'ลบการ์ดไม่สำเร็จ', 'err'); });
  }

  function wire() {
    var form = $('cs-ac-form');
    if (!form || form.dataset.wired) return;
    form.dataset.wired = '1';
    form.addEventListener('submit', submit);
    ['cs-ac-name', 'cs-ac-co'].forEach(function (id) {
      var e = $(id); if (e) e.addEventListener('input', function () { e.dataset.dirty = '1'; sync(); });
    });
    var c = $('cs-ac-consent'); if (c) c.addEventListener('change', sync);
    var pf = $('cs-ac-photo');
    if (pf) pf.addEventListener('change', function () {
      var f = pf.files && pf.files[0];
      if (f && !/^image\//.test(f.type || '')) { msg('รูปหน้าต้องเป็นไฟล์รูปภาพ', 'err'); pf.value = ''; return; }
      PHOTO_FILE = f || null; REMOVE_PHOTO = false; msg('', '');
      paint(lead() && lead().data);
    });
    var rm = $('cs-ac-rmphoto');
    if (rm) rm.addEventListener('click', function () {
      PHOTO_FILE = null; REMOVE_PHOTO = true;
      var p = $('cs-ac-photo'); if (p) p.value = '';
      paint(lead() && lead().data);
    });
    var del = $('cs-ac-del'); if (del) del.addEventListener('click', withdraw);
  }

  // ข้อความยินยอม + ข้อจำกัดความยาว ดึงจาก spec ที่เดียว
  function init() {
    wire();
    fetch(API + '/api/public/consign/spec').then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      SPEC = s && s.agentCard ? s.agentCard : null;
      if (!SPEC) return;
      say($('cs-ac-consent-text'), SPEC.consentText || '');
      var nm = $('cs-ac-name'), co = $('cs-ac-co');
      if (nm && SPEC.nameMax) nm.maxLength = SPEC.nameMax;
      if (co && SPEC.companyMax) co.maxLength = SPEC.companyMax;
      say($('cs-ac-disclaim'), SPEC.disclaim || '');
      paint(lead() && lead().data);
    }).catch(function () { SPEC = null; });
  }

  window.NJAgentCard = { paint: paint, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
