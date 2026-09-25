/* ทำเนียบบริษัทพันธมิตร (partners.html) — หน้ารวมผู้ให้บริการหลังซื้อที่ดิน
 *
 * ⚠️ กติกาที่ห้ามผ่อน
 * 1. รายชื่อบริษัทมาจาก GET /api/public/partners เท่านั้น — ห้ามพิมพ์ชื่อบริษัทไว้ในหน้า
 *    (กติกาข้อ 4 และ 9 ของเว็บ · บริษัทสมมติบนเว็บจริง = โกหกลูกค้า)
 * 2. การ์ดวาดด้วย NJServices.partnerCard ตัวเดียวกับหน้าแปลง — ห้ามก๊อปตัววาดการ์ดมาไว้ที่นี่
 * 3. ชื่อบริการอ่านจาก NJServices.thOf · รายการจังหวัดสร้างจากบริษัทที่มีอยู่จริง ไม่ใช่ 77 จังหวัด
 * 4. ไม่มีเบอร์โทรของบริษัทบนหน้านี้โดยตั้งใจ — ลูกค้าขอใบเสนอราคาผ่านฟอร์มของเรา
 *    แล้วได้รหัสอ้างอิงไปแจ้งบริษัท (ราคาเท่าติดต่อเอง)
 * 5. ทำเนียบปิดอยู่/โหลดไม่ได้ = บอกตรงๆ แล้วยังใช้ฟอร์มขอบริการได้ตามเดิม (ทีมงานเลือกบริษัทให้)
 * 6. ค่าจาก URL (?svc= ?province=) ใช้ได้เฉพาะค่าที่มีอยู่จริงในข้อมูล
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function qs(k) {
    try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; }
  }

  // บริการที่มีบริษัทอยู่จริง เรียงตามลำดับใน NJServices.LIST (ลำดับเดียวกับฟอร์ม)
  function servicesOf(partners) {
    var seen = {};
    partners.forEach(function (p) { (p.services || []).forEach(function (s) { seen[s] = true; }); });
    var order = ((window.NJServices && NJServices.LIST) || []).map(function (x) { return x.key; });
    return Object.keys(seen).sort(function (a, b) {
      var ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }
  function provincesOf(partners) {
    var seen = {};
    partners.forEach(function (p) { (p.provinces || []).forEach(function (v) { if (v) seen[v] = true; }); });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b, 'th'); });
  }
  function servesProvince(p, prov) {
    return !prov || p.allProvinces || (p.provinces || []).indexOf(prov) >= 0;
  }

  function boot() {
    var root = document.getElementById('pd-root');
    var formHost = document.getElementById('pd-form');
    if (!root || !window.NJServices) return;
    var base = window.NJ_API_BASE || 'https://app.njteedinsure.com';
    // ชื่อบริการจากฟอร์ม (NJServices.LIST) ก่อน · ไม่มีค่อยใช้ชื่อที่เซิร์ฟเวอร์ส่งมากับทำเนียบ
    function th(s) { return (NJServices.LIST.some(function (x) { return x.key === s; }) && NJServices.thOf(s)) || ((data && data.services) || {})[s] || s; }

    // ฟอร์มขอบริการอยู่ท้ายหน้าเสมอ — ใช้ได้แม้ทำเนียบจะปิดอยู่
    var handle = formHost ? NJServices.mount(formHost, { ref: 'partners' }) : null;

    var st = { svc: '', prov: '', picked: {} }; // picked[svc] = partnerId
    var data = null;

    function say(html) { root.innerHTML = '<div class="pd-empty">' + html + '</div>'; }

    function draw() {
      var partners = (data.partners || []).filter(function (p) { return servesProvince(p, st.prov); });
      var all = servicesOf(data.partners || []);
      var svcs = st.svc ? [st.svc] : all;
      var provs = provincesOf(data.partners || []);

      var chips = '<div class="pd-chips" role="group" aria-label="เลือกบริการ">' +
        [''].concat(all).map(function (s) {
          var on = st.svc === s;
          return '<button type="button" class="pd-chip' + (on ? ' on' : '') + '" data-pd-svc="' + esc(s) + '" aria-pressed="' + on + '">' +
            esc(s ? th(s) : 'ทุกบริการ') + '</button>';
        }).join('') + '</div>';
      var sel = provs.length ? '<label class="pd-prov"><span>พื้นที่</span><select data-pd-prov>' +
        '<option value="">ทุกจังหวัด</option>' +
        provs.map(function (v) { return '<option value="' + esc(v) + '"' + (st.prov === v ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('') +
        '</select></label>' : '';

      var sections = svcs.map(function (s) {
        var list = partners.filter(function (p) { return (p.services || []).indexOf(s) >= 0; });
        if (!list.length) return '';
        return '<section class="pd-sec"><h2>' + esc(th(s)) + ' <small>' + list.length + ' ราย</small></h2>' +
          '<div class="njsv-cards">' + list.map(function (p) {
            return NJServices.partnerCard(p, s, st.picked[s] === p.partnerId);
          }).join('') + '</div></section>';
      }).join('');

      root.innerHTML = '<div class="pd-bar">' + chips + sel + '</div>' +
        (sections || '<div class="pd-empty">ยังไม่มีบริษัทพันธมิตรที่รับงาน' + (st.prov ? 'ใน' + esc(st.prov) : 'ตามที่เลือก') +
          ' — ติ๊กบริการในฟอร์มด้านล่าง ทีมงานจะจัดหาบริษัทที่ผ่านการตรวจให้</div>') +
        '<p class="njsv-disclose"><b>เปิดเผยให้ทราบ:</b> ' + esc(data.disclosure || '') + '</p>';
    }

    root.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target : null;
      if (!t) return;
      var chip = t.closest('[data-pd-svc]');
      if (chip) { st.svc = chip.getAttribute('data-pd-svc'); draw(); return; }
      var b = t.closest('[data-njsv-pick]');
      if (b) {
        var svc = b.getAttribute('data-njsv-pick'), id = b.getAttribute('data-id');
        if (handle && handle.pick && handle.pick(svc, id)) {
          st.picked[svc] = id;
          draw();
          formHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
    root.addEventListener('change', function (e) {
      if (e.target && e.target.hasAttribute('data-pd-prov')) { st.prov = e.target.value; draw(); }
    });

    say('กำลังโหลดรายชื่อบริษัทพันธมิตร…');
    NJServices.loadDir(base, '', function (d) {
      if (!d || d.off) {
        say('รายชื่อบริษัทพันธมิตรยังไม่เปิดให้ดูบนเว็บ — ติ๊กบริการที่ต้องการในฟอร์มด้านล่าง ' +
          'ทีมงานจะส่งข้อมูลแปลงให้บริษัทที่ผ่านการตรวจเอกสารแล้ว และรวมใบเสนอราคามาให้เทียบ');
        return;
      }
      if (!(d.partners || []).length) {
        say('ยังไม่มีบริษัทพันธมิตรที่ขึ้นทะเบียนบนเว็บ — ติ๊กบริการในฟอร์มด้านล่าง ทีมงานจะจัดหาบริษัทให้');
        return;
      }
      data = d;
      var all = servicesOf(d.partners), provs = provincesOf(d.partners);
      var qsSvc = qs('svc'), qsProv = qs('province');
      if (all.indexOf(qsSvc) >= 0) st.svc = qsSvc;
      if (provs.indexOf(qsProv) >= 0) st.prov = qsProv;
      draw();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
