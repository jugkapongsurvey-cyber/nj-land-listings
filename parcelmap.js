/* ===========================================================================
   แผนที่แนวเขตแบบโต้ตอบ — รูปแปลงจากงานรังวัดจริง (window.NJParcelMap)

   ⚠️ ทำไมเป็น SVG ไม่ใช่ไลบรารีแผนที่

   1. กติกาข้อ 10 ของเว็บนี้ห้ามเพิ่มไลบรารีขนาดใหญ่โดยไม่จำเป็น · ทั้งเว็บตอนนี้
      ไม่มีไลบรารี JavaScript เลยแม้แต่ตัวเดียว
   2. **โหมดเริ่มต้นที่เซิร์ฟเวอร์ส่งมาไม่มีพิกัดเลย** (ส่งเป็นระยะเป็นเมตรจากจุดกึ่งกลาง
      เพื่อไม่ให้แนวเขตระดับรังวัดหลุดสู่สาธารณะ) · ไม่มีพิกัด = วางบนกระเบื้องแผนที่ไม่ได้อยู่แล้ว
   3. รูปทรง ความยาวด้าน และตำแหน่งหมุดสัมพัทธ์ คือสิ่งที่ผู้ซื้อต้องการจริง
      และ SVG วาดได้ครบโดยไม่ต้องโหลดอะไรเพิ่มเลยสักไบต์

   ⚠️ ข้อจำกัดที่ต้องบอกผู้ใช้ตรงๆ ห้ามทำให้ดูเหมือนแผนที่จริง
      · ไม่มีชั้นภาพถ่ายดาวเทียม · ไม่มีถนนโดยรอบ · ไม่ได้วางทับพิกัดจริงบนโลก
      รูปนี้คือ "รูปทรงและขนาดของแปลง" ไม่ใช่ "ตำแหน่งของแปลงบนแผนที่"
      ตำแหน่งจริงยังดูได้จากแผนที่หมุดตำแหน่งที่อยู่ด้านล่างเหมือนเดิม

   ⚠️ ห้ามคำนวณอะไรใหม่ที่ฝั่งนี้ ความยาวด้าน/พื้นที่/การเรียงหมุด เซิร์ฟเวอร์คิดมาให้แล้ว
      คิดซ้ำที่นี่ = สองที่ปัดเศษไม่เหมือนกัน แล้วตัวเลขบนรูปกับในตารางจะไม่ตรงกัน
   =========================================================================== */
(function (w, d) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // แปลงจุดที่ได้จาก API ให้เป็นระยะเป็นเมตร (x ตะวันออก · y เหนือ) ไม่ว่ามาโหมดไหน
  // โหมด shape ส่ง x/y มาให้แล้ว · โหมด geo ส่งพิกัดที่ปัดแล้วมา ต้องแปลงเอง
  function toXY(plot) {
    var pts = plot.points || [];
    if (!pts.length) return [];
    if (plot.mode !== 'geo') {
      return pts.map(function (p) { return { p: p.p, x: p.x, y: p.y, note: p.note, photo: p.photo }; });
    }
    var la = 0, ln = 0;
    pts.forEach(function (p) { la += p.lat; ln += p.lng; });
    la /= pts.length; ln /= pts.length;
    var r = la * Math.PI / 180;
    var mLat = 111132.92 - 559.82 * Math.cos(2 * r) + 1.175 * Math.cos(4 * r);
    var mLng = 111412.84 * Math.cos(r) - 93.5 * Math.cos(3 * r);
    return pts.map(function (p) {
      return {
        p: p.p, note: p.note, photo: p.photo,
        x: Math.round((p.lng - ln) * mLng * 10) / 10,
        y: Math.round((p.lat - la) * mLat * 10) / 10
      };
    });
  }

  // เลือกช่วงไม้บรรทัดที่อ่านง่าย (1/2/5 × 10^n) ให้ยาวประมาณ 1 ใน 4 ของรูป
  function niceStep(span) {
    var raw = span / 4, pow = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / pow;
    return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * pow;
  }

  var VB = 1000;          // ความกว้างของระบบพิกัดภายใน SVG · ความสูงคิดตามสัดส่วนจริงของแปลง
  var PAD = 90;           // ที่ว่างรอบรูป เผื่อป้ายชื่อหมุดและตัวเลขความยาวด้านไม่ให้ล้นกรอบ

  function svgHtml(plot, xy) {
    var xs = xy.map(function (p) { return p.x; }), ys = xy.map(function (p) { return p.y; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var wM = Math.max(maxX - minX, 0.001), hM = Math.max(maxY - minY, 0.001);
    var scale = (VB - PAD * 2) / wM;                       // พิกเซลภายใน SVG ต่อ 1 เมตร
    var vbH = Math.round(hM * scale + PAD * 2);
    // ⚠️ y ของ SVG ชี้ลง แต่ y ของเราคือทิศเหนือซึ่งชี้ขึ้น — ต้องกลับด้าน
    // ไม่กลับเมื่อไหร่ รูปแปลงจะพลิกบน-ล่าง ซึ่งดูเหมือนถูกจนกว่าจะเอาไปเทียบกับของจริง
    var X = function (m) { return PAD + (m - minX) * scale; };
    var Y = function (m) { return vbH - PAD - (m - minY) * scale; };

    var ring = xy.map(function (p) { return X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1); }).join(' ');

    // ความยาวด้าน — ใช้ค่าที่เซิร์ฟเวอร์คิดมา จับคู่ด้วยชื่อหมุด ไม่ใช่ลำดับ
    var sideBy = {};
    (plot.sides || []).forEach(function (s) { sideBy[s.from + '' + s.to] = s.m; });

    var edges = '';
    for (var i = 0; i < xy.length; i++) {
      var a = xy[i], b = xy[(i + 1) % xy.length];
      var m = sideBy[a.p + '' + b.p];
      if (m == null) continue;
      var mx = (X(a.x) + X(b.x)) / 2, my = (Y(a.y) + Y(b.y)) / 2;
      // ดันป้ายออกนอกรูปเล็กน้อยตามแนวตั้งฉากของด้านนั้น จะได้ไม่ทับเส้น
      var dx = X(b.x) - X(a.x), dy = Y(b.y) - Y(a.y), len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ox = -dy / len * 22, oy = dx / len * 22;
      edges += '<text class="njp-side" x="' + (mx + ox).toFixed(1) + '" y="' + (my + oy).toFixed(1) + '">' +
               esc(m.toFixed(2)) + ' ม.</text>';
    }

    var marks = xy.map(function (p, i) {
      return '<g class="njp-m" data-i="' + i + '">' +
        '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="11"/>' +
        '<text x="' + X(p.x).toFixed(1) + '" y="' + (Y(p.y) - 20).toFixed(1) + '">' + esc(p.p) + '</text>' +
      '</g>';
    }).join('');

    // ไม้บรรทัด — จำเป็นมากเพราะรูปนี้ไม่มีแผนที่เป็นฉากหลังให้เทียบขนาด
    var step = niceStep(Math.max(wM, hM));
    var barPx = step * scale;
    var by = vbH - 30;
    var bar = '<g class="njp-scale">' +
      '<line x1="' + PAD + '" y1="' + by + '" x2="' + (PAD + barPx).toFixed(1) + '" y2="' + by + '"/>' +
      '<line x1="' + PAD + '" y1="' + (by - 6) + '" x2="' + PAD + '" y2="' + (by + 6) + '"/>' +
      '<line x1="' + (PAD + barPx).toFixed(1) + '" y1="' + (by - 6) + '" x2="' + (PAD + barPx).toFixed(1) + '" y2="' + (by + 6) + '"/>' +
      '<text x="' + (PAD + barPx / 2).toFixed(1) + '" y="' + (by - 12) + '">' + step + ' เมตร</text>' +
    '</g>';

    // เข็มทิศ — y ของเราคือทิศเหนือจริง (แปลงมาจากละติจูด) จึงชี้ขึ้นได้อย่างถูกต้อง
    var compass = '<g class="njp-n" transform="translate(' + (VB - 46) + ',44)">' +
      '<circle r="20"/><path d="M0,-13 L6,7 L0,2 L-6,7 Z"/><text y="-24">N</text></g>';

    return '<svg class="njp-svg" viewBox="0 0 ' + VB + ' ' + vbH + '" role="img" ' +
      'aria-label="รูปแปลงที่ดินจากการรังวัด ' + xy.length + ' หมุด พื้นที่โดยประมาณ ' +
      esc(String(plot.areaWa || 0)) + ' ตารางวา">' +
      '<polygon class="njp-poly" points="' + ring + '"/>' + edges + marks + bar + compass +
    '</svg>';
  }

  function mapHtml(plot) {
    if (!plot || !plot.points || plot.points.length < 3) return '';
    var xy = toXY(plot);
    var meta = [];
    if (plot.areaWa) meta.push('พื้นที่จากรูปแปลงประมาณ ' + plot.areaWa.toLocaleString('th-TH') + ' ตร.ว.');
    if (plot.count) meta.push('หมุด ' + plot.count + ' จุด');
    if (plot.surveyedAt && w.NJVerified) meta.push('สำรวจเมื่อ ' + w.NJVerified.thaiDate(plot.surveyedAt));
    if (plot.crs) meta.push('ระบบพิกัด ' + plot.crs);

    // รายการหมุดเป็นปุ่มจริง ไม่ใช่จุดเล็กๆ บน SVG ที่ต้องจิ้มให้แม่น
    // ได้ทั้งการใช้คีย์บอร์ดและการแตะบนมือถือมาฟรี และไม่มีอะไรพังเมื่อ JS ไม่ทำงาน
    var list = xy.map(function (p, i) {
      var bits = [];
      if (p.note) bits.push(esc(p.note));
      if (p.photo) bits.push('มีรูปหมุด');
      return '<button type="button" class="njp-pin" data-i="' + i + '"' +
        (p.photo && /^(https?:[/][/]|[/](?![/]))/i.test(p.photo) ? ' data-photo="' + esc(p.photo) + '"' : '') + '>' +
        '<b>' + esc(p.p) + '</b>' +
        '<span>' + (bits.length ? bits.join(' · ') : 'ไม่มีหมายเหตุจากช่างรังวัด') + '</span>' +
      '</button>';
    }).join('');

    var precision = plot.mode === 'geo'
      ? 'ตำแหน่งหมุดที่แสดงถูกลดความละเอียดลงเหลือประมาณ ' + plot.precisionM + ' เมตร ' +
        'เพื่อไม่ให้ค่าพิกัดระดับรังวัดถูกเผยแพร่ต่อสาธารณะ'
      : 'รูปนี้แสดง <b>รูปทรงและขนาด</b> ของแปลง ไม่ได้วางทับตำแหน่งจริงบนแผนที่ ' +
        'และไม่มีค่าพิกัดของหมุดออกมาด้วย — ดูตำแหน่งแปลงได้จากแผนที่ด้านล่าง';

    return '<section class="njp" aria-labelledby="njp-h">' +
      '<div class="njp-head">' +
        '<h2 id="njp-h">แผนที่แนวเขตแปลง</h2>' +
        (meta.length ? '<p>' + esc(meta.join(' · ')) + '</p>' : '') +
      '</div>' +
      '<div class="njp-frame">' + svgHtml(plot, xy) + '</div>' +
      '<div class="njp-pins">' + list + '</div>' +
      '<div class="njp-detail" hidden aria-live="polite"></div>' +
      (plot.note ? '<p class="njp-note">' + esc(plot.note) + '</p>' : '') +
      // ⚠️ สามบรรทัดนี้ห้ามถอด — เป็นเส้นแบ่งระหว่าง "รูปที่เราวาด" กับ "แนวเขตตามกฎหมาย"
      '<p class="njp-foot">' + precision + '<br>' +
      'ความยาวด้านและพื้นที่เป็นค่าที่คำนวณจากหมุดที่บันทึกไว้ ณ วันที่สำรวจ ' +
      '<b>ไม่ใช่เนื้อที่ตามเอกสารสิทธิ์ และไม่ใช่แนวเขตที่กรมที่ดินรับรอง</b> — ' +
      'แนวเขตที่ใช้อ้างอิงได้ต้องมาจากการรังวัดสอบเขตกับสำนักงานที่ดินเท่านั้น</p>' +
    '</section>';
  }

  /* ---- ต่อการโต้ตอบหลังวาดหน้าเสร็จ ----
     ผูก listener ที่กล่องเดียว ไม่ผูกรายปุ่ม — รายการถูกวาดใหม่ทุกครั้งที่ข้อมูลเปลี่ยน */
  function init(root, plot) {
    if (!root || !plot) return;
    var sec = root.querySelector ? root.querySelector('.njp') : null;
    if (!sec) return;
    var xy = toXY(plot);
    var box = sec.querySelector('.njp-detail');
    var pins = sec.querySelector('.njp-pins');
    if (!box || !pins) return;

    function show(i) {
      var p = xy[i];
      if (!p) return;
      sec.querySelectorAll('.njp-pin').forEach(function (b) {
        b.classList.toggle('on', Number(b.dataset.i) === i);
      });
      sec.querySelectorAll('.njp-m').forEach(function (g) {
        g.classList.toggle('on', Number(g.dataset.i) === i);
      });
      box.innerHTML =
        '<div class="njp-d-h"><b>หมุด ' + esc(p.p) + '</b>' +
          '<button type="button" class="njp-close" aria-label="ปิดรายละเอียดหมุด">✕</button></div>' +
        (p.photo
          // ⚠️ กำหนดความสูงไว้ล่วงหน้าและโหลดแบบทยอย — รูปหมุดมาจากไฟล์แนบของงานรังวัด
          // ซึ่งเป็นรูปจากกล้องขนาดเต็ม ไม่ได้ย่อ (ดูข้อจำกัดที่บันทึกไว้ใน CLAUDE.md)
          ? '<img src="' + esc(p.photo) + '" alt="รูปหมุดหลักเขต ' + esc(p.p) + '" loading="lazy" width="640" height="480">'
          : '<p class="njp-nophoto">ยังไม่มีรูปของหมุดนี้ในระบบ</p>') +
        '<p>' + (p.note ? esc(p.note) : 'ช่างรังวัดไม่ได้บันทึกหมายเหตุของหมุดนี้ไว้') + '</p>' +
        (plot.surveyedAt && w.NJVerified
          ? '<p class="njp-when">ข้อมูลหมุดนี้บันทึกจากการสำรวจเมื่อ ' + esc(w.NJVerified.thaiDate(plot.surveyedAt)) +
            ' — สภาพหมุดหน้างานอาจเปลี่ยนไปแล้ว</p>'
          : '');
      box.hidden = false;
    }

    pins.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.njp-pin') : null;
      if (b) show(Number(b.dataset.i));
    });
    box.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.njp-close')) {
        box.hidden = true;
        sec.querySelectorAll('.njp-pin.on').forEach(function (b) { b.classList.remove('on'); });
        sec.querySelectorAll('.njp-m.on').forEach(function (g) { g.classList.remove('on'); });
      }
    });
  }

  w.NJParcelMap = { mapHtml: mapHtml, init: init, toXY: toXY };
})(window, document);
