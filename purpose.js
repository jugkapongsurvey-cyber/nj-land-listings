/* หน้าค้นหาที่ดินตามวัตถุประสงค์ — Phase 3
 *
 * ทำไมต้องแยกจากหน้ารวมประกาศ: หน้ารวมประกาศกรองจาก "คุณสมบัติที่ผู้ซื้อรู้อยู่แล้วว่าอยากได้"
 * (ทำเล ราคา เนื้อที่ ผังสี) ส่วนหน้านี้เริ่มจาก "จะเอาไปทำอะไร" แล้วให้ระบบอธิบายว่า
 * แปลงไหนเข้าทางเพราะอะไร ยังขาดอะไร และต้องตรวจอะไรเพิ่ม — ซึ่งต้องมีที่ให้เขียนเหตุผล
 * ยัดลงการ์ดในหน้ารวมประกาศไม่ได้
 *
 * ⚠️ กติกาที่ห้ามผ่อน
 * 1. **รายชื่อวัตถุประสงค์ดึงจาก `/api/public/purposes` เสมอ ห้ามฝังไว้ในไฟล์นี้**
 *    ฝังเมื่อไหร่ = คีย์บนปุ่มกับคีย์ในตัวคำนวณเลื่อนออกจากกัน แล้วกดแล้วได้ผลว่างโดยไม่มีอะไรเตือน
 * 2. **ห้ามซ่อนแปลงที่ระบบยังบอกไม่ได้** เซิร์ฟเวอร์เรียงลำดับมาให้แล้วและไม่ได้คัดแปลงไหนทิ้ง
 *    หน้านี้มีหน้าที่แสดงให้ครบและบอกจำนวนของแต่ละกลุ่ม (กติกา "ไม่มีข้อมูล ≠ ไม่เหมาะ")
 * 3. **ห้ามคิดคะแนนเองหรือแปลผลเอง** แสดงเฉพาะสิ่งที่ API ส่งมาจริง (กติกาเดียวกับ listingcard.js)
 */
(function () {
  'use strict';

  var NJL = window.NJListing;
  var NJP = window.NJPurpose;
  var $ = function (id) { return document.getElementById(id); };

  var state = { meta: null, active: '', rows: [], info: null, loading: false };

  function readKey() {
    var m = (location.search || '').match(/[?&]p=([a-z_]{1,20})/);
    return m ? m[1] : '';
  }
  // เปลี่ยนที่อยู่หน้าให้ตรงกับสิ่งที่เลือก เพื่อให้ผู้ซื้อบันทึกลิงก์หรือส่งต่อให้คนอื่นได้
  function writeKey(k) {
    var url = location.pathname + (k ? '?p=' + encodeURIComponent(k) : '');
    try { history.replaceState(null, '', url); } catch (e) {}
  }

  function renderChips() {
    var list = (state.meta && state.meta.purposes) || [];
    $('pp-chips').innerHTML = NJP.chipsHtml(list, state.active);
  }

  function countsHtml(info) {
    if (!info || !info.counts) return '';
    var labels = [
      ['good', 'เข้าทาง'], ['maybe', 'พอเป็นไปได้'],
      ['unknown', 'ยังบอกไม่ได้'], ['weak', 'ยังไม่เข้าทาง']
    ];
    return labels.map(function (p) {
      var n = info.counts[p[0]] || 0;
      if (!n) return '';
      return '<span class="njpp-count"><b>' + n + '</b> ' + NJP.esc(p[1]) + '</span>';
    }).join('');
  }

  function rowHtml(item) {
    var p = item.purpose;
    // ป้ายระดับอยู่เหนือการ์ด ไม่ซ้ำชื่อแปลงอีกรอบ (ชื่ออยู่บนการ์ดอยู่แล้ว)
    // แต่ต้องมี aria-label บอกว่าป้ายนี้เป็นของแปลงไหน ไม่งั้นคนที่ใช้โปรแกรมอ่านหน้าจอจะจับคู่ไม่ได้
    return '<div class="njpp-row" role="group" aria-label="' + NJP.esc(item.parcelInfo || item.id) + '">' +
      '<div class="njpp-head">' + NJP.badgeHtml(p) + '</div>' +
      NJL.card(item) +
      NJP.whyHtml(p) +
      '<a class="njpp-more" href="land.html?id=' + encodeURIComponent(item.id) + '">' +
        'ดูเหตุผลทั้งหมดของแปลงนี้ →</a>' +
    '</div>';
  }

  function render() {
    var grid = $('pp-results');
    var sum = $('pp-summary');

    if (!state.active) {
      sum.innerHTML = '';
      grid.innerHTML = '<div class="pp-empty"><b>เลือกวัตถุประสงค์ด้านบนก่อน</b>' +
        'ระบบจะเรียงแปลงที่ประกาศอยู่ตอนนี้ให้ พร้อมบอกว่าแต่ละแปลงเข้าทางเพราะอะไร ยังขาดข้อมูลอะไร ' +
        'และมีประเด็นไหนที่ต้องตรวจเพิ่มก่อนตัดสินใจ</div>';
      return;
    }
    if (state.loading) { sum.innerHTML = ''; grid.innerHTML = '<p class="pp-loading">กำลังค้นหา…</p>'; return; }
    if (state.error) { sum.innerHTML = ''; grid.innerHTML = NJL.loadFailedHtml(); return; }

    var info = state.info || {};
    // ⚠️ คำอธิบายจากเซิร์ฟเวอร์ต้องพิมพ์ทุกครั้ง ห้ามถอดและห้ามเขียนใหม่ให้อ่อนลง
    sum.innerHTML = '<div class="njpp-summary">' +
      '<h2>ผลสำหรับ "' + NJP.esc(info.th || '') + '" — ' + state.rows.length + ' แปลง</h2>' +
      '<div class="njpp-counts">' + countsHtml(info) + '</div>' +
      '<p>' + NJP.esc(info.disclaim || '') + '</p>' +
    '</div>';

    if (!state.rows.length) {
      grid.innerHTML = NJL.emptyHtml(false);
      return;
    }
    grid.innerHTML = state.rows.map(rowHtml).join('');
  }

  function load(key) {
    state.active = key;
    state.loading = true;
    state.error = false;
    renderChips();
    render();
    NJP.fetchByPurpose(key).then(function (data) {
      // เก็บ purpose ที่เซิร์ฟเวอร์คิดมาไว้ต่างหาก เพราะ normalize() ของการ์ดตัดช่องที่ไม่รู้จักทิ้ง
      state.rows = (data.listings || []).map(function (raw, i) {
        var n = NJL.normalize(raw, i);
        n.purpose = raw.purpose || null;
        return n;
      });
      state.info = data.purpose || null;
      state.loading = false;
      render();
    }).catch(function () {
      // โหลดไม่ได้ ≠ ไม่มีแปลงที่ตรง — สองกรณีนี้ห้ามแสดงเหมือนกัน
      state.loading = false;
      state.error = true;
      render();
    });
  }

  $('pp-chips').addEventListener('click', function (e) {
    var b = e.target.closest('[data-purpose]');
    if (!b) return;
    var k = b.getAttribute('data-purpose');
    if (k === state.active) return;   // กดซ้ำอันเดิม = ไม่ต้องยิงใหม่
    writeKey(k);
    load(k);
    if (window.njTrack) window.njTrack('Search', { content_category: k, search_string: k });
  });

  NJL.bindGrid($('pp-results'), 'purpose_page');

  NJP.fetchMeta().then(function (meta) {
    state.meta = meta;
    var k = readKey();
    // คีย์จากลิงก์ที่ไม่มีในรายการของเซิร์ฟเวอร์ = ไม่เลือกอะไร ไม่ใช่หน้าพัง
    var known = (meta.purposes || []).some(function (p) { return p.key === k; });
    renderChips();
    if (k && known) load(k); else { writeKey(''); render(); }
  }).catch(function () {
    $('pp-chips').innerHTML = '';
    $('pp-results').innerHTML = NJL.loadFailedHtml();
  });

  $('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
  if (window.njTrackInternal) {
    window.njTrackInternal('pageview');
    window.njTrackInternal('purpose_view');
  }
})();
