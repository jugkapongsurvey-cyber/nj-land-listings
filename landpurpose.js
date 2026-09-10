/* ===========================================================================
   ค้นหาที่ดินตามวัตถุประสงค์ (window.NJPurpose) — Phase 3
   ใช้ที่หน้าค้นหาตามวัตถุประสงค์ (purpose.html) และแผงในหน้ารายละเอียดแปลง (land.html)

   ⚠️ กติกาที่ห้ามผ่อน

   1. **นี่คือการช่วยจัดลำดับว่าควรดูแปลงไหนก่อน ไม่ใช่การฟันธงว่าใช้ทำอะไรได้ตามกฎหมาย**
      ห้ามเขียนข้อความทำนอง "สร้างได้แน่นอน" หรือ "จัดสรรได้แน่นอน" เด็ดขาด
      และ `disclaim` ที่เซิร์ฟเวอร์ส่งมา **ต้องพิมพ์ทุกครั้งที่แสดงผล ห้ามถอด**
      (contracts.test.js ล็อกไว้ทั้งสองข้อ)

   2. **"ยังบอกไม่ได้" กับ "ยังไม่เข้าทาง" เป็นคนละคำตอบ ห้ามยุบรวม**
      `unknown` = ยังไม่มีใครไปตรวจ · `weak` = ตรวจแล้วข้อมูลชี้ว่าติดขัด
      ยุบเป็น "ไม่เหมาะ" เมื่อไหร่ = กล่าวหาแปลงที่ยังไม่มีใครไปตรวจ
      และ **ห้ามซ่อนแปลงกลุ่ม unknown ออกจากผลค้น** — เซิร์ฟเวอร์เรียงลำดับให้แล้ว
      หน้าเว็บมีหน้าที่บอกจำนวนของแต่ละกลุ่มให้ครบ

   3. **ห้ามคำนวณความเข้ากันเองที่ฝั่งนี้** เซิร์ฟเวอร์คิดมาให้แล้วทั้งคะแนนและเหตุผล
      คิดซ้ำ = สองที่ให้คำตอบคนละอย่างโดยไม่มีอะไรเตือน (บทเรียนเดียวกับราคาต่อตารางวา)

   4. **รายชื่อวัตถุประสงค์ต้องดึงจาก `/api/public/purposes`** ห้ามฝังรายการไว้ในไฟล์นี้
      ฝังเมื่อไหร่ = วันหนึ่งปุ่มบนเว็บกับตัวคำนวณฝั่งระบบใช้คีย์คนละชุด แล้วกดแล้วได้ผลว่างเปล่า
      โดยไม่มีอะไรเตือน (บทเรียนเดียวกับ messenger_click ที่เคยตกหล่นใน analytics.js)

   5. **สีเป็นตัวช่วยเท่านั้น** ทุกป้ายมีคำอธิบายเป็นข้อความกำกับ ถอดสีออกแล้วต้องยังอ่านรู้เรื่อง
   =========================================================================== */
(function (w, d) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function api() { return w.NJ_API_BASE || 'https://app.njteedinsure.com'; }

  // ชนิดของเหตุผล — ⚠️ `caution` ไม่ใช่ "ไม่ผ่าน" แต่คือ "ตรวจแล้วเจอข้อที่ต้องจัดการก่อน"
  var KIND = {
    ok:      { mark: '✓', cls: 'ok' },
    partial: { mark: '◐', cls: 'partial' },
    caution: { mark: '!', cls: 'caution' }
  };
  var BANDS = ['good', 'maybe', 'unknown', 'weak'];
  function bandClass(b) { return BANDS.indexOf(b) >= 0 ? b : 'unknown'; }

  /* ---------- ดึงข้อมูลจากเซิร์ฟเวอร์ ---------- */
  // ผู้เรียกต้องจัดการทั้งกรณีสำเร็จและล้มเหลว — "โหลดไม่ได้" กับ "ไม่มีแปลง" ห้ามแสดงเหมือนกัน
  function fetchMeta() {
    return fetch(api() + '/api/public/purposes')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); });
  }
  function fetchByPurpose(key) {
    return fetch(api() + '/api/public/listings?purpose=' + encodeURIComponent(key))
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); });
  }

  /* ---------- ป้ายระดับ ---------- */
  // ไม่มีข้อมูลวัตถุประสงค์ = ไม่มีป้าย (คืนสตริงว่าง) ไม่ใช่วาดป้ายเปล่า
  function badgeHtml(p) {
    if (!p || !p.band) return '';
    // แสดงตัวเลขเฉพาะตอนที่ระบบตอบได้จริง — ตัวเลขคู่กับ "ยังบอกไม่ได้" อ่านแล้วขัดกันเอง
    var n = p.band === 'unknown' ? '' : ' · ' + p.fit;
    return '<span class="njpp-badge ' + bandClass(p.band) + '">' + esc(p.bandTh) + esc(n) + '</span>';
  }

  /* ---------- เหตุผลย่อใต้การ์ดในหน้าผลค้น ---------- */
  function whyHtml(p) {
    if (!p) return '';
    var lines = (p.reasons || []).map(function (t) {
      return '<li>' + esc(t) + '</li>';
    }).join('');
    // แปลงที่ยังไม่มีข้อมูลพอ ต้องบอกตรงๆ ว่ายังขาดอะไร ไม่ใช่ปล่อยว่าง
    var gap = [];
    if (p.missingCount) gap.push('ยังขาดข้อมูล ' + p.missingCount + ' ข้อ');
    if (p.watchCount) gap.push('มีประเด็นที่ต้องตรวจเพิ่ม ' + p.watchCount + ' ข้อ');
    return '<div class="njpp-why">' +
      (lines ? '<ul>' + lines + '</ul>' : '') +
      (gap.length ? '<span class="njpp-gap">' + esc(gap.join(' · ')) + '</span>' : '') +
    '</div>';
  }

  /* ---------- กลุ่มรายการในแผงเต็ม ---------- */
  function group(title, items, cls) {
    if (!items || !items.length) return '';
    return '<div class="njpp-group ' + cls + '"><b>' + esc(title) + '</b><ul>' +
      items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') +
    '</ul></div>';
  }

  /* ---------- แผงเต็มในหน้ารายละเอียดแปลง ---------- */
  // ⚠️ ไม่มีข้อมูล = ซ่อนทั้งแผง (คืนสตริงว่าง) — แปลงเก่าหน้าตาเหมือนเดิมเป๊ะ
  function panelHtml(purposes) {
    if (!purposes || !purposes.items || !purposes.items.length) return '';
    var ORDER = { good: 0, maybe: 1, unknown: 2, weak: 3 };
    var items = purposes.items.slice().sort(function (a, b) {
      var r = (ORDER[a.band] == null ? 3 : ORDER[a.band]) - (ORDER[b.band] == null ? 3 : ORDER[b.band]);
      return r !== 0 ? r : (b.fit - a.fit);
    });

    var rows = items.map(function (it) {
      var reasons = (it.reasons || []).map(function (r) {
        var k = KIND[r.kind] || KIND.partial;
        return '<li class="' + k.cls + '"><span aria-hidden="true">' + k.mark + '</span>' + esc(r.text) + '</li>';
      }).join('');
      var svc = (it.services || []).map(function (s) {
        return s.th + (s.why ? ' — ' + s.why : '');
      });
      return '<details class="njpp-item ' + bandClass(it.band) + '">' +
        '<summary><b>' + esc(it.th) + '</b>' + badgeHtml(it) + '</summary>' +
        '<div class="njpp-body">' +
          '<p class="njpp-known">ระบบมีข้อมูลที่ตรวจแล้วราว ' + esc(it.known) + '% ของสิ่งที่ต้องรู้สำหรับวัตถุประสงค์นี้</p>' +
          (reasons ? '<ul class="njpp-reasons">' + reasons + '</ul>' : '') +
          group('ข้อมูลที่ผ่านการตรวจแล้ว', it.checked, 'done') +
          group('ข้อมูลที่ยังขาด', it.missing, 'miss') +
          group('ประเด็นที่ต้องตรวจเพิ่มเติม', it.watch, 'watch') +
          group('บริการของเราที่ทำต่อให้ได้', svc, 'svc') +
        '</div>' +
      '</details>';
    }).join('');

    // แปลงที่ยังไม่มีใครไปตรวจจะขึ้น "ยังบอกไม่ได้" ครบทุกข้อ — ต้องอธิบายว่าทำไม
    // ไม่งั้นอ่านแล้วเหมือนแปลงถูกตัดสินไปแล้ว ทั้งที่ความจริงคือยังไม่มีใครไปดู
    var allUnknown = items.every(function (x) { return x.band === 'unknown'; });
    var note = allUnknown
      ? '<p class="njpp-note">แปลงนี้ยังไม่มีผลตรวจในระบบมากพอที่จะบอกได้ว่าเข้าทางอะไร ' +
        'กดดูแต่ละหัวข้อได้ว่ายังขาดข้อมูลอะไรบ้าง และให้ทีมช่างรังวัดไปตรวจให้ก่อนตัดสินใจได้</p>'
      : '';
    return '<section class="njpp" aria-labelledby="njpp-h">' +
      '<h2 id="njpp-h">แปลงนี้เข้าทางอะไรบ้าง</h2>' +
      '<p class="njpp-disclaim">' + esc(purposes.disclaim || '') + '</p>' +
      note +
      '<div class="njpp-list">' + rows + '</div>' +
    '</section>';
  }

  /* ---------- ปุ่มเลือกวัตถุประสงค์ ---------- */
  function chipsHtml(list, active) {
    if (!list || !list.length) return '';
    return list.map(function (p) {
      return '<button type="button" class="njpp-chip' + (p.key === active ? ' on' : '') + '" ' +
        'data-purpose="' + esc(p.key) + '"' + (p.key === active ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
        esc(p.th) + '</button>';
    }).join('');
  }

  w.NJPurpose = {
    esc: esc, KIND: KIND, BANDS: BANDS, bandClass: bandClass,
    fetchMeta: fetchMeta, fetchByPurpose: fetchByPurpose,
    badgeHtml: badgeHtml, whyHtml: whyHtml, panelHtml: panelHtml, chipsHtml: chipsHtml
  };
})(window, document);
