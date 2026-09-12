(function () {
  'use strict';
  // เช็กราคางานรังวัดออนไลน์ บนหน้าเว็บสาธารณะ
  //
  // ⚠️ ตารางราคา "ไม่ได้ก๊อปมาไว้ที่นี่" โดยตั้งใจ
  //    โหลด pricing.js จากเซิร์ฟเวอร์ njsurvey ตรงๆ ซึ่งเป็นไฟล์เดียวกับที่ระบบหลังบ้าน
  //    ใช้ออกใบเสนอราคาจริง (แปลงมาจาก NJ_Group_ใบเสนอราคา_A4_Online_2026.xlsx)
  //    ถ้าก๊อปตารางมาไว้ในเว็บนี้ วันหนึ่งบริษัทขึ้นราคาแล้วลืมแก้ 2 ที่ ลูกค้าจะเห็นราคาเก่า
  //    แล้วทีมขายต้องไปแจ้งราคาใหม่ทีหลัง — เสียความน่าเชื่อถือมากกว่าประโยชน์ที่ได้
  //    โหลดไม่ได้ = ไม่แสดงราคาเลย แล้วให้ทักไลน์แทน ห้าม fallback เป็นตัวเลขที่เดาเอง
  //
  // ⚠️ ราคาที่แสดงเป็น "ประมาณการ" ไม่ใช่ใบเสนอราคา
  //    ราคาจริงขึ้นกับหน้างาน (ระยะทาง สภาพพื้นที่ จำนวนหมุด ฯลฯ) ซึ่งเว็บไม่รู้
  //    จึงต้องเขียนกำกับไว้ทุกครั้ง และให้ทีมขายเป็นคนยืนยัน

  var PRICING_URL = 'https://app.njteedinsure.com/pricing.js';
  var LINE = 'https://line.me/R/ti/p/@716lffzt';

  // ตัวเลือกเสริมที่ "ไม่ได้อยู่ในตารางราคาหลัก" — ส่งเข้า computeQuote ทาง fees
  // เพื่อให้ราคาตั้งต้นยังตรงกับตารางของบริษัทเป๊ะ ไม่ไปปนกัน
  // ⚠️ ไม่มี "รายงานรังวัดที่ดิน" เป็นรายการเสียเงินที่นี่โดยตั้งใจ (เจ้าของยืนยัน 2026-08-30)
  //    ตารางราคาของบริษัทรวม Report ไว้ในราคาตั้งต้นอยู่แล้ว (ดู includedService ที่ pricing.js คืนมา)
  //    ถ้าเอามาคิดเพิ่มอีก 3,000 ลูกค้าจะจ่ายค่ารายงานสองรอบ
  var ADDONS = [
    { key: 'care', label: 'แพ็กเกจดูแลหลังการรังวัด 1 ปี', price: 5000,
      desc: 'ปรึกษาเรื่องหลักเขต ข้อพิพาทแนวเขต และไกล่เกลี่ยกับที่ดินข้างเคียง' }
  ];
  var COMBO_RATE = 0.05;   // รังวัด + ฝากขาย ลด 5%

  var JOBS = [
    { v: 'สอบเขต',      label: 'รังวัดสอบเขต',        hint: 'ยืนยันแนวเขตและเนื้อที่จริง' },
    { v: 'รวม-แบ่งแยก', label: 'แบ่งแยกโฉนด',         hint: 'แยกแปลงออกเป็นหลายโฉนด' },
    { v: 'รวมโฉนด',     label: 'รวมโฉนด',             hint: 'รวมหลายแปลงเป็นโฉนดเดียว' }
  ];

  // ---------------------------------------------------------------------------
  // แปลงเนื้อที่ ไร่-งาน-ตร.ว. เป็นไร่ทศนิยม — คัดลอกสูตรจาก njsurvey ให้ตรงกันเป๊ะ
  //   waFromArea(rai,ngan,wa) = rai*400 + ngan*100 + wa   (public/app.js:19)
  //   quoteRai = totalWa / 400                            (public/app.js:10436)
  //   raiTxt   = toFixed(4) แล้วตัดศูนย์ท้าย               (public/app.js:10437)
  // ตัวเลขไร่ที่ได้คือตัวที่เอาไปเทียบช่วงราคาในตาราง ถ้าคำนวณคนละแบบกับหลังบ้าน
  // ลูกค้าจะเห็นราคาคนละช่วงกับที่ทีมขายออกใบเสนอราคาให้ — ต้องตรงกันเท่านั้น
  var WA_PER_RAI = 400, WA_PER_NGAN = 100;
  function waFromArea(rai, ngan, wa) {
    return (Number(rai) || 0) * WA_PER_RAI + (Number(ngan) || 0) * WA_PER_NGAN + (Number(wa) || 0);
  }
  function raiTxt(n) {
    return Number(n || 0).toFixed(4).replace(/\.?0+$/, '') || '0';
  }

  var P = null;            // NJPricing เมื่อโหลดสำเร็จ
  var root, out, form;

  // ---------------------------------------------------------------------------
  // ตัวโหลดตารางราคา — แยกออกมาเป็นของกลาง เพราะตอนนี้มีสองหน้าที่ต้องใช้:
  //   1. กล่อง "เช็กราคางานรังวัด" บนหน้าแรก (ของเดิม)
  //   2. หน้าฝากขาย — ประเมินค่ารังวัดจากเนื้อที่ที่เจ้าของกรอกไว้แล้ว
  //
  // ⚠️ **แคช promise ไว้ตัวเดียว** (กติกาเดียวกับ NJFeeCalc.loadBuildingPrices)
  // สองส่วนบนหน้าเดียวกันเรียกพร้อมกันต้องยิงเน็ตครั้งเดียว ไม่ใช่โหลด pricing.js สองรอบ
  //
  // ⚠️ โหลดไม่สำเร็จต้อง reject **ห้าม fallback เป็นตัวเลขที่เดาเอง** — ตารางราคาอยู่ที่เดียว
  // คือระบบหลังบ้าน (ดูเหตุผลเต็มหัวไฟล์) ผู้เรียกต้องซ่อนราคาแล้วให้ทักไลน์แทน
  var pricingPromise = null;
  function loadPricing() {
    if (window.NJPricing) { P = window.NJPricing; return Promise.resolve(P); }
    if (pricingPromise) return pricingPromise;
    pricingPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PRICING_URL;
      s.async = true;
      s.onload = function () {
        P = window.NJPricing || null;
        if (P) resolve(P); else reject(new Error('โหลดตารางราคาไม่สำเร็จ'));
      };
      s.onerror = function () { P = null; reject(new Error('โหลดตารางราคาไม่สำเร็จ')); };
      document.head.appendChild(s);
    });
    return pricingPromise;
  }
  // ---------------------------------------------------------------------------
  // ค่าดำเนินการนอกพื้นที่ (โซนเดินทาง) — เพิ่ม 2026-09-08
  //
  // ⚠️ **ตารางโซนไม่ได้อยู่ที่นี่** เหมือนตารางราคา — อ่านจาก pricing.js ที่โหลดมาแล้วเท่านั้น
  //    (P.zoneOf · P.TRAVEL_ZONES · P.ZONE_PROVINCES) ก๊อปรายชื่อจังหวัดหรือค่าโซนมาไว้ฝั่งเว็บ
  //    เมื่อไหร่ = วันหนึ่งบริษัทขยับราคาโซนแล้วเว็บยังบอกราคาเก่า ซึ่งเป็นเงินหลักหมื่น
  //
  // ⚠️ **คืนพักต้องใช้ค่าเริ่มต้นชุดเดียวกับฟอร์มใบเสนอราคาในระบบหลังบ้าน**
  //    (travelNightsDefault() ใน nj-survey-system/public/app.js ตั้งคืนพัก = คืนที่แนะนำของโซนนั้น)
  //    ไม่ส่ง nights ไป computeTravel จะได้ 0 → เว็บบอกราคาต่ำกว่าใบเสนอราคาจริง 4,000–16,000 บาท
  //    แล้วลูกค้าจะมาเถียงกับเซลส์ด้วยตัวเลขที่เว็บของเราเองบอกไว้
  //
  // คืน null เมื่อยังไม่รู้จังหวัด หรือจังหวัดนั้นอยู่โซน A (ในพื้นที่ ไม่มีค่าเดินทาง)
  // — ห้ามเดาโซนให้ (เดาผิดคือคิดเงินลูกค้าผิดตั้งแต่ตัวเลขแรกที่เขาเห็น)
  function travelInput(province) {
    if (!P || !P.zoneOf) return null;
    var p = String(province == null ? '' : province).trim();
    if (!p) return null;
    var code = P.zoneOf(p);
    if (!code) return null;
    var zi = null;
    (P.TRAVEL_ZONES || []).forEach(function (z) { if (z.code === code) zi = z; });
    return { province: p, zone: code, nights: zi ? zi.nights : 0 };
  }

  // ช่วงค่าเดินทาง "ต่ำสุด–สูงสุด" ไว้เขียนในคำเตือนตอนลูกค้ายังไม่เลือกจังหวัด
  // ⚠️ อ่านจากตารางจริงเสมอ ห้ามพิมพ์ตัวเลขลงในข้อความ — บริษัทขยับค่าโซนเมื่อไหร่
  //    ข้อความที่พิมพ์ไว้จะกลายเป็นคำโฆษณาที่ผิดโดยไม่มีใครสังเกต (กับดักเดิมของโปรเจกต์นี้)
  function travelRangeText() {
    if (!P || !P.TRAVEL_ZONES) return '';
    var fees = P.TRAVEL_ZONES.map(function (z) { return Number(z.fee) || 0; }).filter(function (f) { return f > 0; });
    if (!fees.length) return '';
    return baht(Math.min.apply(null, fees)) + '–' + baht(Math.max.apply(null, fees)) + ' บาท';
  }

  // ⚠️ ส่วนลดคอมโบ 5% คิดจากยอดที่ **ไม่รวมค่าเดินทาง**
  //    กติกาเดียวกับส่วนลดลูกค้าเดิม 40% ใน pricing.js ที่จงใจกันค่าเดินทางออกจากฐานส่วนลด
  //    เพราะค่าโซนคือค่าน้ำมัน ค่าที่พัก และค่าเสียเวลาทีมบนถนน = เงินสดที่จ่ายออกจริง
  //    ลดจากยอดที่รวมค่าเดินทาง = แจกส่วนลดจากต้นทุนที่บริษัทจ่ายเอง (โซน G หายไป ~3,750/งาน)
  function comboBase(r) { return (Number(r.subtotal) || 0) - (Number(r.travelTotal) || 0); }

  // ประเมินค่ารังวัดจาก "เนื้อที่รวมเป็นตารางวา" — รูปแบบเดียวกับที่ฟอร์มฝากขายเก็บไว้แล้ว
  // opt.province = จังหวัดที่ตั้งแปลง (ไม่ส่งมา = ไม่คิดค่าเดินทาง ผู้เรียกต้องบอกผู้ใช้ว่ายังไม่รวม)
  // คืน null เมื่อยังไม่มีตารางราคา หรือยังไม่รู้เนื้อที่ — ผู้เรียกต้องซ่อนราคา ห้ามเดา
  function quoteFromWa(totalWa, jobType, opt) {
    if (!P) return null;
    var rai = Number(totalWa || 0) / WA_PER_RAI;
    if (!(rai > 0)) return null;
    var args = {
      jobType: JOBS.some(function (j) { return j.v === jobType; }) ? jobType : JOBS[0].v,
      rai: rai, deeds: 1, splitPlots: 0, vatRate: 0, fees: [],
      travel: travelInput(opt && opt.province)
    };
    if (!(opt && opt.combo)) return P.computeQuote(args);
    // คิดราคาก่อนส่วนลดเพื่อเอายอดมาคูณ 5% — ขั้นตอนเดียวกับกล่องเช็กราคาบนหน้าแรกเป๊ะ
    // (ผ่าน adjust ของ pricing.js ไม่ใช่ลบเอาเองทีหลัง ไม่งั้นบรรทัดแจกแจงจะไม่มีส่วนลดโผล่)
    var pre = P.computeQuote(args);
    var combo = -Math.round(comboBase(pre) * COMBO_RATE);
    var r = P.computeQuote(Object.assign({}, args, { adjust: combo }));
    r.combo = combo;
    r.beforeCombo = pre.subtotal;
    return r;
  }

  function baht(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function vals() {
    var v = {};
    root.querySelectorAll('[data-sq]').forEach(function (f) {
      var k = f.getAttribute('data-sq');
      // ประเภทงานเป็น radio 3 ตัวที่ใช้ data-sq เดียวกัน — ต้องเอาเฉพาะตัวที่ติ๊ก
      // ถ้าวนเขียนทับไปเรื่อยๆ จะได้ค่าของตัวสุดท้ายเสมอ (เคยพลาดตรงนี้มาแล้ว ราคาผิดประเภททุกครั้ง)
      if (f.type === 'radio') { if (f.checked) v[k] = f.value; return; }
      v[k] = f.type === 'checkbox' ? f.checked : f.value;
    });
    return v;
  }

  // ---------------------------------------------------------------------------
  function compute(v) {
    if (!P) return null;
    var totalWa = waFromArea(v.rai, v.ngan, v.wa);
    var rai = totalWa / WA_PER_RAI;
    var deeds = Math.max(0, Math.floor(Number(v.deeds) || 0));
    // ค่าแปลงแบ่งเพิ่มมีเฉพาะงานแบ่งแยก (pricing.js คิดให้เฉพาะ jobType นี้อยู่แล้ว)
    var splitPlots = v.jobType === 'รวม-แบ่งแยก' ? Math.max(0, Math.floor(Number(v.split) || 0)) : 0;
    if (!(rai > 0)) return null;

    var fees = [];
    ADDONS.forEach(function (a) { if (v[a.key]) fees.push({ label: a.label, amount: a.price }); });

    var args = {
      jobType: v.jobType, rai: rai, deeds: deeds, splitPlots: splitPlots, vatRate: 0, fees: fees,
      travel: travelInput(v.province)
    };
    // คิดราคาก่อนส่วนลดคอมโบ เพื่อเอายอดมาคำนวณ 5% (ฐานส่วนลดไม่รวมค่าเดินทาง — ดู comboBase)
    var pre = P.computeQuote(args);
    var combo = v.combo ? -Math.round(comboBase(pre) * COMBO_RATE) : 0;
    var r = P.computeQuote(Object.assign({}, args, { adjust: combo }));
    r.combo = combo;
    r.addons = fees;
    r.totalWa = totalWa;
    return r;
  }

  // ---------------------------------------------------------------------------
  // เติมรายชื่อจังหวัดลงช่องเลือก — ทำได้หลัง pricing.js โหลดเสร็จเท่านั้น
  // จัดกลุ่มตามโซนพร้อมบอกค่าโซนไว้ในหัวกลุ่ม เพื่อให้คำถาม "ทำไมของผมแพงกว่า" ตอบตัวเองได้
  // ไม่มีตารางราคา = ปล่อยช่องว่างไว้ ห้ามพิมพ์รายชื่อจังหวัดสำรองไว้ในไฟล์นี้
  var provincesFilled = false;
  function fillProvinces() {
    if (provincesFilled || !P || !P.ZONE_PROVINCES) return;
    var sel = root && root.querySelector('[data-sq="province"]');
    if (!sel) return;
    var html = '<option value="">— เลือกจังหวัดที่ตั้งแปลง —</option>';
    (P.TRAVEL_ZONES || []).forEach(function (z) {
      var list = (P.ZONE_PROVINCES[z.code] || []).slice().sort(function (a, b) { return a.localeCompare(b, 'th'); });
      if (!list.length) return;
      html += '<optgroup label="' + esc(z.label + ' · ' + z.km + ' · ' +
        (z.fee > 0 ? 'ค่าเดินทาง ' + baht(z.fee) : 'ไม่มีค่าเดินทาง')) + '">' +
        list.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('') +
        '</optgroup>';
    });
    sel.innerHTML = html;
    provincesFilled = true;
  }

  function resultHtml(r) {
    if (!P) {
      return '<div class="sq-msg">ตอนนี้ยังโหลดตารางราคาไม่ได้ ' +
        '<a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์ให้ทีมงานตีราคาให้ →</a></div>';
    }
    if (!r) return '<div class="sq-msg">กรอกเนื้อที่เป็นไร่ เพื่อดูราคาประมาณการ</div>';

    var rows = r.breakdown.map(function (b) {
      // pricing.js เรียกส่วนลดที่ส่งผ่าน adjust ว่า "ส่วนลดหน้างาน" ซึ่งเป็นคนละเรื่องกับคอมโบ
      // เปลี่ยนชื่อเฉพาะตอนแสดงผล ไม่แตะตัวเลข เพื่อให้ลูกค้าอ่านแล้วรู้ว่าส่วนลดนี้มาจากอะไร
      var label = (r.combo && b.amount === r.combo && /ส่วนลด/.test(b.label))
        ? 'ส่วนลดรังวัด + ฝากขาย 5%' : b.label;
      return '<div class="sq-row"><span>' + esc(label) + '</span><em>' +
        (b.amount < 0 ? '−' : '') + baht(Math.abs(b.amount)) + '</em></div>';
    }).join('');

    // ⚠️ ยังไม่เลือกจังหวัด = ยอดนี้ยังขาดค่าเดินทาง ต้องบอกตรงๆ ห้ามปล่อยให้อ่านเหมือนราคาครบแล้ว
    //    (ลูกค้าต่างจังหวัดที่เชื่อตัวเลขนี้แล้วมาเจอราคาจริง คือดีลที่พังตั้งแต่ยังไม่เริ่ม)
    var tv = r.travel;
    var travelNote = !tv
      ? '<div class="sq-warn"><b>ยังไม่ได้เลือกจังหวัด</b> — ราคานี้<b>ยังไม่รวมค่าดำเนินการนอกพื้นที่</b>' +
        (travelRangeText() ? ' ซึ่งอยู่ระหว่าง ' + travelRangeText() + 'ตามระยะทางจากสำนักงาน' : '') +
        ' เลือกจังหวัดด้านซ้ายเพื่อดูราคาที่ใกล้เคียงของจริง</div>'
      : '';

    return rows +
      '<div class="sq-row sq-total"><span>ราคาประมาณการ</span><em>' + baht(r.subtotal) + '</em></div>' +
      travelNote +
      '<div class="sq-inc">ราคานี้รวม <b>' + esc(r.includedService) + '</b> · ช่วงพื้นที่ ' + esc(r.rangeLabel) +
        (/Service/.test(r.includedService)
          ? '<br><i>งานขนาดนี้มีบริการดูแลหลังรังวัด 1 ปีรวมอยู่แล้ว ไม่ต้องซื้อเพิ่ม</i>' : '') +
        (tv && tv.nights > 0
          ? '<br><i>โซนนี้ทีมงานต้องค้างคืน ' + tv.nights + ' คืน ค่าที่พักและเบี้ยเลี้ยงทีมงานรวมอยู่ในยอดข้างบนแล้ว</i>' : '') + '</div>' +
      '<p class="sq-note"><b>เป็นราคาประมาณการ ไม่ใช่ใบเสนอราคา</b> — ราคาจริงขึ้นกับหน้างาน ' +
      'เช่น สภาพพื้นที่ จำนวนหมุด จำนวนเที่ยวที่ต้องลงพื้นที่ และคิวสำนักงานที่ดิน ซึ่งต้องให้ทีมช่างรังวัดประเมินก่อน ' +
      (tv ? 'ค่าดำเนินการนอกพื้นที่คิดเป็นขั้นตามระยะทางของจังหวัด ไม่ได้วัดจากที่ตั้งแปลงจริง จึงอาจปรับได้ตอนประเมิน · ' : '') +
      'ยังไม่รวม VAT และค่าธรรมเนียมที่ต้องจ่ายให้สำนักงานที่ดิน</p>';
  }

  // ---------------------------------------------------------------------------
  function render() {
    fillProvinces();          // ต้องมาก่อน vals() ไม่งั้นรอบแรกหลังโหลดตารางราคาจะยังอ่านจังหวัดไม่ได้
    var v = vals();
    var r = compute(v);
    out.innerHTML = resultHtml(r);

    // ยอดรวมเนื้อที่ แสดงแบบเดียวกับหน้าใบเสนอราคาในระบบ
    var sum = root.querySelector('[data-sq-sum]');
    if (sum) {
      var wa = waFromArea(v.rai, v.ngan, v.wa);
      sum.innerHTML = wa > 0
        ? 'รวมเนื้อที่ทั้งหมด <b>' + raiTxt(wa / WA_PER_RAI) + ' ไร่</b> ' +
          '<i>(' + baht(wa) + ' ตร.ว. · ใช้เทียบช่วงราคาในตาราง)</i>'
        : '';
    }

    // ค่าแปลงแบ่งเพิ่มมีเฉพาะงานแบ่งแยก จึงโชว์ช่องเฉพาะตอนนั้น
    var sw = root.querySelector('[data-sq-splitwrap]');
    if (sw) sw.hidden = v.jobType !== 'รวม-แบ่งแยก';
  }

  function markup() {
    var jobs = JOBS.map(function (j, i) {
      return '<label class="sq-job"><input type="radio" name="sqjob" data-sq="jobType" value="' + esc(j.v) + '"' +
        (i === 0 ? ' checked' : '') + '><span><b>' + esc(j.label) + '</b><i>' + esc(j.hint) + '</i></span></label>';
    }).join('');
    var addons = ADDONS.map(function (a) {
      return '<label class="sq-add"><input type="checkbox" data-sq="' + a.key + '">' +
        '<span><b>' + esc(a.label) + ' <em>+' + baht(a.price) + '</em></b><i>' + esc(a.desc) + '</i></span></label>';
    }).join('');

    return '' +
      '<div class="sq-head">' +
        '<div><b>เช็กราคางานรังวัดออนไลน์</b>' +
        '<span>ราคาจากตารางเดียวกับที่เราใช้ออกใบเสนอราคาจริง กรอก 3 ช่องก็รู้ราคาทันที</span></div>' +
        '<button type="button" class="sq-close" data-sq-close aria-label="ปิด">✕</button>' +
      '</div>' +

      '<div class="sq-body">' +
        '<div class="sq-left">' +
          '<div class="sq-lbl">ต้องการงานแบบไหน</div>' +
          '<div class="sq-jobs">' + jobs + '</div>' +
          '<div class="sq-lbl">เนื้อที่</div>' +
          '<div class="sq-area">' +
            '<label class="sq-field">ไร่<input type="text" inputmode="numeric" data-sq="rai" placeholder="0"></label>' +
            '<label class="sq-field">งาน<input type="text" inputmode="numeric" data-sq="ngan" placeholder="0"></label>' +
            '<label class="sq-field">ตร.ว.<input type="text" inputmode="decimal" data-sq="wa" placeholder="0"></label>' +
          '</div>' +
          '<div class="sq-sum" data-sq-sum></div>' +
          // ⚠️ จังหวัดไม่ใช่ช่องเสริม — ค่าดำเนินการนอกพื้นที่สูงถึง 75,000 บาท
          //    ไม่ถามจังหวัด = เว็บบอกราคาที่ขาดค่าเดินทางทั้งก้อนให้ลูกค้าต่างจังหวัด
          //    (เป็นอาการที่เกิดจริงตั้งแต่ 8 ก.ย. 2569 ที่โซนเดินทางขึ้นระบบหลังบ้าน)
          //    ตัวเลือกถูกเติมโดย fillProvinces() หลัง pricing.js โหลดเสร็จ
          '<label class="sq-field sq-prov">จังหวัดที่ตั้งแปลง' +
            '<select data-sq="province"><option value="">กำลังโหลดรายชื่อจังหวัด…</option></select></label>' +
          '<div class="sq-grid">' +
            '<label class="sq-field">จำนวนโฉนด' +
              '<input type="number" min="0" max="50" step="1" data-sq="deeds" value="1"></label>' +
            '<label class="sq-field" data-sq-splitwrap hidden>จำนวนแปลงแบ่งเพิ่ม' +
              '<input type="number" min="0" max="50" step="1" data-sq="split" value="0"></label>' +
          '</div>' +
          '<div class="sq-lbl">เพิ่มเติม (เลือกหรือไม่เลือกก็ได้)</div>' +
          addons +
          '<label class="sq-add sq-combo"><input type="checkbox" data-sq="combo">' +
            '<span><b>รังวัดที่ดิน + ฝากขายที่ดิน <em>ลด 5%</em></b>' +
            '<i>ให้เราดูแลตั้งแต่รังวัดจนขายจบในทีมเดียว</i></span></label>' +
        '</div>' +

        '<div class="sq-right">' +
          '<div class="sq-out" data-sq-out></div>' +
          '<div class="sq-cta">' +
            '<div class="sq-cta-h">ให้ทีมงานตีราคาจริงให้ฟรี</div>' +
            '<p class="sq-cta-p">ส่งข้อมูลไว้ ทีมช่างรังวัดจะติดต่อกลับพร้อมราคาจริงและคิวที่ว่าง</p>' +
            '<div class="sq-grid">' +
              '<label class="sq-field">ชื่อผู้ติดต่อ<input type="text" data-sq="name" placeholder="ชื่อ–นามสกุล"></label>' +
              '<label class="sq-field">เบอร์โทร<input type="tel" inputmode="tel" data-sq="phone" placeholder="08x-xxx-xxxx"></label>' +
            '</div>' +
            '<label class="sq-field">ที่ตั้งแปลง (ถ้าทราบ)' +
              '<input type="text" data-sq="place" placeholder="เช่น ต.หนองแซง อ.หนองแซง จ.สระบุรี"></label>' +
            // honeypot — ซ่อนจากคนจริง บอทที่กรอกทุกช่องจะติดกับ (ฝั่งเซิร์ฟเวอร์เช็กช่องนี้อยู่แล้ว)
            '<input type="text" data-sq="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="sq-hp">' +
            '<button type="button" class="sq-send" data-sq-send>ส่งให้ทีมงานตีราคาให้</button>' +
            '<div class="sq-sent" data-sq-sent hidden></div>' +
            '<div class="sq-or">หรือ <a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์คุยกับช่างรังวัดโดยตรง</a></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ---------------------------------------------------------------------------
  function send(btn) {
    var v = vals();
    var sent = root.querySelector('[data-sq-sent]');
    var name = String(v.name || '').trim();
    var phone = String(v.phone || '').trim();

    if (!name || phone.replace(/\D/g, '').length < 9) {
      sent.hidden = false;
      sent.className = 'sq-sent bad';
      sent.textContent = 'กรุณากรอกชื่อและเบอร์โทรให้ครบก่อนส่ง';
      return;
    }

    var r = compute(v);
    // สรุปสิ่งที่ลูกค้าเลือก ส่งไปเป็นบันทึกให้ทีมขายเห็นครบโดยไม่ต้องถามซ้ำ
    var lines = ['ลีดจากเครื่องเช็กราคารังวัดออนไลน์'];
    lines.push('ประเภทงาน: ' + (v.jobType || 'สอบเขต'));
    var waSum = waFromArea(v.rai, v.ngan, v.wa);
    if (waSum > 0) {
      lines.push('เนื้อที่ที่ลูกค้าแจ้ง: ' + (Number(v.rai) || 0) + '-' + (Number(v.ngan) || 0) + '-' +
                 (Number(v.wa) || 0) + ' ไร่ (' + raiTxt(waSum / WA_PER_RAI) + ' ไร่ · ' + baht(waSum) + ' ตร.ว.)');
    }
    lines.push('จำนวนโฉนด: ' + (Number(v.deeds) || 0));
    if (v.jobType === 'รวม-แบ่งแยก' && Number(v.split) > 0) {
      lines.push('จำนวนแปลงแบ่งเพิ่ม: ' + Number(v.split) + ' แปลง');
    }
    ADDONS.forEach(function (a) { if (v[a.key]) lines.push('เลือกเพิ่ม: ' + a.label + ' (+' + baht(a.price) + ')'); });
    if (v.combo) lines.push('เลือก: รังวัด + ฝากขาย (ลด 5%)');
    // โซนเดินทางที่ลูกค้าเห็นตอนกดคำนวณ — เซลส์ต้องรู้ว่าเขาเห็นตัวเลขไหนไปแล้ว
    // ไม่งั้นออกใบเสนอราคาด้วยโซนอื่นแล้วลูกค้าถามว่าทำไมไม่ตรงกับที่เว็บบอก
    if (r && r.travel) {
      lines.push('โซนเดินทางที่เว็บคิดให้: ' + (r.travel.zoneLabel || r.travel.zone) +
                 ' (จ.' + (r.travel.province || '-') + ') = ' + baht(r.travel.total) + ' บาท' +
                 (r.travel.nights > 0 ? ' · รวมค่าที่พัก ' + r.travel.nights + ' คืนแล้ว' : ''));
    } else if (v.province) {
      lines.push('จังหวัดที่ตั้งแปลง: ' + v.province + ' (ในพื้นที่ ไม่มีค่าเดินทาง)');
    } else {
      lines.push('ลูกค้ายังไม่ได้เลือกจังหวัด — ราคาที่เว็บแสดงยังไม่รวมค่าดำเนินการนอกพื้นที่');
    }
    if (r) lines.push('ราคาประมาณการที่เว็บแสดง: ' + baht(r.subtotal) + ' บาท (ยังไม่รวม VAT · ไม่ใช่ใบเสนอราคา)');
    if (!r) lines.push('(ลูกค้ายังไม่ได้กรอกเนื้อที่ ราคายังคำนวณไม่ได้)');

    btn.disabled = true;
    btn.textContent = 'กำลังส่ง…';
    sent.hidden = true;

    var base = window.NJ_API_BASE || 'https://app.njteedinsure.com';
    fetch(base + '/api/public/consign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        phone: phone,
        // survey_first = ลีดที่เริ่มจากงานรังวัด (ค่าที่ระบบหลังบ้านรับอยู่แล้ว)
        type: 'survey_first',
        parcelInfo: String(v.place || '').trim(),
        rai: waFromArea(v.rai, v.ngan, v.wa) / WA_PER_RAI,
        note: lines.join('\n'),
        ref: 'survey-quote',
        website: String(v.website || '')
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error();
        return res.json().catch(function () { return {}; });
      })
      .then(function () {
        sent.hidden = false;
        sent.className = 'sq-sent ok';
        sent.textContent = 'ส่งเรียบร้อย ทีมงานจะติดต่อกลับภายใน 1 วันทำการ';
        btn.textContent = 'ส่งแล้ว';
        if (window.njTrack) window.njTrack('Lead', { content_name: 'survey_quote' });
        if (window.njTrackInternal) window.njTrackInternal('consign_submit');
      })
      .catch(function () {
        // ส่งไม่ผ่าน = ต้องไม่ทำให้ลูกค้าหลุดมือ ให้ช่องทางอื่นทันที
        sent.hidden = false;
        sent.className = 'sq-sent bad';
        sent.innerHTML = 'ส่งไม่สำเร็จ กรุณาลองใหม่ หรือ ' +
          '<a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์หาเราได้เลย</a> ' +
          '· โทร <a href="tel:021620405" data-contact="tel">02-162-0405</a> / ' +
          '<a href="tel:0849158601" data-contact="tel">084-915-8601</a>';
        btn.disabled = false;
        btn.textContent = 'ส่งให้ทีมงานตีราคาให้';
      });
  }

  // ---------------------------------------------------------------------------
  function open() {
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    render();
    var f = root.querySelector('[data-sq="rai"]');
    if (f) f.focus({ preventScroll: true });
    root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function close() {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
  }

  function boot() {
    root = document.getElementById('survey-quote');
    if (!root) return;
    root.className = 'sq';
    root.hidden = true;
    root.innerHTML = markup();
    out = root.querySelector('[data-sq-out]');

    root.addEventListener('input', render);
    root.addEventListener('change', render);
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-sq-close]')) close();
      var btn = e.target.closest('[data-sq-send]');
      if (btn) send(btn);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) close(); });

    document.querySelectorAll('[data-sq-open]').forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });

    // โหลดตารางราคาจากระบบหลังบ้าน — ล้มเหลวก็ยังเปิดกล่องได้ แค่ไม่มีราคาให้ดู
    loadPricing().then(render, render);
  }

  // ของกลางให้หน้าอื่นเรียก — หน้าฝากขาย (consign.js) ใช้ตัวนี้ประเมินค่ารังวัดจากเนื้อที่
  // **ห้ามก๊อปตารางราคามาไว้ฝั่งนั้นเด็ดขาด** เหตุผลเดียวกับที่เขียนไว้หัวไฟล์
  window.NJSurveyQuote = {
    load: loadPricing,
    quoteFromWa: quoteFromWa,
    waFromArea: waFromArea,
    raiTxt: raiTxt,
    jobs: JOBS,
    // ช่วงค่าดำเนินการนอกพื้นที่ ไว้เขียนคำเตือนตอนยังไม่รู้จังหวัด — อ่านจากตารางจริง ห้ามพิมพ์เอง
    travelRangeText: travelRangeText,
    ready: function () { return !!P; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
