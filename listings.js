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
  var DEED_TH = { chanote: 'โฉนด (น.ส.4)', nor3gor: 'น.ส.3ก', nor3: 'น.ส.3', condo_title: 'ห้องชุด (อ.ช.2)', other: 'อื่นๆ' };
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
  // ---------- คะแนนความพร้อมของข้อมูล (11 ต.ค. 69) ----------
  // ⚠️ อ่าน score.total ที่เซิร์ฟเวอร์คิดมาเท่านั้น (lib/landscore.js ของระบบ) — ห้ามคิด/ปัดเองที่นี่
  //    (บทเรียนเดียวกับ landscore.js ข้อ 4: สองที่ปัดไม่เหมือนกัน = ตัวเลขบนการ์ดกับผลกรองไม่ตรงกันเงียบๆ)
  // ⚠️ ไม่มีคะแนน (score: null = ยังไม่มีใครกรอกผลตรวจ) ≠ คะแนน 0 → ไม่ผ่านเกณฑ์ แต่นับเป็น "ยังไม่ได้ระบุ" (hiddenUnknown)
  //    และยังขึ้นตามปกติตอน "ไม่เกี่ยง"
  // เกณฑ์ต้องตรงกับตัวเลือกใน listings.html (#f-score) — ค่าจาก URL ที่ไม่อยู่ในรายการถูกเมิน (setSelect)
  var SCORE_MINS = ['50', '70', '80'];
  // ถ้อยคำกำกับ = ข้อความเดียวกับ SCORE_DISCLAIM ที่หน้าแปลงพิมพ์ (score-filter.test.js เทียบกับระบบให้) — ห้ามเขียนให้อ่อนลง
  var SCORE_NOTE = 'คะแนนข้อมูลพร้อมบอกว่าข้อมูลของแปลงถูกตรวจและบันทึกไว้ครบแค่ไหน ไม่ใช่การให้คะแนนคุณภาพที่ดิน';
  var SCORE_EMPTY = 'แปลงที่ยังไม่มีใครไปตรวจจะได้คะแนนน้อยเป็นเรื่องปกติ ไม่ได้แปลว่าที่ดินไม่ดี';
  function scoreOf(item) {
    var t = item && item.score && item.score.total;
    return typeof t === 'number' && isFinite(t) ? t : null;
  }

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
      prop: $('f-prop').value,
      floors: $('f-floors').value,
      zone: $('f-zone').value,
      feats: FEATURES.filter(function (k) { var el = $('f-feat-' + k); return el && el.checked; }),
      score: ($('f-score') && SCORE_MINS.indexOf($('f-score').value) >= 0) ? $('f-score').value : 'all',
      saved: !!($('f-saved') && $('f-saved').checked),
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
      // ⚠️ "เฉพาะที่บันทึกไว้" ไม่ใช่ช่องข้อมูลของแปลง จึง **ไม่นับเป็น hiddenUnknown**
      //    แปลงที่ไม่ได้บันทึกไม่ได้แปลว่า "ยังไม่ได้ระบุ" — มันแค่ไม่ถูกเลือก
      if (f.saved && !(window.NJSave && NJSave.has(item.id))) return false;
      if (f.type !== 'all' && item.type !== f.type) return false;

      // ราคา — แปลงที่ยังไม่ระบุราคา (estValue 0 = "ติดต่อสอบถาม") ตกรอบเมื่อกรองช่วงราคา
      // ⚠️ ประกาศเช่า: estValue = ค่าเช่ารายเดือน (11 ต.ค. 69) — ช่องราคาเปลี่ยนเป็น "ค่าเช่า/เดือน" เมื่อเลือกประเภท=ให้เช่า
      //    ประเภท=ทั้งหมด + กรองช่วงราคา = ไม่เอาประกาศเช่ามาเทียบกับช่วงราคาขาย (คนละหน่วย · ไม่นับเป็น "ยังไม่ได้ระบุ")
      if ((f.pmin || f.pmax) && f.type === 'all' && item.type === 'rent') return false;
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
      // ประเภทสิ่งปลูกสร้าง — ว่าง = ยังไม่ได้กรอก ไม่ใช่ "ที่ดินเปล่า" จึงนับเป็นซ่อน ไม่ใช่ไม่ตรง
      // "มีสิ่งปลูกสร้าง (ทุกแบบ)" = อะไรก็ได้ที่ไม่ใช่ที่ดินเปล่า
      if (f.prop !== 'all') {
        if (!L.propertyType) { hiddenUnknown++; return false; }
        if (f.prop === 'any_building' ? L.propertyType === 'land' : L.propertyType !== f.prop) return false;
      }
      if (f.floors !== 'all') {
        if (!(L.floors > 0)) { hiddenUnknown++; return false; }
        if (f.floors === '3+' ? L.floors < 3 : L.floors !== Number(f.floors)) return false;
      }
      if (f.zone !== 'all') {
        if (!L.zoneColor) { hiddenUnknown++; return false; }
        // 'checked' = ขอเฉพาะแปลงที่ทีมอ่านผังแล้วกดบันทึก (สีอะไรก็ได้) · ค่าอื่น = เจาะจงสีนั้น
        if (f.zone !== 'checked' && L.zoneColor !== f.zone) return false;
      }
      if (f.feats.length) {
        var have = L.features || [];
        // ยังไม่เคยกรอกช่องนี้เลย = ไม่รู้ ไม่ใช่ไม่มี — แยกนับให้ผู้ใช้เห็น
        if (!have.length) { hiddenUnknown++; return false; }
        for (var i = 0; i < f.feats.length; i++) if (have.indexOf(f.feats[i]) < 0) return false;
      }
      if (f.score !== 'all') {
        var sc = scoreOf(item);
        if (sc === null) { hiddenUnknown++; return false; }
        if (sc < Number(f.score)) return false;
      }
      return true;
    });

    // ประกาศเช่าเรียงด้วยค่าเช่ารายเดือน / ค่าเช่าต่อ ตร.ว. (ก้อน rent จากเซิร์ฟเวอร์) · ประเภท=ทั้งหมด = ขายก่อน แล้วค่อยเช่า
    //   (ค่าเช่ารายเดือนเทียบกับราคาขายไม่ได้ — ปนกันแล้ว "ราคาต่ำ → สูง" จะเอาประกาศเช่าทุกใบขึ้นหัว)
    var waOf = function (x) { return x.type === 'rent' ? ((x.rent && x.rent.perWa) || 0) : (x.pricePerWa || 0); };
    var grouped = function (cmp) {
      return function (a, b) {
        var d = f.type === 'all' ? ((a.type === 'rent' ? 1 : 0) - (b.type === 'rent' ? 1 : 0)) : 0;
        return d || cmp(a, b);
      };
    };
    var by = {
      price_asc: grouped(function (a, b) { return (a.estValue || Infinity) - (b.estValue || Infinity); }),
      price_desc: grouped(function (a, b) { return (b.estValue || 0) - (a.estValue || 0); }),
      // ไม่มีราคาต่อ ตร.ว. = ไปท้ายแถวเสมอ ไม่ใช่ขึ้นบนสุดเพราะค่าเป็น 0
      wa_asc: grouped(function (a, b) { return (waOf(a) || Infinity) - (waOf(b) || Infinity); }),
      area_desc: function (a, b) { return (b.totalWa || 0) - (a.totalWa || 0); },
      new: function (a, b) { return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); },
      // ไม่มีคะแนน = ท้ายแถวเสมอ (ไม่ใช่ถือเป็น 0) · คะแนนเท่ากัน = อัปเดตล่าสุดก่อน (ลำดับคงที่)
      score_desc: function (a, b) {
        var x = scoreOf(a), y = scoreOf(b);
        if (x === null || y === null) return (x === null ? 1 : 0) - (y === null ? 1 : 0) || by.new(a, b);
        return (y - x) || by.new(a, b);
      }
    };
    list.sort(by[f.sort] || by.new);
    // ประกาศเด่นขึ้นก่อน (หมุนลำดับวันละครั้ง) — เฉพาะการเรียงตั้งต้น "อัปเดตล่าสุด"
    // ⚠️ ผู้ใช้เลือกเรียงตามราคา/เนื้อที่เอง = เคารพลำดับที่เขาขอ ห้ามแทรกประกาศเด่นขึ้นหัว
    //    ("ราคาต่ำ → สูง" ที่มีแปลงราคาสูงอยู่บนสุด = บอกข้อมูลผิดกับผู้ซื้อ) · ป้ายยังแสดงบนการ์ดตามปกติ
    //    กรองจังหวัดแล้วก็ยังขึ้นก่อนในจังหวัดนั้น เพราะกรองก่อนแล้วค่อยจัดลำดับ
    if ((f.sort || 'new') === 'new' && window.NJLandMeta && NJLandMeta.featuredFirst) list = NJLandMeta.featuredFirst(list);
    return { list: list, hiddenUnknown: hiddenUnknown };
  }

  // ---------- ข้อความบนชิป · จำนวนตัวกรองที่ใช้อยู่ (10 ต.ค. 69 · แถบชิปแบบ DDproperty) ----------
  // ⚠️ ชิปเป็นแค่ "ป้ายบอกค่า + ทางลัดเปิดแผง" ค่าจริงอยู่ในช่องของแผงตัวกรองที่เดียว
  //    ห้ามเก็บค่าตัวกรองไว้ที่ชิปอีกชุด ไม่งั้นสองชุดจะหลุดจากกันโดยไม่มีอะไรเตือน
  function moneyShort(v) {
    return '฿' + (v >= 1000000 ? (Math.round(v / 10000) / 100).toLocaleString('th-TH') + ' ล้าน' : Number(v).toLocaleString('th-TH'));
  }
  // ช่วงค่าเช่าบนชิป — ตัวเลขเต็ม + "/ด." (ค่าเช่าหลักหมื่น ไม่ใช้ "ล้าน")
  function rentShort(v) { return '฿' + Number(v).toLocaleString('th-TH') + '/ด.'; }
  // ป้ายช่องราคา/ตัวเลือกการเรียง ตามประเภทประกาศ — เลือก "ให้เช่า" = ค่าเช่ารายเดือน (11 ต.ค. 69)
  // ⚠️ เปลี่ยนเฉพาะข้อความ/ขั้นของช่อง ค่าเดิมในช่องไม่ถูกล้าง · เขียนเมื่อค่าเปลี่ยนเท่านั้น (กับดัก MutationObserver)
  var PRICE_TEXT = {
    sale: { pmin: 'ราคาต่ำสุด (บาท)', pmax: 'ราคาสูงสุด (บาท)', step: '100000',
            price_asc: 'ราคารวม ต่ำ → สูง', price_desc: 'ราคารวม สูง → ต่ำ', wa_asc: 'ราคาต่อ ตร.ว. ต่ำ → สูง' },
    rent: { pmin: 'ค่าเช่าต่ำสุด (บาท/เดือน)', pmax: 'ค่าเช่าสูงสุด (บาท/เดือน)', step: '1000',
            price_asc: 'ค่าเช่า/เดือน ต่ำ → สูง', price_desc: 'ค่าเช่า/เดือน สูง → ต่ำ', wa_asc: 'ค่าเช่าต่อ ตร.ว. ต่ำ → สูง' }
  };
  function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
  function syncPriceLabels(type) {
    var T = PRICE_TEXT[type === 'rent' ? 'rent' : 'sale'];
    ['pmin', 'pmax'].forEach(function (k) {
      var inp = $('f-' + k); if (!inp) return;
      var lab = inp.parentNode && inp.parentNode.querySelector('span');
      setText(lab, T[k]);
      if (inp.getAttribute('step') !== T.step) inp.setAttribute('step', T.step);
    });
    var sel = $('f-sort');
    if (sel) ['price_asc', 'price_desc', 'wa_asc'].forEach(function (v) {
      setText(sel.querySelector('option[value="' + v + '"]'), T[v]);
    });
  }
  function rangeText(lo, hi, fmt) {
    if (lo && hi) return fmt(lo) + '–' + fmt(hi);
    return lo ? '≥ ' + fmt(lo) : '≤ ' + fmt(hi);
  }
  function propLabel(k) {
    if (k === 'any_building') return 'มีสิ่งปลูกสร้าง';
    var PT = (window.NJVocab && window.NJVocab.PROPERTY_TH) || {};
    return PT[k] || k;
  }
  function zoneLabel(k) { return k === 'checked' ? 'ตรวจผังสีแล้ว' : 'ผัง' + String(ZONE_TH[k] || k).split(' — ')[0]; }
  var CHIP_FOCUS = { province: 'f-province', price: 'f-pmin', area: 'f-amin', zone: 'f-zone', prop: 'f-prop', type: 'f-type', score: 'f-score' };
  function chipText(key, f) {
    switch (key) {
      case 'province': return f.province !== 'all' ? f.province : '';
      case 'price': return (f.pmin || f.pmax)
        ? (f.type === 'rent' ? 'ค่าเช่า ' + rangeText(f.pmin, f.pmax, rentShort) : 'ราคา ' + rangeText(f.pmin, f.pmax, moneyShort)) : '';
      case 'area': return (f.amin || f.amax) ? rangeText(f.amin, f.amax, function (v) { return v.toLocaleString('th-TH'); }) + ' ไร่' : '';
      case 'zone': return f.zone !== 'all' ? zoneLabel(f.zone) : '';
      case 'prop': return f.prop !== 'all' ? propLabel(f.prop) : '';
      case 'type': return f.type === 'sell' ? 'ขาย' : f.type === 'rent' ? 'ให้เช่า' : '';
      case 'score': return f.score !== 'all' ? 'ข้อมูลพร้อม ' + f.score + '+' : '';
    }
    return '';
  }
  function activeCount(f) {
    return (f.type !== 'all') + (f.province !== 'all') + ((f.pmin || f.pmax) ? 1 : 0) + ((f.amin || f.amax) ? 1 : 0) +
      (f.deed !== 'all') + (f.prop !== 'all') + (f.floors !== 'all') + (f.zone !== 'all') + f.feats.length + (f.saved ? 1 : 0) + (f.score !== 'all');
  }
  function setText(el, txt) { if (el && el.textContent !== txt) el.textContent = txt; }   // เทียบก่อนเขียน (กับดัก MutationObserver)
  function paintChips(f) {
    var chips = document.querySelectorAll('#ls-chips [data-chip]');
    for (var i = 0; i < chips.length; i++) {
      var c = chips[i], key = c.getAttribute('data-chip');
      if (!c.hasAttribute('data-label')) c.setAttribute('data-label', c.textContent);
      var t = chipText(key, f);
      setText(c, t || c.getAttribute('data-label'));
      c.classList.toggle('is-on', !!t);
    }
    var n = activeCount(f);
    setText($('ls-open-n'), n ? '(' + n + ')' : '');
    var open = $('ls-open'); if (open) open.classList.toggle('is-on', n > 0);
    var clr = $('ls-clear'); if (clr) clr.hidden = !(n || f.q);
  }

  // ---------- ปุ่มแจ้งเตือน → หน้าฝากหาที่ดิน พร้อมเงื่อนไขที่เลือกอยู่ ----------
  // ช่องที่หน้าฝากหามีจริง (จังหวัด งบ เนื้อที่ เอกสารสิทธิ์ สิ่งที่ต้องมี) ส่งเป็นค่าให้ wanted.js เติมช่องนั้น
  // ช่องที่หน้าฝากหาไม่มี (ผังสี ประเภททรัพย์ ชั้น เช่า คำค้น) ส่งเป็นคีย์ แล้ว wanted.js ประกอบข้อความหมายเหตุเอง
  // จากคำศัพท์กลาง — ไม่ส่งข้อความอิสระทาง URL (ลิงก์ที่ใครก็ตั้งได้ ต้องไม่ยัดประโยคลงฟอร์มของลูกค้า)
  // ⚠️ ไม่มีข้อมูลส่วนบุคคลใน URL นี้ — มีแค่เงื่อนไขการค้นหา (ชื่อ/เบอร์ผู้ใช้กรอกเองที่หน้าปลายทาง)
  function alertHref(f) {
    var p = new URLSearchParams();
    p.set('from', 'listings');
    if (f.province !== 'all') p.set('province', f.province);
    if (f.pmin) p.set('budgetMin', String(f.pmin));
    if (f.pmax) p.set('budgetMax', String(f.pmax));
    if (f.amin) p.set('areaMin', String(f.amin));
    if (f.amax) p.set('areaMax', String(f.amax));
    // หน้าฝากหามีแค่ "โฉนดเท่านั้น / น.ส.3ก ขึ้นไป / ไม่เกี่ยง" — เอกสารแบบอื่นไปอยู่ในหมายเหตุแทน
    if (f.deed === 'chanote' || f.deed === 'nor3gor') p.set('deedType', f.deed);
    if (f.feats.length) p.set('features', f.feats.join(','));
    if (f.type === 'rent') p.set('deal', 'rent');
    if (f.prop !== 'all') p.set('prop', f.prop);
    if (f.floors !== 'all') p.set('floors', f.floors);
    if (f.zone !== 'all') p.set('zone', f.zone);
    if (f.deed !== 'all' && f.deed !== 'chanote' && f.deed !== 'nor3gor') p.set('deedOther', f.deed);
    if (f.score !== 'all') p.set('score', f.score);
    var rawQ = ($('f-q').value || '').trim();
    if (rawQ) p.set('q', rawQ.slice(0, 60));
    return 'wanted.html?' + p.toString();
  }

  // ---------- ตัวกรองลงที่อยู่หน้า (แชร์ลิงก์ได้ · กดย้อนกลับจากหน้าแปลงแล้วตัวกรองยังอยู่) ----------
  // ⚠️ ใช้ replaceState ไม่ใช่ pushState — กดกรองสิบครั้งต้องไม่กลายเป็นปุ่มย้อนกลับสิบชั้น
  //    canonical ของหน้านี้คงที่อยู่แล้ว (seo.test.js) เสิร์ชเอนจินจึงไม่นับ ?… เป็นหน้าใหม่
  var URL_KEYS = ['type', 'province', 'pmin', 'pmax', 'amin', 'amax', 'deed', 'prop', 'floors', 'zone', 'score'];
  function syncUrl(f) {
    if (!window.history || !history.replaceState) return;
    var p = new URLSearchParams();
    var rawQ = ($('f-q').value || '').trim();
    if (rawQ) p.set('q', rawQ);
    URL_KEYS.forEach(function (k) { var v = f[k]; if (v && v !== 'all') p.set(k, String(v)); });
    if (f.feats.length) p.set('feat', f.feats.join(','));
    if (f.sort && f.sort !== 'new') p.set('sort', f.sort);
    if (view === 'map') p.set('view', 'map');
    var qs = p.toString();
    var url = location.pathname + (qs ? '?' + qs : '') + location.hash;
    if (url !== location.pathname + location.search + location.hash) history.replaceState(null, '', url);
  }
  // ค่าจากที่อยู่หน้าใส่ได้เฉพาะตัวเลือกที่มีอยู่จริง — ค่าแปลกปลอมถูกเมิน (ไม่ใช่ทำให้กรองเพี้ยน)
  function setSelect(id, v) {
    var el = $(id);
    if (!el || v == null) return;
    for (var i = 0; i < el.options.length; i++) if (el.options[i].value === v) { el.value = v; return; }
  }
  function applyUrl() {
    var p;
    try { p = new URLSearchParams(location.search); } catch (e) { return; }
    if (p.get('q')) $('f-q').value = p.get('q').slice(0, 120);
    ['type', 'province', 'deed', 'prop', 'floors', 'zone', 'score', 'sort'].forEach(function (k) { setSelect('f-' + k, p.get(k)); });
    ['pmin', 'pmax', 'amin', 'amax'].forEach(function (k) {
      var v = Number(p.get(k));
      if (isFinite(v) && v > 0) $('f-' + k).value = String(v);
    });
    (p.get('feat') || '').split(',').forEach(function (k) {
      if (FEATURES.indexOf(k) >= 0) $('f-feat-' + k).checked = true;
    });
    if (p.get('view') === 'map') view = 'map';
  }

  // ---------- มุมมองแผนที่ ----------
  // ใช้หมุดที่ทีมงานกดเลือกเองรายแปลง (land.pinLat/pinLng) ตัวเดียวกับหน้าแปลง — ตัวแสดงอยู่ใน listmap.js
  // ⚠️ ปุ่มสลับขึ้นเฉพาะเมื่อมีแปลงปักหมุดอย่างน้อย 1 แปลง — แผนที่ว่างเปล่าอ่านเหมือนเว็บพัง
  var view = 'list';
  var mapView = null;
  function paintView(list) {
    var btn = $('ls-view'), grid = $('listing-grid'), box = $('ls-map');
    var LM = window.NJListMap;
    var canMap = !!(LM && state.loaded && state.listings.some(LM.hasPin));
    if (btn) btn.hidden = !canMap;
    var isMap = canMap && view === 'map';
    if (btn) {
      btn.setAttribute('aria-pressed', isMap ? 'true' : 'false');
      // คำนำ "ดูบน/ดูแบบ" ซ่อนบนจอแคบ (listings.css) ให้แถวผลลัพธ์อยู่บรรทัดเดียว · ข้อความคงที่ ไม่มีค่าจากผู้ใช้
      var vt = $('ls-view-t'), vh = isMap ? '<span class="ls-v-pre">ดูแบบ</span>รายการ' : '<span class="ls-v-pre">ดูบน</span>แผนที่';
      if (vt && vt.innerHTML !== vh) vt.innerHTML = vh;
    }
    if (box) box.hidden = !isMap;
    if (grid) grid.hidden = isMap;
    if (!isMap) return;
    if (!mapView) {
      mapView = LM.mount(box, { onList: function () { view = 'list'; render(); } });
      NJL.bindGrid(box, 'listings_map');
    }
    mapView.update(list);
  }

  // ข้อความกำกับคะแนน — ขึ้นเมื่อกรองหรือเรียงด้วยคะแนน · ผลว่าง (ตอนกรอง) = บอกว่าคะแนนต่ำเป็นเรื่องปกติ + ปุ่มล้างเฉพาะตัวกรองนี้
  // ⚠️ อยู่นอก #listing-grid (compare.js เฝ้าตะแกรง) และเทียบค่าเดิมก่อนเขียนเสมอ (กับดัก MutationObserver)
  function paintScoreNote(f, n) {
    var box = $('score-note'), t = $('score-note-t'), btn = $('score-clear');
    if (!box || !t) return;
    var on = state.loaded && (f.score !== 'all' || f.sort === 'score_desc');
    var empty = on && f.score !== 'all' && n === 0;
    box.hidden = !on;
    box.classList.toggle('is-empty', empty);
    setText(t, !on ? '' : empty
      ? 'ยังไม่มีแปลงที่ข้อมูลพร้อมตั้งแต่ ' + f.score + ' คะแนนขึ้นไปตามเงื่อนไขนี้ — ' + SCORE_EMPTY + ' · ' + SCORE_NOTE
      : 'ℹ️ ' + SCORE_NOTE);
    if (btn) btn.hidden = !empty;
  }

  function render() {
    var f = readFilters();
    syncPriceLabels(f.type);
    var r = apply(f);
    var grid = $('listing-grid');
    var anyFilter = !!(f.q || f.type !== 'all' || f.province !== 'all' || f.pmin || f.pmax ||
      f.amin || f.amax || f.deed !== 'all' || f.zone !== 'all' || f.feats.length ||
      f.prop !== 'all' || f.floors !== 'all' || f.score !== 'all');

    $('result-note').textContent = state.loaded
      ? ('พบ ' + r.list.length + ' แปลง' + (anyFilter ? ' จากทั้งหมด ' + state.listings.length + ' แปลง' : ''))
      : '';
    paintChips(f);
    var al = $('ls-alert'); if (al) { var h = alertHref(f); if (al.getAttribute('href') !== h) al.setAttribute('href', h); }
    // ปุ่มท้ายแผงตัวกรองบอกจำนวนที่จะได้ก่อนปิดแผง — ไม่ต้องปิดไปดูแล้วเปิดใหม่
    if (state.loaded) setText($('f-apply'), 'แสดง ' + r.list.length + ' แปลง');
    if (state.loaded) syncUrl(f);
    paintView(r.list);

    var un = $('unknown-note');
    if (r.hiddenUnknown > 0) {
      un.hidden = false;
      un.textContent = 'อีก ' + r.hiddenUnknown + ' แปลงไม่ได้แสดง เพราะยังไม่ได้ระบุข้อมูลในช่องที่คุณกรอง — ' +
        'ไม่ได้แปลว่าแปลงนั้นไม่ตรงเงื่อนไข ทักไลน์ถามทีมงานได้เลย';
    } else { un.hidden = true; un.textContent = ''; }

    paintScoreNote(f, r.list.length);

    // ข้อความกำกับป้ายประกาศเด่น — ขึ้นเฉพาะเมื่อมีประกาศเด่นอยู่ในผลลัพธ์
    var fn = $('featured-note');
    if (fn) {
      var nf = r.list.filter(function (x) { return x.featured; }).length;
      fn.hidden = !nf;
      fn.textContent = nf ? ('★ ' + ((window.NJLandMeta && NJLandMeta.FEATURED_NOTE) || '')) : '';
    }
    if (!r.list.length) { grid.innerHTML = NJL.emptyHtml(state.loaded && state.listings.length > 0); return; }
    grid.innerHTML = r.list.map(NJL.card).join('');
  }

  function fillSelect(el, pairs, allLabel) {
    el.innerHTML = '<option value="all">' + allLabel + '</option>' +
      pairs.map(function (p) { return '<option value="' + NJL.esc(p[0]) + '">' + NJL.esc(p[1]) + '</option>'; }).join('');
  }

  function buildControls() {
    fillSelect($('f-deed'), Object.keys(DEED_TH).map(function (k) { return [k, DEED_TH[k]]; }), 'ไม่เกี่ยง');
    // ประเภททรัพย์ — เติมต่อท้ายตัวเลือก 2 อันแรกที่ประกาศไว้ใน HTML (ไม่เกี่ยง / มีสิ่งปลูกสร้างทุกแบบ)
    // ⚠️ buildControls() ถูกเรียกซ้ำทุกครั้งที่กด "ล้างตัวกรอง" — ต้องล้างของเก่าก่อนเสมอ
    // ไม่งั้นรายการจะงอกทบขึ้นเรื่อยๆ ทุกครั้งที่กด (เจอจริงบนเว็บจริง 9 → 16 ตัวเลือก)
    var prop = $('f-prop');
    while (prop.options.length > 2) prop.remove(2);
    var PROP_TH = (window.NJVocab && window.NJVocab.PROPERTY_TH) || {};
    Object.keys(PROP_TH).forEach(function (k) {
      var o = document.createElement('option'); o.value = k; o.textContent = PROP_TH[k];
      prop.appendChild(o);
    });
    fillSelect($('f-zone'), [['checked', 'ตรวจผังสีแล้ว (ทุกสี)']].concat(Object.keys(ZONE_TH).map(function (k) { return [k, ZONE_TH[k]]; })), 'ไม่เกี่ยง');
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

  // ---------- บล็อกลิงก์ค้นหาท้ายหน้า: ตามจังหวัด · อำเภอ/เขต · ประเภททรัพย์ · ผังสี (10 ต.ค. 69 · แบบ DDproperty) ----------
  // ⚠️ สร้างจาก "แปลงที่ประกาศอยู่จริง" พร้อมจำนวนเสมอ — ไม่มีรายชื่อพิมพ์ไว้ในไฟล์ (กติกาเดียวกับ fillProvinces)
  //    ช่องว่าง = ยังไม่ได้กรอก → ไม่นับ ไม่เดา · ไม่มีกลุ่มไหนมีของเลย = ซ่อนทั้งบล็อก
  // ⚠️ ลิงก์เป็น listings.html?… (canonical คงที่) ไม่ใช่หน้าจังหวัดใหม่ — หน้าพื้นที่เกิดจากแอดมินกดเผยแพร่เท่านั้น
  // อำเภอ/เขตใช้ชื่อตามที่กรอกไว้ ไม่เติม "อำเภอ"/"เขต" เอง (กทม.กับต่างจังหวัดใช้คำต่างกัน · กติกาเดียวกับ build/locations.js)
  var SEO_AMPHOE_MAX = 12;
  function seoGroups() {
    var by = function () { return {}; };
    var prov = by(), amp = by(), prop = by(), zone = by(), types = by();
    state.listings.forEach(function (x) {
      var L = landOf(x);
      types[x.type] = (types[x.type] || 0) + 1;
      if (L.province) {
        var p = prov[L.province] || (prov[L.province] = { n: 0, rent: 0, rentLand: 0 });
        p.n++; if (x.type === 'rent') { p.rent++; if (L.propertyType === 'land') p.rentLand++; }
        if (L.amphoe) { var ka = L.amphoe + '\u0000' + L.province; amp[ka] = (amp[ka] || 0) + 1; }
      }
      if (L.propertyType) prop[L.propertyType] = (prop[L.propertyType] || 0) + 1;
      if (L.zoneColor && ZONE_TH[L.zoneColor]) zone[L.zoneColor] = (zone[L.zoneColor] || 0) + 1;
    });
    var PT = (window.NJVocab && window.NJVocab.PROPERTY_TH) || {};
    var byCount = function (o) { return Object.keys(o).sort(function (a, b) { return (o[b].n || o[b]) - (o[a].n || o[a]) || a.localeCompare(b, 'th'); }); };
    var link = function (params, text, n) { return { href: 'listings.html?' + new URLSearchParams(params).toString(), text: text, n: n }; };
    var groups = [];
    var g = byCount(prov).map(function (k) {
      var p = prov[k];
      return link({ province: k }, (p.rent === 0 ? 'ประกาศขาย ' : p.rent === p.n ? 'ประกาศให้เช่า ' : 'ประกาศ ') + k, p.n);
    });
    if (g.length) groups.push({ h: 'ตามจังหวัด', items: g });
    g = byCount(amp).slice(0, SEO_AMPHOE_MAX).map(function (k) {
      var a = k.split('\u0000');
      return link({ q: a[0] }, a[0] + ' · ' + a[1], amp[k]);
    });
    if (g.length) groups.push({ h: 'ตามอำเภอ/เขต', items: g });
    g = byCount(prop).filter(function (k) { return PT[k]; }).map(function (k) { return link({ prop: k }, PT[k], prop[k]); });
    if (g.length) groups.push({ h: 'ตามประเภททรัพย์', items: g });
    g = byCount(zone).map(function (k) { return link({ zone: k }, zoneLabel(k), zone[k]); });
    if (g.length) groups.push({ h: 'ตามผังสี (ที่ทีมตรวจผังแล้ว)', items: g });
    // ขาย/เช่า — ขึ้นเมื่อมีประกาศให้เช่าจริงเท่านั้น (ตอนนี้มีแต่ขาย ลิงก์ "ให้เช่า" จะพาไปผลว่าง)
    if (types.rent) {
      g = [link({ type: 'sell' }, 'ประกาศขาย', types.sell || 0), link({ type: 'rent' }, 'ประกาศให้เช่า', types.rent)].filter(function (x) { return x.n > 0; });
      // เช่าตามจังหวัด (11 ต.ค. 69) — เฉพาะจังหวัดที่มีประกาศเช่าจริง · "เช่าที่ดิน" เฉพาะเมื่อประกาศเช่าในจังหวัดนั้นเป็นที่ดินเปล่าทุกใบ
      //   (ประเภทว่าง = ยังไม่ได้ระบุ ห้ามเรียกว่าที่ดิน) · ลิงก์ listings.html?type=rent&province=… ไม่สร้างหน้าใหม่
      byCount(prov).filter(function (k) { return prov[k].rent > 0; }).forEach(function (k) {
        var p = prov[k];
        g.push(link({ type: 'rent', province: k }, (p.rentLand === p.rent ? 'เช่าที่ดิน ' : 'ประกาศให้เช่า ') + k, p.rent));
      });
      groups.push({ h: 'ขายหรือให้เช่า', items: g });
    }
    return groups;
  }
  function paintSeo() {
    var box = $('ls-seo-live');
    if (!box) return;
    var groups = state.loaded ? seoGroups() : [];
    box.hidden = !groups.length;
    var html = groups.map(function (gr) {
      return '<div class="ls-seo-col"><h3>' + NJL.esc(gr.h) + '</h3><ul>' + gr.items.map(function (it) {
        return '<li><a href="' + NJL.esc(it.href) + '" data-ls-seo>' + NJL.esc(it.text) + ' <span class="ls-seo-n">(' + it.n + ')</span></a></li>';
      }).join('') + '</ul></div>';
    }).join('');
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  function load() {
    NJL.fetchListings()
      .then(function (list) {
        state.listings = list;
        state.loaded = true;
        fillProvinces();
        // ตัวกรองจากที่อยู่หน้า (?q= จากหน้าแปลง · ลิงก์ที่แชร์มา) — ต้องหลัง fillProvinces เพราะรายชื่อจังหวัดมาจากข้อมูล
        applyUrl();
        render();
        paintSeo();
      })
      .catch(function () {
        // โหลดไม่ได้ ≠ ไม่มีแปลง — สองกรณีนี้ห้ามแสดงเหมือนกัน
        state.loaded = false;
        $('listing-grid').innerHTML = NJL.loadFailedHtml();
      });
  }

  function savedBoxRef(){ return $('f-saved'); }

  buildControls();

  function submitSearch(e) {
    e.preventDefault();
    render();
    var f = readFilters();
    if (window.njTrack) window.njTrack('Search', { search_string: f.q, content_category: f.province });
  }
  $('ls-form').addEventListener('submit', submitSearch);
  // ช่องคำค้นย้ายมาอยู่แถวบนสุด (ฟอร์มของตัวเอง) — กด Enter/ปุ่มค้นหา = ค้นเหมือนเดิม
  if ($('ls-qform')) $('ls-qform').addEventListener('submit', submitSearch);
  // พิมพ์แล้วกรองตามทันที (หน่วงไว้นิดหนึ่ง) · ไม่ยิงสถิติ Search ทุกตัวอักษร — ยิงตอนกดค้นหาเท่านั้น
  var qTimer = 0;
  $('f-q').addEventListener('input', function () { clearTimeout(qTimer); qTimer = setTimeout(render, 250); });
  // ช่องตัวเลขในแผง (ราคา/เนื้อที่) อัปเดตจำนวนบนปุ่ม "แสดง n แปลง" ระหว่างพิมพ์ — ผู้ใช้รู้ผลก่อนปิดแผง
  var numTimer = 0;
  ['f-pmin', 'f-pmax', 'f-amin', 'f-amax'].forEach(function (id) {
    $(id).addEventListener('input', function () { clearTimeout(numTimer); numTimer = setTimeout(render, 300); });
  });
  // ช่องเลือก (ไม่ใช่ช่องพิมพ์) กรองทันทีที่เปลี่ยน — ไม่ต้องกดค้นหาซ้ำ
  // ⚠️ นับ "มีคนใช้ตัวกรอง" ครั้งเดียวต่อการเปลี่ยนหนึ่งครั้ง และหน่วงไว้ก่อน
  //    ไม่หน่วง = คนเลื่อนดรอปดาวน์ผ่านหลายตัวเลือกกลายเป็นสิบครั้งใน 2 วินาที
  var filterTimer = 0;
  function trackFilter() {
    if (!window.njTrackInternal) return;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(function () { njTrackInternal('filter_property'); }, 900);
  }
  ['f-type', 'f-province', 'f-deed', 'f-zone', 'f-sort', 'f-prop', 'f-floors', 'f-score'].forEach(function (id) {
    $(id).addEventListener('change', function () { render(); trackFilter(); });
  });
  $('f-features').addEventListener('change', function () { render(); trackFilter(); });
  // ⚠️ คำค้นกับการเรียงอยู่นอกฟอร์มแล้ว form.reset() ไม่ถึง — ล้างเองให้ได้ผลเหมือนปุ่มเดิมทุกอย่าง
  function resetAll() {
    $('ls-form').reset();
    $('f-q').value = '';
    $('f-sort').value = 'new';
    if (savedBoxRef()) savedBoxRef().checked = false;
    buildControls();
    fillProvinces();
    render();
  }
  $('f-reset').addEventListener('click', resetAll);
  // ผลว่างจากตัวกรองคะแนน — ล้างเฉพาะตัวกรองนี้ ตัวกรองอื่นที่ผู้ใช้ตั้งไว้ยังอยู่
  if ($('score-clear')) $('score-clear').addEventListener('click', function () {
    $('f-score').value = 'all';
    render();
    trackFilter();
  });
  if ($('ls-clear')) $('ls-clear').addEventListener('click', resetAll);

  // ลิงก์ในบล็อกท้ายหน้า = ค้นใหม่ด้วยเงื่อนไขนั้นตัวเดียว · กรองในหน้าทันทีไม่โหลดหน้าใหม่
  // (href ยังเป็นที่อยู่จริง — เปิดแท็บใหม่/บอต/JS พังก็ยังได้ผลเดียวกันผ่าน applyUrl)
  if ($('ls-seo-live')) $('ls-seo-live').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-ls-seo]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0 || !window.history || !history.replaceState) return;
    e.preventDefault();
    resetAll();
    history.replaceState(null, '', location.pathname + a.search);
    applyUrl();
    render();
    trackFilter();
    // เลื่อนกลับไปแถวค้นหา — เว้นที่ให้หัวเว็บแบบติดหนึบ (scrollIntoView จะพาไปซ่อนใต้หัวเว็บ)
    var top = $('ls-qform') || $('listing-grid');
    if (top) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.pageYOffset - 88) });
  });

  // ---------- สวิตช์รายการ/แผนที่ ----------
  if ($('ls-view')) $('ls-view').addEventListener('click', function () {
    view = view === 'map' ? 'list' : 'map';
    render();
    var box = $('ls-map');
    if (view === 'map' && box && box.scrollIntoView) box.scrollIntoView({ block: 'nearest' });
  });

  // ---------- ตัวกรอง "เฉพาะที่บันทึกไว้" ----------
  var savedBox = $('f-saved');
  function paintSavedCount() {
    var el = $('f-saved-n');
    if (!el || !window.NJSave) return;
    var n = NJSave.count();
    var txt = n ? '(' + n + ')' : '';
    if (el.textContent !== txt) el.textContent = txt;   // เทียบก่อนเขียน (กับดัก MutationObserver)
  }
  if (savedBox) savedBox.addEventListener('change', render);
  if (window.NJSave) {
    paintSavedCount();
    // กดบันทึก/เอาออกจากการ์ด แล้วตัวเลขกับผลกรองต้องตามทันที
    NJSave.onChange(function () {
      paintSavedCount();
      if (savedBox && savedBox.checked) render();
    });
  }

  // ---------- แผงตัวกรองแบบหน้าต่าง: มือถือ = Bottom Sheet (งานที่ 4) · จอคอม = แผงข้างขวา (10 ต.ค. 69) ----------
  //
  // ⚠️ **ซ่อนแผงด้วยคลาสที่ JS เป็นคนใส่ (`ls-js`) ไม่ใช่ซ่อนไว้ใน CSS ตั้งแต่แรก**
  //    ไฟล์ JS โหลดไม่สำเร็จเมื่อไหร่ ต้องเหลือแผงตัวกรองที่กางอยู่ใช้งานได้ตามปกติ
  //    ไม่ใช่แผงที่ถูกซ่อนแล้วไม่มีปุ่มไหนเปิดได้เลย (กติกาเดียวกับ njintro.js)
  //    แถบชิปก็ซ่อนไว้ใน HTML (`hidden`) แล้ว JS เป็นคนเปิด — ชิปที่กดแล้วไม่มีอะไรเกิดขึ้นแย่กว่าไม่มีชิป
  (function () {
    var form = $('ls-form'), openBtn = $('ls-open'), closeBtn = $('ls-close'), back = $('ls-backdrop');
    var chips = $('ls-chips');
    if (!form || !openBtn) return;
    document.body.classList.add('ls-js');
    if (chips) chips.hidden = false;
    // เป็นหน้าต่างเฉพาะตอน JS ทำงาน — ตอนไม่มี JS มันคือฟอร์มธรรมดาในหน้า ห้ามประกาศเป็น dialog
    form.setAttribute('role', 'dialog');
    form.setAttribute('aria-modal', 'true');
    var opener = openBtn;
    function isOpen() { return document.documentElement.classList.contains('ls-sheet-open'); }
    function set(on, focusId, from) {
      document.documentElement.classList.toggle('ls-sheet-open', on);
      openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (back) back.hidden = !on;
      if (on) {
        opener = from || openBtn;
        var f = (focusId && $(focusId)) || form.querySelector('input,select,button');
        if (f) f.focus();
      } else if (opener && opener.focus) opener.focus();
    }
    openBtn.addEventListener('click', function () { set(true, null, openBtn); });
    // ชิป = เปิดแผงชุดเดิมแล้วพาไปที่ช่องนั้นเลย (ไม่ต้องเลื่อนหา)
    if (chips) chips.addEventListener('click', function (e) {
      var c = e.target.closest('[data-chip]');
      if (c) set(true, CHIP_FOCUS[c.getAttribute('data-chip')], c);
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { set(false); });
    if (back) back.addEventListener('click', function () { set(false); });
    // กดค้นหา/แสดงผล = ปิดแผงแล้วดูผลทันที — ไม่งั้นแผงบังผลที่เพิ่งกรอง
    form.addEventListener('submit', function () { set(false); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { set(false); return; }
      // ขังโฟกัสไว้ในแผง — ประกาศ aria-modal เฉยๆ เบราว์เซอร์ไม่กันให้ (กติกาเดียวกับลิ้นชักเมนู)
      if (e.key !== 'Tab') return;
      var els = [].filter.call(form.querySelectorAll('button,input,select,a[href]'), function (el) {
        return !el.disabled && el.offsetParent !== null;
      });
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  })();

  NJL.bindGrid($('listing-grid'), 'listings_page');
  $('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
  load();
  if (window.njTrackInternal) window.njTrackInternal('pageview');
})();
