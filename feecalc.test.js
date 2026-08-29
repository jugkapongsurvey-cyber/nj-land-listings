// ทดสอบเครื่องคำนวณค่าโอน — เทียบกับการคำนวณมือทีละขั้น
// รันด้วย:  node feecalc.test.js
const fs = require('fs');
global.window = {};
new Function(fs.readFileSync(__dirname + '/feecalc.js', 'utf8'))();
const { calc, estimateBuilding } = global.window.NJFeeCalc;

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
let e = estimateBuilding('house', 150, 10);
eq('ประมาณสิ่งปลูกสร้าง', e.value, 1215000);
eq('ค่าเสื่อม 10%', e.dep, 0.10, 0.0001);
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000,
           buildingArea:150, buildingAge:10, sellerType:'person', years:6 });
eq('ราคาประเมินรวมจากตัวช่วย', r.appraisal, 3215000);
ok('ต้องติดธง estimated เพื่อให้หน้าเว็บเตือน', r.estimated === true);

// เพดานค่าเสื่อม — บ้านไม้ 3%/ปี เพดาน 70%  ต่อให้ 90 ปีก็ต้องหยุดที่ 70%
console.log('เคส 6 — เพดานค่าเสื่อม');
e = estimateBuilding('wood', 100, 90);
eq('ค่าเสื่อมต้องตันที่ 70%', e.dep, 0.70, 0.0001);
eq('มูลค่าเหลือ 30%', e.value, 100 * 4500 * 0.30, 1);

// กรอกราคาประเมินสิ่งปลูกสร้างเองต้องชนะตัวช่วยประมาณเสมอ
console.log('เคส 7 — กรอกเองต้องชนะค่าประมาณ');
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000,
           buildingAppraisal:900000, buildingArea:150, buildingAge:10,
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

console.log('เคส 15 — โรงเรือน/โกดัง ไม่ใช่ที่อยู่อาศัย ติ๊กมาตรการต้องไม่มีผล');
r = calc({ propertyType:'other', salePrice:3000000, landAppraisal:1000000, buildingAppraisal:1000000,
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
ok('พื้นที่ 0 ต้องประมาณไม่ได้ ไม่ใช่ได้ 0', estimateBuilding('house', 0, 5) === null);
ok('ที่ดินเปล่าต้องประมาณสิ่งปลูกสร้างไม่ได้', estimateBuilding('land', 100, 5) === null);
eq('ค่ามีคอมมาต้องอ่านได้', calc({ propertyType:'house', salePrice:'5,000,000',
     landAppraisal:'2,000,000', buildingAppraisal:'1,500,000', years:6 }).appraisal, 3500000);
eq('ถือครอง 30 ปีต้องถูกจำกัดที่ 10', calc({ propertyType:'land', salePrice:1000000, years:30 }).years, 10);
r = calc({ propertyType:'house', salePrice:5000000, landAppraisal:2000000,
           buildingAppraisal:1000000, buildingRate:99999, sellerType:'person', years:6 });
eq('กรอกราคาเองแล้ว buildingRate ต้องไม่ถูกใช้', r.appraisal, 3000000);

console.log('\n' + (fail ? '✗ ไม่ผ่าน ' + fail + ' ข้อ · ผ่าน ' + pass : '✓ ผ่านทั้งหมด ' + pass + ' ข้อ'));
process.exit(fail ? 1 : 0);
