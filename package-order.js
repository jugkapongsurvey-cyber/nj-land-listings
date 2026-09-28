/* ============================================================
   หน้าติดตามใบสั่งงานแพ็กเกจของลูกค้า (รอบ 4) — package-order.html
   เปิดด้วยลิงก์ของตัวเองเท่านั้น: package-order.html?id=SO-xxxxx&t=<ตั๋ว>

   ⚠️⚠️ กติกาที่ห้ามผ่อน
   1. **ปุ่มที่กดได้มาจาก order.moves ที่เซิร์ฟเวอร์ส่งมาเท่านั้น**
      ห้ามพิมพ์ตารางสถานะหรือเงื่อนไขไว้ในไฟล์นี้ (ตัดสินที่ lib/packages/orders.js ที่เดียว)
   2. **ตั๋วผิดกับใบที่ไม่มีจริง เซิร์ฟเวอร์ตอบข้อความเดียวกัน** — หน้านี้แสดงตามที่ได้มา
      ห้ามเดาว่าเป็นกรณีไหน (จะกลายเป็นตัวบอกใบ้ว่าเลขที่ใดมีอยู่จริง)
   3. **ห้ามเก็บตั๋วลง localStorage และห้ามส่งต่อออกนอกหน้า** — อยู่ใน URL ของลูกค้าเท่านั้น
      (หน้านี้ตั้ง referrer policy และ noindex ไว้แล้วใน HTML)
   4. **ไม่คิดเงินเองในหน้านี้** ทุกตัวเลขมาจากเซิร์ฟเวอร์ · ราคาในใบเป็นภาพถ่าย ณ วันที่เปิดใบ
      และเป็นราคาประมาณการ ไม่ใช่ใบเสนอราคา
   5. **เอกสารที่ทีมงานแนบ ลูกค้าเห็นเฉพาะที่ทีมกดแชร์แล้ว** — เซิร์ฟเวอร์กรองให้ตั้งแต่ต้นทาง
   6. **การชำระเงิน (รับชำระแพ็กเกจ)** — ยอดทุกตัว · QR พร้อมเพย์ · เลขบัญชี มาจากเซิร์ฟเวอร์เท่านั้น
      ห้ามบวก/ลบยอดในหน้านี้ · สลิปไม่ใช่เงิน — แนบแล้วยังต้องรอฝ่ายบัญชียืนยัน ห้ามเขียนว่า "ชำระแล้ว" จนกว่า
      เซิร์ฟเวอร์บอก · ปุ่มยืนยันใบเสนอราคาโผล่ตาม order.canAcceptQuote เท่านั้น (ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์)
   ============================================================ */
(function (w, d) {
  'use strict';

  var API = w.NJ_API_BASE || 'https://app.njteedinsure.com';
  var LINE_URL = 'https://line.me/R/ti/p/@716lffzt';
  var TEL = '02-162-0405';
  var ORDER = null, DOCKIND = {}, BUSY = false;
  var QR = null;   // { key, html } — กันยิงขอ QR ซ้ำทุกครั้งที่หน้าวาดใหม่ (ยอดเดิม = QR เดิม)

  // ⚠️ นี่คือ "คำบนปุ่ม" เท่านั้น — ชุดปุ่มที่กดได้ยังมาจาก order.moves ของเซิร์ฟเวอร์เสมอ
  //    ชื่อสถานะ ("ทีมงานกำลังตรวจ") อ่านบนปุ่มแล้วไม่รู้ว่ากดไปจะเกิดอะไร จึงเขียนเป็นคำกริยาของลูกค้า
  //    สถานะที่ไม่มีในตารางนี้ใช้ชื่อสถานะจากเซิร์ฟเวอร์ตามเดิม
  var ACT_TH = {
    under_review: 'แจ้งว่าส่งเอกสารครบแล้ว',
    cancelled: 'ยกเลิกใบสั่งงานนี้'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(id) { return d.getElementById(id); }
  function baht(n) { return '฿' + Number(n || 0).toLocaleString('en-US'); }
  function qs(k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } }
  function thaiDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso || ''))) return '';
    var M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var p = String(iso).slice(0, 10).split('-');
    return Number(p[2]) + ' ' + M[Number(p[1]) - 1] + ' ' + (Number(p[0]) + 543);
  }
  function kb(n) {
    var v = Number(n) || 0;
    return v >= 1048576 ? (Math.round(v / 104857.6) / 10 + ' MB') : (Math.max(1, Math.round(v / 1024)) + ' KB');
  }
  // ⚠️ ค่าที่เซิร์ฟเวอร์ส่งมาอาจมีสองเบอร์ในข้อความเดียว ("084-xxx, 02-xxx") — ลิงก์โทรใช้เบอร์แรกเสมอ
  function telHref(v) { return String(v || TEL).split(/[,/]/)[0].replace(/[^0-9+]/g, ''); }
  function base() { return '/api/public/package-order/' + encodeURIComponent(qs('id')); }
  function tq() { return '?t=' + encodeURIComponent(qs('t')); }

  function warn(text) {
    el('po-root').innerHTML = '<div class="po-warn">' + esc(text) +
      '<br><br>ทักไลน์ <a href="' + LINE_URL + '" target="_blank" rel="noopener" data-contact="line">@716lffzt</a>' +
      ' หรือโทร <a href="tel:021620405" data-contact="tel">' + TEL + '</a> ให้ทีมงานส่งลิงก์ใหม่ให้ได้ครับ</div>';
  }

  /* ---------- ส่วนประกอบของหน้า ---------- */
  function headHtml(o) {
    var pct = o.stepTotal ? Math.round((o.stepIndex + 1) / o.stepTotal * 100) : 0;
    return '<div class="po-head">' +
      '<p class="po-id">ใบสั่งงาน ' + esc(o.id) + (o.customerName ? ' · ' + esc(o.customerName) : '') + '</p>' +
      '<h1 class="po-status">' + esc(o.statusTh) + '</h1>' +
      '<p class="po-hint">' + esc(o.hint || '') + '</p>' +
      '<p class="po-step">ขั้นที่ ' + (o.stepIndex + 1) + ' จาก ' + o.stepTotal + '</p>' +
      '<div class="po-bar"><i style="width:' + pct + '%"></i></div>' +
      (o.moves && o.moves.length ? '<div class="po-acts" style="margin-top:14px">' + o.moves.map(function (m) {
        return '<button type="button" class="po-btn ' + (m.to === 'cancelled' ? 'is-ghost' : 'is-primary') +
          '" data-move="' + esc(m.to) + '" data-need="' + (m.needReason ? '1' : '') + '">' + esc(ACT_TH[m.to] || m.th) + '</button>';
      }).join('') + '</div>' : '') +
      '<p class="po-msg" id="po-move-msg" role="status" aria-live="polite"></p>' +
    '</div>';
  }

  function packagesHtml(o) {
    if (!(o.packages || []).length) return '';
    return '<div class="po-card"><h2>บริการในใบนี้</h2>' +
      '<ul class="po-list">' + o.packages.map(function (p) { return '<li>' + esc(p.name) + '</li>'; }).join('') + '</ul>' +
      (o.estimate && o.estimate.min != null
        ? '<p class="po-note" style="margin-top:10px">ราคาประมาณการ ณ วันที่เปิดใบ <span class="po-est">' +
          baht(o.estimate.min) + (o.estimate.max && o.estimate.max !== o.estimate.min ? ' – ' + baht(o.estimate.max) : '') +
          '</span><br>' + esc(o.estimate.note || '') + '</p>'
        : '<p class="po-note" style="margin-top:10px">ราคาของใบนี้คิดเป็นรายกรณี ทีมงานจะยืนยันในใบเสนอราคา</p>') +
    '</div>';
  }

  function docsHtml(o) {
    if (!(o.docsNeeded || []).length) return '';
    return '<div class="po-card"><h2>เอกสารที่ต้องเตรียม</h2>' +
      '<ul class="po-list is-doc">' + o.docsNeeded.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<p class="po-note">อัปโหลดได้ที่กล่องด้านล่าง หรือส่งทางไลน์ให้ทีมงานก็ได้</p></div>';
  }

  function filesHtml(o) {
    var rows = (o.files || []).map(function (f) {
      return '<div class="po-file"><div>' + esc(f.name || f.id) +
        '<small>' + esc(f.kindTh || '') + ' · ' + kb(f.size) + ' · ' +
        (f.by === 'customer' ? 'คุณส่งเข้ามา' : 'ทีมงานแนบให้') + ' · ' + thaiDate(f.at) + '</small></div>' +
        '<a href="' + API + base() + '/files/' + encodeURIComponent(f.id) + tq() + '" target="_blank" rel="noopener">เปิดไฟล์</a></div>';
    }).join('');
    var kinds = Object.keys(DOCKIND).filter(function (k) { return k !== 'slip'; }).map(function (k) {
      return '<option value="' + esc(k) + '">' + esc(DOCKIND[k]) + '</option>';
    }).join('');
    var closed = o.status === 'closed' || o.status === 'cancelled';
    return '<div class="po-card"><h2>เอกสารในใบนี้</h2>' +
      (rows || '<p class="po-note">ยังไม่มีเอกสารในใบนี้</p>') +
      (closed
        ? '<p class="po-note" style="margin-top:12px">ใบนี้ปิดแล้ว แนบเอกสารเพิ่มไม่ได้ — ทักไลน์หาทีมงานได้เลย</p>'
        : '<form id="po-up" style="margin-top:14px">' +
            '<label class="po-f" for="po-up-kind"><span>ชนิดเอกสาร</span><select id="po-up-kind">' + kinds + '</select></label>' +
            '<label class="po-f" for="po-up-file"><span>เลือกไฟล์ (PDF · JPG · PNG ครั้งละไม่เกิน 5 ไฟล์)</span>' +
            '<input id="po-up-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple></label>' +
            '<button type="submit" class="po-btn is-primary" id="po-up-go">อัปโหลดเอกสาร</button>' +
            '<p class="po-msg" id="po-up-msg" role="status" aria-live="polite"></p>' +
          '</form>') +
    '</div>';
  }

  function appointHtml(o) {
    var a = o.appointment;
    var closed = o.status === 'closed' || o.status === 'cancelled';
    return '<div class="po-card"><h2>นัดหมาย</h2>' +
      (a && a.date
        ? '<p class="po-note" style="margin-top:0"><b style="color:var(--navy);font-size:15px">' + thaiDate(a.date) +
          (a.time ? ' เวลา ' + esc(a.time) : '') + '</b><br>' +
          (a.confirmed ? 'ทีมงานยืนยันนัดนี้แล้ว' : 'ส่งคำขอแล้ว รอทีมงานยืนยัน') +
          (a.note ? '<br>' + esc(a.note) : '') + '</p>'
        : '<p class="po-note" style="margin-top:0">ยังไม่มีนัดหมายในใบนี้</p>') +
      (closed ? '' :
        '<form id="po-ap" style="margin-top:12px">' +
          '<div class="po-row2">' +
            '<label class="po-f" for="po-ap-date"><span>วันที่สะดวก</span><input id="po-ap-date" type="date"></label>' +
            '<label class="po-f" for="po-ap-time"><span>เวลา (ถ้ามี)</span><input id="po-ap-time" type="time"></label>' +
          '</div>' +
          '<label class="po-f" for="po-ap-note"><span>รายละเอียดเพิ่มเติม</span><input id="po-ap-note" maxlength="300" placeholder="เช่น นัดที่หน้าแปลง หรือชื่อผู้ไปพบ"></label>' +
          '<button type="submit" class="po-btn is-gold" id="po-ap-go">ขอนัดวันนี้</button>' +
          '<p class="po-note">ทีมงานจะยืนยันอีกครั้งก่อนถึงวันนัด</p>' +
          '<p class="po-msg" id="po-ap-msg" role="status" aria-live="polite"></p>' +
        '</form>') +
    '</div>';
  }

  function quoteHtml(o) {
    var q = o.quotation;
    if (!q) return '';
    var total = q.grand != null ? q.grand : (q.value != null ? q.value : null);
    return '<div class="po-card"><h2>ใบเสนอราคา</h2>' +
      '<p class="po-note" style="margin-top:0">เลขที่ ' + esc(q.no || q.id) +
      (q.dateISO ? ' · ' + thaiDate(q.dateISO) : '') + '</p>' +
      (total != null ? '<p class="po-est">' + baht(total) + '</p>' : '') +
      (q.whtAmount ? '<p class="po-note">ยอดที่ต้องโอนหลังหัก ณ ที่จ่าย ' + baht(q.netReceive) + '</p>' : '') +
      (q.validUntil && q.state !== 'accepted' ? '<p class="po-note">ยืนราคาถึง ' + thaiDate(q.validUntil) + '</p>' : '') +
      (q.state === 'accepted'
        ? '<p class="po-ok">ยืนยันรับใบเสนอราคาแล้ว' + (q.acceptedAt ? ' เมื่อ ' + thaiDate(q.acceptedAt) : '') + '</p>'
        : o.canAcceptQuote ? acceptFormHtml()
          : '<p class="po-note">ทีมงานจะแจ้งเมื่อใบเสนอราคาพร้อมให้ยืนยัน</p>') +
    '</div>';
  }

  function acceptFormHtml() {
    return '<form id="po-acc" style="margin-top:12px">' +
      '<label class="po-f" for="po-acc-name"><span>ชื่อผู้ยืนยัน</span><input id="po-acc-name" maxlength="200" autocomplete="name"></label>' +
      '<label class="po-f" for="po-acc-note"><span>ข้อความถึงทีมงาน (ถ้ามี)</span><input id="po-acc-note" maxlength="500"></label>' +
      '<label class="po-chk" for="po-acc-pdpa"><input id="po-acc-pdpa" type="checkbox"> ' +
        'ยินยอมให้บันทึกชื่อ เวลา และหมายเลขไอพีไว้เป็นหลักฐานการยืนยันนี้ ' +
        '(<a href="privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a>)</label>' +
      '<button type="submit" class="po-btn is-primary" id="po-acc-go">ยืนยันรับใบเสนอราคา</button>' +
      '<p class="po-note">การกดยืนยันเป็นการบันทึกการตกลงราคาตามใบเสนอราคานี้ ไม่ใช่ลายเซ็นอิเล็กทรอนิกส์ ' +
        'หลังยืนยันแล้วระบบจะออกใบแจ้งหนี้และแสดงยอดที่ต้องชำระด้านล่าง</p>' +
      '<p class="po-msg" id="po-acc-msg" role="status" aria-live="polite"></p>' +
    '</form>';
  }

  function paymentHtml(o) {
    var p = o.payment;
    if (!p) return '';
    var b = p.bank || {};
    var rows = (p.installments || []).map(function (x) {
      return '<li><b>' + esc(x.label) + '</b> ' + baht(x.due) +
        (x.paid ? ' <span class="po-tag is-paid">ชำระแล้ว</span>' : '') + '</li>';
    }).join('');
    var bank = b.bankAcctNo
      ? '<p class="po-note">หรือโอนเข้าบัญชี ' + esc(b.bankName) + ' เลขที่ <b class="po-acct">' + esc(b.bankAcctNo) + '</b><br>' +
        'ชื่อบัญชี ' + esc(b.bankAcctName) + (b.bankBranch ? ' · สาขา ' + esc(b.bankBranch) : '') + '</p>'
      : '';
    var due = p.settled
      ? '<p class="po-ok">ชำระครบแล้ว ขอบคุณครับ</p>'
      : (p.next ? '<p class="po-note" style="margin-top:12px">ยอดที่ต้องชำระตอนนี้ (' + esc(p.next.label) + ')</p>' +
          '<p class="po-est po-due">' + baht(p.next.amount) + '</p>' : '') +
        (b.promptPay ? '<div id="po-qr" class="po-qr"><p class="po-note">กำลังสร้าง QR พร้อมเพย์…</p></div>' : '') +
        bank +
        (p.slip && p.slip.waiting ? '<p class="po-wait">ได้รับสลิปแล้ว รอฝ่ายบัญชีตรวจและยืนยันรับเงิน</p>' : '') +
        '<form id="po-slip" style="margin-top:12px">' +
          '<label class="po-f" for="po-slip-file"><span>แนบสลิปโอนเงิน (PDF · JPG · PNG)</span>' +
          '<input id="po-slip-file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"></label>' +
          '<button type="submit" class="po-btn is-gold" id="po-slip-go">ส่งสลิป</button>' +
          '<p class="po-msg" id="po-slip-msg" role="status" aria-live="polite"></p>' +
        '</form>';
    return '<div class="po-card" id="po-pay"><h2>การชำระเงิน</h2>' +
      '<p class="po-note" style="margin-top:0">ใบแจ้งหนี้เลขที่ ' + esc(p.invoiceNo) + ' · ยอดที่ต้องโอนทั้งหมด ' + baht(p.payable) +
        (p.wht ? ' (หลังหัก ณ ที่จ่าย ' + baht(p.wht) + ')' : '') + '</p>' +
      (rows ? '<ul class="po-list" style="margin-top:10px">' + rows + '</ul>' : '') +
      due +
      '<p class="po-note">' + esc(p.note || '') + '</p>' +
    '</div>';
  }

  // QR ของยอดงวดถัดไป — เซิร์ฟเวอร์คิดยอดและสร้างรูปเอง หน้านี้แค่วางรูป
  function loadQr() {
    var box = el('po-qr');
    var p = ORDER && ORDER.payment;
    if (!box || !p || !p.next) return;
    var key = [p.invoiceNo, p.next.n, p.next.amount].join('|');
    if (QR && QR.key === key) { box.innerHTML = QR.html; return; }
    fetch(API + base() + '/pay-qr' + tq())
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (j) {
        var html = j && j.configured && j.dataUrl
          ? '<img src="' + esc(j.dataUrl) + '" alt="QR พร้อมเพย์ ยอด ' + esc(baht(j.amount)) + '" width="220" height="220">' +
            '<p class="po-note">สแกนจ่ายพร้อมเพย์ ' + esc(j.name || '') + ' · ' + baht(j.amount) + '</p>'
          : '<p class="po-note">' + esc((j && j.reason) || 'ยังสร้าง QR ไม่ได้ — โอนเข้าบัญชีด้านล่างแทนได้') + '</p>';
        QR = { key: key, html: html };
        var now = el('po-qr');
        if (now) now.innerHTML = html;
      })
      .catch(function () {
        var now = el('po-qr');
        if (now) now.innerHTML = '<p class="po-note">ติดต่อระบบไม่ได้ — โอนเข้าบัญชีด้านล่างแทนได้</p>';
      });
  }

  function timelineHtml(o) {
    if (!(o.timeline || []).length) return '';
    return '<div class="po-card"><h2>ความคืบหน้า</h2><ul class="po-tl">' +
      o.timeline.slice().reverse().map(function (e) {
        return '<li><b>' + esc(e.toTh || e.to) + '</b><span>' + thaiDate(e.at) + '</span></li>';
      }).join('') + '</ul></div>';
  }

  function contactHtml(o) {
    var c = o.contact || {};
    return '<div class="po-card"><h2>ติดต่อทีมงาน</h2><div class="po-contact">' +
      '<a class="is-line" href="' + esc(c.line || LINE_URL) + '" target="_blank" rel="noopener" data-contact="line">💬 ทักไลน์</a>' +
      '<a href="tel:' + esc(telHref(c.tel || TEL)) + '" data-contact="tel">☏ ' + esc(c.tel || TEL) + '</a>' +
      '</div><p class="po-note">แจ้งเลขที่ใบสั่งงาน ' + esc(o.id) + ' กับทีมงานได้เลย</p></div>';
  }

  function render() {
    var o = ORDER;
    // รอลูกค้าทำอะไรอยู่ (ยืนยันใบเสนอราคา / ชำระเงิน) = ยกการ์ดสองใบนี้ขึ้นบนสุด ไม่งั้นบนมือถือต้องเลื่อนผ่านทุกการ์ดก่อน
    // ⚠️ ตัดสินจากช่องที่เซิร์ฟเวอร์ส่งมาเท่านั้น (canAcceptQuote · payment.settled) ไม่คิดสถานะเอง
    var urgent = !!(o.canAcceptQuote || (o.payment && !o.payment.settled && o.status === 'payment_pending'));
    var money = quoteHtml(o) + paymentHtml(o);
    el('po-root').innerHTML = headHtml(o) +
      '<div class="po-grid"><div>' +
        (urgent ? money : '') + packagesHtml(o) + docsHtml(o) + filesHtml(o) +
      '</div><div>' +
        (urgent ? '' : money) + appointHtml(o) + timelineHtml(o) + contactHtml(o) +
      '</div></div>' +
      '<div class="po-disc">' + esc(o.disclaimer || '') + '</div>';
    loadQr();
  }

  /* ---------- เรียก API ---------- */
  function load() {
    if (!qs('id') || !qs('t')) {
      warn('ลิงก์นี้ไม่ครบ — เปิดจากลิงก์ที่ทีมงานส่งให้ทั้งบรรทัด');
      return;
    }
    fetch(API + base() + tq(), { headers: { 'Content-Type': 'application/json' } })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
      })
      .then(function (res) {
        if (!res.ok) { warn((res.j && res.j.error) || 'เปิดใบสั่งงานนี้ไม่ได้'); return; }
        ORDER = res.j.order;
        DOCKIND = res.j.docKindTh || {};
        render();
      })
      .catch(function () { warn('ติดต่อระบบไม่ได้ในตอนนี้'); });
  }

  // okId = ที่วางข้อความสำเร็จ เมื่อฟอร์มเดิมหายไปหลังวาดใหม่ (เช่นฟอร์มยืนยันใบเสนอราคา)
  function post(path, body, msgId, okText, okId) {
    var msg = el(msgId);
    if (BUSY) return;
    BUSY = true;
    if (msg) { msg.className = 'po-msg'; msg.textContent = 'กำลังส่ง…'; }
    var opt = { method: 'POST' };
    if (body instanceof FormData) opt.body = body;
    else { opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(body || {}); }
    fetch(API + base() + path + tq(), opt)
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
      })
      .then(function (res) {
        BUSY = false;
        if (!res.ok) {
          var m = el(msgId);
          if (m) { m.className = 'po-msg is-err'; m.textContent = (res.j && res.j.error) || 'ทำรายการไม่สำเร็จ'; }
          return;
        }
        ORDER = res.j.order;
        render();
        var after = el(okId || msgId);
        if (after) { after.className = 'po-msg is-ok'; after.textContent = okText; }
      })
      .catch(function () {
        BUSY = false;
        var m2 = el(msgId);
        if (m2) { m2.className = 'po-msg is-err'; m2.textContent = 'ติดต่อระบบไม่ได้ — ทักไลน์หาทีมงานได้เลย'; }
      });
  }

  d.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-move]');
    if (!t) return;
    var to = t.dataset.move;
    var reason = '';
    if (t.dataset.need) {
      reason = w.prompt('กรุณาระบุเหตุผลสั้นๆ ให้ทีมงานทราบ');
      if (reason === null) return;
      if (!String(reason).trim()) {
        var m = el('po-move-msg');
        if (m) { m.className = 'po-msg is-err'; m.textContent = 'ขั้นตอนนี้ต้องระบุเหตุผล'; }
        return;
      }
    }
    post('/status', { to: to, reason: reason }, 'po-move-msg', 'อัปเดตเรียบร้อย ทีมงานได้รับแจ้งแล้ว');
  });

  d.addEventListener('submit', function (ev) {
    if (ev.target && ev.target.id === 'po-up') {
      ev.preventDefault();
      var input = el('po-up-file');
      if (!input || !input.files || !input.files.length) {
        var mu = el('po-up-msg');
        if (mu) { mu.className = 'po-msg is-err'; mu.textContent = 'กรุณาเลือกไฟล์ก่อน'; }
        return;
      }
      var fd = new FormData();
      fd.append('kind', el('po-up-kind').value);
      for (var i = 0; i < input.files.length && i < 5; i++) fd.append('files', input.files[i]);
      post('/files', fd, 'po-up-msg', 'อัปโหลดเรียบร้อย ทีมงานได้รับเอกสารแล้ว');
    } else if (ev.target && ev.target.id === 'po-acc') {
      ev.preventDefault();
      var ma = el('po-acc-msg');
      if (!String(el('po-acc-name').value || '').trim()) {
        if (ma) { ma.className = 'po-msg is-err'; ma.textContent = 'กรุณากรอกชื่อผู้ยืนยัน'; }
        return;
      }
      if (!el('po-acc-pdpa').checked) {
        if (ma) { ma.className = 'po-msg is-err'; ma.textContent = 'กรุณาติ๊กยินยอมก่อนกดยืนยัน'; }
        return;
      }
      post('/accept-quote', {
        name: el('po-acc-name').value, note: el('po-acc-note').value, pdpa: true
      }, 'po-acc-msg', 'ยืนยันรับใบเสนอราคาแล้ว — ดูยอดที่ต้องชำระในการ์ด "การชำระเงิน"', 'po-move-msg');
    } else if (ev.target && ev.target.id === 'po-slip') {
      ev.preventDefault();
      var sf = el('po-slip-file');
      if (!sf || !sf.files || !sf.files.length) {
        var ms = el('po-slip-msg');
        if (ms) { ms.className = 'po-msg is-err'; ms.textContent = 'กรุณาเลือกไฟล์สลิปก่อน'; }
        return;
      }
      var fds = new FormData();
      fds.append('kind', 'slip');
      fds.append('files', sf.files[0]);
      post('/files', fds, 'po-slip-msg', 'ส่งสลิปแล้ว รอฝ่ายบัญชีตรวจและยืนยันรับเงิน');
    } else if (ev.target && ev.target.id === 'po-ap') {
      ev.preventDefault();
      post('/appointment', {
        date: el('po-ap-date').value, time: el('po-ap-time').value, note: el('po-ap-note').value
      }, 'po-ap-msg', 'ส่งคำขอนัดแล้ว รอทีมงานยืนยัน');
    }
  });

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', load);
  else load();
})(window, document);
