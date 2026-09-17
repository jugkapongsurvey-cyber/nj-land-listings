/* ===========================================================================
   ทรัพย์หน่วยงาน — รายชื่อเว็บขายทรัพย์ + ตัวอ่านลิงก์ที่ลูกค้าวางหรือแชร์เข้ามา (window.NJAgency)
   ใช้ที่ agency.html (หน้าหลัก) และ njchat.js (ลูกค้าวางลิงก์ในแชท) · เพิ่ม 2026-09-17 · P1

   ⚠️ กติกาที่ห้ามผ่อน

   1. **ไม่ดึงข้อมูลจากเว็บหน่วยงานมาเก็บหรือแสดง (ห้าม scraping)** — ไฟล์นี้อ่านแค่ "ตัวลิงก์"
      ที่ลูกค้าวางมาเอง ไม่ fetch ปลายทาง ไม่ฝังหน้าเว็บนั้น · ข้อมูลทรัพย์ทีมงานเปิดดูเองตอนตรวจ
      (กติกาเดียวกับแผน Data Platform ระยะ 2 และเอกสาร FastLEDChecker 16 ก.ย. 69)

   2. **ลิงก์ที่รับเข้ามาเป็นข้อมูลไม่น่าเชื่อถือ** — มาจาก query string ได้ (Web Share Target)
      · รับเฉพาะ http/https · ห้ามทำเป็นลิงก์ให้กดบนหน้าเรา (กันคนส่งลิงก์หลอกที่ดูเหมือนเราแนะนำ)
      · ต้อง escape ทุกครั้งที่แสดง · ห้ามให้เซิร์ฟเวอร์เปิดลิงก์นี้เองโดยไม่กรอง (SSRF)
      · ลิงก์ย่อ (bit.ly ฯลฯ) ไม่ขยายให้ — บอกลูกค้าให้วางลิงก์เต็มแทน

   3. **ค่า `source` ต้องอยู่ใน `PROPCHECK_SOURCES` ของ server.js** ไม่งั้นเซิร์ฟเวอร์เก็บเป็น "อื่นๆ"
      แล้วทีมขายกรองไม่เจอ · `contracts.test.js` ล็อกไว้ · แหล่งที่ไม่มีในรายการใช้ `null`

   4. **ลิงก์หน้าแรกของหน่วยงานอยู่ที่นี่ที่เดียว** ตรวจว่ายังเปิดได้ก่อนแก้ทุกครั้ง
      (ตรวจล่าสุด 17 ก.ย. 69 · กสิกรไทยบล็อกการตรวจอัตโนมัติ 403 แต่เปิดด้วยเบราว์เซอร์ได้)

   5. ความยาวลิงก์ที่เซิร์ฟเวอร์เก็บคือ 300 ตัวอักษร (`PROPCHECK_MAX.sourceUrl`) — ตัดพารามิเตอร์
      ติดตามโฆษณาออกก่อน ถ้ายังยาวเกินต้องบอกลูกค้า ไม่ใช่ปล่อยให้ถูกตัดเงียบๆ
   =========================================================================== */
(function (w) {
  'use strict';

  var URL_MAX = 300;

  var CATS = [
    { key: 'auction', label: 'ขายทอดตลาด' },
    { key: 'amc', label: 'บริษัทบริหารสินทรัพย์' },
    { key: 'bank', label: 'ธนาคาร' },
    { key: 'check', label: 'ข้อมูลไว้ตรวจสอบ' }
  ];

  var SOURCES = [
    { key: 'led', cat: 'auction', name: 'กรมบังคับคดี', source: 'บังคับคดี',
      url: 'https://asset.led.go.th/', hosts: ['led.go.th'],
      desc: 'ทรัพย์ขายทอดตลาดทั่วประเทศ ราคาเริ่มต้นลดลงตามนัด และต้องวางเงินประกันก่อนเข้าประมูล' },
    { key: 'bam', cat: 'amc', name: 'BAM บริหารสินทรัพย์กรุงเทพพาณิชย์', source: 'BAM',
      url: 'https://www.bam.co.th/', hosts: ['bam.co.th'],
      desc: 'ทรัพย์ NPA ขายตรงและประมูล' },
    { key: 'sam', cat: 'amc', name: 'SAM บริหารสินทรัพย์สุขุมวิท', source: 'SAM',
      url: 'https://www.sam.or.th/', hosts: ['sam.or.th'],
      desc: 'ทรัพย์ NPA ขายตรง ประมูล และยื่นซองเสนอราคา' },
    { key: 'ghb', cat: 'bank', name: 'ธนาคารอาคารสงเคราะห์ (ธอส.)', source: 'ธอส.',
      url: 'https://www.ghbhomecenter.com/', hosts: ['ghbhomecenter.com', 'ghb.co.th'],
      desc: 'บ้านและที่ดินมือสองของ ธอส.' },
    { key: 'gsb', cat: 'bank', name: 'ธนาคารออมสิน', source: 'ธนาคารออมสิน',
      url: 'https://www.gsb.or.th/', hosts: ['gsb.or.th'],
      desc: 'ทรัพย์สินรอการขายของธนาคาร' },
    { key: 'kbank', cat: 'bank', name: 'ธนาคารกสิกรไทย', source: 'ธนาคารกสิกรไทย',
      url: 'https://www.kasikornbank.com/th/propertyforsale/', hosts: ['kasikornbank.com'],
      desc: 'ทรัพย์สินรอการขาย (NPA)' },
    { key: 'ktb', cat: 'bank', name: 'ธนาคารกรุงไทย', source: 'ธนาคารกรุงไทย',
      url: 'https://npa.krungthai.com/', hosts: ['krungthai.com', 'ktb.co.th'],
      desc: 'ทรัพย์สินรอการขาย (NPA)' },
    { key: 'bay', cat: 'bank', name: 'ธนาคารกรุงศรีอยุธยา', source: 'ธนาคารกรุงศรีอยุธยา',
      url: 'https://www.krungsriproperty.com/', hosts: ['krungsriproperty.com', 'krungsri.com'],
      desc: 'ทรัพย์สินรอการขาย (NPA)' },
    { key: 'dol', cat: 'check', name: 'LandsMaps กรมที่ดิน', source: null,
      url: 'https://landsmaps.dol.go.th/', hosts: ['dol.go.th'],
      desc: 'ค้นตำแหน่งแปลงจากเลขโฉนด ใช้เช็กว่าแปลงอยู่ตรงกับที่ประกาศหรือไม่' },
    { key: 'treasury', cat: 'check', name: 'ราคาประเมิน กรมธนารักษ์', source: null,
      url: 'https://assessprice.treasury.go.th/', hosts: ['treasury.go.th'],
      desc: 'ราคาประเมินทุนทรัพย์ที่ใช้คิดค่าธรรมเนียมโอน' },
    { key: 'dpt', cat: 'check', name: 'กรมโยธาธิการและผังเมือง', source: null,
      url: 'https://www.dpt.go.th/', hosts: ['dpt.go.th'],
      desc: 'ผังเมืองรวมและข้อกำหนดการใช้ประโยชน์ที่ดิน (ผังสี)' }
  ];

  var SHORT_HOSTS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'shorturl.at', 's.id', 'lin.ee', 'cutt.ly', 'rb.gy', 'is.gd'];
  var PORTAL_HOSTS = ['facebook.com', 'fb.com', 'fb.watch', 'ddproperty.com', 'livinginsider.com', 'kaidee.com',
                      'baania.com', 'propertyhub.in.th', 'thinkofliving.com', 'hipflat.co.th', 'dotproperty.co.th'];
  // พารามิเตอร์ติดตามโฆษณา — ไม่ใช่ส่วนที่ระบุทรัพย์ ตัดทิ้งเพื่อให้ลิงก์สั้นพอเก็บ
  var TRACKING = /^(utm_\w+|fbclid|gclid|igshid|mibextid|si|ref|_ga)$/i;

  function hostIn(host, list) {
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (host === d || host.slice(-(d.length + 1)) === '.' + d) return true;
    }
    return false;
  }

  // ข้อความที่แชร์มาจากมือถือมักเป็น "ชื่อหน้า https://..." — หยิบลิงก์แรกออกมา
  function firstUrl(text) {
    var m = String(text == null ? '' : text).match(/https?:\/\/[^\s<>"']+/i);
    return m ? m[0].replace(/[)\]}.,;!?]+$/, '') : '';
  }

  function detect(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return { ok: false, reason: 'empty' };
    var found = /^https?:\/\//i.test(raw) ? raw.split(/\s+/)[0] : firstUrl(raw);
    if (!found) return { ok: false, reason: /^[a-z][a-z0-9+.-]*:/i.test(raw) ? 'scheme' : 'invalid' };
    var u;
    try { u = new URL(found); } catch (e) { return { ok: false, reason: 'invalid' }; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'scheme' };
    if (u.username || u.password) return { ok: false, reason: 'invalid' };

    var drop = [];
    u.searchParams.forEach(function (v, k) { if (TRACKING.test(k)) drop.push(k); });
    drop.forEach(function (k) { u.searchParams.delete(k); });

    var host = u.hostname.toLowerCase().replace(/^www\./, '');
    var entry = null;
    for (var i = 0; i < SOURCES.length; i++) {
      if (SOURCES[i].source && hostIn(host, SOURCES[i].hosts)) { entry = SOURCES[i]; break; }
    }
    var kind = entry ? 'agency' : hostIn(host, SHORT_HOSTS) ? 'short' : hostIn(host, PORTAL_HOSTS) ? 'portal' : 'unknown';

    // เลขอ้างอิงที่อ่านได้จากลิงก์ — ช่วยทีมงานหาทรัพย์เจอเร็วขึ้น ไม่ใช่ข้อมูลที่ยืนยันแล้ว
    var refs = [];
    u.searchParams.forEach(function (v, k) {
      if (/\d{3,}/.test(v) && v.length <= 40) refs.push({ key: k, value: v });
    });
    var pm = u.pathname.match(/\/([A-Za-z0-9_-]*\d{3,}[A-Za-z0-9_-]*)\/?$/);
    if (pm && pm[1].length <= 40) refs.push({ key: '', value: pm[1] });

    var url = u.toString();
    return {
      ok: true,
      url: url,
      host: host,
      kind: kind,
      entry: entry,
      source: entry ? entry.source : 'อื่นๆ',
      label: entry ? entry.name : host,
      auction: !!(entry && entry.cat === 'auction'),
      refs: refs.slice(0, 3),
      tooLong: url.length > URL_MAX
    };
  }

  // สิ่งที่ NJ ตรวจให้ — แยก "ตรวจจากเอกสาร" กับ "ต้องลงพื้นที่" ห้ามยุบรวม
  // (คนละราคา คนละเวลา และงานลงพื้นที่คือสิ่งที่เว็บวิเคราะห์ทรัพย์เจ้าอื่นทำไม่ได้)
  function checklist(d) {
    var items = [
      { t: 'เลขโฉนดและรายละเอียดตรงกับประกาศ', where: 'desk' },
      { t: 'ตำแหน่งแปลงบน LandsMaps ตรงกับที่ประกาศ', where: 'desk' },
      { t: 'ผังสีและข้อกำหนดการใช้ประโยชน์ที่ดิน', where: 'desk' },
      { t: 'ราคาประเมินและค่าใช้จ่ายวันโอนโดยประมาณ', where: 'desk' }
    ];
    if (d && d.auction) items.push({ t: 'ภาระติดพัน ผู้อยู่อาศัย และการขายรวมหลายแปลง', where: 'desk' });
    if (d && d.kind === 'portal') items.push({ t: 'ผู้ประกาศเป็นเจ้าของหรือได้รับมอบอำนาจจริง', where: 'desk' });
    items.push({ t: 'หมุดหลักเขต แนวเขต และการรุกล้ำ', where: 'field' });
    items.push({ t: 'ทางเข้าออกและสภาพจริงของแปลง', where: 'field' });
    return items;
  }

  // ลิงก์ไปฟอร์มตรวจทรัพย์ที่มีอยู่แล้ว (verify.html) พร้อมกรอกแหล่งทรัพย์ + ลิงก์ไว้ให้
  function verifyHref(d) {
    if (!d || !d.ok) return 'verify.html#form';
    return 'verify.html?source=' + encodeURIComponent(d.source) +
           '&url=' + encodeURIComponent(d.url.slice(0, URL_MAX)) + '#form';
  }

  w.NJAgency = {
    CATS: CATS, SOURCES: SOURCES, URL_MAX: URL_MAX,
    detect: detect, firstUrl: firstUrl, checklist: checklist, verifyHref: verifyHref
  };
})(typeof window !== 'undefined' ? window : this);
