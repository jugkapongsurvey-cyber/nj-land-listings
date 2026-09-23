/* บล็อก "วารสารที่ดินชัวร์ ฉบับล่าสุด" บนหน้าแรก (#วารสาร · ใต้ส่วนประกาศ)
 *
 * ดึงสดจาก GET /api/journal?limit=3 ของระบบหลังบ้าน — ระบบคืนเฉพาะฉบับที่เผยแพร่แล้ว
 *
 * ⚠️⚠️ ข้อที่ห้ามผ่อน
 * 1. **ข้อความจาก API ใส่ด้วย textContent เท่านั้น** ห้ามต่อสตริงเป็น HTML
 * 2. **ลิงก์ของฉบับประกอบจาก slug ที่ผ่านรูปแบบ a-z 0-9 ขีดกลางเท่านั้น** ไม่ใช้ `url` จาก API ตรงๆ
 *    (หน้าเว็บต้องทำงานได้ทั้งบนเว็บจริงและ localhost ตอนทดสอบ)
 * 3. **รูปปกใช้ได้เฉพาะ https** · ไม่มีปก = พื้นสีวารสาร (ห้ามใช้รูปสต็อกแทน — กติกาข้อ 9)
 * 4. **ยังไม่มีฉบับเผยแพร่ = ซ่อนทั้งบล็อก** (ไม่ใช่กล่องว่าง "กำลังรวบรวม")
 *    **โหลดไม่สำเร็จ = บอกตรงๆ แล้วเหลือปุ่มไปหน้ารวม** (คนละกรณีกัน ห้ามสลับ — กติกาเดียวกับประกาศ)
 * 5. ต้องโหลดหลัง analytics.js (อ่าน NJ_API_BASE ที่รองรับ ?api= ตอนทดสอบบนเครื่อง)
 */
(function () {
  'use strict';
  var sec = document.getElementById('วารสาร');
  var grid = document.getElementById('journal-home');
  if (!sec || !grid) return;
  var base = (typeof NJ_API_BASE === 'string' && NJ_API_BASE) ? NJ_API_BASE : 'https://app.njteedinsure.com';
  var SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  function thaiDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return '';
    return Number(m[3]) + ' ' + MON[Number(m[2]) - 1] + ' ' + (Number(m[1]) + 543);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function card(it) {
    var href = 'journal/' + it.slug + '/';
    var li = el('li', 'jr-card');
    var cover = el('div', 'jr-cover');
    if (/^https:\/\//.test(String(it.cover_url || ''))) {
      var img = document.createElement('img');
      img.src = it.cover_url; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      img.width = 640; img.height = 360;
      cover.appendChild(img);
    } else {
      var blank = el('div', 'jr-cover-blank', 'วารสารที่ดินชัวร์');
      blank.appendChild(el('small', null, 'ฉบับที่ ' + it.issue_no));
      cover.appendChild(blank);
    }
    li.appendChild(cover);
    var body = el('div', 'jr-body');
    body.appendChild(el('span', 'jr-issue', 'ฉบับที่ ' + it.issue_no));
    var h = el('h3', 'jr-title');
    var a = el('a', null, it.title || '');
    a.href = href;
    h.appendChild(a);
    body.appendChild(h);
    if (it.excerpt) body.appendChild(el('p', 'jr-excerpt', it.excerpt));
    var d = thaiDate(it.publish_date);
    if (d) body.appendChild(el('span', 'jr-date', d));
    var more = el('a', 'jr-read', 'อ่านฉบับเต็ม');
    more.href = href;
    more.setAttribute('aria-label', 'อ่านฉบับเต็ม ฉบับที่ ' + it.issue_no);
    body.appendChild(more);
    li.appendChild(body);
    return li;
  }

  fetch(base + '/api/journal?limit=3', { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (list) {
      var items = (Array.isArray(list) ? list : []).filter(function (it) {
        return it && SLUG_RE.test(String(it.slug || '')) && it.title;
      }).slice(0, 3);
      if (!items.length) { sec.hidden = true; return; }
      grid.textContent = '';
      items.forEach(function (it) { grid.appendChild(card(it)); });
    })
    .catch(function () {
      grid.textContent = '';
      grid.appendChild(el('li', 'jr-note', 'โหลดวารสารไม่สำเร็จ ลองเปิดหน้ารวมวารสารแทน'));
    });
})();
