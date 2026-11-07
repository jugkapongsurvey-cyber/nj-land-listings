/* mirage-home.js — ส่วนเคลื่อนไหวของดีไซน์หน้าแรกรุ่นใหม่ (8 พ.ย. 2569 · คู่กับ mirage-home.css)
 * 1) วิดีโอโดรนพื้นหลัง hero: ใส่ src/poster และเล่นเฉพาะจอ ≥900px ที่ไม่ได้ขอลดการเคลื่อนไหวหรือประหยัดเน็ต
 *    ⚠️ คลิปไม่มีเสียงและเป็นภาพตกแต่ง (aria-hidden) — มือถือไม่โหลดเลย กันกินเน็ตลูกค้า
 * 2) ภาพขั้นตอน 01–04 ค่อยๆ ซูมเข้าเมื่อเลื่อนถึง (ไม่มี IntersectionObserver = แสดงปกติ)
 * 3) แผนที่สำนักงานโหลดเมื่อผู้ใช้กดเท่านั้น — iframe ของ Google ตั้งคุกกี้บุคคลที่สาม
 * ไฟล์นี้โหลดไม่สำเร็จ = หน้าแรกยังใช้ได้ครบ (พื้น hero เป็นสีกรมท่า · มีลิงก์ขอเส้นทาง) */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  function mm(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }

  function heroVideo() {
    var v = document.querySelector('.mh-hero-video');
    if (!v || v.getAttribute('src')) return;
    var save = navigator.connection && navigator.connection.saveData;
    if (save || mm('(prefers-reduced-motion: reduce)') || !mm('(min-width: 901px)')) return;
    if (v.dataset.poster) v.poster = v.dataset.poster;
    v.src = v.dataset.src;
    v.muted = true;
    var p = v.play && v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function steps() {
    var els = document.querySelectorAll('.mh-step');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.2 });
    els.forEach(function (e) { io.observe(e); });
  }

  function map() {
    var box = document.querySelector('[data-mh-map]');
    if (!box) return;
    var btn = box.querySelector('.mh-map-open');
    var src = box.getAttribute('data-mh-map');
    if (!btn || !/^https:\/\/maps\.google\.com\//.test(src)) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.title = 'แผนที่สำนักงาน ที่ดินชัวร์ · NJ';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.src = src;
      box.appendChild(f);
      btn.remove();
    }, { once: true });
  }

  function boot() { heroVideo(); steps(); map(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
