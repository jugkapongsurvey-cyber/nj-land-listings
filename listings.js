/* หน้ารวมประกาศ — ตัวกรอง + เรียงลำดับ
 *
 * ทำไมต้องมีหน้านี้แยกจากหน้าแรก: หน้าแรกมีแค่ช่องค้นหากับกรองราคา 1 ชั้น และเป็นหน้าขายแบรนด์
 * ไม่ใช่หน้าสำหรับ "ไล่ดูของ" — เวลายิงโฆษณาหาผู้ซื้อจึงไม่มีหน้าปลายทางให้ส่งคนไปลง
 *
 * ⚠️ การ์ด · ตัวดึงข้อมูล · ข้อความตอนไม่มีแปลง ใช้ของกลางจาก listingcard.js
 * กติกา "แสดงเฉพาะสิ่งที่ API ส่งมาจริง" อยู่ในไฟล์นั้น ห้ามเขียนการ์ดชุดใหม่ที่นี่
 *
 * ⚠️ กติกาของตัวกรองที่ห้ามผ่อน: แปลงที่ "ยังไม่ได้ระบุ" ช่องที่กำลังกรอง จะไม่ถูกนับว่าตรงเงื่อนไข
 * (บอกว่าตรงทั้งที่ไม่รู้ = โกหกผู้ซื้อ) แต่ **ต้องขึ้นข้อความบอกจำนวนที่ถูกซ่อนด้วยเหตุนี้เสมอ**
 * ไม่งั้นแปลงจะหายเงียบๆ ผู้ซื้อคิดว่าไม่มีของ และทีมงานก็ไม่รู้ว่าต้องไปกรอกอะไรเพิ่ม
 */
(function () {
  'use strict';

  var NJL = window.NJListing;
  var $ = function (id) { return document.getElementById(id); };

  // ต้องตรงกับ LAND_DEEDS / LAND_ZONES / PARCEL_FEATURES ใน server.js
  // ไม่ตรงเมื่อไหร่ = ตัวเลือกบนหน้าเว็บกรองไม่เจออะไรเลย ทั้งที่ข้อมูลมีอยู่
  var DEED_TH = { chanote: 'โฉนด (น.ส.4)', nor3gor: 'น.ส.3ก', nor3: 'น.ส.3', other: 'อื่นๆ' };
  var ZONE_TH = {
    yellow: 'เหลือง — ที่อยู่อาศัยหนาแน่นน้อย', orange: 'ส้ม — ที่อยู่อาศัยหนาแน่นปานกลาง',
    brown: 'น้ำตาล — ที่อยู่อาศัยหนาแน่นมาก', red: 'แดง — พาณิชยกรรม',
    purple: 'ม่วง — อุตสาหกรรม', plum: 'เม็ดมะปราง — คลังสินค้า',
    green: 'เขียว — ชนบทและเกษตรกรรม', green_diag: 'เขียวลายขาว — อนุรักษ์ชนบทและเกษตรกรรม',
    blue: 'น้ำเงิน — สถาบันราชการ', olive: 'เขียวมะกอก — สถาบันการศึกษา',
    grey: 'เทา — สถาบันศาสนา', other: 'อื่นๆ / นอกเขตผังเมือง'
  };
  var FEATURES = ['road', 'electric', 'water', 'filled', 'community', 'buildable'];
  var FEATURE_TH = {
    road: 'ติดถนน', electric: 'มีไฟฟ้า', water: 'มีน้ำประปา',
    filled: 'ถมแล้ว', community: 'ใกล้ชุมชน', buildable: 'สร้างบ้านได้'
  };
  var WA_PER_RAI = 400;

  var state = { listings: [], loaded: false };

  function landOf(item) { return item.land || {}; }
  function num(el) { var v = Number(($(el).value || '').trim()); return isFinite(v) && v > 0 ? v : 0; }

  function readFilters() {
    return {
      q: ($('f-q').value || '').trim().toLowerCase(),
      type: $('f-type').value,
      province: $('f-province').value,
      pmin: num('f-pmin'), pmax: num('f-pmax'),
      amin: num('f-amin'), amax: num('f-amax'),
      deed: $('f-deed').value,
      zone: $('f-zone').value,
      feats: FEATURES.filter(function (k) { var el = $('f-feat-' + k); return el && el.checked; }),
      sort: $('f-sort').value
    };
  }

  // คืน {list, hiddenUnknown} — hiddenUnknown = แปลงที่ตกรอบเพราะ "ยังไม่ได้ระบุ" ไม่ใช่เพราะไม่ตรง
  function apply(f) {
    var hiddenUnknown = 0;
    var list = state.listings.filter(function (item) {
      var L = landOf(item);

      // คำค้น — ค้นจากทุกข้อความที่ผู้ซื้ออ่านเห็นบนการ์ดและในหน้ารายละเอียด
      if (f.q) {
        var hay = [item.parcelInfo, item.blurb, L.locality, L.zoning, L.province, L.amphoe, L.tambon]
          .filter(Boolean).join(' ').toLowerCase();
        if (hay.indexOf(f.q) < 0) return false;
      }
      if (f.type !== 'all' && item.type !== f.type) return false;

      // ราคา — แปลงที่ยังไม่ระบุราคา (estValue 0 = "ติดต่อสอบถาม") ตกรอบเมื่อกรองช่วงราคา
      if (f.pmin || f.pmax) {
        if (!(item.estValue > 0)) { hiddenUnknown++; return false; }
        if (f.pmin && item.estValue < f.pmin) return false;
        if (f.pmax && item.estValue > f.pmax) return false;
      }
      // เนื้อที่ — เทียบเป็นไร่ตามที่ผู้ใช้กรอก (totalWa มาจากเซิร์ฟเวอร์ ไม่ได้หารเองที่นี่)
      if (f.amin || f.amax) {
        if (!(item.totalWa > 0)) { hiddenUnknown++; return false; }
        var rai = item.totalWa / WA_PER_RAI;
        if (f.amin && rai < f.amin) return false;
        if (f.amax && rai > f.amax) return false;
      }
      if (f.province !== 'all') {
        if (!L.province) { hiddenUnknown++; return false; }
        if (L.province !== f.province) return false;
      }
      if (f.deed !== 'all') {
        if (!L.deedType) { hiddenUnknown++; return false; }
        // "น.ส.3ก" ของผู้ซื้อหมายถึง "น.ส.3ก ขึ้นไป" — โฉนดถือว่าดีกว่าจึงนับว่าตรงด้วย
        // กติกาเดียวกับที่เขียนไว้ข้าง LAND_DEEDS ใน server.js
        var ok = f.deed === 'nor3gor'
          ? (L.deedType === 'nor3gor' || L.deedType === 'chanote')
          : L.deedType === f.deed;
        if (!ok) return false;
      }
      if (f.zone !== 'all') {
        if (!L.zoneColor) { hiddenUnknown++; return false; }
        if (L.zoneColor !== f.zone) return false;
      }
      if (f.feats.length) {
        var have = L.features || [];
        // ยังไม่เคยกรอกช่องนี้เลย = ไม่รู้ ไม่ใช่ไม่มี — แยกนับให้ผู้ใช้เห็น
        if (!have.length) { hiddenUnknown++; return false; }
        for (var i = 0; i < f.feats.length; i++) if (have.indexOf(f.feats[i]) < 0) return false;
      }
      return true;
    });

    var by = {
      price_asc: function (a, b) { return (a.estValue || Infinity) - (b.estValue || Infinity); },
      price_desc: function (a, b) { return (b.estValue || 0) - (a.estValue || 0); },
      // ไม่มีราคาต่อ ตร.ว. = ไปท้ายแถวเสมอ ไม่ใช่ขึ้นบนสุดเพราะค่าเป็น 0
      wa_asc: function (a, b) { return (a.pricePerWa || Infinity) - (b.pricePerWa || Infinity); },
      area_desc: function (a, b) { return (b.totalWa || 0) - (a.totalWa || 0); },
      new: function (a, b) { return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); }
    };
    list.sort(by[f.sort] || by.new);
    return { list: list, hiddenUnknown: hiddenUnknown };
  }

  function render() {
    var f = readFilters();
    var r = apply(f);
    var grid = $('listing-grid');
    var anyFilter = !!(f.q || f.type !== 'all' || f.province !== 'all' || f.pmin || f.pmax ||
      f.amin || f.amax || f.deed !== 'all' || f.zone !== 'all' || f.feats.length);

    $('result-note').textContent = state.loaded
      ? ('พบ ' + r.list.length + ' แปลง' + (anyFilter ? ' จากทั้งหมด ' + state.listings.length + ' แปลง' : ''))
      : '';

    var un = $('unknown-note');
    if (r.hiddenUnknown > 0) {
      un.hidden = false;
      un.textContent = 'อีก ' + r.hiddenUnknown + ' แปลงไม่ได้แสดง เพราะยังไม่ได้ระบุข้อมูลในช่องที่คุณกรอง — ' +
        'ไม่ได้แปลว่าแปลงนั้นไม่ตรงเงื่อนไข ทักไลน์ถามทีมงานได้เลย';
    } else { un.hidden = true; un.textContent = ''; }

    if (!r.list.length) { grid.innerHTML = NJL.emptyHtml(state.loaded && state.listings.length > 0); return; }
    grid.innerHTML = r.list.map(NJL.card).join('');
  }

  function fillSelect(el, pairs, allLabel) {
    el.innerHTML = '<option value="all">' + allLabel + '</option>' +
      pairs.map(function (p) { return '<option value="' + NJL.esc(p[0]) + '">' + NJL.esc(p[1]) + '</option>'; }).join('');
  }

  function buildControls() {
    fillSelect($('f-deed'), Object.keys(DEED_TH).map(function (k) { return [k, DEED_TH[k]]; }), 'ไม่เกี่ยง');
    fillSelect($('f-zone'), Object.keys(ZONE_TH).map(function (k) { return [k, ZONE_TH[k]]; }), 'ไม่เกี่ยง');
    $('f-features').innerHTML = FEATURES.map(function (k) {
      return '<label><input type="checkbox" id="f-feat-' + k + '"> ' + NJL.esc(FEATURE_TH[k]) + '</label>';
    }).join('');
  }

  // รายชื่อจังหวัดสร้างจาก "แปลงที่มีอยู่จริง" ไม่ใช่รายชื่อ 77 จังหวัด
  // เลือกจังหวัดที่ไม่มีของแล้วเจอผลลัพธ์ว่างเปล่า = ดูเหมือนเว็บพัง
  function fillProvinces() {
    var seen = {};
    state.listings.forEach(function (x) { var p = (x.land && x.land.province) || ''; if (p) seen[p] = true; });
    var names = Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'th'); });
    fillSelect($('f-province'), names.map(function (n) { return [n, n]; }), 'ทุกจังหวัด');
  }

  function load() {
    NJL.fetchListings()
      .then(function (list) {
        state.listings = list;
        state.loaded = true;
        fillProvinces();
        render();
      })
      .catch(function () {
        // โหลดไม่ได้ ≠ ไม่มีแปลง — สองกรณีนี้ห้ามแสดงเหมือนกัน
        state.loaded = false;
        $('listing-grid').innerHTML = NJL.loadFailedHtml();
      });
  }

  buildControls();

  $('ls-form').addEventListener('submit', function (e) {
    e.preventDefault();
    render();
    var f = readFilters();
    if (window.njTrack) window.njTrack('Search', { search_string: f.q, content_category: f.province });
  });
  // ช่องเลือก (ไม่ใช่ช่องพิมพ์) กรองทันทีที่เปลี่ยน — ไม่ต้องกดค้นหาซ้ำ
  ['f-type', 'f-province', 'f-deed', 'f-zone', 'f-sort'].forEach(function (id) {
    $(id).addEventListener('change', render);
  });
  $('f-features').addEventListener('change', render);
  $('f-reset').addEventListener('click', function () {
    $('ls-form').reset();
    buildControls();
    fillProvinces();
    render();
  });

  NJL.bindGrid($('listing-grid'), 'listings_page');
  $('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
  load();
  if (window.njTrackInternal) window.njTrackInternal('pageview');
})();
