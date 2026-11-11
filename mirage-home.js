/* mirage-home.js — ส่วนเคลื่อนไหวของดีไซน์หน้าแรกรุ่นใหม่ (8 พ.ย. 2569 · คู่กับ mirage-home.css)
 * 1) วิดีโอโดรนพื้นหลัง hero: ใส่ src/poster และเล่นทุกขนาดจอ ยกเว้นเครื่องที่ขอลดการเคลื่อนไหวหรือประหยัดเน็ต
 *    · จอ ≤600px ใช้ไฟล์รุ่นมือถือ (data-src-m · ครอปแนวตั้ง 448×720 ~0.8 MB แทน 2.1 MB) — เจ้าของสั่ง 11 พ.ย. 2569
 *    ⚠️ คลิปไม่มีเสียงและเป็นภาพตกแต่ง (aria-hidden) · เลือกไฟล์ครั้งเดียวตอนโหลดหน้า ไม่สลับตอนหมุนจอ
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
    if (save || mm('(prefers-reduced-motion: reduce)')) return;
    var small = mm('(max-width: 600px)') && v.dataset.srcM;
    var poster = small ? v.dataset.posterM : v.dataset.poster;
    if (poster) v.poster = poster;
    v.src = small ? v.dataset.srcM : v.dataset.src;
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
