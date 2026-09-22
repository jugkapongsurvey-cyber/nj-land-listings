/* ===========================================================================
   วัดพื้นที่แปลง — ทางลิงก์ออก (window.NJAreaLink) · ใช้ที่ tools.html#area
   เจ้าของกิจการสั่ง 22 ก.ย. 2569: "ให้แสดง link ไว้แล้วไปเชื่อมข้อมูลด้านนอกเว็บแทน"

   ⚠️ กติกาที่ห้ามผ่อน

   1. **เว็บนี้ไม่ฝังแผนที่ของผู้ให้บริการรายใดไว้ในหน้า** — ตัดสินแล้ว ไม่ใช่ "ยังไม่ได้ทำ"
      เหตุผลสองชั้น ห้ามลืมชั้นใดชั้นหนึ่ง:
      · **ค่าใช้จ่าย** — แผนที่ทุกเจ้าคิดตามจำนวนภาพไทล์ที่โหลด แพ็กเกจฟรีมีเพดาน
        (Longdo: ~800,000 ไทล์/เดือน · 5,000 ครั้ง/วัน · 60 ครั้ง/นาที · เกินแล้วขั้นถัดไป 8,250 บาท/เดือน
        ตรวจ 22 ก.ย. 69 ที่ map.longdo.com/products/pricing) เว็บสาธารณะคุมยอดคนเข้าไม่ได้
        → ค่าใช้จ่ายของเดือนหน้าขึ้นกับคนนอก ไม่ใช่ขึ้นกับเรา
      · **สิทธิ์ในข้อมูล** — ภาพแผนที่และภาพผังเมืองเป็นของเจ้าของข้อมูล การเอามาแสดงบนเว็บ
        ของบริษัทคือการเผยแพร่ซ้ำ ต้องมีสัญญา/หนังสืออนุญาตเสมอ
      → ส่งผู้ใช้ไป **วัดที่ระบบของเจ้าของข้อมูลเอง** แล้วเอาตัวเลขกลับมาแปลงหน่วยที่นี่
      **ห้ามเพิ่ม <script> หรือ <iframe> ของผู้ให้บริการแผนที่ลงหน้านี้** โดยไม่มีคำสั่งเป็นลายลักษณ์อักษร

   2. **วัดจากภาพไม่ใช่การรังวัด** — ภาพดาวเทียมและหมุดที่ลากเองคลาดได้หลายเมตร
      `DISCLAIM` ต้องแสดงทุกครั้ง ห้ามถอด ห้ามเขียนให้อ่อนลง และห้ามเรียกผลว่า "เนื้อที่" เฉยๆ

   3. **คณิตหน่วยที่ดินอ่านจาก `NJLandForm.calc` ที่เดียว** (landform.js ต้องโหลดก่อนไฟล์นี้)
      1 ไร่ = 4 งาน = 400 ตร.ว. · 1 ตร.ว. = 4 ตร.ม. — ห้ามพิมพ์เลขพวกนี้ซ้ำในไฟล์นี้
      สองที่ปัดเศษไม่เหมือนกันเมื่อไหร่ ตัวเลขหน้าฝากขายกับหน้านี้จะไม่ตรงกัน
      · ไม่มี `NJLandForm` = ไม่วาดช่องแปลงหน่วย (ลิงก์ยังขึ้นตามปกติ) ห้ามวาดช่องที่กรอกแล้วเงียบ

   4. **ตัวเลขที่ผู้ใช้กรอกไม่ถูกส่งไปไหน** — ไม่ยิงสถิติ ไม่เก็บ localStorage ไม่ส่งขึ้น API
      คำนวณในเบราว์เซอร์ล้วน

   5. ลิงก์ออกนอกเว็บต้องเป็นหน้าแรกของบริการนั้นโดยตรง + `rel="noopener noreferrer"`
      ตรวจว่าเปิดได้ 22 ก.ย. 69 (ตอบ 200 ทั้งสามราย)
   =========================================================================== */
(function (w) {
  'use strict';

  var DISCLAIM = 'ตัวเลขที่ได้จากการลากหมุดบนภาพแผนที่เป็น "เนื้อที่ที่วัดจากภาพ" ไม่ใช่ผลรังวัด ' +
    'ภาพดาวเทียมและตำแหน่งหมุดคลาดเคลื่อนได้หลายเมตร และแนวเขตจริงอาจไม่ตรงกับที่เห็นในภาพ ' +
    'ใช้ประกอบการคุยและประเมินเบื้องต้นเท่านั้น ห้ามใช้อ้างอิงในการซื้อขายหรือทำสัญญา ' +
    'เนื้อที่ที่ใช้อ้างอิงได้ต้องมาจากเอกสารสิทธิ์หรือการรังวัดโดยช่างรังวัดที่มีใบอนุญาต';

  // ทำไมไม่ฝังแผนที่ไว้ในหน้า — ตอบไว้ในหน้าเลย เพราะเป็นคำถามแรกที่ผู้ใช้จะสงสัย
  var WHY = 'เว็บนี้ไม่ฝังแผนที่ไว้ในหน้า แต่ส่งคุณไปวัดที่ระบบของเจ้าของข้อมูลโดยตรง ' +
    'เพราะภาพแผนที่เป็นของผู้ให้บริการแต่ละราย การนำมาแสดงซ้ำบนเว็บของบริษัทต้องมีสิทธิ์ตามสัญญา ' +
    'และบริการแผนที่คิดค่าบริการตามปริมาณการใช้ ซึ่งเว็บสาธารณะควบคุมไม่ได้ ' +
    'วัดที่ต้นทางจึงได้ภาพที่ใหม่กว่าและไม่มีข้อจำกัดเรื่องโควตา';

  // ⚠️ เรียงตามความน่าเชื่อถือของข้อมูล: เอกสารสิทธิ์ก่อน แล้วค่อยเป็นการวัดจากภาพ
  var MEASURE_LINKS = [
    { name: 'LandsMaps กรมที่ดิน', official: true, url: 'https://landsmaps.dol.go.th/',
      what: 'ค้นแปลงจากเลขโฉนดหรือตำแหน่ง แล้วดูรูปแปลงกับเนื้อที่ตามเอกสารสิทธิ์',
      how: 'ใส่จังหวัด–อำเภอ–เลขโฉนด แล้วกดค้นหา · เนื้อที่ที่ระบบแสดงคือเนื้อที่ตามเอกสารสิทธิ์ ไม่ใช่ที่วัดจากภาพ' },
    { name: 'Longdo Map', url: 'https://map.longdo.com/',
      what: 'แผนที่ไทยพร้อมภาพดาวเทียม มีเครื่องมือวัดระยะและพื้นที่ในตัว',
      how: 'เปิดเมนูเครื่องมือ เลือก "วัดพื้นที่" แล้วคลิกวนรอบแปลงจนครบ · ผลออกมาเป็นตารางเมตร' },
    { name: 'Google Maps', url: 'https://www.google.com/maps',
      what: 'ภาพดาวเทียมความละเอียดสูงในหลายพื้นที่ ใช้วัดพื้นที่คร่าวๆ ได้',
      how: 'คลิกขวาบนแผนที่ เลือก "วัดระยะทาง" แล้วคลิกวนรอบแปลงกลับมาจุดเริ่ม · ระบบจะบอกพื้นที่รวมให้' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // คณิตหน่วยที่ดินทั้งหมดอ่านจาก landform.js (กติกาข้อ 3) — ที่นี่แค่ห่อให้เรียกง่าย
  function calc() { return w.NJLandForm && w.NJLandForm.calc; }

  // ตร.ม. → { wa, rai, ngan, waRest, text } · ค่าที่กรอกไม่ถูกต้องคืน null ไม่ใช่ศูนย์
  // (ศูนย์แปลว่า "วัดได้ 0" ซึ่งคนละเรื่องกับ "ยังไม่ได้กรอก")
  function fromSqm(sqm) {
    var C = calc();
    if (!C) return null;
    var m2 = C.num(sqm);
    if (m2 <= 0) return null;
    var wa = m2 / C.SQM_PER_WA;
    var a = C.fromWa(wa);
    return { sqm: m2, wa: Math.round(wa * 100) / 100, rai: a.rai, ngan: a.ngan, waRest: a.wa, text: C.areaText(wa) };
  }
  // ไร่-งาน-ตร.ว. → ตร.ม. · ทุกช่องว่าง = ยังไม่ได้กรอก คืน null
  function toSqm(rai, ngan, wa) {
    var C = calc();
    if (!C) return null;
    var totalWa = C.toWa(rai, ngan, wa);
    if (totalWa <= 0) return null;
    return { wa: totalWa, sqm: Math.round(totalWa * C.SQM_PER_WA * 100) / 100, text: C.areaText(totalWa) };
  }

  function linksHtml() {
    return MEASURE_LINKS.map(function (l) {
      return '<li class="al-link">' +
        '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">' + esc(l.name) + ' ↗</a>' +
        (l.official ? '<span class="al-gov">ระบบของหน่วยงานรัฐ</span>' : '') +
        '<p class="al-what">' + esc(l.what) + '</p>' +
        '<p class="al-how"><span class="al-k">วิธีวัด</span>' + esc(l.how) + '</p>' +
      '</li>';
    }).join('');
  }

  // ช่องแปลงหน่วย — วาดเฉพาะตอนที่ landform.js โหลดมาแล้ว (กติกาข้อ 3)
  function convertHtml() {
    if (!calc()) return '';
    return '<div class="al-conv">' +
      '<h3>เอาตัวเลขที่วัดได้มาแปลงหน่วย</h3>' +
      '<p class="al-conv-lead">ระบบแผนที่ส่วนใหญ่บอกผลเป็นตารางเมตร แต่ที่ดินไทยซื้อขายกันเป็น ไร่-งาน-ตารางวา ' +
        'กรอกช่องไหนก็ได้ อีกฝั่งจะแปลงให้ทันที</p>' +
      '<div class="al-row">' +
        '<label class="al-f"><span>ตารางเมตร</span>' +
          '<input type="text" inputmode="decimal" data-al="sqm" autocomplete="off" placeholder="เช่น 6400"></label>' +
        '<span class="al-eq" aria-hidden="true">=</span>' +
        '<label class="al-f al-sm"><span>ไร่</span>' +
          '<input type="text" inputmode="numeric" data-al="rai" autocomplete="off" placeholder="0"></label>' +
        '<label class="al-f al-sm"><span>งาน</span>' +
          '<input type="text" inputmode="numeric" data-al="ngan" autocomplete="off" placeholder="0"></label>' +
        '<label class="al-f al-sm"><span>ตารางวา</span>' +
          '<input type="text" inputmode="decimal" data-al="wa" autocomplete="off" placeholder="0"></label>' +
      '</div>' +
      '<p class="al-out" data-al="out" aria-live="polite"></p>' +
    '</div>';
  }

  function html() {
    return '<p class="al-intro">' + esc(WHY) + '</p>' +
      '<ol class="al-links">' + linksHtml() + '</ol>' +
      convertHtml() +
      '<p class="al-warn">' + esc(DISCLAIM) + '</p>' +
      '<a class="al-cta" href="verify.html?topic=area#form">ให้ทีมช่างรังวัดของ NJ วัดแปลงนี้ให้จริง →</a>';
  }

  // ผูกช่องแปลงหน่วยสองทาง — ฝั่งที่ผู้ใช้กำลังพิมพ์อยู่ห้ามถูกเขียนทับ ไม่งั้นเคอร์เซอร์เด้ง
  function bind(root) {
    var C = calc();
    if (!C || !root) return null;
    var f = {};
    ['sqm', 'rai', 'ngan', 'wa', 'out'].forEach(function (k) { f[k] = root.querySelector('[data-al="' + k + '"]'); });
    if (!f.sqm || !f.rai || !f.out) return null;

    function say(msg) { f.out.textContent = msg || ''; }
    // ⚠️ ไม่ใช้ `C.fmt` ตรงนี้ เพราะมันปัดเป็นจำนวนเต็ม — บรรทัดสรุปจะบอก "12,346 ตารางเมตร"
    //    ขณะที่ช่องกรอกยังเป็น 12,345.6 อ่านแล้วเหมือนระบบเปลี่ยนตัวเลขที่ผู้ใช้พิมพ์ทิ้ง
    function n(v) { return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function show(a) {
      if (!a) return say('');
      say('≈ ' + a.text + '  (' + n(a.wa) + ' ตารางวา · ' + n(a.sqm) + ' ตารางเมตร)');
    }
    function fromSqmSide() {
      var a = fromSqm(f.sqm.value);
      if (!a) { f.rai.value = ''; f.ngan.value = ''; f.wa.value = ''; return say(''); }
      f.rai.value = a.rai; f.ngan.value = a.ngan; f.wa.value = a.waRest;
      show({ text: a.text, wa: a.wa, sqm: a.sqm });
    }
    function fromRaiSide() {
      var a = toSqm(f.rai.value, f.ngan.value, f.wa.value);
      if (!a) { f.sqm.value = ''; return say(''); }
      f.sqm.value = a.sqm;
      show(a);
    }
    f.sqm.addEventListener('input', fromSqmSide);
    [f.rai, f.ngan, f.wa].forEach(function (el) { if (el) el.addEventListener('input', fromRaiSide); });
    return { fromSqmSide: fromSqmSide, fromRaiSide: fromRaiSide };
  }

  function mount(el) {
    if (!el) return false;
    el.className = 'al';
    el.innerHTML = html();
    bind(el);
    return true;
  }

  w.NJAreaLink = {
    MEASURE_LINKS: MEASURE_LINKS, DISCLAIM: DISCLAIM, WHY: WHY,
    fromSqm: fromSqm, toSqm: toSqm, html: html, bind: bind, mount: mount
  };
})(typeof window !== 'undefined' ? window : this);
