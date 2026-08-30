// ทดสอบเครื่องมือประเมินหลักการราคาที่ดิน — เทียบกับการคำนวณมือทีละขั้น
// รันด้วย:  node valuecalc.test.js
const fs = require('fs');
global.window = {};
new Function(fs.readFileSync(__dirname + '/feecalc.js', 'utf8'))();
new Function(fs.readFileSync(__dirname + '/valuecalc.js', 'utf8'))();
const { score, calc } = global.window.NJValueCalc;

// ตารางราคาจำลองชุดเดียวกับ feecalc.test.js — เฉพาะ กทม.(10) และเชียงใหม่(50)
// เครื่องมือนี้เรียก NJFeeCalc.estimateBuilding ต่อ จึงต้องมีบัญชีราคาก่อนถึงจะประมาณอาคารได้
global.window.NJFeeCalc.setBuildingPrices({
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
  const ok = Math.abs(got - want) <= (tol == null ? 0.005 : tol);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + label + '\n      ได้ ' + got + '  ต้องการ ' + want); }
}
function ok(label, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + label); } }

// ---------------------------------------------------------------------------
console.log('เคส 1 — ไม่เลือกอะไรเลย (ทุกช่องค่าเริ่มต้น = คะแนนกลาง 3) ต้องได้ปรับ 0%');
let s = score({});
eq('คะแนนรวม', s.composite, 3);
eq('ปรับ', s.adjust, 0);
ok('ไม่มีปัจจัยบวก', s.notes.up.length === 0);
ok('ไม่มีปัจจัยลบ', s.notes.down.length === 0);

console.log('เคส 2 — ทุกปัจจัยดีสุด (5 คะแนน) ต้องได้ปรับ +40% เต็มเพดาน');
s = score({ location:5, shape:5, utility:5, other:5 });
eq('คะแนนรวม', s.composite, 5);
eq('ปรับ', s.adjust, 0.40);
eq('จำนวนปัจจัยบวก', s.notes.up.length, 4);

console.log('เคส 3 — ทุกปัจจัยแย่สุด (1 คะแนน) ต้องได้ปรับ -40% เต็มเพดาน');
s = score({ location:1, shape:1, utility:1, other:1 });
eq('คะแนนรวม', s.composite, 1);
eq('ปรับ', s.adjust, -0.40);
eq('จำนวนปัจจัยลบ', s.notes.down.length, 4);

console.log('เคส 4 — ทำเลดีสุด (น้ำหนัก 50%) ปัจจัยอื่นกลาง ต้องปรับขึ้นตามสัดส่วนน้ำหนักทำเลเท่านั้น');
s = score({ location:5 });
// คะแนนรวม = 5*.5 + 3*.25 + 3*.15 + 3*.10 = 2.5 + .75 + .45 + .30 = 4.0
eq('คะแนนรวม', s.composite, 4.0);
eq('ปรับ', s.adjust, (4.0 - 3) / 2 * 0.40);

console.log('เคส 5 — ที่ดินตาบอด (รูปร่าง=1) กดราคาลงแม้ทำเลดี');
s = score({ location:5, shape:1 });
ok('ต้องมีปัจจัยลบเรื่องรูปร่าง', s.notes.down.some(t => t.indexOf('ที่ดินตาบอด') >= 0 || t.indexOf('รูปร่าง') >= 0));

// ---------------------------------------------------------------------------
console.log('เคส 6 — คำนวณราคาที่ดินจากราคาอ้างอิง + เนื้อที่');
let r = calc({ location:5, shape:5, utility:5, other:5, refPrice:20000, rai:2, ngan:0, wa:0 });
ok('มีราคาอ้างอิง', r.haveRef);
eq('เนื้อที่รวม (2 ไร่ = 800 ตร.ว.)', r.totalWa, 800);
eq('ราคาต่อตารางวาปรับแล้ว (20000*1.4)', r.adjPricePerWa, 28000);
eq('ที่ดินรวม (28000*800)', r.landTotal, 22400000);

console.log('เคส 7 — ไม่กรอกราคาอ้างอิง ต้องไม่มีราคาที่ดินออกมา');
r = calc({});
ok('ไม่มีราคาอ้างอิง', !r.haveRef);
eq('ที่ดินรวมต้องเป็น 0', r.landTotal, 0);

console.log('เคส 8 — มีสิ่งปลูกสร้าง ต้องใช้ NJFeeCalc.estimateBuilding ตัวเดียวกับเครื่องคำนวณค่าโอน');
r = calc({ hasBuilding:true, buildingType:'house', buildingArea:150, buildingAge:10, province:'10' });
ok('มีผลลัพธ์สิ่งปลูกสร้าง', !!r.building);
const direct = global.window.NJFeeCalc.estimateBuilding('house', 150, 10, null, '10');
eq('มูลค่าสิ่งปลูกสร้างต้องตรงกับ feecalc', r.building.value, direct.value);
// คำนวณมือ: 150 ตร.ม. × 8,550 บาท (บ้านตึก 2 ชั้น กทม.) = 1,282,500 หักค่าเสื่อม 10 ปี × 1% = 10%
eq('มูลค่าตรงกับการคำนวณมือ', r.building.value, 1154250);
eq('ราคาต่อ ตร.ม. ต้องมาจากบัญชี ไม่ใช่ค่าที่เดา', r.building.rate, 8550);

console.log('เคส 8ข — ราคาต่างกันตามจังหวัด (เชียงใหม่ 8,800) ห้ามใช้ค่ากลางทั้งประเทศ');
r = calc({ hasBuilding:true, buildingType:'house', buildingArea:150, buildingAge:10, province:'50' });
eq('ราคาต่อ ตร.ม. ของเชียงใหม่', r.building.rate, 8800);

console.log('เคส 8ค — ไม่เลือกจังหวัด = ประมาณไม่ได้ ต้องคืน null ห้ามเดาตัวเลข (กติกาข้อ 13)');
r = calc({ hasBuilding:true, buildingType:'house', buildingArea:150, buildingAge:10 });
ok('ต้องไม่มีผลลัพธ์สิ่งปลูกสร้าง', r.building === null);
ok('แต่ต้องรู้ว่าผู้ใช้ติ๊กว่ามีอาคาร เพื่อขึ้นคำอธิบายให้', r.wantBuilding === true);
eq('รวมทั้งหมดต้องไม่บวกอาคารเข้าไป', r.grandTotal, 0);

console.log('เคส 9 — รวมที่ดิน + สิ่งปลูกสร้าง เมื่อมีทั้งราคาอ้างอิงและอาคาร');
r = calc({ refPrice:20000, rai:1, hasBuilding:true, buildingType:'house', buildingArea:150, buildingAge:10, province:'10' });
eq('grandTotal = landTotal + building.value', r.grandTotal, r.landTotal + r.building.value);

console.log(`\n${pass} ผ่าน, ${fail} ไม่ผ่าน`);
process.exit(fail ? 1 : 0);
