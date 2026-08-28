(function(){
  'use strict';
  // เครื่องคำนวณค่าใช้จ่ายวันโอนกรรมสิทธิ์ที่ดิน — ใช้ร่วมกันทั้ง land.html และ guides.html
  //
  // ⚠️ กติกาที่ห้ามผ่อนในไฟล์นี้
  //   1. **ห้ามเติมราคาประเมินราชการของแปลงให้อัตโนมัติ** ผู้ใช้ต้องกรอกเอง
  //      ค่าธรรมเนียมโอนคือ 2% ของราคาประเมิน ใครเห็นตัวเลขค่าโอนก็หารกลับได้ราคาประเมินทันที
  //      ถ้าเติมให้ = เท่ากับประกาศราคาประเมินของแปลงนั้นต่อสาธารณะ ซึ่งทำให้เจ้าของที่ดิน
  //      (ลูกค้าเรา) เสียเปรียบตอนต่อรอง — เราตั้งใจไม่ส่งราคาประเมินออกทาง /api/public/* อยู่แล้ว
  //   2. ไม่กรอกราคาประเมิน = ใช้ราคาซื้อขายแทน ซึ่งทำให้ตัวเลข **สูงกว่าความจริง**
  //      ต้องบอกผู้ใช้ตรงๆ ทุกครั้ง ห้ามปล่อยให้เข้าใจว่าเป็นตัวเลขจริง
  //   3. ที่ดินเปล่าไม่ได้สิทธิลดค่าโอนเหลือ 0.01% (มาตรการนั้นใช้เฉพาะที่อยู่อาศัย ≤ 7 ล้าน)
  //      ห้ามคำนวณให้เป็น 0.01% เด็ดขาด เพราะผู้ซื้อจะไปเจอตัวเลขจริงที่สำนักงานที่ดินแล้วดีลพัง
  //
  // ที่มาของอัตรา (ตรวจสอบ ส.ค. 2569):
  //   ค่าธรรมเนียมโอน 2% ของราคาประเมินทุนทรัพย์
  //   ภาษีธุรกิจเฉพาะ 3.3% ของราคาซื้อขายหรือราคาประเมิน แล้วแต่สูงกว่า (ถือครอง < 5 ปี หรือนิติบุคคล)
  //   อากรแสตมป์ 0.5% ของราคาซื้อขายหรือราคาประเมิน แล้วแต่สูงกว่า (เสียเมื่อไม่ต้องเสียภาษีธุรกิจเฉพาะ)
  //   ภาษีเงินได้หัก ณ ที่จ่าย — นิติบุคคล 1% · บุคคลธรรมดาคิดขั้นบันไดจากราคาประเมิน (พ.ร.ฎ. 165)

  // ค่าใช้จ่ายเหมาตามจำนวนปีที่ถือครอง · index = ปี (8 ปีขึ้นไปใช้ 50%)
  var EXPENSE = [0, .92, .84, .77, .71, .65, .60, .55, .50];

  // อัตราภาษีเงินได้ที่ใช้กับเงินได้จากการขายอสังหาฯ — [ความกว้างของขั้น, อัตรา]
  // ⚠️ ขั้นแรกเริ่มที่ 5% ตั้งแต่บาทแรก **ไม่ได้รับยกเว้น 150,000 บาทแรก** เหมือนภาษีเงินได้ทั่วไป
  var BRACKETS = [[300000,.05],[200000,.10],[250000,.15],[250000,.20],[1000000,.25],[3000000,.30],[Infinity,.35]];

  function progressive(income){
    var left = Math.max(0, income), tax = 0;
    for (var i = 0; i < BRACKETS.length && left > 0; i++){
      var take = Math.min(left, BRACKETS[i][0]);
      tax += take * BRACKETS[i][1];
      left -= take;
    }
    return tax;
  }

  function num(v){ var n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
  function baht(n){ return Math.round(n).toLocaleString('en-US'); }

  // ---------------------------------------------------------------------------
  // คำนวณ — คืนรายการค่าใช้จ่ายทั้งหมด ไม่ตัดสินใจเรื่องการแสดงผลใดๆ
  // ---------------------------------------------------------------------------
  function calc(input){
    var b = input || {};
    var sale = num(b.salePrice);
    var appraisalGiven = num(b.appraisal) > 0;
    // ไม่ทราบราคาประเมิน → ใช้ราคาซื้อขายแทน · ราคาประเมินจริงมักต่ำกว่ามาก
    // ตัวเลขที่ได้จึงเป็นเพดานบน ไม่ใช่ค่ากลาง — ผู้เรียกต้องบอกผู้ใช้ให้ชัด (ดู assumed)
    var appraisal = appraisalGiven ? num(b.appraisal) : sale;
    var company = b.sellerType === 'company';
    var years = Math.max(1, Math.min(10, Math.round(num(b.years)) || 1));
    var base = Math.max(sale, appraisal);          // ฐานของภาษีที่ใช้ "แล้วแต่อย่างใดสูงกว่า"

    if (!(sale > 0) && !appraisalGiven) return null;

    var rows = [];
    // 1) ค่าธรรมเนียมการจดทะเบียนโอน — ที่ดินเปล่าเสียอัตราปกติ 2% เสมอ
    var transfer = appraisal * .02;
    rows.push({ k:'transfer', t:'ค่าธรรมเนียมการโอน 2%', sub:'ของราคาประเมินราชการ', v:transfer, who:'split' });

    // 2) ภาษีธุรกิจเฉพาะ หรือ อากรแสตมป์ — อย่างใดอย่างหนึ่งเท่านั้น ไม่เสียซ้อนกัน
    //    นิติบุคคลถือเป็นการขายเป็นทางค้าหากำไรเสมอ จึงเข้าภาษีธุรกิจเฉพาะทุกกรณี
    var sbt = company || years < 5;
    if (sbt) rows.push({ k:'sbt', t:'ภาษีธุรกิจเฉพาะ 3.3%', sub: company ? 'ผู้ขายเป็นนิติบุคคล' : 'ถือครองไม่ถึง 5 ปี', v: base * .033, who:'seller' });
    else     rows.push({ k:'stamp', t:'อากรแสตมป์ 0.5%', sub:'ถือครองครบ 5 ปี จึงไม่เสียภาษีธุรกิจเฉพาะ', v: base * .005, who:'seller' });

    // 3) ภาษีเงินได้หัก ณ ที่จ่าย
    var wht, whtSub;
    if (company){
      wht = base * .01;
      whtSub = '1% ของราคาซื้อขายหรือราคาประเมิน แล้วแต่สูงกว่า';
    } else {
      var expRate = EXPENSE[Math.min(years, 8)];
      var net = appraisal * (1 - expRate);
      wht = progressive(net / years) * years;
      wht = Math.min(wht, appraisal * .20);        // เพดานตามกฎหมาย ไม่เกิน 20% ของราคาประเมิน
      whtSub = 'คิดขั้นบันไดจากราคาประเมิน หักค่าใช้จ่ายเหมา ' + Math.round(expRate * 100) + '% (ถือครอง ' + years + ' ปี)';
    }
    rows.push({ k:'wht', t:'ภาษีเงินได้หัก ณ ที่จ่าย', sub:whtSub, v:wht, who:'seller' });

    var total = rows.reduce(function(a, r){ return a + r.v; }, 0);
    // ธรรมเนียมปฏิบัติ: ค่าธรรมเนียมโอนคนละครึ่ง · ภาษีทั้งหมดเป็นของผู้ขาย
    // เป็นแค่ "ธรรมเนียม" ไม่ใช่กฎหมาย — คู่สัญญาตกลงกันเป็นอย่างอื่นได้
    var buyer = rows.reduce(function(a, r){ return a + (r.who === 'split' ? r.v / 2 : 0); }, 0);
    return { rows:rows, total:total, buyer:buyer, seller:total - buyer,
             appraisal:appraisal, assumed:!appraisalGiven, years:years, company:company };
  }

  // ---------------------------------------------------------------------------
  // หน้าตา
  // ---------------------------------------------------------------------------
  var LINE = 'https://line.me/R/ti/p/@716lffzt';

  function resultHtml(r){
    if (!r) return '<p class="fc-hint">กรอกราคาซื้อขายเพื่อดูประมาณการค่าใช้จ่ายวันโอน</p>';
    var rows = r.rows.map(function(x){
      return '<div class="fc-row"><div><b>' + x.t + '</b><span>' + x.sub + '</span></div><em>' + baht(x.v) + '</em></div>';
    }).join('');
    return rows +
      '<div class="fc-row total"><div><b>รวมค่าใช้จ่ายวันโอน</b></div><em>' + baht(r.total) + '</em></div>' +
      '<div class="fc-split">' +
        '<div><span>ผู้ซื้อจ่ายตามธรรมเนียม</span><b>' + baht(r.buyer) + '</b></div>' +
        '<div><span>ผู้ขายจ่ายตามธรรมเนียม</span><b>' + baht(r.seller) + '</b></div>' +
      '</div>' +
      (r.assumed
        ? '<p class="fc-warn">ยังไม่ได้กรอกราคาประเมินราชการ — ตัวเลขข้างบนคำนวณจากราคาซื้อขายแทน ' +
          'ราคาประเมินจริงมักต่ำกว่าราคาซื้อขายมาก <b>ค่าใช้จ่ายจริงจึงมักถูกกว่านี้</b> ' +
          '<a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์ให้ทีมเราตรวจราคาประเมินให้ฟรี →</a></p>'
        : '');
  }

  function mount(el, opts){
    if (!el) return;
    var o = opts || {};
    var sale = Number(o.salePrice) || 0;
    el.className = 'fc';
    el.innerHTML =
      '<div class="fc-head"><b>💰 ประมาณการค่าใช้จ่ายวันโอน</b><span>กรอกตัวเลขเองเพื่อดูค่าธรรมเนียมและภาษีที่ต้องเตรียม</span></div>' +
      '<div class="fc-grid">' +
        '<label>ราคาซื้อขาย (บาท)<input type="text" inputmode="numeric" data-fc="salePrice" value="' + (sale ? baht(sale) : '') + '" placeholder="เช่น 5,000,000"></label>' +
        '<label>ราคาประเมินราชการ (บาท)<input type="text" inputmode="numeric" data-fc="appraisal" placeholder="ถ้าไม่ทราบ เว้นว่างไว้ได้"></label>' +
        '<label>ผู้ขายเป็น<select data-fc="sellerType"><option value="person">บุคคลธรรมดา</option><option value="company">นิติบุคคล / บริษัท</option></select></label>' +
        '<label>ถือครองมาแล้ว (ปี)<input type="number" min="1" max="10" step="1" data-fc="years" value="5"></label>' +
      '</div>' +
      '<div class="fc-out" data-fc-out></div>' +
      '<p class="fc-foot">ที่ดินเปล่า<b>ไม่ได้สิทธิ</b>ลดค่าธรรมเนียมโอนเหลือ 0.01% — มาตรการนั้นใช้เฉพาะที่อยู่อาศัยราคาไม่เกิน 7 ล้านบาท · ' +
      'การแบ่งจ่ายคนละครึ่งเป็นธรรมเนียมปฏิบัติ ไม่ใช่ข้อบังคับตามกฎหมาย ตกลงกันเป็นอย่างอื่นได้ · ' +
      'ตัวเลขนี้เป็นประมาณการเพื่อใช้เตรียมเงินเท่านั้น <b>ยอดจริงเจ้าหน้าที่สำนักงานที่ดินคำนวณในวันโอน</b> ' +
      'และอาจต่างไปตามกรณีเฉพาะ (เช่น ได้ที่ดินมาโดยมรดก หรือแปลงอยู่นอกเขตเทศบาลซึ่งได้ยกเว้นเงินได้ 200,000 บาท)</p>';

    var out = el.querySelector('[data-fc-out]');
    function update(){
      var v = {};
      el.querySelectorAll('[data-fc]').forEach(function(f){ v[f.getAttribute('data-fc')] = f.value; });
      out.innerHTML = resultHtml(calc(v));
    }
    // ใส่คอมมาให้อ่านง่ายระหว่างพิมพ์ โดยรักษาตำแหน่งเคอร์เซอร์ให้อยู่ท้ายเสมอ
    el.addEventListener('input', function(e){
      var f = e.target;
      if (f.type === 'text' && f.hasAttribute('data-fc')){
        var n = num(f.value);
        f.value = n > 0 ? baht(n) : '';
      }
      update();
    });
    el.addEventListener('change', update);
    update();
  }

  window.NJFeeCalc = { calc:calc, mount:mount };
})();
