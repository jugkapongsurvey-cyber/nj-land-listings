// ทดสอบเครื่องคำนวณสินเชื่อ (loancalc.js) — เทียบกับการคำนวณมือ
// รันด้วย:  node loancalc.test.js
const fs = require('fs');
global.window = {};
new Function(fs.readFileSync(__dirname + '/loancalc.js', 'utf8'))();
const { calc, TYPES, DTI } = global.window.NJLoanCalc;

let pass = 0, fail = 0;
function eq(label, got, want, tol) {
  const ok = Math.abs(got - want) <= (tol == null ? 0.5 : tol);
  if (ok) pass++; else { fail++; console.log('  ✗ ' + label + '\n      ได้ ' + got + '  ต้องการ ' + want); }
}
function ok(label, cond) { if (cond) pass++; else { fail++; console.log('  ✗ ' + label); } }

// 1) กรณีมาตรฐาน: 2,500,000 ดาวน์ 20% ดอก 5.5% 30 ปี → กู้ 2,000,000
// งวด = P·i / (1 − (1+i)^−n) · i = 0.055/12 · n = 360 → 11,355.78
let r = calc({ price: '2,500,000', downPct: 20, ratePct: 5.5, years: 30 });
eq('วงเงินกู้', r.loan, 2000000);
eq('เงินดาวน์', r.downAmt, 500000);
eq('ค่างวด 30 ปี 5.5%', r.monthly, 11355.78, 0.01);
eq('จ่ายรวม = งวด × 360', r.totalPaid, 11355.78 * 360, 5);
eq('ดอกเบี้ยรวม = จ่ายรวม − เงินกู้', r.totalInterest, r.totalPaid - 2000000);
eq('รายได้ที่ควรมี = งวด ÷ 0.40', r.incomeNeeded, 11355.78 / 0.4, 0.05);
ok('DTI คือ 40%', DTI === 0.4);
// ปีแรก: เดือนแรกดอก = 2,000,000 × i = 9,166.67 → ปีแรกดอกต้องมากกว่าต้น (ช่วงต้นสัญญา)
ok('ปีแรกดอกเบี้ยมากกว่าเงินต้น', r.year1Interest > r.year1Principal);
eq('ปีแรก ต้น + ดอก = งวด × 12', r.year1Interest + r.year1Principal, 11355.78 * 12, 0.5);
// เงินต้นคงเหลือหลัง 12 งวด ตามสูตรปิด = P(1+i)^12 − A((1+i)^12 − 1)/i
{
  const i = 0.055 / 12, A = r.monthly, g = Math.pow(1 + i, 12);
  const bal = 2000000 * g - A * (g - 1) / i;
  eq('ตัดต้นปีแรกตรงกับสูตรปิด', r.year1Principal, 2000000 - bal, 0.01);
}

// 2) ดอกเบี้ย 0% = หารเท่ากันทุกงวด (ห้ามหารด้วยศูนย์)
r = calc({ price: 1500000, downPct: 20, ratePct: 0, years: 10 });
eq('ดอก 0% งวด = 1,200,000 / 120', r.monthly, 10000);
eq('ดอก 0% ดอกเบี้ยรวม 0', r.totalInterest, 0);
ok('ดอก 0% ค่าตัวเลขไม่ใช่ NaN', isFinite(r.monthly) && isFinite(r.year1Principal));

// 3) ข้อมูลไม่พอ = null ห้ามเดา
ok('ไม่มีราคา → null', calc({ price: '', downPct: 20, ratePct: 5, years: 30 }) === null);
ok('ราคา 0 → null', calc({ price: 0, downPct: 20, ratePct: 5, years: 30 }) === null);
ok('ไม่มีระยะเวลา → null', calc({ price: 1000000, downPct: 20, ratePct: 5, years: '' }) === null);

// 4) ค่าเกินขอบเขตถูกบีบ ไม่ใช่คำนวณเพี้ยน
r = calc({ price: 1000000, downPct: 150, ratePct: 5, years: 99 });
eq('ดาวน์เกิน → บีบเหลือ 90%', r.downPct, 90);
eq('ระยะเวลาเกิน → บีบเหลือ 40 ปี', r.years, 40);
r = calc({ price: 1000000, downPct: -5, ratePct: 5, years: 20 });
eq('ดาวน์ติดลบอ่านเป็นตัวเลขบวก (ตัดเครื่องหมาย) แล้วอยู่ในขอบเขต', r.downPct, 5);
ok('ดาวน์ 100% ไม่มีทางเกิด (กันหารศูนย์/กู้ 0)', calc({ price: 1000000, downPct: 100, ratePct: 5, years: 20 }).loan > 0);

// 5) ค่าตั้งต้นของที่ดินเปล่าต่างจากบ้าน (กติกาข้อ 3)
ok('ที่ดินเปล่าดาวน์มากกว่าบ้าน', TYPES.land.down > TYPES.home.down);
ok('ที่ดินเปล่าผ่อนสั้นกว่าบ้าน', TYPES.land.years < TYPES.home.years);

// 6) กติกาในไฟล์ — ห้ามอ้างอัตราของธนาคาร / ต้องมีคำเตือนค่าประมาณ / ห้ามรวมค่าโอนให้เอง
const src = fs.readFileSync(__dirname + '/loancalc.js', 'utf8');
ok('มีคำเตือนว่าเป็นค่าประมาณ', /ค่าประมาณ/.test(src) && /ดอกเบี้ยลอยตัว/.test(src));
ok('ไม่เอ่ยชื่อธนาคารในข้อความที่ผู้ใช้เห็น', !/'[^']*(กสิกร|กรุงไทย|กรุงศรี|ออมสิน|ธอส|ไทยพาณิชย์)[^']*'/.test(src));
ok('ไม่เรียก NJFeeCalc เอง (ค่าโอนต้องให้ผู้ใช้กรอกราคาประเมิน)', !/NJFeeCalc/.test(src.replace(/\/\/.*$/gm, '')));

console.log((fail ? '❌' : '✅') + ' loancalc: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
