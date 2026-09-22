/* ค่าติดต่อของบริษัท — แหล่งเดียวของทั้งเว็บ
 *
 * ทำไมต้องมี: เบอร์โทร ไอดีไลน์ ที่อยู่ และเวลาทำการ เคยถูกพิมพ์ซ้ำอยู่หลายที่
 * (index.html · listingcard.js · analytics.js · app.js) เปลี่ยนเบอร์ทีหนึ่งต้องไล่แก้ทุกที่
 * และมีที่ที่ลืมทุกครั้ง — ไฟล์นี้คือที่เดียวที่ต้องแก้
 *
 * ⚠️ ต้องโหลด **ก่อน** สคริปต์อื่นทุกตัวของหน้า (ไม่ใส่ defer) เพราะ listingcard.js อ่านค่าตอนโหลด
 * ⚠️ ที่อยู่ที่นี่คือ 121/124 (สำนักงานใหญ่ ตามใบอนุญาต) — ห้ามใส่ 155/6 ซึ่งเป็นออฟฟิศย่อย
 *    ที่ผูกกับ njandconsulting.com คนละโปรไฟล์ Google โดยตั้งใจ (เหตุผลเดียวกับ schema.org ใน index.html)
 * ⚠️ ค่าที่นี่ต้องตรงกับ schema.org ใน <head> ของ index.html — sitewide test ไม่ได้เทียบให้
 */
(function (w, d) {
  'use strict';

  var CONFIG = {
    companyName: 'บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด',
    brand: 'ที่ดินชัวร์',
    tel: '02-162-0405',
    tel2: '084-915-8601',
    lineId: '@716lffzt',
    lineUrl: 'https://line.me/R/ti/p/@716lffzt',
    messengerUrl: 'https://m.me/NJTeeDinSure',
    address: '121/124 หมู่ที่ 4 ตำบลบางเมือง อำเภอเมืองสมุทรปราการ จังหวัดสมุทรปราการ 10270',
    hours: 'จ.–ส. 08:30–17:30 น.',
    license: '351',

    // จำนวนแปลงที่รังวัดแล้ว — ยังไม่มีตัวเลขที่ตรวจสอบได้จากระบบหลังบ้าน
    // ⚠️ **ห้ามเดาตัวเลขนี้** ทั้งหน้าแรกขายด้วยคำว่า "ข้อมูลที่ตรวจสอบได้"
    //    ใส่ตัวเลขที่ยืนยันไม่ได้ลงไปคือทำลายสิ่งเดียวที่แบรนด์นี้ขาย
    //    ปล่อยเป็น null ไว้ = ช่องสถิติที่สามบนหน้าแรกจะแสดง "จำนวนแปลงที่เปิดประกาศอยู่" แทน
    //    ซึ่งนับสดจาก API · ได้ตัวเลขจริงจากเจ้าของเมื่อไหร่ใส่เป็นตัวเลขตรงนี้ได้เลย
    surveyedParcels: null
  };

  function telHref(t) { return 'tel:' + String(t).replace(/[^0-9+]/g, ''); }

  // แผนที่ค่า → ข้อความที่จะเติมลง [data-njcfg]
  var TEXT = {
    tel: CONFIG.tel, tel2: CONFIG.tel2, lineId: CONFIG.lineId,
    address: CONFIG.address, hours: CONFIG.hours,
    companyName: CONFIG.companyName, license: CONFIG.license
  };
  // แผนที่ค่า → ที่อยู่ปลายทางที่จะเติมลง [data-njcfg-link]
  var HREF = {
    tel: telHref(CONFIG.tel), tel2: telHref(CONFIG.tel2),
    line: CONFIG.lineUrl, messenger: CONFIG.messengerUrl
  };

  // เติมค่าลงหน้าเว็บ — HTML เขียนค่าจริงไว้เป็นค่าตั้งต้นอยู่แล้ว (ไม่ใช่ [เบอร์โทร] เปล่าๆ)
  // ถ้าไฟล์นี้โหลดไม่สำเร็จ หน้าเว็บจึงยังมีเบอร์ที่ถูกต้องให้กดอยู่ ไม่ใช่ช่องว่าง
  function apply(root) {
    var scope = root || d;
    scope.querySelectorAll('[data-njcfg]').forEach(function (el) {
      var v = TEXT[el.getAttribute('data-njcfg')];
      // ⚠️ เทียบค่าเดิมก่อนเขียนเสมอ — เขียน textContent ทับด้วยค่าเดิมไม่ใช่ "การไม่เปลี่ยนอะไร"
      //    มันคือลบ text node แล้วสร้างใหม่ ซึ่งนับเป็น childList mutation
      //    จับคู่กับ MutationObserver ที่เฝ้า body อยู่ (compare.js · save.js · njchat.js) = เสี่ยงวนลูป
      if (v != null && el.textContent !== v) el.textContent = v;
    });
    scope.querySelectorAll('[data-njcfg-link]').forEach(function (el) {
      var v = HREF[el.getAttribute('data-njcfg-link')];
      if (v) el.setAttribute('href', v);
    });
  }

  w.NJ_CONFIG = CONFIG;
  w.NJ_CONFIG.telHref = telHref;
  w.NJ_CONFIG.apply = apply;

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function () { apply(); });
  else apply();
})(window, document);
