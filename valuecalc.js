(function(){
  'use strict';
  // เครื่องมือประเมินหลักการราคาที่ดินเบื้องต้น — ใช้ร่วมกับ guides.html
  //
  // ⚠️ นี่ไม่ใช่เครื่องคำนวณราคาประเมิน (ต่างจาก feecalc.js ที่คำนวณ "ราคาประเมินราชการ" เพื่อภาษี/ค่าธรรมเนียม)
  //    เครื่องมือนี้จำลอง "หลักการ" ที่บริษัทประเมินราคาอิสระใช้พิจารณาราคาตลาด (WQS — Weighted Quality Score:
  //    ให้คะแนนปัจจัยแล้วถ่วงน้ำหนัก) เพื่อให้ลูกค้าเข้าใจว่าอะไรทำให้ที่ดินแพง/ถูกกว่ากัน
  //    ตัวเลขที่ได้เป็น "ดัชนีเทียบเคียง" ไม่ใช่รายงานประเมินราคาจากผู้ประเมินมีใบอนุญาต — ต้องเตือนทุกครั้งที่แสดงผล
  //
  //    น้ำหนักปัจจัย (ทำเล 50% / รูปร่าง+หน้ากว้าง 25% / สาธารณูปโภค 15% / อื่นๆ 10%) และเพดานปรับ ±40%
  //    เป็นค่ากลางแบบง่ายเพื่อการศึกษา ไม่ใช่สูตรทางการของสภาวิชาชีพการประเมินมูลค่าทรัพย์สิน

  function num(v){ var n = Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
  function baht(n){ return Math.round(n).toLocaleString('en-US'); }
  function pct(n){ var s = Math.round(n * 100); return (s > 0 ? '+' : '') + s + '%'; }

  // ---------------------------------------------------------------------------
  // ปัจจัย — คะแนน 1 (แย่สุด) ถึง 5 (ดีสุด) แต่ละตัวเลือกมีคำอธิบายให้ผู้ใช้เลือกตามสภาพจริง
  // ---------------------------------------------------------------------------
  var FACTORS = {
    location: {
      label: 'ทำเลและการเข้าถึง', weight: .50,
      options: [
        { v:5, t:'ติดถนนใหญ่ ในเมือง/ใกล้แหล่งชุมชนสำคัญ' },
        { v:4, t:'ในเมือง ไม่ติดถนนใหญ่ แต่เข้าออกสะดวก' },
        { v:3, t:'ชานเมือง ใกล้ถนนสายรอง' },
        { v:2, t:'ชนบท ห่างจากชุมชน' },
        { v:1, t:'ห่างไกล เข้าถึงลำบาก' }
      ]
    },
    shape: {
      label: 'รูปร่างและหน้ากว้างติดถนน', weight: .25,
      options: [
        { v:5, t:'สี่เหลี่ยมผืนผ้า หน้ากว้างชนถนน สัดส่วนดี' },
        { v:4, t:'รูปทรงปกติ หน้ากว้างพอใช้งาน' },
        { v:3, t:'รูปทรงปกติ แต่หน้าแคบหรือลึก' },
        { v:2, t:'รูปทรงไม่สม่ำเสมอ เว้าแหว่ง' },
        { v:1, t:'ที่ดินตาบอด ไม่มีทางออกสู่ถนนสาธารณะ' }
      ]
    },
    utility: {
      label: 'สาธารณูปโภค', weight: .15,
      options: [
        { v:5, t:'ไฟฟ้า + น้ำประปา เข้าถึงครบ' },
        { v:3, t:'เข้าถึงบางส่วน (เช่น มีไฟฟ้า ยังไม่มีประปา)' },
        { v:1, t:'ยังไม่เข้าถึง ต้องเดินสายเอง' }
      ]
    },
    other: {
      label: 'เอกสารสิทธิ์ / ภาระผูกพัน / ผังเมือง', weight: .10,
      options: [
        { v:5, t:'โฉนด ไม่มีภาระผูกพัน ผังเมืองไม่จำกัด' },
        { v:3, t:'น.ส.3 หรือมีภาระจำยอมเล็กน้อย' },
        { v:1, t:'ส.ค.1 หรือติดภาระผูกพัน/ผังเมืองจำกัดมาก' }
      ]
    }
  };
  var FACTOR_KEYS = Object.keys(FACTORS);
  var MAX_SWING = .40;   // เพดานปรับ ±40% เมื่อคะแนนรวมสุดขั้ว (1 หรือ 5)
  var NEUTRAL = 3;       // คะแนนกลาง = ใกล้เคียงค่าเฉลี่ยละแวก ปรับ 0%

  function score(input){
    var b = input || {};
    var total = 0, notes = { up: [], down: [] };
    FACTOR_KEYS.forEach(function(key){
      var f = FACTORS[key];
      var picked = num(b[key]) || NEUTRAL;
      total += picked * f.weight;
      var opt = f.options.filter(function(o){ return o.v === picked; })[0];
      if (!opt) return;
      if (picked >= 4) notes.up.push(f.label + ': ' + opt.t);
      else if (picked <= 2) notes.down.push(f.label + ': ' + opt.t);
    });
    var composite = total; // น้ำหนักรวมกันเป็น 1 อยู่แล้ว ไม่ต้องหารซ้ำ
    var adjust = (composite - NEUTRAL) / (5 - NEUTRAL) * MAX_SWING;
    return { composite: composite, adjust: adjust, notes: notes };
  }

  // หน่วยที่ดินไทย: 1 ไร่ = 4 งาน = 400 ตารางวา
  function toWa(rai, ngan, wa){ return num(rai) * 400 + num(ngan) * 100 + num(wa); }

  function calc(input){
    var b = input || {};
    var s = score(b);

    var totalWa = toWa(b.rai, b.ngan, b.wa);
    var refPrice = num(b.refPrice);
    var haveRef = refPrice > 0;
    var adjPricePerWa = haveRef ? refPrice * (1 + s.adjust) : 0;
    var landTotal = (haveRef && totalWa > 0) ? adjPricePerWa * totalWa : 0;

    // สิ่งปลูกสร้าง — ใช้สูตรต้นทุนเดียวกับเครื่องคำนวณค่าโอน (feecalc.js) เพื่อไม่ให้ตัวเลขขัดกันเอง
    // ราคาต่อ ตร.ม. ในบัญชีกรมธนารักษ์ต่างกันรายจังหวัด จึงต้องส่ง province ไปด้วยเสมอ
    // ไม่เลือกจังหวัด/โหลดบัญชีไม่ได้ = feecalc คืน null แปลว่าประมาณไม่ได้ ห้ามเดาตัวเลขแทน
    var wantBuilding = !!b.hasBuilding;
    var building = null;
    if (wantBuilding && window.NJFeeCalc && window.NJFeeCalc.estimateBuilding){
      building = window.NJFeeCalc.estimateBuilding(
        b.buildingType, b.buildingArea, b.buildingAge, b.buildingRate, b.province);
    }

    return {
      composite: s.composite, adjust: s.adjust, notes: s.notes,
      haveRef: haveRef, refPrice: refPrice, adjPricePerWa: adjPricePerWa,
      totalWa: totalWa, landTotal: landTotal,
      wantBuilding: wantBuilding, building: building,
      grandTotal: landTotal + (building ? building.value : 0)
    };
  }

  // ---------------------------------------------------------------------------
  // หน้าตา
  // ---------------------------------------------------------------------------
  var LINE = 'https://line.me/R/ti/p/@716lffzt';

  function factorSelect(key){
    var f = FACTORS[key];
    var opts = f.options.map(function(o){
      return '<option value="' + o.v + '"' + (o.v === NEUTRAL ? ' selected' : '') + '>' + o.t + '</option>';
    }).join('');
    return '<label>' + f.label + '<select data-vc="' + key + '">' + opts + '</select></label>';
  }

  function resultHtml(r){
    var pos = Math.max(0, Math.min(1, (r.composite - 1) / 4)) * 100;
    var tone = r.adjust > .02 ? 'up' : (r.adjust < -.02 ? 'down' : 'flat');
    var toneLabel = tone === 'up' ? 'สูงกว่าค่าเฉลี่ยละแวก' : tone === 'down' ? 'ต่ำกว่าค่าเฉลี่ยละแวก' : 'ใกล้เคียงค่าเฉลี่ยละแวก';

    var gauge = '<div class="vc-gauge"><div class="vc-gauge-track">' +
      '<i class="vc-gauge-mark" style="left:' + pos + '%"></i></div>' +
      '<div class="vc-gauge-labels"><span>1 ต่ำ</span><span>3 เฉลี่ย</span><span>5 สูง</span></div></div>';

    var badge = '<div class="vc-badge vc-badge-' + tone + '"><b>' + pct(r.adjust) + '</b><span>' + toneLabel + '</span></div>';

    var notes = '';
    if (r.notes.up.length || r.notes.down.length){
      notes = '<div class="vc-notes">' +
        (r.notes.up.length ? '<div class="vc-note-col vc-up"><b>▲ ปัจจัยบวก</b><ul>' +
          r.notes.up.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '') +
        (r.notes.down.length ? '<div class="vc-note-col vc-down"><b>▼ ปัจจัยลบ</b><ul>' +
          r.notes.down.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul></div>' : '') +
        '</div>';
    }

    var priceOut = '';
    if (r.haveRef){
      priceOut = '<div class="vc-break"><b>ราคาต่อตารางวาโดยประมาณ ' + baht(r.adjPricePerWa) + ' บาท</b>' +
        '<span>ราคาอ้างอิง ' + baht(r.refPrice) + ' บาท/ตร.ว. ปรับ ' + pct(r.adjust) + ' ตามปัจจัยข้างต้น</span>' +
        (r.totalWa > 0 ? '<span>เนื้อที่ ' + baht(r.totalWa) + ' ตร.ว. → ที่ดินรวม ≈ ' + baht(r.landTotal) + ' บาท</span>' : '') +
        '</div>';
    } else {
      priceOut = '<p class="vc-hint">ใส่ "ราคาต่อตารางวาที่ทราบจากแปลงใกล้เคียง" เพื่อดูราคาที่ดินโดยประมาณ</p>';
    }

    var buildOut = '';
    if (r.building){
      buildOut = '<div class="vc-break"><b>สิ่งปลูกสร้างโดยประมาณ ' + baht(r.building.value) + ' บาท</b>' +
        '<span>ประมาณจาก ' + baht(r.building.area) + ' ตร.ม. × ' + baht(r.building.rate) +
        ' บาท/ตร.ม. หักค่าเสื่อม ' + Math.round(r.building.dep * 100) + '% (อายุ ' + r.building.age + ' ปี)</span>' +
        '<span>ราคาต่อ ตร.ม. เป็นบัญชีจริงของกรมธนารักษ์ ส่วน<b>ค่าเสื่อมตามอายุเป็นค่าประมาณ</b> ' +
        'เพราะกรมธนารักษ์ไม่ได้เปิดตารางหักค่าเสื่อมเป็นข้อมูลเปิด</span></div>';
    } else if (r.wantBuilding){
      buildOut = '<p class="vc-hint">ยังประมาณราคาสิ่งปลูกสร้างไม่ได้ — ต้องเลือกจังหวัดและกรอกพื้นที่ใช้สอยให้ครบ ' +
        'เพราะราคาต่อ ตร.ม. ในบัญชีกรมธนารักษ์ต่างกันในแต่ละจังหวัด</p>';
    }

    var grand = '';
    if (r.haveRef && r.building){
      grand = '<div class="vc-row total"><div><b>รวมโดยประมาณ (ที่ดิน + สิ่งปลูกสร้าง)</b></div><em>' + baht(r.grandTotal) + '</em></div>';
    }

    return gauge + badge + notes + priceOut + buildOut + grand +
      '<p class="vc-warn"><b>นี่คือแบบจำลองหลักการเบื้องต้นเพื่อการศึกษาเท่านั้น</b> ไม่ใช่รายงานประเมินราคาจากผู้ประเมิน ' +
      'ที่ได้รับใบอนุญาตจากสภาวิชาชีพการประเมินมูลค่าทรัพย์สิน ราคาซื้อขายจริงขึ้นอยู่กับแปลงเทียบเคียงในตลาด ณ ขณะนั้น ' +
      'และดุลยพินิจของผู้ประเมิน — ' +
      '<a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์ให้ทีมเราช่วยประเมินเบื้องต้นฟรี →</a></p>';
  }

  function mount(el, opts){
    if (!el) return;
    var o = opts || {};
    var hasFeeCalc = !!(window.NJFeeCalc && window.NJFeeCalc.TYPES);
    var buildTypeOpts = hasFeeCalc
      ? Object.keys(window.NJFeeCalc.TYPES).filter(function(k){ return window.NJFeeCalc.TYPES[k].build; })
          .map(function(k){ return '<option value="' + k + '">' + window.NJFeeCalc.TYPES[k].label + '</option>'; }).join('')
      : '';

    el.className = 'vc';
    el.innerHTML =
      '<div class="vc-head"><b>เครื่องมือประเมินหลักการราคาที่ดินเบื้องต้น</b>' +
        '<span>ดูว่าปัจจัยไหนทำให้ที่ดินแปลงหนึ่งมีราคาสูง/ต่ำกว่าอีกแปลง ตามหลักที่บริษัทประเมินทรัพย์สินใช้จริง — ' +
        'ต่างจากเครื่องคำนวณค่าโอนด้านบนที่ใช้ "ราคาประเมินราชการ" คำนวณภาษี เครื่องมือนี้จำลอง "หลักการประเมินราคาตลาด" เพื่อความเข้าใจเท่านั้น</span></div>' +

      '<div class="vc-grid">' +
        FACTOR_KEYS.map(factorSelect).join('') +
      '</div>' +

      '<div class="vc-sub">' +
        '<div class="vc-sub-h">ถ้าทราบราคาแปลงเทียบเคียง (ไม่บังคับ)</div>' +
        '<div class="vc-grid">' +
          '<label>ราคาต่อตารางวาที่ทราบจากแปลงใกล้เคียง<input type="text" inputmode="numeric" data-vc="refPrice" placeholder="เช่น 25,000"></label>' +
          '<label>เนื้อที่ — ไร่<input type="number" min="0" step="1" data-vc="rai" placeholder="0"></label>' +
          '<label>งาน<input type="number" min="0" max="3" step="1" data-vc="ngan" placeholder="0"></label>' +
          '<label>ตารางวา<input type="number" min="0" max="99" step="1" data-vc="wa" placeholder="0"></label>' +
        '</div>' +
      '</div>' +

      (hasFeeCalc ?
        '<label class="vc-check"><input type="checkbox" data-vc="hasBuilding"> มีสิ่งปลูกสร้างบนที่ดินนี้</label>' +
        '<div class="vc-sub" data-vc-building hidden>' +
          '<div class="vc-sub-h">สิ่งปลูกสร้าง (วิธีต้นทุน — ราคาสร้างใหม่หักค่าเสื่อม)</div>' +
          '<div class="vc-grid">' +
            '<label>ประเภท<select data-vc="buildingType">' + buildTypeOpts + '</select></label>' +
            '<label>จังหวัดที่ตั้ง<select data-vc="province"><option value="">— เลือกจังหวัด —</option></select></label>' +
            '<label>พื้นที่ใช้สอย (ตร.ม.)<input type="text" inputmode="numeric" data-vc="buildingArea" placeholder="เช่น 150"></label>' +
            '<label>อายุอาคาร (ปี)<input type="number" min="0" max="60" step="1" data-vc="buildingAge" value="10"></label>' +
          '</div>' +
        '</div>' : '') +

      '<div class="vc-out" data-vc-out></div>';

    var out = el.querySelector('[data-vc-out]');
    var buildBox = el.querySelector('[data-vc-building]');
    var provSel = el.querySelector('[data-vc="province"]');

    // ใช้บัญชีราคาชุดเดียวกับเครื่องคำนวณค่าโอน — feecalc โหลดครั้งเดียวแล้วแชร์ให้ ไม่ยิงซ้ำ
    if (provSel && window.NJFeeCalc && window.NJFeeCalc.loadBuildingPrices){
      window.NJFeeCalc.loadBuildingPrices().then(function(){
        window.NJFeeCalc.provinces().forEach(function(pv){
          var o = document.createElement('option');
          o.value = pv[0]; o.textContent = pv[1]; provSel.appendChild(o);
        });
        update();
      });
    }

    function read(){
      var v = {};
      el.querySelectorAll('[data-vc]').forEach(function(f){
        v[f.getAttribute('data-vc')] = f.type === 'checkbox' ? f.checked : f.value;
      });
      return v;
    }
    function update(){
      var v = read();
      if (buildBox) buildBox.hidden = !v.hasBuilding;
      out.innerHTML = resultHtml(calc(v));
    }
    el.addEventListener('input', function(e){
      var f = e.target;
      if (f.type === 'text' && f.hasAttribute('data-vc') && (f.getAttribute('data-vc') === 'refPrice' || f.getAttribute('data-vc') === 'buildingArea')){
        var n = num(f.value);
        f.value = n > 0 ? baht(n) : '';
      }
      update();
    });
    el.addEventListener('change', update);
    update();
  }

  window.NJValueCalc = { FACTORS: FACTORS, score: score, calc: calc, mount: mount };
})();
