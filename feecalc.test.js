// ทดสอบเครื่องคำนวณค่าโอน — เทียบกับการคำนวณมือทีละขั้น
// รันด้วย:  node feecalc.test.js
const fs = require('fs');
global.window = {};
new Function(fs.readFileSync(__dirname + '/feecalc.js', 'utf8'))();
const { calc, estimateBuilding, setBuildingPrices } = global.window.NJFeeCalc;

// ตารางราคาจำลอง — ตัวเลขคัดมาจากบัญชีจริงของกรมธนารักษ์ เฉพาะ กทม.(10) และเชียงใหม่(50)
// ใส่เองแบบนี้เพื่อให้เทสต์ไม่ต้องต่อเน็ต และผลไม่เปลี่ยนตามรอบบัญชีที่กรมประกาศใหม่
// (ของจริงโหลดจาก buildingprice.json ตอน mount)
setBuildingPrices({
  types: [['103','บ้านพักอาศัยตึกชั้นเดียว'], ['104','บ้านพักอาศัยไม้สองชั้น'],
          ['105','บ้านพักอาศัยตึกสองชั้น'], ['106','บ้านพักอาศัยครึ่งตึกครึ่งไม้สองชั้น'],
          ['202','บ้านแถว (ทาวน์เฮาส์) สองชั้น'], ['402','ตึกแถวสองชั้น'],
          ['501','คลังสินค้า พื้นที่ไม่เกิน 300 ตารางเมตร'], ['520/1','อาคารอยู่อาศัยรวม ความสูงไม่เกิน 5 ชั้น']],
  provinces: [['10','กรุงเทพมหานคร'], ['50','เชียงใหม่']],
  prices: { '10':[8750,8300,8550,8600,7850,8450,5800,8150],
            '50':[9050,7700,8800,7950,7950,8450,6050,8500] }
});

let pass = 0, fail = 0;
function eq(label, got, want, tol) {
  const ok = Math.abs(got - want) <= (tol == null ? 0.5 : tol);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + label + '\n      ได้ ' + got + '  ต้องการ ' + want); }
}
function ok(label, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + label); } }
function row(r, k) { return r.rows.filter(x => x.k === k)[0]; }
function has(label, r, k, yes) { ok(label, !!row(r, k) === yes); }

// ---------------------------------------------------------------------------
// ส่วนที่ 1 — ของเดิมต้องไม่พัง (ที่ดินเปล่า ผลลัพธ์ต้องเท่าเวอร์ชันเก่าเป๊ะ)
// ---------------------------------------------------------------------------
console.log('เคส 1 — ที่ดินเปล่า บุคคลธรรมดา ถือครอง 6 ปี (ต้องได้เท่าเวอร์ชันเดิม)');
let r = calc({ propertyType:'land', salePrice:10000000, landAppraisal:4000000, sellerType:'person', years:6 });
eq('ค่าธรรมเนียมโอน 2% ของ 4,000,000', row(r,'transfer').v, 80000);
has('ต้องเป็นอากรแสตมป์', r, 'stamp', true);
eq('อากรแสตมป์ 0.5% ของ 10,000,000', row(r,'stamp').v, 50000);
eq('ภาษีเงินได้หัก ณ ที่จ่าย', row(r,'wht').v, 80000, 1);
eq('รวม', r.total, 210000, 1);
eq('ผู้ซื้อครึ่งค่าโอน', r.buyer, 40000);

console.log('เคส 2 — ที่ดินเปล่า ถือครอง 2 ปี');
r = calc({ propertyType:'land', salePrice:10000000, landAppraisal:4000000, sellerType:'person', years:2 });
has('ต้องเป็นภาษีธุรกิจเฉพาะ', r, 'sbt', true);
eq('ภาษีธุรกิจเฉพาะ', row(r,'sbt').v, 330000);
eq('รวม', r.total, 444000, 1);

console.log('เคส 3 — นิติบุคคล ถือครอง 9 ปี');
r = calc({ propertyType:'land', salePrice:10000000, landAppraisal:4000000, sellerType:'company', years:9 });
has('นิติบุคคลเสียภาษีธุรกิจเฉพาะเสมอ', r, 'sbt', true);
eq('หัก ณ ที่จ่าย 1%', row(r,'wht').v, 100000);
eq('รวม', r.total, 510000);

// ---------------------------------------------------------------------------
// ส่วนที่ 2 — สิ่งปลูกสร้าง
// ---------------------------------------------------------------------------
// บ้านเดี่ยว: ที่ดินประเมิน 2,000,000 + สิ่งปลูกสร้างกรอกเอง 1,500,000 = 3,500,000
//   ค่าโอน 2% ของ 3,500,000 = 70,000
console.log('เคส 4 — บ้านเดี่ยว กรอกราคาประเมินสิ่งปลูกสร้างเอง');
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000,
           buildingAppraisal:1500000, sellerType:'person', years:6 });
eq('ราคาประเมินรวม = ที่ดิน + สิ่งปลูกสร้าง', r.appraisal, 3500000);
eq('ค่าธรรมเนียมโอน 2% ของ 3,500,000', row(r,'transfer').v, 70000);
ok('ต้องไม่ติดธง estimated เพราะกรอกเอง', r.estimated === false);
ok('ต้องไม่ติดธง assumed', r.assumed === false);

// ตัวช่วยประมาณ: บ้านเดี่ยวตึก 150 ตร.ม. อายุ 10 ปี
//   9,000 × 150 = 1,350,000 · ค่าเสื่อม 10 ปี × 1% = 10% → 1,350,000 × .9 = 1,215,000
console.log('เคส 5 — ตัวช่วยประมาณราคาสิ่งปลูกสร้าง');
let e = estimateBuilding('house', 150, 10, null, '10');
// กทม. บ้านตึกสองชั้น 8,550 บาท/ตร.ม. x 150 = 1,282,500 หักค่าเสื่อม 10 ปี x 1% = 10%
eq('ประมาณสิ่งปลูกสร้าง', e.value, 1282500 * 0.9);
eq('ค่าเสื่อม 10%', e.dep, 0.10, 0.0001);
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000,
           buildingArea:150, buildingAge:10, province:'10', sellerType:'person', years:6 });
eq('ราคาประเมินรวมจากตัวช่วย', r.appraisal, 2000000 + 1282500 * 0.9);
ok('ต้องติดธง estimated เพื่อให้หน้าเว็บเตือน', r.estimated === true);

// เพดานค่าเสื่อม — บ้านไม้ 3%/ปี เพดาน 70%  ต่อให้ 90 ปีก็ต้องหยุดที่ 70%
console.log('เคส 6 — เพดานค่าเสื่อม');
e = estimateBuilding('wood', 100, 90, null, '10');
eq('ค่าเสื่อมต้องตันที่ 70%', e.dep, 0.70, 0.0001);
eq('มูลค่าเหลือ 30%', e.value, 100 * 8300 * 0.30, 1);

// กรอกราคาประเมินสิ่งปลูกสร้างเองต้องชนะตัวช่วยประมาณเสมอ
console.log('เคส 7 — กรอกเองต้องชนะค่าประมาณ');
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000,
           buildingAppraisal:900000, buildingArea:150, buildingAge:10, province:'10',
           sellerType:'person', years:6 });
eq('ต้องใช้ 900,000 ที่กรอกเอง ไม่ใช่ 1,215,000 ที่ประมาณได้', r.appraisal, 2900000);
ok('กรอกเองแล้วต้องไม่ติดธง estimated', r.estimated === false);

// ---------------------------------------------------------------------------
// ส่วนที่ 3 — ยกเว้นภาษีธุรกิจเฉพาะจากทะเบียนบ้าน
// ---------------------------------------------------------------------------
console.log('เคส 8 — มีชื่อในทะเบียนบ้านครบ 1 ปี ถือครอง 2 ปี');
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000, buildingAppraisal:1000000,
           sellerType:'person', years:2, registered:true });
has('ต้องได้ยกเว้นภาษีธุรกิจเฉพาะ', r, 'sbt', false);
has('ต้องเสียอากรแสตมป์แทน', r, 'stamp', true);
eq('อากรแสตมป์ 0.5% ของ 5,000,000', row(r,'stamp').v, 25000);

console.log('เคส 9 — ที่ดินเปล่าติ๊กทะเบียนบ้านต้องไม่มีผล (ที่ดินเปล่าไม่มีทะเบียนบ้าน)');
r = calc({ propertyType:'land', salePrice:5000000, landAppraisal:2000000,
           sellerType:'person', years:2, registered:true });
has('ต้องยังเสียภาษีธุรกิจเฉพาะ', r, 'sbt', true);
ok('ธง registered ต้องเป็น false', r.registered === false);

console.log('เคส 10 — นิติบุคคลติ๊กทะเบียนบ้านต้องไม่มีผล');
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000, buildingAppraisal:1000000,
           sellerType:'company', years:2, registered:true });
has('นิติบุคคลต้องยังเสียภาษีธุรกิจเฉพาะ', r, 'sbt', true);

// ---------------------------------------------------------------------------
// ส่วนที่ 4 — มาตรการลดค่าธรรมเนียม ต้องไม่เปิดเอง และห้ามใช้กับที่ดินเปล่า
// ---------------------------------------------------------------------------
console.log('เคส 11 — ไม่ติ๊กมาตรการ ต้องคิด 2% เต็มเสมอ');
r = calc({ propertyType:'house', salePrice:3000000, landAppraisal:1000000, buildingAppraisal:1000000,
           sellerType:'person', years:6 });
eq('ต้องเป็น 2% ของ 2,000,000', row(r,'transfer').v, 40000);
ok('ธง discountOn ต้องเป็น false', r.discountOn === false);

console.log('เคส 12 — ติ๊กมาตรการ 0.01% กับบ้าน');
r = calc({ propertyType:'house', salePrice:3000000, landAppraisal:1000000, buildingAppraisal:1000000,
           sellerType:'person', years:6, govDiscount:true, govRate:0.01 });
eq('ค่าโอน 0.01% ของ 2,000,000', row(r,'transfer').v, 200);
ok('ธง discountOn ต้องเป็น true', r.discountOn === true);

console.log('เคส 13 — ติ๊กมาตรการ 1% (อีกอัตราที่แหล่งข้อมูลระบุ)');
r = calc({ propertyType:'house', salePrice:3000000, landAppraisal:1000000, buildingAppraisal:1000000,
           sellerType:'person', years:6, govDiscount:true, govRate:1 });
eq('ค่าโอน 1% ของ 2,000,000', row(r,'transfer').v, 20000);

console.log('เคส 14 — ที่ดินเปล่าติ๊กมาตรการต้องถูกปฏิเสธ (กติกาข้อ 3)');
r = calc({ propertyType:'land', salePrice:3000000, landAppraisal:2000000,
           sellerType:'person', years:6, govDiscount:true, govRate:0.01 });
eq('ต้องยังเป็น 2% ของ 2,000,000', row(r,'transfer').v, 40000);
ok('ธง discountOn ต้องเป็น false', r.discountOn === false);

console.log('เคส 15 — คลังสินค้า ไม่ใช่ที่อยู่อาศัย ติ๊กมาตรการต้องไม่มีผล');
r = calc({ propertyType:'warehouse', salePrice:3000000, landAppraisal:1000000, buildingAppraisal:1000000,
           sellerType:'person', years:6, govDiscount:true, govRate:0.01 });
eq('ต้องยังเป็น 2%', row(r,'transfer').v, 40000);
ok('ธง discountOn ต้องเป็น false', r.discountOn === false);

// ---------------------------------------------------------------------------
// ส่วนที่ 5 — ค่าขอบ
// ---------------------------------------------------------------------------
console.log('เคส 16 — ค่าขอบ');
ok('ไม่กรอกอะไรเลยต้องคืน null', calc({}) === null);
r = calc({ propertyType:'house', salePrice:5000000, sellerType:'person', years:6 });
ok('ไม่กรอกราคาประเมินเลยต้องติดธง assumed', r.assumed === true);
eq('ต้องใช้ราคาขายแทน', r.appraisal, 5000000);
ok('พื้นที่ 0 ต้องประมาณไม่ได้ ไม่ใช่ได้ 0', estimateBuilding('house', 0, 5, null, '10') === null);
ok('ไม่เลือกจังหวัด ต้องประมาณไม่ได้ ไม่ใช่เดาเรตให้', estimateBuilding('house', 150, 5, null, '') === null);
ok('จังหวัดที่ไม่มีในบัญชี ต้องประมาณไม่ได้', estimateBuilding('house', 150, 5, null, '99') === null);
eq('เรตต่างจังหวัดต้องต่างกันจริง', estimateBuilding('house', 100, 0, null, '50').rate, 8800);
ok('ที่ดินเปล่าต้องประมาณสิ่งปลูกสร้างไม่ได้', estimateBuilding('land', 100, 5, null, '10') === null);
eq('ค่ามีคอมมาต้องอ่านได้', calc({ propertyType:'house', salePrice:'5,000,000',
     landAppraisal:'2,000,000', buildingAppraisal:'1,500,000', years:6 }).appraisal, 3500000);
eq('ถือครอง 30 ปีต้องถูกจำกัดที่ 10', calc({ propertyType:'land', salePrice:1000000, years:30 }).years, 10);
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000,
           buildingAppraisal:1000000, buildingRate:99999, province:'10', sellerType:'person', years:6 });
eq('กรอกราคาเองแล้ว buildingRate ต้องไม่ถูกใช้', r.appraisal, 3000000);

// ---------------------------------------------------------------------------
// ส่วนที่ 6 — โหมดห้องชุด (condounit · รอบคอนโด 2 · 10 ต.ค. 2569)
//   ราคาประเมินห้องชุดต่อ ตร.ม. × ขนาดห้อง กรอกเองทั้งคู่ · ไม่ฝัง/ไม่เติมราคาประเมิน · อัตราชุดเดียวกับทุกประเภท
// ---------------------------------------------------------------------------
console.log('เคส 17 — ห้องชุด ราคาซื้อขาย 3,200,000 · ประเมิน 50,000 บาท/ตร.ม. × 32 ตร.ม. = 1,600,000 · บุคคลธรรมดา ถือครอง 6 ปี');
let u = calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, unitSqm:32, sellerType:'person', years:6 });
eq('ราคาประเมินที่ใช้คำนวณ = ต่อ ตร.ม. × ขนาดห้อง', u.appraisal, 1600000);
eq('ค่าธรรมเนียมโอน 2% ของ 1,600,000', row(u,'transfer').v, 32000);
has('ครบ 5 ปี ต้องเป็นอากรแสตมป์', u, 'stamp', true);
eq('อากรแสตมป์ 0.5% ของราคาซื้อขาย 3,200,000 (สูงกว่าราคาประเมิน)', row(u,'stamp').v, 16000);
eq('ภาษีเงินได้หัก ณ ที่จ่าย (คำนวณมือ: (1,600,000×0.4)/6 × 5% × 6)', row(u,'wht').v, 32000, 1);
eq('รวมค่าใช้จ่ายวันโอน', u.total, 80000, 1);
eq('ผู้ซื้อครึ่งค่าโอน', u.buyer, 16000);
ok('ติดธง isUnit และไม่ใช่สิ่งปลูกสร้าง', u.isUnit === true && u.hasBuilding === false && u.unit.sqm === 32 && u.unit.rate === 50000);
ok('มีราคาประเมินจากผู้ใช้ = ไม่ติดธง assumed', u.assumed === false);

console.log('เคส 18 — ขนาดห้องทศนิยม และค่ามีคอมมา');
u = calc({ propertyType:'condounit', salePrice:'4,000,000', unitRate:'60,000', unitSqm:'32.5', sellerType:'person', years:6 });
eq('60,000 × 32.5 = 1,950,000', u.appraisal, 1950000);

console.log('เคส 19 — ⭐ ไม่ครบทั้งสองช่อง = ยังไม่รู้ราคาประเมิน ใช้ราคาซื้อขายแทนและติดธง (ไม่เดาขนาด/ราคา)');
u = calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, sellerType:'person', years:6 });
ok('มีแต่ราคาต่อ ตร.ม. → assumed', u.assumed === true && u.appraisal === 3200000 && u.unit === null);
u = calc({ propertyType:'condounit', salePrice:3200000, unitSqm:32, sellerType:'person', years:6 });
ok('มีแต่ขนาดห้อง → assumed', u.assumed === true && u.appraisal === 3200000);
u = calc({ propertyType:'condounit', salePrice:3200000, sellerType:'person', years:6 });
ok('ไม่กรอกอะไร → assumed ใช้ราคาซื้อขาย', u.assumed === true && u.appraisal === 3200000);
ok('⭐ ไม่ใส่ตัวเลขห้องชุดเลย = ไม่มีทางได้ราคาประเมินที่ระบบเดาให้ (ไม่มีตัวช่วยประมาณ)', estimateBuilding('condounit', 32, 5, 50000, '10') === null);

console.log('เคส 20 — ⭐ ราคาประเมินที่ดินที่ค้างในช่อง ไม่ถูกรวมเข้าห้องชุด (ห้องชุดไม่มีราคาที่ดินแยก)');
u = calc({ propertyType:'condounit', salePrice:3200000, landAppraisal:9999999, unitRate:50000, unitSqm:32, sellerType:'person', years:6 });
eq('ยังเป็น 1,600,000', u.appraisal, 1600000);
eq('ช่องที่ดินเป็น 0', u.land, 0);

console.log('เคส 21 — ⭐ ใช้สูตร/อัตราชุดเดียวกับที่ดิน (ไม่มีสูตรชุดที่สอง): ฐานเท่ากัน ผลต้องเท่ากันทุกบรรทัด');
const asLand = calc({ propertyType:'land', salePrice:3200000, landAppraisal:1600000, sellerType:'person', years:6 });
ok('รายการและยอดทุกบรรทัดเท่ากับกรณีที่ดินที่ฐานเท่ากัน',
   JSON.stringify(calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, unitSqm:32, sellerType:'person', years:6 }).rows.map(x => [x.k, Math.round(x.v)])) ===
   JSON.stringify(asLand.rows.map(x => [x.k, Math.round(x.v)])));
u = calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, unitSqm:32, sellerType:'person', years:2 });
has('ถือครอง 2 ปี ไม่มีชื่อในทะเบียนบ้าน → ภาษีธุรกิจเฉพาะ', u, 'sbt', true);
eq('ภาษีธุรกิจเฉพาะ 3.3% ของ 3,200,000', row(u,'sbt').v, 105600);
u = calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, unitSqm:32, sellerType:'person', years:2, registered:true });
has('ห้องชุดที่อยู่อาศัย มีชื่อในทะเบียนบ้านครบ 1 ปี → ยกเว้นภาษีธุรกิจเฉพาะ (ใช้กติกาเดียวกับที่อยู่อาศัยอื่น)', u, 'sbt', false);
u = calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, unitSqm:32, sellerType:'company', years:9 });
has('ผู้ขายนิติบุคคลเสียภาษีธุรกิจเฉพาะเสมอ', u, 'sbt', true);

console.log('เคส 22 — ⭐ มาตรการลดค่าโอน: ไม่ติ๊ก = 2% เสมอ · ติ๊กเองถึงลด (ห้องชุดเป็นที่อยู่อาศัย)');
u = calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, unitSqm:32, sellerType:'person', years:6 });
ok('ไม่ติ๊ก = ไม่ลด', u.discountOn === false && Math.abs(row(u,'transfer').v - 32000) < 0.5);
u = calc({ propertyType:'condounit', salePrice:3200000, unitRate:50000, unitSqm:32, sellerType:'person', years:6, govDiscount:true, govRate:0.01 });
ok('ติ๊กเองแล้วเลือก 0.01% จึงลด', u.discountOn === true && Math.abs(row(u,'transfer').v - 160) < 0.5);

console.log('เคส 23 — ⭐ ไม่ฝังตัวเลขราคาประเมินห้องชุดในโค้ด และไม่แตะข้อมูลราคาที่ดิน');
const fcSrc = fs.readFileSync(__dirname + '/feecalc.js', 'utf8');
const unitDef = (fcSrc.match(/condounit:\s*\{[^}]*\}/) || [''])[0];
ok('นิยามประเภทห้องชุดไม่มีราคา/อัตราต่อ ตร.ม. ฝังไว้', unitDef && !/rate|price|code|\d{4,}/.test(unitDef.replace(/label:'[^']*'/, '')), unitDef);
ok('เรียกเครือข่ายที่เดียวคือบัญชีสิ่งปลูกสร้าง (BUILDING_URL) ไม่มีแหล่งราคาประเมินห้องชุด/ที่ดินเพิ่ม', (fcSrc.match(/fetch\(/g) || []).length === 1 && /fetch\(BUILDING_URL\)/.test(fcSrc));
ok('ประเภทห้องชุดไม่ปนในรายการประมาณสิ่งปลูกสร้างของ valuecalc (build:false)', global.window.NJFeeCalc.TYPES.condounit.build === false);
ok('คงประเภท condo เดิม (อาคารอยู่อาศัยรวม) ไว้ ไม่เปลี่ยนความหมาย', global.window.NJFeeCalc.TYPES.condo.build === true && global.window.NJFeeCalc.TYPES.condo.code === '520/1');

console.log('เคส 24 — ⭐ ราคาประเมินที่ทีมงานตรวจ (แปลงที่ทีมบันทึกค่า · ทาง ก · 10 ต.ค. 2569)');
let tA = calc({ propertyType:'land', salePrice:8000000, landAppraisal:'5,000,000', landFromTeam:'5000000', sellerType:'person', years:6 });
ok('ใช้ราคาประเมินจากทีม = ไม่ติดธง assumed', tA.assumed === false);
ok('ติดธง teamAppraisal เมื่อช่องยังเป็นตัวเลขของทีม', tA.teamAppraisal === true);
eq('ค่าธรรมเนียมโอน 2% ของราคาประเมิน 5,000,000 (ไม่ใช่ของราคาขาย)', row(tA,'transfer').v, 100000);
tA = calc({ propertyType:'land', salePrice:8000000, landAppraisal:'4,000,000', landFromTeam:'5000000', sellerType:'person', years:6 });
ok('แก้ตัวเลขเองแล้ว ธง teamAppraisal ต้องหาย', tA.teamAppraisal === false);
eq('คิดจากตัวเลขที่ผู้ใช้แก้', row(tA,'transfer').v, 80000);
tA = calc({ propertyType:'land', salePrice:8000000, landAppraisal:'', landFromTeam:'5000000', sellerType:'person', years:6 });
ok('ลบช่องทิ้ง = กลับเป็น assumed ตามเดิม ไม่มีธงทีม', tA.assumed === true && !tA.teamAppraisal);
const tNo = calc({ propertyType:'land', salePrice:8000000, sellerType:'person', years:6 });
ok('ไม่มีราคาจากทีม = assumed และไม่มีธงทีม', tNo.assumed === true && !tNo.teamAppraisal);
ok('ส่ง landFromTeam ว่าง = แถวผลลัพธ์เท่าแบบไม่มีช่องนี้',
  JSON.stringify(calc({ propertyType:'land', salePrice:10000000, landAppraisal:4000000, sellerType:'person', years:6 }).rows) ===
  JSON.stringify(calc({ propertyType:'land', salePrice:10000000, landAppraisal:4000000, landFromTeam:'', sellerType:'person', years:6 }).rows));
tA = calc({ propertyType:'condounit', salePrice:3200000, landAppraisal:5000000, landFromTeam:5000000, sellerType:'person', years:6 });
ok('ห้องชุดไม่ใช้ราคาประเมินที่ดินจากทีม', !tA.teamAppraisal);
ok('mount เติมช่องราคาประเมินจาก opts.teamAppraisal เท่านั้น', /o\.teamAppraisal/.test(fcSrc));
ok('ข้อความแหล่งที่มา/รอบบัญชีจาก API ถูก escape ก่อนลง HTML', /esc\(team\.source/.test(fcSrc) && /esc\(team\.cycle\)/.test(fcSrc));

console.log('\n' + (fail ? '✗ ไม่ผ่าน ' + fail + ' ข้อ · ผ่าน ' + pass : '✓ ผ่านทั้งหมด ' + pass + ' ข้อ'));
process.exit(fail ? 1 : 0);
