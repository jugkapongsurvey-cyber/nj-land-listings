/* ============================================================
   ติดตามการซื้อที่ดินของตัวเอง 11 ขั้น (Phase 2 งานย่อยที่ 5)
   เปิดได้ด้วยลิงก์ที่มีตั๋วเท่านั้น — deal.html?id=DL-xxx&t=<ตั๋ว>

   ⚠️ กติกาที่ห้ามผ่อน
   1. **ห้ามมีฟอร์มเข้าสู่ระบบในหน้านี้เด็ดขาด** (กติกาเดียวกับ portal.html)
      เว็บนี้เป็นสแตติกบน GitHub Pages ไม่มีฝั่งเซิร์ฟเวอร์ที่ถือ token ได้ปลอดภัย
      และการรับรหัสผ่านที่โดเมนหนึ่งแล้วส่งข้ามไปอีกโดเมน = สอนลูกค้าให้กรอกรหัส
      ในที่ที่ไม่ใช่ระบบจริง ซึ่งเป็นพฤติกรรมเดียวกับหน้าฟิชชิ่ง
   2. **ขั้นที่ยังไม่ถึง ต้องว่างเปล่า ห้ามเขียนว่า "รอ" หรือ "กำลังดำเนินการ"**
      กติกาเดียวกับผลตรวจ 7 หัวข้อและบันได 5 ระดับ — "ยังไม่ถึงคิว" กับ "กำลังทำอยู่" คนละเรื่อง
      เขียนว่ารออยู่ = รับปากล่วงหน้าแทนสิ่งที่ยังไม่เกิด
   3. **ลำดับและคีย์ของ STEPS ต้องตรงกับ DEAL_STEPS ใน lib/deals.js เป๊ะ**
      (contracts.test.js หัวข้อ 8 เทียบให้แล้ว) · เซิร์ฟเวอร์ส่งคำไทยมาด้วยอยู่แล้ว
      รายการนี้จึงมีไว้เพื่อ **วาดเส้นทางทั้งเส้นรวมขั้นที่ยังไม่ถึง** ซึ่ง publicDeal ก็ส่งครบอยู่แล้ว
      ใช้เป็นทางถอยเมื่อใบเก่ามีขั้นไม่ครบ ไม่ใช่แหล่งความจริงหลัก
   4. **ห้ามแสดงอะไรที่ไม่ได้มาจาก API** — งานฝั่งเจ้าหน้าที่ (staffTodo) และประวัติภายใน
      ถูกตัดทิ้งที่ publicDeal แล้ว ฝั่งนี้จึงต้องไม่ไปเดาหรือเติมข้อความแทน
   ============================================================ */
(function (w, d) {
  'use strict';

  // ⚠️ ต้องตรงกับ DEAL_STEPS ใน nj-survey-system/lib/deals.js
  var STEPS = ['interested', 'request_info', 'doc_check', 'site_visit', 'survey',
               'quote', 'deposit', 'prepare_docs', 'transfer_appt', 'transferred', 'aftercare'];
  var STEP_TH = {
    interested: 'สนใจแปลง', request_info: 'ขอข้อมูลเพิ่มเติม', doc_check: 'ตรวจเอกสาร',
    site_visit: 'นัดดูพื้นที่', survey: 'ตรวจหรือรังวัด', quote: 'เสนอราคา',
    deposit: 'วางมัดจำ', prepare_docs: 'เตรียมเอกสาร', transfer_appt: 'นัดโอน',
    transferred: 'โอนกรรมสิทธิ์', aftercare: 'บริการหลังซื้อ'
  };
  // ⚠️ ทุกสถานะต้องมีคำอธิบายเป็นข้อความ ไม่ใช่สื่อด้วยสีอย่างเดียว
  //    (กติกาเดียวกับรายงานสุขภาพแปลง — ถอดสีออกแล้วต้องยังอ่านรู้เรื่องครบทุกแถว)
  var STATE_TH = {
    done: 'เสร็จแล้ว',
    active: 'กำลังดำเนินการ',
    blocked: 'ติดปัญหา ต้องแก้ก่อนไปต่อ',
    '': 'ยังไม่ถึงขั้นนี้'
  };

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

  function stepHtml(st, i) {
    var s = st.status || '';
    var cls = 'dl-step' + (s ? ' is-' + s : ' is-none');
    var mark = s === 'done' ? '✓' : s === 'blocked' ? '!' : String(i + 1);
    var bits = [];
    if (s === 'done' && st.doneAt) bits.push('เสร็จเมื่อ ' + esc(thaiDate(st.doneAt)));
    if (s !== 'done' && st.dueAt) bits.push('กำหนด ' + esc(thaiDate(st.dueAt)));
    if (st.fileCount) bits.push(st.fileCount + ' ไฟล์');
    return '<li class="' + cls + '">' +
      '<span class="dl-mark" aria-hidden="true">' + mark + '</span>' +
      '<div class="dl-body">' +
        '<div class="dl-name">' + esc(st.th || STEP_TH[st.key] || st.key) + '</div>' +
        '<div class="dl-state">' + esc(STATE_TH[s] != null ? STATE_TH[s] : s) + '</div>' +
        (st.note ? '<p class="dl-note">' + esc(st.note) + '</p>' : '') +
        (st.customerTodo
          ? '<p class="dl-todo"><b>สิ่งที่ต้องเตรียม:</b> ' + esc(st.customerTodo) + '</p>' : '') +
        (bits.length ? '<div class="dl-meta">' + bits.join(' · ') + '</div>' : '') +
      '</div>' +
    '</li>';
  }

  function pageHtml(dl) {
    // เซิร์ฟเวอร์ส่งขั้นมาครบอยู่แล้ว · ใบเก่าที่ขั้นไม่ครบให้เติมขั้นที่ขาดเป็น "ยังไม่ถึง"
    var byKey = {};
    (dl.steps || []).forEach(function (s) { if (s && s.key) byKey[s.key] = s; });
    var steps = STEPS.map(function (k) {
      return byKey[k] || { key: k, th: STEP_TH[k], status: '', note: '', customerTodo: '', fileCount: 0 };
    });
    // ⚠️ progress ที่เซิร์ฟเวอร์ส่งมาเป็นก้อน {done,total} ไม่ใช่ตัวเลข
    //    เผลออ่านเป็นตัวเลขเมื่อไหร่ได้ NaN แล้วแถบความคืบหน้าเป็น 0% ตลอดโดยไม่มี error (เจอจริงตอนทดสอบ)
    // ⚠️ done ของเซิร์ฟเวอร์นับ "เสร็จติดต่อกันจากขั้นแรก" ซึ่งไม่เท่ากับจำนวนขั้นที่เสร็จทั้งหมด
    //    ใช้ค่าของเซิร์ฟเวอร์เสมอ ห้ามคิดเอง — ไม่งั้นตัวเลขบนหน้าจอกับในระบบหลังบ้านไม่ตรงกัน
    var pg = dl.progress || {};
    var doneN = Number(pg.done) || 0;
    var totalN = Number(pg.total) || STEPS.length;
    var pct = Math.round(doneN / totalN * 100);
    var cur = dl.currentStep;

    return '<div class="dl-head">' +
        '<p class="dl-no">เลขงาน <b>' + esc(dl.id) + '</b></p>' +
        (dl.listing
          ? '<p class="dl-listing">แปลง <a href="land.html?id=' + encodeURIComponent(dl.listing.id) + '">' +
            esc(dl.listing.parcelInfo || dl.listing.id) + '</a></p>'
          : '') +
        '<div class="dl-now">' +
          (cur ? '<b>ตอนนี้อยู่ขั้น ' + esc(cur.th) + '</b><small>' +
                 esc(STATE_TH[cur.status] != null ? STATE_TH[cur.status] : cur.status) + '</small>'
               : '<b>ดำเนินการครบทุกขั้นแล้ว</b>') +
        '</div>' +
        '<div class="dl-bar"><span style="width:' + pct + '%"></span></div>' +
        '<p class="dl-count">ผ่านไปแล้ว ' + doneN + ' จาก ' + totalN + ' ขั้น' +
          (dl.updatedAt ? ' · อัปเดตล่าสุด ' + esc(thaiDate(dl.updatedAt)) : '') + '</p>' +
      '</div>' +
      '<ol class="dl-steps">' + steps.map(stepHtml).join('') + '</ol>' +
      '<p class="dl-foot">ทุกขั้นบันทึกตามที่เกิดขึ้นจริง ขั้นที่ยังว่างคือยังไม่ถึงคิว ไม่ใช่ตกหล่น ' +
        'มีอะไรไม่ตรงกับที่คุยกันไว้ ทักทีมงานได้เลย</p>' +
      '<a class="dl-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">' +
        'สอบถามทีมงานทางไลน์</a>';
  }

  function noTicketHtml() {
    return '<div class="dl-empty">' +
      '<h2>เปิดหน้านี้ด้วยลิงก์ของคุณเอง</h2>' +
      '<p>หน้าติดตามงานเปิดได้จากลิงก์เฉพาะตัวที่ทีมงานส่งให้ในไลน์ หรือลิงก์ที่ได้ตอนส่งคำขอนัดตรวจแปลง ' +
      'ลิงก์นั้นเป็นกุญแจของงานคุณ จึงไม่มีการเข้าสู่ระบบด้วยรหัสผ่านที่หน้านี้</p>' +
      '<p>หาลิงก์ไม่เจอ ทักทีมงานแล้วแจ้งเลขงานหรือเบอร์โทรที่ใช้ตอนส่งคำขอ ทีมงานส่งลิงก์ให้ใหม่ได้</p>' +
      '<a class="dl-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">' +
        'ทักไลน์ขอลิงก์ติดตามงาน</a>' +
    '</div>';
  }

  function load(root, id, t) {
    root.innerHTML = '<p class="dl-loading">กำลังโหลดความคืบหน้า...</p>';
    fetch(API + '/api/public/deal/' + encodeURIComponent(id) + '?t=' + encodeURIComponent(t))
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok) throw new Error((x.j && x.j.error) || 'เปิดไม่ได้');
        root.innerHTML = pageHtml(x.j);
      })
      .catch(function (err) {
        root.innerHTML = '<div class="dl-empty"><h2>เปิดลิงก์นี้ไม่ได้</h2><p>' + esc(err.message) + '</p>' +
          '<a class="dl-line" href="' + esc(LINE) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-contact="line">' +
          'ทักไลน์หาทีมงาน</a></div>';
      });
  }

  /* นับการกดปุ่มติดต่อ (กติกาข้อ 6) — ดักที่ทั้งหน้าเพราะเนื้อหาถูกวาดใหม่หลังโหลดข้อมูล */
  function bindContact() {
    d.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('[data-contact="line"]') : null;
      if (!a) return;
      if (w.njTrackInternal) w.njTrackInternal('line_click');
      if (w.njTrack) w.njTrack('Contact', { method: 'line' });
    });
  }

  d.addEventListener('DOMContentLoaded', function () {
    var root = d.getElementById('dl-root');
    if (!root) return;
    bindContact();
    var id = qs('id'), t = qs('t');
    if (!id || !t) { root.innerHTML = noTicketHtml(); return; }
    load(root, id, t);
  });
})(window, document);
