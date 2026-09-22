/* ฟอร์ม "ฝากขายฟรี" บนหน้าแรก
 *
 * ⚠️ ยิงเข้า **เส้นทางรับลีดเดิมของทั้งเว็บ** `POST {NJ_API_BASE}/api/public/consign`
 *    ตัวเดียวกับหน้า `consign.html` — ห้ามสร้างเส้นทางใหม่ ไม่งั้นทีมขายต้องเฝ้าสองกล่อง
 *    และกติกากันสแปม/กันซ้ำ/เก็บที่มาของลีด จะมีสองที่ให้ลืมแก้
 *
 * ⚠️ ฟอร์มนี้เป็น "ฟอร์มสั้น" โดยตั้งใจ — บังคับแค่ชื่อ เบอร์ ทำเล และการยินยอม
 *    คนที่ยังไม่รู้ราคาที่อยากขายก็ยังเป็นลีดที่ทีมขายคุยต่อได้ (กติกาเดียวกับหน้าฝากหาที่ดิน)
 *    เจ้าของที่อยากกรอกครบมีลิงก์ไปหน้าฝากขายเต็มอยู่ในเมนูและแถบล่าง
 *
 * ⚠️ ไม่เก็บร่างลงเบราว์เซอร์ — ช่องในฟอร์มนี้เป็นข้อมูลส่วนบุคคลล้วน (ชื่อ · เบอร์)
 *    เครื่องที่ใช้ร่วมกันในครอบครัวไม่ควรมีชื่อกับเบอร์ของคนก่อนหน้าค้างอยู่ (กติกาเดียวกับ njform.js)
 */
(function () {
  'use strict';

  var form = document.getElementById('sell-form');
  if (!form) return;

  var msg = document.getElementById('sell-msg');
  var btn = form.querySelector('button[type="submit"]');
  var DEFAULT_MSG = msg ? msg.textContent : '';

  function val(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || '').trim() : '';
  }

  function say(text, kind) {
    if (!msg) return;
    if (msg.textContent !== text) msg.textContent = text;   // เทียบก่อนเขียนเสมอ (กับดัก MutationObserver)
    msg.className = 'form-note' + (kind ? ' is-' + kind : '');
  }

  // "2-1-50" → {rai:2, ngan:1, wa:50} · "2" → {rai:2} · อ่านไม่ออก = ไม่ส่งเลข ไม่ใช่เดา
  // ⚠️ ห้ามเดาเนื้อที่จากข้อความที่อ่านไม่ออก — เซิร์ฟเวอร์เอาเนื้อที่ไปคูณกับราคาต่อหน่วย
  //    และตัวเลขนั้นคือสิ่งที่ทีมขายใช้ตัดสินใจจริง
  function parseArea(text) {
    var m = String(text || '').trim().match(/^(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?(?:\s*-\s*(\d+(?:\.\d+)?))?$/);
    if (!m) return null;
    return { rai: Number(m[1] || 0), ngan: Number(m[2] || 0), wa: Number(m[3] || 0) };
  }

  // เบอร์ไทยต้องมีตัวเลขอย่างน้อย 9 ตัว — กติกาเดียวกับที่เซิร์ฟเวอร์ตรวจซ้ำอีกชั้น
  function phoneOk(p) { return String(p).replace(/\D/g, '').length >= 9; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = val('name'), phone = val('phone'), loc = val('locDetail');
    var pdpa = form.querySelector('[name="pdpa"]');

    // ตรวจฝั่งหน้าจอเพื่อ "บอกผู้ใช้" — ฝั่งเซิร์ฟเวอร์ตรวจซ้ำเพื่อ "บังคับจริง"
    // และต้องย้ายโฟกัสไปที่ช่องที่ผิดทุกครั้ง ไม่ใช่ขึ้นข้อความเฉยๆ แล้วปล่อยให้หาเอง
    var bad = null;
    if (!name) bad = ['name', 'กรุณากรอกชื่อผู้ติดต่อ'];
    else if (!phoneOk(phone)) bad = ['phone', 'เบอร์โทรไม่ถูกต้อง กรุณาตรวจอีกครั้ง'];
    else if (!loc) bad = ['locDetail', 'กรุณากรอกทำเลที่ดิน (ตำบล อำเภอ จังหวัด)'];
    else if (pdpa && !pdpa.checked) bad = ['pdpa', 'กรุณาติ๊กยินยอมให้ติดต่อกลับก่อนส่ง'];
    if (bad) {
      var el = form.querySelector('[name="' + bad[0] + '"]');
      if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); }
      say(bad[1], 'error');
      return;
    }
    form.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });

    var area = parseArea(val('size'));
    // ประเภทเอกสารสิทธิ์ยังไม่มีช่องของตัวเองในใบฝากขาย — ต่อท้ายข้อความให้ทีมขายเห็นแทน
    // (ทีมกรอกลงช่อง deedType ในระบบเองตอนเปิดการ์ด)
    var note = [val('doc') ? 'เอกสารสิทธิ์: ' + val('doc') : '', val('note')].filter(Boolean).join('\n');

    var body = {
      name: name,
      phone: phone,
      type: 'sell',
      locDetail: loc,
      note: note,
      website: val('website'),                 // กับดักบอท — คนจริงมองไม่เห็นช่องนี้
      // ที่มาของลีด — ไม่มีข้อมูลส่วนบุคคลอยู่ในนี้ (ดูคำเตือนหัวไฟล์ attrib.js)
      ref: (window.NJAttrib && NJAttrib.refText()) || 'home_sell_form'
    };
    if (area) { body.rai = area.rai; body.ngan = area.ngan; body.wa = area.wa; }
    if (window.NJAttrib) body.attrib = NJAttrib.value();

    var base = window.NJ_API_BASE || 'https://app.njteedinsure.com';
    if (btn) { btn.disabled = true; }
    say('กำลังส่งข้อมูล…');

    fetch(base + '/api/public/consign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        // 204 = โดนกับดักบอท เซิร์ฟเวอร์ตอบเหมือนสำเร็จโดยตั้งใจ ฝั่งนี้จึงแสดงเหมือนสำเร็จเช่นกัน
        if (r.status === 204) return {};
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d && d.error ? d.error : '');
          return d;
        });
      })
      .then(function (d) {
        form.reset();
        // ⚠️ ไม่ยิงสถิติ `consign_submit` จากเบราว์เซอร์ — เซิร์ฟเวอร์บันทึกให้แล้วตอนสร้างใบ
        //    ยิงซ้ำที่นี่ = ลีดหนึ่งใบถูกนับสองครั้ง แล้วเกณฑ์ที่ใช้ตัดสินผลโฆษณาจะสูงกว่าความจริง
        say(d && d.id
          ? 'ส่งข้อมูลเรียบร้อย · เลขที่ใบฝากขาย ' + d.id + ' — ทีมงานจะติดต่อกลับภายใน 1 วันทำการ'
          : 'ส่งข้อมูลเรียบร้อย — ทีมงานจะติดต่อกลับภายใน 1 วันทำการ', 'ok');
      })
      .catch(function (err) {
        // ส่งไม่สำเร็จ **ห้ามเงียบ** — ต้องบอกตามจริงและยื่นช่องทางที่ใช้ได้แน่ๆ ให้แทน
        var cfg = window.NJ_CONFIG || {};
        say((err && err.message ? err.message : 'ส่งข้อมูลไม่สำเร็จ') +
          ' · โทร ' + (cfg.tel || '02-162-0405') + ' หรือทักไลน์ ' + (cfg.lineId || '@716lffzt') + ' ได้เลย', 'error');
      })
      .then(function () { if (btn) btn.disabled = false; });
  });
})();
