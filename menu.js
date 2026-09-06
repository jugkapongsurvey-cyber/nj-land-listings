/* เมนูมือถือ (ลิ้นชัก) — ทางเข้าเมนูเต็มบนจอเล็ก
 *
 * ปัญหาที่แก้: ทั้งสามชุดสไตล์ของเว็บซ่อนเมนูหลักทิ้งบนจอเล็ก **โดยไม่มีอะไรมาแทน**
 *   home.css        @1040px  `header nav{display:none !important}`
 *   marketplace.css @900px   `.topbar nav{display:none}`
 *   ui.css          @?       `.header-nav{display:none}`
 * เหลือแค่แถบล่าง 5 ปุ่ม (หน้าแรก · ค้นหา · ฝากขาย · คู่มือ · ติดต่อ) ซึ่งไม่ครอบคลุม
 * มาตรฐาน · ทีมเรา · บริการ · บริการหลังซื้อที่ดิน · ขั้นตอน · ตรวจทรัพย์ก่อนซื้อ · วิดีโอ · ที่ดินประกาศขาย
 * แปลว่าคนเข้าจากมือถือ (คนส่วนใหญ่) ไปหน้าพวกนั้นจากหน้าแรกไม่ได้เลย
 *
 * ⚠️ **สร้างรายการจาก <nav> ที่มีอยู่บนหน้านั้นเอง ห้ามพิมพ์รายการเมนูซ้ำในไฟล์นี้เด็ดขาด**
 * เว็บนี้มี 9 หน้าและเมนูไม่เหมือนกันทุกหน้า · พิมพ์ซ้ำเมื่อไหร่ = วันหนึ่งเพิ่มเมนูบนเดสก์ท็อป
 * แล้วมือถือไม่มี (หรือกลับกัน) โดยไม่มี error ให้เห็น — เป็นกับดักเดียวกับที่โปรเจกต์นี้
 * เจอมาแล้วกับสไตล์การ์ดสองไฟล์ และ messenger_click ที่มีฝั่งเดียว
 *
 * ⚠️ **ตัดสินว่าจะโชว์ปุ่มไหม จาก getComputedStyle ของ nav จริง ไม่ใช่จากตัวเลข breakpoint**
 * สามชุดสไตล์ใช้จุดตัดคนละค่า (1040 / 900 / อีกค่า) เขียนเลขไว้ในไฟล์นี้ = ต้องแก้ให้ตรงกันสี่ที่
 * และจะมีช่วงความกว้างที่ "เมนูหายแต่ปุ่มยังไม่มา" หรือ "มีทั้งสองอัน" โดยไม่มีใครสังเกต
 *
 * ปุ่มถูกสร้างด้วย JS ทั้งหมด — ไฟล์นี้โหลดไม่สำเร็จ = ไม่มีปุ่มโผล่มาให้กดแล้วไม่มีอะไรเกิดขึ้น
 * (กลับไปเป็นสภาพเดิมก่อนมีไฟล์นี้พอดี ไม่ได้แย่ลง)
 */
(function () {
  'use strict';

  // เรียงตามลำดับที่ควรเจอ — เอาอันแรกที่มีลิงก์จริง
  var NAV_SELECTORS = ['header nav', '.topbar nav', 'nav.header-nav', '.header-nav'];
  // ปุ่มหลักบนหัวเว็บ (ฝากขายฟรี) — ชุดสไตล์ต่างกันใช้คลาสคนละแบบ
  var CTA_SELECTORS = ['.top-actions .post-btn', 'header a[href="consign.html"]', '.header-cta'];

  var nav = null, panel = null, backdrop = null, btn = null, lastFocus = null;

  function pick(list) {
    for (var i = 0; i < list.length; i++) {
      var el = document.querySelector(list[i]);
      if (el) return el;
    }
    return null;
  }
  function findNav() {
    for (var i = 0; i < NAV_SELECTORS.length; i++) {
      var el = document.querySelector(NAV_SELECTORS[i]);
      // แถบล่างมือถือกับแถบค้นหาด่วนก็เป็น <nav> เหมือนกัน — ต้องไม่หยิบมาทำลิ้นชัก
      if (el && !el.classList.contains('mobile-nav') && !el.classList.contains('quick') &&
          el.querySelectorAll('a').length >= 2) return el;
    }
    return null;
  }

  // ---------- ลิ้นชักถูกซ่อนไว้จนกว่าจะกด ----------
  function isOpen() { return document.documentElement.classList.contains('njmenu-open'); }

  function open() {
    if (isOpen()) return;
    lastFocus = document.activeElement;
    document.documentElement.classList.add('njmenu-open');
    btn.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    backdrop.hidden = false;
    // โฟกัสเข้าลิ้นชักทันที ไม่งั้นคนใช้คีย์บอร์ด/สกรีนรีดเดอร์กดเปิดแล้วโฟกัสยังค้างอยู่หลังฉาก
    var first = panel.querySelector('.njmenu-close');
    if (first) first.focus();
  }
  function close(refocus) {
    if (!isOpen()) return;
    document.documentElement.classList.remove('njmenu-open');
    btn.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    backdrop.hidden = true;
    // คืนโฟกัสไปที่ปุ่มเมนูเป็นค่าตั้งต้น — ไม่ใช่ปล่อยไว้เฉยๆ
    // ปิดลิ้นชักแล้วโฟกัสยังค้างบนปุ่มที่เพิ่งถูกซ่อน = คนใช้คีย์บอร์ดกด Tab ต่อแล้วไปโผล่กลางหน้า
    // (lastFocus เป็น body ได้ ถ้าเปิดด้วยวิธีอื่นที่ไม่ใช่การกดปุ่ม)
    if (refocus === false) return;
    var back = (lastFocus && lastFocus.focus && lastFocus !== document.body && document.contains(lastFocus))
      ? lastFocus : btn;
    if (back && back.focus) back.focus();
  }

  // ---------- ประกอบลิ้นชักจากเมนูจริงของหน้านั้น ----------
  function buildPanel() {
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var cta = pick(CTA_SELECTORS);

    panel = document.createElement('div');
    panel.className = 'njmenu-panel';
    panel.id = 'njmenu-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'เมนูหลัก');
    panel.hidden = true;

    var head = document.createElement('div');
    head.className = 'njmenu-head';
    var title = document.createElement('span');
    title.className = 'njmenu-title';
    title.textContent = 'เมนู';
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'njmenu-close';
    x.setAttribute('aria-label', 'ปิดเมนู');
    x.innerHTML = '&#10005;';
    head.appendChild(title);
    head.appendChild(x);
    panel.appendChild(head);

    var list = document.createElement('nav');
    list.className = 'njmenu-list';
    list.setAttribute('aria-label', 'เมนูหลัก (จอเล็ก)');
    links.forEach(function (a) {
      var item = document.createElement('a');
      item.href = a.getAttribute('href') || '#';
      // ใช้ textContent เสมอ — ข้อความเมนูบางหน้ามีอักขระพิเศษ (＋) และเราไม่ต้องการ markup ข้างใน
      item.textContent = (a.textContent || '').trim();
      if (a.classList.contains('active')) item.className = 'on';
      list.appendChild(item);
    });
    panel.appendChild(list);

    if (cta) {
      var b = document.createElement('a');
      b.className = 'njmenu-cta';
      b.href = cta.getAttribute('href') || 'consign.html';
      b.textContent = (cta.textContent || 'ฝากขายฟรี').replace(/^＋\s*/, '').trim();
      panel.appendChild(b);
    }

    backdrop = document.createElement('div');
    backdrop.className = 'njmenu-backdrop';
    backdrop.hidden = true;

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    // ปิดเมื่อกดลิงก์ — ลิงก์ในหน้าเดียวกัน (#หัวข้อ) ไม่ได้โหลดหน้าใหม่ ลิ้นชักจึงค้างบังเนื้อหาที่เพิ่งเลื่อนไป
    list.addEventListener('click', function (e) {
      if (e.target.closest('a')) close(false);
    });
    x.addEventListener('click', function () { close(); });
    backdrop.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { close(); return; }
      // ⚠️ ขังโฟกัสไว้ในลิ้นชัก — ประกาศ aria-modal ไว้แล้วแต่เบราว์เซอร์ไม่ได้กันให้เอง
      // ไม่ขัง = กด Tab ไปเรื่อยๆ แล้วโฟกัสหลุดไปอยู่บนลิงก์ที่ถูกฉากหลังบังอยู่ ซึ่งกดไม่ได้จริง
      if (e.key !== 'Tab') return;
      var f = panel.querySelectorAll('a[href], button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function buildButton() {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'njmenu-btn';
    btn.setAttribute('aria-label', 'เปิดเมนู');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'njmenu-panel');
    btn.innerHTML = '<span class="njmenu-bars" aria-hidden="true"></span>';
    btn.addEventListener('click', function () { isOpen() ? close() : open(); });
    // วางไว้ท้ายแถวหัวเว็บ ข้างปุ่มหลัก — ใช้ parentNode ของ nav เพื่อให้ได้แถวเดียวกันทุกชุดสไตล์
    var host = nav.parentNode || document.body;
    host.appendChild(btn);
  }

  // เมนูเดสก์ท็อปถูกซ่อนอยู่หรือเปล่า = เกณฑ์เดียวที่ใช้ตัดสินว่าต้องมีปุ่มไหม
  function sync() {
    var hidden = getComputedStyle(nav).display === 'none';
    // ตั้งค่าเป็น inline-flex ตรงๆ ไม่ใช่ '' — ค่าตั้งต้นในสไตล์ชีตคือ display:none
    // คืนเป็นค่าว่างเมื่อไหร่ ปุ่มจะกลับไปซ่อนตามสไตล์ชีตแทนที่จะโผล่
    btn.style.display = hidden ? 'inline-flex' : 'none';
    if (!hidden) close(false);            // ขยายจอจนเมนูเต็มกลับมา = ลิ้นชักไม่ควรค้างเปิด
  }

  function boot() {
    nav = findNav();
    if (!nav) return;
    buildPanel();
    buildButton();
    sync();
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(sync, 150);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
