/* เปรียบเทียบแปลงที่ดิน — เลือกจากการ์ดในหน้าใดก็ได้ แล้วดูตารางเทียบที่ compare.html
 *
 * ทำไมต้องมี: ผู้ซื้อที่ดินไม่ได้ตัดสินใจจากแปลงเดียว เขาเปิดหลายแท็บแล้วไล่จดใส่กระดาษเอง
 * ซึ่งแปลว่า "ราคาต่อตารางวา" กับ "แปลงไหนรังวัดแล้วบ้าง" ต้องคำนวณเองทุกครั้ง
 * ตารางเทียบทำให้จุดแข็งของแปลงที่ผ่านการรังวัดแล้วเห็นชัดในบรรทัดเดียว ซึ่งเป็นสิ่งที่แบรนด์นี้ขาย
 *
 * ⚠️ **จุดแข็งคำนวณจากข้อมูลที่ API ส่งมาจริงเท่านั้น** ห้ามเติมข้อความแทนช่องที่ไม่มีข้อมูล (กติกาข้อ 5)
 * ช่องที่ยังไม่ได้กรอกต้องขึ้น "—" ซึ่งแปลว่า "ยังไม่ได้ระบุ" **ไม่ใช่ "ไม่มี"**
 * และป้ายจุดแข็งจะไม่ถูกมอบให้แปลงที่ไม่มีข้อมูลช่องนั้นเด็ดขาด (ไม่รู้ ≠ แพ้ และไม่รู้ ≠ ชนะ)
 *
 * ⚠️ เก็บรายการที่เลือกไว้ใน **sessionStorage ไม่ใช่ localStorage** — การเทียบเป็นเรื่องของ
 * การเข้าเว็บรอบนี้ ไม่ใช่สิ่งที่ควรค้างข้ามวันจนผู้ซื้อกลับมาแล้วงงว่าทำไมมีแปลงติดอยู่ 3 แปลง
 */
(function () {
  'use strict';

  var KEY = 'njCompare';
  var MAX = 4;                     // เกิน 4 คอลัมน์แล้วอ่านบนมือถือไม่ไหว
  var bar = null;

  function read() {
    try {
      var v = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }).slice(0, MAX) : [];
    } catch (e) { return []; }
  }
  function write(list) {
    try { sessionStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) {}
  }
  function has(id) { return read().indexOf(id) >= 0; }
  function count() { return read().length; }

  function toggle(id) {
    var list = read(), i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      // เต็มแล้วต้องบอกเหตุผล ไม่ใช่กดแล้วไม่มีอะไรเกิดขึ้น (อ่านเหมือนปุ่มเสีย)
      if (list.length >= MAX) { flash('เทียบได้ครั้งละไม่เกิน ' + MAX + ' แปลง — เอาแปลงเดิมออกก่อน'); return false; }
      list.push(id);
    }
    write(list);
    syncMarks();
    renderBar();
    return true;
  }
  function clear() { write([]); syncMarks(); renderBar(); }

  // ---------- ปุ่มบนการ์ด ----------
  // แปะทีหลังแทนการเขียนไว้ใน listingcard.js เพื่อให้หน้าที่ไม่ได้โหลดไฟล์นี้ (เช่นหน้า /s/)
  // ยังได้การ์ดหน้าตาเดิมเป๊ะ และ listingcard.js ไม่ต้องรู้จักฟีเจอร์นี้เลย
  function decorate(root) {
    (root || document).querySelectorAll('.land-card[data-id]').forEach(function (card) {
      if (card.querySelector('.njcmp-btn')) return;
      var id = card.getAttribute('data-id');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'njcmp-btn';
      b.setAttribute('data-njcmp', id);
      b.setAttribute('aria-pressed', has(id) ? 'true' : 'false');
      b.innerHTML = '<span class="njcmp-box" aria-hidden="true"></span><span class="njcmp-txt">เทียบ</span>';
      var media = card.querySelector('.card-media') || card;
      media.appendChild(b);
    });
    syncMarks(root);
  }
  function syncMarks(root) {
    (root || document).querySelectorAll('[data-njcmp]').forEach(function (b) {
      var on = has(b.getAttribute('data-njcmp'));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('on', on);
      // ป้ายบนปุ่มต่างกันตามที่ที่มันอยู่ (การ์ดมีที่แคบ · หน้ารายละเอียดมีที่พอเขียนเต็มประโยค)
      // จึงให้แต่ละปุ่มบอกข้อความของตัวเองมาได้ แล้วค่อยถอยไปใช้ข้อความสั้นของการ์ดเป็นค่าตั้งต้น
      var t = b.querySelector('.njcmp-txt');
      if (t) t.textContent = on ? (b.getAttribute('data-on') || 'เลือกแล้ว') : (b.getAttribute('data-off') || 'เทียบ');
    });
  }

  // ---------- แถบลอยด้านล่าง ----------
  function renderBar() {
    var n = count();
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'njcmp-bar';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'แปลงที่เลือกไว้เปรียบเทียบ');
      document.body.appendChild(bar);
      bar.addEventListener('click', function (e) {
        if (e.target.closest('[data-njcmp-clear]')) clear();
      });
    }
    if (!n) { bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false;
    bar.innerHTML =
      '<span class="njcmp-count"><b>' + n + '</b> แปลงที่เลือกไว้</span>' +
      (n < 2
        ? '<span class="njcmp-need">เลือกอีกอย่างน้อย 1 แปลงเพื่อเทียบกัน</span>'
        : '<a class="njcmp-go" href="compare.html">ดูตารางเปรียบเทียบ →</a>') +
      '<button type="button" class="njcmp-clear" data-njcmp-clear>ล้าง</button>';
  }
  function flash(msg) {
    renderBar();
    if (!bar || bar.hidden) return;
    var el = bar.querySelector('.njcmp-need') || bar.querySelector('.njcmp-count');
    if (!el) return;
    var old = el.textContent;
    el.textContent = msg;
    setTimeout(function () { renderBar(); }, 2600);
    return old;
  }

  // ---------- ผูกการคลิก ----------
  // ดักที่ document ครั้งเดียว เพราะการ์ดถูกวาดใหม่ทุกครั้งที่กรองหรือโหลดข้อมูลเสร็จ
  // ⚠️ ต้อง stopPropagation เสมอ — bindGrid ใน listingcard.js ดักคลิกทั้งการ์ดเพื่อพาไปหน้ารายละเอียด
  // ไม่หยุดไว้ตรงนี้ = กดปุ่ม "เทียบ" แล้วเด้งออกจากหน้าไปทันที
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-njcmp]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    toggle(b.getAttribute('data-njcmp'));
  }, true);

  // การ์ดมาจาก fetch จึงโผล่ทีหลังเสมอ — เฝ้าตะแกรงไว้แทนการเดาเวลาโหลดเสร็จ
  function watch() {
    var grid = document.getElementById('listing-grid');
    decorate(document);
    renderBar();
    if (!grid || !window.MutationObserver) return;
    new MutationObserver(function () { decorate(grid); }).observe(grid, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();

  window.NJCompare = {
    MAX: MAX,
    read: read, write: write, has: has, count: count,
    toggle: toggle, clear: clear, decorate: decorate, renderBar: renderBar,
    // หน้ารายละเอียดแปลงมีปุ่ม "เทียบ" ปุ่มเดียวที่ไม่ได้อยู่บนการ์ด จึงต้องสั่งอัปเดตสถานะเอง
    sync: syncMarks
  };
})();
