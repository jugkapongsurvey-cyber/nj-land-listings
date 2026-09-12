/* ใบเสนอราคาที่ลูกค้าเปิดดูและกดยอมรับเอง — quote.html?id=NJ-xxxxx&t=<ตั๋ว>
   (Phase 4 รอบ 4 ของระบบหลังบ้าน)

   ⚠️ กติกาของหน้านี้
   1. **ห้ามมีฟอร์มเข้าสู่ระบบเด็ดขาด** (กติกาเดียวกับ deal.html / portal.html)
      เว็บนี้เป็นสแตติกบน GitHub Pages ไม่มีฝั่งเซิร์ฟเวอร์ที่ถือ token ได้ปลอดภัย
      และการรับรหัสผ่านที่โดเมนหนึ่งแล้วส่งข้ามไปอีกโดเมน = สอนลูกค้าให้กรอกรหัส
      ในที่ที่ไม่ใช่ระบบจริง ซึ่งเป็นพฤติกรรมเดียวกับหน้าฟิชชิ่ง
   2. **แสดงเฉพาะสิ่งที่ API ส่งมา ห้ามเดาหรือเติมข้อความแทน** — ข้อมูลภายใน
      (ผู้รับผิดชอบ · ผู้อนุมัติราคา · ประวัติสถานะ · เลขระวาง) ถูกตัดที่ฝั่งเซิร์ฟเวอร์แล้ว
   3. **ห้ามคำนวณยอดเอง** — ยอดทุกตัวมาจากเซิร์ฟเวอร์ (กติกาเดียวกับราคาต่อตารางวาบนหน้าประกาศ)
      คิดเองเมื่อไหร่ = ตัวเลขบนหน้านี้กับในเอกสารที่ลูกค้าถืออยู่จะไม่ตรงกัน
   4. **ปุ่มยืนยันต้องบอกให้ชัดว่านี่ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์** — ระบบยังไม่ได้เชื่อม
      ผู้ให้บริการลายเซ็นดิจิทัล การกดที่นี่คือการบันทึกว่าใครกดยืนยันเมื่อไหร่
      **ข้อความกำกับนี้ห้ามถอด**
   5. ตั๋วไม่ถูกส่งต่อไปที่ไหนนอกจาก API ของเราเอง (meta referrer = no-referrer ในหน้า)
      และแชท AI ส่งแค่ชื่อไฟล์ ไม่ได้ส่ง query string */
(function () {
  'use strict';
  var API = window.NJ_API_BASE || 'https://app.njteedinsure.com';
  var box = document.getElementById('qt-body');
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear() + 543);

  function qs(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // ⚠️ จัดรูปเงินเท่านั้น ไม่คำนวณอะไรเลย (กติกาข้อ 3)
  function baht(n) {
    var v = Number(n) || 0;
    return '฿' + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  function thDate(iso) {
    var s = String(iso || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
    var M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var p = s.split('-');
    return Number(p[2]) + ' ' + M[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
  }

  var ID = qs('id');
  var T = qs('t');
  var DATA = null;
  var busy = false;
  var mode = '';          // '' | 'accept' | 'reject'

  function api(method, path, body) {
    return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 't=' + encodeURIComponent(T), {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'ทำรายการไม่สำเร็จ');
        return j;
      });
    });
  }

  function note(text, kind) {
    return '<div class="qt-note' + (kind ? (' qt-' + kind) : '') + '">' + text + '</div>';
  }
  function contactCta(d) {
    var line = (d && d.org && d.org.lineUrl) || 'https://line.me/R/ti/p/@716lffzt';
    var tel = (d && d.org && d.org.tel) || '02-162-0405';
    return '<div class="qt-cta"><a class="is-line" href="' + esc(line) + '" target="_blank" rel="noopener">ทักไลน์หาทีมงาน</a>' +
      '<a href="tel:' + esc(String(tel).replace(/[^0-9+]/g, '')) + '">โทร ' + esc(tel) + '</a></div>';
  }

  var STATE_TH = {
    open: 'รอคุณตอบ',
    accepted: 'คุณยืนยันรับข้อเสนอแล้ว',
    rejected: 'คุณแจ้งไม่รับข้อเสนอ',
    expired: 'หมดอายุแล้ว',
    superseded: 'มีฉบับแก้ไขใหม่แทนใบนี้'
  };

  function headCard(d) {
    var cls = d.state === 'accepted' ? ' is-accepted'
      : d.state === 'rejected' ? ' is-rejected'
        : (d.state === 'expired' || d.state === 'superseded') ? ' is-expired' : '';
    var left = '<div><div class="qt-no">' + esc(d.no) + (d.rev ? (' (ฉบับแก้ไขที่ ' + d.rev + ')') : '') + '</div>' +
      '<div class="qt-meta">วันที่ออกใบ ' + esc(thDate(d.dateISO) || '-') +
      (d.validUntil ? ('<br>ยืนราคาถึง ' + esc(thDate(d.validUntil)) +
        (d.daysLeft != null && d.daysLeft >= 0 && d.state === 'open' ? (' · เหลืออีก ' + d.daysLeft + ' วัน') : '')) : '') +
      '</div></div>';
    var right = '<span class="qt-state' + cls + '">' + esc(STATE_TH[d.state] || d.state) + '</span>';
    return '<div class="qt-card"><div class="qt-top">' + left + right + '</div></div>';
  }

  function detailCard(d) {
    var rows = [
      ['ลูกค้า', [d.company, d.customer].filter(Boolean).join(' · ')],
      ['ประเภทงาน', d.jobType],
      ['เลขโฉนด', d.deedNo],
      ['เลขที่ดิน', d.landNo],
      ['เนื้อที่', d.areaText],
      ['ที่ตั้ง', d.location],
      ['สำนักงานที่ดิน', [d.office, d.branch].filter(Boolean).join(' · ')],
      ['บริการที่รวม', d.includedService]
    ].filter(function (r) { return r[1]; });
    return '<div class="qt-card"><h2>รายละเอียดงาน</h2><dl class="qt-kv">' +
      rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') +
      '</dl>' + (d.detailText ? ('<p class="qt-help">' + esc(d.detailText) + '</p>') : '') + '</div>';
  }

  function moneyCard(d) {
    // ⚠️ ทุกบรรทัดและทุกยอดมาจากเซิร์ฟเวอร์ (กติกาข้อ 3)
    var lines = (d.breakdown || []).map(function (r) {
      var minus = Number(r.amount) < 0;
      return '<div class="qt-line' + (minus ? ' is-minus' : '') + '"><span>' + esc(r.label) + '</span><b>' + baht(r.amount) + '</b></div>';
    }).join('');
    var wht = d.whtRate ? (
      '<div class="qt-sum"><span>หัก ณ ที่จ่าย ' + esc(String(d.whtRate)) + '%</span><b>-' + baht(d.whtAmount) + '</b></div>' +
      '<div class="qt-sum"><span>ยอดที่ต้องโอนจริง</span><b>' + baht(d.netReceive) + '</b></div>' +
      '<p class="qt-wht">หัก ณ ที่จ่ายเป็นภาษีที่ผู้จ่ายเงินนำส่งกรมสรรพากรแทนผู้รับเงิน ' +
      'ไม่ใช่ส่วนลด · กรุณาออกหนังสือรับรองการหักภาษีให้ทีมงานด้วย</p>'
    ) : '';
    return '<div class="qt-card"><h2>รายการและยอดเงิน</h2><div class="qt-lines">' + lines + '</div>' +
      '<div class="qt-sum"><span>รวมก่อนภาษีมูลค่าเพิ่ม</span><b>' + baht(d.subtotal) + '</b></div>' +
      (d.vatRate ? ('<div class="qt-sum"><span>ภาษีมูลค่าเพิ่ม ' + esc(String(d.vatRate)) + '%</span><b>' + baht(d.vat) + '</b></div>') : '') +
      '<div class="qt-sum is-total"><span>ยอดรวมทั้งสิ้น</span><b>' + baht(d.grand) + '</b></div>' + wht + '</div>';
  }

  function termsCard(d) {
    var blocks = [
      ['ระยะเวลาดำเนินงาน', d.planText],
      ['เงื่อนไขการชำระเงิน', d.payText],
      ['หมายเหตุ', d.noteText]
    ].filter(function (b) { return b[1]; });
    if (!blocks.length) return '';
    return '<div class="qt-card"><h2>เงื่อนไข</h2>' +
      blocks.map(function (b) { return '<h3>' + esc(b[0]) + '</h3><p class="qt-terms">' + esc(b[1]) + '</p>'; }).join('') +
      (d.proposer ? ('<p class="qt-help">ผู้เสนอราคา: ' + esc(d.proposer) + '</p>') : '') + '</div>';
  }

  function actCard(d) {
    if (d.state === 'accepted') {
      return '<div class="qt-card">' +
        note('<b>ขอบคุณครับ — ทีมงานได้รับการยืนยันของคุณแล้ว</b><br>' +
          'ยืนยันโดย ' + esc(d.acceptedName || '') + (d.acceptedAt ? (' เมื่อ ' + esc(thDate(d.acceptedAt))) : '') +
          '<br>ขั้นต่อไป ทีมงานจะติดต่อกลับเพื่อทำสัญญาว่าจ้างและนัดวันเข้าพื้นที่', 'good') +
        contactCta(d) + '</div>';
    }
    if (d.state === 'rejected') {
      return '<div class="qt-card">' +
        note('คุณแจ้งไม่รับข้อเสนอนี้ไว้' + (d.rejectedReason ? (' — ' + esc(d.rejectedReason)) : '') +
          '<br>ถ้าเปลี่ยนใจหรืออยากให้เสนอราคาใหม่ ทักไลน์บอกทีมงานได้เลย') +
        contactCta(d) + '</div>';
    }
    if (d.state === 'expired') {
      return '<div class="qt-card">' +
        note('<b>ใบเสนอราคานี้หมดอายุแล้ว</b> (ยืนราคาถึง ' + esc(thDate(d.validUntil) || '-') + ')<br>' +
          'ราคาวัสดุและค่าดำเนินการเปลี่ยนตามเวลา จึงต้องออกใบใหม่ให้ — ทักไลน์บอกทีมงานได้เลย', 'info') +
        contactCta(d) + '</div>';
    }
    if (d.state === 'superseded') {
      return '<div class="qt-card">' +
        note('ใบนี้ถูกแทนที่ด้วยฉบับแก้ไขใหม่แล้ว — กรุณาใช้ลิงก์ฉบับล่าสุดที่ทีมงานส่งให้ ' +
          'ถ้าหาลิงก์ไม่เจอ ทักไลน์ขอใหม่ได้', 'info') +
        contactCta(d) + '</div>';
    }
    if (!d.canAct) {
      return '<div class="qt-card">' + note('ใบนี้ยังไม่พร้อมให้ยืนยัน — กรุณาทักไลน์หาทีมงาน', 'info') + contactCta(d) + '</div>';
    }

    if (mode === 'reject') {
      return '<div class="qt-card"><h2>แจ้งไม่รับข้อเสนอ</h2>' +
        '<div class="qt-field"><label for="qt-rj">เหตุผล (ไม่บังคับ — แต่ช่วยให้เราเสนอได้ตรงขึ้นในครั้งหน้า)</label>' +
        '<textarea id="qt-rj" placeholder="เช่น ราคาสูงกว่างบ / เลื่อนโครงการออกไป / เลือกผู้รับเหมาอื่น"></textarea></div>' +
        '<div class="qt-field"><label for="qt-rjn">ชื่อผู้แจ้ง (ไม่บังคับ)</label><input id="qt-rjn" type="text" autocomplete="name"></div>' +
        '<div class="qt-actions">' +
        '<button class="qt-btn qt-ghost" id="qt-do-reject"' + (busy ? ' disabled' : '') + '>ยืนยันว่าไม่รับข้อเสนอ</button>' +
        '<button class="qt-btn qt-ghost" id="qt-cancel"' + (busy ? ' disabled' : '') + '>ย้อนกลับ</button>' +
        '</div></div>';
    }

    // ⚠️ ข้อความเรื่อง "ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์" ห้ามถอด (กติกาข้อ 4)
    return '<div class="qt-card"><h2>ยืนยันรับข้อเสนอ</h2>' +
      '<div class="qt-field"><label for="qt-name">ชื่อผู้ยืนยัน <span style="color:#B91C1C">*</span></label>' +
      '<input id="qt-name" type="text" autocomplete="name" placeholder="ชื่อ-นามสกุล หรือชื่อผู้มีอำนาจลงนาม" value="' + esc(d.customer || '') + '"></div>' +
      '<div class="qt-field"><label for="qt-note">ข้อความถึงทีมงาน (ไม่บังคับ)</label>' +
      '<textarea id="qt-note" placeholder="เช่น ขอเริ่มงานหลังวันที่ 20 / ขอใบกำกับภาษีในชื่อบริษัท"></textarea></div>' +
      '<label class="qt-check"><input id="qt-pdpa" type="checkbox">' +
      '<span>ยอมรับให้บันทึกชื่อ วันเวลา และหมายเลขไอพีของการกดยืนยันนี้ไว้เป็นหลักฐานการตกลงราคา ' +
      'ตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล</span></label>' +
      '<button class="qt-btn qt-primary" id="qt-do-accept"' + (busy ? ' disabled' : '') + '>' +
      (busy ? 'กำลังบันทึก…' : 'ยืนยันรับข้อเสนอนี้') + '</button>' +
      '<p class="qt-help"><b>การกดยืนยันนี้ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์</b> — เป็นการบันทึกว่าคุณยืนยันด้วยตัวเองเมื่อไหร่ ' +
      'ทีมงานจะติดต่อกลับเพื่อทำสัญญาว่าจ้างฉบับจริงที่มีลายมือชื่อตามปกติ</p>' +
      '<div class="qt-actions"><button class="qt-btn qt-ghost" id="qt-to-reject"' + (busy ? ' disabled' : '') + '>' +
      'ยังไม่รับข้อเสนอนี้</button></div></div>';
  }

  function render() {
    if (!ID || !T) {
      box.innerHTML = note('ลิงก์ไม่ครบ — กรุณาเปิดจากลิงก์ที่ทีมงานส่งให้ทั้งบรรทัด', 'warn') + contactCta(null);
      return;
    }
    if (!DATA) { box.innerHTML = '<div class="qt-load">กำลังเปิดใบเสนอราคา…</div>'; return; }
    var d = DATA;
    box.innerHTML = headCard(d) + actCard(d) + detailCard(d) + moneyCard(d) + termsCard(d) +
      '<div class="qt-card"><h2>ผู้เสนอราคา</h2><dl class="qt-kv">' +
      '<dt>บริษัท</dt><dd>' + esc(d.org.company || d.org.name) + '</dd>' +
      (d.org.address ? ('<dt>ที่อยู่</dt><dd>' + esc(d.org.address) + '</dd>') : '') +
      (d.org.taxId ? ('<dt>เลขผู้เสียภาษี</dt><dd>' + esc(d.org.taxId) + '</dd>') : '') +
      (d.org.tel ? ('<dt>โทรศัพท์</dt><dd>' + esc(d.org.tel) + '</dd>') : '') +
      '</dl>' + contactCta(d) + '</div>';
    wire();
  }

  function wire() {
    var byId = function (i) { return document.getElementById(i); };
    var a = byId('qt-do-accept');
    if (a) a.onclick = doAccept;
    var r = byId('qt-to-reject');
    if (r) r.onclick = function () { mode = 'reject'; render(); };
    var c = byId('qt-cancel');
    if (c) c.onclick = function () { mode = ''; render(); };
    var dr = byId('qt-do-reject');
    if (dr) dr.onclick = doReject;
  }

  function fail(msg) {
    var top = document.querySelector('.qt-card');
    var el = document.createElement('div');
    el.innerHTML = note(esc(msg), 'warn');
    if (top && top.parentNode) top.parentNode.insertBefore(el.firstChild, top);
    else box.innerHTML = note(esc(msg), 'warn') + box.innerHTML;
  }

  function doAccept() {
    var name = (document.getElementById('qt-name') || {}).value || '';
    var pdpa = !!(document.getElementById('qt-pdpa') || {}).checked;
    var noteTxt = (document.getElementById('qt-note') || {}).value || '';
    if (!String(name).trim()) { fail('กรุณากรอกชื่อผู้ยืนยัน'); return; }
    if (!pdpa) { fail('กรุณาติ๊กยอมรับการเก็บข้อมูลก่อนกดยืนยัน'); return; }
    busy = true; render();
    api('POST', '/api/public/quotation/' + encodeURIComponent(ID) + '/accept', { name: name, note: noteTxt, pdpa: true })
      .then(function (j) { busy = false; mode = ''; DATA = j.quotation; render(); window.scrollTo(0, 0); })
      .catch(function (e) { busy = false; render(); fail(e.message); });
  }
  function doReject() {
    var reason = (document.getElementById('qt-rj') || {}).value || '';
    var name = (document.getElementById('qt-rjn') || {}).value || '';
    busy = true; render();
    api('POST', '/api/public/quotation/' + encodeURIComponent(ID) + '/reject', { reason: reason, name: name })
      .then(function (j) { busy = false; mode = ''; DATA = j.quotation; render(); window.scrollTo(0, 0); })
      .catch(function (e) { busy = false; render(); fail(e.message); });
  }

  render();
  if (ID && T) {
    api('GET', '/api/public/quotation/' + encodeURIComponent(ID))
      .then(function (j) { DATA = j; render(); })
      .catch(function (e) {
        box.innerHTML = note(esc(e.message), 'warn') +
          '<div class="qt-card"><p class="qt-help">ลิงก์ใบเสนอราคามีอายุจำกัด และจะใช้ไม่ได้เมื่อทีมงานออกลิงก์ใหม่ ' +
          'ทักไลน์ขอลิงก์ล่าสุดได้เลย</p>' + contactCta(null) + '</div>';
      });
  }

  // สถิติภายใน — ส่งแค่ชนิดเหตุการณ์ ไม่ส่งตั๋วและไม่ส่งเลขที่ใบ
  try { if (window.njTrack) window.njTrack('quote_view'); } catch (e) { /* ไม่สำคัญพอให้พังหน้า */ }
})();
