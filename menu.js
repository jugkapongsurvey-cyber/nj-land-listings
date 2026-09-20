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
  var CTA_SELECTORS = ['.njh-cta', '.top-actions .post-btn', 'header a[href="consign.html"]', '.header-cta'];
  // ทางเข้าพอร์ทัลลูกค้า — วางไว้นอก <nav> โดยตั้งใจ (เหตุผลอยู่ใน menu.css)
  // จอเล็กซ่อนลิงก์ตัวจริงไว้ ลิ้นชักจึงต้องหยิบมาแสดงแทน ไม่งั้นทางเข้านี้หายไปทั้งบนมือถือ
  // อ่านทั้ง href และข้อความจากลิงก์จริง — ห้ามพิมพ์ค่าซ้ำไว้ในไฟล์นี้ (กติกาเดียวกับรายการเมนู)
  var PORTAL_SELECTOR = '[data-njportal]';
  // ทางเข้าแชท AI — 10 หน้ามีลิงก์นี้อยู่ใน <nav> อยู่แล้ว ลิ้นชักจึงได้ไปเองตามกติกาข้างบน
  // เหลือหน้าแรกหน้าเดียวที่แถวเมนูเต็มความกว้างพอดีจนเติมไม่ได้ ลิงก์จึงอยู่ในฟุตเตอร์และต้องหยิบมาแบบพอร์ทัล
  // เช็ก href ซ้ำกับใน <nav> ก่อนเสมอ ไม่งั้นหน้าที่มีทั้งสองที่จะได้เมนูซ้ำสองข้อ
  var CHAT_SELECTOR = '[data-njchat]';

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

    // ---- ข้อความของลิงก์หนึ่งข้อ ----
    // หัวเว็บชุดใหม่ใส่ลูกศร ▾ ไว้ใน <span> ข้างในลิงก์กลุ่ม และใส่คำอธิบายไว้ใน <small>
    // ลิ้นชักต้องการแค่ชื่อ จึงหยิบจาก <b> ก่อนถ้ามี แล้วค่อยถอย textContent ทั้งก้อน
    function labelOf(a) {
      var b = a.querySelector && a.querySelector('b');
      var t = (b ? b.textContent : a.textContent) || '';
      return t.replace(/[▾▸▼]/g, '').replace(/^＋\s*/, '').replace(/\s*[→›»]\s*$/, '').trim();
    }
    function addLink(a, cls) {
      var item = document.createElement('a');
      item.href = a.getAttribute('href') || '#';
      // ใช้ textContent เสมอ — ข้อความเมนูบางหน้ามีอักขระพิเศษ และเราไม่ต้องการ markup ข้างใน
      item.textContent = labelOf(a);
      if (cls) item.className = cls;
      else if (a.classList.contains('active')) item.className = 'on';
      // ⚠️ หน้าที่กำลังเปิดอยู่ต้องบอกให้รู้ในลิ้นชักด้วย ไม่ใช่เฉพาะบนแถวเดสก์ท็อปที่ถูกซ่อนไปแล้ว
      if (a.getAttribute('aria-current') === 'page') item.setAttribute('aria-current', 'page');
      list.appendChild(item);
      return item;
    }

    // ---- หัวเว็บชุดใหม่: มีกลุ่มจริง จึงจัดลิ้นชักเป็นกลุ่มตามนั้น ----
    // ⚠️ ยังคงกติกาเดิม "สร้างรายการจาก <nav> ของหน้านั้นเอง ห้ามพิมพ์รายการเมนูซ้ำในไฟล์นี้"
    //    เปลี่ยนแค่วิธีจัดเรียง ไม่ได้เปลี่ยนแหล่งที่มาของข้อมูล
    var groups = nav.querySelectorAll ? nav.querySelectorAll('.njh-item') : [];
    if (groups.length) {
      Array.prototype.forEach.call(groups, function (li) {
        var top = li.querySelector('.njh-top');
        if (!top) return;
        var subs = li.querySelectorAll('.njh-panel a');
        if (!subs.length) { addLink(top); return; }
        // กลุ่มที่มีเมนูย่อย: หัวกลุ่มเป็นลิงก์จริงเหมือนบนเดสก์ท็อป แล้วตามด้วยลูกของมัน
        addLink(top, 'njmenu-group');
        Array.prototype.forEach.call(subs, function (a) { addLink(a, 'njmenu-sub'); });
      });
    } else {
      // ---- หัวเว็บแบบเดิม (เผื่อหน้าที่ยังไม่ได้ผ่าน build/pages.js) ----
      links.forEach(function (a) { addLink(a); });
    }
    var chat = document.querySelector(CHAT_SELECTOR);
    if (chat) {
      var chref = chat.getAttribute('href') || 'chat.html';
      if (!nav.querySelector('a[href="' + chref + '"]')) {
        var c = document.createElement('a');
        c.href = chref;
        c.textContent = (chat.textContent || '').trim();
        list.appendChild(c);
      }
    }

    panel.appendChild(list);

    if (cta) {
      var b = document.createElement('a');
      b.className = 'njmenu-cta';
      b.href = cta.getAttribute('href') || 'consign.html';
      b.textContent = (cta.textContent || 'ฝากขายฟรี').replace(/^＋\s*/, '').trim();
      panel.appendChild(b);
    }

    // ทางเข้าพอร์ทัลลูกค้า — วางท้ายสุด เพราะเป็นของ "ลูกค้าเดิม" ไม่ใช่ปุ่มหลักของหน้า
    // หน้าไหนยังไม่มีลิงก์นี้ก็ข้ามไปเงียบๆ ลิ้นชักที่เหลือทำงานเหมือนเดิมทุกประการ
    // ⚠️ หัวเว็บชุดใหม่ย้ายลิงก์นี้เข้าไปอยู่ใน <nav> แล้ว (กลุ่ม "ติดตามงาน")
    // ลิ้นชักจึงได้ไปเองตามกติกาข้างบน — ต้องเช็ก href ซ้ำก่อน ไม่งั้นได้เมนูซ้ำสองข้อ
    var portal = document.querySelector(PORTAL_SELECTOR);
    if (portal && nav.querySelector('a[href="' + (portal.getAttribute('href') || 'portal.html') + '"]')) portal = null;
    if (portal) {
      var p = document.createElement('a');
      p.className = 'njmenu-portal';
      p.href = portal.getAttribute('href') || 'portal.html';
      // ตัดลูกศรท้ายข้อความออก (หน้าแรกใช้ปุ่มแบบ "... →") — ในลิ้นชักทุกข้อเป็นรายการเมนู
      // ไม่ใช่ปุ่มบนการ์ด ลูกศรจึงไม่ได้สื่ออะไรและทำให้ดูไม่เข้าชุดกับข้ออื่น
      p.textContent = (portal.textContent || '').replace(/\s*[→›»]\s*$/, '').trim();
      if (portal.classList.contains('on')) p.setAttribute('aria-current', 'page');
      panel.appendChild(p);
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
