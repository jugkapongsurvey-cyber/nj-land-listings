/* ตั้งค่าการแจ้งเตือนของผู้รับเอง — notify.html?t=<โทเคน>
   เปิดได้ด้วยลิงก์ที่มีโทเคนเท่านั้น · โทเคนอยู่ท้ายข้อความที่ทีมงานส่งให้

   ⚠️ กติกาของหน้านี้
   1. ไม่มีฟอร์มให้กรอกอะไรทั้งสิ้น — หน้านี้ไม่ควรกลายเป็นที่เก็บข้อมูลส่วนบุคคลเพิ่ม
   2. ปุ่ม "ยกเลิกการแจ้งเตือนทั้งหมด" ต้องกดได้ในคลิกเดียวจากหน้าจอแรก
      ซ่อนไว้ใต้เมนู = คนหาไม่เจอแล้วไปกดว่าเป็นสแปมแทน ซึ่งเสียหายกว่ามาก
   3. ⛔ ระบบยังไม่ได้ส่งข้อความจริงสักช่องทาง หน้านี้จึงบอกตรงๆ ว่าการตั้งค่านี้
      จะมีผลเมื่อระบบเริ่มส่งจริง ไม่ใช่ปล่อยให้เข้าใจว่ากำลังรับอยู่แล้ว
   4. โทเคนไม่ถูกส่งต่อไปที่ไหนนอกจาก API ของเราเอง (meta referrer = no-referrer ในหน้า) */
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
  var T = qs('t');
  var DATA = null;
  var busy = false;

  function api(method, path, body) {
    return fetch(API + path + (path.indexOf('?') >= 0 ? '&' : '?') + 't=' + encodeURIComponent(T), {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'ทำรายการไม่สำเร็จ');
        return j;
      });
    });
  }

  function note(text, kind) {
    return '<div class="nt-note' + (kind ? (' nt-' + kind) : '') + '">' + text + '</div>';
  }

  function render() {
    if (!DATA) { box.innerHTML = '<div class="nt-load">กำลังเปิดการตั้งค่าของคุณ…</div>'; return; }
    if (DATA.error) {
      box.innerHTML = '<div class="nt-card">' + note(esc(DATA.error), 'warn') +
        '<p class="nt-help">ถ้าลิงก์นี้ใช้ไม่ได้ ทักไลน์ <a href="https://line.me/R/ti/p/@716lffzt" target="_blank" rel="noopener">@716lffzt</a> ' +
        'แล้วบอกทีมงานว่าไม่อยากรับการแจ้งเตือน ทีมงานปิดให้ได้ทันที</p></div>';
      return;
    }
    var p = DATA.pref;

    // ⛔ แถบนี้ต้องอยู่ตลอด จนกว่าระบบจะเริ่มส่งจริง
    var pending = note('ตอนนี้ระบบยังไม่ได้ส่งข้อความอัตโนมัติออกไปจริง ทีมงานยังติดต่อคุณด้วยตัวเองตามปกติ ' +
      'สิ่งที่คุณตั้งไว้ที่นี่จะถูกใช้ทันทีที่ระบบเริ่มส่ง', 'info');

    if (p.off) {
      box.innerHTML = '<div class="nt-card">' + pending +
        '<h2>คุณยกเลิกการแจ้งเตือนไว้แล้ว</h2>' +
        '<p class="nt-help">เราจะไม่ส่งข้อความอัตโนมัติหาคุณอีก · ทีมงานยังโทรหรือทักหาคุณเรื่องงานที่ฝากไว้ได้ตามปกติ</p>' +
        '<button class="nt-btn nt-primary" data-act="on"' + (busy ? ' disabled' : '') + '>เปิดรับการแจ้งเตือนอีกครั้ง</button>' +
        '</div>';
      return;
    }

    var chs = DATA.channels.map(function (c) {
      var has = !!p.addr[c];
      return '<label class="nt-row' + (has ? '' : ' nt-off') + '">' +
        '<input type="checkbox" data-ch="' + esc(c) + '"' + (p.channels[c] ? ' checked' : '') + (has ? '' : ' disabled') + '>' +
        '<span class="nt-name">' + esc(DATA.channelTh[c]) + '</span>' +
        '<span class="nt-addr">' + (has ? esc(p.addr[c]) : 'ยังไม่มีช่องทางนี้ในระบบ') + '</span>' +
        '</label>';
    }).join('');

    var evs = DATA.events.map(function (e) {
      return '<label class="nt-row">' +
        '<input type="checkbox" data-ev="' + esc(e) + '"' + (p.events[e] ? ' checked' : '') + '>' +
        '<span class="nt-name">' + esc(DATA.eventTh[e]) + '</span></label>';
    }).join('');

    box.innerHTML = '<div class="nt-card">' + pending +
      '<h2>สวัสดีครับ คุณ' + esc(p.name || 'ลูกค้า') + '</h2>' +
      '<h3>ช่องทางที่ให้ส่ง</h3>' + chs +
      '<h3>เรื่องที่อยากรับ</h3>' + evs +
      '<p class="nt-help">ติ๊กแล้วบันทึกให้อัตโนมัติ</p>' +
      '</div>' +
      '<div class="nt-card nt-danger">' +
        '<h3>ไม่อยากรับอะไรเลย</h3>' +
        '<p class="nt-help">กดปุ่มนี้แล้วเราจะหยุดส่งข้อความอัตโนมัติทั้งหมด รวมถึงข้อความที่เตรียมไว้แล้วแต่ยังไม่ได้ส่ง</p>' +
        '<button class="nt-btn nt-stop"' + (busy ? ' disabled' : '') + ' data-act="off">ยกเลิกการแจ้งเตือนทั้งหมด</button>' +
      '</div>';
  }

  function save(patch) {
    busy = true; render();
    api('PATCH', '/api/public/notify/pref', patch).then(function (r) {
      DATA.pref = r.pref; busy = false; render();
    }).catch(function (e) { busy = false; DATA.error = e.message; render(); });
  }

  box.addEventListener('change', function (ev) {
    var t = ev.target;
    if (!t || t.type !== 'checkbox') return;
    if (t.dataset.ch) { var c = {}; c[t.dataset.ch] = t.checked; save({ channels: c }); }
    else if (t.dataset.ev) { var e2 = {}; e2[t.dataset.ev] = t.checked; save({ events: e2 }); }
  });

  box.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!b || busy) return;
    if (b.dataset.act === 'off') {
      if (!window.confirm('ยืนยันว่าไม่ต้องการรับข้อความแจ้งเตือนจากที่ดินชัวร์อีก?')) return;
      busy = true; render();
      api('POST', '/api/public/notify/unsubscribe', {}).then(function (r) {
        DATA.pref = r.pref; busy = false; render();
      }).catch(function (e) { busy = false; DATA.error = e.message; render(); });
    } else if (b.dataset.act === 'on') {
      busy = true; render();
      api('POST', '/api/public/notify/resubscribe', {}).then(function (r) {
        DATA.pref = r.pref; busy = false; render();
      }).catch(function (e) { busy = false; DATA.error = e.message; render(); });
    }
  });

  if (!T) {
    DATA = { error: 'ลิงก์ไม่ครบ — กรุณากดลิงก์จากข้อความที่ทีมงานส่งให้โดยตรง' };
    render();
  } else {
    render();
    api('GET', '/api/public/notify/pref').then(function (r) { DATA = r; render(); })
      .catch(function (e) { DATA = { error: e.message }; render(); });
  }
})();
