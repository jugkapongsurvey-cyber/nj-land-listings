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
      desc: 'ผู้รับเหมาที่รับงานต่อจากแบบ พร้อมสัญญาและงวดงานที่ตรวจสอบได้' },
    { key: 'fill',        by: 'partner', icon: '🚜', th: 'ถมดิน / ปรับระดับที่ดิน',
      desc: 'ถมดินและปรับระดับแปลงให้พร้อมก่อสร้าง พร้อมใบเสนอราคาที่แจกแจงปริมาณดิน' }
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
            '<em class="njsv-by ' + (s.by === 'nj' ? 'own' : 'partner') + '"' + (s.by === 'nj' ? '' : ' data-njsv-by="' + esc(s.key) + '"') + '>' + esc(pv.name) + '</em>' +
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
    return '<form class="njsv-form' + (opt.wide ? ' njsv-wide' : '') + '" novalidate data-njform>' +
      codeField +
      '<div class="njsv-fieldset">' +
        '<span class="njsv-legend">บริการที่อยากให้ดูแลต่อ <i>(เลือกได้หลายข้อ)</i></span>' +
        checklistHtml({ compact: !!opt.compact }) +
      '</div>' +
      // แผงบริษัทพันธมิตร — โผล่เมื่อติ๊กบริการของพันธมิตร และระบบมีพันธมิตรที่ขึ้นเว็บได้ (ดู loadDir)
      '<div class="njsv-pps" data-njsv-pps hidden></div>' +
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

  // ---------- ทำเนียบบริษัทพันธมิตร (เจ้าของกิจการอนุมัติ 25 ก.ย. 2569) ----------
  // ⚠️ รายชื่อบริษัทมาจาก GET /api/public/partners เท่านั้น — เซิร์ฟเวอร์ส่งเฉพาะรายที่ยินยอมเป็นลายลักษณ์อักษร
  //    และผ่านเกณฑ์รับงาน · **ห้ามพิมพ์ชื่อบริษัทไว้ในไฟล์นี้** (PARTNERS ข้างบนยังว่างโดยตั้งใจ)
  // ⚠️ ไม่มีเบอร์โทรพันธมิตรบนเว็บโดยตั้งใจ — ลูกค้าติดต่อผ่านทีมงานและได้รหัสอ้างอิงจากเซิร์ฟเวอร์
  // ⚠️ โหลดไม่ได้ / สวิตช์ปิด (404) = เงียบ แล้วฟอร์มทำงานแบบเดิมทุกอย่าง (ป้าย "ทีมงานจัดหาบริษัทพันธมิตรให้")
  var dirCache = {};
  function loadDir(base, province, cb) {
    var key = province || '';
    var c = dirCache[key];
    if (c && c.data) { cb(c.data); return; }
    if (c) { c.cbs.push(cb); return; }
    c = dirCache[key] = { data: null, cbs: [cb] };
    fetch(base + '/api/public/partners' + (province ? '?province=' + encodeURIComponent(province) : ''))
      .then(function (r) { if (!r.ok) throw new Error('off'); return r.json(); })
      .then(function (d) { c.data = d; c.cbs.forEach(function (f) { f(d); }); c.cbs = []; })
      .catch(function () { c.data = { partners: [], off: true }; c.cbs.forEach(function (f) { f(c.data); }); c.cbs = []; });
  }
  function dirFor(d, svc) {
    return ((d && d.partners) || []).filter(function (p) { return (p.services || []).indexOf(svc) >= 0; });
  }
  function safeLink(u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : ''; }
  function ppCard(p, svc, picked) {
    var links = [['website', 'เว็บไซต์'], ['facebook', 'เพจ Facebook'], ['portfolio', 'ดูผลงาน']].map(function (x) {
      var u = safeLink((p.links || {})[x[0]]);
      return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer nofollow">' + x[1] + '</a>' : '';
    }).join('');
    var facts = [
      ['งานผ่านที่ดินชัวร์', p.jobs ? p.jobs + ' งาน' : 'ยังไม่มี'],
      ['คะแนนลูกค้า', p.rating ? (p.rating.average + ' / 5 (' + p.rating.count + ' รีวิว)') : 'ยังไม่มีรีวิว'],
      ['ราคาเริ่มต้น', p.startPrice || ''],
      ['ระยะเวลา', p.leadTime || ''],
      ['พื้นที่รับงาน', p.allProvinces ? 'ทุกจังหวัด' : (p.provinces || []).join(' · ')]
    ].filter(function (x) { return x[1]; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('');
    return '<div class="njsv-pc' + (picked ? ' sel' : '') + '">' +
      '<div class="njsv-pc-top"><span class="njsv-logo" aria-hidden="true">' + esc(String(p.name || '?').charAt(0)) + '</span>' +
        '<span class="njsv-pc-name">' + esc(p.name) + '<small>' + esc(p.kindTh || '') + '</small></span></div>' +
      (p.isNew ? '<span class="njsv-chip warn">พันธมิตรใหม่</span>' : '<span class="njsv-chip ok">ผ่านการตรวจเอกสารโดยทีมงาน</span>') +
      (p.tagline ? '<p class="njsv-pc-tag">' + esc(p.tagline) + '</p>' : '') +
      '<dl class="njsv-facts">' + facts + '</dl>' +
      (links ? '<div class="njsv-links">' + links + '</div>' : '') +
      '<button type="button" class="njsv-choose" data-njsv-pick="' + esc(svc) + '" data-id="' + esc(p.partnerId) + '">' +
        (picked ? '✓ เลือกบริษัทนี้แล้ว' : 'ขอใบเสนอราคาจากบริษัทนี้') + '</button>' +
    '</div>';
  }
  function ppBlock(svc, list, pref, disclosure, province) {
    var mode = pref.mode || 'team';
    return '<div class="njsv-pp">' +
      '<div class="njsv-pp-h"><b>' + esc(thOf(svc)) + ' · บริษัทพันธมิตร' + (province ? 'ใน' + esc(province) : '') + '</b><span>' + list.length + ' ราย · ตรวจเอกสารโดยทีมงานที่ดินชัวร์</span></div>' +
      '<label class="njsv-opt"><input type="radio" name="njsv-m-' + esc(svc) + '" value="team" data-njsv-mode="' + esc(svc) + '"' + (mode === 'team' ? ' checked' : '') + '>' +
        '<span><b>ให้ทีมงานเลือกบริษัทที่เหมาะกับแปลงนี้</b> <i class="njsv-rec">แนะนำ</i><small>ทีมงานส่งข้อมูลแปลงให้ 1–3 บริษัท แล้วรวมใบเสนอราคามาให้เทียบ</small></span></label>' +
      '<label class="njsv-opt"><input type="radio" name="njsv-m-' + esc(svc) + '" value="pick" data-njsv-mode="' + esc(svc) + '"' + (mode === 'pick' ? ' checked' : '') + '>' +
        '<span><b>ฉันขอเลือกบริษัทเอง</b><small>ดูข้อมูลแต่ละบริษัทด้านล่าง แล้วกดขอใบเสนอราคา</small></span></label>' +
      (mode === 'pick' ? '<div class="njsv-cards">' + list.map(function (p) { return ppCard(p, svc, pref.partnerId === p.partnerId); }).join('') + '</div>' : '') +
      '<p class="njsv-disclose"><b>เปิดเผยให้ทราบ:</b> ' + esc(disclosure || '') + '</p>' +
    '</div>';
  }

  // ---------- ผูกฟอร์มเข้ากับ API ----------
  function mount(host, opt) {
    if (!host) return null;
    opt = opt || {};
    host.innerHTML = formHtml(opt);
    // ⚠️ ฟอร์มนี้ถูกวาดหลัง DOMContentLoaded ตัวติดตั้งอัตโนมัติของ njform.js จึงไม่เห็น
    //    ต้องเรียกเองที่นี่ ไม่งั้นช่องเบอร์โทรไม่ถูกจัดรูปขณะพิมพ์
    if (window.NJForm) NJForm.attach(host.querySelector('form'));
    var form = host.querySelector('.njsv-form');
    var msg = host.querySelector('[data-njsv-msg]');
    var btn = host.querySelector('.njsv-submit');
    var sending = false;
    var base = window.NJ_API_BASE || 'https://app.njteedinsure.com';

    function get(k) {
      var el = form.querySelector('[data-njsv="' + k + '"]');
      return el ? String(el.value || '').trim() : '';
    }

    // ทำเนียบพันธมิตร — ผูกกับฟอร์มนี้ · prefs = ตัวเลือกของผู้ซื้อต่อบริการ
    var dir = null, prefs = {}, ppsHost = form.querySelector('[data-njsv-pps]');
    var province = opt.province || '';
    function checkedSvc() {
      return Array.prototype.map.call(form.querySelectorAll('input[type="checkbox"]:checked'), function (c) { return c.value; });
    }
    function renderPps() {
      if (!ppsHost || !dir || dir.off) return;
      var html = checkedSvc().map(function (svc) {
        var list = dirFor(dir, svc);
        if (!list.length) return '';
        if (!prefs[svc]) prefs[svc] = { mode: 'team', partnerId: '' };
        return ppBlock(svc, list, prefs[svc], dir.disclosure, province);
      }).join('');
      ppsHost.innerHTML = html;
      ppsHost.hidden = !html;
    }
    loadDir(base, province, function (d) {
      dir = d;
      if (d.off) return;
      // ป้ายบนบริการของพันธมิตร: บอกจำนวนบริษัทจริง แทนข้อความ "ทีมงานจัดหาบริษัทพันธมิตรให้"
      Array.prototype.forEach.call(form.querySelectorAll('[data-njsv-by]'), function (el) {
        var n = dirFor(d, el.getAttribute('data-njsv-by')).length;
        if (n) el.textContent = 'พันธมิตร ' + n + ' ราย' + (province ? ' ใน' + province : '') + ' · ติ๊กเพื่อดูบริษัท';
      });
      renderPps();
    });
    form.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.type === 'checkbox') { renderPps(); return; }
      var m = t && t.getAttribute && t.getAttribute('data-njsv-mode');
      if (m) {
        prefs[m] = { mode: t.value, partnerId: t.value === 'pick' ? ((prefs[m] || {}).partnerId || (dirFor(dir, m)[0] || {}).partnerId || '') : '' };
        renderPps();
      }
    });
    if (ppsHost) ppsHost.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-njsv-pick]') : null;
      if (!b) return;
      var svc = b.getAttribute('data-njsv-pick');
      prefs[svc] = { mode: 'pick', partnerId: b.getAttribute('data-id') };
      renderPps();
    });
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
        // ⚠️ ของเดิมยัด query string ดิบเข้าช่องนี้ ซึ่งแปลว่าตั๋วที่ติดมากับลิงก์ (?id=..&t=..)
        //    มีโอกาสไปโผล่ในใบลีด · ตอนนี้อ่านจาก attrib.js ที่สรุปเฉพาะชื่อแหล่ง/สื่อ/แคมเปญ
        ref: (window.NJAttrib && NJAttrib.refText()) || (opt.ref || 'services')
      };
      // ที่มาของลีด — ไม่มีข้อมูลส่วนบุคคลอยู่ในนี้ (ดูคำเตือนหัวไฟล์ attrib.js)
      if (window.NJAttrib) body.attrib = NJAttrib.value();
      // บริษัทที่ผู้ซื้อเลือก — ส่งเฉพาะบริการที่ติ๊กอยู่ · รหัสอ้างอิงเซิร์ฟเวอร์เป็นคนออก ไม่ประกอบที่นี่
      if (dir && !dir.off) {
        body.partnerPrefs = {};
        services.forEach(function (s) { if (prefs[s]) body.partnerPrefs[s] = { mode: prefs[s].mode, partnerId: prefs[s].partnerId }; });
      }

      // ตรวจฝั่งนี้ก่อนเพื่อบอกเร็ว — เซิร์ฟเวอร์ตรวจซ้ำอยู่ดี ไม่ได้พึ่งฝั่งนี้เป็นด่านความปลอดภัย
      var errs = window.NJForm ? NJForm.errors(form) : null;
      function bad(sel, text) {
        say('bad', text);
        if (errs) { errs.clear(); errs.set(sel, text); errs.focusFirst(); }
      }
      if (!body.name) { bad('[data-njsv="name"]', 'กรุณากรอกชื่อผู้ติดต่อ'); return; }
      if (body.phone.replace(/\D/g, '').length < 9) { bad('[data-njsv="phone"]', 'กรุณากรอกเบอร์โทรให้ครบ'); return; }
      if (errs) errs.clear();
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
          // รหัสอ้างอิงพันธมิตร — ผู้ซื้อแจ้งรหัสนี้กับบริษัทเพื่อยืนยันว่ามาจากที่ดินชัวร์ (ราคาเท่าติดต่อเอง)
          ((d && d.refs && d.refs.length) ? '<span class="njsv-refs">' + d.refs.map(function (x) {
            return '<span>' + esc(thOf(x.service)) + ': ' + (x.mode === 'pick' ? esc(x.partnerName) : 'ทีมงานเลือกบริษัทให้') +
              ' · รหัสอ้างอิง <b>' + esc(x.ref) + '</b></span>';
          }).join('') + '<small>แจ้งรหัสนี้กับบริษัททุกครั้ง ราคาจะเท่ากับติดต่อบริษัทเอง</small></span>' : '') +
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
        say('bad', (err.message || 'ส่งเรื่องไม่สำเร็จ') + ' — โทรหาเราได้ที่ 02-162-0405 / 084-915-8601 หรือทักไลน์ @716lffzt');
      });
    });
    // หน้ารวมพันธมิตร (partners.html) กดบริษัทจากการ์ดด้านบน แล้วให้ฟอร์มนี้ติ๊กบริการ + เลือกบริษัทให้
    // ⚠️ เลือกได้เฉพาะบริษัทที่ทำเนียบส่งมาจริง — รหัสมั่ว = ไม่ทำอะไร (เซิร์ฟเวอร์ตรวจซ้ำอยู่ดี)
    function pick(svc, partnerId) {
      var box = form.querySelector('input[type="checkbox"][value="' + String(svc).replace(/[^a-z_]/g, '') + '"]');
      if (!box || !dir || dir.off) return false;
      if (!dirFor(dir, svc).some(function (p) { return p.partnerId === partnerId; })) return false;
      box.checked = true;
      prefs[svc] = { mode: 'pick', partnerId: partnerId };
      renderPps();
      return true;
    }
    return { form: form, pick: pick };
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
        ref: el.getAttribute('data-njsv-ref') || '',
        province: el.getAttribute('data-njsv-province') || ''
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
    mount: mount,
    loadDir: loadDir,
    partnerCard: ppCard
  };
})();
