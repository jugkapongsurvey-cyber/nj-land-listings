/* โหลดแชทเมื่อถึงเวลาที่ควรโหลด ไม่ใช่ตั้งแต่วินาทีแรก (Sprint 5 · งานที่ 13)
 *
 * ทำไมต้องมี: `njchat.js` หนัก **101 KB** และถูกโหลดใน 20 หน้า — ทุกคนที่เปิดเว็บจ่ายค่านี้
 * ตั้งแต่วินาทีแรก ทั้งที่ส่วนใหญ่ไม่ได้เปิดแชทเลย · บนเน็ตมือถือคือหลายวินาทีที่เสียไปฟรีๆ
 * ก่อนที่ประกาศจะขึ้นด้วยซ้ำ
 *
 * ตัวโหลดนี้เล็กกว่า 2 KB และดึงไฟล์จริงมาเมื่อเกิดข้อใดข้อหนึ่ง:
 *   1. ผ่านไป 18 วินาที (จังหวะเดียวกับที่ปุ่มแชทเคยโผล่)
 *   2. ผู้ใช้เลื่อนจอลงไปแล้ว 400px = เริ่มอ่านจริง
 *   3. ผู้ใช้แตะอะไรก็ได้บนหน้า (กันกรณีอยากคุยทันทีแต่ยังไม่ถึง 18 วิ)
 *   4. มีลิงก์ `[data-njchat]` หรือ `#chat` ในที่อยู่หน้า — เขาตั้งใจมาคุย โหลดทันที
 *
 * ⚠️ **`chat.html` ห้ามใช้ตัวโหลดนี้** — หน้านั้นคือตัวแชทเอง ต้องโหลดไฟล์จริงตรงๆ
 * ⚠️ **ตัวโหลดพังหรือไม่ทำงาน = ไม่มีแชท ไม่ใช่หน้าเว็บพัง** ทุกปุ่มติดต่ออื่น (ไลน์ · โทร ·
 *    Messenger) เป็นลิงก์จริงใน HTML อยู่แล้ว ไม่ได้พึ่งไฟล์นี้เลย
 * ⚠️ **ต้องตั้ง `window.NJCHAT_LAZY` ก่อนแทรกสคริปต์** ไม่งั้น `revealLater()` ใน njchat.js
 *    จะหน่วงปุ่มอีก 18 วินาทีซ้อนกับที่รอมาแล้ว ผู้ใช้ต้องรอรวม 36 วินาทีกว่าจะเห็นปุ่ม
 */
(function () {
  'use strict';

  var SRC = 'njchat.js';
  var DELAY = 18000;
  var SCROLL = 400;
  var loaded = false;

  function load() {
    if (loaded) return;
    loaded = true;
    off();
    // บอก njchat.js ว่าผู้ใช้รอมาแล้ว ไม่ต้องหน่วงปุ่มซ้ำอีกรอบ
    window.NJCHAT_LAZY = true;
    var s = document.createElement('script');
    s.src = SRC;
    s.async = false;        // ให้รันตามลำดับ เผื่อมีสคริปต์อื่นถูกแทรกต่อท้ายในอนาคต
    document.body.appendChild(s);
  }

  function onScroll() { if ((window.pageYOffset || 0) > SCROLL) load(); }
  function off() {
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('pointerdown', load, true);
    document.removeEventListener('keydown', load, true);
  }

  function boot() {
    // ตั้งใจมาคุยอยู่แล้ว — ไม่ต้องรอ
    if (location.hash === '#chat' || document.querySelector('[data-njchat-now]')) { load(); return; }

    // กดลิงก์ "แชทกับน้อง" ที่อยู่ในหน้า = โหลดทันทีแล้วเปิดให้เลย
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-njchat]');
      if (!a) return;
      load();
    }, true);

    setTimeout(load, DELAY);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerdown', load, true);
    document.addEventListener('keydown', load, true);
    onScroll();   // เผื่อเบราว์เซอร์คืนตำแหน่งเลื่อนเดิมให้ตอนเปิดหน้า
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
