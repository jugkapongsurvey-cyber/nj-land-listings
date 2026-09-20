/* ตัวช่วยฟอร์มชุดกลาง — จัดรูปเบอร์/ตัวเลข · ข้อความผิดพลาดรายช่อง · กันกดส่งซ้ำ · เก็บร่าง
 *
 * ทำไมต้องมี: เว็บมีฟอร์มเก็บลีด 7 ชุด (ฝากขาย · ตรวจทรัพย์ · ฝากหา · นัดตรวจ · ห้องข้อมูล ·
 * สมัครพันธมิตร · สนใจบริการ) ทุกชุดเขียนตัวตรวจของตัวเองแยกกัน และทุกชุดขึ้นข้อความผิดพลาด
 * **เป็นกล่องเดียวบนหัวฟอร์ม** ซึ่งบนมือถือแปลว่าผู้ใช้เห็นข้อความแล้วต้องเลื่อนลงไปเดาเองว่าช่องไหน
 *
 * ⚠️ **ไฟล์นี้ไม่บังคับ** — หน้าไหนโหลดไม่สำเร็จ ฟอร์มต้องยังส่งได้เหมือนเดิมทุกประการ
 *    ตัวตรวจจริงยังอยู่ที่ `validate()` ของแต่ละหน้า และที่เซิร์ฟเวอร์อีกชั้น
 *    ไฟล์นี้เพิ่มแค่ "ความชัดว่าผิดตรงไหน" ไม่ได้เป็นประตูกั้น
 *
 * ⚠️ **ห้ามเก็บข้อมูลส่วนบุคคลลงร่าง** — `draft()` รับเฉพาะรายชื่อช่องที่ผู้เรียกระบุมา
 *    และปฏิเสธชื่อช่องที่อยู่ใน `PII` เสมอ · เครื่องที่ใช้ร่วมกันในครอบครัวหรือร้านเน็ต
 *    ไม่ควรมีชื่อกับเบอร์ของคนก่อนหน้าค้างอยู่ในช่องกรอก
 */
(function () {
  'use strict';

  // ---------- จัดรูปเบอร์โทรไทย ----------
  //
  // ⚠️ **จัดรูปเฉพาะตอนเคอร์เซอร์อยู่ท้ายช่อง** — แก้กลางข้อความแล้วเขียนทับทั้งช่อง
  //    เคอร์เซอร์จะกระโดดไปท้ายทุกครั้งที่พิมพ์ ซึ่งแก้เบอร์ที่พิมพ์ผิดตัวเดียวไม่ได้เลย
  function fmtPhone(raw) {
    var s = String(raw || '');
    var plus = /^\+/.test(s.trim());
    var d = s.replace(/\D/g, '');
    if (plus) {
      // +66 ตัดศูนย์หน้าออกตามมาตรฐานสากล — จัดเป็นกลุ่มพออ่านออก ไม่ต้องเดารูปแบบ
      if (!d) return '+';
      return '+' + d.replace(/^(\d{1,2})(\d{0,3})(\d{0,3})(\d{0,4}).*$/, function (m, a, b, c, e) {
        return [a, b, c, e].filter(Boolean).join('-');
      });
    }
    if (d.length > 10) d = d.slice(0, 10);
    if (/^0[689]/.test(d)) {                       // มือถือ 10 หลัก
      return d.replace(/^(\d{3})(\d{0,3})(\d{0,4}).*$/, function (m, a, b, c) {
        return [a, b, c].filter(Boolean).join('-');
      });
    }
    if (/^02/.test(d)) {                           // กรุงเทพฯ 9 หลัก
      return d.replace(/^(\d{2})(\d{0,3})(\d{0,4}).*$/, function (m, a, b, c) {
        return [a, b, c].filter(Boolean).join('-');
      });
    }
    if (/^0/.test(d)) {                            // ต่างจังหวัด 9 หลัก
      return d.replace(/^(\d{3})(\d{0,3})(\d{0,3}).*$/, function (m, a, b, c) {
        return [a, b, c].filter(Boolean).join('-');
      });
    }
    return d;
  }

  function bindPhone(el) {
    if (!el || el.getAttribute('data-njf-phone') === 'on') return;
    el.setAttribute('data-njf-phone', 'on');
    el.addEventListener('input', function () {
      var atEnd = el.selectionStart === el.value.length;
      if (!atEnd) return;                          // ดูคำเตือนข้างบน
      var out = fmtPhone(el.value);
      if (out !== el.value) el.value = out;        // เทียบก่อนเขียนเสมอ
    });
    el.addEventListener('blur', function () {
      var out = fmtPhone(el.value);
      if (out !== el.value) el.value = out;
    });
  }

  // ---------- จัดรูปจำนวนเงิน ----------
  function fmtMoney(raw) {
    var d = String(raw || '').replace(/[^0-9]/g, '');
    if (!d) return '';
    d = d.replace(/^0+(?=\d)/, '');
    return Number(d).toLocaleString('en-US');
  }
  function bindMoney(el) {
    if (!el || el.getAttribute('data-njf-money') === 'on') return;
    el.setAttribute('data-njf-money', 'on');
    el.addEventListener('input', function () {
      if (el.selectionStart !== el.value.length) return;
      var out = fmtMoney(el.value);
      if (out !== el.value) el.value = out;
    });
  }

  // ---------- ข้อความผิดพลาดรายช่อง ----------
  //
  // ผูกด้วย `aria-describedby` + `aria-invalid` เพื่อให้เครื่องอ่านหน้าจออ่านข้อความนั้น
  // ตอนโฟกัสเข้าช่อง · ใส่สีอย่างเดียวคนที่แยกสีไม่ออกจะไม่รู้เลยว่าช่องไหนผิด
  var seq = 0;
  function slotFor(el) {
    var id = el.getAttribute('data-njf-err');
    if (id) { var old = document.getElementById(id); if (old) return old; }
    id = 'njf-err-' + (++seq);
    var p = document.createElement('p');
    p.className = 'njf-err';
    p.id = id;
    p.hidden = true;
    // วางต่อจากตัวห่อของช่อง ถ้ามี (ช่องส่วนใหญ่อยู่ใน <label>) ไม่งั้นวางต่อจากตัวช่องเอง
    var host = el.closest('label') || el;
    if (host.parentNode) host.parentNode.insertBefore(p, host.nextSibling);
    el.setAttribute('data-njf-err', id);
    return p;
  }

  function errors(form) {
    var touched = [];
    function set(el, msg) {
      // รับได้สามแบบ: ตัว element เอง · ชื่อช่อง/id · ตัวเลือก CSS เต็มรูป
      // (`njservices.js` ใช้ `data-njsv="phone"` ไม่ได้ตั้ง name ให้ช่อง)
      if (typeof el === 'string') {
        el = /^[[.]/.test(el)
          ? form.querySelector(el)
          : form.querySelector('[name="' + el + '"], #' + el);
      }
      if (!el) return;
      var p = slotFor(el);
      if (p.textContent !== msg) p.textContent = msg;   // เทียบก่อนเขียน (กับดัก MutationObserver)
      p.hidden = !msg;
      if (msg) {
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', p.id);
        if (touched.indexOf(el) < 0) touched.push(el);
        // ล้างเองเมื่อผู้ใช้เริ่มแก้ — ข้อความผิดที่ยังค้างอยู่ทั้งที่แก้แล้วอ่านเหมือนระบบไม่รับ
        if (el.getAttribute('data-njf-clear') !== 'on') {
          el.setAttribute('data-njf-clear', 'on');
          el.addEventListener('input', function () { set(el, ''); });
        }
      } else {
        el.removeAttribute('aria-invalid');
        if (el.getAttribute('aria-describedby') === p.id) el.removeAttribute('aria-describedby');
      }
    }
    function clear() { touched.slice().forEach(function (el) { set(el, ''); }); touched.length = 0; }
    function focusFirst() {
      for (var i = 0; i < touched.length; i++) {
        if (touched[i].getAttribute('aria-invalid') === 'true') {
          try { touched[i].focus({ preventScroll: false }); } catch (e) { touched[i].focus(); }
          return true;
        }
      }
      return false;
    }
    return { set: set, clear: clear, focusFirst: focusFirst };
  }

  // ---------- กันกดส่งซ้ำ ----------
  //
  // ทุกฟอร์มมี `btn.disabled = true` ของตัวเองอยู่แล้ว ตัวนี้เสริมสองอย่างที่ยังขาด:
  // (1) กัน Enter ยิงซ้ำระหว่างที่คำขอแรกยังไม่กลับ (2) คืนข้อความปุ่มเดิมเสมอแม้ทางที่ล้มเหลว
  function guard(btn, busyText) {
    if (!btn) return { on: function () {}, off: function () {} };
    var was = btn.textContent, busy = false;
    return {
      busy: function () { return busy; },
      on: function () {
        busy = true;
        btn.disabled = true;
        if (busyText && btn.textContent !== busyText) btn.textContent = busyText;
      },
      off: function () {
        busy = false;
        btn.disabled = false;
        if (btn.textContent !== was) btn.textContent = was;
      }
    };
  }

  // ---------- เก็บร่าง ----------
  //
  // ⚠️ รายชื่อช่องที่ห้ามเก็บ — ตรวจทั้งชื่อช่องและ autocomplete เพราะบางฟอร์มตั้งชื่อไม่เหมือนกัน
  var PII = /(^|[-_])(name|fullname|phone|tel|mobile|email|line|lineid|address|idcard)([-_]|$)/i;
  function draft(form, key, fields) {
    if (!form || !key || !fields || !fields.length) return { restore: function () {}, clear: function () {} };
    var safe = fields.filter(function (n) { return !PII.test(n); });

    function nodes() {
      return safe.map(function (n) {
        return { n: n, el: form.querySelector('[name="' + n + '"], #' + n) };
      }).filter(function (x) { return x.el; });
    }
    function save() {
      var out = {};
      nodes().forEach(function (x) {
        var v = x.el.type === 'checkbox' ? !!x.el.checked : String(x.el.value || '').slice(0, 800);
        if (v) out[x.n] = v;
      });
      try {
        if (Object.keys(out).length) localStorage.setItem(key, JSON.stringify({ at: Date.now(), v: out }));
        else localStorage.removeItem(key);
      } catch (e) {}
    }
    function restore() {
      var d;
      try { d = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return; }
      if (!d || !d.v) return;
      if (Date.now() - Number(d.at || 0) > 7 * 24 * 60 * 60 * 1000) { clear(); return; }
      nodes().forEach(function (x) {
        var v = d.v[x.n];
        if (v == null || x.el.value) return;      // ไม่ทับสิ่งที่ผู้ใช้พิมพ์ไว้แล้ว
        if (x.el.type === 'checkbox') x.el.checked = !!v;
        else x.el.value = v;
      });
    }
    function clear() { try { localStorage.removeItem(key); } catch (e) {} }

    form.addEventListener('input', function () {
      clearTimeout(save._t);
      save._t = setTimeout(save, 600);            // หน่วงไว้ ไม่เขียนทุกตัวอักษร
    });
    return { restore: restore, clear: clear, save: save };
  }

  // ---------- กติกาขั้นต่ำของลีด ใช้ร่วมกันทุกฟอร์ม ----------
  //
  // ⚠️ **บังคับแค่ชื่อ เบอร์ และความยินยอม** — กติกาเดิมของหน้าฝากหาที่ดินและหน้านัดตรวจ
  //    คนที่ยังไม่รู้ว่าตัวเองอยากได้อะไรก็ยังเป็นลีดที่คุยต่อได้ · บังคับครบทุกช่อง
  //    = เขากดถอยตั้งแต่ยังไม่ได้คุยกับใคร · **ห้ามเพิ่มช่องบังคับลงในนี้**
  //
  // ⚠️ นี่คือกติกาฝั่งหน้าจอเพื่อ "บอกผู้ใช้" เท่านั้น **เซิร์ฟเวอร์ตรวจซ้ำอีกชั้นเสมอ**
  //    ค่าที่วิ่งถึงเซิร์ฟเวอร์แก้ได้ด้วยเครื่องมือนักพัฒนา จึงห้ามเชื่อฝั่งนี้อย่างเดียว
  function checkLead(v, opt) {
    opt = opt || {};
    if (!v.name) return { field: opt.nameField || 'name', msg: opt.nameMsg || 'กรุณากรอกชื่อ–นามสกุล' };
    if (String(v.phone || '').replace(/\D/g, '').length < 9) {
      return { field: opt.phoneField || 'phone', msg: 'กรุณากรอกเบอร์โทรให้ครบถ้วน' };
    }
    if (opt.pdpa !== false && !v.pdpa) {
      return { field: opt.pdpaField || 'pdpa', msg: 'กรุณากดยินยอมให้เราติดต่อกลับ' };
    }
    return null;
  }

  // ---------- ติดตั้งให้ทั้งฟอร์มในครั้งเดียว ----------
  function attach(form) {
    if (!form) return null;
    form.querySelectorAll('input[type="tel"], input[inputmode="tel"]').forEach(bindPhone);
    form.querySelectorAll('[data-njf="money"]').forEach(bindMoney);
    return errors(form);
  }

  // หน้าไหนมีช่องเบอร์โทรอยู่นอกฟอร์ม (เช่นกล่อง "สนใจบริการ" ที่วาดด้วย JS ทีหลัง) เรียก bindPhone เองได้
  window.NJForm = {
    fmtPhone: fmtPhone, fmtMoney: fmtMoney,
    bindPhone: bindPhone, bindMoney: bindMoney,
    errors: errors, guard: guard, draft: draft, attach: attach, checkLead: checkLead
  };

  // ติดให้อัตโนมัติกับทุกฟอร์มที่ประกาศตัวว่าอยากได้ (`data-njform`)
  function boot() { document.querySelectorAll('form[data-njform]').forEach(attach); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
