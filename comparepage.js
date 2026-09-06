/* หน้าตารางเปรียบเทียบแปลงที่ดิน (compare.html)
 *
 * ⚠️ กติกาที่ห้ามผ่อนในไฟล์นี้ (ข้อ 4 · 5 · 10 ของโปรเจกต์):
 *   · แปลงทุกแปลงมาจาก GET /api/public/listings เท่านั้น ห้ามมีข้อมูลตัวอย่างในโค้ด
 *   · ช่องที่ API ไม่ได้ส่งมาต้องขึ้น "—" ซึ่งหมายถึง **ยังไม่ได้ระบุ ไม่ใช่ไม่มี**
 *     ห้ามเติมข้อความแทน และห้ามตีความว่าแปลงนั้นแพ้ในหัวข้อนั้น
 *   · ป้ายจุดแข็งมอบให้เฉพาะแปลงที่มีข้อมูลช่องนั้นจริง — ไม่รู้ ≠ ชนะ และไม่รู้ ≠ แพ้
 *   · ราคาต่อหน่วยใช้ค่าที่เซิร์ฟเวอร์คำนวณมา (pricePerWa/pricePerRai) **ห้ามหารเอง**
 *     ไม่งั้นตัวเลขในตารางนี้จะไม่ตรงกับตัวเลขบนการ์ดและหน้ารายละเอียดเมื่อปัดเศษต่างกัน
 */
(function () {
  'use strict';

  var NJL = window.NJListing;
  var esc = NJL.esc, money = NJL.money, num = NJL.num, areaTh = NJL.areaTh;

  // ต้องตรงกับ LAND_DEEDS / LAND_ZONES / LAND_ROADS / LAND_FACINGS / PARCEL_FEATURES ใน server.js
  var DEED_TH = { chanote: 'โฉนด (น.ส.4)', nor3gor: 'น.ส.3ก', nor3: 'น.ส.3', other: 'อื่นๆ' };
  var ZONE_TH = {
    yellow: 'เหลือง — ที่อยู่อาศัยหนาแน่นน้อย', orange: 'ส้ม — ที่อยู่อาศัยหนาแน่นปานกลาง',
    brown: 'น้ำตาล — ที่อยู่อาศัยหนาแน่นมาก', red: 'แดง — พาณิชยกรรม',
    purple: 'ม่วง — อุตสาหกรรม', plum: 'เม็ดมะปราง — คลังสินค้า',
    green: 'เขียว — ชนบทและเกษตรกรรม', green_diag: 'เขียวลายขาว — อนุรักษ์ชนบทและเกษตรกรรม',
    blue: 'น้ำเงิน — สถาบันราชการ', olive: 'เขียวมะกอก — สถาบันการศึกษา',
    grey: 'เทา — สถาบันศาสนา', other: 'อื่นๆ / นอกเขตผังเมือง'
  };
  var ROAD_TH = { concrete: 'คอนกรีต', asphalt: 'ลาดยาง', laterite: 'ลูกรัง', dirt: 'ดิน', none: 'ยังไม่มีถนนเข้าถึง' };
  var FACING_TH = {
    n: 'เหนือ', ne: 'ตะวันออกเฉียงเหนือ', e: 'ตะวันออก', se: 'ตะวันออกเฉียงใต้',
    s: 'ใต้', sw: 'ตะวันตกเฉียงใต้', w: 'ตะวันตก', nw: 'ตะวันตกเฉียงเหนือ'
  };
  var FEATURES = ['road', 'electric', 'water', 'filled', 'community', 'buildable'];
  var FEATURE_TH = {
    road: 'ติดถนน', electric: 'มีไฟฟ้า', water: 'มีน้ำประปา',
    filled: 'ถมแล้ว', community: 'ใกล้ชุมชน', buildable: 'สร้างบ้านได้'
  };

  var DASH = '<span class="njcmp-none">—</span>';
  function val(v) { return v ? esc(v) : DASH; }
  function landOf(x) { return x.land || {}; }

  // ---------- จุดแข็ง ----------
  // คำนวณจาก "เฉพาะแปลงที่มีข้อมูลช่องนั้น" แล้วมอบให้ตัวที่ดีที่สุดในกลุ่มนั้น
  // แปลงที่ยังไม่มีข้อมูลจะไม่ถูกนับเข้าการแข่ง และไม่ถูกตัดสินว่าแพ้
  // ⚠️ เสมอกัน = ได้ป้ายทุกคน ไม่ใช่ตัดสินจากลำดับในอาร์เรย์ (ลำดับเป็นแค่ลำดับที่ผู้ใช้กดเลือก)
  function winners(items, get, better) {
    var eligible = items.filter(function (x) { return get(x) != null; });
    if (eligible.length < 2) return {};    // มีคนเดียวที่มีข้อมูล = ไม่มีอะไรให้เทียบ ไม่ใช่ชนะ
    var best = null;
    eligible.forEach(function (x) { var v = get(x); if (best == null || better(v, best)) best = v; });
    var out = {};
    eligible.forEach(function (x) { if (get(x) === best) out[x.id] = true; });
    return out;
  }
  function strengths(items) {
    var lo = function (a, b) { return a < b; }, hi = function (a, b) { return a > b; };
    var cheapWa = winners(items, function (x) { return x.pricePerWa > 0 ? x.pricePerWa : null; }, lo);
    var cheapAll = winners(items, function (x) { return x.estValue > 0 ? x.estValue : null; }, lo);
    var bigArea = winners(items, function (x) { return x.totalWa > 0 ? x.totalWa : null; }, hi);
    var mostFeat = winners(items, function (x) {
      var f = landOf(x).features;
      return Array.isArray(f) && f.length ? f.length : null;
    }, hi);

    var map = {};
    items.forEach(function (x) {
      var w = [];
      // ป้ายนี้ไม่ใช่การเปรียบเทียบ แต่เป็นข้อเท็จจริงของแปลงนั้น (ระดับ 2 = ตรวจเชิงลึกแล้ว)
      // จึงขึ้นได้แม้เทียบกับแปลงเดียว และเป็นป้ายที่สำคัญที่สุดในตารางนี้ จึงอยู่บนสุดเสมอ
      if (x.tier === 2) w.push(['verified', '✓ รังวัดยืนยันแล้ว']);
      if (cheapWa[x.id]) w.push(['price', 'ถูกที่สุดต่อ ตร.ว.']);
      if (cheapAll[x.id]) w.push(['price', 'ราคารวมต่ำสุด']);
      if (bigArea[x.id]) w.push(['size', 'เนื้อที่มากที่สุด']);
      if (mostFeat[x.id]) w.push(['size', 'มีสิ่งอำนวยความสะดวกครบที่สุด']);
      map[x.id] = w;
    });
    return map;
  }

  // ---------- แถวในตาราง ----------
  function rows(items) {
    var wins = strengths(items);
    var list = [
      ['จุดแข็ง', function (x) {
        var w = wins[x.id];
        return w.length
          ? '<span class="njcmp-wins">' + w.map(function (b) {
              return '<span class="njcmp-win ' + b[0] + '">' + esc(b[1]) + '</span>';
            }).join('') + '</span>'
          : DASH;
      }],
      ['ความน่าเชื่อถือของข้อมูล', function (x) {
        // กติกาข้อ 10 — สองระดับนี้ห้ามแสดงปนกัน และระดับ 1 ห้ามขึ้นคำว่า "รังวัดยืนยันแล้ว"
        return x.tier === 2
          ? '<b>✓ ระดับ 2 — ตรวจสอบเชิงลึกแล้ว</b><br><span class="njcmp-none">ผลตรวจ 7 หัวข้อดูได้ในหน้าแปลง</span>'
          : '<b>◐ ระดับ 1 — ข้อมูลเบื้องต้น</b><br><span class="njcmp-none">ยังไม่ได้รังวัดยืนยันเขต</span>';
      }],
      ['ราคารวม', function (x) { return x.estValue > 0 ? '<b>' + esc(money(x.estValue)) + '</b>' : DASH; }],
      ['ราคาต่อ ตร.ว.', function (x) { return x.pricePerWa > 0 ? '฿' + num(x.pricePerWa) : DASH; }],
      ['ราคาต่อไร่', function (x) { return x.pricePerRai > 0 ? '฿' + num(x.pricePerRai) : DASH; }],
      ['เนื้อที่', function (x) {
        var a = areaTh(x.totalWa);
        return a ? esc(a) + '<br><span class="njcmp-none">' + num(x.totalWa) + ' ตร.ว.</span>' : DASH;
      }],
      ['ทำเล', function (x) { return val(landOf(x).locality); }],
      ['เอกสารสิทธิ์', function (x) { return val(DEED_TH[landOf(x).deedType]); }],
      ['ผังเมือง (ผังสี)', function (x) { return val(ZONE_TH[landOf(x).zoneColor]); }],
      ['ผังเมืองรวม (ข้อความ)', function (x) { return val(landOf(x).zoning); }],
      ['ถนนหน้าที่ดิน', function (x) {
        var L = landOf(x), bits = [];
        if (ROAD_TH[L.roadSurface]) bits.push(ROAD_TH[L.roadSurface]);
        if (Number(L.roadLanes) > 0) bits.push(Number(L.roadLanes) + ' ช่องจราจร');
        return bits.length ? esc(bits.join(' · ')) : DASH;
      }],
      ['หน้ากว้างโดยประมาณ', function (x) { return val(landOf(x).frontage); }],
      ['ทิศหน้าแปลง', function (x) { return val(FACING_TH[landOf(x).facing]); }],
      ['สิ่งที่แปลงมี', function (x) {
        var f = landOf(x).features;
        if (!Array.isArray(f) || !f.length) return DASH;
        return '<span class="njcmp-wins">' + FEATURES.filter(function (k) { return f.indexOf(k) >= 0; })
          .map(function (k) { return '<span class="njcmp-win">' + esc(FEATURE_TH[k]) + '</span>'; }).join('') + '</span>';
      }],
      ['ประเภทประกาศ', function (x) { return x.type === 'rent' ? 'ให้เช่า' : 'ขาย'; }],
      ['อัปเดตล่าสุด', function (x) { return val(NJL.ago(x.updatedAt)); }]
    ];
    return list.map(function (r) {
      return '<tr><th scope="row">' + esc(r[0]) + '</th>' +
        items.map(function (x) { return '<td>' + r[1](x) + '</td>'; }).join('') + '</tr>';
    }).join('');
  }

  function headCells(items) {
    return items.map(function (x) {
      var href = 'land.html?id=' + encodeURIComponent(x.id);
      var img = x.photos[0]
        ? '<img src="' + esc(x.photos[0]) + '" alt="" loading="lazy">'
        : '<div class="njcmp-noimg" aria-hidden="true"></div>';
      return '<td class="njcmp-th-card">' +
        '<a class="njcmp-card" href="' + esc(href) + '">' + img +
          '<span class="njcmp-card-id">รหัสทรัพย์ ' + esc(x.id) + '</span>' +
          '<span class="njcmp-card-title">' + esc(x.parcelInfo || 'แปลงที่ดิน') + '</span>' +
          '<span class="njcmp-card-price">' + esc(money(x.estValue)) + '</span>' +
        '</a>' +
        '<div style="padding:0 13px 12px"><button type="button" class="njcmp-drop" data-drop="' + esc(x.id) + '">เอาออกจากการเทียบ</button></div>' +
      '</td>';
    }).join('');
  }

  function emptyHtml(msg) {
    return '<div class="njcmp-empty"><b>' + esc(msg) + '</b>' +
      '<span>กดปุ่ม “เทียบ” บนการ์ดแปลงที่สนใจ (เลือกได้สูงสุด ' + NJCompare.MAX + ' แปลง) แล้วกลับมาที่หน้านี้</span>' +
      '<a href="listings.html">ไปดูแปลงทั้งหมด →</a></div>';
  }

  function render(all) {
    var root = document.getElementById('njcmp-root');
    var ids = NJCompare.read();
    var items = ids.map(function (id) {
      return all.filter(function (x) { return x.id === id; })[0];
    }).filter(Boolean);

    // แปลงที่เลือกไว้แล้วหายไปจาก API = ขายไปแล้วหรือเจ้าของถอนประกาศ
    // ต้องบอกตามจริงและตัดออกจากรายการที่จำไว้ ไม่ใช่ปล่อยให้ค้างจนกดเทียบแล้วช่องหาย
    var gone = ids.length - items.length;
    if (gone > 0) NJCompare.write(items.map(function (x) { return x.id; }));

    if (!items.length) { root.innerHTML = emptyHtml('ยังไม่ได้เลือกแปลงไว้เปรียบเทียบ'); NJCompare.renderBar(); return; }

    var unknown = 0;
    items.forEach(function (x) {
      var L = landOf(x);
      ['deedType', 'zoneColor', 'roadSurface', 'facing'].forEach(function (k) { if (!L[k]) unknown++; });
    });

    root.innerHTML =
      (gone > 0 ? '<div class="njcmp-note">มี ' + gone + ' แปลงที่เลือกไว้ไม่อยู่ในระบบแล้ว (ขายไปแล้วหรือเจ้าของขอถอนประกาศ) — ตัดออกจากตารางให้แล้ว</div>' : '') +
      '<div class="njcmp-scroll"><table class="njcmp-table">' +
        '<thead><tr><th scope="row">แปลงที่เลือก</th>' + headCells(items) + '</tr></thead>' +
        '<tbody>' + rows(items) + '</tbody>' +
      '</table></div>' +
      // ⚠️ ข้อความนี้ห้ามถอด — เป็นสิ่งเดียวที่กัน "—" ไม่ให้ถูกอ่านว่า "แปลงนี้ไม่มี"
      '<div class="njcmp-note"><b>อ่านตารางนี้ยังไง:</b> ขีด “—” แปลว่า <b>ยังไม่ได้ระบุข้อมูลช่องนั้น</b> ' +
        'ไม่ได้แปลว่าแปลงนั้นไม่มี — ทักไลน์ถามทีมงานได้ เราจะไปตรวจให้' +
        (unknown ? ' (ตอนนี้มี ' + unknown + ' ช่องที่ยังไม่ได้ระบุในตารางนี้)' : '') +
        '<br>ป้ายจุดแข็งเทียบเฉพาะในกลุ่มแปลงที่คุณเลือกไว้เท่านั้น และมอบให้เฉพาะแปลงที่มีข้อมูลช่องนั้นจริง ' +
        'ส่วนป้าย “รังวัดยืนยันแล้ว” เป็นข้อเท็จจริงของแปลงนั้นเอง ไม่ใช่ผลการเทียบ' +
      '</div>';

    root.querySelectorAll('[data-drop]').forEach(function (b) {
      b.addEventListener('click', function () { NJCompare.toggle(b.getAttribute('data-drop')); render(all); });
    });
    NJCompare.renderBar();
  }

  function boot() {
    var root = document.getElementById('njcmp-root');
    if (!root) return;
    if (!NJCompare.count()) { root.innerHTML = emptyHtml('ยังไม่ได้เลือกแปลงไว้เปรียบเทียบ'); return; }
    // fetchListings() คืนอาร์เรย์ที่ normalize() แล้ว ไม่ใช่ตัว response ดิบ
    NJL.fetchListings()
      .then(function (list) { render(list || []); })
      // โหลดไม่ได้ ≠ ไม่มีแปลง — ต้องบอกตามจริง ห้ามแสดงว่าว่างเปล่า (กติกาการทดสอบขั้นต่ำ)
      .catch(function () { root.innerHTML = NJL.loadFailedHtml(); });
    if (window.njTrackInternal) njTrackInternal('compare_open');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
