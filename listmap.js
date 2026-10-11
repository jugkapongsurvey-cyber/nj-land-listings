/* มุมมองแผนที่ของหน้ารวมประกาศ — window.NJListMap (10 ต.ค. 69 · ยืมสวิตช์ "ดูบนแผนที่" จาก DDproperty)
 *
 * ⚠️⚠️ กติกาที่ห้ามผ่อน (อ่านก่อนแก้ทุกครั้ง)
 * 1. **ไม่มีไลบรารีแผนที่ ไม่มีคีย์ ไม่มีค่าใช้จ่าย** — ไฟล์นี้วางกระเบื้องภาพของ OpenStreetMap เอง
 *    (Web Mercator ~20 บรรทัด) · โครงการเคยยกเลิก Longdo เพราะค่าใช้จ่ายตามปริมาณการใช้ (ดู CLAUDE.md หัวข้อ P7)
 *    และทั้งเว็บไม่มีไลบรารี JS เลยสักตัว · ⛔ ห้ามเพิ่ม <script>/<iframe> ของผู้ให้บริการแผนที่รายใดลงหน้านี้
 * 2. **หมุด = `land.pinLat`/`land.pinLng` ที่ทีมงานกดเลือกเองรายแปลงเท่านั้น** (ตัวเดียวกับหน้าแปลง)
 *    ⛔ ห้ามอ่าน `land.lat`/`land.lng` (พิกัดภายใน · กติกาข้อ 3) · แปลงที่ไม่ได้ปักหมุด = ไม่วาด และต้องบอกจำนวนบนจอ
 *    ไม่หายเงียบ (กติกาเดียวกับ #unknown-note) · ห้ามเดาตำแหน่งจากชื่อตำบล/อำเภอ
 * 3. **ต้องแสดงที่มาของภาพแผนที่ "© ผู้ร่วมพัฒนา OpenStreetMap" เสมอ** (เงื่อนไขการใช้ ODbL/ไทล์ของ OSM)
 *    และไทล์โหลดเฉพาะตอนผู้ใช้กดสวิตช์ — มุมมองรายการตั้งต้นไม่ยิงคำขอไปที่ OSM เลย
 *    · นโยบายไทล์ของ tile.openstreetmap.org ใช้ได้กับปริมาณเบา ถ้าวันหนึ่งคนใช้แผนที่เยอะมาก
 *      ต้องย้ายไปผู้ให้บริการไทล์อื่น (แก้ `TILE` ที่เดียว) — ไม่ใช่เพิ่มไลบรารี
 * 4. **การ์ดในป๊อปอัปใช้ `NJListing.card` ตัวกลาง** ห้ามเขียนการ์ดชุดใหม่ (กติกาข้อ 4/5/10 อยู่ในไฟล์นั้น)
 * 5. หมุดเป็น <button> จริง (คีย์บอร์ด + แตะบนมือถือได้ฟรี · แนวเดียวกับ parcelmap.js)
 * 6. ข้อความบนหมุดคือราคาที่ประกาศ ย่อเป็น "ล้าน" เท่านั้น — ไม่หาร ไม่คำนวณอะไรเพิ่ม · ไม่มีราคา = "สอบถาม"
 */
(function (root) {
  'use strict';

  var TILE = 'https://tile.openstreetmap.org/';
  var SIZE = 256;
  var MIN_Z = 5, MAX_Z = 17, FIT_MAX_Z = 15;

  function pinOf(item) {
    var L = (item && item.land) || {};
    if (L.pinLat == null || L.pinLng == null || L.pinLat === '' || L.pinLng === '') return null;
    var la = Number(L.pinLat), ln = Number(L.pinLng);
    if (!isFinite(la) || !isFinite(ln) || la < -85 || la > 85 || ln < -180 || ln > 180) return null;
    return [la, ln];
  }
  function hasPin(item) { return !!pinOf(item); }

  // Web Mercator → พิกัดพิกเซลของโลกที่ระดับซูม z
  function project(la, ln, z) {
    var n = SIZE * Math.pow(2, z);
    var s = Math.sin(la * Math.PI / 180);
    return { x: (ln + 180) / 360 * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
  }

  // หาระดับซูมที่เห็นทุกหมุดในกรอบ (เว้นขอบให้ป้ายราคา) · หมุดเดียว = ซูมระดับย่าน
  function fit(pts, W, H) {
    if (!pts.length) return null;
    for (var z = FIT_MAX_Z; z >= MIN_Z; z--) {
      var xs = [], ys = [];
      pts.forEach(function (p) { var q = project(p[0], p[1], z); xs.push(q.x); ys.push(q.y); });
      var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
      if (x1 - x0 <= Math.max(W - 120, 60) && y1 - y0 <= Math.max(H - 120, 60)) {
        return { z: z, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
      }
    }
    var c = project(pts[0][0], pts[0][1], MIN_Z);
    return { z: MIN_Z, cx: c.x, cy: c.y };
  }

  // rent = ประกาศให้เช่า → ค่าเช่ารายเดือนเต็มตัวเลข + "/ด." (11 ต.ค. 69 · ค่าเช่าไม่ใช้หน่วย "ล้าน")
  function priceLabel(v, rent) {
    v = Number(v) || 0;
    if (!(v > 0)) return 'สอบถาม';
    if (rent) return '฿' + v.toLocaleString('th-TH') + '/ด.';
    if (v >= 1000000) return '฿' + (Math.round(v / 10000) / 100).toLocaleString('th-TH') + ' ล้าน';
    return '฿' + v.toLocaleString('th-TH');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount(box, opt) {
    opt = opt || {};
    var NJL = root.NJListing;
    box.innerHTML =
      '<p class="lm-note" data-lm-note></p>' +
      '<div class="lm-view" tabindex="0" role="region" aria-label="แผนที่ตำแหน่งแปลง — ลากเพื่อเลื่อน หรือใช้ปุ่มลูกศรบนคีย์บอร์ด">' +
        '<div class="lm-layer" data-lm-layer><div class="lm-tiles" data-lm-tiles></div><div class="lm-pins" data-lm-pins></div></div>' +
        '<div class="lm-zoom">' +
          '<button type="button" data-lm-zoom="1" aria-label="ซูมเข้า">＋</button>' +
          '<button type="button" data-lm-zoom="-1" aria-label="ซูมออก">－</button>' +
          '<button type="button" data-lm-fit aria-label="ดูทุกหมุด" title="ดูทุกหมุด">⤢</button>' +
        '</div>' +
        '<div class="lm-pop" data-lm-pop hidden>' +
          '<button type="button" class="lm-pop-x" data-lm-close aria-label="ปิดการ์ด">✕</button>' +
          '<div data-lm-card></div>' +
        '</div>' +
        '<div class="lm-attr">แผนที่ © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">ผู้ร่วมพัฒนา OpenStreetMap</a></div>' +
      '</div>' +
      '<p class="lm-foot">หมุดคือตำแหน่งแปลงที่ทีมงานระบุไว้ · แนวเขตที่แน่นอนต้องยืนยันด้วยการรังวัดในสนาม</p>';

    var view = box.querySelector('.lm-view');
    var layer = box.querySelector('[data-lm-layer]');
    var tiles = box.querySelector('[data-lm-tiles]');
    var pinsEl = box.querySelector('[data-lm-pins]');
    var pop = box.querySelector('[data-lm-pop]');
    var cardEl = box.querySelector('[data-lm-card]');
    var noteEl = box.querySelector('[data-lm-note]');
    var st = { z: 10, cx: 0, cy: 0, items: [], active: '' };

    function size() { return { W: view.clientWidth || 320, H: view.clientHeight || 360 }; }

    function draw() {
      var s = size(), W = s.W, H = s.H, z = st.z, n = Math.pow(2, z);
      var ox = st.cx - W / 2, oy = st.cy - H / 2;
      var tx0 = Math.floor(ox / SIZE), tx1 = Math.floor((ox + W) / SIZE);
      var ty0 = Math.floor(oy / SIZE), ty1 = Math.floor((oy + H) / SIZE);
      var html = '';
      for (var ty = ty0; ty <= ty1; ty++) {
        if (ty < 0 || ty >= n) continue;
        for (var tx = tx0; tx <= tx1; tx++) {
          var wx = ((tx % n) + n) % n;
          html += '<img src="' + TILE + z + '/' + wx + '/' + ty + '.png" alt="" draggable="false" decoding="async" ' +
            'style="left:' + Math.round(tx * SIZE - ox) + 'px;top:' + Math.round(ty * SIZE - oy) + 'px">';
        }
      }
      tiles.innerHTML = html;
      pinsEl.innerHTML = st.items.map(function (it, i) {
        var p = pinOf(it), q = project(p[0], p[1], z);
        var title = (NJL && NJL.shortTitleOf) ? NJL.shortTitleOf(it) : it.id;
        return '<button type="button" class="lm-pin' + (it.id === st.active ? ' is-on' : '') + (it.featured ? ' is-featured' : '') +
          '" data-lm-i="' + i + '" style="left:' + Math.round(q.x - ox) + 'px;top:' + Math.round(q.y - oy) + 'px" ' +
          'aria-label="' + esc(it.id + ' · ' + priceLabel(it.estValue, it.type === 'rent') + (it.type === 'rent' ? ' (ค่าเช่าต่อเดือน)' : '') + ' · ' + title) + '">' + esc(priceLabel(it.estValue, it.type === 'rent')) + '</button>';
      }).join('');
    }

    function fitAll() {
      var f = fit(st.items.map(pinOf), size().W, size().H);
      if (!f) return;
      st.z = f.z; st.cx = f.cx; st.cy = f.cy;
      draw();
    }

    function zoom(d) {
      var nz = Math.max(MIN_Z, Math.min(MAX_Z, st.z + d));
      if (nz === st.z) return;
      var k = Math.pow(2, nz - st.z);
      st.cx *= k; st.cy *= k; st.z = nz;
      draw();
    }

    function closePop() {
      pop.hidden = true;
      if (cardEl.innerHTML) cardEl.innerHTML = '';
      st.active = '';
      var on = pinsEl.querySelector('.lm-pin.is-on');
      if (on) on.classList.remove('is-on');
    }
    function openPop(it) {
      if (!NJL || !NJL.card) return;
      st.active = it.id;
      cardEl.innerHTML = NJL.card(it);
      pop.hidden = false;
      var btns = pinsEl.querySelectorAll('.lm-pin');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('is-on', st.items[+btns[i].getAttribute('data-lm-i')].id === it.id);
      }
    }

    // ---------- ลากเพื่อเลื่อน (เมาส์ + นิ้ว) ----------
    // ระหว่างลากเลื่อนทั้งชั้นด้วย transform แล้วค่อยวาดกระเบื้องใหม่ตอนปล่อย — ไม่สร้าง <img> ใหม่ทุกพิกเซล
    var drag = null;
    view.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('button,a,.lm-pop')) return;   // การ์ดลอยอยู่ในกรอบแผนที่ — แตะการ์ดไม่ใช่การลาก
      drag = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, id: e.pointerId };
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* เบราว์เซอร์เก่า */ }
    });
    view.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
      layer.style.transform = 'translate(' + drag.dx + 'px,' + drag.dy + 'px)';
    });
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var moved = Math.abs(drag.dx) + Math.abs(drag.dy);
      st.cx -= drag.dx; st.cy -= drag.dy;
      drag = null;
      layer.style.transform = '';
      if (moved > 3) draw(); else closePop();   // แตะพื้นที่ว่าง = ปิดการ์ด
    }
    view.addEventListener('pointerup', endDrag);
    view.addEventListener('pointercancel', endDrag);

    view.addEventListener('keydown', function (e) {
      if (e.target !== view) return;   // ลูกศรตอนโฟกัสอยู่ในการ์ด/ปุ่ม ไม่ใช่การเลื่อนแผนที่
      var step = 120, k = e.key;
      if (k === 'ArrowLeft') st.cx -= step; else if (k === 'ArrowRight') st.cx += step;
      else if (k === 'ArrowUp') st.cy -= step; else if (k === 'ArrowDown') st.cy += step;
      else if (k === '+' || k === '=') { zoom(1); e.preventDefault(); return; }
      else if (k === '-') { zoom(-1); e.preventDefault(); return; }
      else return;
      e.preventDefault();
      draw();
    });

    box.addEventListener('click', function (e) {
      var pin = e.target.closest('[data-lm-i]');
      if (pin) { openPop(st.items[+pin.getAttribute('data-lm-i')]); return; }
      var z = e.target.closest('[data-lm-zoom]');
      if (z) { zoom(+z.getAttribute('data-lm-zoom')); return; }
      if (e.target.closest('[data-lm-fit]')) { fitAll(); return; }
      if (e.target.closest('[data-lm-close]')) { closePop(); return; }
      var back = e.target.closest('[data-lm-list]');
      if (back && opt.onList) opt.onList();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden && !box.hidden) closePop();
    });
    var rt = 0;
    root.addEventListener('resize', function () {
      if (box.hidden) return;
      clearTimeout(rt); rt = setTimeout(draw, 150);
    });

    return {
      // วาดใหม่ทุกครั้งที่ผลกรองเปลี่ยน · ชุดหมุดเปลี่ยน = จัดกรอบให้เห็นทุกหมุดใหม่
      update: function (list) {
        var items = (list || []).filter(hasPin);
        var sig = items.map(function (x) { return x.id; }).join(',');
        var changed = sig !== st.sig;
        st.items = items; st.sig = sig;
        var missing = (list || []).length - items.length;
        var note = !(list || []).length ? 'ไม่มีแปลงตรงเงื่อนไขให้แสดงบนแผนที่'
          : 'แสดงบนแผนที่ ' + items.length + ' จาก ' + list.length + ' แปลง' +
            (missing > 0 ? ' · อีก ' + missing + ' แปลงทีมงานยังไม่ได้ปักหมุด — ' : '');
        noteEl.innerHTML = esc(note) + (missing > 0 ? '<button type="button" class="lm-tolist" data-lm-list>ดูในมุมมองรายการ</button>' : '');
        if (st.active && !items.some(function (x) { return x.id === st.active; })) closePop();
        if (!items.length) { tiles.innerHTML = ''; pinsEl.innerHTML = ''; return; }
        if (changed) fitAll(); else draw();
      }
    };
  }

  root.NJListMap = { mount: mount, hasPin: hasPin, pinOf: pinOf, project: project, fit: fit, priceLabel: priceLabel };
})(typeof window !== 'undefined' ? window : globalThis);
