/* ชื่อหน้า · คำโปรย · ที่ตั้ง ของแปลงที่ดิน — ชุดกลางที่ใช้ได้ทั้งเบราว์เซอร์และ Node
 *
 * ทำไมต้องแยกออกมา: ตั้งแต่ Sprint 5 มี **สองที่** ที่ต้องประกอบชื่อหน้าและคำโปรยของแปลงเดียวกัน
 *   1. `land.js`            — ตอนผู้ใช้เปิดหน้าในเบราว์เซอร์
 *   2. `build/properties.js` — ตอนสร้างหน้าสแตติกให้บอตอ่าน
 * ถ้าปล่อยให้แต่ละที่ประกอบเอง วันหนึ่งสองที่จะให้ชื่อคนละแบบสำหรับแปลงเดียวกัน
 * แล้วสิ่งที่ Google เห็นกับสิ่งที่ผู้ใช้เห็นจะไม่ตรงกัน ซึ่งเป็นเกณฑ์ที่ Google ตัดสิทธิ์ทั้งเว็บ
 * (กติกาเดียวกับ `landvocab.js` ที่เป็นแหล่งคำศัพท์เดียว และ `listingcard.js` ที่เป็นการ์ดเดียว)
 *
 * ⚠️ **ห้ามเติมค่าแทนช่องที่ API ไม่ได้ส่งมา** (กติกาข้อ 5) — ช่องไหนว่างให้ข้ามไป
 *    การประกาศราคา/พื้นที่/ประเภทที่ไม่ตรงกับหน้าจอ ถือเป็นข้อมูลหลอกลวงตามเกณฑ์ของ Google
 *
 * ⚠️ **ไม่พึ่ง `window` หรือ `document`** — รับคำศัพท์เข้ามาเป็นอาร์กิวเมนต์
 *    ผู้เรียกฝั่งเบราว์เซอร์ส่ง `window.NJVocab` · ฝั่ง build โหลด `landvocab.js` มาส่งเอง
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NJLandMeta = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // ⚠️ ช่องว่าง = "ยังไม่ได้กรอก" ไม่ใช่ "ที่ดินเปล่า" — `PROPERTY_TH` มี 'land' = ที่ดินเปล่า
  //    เป็นตัวเลือกหนึ่งอยู่แล้ว เดาแทนเมื่อไหร่ = ติดป้ายผิดให้แปลงที่มีบ้านจริง (เคย: OP-072)
  var FALLBACK_KIND = 'ทรัพย์';
  var SITE_URL = 'https://njteedinsure.com';

  function kindOf(l, vocab) {
    var pt = (l && l.land && l.land.propertyType) || '';
    var PT = (vocab && vocab.PROPERTY_TH) || {};
    return (pt && PT[pt]) ? PT[pt] : FALLBACK_KIND;
  }

  function localityOf(l) {
    var d = (l && l.land) || {};
    var p = [];
    if (d.tambon) p.push('ต.' + d.tambon);
    if (d.amphoe) p.push('อ.' + d.amphoe);
    if (d.province) p.push('จ.' + d.province);
    return p.join(' ');
  }

  // ---------- ชื่อสั้นของแปลง สำหรับชื่อหน้า ผลค้นหา และ H1 ----------
  //
  // ⚠️ **ห้ามใช้ `parcelInfo` เป็นชื่อหน้าตรงๆ** — มันคือ "ที่ตั้ง · รายละเอียดที่เจ้าของพิมพ์ ·
  // เนื้อที่" ต่อกันเป็นก้อนเดียว และเจ้าของหลายรายพิมพ์ข้อความโฆษณาทั้งชุดลงในช่องรายละเอียด
  // (เจอจริง: OP-025 ยาว 200+ ตัวอักษร) · Google ตัดชื่อที่ยาวเกินราว 60 ตัวอักษรทิ้ง
  // คนที่ค้นเจอจะเห็นชื่อขาดกลางประโยค อ่านไม่รู้เรื่อง และไม่รู้ว่าแปลงอยู่ที่ไหน
  function shortLabel(l, vocab) {
    var head = ((l && l.type === 'rent') ? 'ให้เช่า' : 'ขาย') + kindOf(l, vocab);
    var loc = localityOf(l);
    if (!loc) {
      // ไม่มีช่องแยก — ใช้ท่อนแรกของ parcelInfo (ท่อนที่ตั้ง) แล้วตัดความยาว
      var first = String((l && l.parcelInfo) || '').split(' · ')[0].trim();
      loc = first.length > 60 ? first.slice(0, 60).trim() + '…' : first;
    }
    var area = (l && l.land && l.land.deedArea) ? String(l.land.deedArea).trim() : '';
    // ข้อมูลเก่าบางแปลงเก็บเนื้อที่เป็น "14-3-48" เฉยๆ ไม่มีหน่วย — เติมให้อ่านออกในผลค้นหา
    // เติมเฉพาะรูปแบบ ไร่-งาน-วา ที่ชัดเจนเท่านั้น ข้อความอื่นปล่อยไว้ตามที่ทีมกรอก
    if (/^\d+-\d+-\d+(\.\d+)?$/.test(area)) area += ' ไร่';
    return [head, loc, area].filter(Boolean).join(' · ');
  }

  function titleOf(l, vocab) { return shortLabel(l, vocab) + ' | ที่ดินชัวร์'; }

  function metaDesc(l, vocab) {
    var L = (l && l.land) || {};
    var bits = [shortLabel(l, vocab)];
    if (Number(l.estValue) > 0) bits.push('ราคา ' + Number(l.estValue).toLocaleString('th-TH') + ' บาท');
    if (Number(l.pricePerWa) > 0) bits.push(Number(l.pricePerWa).toLocaleString('th-TH') + ' บาท/ตร.ว.');
    var DEED = (vocab && vocab.DEED_TH) || {};
    if (L.deedType && DEED[L.deedType]) bits.push(DEED[L.deedType]);
    var head = bits.join(' · ');
    // ⚠️ **ตัดที่ข้อความของเจ้าของ ไม่ใช่ตัดท้ายทั้งก้อน**
    //    ของเดิมต่อทุกอย่างแล้วค่อยตัดที่ 300 ตัวอักษร ผลคือแปลงที่เจ้าของเขียนโฆษณายาวๆ
    //    (เจอจริง 3 จาก 22 แปลง) **เสียท่อนท้ายไปทั้งหมด** ซึ่งคือ "รหัสทรัพย์" ที่ทีมใช้
    //    จับคู่ผู้ซื้อกับเจ้าของ และบรรทัดใบอนุญาตที่เป็นจุดต่างของแบรนด์
    //    — สองอย่างที่ขาดไม่ได้ที่สุด กลับเป็นสองอย่างแรกที่หายไป
    var tail = ' · รหัสทรัพย์ ' + l.id + ' · ตรวจสอบโดยสำนักงานช่างรังวัดเอกชน ใบอนุญาต 351';
    var MAX = 300;
    var room = MAX - head.length - tail.length;
    var blurb = l.blurb ? String(l.blurb).replace(/\s+/g, ' ').trim() : '';
    if (blurb && room > 12) {
      var body = ' — ' + blurb;
      if (body.length > room) body = body.slice(0, room - 1).replace(/\s+\S*$/, '') + '…';
      head += body;
    }
    var txt = head + tail;
    // เผื่อกรณีสุดโต่งที่ชื่อแปลงเองยาวเกิน — ยอมตัดท้าย ดีกว่าส่งข้อความยาวเกินให้ Google ตัดเอง
    return txt.length > MAX ? txt.slice(0, MAX - 1).trim() + '…' : txt;
  }

  // ---------- ที่อยู่ของหน้า ----------
  //
  // ⚠️ **หน้าสแตติกที่ `build/properties.js` สร้าง คือที่อยู่ที่ใช้อ้างอิง (canonical)**
  //    `land.html?id=` ยังใช้ได้ตามปกติและเป็นลิงก์ที่การ์ดทุกใบชี้ไป (ไม่มีทางพาไป 404)
  //    แต่มันชี้ canonical มาที่นี่ เพื่อไม่ให้สองที่อยู่แข่งกันเองในดัชนี
  function pagePath(id) { return 'p/' + String(id) + '.html'; }
  function pageUrl(id) { return SITE_URL + '/' + pagePath(id); }
  function dynamicUrl(id) { return SITE_URL + '/land.html?id=' + encodeURIComponent(String(id)); }

  return {
    FALLBACK_KIND: FALLBACK_KIND, SITE_URL: SITE_URL,
    kindOf: kindOf, localityOf: localityOf, shortLabel: shortLabel,
    titleOf: titleOf, metaDesc: metaDesc,
    pagePath: pagePath, pageUrl: pageUrl, dynamicUrl: dynamicUrl
  };
});
