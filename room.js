/* ห้องข้อมูลแปลงสำหรับผู้ซื้อ — Phase 3
 *
 * หน้านี้ทำสองอย่างในหน้าเดียว (แบบเดียวกับ inspect.html):
 *   ไม่มีตั๋วในลิงก์ → ฟอร์มขอสิทธิ์เปิดเอกสารของแปลงหนึ่ง
 *   มีตั๋วในลิงก์    → สถานะคำขอของตัวเอง + รายการเอกสารที่เปิดได้
 *
 * ⚠️ กติกาที่ห้ามผ่อน
 * 1. **ไม่มีระบบสมาชิก** ผู้ขอเข้าถึงเรื่องของตัวเองด้วยตั๋วในลิงก์เท่านั้น
 *    ลิงก์นี้จึงเป็นกุญแจ — ข้อความบนหน้าต้องเตือนให้เก็บไว้กับตัว ห้ามส่งต่อ
 * 2. **ไม่ยินยอม PDPA = ส่งไม่ได้** ปุ่มส่งถูกปิดไว้จนกว่าจะติ๊ก และเซิร์ฟเวอร์ตรวจซ้ำอีกชั้น
 * 3. **เอกสารเปิดได้จากลิงก์ที่มีตั๋วเท่านั้น** และสิ่งที่ได้คือ PDF ที่ประทับชื่อผู้ขอไว้ทุกหน้า
 *    ห้ามเขียนข้อความทำนองว่า "ดาวน์โหลดไฟล์ต้นฉบับ" เพราะไม่มีทางนั้นอยู่จริงในระบบ
 * 4. **หน้านี้ห้ามถูกเก็บเข้าดัชนีเสิร์ชเอนจิน** (noindex ในหน้า + robots.txt)
 */
(function () {
  'use strict';

  var API = window.NJ_API_BASE || 'https://app.njteedinsure.com';
  var LINE = 'https://line.me/R/ti/p/@716lffzt';
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function qs(k) {
    var m = (location.search || '').match(new RegExp('[?&]' + k + '=([^&]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  var LISTING = qs('listing').slice(0, 20);
  var ID = qs('id').slice(0, 24);
  var T = qs('t').slice(0, 64);

  var BAND = { pending: 'wait', approved: 'ok', denied: 'no', revoked: 'no', expired: 'old' };

  /* ---------- โหมดที่ 1: ฟอร์มขอสิทธิ์ ---------- */
  function formHtml() {
    return '<form class="rm-form" id="rm-form" novalidate>' +
      '<label class="rm-field"><span>รหัสแปลงที่ต้องการดูเอกสาร *</span>' +
        '<input id="f-listing" value="' + esc(LISTING) + '" placeholder="เช่น OP-050" required autocomplete="off"></label>' +
      '<label class="rm-field"><span>ชื่อ–นามสกุล *</span>' +
        '<input id="f-name" placeholder="ชื่อจริงตามบัตรประชาชน" required autocomplete="name"></label>' +
      '<label class="rm-field"><span>เบอร์โทร *</span>' +
        '<input id="f-phone" type="tel" placeholder="08x-xxx-xxxx" required autocomplete="tel"></label>' +
      '<label class="rm-field"><span>LINE ID (ถ้ามี)</span>' +
        '<input id="f-line" autocomplete="off"></label>' +
      '<label class="rm-field"><span>จะเอาเอกสารไปใช้ทำอะไร</span>' +
        '<textarea id="f-purpose" rows="3" placeholder="เช่น กำลังตัดสินใจซื้อ ต้องให้ธนาคารดูก่อนยื่นกู้"></textarea></label>' +
      // กับดักบอท — ซ่อนจากคนจริงด้วย CSS ไม่ใช่ type=hidden (บอทกรอกทุกช่องที่มองเห็นใน DOM)
      '<input class="rm-hp" id="f-website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="rm-consent"><input type="checkbox" id="f-consent">' +
        '<span>ยินยอมให้ บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด เก็บและใช้ชื่อกับเบอร์โทรของฉัน ' +
        'เพื่อติดต่อกลับและพิจารณาคำขอนี้ ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล</span></label>' +
      '<button type="submit" class="rm-btn" id="f-submit" disabled>ส่งคำขอดูเอกสาร</button>' +
      '<p class="rm-note" id="f-msg" role="status" aria-live="polite"></p>' +
    '</form>';
  }

  function bindForm() {
    var box = $('f-consent');
    var btn = $('f-submit');
    box.addEventListener('change', function () { btn.disabled = !box.checked; });

    $('rm-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!box.checked) return;
      var body = {
        listingId: ($('f-listing').value || '').trim(),
        name: ($('f-name').value || '').trim(),
        phone: ($('f-phone').value || '').trim(),
        line: ($('f-line').value || '').trim(),
        purpose: ($('f-purpose').value || '').trim(),
        website: ($('f-website').value || '').trim(),
        pdpaAt: new Date().toISOString()
      };
      if (!body.listingId || !body.name || body.phone.replace(/\D/g, '').length < 8) {
        $('f-msg').textContent = 'กรุณากรอกรหัสแปลง ชื่อ และเบอร์โทรให้ครบ';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'กำลังส่ง…';
      fetch(API + '/api/public/dataroom/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      }).then(function (r) {
        // 204 = กับดักบอท — ตอบเหมือนสำเร็จ ไม่บอกบอทว่าโดนจับได้
        if (r.status === 204) return { ok: true, id: '', ticket: '' };
        return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'ส่งคำขอไม่สำเร็จ'); return j; });
      }).then(function (j) {
        done(j);
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'ส่งคำขอดูเอกสาร';
        $('f-msg').textContent = err.message || 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่';
      });
    });
  }

  function done(j) {
    var link = j.id ? (location.pathname + '?id=' + encodeURIComponent(j.id) + '&t=' + encodeURIComponent(j.ticket)) : '';
    $('rm-body').innerHTML =
      '<div class="rm-done">' +
        '<b>ส่งคำขอแล้ว</b>' +
        '<p>ทีมงานจะติดต่อกลับเพื่อยืนยันตัวตนก่อนเปิดเอกสารให้ ปกติภายใน 1 วันทำการ</p>' +
        (j.id ? ('<p class="rm-code">เลขที่คำขอ ' + esc(j.id) + '</p>' +
          '<a class="rm-btn" href="' + esc(link) + '">เปิดหน้าติดตามคำขอของฉัน</a>' +
          '<p class="rm-warn">⚠️ เก็บลิงก์นี้ไว้กับตัว อย่าส่งต่อให้ใคร — ใครมีลิงก์นี้จะเปิดเอกสารในนามของคุณได้ ' +
          'และทุกครั้งที่เปิด ระบบจะประทับชื่อคุณไว้บนเอกสารทุกหน้า</p>') : '') +
        '<a class="rm-line" href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">สอบถามทีมงานทาง LINE</a>' +
      '</div>';
  }

  /* ---------- โหมดที่ 2: ติดตามคำขอของตัวเอง ---------- */
  function docHtml(d) {
    var url = API + '/api/public/dataroom/' + encodeURIComponent(ID) + '/file/' +
      encodeURIComponent(d.id) + '?t=' + encodeURIComponent(T);
    return '<li class="rm-doc">' +
      '<div><b>' + esc(d.name || d.kindTh) + '</b><small>' + esc(d.kindTh) +
        (d.note ? (' · ' + esc(d.note)) : '') + '</small></div>' +
      '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">เปิดอ่าน</a>' +
    '</li>';
  }

  function statusHtml(g) {
    var cls = BAND[g.status] || 'wait';
    var docs = (g.docs || []).map(docHtml).join('');
    return '<div class="rm-status ' + cls + '">' +
        '<span class="rm-chip">' + esc(g.statusTh) + '</span>' +
        '<div><b>คำขอเลขที่ ' + esc(g.id) + '</b>' +
        (g.listing ? ('<small>แปลง ' + esc(g.listing.id) + ' · ' + esc(g.listing.parcelInfo || '') + '</small>') : '') +
        '</div>' +
      '</div>' +
      (g.reason ? '<p class="rm-reason">เหตุผลจากทีมงาน: ' + esc(g.reason) + '</p>' : '') +
      (g.status === 'approved'
        ? ('<p class="rm-note">สิทธิ์เปิดเอกสารของคุณใช้ได้ถึง ' + esc(String(g.exp || '').slice(0, 10)) + '</p>')
        : '') +
      (docs
        ? ('<ul class="rm-docs">' + docs + '</ul>' +
           '<p class="rm-warn">⚠️ เอกสารทุกฉบับที่คุณเปิดจะมีชื่อคุณประทับอยู่ทุกหน้า และระบบบันทึกไว้ว่าเปิดเมื่อไหร่ ' +
           'เอกสารเหล่านี้เป็นของเจ้าของที่ดิน ให้ใช้ประกอบการตัดสินใจซื้อเท่านั้น ห้ามเผยแพร่ต่อ</p>')
        : ('<p class="rm-empty">' + esc(g.blocked || 'ยังไม่มีเอกสารให้เปิดในตอนนี้') + '</p>')) +
      '<a class="rm-line" href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">สอบถามทีมงานทาง LINE</a>';
  }

  function loadStatus() {
    fetch(API + '/api/public/dataroom/' + encodeURIComponent(ID) + '?t=' + encodeURIComponent(T))
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(j.error || 'เปิดคำขอนี้ไม่ได้');
          return j;
        });
      })
      .then(function (g) { $('rm-body').innerHTML = statusHtml(g); })
      .catch(function (e) {
        // ⚠️ ตั๋วผิดกับไม่มีคำขอนี้ ตอบข้อความเดียวกันจากเซิร์ฟเวอร์อยู่แล้ว ที่นี่แค่พิมพ์ตามที่ได้มา
        $('rm-body').innerHTML = '<div class="rm-done"><b>เปิดหน้านี้ไม่ได้</b><p>' + esc(e.message) + '</p>' +
          '<a class="rm-line" href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์ขอลิงก์ใหม่</a></div>';
      });
  }

  /* ---------- เริ่มทำงาน ---------- */
  if (ID && T) {
    document.body.classList.add('rm-tracking');
    loadStatus();
  } else {
    $('rm-body').innerHTML = formHtml();
    bindForm();
  }

  // ปุ่มติดต่อบนหน้านี้นับเป็นลีดช่องทางเดิม (ผูก listener ที่ container เพราะเนื้อหาวาดทีหลัง)
  $('rm-body').addEventListener('click', function (e) {
    var a = e.target.closest('[data-contact="line"]');
    if (!a) return;
    if (window.njTrackInternal) window.njTrackInternal('line_click');
    if (window.njTrack) window.njTrack('Contact', { method: 'line', from: 'dataroom' });
  });

  $('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
  if (window.njTrackInternal) {
    window.njTrackInternal('pageview');
    window.njTrackInternal('dataroom_view');
  }
})();
