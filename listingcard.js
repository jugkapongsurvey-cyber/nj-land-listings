/* การ์ดแปลงที่ดิน — ตัวเรนเดอร์กลาง ใช้ร่วมกันทั้งหน้าแรก (marketplace.js) และหน้ารวมประกาศ (listings.js)
 *
 * ⚠️ กติกาข้อเดียวที่ห้ามผ่อนในไฟล์นี้: แสดงได้เฉพาะสิ่งที่ API ส่งมาจริงเท่านั้น
 * ห้ามมีแปลงตัวอย่าง ห้ามเติมข้อความแทนช่องที่ไม่มีข้อมูล (เช่น "มีทางเข้าออก", "โฉนด",
 * จำนวนรูปขั้นต่ำ) เพราะทุกบรรทัดบนการ์ดนี้ผู้ซื้อเข้าใจว่าเป็นข้อเท็จจริงที่ผ่านการรังวัดมาแล้ว
 * — ซึ่งเป็นสิ่งเดียวที่แบรนด์นี้ขาย
 *
 * ทำไมต้องแยกไฟล์: เดิม card() อยู่ใน IIFE ของ marketplace.js หน้าเดียว พอมีหน้ารวมประกาศเพิ่ม
 * ทางเลือกคือก๊อปตัวเรนเดอร์ไปอีกชุด ซึ่งแปลว่ากติกาข้างบนจะมีสองที่ให้ลืมแก้ ห้ามทำแบบนั้น
 */
(function () {
  'use strict';

  var LINE = 'https://line.me/R/ti/p/@716lffzt';
  var FB = window.NJ_MESSENGER_URL || 'https://m.me/NJTeeDinSure';   // ตั้งค่าไว้ใน analytics.js
  var TEL = 'tel:021620405';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function money(value) {
    if (!Number(value)) return 'ราคาติดต่อสอบถาม';
    return '฿' + Number(value).toLocaleString('th-TH');
  }
  function num(value) { return Number(value || 0).toLocaleString('th-TH'); }
  function ago(iso) {
    var d = new Date(iso), days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (!iso || isNaN(d)) return '';
    if (days <= 0) return 'อัปเดตวันนี้';
    if (days === 1) return 'อัปเดตเมื่อวาน';
    if (days < 31) return 'อัปเดต ' + days + ' วันที่แล้ว';
    return 'อัปเดต ' + d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  }
  // ตร.ว. → "2-1-50 ไร่" · ใช้แสดงเนื้อที่ให้อ่านแบบที่คนไทยใช้จริง
  // ไม่มีเนื้อที่คืนค่าว่าง (ไม่ใช่ "0-0-0") — ผู้เรียกต้องซ่อนบรรทัดนั้นไปเลย
  function areaTh(totalWa) {
    var w = Number(totalWa || 0);
    if (!(w > 0)) return '';
    var rai = Math.floor(w / 400), ngan = Math.floor((w % 400) / 100);
    var wa = Math.round((w % 100) * 100) / 100;
    return rai + '-' + ngan + '-' + wa + ' ไร่';
  }

  function normalize(item, index) {
    return {
      id: item.id || ('land-' + index),
      type: item.type === 'rent' ? 'rent' : 'sell',
      parcelInfo: item.parcelInfo || '',
      estValue: Number(item.estValue || 0),
      blurb: item.blurb || '',
      photos: Array.isArray(item.photos) ? item.photos : [],
      updatedAt: item.updatedAt || '',
      // ระดับความน่าเชื่อถือจาก API — ไม่มีข้อมูล = ระดับ 1 เสมอ ห้ามเดาเป็น 2
      tier: item.tier === 2 ? 2 : 1,
      // เนื้อที่ + ราคาต่อหน่วย เซิร์ฟเวอร์คำนวณมาให้แล้ว ห้ามหารเองในเบราว์เซอร์
      // (หารเองเมื่อไหร่ หน้ารวมกับหน้ารายละเอียดจะได้ตัวเลขคนละค่าเมื่อปัดเศษไม่เหมือนกัน)
      totalWa: Number(item.totalWa || 0),
      pricePerWa: Number(item.pricePerWa || 0),
      pricePerRai: Number(item.pricePerRai || 0),
      land: item.land || null
    };
  }

  function card(item) {
    var media = item.photos[0]
      ? '<img src="' + esc(item.photos[0]) + '" alt="' + esc(item.parcelInfo || 'แปลงที่ดิน') + '" loading="lazy">'
      : '<div class="fallback-land" aria-hidden="true"></div>';
    // นับรูปตามจริง ไม่มีรูปก็ไม่ต้องขึ้นตัวเลข
    var count = item.photos.length > 1 ? '<span class="photo-count">▣ ' + item.photos.length + '</span>' : '';
    // คำโปรยมาจากที่ทีมงานเขียนเองในระบบ ไม่มีก็เว้นไว้
    var facts = item.blurb ? '<div class="card-facts"><span>' + esc(item.blurb) + '</span></div>' : '';
    // เนื้อที่ + ราคาต่อตารางวา — เพิ่งเริ่มมีใน API (ก่อนหน้านี้ไม่ส่งมา จึงเคยถูกถอดออกจากการ์ด)
    // แสดงเฉพาะแปลงที่มีค่าจริง · แปลงที่ยังไม่รู้เนื้อที่จะไม่มีสองบรรทัดนี้ ไม่ใช่ขึ้นเป็น 0
    var bits = [];
    var a = areaTh(item.totalWa);
    if (a) bits.push(esc(a));
    if (item.pricePerWa > 0) bits.push('฿' + num(item.pricePerWa) + '/ตร.ว.');
    var meta = bits.length ? '<div class="card-meta">' + bits.join(' · ') + '</div>' : '';
    var when = ago(item.updatedAt);
    var href = 'land.html?id=' + encodeURIComponent(item.id);
    return '<article class="land-card" data-href="' + esc(href) + '" data-id="' + esc(item.id) + '">' +
      '<div class="card-media">' + media +
        '<div class="card-tags"><span>' + (item.type === 'rent' ? 'ให้เช่า' : 'ขาย') + '</span>' +
          (item.tier === 2
            ? '<span class="verified">✓ รังวัดยืนยันแล้ว</span>'
            : '<span class="basic">◐ ข้อมูลเบื้องต้น</span>') + '</div>' +
        count +
      '</div>' +
      '<div class="card-body">' +
        '<div><span class="card-price">' + money(item.estValue) + '</span></div>' +
        '<h3 class="card-title"><a href="' + esc(href) + '">' + esc(item.parcelInfo || 'แปลงที่ดิน') + '</a></h3>' +
        meta +
        facts +
        '<div class="card-agent">' +
          '<span class="agent-avatar">NJ</span>' +
          '<div><b>ทีมที่ดินชัวร์</b>' + (when ? '<small>' + esc(when) + '</small>' : '') + '</div>' +
          '<span class="contact-mini">' +
            '<a href="' + LINE + '" target="_blank" rel="noopener" class="line" data-contact="line" aria-label="ติดต่อทางไลน์">●</a>' +
            '<a href="' + FB + '" target="_blank" rel="noopener" class="fb" data-contact="messenger" aria-label="ติดต่อทางเมสเซนเจอร์">f</a>' +
            '<a href="' + TEL + '" data-contact="tel" aria-label="โทรสอบถาม">☎</a>' +
          '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  // ยังไม่มีแปลงประกาศ = คนที่เข้ามาถึงตรงนี้จะเจอทางตัน
  // เปลี่ยนเป็นข้อเสนอที่ใช้ได้จริงแทน — คนที่สนใจตลาดที่ดินจำนวนมากคือเจ้าของที่ดินเอง
  function emptyHtml(isFilter) {
    if (isFilter) {
      // ค้นแล้วไม่เจอ = จังหวะที่รู้โจทย์ของผู้ซื้อชัดที่สุดในทั้งเว็บ
      // ปล่อยให้จบแค่ "ลองเปลี่ยนคำค้น" คือทิ้งลีดที่บอกความต้องการมาแล้วเต็มๆ
      return '<div class="empty-result"><b>ยังไม่พบแปลงที่ตรงกับการค้นหา</b>' +
        'ลองเปลี่ยนทำเลหรือช่วงราคา แล้วค้นหาอีกครั้ง — หรือฝากโจทย์ไว้ให้ทีมช่างรังวัดของเราหาให้ฟรี' +
        '<span class="empty-actions">' +
          '<a class="post-btn" href="wanted.html">ฝากหาที่ดินฟรี →</a>' +
        '</span>' +
      '</div>';
    }
    return '<div class="empty-result">' +
      '<b>แปลงชุดแรกกำลังอยู่ระหว่างรังวัดยืนยันเขต</b>' +
      'เราจะไม่ลงประกาศแปลงใดจนกว่าจะรังวัดยืนยันเขตจริงเสร็จ และได้รับความยินยอมจากเจ้าของที่ดินแล้ว ' +
      'ระหว่างนี้บอกโจทย์ที่คุณกำลังหาไว้ได้เลย ทีมช่างรังวัดของเราจะหาแปลงที่ตรงเงื่อนไขให้' +
      '<span class="empty-actions">' +
        '<a class="post-btn" href="wanted.html">ฝากหาที่ดินฟรี →</a>' +
        '<a class="outline-btn" href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">แจ้งเตือนแปลงใหม่ทางไลน์</a>' +
        '<a class="outline-btn" href="' + FB + '" target="_blank" rel="noopener" data-contact="messenger">ทักทางเมสเซนเจอร์</a>' +
        '<a class="outline-btn" href="consign.html">มีที่ดินอยากขาย?</a>' +
      '</span>' +
    '</div>';
  }

  function loadFailedHtml() {
    // โหลดไม่ได้ ≠ ไม่มีแปลง — ต้องบอกตามจริงและให้ช่องทางติดต่อ ไม่ใช่แสดงว่าว่างเปล่า
    return '<div class="empty-result"><b>ตอนนี้โหลดรายการที่ดินไม่สำเร็จ</b>' +
      'กรุณาลองใหม่อีกครั้ง หรือโทรสอบถามได้ที่ 02-162-0405' +
      '<span class="empty-actions"><a class="outline-btn" href="' + TEL + '" data-contact="tel">โทร 02-162-0405</a></span></div>';
  }

  // ดึงรายการสด · ผู้เรียกต้องจัดการทั้งกรณีสำเร็จและล้มเหลว (สองกรณีนี้ห้ามแสดงเหมือนกัน)
  function fetchListings() {
    var base = window.NJ_API_BASE || 'https://nj-survey-system.onrender.com';
    return fetch(base + '/api/public/listings')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) { return (data.listings || []).map(normalize); });
  }

  // แมปช่องทาง → ชื่อเหตุการณ์ที่จะนับ · เพิ่มช่องทางใหม่ = เพิ่มบรรทัดเดียวตรงนี้
  var CONTACT_TRACK = { line: ['line_click', 'line'], messenger: ['messenger_click', 'messenger'], tel: ['tel_click', 'phone'] };
  // ปุ่มติดต่อบนการ์ดสร้างหลังโหลดข้อมูล จึงผูก listener ที่ container ทีเดียว
  function bindGrid(grid, from) {
    if (!grid) return;
    grid.addEventListener('click', function (e) {
      var a = e.target.closest('[data-contact]');
      if (!a) {
        // คลิกที่ตัวการ์ด (ไม่ใช่ปุ่มติดต่อ) = เข้าหน้ารายละเอียด
        if (e.target.closest('a')) return;   // ลิงก์ชื่อแปลงทำงานเองอยู่แล้ว
        var cardEl = e.target.closest('.land-card[data-href]');
        if (cardEl) location.href = cardEl.dataset.href;
        return;
      }
      var t = CONTACT_TRACK[a.getAttribute('data-contact')];
      if (!t) return;
      if (window.njTrackInternal) window.njTrackInternal(t[0]);
      if (window.njTrack) window.njTrack('Contact', { method: t[1], from: from || 'listing_card' });
    });
  }

  window.NJListing = {
    LINE: LINE, FB: FB, TEL: TEL,
    esc: esc, money: money, num: num, ago: ago, areaTh: areaTh,
    normalize: normalize, card: card,
    emptyHtml: emptyHtml, loadFailedHtml: loadFailedHtml,
    fetchListings: fetchListings, bindGrid: bindGrid
  };
})();
