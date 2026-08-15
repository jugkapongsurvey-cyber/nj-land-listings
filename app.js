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

function cardHtml(l) {
  var photo = (l.photos && l.photos[0])
    ? '<img class="card-photo" src="' + esc(l.photos[0]) + '" alt="' + esc(l.parcelInfo || 'ที่ดิน') + '" loading="lazy">'
    : '<div class="card-photo-empty">ยังไม่มีรูปประกอบ</div>';
  var price = l.estValue > 0
    ? '<div class="card-price">' + fmtBaht(l.estValue) + '</div>'
    : '<div class="card-price tbd">ราคาติดต่อสอบถาม</div>';
  var blurb = l.blurb ? '<div class="card-blurb">' + esc(l.blurb) + '</div>' : '';
  return '<div class="card">' + photo +
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
      grid.innerHTML = listings.map(cardHtml).join('');
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

document.getElementById('year').textContent = new Date().getFullYear() + 543; // ปี พ.ศ.
setupContact();
loadListings();
