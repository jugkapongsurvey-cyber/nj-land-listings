/* บันทึกแปลงที่สนใจ — กดจากการ์ดหน้าไหนก็ได้ แล้วกรองดูเฉพาะที่บันทึกไว้ที่หน้ารวมประกาศ
 *
 * ทำไมต้องมี: ผู้ซื้อที่ดินไม่ได้ตัดสินใจในวันเดียว เขากลับมาดูซ้ำหลายรอบข้ามสัปดาห์
 * ของเดิมไม่มีที่เก็บเลย ทางเดียวคือกดบุ๊กมาร์กเบราว์เซอร์ทีละแปลง หรือก๊อปลิงก์ใส่โน้ต
 *
 * ⚠️ **เก็บใน localStorage ไม่ใช่ sessionStorage — ตรงข้ามกับ `compare.js` โดยตั้งใจ**
 *    การเทียบเป็นเรื่องของ "การเข้าเว็บรอบนี้" ส่วนการบันทึกคือ "เก็บไว้กลับมาดูอีก"
 *    เก็บผิดที่เมื่อไหร่ ผู้ซื้อปิดแท็บแล้วของที่อุตส่าห์เลือกไว้หายหมด
 *
 * ⚠️ **เก็บแค่รหัสแปลง ไม่เก็บข้อมูลแปลง** — ราคาและสถานะเปลี่ยนได้ตลอด
 *    เก็บทั้งก้อนไว้เมื่อไหร่ = ผู้ซื้อกลับมาเห็นราคาเก่าที่ไม่ตรงกับความจริงแล้ว
 *
 * ⚠️ **ปุ่มถูกแปะทีหลังด้วย `decorate()` ไม่ได้เขียนไว้ใน `listingcard.js`**
 *    หน้าที่ไม่โหลดไฟล์นี้จึงได้การ์ดหน้าตาเดิมเป๊ะ (กติกาเดียวกับ `compare.js`)
 *
 * ⚠️ **กับดัก MutationObserver** — `decorate()` แปะปุ่มลงในตะแกรงที่ตัวเองเฝ้าอยู่
 *    ต้องเทียบค่าเดิมก่อนเขียนเสมอ และ disconnect ก่อนแก้ DOM
 *    (บั๊กนี้เคยทำให้สองหน้าค้างทั้งแท็บ ดู compare.test.js)
 */
(function () {
  'use strict';

  var KEY = 'njSaved';
  var MAX = 60;                 // กันไม่ให้ localStorage บวมจนเขียนไม่ลง
  var listeners = [];

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }).slice(0, MAX) : [];
    } catch (e) { return []; }
  }
  function write(list) {
    // โหมดส่วนตัวเขียนไม่ได้ — ต้องไม่พังทั้งหน้า แค่ไม่ได้จำข้ามวัน
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) {}
  }
  function has(id) { return read().indexOf(id) >= 0; }
  function count() { return read().length; }

  function toggle(id) {
    var list = read(), i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      // เต็มแล้วต้องบอกเหตุผล ไม่ใช่กดแล้วเงียบ (อ่านเหมือนปุ่มเสีย)
      if (list.length >= MAX) { flash('บันทึกได้สูงสุด ' + MAX + ' แปลง — เอาแปลงเดิมออกก่อน'); return false; }
      list.unshift(id);          // อันใหม่อยู่บนสุด
    }
    write(list);
    syncMarks();
    listeners.forEach(function (fn) { try { fn(read()); } catch (e) {} });
    return has(id);
  }

  // ---------- ข้อความชั่วคราว ----------
  var tip = null, tipTimer = 0;
  function flash(msg) {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'njsv-flash';
      tip.setAttribute('role', 'status');
      document.body.appendChild(tip);
    }
    if (tip.textContent !== msg) tip.textContent = msg;   // เทียบก่อนเขียน (กับดัก MutationObserver)
    tip.classList.add('on');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tip.classList.remove('on'); }, 2600);
  }

  // ---------- ปุ่มบนการ์ด ----------
  function decorate(root) {
    (root || document).querySelectorAll('.land-card[data-id]').forEach(function (card) {
      if (card.querySelector('.njsave-btn')) return;
      var id = card.getAttribute('data-id');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'njsave-btn';
      b.setAttribute('data-njsave', id);
      b.setAttribute('aria-pressed', has(id) ? 'true' : 'false');
      b.setAttribute('aria-label', 'บันทึกแปลง ' + id);
      b.innerHTML = '<span class="njsave-ico" aria-hidden="true">♥</span><span class="njsave-txt">บันทึก</span>';
      var media = card.querySelector('.card-media') || card;
      media.appendChild(b);
    });
    syncMarks(root);
  }

  // ⚠️ เขียนทับด้วยค่าเดิม = ลบ text node แล้วสร้างใหม่ ซึ่ง MutationObserver นับเป็นการเปลี่ยนแปลง
  //    เทียบก่อนเขียนเสมอ ไม่งั้นวนลูปกับตัวเฝ้าข้างล่าง
  function syncMarks(root) {
    (root || document).querySelectorAll('[data-njsave]').forEach(function (b) {
      var on = has(b.getAttribute('data-njsave'));
      var want = on ? 'true' : 'false';
      if (b.getAttribute('aria-pressed') !== want) b.setAttribute('aria-pressed', want);
      var t = b.querySelector('.njsave-txt');
      var label = on ? 'บันทึกแล้ว' : 'บันทึก';
      if (t && t.textContent !== label) t.textContent = label;
    });
  }

  // ---------- ตัวจับคลิกตัวเดียวของทั้งหน้า ----------
  // ⚠️ ต้องหยุดในเฟส capture — `NJListing.bindGrid()` ดักคลิกทั้งการ์ดเพื่อพาไปหน้ารายละเอียด
  //    ไม่หยุดไว้ = กดบันทึกแล้วเด้งออกจากหน้าทันที (บทเรียนเดียวกับปุ่ม "เทียบ")
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-njsave]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var id = b.getAttribute('data-njsave');
    var on = toggle(id);
    if (on) {
      flash('บันทึกแปลง ' + id + ' แล้ว — ดูรายการที่บันทึกได้ที่หน้าประกาศทั้งหมด');
      // ⚠️ นับเฉพาะตอน "กดเพิ่ม" ไม่นับตอนเอาออก — ไม่งั้นกดสลับไปมาหนึ่งครั้งกลายเป็นสองครั้ง
      if (window.njTrackInternal) njTrackInternal('save_property', id);
    }
  }, true);

  // ---------- เฝ้าตะแกรงประกาศ ----------
  function watch() {
    var grid = document.getElementById('listing-grid');
    if (!grid || !window.MutationObserver) return;
    var mo = new MutationObserver(function () {
      mo.disconnect();            // กันลูป — แปะปุ่มลงในตะแกรงที่ตัวเองเฝ้าอยู่
      decorate(grid);
      mo.observe(grid, { childList: true, subtree: true });
    });
    mo.observe(grid, { childList: true, subtree: true });
  }

  function boot() {
    decorate(document);
    watch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NJSave = {
    has: has, count: count, list: read, toggle: toggle,
    decorate: decorate, sync: syncMarks,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})();
