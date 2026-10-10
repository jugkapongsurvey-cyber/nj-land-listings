/* การ์ดแปลงที่ดิน — ตัวเรนเดอร์กลาง ใช้ร่วมกันทั้งหน้าแรก (marketplace.js) และหน้ารวมประกาศ (listings.js)
 *
 * ⚠️ กติกาข้อเดียวที่ห้ามผ่อนในไฟล์นี้: แสดงได้เฉพาะสิ่งที่ API ส่งมาจริงเท่านั้น
 * ห้ามมีแปลงตัวอย่าง ห้ามเติมข้อความแทนช่องที่ไม่มีข้อมูล (เช่น "มีทางเข้าออก", "โฉนด",
 * จำนวนรูปขั้นต่ำ) เพราะทุกบรรทัดบนการ์ดนี้ผู้ซื้อเข้าใจว่าเป็นข้อเท็จจริงที่ผ่านการรังวัดมาแล้ว
 * — ซึ่งเป็นสิ่งเดียวที่แบรนด์นี้ขาย
 *
 * ทำไมต้องแยกไฟล์: เดิม card() อยู่ใน IIFE ของ marketplace.js หน้าเดียว พอมีหน้ารวมประกาศเพิ่ม
 * ทางเลือกคือก๊อปตัวเรนเดอร์ไปอีกชุด ซึ่งแปลว่ากติกาข้างบนจะมีสองที่ให้ลืมแก้ ห้ามทำแบบนั้น
 */
(function () {
  'use strict';

  // ช่องทางติดต่อ — อ่านจาก `config.js` (window.NJ_CONFIG) ก่อนเสมอ
  // ⚠️ ค่าที่เขียนไว้ตรงนี้เป็น **ค่าถอย** สำหรับหน้าที่ยังไม่ได้โหลด config.js
  //    ไม่ใช่แหล่งข้อมูล — เปลี่ยนเบอร์/ไอดีไลน์ให้แก้ที่ config.js ที่เดียว
  var CFG = window.NJ_CONFIG || {};
  var LINE = CFG.lineUrl || 'https://line.me/R/ti/p/@716lffzt';
  var FB = CFG.messengerUrl || window.NJ_MESSENGER_URL || 'https://m.me/NJTeeDinSure';
  var TEL_TXT = CFG.tel || '02-162-0405';
  var TEL2_TXT = CFG.tel2 || '084-915-8601';
  var TEL = 'tel:' + TEL_TXT.replace(/[^0-9+]/g, '');
  var TEL2 = 'tel:' + TEL2_TXT.replace(/[^0-9+]/g, '');

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function money(value) {
    if (!Number(value)) return 'ราคาติดต่อสอบถาม';
    return '฿' + Number(value).toLocaleString('th-TH');
  }
  function num(value) { return Number(value || 0).toLocaleString('th-TH'); }
  function ago(iso) {
    var d = new Date(iso), days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (!iso || isNaN(d)) return '';
    if (days <= 0) return 'อัปเดตวันนี้';
    if (days === 1) return 'อัปเดตเมื่อวาน';
    if (days < 31) return 'อัปเดต ' + days + ' วันที่แล้ว';
    return 'อัปเดต ' + d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  }
  // ตร.ว. → "2-1-50 ไร่" · ใช้แสดงเนื้อที่ให้อ่านแบบที่คนไทยใช้จริง
  // ไม่มีเนื้อที่คืนค่าว่าง (ไม่ใช่ "0-0-0") — ผู้เรียกต้องซ่อนบรรทัดนั้นไปเลย
  function areaTh(totalWa) {
    var w = Number(totalWa || 0);
    if (!(w > 0)) return '';
    var rai = Math.floor(w / 400), ngan = Math.floor((w % 400) / 100);
    var wa = Math.round((w % 100) * 100) / 100;
    return rai + '-' + ngan + '-' + wa + ' ไร่';
  }

  // ตรวจอะไรแล้ว (รูปแบบบริการ รอบ 3ค) — ระบบนับให้ที่เซิร์ฟเวอร์ที่เดียว (inspectedOf ใน server.js)
  // ⚠️ ป้าย "ตรวจโดยที่ดินชัวร์" ขึ้นได้เฉพาะเมื่อ any === true (มีผลตรวจจริงอย่างน้อยหนึ่งอย่าง)
  //    ไม่ส่งมา / any ไม่ใช่ true / ตัวเลขผิดรูป = null (ไม่มีป้าย) — ห้ามเดา ห้ามติดป้ายให้ประกาศที่ยังไม่มีใครตรวจ
  function inspectedOf(x) {
    if (!x || x.any !== true) return null;
    var n = function (v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : 0; };
    return { any: true, checksDone: n(x.checksDone), checksTotal: n(x.checksTotal), verifyReached: n(x.verifyReached), verifyTotal: n(x.verifyTotal), site: x.site === true };
  }
  // ข้อความบอกว่าตรวจอะไรไปแล้ว — บอกจำนวนตามจริง ไม่ใช่คำรับรองผล
  function inspectedText(x) {
    var i = inspectedOf(x);
    if (!i) return '';
    if (i.checksDone > 0) return 'ตรวจแล้ว ' + i.checksDone + (i.checksTotal ? ' จาก ' + i.checksTotal : '') + ' หัวข้อ';
    if (i.verifyReached > 0) return 'ยืนยันแล้ว ' + i.verifyReached + (i.verifyTotal ? ' จาก ' + i.verifyTotal : '') + ' ระดับ';
    if (i.site) return 'ลงพื้นที่แล้ว';
    return '';
  }

  function normalize(item, index) {
    return {
      id: item.id || ('land-' + index),
      type: item.type === 'rent' ? 'rent' : 'sell',
      parcelInfo: item.parcelInfo || '',
      estValue: Number(item.estValue || 0),
      blurb: item.blurb || '',
      photos: Array.isArray(item.photos) ? item.photos : [],
      updatedAt: item.updatedAt || '',
      // ระดับความน่าเชื่อถือจาก API — ไม่มีข้อมูล = ระดับ 1 เสมอ ห้ามเดาเป็น 2
      tier: item.tier === 2 ? 2 : 1,
      // เนื้อที่ + ราคาต่อหน่วย เซิร์ฟเวอร์คำนวณมาให้แล้ว ห้ามหารเองในเบราว์เซอร์
      // (หารเองเมื่อไหร่ หน้ารวมกับหน้ารายละเอียดจะได้ตัวเลขคนละค่าเมื่อปัดเศษไม่เหมือนกัน)
      totalWa: Number(item.totalWa || 0),
      pricePerWa: Number(item.pricePerWa || 0),
      pricePerRai: Number(item.pricePerRai || 0),
      // ราคาต่อ ตร.ม. ของห้องชุด — เซิร์ฟเวอร์คิดจากขนาดห้องที่เจ้าของแจ้ง · 0 = ไม่มีข้อมูล/ประกาศเช่า → ซ่อน (ห้ามหารเอง)
      pricePerSqm: Number(item.pricePerSqm || 0),
      land: item.land || null,
      // ชื่อทำเลสั้นบรรทัดเดียวสำหรับหัวการ์ด — คนละช่องกับ parcelInfo ซึ่งเป็นก้อนยาว
      // (ที่ตั้ง · ข้อความที่เจ้าของพิมพ์ · เนื้อที่) ที่เจ้าของบางรายใส่โฆษณาทั้งชุดลงไป
      // ⚠️ ไม่มีค่า = ให้ shortTitleOf() ประกอบจากช่องที่ตั้งแทน ห้ามถอยไปใช้ parcelInfo ทั้งก้อน
      shortTitle: String(item.shortTitle || '').trim(),
      // รูปย่อที่เซิร์ฟเวอร์สร้างให้ — สองขนาด เรียงลำดับตรงกับ photos ทุกใบทั้งคู่
      // ⚠️ ใบที่ยังไม่มีไฟล์ย่อ ฝั่งระบบส่งไฟล์ต้นฉบับกลับมาแทน ไม่ใช่ค่าว่าง ห้ามซ่อนรูปทิ้ง
      //    API รุ่นเก่าที่ยังไม่ส่งช่องนี้มาเลย = อาร์เรย์ว่าง แล้วการ์ดถอยไปใช้ photos เอง
      thumbs: Array.isArray(item.thumbs) ? item.thumbs : [],     // 800×600
      thumbsSm: Array.isArray(item.thumbsSm) ? item.thumbsSm : [], // 400×300
      // คะแนนความพร้อมของข้อมูล (Phase 3) — เซิร์ฟเวอร์ส่ง null มาเมื่อยังไม่มีใครกรอกผลตรวจอะไรเลย
      // ⚠️ ห้ามแปลง null เป็น 0 ที่นี่ — 0 กับ "ยังไม่มีใครไปตรวจ" คนละเรื่องกันโดยสิ้นเชิง
      score: item.score || null,
      // ใครดูแลการขาย (รูปแบบบริการ A/B/C ของระบบ) — 'owner' ขายเองชัวร์ · 'nj' ฝากขายชัวร์ · '' ใบตามเงื่อนไขเดิม
      // ⚠️ ค่าที่ไม่รู้จัก = '' (หน้าตาเหมือนประกาศเดิมทุกอย่าง) ห้ามเดา
      saleBy: item.saleBy === 'owner' || item.saleBy === 'nj' ? item.saleBy : '',
      // ตรวจอะไรแล้ว (เฉพาะประกาศที่มีรูปแบบบริการ) — null = ไม่มีป้าย
      inspected: inspectedOf(item.inspected),
      // ประกาศเด่น — ระบบคิดวันหมด/สิทธิ์ให้แล้ว ส่งมาแค่ true/false · ไม่ส่ง/ค่าอื่น = ไม่ใช่ประกาศเด่น (ห้ามเดา)
      featured: item.featured === true,
      // รายละเอียดจากเจ้าของ (specs) + วันที่ประกาศ — ใช้จับคู่ "ประกาศอื่นในโครงการนี้" ของห้องชุดและบรรทัด "ประกาศเมื่อ" · ไม่มี = null/ว่าง
      specs: item.specs && typeof item.specs === 'object' ? item.specs : null,
      listedAt: typeof item.listedAt === 'string' ? item.listedAt : ''
    };
  }

  // ชื่อทำเลสั้นบรรทัดเดียวสำหรับหัวการ์ด
  // ลำดับ: ช่อง shortTitle ที่ทีมกรอกเอง → ที่ตั้งที่ประกอบจาก ต./อ./จ. → ท่อนแรกของ parcelInfo
  // ⚠️ ใช้ `NJLandMeta.localityOf` ตัวเดียวกับที่หน้ารายละเอียดและตัวสร้างหน้าสแตติกใช้
  //    ประกอบเองที่นี่อีกชุดเมื่อไหร่ = ชื่อบนการ์ดกับชื่อบนหน้าแปลงเพี้ยนจากกันโดยไม่มีอะไรเตือน
  function shortTitleOf(item) {
    if (item.shortTitle) return item.shortTitle;
    var LM = window.NJLandMeta;
    var loc = LM && LM.localityOf ? LM.localityOf(item) : '';
    if (loc) return loc;
    var first = String(item.parcelInfo || '').split(' · ')[0].trim();
    if (!first) return 'แปลงที่ดิน';
    return first.length > 60 ? first.slice(0, 60).trim() + '…' : first;
  }

  // ป้ายผังสีบนการ์ด · สี/ลายอ่านจาก NJVocab ที่เดียว (ห้ามพิมพ์รหัสสีซ้ำที่นี่)
  function zoneChip(key) {
    var V = window.NJVocab;
    if (!key || !V || !V.ZONE_HEX || !V.ZONE_HEX[key]) return '';
    var hex = V.ZONE_HEX[key];
    var bg = (V.ZONE_HATCH && V.ZONE_HATCH[key])
      ? 'repeating-linear-gradient(135deg,' + hex + ' 0 3px,#fff 3px 7px)'
      : hex;
    return '<span class="card-zone" title="' + esc('ผังสี: ' + (V.ZONE_TH[key] || '')) + '">' +
      '<i style="background:' + bg + '" aria-hidden="true"></i>ผัง' + esc(V.zoneShort ? V.zoneShort(key) : key) + '</span>';
  }

  // ---------- แถวข้อมูลที่ทีมตรวจ/บันทึกแล้ว (รอบ 3 · 10 ต.ค. 2569) ----------
  // ผู้ซื้อเห็นจุดต่างของเรา (ข้อมูลตรวจจริง) โดยไม่ต้องเปิดหน้าแปลง · สูงสุด CK_MAX ชิป เรียงตามความสำคัญ
  // ⚠️⚠️ กติกาที่ห้ามผ่อน
  //  1. หมุดหลักเขต · ทางเข้า–ออก อ่านผ่าน NJHealth.topic() ตัวเดียวกับหน้าแปลงเท่านั้น (ห้ามอ่าน checks/health ตรง)
  //     และขึ้นเฉพาะเมื่อหน้าแปลงก็แสดงหัวข้อนั้น (ระดับ 2 หรือมีรายงานสุขภาพ) — การ์ดกับหน้าแปลงต้องไม่ขัดกัน
  //  2. API รุ่นเก่าที่ไม่ส่งคีย์ health ในหน้ารวม = ไม่ขึ้นสองชิปนั้น (topic จะถอยไปอ่าน checks อย่างเดียวแล้วขัดกับหน้าแปลง)
  //  3. ยังไม่ได้ตรวจ (สถานะ none) = ไม่มีชิป · ห้ามขึ้น "ไม่มี" · ห้ามเดาค่า
  //  4. ข้อความอิสระที่ทีมพิมพ์ในผลตรวจไม่ขึ้นบนการ์ด — ใช้ค่าโครงสร้างจากรายงานสุขภาพ หรือคำมาตรฐาน
  //  5. ข้อมูลที่เจ้าของแจ้ง (specs) ไม่ขึ้นแถวนี้ · หน้ากว้างผ่าน NJHealth.frontageM (เลขเปล่าไม่นับ)
  var CK_MAX = 4;
  var CK_ICON = { ok: '✓', warn: '!', bad: '✕' };
  function ckLi(cls, text, title) {
    return '<li class="card-ck' + (cls ? ' ' + cls : '') + '"' + (title ? ' title="' + esc(title) + '"' : '') + '>' + text + '</li>';
  }
  function ckState(state, label, value) {
    // ไอคอนกำกับทุกสถานะ — ห้ามบอกด้วยสีอย่างเดียว
    // ค่า (.ck-v) แยกจากชื่อหัวข้อ — การ์ดแนวนอนบนมือถือซ่อนค่า เหลือ "✓ ทางเข้าออก" ไม่ให้ชิปถูกตัดกลางคำ
    // รายละเอียดเต็มอยู่ใน title และหน้าแปลง
    return ckLi('is-' + state, '<i aria-hidden="true">' + CK_ICON[state] + '</i><span class="ck-l">' + esc(label) + '</span>' +
      (value ? '<span class="ck-v"> ' + esc(value) + '</span>' : ''),
      label + (value ? ' ' + value : '') + ' (ข้อมูลจากทีมงาน)');
  }
  var CK_WORD = { ok: 'ตรวจแล้ว', warn: 'ต้องตรวจเพิ่ม', bad: 'ต้องตรวจเพิ่ม' };
  function factsHtml(item) {
    var L = item.land || {}, V = window.NJVocab || {}, H = window.NJHealth, out = [];
    var showTopics = !!H && ('health' in L) && (item.tier === 2 || !!L.health);
    if (showTopics) {
      var ac = H.topic(L, 'access');
      if (ac.state !== 'none') {
        var AT = V.ACCESS_TH || {};
        var av = (ac.src === 'health' && !ac.conflict && L.health && AT[L.health.access]) ? AT[L.health.access] : CK_WORD[ac.state];
        out.push(ckState(ac.state, 'ทางเข้าออก', av));
      }
      var mk = H.topic(L, 'markers');
      if (mk.state !== 'none') {
        var HH = L.health || {}, mv = CK_WORD[mk.state];
        if (mk.src === 'health' && !mk.conflict && HH.markerTotal > 0 && HH.markerFound != null) {
          mv = (HH.markerFound >= HH.markerTotal ? 'พบครบ ' : 'พบ ') + HH.markerFound + '/' + HH.markerTotal;
        }
        out.push(ckState(mk.state, 'หมุดหลักเขต', mv));
      }
    }
    var zone = zoneChip(L.zoneColor);
    if (zone) out.push(ckLi('card-ck-zone', zone));
    var fm = H && H.frontageM ? H.frontageM(L) : null;
    if (fm) out.push(ckLi('', '<span>' + esc('หน้ากว้าง ≈ ' + num(fm) + ' ม.') + '</span>', 'หน้ากว้างโดยประมาณจากทีมงาน ไม่ใช่ค่ารังวัด'));
    if (L.roadSurface && V.ROAD_TH && V.ROAD_TH[L.roadSurface]) {
      if (L.roadSurface === 'none') out.push(ckState('bad', V.ROAD_TH.none, ''));
      else out.push(ckLi('', '<span>' + esc('ถนน' + V.ROAD_TH[L.roadSurface] + (Number(L.roadLanes) > 0 ? ' ' + Number(L.roadLanes) + ' เลน' : '')) + '</span>'));
    }
    if (L.deedType && V.DEED_TH && V.DEED_TH[L.deedType]) out.push(ckLi('', '<span>' + esc(V.DEED_TH[L.deedType]) + '</span>'));
    if (!out.length) return '';
    return '<ul class="card-checked" aria-label="ข้อมูลที่ทีมงานตรวจหรือบันทึกแล้ว">' + out.slice(0, CK_MAX).join('') + '</ul>';
  }

  // ข้อความกำกับป้ายประกาศเด่น — อ่านจาก landmeta.js ที่เดียว (ไม่มีไฟล์นั้น = ข้อความถอยไว้ตรงนี้)
  function featuredNote() {
    var LM = window.NJLandMeta;
    return (LM && LM.FEATURED_NOTE) || 'ประกาศเด่น = ตำแหน่งแสดงที่เจ้าของประกาศชำระค่าบริการ ไม่ใช่การรับรองแปลงจากที่ดินชัวร์';
  }

  // ระดับคะแนนความพร้อม → คลาสของตัวเลขท้ายการ์ด (เขียว/ส้ม ตามดีไซน์)
  // ⚠️ อ่าน `band` ที่เซิร์ฟเวอร์ตัดสินมาแล้ว ห้ามตั้งเกณฑ์เองจากตัวเลข
  //    ตั้งเองเมื่อไหร่ = เว็บกับระบบหลังบ้านแบ่งระดับคนละแบบโดยไม่มีอะไรเตือน
  function scoreClass(band) {
    return (band === 'low' || band === 'weak') ? 'score is-low' : 'score';
  }

  function card(item) {
    // รูปการ์ด — ใช้ตัวย่อที่เซิร์ฟเวอร์สร้างให้ ทุกใบจึงสูงเท่ากันและไม่กินเน็ตมือถือ
    // วัดบน production จริง 22 ก.ย. 69: การ์ด 6 ใบหน้าแรก 1,924 KB -> 526 KB (เล็กลง 73%)
    // ⚠️ ใบที่ยังไม่มีไฟล์ย่อ ฝั่งระบบส่งไฟล์ต้นฉบับกลับมาในช่อง thumbs ให้แล้ว ไม่ใช่ค่าว่าง
    // ⚠️ ต้องมี width/height ตรงกับสัดส่วนจริงของกรอบ (4:3) เสมอ ไม่งั้นหน้ากระโดดตอนรูปโหลดเสร็จ
    //
    // ⚠️⚠️ ตัวเลขใน sizes คือ "ความกว้างจริงของกรอบรูป" ไม่ใช่ความกว้างของไฟล์
    //    เบราว์เซอร์คูณอัตราส่วนพิกเซลของเครื่องเอง แล้วค่อยเลือกไฟล์จาก srcset
    //    · ≤767px การ์ดเป็นแนวนอน คอลัมน์รูปกว้าง 120px ตายตัว (listingcard.css บรรทัด .is-compact)
    //      120 × DPR 3 = 360 ยังต่ำกว่า 400 → มือถือได้ไฟล์ 400×300 เสมอ ซึ่งคือเหตุผลทั้งหมดของขนาดนี้
    //    · กว้างกว่านั้นการ์ดอยู่ในกริด 2–3 คอลัมน์ กรอบราว 370–470px → DPR 1 ได้ 400 · DPR 2 ได้ 800
    //    **แก้ความกว้างคอลัมน์รูปใน listingcard.css เมื่อไหร่ ต้องแก้เลขนี้ตาม** ไม่งั้นรูปเบลอหรือโหลดเกินจำเป็น
    var src = item.thumbs[0] || item.photos[0] || '';
    var sm = item.thumbsSm[0] || '';
    // ขนาดที่สองต่างจากขนาดแรกจริงเท่านั้นถึงใส่ srcset — ใบที่ยังไม่มีไฟล์ย่อได้ไฟล์ต้นฉบับ
    // กลับมาเหมือนกันทั้งสองช่อง ใส่ srcset ไปก็เป็นไฟล์เดียวกันสองบรรทัด
    var srcset = (sm && sm !== src)
      ? ' srcset="' + esc(sm) + ' 400w, ' + esc(src) + ' 800w" sizes="(max-width:767px) 120px, 400px"'
      : '';
    var media = src
      ? '<img src="' + esc(src) + '"' + srcset + fullAttr(src, item.photos[0]) + ' width="800" height="600" loading="lazy" decoding="async" alt="' +
        esc(shortTitleOf(item)) + '">'
      : '<div class="fallback-land" aria-hidden="true"></div>';
    // นับรูปตามจริง ไม่มีรูปก็ไม่ต้องขึ้นตัวเลข
    var count = item.photos.length > 1 ? '<span class="photo-count">▣ ' + item.photos.length + '</span>' : '';

    // ---------- ราคา ----------
    var perWa = item.pricePerWa > 0 ? '<span>฿' + num(item.pricePerWa) + '/ตร.ว.</span>' : '';
    // ห้องชุดไม่มีเนื้อที่ดิน (perWa = 0) จึงใช้ราคาต่อ ตร.ม. แทน · ถ้ามีทั้งคู่ก็แสดงทั้งคู่ (ไม่เกิดกับข้อมูลจริง)
    if (item.pricePerSqm > 0) perWa += '<span>฿' + num(item.pricePerSqm) + '/ตร.ม.</span>';

    // ---------- แถวป้ายใต้คำโปรย ----------
    // แสดงเฉพาะช่องที่มีค่าจริง · ช่องว่าง = "ยังไม่ได้กรอก" ไม่ใช่ "ไม่มี" จึงต้องไม่ขึ้นป้ายอะไรเลย
    var LP = (item.land || {});
    var V = window.NJVocab || {};
    var tags = [];
    var a = areaTh(item.totalWa);
    if (a) tags.push('<span class="tag">' + esc(a) + '</span>');
    // ผังสีกับเอกสารสิทธิ์ย้ายไปแถวข้อมูลที่ตรวจแล้ว (factsHtml) — แถวนี้ซ่อนบนมือถือ แถวนั้นไม่ซ่อน
    var PT = V.PROPERTY_TH || {};
    if (LP.propertyType && PT[LP.propertyType]) {
      tags.push('<span class="tag">' + esc(PT[LP.propertyType]) + (LP.floors > 0 ? ' ' + LP.floors + ' ชั้น' : '') + '</span>');
    } else if (LP.floors > 0) {
      tags.push('<span class="tag">' + LP.floors + ' ชั้น</span>');
    }

    // ---------- ป้ายบันไดการตรวจสอบ 2 ระดับ ----------
    // ⚠️ **ไม่ได้แทนที่** ป้ายเขียว/ทองบนรูป สองอย่างตอบคนละคำถาม
    //    ป้ายบนรูป = "ทีม NJ ตรวจสอบแล้วหรือยัง" (เจ้าของกิจการเลือกคำ "ตรวจสอบโดย NJ" 28 ก.ย. 69) · ป้ายนี้ = "ตรวจไปแล้วกี่ระดับจาก 2"
    //    คืนสตริงว่างเมื่อยังไม่ถึงระดับใดเลย — การ์ดของแปลงเก่าจึงหน้าตาเหมือนเดิม
    var marks = (window.NJVerified && item.land ? NJVerified.badgeHtml(item.land.verify) : '');

    // ---------- แถวท้ายการ์ด ----------
    // ⚠️ **รหัสทรัพย์ต้องเห็นบนการ์ด ไม่ใช่ซ่อนไว้ใน data-id**
    // ผู้ซื้อทักไลน์มาว่า "สนใจแปลงนึงในเว็บ" โดยไม่บอกว่าแปลงไหน ทีมจับคู่กลับไม่ได้
    // แปลว่าเจ้าของที่ดินไม่เคยรู้ว่ามีคนสนใจแปลงตัวเอง
    var when = ago(item.updatedAt);
    var footL = 'รหัส <b>' + esc(item.id) + '</b>' + (when ? ' · ' + esc(when) : '');
    // คะแนนความพร้อม — เซิร์ฟเวอร์ส่ง null มาเมื่อยังไม่มีใครกรอกผลตรวจอะไรเลย
    // ⚠️ null ≠ 0 · ศูนย์บนแปลงที่ยังไม่มีใครไปตรวจ อ่านแล้วเหมือนแปลงถูกตัดสินไปแล้ว
    var footR = item.score && typeof item.score.total === 'number'
      ? '<span class="' + scoreClass(item.score.band) + '">ข้อมูลพร้อม ' + item.score.total + '/100</span>'
      : '';

    var href = 'land.html?id=' + encodeURIComponent(item.id);
    // ⚠️ เป็น <article> ไม่ใช่ <a> ครอบทั้งใบ — save.js/compare.js ยัด <button> เข้าไปใน .card-media
    //    ปุ่มซ้อนในลิงก์เป็น HTML ที่ใช้ไม่ได้ และคลิกจะทะลุไปเปิดหน้ารายละเอียดแทน
    //    ทั้งใบยังกดได้อยู่ดีผ่าน data-href ที่ bindGrid() ดักให้ (และชื่อแปลงเป็นลิงก์จริงสำหรับคีย์บอร์ด)
    return '<article class="land-card is-compact" data-href="' + esc(href) + '" data-id="' + esc(item.id) + '">' +
      '<div class="card-media">' + media +
        '<div class="card-badges">' +
          '<span class="badge">' + (item.type === 'rent' ? 'ให้เช่า' : 'ขาย') + '</span>' +
          // ⚠️ ป้ายประกาศเด่นต้องมีข้อความว่าเป็นพื้นที่ที่เจ้าของจ่ายเอง ไม่ใช่การรับรองแปลง (title + aria-label)
          (item.featured ? '<span class="badge badge-featured" title="' + esc(featuredNote()) + '" aria-label="ประกาศเด่น — ' + esc(featuredNote()) + '">★ ประกาศเด่น</span>' : '') +
          (item.tier === 2
            ? '<span class="badge badge-verified">✓ ตรวจสอบโดย NJ</span>'
            : '<span class="badge badge-basic">ข้อมูลเบื้องต้น</span>') +
        '</div>' + count +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-price"><b>' + money(item.estValue) + '</b>' + perWa + '</div>' +
        '<h3 class="card-title"><a href="' + esc(href) + '">' + esc(shortTitleOf(item)) + '</a></h3>' +
        factsHtml(item) +
        (item.blurb ? '<div class="card-desc">' + esc(item.blurb) + '</div>' : '') +
        (tags.length ? '<div class="card-tags">' + tags.join('') + '</div>' : '') +
        (marks ? '<div class="card-marks">' + marks + '</div>' : '') +
        '<div class="card-foot"><span>' + footL + '</span>' + footR + '</div>' +
        // ⚠️ **ปุ่มติดต่อต้องอยู่ในการ์ดทุกใบ** — ผู้สนใจไม่ต้องเลื่อนกลับไปหาเบอร์ที่ท้ายหน้า
        //    เป็นของที่ประกาศเจ้าอื่นไม่ให้ และเป็นจุดที่ลีดเข้ามาจริงมากที่สุดจุดหนึ่ง
        //    (ดีไซน์ชุดใหม่ไม่ได้วาดแถวนี้ไว้ — เจ้าของสั่งให้เอากลับ 22 ก.ย. 69)
        // ⚠️ **เบอร์สำนักงานกับเบอร์มือถือต้องมาคู่กันเสมอ** (กติกาข้อ 6) ตัดอันใดอันหนึ่งไม่ได้
        // ⚠️ `data-contact` คือสิ่งที่ `bindGrid()` ใช้นับลีด และใช้กันไม่ให้คลิกทะลุไปหน้ารายละเอียด
        '<div class="card-agent">' +
          '<span class="agent-avatar" aria-hidden="true">NJ</span>' +
          // ป้ายใครดูแลการขาย — ประกาศขายเองชัวร์ผู้ซื้อติดต่อเจ้าของผ่านฟอร์มในหน้าประกาศ (ปุ่มด้านขวายังเป็นช่องทางของทีม)
          (item.saleBy === 'owner'
            ? '<div><b>เจ้าของขายเอง</b><small>' + (inspectedText(item.inspected) ? 'ตรวจโดยที่ดินชัวร์ · ' + esc(inspectedText(item.inspected)) : 'ติดต่อเจ้าของในหน้าประกาศ') + '</small></div>'
            : '<div><b>ทีมที่ดินชัวร์</b>' + (item.saleBy === 'nj' ? '<small>ดูแลการขาย' + (when ? ' · ' + esc(when) : '') + '</small>' : (when ? '<small>' + esc(when) + '</small>' : '')) + '</div>') +
          '<span class="contact-mini">' +
            '<a href="' + LINE + '" target="_blank" rel="noopener" class="line" data-contact="line" aria-label="ติดต่อทางไลน์ เรื่องแปลง ' + esc(item.id) + '">●</a>' +
            '<a href="' + FB + '" target="_blank" rel="noopener" class="fb" data-contact="messenger" aria-label="ติดต่อทางเมสเซนเจอร์ เรื่องแปลง ' + esc(item.id) + '">f</a>' +
            '<a href="' + TEL + '" data-contact="tel" aria-label="โทรสอบถาม ' + TEL_TXT + '">☎</a>' +
            '<a href="' + TEL2 + '" data-contact="tel" aria-label="โทรสอบถาม ' + TEL2_TXT + '">📱</a>' +
          '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  // ยังไม่มีแปลงประกาศ = คนที่เข้ามาถึงตรงนี้จะเจอทางตัน
  // เปลี่ยนเป็นข้อเสนอที่ใช้ได้จริงแทน — คนที่สนใจตลาดที่ดินจำนวนมากคือเจ้าของที่ดินเอง
  function emptyHtml(isFilter) {
    if (isFilter) {
      // ค้นแล้วไม่เจอ = จังหวะที่รู้โจทย์ของผู้ซื้อชัดที่สุดในทั้งเว็บ
      // ปล่อยให้จบแค่ "ลองเปลี่ยนคำค้น" คือทิ้งลีดที่บอกความต้องการมาแล้วเต็มๆ
      return '<div class="empty-result"><b>ยังไม่พบแปลงที่ตรงกับการค้นหา</b>' +
        'ลองเปลี่ยนทำเลหรือช่วงราคา แล้วค้นหาอีกครั้ง — หรือฝากโจทย์ไว้ให้ทีมช่างรังวัดของเราหาให้ฟรี' +
        '<span class="empty-actions">' +
          '<a class="post-btn" href="wanted.html">ฝากหาที่ดินฟรี →</a>' +
        '</span>' +
      '</div>';
    }
    return '<div class="empty-result">' +
      // ⚠️ ห้ามเขียนว่า "ไม่ลงประกาศจนกว่าจะรังวัดเสร็จ" — ไม่ตรงกับนโยบายจริง
      // แปลงระดับ 1 (ข้อมูลเบื้องต้น) ขึ้นประกาศได้ตั้งแต่ได้ความยินยอมจากเจ้าของ
      // สิ่งที่เป็นเงื่อนไขจริงของการขึ้นเว็บคือ "ความยินยอม" ไม่ใช่ "รังวัดเสร็จ"
      // ⚠️ ข้อความชุดเดียวกันมีอีกที่ใน app.js (หน้า portal) — แก้ที่เดียวคืออีกหน้าไม่ตรงกัน
      '<b>ยังไม่มีแปลงที่เปิดประกาศอยู่ตอนนี้</b>' +
      'ทุกแปลงจะขึ้นเว็บได้ก็ต่อเมื่อเจ้าของที่ดินยินยอมให้เผยแพร่แล้ว และเราจะระบุไว้บนการ์ดเสมอว่าแปลงนั้นตรวจถึงระดับไหนและตรวจเมื่อไหร่ ' +
      'ระหว่างนี้บอกโจทย์ที่คุณกำลังหาไว้ได้เลย ทีมช่างรังวัดของเราจะหาแปลงที่ตรงเงื่อนไขให้' +
      '<span class="empty-actions">' +
        '<a class="post-btn" href="wanted.html">ฝากหาที่ดินฟรี →</a>' +
        '<a class="outline-btn" href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">แจ้งเตือนแปลงใหม่ทางไลน์</a>' +
        '<a class="outline-btn" href="' + FB + '" target="_blank" rel="noopener" data-contact="messenger">ทักทางเมสเซนเจอร์</a>' +
        '<a class="outline-btn" href="consign.html">มีที่ดินอยากขาย?</a>' +
      '</span>' +
    '</div>';
  }

  function loadFailedHtml() {
    // โหลดไม่ได้ ≠ ไม่มีแปลง — ต้องบอกตามจริงและให้ช่องทางติดต่อ ไม่ใช่แสดงว่าว่างเปล่า
    return '<div class="empty-result"><b>ตอนนี้โหลดรายการที่ดินไม่สำเร็จ</b>' +
      'กรุณาลองใหม่อีกครั้ง หรือโทรสอบถามได้ที่ ' + TEL_TXT + ' / ' + TEL2_TXT +
      '<span class="empty-actions"><a class="outline-btn" href="' + TEL + '" data-contact="tel">โทร ' + TEL_TXT + '</a>' +
      '<a class="outline-btn" href="' + TEL2 + '" data-contact="tel">โทร ' + TEL2_TXT + '</a></span></div>';
  }

  // ดึงรายการสด · ผู้เรียกต้องจัดการทั้งกรณีสำเร็จและล้มเหลว (สองกรณีนี้ห้ามแสดงเหมือนกัน)
  function fetchListings() {
    var base = window.NJ_API_BASE || 'https://app.njteedinsure.com';
    return fetch(base + '/api/public/listings')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) { return (data.listings || []).map(normalize); });
  }

  // แมปช่องทาง → ชื่อเหตุการณ์ที่จะนับ · เพิ่มช่องทางใหม่ = เพิ่มบรรทัดเดียวตรงนี้
  var CONTACT_TRACK = { line: ['line_click', 'line'], messenger: ['messenger_click', 'messenger'], tel: ['tel_click', 'phone'] };
  // ปุ่มติดต่อบนการ์ดสร้างหลังโหลดข้อมูล จึงผูก listener ที่ container ทีเดียว
  // ---------- ไฟล์ย่อโหลดไม่ขึ้น = ถอยไปไฟล์ต้นฉบับ ----------
  // เหตุการณ์จริง 27 ก.ย. 2569: ไฟล์ย่อของทุกแปลงถูกลบจากดิสก์ แต่ API ยังส่งลิงก์มา
  // การ์ดทั้งเว็บจึงเป็นรูปแตก ทั้งที่ไฟล์ต้นฉบับยังเปิดได้อยู่
  // ⚠️ data-full ใส่เฉพาะตอนไฟล์ย่อต่างจากต้นฉบับ · สลับได้ครั้งเดียว (ลบ data-full ทิ้งก่อนตั้ง src)
  //    ไม่งั้นต้นฉบับที่ล้มด้วยจะวนยิง error ไม่รู้จบ · ต้องถอด srcset ด้วย ไม่งั้นเบราว์เซอร์เลือกไฟล์ย่อเดิมซ้ำ
  function fullAttr(thumb, full) {
    return (full && thumb && full !== thumb) ? ' data-full="' + esc(full) + '"' : '';
  }
  function imgFallback(root) {
    if (!root || root.__njImgFb) return;
    root.__njImgFb = true;
    root.addEventListener('error', function (e) {
      var img = e.target;
      if (!img || img.tagName !== 'IMG' || !img.getAttribute('data-full')) return;
      var full = img.getAttribute('data-full');
      img.removeAttribute('data-full');
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.src = full;
    }, true);   // error ไม่ bubble — ต้องดักเฟส capture
  }

  function bindGrid(grid, from) {
    if (!grid) return;
    imgFallback(grid);
    grid.addEventListener('click', function (e) {
      var a = e.target.closest('[data-contact]');
      if (!a) {
        // คลิกที่ตัวการ์ด (ไม่ใช่ปุ่มติดต่อ) = เข้าหน้ารายละเอียด
        if (e.target.closest('a')) return;   // ลิงก์ชื่อแปลงทำงานเองอยู่แล้ว
        var cardEl = e.target.closest('.land-card[data-href]');
        if (cardEl) location.href = cardEl.dataset.href;
        return;
      }
      var t = CONTACT_TRACK[a.getAttribute('data-contact')];
      if (!t) return;
      if (window.njTrackInternal) window.njTrackInternal(t[0]);
      if (window.njTrack) window.njTrack('Contact', { method: t[1], from: from || 'listing_card' });
    });
  }

  window.NJListing = {
    LINE: LINE, FB: FB, TEL: TEL, TEL2: TEL2,
    esc: esc, money: money, num: num, ago: ago, areaTh: areaTh,
    normalize: normalize, card: card, shortTitleOf: shortTitleOf,
    inspectedOf: inspectedOf, inspectedText: inspectedText,
    emptyHtml: emptyHtml, loadFailedHtml: loadFailedHtml,
    fetchListings: fetchListings, bindGrid: bindGrid,
    fullAttr: fullAttr, imgFallback: imgFallback
  };
})();
