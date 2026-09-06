/* บริการเพิ่มเติมจากทีมเอ็นเจและบริษัทพันธมิตร — ตัวกลางที่หน้าแรกและหน้ารายละเอียดแปลงใช้ร่วมกัน
 *
 * ทำไมต้องมีไฟล์นี้: จุดขายของฟีเจอร์นี้คือ "ซื้อที่ดินแล้วเดินต่อได้ทั้งเส้นในที่เดียว"
 * ซึ่งเว็บประกาศทั่วไปไม่มี — แต่จะเป็นจริงได้ต่อเมื่อรายการบริการ **เป็นชุดเดียวกันทุกหน้า**
 * ถ้าแต่ละหน้าเขียนรายการของตัวเอง วันหนึ่งหน้าแรกมี 7 บริการ หน้ารายละเอียดมี 5
 * แล้วสถิติที่นับว่า "คนสนใจบริการไหนมากที่สุด" จะอ่านไม่ได้เลย
 *
 * ⚠️ **คีย์ในรายการนี้ต้องตรงกับ NJ_SERVICES ใน server.js เป๊ะ** — เซิร์ฟเวอร์ทิ้งคีย์ที่ไม่รู้จัก
 * โดยไม่มี error ให้เห็น ติ๊กแล้วส่งไปก็เหมือนไม่ได้ติ๊ก
 *
 * ⚠️ **ห้ามใส่ชื่อบริษัทพันธมิตรที่ยังไม่มีสัญญาจริงเด็ดขาด** (กติกาข้อ 4 และ 9 ของโปรเจกต์)
 * บริการที่ `by:'nj'` = บริษัททำเอง ซึ่งหน้าแรกประกาศไว้อยู่แล้วในแถบ "บริการ" จึงเขียนชื่อได้
 * บริการที่ `by:'partner'` = ยังไม่มีรายชื่อ ต้องเขียนว่า "ทีมงานจัดหาบริษัทพันธมิตรให้"
 * มีสัญญาเมื่อไหร่ ให้เติมชื่อลง PARTNERS ข้างล่างที่เดียว แล้วทุกหน้าขึ้นชื่อจริงพร้อมกัน
 */
(function () {
  'use strict';

  var LIST = [
    { key: 'survey',      by: 'nj',      icon: '📐', th: 'รังวัดสอบเขต / แบ่งแยกโฉนด',
      desc: 'ยืนยันแนวเขตและเนื้อที่จริงก่อนโอน หรือแบ่งแปลงตามที่ตกลงกันไว้' },
    { key: 'title',       by: 'nj',      icon: '🔎', th: 'ตรวจกรรมสิทธิ์และภาระผูกพัน',
      desc: 'ตรวจสารบบที่ดินว่าติดจำนอง อายัด ภาระจำยอม หรือคดีความอะไรอยู่หรือไม่' },
    { key: 'transfer',    by: 'nj',      icon: '📋', th: 'ดูแลขั้นตอนการโอนซื้อขายที่ดิน',
      desc: 'เตรียมเอกสาร นัดวันโอน คำนวณค่าธรรมเนียมและภาษี และไปสำนักงานที่ดินด้วยกัน' },
    { key: 'subdivision', by: 'nj',      icon: '🗺️', th: 'ยื่นขออนุญาตจัดสรรที่ดิน',
      desc: 'สำหรับแปลงใหญ่ที่ตั้งใจแบ่งขายต่อ — วางผัง ยื่นเรื่อง และตามเรื่องให้' },
    { key: 'permit',      by: 'partner', icon: '🏗️', th: 'ขออนุญาตก่อสร้าง',
      desc: 'ยื่นขอใบอนุญาตก่อสร้างกับหน่วยงานท้องถิ่น พร้อมเอกสารและแบบที่ต้องใช้' },
    { key: 'design',      by: 'partner', icon: '✏️', th: 'ออกแบบ / เขียนแบบบ้านและอาคาร',
      desc: 'ออกแบบบ้านหรืออาคารบนแปลงที่ซื้อ พร้อมแบบที่ใช้ยื่นขออนุญาตได้' },
    { key: 'build',       by: 'partner', icon: '🧱', th: 'บริษัทรับเหมาก่อสร้าง',
      desc: 'ผู้รับเหมาที่รับงานต่อจากแบบ พร้อมสัญญาและงวดงานที่ตรวจสอบได้' }
  ];

  // ทะเบียนบริษัทพันธมิตรรายบริการ — **ตั้งใจปล่อยว่างไว้จนกว่าจะมีสัญญาจริง**
  // รูปแบบ: { permit: { name: 'ชื่อบริษัทตามหนังสือรับรอง', note: 'คำอธิบายสั้นๆ' } }
  // เติมที่นี่ที่เดียว ทุกหน้าจะขึ้นชื่อจริงพร้อมกันโดยไม่ต้องแก้ HTML
  var PARTNERS = {};

  var NJ_LABEL = 'ทีมเอ็นเจ กรุ๊ป';
  var PARTNER_FALLBACK = 'ทีมงานจัดหาบริษัทพันธมิตรให้';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function providerOf(s) {
    if (s.by === 'nj') return { name: NJ_LABEL, real: true };
    var p = PARTNERS[s.key];
    return p && p.name ? { name: p.name, real: true } : { name: PARTNER_FALLBACK, real: false };
  }
  function thOf(key) {
    var s = LIST.filter(function (x) { return x.key === key; })[0];
    return s ? s.th : '';
  }

  // ---------- รายการติ๊กเลือก ----------
  // ใช้ทั้งบนหน้าแรก (แบบการ์ดอธิบายยาว) และในฟอร์มสนใจแปลง (แบบบรรทัดสั้น)
  function checklistHtml(opt) {
    opt = opt || {};
    var compact = !!opt.compact;
    var name = opt.name || 'njsv';
    return '<div class="njsv-list' + (compact ? ' njsv-compact' : '') + '">' +
      LIST.map(function (s) {
        var pv = providerOf(s);
        return '<label class="njsv-item">' +
          '<input type="checkbox" name="' + esc(name) + '" value="' + esc(s.key) + '">' +
          '<span class="njsv-body">' +
            '<b class="njsv-name">' + (compact ? '' : '<i class="njsv-icon" aria-hidden="true">' + s.icon + '</i>') + esc(s.th) + '</b>' +
            (compact ? '' : '<i class="njsv-desc">' + esc(s.desc) + '</i>') +
            // ป้ายผู้ให้บริการ — บอกตรงๆ ว่าอันไหนเราทำเอง อันไหนต้องหาพันธมิตรมาให้
            // ผู้ซื้อมีสิทธิ์รู้ว่ากำลังจะได้คุยกับใคร และเราต้องไม่ทำให้เข้าใจว่าเราทำเองทั้งหมด
            '<em class="njsv-by ' + (s.by === 'nj' ? 'own' : 'partner') + '">' + esc(pv.name) + '</em>' +
          '</span>' +
        '</label>';
      }).join('') +
    '</div>';
  }

  // ---------- ฟอร์มส่งความสนใจ ----------
  // opt.listingId — ใส่มาจากหน้ารายละเอียดแปลง (รหัสทรัพย์) · หน้าแรกไม่ส่งมา
  // opt.compact   — แบบบรรทัดสั้น สำหรับพื้นที่แคบ
  function formHtml(opt) {
    opt = opt || {};
    var id = opt.listingId || '';
    // รหัสทรัพย์: มาจากหน้าแปลง = ล็อกไว้อ่านอย่างเดียว (กันพิมพ์ผิดจนแอดมินตรวจไม่เจอ)
    //             ไม่ได้มาจากหน้าแปลง = ให้กรอกเองได้ เผื่อคนจดรหัสมาจากที่อื่น
    var codeField = id
      ? '<div class="njsv-code locked">' +
          '<span class="njsv-code-label">รหัสทรัพย์ที่คุณกำลังดู</span>' +
          '<b class="njsv-code-val">' + esc(id) + '</b>' +
          '<input type="hidden" data-njsv="listingId" value="' + esc(id) + '">' +
          '<span class="njsv-code-note">แจ้งรหัสนี้ทุกครั้งที่ติดต่อ ทีมงานจะได้เปิดแปลงที่ถูกใบและแจ้งเจ้าของที่ดินให้ทันที</span>' +
        '</div>'
      : '<label class="njsv-field">' +
          '<span>รหัสทรัพย์ที่สนใจ <i>(ถ้ามี)</i></span>' +
          '<input type="text" data-njsv="listingId" placeholder="เช่น OP-023" autocomplete="off" inputmode="text">' +
          '<i class="njsv-hint">รหัสอยู่บนหน้าประกาศของแต่ละแปลง — ยังไม่มีแปลงในใจก็เว้นว่างไว้ได้</i>' +
        '</label>';

    // opt.wide — วางเต็มความกว้าง (หน้าแรก): รายการบริการกาง 3 คอลัมน์ ส่วนช่องกรอกยุบเป็นการ์ดกลางหน้า
    // ไม่ทำแบบนี้แล้วช่อง "ชื่อ/เบอร์" จะยืดเป็น 1,280px ซึ่งกรอกยากและดูเหมือนหน้าเว็บพัง
    return '<form class="njsv-form' + (opt.wide ? ' njsv-wide' : '') + '" novalidate>' +
      codeField +
      '<div class="njsv-fieldset">' +
        '<span class="njsv-legend">บริการที่อยากให้ดูแลต่อ <i>(เลือกได้หลายข้อ)</i></span>' +
        checklistHtml({ compact: !!opt.compact }) +
      '</div>' +
      '<div class="njsv-contact">' +
        '<div class="njsv-row2">' +
          '<label class="njsv-field"><span>ชื่อผู้ติดต่อ</span>' +
            '<input type="text" data-njsv="name" autocomplete="name" enterkeyhint="next"></label>' +
          '<label class="njsv-field"><span>เบอร์โทร</span>' +
            '<input type="tel" data-njsv="phone" autocomplete="tel" inputmode="tel" enterkeyhint="done"></label>' +
        '</div>' +
        '<label class="njsv-field"><span>ข้อความถึงทีมงาน <i>(ไม่บังคับ)</i></span>' +
          '<textarea data-njsv="note" rows="2" placeholder="เช่น อยากนัดดูที่เสาร์นี้ / อยากได้ราคารวมค่าโอน"></textarea></label>' +
        // honeypot — ชุดเดียวกับฟอร์มอื่นในเว็บ คนจริงมองไม่เห็นช่องนี้
        '<input type="text" data-njsv="website" class="njsv-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="njsv-msg" data-njsv-msg role="alert" hidden></div>' +
        '<button type="submit" class="njsv-submit">ส่งเรื่องให้ทีมงานติดต่อกลับ</button>' +
        '<p class="njsv-pdpa">กดส่ง = ยินยอมให้ บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด ใช้ข้อมูลนี้ติดต่อกลับเรื่องที่ดินและบริการที่เลือกเท่านั้น</p>' +
      '</div>' +
    '</form>';
  }

  // ---------- ผูกฟอร์มเข้ากับ API ----------
  function mount(host, opt) {
    if (!host) return null;
    opt = opt || {};
    host.innerHTML = formHtml(opt);
    var form = host.querySelector('.njsv-form');
    var msg = host.querySelector('[data-njsv-msg]');
    var btn = host.querySelector('.njsv-submit');
    var sending = false;
    var base = window.NJ_API_BASE || 'https://app.njteedinsure.com';

    function get(k) {
      var el = form.querySelector('[data-njsv="' + k + '"]');
      return el ? String(el.value || '').trim() : '';
    }
    function say(kind, text) {
      msg.className = 'njsv-msg ' + kind;
      msg.textContent = text;
      msg.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      var services = Array.prototype.map.call(
        form.querySelectorAll('input[type="checkbox"]:checked'), function (c) { return c.value; });
      var body = {
        listingId: get('listingId'),
        name: get('name'),
        phone: get('phone'),
        note: get('note'),
        services: services,
        website: get('website'),
        ref: location.search ? location.search.slice(1, 60) : (opt.ref || 'services')
      };
      // ตรวจฝั่งนี้ก่อนเพื่อบอกเร็ว — เซิร์ฟเวอร์ตรวจซ้ำอยู่ดี ไม่ได้พึ่งฝั่งนี้เป็นด่านความปลอดภัย
      if (!body.name) { say('bad', 'กรุณากรอกชื่อผู้ติดต่อ'); return; }
      if (body.phone.replace(/\D/g, '').length < 9) { say('bad', 'กรุณากรอกเบอร์โทรให้ครบ'); return; }
      if (!body.listingId && !services.length) {
        say('bad', 'เลือกบริการที่ต้องการอย่างน้อย 1 รายการ หรือใส่รหัสทรัพย์ที่สนใจ');
        return;
      }

      sending = true;
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'กำลังส่ง...';
      say('wait', 'กำลังส่งเรื่องให้ทีมงาน...');

      fetch(base + '/api/public/inquiry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          if (!r.ok) throw new Error(d.error || 'ส่งเรื่องไม่สำเร็จ');
          return d;
        });
      }).then(function (d) {
        sending = false;
        // สำเร็จแล้วปิดฟอร์มไปเลย — เหลือฟอร์มที่กรอกค้างไว้ = คนกดส่งซ้ำ แล้วทีมได้ใบซ้ำ
        host.innerHTML = '<div class="njsv-done">' +
          '<b>✓ ส่งเรื่องให้ทีมงานแล้ว</b>' +
          '<span>ทีมงานจะติดต่อกลับภายใน 1 วันทำการ' +
            (d && d.listingId ? ' — อ้างอิงแปลง <b>' + esc(d.listingId) + '</b>' : '') +
            (d && d.id ? ' · เลขที่เรื่อง <b>' + esc(d.id) + '</b>' : '') + '</span>' +
          '<span class="njsv-done-sub">อยากคุยเลยตอนนี้ ทักไลน์ ' +
            '<a href="https://line.me/R/ti/p/@716lffzt" target="_blank" rel="noopener" data-contact="line">@716lffzt</a>' +
            ' แล้วแจ้งเลขที่เรื่องได้เลย</span>' +
        '</div>';
        if (window.njTrack) njTrack('Lead', { content_name: 'service_inquiry', content_ids: d && d.listingId ? [d.listingId] : [] });
        // ไม่ยิง njTrackInternal('inquiry_submit') ที่นี่ — เซิร์ฟเวอร์บันทึกให้แล้วตอนสร้างใบ
        // (นับที่เดียวเท่านั้น ไม่งั้นตัวเลข formLeads ในหน้าสถิติจะเป็นสองเท่าของจริง)
      }).catch(function (err) {
        sending = false;
        btn.disabled = false;
        btn.textContent = label;
        // ส่งไม่ผ่านห้ามจบแค่ข้อความ error — ยื่นช่องทางที่ใช้ได้แน่นอนให้ทันที ไม่งั้นลีดหลุด
        say('bad', (err.message || 'ส่งเรื่องไม่สำเร็จ') + ' — โทรหาเราได้ที่ 02-162-0405 หรือทักไลน์ @716lffzt');
      });
    });
    return { form: form };
  }

  // ---------- วางฟอร์มอัตโนมัติ ----------
  // หน้าไหนอยากได้ฟอร์มนี้ ใส่ <div data-njsv-form> ไว้พอ ไม่ต้องเขียน JS เพิ่มในหน้านั้น
  // (หน้ารายละเอียดแปลงเรียก mount() เองเพราะต้องรอรหัสแปลงจาก API ก่อน)
  function boot() {
    document.querySelectorAll('[data-njsv-form]').forEach(function (el) {
      mount(el, {
        wide: el.hasAttribute('data-njsv-wide'),
        compact: el.hasAttribute('data-njsv-compact'),
        listingId: el.getAttribute('data-njsv-listing') || '',
        ref: el.getAttribute('data-njsv-ref') || ''
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NJServices = {
    LIST: LIST,
    PARTNERS: PARTNERS,
    thOf: thOf,
    providerOf: providerOf,
    checklistHtml: checklistHtml,
    formHtml: formHtml,
    mount: mount
  };
})();
