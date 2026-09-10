/* น้องเอ็นเจชัวร์ — ผู้ช่วยแชท AI ของที่ดินชัวร์ (วิดเจ็ตมุมจอทุกหน้า + หน้าเต็ม chat.html)
 *
 * ทำงานสองชั้น:
 *   1) "กฎ" ในไฟล์นี้ตอบเองก่อน — ค้นแปลงจาก API จริง · เทียบแปลง · ประเมินค่ารังวัดจากตารางราคาจริง
 *      · ขั้นตอนฝากขาย/ยื่นรังวัด/เอกสาร/ค่าโอน ฯลฯ (ไม่มีค่าใช้จ่าย ตอบทันที ทำงานได้แม้ AI ล่ม)
 *   2) จับคู่กฎไม่ได้ → ส่งไป POST /api/public/njchat ให้ Claude ตอบ (เซิร์ฟเวอร์เป็นคนถือ API key
 *      เว็บนี้เป็นสแตติก ห้ามมี key อยู่ที่นี่เด็ดขาด — กติกาเดียวกับหน้า portal.html)
 *
 * ⚠️ กติกาที่ห้ามผ่อน (สืบทอดจาก listingcard.js / listings.js):
 *   · แปลงทุกแปลงมาจาก GET /api/public/listings เท่านั้น ห้ามมีแปลงตัวอย่างในไฟล์นี้
 *   · ตอบได้เฉพาะสิ่งที่ API ส่งมาจริง — ช่องที่ "ยังไม่ได้ระบุ" ต้องบอกว่าไม่รู้ ไม่ใช่บอกว่าไม่มี
 *     และแปลงที่ตกรอบเพราะยังไม่ได้ระบุ ต้องบอกจำนวนให้ผู้ซื้อเห็นเสมอ (เหมือน listings.js)
 *   · ราคาค่ารังวัดคิดจาก pricing.js ของเซิร์ฟเวอร์เท่านั้น (โหลดผ่าน <script> เหมือน surveyquote.js)
 *     โหลดไม่ได้ = ไม่แสดงตัวเลข แล้วให้ทักไลน์ ห้ามพิมพ์ตารางราคาไว้ในไฟล์นี้
 *   · การ์ดใช้ NJListing.card() ตัวเดียวกับทุกหน้า · คำศัพท์อ่านจาก NJVocab ห้ามก๊อปเพิ่ม
 *   · น้องเป็น AI ต้องบอกตั้งแต่ข้อความแรก ห้ามรับปากแทนทีมงาน (นัดวัน/ยืนยันราคา/รับงาน)
 *   · ห้ามขอเลขบัตร/รหัสผ่าน/ข้อมูลอ่อนไหว และไม่เก็บบทสนทนาส่งไป /api/public/track (ไม่มี PII)
 *
 * โหลดหลัง analytics.js · listingcard.js · landvocab.js · compare.js และก่อน menu.js
 */
(function () {
  'use strict';

  var BOT = 'น้องเอ็นเจชัวร์';
  var API = function () { return window.NJ_API_BASE || 'https://app.njteedinsure.com'; };
  var PRICING_URL = 'https://app.njteedinsure.com/pricing.js';
  var TEL_TXT = '02-162-0405', TEL_HREF = 'tel:021620405';
  var LINE_URL = 'https://line.me/R/ti/p/@716lffzt';
  var FB_URL = window.NJ_MESSENGER_URL || 'https://m.me/NJTeeDinSure';
  var HOURS = 'จ.–ส. 08:30–17:30 น.';
  var MAX_CARDS = 6;
  var WA_PER_RAI = 400, WA_PER_NGAN = 100;
  var HIST_KEY = 'njchat';          // sessionStorage — บทสนทนาเป็นเรื่องของการเข้าเว็บรอบนี้ (กติกาเดียวกับ njCompare)

  // ---------------------------------------------------------------------------
  // เครื่องมือ
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function baht(n) { return '฿' + Math.round(Number(n) || 0).toLocaleString('th-TH'); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s​]+/g, ''); }
  function has(q, words) {
    for (var i = 0; i < words.length; i++) if (q.indexOf(norm(words[i])) >= 0) return true;
    return false;
  }
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }
  function areaTh(wa) { return window.NJListing ? NJListing.areaTh(wa) : ''; }
  function raiTxt(n) { return Number(n || 0).toFixed(4).replace(/\.?0+$/, '') || '0'; }

  // ---------------------------------------------------------------------------
  // ตารางราคา + รายชื่อจังหวัด — โหลดจากเซิร์ฟเวอร์ (ใช้ NJSurveyQuote.load ถ้าหน้านั้นมี ไม่งั้นโหลดเอง)
  var P = window.NJPricing || null;
  var pricingPromise = null;
  function loadPricing() {
    if (P) return Promise.resolve(P);
    if (window.NJPricing) { P = window.NJPricing; return Promise.resolve(P); }
    if (window.NJSurveyQuote && NJSurveyQuote.load) return NJSurveyQuote.load().then(function (p) { P = p; return p; });
    if (pricingPromise) return pricingPromise;
    pricingPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PRICING_URL; s.async = true;
      s.onload = function () { P = window.NJPricing || null; if (P) resolve(P); else reject(new Error('no pricing')); };
      s.onerror = function () { reject(new Error('no pricing')); };
      document.head.appendChild(s);
    });
    return pricingPromise;
  }
  // กทม.+ปริมณฑล = โซน A ของตารางราคา (pricing.js) — อ่านจากตารางเมื่อโหลดแล้ว
  // ชุดสำรองด้านล่างใช้เฉพาะตอนตารางยังไม่มา และตรงกับ SURVEY_REQUIRED_PROVINCES ใน server.js/consign.js
  var METRO_FALLBACK = ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'สมุทรสาคร', 'นครปฐม'];
  function metroProvinces() { return (P && P.ZONE_PROVINCES && P.ZONE_PROVINCES.A) || METRO_FALLBACK; }
  function allProvinces() {
    var out = [];
    if (P && P.ZONE_PROVINCES) Object.keys(P.ZONE_PROVINCES).forEach(function (k) { out = out.concat(P.ZONE_PROVINCES[k]); });
    return out;
  }
  // ชื่อที่คนพิมพ์จริง → ชื่อจังหวัดเต็ม (ชุดสั้นสำหรับแชท · pricing.js มี normProvince ให้ด้วยเมื่อโหลดแล้ว)
  var PROV_ALIAS = {
    'กทม': 'กรุงเทพมหานคร', 'กรุงเทพ': 'กรุงเทพมหานคร', 'บางกอก': 'กรุงเทพมหานคร',
    'ปทุม': 'ปทุมธานี', 'ปากน้ำ': 'สมุทรปราการ', 'อยุธยา': 'พระนครศรีอยุธยา', 'โคราช': 'นครราชสีมา',
    'อุบล': 'อุบลราชธานี', 'อุดร': 'อุดรธานี', 'สุราษ': 'สุราษฎร์ธานี', 'นครศรี': 'นครศรีธรรมราช', 'หาดใหญ่': 'สงขลา'
  };

  // ---------------------------------------------------------------------------
  // แปลงที่ประกาศอยู่ — ดึงสดจาก API ผ่าน NJListing (แคชในหน้าเดียวกัน 2 นาที)
  var cache = { at: 0, list: null, p: null };
  // จังหวัดที่มีแปลงประกาศอยู่จริง — ใช้จับชื่อจังหวัดได้แม้ตารางราคายังโหลดไม่มา
  function knownProvinces() {
    var out = [];
    (cache.list || []).forEach(function (x) { var pv = x.land && x.land.province; if (pv && out.indexOf(pv) < 0) out.push(pv); });
    return out;
  }
  function listings() {
    if (cache.list && Date.now() - cache.at < 120000) return Promise.resolve(cache.list);
    if (cache.p) return cache.p;
    cache.p = NJListing.fetchListings().then(function (l) {
      cache.list = l; cache.at = Date.now(); cache.p = null; return l;
    }, function (e) { cache.p = null; throw e; });
    return cache.p;
  }

  // ---------------------------------------------------------------------------
  // ตัวอ่านตัวเลขไทย: "5 ล้าน" "2.5ล้าน" "8 แสน" "500,000" → บาท
  function parseMoney(text) {
    var t = String(text).replace(/,/g, '');
    // ช่วง "2-5 ล้าน" / "2 ถึง 5 ล้าน" — ตัวแรกยืมหน่วยของตัวหลัง
    var rg = t.match(/(\d+(?:\.\d+)?)\s*(?:-|–|ถึง)\s*(\d+(?:\.\d+)?)\s*(ล้าน|แสน|หมื่น)/);
    if (rg) { var mul = { 'ล้าน': 1e6, 'แสน': 1e5, 'หมื่น': 1e4 }[rg[3]]; return [Number(rg[1]) * mul, Number(rg[2]) * mul]; }
    var m = t.match(/(\d+(?:\.\d+)?)\s*(ล้าน|แสน|หมื่น|พัน|บาท)?/g) || [];
    var out = [];
    m.forEach(function (s) {
      var r = s.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(ล้าน|แสน|หมื่น|พัน|บาท)?/);
      var v = Number(r[1]), u = r[2] || '';
      if (u === 'ล้าน') v *= 1e6; else if (u === 'แสน') v *= 1e5; else if (u === 'หมื่น') v *= 1e4; else if (u === 'พัน') v *= 1e3;
      else if (!u && v < 1000) return;         // เลขโดดๆ ที่เล็กกว่า 1,000 ไม่ใช่ราคา (น่าจะเป็นไร่/ชั้น/จำนวน)
      out.push(v);
    });
    return out;
  }
  // เนื้อที่ → ตร.ว. : "2 ไร่ 1 งาน 50 ตารางวา" · "1.5 ไร่" · "80 ตร.ว." · "2-1-50"
  function parseAreaWa(text) {
    var t = String(text).replace(/,/g, '');
    var d = t.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+(?:\.\d+)?)/);
    if (d) return Number(d[1]) * WA_PER_RAI + Number(d[2]) * WA_PER_NGAN + Number(d[3]);
    var rai = t.match(/(\d+(?:\.\d+)?)\s*ไร่/), ngan = t.match(/(\d+(?:\.\d+)?)\s*งาน/),
        wa = t.match(/(\d+(?:\.\d+)?)\s*(?:ตร\.?\s*ว\.?|ตารางวา|วา)/);
    if (!rai && !ngan && !wa) return 0;
    return (rai ? Number(rai[1]) : 0) * WA_PER_RAI + (ngan ? Number(ngan[1]) : 0) * WA_PER_NGAN + (wa ? Number(wa[1]) : 0);
  }

  // ---------------------------------------------------------------------------
  // ตีความคำค้นแปลง — คืน {provinces[], places[], type, pmin, pmax, amin, amax, deed, zone, feats[], sort, building, floors}
  function parseSearch(text) {
    var q = norm(text), raw = String(text);
    var f = { provinces: [], type: 'all', pmin: 0, pmax: 0, amin: 0, amax: 0, deed: 'all', zone: 'all', feats: [], sort: 'new', building: false, floors: 0 };

    // จังหวัด — ชื่อเต็มจากตารางราคา (ถ้าโหลดแล้ว) + ชื่อย่อที่คนพิมพ์
    var seen = {};
    function addProv(p) { if (p && !seen[p]) { seen[p] = 1; f.provinces.push(p); } }
    if (has(q, ['ปริมณฑล', 'รอบกรุงเทพ', 'ใกล้กรุงเทพ'])) metroProvinces().forEach(addProv);
    allProvinces().concat(knownProvinces()).forEach(function (p) { if (q.indexOf(norm(p)) >= 0) addProv(p); });
    Object.keys(PROV_ALIAS).forEach(function (a) { if (q.indexOf(norm(a)) >= 0) addProv(PROV_ALIAS[a]); });

    if (has(q, ['เช่า'])) f.type = 'rent';
    else if (has(q, ['ซื้อ', 'ขาย'])) f.type = 'sell';

    // ราคา
    var money = parseMoney(raw);
    if (money.length) {
      if (has(q, ['ไม่เกิน', 'ต่ำกว่า', 'ถูกกว่า', 'งบ', 'ไม่ถึง', 'ภายใน'])) f.pmax = money[0];
      else if (has(q, ['เกิน', 'มากกว่า', 'ขึ้นไป', 'แพงกว่า'])) f.pmin = money[0];
      else if (money.length >= 2) { f.pmin = Math.min(money[0], money[1]); f.pmax = Math.max(money[0], money[1]); }
      else if (has(q, ['ราคา', 'บาท', 'ล้าน', 'แสน'])) f.pmax = money[0];
    }
    // เนื้อที่ (เทียบเป็นไร่แบบ listings.js)
    var wa = parseAreaWa(raw);
    if (wa > 0) {
      var rai = wa / WA_PER_RAI;
      var nearArea = /(ไม่เกิน|ต่ำกว่า|เล็กกว่า)\s*\d+(?:\.\d+)?\s*(ไร่|งาน|ตร|ตารางวา|วา)/.test(raw);
      var overArea = /(?:^|[^ม่])(เกิน|มากกว่า|ใหญ่กว่า|อย่างน้อย)\s*\d+(?:\.\d+)?\s*(ไร่|งาน|ตร|ตารางวา|วา)/.test(raw) || /\d+(?:\.\d+)?\s*(ไร่|งาน|ตร\.?ว\.?|ตารางวา|วา)\s*ขึ้นไป/.test(raw);
      if (nearArea) f.amax = rai; else if (overArea) f.amin = rai;
      else { f.amin = rai * 0.8; f.amax = rai * 1.25; }   // "หา 2 ไร่" = ประมาณ ±20%
    }
    if (has(q, ['น.ส.3ก', 'นส3ก', 'นส.3ก'])) f.deed = 'nor3gor';
    else if (has(q, ['น.ส.3', 'นส3', 'นส.3'])) f.deed = 'nor3';
    else if (has(q, ['โฉนด'])) f.deed = 'chanote';

    // ผังสี — จับจากคำสีในชื่อของ NJVocab.ZONE_TH (คำแรกก่อน " — ")
    if (window.NJVocab && has(q, ['ผัง', 'สี'])) {
      // "เขียว" เป็นส่วนของ "เขียวลายขาว" และ "เขียวมะกอก" — เลือกชื่อสีที่ยาวที่สุดที่ตรง
      var bestLen = 0;
      Object.keys(window.NJVocab.ZONE_TH).forEach(function (k) {
        var word = norm(window.NJVocab.ZONE_TH[k].split(' — ')[0]);
        if (q.indexOf(word) >= 0 && word.length > bestLen) { bestLen = word.length; f.zone = k; }
      });
    }
    // ⚠️ ใช้คำที่เจาะจงเท่านั้น — "น้ำ" "ถม" "ถนน" โดดๆ โผล่ในประโยคอื่นบ่อย ("น้ำท่วมไหม") แล้วจะดึงคำถามทั่วไปเข้าโหมดค้น
    var FEAT_WORDS = { road: ['ติดถนน', 'ถนนเข้าถึง'], electric: ['ไฟฟ้า', 'มีไฟ'], water: ['ประปา'], filled: ['ถมแล้ว', 'ถมดิน', 'ที่ถม'], community: ['ใกล้ชุมชน', 'ชุมชน'], buildable: ['สร้างบ้านได้', 'ปลูกบ้าน'] };
    Object.keys(FEAT_WORDS).forEach(function (k) { if (has(q, FEAT_WORDS[k])) f.feats.push(k); });

    if (has(q, ['ถูกสุด', 'ถูกที่สุด', 'ราคาต่ำสุด'])) f.sort = 'price_asc';
    else if (has(q, ['แพงสุด', 'แพงที่สุด'])) f.sort = 'price_desc';
    else if (has(q, ['ใหญ่สุด', 'ใหญ่ที่สุด', 'เนื้อที่มาก'])) f.sort = 'area_desc';
    else if (has(q, ['ต่อตารางวาถูก', 'ตร.ว.ถูก'])) f.sort = 'wa_asc';

    if (has(q, ['บ้าน', 'สิ่งปลูกสร้าง', 'อาคาร', 'ตึก', 'ทาวน์', 'โกดัง', 'ชั้น'])) {
      f.building = true;
      var fl = raw.match(/(\d+)\s*ชั้น/) || (has(q, ['ชั้นเดียว']) ? [0, '1'] : null);
      if (fl) f.floors = Number(fl[1]);
    }
    return f;
  }

  // กรองแบบเดียวกับ listings.js — "ยังไม่ได้ระบุ" ไม่นับว่าตรง แต่ต้องนับจำนวนที่ถูกซ่อนไว้บอกผู้ซื้อ
  function applySearch(all, f, raw) {
    var hiddenUnknown = 0;
    var q = norm(raw);
    var list = all.filter(function (item) {
      var L = item.land || {};
      if (f.type !== 'all' && item.type !== f.type) return false;
      if (f.provinces.length) {
        if (!L.province) { hiddenUnknown++; return false; }
        if (f.provinces.indexOf(L.province) < 0) return false;
      } else {
        // ไม่ได้เอ่ยชื่อจังหวัด แต่เอ่ยชื่ออำเภอ/ตำบล/ย่าน — เทียบกับที่ตั้งที่ API ส่งมา
        var places = [L.province, L.amphoe, L.tambon, L.locality].filter(function (s) { return s && String(s).length >= 3; });
        var placeAsked = places.some(function (s) { return q.indexOf(norm(String(s).replace(/^(เขต|อ\.|ต\.|แขวง|อำเภอ|ตำบล)/, ''))) >= 0; });
        if (!placeAsked && f.placeRequired) return false;
      }
      if (f.pmin || f.pmax) {
        if (!(item.estValue > 0)) { hiddenUnknown++; return false; }
        if (f.pmin && item.estValue < f.pmin) return false;
        if (f.pmax && item.estValue > f.pmax) return false;
      }
      if (f.amin || f.amax) {
        if (!(item.totalWa > 0)) { hiddenUnknown++; return false; }
        var rai = item.totalWa / WA_PER_RAI;
        if (f.amin && rai < f.amin) return false;
        if (f.amax && rai > f.amax) return false;
      }
      if (f.deed !== 'all') {
        if (!L.deedType) { hiddenUnknown++; return false; }
        var ok = f.deed === 'nor3gor' ? (L.deedType === 'nor3gor' || L.deedType === 'chanote') : L.deedType === f.deed;
        if (!ok) return false;
      }
      if (f.zone !== 'all') {
        if (!L.zoneColor) { hiddenUnknown++; return false; }
        if (L.zoneColor !== f.zone) return false;
      }
      if (f.feats.length) {
        var have = L.features || [];
        if (!have.length) { hiddenUnknown++; return false; }
        for (var i = 0; i < f.feats.length; i++) if (have.indexOf(f.feats[i]) < 0) return false;
      }
      return true;
    });
    var by = {
      price_asc: function (a, b) { return (a.estValue || Infinity) - (b.estValue || Infinity); },
      price_desc: function (a, b) { return (b.estValue || 0) - (a.estValue || 0); },
      wa_asc: function (a, b) { return (a.pricePerWa || Infinity) - (b.pricePerWa || Infinity); },
      area_desc: function (a, b) { return (b.totalWa || 0) - (a.totalWa || 0); },
      new: function (a, b) { return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0); }
    };
    list.sort(by[f.sort] || by.new);
    return { list: list, hiddenUnknown: hiddenUnknown };
  }

  // ---------------------------------------------------------------------------
  // เนื้อหาคงที่ของเว็บ (ข้อเท็จจริงที่พิมพ์อยู่บนหน้าเว็บนี้อยู่แล้ว — ไม่มีตัวเลขราคาใดๆ นอกจากค่านายหน้า
  // ที่เจ้าของกิจการยืนยันบน consign.html) · ตัวเลขค่ารังวัดต้องมาจาก pricing.js เท่านั้น
  var KB = {
    consign: 'ขั้นตอนฝากขาย/ลงประกาศกับที่ดินชัวร์ครับ\n' +
      '1) กรอกฟอร์ม "ฝากขายฟรี" หรือทักไลน์ บอกที่ตั้งและขนาดที่ดินคร่าวๆ — ยังไม่รู้ราคาก็เว้นว่างได้ ทีมงานช่วยประเมินให้ฟรี\n' +
      '2) ทีมงานโทรกลับภายใน 1 วันทำการ ตรวจเอกสารสิทธิ์ ภาระผูกพัน ทางเข้า–ออก และผังเมือง แจ้งผลเป็นลายลักษณ์อักษร\n' +
      '3) ประเมินราคาจากราคาซื้อขายในพื้นที่ + ราคาประเมินราชการ แล้วทำสัญญาฝากขาย\n' +
      '4) ในกทม./ปริมณฑล ทีมช่างรังวัดของเราลงพื้นที่รังวัดยืนยันเขตก่อนขึ้นประกาศ (พื้นที่อื่นเลือกได้)\n' +
      '5) ขึ้นประกาศเมื่อได้รับหนังสือยินยอมเผยแพร่ข้อมูล (PDPA) จากเจ้าของแล้วเท่านั้น\n' +
      '6) ทีมงานพาผู้สนใจดูที่ดิน และดูแลขั้นตอนโอนที่สำนักงานที่ดินจนจบ\n\n' +
      'ค่าใช้จ่าย: ไม่มีค่าใช้จ่ายล่วงหน้า ไม่มีค่าลงประกาศ ค่านายหน้า 3% ของราคาที่ขายได้ (ไม่บวก VAT) เก็บวันโอนเมื่อขายสำเร็จเท่านั้น',
    docsSurvey: 'เอกสารสำหรับงานรังวัดครับ\n\nบุคคลธรรมดา\n• โฉนดที่ดินฉบับจริง + สำเนา\n• บัตรประชาชน + สำเนา (เจ้าของทุกคน)\n• ทะเบียนบ้าน + สำเนา\n• หนังสือมอบอำนาจ (กรณีให้ผู้อื่นดำเนินการแทน — ทางเราจัดเตรียม ท.ด.21 ให้ ลูกค้าแค่เซ็น)\n\n' +
      'นิติบุคคล เพิ่มเติม\n• หนังสือรับรองบริษัท (ไม่เกิน 3 เดือน)\n• บัตรประชาชน + ทะเบียนบ้านของกรรมการผู้มีอำนาจ\n• ตราประทับบริษัท (ถ้ามี)\n\nกรณีเปลี่ยนชื่อ-สกุล แนบใบเปลี่ยนชื่อมาด้วยครับ',
    docsConsign: 'ฝากขายใช้เอกสารน้อยมากครับ — ตอนกรอกฟอร์มแนบแค่รูปโฉนดหรือเอกสารสิทธิ์ (ทีมงานเห็นเท่านั้น ไม่ขึ้นเว็บ) ' +
      'ส่วนเอกสารชุดเต็ม (บัตรประชาชน ทะเบียนบ้าน หนังสือมอบอำนาจ) ค่อยเตรียมตอนทำสัญญาและวันโอน ทีมงานจะแจ้งเป็นรายการให้ครับ',
    howtoSurvey: 'ขั้นตอนยื่นรังวัดกับเราครับ\n1) ส่งข้อมูลแปลงหรือรูปโฉนดให้ทีมงาน\n2) เราประเมินราคาและส่งใบเสนอราคา\n3) ตกลงราคา → ทำสัญญาว่าจ้าง\n' +
      '4) เราจัดเตรียมหนังสือมอบอำนาจและยื่นเรื่องที่สำนักงานที่ดินให้\n5) รับคิว/นัดวันรังวัด แล้วแจ้งลูกค้าล่วงหน้า\n6) ทีมงานเข้ารังวัดหน้างาน (เจ้าของหรือผู้รับมอบอำนาจ และเจ้าของแปลงข้างเคียงมาระวังแนวเขต)\n' +
      '7) สรุปรูปแผนที่และส่งรายงานให้ลูกค้า\n\nระหว่างทางติดตามสถานะได้เองทั้ง 11 ขั้นตอนใน "ระบบติดตามงานรังวัด" ครับ',
    queue: 'ระยะเวลาโดยประมาณครับ\n• ยื่นเรื่องที่สำนักงานที่ดิน → ได้คิวรังวัด ประมาณ 30-60 วัน (ขึ้นกับคิวของสำนักงานที่ดินแต่ละพื้นที่)\n• เข้ารังวัดหน้างาน 1 วัน\n• สรุปรูปแผนที่และส่งรายงาน ประมาณ 7-15 วัน\n\n' +
      'สิ่งที่ทำให้ช้ากว่ากำหนดได้คือคิวของสำนักงานที่ดิน และการมาระวังแนวเขตของเจ้าของที่ดินข้างเคียงครับ',
    whatPrivate: 'ช่างรังวัดเอกชน คือช่างรังวัดที่ได้รับใบอนุญาตจากกรมที่ดินให้ทำงานรังวัดแทนช่างของสำนักงานที่ดินได้ครับ ผลงานมีผลทางกฎหมายเท่ากัน ' +
      'ข้อดีคือได้คิวเร็วกว่า ระบุวันรังวัดล่วงหน้าได้ และมีทีมดูแลเอกสารให้ตลอดทาง\n\nที่ดินชัวร์ดำเนินการโดย บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด สำนักงานช่างรังวัดเอกชน ใบอนุญาต 351 ' +
      'ทำได้เฉพาะที่ดินที่มีโฉนดแล้ว — เราตรวจเอกสารให้ก่อนเสมอแล้วบอกตรงๆ ว่างานทำได้หรือไม่ได้',
    types: 'งานรังวัดที่เรารับครับ\n1) รังวัดสอบเขต — ยืนยันแนวเขต/เนื้อที่ให้ตรงกับโฉนด\n2) รังวัดแบ่งแยกในนามเดิม / แบ่งแยกกรรมสิทธิ์รวม\n3) รังวัดรวมโฉนด และรวม-แบ่งแยก\n' +
      '4) ยื่นขออนุญาตจัดสรรที่ดิน\n5) สำรวจและทำแผนที่เพื่อออกแบบก่อสร้าง\n\nพิมพ์บอกเนื้อที่และประเภทงานมาได้เลย น้องประเมินค่ารังวัดเบื้องต้นให้ครับ',
    valuation: 'ไทยมีราคาที่ดิน 2 ชุดที่ไม่เท่ากันครับ\n• ราคาประเมินราชการ (กรมธนารักษ์) ใช้คำนวณค่าธรรมเนียมโอนและภาษี ปรับรอบละหลายปีจึงมักต่ำกว่าตลาด\n' +
      '• ราคาตลาด/ราคาประเมินอิสระ — ที่ดินเปล่าส่วนใหญ่ใช้ "วิธีเปรียบเทียบราคาตลาด" ถ่วงน้ำหนักทำเล รูปร่าง สาธารณูปโภค ส่วนที่มีสิ่งปลูกสร้างใช้ "วิธีต้นทุน" (ราคาสร้างใหม่หักค่าเสื่อม + มูลค่าที่ดิน)\n\n' +
      'ลองเครื่องประเมินเบื้องต้นได้ในหน้าคู่มือ หรือถ้าจะฝากขาย ทีมงานประเมินให้ฟรีจากราคาซื้อขายจริงในพื้นที่ครับ',
    transfer: 'ค่าใช้จ่ายวันโอนที่สำนักงานที่ดินโดยทั่วไปมี ค่าธรรมเนียมการโอน · ภาษีเงินได้หัก ณ ที่จ่าย · อากรแสตมป์หรือภาษีธุรกิจเฉพาะ (แล้วแต่กรณี) ' +
      'ตัวเลขขึ้นกับราคาประเมินราชการ ระยะเวลาถือครอง และผู้ถือกรรมสิทธิ์เป็นบุคคลหรือนิติบุคคล\n\nคำนวณตัวเลขจริงได้จากเครื่องคำนวณค่าโอน/ภาษีในหน้าคู่มือครับ (ใส่ราคาประเมินกับปีที่ถือครอง)',
    verify: 'บริการ "ตรวจทรัพย์ก่อนซื้อ" เหมาะกับทรัพย์จากขายทอดตลาด ธนาคาร หรือประกาศทั่วไปครับ — ช่างรังวัดใบอนุญาต 351 ลงพื้นที่ตรวจแนวเขตและหมุดหลักเขตจริง ' +
      'เทียบเนื้อที่จริงกับตัวเลขในโฉนด ดูทางเข้า–ออกและสภาพการใช้ประโยชน์ ผลตรวจเป็นข้อเท็จจริง ณ วันที่ตรวจ ไม่ใช่การรับรองกรรมสิทธิ์หรือผลการประมูล\n\n' +
      'ส่งข้อมูลทรัพย์ในหน้า "ตรวจทรัพย์ก่อนซื้อ" ทีมงานติดต่อกลับภายใน 1 วันทำการครับ',
    wanted: 'ยังไม่เจอแปลงที่ถูกใจ ฝากโจทย์ไว้ได้ครับ — บอกทำเล งบ เนื้อที่ และเอกสารสิทธิ์ที่ต้องการในหน้า "ฝากหาที่ดิน" ' +
      'ทีมช่างรังวัดของเราจะหาแปลงที่ตรงเงื่อนไขและตรวจให้ก่อน ไม่มีค่าใช้จ่ายครับ',
    portal: 'ลูกค้างานรังวัดเข้าดูสถานะงานได้เองที่ระบบติดตามงาน app.njteedinsure.com ครับ — เห็นทั้ง 11 ขั้นตอน รายงานผลรังวัด ไฟล์ค่าพิกัด และใบแจ้งหนี้ ' +
      'ใช้รหัสส่วนตัวที่ทีมงานออกให้ (ยังไม่มีรหัสหรือลืมรหัส ทักไลน์หรือโทรหาทีมงานได้เลย น้องออกรหัสให้ไม่ได้ครับ)',
    area: 'รับงานรังวัดทั่วประเทศครับ กทม.และปริมณฑลไม่มีค่าเดินทาง ต่างจังหวัดคิดค่าดำเนินการนอกพื้นที่ตามโซนระยะทาง — พิมพ์ชื่อจังหวัดพร้อมเนื้อที่มา น้องคำนวณรวมให้ได้ครับ',
    identity: 'น้องเป็น AI ผู้ช่วยของที่ดินชัวร์ครับ ไม่ใช่พนักงาน — ตอบได้จากข้อมูลบนเว็บและประกาศที่มีอยู่จริง แต่นัดวัน ยืนยันราคา หรือรับงานแทนทีมงานไม่ได้ ' +
      'ถ้าอยากคุยกับคน กด "คุยกับเจ้าหน้าที่" ได้เลยครับ (' + HOURS + ')'
  };

  // ---------------------------------------------------------------------------
  // ตัวตอบ — ทุกตัวคืน {html, chips?, cards?, ai?} · pending = สล็อตที่รอถามต่อ (เช่น รอเนื้อที่เพื่อคิดค่ารังวัด)
  var pending = null;
  var lastResults = [];

  function chips(list) { return list; }
  function link(href, label) { return '<a class="njchat-link" href="' + esc(href) + '">' + esc(label) + '</a>'; }

  function greetHtml() {
    return '<b>สวัสดีครับ 👋 ' + BOT + ' เอง</b><br>เป็น AI ผู้ช่วยของที่ดินชัวร์ครับ ถามได้ทุกเรื่อง เช่น ' +
      'หาที่ดินตามทำเล/งบ · เทียบแปลง · ประเมินค่ารังวัด · ขั้นตอนฝากขายและยื่นรังวัด · เอกสาร · ค่าโอน';
  }
  var HOME_CHIPS = ['หาที่ดินในกรุงเทพฯ ปริมณฑล', 'ค่ารังวัดสอบเขต 2 ไร่ เท่าไหร่', 'ขั้นตอนฝากขายที่ดิน', 'เตรียมเอกสารอะไรบ้าง', 'คุยกับเจ้าหน้าที่'];

  function searchReply(text, opt) {
    opt = opt || {};
    var f = parseSearch(text);
    var q = norm(text);
    var placeWords = has(q, ['ที่', 'แถว', 'ใน', 'ย่าน', 'ใกล้', 'อำเภอ', 'ตำบล', 'เขต']);
    return Promise.all([listings(), loadPricing().catch(function () { return null; })]).then(function (r) {
      var all = r[0];
      // โหลดตารางแล้ว = รายชื่อจังหวัดครบ 77 → ตีความใหม่อีกรอบ (รอบแรกอาจยังไม่มีชื่อจังหวัด)
      f = parseSearch(text);
      if (!f.provinces.length && placeWords) {
        // เอ่ยสถานที่แต่ไม่ใช่ชื่อจังหวัด — ลองจับอำเภอ/ตำบล ถ้าไม่มีแปลงไหนตรงเลย ให้ค้นแบบไม่ล็อกที่ตั้ง
        f.placeRequired = true;
        var probe = applySearch(all, f, text);
        if (!probe.list.length) f.placeRequired = false;
      }
      var res = applySearch(all, f, text);
      lastResults = res.list.slice(0, MAX_CARDS);

      if (!all.length) {
        return { html: '<b>ตอนนี้ยังไม่มีแปลงที่ประกาศอยู่ครับ</b><br>เราไม่ลงประกาศจนกว่าจะรังวัดยืนยันเขตเสร็จและเจ้าของยินยอมแล้ว ' +
          'ระหว่างนี้ฝากโจทย์ไว้ได้ ทีมช่างรังวัดจะหาแปลงที่ตรงเงื่อนไขให้ครับ ' + link('wanted.html', 'ฝากหาที่ดินฟรี →'),
          chips: ['ขั้นตอนฝากขายที่ดิน', 'คุยกับเจ้าหน้าที่'] };
      }

      var crit = [];
      if (f.provinces.length) crit.push(f.provinces.length > 3 ? 'กทม.และปริมณฑล' : f.provinces.join('/'));
      if (f.type !== 'all') crit.push(f.type === 'rent' ? 'ให้เช่า' : 'ขาย');
      if (f.pmax) crit.push('ไม่เกิน ' + baht(f.pmax)); if (f.pmin) crit.push('ตั้งแต่ ' + baht(f.pmin));
      if (f.amin || f.amax) crit.push('เนื้อที่ ' + (f.amin ? raiTxt(f.amin) : '0') + '–' + (f.amax ? raiTxt(f.amax) : '∞') + ' ไร่');
      if (f.deed !== 'all' && window.NJVocab) crit.push(window.NJVocab.DEED_TH[f.deed]);
      if (f.zone !== 'all' && window.NJVocab) crit.push('ผัง' + window.NJVocab.ZONE_TH[f.zone].split(' — ')[0]);
      if (f.feats.length && window.NJVocab) crit.push(f.feats.map(function (k) { return window.NJVocab.FEATURE_TH[k]; }).join(', '));

      var html = '';
      if (f.building) {
        // API ประกาศยังไม่มีช่อง "จำนวนชั้น/ประเภทสิ่งปลูกสร้าง" — ต้องบอกตามจริง ห้ามคัดแปลงให้เหมือนรู้
        var mention = res.list.filter(function (x) { return /บ้าน|อาคาร|ตึก|สิ่งปลูกสร้าง|โกดัง/.test((x.parcelInfo || '') + ' ' + (x.blurb || '')); });
        html += '<p class="njchat-note">ℹ️ ประกาศบนเว็บตอนนี้ระบุข้อมูล<b>แปลงที่ดิน</b>เป็นหลัก ยังไม่มีช่อง "จำนวนชั้น" หรือ "ประเภทสิ่งปลูกสร้าง" ให้กรอง ' +
          'น้องจึงคัดตามทำเล/งบ/เนื้อที่ให้ก่อน' + (mention.length ? ' — มี ' + mention.length + ' แปลงที่ในประกาศเอ่ยถึงสิ่งปลูกสร้าง' : '') +
          ' ถ้าต้องการเฉพาะแปลงที่มี' + (f.floors ? 'บ้าน ' + f.floors + ' ชั้น' : 'สิ่งปลูกสร้าง') + ' ทีมงานตรวจให้ได้ครับ</p>';
        if (mention.length) { res.areaCount = res.list.length; lastResults = mention.slice(0, MAX_CARDS); res.list = mention; }
      }
      if (!res.list.length) {
        html += '<b>ยังไม่พบแปลงที่ตรงกับ ' + esc(crit.join(' · ') || 'เงื่อนไขนี้') + '</b> (ประกาศทั้งหมด ' + all.length + ' แปลง)';
        if (res.hiddenUnknown) html += '<br>อีก ' + res.hiddenUnknown + ' แปลงไม่ได้แสดง เพราะยังไม่ได้ระบุข้อมูลในช่องที่คุณกรอง — ไม่ได้แปลว่าไม่ตรง ทักไลน์ถามทีมงานได้เลยครับ';
        html += '<br>ฝากโจทย์นี้ไว้ให้ทีมช่างรังวัดหาให้ฟรีได้ครับ ' + link('wanted.html', 'ฝากหาที่ดิน →');
        return { html: html, chips: ['ดูประกาศทั้งหมด', 'ฝากหาที่ดิน', 'คุยกับเจ้าหน้าที่'] };
      }
      html += '<b>พบ ' + (res.areaCount || res.list.length) + ' แปลง</b>' + (crit.length ? ' ที่ตรงกับ ' + esc(crit.join(' · ')) : ' ที่ประกาศอยู่') +
        (res.areaCount ? ' — แสดง ' + res.list.length + ' แปลงที่เอ่ยถึงสิ่งปลูกสร้างก่อน ' + link('listings.html', 'ดูทั้งหมด →') :
         res.list.length > MAX_CARDS ? ' — แสดง ' + MAX_CARDS + ' แปลงแรก ' + link('listings.html', 'ดูทั้งหมด →') : '');
      if (res.hiddenUnknown) html += '<br><small>อีก ' + res.hiddenUnknown + ' แปลงไม่ได้แสดง เพราะยังไม่ได้ระบุข้อมูลในช่องที่คุณกรอง — ไม่ได้แปลว่าไม่ตรง</small>';
      var ch = [];
      if (res.list.length >= 2) ch.push('เปรียบเทียบแปลงเหล่านี้');
      ch.push('ถูกที่สุดก่อน', 'เฉพาะที่มีโฉนด');
      // ขอ "เปรียบเทียบ" มาในประโยคเดียวกับโจทย์ — เทียบให้เลยไม่ต้องถามซ้ำ (สูงสุด 4 แปลงแรก)
      if (opt.compare && lastResults.length >= 2) {
        var pick = lastResults.slice(0, 4);
        if (window.NJCompare) { NJCompare.write(pick.map(function (x) { return x.id; })); NJCompare.sync(); NJCompare.renderBar(); }
        html += '<br><b>ตารางเทียบ ' + pick.length + ' แปลง</b> ' + link('compare.html', 'เปิดตารางเทียบเต็ม →') + compareHtml(pick);
        ch = ['ถูกที่สุดคือแปลงไหน', 'เฉพาะที่มีโฉนด', 'คุยกับเจ้าหน้าที่'];
      }
      return { html: html, cards: lastResults, chips: ch };
    }, function () {
      return { html: '<b>ตอนนี้โหลดรายการที่ดินไม่สำเร็จครับ</b><br>ลองใหม่อีกครั้ง หรือโทร ' + TEL_TXT, chips: ['คุยกับเจ้าหน้าที่'] };
    });
  }

  // ตารางเทียบสั้นๆ ในแชท — เฉพาะช่องที่ API ส่งมาจริง · "—" = ยังไม่ได้ระบุ ไม่ใช่ไม่มี (กติกาเดียวกับ comparepage.js)
  function compareHtml(items) {
    var V = window.NJVocab || {};
    var DASH = '<span class="njchat-none">—</span>';
    function val(v) { return v ? esc(v) : DASH; }
    var rows = [
      ['ราคารวม', function (x) { return x.estValue > 0 ? baht(x.estValue) : DASH; }],
      ['ราคาต่อ ตร.ว.', function (x) { return x.pricePerWa > 0 ? baht(x.pricePerWa) : DASH; }],
      ['เนื้อที่', function (x) { return val(areaTh(x.totalWa)); }],
      ['ทำเล', function (x) { var L = x.land || {}; return val([L.tambon, L.amphoe, L.province].filter(Boolean).join(' ')); }],
      ['เอกสารสิทธิ์', function (x) { var L = x.land || {}; return val(L.deedType && V.DEED_TH ? V.DEED_TH[L.deedType] : ''); }],
      ['ผังสี', function (x) { var L = x.land || {}; return val(L.zoneColor && V.ZONE_TH ? V.ZONE_TH[L.zoneColor].split(' — ')[0] : ''); }],
      ['ถนนหน้าที่ดิน', function (x) { var L = x.land || {}; return val(L.roadSurface && V.ROAD_TH ? V.ROAD_TH[L.roadSurface] : ''); }],
      ['สิ่งที่แปลงมี', function (x) { var L = x.land || {}; return val((L.features || []).map(function (k) { return V.FEATURE_TH ? V.FEATURE_TH[k] : k; }).join(', ')); }],
      ['ระดับข้อมูล', function (x) { return x.tier === 2 ? '✓ รังวัดยืนยันแล้ว' : '◐ ข้อมูลเบื้องต้น'; }]
    ];
    var head = '<tr><th></th>' + items.map(function (x) { return '<th>' + link('land.html?id=' + encodeURIComponent(x.id), x.parcelInfo || x.id) + '</th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th>' + items.map(function (x) { return '<td>' + r[1](x) + '</td>'; }).join('') + '</tr>'; }).join('');
    return '<div class="njchat-table"><table>' + head + body + '</table></div>' +
      '<small>ขีด “—” = ยังไม่ได้ระบุข้อมูลช่องนั้น ไม่ได้แปลว่าแปลงนั้นไม่มี</small>';
  }

  function compareReply(text) {
    var nums = (String(text).match(/\d+/g) || []).map(Number).filter(function (n) { return n >= 1 && n <= lastResults.length; });
    var pick = nums.length >= 2 ? nums.map(function (n) { return lastResults[n - 1]; }) : lastResults.slice(0, 4);
    if (pick.length < 2) {
      return Promise.resolve({ html: 'บอกโจทย์มาก่อนครับ เช่น "หาที่ดินในปทุมธานี ไม่เกิน 5 ล้าน" แล้วน้องจะเทียบแปลงที่เจอให้ทันที (เทียบได้ครั้งละไม่เกิน 4 แปลง)',
        chips: ['หาที่ดินในกรุงเทพฯ ปริมณฑล', 'ดูประกาศทั้งหมด'] });
    }
    if (window.NJCompare) { NJCompare.write(pick.map(function (x) { return x.id; })); NJCompare.sync(); NJCompare.renderBar(); }
    return Promise.resolve({ html: '<b>เทียบ ' + pick.length + ' แปลงให้แล้วครับ</b> ' + link('compare.html', 'เปิดตารางเทียบเต็ม →') + compareHtml(pick),
      chips: ['ถูกที่สุดคือแปลงไหน', 'ค่าโอนมีอะไรบ้าง', 'คุยกับเจ้าหน้าที่'] });
  }

  // ---------------------------------------------------------------------------
  // ค่ารังวัด — คิดจาก NJPricing.computeQuote แบบเดียวกับ surveyquote.js (ส่ง nights ของโซนเสมอ)
  function jobOf(q) {
    if (has(q, ['แบ่งแยก', 'แบ่งโฉนด', 'แยกโฉนด', 'แบ่งแปลง'])) return 'รวม-แบ่งแยก';
    if (has(q, ['รวมโฉนด', 'รวมแปลง'])) return 'รวมโฉนด';
    return 'สอบเขต';
  }
  function travelInput(province) {
    if (!P || !P.zoneOf || !province) return null;
    var code = P.zoneOf(province); if (!code) return null;
    var zi = null; (P.TRAVEL_ZONES || []).forEach(function (z) { if (z.code === code) zi = z; });
    return { province: province, zone: code, nights: zi ? zi.nights : 0 };
  }
  function surveyPriceReply(text, slots) {
    var q = norm(text);
    var s = slots || {};
    var wa = parseAreaWa(text) || s.wa || 0;
    var f = parseSearch(text);
    var prov = f.provinces[0] || s.province || '';
    var deedsM = String(text).match(/(\d+)\s*โฉนด/); var deeds = deedsM ? Number(deedsM[1]) : (s.deeds || 1);
    var splitM = String(text).match(/(?:แบ่ง(?:เป็น)?|ออกเป็น)\s*(\d+)\s*แปลง/); var split = splitM ? Number(splitM[1]) : (s.split || 0);
    var job = s.job && !has(q, ['สอบเขต', 'แบ่งแยก', 'รวมโฉนด']) ? s.job : jobOf(q);

    if (!(wa > 0)) {
      pending = { intent: 'survey', slots: { job: job, province: prov, deeds: deeds, split: split } };
      return Promise.resolve({ html: 'ได้เลยครับ ค่ารังวัดคิดตาม<b>เนื้อที่</b>และ<b>ประเภทงาน</b> — แปลงนี้เนื้อที่ประมาณเท่าไหร่ครับ (เช่น "2 ไร่ 1 งาน" หรือ "80 ตารางวา")' +
        (prov ? '' : ' และอยู่จังหวัดไหน จะได้คิดค่าเดินทางให้ถูกครับ'), chips: ['1 ไร่', '2 ไร่ 2 งาน', '100 ตารางวา'] });
    }
    return loadPricing().then(function () {
      var rai = wa / WA_PER_RAI;
      var r = P.computeQuote({ jobType: job, rai: rai, deeds: deeds, splitPlots: job === 'รวม-แบ่งแยก' ? split : 0, vatRate: 0, fees: [], travel: travelInput(prov) });
      var lines = [
        '<b>ประมาณการค่า' + esc(job === 'สอบเขต' ? 'รังวัดสอบเขต' : job === 'รวมโฉนด' ? 'รวมโฉนด' : 'แบ่งแยกโฉนด') + '</b> เนื้อที่ ' + esc(areaTh(wa)) + ' (' + raiTxt(rai) + ' ไร่)' + (prov ? ' จ.' + esc(prov) : ''),
        'ราคาตั้งต้นตามตาราง (' + esc(r.rangeLabel || '') + '): ' + baht(r.base)
      ];
      if (r.deed) lines.push('ค่าดำเนินการโฉนด ' + deeds + ' โฉนด: ' + baht(r.deed));
      if (r.split) lines.push('ค่าแปลงแบ่งแยกเพิ่ม ' + split + ' แปลง: ' + baht(r.split));
      if (r.travelTotal) lines.push('ค่าดำเนินการนอกพื้นที่ (โซน ' + esc(r.travel && r.travel.zone) + '): ' + baht(r.travelTotal));
      else if (!prov) lines.push('<small>ยังไม่รวมค่าเดินทาง — บอกจังหวัดที่ตั้งแปลงมา น้องคิดรวมให้ครับ (กทม./ปริมณฑลไม่มีค่าเดินทาง)</small>');
      lines.push('<b>รวมประมาณ ' + baht(r.subtotal) + '</b> (ยังไม่รวม VAT 7% กรณีขอใบกำกับภาษี) · รวม ' + esc(r.includedService || ''));
      lines.push('<small>⚠️ เป็นราคาประมาณการจากตารางราคาของบริษัท ไม่ใช่ใบเสนอราคา — ราคาจริงขึ้นกับหน้างาน (จำนวนหมุด สภาพพื้นที่) ทีมขายเป็นผู้ยืนยัน · ฝากขายกับเราด้วยลด 5%</small>');
      pending = { intent: 'survey', slots: { job: job, province: prov, deeds: deeds, split: split, wa: wa } };
      return { html: lines.join('<br>'), chips: [prov ? 'ขอใบเสนอราคาจริง' : 'อยู่กรุงเทพฯ', job === 'สอบเขต' ? 'ถ้าเป็นแบ่งแยกโฉนดล่ะ' : 'ถ้าเป็นสอบเขตล่ะ', 'เตรียมเอกสารอะไรบ้าง'] };
    }, function () {
      return { html: 'ตอนนี้โหลดตารางราคาไม่สำเร็จครับ เลยยังบอกตัวเลขให้ไม่ได้ — ทักไลน์หรือโทร ' + TEL_TXT + ' บอกเนื้อที่และประเภทงาน ทีมงานแจ้งราคาให้ทันทีครับ', chips: ['คุยกับเจ้าหน้าที่'] };
    });
  }

  function humanReply(msg) {
    var lineHref = window.njLineAskUrl ? njLineAskUrl(msg || 'สวัสดีครับ คุยกับน้องเอ็นเจชัวร์แล้ว อยากคุยกับเจ้าหน้าที่ต่อครับ') : LINE_URL;
    return { html: 'ได้เลยครับ ทีมงานตอบเอง ' + HOURS + '<div class="njchat-cta">' +
      '<a class="njchat-btn line" href="' + esc(lineHref) + '" target="_blank" rel="noopener" data-contact="line">💬 ทักไลน์ @716lffzt</a>' +
      '<a class="njchat-btn fb" href="' + esc(FB_URL) + '" target="_blank" rel="noopener" data-contact="messenger">💬 เมสเซนเจอร์</a>' +
      '<a class="njchat-btn tel" href="' + TEL_HREF + '" data-contact="tel">📞 โทร ' + TEL_TXT + '</a></div>' };
  }

  // ---------------------------------------------------------------------------
  // ตัวจ่ายงาน — ลำดับสำคัญ: เรื่องเฉพาะเจาะจงก่อน เรื่องกว้างทีหลัง
  function route(text) {
    var q = norm(text);
    if (!q) return Promise.resolve(null);

    // สล็อตที่รออยู่ (เช่น รอเนื้อที่) — ถ้าข้อความใหม่เป็นคำตอบของสิ่งที่ถามไป
    if (pending && pending.intent === 'survey' && (parseAreaWa(text) > 0 || (parseSearch(text).provinces.length && pending.slots.wa) || has(q, ['ถ้าเป็น', 'กรุงเทพ']))) {
      // ถามใหม่โดยระบุประเภทงานเอง = โจทย์ใหม่ จำไว้แค่จังหวัด (จำนวนโฉนด/แปลงของคำถามก่อนไม่ควรติดมา)
      var merged = has(q, ['สอบเขต', 'แบ่งแยก', 'รวมโฉนด']) && parseAreaWa(text) > 0 ? { province: pending.slots.province } : Object.assign({}, pending.slots);
      var pf = parseSearch(text); if (pf.provinces.length) merged.province = pf.provinces[0];
      return surveyPriceReply(text, merged);
    }

    // ขอใบเสนอราคาจริง = งานของทีมขาย — ส่งต่อพร้อมสรุปโจทย์ที่คุยกันไว้ลงในข้อความไลน์ (ไม่วนกลับมาคิดราคาซ้ำ)
    if (has(q, ['ขอใบเสนอราคา', 'ขอราคาจริง', 'ขอใบเสนอ'])) {
      var sl = pending && pending.intent === 'survey' ? pending.slots : {};
      var sum = 'ขอใบเสนอราคางานรังวัด' + (sl.job ? ' (' + sl.job + ')' : '') + (sl.wa ? ' เนื้อที่ ' + areaTh(sl.wa) : '') + (sl.province ? ' จ.' + sl.province : '') + ' ครับ (เช็กราคาจากน้องเอ็นเจชัวร์แล้ว)';
      var hr = humanReply(sum);
      hr.html = 'ใบเสนอราคาจริงต้องให้ทีมขายออกให้ครับ (ดูหน้างาน จำนวนหมุด แล้วยืนยันราคา) — ทักไลน์ได้เลย น้องใส่รายละเอียดที่คุยกันไว้ให้แล้ว<br>' + hr.html;
      return Promise.resolve(hr);
    }
    if (has(q, ['คุยกับเจ้าหน้าที่', 'คุยกับคน', 'คนจริง', 'แอดมิน', 'ขอสายคน', 'ขอเบอร์', 'โทรหา', 'ติดต่อทีมงาน', 'เบอร์โทร', 'ไลน์'])) return Promise.resolve(humanReply());
    if (has(q, ['เป็นบอท', 'บอทเหรอ', 'บอทใช่', 'เป็นai', 'ใช่aiไหม', 'เป็นคนไหม', 'ใช่คนไหม', 'คุณคือใคร', 'น้องคือใคร', 'คือใคร'])) return Promise.resolve({ html: nl2br(KB.identity), chips: ['คุยกับเจ้าหน้าที่', 'หาที่ดินในกรุงเทพฯ ปริมณฑล'] });
    if (has(q, ['สวัสดี', 'หวัดดี', 'hello', 'เฮลโล']) || q === 'hi' || q === 'ดีครับ' || q === 'ดีค่ะ') return Promise.resolve({ html: greetHtml(), chips: HOME_CHIPS });
    if (has(q, ['ขอบคุณ', 'ขอบใจ', 'thank'])) return Promise.resolve({ html: 'ยินดีครับ 🙏 มีอะไรถามน้องได้ตลอด หรือทักทีมงานได้ที่ไลน์ @716lffzt ครับ', chips: HOME_CHIPS.slice(0, 3) });
    if (has(q, ['เวลาทำการ', 'เปิดกี่โมง', 'กี่โมง', 'ที่อยู่บริษัท', 'ออฟฟิศอยู่'])) return Promise.resolve({ html: 'ทีมงานทำการ ' + HOURS + ' ครับ สำนักงานอยู่ที่ 121/124 หมู่ 4 ต.บางเมือง อ.เมืองสมุทรปราการ จ.สมุทรปราการ 10270 · โทร ' + TEL_TXT, chips: ['คุยกับเจ้าหน้าที่'] });

    // "เปรียบเทียบ" — ถ้ามาพร้อมโจทย์ค้น (จังหวัด/งบ/เนื้อที่ ฯลฯ) ให้ค้นก่อนแล้วเทียบต่อในคำตอบเดียว
    if (has(q, ['เปรียบเทียบ', 'เทียบ'])) {
      var fc = parseSearch(text);
      var critC = fc.provinces.length || fc.pmin || fc.pmax || fc.amin || fc.amax || fc.deed !== 'all' || fc.zone !== 'all' || fc.feats.length || fc.building;
      if (critC) { pending = { intent: 'search', text: text }; return searchReply(text, { compare: true }); }
      return compareReply(text);
    }
    if (has(q, ['ดูประกาศทั้งหมด', 'ประกาศทั้งหมด', 'มีกี่แปลง', 'ที่ดินทั้งหมด', 'ทั้งหมดกี่'])) return searchReply('ที่ดินทั้งหมด');

    // ค่ารังวัด (ต้องมาก่อน "ราคา" ทั่วไป)
    if (has(q, ['ค่ารังวัด', 'ราคารังวัด', 'รังวัดเท่าไหร่', 'รังวัดกี่บาท', 'รังวัดแพง', 'ค่าสอบเขต', 'ค่าแบ่งแยก', 'ค่ารวมโฉนด', 'ค่าบริการรังวัด', 'ใบเสนอราคา']) ||
        (has(q, ['รังวัด', 'สอบเขต', 'แบ่งแยก', 'รวมโฉนด']) && has(q, ['ราคา', 'เท่าไหร่', 'เท่าไร', 'กี่บาท', 'ค่าใช้จ่าย', 'ประเมิน', 'คิดยังไง'])) ||
        (has(q, ['ไร่', 'ตารางวา', 'ตร.ว']) && has(q, ['รังวัด', 'สอบเขต', 'แบ่งแยก', 'รวมโฉนด']))) return surveyPriceReply(text);
    if (has(q, ['ค่าโอน', 'ค่าธรรมเนียมโอน', 'ภาษีโอน', 'ภาษีธุรกิจเฉพาะ', 'อากรแสตมป์', 'หักณที่จ่าย', 'วันโอนมี', 'ค่าใช้จ่ายวันโอน'])) return Promise.resolve({ html: nl2br(KB.transfer) + '<br>' + link('guides.html#calc', 'เปิดเครื่องคำนวณค่าโอน/ภาษี →'), chips: ['ขั้นตอนโอนกรรมสิทธิ์', 'คุยกับเจ้าหน้าที่'] });
    if (has(q, ['ขั้นตอนโอน', 'โอนกรรมสิทธิ์', 'โอนที่ดินยังไง', 'วันโอนต้อง'])) return Promise.resolve({ html: 'วันโอน คู่สัญญาทั้งสองฝ่ายไปแสดงตัวที่สำนักงานที่ดินที่ที่ดินตั้งอยู่ พร้อมโฉนดตัวจริง บัตรประชาชน และเอกสารที่เกี่ยวข้อง เจ้าหน้าที่ตรวจเอกสาร ประเมินราคา คำนวณค่าธรรมเนียม แล้วจดทะเบียนโอนและบันทึกหลังโฉนดในวันเดียวกันครับ — ฝากขายกับเรา ทีมงานประสานงานวันโอนให้ทั้งสองฝ่าย', chips: ['ค่าโอนมีอะไรบ้าง', 'ขั้นตอนฝากขายที่ดิน'] });
    if (has(q, ['ราคาประเมิน', 'ประเมินราคา', 'ประเมินที่ดิน', 'ที่ดินราคาเท่าไหร่', 'มูลค่าที่ดิน', 'ตีราคา'])) return Promise.resolve({ html: nl2br(KB.valuation) + '<br>' + link('guides.html#valuecalc', 'เครื่องประเมินเบื้องต้น →') + ' · ' + link('consign.html', 'ให้ทีมงานประเมินฟรี →'), chips: ['ขั้นตอนฝากขายที่ดิน', 'ค่าโอนมีอะไรบ้าง'] });

    if (has(q, ['ฝากขาย', 'ลงประกาศ', 'ขายที่ดิน', 'อยากขาย', 'จะขาย', 'ประกาศขาย', 'ค่านายหน้า', 'นายหน้า', 'คอมมิชชั่น', 'ค่าคอม']) && !has(q, ['หาซื้อ'])) {
      if (has(q, ['เอกสาร'])) return Promise.resolve({ html: nl2br(KB.docsConsign) + '<br>' + link('consign.html', 'ฝากขายฟรี →'), chips: ['ขั้นตอนฝากขายที่ดิน', 'คุยกับเจ้าหน้าที่'] });
      return Promise.resolve({ html: nl2br(KB.consign) + '<br>' + link('consign.html', 'กรอกฟอร์มฝากขายฟรี →'), chips: ['เอกสารฝากขายมีอะไรบ้าง', 'ราคาประเมินคิดยังไง', 'คุยกับเจ้าหน้าที่'] });
    }
    if (has(q, ['เอกสาร', 'เตรียมอะไร', 'ต้องใช้อะไร', 'มอบอำนาจ', 'ทด21', 'ท.ด.21'])) return Promise.resolve({ html: nl2br(KB.docsSurvey), chips: ['ขั้นตอนยื่นรังวัด', 'ค่ารังวัดสอบเขต 2 ไร่ เท่าไหร่'] });
    if (has(q, ['คิวรังวัด', 'กี่วัน', 'ใช้เวลา', 'นานไหม', 'ระยะเวลา', 'เสร็จเมื่อไหร่', 'ได้คิว'])) return Promise.resolve({ html: nl2br(KB.queue), chips: ['ขั้นตอนยื่นรังวัด', 'คุยกับเจ้าหน้าที่'] });
    if (has(q, ['ยื่นรังวัด', 'ขั้นตอนรังวัด', 'รังวัดยังไง', 'รังวัดทำยังไง', 'เริ่มรังวัด', 'ขอรังวัด', 'จ้างรังวัด'])) return Promise.resolve({ html: nl2br(KB.howtoSurvey) + '<br>' + link('portal.html', 'ระบบติดตามงานรังวัด →'), chips: ['เตรียมเอกสารอะไรบ้าง', 'คิวรังวัดกี่วัน', 'ค่ารังวัดสอบเขต 2 ไร่ เท่าไหร่'] });
    if (has(q, ['รังวัดเอกชน', 'ช่างรังวัดเอกชน', 'เอกชนคือ', 'ต่างจากกรมที่ดิน', 'เชื่อถือได้ไหม', 'ถูกกฎหมาย', 'ใบอนุญาต'])) return Promise.resolve({ html: nl2br(KB.whatPrivate), chips: ['รับงานรังวัดอะไรบ้าง', 'ขั้นตอนยื่นรังวัด'] });
    if (has(q, ['ประเภทงาน', 'รับงานอะไร', 'ทำอะไรได้บ้าง', 'บริการอะไร', 'มีบริการ', 'จัดสรร', 'ทำแผนที่'])) return Promise.resolve({ html: nl2br(KB.types), chips: ['ค่ารังวัดสอบเขต 2 ไร่ เท่าไหร่', 'ขั้นตอนฝากขายที่ดิน'] });
    if (has(q, ['ตรวจทรัพย์', 'ขายทอดตลาด', 'กรมบังคับคดี', 'ทรัพย์ธนาคาร', 'ทรัพย์หลุด', 'ตรวจก่อนซื้อ', 'ประมูล'])) return Promise.resolve({ html: nl2br(KB.verify) + '<br>' + link('verify.html', 'ส่งทรัพย์ให้ตรวจ →'), chips: ['คุยกับเจ้าหน้าที่'] });
    if (has(q, ['ฝากหา', 'หาให้หน่อย', 'ช่วยหา'])) return Promise.resolve({ html: nl2br(KB.wanted) + '<br>' + link('wanted.html', 'ฝากหาที่ดินฟรี →'), chips: ['หาที่ดินในกรุงเทพฯ ปริมณฑล'] });
    if (has(q, ['ติดตามงาน', 'สถานะงาน', 'รหัสเข้าระบบ', 'ลืมรหัส', 'เข้าระบบ', 'portal'])) return Promise.resolve({ html: nl2br(KB.portal) + '<br>' + link('portal.html', 'ระบบติดตามงานรังวัด →'), chips: ['คุยกับเจ้าหน้าที่'] });
    if (has(q, ['พื้นที่ให้บริการ', 'รับงานที่ไหน', 'ไปถึงไหม', 'ต่างจังหวัดรับไหม', 'ค่าเดินทาง'])) return Promise.resolve({ html: nl2br(KB.area), chips: ['ค่ารังวัดสอบเขต 2 ไร่ เท่าไหร่'] });
    if (has(q, ['โฉนดคือ', 'นส3', 'น.ส.3', 'สค1', 'ส.ค.1', 'เอกสารสิทธิ์ต่าง', 'โฉนดกับ'])) return Promise.resolve({ html: 'โฉนดที่ดิน (น.ส.4) คือเอกสารสิทธิ์สมบูรณ์ที่สุด ระวางแผนที่แม่นยำ · น.ส.3/น.ส.3ก เป็นสิทธิครอบครองที่ยังไม่ออกโฉนดเต็มรูป · ส.ค.1 เป็นเพียงการแจ้งครอบครองเบื้องต้น ยังโอนขายทันทีไม่ได้ครับ — ช่างรังวัดเอกชนรับงานได้เฉพาะที่ดินที่มีโฉนดแล้ว ' + link('guides.html#deed', 'อ่านเพิ่ม →'), chips: ['เฉพาะที่มีโฉนด', 'ทำไมต้องรังวัดก่อนซื้อ'] });
    if (has(q, ['ทำไมต้องรังวัด', 'รังวัดก่อนซื้อ', 'จำเป็นต้องรังวัด', 'ไม่รังวัดได้ไหม'])) return Promise.resolve({ html: 'เนื้อที่ในโฉนดอาจคลาดเคลื่อนจากพื้นที่จริง หรือแนวเขตทับซ้อนกับแปลงข้างเคียงโดยไม่รู้ตัวครับ การรังวัดสอบเขตโดยช่างรังวัดที่ได้รับอนุญาตจะยืนยันตำแหน่งหลักเขตจริงในสนาม ป้องกันซื้อที่ดินผิดขนาดหรือมีข้อพิพาทภายหลัง — ทุกแปลงที่ขึ้นป้าย "รังวัดยืนยันแล้ว" บนเว็บนี้ผ่านขั้นตอนนี้แล้ว ' + link('guides.html#survey', 'อ่านเพิ่ม →'), chips: ['ค่ารังวัดสอบเขต 2 ไร่ เท่าไหร่', 'หาที่ดินในกรุงเทพฯ ปริมณฑล'] });
    if (has(q, ['ภาระจำยอม', 'สิทธิเก็บกิน', 'ทางเข้าออก', 'ที่ตาบอด'])) return Promise.resolve({ html: 'ภาระจำยอมคือสิทธิที่ที่ดินแปลงหนึ่งต้องยอมให้อีกแปลงใช้ประโยชน์บางอย่าง (เช่น ทางเข้า–ออก) ส่วนสิทธิเก็บกินคือสิทธิใช้และเก็บผลประโยชน์จากทรัพย์ของผู้อื่น — ทั้งสองอย่างอาจจดแจ้งไว้หลังโฉนด ควรตรวจก่อนซื้อเสมอครับ แปลงที่ยังไม่มีทางเข้าออกตามกฎหมาย (ที่ตาบอด) เราจะระบุตรงๆ ในรายงานตรวจ ไม่เขียนให้อ่านนุ่มกว่าความจริง ' + link('guides.html#servitude', 'อ่านเพิ่ม →'), chips: ['ตรวจทรัพย์ก่อนซื้อ'] });

    // ค้นแปลง — เมื่อมีคำที่บ่งว่ากำลังหาของ หรือมีเงื่อนไข (จังหวัด/งบ/เนื้อที่/ผัง)
    var f = parseSearch(text);
    // ⚠️ ไม่ใช้คำว่า "หา" โดดๆ — เป็นส่วนของคำอื่นบ่อยมาก ("ปัญหา" "หาก") จะดึงทุกอย่างเข้าโหมดค้นแปลง
    var searchy = has(q, ['หาที่', 'หาแปลง', 'หาบ้าน', 'ต้องการบ้าน', 'บ้านใน', 'บ้านแถว', 'บ้านที่มี', 'มีที่ดิน', 'มีแปลง', 'สนใจที่', 'สนใจแปลง', 'อยากได้', 'อยากซื้อ', 'ซื้อที่ดิน', 'ที่ดินใน', 'ที่ดินแถว', 'ที่ดินเช่า', 'เช่าที่', 'ประกาศ', 'แปลงไหน', 'ถูกที่สุด', 'ถูกสุด', 'เฉพาะ', 'ให้ดู', 'ส่งมา', 'ดูรูป', 'ขอดู']);
    var hasCrit = f.provinces.length || f.pmin || f.pmax || f.amin || f.amax || f.deed !== 'all' || f.zone !== 'all' || f.feats.length;
    if (searchy || hasCrit) {
      // "ถูกที่สุดก่อน" / "เฉพาะที่มีโฉนด" ต่อจากผลค้นก่อนหน้า = กรองซ้ำในโจทย์เดิม
      if (pending && pending.intent === 'search' && !f.provinces.length && !hasCrit && has(q, ['ถูก', 'แพง', 'ใหญ่'])) return searchReply(pending.text + ' ' + text);
      if (pending && pending.intent === 'search' && !f.provinces.length && has(q, ['เฉพาะ'])) return searchReply(pending.text + ' ' + text);
      pending = { intent: 'search', text: text };
      return searchReply(text);
    }
    return Promise.resolve(null);   // ไม่เข้ากฎไหน → ให้ AI
  }

  // ---------------------------------------------------------------------------
  // ทางสำรอง: ส่งให้ Claude ผ่านเซิร์ฟเวอร์ (ประวัติ 6 ข้อความล่าสุด · ไม่ส่งข้อมูลส่วนตัว)
  function askAI(text, history) {
    return fetch(API() + '/api/public/njchat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(-6).map(function (m) { return { role: m.role, text: m.text.slice(0, 800) }; }), page: location.pathname.split('/').pop() || 'index.html', website: '' })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok && j.text) return { html: nl2br(j.text), ai: true, chips: ['คุยกับเจ้าหน้าที่'] };
      throw new Error((j && j.reason) || 'no ai');
    }).catch(function () {
      return { html: 'เรื่องนี้น้องยังตอบเองไม่ได้ครับ ให้ทีมงานตอบดีกว่า — ทักไลน์ @716lffzt หรือโทร ' + TEL_TXT + ' (' + HOURS + ')<br>หรือลองถามเรื่องที่น้องถนัด: หาที่ดิน · เทียบแปลง · ค่ารังวัด · ขั้นตอนฝากขาย · เอกสาร · ค่าโอน',
        chips: ['คุยกับเจ้าหน้าที่'].concat(HOME_CHIPS.slice(0, 3)) };
    });
  }

  // ---------------------------------------------------------------------------
  // UI — สร้างจาก JS ทั้งหมด (หน้าไหนโหลดไฟล์นี้ก็ได้ปุ่ม) · หน้าเต็มใช้ <div id="njchat-page">
  var ui = { root: null, log: null, input: null, launcher: null, panel: null, open: false, full: false, history: [], opened: false };

  function loadHistory() { try { var v = JSON.parse(sessionStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(v) ? v.slice(-30) : []; } catch (e) { return []; } }
  function saveHistory() { try { sessionStorage.setItem(HIST_KEY, JSON.stringify(ui.history.slice(-30))); } catch (e) {} }

  function bubble(role, html, extra) {
    var el = document.createElement('div');
    el.className = 'njchat-msg ' + role;
    el.innerHTML = (role === 'bot' ? '<span class="njchat-avatar" aria-hidden="true">NJ</span>' : '') + '<div class="njchat-bubble">' + html + '</div>';
    ui.log.appendChild(el);
    if (extra && extra.cards && extra.cards.length && window.NJListing) {
      var wrap = document.createElement('div');
      wrap.className = 'njchat-cards';
      wrap.innerHTML = extra.cards.map(NJListing.card).join('');
      el.appendChild(wrap);
      if (window.NJCompare) { NJCompare.decorate(wrap); NJCompare.sync(wrap); }
      NJListing.bindGrid(wrap, 'njchat');
    }
    if (extra && extra.chips && extra.chips.length) {
      var c = document.createElement('div');
      c.className = 'njchat-chips';
      c.innerHTML = extra.chips.map(function (t) { return '<button type="button" class="njchat-chip" data-njchat-say="' + esc(t) + '">' + esc(t) + '</button>'; }).join('');
      el.appendChild(c);
    }
    ui.log.scrollTop = ui.log.scrollHeight;
    return el;
  }
  function typing(on) {
    var t = ui.log.querySelector('.njchat-typing');
    if (on && !t) { t = document.createElement('div'); t.className = 'njchat-msg bot njchat-typing'; t.innerHTML = '<span class="njchat-avatar" aria-hidden="true">NJ</span><div class="njchat-bubble"><i></i><i></i><i></i></div>'; ui.log.appendChild(t); ui.log.scrollTop = ui.log.scrollHeight; }
    if (!on && t) t.remove();
  }

  var busy = false;
  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    bubble('user', esc(text));
    ui.history.push({ role: 'user', text: text }); saveHistory();
    ui.input.value = '';
    typing(true);
    route(text).then(function (r) { return r || askAI(text, ui.history); }).then(function (r) {
      typing(false);
      var html = r.html + (r.ai ? '<div class="njchat-ai-tag">🤖 ตอบโดย AI จากข้อมูลบนเว็บ — เรื่องเฉพาะแปลงให้ทีมงานยืนยันอีกครั้ง</div>' : '');
      bubble('bot', html, r);
      ui.history.push({ role: 'bot', text: r.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800) }); saveHistory();
    }).catch(function (e) {
      typing(false);
      bubble('bot', 'ขออภัยครับ ตอบไม่สำเร็จ ลองใหม่อีกครั้ง หรือโทร ' + TEL_TXT, { chips: ['คุยกับเจ้าหน้าที่'] });
    }).then(function () { busy = false; ui.input.focus(); });
  }

  function panelHtml(full) {
    return '<div class="njchat-head">' +
      '<span class="njchat-avatar big" aria-hidden="true">NJ</span>' +
      '<div class="njchat-title"><b>' + BOT + '</b><small>AI ผู้ช่วยที่ดินชัวร์ · ตอบทันที</small></div>' +
      (full ? '' : '<a class="njchat-expand" href="chat.html" aria-label="เปิดแชทเต็มหน้า" title="เปิดเต็มหน้า">⤢</a><button type="button" class="njchat-close" aria-label="ปิดแชท">✕</button>') +
      '</div>' +
      '<div class="njchat-log" role="log" aria-live="polite" aria-label="บทสนทนา"></div>' +
      '<form class="njchat-form" autocomplete="off">' +
      '<input class="njchat-input" type="text" maxlength="500" placeholder="พิมพ์ถามน้องได้เลย เช่น หาที่ดินในปทุมธานี ไม่เกิน 5 ล้าน" aria-label="พิมพ์ข้อความ">' +
      '<button type="submit" class="njchat-send" aria-label="ส่ง">➤</button>' +
      '</form>' +
      '<div class="njchat-foot">น้องเป็น AI · ไม่รับปากแทนทีมงาน · ' + '<a href="' + esc(LINE_URL) + '" target="_blank" rel="noopener" data-contact="line">คุยกับเจ้าหน้าที่</a></div>';
  }

  function mount() {
    var page = document.getElementById('njchat-page');
    ui.full = !!page;
    if (page) {
      page.className = 'njchat njchat-full';
      page.innerHTML = panelHtml(true);
      ui.panel = page;
      // ปี พ.ศ. ท้ายหน้า — หน้าอื่นมีสคริปต์ของหน้าเติมให้ chat.html ไม่มี จึงเติมเฉพาะเมื่อยังว่าง (ไม่เขียนทับค่าเดิม)
      var y = document.getElementById('year');
      if (y && !y.textContent) y.textContent = new Date().getFullYear() + 543;
    } else {
      ui.launcher = document.createElement('button');
      ui.launcher.type = 'button';
      ui.launcher.className = 'njchat-launcher';
      ui.launcher.setAttribute('aria-label', 'เปิดแชทกับ' + BOT);
      ui.launcher.innerHTML = '<span class="njchat-avatar" aria-hidden="true">NJ</span><span class="njchat-launcher-txt">ถาม' + BOT + '</span>';
      document.body.appendChild(ui.launcher);
      ui.panel = document.createElement('div');
      ui.panel.className = 'njchat njchat-panel';
      ui.panel.setAttribute('role', 'dialog');
      ui.panel.setAttribute('aria-label', 'แชทกับ' + BOT);
      ui.panel.hidden = true;
      ui.panel.innerHTML = panelHtml(false);
      document.body.appendChild(ui.panel);
      ui.launcher.addEventListener('click', function () { toggle(!ui.open); });
      dodgeConsent();
      // แบนเนอร์คุกกี้ (#nj-consent · z 900) ถูกลบออกจาก DOM เมื่อผู้ใช้ตอบ — เฝ้า childList ของ body
      // เพื่อคืนตำแหน่งปุ่ม · ตัวเฝ้าแก้แค่ style ของปุ่ม (ไม่ใช่ childList) จึงไม่วนลูปแบบบั๊ก compare.js
      if (window.MutationObserver) new MutationObserver(dodgeConsent).observe(document.body, { childList: true });
      window.addEventListener('resize', dodgeConsent);
      ui.panel.querySelector('.njchat-close').addEventListener('click', function () { toggle(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ui.open) toggle(false); });
    }
    ui.log = ui.panel.querySelector('.njchat-log');
    ui.input = ui.panel.querySelector('.njchat-input');
    ui.panel.querySelector('.njchat-form').addEventListener('submit', function (e) { e.preventDefault(); send(ui.input.value); });
    // ปุ่มคำถามด่วน — ใช้ capture + stopPropagation กัน bindGrid/compare ดักคลิกซ้อน (กติกาเดียวกับ compare.js)
    ui.panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-njchat-say]');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      send(b.getAttribute('data-njchat-say'));
    }, true);
    // ปุ่มติดต่อในแชทนับสถิติแบบเดียวกับการ์ด (แมป ไม่ใช่ if/else — กติกาข้อ 6)
    var CONTACT_TRACK = { line: ['line_click', 'line'], messenger: ['messenger_click', 'messenger'], tel: ['tel_click', 'phone'] };
    ui.panel.addEventListener('click', function (e) {
      var a = e.target.closest('[data-contact]');
      if (!a || a.closest('.njchat-cards')) return;   // ปุ่มบนการ์ดนับโดย bindGrid อยู่แล้ว
      var t = CONTACT_TRACK[a.getAttribute('data-contact')];
      if (!t) return;
      if (window.njTrackInternal) njTrackInternal(t[0]);
      if (window.njTrack) njTrack('Contact', { method: t[1], from: 'njchat' });
    });

    ui.history = loadHistory();
    if (ui.history.length) {
      ui.history.forEach(function (m) { bubble(m.role, m.role === 'user' ? esc(m.text) : nl2br(m.text)); });
      bubble('bot', 'คุยต่อได้เลยครับ', { chips: HOME_CHIPS.slice(0, 3) });
    } else {
      bubble('bot', greetHtml(), { chips: HOME_CHIPS });
    }
    if (ui.full) { ui.input.focus(); trackOpen(); var qs = new URLSearchParams(location.search).get('q'); if (qs) send(qs); }
  }
  // แบนเนอร์ยินยอมคุกกี้เป็นเรื่องกฎหมาย ต้องอยู่บนสุดเสมอ (z 900) — ปุ่มแชทจึงต้องหลบขึ้นไปอยู่เหนือมัน
  // ไม่ใช่ทับมัน (เจอจริงตอนทดสอบ: ปุ่มถูกแบนเนอร์บังจนกดไม่ได้ทั้งหน้าที่ 390px)
  function dodgeConsent() {
    if (!ui.launcher) return;
    var c = document.getElementById('nj-consent');
    var want = '';
    if (c) {
      var r = c.getBoundingClientRect();
      if (r.height > 0) want = Math.round(window.innerHeight - r.top + 12) + 'px';
    }
    if (ui.launcher.style.bottom !== want) ui.launcher.style.bottom = want;
    // แผงแชท: จอใหญ่เลื่อนขึ้นตามปุ่ม (ระยะเดิม +56px) · จอเล็กแผงเต็มจอ ใส่ที่ว่างท้ายแผงไม่ให้แบนเนอร์บังช่องพิมพ์
    var mobile = window.innerWidth <= 640;
    var pb = want && mobile ? (parseInt(want, 10) - 12) + 'px' : '';
    var pbot = want && !mobile ? (parseInt(want, 10) + 56) + 'px' : '';
    if (ui.panel.style.paddingBottom !== pb) ui.panel.style.paddingBottom = pb;
    if (ui.panel.style.bottom !== pbot) ui.panel.style.bottom = pbot;
  }
  function trackOpen() {
    if (ui.opened) return;
    ui.opened = true;
    if (window.njTrackInternal) njTrackInternal('chat_open');
  }
  function toggle(open) {
    ui.open = open;
    ui.panel.hidden = !open;
    ui.launcher.classList.toggle('on', open);
    ui.launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.classList.toggle('njchat-open', open && window.innerWidth <= 640);
    if (open) { trackOpen(); ui.input.focus(); ui.log.scrollTop = ui.log.scrollHeight; }
  }

  function boot() {
    if (!window.NJListing) { console.warn('[njchat] ต้องโหลด listingcard.js ก่อน'); return; }
    mount();
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }

  // เปิดให้เทสต์ (njchat.test.js) และหน้าอื่นเรียก NJChat.open()/ask()
  window.NJChat = {
    BOT: BOT,
    parseSearch: parseSearch, applySearch: applySearch, parseMoney: parseMoney, parseAreaWa: parseAreaWa,
    route: route, compareHtml: compareHtml, KB: KB,
    open: function () { if (ui.panel && !ui.full) toggle(true); },
    ask: function (t) { if (ui.panel) { if (!ui.full) toggle(true); send(t); } },
    _setPricing: function (p) { P = p; },
    _reset: function () { pending = null; lastResults = []; },
    _setListings: function (l) { cache.list = l; cache.at = Date.now(); }
  };
})();
