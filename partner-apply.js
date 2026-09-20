/* ============================================================
   สมัครเป็นพันธมิตรกับ NJ (Phase 6 รอบ 2)
   หน้าเดียวทำสองหน้าที่ — มี ?id= และ ?t= ในลิงก์ = หน้าติดตามใบสมัคร + แนบเอกสาร · ไม่มี = ฟอร์มสมัคร

   ⚠️ กติกาที่ห้ามผ่อน
   1. **คีย์ประเภทบริการต้องตรงกับ DEFAULT_SERVICE_TYPES ใน nj-survey-system/lib/partners.js เป๊ะ**
      เซิร์ฟเวอร์ปฏิเสธคีย์ที่ไม่รู้จัก (มีเทสต์เทียบข้าม repo ใน contracts.test.js)
   2. **ไม่ติ๊กยินยอม = ส่งไม่ได้** ปิดที่ปุ่ม และเซิร์ฟเวอร์ปฏิเสธซ้ำอีกชั้น
   3. **ไม่มีช่องรหัสผ่าน ไม่สร้างบัญชี** — บัญชีเข้าพอร์ทัลพันธมิตร NJ เป็นผู้สร้างให้หลังผ่านการตรวจ
      (เว็บนี้เป็นสแตติกคนละโดเมนกับระบบ รับรหัสผ่านที่นี่ = สอนคนให้โดนฟิชชิ่ง)
   4. **ห้ามรับปากว่าจะได้งาน หรือเขียนค่าธรรมเนียม/ส่วนแบ่งที่ยังไม่ได้ตกลง**
   5. **กับดักบอทใช้ช่อง hp** — ช่อง website ของฟอร์มนี้เป็นข้อมูลจริงของผู้สมัคร
   ============================================================ */
(function (w, d) {
  'use strict';

  // ⚠️ คีย์ต้องตรงกับ DEFAULT_SERVICE_TYPES ใน nj-survey-system/lib/partners.js (ทั้งชุดและลำดับ)
  var TYPES = [
    { k: 'valuation', t: 'บริษัทประเมินราคาทรัพย์สิน' },
    { k: 'land_lawyer', t: 'ทนายความด้านที่ดิน' },
    { k: 'architect', t: 'สถาปนิก' },
    { k: 'engineer', t: 'วิศวกร' },
    { k: 'contractor', t: 'บริษัทรับเหมาก่อสร้าง' },
    { k: 'landfill', t: 'บริษัทถมดิน' },
    { k: 'soil_survey', t: 'ผู้ให้บริการสำรวจดิน' },
    { k: 'lending', t: 'ธนาคารหรือที่ปรึกษาสินเชื่อ' },
    { k: 'property_care', t: 'ผู้ให้บริการดูแลทรัพย์' },
    { k: 'local_broker', t: 'นายหน้าท้องถิ่น' }
  ];
  // ชนิดเอกสารที่ผู้สมัครแนบได้ (ชุดย่อยของ PARTNER_DOC_KINDS ใน server.js — ไม่ขอหน้าสมุดบัญชีตอนสมัคร)
  var DOC_KINDS = [
    ['company_cert', 'หนังสือรับรองบริษัท'], ['id_card', 'สำเนาบัตรประชาชน (ขีดทับเลขที่ไม่จำเป็นได้)'],
    ['vat_reg', 'ภ.พ.20'], ['license', 'ใบอนุญาตที่เกี่ยวข้อง'], ['portfolio', 'ผลงาน'], ['insurance', 'กรมธรรม์ / ประกัน'], ['other', 'อื่นๆ']
  ];
  var STATUS_STEP = { applicant: 1, doc_review: 2, interview: 3, trial: 4, approved: 5, suspended: 0, terminated: 0 };

  var API = w.NJ_API_BASE || 'https://app.njteedinsure.com';
  var LINE = 'https://line.me/R/ti/p/@716lffzt';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function qs(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
  function thaiDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso || ''))) return '';
    var M = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    var p = String(iso).slice(0, 10).split('-');
    return Number(p[2]) + ' ' + M[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
  }
  function typeTh(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].k === k) return TYPES[i].t; return k; }

  /* ---------- ฟอร์มสมัคร ---------- */
  function formHtml() {
    var svc = TYPES.map(function (s) {
      return '<label class="pa-svc"><input type="checkbox" name="svc" value="' + esc(s.k) + '"><span>' + esc(s.t) + '</span></label>';
    }).join('');
    return '<form id="pa-form" class="pa-form" novalidate data-njform>' +
      '<div class="pa-step"><span class="pa-n">1</span><h2>ผู้สมัคร</h2></div>' +
      '<div class="pa-kinds">' +
        '<label><input type="radio" name="kind" value="company" checked> นิติบุคคล</label>' +
        '<label><input type="radio" name="kind" value="person"> บุคคลธรรมดา</label>' +
      '</div>' +
      '<label class="pa-f"><span>ชื่อบริษัท / ชื่อ-สกุล <b class="req">*</b></span><input name="name" required maxlength="200"></label>' +
      '<label class="pa-f"><span>เลขประจำตัวผู้เสียภาษี (13 หลัก · ถ้ามี)</span><input name="taxId" maxlength="17" inputmode="numeric"></label>' +

      '<div class="pa-step"><span class="pa-n">2</span><h2>บริการที่ให้ <b class="req">*</b></h2></div>' +
      '<div class="pa-svcs">' + svc + '</div>' +
      '<label class="pa-f"><span>จังหวัดที่ให้บริการ</span><input name="areas" maxlength="400" placeholder="เช่น สมุทรปราการ, ฉะเชิงเทรา"><small>คั่นแต่ละจังหวัดด้วยเครื่องหมายจุลภาค · ว่างไว้ = ยังไม่ระบุ</small></label>' +

      '<div class="pa-step"><span class="pa-n">3</span><h2>ผู้ติดต่อ</h2></div>' +
      '<div class="pa-grid">' +
        '<label class="pa-f"><span>ชื่อผู้ติดต่อ <b class="req">*</b></span><input name="cName" required maxlength="120" autocomplete="name"></label>' +
        '<label class="pa-f"><span>เบอร์โทร</span><input name="cPhone" maxlength="40" inputmode="tel" autocomplete="tel"></label>' +
        '<label class="pa-f"><span>อีเมล</span><input name="cEmail" type="email" maxlength="160" autocomplete="email"></label>' +
        '<label class="pa-f"><span>ไลน์ไอดี</span><input name="cLine" maxlength="80"></label>' +
      '</div>' +
      '<label class="pa-f"><span>เว็บไซต์ (ถ้ามี)</span><input name="website" maxlength="300" placeholder="https://"></label>' +
      '<label class="pa-f"><span>ที่อยู่</span><textarea name="address" rows="2" maxlength="500"></textarea></label>' +

      // กับดักบอท — ซ่อนจากคนจริงด้วย CSS
      '<input type="text" name="hp" class="pa-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +

      '<label class="pa-pdpa"><input type="checkbox" name="pdpa" id="pa-pdpa">' +
        '<span>ยินยอมให้ บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด เก็บและใช้ข้อมูลในใบสมัครนี้ ' +
        'เพื่อพิจารณาเข้าทะเบียนพันธมิตรและติดต่อกลับเท่านั้น และขอให้ลบเมื่อไรก็ได้</span></label>' +
      '<p class="pa-free">การส่งใบสมัคร<b>ไม่ใช่การรับประกันว่าจะได้รับงาน</b> · ค่าธรรมเนียมและเงื่อนไขจะตกลงเป็นรายกรณีกับทีมงาน</p>' +
      '<button type="submit" id="pa-send" class="pa-send" disabled>ส่งใบสมัคร</button>' +
      '<p id="pa-msg" class="pa-msg" role="status" aria-live="polite"></p>' +
    '</form>';
  }

  function collect(form) {
    var svc = [];
    form.querySelectorAll('input[name="svc"]:checked').forEach(function (c) { svc.push(c.value); });
    var kindEl = form.querySelector('input[name="kind"]:checked');
    var areas = String(form.elements.areas.value || '').split(/[,，]/).map(function (s) { return s.trim(); })
      .filter(Boolean).map(function (p) { return { province: p }; });
    return {
      kind: kindEl ? kindEl.value : 'company',
      name: (form.elements.name.value || '').trim(),
      taxId: (form.elements.taxId.value || '').trim(),
      serviceKeys: svc,
      areas: areas,
      contacts: [{
        name: (form.elements.cName.value || '').trim(), phone: (form.elements.cPhone.value || '').trim(),
        email: (form.elements.cEmail.value || '').trim(), line: (form.elements.cLine.value || '').trim()
      }],
      website: (form.elements.website.value || '').trim(),
      address: (form.elements.address.value || '').trim(),
      hp: (form.elements.hp.value || '').trim(),
      pdpa: !!form.elements.pdpa.checked
    };
  }

  function okScreen(root, res) {
    var link = location.origin + location.pathname + '?id=' + encodeURIComponent(res.id) + '&t=' + encodeURIComponent(res.ticket);
    root.innerHTML =
      '<div class="pa-done">' +
        '<div class="pa-done-ic" aria-hidden="true">✓</div>' +
        '<h2>ส่งใบสมัครเรียบร้อยแล้ว</h2>' +
        '<p class="pa-no">เลขใบสมัครของคุณคือ <b>' + esc(res.id) + '</b></p>' +
        '<p>ขั้นต่อไป: แนบหนังสือรับรอง ใบอนุญาตที่เกี่ยวข้อง หรือผลงาน จากลิงก์ด้านล่าง เพื่อให้ทีมงานตรวจได้เร็วขึ้น</p>' +
        '<div class="pa-track">' +
          '<b>เก็บลิงก์นี้ไว้ติดตามใบสมัครและแนบเอกสาร</b>' +
          '<input id="pa-link" readonly value="' + esc(link) + '">' +
          '<button type="button" id="pa-copy" class="pa-copy">คัดลอกลิงก์</button>' +
          '<a class="pa-open" href="' + esc(link) + '">เปิดหน้าแนบเอกสาร →</a>' +
          '<small>ลิงก์นี้เปิดดูได้เฉพาะคุณ · อย่าส่งต่อให้คนที่ไม่เกี่ยวข้อง</small>' +
        '</div>' +
        '<a class="pa-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">สอบถามทีมงานทางไลน์</a>' +
      '</div>';
    var btn = d.getElementById('pa-copy');
    btn.addEventListener('click', function () {
      var inp = d.getElementById('pa-link');
      function fallback() { inp.select(); try { d.execCommand('copy'); } catch (e) { w.prompt('คัดลอกลิงก์นี้ไว้', inp.value); } }
      if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
        w.navigator.clipboard.writeText(inp.value).then(function () { btn.textContent = 'คัดลอกแล้ว ✓'; }).catch(fallback);
      } else fallback();
    });
  }

  function bindForm(root) {
    var form = d.getElementById('pa-form');
    var send = d.getElementById('pa-send');
    var msg = d.getElementById('pa-msg');
    var pdpa = d.getElementById('pa-pdpa');
    function refresh() { send.disabled = !pdpa.checked; }
    pdpa.addEventListener('change', refresh);
    refresh();
    // ⚠️ ฟอร์มนี้ถูกวาดหลัง DOMContentLoaded — ต้องเรียก attach เองเหมือน njservices.js
    if (window.NJForm) NJForm.attach(form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = collect(form);
      var c = b.contacts[0];
      var errs = window.NJForm ? NJForm.errors(form) : null;
      function err(t, el) {
        msg.textContent = t; msg.className = 'pa-msg err';
        if (errs && el) { errs.clear(); errs.set(el, t); }
        if (el) el.focus();
      }
      if (!b.name) return err('กรุณากรอกชื่อบริษัทหรือชื่อ-สกุล', form.elements.name);
      if (!b.serviceKeys.length) return err('กรุณาเลือกบริการอย่างน้อย 1 ประเภท');
      if (!c.name) return err('กรุณากรอกชื่อผู้ติดต่อ', form.elements.cName);
      if (!c.phone && !c.email) return err('กรุณากรอกเบอร์โทรหรืออีเมลอย่างน้อยหนึ่งช่องทาง', form.elements.cPhone);
      if (!b.pdpa) return err('กรุณาติ๊กยินยอมก่อนส่งใบสมัคร');
      if (errs) errs.clear();

      // ที่มาของลีด — ไม่มีข้อมูลส่วนบุคคลอยู่ในนี้ (ดูคำเตือนหัวไฟล์ attrib.js)
      if (window.NJAttrib) b.attrib = NJAttrib.value();

      send.disabled = true;
      send.textContent = 'กำลังส่ง...';
      msg.textContent = ''; msg.className = 'pa-msg';
      fetch(API + '/api/public/partner-apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b)
      }).then(function (r) {
        if (r.status === 204) return { ok: false, j: { error: 'ส่งใบสมัครไม่สำเร็จ' } };
        return r.json().then(function (j) { return { ok: r.ok, j: j }; });
      }).then(function (x) {
        if (!x.ok) throw new Error((x.j && x.j.error) || 'ส่งใบสมัครไม่สำเร็จ');
        okScreen(root, x.j);
        try { w.scrollTo({ top: root.offsetTop - 80, behavior: 'smooth' }); } catch (e) {}
      }).catch(function (e2) {
        send.disabled = false;
        send.textContent = 'ส่งใบสมัคร';
        msg.textContent = e2.message + ' — ถ้ายังไม่ได้ ทักไลน์หาทีมงานได้เลย';
        msg.className = 'pa-msg err';
      });
    });
  }

  /* ---------- หน้าติดตามใบสมัคร + แนบเอกสาร ---------- */
  function trackHtml(a) {
    var step = STATUS_STEP[a.status] || 0;
    var bar = [1, 2, 3, 4, 5].map(function (i) { return '<span class="pa-dot' + (i <= step ? ' on' : '') + '"></span>'; }).join('');
    var docs = (a.docs || []).map(function (x) { return '<li>' + esc(x.name) + ' <small>' + esc(thaiDate(x.at)) + '</small></li>'; }).join('');
    var up = a.canUpload
      ? '<form id="pa-up" class="pa-up">' +
          '<label class="pa-f"><span>ชนิดเอกสาร</span><select name="kind">' +
            DOC_KINDS.map(function (k) { return '<option value="' + esc(k[0]) + '">' + esc(k[1]) + '</option>'; }).join('') +
          '</select></label>' +
          '<input type="file" name="files" multiple accept="application/pdf,image/jpeg,image/png">' +
          '<small>PDF / JPG / PNG ไม่เกิน 15 MB ต่อไฟล์ · ครั้งละไม่เกิน 5 ไฟล์</small>' +
          '<button type="submit" class="pa-send">แนบเอกสาร</button>' +
          '<p id="pa-up-msg" class="pa-msg" role="status" aria-live="polite"></p>' +
        '</form>'
      : '<p class="pa-hint">ใบสมัครอยู่ระหว่างพิจารณาขั้นต่อไปแล้ว — ต้องการส่งเอกสารเพิ่ม ทักไลน์หาทีมงานได้</p>';
    return '<div class="pa-track-page">' +
      '<p class="pa-no">เลขใบสมัคร <b>' + esc(a.id) + '</b></p>' +
      '<div class="pa-status"><b>' + esc(a.statusTh) + '</b>' +
        (a.status === 'terminated' ? '<small>ใบสมัครนี้ปิดแล้ว หากต้องการคุยเพิ่มเติม ทักไลน์หาทีมงานได้</small>' : '') + '</div>' +
      '<div class="pa-bar" aria-hidden="true">' + bar + '</div>' +
      '<p class="pa-row"><span>ผู้สมัคร</span><b>' + esc(a.name) + '</b></p>' +
      ((a.serviceKeys || []).length ? '<p class="pa-row"><span>บริการ</span><b>' + esc(a.serviceKeys.map(typeTh).join(' · ')) + '</b></p>' : '') +
      '<p class="pa-row"><span>ส่งใบสมัครเมื่อ</span><b>' + esc(thaiDate(a.submittedAt)) + '</b></p>' +
      '<div class="pa-row col"><span>เอกสารที่แนบแล้ว</span>' + (docs ? '<ul>' + docs + '</ul>' : '<b>ยังไม่มี</b>') + '</div>' +
      up +
      '<a class="pa-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">สอบถามทีมงานทางไลน์</a>' +
    '</div>';
  }

  function loadTrack(root, id, t) {
    d.body.classList.add('pa-tracking');
    root.innerHTML = '<p class="pa-loading">กำลังโหลดใบสมัคร...</p>';
    fetch(API + '/api/public/partner-apply/' + encodeURIComponent(id) + '?t=' + encodeURIComponent(t))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error((x.j && x.j.error) || 'เปิดไม่ได้');
        root.innerHTML = trackHtml(x.j.application);
        bindUpload(root, id, t);
      })
      .catch(function (err) {
        root.innerHTML = '<div class="pa-fail"><h2>เปิดลิงก์นี้ไม่ได้</h2><p>' + esc(err.message) + '</p>' +
          '<a class="pa-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">ทักไลน์หาทีมงาน</a></div>';
      });
  }

  function bindUpload(root, id, t) {
    var form = d.getElementById('pa-up');
    if (!form) return;
    var msg = d.getElementById('pa-up-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var files = form.elements.files.files;
      if (!files || !files.length) { msg.textContent = 'กรุณาเลือกไฟล์ก่อน'; msg.className = 'pa-msg err'; return; }
      var fd = new FormData();
      fd.append('kind', form.elements.kind.value);
      Array.prototype.slice.call(files, 0, 5).forEach(function (f) { fd.append('files', f, f.name); });
      msg.textContent = 'กำลังอัปโหลด...'; msg.className = 'pa-msg';
      fetch(API + '/api/public/partner-apply/' + encodeURIComponent(id) + '/docs?t=' + encodeURIComponent(t), { method: 'POST', body: fd })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw new Error((x.j && x.j.error) || 'แนบเอกสารไม่สำเร็จ');
          root.innerHTML = trackHtml(x.j.application);
          bindUpload(root, id, t);
          var m2 = d.getElementById('pa-up-msg');
          if (m2) { m2.textContent = 'แนบเอกสารแล้ว — ทีมงานจะตรวจและติดต่อกลับ'; m2.className = 'pa-msg ok'; }
        })
        .catch(function (err) { msg.textContent = err.message; msg.className = 'pa-msg err'; });
    });
  }

  /* ---------- นับการกดปุ่มติดต่อ (ใช้เหตุการณ์ที่ลงทะเบียนไว้แล้วเท่านั้น) ---------- */
  var CONTACT_EV = { line: 'line_click', tel: 'tel_click' };
  function bindContact(root) {
    root.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('[data-contact]') : null;
      if (!a) return;
      var k = a.getAttribute('data-contact');
      if (CONTACT_EV[k] && w.njTrackInternal) w.njTrackInternal(CONTACT_EV[k]);
    });
  }

  d.addEventListener('DOMContentLoaded', function () {
    var root = d.getElementById('pa-root');
    if (!root) return;
    bindContact(d);
    var id = qs('id'), t = qs('t');
    if (id && t) { loadTrack(root, id, t); return; }
    root.innerHTML = formHtml();
    bindForm(root);
  });
})(window, document);
