/* ===========================================================================
   คะแนนความพร้อมของแปลง (window.NJScore) — Phase 3
   ใช้ที่หน้ารายละเอียดแปลง (แผงเต็ม) และบนการ์ดในหน้ารวมประกาศ (ป้ายเล็ก)

   ⚠️ กติกาที่ห้ามผ่อน

   1. **คะแนนนี้วัดว่า "ข้อมูลของแปลงนี้ถูกตรวจและบันทึกไว้ครบแค่ไหน"**
      ไม่ได้วัดว่าที่ดินดีหรือไม่ · ข้อความ `score.disclaim` ที่เซิร์ฟเวอร์ส่งมา
      **ต้องพิมพ์ทุกครั้งที่แสดงคะแนน ห้ามถอดและห้ามเขียนใหม่ให้อ่อนลง**
      (contracts.test.js ล็อกไว้แล้ว)

   2. **ไม่มีคะแนน = ซ่อนทั้งแผง ห้ามวาดกล่องว่างหรือเลข 0**
      เซิร์ฟเวอร์ส่ง `score: null` มาให้เองเมื่อยังไม่มีใครกรอกผลตรวจอะไรเลย
      ซึ่งเป็นสถานะของแปลงเก่าทุกแปลง · วาด 0 เมื่อไหร่ = แปลงที่ยังไม่มีใครไปตรวจ
      ดูเหมือนถูกตัดสินไปแล้ว (กติกาเดียวกับป้าย "0/5" ของบันได 5 ระดับ)

   3. **เหตุผลที่ไม่ได้คะแนนมีสองแบบ ห้ามยุบรวม**
      `missing` = ยังไม่มีข้อมูล · `issue` = ตรวจแล้วพบประเด็น
      ยุบเป็น "ไม่ผ่าน" เมื่อไหร่ = กล่าวหาแปลงที่ยังไม่มีใครไปตรวจ

   4. **ห้ามคำนวณคะแนนเองที่ฝั่งนี้** เซิร์ฟเวอร์คิดมาให้แล้วทั้งคะแนนและเหตุผล
      คิดซ้ำ = สองที่ปัดเศษไม่เหมือนกัน แล้วตัวเลขบนการ์ดกับในหน้ารายละเอียดไม่ตรงกัน
      โดยไม่มีอะไรเตือน (บทเรียนเดียวกับราคาต่อตารางวา)
   =========================================================================== */
(function (w, d) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ⚠️ ทุกชนิดต้องมีทั้งสัญลักษณ์และคำอธิบายเป็นข้อความ ไม่ใช่สื่อด้วยสีอย่างเดียว
  //    ถอดสีออกทั้งหมดแล้วแผงนี้ต้องยังอ่านรู้เรื่องครบทุกบรรทัด
  var KIND = {
    ok:      { mark: '✓', cls: 'ok',      th: 'ตรวจแล้ว' },
    partial: { mark: '◐', cls: 'partial', th: 'ตรวจแล้วบางส่วน' },
    missing: { mark: '○', cls: 'missing', th: 'ยังไม่มีข้อมูล' },
    issue:   { mark: '!', cls: 'issue',   th: 'พบประเด็นที่ควรทราบ' }
  };

  function bandClass(band) { return band === 'high' ? 'hi' : band === 'medium' ? 'mid' : 'low'; }

  /* ---------- ป้ายเล็กบนการ์ด ---------- */
  // ไม่มีคะแนน = ไม่มีป้าย (คืนสตริงว่าง) — การ์ดของแปลงเก่าจึงหน้าตาเหมือนเดิมเป๊ะ
  function badgeHtml(score) {
    if (!score || typeof score.total !== 'number') return '';
    return '<span class="njsc-badge ' + bandClass(score.band) + '" ' +
      'title="คะแนนความพร้อมของข้อมูล ' + score.total + ' จาก 100 — ไม่ใช่การให้คะแนนคุณภาพที่ดิน">' +
      '📊 ข้อมูลพร้อม ' + score.total + '/100</span>';
  }

  /* ---------- แผงเต็มในหน้ารายละเอียดแปลง ---------- */
  function panelHtml(score) {
    if (!score || !Array.isArray(score.parts) || !score.parts.length) return '';

    var parts = score.parts.map(function (p) {
      var pct = p.weight > 0 ? Math.round((p.earned / p.weight) * 100) : 0;
      var rows = (p.reasons || []).map(function (r) {
        var k = KIND[r.kind] || KIND.missing;
        return '<li class="njsc-r ' + k.cls + '">' +
          '<span class="njsc-mark" aria-hidden="true">' + k.mark + '</span>' +
          '<span class="njsc-rtext"><b class="njsc-rkind">' + esc(k.th) + ':</b> ' + esc(r.text) + '</span>' +
        '</li>';
      }).join('');
      return '<details class="njsc-part' + (p.earned < p.weight ? '' : ' full') + '">' +
        '<summary>' +
          '<span class="njsc-pname">' + esc(p.th) + '</span>' +
          '<span class="njsc-pnum">' + p.earned + ' / ' + p.weight + '</span>' +
          '<span class="njsc-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' +
        '</summary>' +
        '<ul class="njsc-rs">' + rows + '</ul>' +
      '</details>';
    }).join('');

    return '<section class="njsc" aria-labelledby="njsc-h">' +
      '<h2 id="njsc-h">คะแนนความพร้อมของข้อมูลแปลงนี้</h2>' +
      '<div class="njsc-top">' +
        '<div class="njsc-total ' + bandClass(score.band) + '">' +
          '<b>' + score.total + '</b><small>จาก 100</small></div>' +
        '<div class="njsc-say">' +
          '<div class="njsc-band">' + esc(score.bandTh) + '</div>' +
          (score.issues
            ? '<div class="njsc-issues">พบประเด็นที่ผู้ซื้อควรทราบ ' + score.issues + ' ข้อ — กางหัวข้อด้านล่างเพื่ออ่าน</div>'
            : '') +
        '</div>' +
      '</div>' +
      // ⚠️ ข้อความนี้มาจากเซิร์ฟเวอร์ ห้ามเขียนทับด้วยข้อความของตัวเอง และห้ามถอด
      '<p class="njsc-disclaim">' + esc(score.disclaim || '') + '</p>' +
      '<div class="njsc-parts">' + parts + '</div>' +
      '<p class="njsc-foot">แต่ละหัวข้อกดเพื่อดูว่าได้หรือยังไม่ได้คะแนนเพราะอะไร ' +
        '“ยังไม่มีข้อมูล” แปลว่าเรายังไม่ได้ตรวจข้อนั้น ไม่ได้แปลว่าแปลงมีปัญหา ' +
        'อยากให้ตรวจเพิ่มข้อไหน บอกทีมงานได้</p>' +
    '</section>';
  }

  /* พิมพ์หน้าประกาศออกมาต้องเห็นเหตุผลครบทุกหัวข้อ ไม่ใช่เห็นแต่หัวข้อที่บังเอิญกางค้างไว้
     ⚠️ ต้องทำด้วยจาวาสคริปต์ — CSS สั่งให้ <details> ที่หุบอยู่กางออกไม่ได้
     และต้องหุบคืนหลังพิมพ์ ไม่งั้นหน้าจอที่ผู้ใช้กลับมาดูจะกางหมดทุกหัวข้อโดยไม่ได้สั่ง */
  var opened = [];
  function openAll() {
    opened = [];
    d.querySelectorAll('.njsc-part:not([open])').forEach(function (el) { opened.push(el); el.open = true; });
  }
  function restore() { opened.forEach(function (el) { el.open = false; }); opened = []; }
  if (w.addEventListener) { w.addEventListener('beforeprint', openAll); w.addEventListener('afterprint', restore); }

  w.NJScore = { badgeHtml: badgeHtml, panelHtml: panelHtml, KIND: KIND };
})(window, document);
