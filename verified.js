/* ===========================================================================
   Teedin Sure Verified — บันไดระดับการตรวจสอบ 2 ระดับ
   window.NJVerified · ใช้ร่วมกันทั้งการ์ดแปลงและหน้ารายละเอียด

   ⚠️ ตัดจาก 5 ระดับเหลือ 2 ระดับ (เจ้าของกิจการสั่ง 1 ต.ค. 2569) — ถอด document / site / survey ออก
      เหลือ owner → transfer · ฝั่งระบบ (lib/landverify.js) ตัดพร้อมกัน
      ข้อมูลที่ API ส่งมาจากรุ่นเก่า (ยังมีคีย์ที่ถอดแล้ว · total 5) ต้องไม่โผล่บนหน้าเว็บ
      และต้องไม่ทำให้ตัวเลขเกินจริง — ดู `summary()`

   ⚠️ กติกาที่ห้ามผ่อน — อ่านก่อนแก้ไฟล์นี้ทุกครั้ง

   1. **ห้ามเติมความหมายให้ข้อมูลที่ API ไม่ได้ส่งมา** (กติกาข้อ 5 ของ CLAUDE.md)
      ไม่มีก้อน `verify` = ซ่อนทั้งแถบไปเลย ห้ามขึ้นบันไดว่างเปล่าเป็นขีดสีเทา
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
  // ⚠️ คีย์ที่ไม่อยู่ในรายการนี้ (document / site / survey ที่ถอดแล้ว หรือคีย์ใหม่ที่เว็บยังไม่รู้จัก)
  //    **ข้ามทิ้งเสมอ ห้ามวาดเป็นแถว** — ดู `KNOWN`
  var LEVELS = [
    { k: 'owner',    th: 'ยืนยันผู้มีสิทธิ์ประกาศ',
      hint: 'ยืนยันว่าคนที่ประกาศขายคือเจ้าของหรือผู้มีสิทธิ์ประกาศจริง' },
    { k: 'transfer', th: 'ข้อมูลและเอกสารพร้อมเข้าสู่ขั้นตอนซื้อขาย',
      hint: 'ทีมงานตรวจข้อมูลและเอกสารสำคัญแล้ว ครบพอที่จะเริ่มขั้นตอนซื้อขายและโอนได้ และมีรายงานให้ผู้ซื้ออ่าน' }
  ];
  var KNOWN = {};
  LEVELS.forEach(function (def) { KNOWN[def.k] = true; });
  // ชื่อที่แสดงจริง = "ระดับ n · ชื่อระดับ" (ชื่อเดียวกับระบบหลังบ้าน · เจ้าของสั่ง 1 ต.ค. 69) — เลขระดับช่วยให้ผู้ซื้อเทียบข้ามแปลงได้ทันที
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
            return e.url && /^(https?:[/][/]|[/](?![/]))/i.test(e.url)
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

  /* ---- ตัวเลข "ผ่านกี่ระดับจากกี่ระดับ" ที่ปลอดภัยต่อข้อมูลรุ่นเก่า ----
     ⚠️ total ยึดจำนวนระดับที่เว็บรู้จัก (LEVELS) ไม่ใช่ตัวเลขที่ API ส่งมา
        คำตอบที่ค้างจากรุ่น 5 ระดับ (แคช/เซิร์ฟเวอร์ยังไม่ deploy) จะได้ไม่ขึ้น "3 จาก 2"
     ⚠️ ห้ามให้ตัวเลขเกินจริง — ใช้ค่าที่น้อยกว่าเสมอระหว่างที่เซิร์ฟเวอร์บอก กับที่นับได้เองจากแถวที่รู้จัก
        · มีรายระดับ (หน้ารายละเอียด) = นับ "ผ่านติดต่อกันจากระดับ 1 และยังไม่หมดอายุ" กฎเดียวกับเซิร์ฟเวอร์
        · มีแค่ {reached,total} (หน้ารวมประกาศ) และ total ไม่ตรงกับบันไดปัจจุบัน = ข้อมูลรุ่นเก่า
          นับว่าถึงระดับบนสุดเฉพาะเมื่อรุ่นเก่าผ่านครบทุกระดับเท่านั้น นอกนั้นนับได้แค่ระดับ 1 */
  function summary(v) {
    var total = LEVELS.length;
    if (!v) return { reached: 0, total: total };
    var r = Math.max(0, Math.floor(Number(v.reached) || 0));
    var srvTotal = Math.floor(Number(v.total) || 0);
    if (v.levels && v.levels.length) {
      var byKey = {};
      v.levels.forEach(function (l) { if (l && KNOWN[l.key]) byKey[l.key] = l; });
      var own = 0;
      for (var i = 0; i < LEVELS.length; i++) {
        var l = byKey[LEVELS[i].k];
        if (!l || l.status !== 'passed' || l.expired) break;
        own++;
      }
      r = Math.min(r, own);
    } else if (srvTotal && srvTotal !== total) {
      r = r >= srvTotal ? total : Math.min(r, total - 1);
    }
    return { reached: Math.min(r, total), total: total };
  }

  // แถบความคืบหน้า 1 ขีดต่อ 1 ระดับ — มีข้อความบอกเสมอ ไม่ใช่มีแต่ขีดสี
  function pipsHtml(reached, total) {
    var out = '';
    for (var i = 0; i < total; i++) out += '<i class="' + (i < reached ? 'on' : '') + '"></i>';
    return '<div class="njv-pips" role="img" aria-label="ผ่านการตรวจสอบ ' + reached + ' จาก ' + total + ' ระดับ">' + out + '</div>';
  }

  /* ---- บันไดเต็ม สำหรับหน้ารายละเอียดแปลง ----
     คืนสตริงว่างเมื่อ API ไม่ได้ส่ง verify มา → หน้าเว็บซ่อนทั้งหัวข้อ (กติกาข้อ 1) */
  function ladderHtml(v) {
    if (!v || !v.levels || !v.levels.length) return '';
    // ⚠️ อ่านเฉพาะคีย์ที่รู้จัก — ระดับที่ถอดแล้วจากคำตอบรุ่นเก่าต้องไม่โผล่ ไม่ถูกนับในสรุป
    var known = v.levels.filter(function (l) { return l && KNOWN[l.key]; });
    if (!known.length) return '';
    var byKey = {};
    known.forEach(function (l) { byKey[l.key] = l; });
    var rows = LEVELS.map(function (def, i) {
      return rowHtml({ k: def.k, th: def.th, hint: def.hint, name: levelName(i) }, byKey[def.k]);
    }).join('');
    var issues = known.filter(function (l) { return l.status === 'issue'; }).length;
    var stale = known.filter(function (l) { return l.expired; }).length;
    var sum = summary(v);

    var summaryText = 'ผ่านการตรวจสอบ ' + sum.reached + ' จาก ' + sum.total + ' ระดับ';
    var extra = [];
    if (issues) extra.push('มี ' + issues + ' ระดับที่พบประเด็นที่ผู้ซื้อควรทราบ');
    if (stale) extra.push('มี ' + stale + ' ระดับที่ถึงกำหนดตรวจใหม่');

    return '<section class="njv" aria-labelledby="njv-h">' +
      '<div class="njv-head">' +
        '<div><h2 id="njv-h">ระดับการตรวจสอบ<span>Teedin Sure Verified</span></h2>' +
          '<p>' + esc(summaryText) + (extra.length ? ' · ' + esc(extra.join(' · ')) : '') + '</p></div>' +
        pipsHtml(sum.reached, sum.total) +
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
     ⚠️ ยังไม่ถึงระดับใดเลย = ไม่ขึ้นป้าย · ป้าย "0 จาก 2" อ่านแล้วแย่กว่าไม่มีป้าย
     และแปลงที่ทีมยังไม่ได้ไล่กรอกจะดูเหมือนถูกตัดสินไปแล้วทั้งที่ยังไม่มีใครไปตรวจ */
  function badgeHtml(v) {
    if (!v || !v.total || !v.reached) return '';
    var sum = summary(v);
    if (!sum.reached) return '';
    // ⚠️ บอก "ชื่อของระดับที่ถึงแล้ว" ไม่ใช่แค่เศษส่วน — "1/2" ไม่ได้บอกผู้ซื้อว่าตรวจอะไรไปแล้ว
    //    ซึ่งเป็นคำถามเดียวที่เขาอยากรู้ตอนกวาดสายตาดูการ์ดหลายใบ
    var i = Math.min(Math.max(sum.reached - 1, 0), LEVELS.length - 1);
    var name = LEVELS[i] ? LEVELS[i].th : '';
    return '<span class="njv-badge" title="ผ่านการตรวจสอบ ' + sum.reached + ' จาก ' + sum.total + ' ระดับ — ระดับล่าสุดคือ ' + esc(name) + '">' +
      '<b>ระดับ ' + sum.reached + '/' + sum.total + '</b> ' + esc(name) + '</span>';
  }

  // ---------- นับตอนผู้ใช้กางดูบันไดการตรวจสอบ (งานที่ 16) ----------
  //
  // ⚠️ นับครั้งเดียวต่อหนึ่งการเปิดหน้า ไม่ใช่ทุกครั้งที่กางหุบ — บันไดมีหลายแถว
  //    ถ้านับทุกแถว คนที่สนใจมากจะถูกนับซ้ำหลายครั้ง แล้วตัวเลขอ่านไม่ได้ว่ามีกี่คน
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

  w.NJVerified = { LEVELS: LEVELS, levelName: levelName, summary: summary, isKnown: function (k) { return !!KNOWN[k]; },
                   ladderHtml: ladderHtml, badgeHtml: badgeHtml, stateOf: stateOf, thaiDate: thaiDate };
})(window, document);
