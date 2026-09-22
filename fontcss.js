/* โหลดฟอนต์แบบไม่บล็อกการวาดหน้า
 *
 * ทำไมต้องมี: `<link rel="stylesheet">` ของ Google Fonts เป็นทรัพยากรที่บล็อกการ render
 * Lighthouse (mobile) วัดได้ว่าถ่วงหน้าแรกราว 850 ms — นานกว่าไฟล์ CSS ของเราเองทุกไฟล์รวมกัน
 *
 * วิธีแก้: หน้าเว็บประกาศเป็น `rel="preload" as="style"` ซึ่ง **ดาวน์โหลดทันทีแต่ยังไม่เอามาใช้**
 * แล้วไฟล์นี้สลับเป็น `rel="stylesheet"` ให้ตอนที่ไม่ขวางการวาดหน้าแล้ว
 *
 * ⚠️ ห้ามกลับไปใช้ `onload="this.rel='stylesheet'"` บนแท็ก link เด็ดขาด —
 *    กติกาของรีโปนี้ห้าม `on*=` ในหน้าที่เสิร์ฟ (ดู CLAUDE.md หัวข้อ CSP)
 *    และ `a11y.test.js` / `build/lint.js` ตรวจไว้
 *
 * ⚠️ ต้องมี <noscript> คู่กันในหน้าเสมอ — ปิด JS แล้วต้องยังได้ฟอนต์
 * ⚠️ ฟอนต์ยังตั้ง `display=swap` เหมือนเดิม ตัวหนังสือจึงอ่านได้ทันทีด้วยฟอนต์สำรองระหว่างรอ
 */
(function (d) {
  'use strict';
  var links = d.querySelectorAll('link[rel="preload"][as="style"][data-njfont]');
  for (var i = 0; i < links.length; i++) {
    links[i].rel = 'stylesheet';
  }
})(document);
