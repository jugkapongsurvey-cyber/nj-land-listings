/* ===========================================================================
   วัดพื้นที่บนแผนที่ (window.NJAreaMap) — Longdo Map v3 · ใช้ที่ tools.html#map · P2 (2026-09-17)

   ⚠️ กติกาที่ห้ามผ่อน

   1. **วัดจากภาพไม่ใช่การรังวัด** — ภาพดาวเทียมคลาดได้หลายเมตร ตัวเลขใช้ประกอบการคุยเท่านั้น
      ข้อความเตือน `DISCLAIM` ต้องแสดงทุกครั้งที่มีตัวเลข ห้ามถอด ห้ามเขียนให้อ่อนลง
      และห้ามเรียกผลนี้ว่า "เนื้อที่" เฉยๆ (ต้องเป็น "เนื้อที่ที่วัดจากภาพ")

   2. **คิดพื้นที่/ระยะด้วยฟังก์ชันในไฟล์นี้ที่เดียว** (`summary()`) ไม่ใช้ `polygon.size()` ของ Longdo
      สองที่ปัดเศษไม่เหมือนกัน = ตัวเลขบนจอกับข้อความที่ส่งเข้าไลน์ไม่ตรงกัน (บทเรียนราคาต่อตารางวา)
      · สูตร: ฉายพิกัดลงระนาบสัมผัสที่จุดกึ่งกลาง แล้ว shoelace · ระยะใช้ haversine
        แม่นพอสำหรับแปลงขนาดไม่กี่กิโลเมตร (`areamap.test.js` เทียบกับสี่เหลี่ยมที่รู้ขนาด)

   3. **โหลด Longdo เฉพาะตอนผู้ใช้กด "เปิดแผนที่"** — โควตาฟรีนับทุก tile ที่โหลด
      (ราว 800,000 tiles/เดือน · เกินแล้วแผนที่หยุดทั้งเดือน) ห้ามเปลี่ยนเป็นโหลดทันทีที่เปิดหน้า
      · ซ่อนตัวเลือกชั้นแผนที่ของ Longdo — มีชั้นของบุคคลที่สามที่อาจมีค่าใช้จ่าย
        เราให้สลับแค่ `HARD` (ภาพดาวเทียม+ถนน) กับ `NORMAL`

   4. **คีย์ `LONGDO_KEY` เป็นคีย์ฝั่งเบราว์เซอร์ที่ล็อกโดเมนไว้ที่ Longdo Console**
      (njteedinsure.com + localhost) ใส่ในไฟล์ได้ · **คีย์ว่าง = ไม่แสดงส่วนแผนที่เลย**
      ห้ามวาดกล่องแผนที่เปล่าที่กดแล้วพัง

   5. **พิกัดที่ผู้ใช้วาดไม่ถูกส่งไปไหน** ยกเว้นผู้ใช้กดส่งเข้าไลน์เอง (ส่งเฉพาะเนื้อที่ + จุดกึ่งกลาง)
      ไม่เก็บลง localStorage · ไม่ยิงสถิติพร้อมพิกัด

   6. Longdo v3 ไม่มีโหมดลากมุมรูปแปลง และเครื่องมือวาดในตัวใช้บนมือถือไม่ได้
      จึงวาดเอง: แตะแผนที่ = วางหมุด · ลากหมุด = แก้มุม · ตัวควบคุมรับ `L` (namespace longdo)
      และ `map` จากภายนอก เทสต์จึงใส่ตัวปลอมได้โดยไม่ต้องต่อเน็ต
   =========================================================================== */
(function (w) {
  'use strict';

  var LONGDO_KEY = '';
  var LONGDO_SRC = 'https://api.longdo.com/map3/?key=';
  var DEFAULT_VIEW = { lon: 100.5018, lat: 13.7563, zoom: 11 };
  var MAX_POINTS = 60;
  // ⚠️ ชั้นภาพผังเมือง (Longdo `cityplan_dpt` = สำเนาภาพจากกรมโยธาฯ) — **ปิดไว้จนกว่าจะได้รับอนุญาตเป็นลายลักษณ์อักษร**
  //    ทั้งจากกรมโยธาฯ และเงื่อนไขเชิงพาณิชย์จาก Longdo (ตรวจ 17 ก.ย. 69: ยังไม่มีสิทธิ์เผยแพร่บนเว็บสาธารณะ)
  //    เปิดเป็น true ได้เมื่อมีหนังสืออนุญาตแล้วเท่านั้น และต้องทดสอบกับคีย์จริงก่อน (รูปแบบ Layer ของ v3 ยังไม่ได้ยืนยัน)
  var ZONING_OVERLAY = false;
  var ZONING_LAYER = { name: 'cityplan_dpt', url: 'https://ms.longdo.com/mmmap/img.php' };
  var ZONING_NOTE = 'ภาพผังเมืองรวมเป็นข้อมูลเบื้องต้นจากกรมโยธาธิการและผังเมือง (แสดงผ่าน Longdo Map) ' +
                    'ใช้อ้างอิงทางกฎหมายไม่ได้ ผังบางพื้นที่อาจไม่เป็นฉบับล่าสุด ต้องตรวจกับหน่วยงานก่อนตัดสินใจ';
  var R = 6371008.8;
  var DISCLAIM = 'วัดจากภาพแผนที่ ไม่ใช่ผลรังวัด ภาพดาวเทียมอาจคลาดได้หลายเมตร ' +
                 'ใช้ประกอบการคุยเบื้องต้นเท่านั้น เนื้อที่จริงต้องยึดตามโฉนดและการรังวัดโดยช่างรังวัด';

  function rad(d) { return d * Math.PI / 180; }
  // null/'' ต้องไม่ผ่าน — isFinite(null) เป็นจริงและจะกลายเป็นพิกัด 0,0 กลางทะเล
  function num(v) { return (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && isFinite(v); }
  function valid(p) {
    return !!p && num(p.lat) && num(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
  }

  function haversine(a, b) {
    var dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    var h = Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.pow(Math.sin(dLon / 2), 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function center(pts) {
    var la = 0, lo = 0;
    pts.forEach(function (p) { la += p.lat; lo += p.lon; });
    return { lat: la / pts.length, lon: lo / pts.length };
  }

  // พื้นที่ (ตร.ม.) — ระนาบสัมผัสที่จุดกึ่งกลาง + shoelace
  function areaM2(pts) {
    if (!pts || pts.length < 3) return 0;
    var c = center(pts), k = Math.cos(rad(c.lat));
    var xy = pts.map(function (p) { return { x: R * rad(p.lon - c.lon) * k, y: R * rad(p.lat - c.lat) }; });
    var s = 0;
    for (var i = 0; i < xy.length; i++) {
      var j = (i + 1) % xy.length;
      s += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
    }
    return Math.abs(s) / 2;
  }

  function sides(pts) {
    var out = [];
    if (!pts || pts.length < 2) return out;
    var n = pts.length < 3 ? 1 : pts.length;
    for (var i = 0; i < n; i++) out.push(haversine(pts[i], pts[(i + 1) % pts.length]));
    return out;
  }

  // ตร.ม. → ไร่-งาน-ตร.ว. (1 ไร่ = 4 งาน = 400 ตร.ว. · 1 ตร.ว. = 4 ตร.ม.)
  // ปัดตร.ว. ก่อนแตกหน่วย ไม่งั้นได้ "399.99 ตร.ว." แทนที่จะขึ้นงาน/ไร่ถัดไป
  function thaiArea(m2) {
    var wa = Math.round((Number(m2) || 0) / 4 * 10) / 10;
    var rai = Math.floor(wa / 400);
    var ngan = Math.floor((wa - rai * 400) / 100);
    var rest = Math.round((wa - rai * 400 - ngan * 100) * 10) / 10;
    return {
      totalWa: wa, rai: rai, ngan: ngan, wa: rest,
      text: rai + ' ไร่ ' + ngan + ' งาน ' + rest.toLocaleString('en-US') + ' ตร.ว.',
      short: rai + '-' + ngan + '-' + rest + ' ไร่'
    };
  }

  function summary(pts) {
    pts = (pts || []).filter(valid);
    if (pts.length < 2) return null;
    var sd = sides(pts);
    var total = sd.reduce(function (a, b) { return a + b; }, 0);
    var m2 = pts.length >= 3 ? areaM2(pts) : 0;
    return {
      n: pts.length,
      closed: pts.length >= 3,
      sides: sd,
      length: total,          // 2 หมุด = ระยะทาง · ≥3 หมุด = เส้นรอบรูป
      m2: m2,
      thai: pts.length >= 3 ? thaiArea(m2) : null,
      center: center(pts)
    };
  }

  function fmt(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  // ข้อความที่ผู้ใช้กดส่งเข้าไลน์เอง — มีแค่เนื้อที่ที่วัดจากภาพ + จุดกึ่งกลาง (กติกาข้อ 5)
  function lineText(s) {
    if (!s || !s.closed) return '';
    return 'ขอใบเสนอราคารังวัดครับ/ค่ะ · วัดจากแผนที่บนเว็บได้ประมาณ ' + s.thai.text +
      ' (' + fmt(s.m2) + ' ตร.ม. · ' + s.n + ' หมุด) · ตำแหน่งโดยประมาณ ' +
      s.center.lat.toFixed(6) + ',' + s.center.lon.toFixed(6);
  }

  // ---------------------------------------------------------------------------
  // โหลดสคริปต์ Longdo ครั้งเดียว · ล้ม/ช้าเกิน = reject (หน้าเว็บขึ้นข้อความ ไม่ค้าง)
  var loading = null;
  function loadLongdo(key, timeoutMs) {
    if (w.longdo && w.longdo.Map) return Promise.resolve(w.longdo);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var done = false;
      var t = setTimeout(function () { finish(new Error('timeout')); }, timeoutMs || 20000);
      function finish(err) {
        if (done) return;
        done = true;
        clearTimeout(t);
        if (!err && w.longdo && w.longdo.Map) resolve(w.longdo);
        else { loading = null; s.remove(); reject(err || new Error('no longdo')); }
      }
      s.src = LONGDO_SRC + encodeURIComponent(key);
      s.async = true;
      s.onload = function () { finish(); };
      s.onerror = function () { finish(new Error('load')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // ---------------------------------------------------------------------------
  // ตัวควบคุมหมุด — ไม่แตะ DOM ของหน้า รู้จักแค่ L (longdo) กับ map
  function createController(L, map, onChange) {
    var pts = [], markers = [], shape = null, overlayAt = -1e9;
    var now = function () { return Date.now(); };
    var EV = L.EventName || {};

    function pinIcon(i) {
      return { html: '<div class="am-pin">' + (i + 1) + '</div>', offset: { x: 13, y: 13 } };
    }
    function redrawShape() {
      if (shape) { map.Overlays.remove(shape); shape = null; }
      var style = { lineWidth: 3, lineColor: 'rgba(255,214,51,1)', fillColor: 'rgba(255,214,51,0.18)', clickable: false };
      if (pts.length >= 3) shape = new L.Polygon(pts.slice(), style);
      else if (pts.length === 2) shape = new L.Polyline(pts.slice(), style);
      if (shape) map.Overlays.add(shape);
    }
    function redrawMarkers() {
      markers.forEach(function (m) { map.Overlays.remove(m); });
      markers = pts.map(function (p, i) {
        var m = new L.Marker(p, { draggable: true, title: 'หมุด ' + (i + 1), icon: pinIcon(i) });
        m.njIndex = i;
        map.Overlays.add(m);
        return m;
      });
    }
    function changed(full) {
      if (full) redrawMarkers();
      redrawShape();
      if (onChange) onChange(summary(pts), pts.slice());
    }
    function add(loc) {
      if (!valid(loc) || pts.length >= MAX_POINTS) return false;
      pts.push({ lat: Number(loc.lat), lon: Number(loc.lon) });
      changed(true);
      return true;
    }
    function moved(ov) {
      if (!ov || typeof ov.njIndex !== 'number' || !markers[ov.njIndex] || markers[ov.njIndex] !== ov) return;
      var loc = ov.location();
      if (!valid(loc)) return;
      pts[ov.njIndex] = { lat: Number(loc.lat), lon: Number(loc.lon) };
      changed(false);
    }

    // แตะ/ลากหมุดไม่ใช่การวางหมุดใหม่ — Longdo อาจยิง click ของแผนที่ด้วย (ก่อนหรือหลังก็ได้)
    // จึงเลื่อนการตัดสินไปหนึ่งจังหวะ แล้วดูว่ามีเหตุการณ์ของหมุดในช่วง 350 ms ไหม
    // ⚠️ ใช้เวลาเทียบ ไม่ใช้ธงค้าง — ธงค้างหลังลากหมุดทำให้การแตะครั้งถัดไปหายเงียบ
    var OVERLAY_WINDOW = 350;
    function touched() { overlayAt = now(); }
    map.Event.bind(EV.OverlayClick || 'overlayClick', touched);
    map.Event.bind(EV.OverlayDrag || 'overlayDrag', function (ov) { touched(); moved(ov); });
    map.Event.bind(EV.OverlayDrop || 'overlayDrop', function (ov) { touched(); moved(ov); });
    map.Event.bind(EV.Click || 'click', function (pt) {
      var loc = valid(pt) ? pt : (L.LocationMode ? map.location(L.LocationMode.Pointer) : null);
      setTimeout(function () {
        if (now() - overlayAt > OVERLAY_WINDOW) add(loc);
      }, 0);
    });

    return {
      add: add,
      undo: function () { if (!pts.length) return; pts.pop(); changed(true); },
      clear: function () { pts = []; changed(true); },
      points: function () { return pts.slice(); },
      _moved: moved,
      _setClock: function (fn) { now = fn; },
      _markers: function () { return markers.slice(); }
    };
  }

  // ---------------------------------------------------------------------------
  // หน้าจอ
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function resultHtml(s) {
    if (!s) return '<p class="am-hint">แตะบนแผนที่ตามมุมแปลงทีละจุด อย่างน้อย 3 หมุด · ลากหมุดเพื่อแก้ตำแหน่ง</p>';
    var sideList = s.sides.map(function (d, i) {
      var to = s.closed ? ((i + 1) % s.n) + 1 : 2;
      return '<li><span>' + (i + 1) + '–' + to + '</span><b>' + fmt(d, 1) + ' ม.</b></li>';
    }).join('');
    var head = s.closed
      ? '<div class="am-label">เนื้อที่ที่วัดจากภาพ (ประมาณ)</div><div class="am-big">' + esc(s.thai.text) + '</div>' +
        '<dl class="am-kv"><dt>ตารางเมตร</dt><dd>' + fmt(s.m2) + ' ตร.ม.</dd>' +
        '<dt>เส้นรอบรูป</dt><dd>' + fmt(s.length, 1) + ' ม.</dd>' +
        '<dt>จำนวนหมุด</dt><dd>' + s.n + '</dd></dl>'
      : '<div class="am-label">ระยะทาง (ประมาณ)</div><div class="am-big">' + fmt(s.length, 1) + ' ม.</div>' +
        '<p class="am-hint">วางหมุดเพิ่มอีกอย่างน้อย 1 จุดเพื่อดูเนื้อที่</p>';
    return head +
      '<details class="am-sides"><summary>ความยาวแต่ละด้าน</summary><ol>' + sideList + '</ol></details>' +
      '<p class="am-warn">' + esc(DISCLAIM) + '</p>';
  }

  function mount(root, opts) {
    var o = opts || {};
    var key = o.key != null ? o.key : LONGDO_KEY;
    if (!root || !key) return false;   // ไม่มีคีย์ = ไม่มีแผนที่ (กติกาข้อ 4)

    root.className = 'am';
    root.innerHTML =
      '<div class="am-intro">' +
        '<p>วาดรูปแปลงบนภาพดาวเทียม ดูเนื้อที่คร่าวๆ เป็นไร่-งาน-ตารางวา ก่อนขอใบเสนอราคารังวัด</p>' +
        '<button type="button" class="am-open" data-am-open>เปิดแผนที่</button>' +
        '<p class="am-note">แผนที่โหลดเมื่อกดปุ่มเท่านั้น · ข้อมูลแผนที่จาก Longdo Map · ตำแหน่งที่วาดไม่ถูกบันทึกหรือส่งไปไหน</p>' +
      '</div>' +
      '<div class="am-body" hidden>' +
        '<div class="am-tools" role="toolbar" aria-label="เครื่องมือแผนที่">' +
          '<button type="button" data-am="locate">📍 ตำแหน่งของฉัน</button>' +
          '<button type="button" data-am="layer" aria-pressed="true">🛰 ภาพดาวเทียม</button>' +
          '<button type="button" data-am="undo">↶ ย้อนหมุด</button>' +
          '<button type="button" data-am="clear">ล้างทั้งหมด</button>' +
          (ZONING_OVERLAY ? '<button type="button" data-am="zoning" aria-pressed="false">🎨 ผังสี</button>' : '') +
        '</div>' +
        '<div class="am-grid">' +
          '<div class="am-map" data-am-map aria-label="แผนที่สำหรับวางหมุด"></div>' +
          '<div class="am-side">' +
            '<div class="am-out" data-am-out aria-live="polite"></div>' +
            '<a class="am-cta" data-am-line href="#" target="_blank" rel="noopener" hidden>ส่งเนื้อที่ให้ทีมเสนอราคารังวัดทางไลน์</a>' +
            '<button type="button" class="am-copy" data-am-copy hidden>คัดลอกผล</button>' +
            '<div class="am-msg" data-am-msg role="status"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="am-err" data-am-err role="alert" hidden></div>';

    var $ = function (sel) { return root.querySelector(sel); };
    var ctl = null, map = null, L = null, sat = true, last = null;

    function render(s) {
      last = s;
      $('[data-am-out]').innerHTML = resultHtml(s);
      var line = $('[data-am-line]'), copy = $('[data-am-copy]');
      var ok = !!(s && s.closed);
      line.hidden = !ok;
      copy.hidden = !ok;
      if (ok && w.njLineAskUrl) line.href = w.njLineAskUrl(lineText(s));
      else if (ok) line.href = 'https://line.me/R/ti/p/@716lffzt';
    }
    function fail() {
      var e = $('[data-am-err]');
      e.hidden = false;
      e.innerHTML = 'โหลดแผนที่ไม่สำเร็จ ลองใหม่อีกครั้ง หรือส่งตำแหน่งแปลงให้ทีมงานทางไลน์ ' +
        '<a href="https://line.me/R/ti/p/@716lffzt" target="_blank" rel="noopener">@716lffzt</a>';
      var b = $('[data-am-open]');
      b.disabled = false;
      b.textContent = 'ลองเปิดแผนที่อีกครั้ง';
    }

    function open() {
      var b = $('[data-am-open]');
      b.disabled = true;
      b.textContent = 'กำลังโหลดแผนที่…';
      $('[data-am-err]').hidden = true;
      (o.loader || loadLongdo)(key).then(function (lib) {
        L = lib;
        $('.am-intro').hidden = true;
        $('.am-body').hidden = false;
        map = new L.Map({
          placeholder: $('[data-am-map]'),
          layer: L.Layers.HARD,
          location: { lon: DEFAULT_VIEW.lon, lat: DEFAULT_VIEW.lat },
          zoom: DEFAULT_VIEW.zoom,
          lastView: false,
          language: 'th',
          ui: L.UiComponent ? L.UiComponent.Mobile : undefined
        });
        try { map.Ui.LayerSelector.visible(false); } catch (e) { /* บางเวอร์ชันไม่มีตัวเลือกชั้น */ }
        ctl = createController(L, map, render);
        render(null);
        if (w.njTrack) w.njTrack('ViewContent', { content_name: 'area_map_open' });
      }, fail);
    }

    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-am-open],[data-am],[data-am-copy]');
      if (!t) return;
      if (t.hasAttribute('data-am-open')) return open();
      if (t.hasAttribute('data-am-copy')) return copyResult();
      if (!ctl) return;
      var act = t.getAttribute('data-am');
      if (act === 'undo') ctl.undo();
      else if (act === 'clear') ctl.clear();
      else if (act === 'layer') {
        sat = !sat;
        map.Layers.setBase(sat ? L.Layers.HARD : L.Layers.NORMAL);
        t.setAttribute('aria-pressed', String(sat));
        t.textContent = sat ? '🛰 ภาพดาวเทียม' : '🗺 แผนที่ถนน';
      } else if (act === 'locate') locate();
      else if (act === 'zoning' && ZONING_OVERLAY) toggleZoning(t);
    });

    var zoningLayer = null, zoningOn = false;
    function toggleZoning(btn) {
      try {
        if (!zoningLayer) zoningLayer = new L.Layer(ZONING_LAYER.name, { url: ZONING_LAYER.url, zoomRange: { min: 1, max: 20 } });
        zoningOn = !zoningOn;
        if (zoningOn) map.Layers.add(zoningLayer); else map.Layers.remove(zoningLayer);
        btn.setAttribute('aria-pressed', String(zoningOn));
        msg(zoningOn ? ZONING_NOTE : '');
      } catch (e) {
        zoningOn = false;
        btn.setAttribute('aria-pressed', 'false');
        msg('แสดงภาพผังเมืองไม่ได้ในตอนนี้ ตรวจผังได้ที่ระบบของกรมโยธาธิการและผังเมือง');
      }
    }
    function msg(text) { $('[data-am-msg]').textContent = text || ''; }
    function locate() {
      if (!navigator.geolocation) return msg('เบราว์เซอร์นี้หาตำแหน่งไม่ได้ เลื่อนแผนที่ไปที่แปลงเองได้เลย');
      msg('กำลังหาตำแหน่ง…');
      navigator.geolocation.getCurrentPosition(function (p) {
        map.location({ lon: p.coords.longitude, lat: p.coords.latitude });
        map.zoom(18);
        msg('');
      }, function () {
        msg('หาตำแหน่งไม่ได้ (อาจยังไม่อนุญาตให้เว็บใช้ตำแหน่ง) เลื่อนแผนที่ไปที่แปลงเองได้เลย');
      }, { enableHighAccuracy: true, timeout: 10000 });
    }
    function copyResult() {
      if (!last || !last.closed) return;
      var text = 'วัดจากแผนที่: ' + last.thai.text + ' (' + fmt(last.m2) + ' ตร.ม.) — ' + DISCLAIM;
      function fallback() { w.prompt('คัดลอกข้อความนี้', text); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { msg('คัดลอกแล้ว'); }, fallback);
      } else fallback();
    }
    return true;
  }

  w.NJAreaMap = {
    DISCLAIM: DISCLAIM, KEY: LONGDO_KEY, ZONING_OVERLAY: ZONING_OVERLAY, ZONING_NOTE: ZONING_NOTE,
    areaM2: areaM2, sides: sides, haversine: haversine, thaiArea: thaiArea,
    summary: summary, lineText: lineText, resultHtml: resultHtml,
    createController: createController, loadLongdo: loadLongdo, mount: mount
  };
})(typeof window !== 'undefined' ? window : this);
