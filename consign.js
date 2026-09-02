// หน้า "ฝากขายที่ดินฟรี" — ปลายทางของโฆษณาฝั่งผู้ขาย
// ส่งฟอร์มเข้า /api/public/consign ของ nj-survey-system → กลายเป็นโอกาสทางธุรกิจขั้นแรกทันที
// (ค่า NJ_API_BASE / njTrack / njTrackInternal มาจาก analytics.js ที่โหลดก่อนไฟล์นี้)

var LINE_OA_URL = 'https://line.me/R/ti/p/@716lffzt';
var COMPANY_TEL = '02-162-0405';
var COMPANY_TEL_ALT = '084-915-8601';

function telHref(t) { return 'tel:' + String(t).replace(/[^0-9+]/g, ''); }
function $(id) { return document.getElementById(id); }

// ---------- ลิงก์ติดต่อทุกจุดในหน้า ----------
// ปลายทาง + ชื่อเหตุการณ์ที่จะนับ แยกตามช่องทาง — เพิ่มช่องทางใหม่ = เพิ่มบรรทัดเดียวตรงนี้
var CONTACT_CHANNELS = {
  line:      { href: function () { return LINE_OA_URL; },        ev: 'line_click',      method: 'line' },
  messenger: { href: function () { return NJ_MESSENGER_URL; },   ev: 'messenger_click', method: 'messenger' },
  tel:       { href: function () { return telHref(COMPANY_TEL); }, ev: 'tel_click',     method: 'phone' }
};
function setupContactLinks() {
  [['cs-line', 'line'], ['cs-done-line', 'line'], ['cs-bar-line', 'line'],
   ['cs-fb', 'messenger'], ['cs-done-fb', 'messenger'], ['cs-bar-fb', 'messenger'],
   ['cs-tel', 'tel'], ['cs-done-tel', 'tel'], ['cs-bar-tel', 'tel']].forEach(function (pair) {
    var el = $(pair[0]), ch = CONTACT_CHANNELS[pair[1]];
    if (!el || !ch) return;
    el.href = ch.href();
    el.addEventListener('click', function () {
      njTrackInternal(ch.ev);
      njTrack('Contact', { method: ch.method });
    });
  });
}

// ---------- ตรวจฟอร์มฝั่งหน้าเว็บ (เซิร์ฟเวอร์ตรวจซ้ำอีกชั้นเสมอ ห้ามเชื่อฝั่งนี้อย่างเดียว) ----------
function validate(v) {
  if (!v.name) return 'กรุณากรอกชื่อ–นามสกุล';
  if (v.phone.replace(/\D/g, '').length < 9) return 'กรุณากรอกเบอร์โทรให้ครบถ้วน';
  if (!v.pdpa) return 'กรุณากดยินยอมให้เราติดต่อกลับ';
  return '';
}

function showErr(msg) {
  var box = $('cs-err');
  if (!msg) { box.hidden = true; box.textContent = ''; return; }
  box.textContent = msg;
  box.hidden = false;
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// จังหวัดที่บริษัทให้บริการอยู่จริง — ยกขึ้นบนสุดของ dropdown เพราะคนส่วนใหญ่ที่เข้าฟอร์มนี้อยู่ในกลุ่มนี้
var SERVICE_PROVINCES = ['สมุทรปราการ', 'กรุงเทพมหานคร', 'ฉะเชิงเทรา', 'ชลบุรี', 'ระยอง', 'ปทุมธานี', 'นครนายก'];

// ประกอบข้อความที่ตั้งจากช่องที่เลือกไว้ ให้ทีมขายอ่านรวดเดียวจบในการ์ดโอกาสทางธุรกิจ
// กรุงเทพฯ ใช้ "แขวง/เขต" ต่างจังหวัดใช้ "ต./อ." — ชื่ออำเภอในกรุงเทพฯ มีคำว่า "เขต" นำมาอยู่แล้ว
function locationText(a, detail) {
  var bkk = a.province === 'กรุงเทพมหานคร';
  var parts = [];
  if (a.tambon) parts.push((bkk ? 'แขวง' : 'ต.') + a.tambon);
  if (a.amphoe) parts.push(/^เขต/.test(a.amphoe) ? a.amphoe : 'อ.' + a.amphoe);
  if (a.province) parts.push(bkk ? a.province : 'จ.' + a.province);
  if (a.zip) parts.push(a.zip);
  var s = parts.join(' ');
  if (detail) s = s ? s + ' · ' + detail : detail;
  return s;
}


// ============================================================================
//  ขั้นที่ 2 ของหน้าฝากขาย: บันทึกแล้วยังแก้ได้ ก่อนกดส่งให้ทีมงานตรวจสอบ
// ============================================================================
//
// เดิมกดส่งฟอร์มครั้งเดียวแล้วจบ — ฟอร์มถูกซ่อน แก้อะไรไม่ได้อีกเลย พิมพ์ผิดหรือ
// แนบรูปผิดใบก็ต้องทักไลน์มาบอกทีมงานให้แก้ให้ ตอนนี้เปลี่ยนเป็น 2 จังหวะ:
//
//   จังหวะที่ 1  "บันทึกข้อมูล"  → สร้าง/อัปเดตใบฝากขายในระบบ (ฟอร์มยังอยู่ แก้ซ้ำได้ไม่จำกัด)
//   จังหวะที่ 2  "ส่งให้ทีมงานตรวจสอบ" → ยิงแจ้งเตือนหาทีมงาน = เจ้าของบอกว่ากรอกครบแล้ว
//
// กุญแจของทุกเส้นทางคือ "ตั๋ว" (`uploadToken`) ที่ได้ตอนบันทึกครั้งแรก — ไม่มีระบบสมาชิก
// ไม่มีรหัสผ่าน · เก็บไว้ใน localStorage ของเครื่องนั้นเพื่อให้เปิดหน้านี้ใหม่แล้วกลับมาแก้ต่อได้
// ภายในอายุตั๋ว 14 วัน (ฝั่งเซิร์ฟเวอร์เป็นคนบังคับอายุ ไม่ใช่ฝั่งนี้)
var UPLOAD_MAX_MB = 8;
var TICKET_KEY = 'njConsignTicket';
var LEAD = { id: '', token: '', data: null };

// localStorage โยน exception ได้จริงในโหมดส่วนตัว/เบราว์เซอร์ที่ปิดการเก็บข้อมูลเว็บไซต์
// พังตรงนี้ต้องไม่ทำให้ฟอร์มทั้งหน้าตาย — จำไม่ได้ก็แค่กลับมาแก้ทีหลังไม่ได้เท่านั้น
function saveTicket() {
  try { localStorage.setItem(TICKET_KEY, JSON.stringify({ id: LEAD.id, t: LEAD.token, at: Date.now() })); } catch (e) {}
}
function readTicket() {
  try {
    var raw = localStorage.getItem(TICKET_KEY);
    if (!raw) return null;
    var o = JSON.parse(raw);
    return (o && o.id && o.t) ? o : null;
  } catch (e) { return null; }
}
function clearTicket() { try { localStorage.removeItem(TICKET_KEY); } catch (e) {} }

function leadUrl(suffix, extra) {
  return NJ_API_BASE + '/api/public/consign/' + encodeURIComponent(LEAD.id) + (suffix || '') +
         '?t=' + encodeURIComponent(LEAD.token) + (extra ? '&' + extra : '');
}
// ตัวห่อ fetch ตัวเดียวของหน้านี้ — ดึงข้อความ error ที่เซิร์ฟเวอร์ส่งมาออกมาให้เสมอ
// (ข้อความฝั่งเซิร์ฟเวอร์บอกสาเหตุจริง เช่น "ทีมงานรับเรื่องไปแล้ว" ซึ่งฝั่งนี้เดาเองไม่ได้)
function leadFetch(url, opt) {
  return fetch(url, opt || {}).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (d) {
      if (!r.ok) throw new Error(d.error || 'ทำรายการไม่สำเร็จ');
      return d;
    });
  });
}

// ---------- ย่อรูปก่อนส่ง ----------
// รูปจากมือถือใบละ 3-8 MB อัปดิบๆ ทั้งชุดคือรอเป็นนาทีบนเน็ตมือถือ
function shrinkImage(file, cb) {
  if (!/^image\//.test(file.type) || /heic|heif/i.test(file.type)) return cb(file);
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function () {
    var MAX = 1800;
    var w = img.width, h = img.height;
    var s = Math.min(1, MAX / Math.max(w, h));
    if (s === 1 && file.size <= UPLOAD_MAX_MB * 1024 * 1024) { URL.revokeObjectURL(url); return cb(file); }
    var c = document.createElement('canvas');
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(function (blob) {
      URL.revokeObjectURL(url);
      cb(blob && blob.size < file.size ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }) : file);
    }, 'image/jpeg', 0.85);
  };
  img.onerror = function () { URL.revokeObjectURL(url); cb(file); };
  img.src = url;
}

// ---------- แสดงไฟล์ที่แนบไว้แล้ว ----------
// แยก 2 สถานะบนหน้าจอชัดเจน เพราะสิทธิ์ต่างกันจริงที่ฝั่งเซิร์ฟเวอร์:
//   รอตรวจ  = ลบเองได้ (มีปุ่ม ✕)
//   ตรวจแล้ว = ลบเองไม่ได้ (ขึ้นแถบเขียว "ทีมงานตรวจแล้ว" ทับ) — รูปที่ผ่านการตรวจอาจขึ้นหน้าประกาศไปแล้ว
function isImageName(n) { return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(String(n || '')); }
function fileTile(f, kind, locked) {
  var img = isImageName(f.name) || kind === 'photo';
  var inner = img
    ? '<img src="' + NJ_API_BASE + f.url + '" alt="" loading="lazy">'
    : '<span class="cs-thumb-doc"><span class="ico">📄</span><span class="nm"></span></span>';
  var el = document.createElement('div');
  el.className = 'cs-thumb';
  el.innerHTML = inner + (locked
    ? '<span class="cs-thumb-lock">ทีมงานตรวจแล้ว</span>'
    : '<button type="button" class="cs-thumb-del" data-kind="' + kind + '" data-fid="' + f.id +
      '" aria-label="ลบไฟล์นี้" title="ลบไฟล์นี้">✕</button>');
  // ชื่อไฟล์มาจากผู้ใช้ — ใส่ผ่าน textContent เท่านั้น ห้ามต่อเป็น HTML
  var nm = el.querySelector('.nm');
  if (nm) nm.textContent = f.name || 'ไฟล์แนบ';
  return el;
}
function renderFiles() {
  var d = LEAD.data;
  if (!d) return;
  [['photo', 'cs-up-photo-list', 'cs-up-photo-count', d.pendingPhotos, d.approvedPhotos, d.max.photo],
   ['doc',   'cs-up-doc-list',   'cs-up-doc-count',   d.pendingDocs,   [],                d.max.doc]
  ].forEach(function (g) {
    var box = $(g[1]);
    if (!box) return;
    box.innerHTML = '';
    (g[3] || []).forEach(function (f) { box.appendChild(fileTile(f, g[0], false)); });
    (g[4] || []).forEach(function (f) { box.appendChild(fileTile(f, g[0], true)); });
    var cnt = $(g[2]);
    if (cnt) {
      var n = (g[3] || []).length + (g[4] || []).length;
      cnt.textContent = n ? '(' + n + '/' + g[5] + ')' : '';
    }
  });
  // เอกสารที่ตรวจแล้วไม่ส่งรายละเอียดกลับมา (เป็นเอกสารสิทธิ์ ไม่ควรเปิดผ่านลิงก์ซ้ำ) — บอกแค่จำนวน
  var dc = $('cs-up-doc-count');
  if (dc && d.approvedDocs) {
    dc.textContent = '(' + (d.pendingDocs.length + d.approvedDocs) + '/' + d.max.doc + ' · ตรวจแล้ว ' + d.approvedDocs + ')';
  }
}
function setLead(d) {
  LEAD.data = d;
  renderFiles();
  if (d && d.submittedAt) markSent();
  applyCancelled(d);
}

// ---------- สลับหน้าเข้า/ออกจากสถานะ "ยกเลิกฝากขายแล้ว" ----------
// เรียกจาก setLead ที่เดียว — ทุกเส้นทาง (เปิดใบเดิม · บันทึก · แนบไฟล์ · กดยกเลิก) วิ่งผ่านตัวนี้หมด
// จึงไม่มีทางที่หน้าจอจะค้างอยู่ในสถานะ "ยังฝากขายอยู่" ทั้งที่ฝั่งเซิร์ฟเวอร์ยกเลิกไปแล้ว
function applyCancelled(d) {
  var box = $('cs-cancel'), banner = $('cs-cancelled');
  var on = !!(d && d.cancelled);
  if (banner) {
    banner.hidden = !on;
    var when = $('cs-cancelled-when');
    if (when) {
      var at = on ? String(d.cancelled.at || '').slice(0, 10) : '';
      var reason = on ? String(d.cancelled.reason || '') : '';
      when.textContent = (at ? 'ยกเลิกเมื่อ ' + at : '') + (reason ? ' · เหตุผล: ' + reason : '');
    }
  }
  // ปุ่มยกเลิกโผล่เฉพาะตอนที่ยังมีอะไรให้ยกเลิก — ยกเลิกไปแล้วต้องไม่เหลือปุ่มให้กดซ้ำ
  if (box) box.hidden = !d || on;
  if (!on) return;

  // ยกเลิกแล้ว = ปิดทุกทางที่ยัง "เขียน" ข้อมูลได้ ให้ตรงกับที่เซิร์ฟเวอร์ปิดไปแล้ว
  // (ไม่ปิดฝั่งนี้ = กดได้แต่ขึ้น error 409 ทุกครั้ง ซึ่งอ่านแล้วเหมือนระบบพัง ไม่ใช่เหมือนถูกปิด)
  var up = $('cs-up'), send = $('cs-send'), note = $('cs-send-note'), keep = $('cs-keep');
  if (up) up.hidden = true;
  if (send) send.hidden = true;
  if (note) note.hidden = true;
  if (keep) keep.hidden = true;
  var ico = $('cs-done-icon'), ti = $('cs-done-title'), sub = $('cs-done-sub');
  if (ico) ico.textContent = '🚫';
  if (ti) ti.textContent = 'ยกเลิกการฝากขายแล้ว';
  if (sub) sub.textContent = 'ถ้าเปลี่ยนใจอยากกลับมาฝากขายใหม่ ทักไลน์บอกทีมงานได้เลย';
  var form = $('consign-form');
  if (form) {
    Array.prototype.slice.call(form.querySelectorAll('input,select,textarea,button'))
      .forEach(function (el) { el.disabled = true; });
  }
}

// ---------- ยกเลิกการฝากขายด้วยตัวเอง ----------
// ทำได้ทุกขั้น รวมถึงหลังประกาศขึ้นเว็บแล้ว (ดูเหตุผลที่ฝั่งเซิร์ฟเวอร์ — เส้นทาง /cancel)
function cancelLead() {
  var yes = $('cs-cancel-yes'), err = $('cs-cancel-err');
  if (!LEAD.id || !LEAD.token || !yes || yes.disabled) return;
  var reasonEl = $('cs-cancel-reason');
  yes.disabled = true;
  yes.textContent = 'กำลังยกเลิก…';
  if (err) { err.hidden = true; err.textContent = ''; }
  leadFetch(leadUrl('/cancel'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reasonEl ? reasonEl.value : '' })
  })
    .then(function (d) {
      var b = $('cs-cancel-box');
      if (b) b.hidden = true;
      setLead(d);
      $('cs-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(function (e) {
      yes.disabled = false;
      yes.textContent = 'ยืนยันยกเลิกฝากขาย';
      // ยกเลิกไม่สำเร็จแล้วปล่อยเงียบ = เจ้าของเข้าใจว่ายกเลิกแล้วทั้งที่ประกาศยังอยู่บนเว็บ
      if (err) {
        err.hidden = false;
        err.textContent = (e.message || 'ยกเลิกไม่สำเร็จ') + ' — กรุณาทักไลน์แจ้งทีมงานให้ถอดประกาศออกให้';
      }
    });
}
function status(id, cls, msg) {
  var box = $(id);
  if (!box) return;
  box.innerHTML = '';
  if (!msg) return;
  var row = document.createElement('div');
  row.className = 'cs-up-item ' + cls;
  row.textContent = msg;
  box.appendChild(row);
}

// ---------- ลบไฟล์ที่ตัวเองแนบมา ----------
function delFile(kind, fid) {
  if (!LEAD.id || !LEAD.token) return;
  if (!confirm(kind === 'doc' ? 'ลบเอกสารไฟล์นี้ออกใช่ไหม' : 'ลบรูปนี้ออกใช่ไหม')) return;
  var sid = kind === 'doc' ? 'cs-up-doc-status' : 'cs-up-photo-status';
  status(sid, 'busy', 'กำลังลบ…');
  leadFetch(leadUrl('/files/' + encodeURIComponent(fid), 'kind=' + kind), { method: 'DELETE' })
    .then(function (d) { setLead(d); status(sid, 'ok', '✓ ลบแล้ว'); })
    .catch(function (e) { status(sid, 'bad', '✕ ' + e.message); });
}

// ---------- แนบไฟล์เพิ่ม ----------
// ต้องมีตั๋วเสมอ (ได้จากการบันทึกฟอร์ม) — ไม่ใช่ช่องอัปโหลดลอยๆ ที่ใครก็ยิงไฟล์เข้ามาได้
var uploadWired = false;
function setupUpload() {
  if (uploadWired) return;
  uploadWired = true;

  function wire(inputId, statusId, kind, label) {
    var input = $(inputId);
    if (!input) return;
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      input.value = '';
      if (!files.length || !LEAD.id || !LEAD.token) return;
      if (files.length > 10) files = files.slice(0, 10);
      status(statusId, 'busy', 'กำลังส่ง ' + label + ' ' + files.length + ' ไฟล์…');

      var out = [], left = files.length;
      files.forEach(function (f, i) {
        shrinkImage(f, function (small) {
          out[i] = small;
          if (--left) return;
          var fd = new FormData();
          out.forEach(function (o) { if (o) fd.append('files', o, o.name); });
          leadFetch(leadUrl('/files', 'kind=' + kind), { method: 'POST', body: fd })
            .then(function (r) {
              status(statusId, 'ok', '✓ ส่ง' + label + ' ' + r.added + ' ไฟล์แล้ว — ลบออกเองได้จนกว่าทีมงานจะตรวจ');
              njTrackInternal('consign_files');
              return refreshLead();
            })
            .catch(function (e) {
              // บอกทางออกเสมอ — คนที่ส่งไฟล์ไม่ผ่านแล้วไม่รู้จะทำยังไงต่อ คือลีดที่หลุดไปเฉยๆ
              status(statusId, 'bad', '✕ ' + (e.message || 'ส่งไฟล์ไม่สำเร็จ') + ' — ส่งทางไลน์ให้ทีมงานแทนได้เลย');
            });
        });
      });
    });
  }
  wire('cs-up-photo', 'cs-up-photo-status', 'photo', 'รูปที่ดิน');
  wire('cs-up-doc', 'cs-up-doc-status', 'doc', 'เอกสาร');

  // ปุ่มลบใช้ event delegation — การ์ดถูกวาดใหม่ทุกครั้งที่ข้อมูลเปลี่ยน ผูก listener รายใบจะหลุด
  ['cs-up-photo-list', 'cs-up-doc-list'].forEach(function (id) {
    var box = $(id);
    if (!box) return;
    box.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.cs-thumb-del') : null;
      if (!btn) return;
      delFile(btn.dataset.kind, btn.dataset.fid);
    });
  });

  var send = $('cs-send');
  if (send) send.addEventListener('click', sendToTeam);

  // ยกเลิกฝากขาย: กดลิงก์ → เปิดกล่องยืนยัน → ยืนยันอีกครั้งถึงจะยิงจริง
  // สองจังหวะโดยตั้งใจ ปุ่มนี้ถอดประกาศออกจากเว็บทันทีและกดคืนเองไม่ได้
  var cOpen = $('cs-cancel-open'), cBox = $('cs-cancel-box'), cNo = $('cs-cancel-no'), cYes = $('cs-cancel-yes');
  if (cOpen && cBox) cOpen.addEventListener('click', function () {
    cBox.hidden = false;
    cOpen.hidden = true;
    var r = $('cs-cancel-reason');
    if (r) r.focus();
  });
  if (cNo && cBox && cOpen) cNo.addEventListener('click', function () {
    cBox.hidden = true;
    cOpen.hidden = false;
  });
  if (cYes) cYes.addEventListener('click', cancelLead);

  var copy = $('cs-keep-copy');
  if (copy) copy.addEventListener('click', function () {
    var link = location.origin + location.pathname + '?id=' + encodeURIComponent(LEAD.id) + '&t=' + encodeURIComponent(LEAD.token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { copy.textContent = '✓ คัดลอกแล้ว'; })
        .catch(function () { prompt('คัดลอกลิงก์นี้ไว้', link); });
    } else { prompt('คัดลอกลิงก์นี้ไว้', link); }
  });
}

function refreshLead() {
  if (!LEAD.id || !LEAD.token) return Promise.resolve(null);
  return leadFetch(leadUrl('')).then(function (d) { setLead(d); return d; }).catch(function () { return null; });
}

// ---------- ส่งให้ทีมงานตรวจสอบ (จังหวะที่ 2) ----------
function sendToTeam() {
  var btn = $('cs-send');
  if (!LEAD.id || !LEAD.token || !btn || btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'กำลังส่ง…';
  leadFetch(leadUrl('/submit'), { method: 'POST' })
    .then(function (d) {
      LEAD.data = d;
      renderFiles();
      markSent();
      // ไม่ยิงสถิติเหตุการณ์ใหม่ตรงนี้ — ลีดถูกนับไปแล้วตอนบันทึกครั้งแรก (consign_submit)
      // เพิ่มชนิดเหตุการณ์ใหม่ต้องไปขึ้นทะเบียนทั้ง analytics.js และ server.js ก่อน ไม่งั้นถูกทิ้งเงียบๆ
      $('cs-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(function (e) {
      btn.disabled = false;
      btn.textContent = '📨 ส่งให้ทีมงานตรวจสอบ';
      var note = $('cs-send-note');
      if (note) note.textContent = e.message + ' — หรือทักไลน์หาทีมงานได้เลย';
    });
}
function markSent() {
  var btn = $('cs-send');
  if (btn) {
    btn.disabled = false;                       // ยังกดส่งซ้ำได้หลังแก้ข้อมูลเพิ่ม
    btn.textContent = '📨 ส่งให้ทีมงานตรวจสอบอีกครั้ง';   // ยังกดซ้ำได้หลังแก้ข้อมูลเพิ่ม ไม่ทำให้ดูเหมือนปุ่มตาย
  }
  var ico = $('cs-done-icon'), ti = $('cs-done-title'), sub = $('cs-done-sub'), note = $('cs-send-note');
  if (ico) ico.textContent = '✓';
  if (ti) ti.textContent = 'ส่งให้ทีมงานแล้ว ขอบคุณครับ';
  if (sub) sub.textContent = 'ทีมงานจะโทรกลับภายใน 1 วันทำการ · ถ้ายังอยากแก้ข้อมูลหรือแนบรูปเพิ่ม ทำได้เลยแล้วกดส่งอีกครั้ง';
  if (note) note.textContent = 'ทีมงานได้รับแจ้งเตือนแล้ว — แก้ไขเพิ่มเติมแล้วกดส่งซ้ำได้ทุกเมื่อ';
}

// ---------- เข้าสู่โหมด "บันทึกแล้ว" ----------
function enterSavedMode() {
  var ref = $('cs-ref'), keepRef = $('cs-keep-ref'), keep = $('cs-keep'), btn = $('cs-submit');
  if (ref) ref.textContent = LEAD.id || '—';
  if (keepRef) keepRef.textContent = LEAD.id || '—';
  if (keep) keep.hidden = false;
  if (btn) btn.textContent = '💾 บันทึกการแก้ไข';
  $('cs-done').hidden = false;
  setupUpload();
}

// ---------- เติมค่ากลับลงฟอร์ม (ตอนเปิดหน้าใหม่แล้วกลับมาแก้ต่อ) ----------
function setVal(sel, v) {
  var el = document.querySelector(sel);
  if (!el) return;
  el.value = v == null ? '' : String(v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function setRadio(name, v) {
  var el = document.querySelector('input[name="' + name + '"][value="' + v + '"]');
  if (el) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
}
function fillForm(d) {
  setVal('#consign-form [name="name"]', d.name);
  setVal('#consign-form [name="phone"]', d.phone);
  setRadio('type', d.type || 'sell');
  // ที่ตั้งต้องเติมตามลำดับ จังหวัด → อำเภอ → ตำบล เพราะรายชื่อชั้นล่างถูกสร้างจากชั้นบน
  setVal('#cs-province', d.province);
  setVal('#cs-amphoe', d.amphoe);
  setVal('#cs-tambon', d.tambon);
  var zip = $('cs-zip'); if (zip && d.zip) zip.value = d.zip;
  setVal('#consign-form [name="locDetail"]', d.locDetail);
  setVal('#cs-rai', d.rai || '');
  setVal('#cs-ngan', d.ngan || '');
  setVal('#cs-wa', d.wa || '');
  setRadio('priceUnit', d.priceUnit || 'wa');
  setVal('#cs-price', d.unitPrice || '');
  setVal('#consign-form [name="note"]', d.note);
  // เคยยินยอมไปแล้วตอนบันทึกครั้งแรก — ติ๊กคืนให้ ไม่ต้องให้ติ๊กซ้ำทุกครั้งที่กลับมาแก้
  var pdpa = document.querySelector('#consign-form [name="pdpa"]');
  if (pdpa) pdpa.checked = true;
}

// ---------- เปิดใบเดิมกลับมา (จากลิงก์ ?id=&t= หรือจากตั๋วที่เครื่องนี้จำไว้) ----------
function restoreLead(areaPrice) {
  var qs = new URLSearchParams(location.search);
  var id = qs.get('id'), t = qs.get('t');
  if (!id || !t) {
    var saved = readTicket();
    if (!saved) return;
    id = saved.id; t = saved.t;
  }
  LEAD.id = id; LEAD.token = t;
  leadFetch(leadUrl(''))
    .then(function (d) {
      fillForm(d);
      if (areaPrice) areaPrice.render();
      saveTicket();
      enterSavedMode();
      setLead(d);
      // ทีมงานหยิบไปทำต่อแล้ว = แก้เองไม่ได้ ต้องบอกตรงๆ ไม่ใช่ปล่อยให้กดบันทึกแล้วเจอ error
      // ยกเลิกแล้วเป็นคนละเรื่องกับ "ทีมรับเรื่องไปแล้ว" — applyCancelled (ผ่าน setLead) พูดเรื่องนั้นไปแล้ว
      if (!d.editable && !d.cancelled) {
        var sub = $('cs-done-sub');
        if (sub) sub.textContent = 'ทีมงานรับเรื่องนี้ไปดำเนินการแล้ว — ถ้าต้องแก้ไขข้อมูลหรือถอดรูปออก ทักไลน์แจ้งทีมงานได้เลย';
      }
    })
    .catch(function () {
      // ตั๋วหมดอายุ/ไม่ถูกต้อง = ล้างทิ้งเงียบๆ แล้วปล่อยให้กรอกใหม่ตามปกติ
      LEAD.id = ''; LEAD.token = ''; clearTicket();
    });
}

function setupForm() {
  var form = $('consign-form');
  if (!form) return;
  var btn = $('cs-submit');
  var sending = false;

  var addr = NJLandForm.initAddress({
    province: 'cs-province', amphoe: 'cs-amphoe', tambon: 'cs-tambon',
    provinceList: 'cs-province-list', amphoeList: 'cs-amphoe-list', tambonList: 'cs-tambon-list',
    zip: 'cs-zip', note: 'cs-loc-note', pinned: SERVICE_PROVINCES
  });
  var areaPrice = NJLandForm.initAreaPrice({
    rai: 'cs-rai', ngan: 'cs-ngan', wa: 'cs-wa',
    price: 'cs-price', unitName: 'priceUnit',
    areaOut: 'cs-area-out', priceOut: 'cs-price-out', priceLabel: 'cs-price-label'
  });

  // แตะช่องแรก = แสดงว่าเริ่มสนใจจริง ใช้เป็นสัญญาณกลางทางให้ Meta เรียนรู้กลุ่มเป้าหมายเร็วขึ้น
  var startedOnce = false;
  form.addEventListener('focusin', function () {
    if (startedOnce) return;
    startedOnce = true;
    njTrack('ViewContent', { content_name: 'consign_form_start' });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var fd = new FormData(form);
    var a = addr ? addr.value() : { province: '', amphoe: '', tambon: '', zip: '' };
    var ap = areaPrice ? areaPrice.value()
      : { rai: 0, ngan: 0, wa: 0, totalWa: 0, areaText: '', priceUnit: 'wa', unitPrice: 0, estValue: 0 };
    var detail = String(fd.get('locDetail') || '').trim();
    var loc = locationText(a, detail);

    var v = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      type: String(fd.get('type') || 'sell'),
      // parcelInfo = บรรทัดสรุปที่ทีมขายและหน้าประกาศใช้แสดง (ที่ตั้ง · เนื้อที่)
      parcelInfo: [loc, ap.areaText].filter(Boolean).join(' · '),
      // ส่งค่าที่แยกช่องไว้ไปด้วย เพื่อให้ระบบหลังบ้านเก็บเป็นข้อมูลจริง ไม่ใช่ข้อความก้อนเดียว
      province: a.province, amphoe: a.amphoe, tambon: a.tambon, zip: a.zip,
      locDetail: detail,
      rai: ap.rai, ngan: ap.ngan, wa: ap.wa, totalWa: ap.totalWa,
      priceUnit: ap.priceUnit, unitPrice: ap.unitPrice,
      // ราคารวมที่คำนวณได้ — เซิร์ฟเวอร์คำนวณซ้ำจาก unitPrice × เนื้อที่เสมอ ไม่เชื่อค่านี้อย่างเดียว
      estValue: ap.estValue,
      note: String(fd.get('note') || '').trim(),
      pdpa: !!fd.get('pdpa'),
      website: String(fd.get('website') || ''),        // honeypot — คนจริงมองไม่เห็นช่องนี้
      ref: location.search ? location.search.slice(1, 60) : 'consign_page'   // เก็บ utm ที่ติดมากับลิงก์โฆษณา
    };

    var err = validate(v);
    if (err) { showErr(err); return; }
    showErr('');

    var editing = !!(LEAD.id && LEAD.token);
    sending = true;
    btn.disabled = true;
    btn.textContent = editing ? 'กำลังบันทึก...' : 'กำลังส่ง...';

    var req = editing
      ? leadFetch(leadUrl(''), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) })
      : leadFetch(NJ_API_BASE + '/api/public/consign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v)
        });

    req.then(function (res) {
      sending = false;
      btn.disabled = false;
      if (editing) {
        btn.textContent = '💾 บันทึกการแก้ไข';
        setLead(res);
        status('cs-up-photo-status', 'ok', '✓ บันทึกข้อมูลที่แก้ไขแล้ว');
        return;
      }
      // ไม่ต้องยิง njTrackInternal('consign_submit') ที่นี่ — ฝั่งเซิร์ฟเวอร์บันทึกให้แล้วตอนสร้างโอกาส
      // (นับที่เดียวเท่านั้น ไม่งั้นตัวเลข conversion ในหน้าสถิติจะเป็นสองเท่าของจริง)
      njTrack('Lead', { content_name: 'consign', content_category: v.type });
      LEAD.id = (res && res.id) || '';
      LEAD.token = (res && res.uploadToken) || '';
      if (!LEAD.id || !LEAD.token) {
        // ไม่ได้ตั๋วกลับมา (เช่นโดน honeypot ตอบ 204) — จบแบบเดิม ไม่เปิดขั้นที่ 2 ให้
        form.hidden = true;
        $('cs-done').hidden = false;
        return;
      }
      saveTicket();
      enterSavedMode();
      refreshLead();
      $('cs-done').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function (e) {
      sending = false;
      btn.disabled = false;
      btn.textContent = editing ? '💾 บันทึกการแก้ไข' : 'ส่งข้อมูล — ให้ทีมงานติดต่อกลับ';
      // ส่งไม่ผ่านไม่ควรจบแค่ข้อความ error — เสนอช่องทางที่ใช้ได้แน่นอนให้ทันที ไม่งั้นลีดหลุด
      showErr((e.message || 'ส่งข้อมูลไม่สำเร็จ') + ' หรือโทรหาเราได้เลยที่ ' + COMPANY_TEL + ' / ' + COMPANY_TEL_ALT);
    });
  });

  restoreLead(areaPrice);
}

document.getElementById('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
setupContactLinks();
setupForm();
njTrackInternal('consign_view');
njTrack('ViewContent', { content_name: 'consign_page' });
