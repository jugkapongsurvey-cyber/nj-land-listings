// หน้า "ทรัพย์หน่วยงาน" (agency.html) — ช่องวางลิงก์ + รายชื่อเว็บหน่วยงาน
// ข้อมูลและกติกาทั้งหมดอยู่ใน agencies.js (window.NJAgency) ไฟล์นี้แค่วาดหน้าจอ
// (ค่า njTrack มาจาก analytics.js ที่โหลดก่อนไฟล์นี้)
//
// ⚠️ ลิงก์ที่ผู้ใช้วาง/แชร์มา ห้ามทำเป็น <a> และต้อง esc() ทุกครั้ง — ดูกติกาข้อ 2 ใน agencies.js
// ⚠️ Web Share Target (manifest.webmanifest) ส่งมาเป็น ?title=&text=&url= — Android หลายเครื่อง
//    ใส่ลิงก์ไว้ใน text ไม่ใช่ url จึงต้องรวมทั้งสามช่องแล้วให้ detect() หยิบลิงก์แรกเอง

(function () {
  'use strict';
  var A = window.NJAgency;
  var LINE_OA_URL = 'https://line.me/R/ti/p/@716lffzt';
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ERR = {
    empty: 'วางลิงก์หน้าทรัพย์ก่อน แล้วกด "ตรวจลิงก์"',
    invalid: 'ยังอ่านลิงก์นี้ไม่ได้ ลองคัดลอกใหม่จากแถบที่อยู่ของเบราว์เซอร์ (ขึ้นต้นด้วย https://)',
    scheme: 'รับเฉพาะลิงก์หน้าเว็บที่ขึ้นต้นด้วย http:// หรือ https://'
  };
  var KIND = {
    agency: function (d) { return 'แหล่งทรัพย์ที่รู้จัก · จะบันทึกเป็น "' + d.source + '"'; },
    short: function () { return 'ลิงก์ย่อ · ยังไม่รู้ว่าปลายทางเป็นเว็บไหน'; },
    portal: function () { return 'ประกาศจากเว็บทั่วไปหรือโซเชียล'; },
    unknown: function () { return 'ยังไม่อยู่ในรายชื่อหน่วยงานของเรา · ทีมงานตรวจให้ได้ตามปกติ'; }
  };

  function render(d) {
    var box = $('ag-result');
    box.hidden = false;
    if (!d.ok) { box.innerHTML = '<div class="ag-err" role="alert">' + esc(ERR[d.reason] || ERR.invalid) + '</div>'; return; }

    var warn = '';
    if (d.kind === 'short') warn += '<div class="ag-warn">ลิงก์ย่อบอกไม่ได้ว่าไปที่ไหน กรุณาเปิดลิงก์นั้นก่อน แล้วคัดลอกลิงก์เต็มจากแถบที่อยู่มาวางแทน</div>';
    if (d.kind === 'portal') warn += '<div class="ag-warn">ประกาศทั่วไปต้องตรวจเพิ่มว่าผู้ประกาศเป็นเจ้าของหรือได้รับมอบอำนาจจริง</div>';
    if (d.tooLong) warn += '<div class="ag-warn">ลิงก์นี้ยาวเกิน ' + A.URL_MAX + ' ตัวอักษร ระบบจะเก็บได้ไม่ครบ กรุณาพิมพ์รหัสทรัพย์หรือเลขโฉนดเพิ่มในฟอร์มด้วย</div>';

    var refs = d.refs.map(function (r) { return r.key ? r.key + ' = ' + r.value : r.value; });
    box.innerHTML =
      '<div class="ag-found">ตรวจพบ</div>' +
      '<div class="ag-name">' + esc(d.label) + '</div>' +
      '<div class="ag-kind">' + esc(KIND[d.kind](d)) + '</div>' +
      (refs.length ? '<div class="ag-refs">เลขอ้างอิงในลิงก์: <b>' + esc(refs.join(' · ')) + '</b></div>' : '') +
      warn +
      '<div class="ag-checks-h">ทีมงานจะตรวจให้</div>' +
      '<ul class="ag-checks">' + A.checklist(d).map(function (c) {
        return '<li><span>' + esc(c.t) + '</span><span class="ag-tag ' + c.where + '">' +
               (c.where === 'field' ? 'ลงพื้นที่' : 'ตรวจเอกสาร') + '</span></li>';
      }).join('') + '</ul>' +
      '<a class="ag-cta" href="' + esc(A.verifyHref(d)) + '">ส่งให้ NJ ตรวจทรัพย์นี้ →</a>' +
      '<div class="ag-cta-note">ขั้นต่อไปกรอกแค่ชื่อกับเบอร์โทร แหล่งทรัพย์และลิงก์กรอกไว้ให้แล้ว · ตรวจเอกสารกับลงพื้นที่คิดค่าบริการแยกกัน ทีมงานแจ้งราคาก่อนเริ่มงานเสมอ</div>';
    njTrack('ViewContent', { content_name: 'agency_link_check', content_category: d.source });
  }

  function check(value) { render(A.detect(value)); }

  function setupPaste() {
    var form = $('ag-form'), input = $('ag-url');
    form.addEventListener('submit', function (e) { e.preventDefault(); check(input.value); });
    // Enter/"ไป" — ดักที่ช่องเองด้วย ไม่พึ่งการส่งฟอร์มอัตโนมัติของเบราว์เซอร์อย่างเดียว
    // (ตอนทดสอบ ปุ่ม Enter แบบจำลองไม่ทำให้ฟอร์มส่ง · preventDefault กันไม่ให้ตรวจซ้ำสองรอบ)
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); check(input.value); }
    });    // วางปุ๊บตรวจปั๊บ — คนส่วนใหญ่วางจากมือถือแล้วไม่กดปุ่มต่อ
    input.addEventListener('paste', function () { setTimeout(function () { check(input.value); }, 0); });

    if (typeof URLSearchParams === 'undefined') return;
    var q = new URLSearchParams(location.search);
    var shared = [q.get('url'), q.get('text'), q.get('title')].filter(Boolean).join(' ').slice(0, 2000);
    if (!shared) return;
    var d = A.detect(shared);
    if (d.ok) input.value = d.url;
    render(d);
    $('paste').scrollIntoView({ block: 'start' });
  }

  var cat = 'all';
  function renderChips() {
    var box = $('ag-chips');
    var all = [{ key: 'all', label: 'ทั้งหมด' }].concat(A.CATS);
    box.innerHTML = all.map(function (c) {
      return '<button type="button" class="ag-chip" data-cat="' + c.key + '" aria-pressed="' + (c.key === cat) + '">' + esc(c.label) + '</button>';
    }).join('');
  }
  function renderGrid() {
    var label = {};
    A.CATS.forEach(function (c) { label[c.key] = c.label; });
    $('ag-grid').innerHTML = A.SOURCES.filter(function (s) { return cat === 'all' || s.cat === cat; }).map(function (s) {
      return '<div class="ag-card"><span class="ag-card-cat">' + esc(label[s.cat]) + '</span>' +
        '<b>' + esc(s.name) + '</b><p>' + esc(s.desc) + '</p>' +
        '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">เปิดเว็บ ' + esc(new URL(s.url).hostname) + ' ↗</a></div>';
    }).join('');
  }
  function setupSources() {
    renderChips();
    renderGrid();
    $('ag-chips').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      cat = b.getAttribute('data-cat');
      renderChips();
      renderGrid();
    });
  }

  $('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
  // นับคลิกไลน์ด้วยเหตุการณ์ line_click ตัวเดิม (กติกาข้อ 6 — ไม่ใช่ช่องทางใหม่ ไม่ต้องขึ้นทะเบียนเพิ่ม)
  document.querySelectorAll('[data-ag-line]').forEach(function (a) {
    a.href = LINE_OA_URL;
    a.addEventListener('click', function () {
      njTrackInternal('line_click');
      njTrack('Contact', { method: 'line' });
    });
  });
  setupSources();
  setupPaste();
  njTrack('ViewContent', { content_name: 'agency_page' });
})();
