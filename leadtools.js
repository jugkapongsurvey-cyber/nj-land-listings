/* เครื่องมือเก็บลีด 5 ตัว (Phase 10 สปรินต์ 5) — แบบประเมินความพร้อมขาย · เช็กลิสต์ก่อนซื้อ ·
 * ขอวิเคราะห์ราคาขาย · ขอดูตัวอย่างรายงาน · รับข่าวสาร
 *
 * ⚠️ **คำถาม ตัวเลือก และการให้คะแนน มาจากเซิร์ฟเวอร์ที่เดียว** (`/api/public/lead-tool/spec`)
 *    ห้ามคัดลอกรายการคำถามมาไว้ในไฟล์นี้เด็ดขาด — สองที่เมื่อไหร่ก็เพี้ยนเมื่อนั้น
 *    และคะแนนที่ผู้ใช้เห็นจะไม่ตรงกับที่ทีมขายเห็นในใบลีด ซึ่งแก้ยากกว่าที่คิด
 *
 * ⚠️ **ไม่มีคีย์ = ไม่วาดอะไรเลย** — ต่อเซิร์ฟเวอร์ไม่ได้ก็ซ่อนทั้งก้อน
 *    ไม่วาดกล่องเปล่าที่กดแล้วพัง (กติกาเดียวกับส่วนแผนที่ใน arealink.js)
 *
 * ⚠️ **ให้ผลก่อน แล้วค่อยขอเบอร์** — ผู้ใช้เห็นคะแนน/สรุปได้โดยไม่ต้องกรอกอะไรเลย
 *    (`/preview` ไม่เก็บอะไรลงฐานข้อมูล) การกรอกชื่อ-เบอร์เป็นทางเลือกเสมอ
 *    ตั้งกำแพงเมื่อไหร่ = ได้เบอร์น้อยลงและได้ชื่อเสียงเสียไปด้วย
 *
 * ⚠️ **ห้ามใส่ on* ใน HTML ที่ประกอบเป็นข้อความ** (กติกา CSP ของเว็บนี้) — ผูกด้วย addEventListener เท่านั้น
 */
(function (w, d) {
  'use strict';

  var base = (w.NJ_CONFIG && w.NJ_CONFIG.apiBase) || w.NJ_API_BASE || '';
  if (!base) return;

  var SPEC = null;
  var esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  var el = function (id) { return d.getElementById(id); };
  // สถิติภายใน — ใช้ njTrackInternal ของ analytics.js ตัวเดียวกับหน้าอื่น
  // ⚠️ ห้ามกลับไปเรียก NJTrack.event — ไม่มีตัวแปรนี้บนเว็บเลย เหตุการณ์จึงหายเงียบตั้งแต่วันแรก (แก้ 25 ก.ย. 2569)
  // ⚠️ ชื่อที่ส่งต้องอยู่ใน NJ_INTERNAL_EVENTS ของ analytics.js และ PUBLIC_EVENT_TYPES ของ server.js
  var track = function (type) {
    try { if (typeof w.njTrackInternal === 'function') w.njTrackInternal(type); } catch (e) {}
  };
  // "เริ่มใช้เครื่องมือ" = ตัวหารอัตราแปลงบนแดชบอร์ดการตลาด (VIEW_EVENT ใน lib/mktdash.js ของระบบ)
  // ⚠️ ยิงครั้งเดียวต่อการเปิดหน้า เมื่อผู้ใช้ลงมือจริง (ติ๊กข้อแรก / แตะช่องกรอกครั้งแรก)
  //    **ไม่ใช่ตอนเลื่อนผ่าน** — หน้าเครื่องมือมีหลายตัวในหน้าเดียว เห็นบนจอไม่ได้แปลว่าสนใจ
  //    ยิงซ้ำทุกครั้งที่แตะช่อง = ตัวหารบวม อัตราแปลงต่ำกว่าความจริง
  function startOnce(type, pairs) {
    var done = false;
    function fire() {
      if (done) return;
      done = true;
      pairs.forEach(function (p) { p[0].removeEventListener(p[1], fire); });
      track(type);
    }
    pairs.forEach(function (p) { p[0].addEventListener(p[1], fire); });
  }

  function api(path, body) {
    var opt = { method: body ? 'POST' : 'GET' };
    if (body) {
      opt.headers = { 'Content-Type': 'application/json' };
      opt.body = JSON.stringify(body);
    }
    return fetch(base + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'ส่งเรื่องไม่สำเร็จ');
        return j;
      });
    });
  }

  // ---------- ส่วนขอชื่อ-เบอร์ที่ใช้ร่วมกันทุกเครื่องมือ ----------
  //
  // ⚠️ ข้อความยินยอมต้องอยู่ติดปุ่มส่งเสมอ และต้องบอกว่าเอาไปใช้ทำอะไร
  //    ฝั่งเซิร์ฟเวอร์เก็บ pdpa ที่ติ๊กนี้เป็นหลักฐาน (ดู webConsentStamp ใน server.js)
  function contactHtml(tool, opts) {
    var o = opts || {};
    return '' +
      '<div class="lt-ask" data-lt-ask="' + esc(tool) + '">' +
        '<p class="lt-ask-h">' + esc(o.title || 'ให้ทีมช่างรังวัดช่วยดูต่อไหม') + '</p>' +
        (o.sub ? '<p class="lt-ask-sub">' + esc(o.sub) + '</p>' : '') +
        '<div class="lt-row">' +
          '<label class="nj-field"><span class="nj-label">ชื่อผู้ติดต่อ</span>' +
            '<input class="nj-input" type="text" data-lt="name" autocomplete="name" maxlength="120"></label>' +
          '<label class="nj-field"><span class="nj-label">เบอร์โทร</span>' +
            '<input class="nj-input" type="tel" data-lt="phone" autocomplete="tel" maxlength="40" inputmode="tel"></label>' +
        '</div>' +
        (o.area ? '<div class="lt-row">' +
          '<label class="nj-field"><span class="nj-label">จังหวัด</span><input class="nj-input" type="text" data-lt="province" maxlength="120"></label>' +
          '<label class="nj-field"><span class="nj-label">อำเภอ</span><input class="nj-input" type="text" data-lt="amphoe" maxlength="120"></label>' +
        '</div>' : '') +
        '<label class="nj-field"><span class="nj-label">อยากบอกอะไรเพิ่มเติมไหม (ไม่บังคับ)</span>' +
          '<textarea class="nj-textarea" data-lt="note" rows="2" maxlength="800"></textarea></label>' +
        '<label class="lt-pdpa"><input type="checkbox" data-lt="pdpa">' +
          '<span>ยินยอมให้ บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด ติดต่อกลับเรื่องที่ดินแปลงนี้</span></label>' +
        '<input type="text" data-lt="website" class="lt-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<button type="button" class="nj-btn nj-btn-primary lt-send" data-lt-send="' + esc(tool) + '">' + esc(o.btn || 'ส่งให้ทีมงาน') + '</button>' +
        '<p class="lt-say" data-lt-say role="status" aria-live="polite"></p>' +
      '</div>';
  }

  function readContact(box) {
    var g = function (k) {
      var n = box.querySelector('[data-lt="' + k + '"]');
      return n ? String(n.value || '').trim() : '';
    };
    var pd = box.querySelector('[data-lt="pdpa"]');
    return {
      name: g('name'), phone: g('phone'), note: g('note'),
      province: g('province'), amphoe: g('amphoe'),
      email: g('email'), website: g('website'),
      pdpa: !!(pd && pd.checked)
    };
  }

  function say(box, kind, text) {
    var n = box.querySelector('[data-lt-say]');
    if (!n) return;
        // ⚠️ ใช้คลาสข้อความผิดพลาด/คำใบ้ของคอมโพเนนต์กลาง ไม่เขียนสีเอง
    n.className = 'lt-say ' + (kind === 'bad' ? 'nj-error-text' : 'nj-hint');
    n.textContent = text || '';
  }

  // ส่งลีด — ใช้ร่วมกันทุกเครื่องมือ
  function send(box, tool, extra) {
    var c = readContact(box);
    if (tool !== 'newsletter') {
      if (!c.name) { say(box, 'bad', 'กรุณากรอกชื่อผู้ติดต่อ'); return; }
      if (c.phone.replace(/\D/g, '').length < 9) { say(box, 'bad', 'กรุณากรอกเบอร์โทรให้ครบ'); return; }
    }
    if (!c.pdpa) { say(box, 'bad', 'กรุณาติ๊กยินยอมให้เราติดต่อกลับก่อนส่ง'); return; }

    var body = {
      tool: tool, name: c.name, phone: c.phone, email: c.email, note: c.note,
      province: c.province, amphoe: c.amphoe, website: c.website, pdpa: true,
      ref: (w.NJAttrib && NJAttrib.refText()) || ('tool_' + tool)
    };
    // ที่มาของลีด — ไม่มีข้อมูลส่วนบุคคลอยู่ในนี้ (ดูคำเตือนหัวไฟล์ attrib.js)
    if (w.NJAttrib) body.attrib = NJAttrib.value();
    Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });

    var btn = box.querySelector('[data-lt-send]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'กำลังส่ง...'; }
    say(box, 'wait', 'กำลังส่งเรื่องให้ทีมงาน...');

    api('/api/public/lead-tool', body).then(function () {
      box.innerHTML = '<p class="nj-alert nj-alert-ok">ส่งเรื่องแล้ว ทีมงานจะติดต่อกลับในเวลาทำการ ' +
        'ถ้าอยากให้เร็วกว่านั้น ทักไลน์ ' + esc((w.NJ_CONFIG && w.NJ_CONFIG.lineId) || '@716lffzt') + ' ได้เลย</p>';
      // ไม่ยิงเหตุการณ์ "ส่งแล้ว" จากตรงนี้ — เซิร์ฟเวอร์บันทึก lead_tool_submit เองตอนสร้างใบ (ยิงซ้ำ = นับสองครั้ง)
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'ส่งให้ทีมงาน'; }
      say(box, 'bad', e.message || 'ส่งเรื่องไม่สำเร็จ ลองใหม่อีกครั้ง');
    });
  }

  // ---------- 1) แบบประเมินความพร้อมขาย 10 นาที ----------
  function mountAssess(host) {
    var qs = SPEC.assess || [];
    if (!qs.length) return;
    host.innerHTML =
      '<p class="lt-lead">ตอบ ' + qs.length + ' ข้อ แล้วดูว่าแปลงของคุณพร้อมประกาศขายแค่ไหน ' +
      'และมีเรื่องไหนที่ต้องเคลียร์ก่อน — ไม่ต้องกรอกชื่อหรือเบอร์</p>' +
      '<div class="lt-qs">' + qs.map(function (q) {
        return '<fieldset class="lt-q"><legend>' + esc(q.th) + '</legend>' +
          q.opts.map(function (o, i) {
            var id = 'ltq-' + esc(q.key) + '-' + i;
            return '<label class="lt-opt" for="' + id + '">' +
              '<input type="radio" id="' + id + '" name="ltq-' + esc(q.key) + '" value="' + esc(o[0]) + '">' +
              '<span>' + esc(o[1]) + '</span></label>';
          }).join('') +
        '</fieldset>';
      }).join('') + '</div>' +
      '<button type="button" class="nj-btn nj-btn-primary lt-go" data-lt-assess>ดูผลประเมิน</button>' +
      '<div class="lt-out" data-lt-out></div>';

    host.querySelector('[data-lt-assess]').addEventListener('click', function () {
      var answers = {};
      qs.forEach(function (q) {
        var n = host.querySelector('input[name="ltq-' + q.key + '"]:checked');
        if (n) answers[q.key] = n.value;
      });
      if (!Object.keys(answers).length) {
        host.querySelector('[data-lt-out]').innerHTML = '<p class="nj-error-text">ยังไม่ได้ตอบสักข้อ</p>';
        return;
      }
      api('/api/public/lead-tool/preview', { tool: 'assess', answers: answers }).then(function (r) {
        var s = r.score || {};
        var out = host.querySelector('[data-lt-out]');
        out.innerHTML =
          '<div class="lt-score lt-lv-' + esc(s.level) + '">' +
            '<div class="lt-score-n">' + esc(s.pct) + '<span>%</span></div>' +
            '<div><p class="lt-score-t">' + esc(s.levelTh) + '</p>' +
            '<p class="lt-score-s">คิดจาก ' + esc(s.answered) + ' ข้อที่ตอบ (จากทั้งหมด ' + esc(s.total) + ' ข้อที่ให้คะแนน)</p></div>' +
          '</div>' +
          // ⚠️ ต้องบอกเสมอว่านี่ไม่ใช่ราคาและไม่ใช่การรังวัด
          '<p class="nj-alert nj-alert-warn lt-warn">นี่คือความพร้อมของ <b>เอกสารและตัวแปลง</b> ไม่ใช่การประเมินราคา และไม่ใช่การรังวัด — ' +
            'ราคาที่เชื่อถือได้ต้องมีคนดูแปลงจริง</p>' +
          ((s.fixes || []).length
            ? '<p class="lt-fix-h">เรื่องที่ควรเคลียร์ก่อนประกาศขาย</p><ul class="lt-fix">' +
              s.fixes.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>'
            : '<p class="lt-ok">จากที่ตอบมา ยังไม่พบเรื่องที่ต้องเคลียร์ก่อน</p>') +
          contactHtml('assess', {
            title: 'อยากให้ทีมช่วยดูเอกสารจริงไหม',
            sub: 'ทีมช่างรังวัดจะโทรกลับไปถามรายละเอียด แล้วบอกว่าต้องเตรียมอะไรบ้าง',
            area: true, btn: 'ให้ทีมช่วยดูต่อ'
          });
        out.querySelector('[data-lt-send]').addEventListener('click', function () {
          send(out.querySelector('[data-lt-ask]'), 'assess', { answers: answers });
        });
        track('lead_tool_preview');
      }).catch(function (e) {
        host.querySelector('[data-lt-out]').innerHTML = '<p class="nj-error-text">' + esc(e.message) + '</p>';
      });
    });
  }

  // ---------- 2) เช็กลิสต์ตรวจที่ดินก่อนซื้อ (กล่องท้ายหน้า checklist.html) ----------
  //
  // ⚠️ **รายการข้ออ่านจากหน้า checklist.html เอง** (input[data-cl] · ชื่อข้อจาก <b> ในป้าย)
  //    ไม่ได้มาจากเซิร์ฟเวอร์ และห้ามพิมพ์รายการซ้ำไว้ในไฟล์นี้ — หน้านั้นคือเนื้อหาที่คนเขียนเอง
  //    เพิ่ม/ตัดข้อที่หน้าเดียว ลีดที่ทีมขายได้รับก็ตรงตามทันที
  //    (เจ้าของกิจการเลือก "รวมเป็นอันเดียว" 2026-09-25 — เดิมหน้าเครื่องมือมีเช็กลิสต์ 10 ข้อแยกอีกชุด)
  // ⚠️ สิ่งที่ติ๊กไม่ถูกส่งไปไหนจนกว่าผู้ใช้จะกดส่งเอง (checklist.js จำไว้ในเครื่องเท่านั้น)
  function mountChecklist(host) {
    var boxes = Array.prototype.slice.call(d.querySelectorAll('input[data-cl]'));
    if (!boxes.length) return;
    var nameOf = function (b) {
      var lab = b.closest ? b.closest('label') : null;
      var bold = lab && lab.querySelector('b');
      var t = (bold || lab || {}).textContent || b.getAttribute('data-cl') || '';
      return String(t).replace(/\s+/g, ' ').trim();
    };
    var isField = function (b) {
      var li = b.closest ? b.closest('.cl-item') : null;
      return !!li && li.getAttribute('data-where') === 'field';
    };
    host.innerHTML =
      '<p class="lt-lead">ข้อที่ยังไม่ได้ติ๊ก โดยเฉพาะข้อที่ต้องลงพื้นที่ ทีมช่างรังวัดไปตรวจให้ได้ ' +
        'ทิ้งชื่อกับเบอร์ไว้ ทีมจะโทรกลับไปคุยว่าแปลงที่คุณดูอยู่ต้องตรวจอะไรเพิ่ม</p>' +
      '<p class="lt-count" data-lt-count></p>' +
      // ⚠️ ห้ามเขียนว่า "ผ่าน" หรือ "ปลอดภัย" — ติ๊กครบไม่ได้แปลว่าแปลงไม่มีปัญหา
      '<p class="nj-alert nj-alert-warn lt-warn">ติ๊กครบทุกข้อไม่ได้แปลว่าแปลงปลอดภัย — เป็นแค่รายการสิ่งที่ควรไปดูให้ครบ</p>' +
      contactHtml('checklist', {
        title: 'ให้ช่างรังวัดไปดูให้แทนไหม',
        sub: 'ทีมงานตรวจแนวเขต ทางเข้าออก และเอกสารสิทธิให้ก่อนคุณตัดสินใจ · ทีมจะเห็นว่าคุณติ๊กข้อไหนไปแล้ว',
        btn: 'ขอให้ทีมไปตรวจให้'
      });

    var count = host.querySelector('[data-lt-count]');
    function left() { return boxes.filter(function (b) { return !b.checked; }); }
    function paint() {
      var l = left();
      var field = l.filter(isField).length;
      count.textContent = 'ติ๊กแล้ว ' + (boxes.length - l.length) + '/' + boxes.length + ' ข้อ' +
        (field ? ' · ยังเหลือข้อที่ต้องลงพื้นที่ ' + field + ' ข้อ' : '');
    }
    boxes.forEach(function (b) { b.addEventListener('change', paint); });
    // เริ่มใช้ = ติ๊กข้อแรก หรือแตะช่องกรอกของกล่องขอให้ทีมตรวจ · ติ๊กที่จำไว้จากครั้งก่อนไม่นับ (ไม่ยิง change)
    startOnce('lead_tool_checklist_start',
      boxes.map(function (b) { return [b, 'change']; }).concat([[host, 'focusin']]));
    // ปุ่ม "ล้างที่ติ๊กไว้" ของ checklist.js เปลี่ยนค่าโดยไม่ยิง change — วาดใหม่หลังกดด้วย
    var rs = d.querySelector('[data-cl-reset]');
    if (rs) rs.addEventListener('click', function () { setTimeout(paint, 0); });
    paint();

    host.querySelector('[data-lt-send]').addEventListener('click', function () {
      var l = left();
      send(host.querySelector('[data-lt-ask]'), 'checklist', {
        done: boxes.length - l.length, total: boxes.length, left: l.map(nameOf)
      });
    });
  }

  // ---------- 3) ขอวิเคราะห์ราคาขาย ----------
  function mountPrice(host) {
    host.innerHTML =
      '<p class="lt-lead">บอกที่ตั้งกับเนื้อที่มาคร่าวๆ ทีมจะดูราคาซื้อขายจริงแถวนั้นแล้วโทรกลับไปคุย</p>' +
      '<div class="lt-row lt-row-3">' +
        '<label class="nj-field"><span class="nj-label">ไร่</span><input class="nj-input" type="number" data-ltp="rai" min="0" inputmode="numeric"></label>' +
        '<label class="nj-field"><span class="nj-label">งาน</span><input class="nj-input" type="number" data-ltp="ngan" min="0" inputmode="numeric"></label>' +
        '<label class="nj-field"><span class="nj-label">ตารางวา</span><input class="nj-input" type="number" data-ltp="wa" min="0" inputmode="numeric"></label>' +
      '</div>' +
      '<label class="nj-field"><span class="nj-label">ราคาที่หวังไว้ทั้งแปลง (ไม่บังคับ)</span>' +
        '<input class="nj-input" type="number" data-ltp="priceHope" min="0" inputmode="numeric"></label>' +
      // ⚠️ ห้ามให้ตัวเลขราคาใดๆ ทันทีในหน้านี้ — ราคาที่ไม่ได้ดูแปลงจริงคือการเดา
      '<p class="nj-alert nj-alert-warn lt-warn">เราไม่ตอบราคาทันทีในหน้านี้ เพราะราคาที่ไม่ได้ดูแปลงจริงคือการเดา — ' +
        'ทีมจะดูข้อมูลซื้อขายจริงในพื้นที่ก่อนแล้วค่อยคุยกับคุณ</p>' +
      contactHtml('price_analysis', { title: 'ให้ทีมวิเคราะห์ราคาให้', area: true, btn: 'ขอให้วิเคราะห์ราคา' });
    startOnce('lead_tool_price_start', [[host, 'focusin']]);

    host.querySelector('[data-lt-send]').addEventListener('click', function () {
      var n = function (k) {
        var e = host.querySelector('[data-ltp="' + k + '"]');
        return e && e.value ? Number(e.value) : 0;
      };
      send(host.querySelector('[data-lt-ask]'), 'price_analysis',
        { rai: n('rai'), ngan: n('ngan'), wa: n('wa'), priceHope: n('priceHope') });
    });
  }

  // ---------- 4) ขอดูตัวอย่างรายงานตรวจที่ดิน ----------
  //
  // ⚠️ **ยังไม่มีไฟล์ตัวอย่างให้ดาวน์โหลดตรงๆ** — รายงานจริงของลูกค้าเอามาแจกไม่ได้
  //    และรายงานปลอมที่ทำขึ้นเองก็ไม่ควรเอามาอ้างว่าเป็นงานของเรา
  //    รอบนี้จึงเป็น "ขอรับตัวอย่าง" ให้ทีมส่งให้ · เมื่อเจ้าของกิจการให้ไฟล์ตัวอย่างที่ปิดข้อมูลลูกค้าแล้ว
  //    ค่อยเปลี่ยนเป็นปุ่มดาวน์โหลดตรงในรอบถัดไป
  function mountSample(host) {
    host.innerHTML =
      '<p class="lt-lead">อยากเห็นก่อนว่ารายงานตรวจที่ดินของเราหน้าตาเป็นยังไง มีอะไรอยู่ในนั้นบ้าง ' +
      'ทิ้งชื่อกับเบอร์ไว้ ทีมงานส่งตัวอย่างให้ทางไลน์หรืออีเมล</p>' +
      '<ul class="lt-bullet">' +
        '<li>ผลตรวจแนวเขตเทียบกับหลักเขตจริงในพื้นที่</li>' +
        '<li>ทางเข้าออกและสิ่งที่ติดขัดจริงหน้างาน</li>' +
        '<li>สิ่งที่พบในสารบัญจดทะเบียนหลังโฉนด</li>' +
        '<li>ภาพถ่ายหน้างานพร้อมคำอธิบายทีละจุด</li>' +
      '</ul>' +
      '<p class="nj-alert nj-alert-warn lt-warn">ตัวอย่างที่ส่งให้เป็นรายงานที่ปิดข้อมูลของลูกค้าเจ้าของแปลงไว้แล้ว</p>' +
      contactHtml('sample_report', { title: 'ขอรับตัวอย่างรายงาน', btn: 'ขอรับตัวอย่าง' });
    startOnce('lead_tool_sample_start', [[host, 'focusin']]);

    host.querySelector('[data-lt-send]').addEventListener('click', function () {
      send(host.querySelector('[data-lt-ask]'), 'sample_report', {});
    });
  }

  // ---------- 5) รับข่าวสาร ----------
  function mountNews(host) {
    host.innerHTML =
      '<div class="lt-news">' +
        '<p class="lt-news-h">รับข่าวสารที่ดินชัวร์</p>' +
        // ⚠️ ความถี่ที่เขียนตรงนี้คือสิ่งที่ผู้สมัครยินยอม — แก้ข้อความเมื่อไหร่ต้องแก้ค่า freq ที่ส่งไปด้วย
        //    (ระบบหลังบ้านส่งตาม freq · ไม่ส่ง freq = ถือว่าสมัครจากข้อความเดิม "เดือนละไม่เกิน 2 ครั้ง")
        '<p class="lt-news-s">วารสารที่ดินชัวร์ทางอีเมล สัปดาห์ละ 1 ฉบับ · แปลงใหม่ที่ผ่านการตรวจ · ความรู้ก่อนซื้อ-ขายที่ดิน</p>' +
        '<div class="lt-ask" data-lt-ask="newsletter">' +
          '<label class="nj-field"><span class="nj-label">อีเมล</span>' +
            '<input class="nj-input" type="email" data-lt="email" autocomplete="email" maxlength="120"></label>' +
          '<label class="nj-field"><span class="nj-label">ชื่อ (ไม่บังคับ)</span>' +
            '<input class="nj-input" type="text" data-lt="name" autocomplete="name" maxlength="120"></label>' +
          '<label class="lt-pdpa"><input type="checkbox" data-lt="pdpa">' +
            '<span>ยินยอมให้ส่งข่าวสารมาที่อีเมลนี้ · ยกเลิกได้ทุกเมื่อจากลิงก์ท้ายอีเมล</span></label>' +
          '<input type="text" data-lt="website" class="lt-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<button type="button" class="nj-btn nj-btn-primary lt-send" data-lt-send="newsletter">รับข่าวสาร</button>' +
          '<p class="lt-say" data-lt-say role="status" aria-live="polite"></p>' +
        '</div>' +
      '</div>';
    startOnce('lead_tool_news_start', [[host, 'focusin']]);
    host.querySelector('[data-lt-send]').addEventListener('click', function () {
      var box = host.querySelector('[data-lt-ask]');
      var c = readContact(box);
      if (!c.email) { say(box, 'bad', 'กรุณากรอกอีเมล'); return; }
      send(box, 'newsletter', { freq: 'weekly' });
    });
  }

  var MOUNTS = [
    ['lt-assess', mountAssess], ['lt-checklist', mountChecklist],
    ['lt-price', mountPrice], ['lt-sample', mountSample], ['lt-news', mountNews]
  ];

  function boot() {
    var wanted = MOUNTS.filter(function (m) { return el(m[0]); });
    if (!wanted.length) return;
    api('/api/public/lead-tool/spec').then(function (spec) {
      SPEC = spec || {};
      wanted.forEach(function (m) {
        try { m[1](el(m[0])); } catch (e) {}
      });
    }).catch(function () {
      // ต่อเซิร์ฟเวอร์ไม่ได้ = ซ่อนทั้งก้อน ไม่ทิ้งหัวข้อลอยไว้ให้ดูเหมือนเว็บพัง
      wanted.forEach(function (m) {
        var host = el(m[0]);
        var sec = host.closest ? host.closest('section') : null;
        (sec || host).style.display = 'none';
      });
    });
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();

  w.NJLeadTools = { mounts: MOUNTS.map(function (m) { return m[0]; }) };
})(window, document);
