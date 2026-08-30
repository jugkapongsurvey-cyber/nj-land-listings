(function () {
  'use strict';
  // เช็กราคางานรังวัดออนไลน์ บนหน้าเว็บสาธารณะ
  //
  // ⚠️ ตารางราคา "ไม่ได้ก๊อปมาไว้ที่นี่" โดยตั้งใจ
  //    โหลด pricing.js จากเซิร์ฟเวอร์ njsurvey ตรงๆ ซึ่งเป็นไฟล์เดียวกับที่ระบบหลังบ้าน
  //    ใช้ออกใบเสนอราคาจริง (แปลงมาจาก NJ_Group_ใบเสนอราคา_A4_Online_2026.xlsx)
  //    ถ้าก๊อปตารางมาไว้ในเว็บนี้ วันหนึ่งบริษัทขึ้นราคาแล้วลืมแก้ 2 ที่ ลูกค้าจะเห็นราคาเก่า
  //    แล้วทีมขายต้องไปแจ้งราคาใหม่ทีหลัง — เสียความน่าเชื่อถือมากกว่าประโยชน์ที่ได้
  //    โหลดไม่ได้ = ไม่แสดงราคาเลย แล้วให้ทักไลน์แทน ห้าม fallback เป็นตัวเลขที่เดาเอง
  //
  // ⚠️ ราคาที่แสดงเป็น "ประมาณการ" ไม่ใช่ใบเสนอราคา
  //    ราคาจริงขึ้นกับหน้างาน (ระยะทาง สภาพพื้นที่ จำนวนหมุด ฯลฯ) ซึ่งเว็บไม่รู้
  //    จึงต้องเขียนกำกับไว้ทุกครั้ง และให้ทีมขายเป็นคนยืนยัน

  var PRICING_URL = 'https://nj-survey-system.onrender.com/pricing.js';
  var LINE = 'https://line.me/R/ti/p/@716lffzt';

  // ตัวเลือกเสริมที่ "ไม่ได้อยู่ในตารางราคาหลัก" — ส่งเข้า computeQuote ทาง fees
  // เพื่อให้ราคาตั้งต้นยังตรงกับตารางของบริษัทเป๊ะ ไม่ไปปนกัน
  // ⚠️ ไม่มี "รายงานรังวัดที่ดิน" เป็นรายการเสียเงินที่นี่โดยตั้งใจ (เจ้าของยืนยัน 2026-08-30)
  //    ตารางราคาของบริษัทรวม Report ไว้ในราคาตั้งต้นอยู่แล้ว (ดู includedService ที่ pricing.js คืนมา)
  //    ถ้าเอามาคิดเพิ่มอีก 3,000 ลูกค้าจะจ่ายค่ารายงานสองรอบ
  var ADDONS = [
    { key: 'care', label: 'แพ็กเกจดูแลหลังการรังวัด 1 ปี', price: 5000,
      desc: 'ปรึกษาเรื่องหลักเขต ข้อพิพาทแนวเขต และไกล่เกลี่ยกับที่ดินข้างเคียง' }
  ];
  var COMBO_RATE = 0.05;   // รังวัด + ฝากขาย ลด 5%

  var JOBS = [
    { v: 'สอบเขต',      label: 'รังวัดสอบเขต',        hint: 'ยืนยันแนวเขตและเนื้อที่จริง' },
    { v: 'รวม-แบ่งแยก', label: 'แบ่งแยกโฉนด',         hint: 'แยกแปลงออกเป็นหลายโฉนด' },
    { v: 'รวมโฉนด',     label: 'รวมโฉนด',             hint: 'รวมหลายแปลงเป็นโฉนดเดียว' }
  ];

  // ---------------------------------------------------------------------------
  // แปลงเนื้อที่ ไร่-งาน-ตร.ว. เป็นไร่ทศนิยม — คัดลอกสูตรจาก njsurvey ให้ตรงกันเป๊ะ
  //   waFromArea(rai,ngan,wa) = rai*400 + ngan*100 + wa   (public/app.js:19)
  //   quoteRai = totalWa / 400                            (public/app.js:10436)
  //   raiTxt   = toFixed(4) แล้วตัดศูนย์ท้าย               (public/app.js:10437)
  // ตัวเลขไร่ที่ได้คือตัวที่เอาไปเทียบช่วงราคาในตาราง ถ้าคำนวณคนละแบบกับหลังบ้าน
  // ลูกค้าจะเห็นราคาคนละช่วงกับที่ทีมขายออกใบเสนอราคาให้ — ต้องตรงกันเท่านั้น
  var WA_PER_RAI = 400, WA_PER_NGAN = 100;
  function waFromArea(rai, ngan, wa) {
    return (Number(rai) || 0) * WA_PER_RAI + (Number(ngan) || 0) * WA_PER_NGAN + (Number(wa) || 0);
  }
  function raiTxt(n) {
    return Number(n || 0).toFixed(4).replace(/\.?0+$/, '') || '0';
  }

  var P = null;            // NJPricing เมื่อโหลดสำเร็จ
  var root, out, form;

  function baht(n) { return Math.round(Number(n) || 0).toLocaleString('en-US'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function vals() {
    var v = {};
    root.querySelectorAll('[data-sq]').forEach(function (f) {
      var k = f.getAttribute('data-sq');
      // ประเภทงานเป็น radio 3 ตัวที่ใช้ data-sq เดียวกัน — ต้องเอาเฉพาะตัวที่ติ๊ก
      // ถ้าวนเขียนทับไปเรื่อยๆ จะได้ค่าของตัวสุดท้ายเสมอ (เคยพลาดตรงนี้มาแล้ว ราคาผิดประเภททุกครั้ง)
      if (f.type === 'radio') { if (f.checked) v[k] = f.value; return; }
      v[k] = f.type === 'checkbox' ? f.checked : f.value;
    });
    return v;
  }

  // ---------------------------------------------------------------------------
  function compute(v) {
    if (!P) return null;
    var totalWa = waFromArea(v.rai, v.ngan, v.wa);
    var rai = totalWa / WA_PER_RAI;
    var deeds = Math.max(0, Math.floor(Number(v.deeds) || 0));
    // ค่าแปลงแบ่งเพิ่มมีเฉพาะงานแบ่งแยก (pricing.js คิดให้เฉพาะ jobType นี้อยู่แล้ว)
    var splitPlots = v.jobType === 'รวม-แบ่งแยก' ? Math.max(0, Math.floor(Number(v.split) || 0)) : 0;
    if (!(rai > 0)) return null;

    var fees = [];
    ADDONS.forEach(function (a) { if (v[a.key]) fees.push({ label: a.label, amount: a.price }); });

    var args = { jobType: v.jobType, rai: rai, deeds: deeds, splitPlots: splitPlots, vatRate: 0, fees: fees };
    // คิดราคาก่อนส่วนลดคอมโบ เพื่อเอายอดมาคำนวณ 5%
    var pre = P.computeQuote(args);
    var combo = v.combo ? -Math.round(pre.subtotal * COMBO_RATE) : 0;
    var r = P.computeQuote(Object.assign({}, args, { adjust: combo }));
    r.combo = combo;
    r.addons = fees;
    r.totalWa = totalWa;
    return r;
  }

  function resultHtml(r) {
    if (!P) {
      return '<div class="sq-msg">ตอนนี้ยังโหลดตารางราคาไม่ได้ ' +
        '<a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์ให้ทีมงานตีราคาให้ →</a></div>';
    }
    if (!r) return '<div class="sq-msg">กรอกเนื้อที่เป็นไร่ เพื่อดูราคาประมาณการ</div>';

    var rows = r.breakdown.map(function (b) {
      // pricing.js เรียกส่วนลดที่ส่งผ่าน adjust ว่า "ส่วนลดหน้างาน" ซึ่งเป็นคนละเรื่องกับคอมโบ
      // เปลี่ยนชื่อเฉพาะตอนแสดงผล ไม่แตะตัวเลข เพื่อให้ลูกค้าอ่านแล้วรู้ว่าส่วนลดนี้มาจากอะไร
      var label = (r.combo && b.amount === r.combo && /ส่วนลด/.test(b.label))
        ? 'ส่วนลดรังวัด + ฝากขาย 5%' : b.label;
      return '<div class="sq-row"><span>' + esc(label) + '</span><em>' +
        (b.amount < 0 ? '−' : '') + baht(Math.abs(b.amount)) + '</em></div>';
    }).join('');

    return rows +
      '<div class="sq-row sq-total"><span>ราคาประมาณการ</span><em>' + baht(r.subtotal) + '</em></div>' +
      '<div class="sq-inc">ราคานี้รวม <b>' + esc(r.includedService) + '</b> · ช่วงพื้นที่ ' + esc(r.rangeLabel) +
        (/Service/.test(r.includedService)
          ? '<br><i>งานขนาดนี้มีบริการดูแลหลังรังวัด 1 ปีรวมอยู่แล้ว ไม่ต้องซื้อเพิ่ม</i>' : '') + '</div>' +
      '<p class="sq-note"><b>เป็นราคาประมาณการ ไม่ใช่ใบเสนอราคา</b> — ราคาจริงขึ้นกับหน้างาน ' +
      'เช่น ระยะทาง สภาพพื้นที่ จำนวนหมุด และคิวสำนักงานที่ดิน ซึ่งต้องให้ทีมช่างรังวัดประเมินก่อน ' +
      'ยังไม่รวม VAT และค่าธรรมเนียมที่ต้องจ่ายให้สำนักงานที่ดิน</p>';
  }

  // ---------------------------------------------------------------------------
  function render() {
    var v = vals();
    var r = compute(v);
    out.innerHTML = resultHtml(r);

    // ยอดรวมเนื้อที่ แสดงแบบเดียวกับหน้าใบเสนอราคาในระบบ
    var sum = root.querySelector('[data-sq-sum]');
    if (sum) {
      var wa = waFromArea(v.rai, v.ngan, v.wa);
      sum.innerHTML = wa > 0
        ? 'รวมเนื้อที่ทั้งหมด <b>' + raiTxt(wa / WA_PER_RAI) + ' ไร่</b> ' +
          '<i>(' + baht(wa) + ' ตร.ว. · ใช้เทียบช่วงราคาในตาราง)</i>'
        : '';
    }

    // ค่าแปลงแบ่งเพิ่มมีเฉพาะงานแบ่งแยก จึงโชว์ช่องเฉพาะตอนนั้น
    var sw = root.querySelector('[data-sq-splitwrap]');
    if (sw) sw.hidden = v.jobType !== 'รวม-แบ่งแยก';
  }

  function markup() {
    var jobs = JOBS.map(function (j, i) {
      return '<label class="sq-job"><input type="radio" name="sqjob" data-sq="jobType" value="' + esc(j.v) + '"' +
        (i === 0 ? ' checked' : '') + '><span><b>' + esc(j.label) + '</b><i>' + esc(j.hint) + '</i></span></label>';
    }).join('');
    var addons = ADDONS.map(function (a) {
      return '<label class="sq-add"><input type="checkbox" data-sq="' + a.key + '">' +
        '<span><b>' + esc(a.label) + ' <em>+' + baht(a.price) + '</em></b><i>' + esc(a.desc) + '</i></span></label>';
    }).join('');

    return '' +
      '<div class="sq-head">' +
        '<div><b>เช็กราคางานรังวัดออนไลน์</b>' +
        '<span>ราคาจากตารางเดียวกับที่เราใช้ออกใบเสนอราคาจริง กรอก 3 ช่องก็รู้ราคาทันที</span></div>' +
        '<button type="button" class="sq-close" data-sq-close aria-label="ปิด">✕</button>' +
      '</div>' +

      '<div class="sq-body">' +
        '<div class="sq-left">' +
          '<div class="sq-lbl">ต้องการงานแบบไหน</div>' +
          '<div class="sq-jobs">' + jobs + '</div>' +
          '<div class="sq-lbl">เนื้อที่</div>' +
          '<div class="sq-area">' +
            '<label class="sq-field">ไร่<input type="text" inputmode="numeric" data-sq="rai" placeholder="0"></label>' +
            '<label class="sq-field">งาน<input type="text" inputmode="numeric" data-sq="ngan" placeholder="0"></label>' +
            '<label class="sq-field">ตร.ว.<input type="text" inputmode="decimal" data-sq="wa" placeholder="0"></label>' +
          '</div>' +
          '<div class="sq-sum" data-sq-sum></div>' +
          '<div class="sq-grid">' +
            '<label class="sq-field">จำนวนโฉนด' +
              '<input type="number" min="0" max="50" step="1" data-sq="deeds" value="1"></label>' +
            '<label class="sq-field" data-sq-splitwrap hidden>จำนวนแปลงแบ่งเพิ่ม' +
              '<input type="number" min="0" max="50" step="1" data-sq="split" value="0"></label>' +
          '</div>' +
          '<div class="sq-lbl">เพิ่มเติม (เลือกหรือไม่เลือกก็ได้)</div>' +
          addons +
          '<label class="sq-add sq-combo"><input type="checkbox" data-sq="combo">' +
            '<span><b>รังวัดที่ดิน + ฝากขายที่ดิน <em>ลด 5%</em></b>' +
            '<i>ให้เราดูแลตั้งแต่รังวัดจนขายจบในทีมเดียว</i></span></label>' +
        '</div>' +

        '<div class="sq-right">' +
          '<div class="sq-out" data-sq-out></div>' +
          '<div class="sq-cta">' +
            '<div class="sq-cta-h">ให้ทีมงานตีราคาจริงให้ฟรี</div>' +
            '<p class="sq-cta-p">ส่งข้อมูลไว้ ทีมช่างรังวัดจะติดต่อกลับพร้อมราคาจริงและคิวที่ว่าง</p>' +
            '<div class="sq-grid">' +
              '<label class="sq-field">ชื่อผู้ติดต่อ<input type="text" data-sq="name" placeholder="ชื่อ–นามสกุล"></label>' +
              '<label class="sq-field">เบอร์โทร<input type="tel" inputmode="tel" data-sq="phone" placeholder="08x-xxx-xxxx"></label>' +
            '</div>' +
            '<label class="sq-field">ที่ตั้งแปลง (ถ้าทราบ)' +
              '<input type="text" data-sq="place" placeholder="เช่น ต.หนองแซง อ.หนองแซง จ.สระบุรี"></label>' +
            // honeypot — ซ่อนจากคนจริง บอทที่กรอกทุกช่องจะติดกับ (ฝั่งเซิร์ฟเวอร์เช็กช่องนี้อยู่แล้ว)
            '<input type="text" data-sq="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="sq-hp">' +
            '<button type="button" class="sq-send" data-sq-send>ส่งให้ทีมงานตีราคาให้</button>' +
            '<div class="sq-sent" data-sq-sent hidden></div>' +
            '<div class="sq-or">หรือ <a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์คุยกับช่างรังวัดโดยตรง</a></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ---------------------------------------------------------------------------
  function send(btn) {
    var v = vals();
    var sent = root.querySelector('[data-sq-sent]');
    var name = String(v.name || '').trim();
    var phone = String(v.phone || '').trim();

    if (!name || phone.replace(/\D/g, '').length < 9) {
      sent.hidden = false;
      sent.className = 'sq-sent bad';
      sent.textContent = 'กรุณากรอกชื่อและเบอร์โทรให้ครบก่อนส่ง';
      return;
    }

    var r = compute(v);
    // สรุปสิ่งที่ลูกค้าเลือก ส่งไปเป็นบันทึกให้ทีมขายเห็นครบโดยไม่ต้องถามซ้ำ
    var lines = ['ลีดจากเครื่องเช็กราคารังวัดออนไลน์'];
    lines.push('ประเภทงาน: ' + (v.jobType || 'สอบเขต'));
    var waSum = waFromArea(v.rai, v.ngan, v.wa);
    if (waSum > 0) {
      lines.push('เนื้อที่ที่ลูกค้าแจ้ง: ' + (Number(v.rai) || 0) + '-' + (Number(v.ngan) || 0) + '-' +
                 (Number(v.wa) || 0) + ' ไร่ (' + raiTxt(waSum / WA_PER_RAI) + ' ไร่ · ' + baht(waSum) + ' ตร.ว.)');
    }
    lines.push('จำนวนโฉนด: ' + (Number(v.deeds) || 0));
    if (v.jobType === 'รวม-แบ่งแยก' && Number(v.split) > 0) {
      lines.push('จำนวนแปลงแบ่งเพิ่ม: ' + Number(v.split) + ' แปลง');
    }
    ADDONS.forEach(function (a) { if (v[a.key]) lines.push('เลือกเพิ่ม: ' + a.label + ' (+' + baht(a.price) + ')'); });
    if (v.combo) lines.push('เลือก: รังวัด + ฝากขาย (ลด 5%)');
    if (r) lines.push('ราคาประมาณการที่เว็บแสดง: ' + baht(r.subtotal) + ' บาท (ยังไม่รวม VAT · ไม่ใช่ใบเสนอราคา)');
    if (!r) lines.push('(ลูกค้ายังไม่ได้กรอกเนื้อที่ ราคายังคำนวณไม่ได้)');

    btn.disabled = true;
    btn.textContent = 'กำลังส่ง…';
    sent.hidden = true;

    var base = window.NJ_API_BASE || 'https://nj-survey-system.onrender.com';
    fetch(base + '/api/public/consign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        phone: phone,
        // survey_first = ลีดที่เริ่มจากงานรังวัด (ค่าที่ระบบหลังบ้านรับอยู่แล้ว)
        type: 'survey_first',
        parcelInfo: String(v.place || '').trim(),
        rai: waFromArea(v.rai, v.ngan, v.wa) / WA_PER_RAI,
        note: lines.join('\n'),
        ref: 'survey-quote',
        website: String(v.website || '')
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error();
        return res.json().catch(function () { return {}; });
      })
      .then(function () {
        sent.hidden = false;
        sent.className = 'sq-sent ok';
        sent.textContent = 'ส่งเรียบร้อย ทีมงานจะติดต่อกลับภายใน 1 วันทำการ';
        btn.textContent = 'ส่งแล้ว';
        if (window.njTrack) window.njTrack('Lead', { content_name: 'survey_quote' });
        if (window.njTrackInternal) window.njTrackInternal('consign_submit');
      })
      .catch(function () {
        // ส่งไม่ผ่าน = ต้องไม่ทำให้ลูกค้าหลุดมือ ให้ช่องทางอื่นทันที
        sent.hidden = false;
        sent.className = 'sq-sent bad';
        sent.innerHTML = 'ส่งไม่สำเร็จ กรุณาลองใหม่ หรือ ' +
          '<a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์หาเราได้เลย</a> ' +
          '· โทร <a href="tel:021620405" data-contact="tel">02-162-0405</a>';
        btn.disabled = false;
        btn.textContent = 'ส่งให้ทีมงานตีราคาให้';
      });
  }

  // ---------------------------------------------------------------------------
  function open() {
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    render();
    var f = root.querySelector('[data-sq="rai"]');
    if (f) f.focus({ preventScroll: true });
    root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function close() {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
  }

  function boot() {
    root = document.getElementById('survey-quote');
    if (!root) return;
    root.className = 'sq';
    root.hidden = true;
    root.innerHTML = markup();
    out = root.querySelector('[data-sq-out]');

    root.addEventListener('input', render);
    root.addEventListener('change', render);
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-sq-close]')) close();
      var btn = e.target.closest('[data-sq-send]');
      if (btn) send(btn);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) close(); });

    document.querySelectorAll('[data-sq-open]').forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); open(); });
    });

    // โหลดตารางราคาจากระบบหลังบ้าน — ล้มเหลวก็ยังเปิดกล่องได้ แค่ไม่มีราคาให้ดู
    var s = document.createElement('script');
    s.src = PRICING_URL;
    s.async = true;
    s.onload = function () { P = window.NJPricing || null; render(); };
    s.onerror = function () { P = null; render(); };
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ---------------------------------------------------------------------------
   วิดีโอระบบ njsurvey บน hero
   กติกาข้อ 7 ของโปรเจกต์บังคับให้เคารพ prefers-reduced-motion — วิดีโอเล่นวนอัตโนมัติ
   เป็นภาพเคลื่อนไหวที่ผู้ใช้กลุ่มนี้ตั้งใจปิด จึงต้องไม่เล่นเอง แต่ยังต้องดูได้ถ้าอยากดู
   จึงใส่ปุ่มควบคุมให้แทน ไม่ใช่ซ่อนวิดีโอทิ้ง
--------------------------------------------------------------------------- */
(function () {
  'use strict';
  function boot() {
    var v = document.querySelector('.nj-vidcard video');
    if (!v) return;
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) { v.controls = true; return; }
    v.play().catch(function () {
      // บางเบราว์เซอร์ยังบล็อก autoplay แม้ปิดเสียง — ให้ปุ่มควบคุมแทน จอจะได้ไม่ค้างเป็นภาพนิ่งเฉยๆ
      v.controls = true;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
