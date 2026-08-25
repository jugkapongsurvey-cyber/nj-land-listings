// เติม class .js ให้ <html> ก่อนอื่นใด — CSS ใช้ class นี้ตัดสินว่าจะซ่อน [data-reveal] รอเลื่อนจอไหม
// ถ้า JS พังตอนไหนก่อนบรรทัดนี้ก็ยังไม่มี .js เนื้อหาจึงยังเห็นได้ปกติ (progressive enhancement)
document.documentElement.classList.add('js');

// ---------- ตั้งค่า ----------
// ที่อยู่ระบบงานรังวัด (NJ_API_BASE) และตัวเก็บสถิติ (njTrack / njTrackInternal) มาจาก analytics.js
// ซึ่งโหลดก่อนไฟล์นี้ — แก้ค่าที่นั่นที่เดียว ทุกหน้าใช้ร่วมกัน

// LINE OA "รังวัดเอกชน NJ GROUP" — ใช้ตัวเดิมที่ทีมดูแลลูกค้ารังวัดอยู่แล้ว (ไม่แยก OA ใหม่)
var LINE_OA_URL = 'https://line.me/R/ti/p/@716lffzt';
// เบอร์โทร/ที่อยู่บริษัท — ใช้ชุดเดียวกับที่พิมพ์อยู่บนเอกสารของบริษัทอยู่แล้ว แก้ตรงนี้ถ้าเปลี่ยน
var COMPANY_NAME = 'บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด';
var COMPANY_TEL = '02-162-0405';
var COMPANY_TEL_ALT = '084-915-8601';
var COMPANY_ADDRESS = '121/124 หมู่ที่ 4 ตำบลบางเมือง อำเภอเมืองสมุทรปราการ จังหวัดสมุทรปราการ 10270';

var TYPE_LABEL = { sell: 'ฝากขาย', rent: 'ฝากเช่า', survey_first: 'แนะนำรังวัดก่อนขาย' };

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtBaht(n) {
  return '฿' + Number(n || 0).toLocaleString('en-US');
}
function telHref(t) { return 'tel:' + String(t).replace(/[^0-9+]/g, ''); }

// "อัปเดตเมื่อ..." — ผู้ซื้อที่ดินให้ความสำคัญกับความสดของประกาศมาก
// ประกาศที่ค้างหลายเดือนมักขายไปแล้วหรือราคาเปลี่ยน การบอกวันที่ตรงๆ ช่วยสร้างความน่าเชื่อถือ
function fmtAgo(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  if (isNaN(d)) return '';
  var days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'อัปเดตวันนี้';
  if (days === 1) return 'อัปเดตเมื่อวาน';
  if (days < 31) return 'อัปเดต ' + days + ' วันที่แล้ว';
  return 'อัปเดต ' + d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ---------- การ์ดแปลงที่ดิน ----------
// ต่างจากประกาศอสังหาฯ ทั่วไปตรงที่มีปุ่มติดต่อ "ในการ์ดทุกใบ" — ผู้สนใจไม่ต้องเลื่อนกลับไปหาเบอร์
// และป้าย "รังวัดยืนยันแล้ว" อยู่บนรูปเสมอ เพราะนั่นคือสิ่งเดียวที่ประกาศเจ้าอื่นให้ไม่ได้
function cardHtml(l, i) {
  var photo = (l.photos && l.photos[0])
    ? '<img class="lc-photo" src="' + esc(l.photos[0]) + '" alt="' + esc(l.parcelInfo || 'ที่ดิน') + '" loading="lazy">'
    : '<div class="lc-photo lc-photo-empty"><span>ยังไม่มีรูปประกอบ</span></div>';

  var price = l.estValue > 0
    ? '<div class="lc-price">' + fmtBaht(l.estValue) + '</div>'
    : '<div class="lc-price lc-price-tbd">ราคาติดต่อสอบถาม</div>';

  var blurb = l.blurb ? '<div class="lc-blurb">' + esc(l.blurb) + '</div>' : '';
  var ago = fmtAgo(l.updatedAt);
  var agoHtml = ago ? '<div class="lc-ago">' + esc(ago) + '</div>' : '';
  var pcount = (l.photos || []).length;
  var pcountHtml = pcount > 1 ? '<span class="lc-pcount">📷 ' + pcount + '</span>' : '';

  return '' +
    '<article class="lc" style="animation-delay:' + (Math.min(i, 8) * 0.07) + 's">' +
      '<div class="lc-media">' + photo +
        '<div class="lc-chips">' +
          '<span class="lc-chip lc-chip-type">' + esc(TYPE_LABEL[l.type] || 'ฝากขาย') + '</span>' +
          '<span class="lc-chip lc-chip-ok">✓ รังวัดยืนยันแล้ว</span>' +
        '</div>' + pcountHtml +
      '</div>' +
      '<div class="lc-body">' +
        price +
        '<h3 class="lc-title">📍 ' + esc(l.parcelInfo || 'ที่ดินแปลงหนึ่ง') + '</h3>' +
        blurb + agoHtml +
        '<div class="lc-actions">' +
          '<a class="lc-btn lc-btn-line" href="' + esc(LINE_OA_URL) + '" target="_blank" rel="noopener" data-track="line">💬 ทักไลน์</a>' +
          '<a class="lc-btn lc-btn-tel" href="' + telHref(COMPANY_TEL) + '" data-track="tel">📞 โทรสอบถาม</a>' +
        '</div>' +
      '</div>' +
    '</article>';
}

// ปุ่มติดต่อในการ์ดถูกสร้างหลังโหลดข้อมูล จึงผูกอีเวนต์ที่ระดับ container ทีเดียว (event delegation)
// แทนที่จะไล่ผูกทีละปุ่ม — ได้ผลกับการ์ดที่เพิ่งสร้างเสมอโดยไม่ต้องผูกซ้ำ
function setupCardTracking(grid) {
  grid.addEventListener('click', function (e) {
    var a = e.target.closest('[data-track]');
    if (!a) return;
    if (a.getAttribute('data-track') === 'line') { njTrackInternal('line_click'); njTrack('Contact', { method: 'line', from: 'listing_card' }); }
    else { njTrackInternal('tel_click'); njTrack('Contact', { method: 'phone', from: 'listing_card' }); }
  });
}

function loadListings() {
  var grid = document.getElementById('listing-grid');
  var count = document.getElementById('listing-count');
  setupCardTracking(grid);

  fetch(NJ_API_BASE + '/api/public/listings')
    .then(function (r) { if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ'); return r.json(); })
    .then(function (data) {
      var listings = data.listings || [];
      if (count) count.textContent = listings.length ? listings.length + ' แปลง' : '';
      if (!listings.length) {
        // ยังไม่มีแปลงประกาศ = คนที่อุตส่าห์เข้ามาถึงตรงนี้จะเจอทางตัน
        // เปลี่ยนเป็นข้อเสนอให้ฝากขายแทน — คนที่สนใจ "ที่ดิน" มักเป็นเจ้าของที่ดินเองด้วย
        grid.innerHTML =
          '<div class="lc-empty">' +
            '<div class="lc-empty-icon">🌱</div>' +
            '<div class="lc-empty-title">แปลงชุดแรกกำลังอยู่ระหว่างรังวัดยืนยันเขต</div>' +
            '<div class="lc-empty-text">เราจะไม่ลงประกาศแปลงใดจนกว่าจะรังวัดยืนยันเขตจริงเสร็จ และได้รับความยินยอมจากเจ้าของที่ดินแล้ว — ' +
              'ทักไลน์ไว้เพื่อให้เราแจ้งทันทีที่แปลงใหม่เปิดขาย หรือถ้าคุณมีที่ดินอยากขาย ฝากขายกับเราได้ฟรี</div>' +
            '<div class="lc-empty-btns">' +
              '<a class="lc-btn lc-btn-line" href="' + esc(LINE_OA_URL) + '" target="_blank" rel="noopener" data-track="line">💬 แจ้งเตือนแปลงใหม่ทางไลน์</a>' +
              '<a class="lc-btn lc-btn-primary" href="consign.html">ฝากขายที่ดินฟรี →</a>' +
            '</div>' +
          '</div>';
        return;
      }
      grid.innerHTML = listings.map(function (l, i) { return cardHtml(l, i); }).join('');
    })
    .catch(function () {
      grid.innerHTML = '<div class="lc-empty"><div class="lc-empty-title">ไม่สามารถโหลดรายการที่ดินได้ในขณะนี้</div>' +
        '<div class="lc-empty-text">กรุณาลองใหม่อีกครั้ง หรือติดต่อเราโดยตรงที่ ' + esc(COMPANY_TEL) + '</div></div>';
    });
}

function setupContact() {
  var lineBtn = document.getElementById('line-cta'), telBtn = document.getElementById('tel-cta');
  lineBtn.href = LINE_OA_URL;
  telBtn.href = telHref(COMPANY_TEL);
  telBtn.textContent = '📞 ' + COMPANY_TEL;
  document.getElementById('contact-name').textContent = COMPANY_NAME;
  document.getElementById('contact-address').textContent = COMPANY_ADDRESS;
  lineBtn.addEventListener('click', function () { njTrackInternal('line_click'); njTrack('Contact', { method: 'line', from: 'footer' }); });
  telBtn.addEventListener('click', function () { njTrackInternal('tel_click'); njTrack('Contact', { method: 'phone', from: 'footer' }); });
}

// เผยเนื้อหาแบบ fade-up ทีละส่วนตอนเลื่อนจอมาเห็น — เบากว่าไลบรารีอนิเมชันเต็มรูปแบบ ไม่มี dependency
// กันเหนียว 3 ชั้น กันเนื้อหาค้างมองไม่เห็นเด็ดขาด (โดยเฉพาะ hero ที่อยู่ในจอตั้งแต่โหลดหน้า):
//   1) เช็ค getBoundingClientRect ทันทีสำหรับส่วนที่อยู่ในจอตั้งแต่แรกอยู่แล้ว ไม่ต้องรอ IntersectionObserver
//   2) IntersectionObserver ปกติสำหรับส่วนที่อยู่ใต้จอ รอเลื่อนมาเห็น
//   3) เผื่อ IntersectionObserver ไม่ทำงานเลยด้วยเหตุผลใดก็ตาม (เช่นแท็บพื้นหลังโดน throttle) — บังคับเผยทั้งหมดหลัง 2.5 วิ
function setupReveal() {
  var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  function isOnScreen(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }
  els.forEach(function (el) { if (isOnScreen(el)) el.classList.add('in'); });
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (el) { el.classList.add('in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  els.forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });
  setTimeout(function () { els.forEach(function (el) { el.classList.add('in'); }); }, 2500);
}

document.getElementById('year').textContent = new Date().getFullYear() + 543; // ปี พ.ศ.
setupContact();
setupReveal();
loadListings();
njTrackInternal('pageview');
