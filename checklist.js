// หน้า "เช็กลิสต์ตรวจที่ดินก่อนซื้อ" (checklist.html)
// ⚠️ เนื้อหาทั้งหมดอยู่ใน HTML (อ่านได้แม้ JS ไม่ทำงาน · บอตเก็บดัชนีได้) · ไฟล์นี้แค่นับข้อที่ติ๊ก จำไว้ และสั่งพิมพ์
// ⚠️ สิ่งที่ติ๊กเก็บใน localStorage ของเครื่องผู้ใช้เท่านั้น ไม่ส่งไปที่ไหน · ห่อ try/catch ทุกครั้ง
//    (โหมดส่วนตัว/บล็อกข้อมูลเว็บ = ใช้งานได้ตามปกติ แค่ไม่จำ)
(function () {
  'use strict';
  var KEY = 'njChecklistV1';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('input[data-cl]'));
  if (!boxes.length) return;
  var countEl = document.querySelector('[data-cl-count]');
  var totalEl = document.querySelector('[data-cl-total]');

  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; }
    catch (e) { return {}; }
  }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function paint() {
    var n = 0;
    boxes.forEach(function (b) {
      if (b.checked) n++;
      var li = b.closest('.cl-item');
      if (li) li.classList.toggle('is-done', b.checked);
    });
    if (countEl) countEl.textContent = String(n);
    if (totalEl) totalEl.textContent = String(boxes.length);
  }

  var state = load();
  boxes.forEach(function (b) {
    b.checked = !!state[b.getAttribute('data-cl')];
    b.addEventListener('change', function () {
      var cur = load();
      if (b.checked) cur[b.getAttribute('data-cl')] = 1; else delete cur[b.getAttribute('data-cl')];
      save(cur);
      paint();
    });
  });
  paint();

  var pr = document.querySelector('[data-cl-print]');
  if (pr) pr.addEventListener('click', function () { window.print(); });
  var rs = document.querySelector('[data-cl-reset]');
  if (rs) rs.addEventListener('click', function () {
    if (!window.confirm('ล้างข้อที่ติ๊กไว้ทั้งหมด?')) return;
    save({});
    boxes.forEach(function (b) { b.checked = false; });
    paint();
  });
})();
