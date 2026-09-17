(function(){
  'use strict';
  // เครื่องคำนวณสินเชื่อบ้าน/ที่ดินเบื้องต้น (window.NJLoanCalc) — ใช้ที่ tools.html · เพิ่ม 2026-09-17 · P1
  //
  // ⚠️ กติกาที่ห้ามผ่อน
  //   1. สูตรคือผ่อนเท่ากันทุกงวดด้วยดอกเบี้ยคงที่ตลอดสัญญา (amortization มาตรฐาน)
  //      ธนาคารจริงคิดดอกเบี้ยลอยตัว/ขั้นบันได ตัวเลขจึงเป็น "ค่าประมาณ" เสมอ ข้อความเตือนห้ามถอด
  //   2. **ห้ามฝังอัตราดอกเบี้ยของธนาคารใดธนาคารหนึ่ง** — ค่าตั้งต้นในช่องเป็นแค่ตัวอย่างให้แก้ได้
  //      และห้ามเขียนว่า "ธนาคารให้กู้ได้ X%" เพราะวงเงินจริงขึ้นกับธนาคาร ราคาประเมิน และตัวผู้กู้
  //   3. โหมด "ที่ดินเปล่า" ตั้งดาวน์ 40% / 10 ปีเป็นค่าตั้งต้นให้ใกล้ความจริงกว่าบ้าน
  //      แต่ต้องบอกว่าเป็นค่าตั้งต้นที่แก้ได้ ไม่ใช่เกณฑ์ของธนาคาร
  //   4. **ไม่รวมค่าโอนเข้ากับเงินดาวน์ให้เอง** — ค่าโอนต้องใช้ราคาประเมินซึ่งผู้ใช้ต้องกรอกเอง
  //      (กติกาข้อ 12 ของ feecalc.js) ปุ่ม "คิดค่าโอนต่อ" จึงส่งแค่ราคาซื้อขายไปให้เครื่องคำนวณค่าโอน
  //   5. รายได้ขั้นต่ำคิดจากค่างวดไม่เกิน 40% ของรายได้ เป็นเกณฑ์คร่าวๆ ที่ใช้กันทั่วไป ไม่ใช่เกณฑ์ของธนาคารใด
  //   6. `calc()` ไม่แตะ DOM — `loancalc.test.js` รันด้วย node

  var DTI = 0.40;
  var TYPES = {
    home: { label:'บ้าน / ทาวน์โฮม / คอนโด', down:20, years:30 },
    land: { label:'ที่ดินเปล่า', down:40, years:10 }
  };
  var YEARS = [5, 10, 15, 20, 25, 30, 35, 40];

  function num(v){ var n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
  function baht(n){ return Math.round(n).toLocaleString('en-US'); }
  function clamp(n, lo, hi){ return Math.min(hi, Math.max(lo, n)); }

  // คืน null เมื่อข้อมูลยังไม่พอ — ห้ามเดาตัวเลขแทน
  function calc(o){
    var price = num(o.price);
    var down = clamp(num(o.downPct), 0, 90);
    var rate = clamp(num(o.ratePct), 0, 30);
    var years = Math.round(clamp(num(o.years), 1, 40));
    if (!(price > 0) || !(num(o.years) > 0)) return null;

    var loan = price * (1 - down / 100);
    var n = years * 12;
    var i = rate / 100 / 12;
    var pay = i > 0 ? loan * i / (1 - Math.pow(1 + i, -n)) : loan / n;

    // ปีแรก: ตัดต้นเท่าไหร่ จ่ายดอกเท่าไหร่ — ให้เห็นว่าช่วงแรกเงินส่วนใหญ่เป็นดอกเบี้ย
    var bal = loan, y1Int = 0, y1Prin = 0;
    for (var k = 0; k < Math.min(12, n); k++) {
      var it = bal * i;
      y1Int += it;
      y1Prin += pay - it;
      bal -= pay - it;
    }
    return {
      price: price, downPct: down, ratePct: rate, years: years,
      downAmt: price - loan,
      loan: loan,
      monthly: pay,
      totalPaid: pay * n,
      totalInterest: pay * n - loan,
      incomeNeeded: pay / DTI,
      year1Interest: y1Int,
      year1Principal: y1Prin
    };
  }

  function row(label, sub, val){
    return '<div class="fc-row"><div><b>' + label + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div><em>' + val + '</em></div>';
  }

  function render(r){
    if (!r) return '<p class="fc-note">กรอกราคาซื้อขายเพื่อดูค่างวดโดยประมาณ</p>';
    return row('ค่างวดต่อเดือน (ประมาณ)', 'ดอกเบี้ย ' + r.ratePct + '% ต่อปี คงที่ ' + r.years + ' ปี', baht(r.monthly) + ' บาท') +
      row('วงเงินกู้', 'ราคา − เงินดาวน์ ' + r.downPct + '%', baht(r.loan) + ' บาท') +
      row('เงินดาวน์', 'ยังไม่รวมค่าโอนและค่าใช้จ่ายวันโอน', baht(r.downAmt) + ' บาท') +
      row('ดอกเบี้ยรวมทั้งสัญญา', 'ถ้าผ่อนตามงวดจนครบ ไม่โปะ', baht(r.totalInterest) + ' บาท') +
      row('ปีแรก ตัดเงินต้น / จ่ายดอกเบี้ย', '', baht(r.year1Principal) + ' / ' + baht(r.year1Interest)) +
      '<div class="fc-row total"><div><b>รายได้ต่อเดือนที่ควรมี</b><span>เกณฑ์คร่าวๆ ค่างวดไม่เกิน 40% ของรายได้ · ภาระหนี้อื่นต้องนับรวมด้วย</span></div><em>' + baht(r.incomeNeeded) + ' บาท</em></div>' +
      '<p class="fc-warn">ตัวเลขนี้เป็น<b>ค่าประมาณ</b>จากดอกเบี้ยคงที่ตลอดสัญญา ธนาคารจริงมักคิดดอกเบี้ยลอยตัวหรือขั้นบันได ' +
      'วงเงินที่อนุมัติขึ้นกับธนาคาร ราคาประเมินของทรัพย์ และรายได้ของผู้กู้ ควรขอใบประเมินจากธนาคารก่อนตัดสินใจ</p>';
  }

  function mount(el, opts){
    if (!el) return;
    var o = opts || {};
    var yearOpts = YEARS.map(function(y){ return '<option value="' + y + '"' + (y === 30 ? ' selected' : '') + '>' + y + ' ปี</option>'; }).join('');
    el.className = 'fc lc';
    el.innerHTML =
      '<div class="fc-head"><b>ประมาณค่างวดสินเชื่อ</b><span>ใส่ราคาและเงื่อนไขเอง ตัวเลขทุกช่องแก้ได้</span></div>' +
      '<div class="fc-grid">' +
        '<label>ประเภททรัพย์<select data-lc="type">' +
          Object.keys(TYPES).map(function(k){ return '<option value="' + k + '">' + TYPES[k].label + '</option>'; }).join('') +
        '</select></label>' +
        '<label>ราคาซื้อขาย (บาท)<input type="text" inputmode="numeric" data-lc="price" value="' + (o.price ? baht(o.price) : '') + '" placeholder="เช่น 2,500,000"></label>' +
        '<label>เงินดาวน์ (% ของราคา)<input type="number" min="0" max="90" step="1" data-lc="downPct" value="20"></label>' +
        '<label>ดอกเบี้ยเฉลี่ย (% ต่อปี)<input type="number" min="0" max="30" step="0.05" data-lc="ratePct" value="5.5"></label>' +
        '<label>ระยะเวลาผ่อน<select data-lc="years">' + yearOpts + '</select></label>' +
      '</div>' +
      '<p class="fc-note lc-landnote" hidden>ที่ดินเปล่าโดยทั่วไปได้วงเงินน้อยกว่าและผ่อนสั้นกว่าบ้าน จึงตั้งดาวน์ 40% ผ่อน 10 ปีไว้ให้ก่อน แก้ได้ตามที่ธนาคารเสนอจริง</p>' +
      '<div class="fc-out" data-lc-out></div>' +
      '<button type="button" class="lc-next" data-lc-fee hidden>คิดค่าใช้จ่ายวันโอนต่อ ↓</button>';

    var f = function(k){ return el.querySelector('[data-lc="' + k + '"]'); };
    var out = el.querySelector('[data-lc-out]');
    var feeBtn = el.querySelector('[data-lc-fee]');

    function update(){
      var r = calc({ price:f('price').value, downPct:f('downPct').value, ratePct:f('ratePct').value, years:f('years').value });
      out.innerHTML = render(r);
      feeBtn.hidden = !(r && typeof o.onFee === 'function');
    }
    f('type').addEventListener('change', function(){
      var t = TYPES[f('type').value];
      f('downPct').value = t.down;
      f('years').value = String(t.years);
      el.querySelector('.lc-landnote').hidden = f('type').value !== 'land';
      update();
    });
    f('price').addEventListener('blur', function(){ var v = num(f('price').value); f('price').value = v ? baht(v) : ''; });
    el.addEventListener('input', update);
    el.addEventListener('change', update);
    feeBtn.addEventListener('click', function(){
      if (typeof o.onFee === 'function') o.onFee({ price:num(f('price').value), type:f('type').value });
    });
    update();
  }

  window.NJLoanCalc = { calc:calc, mount:mount, TYPES:TYPES, DTI:DTI };
})();
