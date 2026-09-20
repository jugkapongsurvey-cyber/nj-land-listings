/* ===========================================================================
   Teedin Sure Verified — บันไดระดับการตรวจสอบ 5 ระดับ
   window.NJVerified · ใช้ร่วมกันทั้งการ์ดแปลงและหน้ารายละเอียด

   ⚠️ กติกาที่ห้ามผ่อน — อ่านก่อนแก้ไฟล์นี้ทุกครั้ง

   1. **ห้ามเติมความหมายให้ข้อมูลที่ API ไม่ได้ส่งมา** (กติกาข้อ 5 ของ CLAUDE.md)
      ไม่มีก้อน `verify` = ซ่อนทั้งแถบไปเลย ห้ามขึ้นบันไดว่างเปล่า 5 ขีดสีเทา
      เพราะบันไดว่างอ่านแล้วเหมือน "แปลงนี้แย่" ทั้งที่ความจริงคือ "ยังไม่มีใครไปตรวจ"
      แปลงเก่าทุกแปลงบนเว็บตอนนี้อยู่ในกลุ่มนี้ทั้งหมด

   2. **ห้ามใช้สีอย่างเดียวบอกสถานะ** ทุกขั้นต้องมีข้อความกำกับเสมอ
      (ทั้งเรื่องคนตาบอดสี และเรื่องที่ผู้ซื้ออ่านสีเขียวเป็น "ปลอดภัย" ซึ่งเราไม่ได้พูด)

   3. **"ยังไม่ได้ตรวจ" กับ "ตรวจแล้วไม่พบประเด็น" ต้องอ่านออกว่าคนละเรื่อง**
      กติกาเดียวกับผลตรวจ 7 หัวข้อเดิม · ขั้นที่ยังไม่ตรวจขึ้นขีด "—" เสมอ ห้ามซ่อนแถวทิ้ง

   4. **หมดอายุแล้วห้ามอ่านเหมือนผ่าน** เซิร์ฟเวอร์ส่ง `expired` มาให้แล้ว
      ต้องขึ้นเป็นสถานะของตัวเอง ไม่ใช่ติ๊กถูกที่มีตัวหนังสือเล็กๆ กำกับ

   5. **ห้ามใช้คำว่า "ปลอดภัย" "รับประกัน" "100%" ในไฟล์นี้เด็ดขาด**
      สิ่งที่เราพูดได้คือ "ตรวจแล้ว ณ วันที่..." ไม่ใช่คำรับประกันผลในอนาคต
   =========================================================================== */
(function (w, d) {
  'use strict';

  // ⚠️ ต้องตรงกับ VERIFY_LEVELS ใน nj-survey-system/lib/landverify.js เป๊ะ ทั้งคีย์และลำดับ
  // ไม่ตรง = บันไดบนเว็บกับที่พนักงานกรอก คนละเรื่องกันโดยไม่มี error ให้เห็น
  // (contracts.test.js เทียบสองฝั่งให้แล้ว)
  // ⚠️ **`th` คือชื่อสั้นที่ผู้ซื้อเห็น · `hint` คือคำอธิบายเต็มของระดับนั้น**
  //    ชื่อสั้นถูกเปลี่ยนเมื่อ 20 ก.ย. 2569 ตามที่เจ้าของตัดสิน (งานที่ 7)
  //    **คีย์ในฐานข้อมูลไม่เปลี่ยน** จึงไม่มี migration และแปลงเดิมไม่กระทบเลย
  //    คำอธิบายเต็มของเดิมถูกย้ายไปเป็น `hint` ไม่ได้ถูกลบทิ้ง
  //
  // ⚠️ ลำดับในอาร์เรย์นี้คือลำดับบนบันได ห้ามสลับ ห้ามแทรกกลาง
  //    `reached` ที่เซิร์ฟเวอร์ส่งมาคือ "ผ่านติดต่อกันจากระดับ 1" ดังนั้น
  //    ชื่อของระดับที่ถึงแล้ว = LEVELS[reached - 1] เสมอ (ป้ายบนการ์ดใช้ข้อนี้)
  var LEVELS = [
    { k: 'owner',    th: 'ข้อมูลจากเจ้าของ',
      hint: 'ตรวจว่าคนที่ประกาศขายคือเจ้าของหรือผู้มีสิทธิ์จริง' },
    { k: 'document', th: 'ตรวจเอกสารเบื้องต้น',
      hint: 'อ่านเอกสารสิทธิ์ที่เจ้าของแสดง เทียบกับข้อมูลที่ประกาศ' },
    { k: 'site',     th: 'ลงพื้นที่ตรวจสอบ',
      hint: 'ทีมงานไปถึงแปลงจริง ดูตำแหน่ง ทางเข้าออก และสภาพพื้นที่' },
    { k: 'survey',   th: 'รังวัดยืนยันแนวเขต',
      hint: 'มีผลรังวัดหรือข้อมูลแนวเขตจากงานรังวัดจริงประกอบ' },
    { k: 'transfer', th: 'พร้อมรายงานตรวจสอบ',
      hint: 'เอกสารสำคัญครบพอที่จะเริ่มขั้นตอนโอนได้ และมีรายงานให้ผู้ซื้ออ่าน' }
  ];
  // ชื่อที่แสดงจริง = "ระดับ n · ชื่อสั้น" — เลขระดับช่วยให้ผู้ซื้อเทียบข้ามแปลงได้ทันที
  function levelName(i) { return 'ระดับ ' + (i + 1) + ' · ' + LEVELS[i].th; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function thaiDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso || ''))) return '';
    var p = String(iso).slice(0, 10).split('-');
    return Number(p[2]) + ' ' + TH_MONTH[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
  }

  // สถานะของขั้นหนึ่ง → คลาส + ไอคอน + ข้อความ
  // ⚠️ ข้อความต้องมาคู่กับไอคอนเสมอ (กติกาข้อ 2) · ห้ามคืนแค่คลาสสี
  function stateOf(lv) {
    if (!lv) return { cls: 'none', ico: '—', label: 'ยังไม่ได้ตรวจ' };
    if (lv.status === 'passed' && lv.expired)
      return { cls: 'stale', ico: '⟳', label: 'ถึงกำหนดตรวจใหม่แล้ว' };
    if (lv.status === 'passed') return { cls: 'ok',   ico: '✓', label: 'ตรวจแล้ว' };
    if (lv.status === 'issue')  return { cls: 'issue', ico: '!', label: 'ตรวจแล้ว — พบประเด็นที่ควรทราบ' };
    return { cls: 'none', ico: '—', label: 'ยังไม่ได้ตรวจ' };
  }

  function listHtml(title, arr, cls) {
    if (!arr || !arr.length) return '';
    return '<div class="njv-list ' + cls + '"><b>' + esc(title) + '</b><ul>' +
      arr.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
  }

  // แถวเดียวของบันได — ใช้ <details> ของเบราว์เซอร์เอง ไม่เขียนตัวกาง/หุบเอง
  // ได้การใช้คีย์บอร์ดและการอ่านออกเสียงมาฟรี และไม่มีอะไรพังเมื่อ JS โหลดไม่สำเร็จ
  function rowHtml(def, lv) {
    var st = stateOf(lv);
    var meta = [];
    if (lv && lv.at) meta.push('ตรวจเมื่อ ' + thaiDate(lv.at));
    if (lv && lv.by) meta.push('โดย ' + lv.by);
    if (lv && lv.hasRef) meta.push('อ้างอิงเลขงานในระบบ');
    var expiry = '';
    if (lv && lv.until && lv.status === 'passed') {
      expiry = lv.expired
        ? 'ข้อมูลชุดนี้ถึงกำหนดตรวจใหม่ตั้งแต่ ' + thaiDate(lv.until) + ' — ทักไลน์ขอให้ทีมงานตรวจซ้ำได้'
        : 'ข้อมูลชุดนี้ควรตรวจใหม่ภายใน ' + thaiDate(lv.until);
    }

    var body =
      '<p class="njv-hint">' + esc(def.hint) + '</p>' +
      (lv && lv.note ? '<p class="njv-note">' + esc(lv.note) + '</p>' : '') +
      listHtml('ตรวจแล้ว', lv && lv.done, 'done') +
      // ⚠️ รายการ "ยังไม่ได้ตรวจ" สำคัญพอๆ กับรายการที่ตรวจแล้ว ห้ามซ่อนเพื่อให้หน้าดูสวย
      listHtml('ยังไม่ได้ตรวจในขั้นนี้', lv && lv.todo, 'todo') +
      (expiry ? '<p class="njv-exp">' + esc(expiry) + '</p>' : '') +
      (lv && lv.evidence && lv.evidence.length
        ? '<div class="njv-ev"><b>หลักฐานที่เปิดให้ดู</b>' +
          lv.evidence.map(function (e) {
            return e.url
              ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(e.label) + ' ↗</a>'
              : '<span>' + esc(e.label) + '</span>';
          }).join('') + '</div>'
        : '');

    var hasBody = !!(def.hint || (lv && (lv.note || (lv.done || []).length || (lv.todo || []).length ||
                    (lv.evidence || []).length)) || expiry);

    return '<details class="njv-row ' + st.cls + '"' + (st.cls === 'issue' ? ' open' : '') + '>' +
      '<summary>' +
        '<span class="njv-ico" aria-hidden="true">' + st.ico + '</span>' +
        '<span class="njv-t"><b>' + esc(def.name || def.th) + '</b>' +
          '<em>' + esc(st.label) + (meta.length ? ' · ' + esc(meta.join(' · ')) : '') + '</em>' +
        '</span>' +
        (hasBody ? '<span class="njv-more" aria-hidden="true">รายละเอียด</span>' : '') +
      '</summary>' +
      '<div class="njv-body">' + body + '</div>' +
    '</details>';
  }

  // แถบความคืบหน้า 5 ขีด — มีข้อความบอกเสมอ ไม่ใช่มีแต่ขีดสี
  function pipsHtml(reached, total) {
    var out = '';
    for (var i = 0; i < total; i++) out += '<i class="' + (i < reached ? 'on' : '') + '"></i>';
    return '<div class="njv-pips" role="img" aria-label="ผ่านการตรวจสอบ ' + reached + ' จาก ' + total + ' ระดับ">' + out + '</div>';
  }

  /* ---- บันไดเต็ม สำหรับหน้ารายละเอียดแปลง ----
     คืนสตริงว่างเมื่อ API ไม่ได้ส่ง verify มา → หน้าเว็บซ่อนทั้งหัวข้อ (กติกาข้อ 1) */
  function ladderHtml(v) {
    if (!v || !v.levels || !v.levels.length) return '';
    var byKey = {};
    v.levels.forEach(function (l) { byKey[l.key] = l; });
    var rows = LEVELS.map(function (def, i) {
      return rowHtml({ k: def.k, th: def.th, hint: def.hint, name: levelName(i) }, byKey[def.k]);
    }).join('');
    var issues = v.levels.filter(function (l) { return l.status === 'issue'; }).length;
    var stale = v.levels.filter(function (l) { return l.expired; }).length;

    var summary = 'ผ่านการตรวจสอบ ' + v.reached + ' จาก ' + v.total + ' ระดับ';
    var extra = [];
    if (issues) extra.push('มี ' + issues + ' ระดับที่พบประเด็นที่ผู้ซื้อควรทราบ');
    if (stale) extra.push('มี ' + stale + ' ระดับที่ถึงกำหนดตรวจใหม่');

    return '<section class="njv" aria-labelledby="njv-h">' +
      '<div class="njv-head">' +
        '<div><h2 id="njv-h">ระดับการตรวจสอบ<span>Teedin Sure Verified</span></h2>' +
          '<p>' + esc(summary) + (extra.length ? ' · ' + esc(extra.join(' · ')) : '') + '</p></div>' +
        pipsHtml(v.reached, v.total) +
      '</div>' +
      rows +
      // ⚠️ ข้อความปิดท้ายนี้ห้ามถอด — เป็นเส้นแบ่งระหว่าง "เราตรวจอะไรไปแล้ว" กับ "เรารับประกันอะไร"
      '<p class="njv-foot">ทุกระดับเป็นผลการตรวจ <b>ณ วันที่ระบุไว้</b> โดยทีมงานบริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด ' +
      'สำนักงานช่างรังวัดเอกชนใบอนุญาตเลขที่ 351 — ไม่ใช่การรับรองสถานะทางกฎหมายของที่ดิน ' +
      'และไม่ใช่คำรับประกันว่าข้อมูลจะไม่เปลี่ยนแปลงในภายหลัง ผู้ซื้อควรตรวจสอบซ้ำอีกครั้งในวันโอนกรรมสิทธิ์</p>' +
    '</section>';
  }

  /* ---- ป้ายย่อ สำหรับการ์ดแปลงบนหน้ารวมประกาศ ----
     รับได้ทั้งก้อนย่อจากหน้ารวม ({reached,total}) และก้อนเต็มจากหน้ารายละเอียด
     ⚠️ ยังไม่ถึงระดับใดเลย = ไม่ขึ้นป้าย · ป้าย "0 จาก 5" อ่านแล้วแย่กว่าไม่มีป้าย
     และแปลงที่ทีมยังไม่ได้ไล่กรอกจะดูเหมือนถูกตัดสินไปแล้วทั้งที่ยังไม่มีใครไปตรวจ */
  function badgeHtml(v) {
    if (!v || !v.total || !v.reached) return '';
    // ⚠️ บอก "ชื่อของระดับที่ถึงแล้ว" ไม่ใช่แค่เศษส่วน — "3/5" ไม่ได้บอกผู้ซื้อว่าตรวจอะไรไปแล้ว
    //    ซึ่งเป็นคำถามเดียวที่เขาอยากรู้ตอนกวาดสายตาดูการ์ดหลายใบ
    var i = Math.min(Math.max(Number(v.reached) - 1, 0), LEVELS.length - 1);
    var name = LEVELS[i] ? LEVELS[i].th : '';
    return '<span class="njv-badge" title="ผ่านการตรวจสอบ ' + v.reached + ' จาก ' + v.total + ' ระดับ — ระดับล่าสุดคือ ' + esc(name) + '">' +
      '<b>ระดับ ' + v.reached + '/' + v.total + '</b> ' + esc(name) + '</span>';
  }

  // ---------- นับตอนผู้ใช้กางดูบันไดการตรวจสอบ (งานที่ 16) ----------
  //
  // ⚠️ นับครั้งเดียวต่อหนึ่งการเปิดหน้า ไม่ใช่ทุกครั้งที่กางหุบ — บันไดมี 5 แถว
  //    ถ้านับทุกแถว คนที่สนใจมากจะถูกนับ 5 ครั้ง แล้วตัวเลขอ่านไม่ได้ว่ามีกี่คน
  // ⚠️ ผูกที่ document ด้วย event delegation — บันไดถูกวาดหลังโหลดข้อมูลเสร็จ
  var ladderCounted = false;
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('toggle', function (e) {
      if (ladderCounted) return;
      var d = e.target;
      if (!d || !d.classList || !d.classList.contains('njv-row') || !d.open) return;
      ladderCounted = true;
      if (w.njTrackInternal) w.njTrackInternal('view_survey_level');
    }, true);   // เฟส capture — เหตุการณ์ toggle ไม่ bubble
  }

  w.NJVerified = { LEVELS: LEVELS, levelName: levelName, ladderHtml: ladderHtml, badgeHtml: badgeHtml, stateOf: stateOf, thaiDate: thaiDate };
})(window, document);
