/* ปุ่ม "คัดลอกลิงก์" ในหน้าอ่านวารสารฉบับเต็ม (journal/<slug>/ · สร้างด้วย build/journal.js)
 *
 * ⚠️ ต้องมีทางถอยเสมอ (`prompt()`) — `navigator.clipboard` ใช้ไม่ได้บน http:// และในเว็บวิวบางตัว
 *    ล้มแล้วเงียบ = ผู้ใช้คิดว่าคัดลอกแล้ว (กติกาเดียวกับปุ่มคัดลอกรหัสทรัพย์ใน land.js)
 * ⚠️ ปุ่มแชร์ Facebook/LINE เป็นลิงก์ธรรมดาใน HTML อยู่แล้ว ไฟล์นี้ไม่ต้องทำอะไรกับมัน
 *    — JS โหลดไม่สำเร็จเมื่อไหร่ ปุ่มแชร์สองปุ่มนั้นยังใช้ได้
 */
(function () {
  'use strict';
  var btn = document.querySelector('[data-jr-copy]');
  if (!btn) return;
  var msg = document.querySelector('[data-jr-copy-msg]');
  function say(t) { if (msg) msg.textContent = t; }
  btn.addEventListener('click', function () {
    var url = btn.getAttribute('data-jr-copy') || location.href;
    function fallback() {
      try { window.prompt('คัดลอกลิงก์นี้', url); } catch (e) { /* บางเว็บวิวปิด prompt — ข้อความด้านล่างยังบอกลิงก์อยู่ */ }
      say('ลิงก์: ' + url);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { say('คัดลอกลิงก์แล้ว'); }, fallback);
    } else {
      fallback();
    }
  });
})();
