(function(){
  'use strict';
  // เครื่องคำนวณค่าใช้จ่ายวันโอน — ใช้ร่วมกันทั้ง land.html และ guides.html
  // รองรับทั้งที่ดินเปล่าและที่ดินพร้อมสิ่งปลูกสร้าง
  //
  // ⚠️ กติกาที่ห้ามผ่อน (ยกมาจากของเดิม ยังใช้ทั้งหมด)
  //   1. ห้ามเติมราคาประเมินราชการให้อัตโนมัติ ผู้ใช้ต้องกรอกเอง
  //      ค่าธรรมเนียมโอนคือ % ของราคาประเมิน ใครเห็นตัวเลขค่าโอนก็หารกลับได้ราคาประเมินทันที
  //   2. ไม่กรอกราคาประเมิน = ใช้ราคาซื้อขายแทน ได้ตัวเลข "สูงกว่าความจริง" ต้องบอกผู้ใช้ทุกครั้ง
  //   3. ที่ดินเปล่าไม่ได้สิทธิลดค่าธรรมเนียมตามมาตรการรัฐ — มาตรการนั้นใช้เฉพาะ "ที่อยู่อาศัย"
  //      จึงล็อกไว้ว่าเลือกลดค่าธรรมเนียมได้เฉพาะเมื่อเลือกประเภทที่มีสิ่งปลูกสร้างเท่านั้น
  //
  // ⚠️ ของใหม่ในเวอร์ชันนี้ — 2 เรื่องที่ "ห้ามคำนวณให้เองโดยผู้ใช้ไม่ได้สั่ง"
  //   ก. ราคาประเมินสิ่งปลูกสร้าง — ตัวเลขจริงมาจากบัญชีของกรมธนารักษ์ ต่างกันตามพื้นที่และปีบัญชี
  //      เราไม่มีบัญชีนั้นในเว็บ จึงให้ "กรอกเอง" เป็นค่าหลัก ส่วนตัวช่วยประมาณเป็นทางเลือกเสริม
  //      และต้องติดป้ายว่าเป็นค่าประมาณทุกครั้งที่ใช้
  //   ข. มาตรการลดค่าธรรมเนียมโอนของรัฐ — ณ ส.ค. 2569 แหล่งข้อมูลสาธารณะยังขัดกันเอง
  //      ทั้งเรื่องวันสิ้นสุด (30 มิ.ย. 2569 หรือ 2570) และอัตรา (0.01% หรือ 1%)
  //      จึง **ไม่เปิดใช้อัตโนมัติเด็ดขาด** ผู้ใช้ต้องติ๊กเลือกเองและเลือกอัตราเอง
  //      ถ้าเราเดาแล้วผิด ผู้ซื้อจะไปเจอตัวเลขจริงที่สำนักงานที่ดินแล้วดีลพัง — เหมือนกรณีที่ดินเปล่า
  //
  // ที่มาของอัตราที่ยืนยันแล้ว:
  //   ค่าธรรมเนียมโอน 2% ของราคาประเมินทุนทรัพย์ (ที่ดิน + สิ่งปลูกสร้าง)
  //   ภาษีธุรกิจเฉพาะ 3.3% ของราคาซื้อขายหรือราคาประเมิน แล้วแต่สูงกว่า
  //   อากรแสตมป์ 0.5% — เสียเมื่อไม่ต้องเสียภาษีธุรกิจเฉพาะ (ไม่เสียซ้อนกัน)
  //   ภาษีเงินได้หัก ณ ที่จ่าย — นิติบุคคล 1% · บุคคลธรรมดาขั้นบันไดจากราคาประเมิน (พ.ร.ฎ. 165)
  //   ยกเว้นภาษีธุรกิจเฉพาะ ถ้าผู้ขายมีชื่อในทะเบียนบ้านหลังที่ขาย ≥ 1 ปี (กรมสรรพากร)
  //     — ข้อนี้ใช้ได้เฉพาะกรณีมีสิ่งปลูกสร้างที่อยู่อาศัยได้ ที่ดินเปล่าไม่มีทะเบียนบ้าน

  var EXPENSE = [0, .92, .84, .77, .71, .65, .60, .55, .50];
  var BRACKETS = [[300000,.05],[200000,.10],[250000,.15],[250000,.20],[1000000,.25],[3000000,.30],[Infinity,.35]];

  // ---------------------------------------------------------------------------
  // ประเภททรัพย์
  //   build      = มีสิ่งปลูกสร้าง (เปิดช่องกรอกราคาประเมินสิ่งปลูกสร้าง)
  //   home       = เป็น "ที่อยู่อาศัย" ตามมาตรการรัฐ → ให้เลือกลดค่าธรรมเนียมได้
  //   rate/decay = ค่าตั้งต้นของ "ตัวช่วยประมาณ" เท่านั้น ไม่ใช่บัญชีราคาจริง
  //                ผู้ใช้แก้ตัวเลขได้ และผลลัพธ์ติดป้ายว่าเป็นค่าประมาณเสมอ
  // ---------------------------------------------------------------------------
  // ราคาต่อ ตร.ม. ไม่ได้ฝังไว้ในโค้ดแล้ว — โหลดบัญชีจริงของกรมธนารักษ์จากเซิร์ฟเวอร์ njsurvey
  // (สร้างด้วย landprice/refresh-building.js จากคลังข้อมูลเปิด ชุด "ราคาประเมินสิ่งปลูกสร้าง")
  // ราคาต่างกันตามจังหวัด จึงต้องให้ผู้ใช้เลือกจังหวัดด้วย ใช้ค่ากลางทั้งประเทศไม่ได้
  // โหลดไม่สำเร็จ = ตัวช่วยประมาณใช้ไม่ได้ ให้กรอกราคาประเมินเองแทน ห้าม fallback เป็นตัวเลขที่เดา
  var BUILDING_URL = 'https://nj-survey-system.onrender.com/buildingprice.json';
  var BP = null;
  var bpPromise = null;                            // โหลดครั้งเดียว แชร์กับ valuecalc.js

  // จับคู่ตัวเลือกที่ผู้ใช้เข้าใจง่าย กับรหัสประเภทจริงในบัญชีกรมธนารักษ์
  //   code  = รหัสในบัญชี · ใช้ดึงราคาต่อ ตร.ม. ตามจังหวัด
  //   decay = อัตราค่าเสื่อมต่อปี และ cap = เพดาน — สองค่านี้ยัง "ประมาณเอง"
  //           เพราะคลังข้อมูลเปิดของกรมธนารักษ์มีแต่ราคา ไม่มีตารางหักค่าเสื่อม
  //           จึงยังต้องติดป้ายเตือนว่าเป็นค่าประมาณอยู่ แม้ราคาต่อ ตร.ม. จะเป็นตัวเลขจริงแล้ว
  var TYPES = {
    land:       { label:'ที่ดินเปล่า', build:false, home:false },
    house:      { label:'บ้านเดี่ยว ตึก 2 ชั้น',        build:true, home:true,  code:'105',   decay:.01, cap:.40 },
    house1:     { label:'บ้านเดี่ยว ตึกชั้นเดียว',       build:true, home:true,  code:'103',   decay:.01, cap:.40 },
    halfwood:   { label:'บ้านครึ่งตึกครึ่งไม้ 2 ชั้น',   build:true, home:true,  code:'106',   decay:.02, cap:.60 },
    wood:       { label:'บ้านไม้ 2 ชั้น',                build:true, home:true,  code:'104',   decay:.03, cap:.70 },
    townhouse:  { label:'ทาวน์เฮาส์ / บ้านแถว 2 ชั้น',   build:true, home:true,  code:'202',   decay:.01, cap:.40 },
    commercial: { label:'ตึกแถว / อาคารพาณิชย์ 2 ชั้น',  build:true, home:true,  code:'402',   decay:.01, cap:.40 },
    condo:      { label:'อาคารอยู่อาศัยรวม ไม่เกิน 5 ชั้น', build:true, home:true, code:'520/1', decay:.01, cap:.40 },
    warehouse:  { label:'คลังสินค้า ไม่เกิน 300 ตร.ม.',  build:true, home:false, code:'501',   decay:.02, cap:.60 }
  };

  // ราคาต่อ ตร.ม. ของประเภทนี้ ในจังหวัดนี้ — คืน 0 ถ้ายังโหลดบัญชีไม่เสร็จหรือไม่มีข้อมูล
  function rateOf(typeKey, provCode) {
    var t = TYPES[typeKey];
    if (!BP || !t || !t.code || !provCode) return 0;
    var i = BP.typeIndex[t.code];
    var row = BP.prices[provCode];
    return (i == null || !row) ? 0 : (Number(row[i]) || 0);
  }

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

  // ประมาณราคาประเมินสิ่งปลูกสร้าง = พื้นที่ × ราคาต่อ ตร.ม. − ค่าเสื่อมตามอายุ
  // คืน null ถ้าข้อมูลไม่พอ — ผู้เรียกต้องไม่แสดงตัวเลขมั่ว
  function estimateBuilding(typeKey, area, age, rateOverride, provCode){
    var t = TYPES[typeKey];
    if (!t || !t.build) return null;
    var a = num(area);
    if (!(a > 0)) return null;
    var rate = num(rateOverride) > 0 ? num(rateOverride) : rateOf(typeKey, provCode);
    if (!(rate > 0)) return null;                  // ไม่รู้ราคาต่อ ตร.ม. = ประมาณไม่ได้ ห้ามเดา
    var yrs = Math.max(0, Math.min(60, num(age)));
    var dep = Math.min(t.cap, yrs * t.decay);      // ค่าเสื่อมมีเพดาน ไม่หักจนเหลือศูนย์
    return { value: a * rate * (1 - dep), rate: rate, dep: dep, area: a, age: yrs,
             typeName: (BP && BP.typeName[t.code]) || t.label };
  }

  // ---------------------------------------------------------------------------
  function calc(input){
    var b = input || {};
    var typeKey = TYPES[b.propertyType] ? b.propertyType : 'land';
    var type = TYPES[typeKey];

    var sale = num(b.salePrice);
    var landGiven = num(b.landAppraisal) > 0;
    var land = num(b.landAppraisal);

    // ราคาประเมินสิ่งปลูกสร้าง — กรอกเองมาก่อนเสมอ ถ้าไม่กรอกค่อยลองประมาณให้
    var buildGiven = type.build && num(b.buildingAppraisal) > 0;
    var est = null;
    var building = 0;
    if (type.build){
      if (buildGiven) building = num(b.buildingAppraisal);
      else {
        est = estimateBuilding(typeKey, b.buildingArea, b.buildingAge, b.buildingRate, b.province);
        building = est ? est.value : 0;
      }
    }

    var apprGiven = landGiven || buildGiven || !!est;
    // ไม่รู้ราคาประเมินเลย → ใช้ราคาซื้อขายแทน (ได้ตัวเลขสูงกว่าจริง ต้องเตือน)
    var appraisal = apprGiven ? (land + building) : sale;
    if (apprGiven && appraisal <= 0) appraisal = sale;

    if (!(sale > 0) && !apprGiven) return null;

    var company = b.sellerType === 'company';
    var years = Math.max(1, Math.min(10, Math.round(num(b.years)) || 1));
    var base = Math.max(sale, appraisal);

    // มีชื่อในทะเบียนบ้าน ≥ 1 ปี → ยกเว้นภาษีธุรกิจเฉพาะ (เฉพาะที่อยู่อาศัย ไม่ใช่ที่ดินเปล่า)
    var registered = !!b.registered && type.home && !company;

    var rows = [];

    // 1) ค่าธรรมเนียมการโอน
    //    ปกติ 2% · ลดได้เฉพาะเมื่อผู้ใช้ยืนยันเองว่าเข้าเงื่อนไขมาตรการรัฐ
    var discountOn = !!b.govDiscount && type.home;
    var feeRate = .02, feeSub = 'ของราคาประเมินราชการ';
    if (discountOn){
      feeRate = num(b.govRate) > 0 ? num(b.govRate) / 100 : .0001;
      feeSub = 'ใช้อัตราลดตามมาตรการรัฐที่คุณเลือก (' + (feeRate * 100) + '%) — ต้องยืนยันสิทธิกับสำนักงานที่ดินก่อน';
    }
    rows.push({ k:'transfer', t:'ค่าธรรมเนียมการโอน ' + (feeRate * 100) + '%', sub:feeSub,
                v: appraisal * feeRate, who:'split' });

    // 2) ภาษีธุรกิจเฉพาะ หรือ อากรแสตมป์ — อย่างใดอย่างหนึ่ง
    var sbt = company || (years < 5 && !registered);
    if (sbt){
      rows.push({ k:'sbt', t:'ภาษีธุรกิจเฉพาะ 3.3%',
                  sub: company ? 'ผู้ขายเป็นนิติบุคคล' : 'ถือครองไม่ถึง 5 ปี',
                  v: base * .033, who:'seller' });
    } else {
      var why = company ? '' :
                (registered && years < 5) ? 'มีชื่อในทะเบียนบ้านครบ 1 ปี จึงได้ยกเว้นภาษีธุรกิจเฉพาะ'
                                          : 'ถือครองครบ 5 ปี จึงไม่เสียภาษีธุรกิจเฉพาะ';
      rows.push({ k:'stamp', t:'อากรแสตมป์ 0.5%', sub:why, v: base * .005, who:'seller' });
    }

    // 3) ภาษีเงินได้หัก ณ ที่จ่าย
    var wht, whtSub;
    if (company){
      wht = base * .01;
      whtSub = '1% ของราคาซื้อขายหรือราคาประเมิน แล้วแต่สูงกว่า';
    } else {
      var expRate = EXPENSE[Math.min(years, 8)];
      var net = appraisal * (1 - expRate);
      wht = progressive(net / years) * years;
      wht = Math.min(wht, appraisal * .20);
      whtSub = 'คิดขั้นบันไดจากราคาประเมิน หักค่าใช้จ่ายเหมา ' + Math.round(expRate * 100) + '% (ถือครอง ' + years + ' ปี)';
    }
    rows.push({ k:'wht', t:'ภาษีเงินได้หัก ณ ที่จ่าย', sub:whtSub, v:wht, who:'seller' });

    var total = rows.reduce(function(a, r){ return a + r.v; }, 0);
    var buyer = rows.reduce(function(a, r){ return a + (r.who === 'split' ? r.v / 2 : 0); }, 0);

    return { rows:rows, total:total, buyer:buyer, seller:total - buyer,
             appraisal:appraisal, land:land, building:building,
             estimated:!!est && !buildGiven, est:est,
             assumed:!apprGiven, years:years, company:company,
             type:typeKey, typeLabel:type.label, hasBuilding:type.build,
             registered:registered, discountOn:discountOn, feeRate:feeRate };
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

    // แจกแจงให้เห็นว่าราคาประเมินที่ใช้คำนวณมาจากไหน เมื่อมีสิ่งปลูกสร้าง
    var breakdown = '';
    if (r.hasBuilding && !r.assumed){
      breakdown = '<div class="fc-break"><b>ราคาประเมินที่ใช้คำนวณ ' + baht(r.appraisal) + ' บาท</b>' +
        '<span>ที่ดิน ' + baht(r.land) + ' + สิ่งปลูกสร้าง ' + baht(r.building) +
        (r.estimated ? ' <i>(ประมาณจาก ' + baht(r.est.area) + ' ตร.ม. × ' + baht(r.est.rate) +
                       ' บาท/ตร.ม. หักค่าเสื่อม ' + Math.round(r.est.dep * 100) + '%)</i>' : '') +
        '</span></div>';
    }

    var warns = '';
    if (r.assumed){
      warns += '<p class="fc-warn">ยังไม่ได้กรอกราคาประเมินราชการ — ตัวเลขข้างบนคำนวณจากราคาซื้อขายแทน ' +
        'ราคาประเมินจริงมักต่ำกว่าราคาซื้อขายมาก <b>ค่าใช้จ่ายจริงจึงมักถูกกว่านี้</b> ' +
        '<a href="' + LINE + '" target="_blank" rel="noopener" data-contact="line">ทักไลน์ให้ทีมเราตรวจราคาประเมินให้ฟรี →</a></p>';
    }
    if (r.estimated){
      warns += '<p class="fc-warn">ราคาต่อ ตร.ม. เป็น<b>ตัวเลขจริงจากบัญชีกรมธนารักษ์</b> แต่ <b>ค่าเสื่อมตามอายุยังเป็นค่าประมาณ</b> ' +
        'เพราะกรมธนารักษ์ไม่ได้เปิดตารางหักค่าเสื่อมเป็นข้อมูลเปิด ยอดจริงเจ้าหน้าที่คำนวณให้ในวันโอน</p>';
    }
    if (r.discountOn){
      warns += '<p class="fc-warn">คุณเลือกใช้อัตราลดตามมาตรการรัฐเอง — <b>เว็บนี้ไม่ได้ตรวจสอบให้ว่าเข้าเงื่อนไขจริงหรือไม่</b> ' +
        'มาตรการมีกำหนดเวลาและเงื่อนไข (เช่น ผู้ซื้อต้องเป็นบุคคลธรรมดาสัญชาติไทย ราคาไม่เกินเพดานที่กำหนด) ' +
        'ทั้งอัตราและวันสิ้นสุดเปลี่ยนได้ <b>ต้องยืนยันกับสำนักงานที่ดินก่อนเสมอ</b></p>';
    }

    return rows +
      '<div class="fc-row total"><div><b>รวมค่าใช้จ่ายวันโอน</b></div><em>' + baht(r.total) + '</em></div>' +
      '<div class="fc-split">' +
        '<div><span>ผู้ซื้อจ่ายตามธรรมเนียม</span><b>' + baht(r.buyer) + '</b></div>' +
        '<div><span>ผู้ขายจ่ายตามธรรมเนียม</span><b>' + baht(r.seller) + '</b></div>' +
      '</div>' + breakdown + warns;
  }

  function mount(el, opts){
    if (!el) return;
    var o = opts || {};
    var sale = Number(o.salePrice) || 0;
    var typeOpts = Object.keys(TYPES).map(function(k){
      return '<option value="' + k + '">' + TYPES[k].label + '</option>';
    }).join('');

    el.className = 'fc';
    el.innerHTML =
      '<div class="fc-head"><b>ประมาณการค่าใช้จ่ายวันโอน</b><span>กรอกตัวเลขเองเพื่อดูค่าธรรมเนียมและภาษีที่ต้องเตรียม</span></div>' +
      '<div class="fc-grid">' +
        '<label>ประเภททรัพย์<select data-fc="propertyType">' + typeOpts + '</select></label>' +
        '<label>ราคาซื้อขาย (บาท)<input type="text" inputmode="numeric" data-fc="salePrice" value="' + (sale ? baht(sale) : '') + '" placeholder="เช่น 5,000,000"></label>' +
        '<label>ราคาประเมินที่ดิน (บาท)<input type="text" inputmode="numeric" data-fc="landAppraisal" placeholder="ถ้าไม่ทราบ เว้นว่างไว้ได้"></label>' +
        '<label>ผู้ขายเป็น<select data-fc="sellerType"><option value="person">บุคคลธรรมดา</option><option value="company">นิติบุคคล / บริษัท</option></select></label>' +
        '<label>ถือครองมาแล้ว (ปี)<input type="number" min="1" max="10" step="1" data-fc="years" value="5"></label>' +
      '</div>' +

      '<div class="fc-sub" data-fc-building hidden>' +
        '<div class="fc-sub-h">สิ่งปลูกสร้าง</div>' +
        '<div class="fc-grid">' +
          '<label>ราคาประเมินสิ่งปลูกสร้าง (บาท)<input type="text" inputmode="numeric" data-fc="buildingAppraisal" placeholder="ทราบตัวเลขจริง กรอกตรงนี้"></label>' +
          '<label>หรือประมาณจากพื้นที่ (ตร.ม.)<input type="text" inputmode="numeric" data-fc="buildingArea" placeholder="เช่น 150"></label>' +
          '<label>อายุอาคาร (ปี)<input type="number" min="0" max="60" step="1" data-fc="buildingAge" value="10"></label>' +
        '</div>' +
          '<div class="fc-grid">' +
            '<label>จังหวัดที่ตั้ง<select data-fc="province"><option value="">— เลือกจังหวัด —</option></select></label>' +
            '<label>ราคาต่อ ตร.ม. ที่ใช้<input type="text" data-fc-rateshow readonly tabindex="-1"></label>' +
          '</div>' +
        '<p class="fc-note">กรอกราคาประเมินสิ่งปลูกสร้างเองจะแม่นที่สุด — ค้นได้ที่ ' +
          '<a href="https://assessprice.treasury.go.th/" target="_blank" rel="noopener">ระบบค้นหาราคาประเมินของกรมธนารักษ์</a> ' +
          'หรือถามเจ้าหน้าที่สำนักงานที่ดิน ถ้ากรอกแค่พื้นที่กับอายุ ระบบจะประมาณให้แบบคร่าว ๆ</p>' +
        '<label class="fc-check"><input type="checkbox" data-fc="registered"> ' +
          'ผู้ขายมีชื่อในทะเบียนบ้านหลังนี้มาแล้วเกิน 1 ปี <i>(ได้ยกเว้นภาษีธุรกิจเฉพาะ แม้ถือครองไม่ถึง 5 ปี)</i></label>' +
        '<label class="fc-check"><input type="checkbox" data-fc="govDiscount"> ' +
          'ใช้สิทธิลดค่าธรรมเนียมโอนตามมาตรการรัฐ <i>(ต้องยืนยันสิทธิกับสำนักงานที่ดินก่อน)</i></label>' +
        '<label class="fc-rate" data-fc-rate hidden>อัตราที่สำนักงานที่ดินแจ้ง' +
          '<select data-fc="govRate"><option value="0.01">0.01%</option><option value="1">1%</option></select></label>' +
      '</div>' +

      '<div class="fc-out" data-fc-out></div>' +
      '<p class="fc-foot"><b>ที่ดินเปล่าไม่ได้สิทธิ</b>ลดค่าธรรมเนียมโอนตามมาตรการรัฐ — มาตรการนั้นใช้เฉพาะที่อยู่อาศัย · ' +
      'การแบ่งจ่ายคนละครึ่งเป็นธรรมเนียมปฏิบัติ ไม่ใช่ข้อบังคับตามกฎหมาย ตกลงกันเป็นอย่างอื่นได้ · ' +
      'ตัวเลขนี้เป็นประมาณการเพื่อใช้เตรียมเงินเท่านั้น <b>ยอดจริงเจ้าหน้าที่สำนักงานที่ดินคำนวณในวันโอน</b> ' +
      'และอาจต่างไปตามกรณีเฉพาะ (เช่น ได้ที่ดินมาโดยมรดก หรือแปลงอยู่นอกเขตเทศบาลซึ่งได้ยกเว้นเงินได้ 200,000 บาท)</p>';

    var out = el.querySelector('[data-fc-out]');
    var buildBox = el.querySelector('[data-fc-building]');
    var rateBox = el.querySelector('[data-fc-rate]');
    var provSel = el.querySelector('[data-fc="province"]');
    var rateShow = el.querySelector('[data-fc-rateshow]');

    // โหลดบัญชีราคาสิ่งปลูกสร้างของกรมธนารักษ์ — ล้มเหลวก็ยังใช้เครื่องคำนวณได้
    // แค่ตัวช่วยประมาณจะใช้ไม่ได้ ต้องกรอกราคาประเมินเองแทน ห้าม fallback เป็นตัวเลขที่เดา
    loadBuildingPrices().then(function () {
      if (provSel) provinces().forEach(function (pv) {
        var o = document.createElement('option');
        o.value = pv[0]; o.textContent = pv[1]; provSel.appendChild(o);
      });
      update();
    });

    function read(){
      var v = {};
      el.querySelectorAll('[data-fc]').forEach(function(f){
        v[f.getAttribute('data-fc')] = f.type === 'checkbox' ? f.checked : f.value;
      });
      return v;
    }
    function update(){
      var v = read();
      var t = TYPES[v.propertyType] || TYPES.land;
      buildBox.hidden = !t.build;
      rateBox.hidden = !(t.home && v.govDiscount);
      if (rateShow) {
        var rt = rateOf(v.propertyType, v.province);
        rateShow.value = !BP ? 'โหลดบัญชีราคาไม่ได้'
          : !v.province ? 'เลือกจังหวัดก่อน'
          : rt > 0 ? baht(rt) + ' บาท/ตร.ม.' : 'จังหวัดนี้ไม่มีข้อมูลประเภทนี้';
      }
      out.innerHTML = resultHtml(calc(v));
    }
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

  // ใส่บัญชีราคาเองได้ ใช้ตอนทดสอบเพื่อไม่ต้องพึ่งเครือข่าย
  // และเผื่ออนาคตอยากโหลดบัญชีจากที่อื่นโดยไม่ต้องแก้ไฟล์นี้
  function setBuildingPrices(d) {
    if (!d) { BP = null; return; }
    BP = d; BP.typeIndex = {}; BP.typeName = {};
    (d.types || []).forEach(function (t, i) { BP.typeIndex[t[0]] = i; BP.typeName[t[0]] = t[1]; });
  }

  // โหลดบัญชีราคาจากเซิร์ฟเวอร์ครั้งเดียว แล้วแชร์ผลให้ทุกเครื่องมือที่เรียก
  // (valuecalc.js ก็ใช้ตัวนี้ จะได้ไม่ยิงซ้ำสองรอบเมื่ออยู่หน้าเดียวกัน)
  // ล้มเหลว = คืน null ผู้เรียกต้องให้ผู้ใช้กรอกราคาเอง ห้าม fallback เป็นตัวเลขที่เดา
  function loadBuildingPrices() {
    if (!bpPromise) {
      bpPromise = fetch(BUILDING_URL)
        .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
        .then(function (d) { setBuildingPrices(d); return BP; })
        .catch(function () { BP = null; return null; });
    }
    return bpPromise;
  }

  // รายชื่อจังหวัดในบัญชี — ว่างถ้ายังโหลดไม่เสร็จหรือโหลดไม่ได้
  function provinces() { return (BP && BP.provinces) || []; }

  // ---------------------------------------------------------------------------
  // การต่อเข้าหน้าเว็บแบบ "ปุ่มเปิด + กล่องกางออก" — ใช้กับหน้าแรก (index.html)
  // หน้าที่เรียก mount() เองอยู่แล้ว (land.html · guides.html) ไม่มี #fee-calc จึงข้ามทั้งก้อน
  // ทำตามแบบเดียวกับ surveyquote.js เพื่อให้ปุ่มทั้งสองใบในแถบบริการหน้าแรกทำงานเหมือนกัน
  function bootPage(){
    var root = document.getElementById('fee-calc');
    if (!root) return;
    var mounted = false;
    root.hidden = true;
    function open(){
      // mount ครั้งเดียวตลอดอายุหน้า — mount ซ้ำทุกครั้งที่กดปุ่ม ตัวเลขที่ผู้ใช้กรอกค้างไว้จะหายหมด
      if (!mounted) { mount(root, {}); mounted = true; }
      root.hidden = false;
      root.scrollIntoView({ behavior:'smooth', block:'nearest' });
      var f = root.querySelector('[data-fc="salePrice"]');
      if (f) f.focus({ preventScroll:true });
    }
    document.querySelectorAll('[data-fc-open]').forEach(function (t){
      t.addEventListener('click', function (e){
        e.preventDefault();
        if (root.hidden) open(); else root.hidden = true;
      });
    });
  }
  // ⚠️ ต้องเช็ค document ก่อนเสมอ — feecalc.test.js รันไฟล์นี้ด้วย node ซึ่งไม่มี DOM
  // ของเดิมไม่เคยแตะ document ตอนโหลด (mount ถูกเรียกจากหน้าเว็บทีหลัง) เทสต์จึงผ่านมาตลอด
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootPage);
    else bootPage();
  }

  window.NJFeeCalc = { calc:calc, estimateBuilding:estimateBuilding, TYPES:TYPES,
                       mount:mount, setBuildingPrices:setBuildingPrices,
                       loadBuildingPrices:loadBuildingPrices, provinces:provinces };
})();
