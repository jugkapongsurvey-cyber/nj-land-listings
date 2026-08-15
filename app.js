// เติม class .js ให้ <html> ก่อนอื่นใด — CSS ใช้ class นี้ตัดสินว่าจะซ่อน [data-reveal] รอเลื่อนจอไหม
// ถ้า JS พังตอนไหนก่อนบรรทัดนี้ก็ยังไม่มี .js เนื้อหาจึงยังเห็นได้ปกติ (progressive enhancement)
document.documentElement.classList.add('js');

// ---------- ตั้งค่า ----------
// ที่อยู่ระบบงานรังวัด NJ Survey System — แหล่งข้อมูลแปลงที่ดิน (ดึงสดทุกครั้งที่เปิดหน้านี้)
var API_BASE = 'https://nj-survey-system.onrender.com';

// TODO: ใส่ LINE OA ID จริงของบริษัท (หาได้จากหน้าจัดการ LINE Official Account Manager)
var LINE_OA_URL = 'https://line.me/R/ti/p/@YOUR_LINE_ID';
// เบอร์โทร/ที่อยู่บริษัท — ใช้ชุดเดียวกับที่พิมพ์อยู่บนเอกสารของบริษัทอยู่แล้ว แก้ตรงนี้ถ้าเปลี่ยน
var COMPANY_NAME = 'บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด';
var COMPANY_TEL = '084-915-8601';
var COMPANY_ADDRESS = '121/124 หมู่ที่ 4 ตำบลบางเมือง อำเภอเมืองสมุทรปราการ จังหวัดสมุทรปราการ 10270';

var TYPE_LABEL = { sell: 'ฝากขาย', rent: 'ฝากเช่า', survey_first: 'แนะนำรังวัดก่อนขาย' };

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtBaht(n) {
  return '฿' + Number(n || 0).toLocaleString('en-US');
}

function cardHtml(l, i) {
  var photo = (l.photos && l.photos[0])
    ? '<img class="card-photo" src="' + esc(l.photos[0]) + '" alt="' + esc(l.parcelInfo || 'ที่ดิน') + '" loading="lazy">'
    : '<div class="card-photo-empty">ยังไม่มีรูปประกอบ</div>';
  var price = l.estValue > 0
    ? '<div class="card-price">' + fmtBaht(l.estValue) + '</div>'
    : '<div class="card-price tbd">ราคาติดต่อสอบถาม</div>';
  var blurb = l.blurb ? '<div class="card-blurb">' + esc(l.blurb) + '</div>' : '';
  var delay = Math.min(i, 8) * 0.08;
  return '<div class="card" style="animation-delay:' + delay + 's">' + photo +
    '<div class="card-body">' +
      '<div class="card-top"><span class="card-type">' + esc(TYPE_LABEL[l.type] || 'ฝากขาย') + '</span><span class="card-verified">✓ รังวัดยืนยันแล้ว</span></div>' +
      '<div class="card-parcel">' + esc(l.parcelInfo || 'ที่ดินแปลงหนึ่ง') + '</div>' +
      blurb + price +
    '</div>' +
  '</div>';
}

function loadListings() {
  var grid = document.getElementById('listing-grid');
  fetch(API_BASE + '/api/public/listings')
    .then(function (r) { if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ'); return r.json(); })
    .then(function (data) {
      var listings = data.listings || [];
      if (!listings.length) {
        grid.innerHTML = '<div class="listing-empty">ยังไม่มีแปลงที่ดินประกาศในขณะนี้ — ทักไลน์หรือโทรสอบถามแปลงใหม่ๆ ที่กำลังจะเปิดขายได้เลย</div>';
        return;
      }
      grid.innerHTML = listings.map(function (l, i) { return cardHtml(l, i); }).join('');
    })
    .catch(function () {
      grid.innerHTML = '<div class="listing-empty">ไม่สามารถโหลดรายการที่ดินได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือติดต่อเราโดยตรง</div>';
    });
}

function setupContact() {
  document.getElementById('line-cta').href = LINE_OA_URL;
  document.getElementById('tel-cta').href = 'tel:' + COMPANY_TEL.replace(/-/g, '');
  document.getElementById('tel-cta').textContent = '📞 ' + COMPANY_TEL;
  document.getElementById('contact-name').textContent = COMPANY_NAME;
  document.getElementById('contact-address').textContent = COMPANY_ADDRESS;
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
