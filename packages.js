/* ============================================================
   แพ็กเกจบริการที่ดินชัวร์ (รอบ 4) — packages.html

   ⚠️⚠️ กติกาที่ห้ามผ่อน
   1. **ห้ามพิมพ์ราคา ชื่อแพ็กเกจ รายการที่ได้รับ หรืออัตราค่านายหน้าไว้ในไฟล์นี้เด็ดขาด**
      ทุกตัวเลขมาจาก /api/public/packages และ /api/public/package-quote ของระบบหลังบ้าน
      (ข้อกำหนดข้อ 4: แก้ราคาได้จากหลังบ้าน ไม่ใช่แก้ที่หน้าเว็บ)
      โหลดไม่สำเร็จ = ไม่แสดงราคาเลย แล้วให้ทักไลน์/โทร **ห้ามใส่ตัวเลขสำรองที่เดาเอง**
      (กติกาเดียวกับ surveyquote.js)
   2. **ห้ามใช้ถ้อยคำรับประกัน** กรรมสิทธิ์ ราคาขาย หรือผลการขาย — ใช้คำว่า
      "ผ่านกระบวนการตรวจสอบตามขอบเขตบริการ" · ข้อความกำกับท้ายหน้ามาจากเซิร์ฟเวอร์เป็นหลัก
   3. **คีย์คำถามของแบบสอบถามมาจากเซิร์ฟเวอร์ทั้งชุด** (data.questions) ห้ามพิมพ์รายการคำถามไว้เอง
      เพิ่ม/ลดคำถามที่ระบบหลังบ้านแล้วหน้านี้ตามทันทีโดยไม่ต้องแก้
   4. **ไม่ติ๊กยินยอม PDPA = ส่งไม่ได้** ปิดที่ปุ่ม และเซิร์ฟเวอร์ปฏิเสธซ้ำอีกชั้น
   5. **กับดักบอทใช้ช่อง hp** (ซ่อนด้วย CSS) — ห้ามเอาออก
   6. ชนิดเหตุการณ์สถิติต้องมีใน NJ_INTERNAL_EVENTS ของ analytics.js และ PUBLIC_EVENT_TYPES
      ของ server.js ทั้งคู่ · การกดไลน์/โทรใช้ line_click/tel_click เดิม **ห้ามสร้างชนิดใหม่**
   ============================================================ */
(function (w, d) {
  'use strict';

  var API = w.NJ_API_BASE || 'https://app.njteedinsure.com';
  var LINE_URL = 'https://line.me/R/ti/p/@716lffzt';
  var TEL = '02-162-0405';

  var S = {
    data: null,
    group: '',
    cmp: [],
    opened: {},            // แพ็กเกจที่ผู้ใช้กางรายละเอียดแล้ว (นับ package_view ครั้งเดียวต่อแพ็กเกจ)
    calcKey: '',
    calcOut: null,
    quiz: { step: 0, ans: {}, started: false, rec: null },
    lead: { keys: [], fromQuiz: false }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function baht(n) { return '฿' + Number(n || 0).toLocaleString('en-US'); }
  // ⚠️ แพ็กเกจที่เริ่มต้นฟรี (priceFrom = 0) ต้องอ่านว่า "ฟรี" ไม่ใช่ ฿0 ซึ่งอ่านแล้วเหมือนระบบยังไม่ได้ราคา
  function money(n) { return Number(n) === 0 ? 'ฟรี' : baht(n); }
  function el(id) { return d.getElementById(id); }
  function track(type) { try { if (typeof w.njTrackInternal === 'function') w.njTrackInternal(type); } catch (e) {} }
  function pkgOf(key) {
    var list = (S.data && S.data.packages) || [];
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }
  function scrollTo(id) {
    var node = el(id);
    if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- ราคาบนการ์ด (ข้อความล้วน ไม่คำนวณเอง) ---------- */
  function priceHtml(p) {
    var unit = p.priceUnit === 'job' ? '' : ' ' + esc(p.priceUnitTh || '');
    if (p.priceMode === 'quote' || p.priceFrom == null) {
      return '<b>ขอใบเสนอราคา</b><span class="pk-unit">ราคาขึ้นกับทรัพย์แต่ละแปลง</span>';
    }
    if (p.priceMode === 'from') return '<b>เริ่มต้น ' + money(p.priceFrom) + '</b><span class="pk-unit">' + unit + '</span>';
    if (p.priceTo != null && p.priceTo !== p.priceFrom) {
      return '<b>' + money(p.priceFrom) + ' – ' + money(p.priceTo) + '</b><span class="pk-unit">' + unit + '</span>';
    }
    return '<b>' + money(p.priceFrom) + '</b><span class="pk-unit">' + unit + '</span>';
  }

  function listHtml(items, cls) {
    if (!items || !items.length) return '<p class="pk-empty">— ไม่ได้ระบุ —</p>';
    return '<ul class="pk-list' + (cls ? ' ' + cls : '') + '">' +
      items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
  }

  function cardHtml(p) {
    var inCmp = S.cmp.indexOf(p.key) >= 0;
    var shown = (p.included || []).slice(0, 4);
    var rest = (p.included || []).slice(4);
    return '<article class="pk-card' + (p.recommended ? ' is-rec' : '') + '">' +
      (p.recommended ? '<div class="pk-rib">แนะนำ</div>' : '') +
      '<div><h3 class="pk-name">' + esc(p.name) + '</h3>' +
        (p.subtitle ? '<p class="pk-sub">' + esc(p.subtitle) + '</p>' : '') + '</div>' +
      ((p.audiences || []).length
        ? '<ul class="pk-aud">' + p.audiences.map(function (a) { return '<li>' + esc(a.th) + '</li>'; }).join('') + '</ul>'
        : '') +
      '<div class="pk-price">' + priceHtml(p) +
        (p.priceWithSurveyFrom != null
          ? '<span class="pk-withsurvey">รวมงานรังวัด เริ่มต้น ' + baht(p.priceWithSurveyFrom) +
            ' — ค่ารังวัดคิดตามตารางราคาจริงของแปลง กดคำนวณเพื่อดูของแปลงคุณ</span>'
          : '') +
        '<span class="pk-note">' + esc(p.priceNote || '') + '</span></div>' +
      '<div><p class="pk-sec">สิ่งที่ได้รับ</p>' + listHtml(shown) + '</div>' +
      (p.durationText ? '<p class="pk-dur">⏱ ' + esc(p.durationText) + '</p>' : '') +
      '<details class="pk-more" data-detail="' + esc(p.key) + '">' +
        '<summary>เอกสารที่ต้องเตรียม และสิ่งที่ไม่รวมในแพ็กเกจนี้</summary>' +
        '<div class="pk-more-body">' +
          (rest.length ? '<div><p class="pk-sec">สิ่งที่ได้รับ (ต่อ)</p>' + listHtml(rest) + '</div>' : '') +
          '<div><p class="pk-sec">เอกสารที่ต้องเตรียม</p>' + listHtml(p.docs, 'is-doc') + '</div>' +
          '<div><p class="pk-sec">ไม่รวมในแพ็กเกจนี้</p>' + listHtml(p.excluded, 'is-no') + '</div>' +
        '</div>' +
      '</details>' +
      '<div class="pk-acts">' +
        '<button type="button" class="pk-btn is-primary" data-calc="' + esc(p.key) + '">คำนวณราคาแปลงของคุณ</button>' +
        '<button type="button" class="pk-btn is-gold" data-lead="' + esc(p.key) + '">ให้เจ้าหน้าที่ติดต่อกลับ</button>' +
        '<button type="button" class="pk-chip" data-cmp="' + esc(p.key) + '" aria-pressed="' + (inCmp ? 'true' : 'false') + '">เทียบ</button>' +
      '</div>' +
    '</article>';
  }

  function drawCatalog() {
    var groups = (S.data.config && S.data.config.groups) || [];
    var tabs = groups.map(function (g) {
      var n = S.data.packages.filter(function (p) { return p.group === g.key; }).length;
      return '<button type="button" role="tab" class="pk-tab" data-group="' + esc(g.key) + '"' +
        ' aria-selected="' + (g.key === S.group ? 'true' : 'false') + '">' +
        esc(g.th) + ' (' + n + ')</button>';
    }).join('');
    var cards = S.data.packages
      .filter(function (p) { return p.group === S.group; })
      .map(cardHtml).join('');
    el('pk-root').innerHTML =
      '<div class="pk-tabs" role="tablist" aria-label="กลุ่มแพ็กเกจ">' + tabs + '</div>' +
      '<div class="pk-grid">' + (cards || '<p class="pk-empty">ยังไม่มีแพ็กเกจในกลุ่มนี้</p>') + '</div>';
  }

  /* ---------- ตารางเปรียบเทียบ ---------- */
  function drawCompare() {
    var box = el('pk-compare');
    var block = el('pk-compare-block');
    if (!S.cmp.length) { block.hidden = true; box.innerHTML = ''; return; }
    block.hidden = false;
    var ps = S.cmp.map(pkgOf).filter(Boolean);
    function row(label, fn) {
      return '<tr><td class="pk-k">' + esc(label) + '</td>' +
        ps.map(function (p) { return '<td>' + fn(p) + '</td>'; }).join('') + '</tr>';
    }
    box.innerHTML = '<div class="pk-table-wrap"><table class="pk-table"><thead><tr><th></th>' +
      ps.map(function (p) { return '<th class="pk-th-name">' + esc(p.name) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      row('กลุ่มลูกค้า', function (p) { return (p.audiences || []).map(function (a) { return esc(a.th); }).join(' · ') || '—'; }) +
      row('ราคา', function (p) {
        return priceHtml(p).replace(/<\/?b>/g, '').replace(/<span class="pk-unit">/g, '<span>') +
          (p.priceWithSurveyFrom != null ? '<br>รวมรังวัดเริ่มต้น ' + baht(p.priceWithSurveyFrom) : '');
      }) +
      row('ระยะเวลา', function (p) { return esc(p.durationText || '—'); }) +
      row('สิ่งที่ได้รับ', function (p) { return listHtml(p.included); }) +
      row('ไม่รวมในแพ็กเกจ', function (p) { return listHtml(p.excluded, 'is-no'); }) +
      row('เอกสารที่ต้องเตรียม', function (p) { return listHtml(p.docs, 'is-doc'); }) +
      '</tbody></table></div>';
  }

  /* ---------- เครื่องคำนวณราคา ---------- */
  function calcFormHtml() {
    var cfg = S.data.config || {};
    var p = pkgOf(S.calcKey);
    var opts = S.data.packages.map(function (x) {
      return '<option value="' + esc(x.key) + '"' + (x.key === S.calcKey ? ' selected' : '') + '>' + esc(x.name) + '</option>';
    }).join('');
    function sel(name, list, id) {
      return '<label class="pk-f" for="' + id + '"><span>' + (name) + '</span><select id="' + id + '">' +
        list.map(function (o) { return '<option value="' + esc(o.key) + '">' + esc(o.th) + '</option>'; }).join('') +
        '</select></label>';
    }
    return '<form id="pk-calc-form" novalidate>' +
      '<label class="pk-f" for="pk-c-pkg"><span>แพ็กเกจ</span><select id="pk-c-pkg">' + opts + '</select></label>' +
      '<div class="pk-grid2">' +
        '<label class="pk-f" for="pk-c-deeds"><span>จำนวนโฉนด</span><input id="pk-c-deeds" type="number" min="0" max="999" inputmode="numeric" placeholder="เช่น 1"></label>' +
        '<label class="pk-f" for="pk-c-rai"><span>ขนาดพื้นที่ (ไร่)</span><input id="pk-c-rai" type="number" min="0" step="0.01" inputmode="decimal" placeholder="เช่น 2"></label>' +
      '</div>' +
      '<label class="pk-f" for="pk-c-prov"><span>จังหวัดของทรัพย์</span><input id="pk-c-prov" maxlength="80" placeholder="เช่น ชลบุรี"><small>ใช้คิดค่าดำเนินการนอกพื้นที่ตามตารางโซนเดินทางจริง</small></label>' +
      '<div class="pk-grid2">' +
        sel('ความเร่งด่วน', cfg.urgency || [], 'pk-c-urgency') +
        sel('ความซับซ้อนของเอกสาร', cfg.docComplexity || [], 'pk-c-doc') +
      '</div>' +
      (p && p.includesSurvey
        ? '<label class="pk-check"><input type="checkbox" id="pk-c-survey" checked><span>รวมงานรังวัดในแพ็กเกจนี้ (คิดตามตารางราคารังวัดจริง)</span></label>'
        : '') +
      '<label class="pk-check"><input type="checkbox" id="pk-c-mk"><span>ต้องการบริการทำการตลาดเพิ่ม</span></label>' +
      '<button type="submit" class="pk-btn is-primary" id="pk-c-go">คำนวณราคาประมาณการ</button>' +
      '<p class="pk-msg" id="pk-c-msg" role="status" aria-live="polite"></p>' +
    '</form>' +
    '<div id="pk-c-out"></div>';
  }

  function drawCalc() {
    el('pk-calc-block').hidden = false;
    el('pk-calc').innerHTML = calcFormHtml();
    if (S.calcOut) drawQuote(S.calcOut);
  }

  function drawQuote(q) {
    var out = el('pk-c-out');
    if (!out) return;
    if (q.needsQuote || q.min == null) {
      out.innerHTML = '<div class="pk-quote"><h3>' + esc(q.name) + '</h3>' +
        '<p>แพ็กเกจนี้คิดราคาเป็นรายกรณี — ทีมงานขอดูเอกสารและรายละเอียดทรัพย์ก่อนเสนอราคา</p>' +
        (q.notes || []).map(function (n) { return '<p class="pk-empty">' + esc(n) + '</p>'; }).join('') +
        '<button type="button" class="pk-btn is-gold" data-lead="' + esc(q.packageKey) + '">ขอใบเสนอราคาจากเจ้าหน้าที่</button></div>';
      return;
    }
    var lines = (q.lines || []).map(function (l) {
      return '<li><span>' + esc(l.label) + '</span><span>' + baht(l.amount) + '</span></li>';
    }).join('');
    var range = (q.max != null && q.max !== q.min) ? (baht(q.min) + ' – ' + baht(q.max)) : baht(q.min);
    var grand = (q.minGrand != null)
      ? ((q.maxGrand != null && q.maxGrand !== q.minGrand) ? (baht(q.minGrand) + ' – ' + baht(q.maxGrand)) : baht(q.minGrand))
      : null;
    out.innerHTML = '<div class="pk-quote"><h3>' + esc(q.name) + '</h3>' +
      (lines ? '<ul class="pk-lines">' + lines + '</ul>' : '') +
      '<p>ก่อนภาษีมูลค่าเพิ่ม <b class="pk-total">' + range + '</b></p>' +
      (grand ? '<p>รวมภาษีมูลค่าเพิ่ม' + (q.vatRate != null ? ' ' + q.vatRate + '%' : '') + ' <b class="pk-total">' + grand + '</b></p>' : '') +
      (q.survey ? '<p class="pk-empty">ค่างานรังวัดคิดจากตารางราคาจริง — ค่างาน ' + baht(q.survey.work) +
        (q.survey.travel ? ' · ค่าดำเนินการนอกพื้นที่ ' + baht(q.survey.travel) : '') +
        (q.survey.zoneLabel ? ' (' + esc(q.survey.zoneLabel) + ')' : '') + '</p>' : '') +
      ((q.flags || []).concat(q.notes || []).length
        ? '<ul class="pk-flags">' + (q.flags || []).concat(q.notes || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'
        : '') +
      '<div class="pk-acts" style="margin-top:12px">' +
        '<button type="button" class="pk-btn is-gold" data-lead="' + esc(q.packageKey) + '">ให้เจ้าหน้าที่ยืนยันราคานี้</button>' +
      '</div></div>';
  }

  function runCalc(ev) {
    ev.preventDefault();
    var msg = el('pk-c-msg');
    var survey = el('pk-c-survey');
    var body = {
      packageKey: el('pk-c-pkg').value,
      deeds: el('pk-c-deeds').value,
      rai: el('pk-c-rai').value,
      province: el('pk-c-prov').value,
      urgency: el('pk-c-urgency') ? el('pk-c-urgency').value : '',
      docComplexity: el('pk-c-doc') ? el('pk-c-doc').value : '',
      marketing: el('pk-c-mk').checked,
      includeSurvey: survey ? survey.checked : false
    };
    msg.className = 'pk-msg';
    msg.textContent = 'กำลังคำนวณ…';
    fetch(API + '/api/public/package-quote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok) {
        msg.className = 'pk-msg is-err';
        msg.textContent = (res.j && res.j.error) || 'คำนวณราคาไม่สำเร็จ — ทักไลน์หาทีมงานได้เลย';
        return;
      }
      msg.textContent = '';
      S.calcOut = res.j;
      S.calcKey = res.j.packageKey;
      drawQuote(res.j);
    }).catch(function () {
      msg.className = 'pk-msg is-err';
      msg.textContent = 'ติดต่อระบบไม่ได้ — โทร ' + TEL + ' หรือทักไลน์ให้ทีมงานคิดให้ได้ทันที';
    });
  }

  /* ---------- แบบสอบถาม ---------- */
  function questions() { return (S.data && S.data.questions) || []; }

  function quizHtml() {
    var qs = questions();
    var q = qs[S.quiz.step];
    if (!q) return '';
    var pct = Math.round(S.quiz.step / qs.length * 100);
    var cur = S.quiz.ans[q.key];
    var body;
    if (q.options && q.options.length) {
      body = '<div class="pk-opts">' + q.options.map(function (o) {
        return '<button type="button" class="pk-opt" data-ans="' + esc(o.key) + '" aria-pressed="' + (cur === o.key ? 'true' : 'false') + '">' + esc(o.th) + '</button>';
      }).join('') + '</div>';
    } else {
      var type = q.type === 'number' ? 'number' : 'text';
      body = '<label class="pk-f" for="pk-q-in"><span>' + esc(q.th) + '</span>' +
        '<input id="pk-q-in" type="' + type + '"' + (type === 'number' ? ' min="0" inputmode="numeric"' : '') +
        ' value="' + esc(cur == null ? '' : cur) + '"></label>' +
        '<div class="pk-acts"><button type="button" class="pk-btn is-primary" data-qnext="1">ถัดไป</button>' +
        (q.required ? '' : '<button type="button" class="pk-btn is-ghost" data-qskip="1">ข้ามข้อนี้</button>') + '</div>';
    }
    return '<div class="pk-bar"><i style="width:' + pct + '%"></i></div>' +
      '<p class="pk-steps">คำถามที่ ' + (S.quiz.step + 1) + ' จาก ' + qs.length + (q.required ? ' · ต้องตอบ' : ' · ข้ามได้') + '</p>' +
      '<h3 class="pk-q">' + esc(q.th) + '</h3>' + body +
      '<p class="pk-msg" id="pk-q-msg" role="status" aria-live="polite"></p>' +
      (S.quiz.step > 0 ? '<div class="pk-acts"><button type="button" class="pk-btn is-ghost" data-qback="1">ย้อนกลับ</button></div>' : '');
  }

  function drawQuiz() {
    var box = el('pk-quizbox');
    if (!S.data) { box.innerHTML = '<p class="pk-empty">ยังโหลดคำถามไม่ได้ — ทักไลน์หาทีมงานได้เลย</p>'; return; }
    if (S.quiz.step >= questions().length) { submitQuiz(); return; }
    box.innerHTML = quizHtml();
  }

  function submitQuiz() {
    var box = el('pk-quizbox');
    box.innerHTML = '<p class="pk-empty">กำลังประมวลผลคำตอบ…</p>';
    fetch(API + '/api/public/package-recommend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(S.quiz.ans)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok) {
        box.innerHTML = '<div class="pk-warn">' + esc((res.j && res.j.error) || 'ส่งคำตอบไม่สำเร็จ') + '</div>' +
          '<button type="button" class="pk-btn is-ghost" data-qrestart="1">เริ่มทำแบบสอบถามใหม่</button>';
        S.quiz.step = questions().length - 1;
        return;
      }
      track('package_reco_done');
      S.quiz.rec = res.j;
      S.lead.keys = (res.j.recommended || []).map(function (x) { return x.key; });
      S.lead.fromQuiz = true;
      drawResult(res.j);
    }).catch(function () {
      box.innerHTML = '<div class="pk-warn">ติดต่อระบบไม่ได้ — โทร ' + TEL + ' หรือทักไลน์ให้ทีมงานแนะนำได้ทันที</div>' +
        '<button type="button" class="pk-btn is-ghost" data-qrestart="1">ลองใหม่</button>';
      S.quiz.step = questions().length - 1;
    });
  }

  function priceOf(x) {
    if (x.needsQuote || x.priceMin == null) return 'ขอใบเสนอราคา';
    return (x.priceMax != null && x.priceMax !== x.priceMin) ? (baht(x.priceMin) + ' – ' + baht(x.priceMax)) : baht(x.priceMin);
  }

  function drawResult(r) {
    el('pk-quizbox').innerHTML =
      '<h3 class="pk-q">แพ็กเกจที่เหมาะกับทรัพย์ของคุณ</h3>' +
      '<p class="pk-hint">' + esc(r.note || '') + '</p>' +
      (r.warnings || []).map(function (t) { return '<div class="pk-warn">⚠ ' + esc(t) + '</div>'; }).join('') +
      (r.recommended || []).map(function (x) {
        return '<div class="pk-res"><h3>' + esc(x.name) + '</h3>' +
          '<div class="pk-why">' + esc(x.why || '') + '</div>' +
          '<div class="pk-pr">ประมาณการ ' + priceOf(x) + '</div></div>';
      }).join('') +
      ((r.addons || []).length
        ? '<div><p class="pk-sec">บริการเสริมที่ควรใช้ร่วม</p><ul class="pk-list is-doc">' +
          r.addons.map(function (a) { return '<li><b>' + esc(a.name) + '</b> — ' + esc(a.why || '') + '</li>'; }).join('') + '</ul></div>'
        : '') +
      ((r.nextSteps || []).length
        ? '<div style="margin-top:14px"><p class="pk-sec">ขั้นตอนถัดไป</p>' + listHtml(r.nextSteps) + '</div>'
        : '') +
      leadFormHtml('ส่งข้อมูลให้เจ้าหน้าที่ติดต่อกลับ') +
      '<div class="pk-acts" style="margin-top:10px"><button type="button" class="pk-btn is-ghost" data-qrestart="1">ทำแบบสอบถามใหม่</button></div>';
  }

  /* ---------- ฟอร์มส่งข้อมูลให้เจ้าหน้าที่ ---------- */
  function leadFormHtml(title) {
    var names = S.lead.keys.map(function (k) { var p = pkgOf(k); return p ? p.name : k; });
    return '<form id="pk-lead-form" class="pk-panel" style="margin-top:16px" novalidate>' +
      '<h3 class="pk-q">' + esc(title) + '</h3>' +
      (names.length ? '<p class="pk-hint">แพ็กเกจที่สนใจ: <b>' + esc(names.join(' · ')) + '</b></p>' : '') +
      '<div class="pk-grid2">' +
        '<label class="pk-f" for="pk-l-name"><span>ชื่อผู้ติดต่อ <b style="color:#DC2626">*</b></span><input id="pk-l-name" maxlength="120" autocomplete="name" required></label>' +
        '<label class="pk-f" for="pk-l-phone"><span>เบอร์โทร <b style="color:#DC2626">*</b></span><input id="pk-l-phone" maxlength="40" inputmode="tel" autocomplete="tel" required></label>' +
      '</div>' +
      '<label class="pk-f" for="pk-l-line"><span>ไลน์ไอดี (ถ้ามี)</span><input id="pk-l-line" maxlength="120"></label>' +
      '<label class="pk-f" for="pk-l-note"><span>ข้อความถึงทีมงาน</span><textarea id="pk-l-note" rows="2" maxlength="2000" placeholder="เช่น สะดวกให้ติดต่อช่วงเย็น หรือรายละเอียดทรัพย์เพิ่มเติม"></textarea></label>' +
      '<input type="text" id="pk-l-hp" class="pk-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label class="pk-pdpa" for="pk-l-pdpa"><input type="checkbox" id="pk-l-pdpa">' +
        '<span>ยินยอมให้ บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด เก็บและใช้ข้อมูลนี้เพื่อเสนอบริการและติดต่อกลับเท่านั้น และขอให้ลบเมื่อไรก็ได้</span></label>' +
      '<button type="submit" class="pk-btn is-primary" id="pk-l-send" disabled>ส่งให้เจ้าหน้าที่</button>' +
      '<p class="pk-msg" id="pk-l-msg" role="status" aria-live="polite"></p>' +
      '<p class="pk-hint" style="margin-top:8px">หรือทักไลน์ <a href="' + LINE_URL + '" target="_blank" rel="noopener" data-contact="line">@716lffzt</a> · โทร <a href="tel:021620405" data-contact="tel">' + TEL + '</a></p>' +
    '</form>';
  }

  function openLead(key) {
    S.lead.keys = key ? [key] : S.lead.keys;
    S.lead.fromQuiz = false;
    el('pk-quizbox').innerHTML =
      '<p class="pk-hint">กรอกข้อมูลไว้ ทีมงานจะติดต่อกลับภายใน 1 วันทำการ — หรือ' +
      ' <button type="button" class="pk-opt" data-qrestart="1">ตอบแบบสอบถามให้ระบบแนะนำก่อน</button></p>' +
      leadFormHtml('ให้เจ้าหน้าที่ติดต่อกลับ');
    scrollTo('pk-quiz');
  }

  function sendLead(ev) {
    ev.preventDefault();
    var msg = el('pk-l-msg');
    var body = {
      name: el('pk-l-name').value,
      phone: el('pk-l-phone').value,
      line: el('pk-l-line').value,
      note: el('pk-l-note').value,
      pdpa: el('pk-l-pdpa').checked,
      packageKeys: S.lead.keys,
      hp: el('pk-l-hp').value
    };
    if (S.lead.fromQuiz) body.answers = S.quiz.ans;
    msg.className = 'pk-msg';
    msg.textContent = 'กำลังส่ง…';
    el('pk-l-send').disabled = true;
    fetch(API + '/api/public/package-lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok) {
        msg.className = 'pk-msg is-err';
        msg.textContent = (res.j && res.j.error) || 'ส่งไม่สำเร็จ — ทักไลน์หาทีมงานได้เลย';
        el('pk-l-send').disabled = false;
        return;
      }
      track('package_lead');
      msg.className = 'pk-msg is-ok';
      msg.textContent = '✓ ส่งเรียบร้อย (เลขที่ ' + ((res.j && res.j.id) || '-') + ') ทีมงานจะติดต่อกลับภายใน 1 วันทำการ';
    }).catch(function () {
      msg.className = 'pk-msg is-err';
      msg.textContent = 'ติดต่อระบบไม่ได้ — โทร ' + TEL + ' หรือทักไลน์หาทีมงานได้เลย';
      el('pk-l-send').disabled = false;
    });
  }

  /* ---------- ค่านายหน้า และข้อความกำกับ ---------- */
  function drawCommission() {
    var c = (S.data.config && S.data.config.commission) || null;
    if (!c || !(c.tiers || []).length) return;
    el('pk-commission-block').hidden = false;
    el('pk-commission').innerHTML =
      '<ul class="pk-tiers">' + c.tiers.map(function (t) {
        var rate = t.quoteRequired
          ? 'เจ้าหน้าที่เสนออัตรา' + (t.ratePct != null && t.rateToPct != null ? ' (' + t.ratePct + '–' + t.rateToPct + '%)' : '')
          : (t.ratePct != null ? t.ratePct + '%' : '—');
        return '<li><span>' + esc(t.label || '') + '</span><b>' + esc(rate) + '</b></li>';
      }).join('') + '</ul>' +
      (c.minFee != null ? '<p class="pk-hint">ค่าบริการขั้นต่ำ <b>' + baht(c.minFee) + '</b> ต่อการขายหนึ่งรายการ</p>' : '') +
      '<p class="pk-hint">' + esc(c.note || '') + '</p>' +
      '<p class="pk-hint">อัตราที่ใช้จริงระบุไว้ในสัญญาฝากขายให้อ่านก่อนเซ็นเสมอ · สัญญาที่ลงนามไปแล้วใช้อัตราตามสัญญาฉบับนั้น</p>';
  }

  function drawDisclaimer() {
    var cfg = S.data.config || {};
    el('pk-disclaimer').innerHTML =
      '<b>เรื่องที่ควรรู้ก่อนตัดสินใจ</b><br>' +
      esc(cfg.estimateNote || '') +
      (cfg.vatRate != null ? '<br>ราคาทั้งหมดยังไม่รวมภาษีมูลค่าเพิ่ม ' + cfg.vatRate + '% เว้นแต่ระบุไว้เป็นอย่างอื่น' : '') +
      '<br>บริการตรวจสอบทุกแพ็กเกจเป็นการตรวจสอบ<b>ตามขอบเขตบริการที่ระบุไว้ในแพ็กเกจนั้น</b> ' +
      'ไม่ใช่การรับประกันกรรมสิทธิ์ ราคาขาย หรือผลการขาย' +
      '<br>ราคาบนหน้านี้เป็นราคาประมาณการก่อนตรวจเอกสารจริง ราคาที่ใช้จริงยืนยันในใบเสนอราคาเท่านั้น';
  }

  /* ---------- โหลดข้อมูล ---------- */
  function fail() {
    el('pk-root').innerHTML = '<div class="pk-offline">' +
      'ตอนนี้ดึงรายการแพ็กเกจจากระบบไม่ได้ — ทักไลน์ <a href="' + LINE_URL + '" target="_blank" rel="noopener" data-contact="line">@716lffzt</a> ' +
      'หรือโทร <a href="tel:021620405" data-contact="tel">' + TEL + '</a> ให้ทีมงานส่งรายละเอียดและราคาให้ได้ทันที' +
      '</div>';
    el('pk-quizbox').innerHTML = '<p class="pk-empty">ยังโหลดคำถามไม่ได้ในตอนนี้</p>';
  }

  function start() {
    track('packages_view');
    fetch(API + '/api/public/packages').then(function (r) {
      if (!r.ok) throw new Error('bad');
      return r.json();
    }).then(function (j) {
      if (!j || !j.packages || !j.packages.length) throw new Error('empty');
      S.data = j;
      var groups = (j.config && j.config.groups) || [];
      S.group = (groups[0] && groups[0].key) || (j.packages[0] && j.packages[0].group) || '';
      S.calcKey = j.packages[0].key;
      drawCatalog();
      drawCalc();
      drawQuiz();
      drawCommission();
      drawDisclaimer();
    }).catch(fail);
  }

  /* ---------- การกดปุ่ม ---------- */
  d.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-group],[data-cmp],[data-calc],[data-lead],[data-ans],[data-qnext],[data-qskip],[data-qback],[data-qrestart]');
    if (!t) return;
    var ds = t.dataset;
    if (ds.group) {
      S.group = ds.group;
      drawCatalog();
    } else if (ds.cmp) {
      var i = S.cmp.indexOf(ds.cmp);
      if (i >= 0) S.cmp.splice(i, 1);
      else if (S.cmp.length < 3) S.cmp.push(ds.cmp);
      if (S.cmp.length >= 2) track('package_compare');
      drawCatalog();
      drawCompare();
    } else if (ds.calc) {
      S.calcKey = ds.calc;
      S.calcOut = null;
      drawCalc();
      scrollTo('pk-calc-block');
    } else if (ds.lead) {
      openLead(ds.lead);
    } else if (ds.ans !== undefined) {
      var q = questions()[S.quiz.step];
      if (!q) return;
      if (!S.quiz.started) { S.quiz.started = true; track('package_reco_start'); }
      S.quiz.ans[q.key] = ds.ans;
      S.quiz.step++;
      drawQuiz();
    } else if (ds.qnext) {
      var qq = questions()[S.quiz.step];
      var input = el('pk-q-in');
      var v = input ? input.value.trim() : '';
      if (qq && qq.required && !v) {
        var m = el('pk-q-msg');
        if (m) { m.className = 'pk-msg is-err'; m.textContent = 'ข้อนี้ต้องตอบก่อนไปต่อ'; }
        return;
      }
      if (!S.quiz.started) { S.quiz.started = true; track('package_reco_start'); }
      if (v !== '') S.quiz.ans[qq.key] = v; else delete S.quiz.ans[qq.key];
      S.quiz.step++;
      drawQuiz();
    } else if (ds.qskip) {
      S.quiz.step++;
      drawQuiz();
    } else if (ds.qback) {
      S.quiz.step = Math.max(0, S.quiz.step - 1);
      drawQuiz();
    } else if (ds.qrestart) {
      S.quiz = { step: 0, ans: {}, started: S.quiz.started, rec: null };
      S.lead = { keys: [], fromQuiz: false };
      drawQuiz();
      scrollTo('pk-quiz');
    }
  });

  // กางรายละเอียดของการ์ด = นับว่าเปิดดูแพ็กเกจนั้น (ครั้งเดียวต่อแพ็กเกจต่อการเข้าเว็บหนึ่งครั้ง)
  d.addEventListener('toggle', function (ev) {
    var box = ev.target;
    if (!box || !box.dataset || !box.dataset.detail || !box.open) return;
    if (S.opened[box.dataset.detail]) return;
    S.opened[box.dataset.detail] = true;
    track('package_view');
  }, true);

  d.addEventListener('submit', function (ev) {
    if (ev.target && ev.target.id === 'pk-calc-form') runCalc(ev);
    else if (ev.target && ev.target.id === 'pk-lead-form') sendLead(ev);
  });

  // ปุ่มส่งเปิดได้เมื่อติ๊กยินยอมแล้วเท่านั้น (เซิร์ฟเวอร์ตรวจซ้ำอีกชั้น)
  d.addEventListener('change', function (ev) {
    if (ev.target && ev.target.id === 'pk-l-pdpa') {
      var btn = el('pk-l-send');
      if (btn) btn.disabled = !ev.target.checked;
    }
    if (ev.target && ev.target.id === 'pk-c-pkg') {
      S.calcKey = ev.target.value;
      S.calcOut = null;
      drawCalc();
    }
  });

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start);
  else start();
})(window, document);
