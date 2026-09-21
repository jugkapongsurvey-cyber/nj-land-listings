/* ตัวอย่างประกาศแบบสดข้างฟอร์มฝากขาย — ตรรกะล้วน ใช้ได้ทั้งเบราว์เซอร์และ Node
 *
 * ปัญหาที่แก้: ฟอร์มฝากขายยาวมาก (ที่ตั้ง · เนื้อที่ · ราคา · รังวัด · ไฟล์แนบ) แต่สิ่งที่
 * เจ้าของที่ดินอยากรู้จริงๆ คือ "ประกาศของฉันจะออกมาหน้าตาแบบไหน" ซึ่งเดิมไม่มีทางเห็นเลย
 * จนกว่าทีมงานจะเอาขึ้นเว็บ · คนที่กรอกไปครึ่งทางแล้วไม่มีอะไรตอบกลับ ก็ปิดหน้าไปเฉยๆ
 *
 * ทำไมแยกไฟล์ (แนวเดียวกับ `landmeta.js` และ `NJLandForm.calc`): ตรรกะว่า
 * "อะไรขึ้นได้ / อะไรยังขาด" คือหัวใจของกติกาข้อ 4 · 5 · 10 ซึ่งต้องทดสอบด้วย node ได้ตรงๆ
 * ไม่ใช่ฝังไว้ในโค้ดที่ต้องมี DOM จริงถึงจะเรียกได้
 *
 * ⚠️⚠️ กติกาที่ห้ามผ่อนของกล่องนี้
 *
 *  1. **ทุกบรรทัดมาจากสิ่งที่เจ้าของพิมพ์เองเท่านั้น** (กติกาข้อ 5) ช่องไหนยังไม่กรอก
 *     = ไม่ขึ้นบรรทัดนั้น แล้วไปโผล่ในรายการ "ยังเติมอะไรได้อีก" แทน
 *     ห้ามเติมข้อความแทน เช่น "มีทางเข้าออก" "ที่ดินเปล่า" หรือราคาที่เดาให้
 *
 *  2. ⛔ **ห้ามขึ้นป้าย "✓ รังวัดยืนยันแล้ว" เด็ดขาด** (กติกาข้อ 10) ไม่ว่าเจ้าของจะเลือก
 *     "ต้องการให้รังวัด" ไว้แล้วก็ตาม · ป้ายเขียวเป็นข้อเท็จจริงหลังช่างลงสนามจริง
 *     ไม่ใช่ความตั้งใจ · ตัวอย่างขึ้นป้ายเหลือง "◐ ข้อมูลเบื้องต้น" เสมอ แล้วอธิบาย
 *     เป็นประโยคว่าป้ายจะเปลี่ยนเมื่องานรังวัดเสร็จจริง
 *
 *  3. **ต้องเขียนชัดว่ายังไม่เผยแพร่** — ประกาศขึ้นเว็บได้ต่อเมื่อได้หนังสือยินยอม
 *     ที่เจ้าของลงนามกลับมาแล้ว (เงื่อนไขนี้ล็อกอยู่ที่ `server.js` และเขียนไว้ใน
 *     คำถามที่พบบ่อยท้ายหน้าอยู่แล้ว) · `DRAFT_NOTE` ห้ามถอด
 *
 *  4. **ยังไม่กรอกอะไรเลย = ไม่แสดงกล่องนี้เลย ห้ามวาดการ์ดเปล่า**
 *     (กติกาข้อแรกของ Phase 1 — การ์ดเปล่าอ่านแล้วเหมือนประกาศที่ไม่มีอะไรเลย
 *     ทั้งที่ความจริงคือเจ้าของยังไม่ได้เริ่มกรอก)
 *
 *  5. **ประกาศขึ้นเว็บแล้ว = ไม่แสดงตัวอย่าง** — กล่องรายงาน `#cs-report` มีของจริง
 *     พร้อมลิงก์ไปหน้าประกาศอยู่แล้ว · ยื่นตัวอย่างซ้อนของจริงคือชวนให้สับสนว่าอันไหนจริง
 *
 *  6. **รายการที่ยังขาดเป็นคำชวน ไม่ใช่ช่องบังคับ** — กติกาลีดขั้นต่ำมีแค่ ชื่อ · เบอร์ ·
 *     ยินยอม (อยู่ใน `njform.js` ที่เดียว) ห้ามเอารายการนี้ไปบล็อกปุ่มบันทึกเด็ดขาด
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NJConsignPreview = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ⚠️ เขียนราคาแบบเดียวกับ `NJListing.money` ในการ์ดประกาศจริง — ตัวอย่างกับของจริง
  //    ต้องเขียนเลขเหมือนกัน ไม่งั้นเจ้าของจำตัวเลขผิดรูปไปคุยกับผู้ซื้อ
  //    (เรียกข้ามไฟล์ไม่ได้ เพราะไฟล์นี้ต้อง require เข้า node ได้โดยไม่มี DOM —
  //     `consignpreview.test.js` จึงเทียบผลของสองตัวนี้ให้ทุกครั้งที่รัน)
  function money(v) {
    if (!Number(v)) return 'ราคาติดต่อสอบถาม';
    return '฿' + Number(v).toLocaleString('th-TH');
  }
  function num(v) { return Number(v || 0).toLocaleString('th-TH'); }

  // ---------- ข้อความที่ห้ามถอด ----------
  var DRAFT_NOTE = 'นี่เป็นตัวอย่างบนเครื่องของคุณเท่านั้น ยังไม่ได้เผยแพร่ที่ไหนทั้งสิ้น — ' +
    'ประกาศจะขึ้นเว็บได้ต่อเมื่อท่านลงนามหนังสือยินยอมเผยแพร่ข้อมูลกลับมาแล้ว ' +
    'และทีมงานตรวจข้อมูลกับรูปทุกใบก่อนเสมอ';
  var BADGE_BASIC = '◐ ข้อมูลเบื้องต้น';
  // ⚠️ ทุกข้อความในกลุ่มนี้พูดถึง "สิ่งที่จะเกิด" ไม่ใช่ "สิ่งที่เป็นแล้ว" — ดูกติกาข้อ 2 หัวไฟล์
  var SURVEY_LINE = {
    yes: 'คุณเลือกให้รังวัดยืนยันเขตก่อนประกาศไว้แล้ว — ป้ายนี้จะเปลี่ยนเป็น ' +
         '“✓ รังวัดยืนยันแล้ว” หลังช่างลงสนามและงานรังวัดเสร็จจริง ยังไม่ใช่ตอนนี้',
    no: 'คุณเลือกประกาศเป็นข้อมูลเบื้องต้นไปก่อน — เปลี่ยนใจให้รังวัดทีหลังได้ตลอด',
    undecided: 'ยังไม่ได้ตัดสินใจเรื่องรังวัด — ทีมช่างรังวัดจะดูข้อมูลแปลงแล้วโทรบอกว่าแปลงนี้ควรรังวัดไหม'
  };
  var PHOTO_PENDING = 'รอทีมงานตรวจ';
  var TODO_LEAD = 'ยิ่งกรอกครบ ประกาศยิ่งได้ผล — ข้ามข้อไหนไว้ก่อนก็ได้ ไม่ได้บังคับ ' +
    'ทีมงานช่วยเติมให้ตอนโทรกลับ';
  var READY_TEXT = 'ข้อมูลหลักครบแล้ว — กดบันทึกแล้วส่งให้ทีมงานตรวจได้เลย';

  // ---------- ประเภทที่ต้องการ ----------
  // ⚠️ "ยังไม่แน่ใจ" (survey_first) ห้ามเดาเป็น "ขาย" — เจ้าของเลือกไว้แบบนั้นจริงๆ
  //    และเป็นข้อมูลที่ทีมขายต้องเห็นตามจริงตอนโทรกลับ
  function typeLabel(t) {
    if (t === 'rent') return 'ให้เช่า';
    if (t === 'sell') return 'ขาย';
    return 'ยังไม่สรุปว่าขายหรือเช่า';
  }

  // ---------- ราคาต่อหน่วยตามที่เจ้าของพิมพ์มาเอง ----------
  // ⚠️ **ไม่หารอะไรทั้งสิ้น** (กติกาข้อ 5) — สะท้อนหน่วยที่เขาเลือกกับตัวเลขที่เขาพิมพ์เท่านั้น
  //    "รวมทั้งแปลง" ไม่ต้องมีบรรทัดนี้ เพราะราคาพาดหัวคือตัวเลขเดียวกันอยู่แล้ว
  function unitText(v) {
    var p = Number((v && v.unitPrice) || 0);
    if (!(p > 0)) return '';
    if (v.priceUnit === 'rai') return '฿' + num(p) + '/ไร่';
    if (v.priceUnit === 'total') return '';
    return '฿' + num(p) + '/ตร.ว.';
  }

  // ---------- ยังเติมอะไรได้อีก ----------
  // เรียงตามลำดับของฟอร์ม ไม่ใช่ตามน้ำหนัก — เจ้าของกวาดตาหาช่องที่พูดถึงได้ทันที
  function missing(v) {
    v = v || {};
    var out = [];
    if (!v.province) {
      out.push({ key: 'province', label: 'ที่ตั้งของที่ดิน',
        why: 'ผู้ซื้อกรองหาตามจังหวัดและอำเภอเป็นอย่างแรก' });
    }
    if (!(Number(v.totalWa) > 0)) {
      out.push({ key: 'area', label: 'เนื้อที่',
        why: 'ไม่มีเนื้อที่ ระบบคำนวณราคารวมและค่ารังวัดให้ไม่ได้' });
    }
    if (!(Number(v.unitPrice) > 0)) {
      out.push({ key: 'price', label: 'ราคาที่ต้องการ',
        why: 'ยังไม่รู้ราคาก็เว้นไว้ได้ — ทีมงานช่วยประเมินให้ฟรี' });
    }
    if (!(Number(v.photos) > 0)) {
      out.push({ key: 'photo', label: 'รูปที่ดิน',
        // ⚠️ ห้ามเขียนจำนวนรูปขั้นต่ำ (กติกาข้อ 5) และห้ามรับปากว่ารูปเยอะแล้วจะขายได้
        why: v.saved
          ? 'แนบได้ที่ช่อง “ส่งรูปที่ดินให้เราดูเลยไหม” ด้านล่าง'
          : 'กดบันทึกข้อมูลก่อน แล้วช่องแนบรูปจะเปิดให้ใต้ฟอร์มนี้' });
    }
    if (!v.note) {
      out.push({ key: 'note', label: 'จุดเด่นของแปลง',
        why: 'เช่น ติดถนนลาดยาง มีไฟฟ้าน้ำประปาถึง อยู่ใกล้อะไร' });
    }
    return out;
  }

  // ---------- มีอะไรให้ดูหรือยัง ----------
  // ⚠️ ชื่อกับเบอร์ไม่นับ — สองช่องนั้นไม่ได้ขึ้นประกาศ และคนที่เพิ่งกรอกชื่อยังไม่มีอะไรให้ดู
  function started(v) {
    v = v || {};
    return !!(v.province || Number(v.totalWa) > 0 || Number(v.unitPrice) > 0 ||
              v.note || Number(v.photos) > 0);
  }

  function model(v) {
    v = v || {};
    // กติกาข้อ 5 หัวไฟล์ — ขึ้นเว็บแล้วมีของจริงให้ดู ไม่ต้องมีตัวอย่าง
    if (v.live) return { show: false, reason: 'live' };
    if (v.cancelled) return { show: false, reason: 'cancelled' };
    if (!started(v)) return { show: false, reason: 'empty' };

    var bits = [];
    if (v.areaText) bits.push(v.areaText);
    var u = unitText(v);
    if (u) bits.push(u);

    var opt = SURVEY_LINE[v.surveyOpt] ? v.surveyOpt : 'undecided';
    return {
      show: true,
      typeLabel: typeLabel(v.type),
      badge: BADGE_BASIC,
      surveyLine: SURVEY_LINE[opt],
      price: money(v.estValue),
      // ยังไม่ได้กรอกที่ตั้งเลย = ไม่มีชื่อแปลงให้แสดง · บอกตรงๆ ว่ายังว่าง ไม่ใช่ตั้งชื่อให้เอง
      title: v.title || '',
      bits: bits,
      blurb: v.note || '',
      photo: v.photo || null,
      todo: missing(v)
    };
  }

  // ---------- วาดการ์ด ----------
  // ⚠️ โครงนี้ "คล้าย" การ์ดจริงเพื่อให้เจ้าของเห็นภาพ แต่ไม่ใช่ `NJListing.card()`
  //    และไม่ได้ใช้คลาส `.land-card` — หน้าฝากขายใช้ `ui.css` ซึ่งไม่มีสไตล์การ์ดเลย
  //    ก๊อปสไตล์การ์ดมาไว้ที่นี่ = ชุดที่สี่ให้ลืมแก้ (ดูคำเตือนเรื่องสไตล์การ์ดใน CLAUDE.md)
  function cardHtml(m) {
    if (!m || !m.show) return '';
    var media = m.photo
      ? '<img src="' + esc(m.photo.url) + '" alt="" loading="lazy">' +
        (m.photo.pending ? '<span class="cs-pv-wait">' + esc(PHOTO_PENDING) + '</span>' : '')
      : '<span class="cs-pv-nophoto">ยังไม่มีรูป</span>';
    return '<div class="cs-pv-media">' + media +
        '<span class="cs-pv-tags">' +
          '<span class="cs-pv-type">' + esc(m.typeLabel) + '</span>' +
          '<span class="cs-pv-tier">' + esc(m.badge) + '</span>' +
        '</span>' +
      '</div>' +
      '<div class="cs-pv-body">' +
        '<div class="cs-pv-price">' + esc(m.price) + '</div>' +
        (m.title
          ? '<div class="cs-pv-title">' + esc(m.title) + '</div>'
          : '<div class="cs-pv-title empty">ยังไม่ได้กรอกที่ตั้ง</div>') +
        (m.bits.length ? '<div class="cs-pv-meta">' + esc(m.bits.join(' · ')) + '</div>' : '') +
        (m.blurb ? '<div class="cs-pv-blurb">' + esc(m.blurb) + '</div>' : '') +
        '<div class="cs-pv-sv">' + esc(m.surveyLine) + '</div>' +
      '</div>';
  }

  function todoHtml(m) {
    if (!m || !m.show) return '';
    if (!m.todo.length) return '<div class="cs-pv-ok">✓ ' + esc(READY_TEXT) + '</div>';
    return '<div class="cs-pv-todo-head">' + esc(TODO_LEAD) + '</div><ul>' +
      m.todo.map(function (t) {
        return '<li><b>' + esc(t.label) + '</b><span>' + esc(t.why) + '</span></li>';
      }).join('') + '</ul>';
  }

  return {
    DRAFT_NOTE: DRAFT_NOTE, BADGE_BASIC: BADGE_BASIC, SURVEY_LINE: SURVEY_LINE,
    TODO_LEAD: TODO_LEAD, READY_TEXT: READY_TEXT, PHOTO_PENDING: PHOTO_PENDING,
    esc: esc, money: money, typeLabel: typeLabel, unitText: unitText,
    started: started, missing: missing, model: model,
    cardHtml: cardHtml, todoHtml: todoHtml
  };
});
