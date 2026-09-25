/* ยกเลิกรับข่าวสาร — unsubscribe.html?id=<NS-…>&t=<ตั๋ว>
   ลิงก์นี้อยู่ท้ายข่าวสารทุกฉบับ (server.js `newsUnsubUrl`)

   ⚠️ กติกาของหน้านี้
   1. **ปุ่มยกเลิกต้องกดได้ในคลิกเดียวจากหน้าจอแรก** ไม่มีกล่องถามยืนยัน ไม่ต้องล็อกอิน
      ยกเลิกยาก = คนกดว่าเป็นสแปมแทน ซึ่งเสียหายกว่ามาก
   2. ไม่มีฟอร์มให้กรอกอะไร · แสดงอีเมล/เบอร์แบบปิดบังเท่านั้น (เซิร์ฟเวอร์ปิดบังมาให้แล้ว)
   3. **สมัครกลับไม่ได้จากหน้านี้โดยตั้งใจ** — ต้องติ๊กยินยอมใหม่ที่ฟอร์มรับข่าวสาร (tools.html#news)
   4. ตั๋วไม่ถูกส่งไปที่ไหนนอกจาก API ของเรา (meta referrer = no-referrer) */
(function () {
  'use strict';
  var API = window.NJ_API_BASE || 'https://app.njteedinsure.com';
  var box = document.getElementById('nt-body');
  var y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear() + 543);

  function qs(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var ID = qs('id'), T = qs('t');
  var DATA = null, busy = false;

  function api(method, suffix) {
    return fetch(API + '/api/public/newsletter/' + encodeURIComponent(ID) + (suffix || '') + '?t=' + encodeURIComponent(T), {
      method: method, headers: { 'Content-Type': 'application/json' }
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'ทำรายการไม่สำเร็จ');
        return j;
      });
    });
  }
  function note(text, kind) { return '<div class="nt-note' + (kind ? (' nt-' + kind) : '') + '">' + text + '</div>'; }
  function who() {
    var a = [DATA.email, DATA.phone].filter(Boolean).map(esc).join(' · ');
    return a ? '<p class="nt-help">ข่าวสารที่ส่งถึง ' + a + '</p>' : '';
  }
  var LINE = '<a href="https://line.me/R/ti/p/@716lffzt" target="_blank" rel="noopener">@716lffzt</a>';

  function render() {
    if (!DATA) { box.innerHTML = '<div class="nt-load">กำลังเปิดข้อมูลการรับข่าวสารของคุณ…</div>'; return; }
    if (DATA.error) {
      box.innerHTML = '<div class="nt-card">' + note(esc(DATA.error), 'warn') +
        '<p class="nt-help">ทักไลน์ ' + LINE + ' แล้วบอกว่าไม่อยากรับข่าวสาร ทีมงานหยุดส่งให้ได้ทันที</p></div>';
      return;
    }
    if (!DATA.subscribed) {
      box.innerHTML = '<div class="nt-card">' +
        '<h2>ยกเลิกรับข่าวสารเรียบร้อยแล้ว</h2>' + who() +
        '<p class="nt-help">เราจะไม่ส่งข่าวสารหาคุณอีก · ถ้าเปลี่ยนใจ สมัครใหม่ได้ที่ <a href="tools.html#news">หน้าเครื่องมือ</a></p>' +
        '</div>';
      return;
    }
    box.innerHTML = '<div class="nt-card nt-danger">' +
      '<h2>ไม่อยากรับข่าวสารแล้ว?</h2>' + who() +
      '<p class="nt-help">กดปุ่มเดียว เราจะหยุดส่งข่าวสารหาคุณทันที</p>' +
      '<button class="nt-btn nt-stop" data-act="off"' + (busy ? ' disabled' : '') + '>ยกเลิกรับข่าวสาร</button>' +
      '</div>';
  }

  box.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-act="off"]') : null;
    if (!b || busy) return;
    busy = true; render();
    api('POST', '/unsubscribe').then(function (r) { DATA = r; busy = false; render(); })
      .catch(function (e) { busy = false; DATA = { error: e.message }; render(); });
  });

  if (!ID || !T) {
    DATA = { error: 'ลิงก์ไม่ครบ — กรุณากดลิงก์ท้ายข่าวสารโดยตรง' };
    render();
  } else {
    render();
    api('GET').then(function (r) { DATA = r; render(); })
      .catch(function (e) { DATA = { error: e.message }; render(); });
  }
})();
