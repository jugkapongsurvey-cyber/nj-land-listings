// ช่องกรอก "ที่ตั้ง · เนื้อที่ · ราคา" ของฟอร์มฝากขาย
//
// เดิมทั้งสามอย่างนี้รวมอยู่ในช่องข้อความช่องเดียว ("บางเสาธง สมุทรปราการ ประมาณ 2 ไร่")
// ทำให้ทีมขายต้องมานั่งแกะเองว่าอยู่อำเภอไหน กี่ไร่ และเจ้าของบอกราคาต่อไร่หรือราคารวม
// ไฟล์นี้แยกออกเป็นช่องจริง ๆ แล้วคำนวณให้เห็นทันทีขณะพิมพ์
//
// หน่วยที่ดินไทย: 1 ไร่ = 4 งาน = 400 ตารางวา (1 ตารางวา = 4 ตร.ม.)

(function (global) {
  'use strict';

  var WA_PER_RAI = 400;
  var WA_PER_NGAN = 100;
  var SQM_PER_WA = 4;

  // ---------- ตัวช่วยตัวเลข ----------
  // ผู้ใช้พิมพ์ "2,500" หรือ "2500 " หรือเว้นว่าง — เก็บเฉพาะตัวเลขและจุดทศนิยม
  // ค่าติดลบตีเป็น 0 ไม่ใช่ตัดเครื่องหมายทิ้ง — ไม่งั้น "-5" จะกลายเป็น 5 เงียบๆ ซึ่งไม่ใช่สิ่งที่คนกรอกหมายถึง
  function num(v) {
    var s = String(v == null ? '' : v);
    if (s.indexOf('-') >= 0) return 0;
    var n = parseFloat(s.replace(/[^0-9.]/g, ''));
    return isFinite(n) && n > 0 ? n : 0;
  }
  function fmt(n) {
    return Math.round(n).toLocaleString('en-US');
  }
  // อ่านง่ายกว่าเลขยาว ๆ เวลาเป็นหลักล้าน — ใช้ประกอบ ไม่ใช่แทนตัวเลขเต็ม
  function words(n) {
    if (n >= 1e6) {
      var m = n / 1e6;
      return '≈ ' + (m >= 100 ? Math.round(m) : m.toFixed(m >= 10 ? 1 : 2).replace(/\.?0+$/, '')) + ' ล้านบาท';
    }
    if (n >= 1e5) return '≈ ' + Math.round(n / 1e4) / 10 + ' แสนบาท';
    return '';
  }

  // ---------- คณิตศาสตร์เนื้อที่และราคา (แยกออกมาเพื่อทดสอบได้โดยไม่ต้องมี DOM) ----------
  function toWa(rai, ngan, wa) {
    return num(rai) * WA_PER_RAI + num(ngan) * WA_PER_NGAN + num(wa);
  }
  // 950 ตร.ว. → {rai:2, ngan:1, wa:50} · ใช้แสดงกลับให้เจ้าของยืนยันว่าตรงกับที่เข้าใจ
  function fromWa(totalWa) {
    var w = Math.max(0, totalWa);
    var rai = Math.floor(w / WA_PER_RAI); w -= rai * WA_PER_RAI;
    var ngan = Math.floor(w / WA_PER_NGAN); w -= ngan * WA_PER_NGAN;
    return { rai: rai, ngan: ngan, wa: Math.round(w * 100) / 100 };
  }
  function areaText(totalWa) {
    if (totalWa <= 0) return '';
    var a = fromWa(totalWa);
    return a.rai + '-' + a.ngan + '-' + a.wa + ' ไร่';
  }
  // คืนราคารวมทั้งแปลง · unit: 'wa' = บาท/ตร.ว. · 'rai' = บาท/ไร่ · 'total' = ราคารวมอยู่แล้ว
  function totalPrice(unit, unitPrice, totalWa) {
    var p = num(unitPrice);
    if (p <= 0) return 0;
    if (unit === 'total') return p;
    if (totalWa <= 0) return 0;
    if (unit === 'rai') return p * (totalWa / WA_PER_RAI);
    return p * totalWa;
  }

  var calc = {
    WA_PER_RAI: WA_PER_RAI, WA_PER_NGAN: WA_PER_NGAN, SQM_PER_WA: SQM_PER_WA,
    num: num, fmt: fmt, toWa: toWa, fromWa: fromWa, areaText: areaText, totalPrice: totalPrice
  };

  // ---------- ที่ตั้ง: จังหวัด → อำเภอ → ตำบล ----------
  // ข้อมูลอยู่ใน data/thai-admin.json (โครงสร้าง array ซ้อน ดู data/build-admin.js)
  // โหลดครั้งเดียวแบบไม่บล็อกหน้า
  //
  // ใช้ input + datalist ไม่ใช่ select — พิมพ์ 2-3 ตัวอักษรแล้วเบราว์เซอร์กรองให้เอง
  // เร็วกว่าเลื่อนหาใน 77 จังหวัด / อำเภอบางจังหวัดเกิน 30 รายการมาก โดยเฉพาะบนมือถือ
  // และถ้าโหลดรายชื่อไม่สำเร็จ ช่องก็ยังเป็นช่องพิมพ์ธรรมดาที่กรอกเองได้ ฟอร์มไม่มีวันส่งไม่ได้
  function initAddress(opt) {
    var pEl = document.getElementById(opt.province);
    var aEl = document.getElementById(opt.amphoe);
    var tEl = document.getElementById(opt.tambon);
    var zipEl = opt.zip ? document.getElementById(opt.zip) : null;
    var noteEl = opt.note ? document.getElementById(opt.note) : null;
    if (!pEl || !aEl || !tEl) return null;

    var DATA = null;
    var lastP = '', lastA = '';
    function txt(el) { return String(el.value || '').trim(); }

    function fillList(id, items) {
      var dl = document.getElementById(id);
      if (!dl) return;
      dl.innerHTML = '';
      items.forEach(function (name) {
        var o = document.createElement('option');
        o.value = name;
        dl.appendChild(o);
      });
    }
    function findIn(list, name) {
      for (var i = 0; i < list.length; i++) if (list[i][0] === name) return list[i];
      return null;
    }
    function provinceRec() { return DATA ? findIn(DATA.p, txt(pEl)) : null; }
    function amphoeRec() { var p = provinceRec(); return p ? findIn(p[1], txt(aEl)) : null; }

    function note(msg) {
      if (!noteEl) return;
      if (msg) { noteEl.textContent = msg; noteEl.hidden = false; }
      else { noteEl.textContent = ''; noteEl.hidden = true; }
    }

    // ข้อความเตือนเมื่อพิมพ์ชื่อที่ไม่มีในรายชื่อ — บอกระดับที่ผิดระดับแรกที่เจอ
    function noteFor() {
      if (!DATA) return '';
      var tail = ' — ลองพิมพ์ใหม่ หรือปล่อยไว้แล้วทีมงานจะยืนยันตอนโทรกลับ';
      if (txt(pEl) && !provinceRec()) return 'ไม่พบจังหวัดนี้ในรายชื่อ' + tail;
      if (txt(aEl) && !amphoeRec()) return 'ไม่พบอำเภอนี้ในจังหวัดที่เลือก' + tail;
      var a = amphoeRec();
      if (a && txt(tEl) && !findIn(a[1], txt(tEl))) return 'ไม่พบตำบลนี้ในอำเภอที่เลือก' + tail;
      return '';
    }

    // เรียกทุกครั้งที่พิมพ์/เลือก — รีเฟรชรายการลูก ล้างค่าที่ไม่เข้าคู่แล้ว และเติมรหัสไปรษณีย์
    // showNote=false ระหว่างพิมพ์ — ไม่งั้นจะขึ้น "ไม่พบจังหวัดนี้" ตั้งแต่ตัวอักษรแรกทุกครั้ง
    function sync(showNote) {
      var p = provinceRec(), pv = p ? p[0] : '';
      if (pv !== lastP) {
        lastP = pv;
        fillList(opt.amphoeList, p ? p[1].map(function (d) { return d[0]; }) : []);
        // จังหวัดเปลี่ยน = อำเภอ/ตำบลเดิมใช้ไม่ได้แล้ว ต้องล้าง ไม่งั้นจะได้ที่อยู่ผสมข้ามจังหวัด
        aEl.value = ''; tEl.value = '';
        lastA = '';
        aEl.placeholder = p ? 'พิมพ์ค้นหา หรือแตะเพื่อเลือก' : 'เลือกจังหวัดก่อน';
      }
      var a = amphoeRec(), av = a ? a[0] : '';
      if (av !== lastA) {
        lastA = av;
        fillList(opt.tambonList, a ? a[1].map(function (t) { return t[0]; }) : []);
        tEl.value = '';
        tEl.placeholder = a ? 'พิมพ์ค้นหา หรือแตะเพื่อเลือก' : 'เลือกอำเภอก่อน';
      }
      // รหัสไปรษณีย์เติมให้อัตโนมัติจากตำบลที่เลือก — เจ้าของที่ดินส่วนใหญ่จำไม่ได้
      if (zipEl) {
        var z = '', tv = txt(tEl);
        if (a && tv) { var rec = findIn(a[1], tv); if (rec) z = rec[1] ? String(rec[1]) : ''; }
        zipEl.value = z;
      }
      // พิมพ์ชื่อที่ไม่มีในรายชื่อ = สะกดผิด หรือเป็นชื่อที่เราไม่รู้จัก
      // บอกให้รู้ แต่ไม่บล็อกการส่งฟอร์ม — ทีมงานยืนยันอีกทีตอนโทรกลับได้
      note(showNote ? noteFor() : '');
      if (opt.onChange) opt.onChange();
    }

    fetch(opt.url || 'data/thai-admin.json')
      .then(function (r) { if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ'); return r.json(); })
      .then(function (j) {
        DATA = j;
        var names = j.p.map(function (x) { return x[0]; });
        // จังหวัดที่บริษัทให้บริการอยู่จริง ยกขึ้นไว้บนสุดของรายการที่ยังไม่ได้พิมพ์กรอง
        // (คนส่วนใหญ่ที่เข้าฟอร์มนี้อยู่ในกลุ่มนี้ · พอเริ่มพิมพ์ เบราว์เซอร์กรองเองอยู่แล้ว)
        var pin = (opt.pinned || []).filter(function (n) { return names.indexOf(n) >= 0; });
        fillList(opt.provinceList, pin.concat(names.filter(function (n) { return pin.indexOf(n) < 0; })));
        sync(false);
      })
      .catch(function () {
        // ไม่ต้องทำอะไรเป็นพิเศษ — ช่องยังเป็น input ธรรมดาที่พิมพ์เองได้อยู่แล้ว
        // แค่บอกให้รู้ว่าตัวช่วยเลือกใช้ไม่ได้ จะได้ไม่นั่งรอรายการที่ไม่มีวันมา
        note('โหลดรายชื่อจังหวัดไม่สำเร็จ — พิมพ์ชื่อจังหวัด/อำเภอ/ตำบลเองได้เลย');
        aEl.placeholder = 'พิมพ์ชื่ออำเภอ/เขต';
        tEl.placeholder = 'พิมพ์ชื่อตำบล/แขวง';
      });

    // ต้องดัก input ไม่ใช่แค่ change — เลือกจาก datalist บางเบราว์เซอร์ยิงแค่ input
    // ส่วนคำเตือน "ไม่พบชื่อนี้" รอจนออกจากช่องค่อยขึ้น (change/blur) จะได้ไม่ขึ้นระหว่างพิมพ์
    [pEl, aEl, tEl].forEach(function (el) {
      el.addEventListener('input', function () { sync(false); });
      el.addEventListener('change', function () { sync(true); });
      el.addEventListener('blur', function () { sync(true); });
    });

    return {
      value: function () {
        return {
          province: txt(pEl), amphoe: txt(aEl), tambon: txt(tEl),
          zip: zipEl ? (zipEl.value || '') : ''
        };
      }
    };
  }

  // ---------- เนื้อที่ + ราคา: คำนวณสดขณะพิมพ์ ----------
  function initAreaPrice(opt) {
    var raiEl = document.getElementById(opt.rai);
    var nganEl = document.getElementById(opt.ngan);
    var waEl = document.getElementById(opt.wa);
    var priceEl = document.getElementById(opt.price);
    var areaOut = document.getElementById(opt.areaOut);
    var priceOut = document.getElementById(opt.priceOut);
    var priceLabel = opt.priceLabel ? document.getElementById(opt.priceLabel) : null;
    if (!raiEl || !priceEl) return null;

    function unit() {
      var r = document.querySelector('input[name="' + opt.unitName + '"]:checked');
      return r ? r.value : 'wa';
    }
    var UNIT_LABEL = { wa: 'ราคาต่อตารางวา (บาท)', rai: 'ราคาต่อไร่ (บาท)', total: 'ราคารวมทั้งแปลง (บาท)' };
    var UNIT_PH = { wa: 'เช่น 25000', rai: 'เช่น 4000000', total: 'เช่น 9500000' };

    function totalWa() { return toWa(raiEl.value, nganEl && nganEl.value, waEl && waEl.value); }

    function render() {
      var w = totalWa();
      var u = unit();

      if (priceLabel) priceLabel.textContent = UNIT_LABEL[u] || UNIT_LABEL.wa;
      priceEl.placeholder = UNIT_PH[u] || '';

      // สรุปเนื้อที่ — แปลงกลับเป็นรูปแบบ ไร่-งาน-วา ให้เจ้าของยืนยันว่าตรงกับที่เข้าใจ
      if (areaOut) {
        if (w > 0) {
          areaOut.textContent = 'รวม ' + areaText(w) + ' (' + fmt(w) + ' ตร.ว. ≈ ' +
            fmt(w * SQM_PER_WA) + ' ตร.ม.)';
          areaOut.hidden = false;
        } else {
          areaOut.hidden = true;
          areaOut.textContent = '';
        }
      }

      if (!priceOut) return;
      var p = num(priceEl.value);
      var total = totalPrice(u, p, w);

      if (p > 0 && u !== 'total' && w <= 0) {
        // มีราคาต่อหน่วยแต่ยังไม่ใส่เนื้อที่ = คำนวณไม่ได้ ต้องบอกว่าขาดอะไร ไม่ใช่เงียบไป
        priceOut.className = 'cs-calc cs-calc-wait';
        priceOut.textContent = 'ใส่เนื้อที่ด้านบนก่อน แล้วระบบจะคำนวณราคารวมให้อัตโนมัติ';
        priceOut.hidden = false;
        return;
      }
      if (total <= 0) { priceOut.hidden = true; priceOut.textContent = ''; return; }

      var txt;
      if (u === 'total') {
        // ใส่ราคารวมมา — คิดย้อนกลับเป็นราคาต่อตารางวา/ต่อไร่ ให้เทียบกับแปลงอื่นในย่านเดียวกันได้
        txt = w > 0
          ? 'ราคารวม ' + fmt(total) + ' บาท → ตกตารางวาละ ' + fmt(total / w) +
            ' บาท (ไร่ละ ' + fmt(total / (w / WA_PER_RAI)) + ' บาท)'
          : 'ราคารวม ' + fmt(total) + ' บาท';
      } else {
        txt = 'ราคารวมทั้งแปลง ≈ ' + fmt(total) + ' บาท' +
          (words(total) ? ' (' + words(total).replace('≈ ', '') + ')' : '');
      }
      priceOut.className = 'cs-calc';
      priceOut.textContent = txt;
      priceOut.hidden = false;
    }

    [raiEl, nganEl, waEl, priceEl].forEach(function (el) {
      if (el) el.addEventListener('input', render);
    });
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="' + opt.unitName + '"]'),
      function (r) { r.addEventListener('change', render); }
    );

    render();
    return {
      value: function () {
        var w = totalWa();
        var u = unit();
        var p = num(priceEl.value);
        return {
          rai: num(raiEl.value), ngan: nganEl ? num(nganEl.value) : 0, wa: waEl ? num(waEl.value) : 0,
          totalWa: w, areaText: areaText(w),
          priceUnit: u, unitPrice: p, estValue: Math.round(totalPrice(u, p, w))
        };
      },
      render: render
    };
  }

  global.NJLandForm = {
    calc: calc,
    initAddress: initAddress,
    initAreaPrice: initAreaPrice
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.NJLandForm;
