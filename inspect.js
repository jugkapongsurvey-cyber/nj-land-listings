/* ============================================================
   นัดตรวจแปลงก่อนซื้อ (Phase 2 งานย่อยที่ 3)
   หน้าเดียวทำสองหน้าที่ — มี ?id= และ ?t= ในลิงก์ = หน้าติดตามสถานะ · ไม่มี = ฟอร์มขอนัด

   ⚠️ กติกาที่ห้ามผ่อน
   1. **รายการบริการต้องตรงกับ LEAD_SERVICES ใน lib/leads.js เป๊ะ**
      เซิร์ฟเวอร์ทิ้งคีย์ที่ไม่รู้จักโดยไม่มี error — ติ๊กแล้วหายเงียบ
      (กติกาเดียวกับ NJ_SERVICES และ PARCEL_FEATURES · มีเทสต์เทียบข้าม repo คุมไว้)
   2. **ไม่ติ๊กยินยอม = ส่งไม่ได้** ปิดที่ปุ่มด้วย และเซิร์ฟเวอร์ปฏิเสธซ้ำอีกชั้น
      สองชั้นเพราะชั้นหน้าจอมีไว้บอกผู้ใช้ ส่วนชั้นเซิร์ฟเวอร์มีไว้บังคับจริง
   3. **ยังไม่มีระบบชำระเงิน** ต้องเขียนให้ชัดว่ายังไม่มีค่าใช้จ่ายจนกว่าจะตกลงราคากัน
      ไม่งั้นคนกดส่งแล้วกลัวว่าจะถูกเรียกเก็บเงิน
   4. **ไม่บังคับกรอกครบทุกช่อง** ขอแค่ชื่อกับเบอร์ (กติกาเดียวกับหน้าฝากหาที่ดิน)
      คนที่ยังไม่รู้ว่าตัวเองอยากได้อะไรก็ยังเป็นลีดที่คุยต่อได้
   ============================================================ */
(function (w, d) {
  'use strict';

  // ⚠️ คีย์ต้องตรงกับ LEAD_SERVICES ใน nj-survey-system/lib/leads.js
  var SERVICES = [
    { k: 'doc',           t: 'ตรวจเอกสารสิทธิ์เบื้องต้น', d: 'อ่านหน้า–หลังโฉนด ดูประเภทเอกสารสิทธิ์ เนื้อที่ และรายการจดทะเบียนล่าสุด' },
    { k: 'marker',        t: 'ลงพื้นที่ดูหมุดหลักเขต',   d: 'ทีมงานไปที่แปลงจริง หาหมุดหลักเขตและถ่ายรูปสภาพหน้างานให้' },
    { k: 'survey',        t: 'รังวัดสอบเขต',            d: 'งานรังวัดเต็มรูปแบบ ได้แนวเขตและเนื้อที่จริงพร้อมรายงาน' },
    { k: 'access',        t: 'ตรวจทางเข้า–ออก',          d: 'ดูว่าติดถนนสาธารณะจริงไหม หรือต้องผ่านที่ดินคนอื่น' },
    { k: 'transfer_cost', t: 'ประเมินค่าใช้จ่ายวันโอน',   d: 'คำนวณค่าธรรมเนียมและภาษีที่ต้องจ่ายจริงในวันโอน' }
  ];

  // ⚠️ ต้องตรงกับ LEAD_SOURCES ใน lib/leads.js — ค่าที่ไม่รู้จักถูกเก็บเป็น 'other' เงียบๆ
  //    ส่งชื่อมั่วไป = สถิติ "โฆษณาลงที่ไหนแล้วได้ผล" กองรวมอยู่ใน "อื่นๆ" ทั้งหมด
  var SOURCES = ['land_page', 'listings', 'home', 'compare', 'share', 'line', 'phone', 'walk_in', 'other'];

  var API = w.NJ_API_BASE || 'https://app.njteedinsure.com';
  var LINE = 'https://line.me/R/ti/p/@716lffzt';   // กติกาข้อ 6 — ค่าติดต่อหลักของบริษัท

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

  /* ---------- ฟอร์มขอนัดตรวจ ---------- */
  function formHtml(listingId) {
    var svc = SERVICES.map(function (s) {
      return '<label class="ins-svc">' +
        '<input type="checkbox" name="svc" value="' + esc(s.k) + '">' +
        '<span><b>' + esc(s.t) + '</b><small>' + esc(s.d) + '</small></span>' +
        '</label>';
    }).join('');

    // วันที่เลือกได้เริ่มจากพรุ่งนี้ — วันนี้ทีมจัดคิวไม่ทันอยู่แล้ว
    var tmr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    return '<form id="ins-form" class="ins-form" novalidate>' +
      '<div class="ins-step"><span class="ins-n">1</span><h2>แปลงที่สนใจ</h2></div>' +
      (listingId
        ? '<p class="ins-lock">รหัสทรัพย์ <b>' + esc(listingId) + '</b> — ระบบกรอกให้จากหน้าประกาศที่คุณกดมา' +
          '<input type="hidden" name="listingId" value="' + esc(listingId) + '"></p>'
        : '<label class="ins-f"><span>รหัสทรัพย์ (ถ้ามี)</span>' +
          '<input name="listingId" placeholder="เช่น OP-045 — ไม่มีก็เว้นว่างได้" maxlength="20">' +
          '<small>ดูรหัสได้ที่หน้ารายละเอียดแปลง ใต้ชื่อแปลง · ยังไม่เจอแปลงที่ถูกใจก็ส่งมาได้ ทีมงานช่วยหาให้</small></label>') +

      '<div class="ins-step"><span class="ins-n">2</span><h2>อยากให้ตรวจอะไรบ้าง</h2></div>' +
      '<p class="ins-hint">เลือกได้มากกว่าหนึ่งข้อ · ยังไม่แน่ใจก็ข้ามไปได้ ทีมงานจะช่วยแนะนำตอนโทรกลับ</p>' +
      '<div class="ins-svcs">' + svc + '</div>' +

      '<div class="ins-step"><span class="ins-n">3</span><h2>วันที่สะดวก</h2></div>' +
      '<p class="ins-hint">ใส่ได้ถึง 3 วัน ทีมงานจะยืนยันวันจริงตอนติดต่อกลับ</p>' +
      '<div class="ins-dates">' +
        '<input type="date" name="d1" min="' + tmr + '" aria-label="วันที่สะดวกวันที่ 1">' +
        '<input type="date" name="d2" min="' + tmr + '" aria-label="วันที่สะดวกวันที่ 2">' +
        '<input type="date" name="d3" min="' + tmr + '" aria-label="วันที่สะดวกวันที่ 3">' +
      '</div>' +

      '<div class="ins-step"><span class="ins-n">4</span><h2>ให้ติดต่อกลับที่ไหน</h2></div>' +
      '<div class="ins-grid">' +
        '<label class="ins-f"><span>ชื่อผู้ติดต่อ <b class="req">*</b></span>' +
          '<input name="name" required maxlength="120" autocomplete="name"></label>' +
        '<label class="ins-f"><span>เบอร์โทร <b class="req">*</b></span>' +
          '<input name="phone" required maxlength="40" inputmode="tel" autocomplete="tel"></label>' +
      '</div>' +
      '<label class="ins-f"><span>ไลน์ไอดี (ถ้ามี)</span><input name="line" maxlength="80"></label>' +
      '<label class="ins-f"><span>อยากบอกอะไรทีมงานเพิ่มเติม</span>' +
        '<textarea name="note" rows="3" maxlength="800"></textarea></label>' +

      // กับดักบอท — ซ่อนจากคนจริงด้วย CSS ตัวเดียวกับอีก 4 ฟอร์ม
      '<input type="text" name="website" class="ins-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +

      '<label class="ins-pdpa">' +
        '<input type="checkbox" name="pdpa" id="ins-pdpa">' +
        '<span>ยินยอมให้ บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด เก็บและใช้ชื่อกับเบอร์โทรของฉัน ' +
        'เพื่อติดต่อกลับเรื่องคำขอนี้เท่านั้น และขอให้ลบเมื่อไรก็ได้</span>' +
      '</label>' +

      '<p class="ins-free">ส่งคำขอไม่มีค่าใช้จ่าย และ<b>ยังไม่ถือเป็นการว่าจ้าง</b> — ' +
        'ทีมงานจะดูรายละเอียดแล้วแจ้งขอบเขตงานกับราคาให้ทราบก่อนเสมอ ตกลงกันแล้วจึงเริ่มงาน</p>' +

      '<button type="submit" id="ins-send" class="ins-send" disabled>ส่งคำขอให้ทีมงาน</button>' +
      '<p id="ins-msg" class="ins-msg" role="status" aria-live="polite"></p>' +
    '</form>';
  }

  function collect(form) {
    var svc = [];
    form.querySelectorAll('input[name="svc"]:checked').forEach(function (c) { svc.push(c.value); });
    var dates = [];
    ['d1', 'd2', 'd3'].forEach(function (n) {
      var v = (form.elements[n] && form.elements[n].value) || '';
      if (v && dates.indexOf(v) < 0) dates.push(v);
    });
    return {
      listingId: (form.elements.listingId && form.elements.listingId.value || '').trim(),
      services: svc,
      preferDates: dates,
      name: (form.elements.name.value || '').trim(),
      phone: (form.elements.phone.value || '').trim(),
      line: (form.elements.line.value || '').trim(),
      note: (form.elements.note.value || '').trim(),
      website: (form.elements.website.value || '').trim(),
      pdpaAt: !!form.elements.pdpa.checked,
      source: SOURCES.indexOf(qs('from')) >= 0 ? qs('from') : 'other'
    };
  }

  function okScreen(root, res) {
    var link = location.origin + location.pathname + '?id=' + encodeURIComponent(res.id) +
               '&t=' + encodeURIComponent(res.ticket);
    root.innerHTML =
      '<div class="ins-done">' +
        '<div class="ins-done-ic" aria-hidden="true">✓</div>' +
        '<h2>ส่งคำขอเรียบร้อยแล้ว</h2>' +
        '<p class="ins-no">เลขงานของคุณคือ <b>' + esc(res.id) + '</b></p>' +
        '<p>ทีมงานจะติดต่อกลับภายใน 1 วันทำการ เพื่อยืนยันรายละเอียดและแจ้งค่าใช้จ่ายก่อนเริ่มงาน</p>' +
        (res.duplicateOf
          ? '<p class="ins-dupe">เราพบว่าคุณเคยส่งคำขอสำหรับแปลงนี้ไว้แล้ว (' + esc(res.duplicateOf) + ') ' +
            'ทีมงานจะดูให้เป็นเรื่องเดียวกัน ไม่ต้องส่งซ้ำอีก</p>'
          : '') +
        '<div class="ins-track">' +
          '<b>เก็บลิงก์นี้ไว้ติดตามสถานะงานของคุณ</b>' +
          '<input id="ins-link" readonly value="' + esc(link) + '">' +
          '<button type="button" id="ins-copy" class="ins-copy">คัดลอกลิงก์</button>' +
          '<small>ลิงก์นี้เปิดดูได้เฉพาะคุณ · อย่าส่งต่อให้คนที่ไม่เกี่ยวข้อง</small>' +
        '</div>' +
        '<a class="ins-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">' +
          'ทักไลน์คุยกับทีมงานเลย</a>' +
      '</div>';

    var btn = d.getElementById('ins-copy');
    btn.addEventListener('click', function () {
      var inp = d.getElementById('ins-link');
      // ⚠️ ต้องมีทางถอยเสมอ — navigator.clipboard ใช้ไม่ได้บน http:// และในเว็บวิวบางตัว
      //    ล้มแล้วเงียบ = ผู้ใช้คิดว่าคัดลอกแล้ว วางไม่ติด แล้วลิงก์หายไปเลย
      function fallback() { inp.select(); try { d.execCommand('copy'); } catch (e) { w.prompt('คัดลอกลิงก์นี้ไว้', inp.value); } }
      if (w.navigator && w.navigator.clipboard && w.navigator.clipboard.writeText) {
        w.navigator.clipboard.writeText(inp.value).then(function () {
          btn.textContent = 'คัดลอกแล้ว ✓';
        }).catch(fallback);
      } else fallback();
    });
  }

  function bindForm(root) {
    var form = d.getElementById('ins-form');
    var send = d.getElementById('ins-send');
    var msg = d.getElementById('ins-msg');
    var pdpa = d.getElementById('ins-pdpa');

    function refresh() { send.disabled = !pdpa.checked; }
    pdpa.addEventListener('change', refresh);
    refresh();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = collect(form);
      if (!b.name) { msg.textContent = 'กรุณากรอกชื่อผู้ติดต่อ'; msg.className = 'ins-msg err'; form.elements.name.focus(); return; }
      if (b.phone.replace(/\D/g, '').length < 9) { msg.textContent = 'เบอร์โทรไม่ถูกต้อง'; msg.className = 'ins-msg err'; form.elements.phone.focus(); return; }
      if (!b.pdpaAt) { msg.textContent = 'กรุณาติ๊กยินยอมก่อนส่งคำขอ'; msg.className = 'ins-msg err'; return; }

      send.disabled = true;
      send.textContent = 'กำลังส่ง...';
      msg.textContent = ''; msg.className = 'ins-msg';

      fetch(API + '/api/public/inspection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b)
      }).then(function (r) {
        // กับดักบอทฝั่งเซิร์ฟเวอร์ตอบ 204 ไม่มีเนื้อความ — r.json() จะพังถ้าไม่กันไว้
        if (r.status === 204) return { ok: false, j: { error: 'ส่งคำขอไม่สำเร็จ' } };
        return r.json().then(function (j) { return { ok: r.ok, j: j }; });
      }).then(function (x) {
        if (!x.ok) throw new Error((x.j && x.j.error) || 'ส่งคำขอไม่สำเร็จ');
        // ⚠️ ไม่ยิง inspect_submit จากเบราว์เซอร์ — เซิร์ฟเวอร์บันทึกให้แล้วตอนสร้างใบ (นับที่เดียว)
        //    กติกาเดียวกับ consign_submit และ inquiry_submit
        okScreen(root, x.j);
        try { w.scrollTo({ top: root.offsetTop - 80, behavior: 'smooth' }); } catch (e) {}
      }).catch(function (err) {
        send.disabled = false;
        send.textContent = 'ส่งคำขอให้ทีมงาน';
        msg.textContent = err.message + ' — ถ้ายังไม่ได้ ทักไลน์หาทีมงานได้เลย';
        msg.className = 'ins-msg err';
      });
    });
  }

  /* ---------- หน้าติดตามสถานะ ---------- */
  var STATUS_STEP = {
    new: 1, to_contact: 1, contacted: 2, need_info: 2,
    appointed: 3, quoted: 4, approved: 5, rejected: 0, closed: 5
  };
  function trackHtml(l) {
    var svc = (l.services || []).map(function (s) { return '<li>' + esc(s.th) + '</li>'; }).join('');
    var step = STATUS_STEP[l.status] || 1;
    var bar = [1, 2, 3, 4, 5].map(function (i) {
      return '<span class="ins-dot' + (i <= step ? ' on' : '') + '"></span>';
    }).join('');
    return '<div class="ins-track-page">' +
      '<p class="ins-no">เลขงาน <b>' + esc(l.id) + '</b></p>' +
      '<div class="ins-status"><b>' + esc(l.statusTh) + '</b>' +
        (l.status === 'rejected' ? '<small>คำขอนี้ปิดไปแล้ว หากต้องการเริ่มใหม่ ทักไลน์หาทีมงานได้</small>' : '') +
      '</div>' +
      '<div class="ins-bar" aria-hidden="true">' + bar + '</div>' +
      (l.listingId ? '<p class="ins-row"><span>แปลงที่สนใจ</span><b>' + esc(l.listingId) + '</b></p>' : '') +
      (svc ? '<div class="ins-row col"><span>บริการที่ขอ</span><ul>' + svc + '</ul></div>' : '') +
      ((l.preferDates || []).length
        ? '<p class="ins-row"><span>วันที่แจ้งไว้</span><b>' + l.preferDates.map(thaiDate).join(' · ') + '</b></p>' : '') +
      (l.fileCount ? '<p class="ins-row"><span>เอกสารที่แนบไว้</span><b>' + l.fileCount + ' ไฟล์</b></p>' : '') +
      '<p class="ins-row"><span>ส่งคำขอเมื่อ</span><b>' + esc(thaiDate(l.createdAt)) + '</b></p>' +
      (l.deal
        ? '<a class="ins-deal" href="deal.html?id=' + encodeURIComponent(l.deal.id) +
          '&t=' + encodeURIComponent(l.deal.ticket) + '">ดูความคืบหน้าการซื้อทั้งหมด →</a>'
        : '') +
      '<a class="ins-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">' +
        'สอบถามทีมงานทางไลน์</a>' +
    '</div>';
  }

  function loadTrack(root, id, t) {
    // คนที่เปิดลิงก์ติดตามส่งคำขอมาแล้ว — ข้อความชวนให้ส่งคำขอจึงไม่ใช่สิ่งที่เขามาหา
    // (ซ่อนด้วย CSS ไม่ใช่ลบทิ้ง เผื่อเขากดปุ่ม "นัดตรวจแปลง" ที่แถบล่างแล้วกลับมาที่ฟอร์ม)
    d.body.classList.add('ins-tracking');
    root.innerHTML = '<p class="ins-loading">กำลังโหลดสถานะงาน...</p>';
    fetch(API + '/api/public/inspection/' + encodeURIComponent(id) + '?t=' + encodeURIComponent(t))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error((x.j && x.j.error) || 'เปิดไม่ได้');
        root.innerHTML = trackHtml(x.j);
      })
      .catch(function (err) {
        root.innerHTML = '<div class="ins-fail"><h2>เปิดลิงก์นี้ไม่ได้</h2><p>' + esc(err.message) + '</p>' +
          '<a class="ins-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">ทักไลน์หาทีมงาน</a></div>';
      });
  }

  /* ---------- นับการกดปุ่มติดต่อ ----------
     ⚠️ กติกาข้อ 6 — ปุ่มติดต่อทุกปุ่มต้องถูกนับ ไม่งั้นยอดลีดต่ำกว่าความจริง
     ใช้ตัวดักที่กล่องแทนการผูกรายปุ่ม เพราะหน้านี้วาดใหม่หลายรอบ (ฟอร์ม → สำเร็จ → ติดตาม) */
  var CONTACT_EV = { line: 'line_click', messenger: 'messenger_click', tel: 'tel_click' };
  var CONTACT_METHOD = { line: 'line', messenger: 'messenger', tel: 'phone' };
  function bindContact(root) {
    root.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('[data-contact]') : null;
      if (!a) return;
      var k = a.getAttribute('data-contact');
      if (!CONTACT_EV[k]) return;
      if (w.njTrackInternal) w.njTrackInternal(CONTACT_EV[k]);
      if (w.njTrack) w.njTrack('Contact', { method: CONTACT_METHOD[k] });
    });
  }

  /* ---------- เริ่มทำงาน ---------- */
  d.addEventListener('DOMContentLoaded', function () {
    var root = d.getElementById('ins-root');
    if (!root) return;
    bindContact(d);           // ทั้งหน้า — แถบติดต่อล่างจอมือถืออยู่นอกกล่องนี้
    var id = qs('id'), t = qs('t');
    if (id && t) { loadTrack(root, id, t); return; }
    root.innerHTML = formHtml(qs('listing'));
    bindForm(root);
    if (w.njTrackInternal) w.njTrackInternal('inspect_view', qs('listing') || '');
  });
})(window, document);
