// หน้าฝากขาย: ลูกน้ำหลักพันในช่องเงิน · ช่องข้อความยาวเป็นกล่องหลายบรรทัด · รูปแบบรังวัด "ยังไม่ตัดสินใจ" (13 ต.ค. 69)
// รัน: node consignfield.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond, info) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '  → ' + info : '')); }
}

const F = require('./landform.js');

console.log('\n1) groupMoney — ใส่ลูกน้ำหลักพัน');
const G = F.groupMoney;
ok('2000000 → 2,000,000', G('2000000') === '2,000,000', G('2000000'));
ok('25000 → 25,000', G('25000') === '25,000');
ok('999 ไม่มีลูกน้ำ', G('999') === '999');
ok('ลูกน้ำเดิมผิดที่ จัดใหม่', G('20,00,000') === '2,000,000', G('20,00,000'));
ok('ทศนิยมคง 2 ตำแหน่ง', G('1234.567') === '1,234.56', G('1234.567'));
ok('จุดตัวที่สองถูกทิ้ง', G('1.2.3') === '1.23', G('1.2.3'));
ok('ตัวอักษรอื่นถูกทิ้ง', G('฿ 1 500 บาท') === '1,500', G('฿ 1 500 บาท'));
ok('ศูนย์นำหน้าถูกตัด', G('0012000') === '12,000', G('0012000'));
ok('ค่าว่าง = ว่าง', G('') === '' && G(null) === '');
ok('เครื่องหมายลบคงไว้ (num() ตีเป็น 0 ตามเดิม)', G('-5000') === '-5,000' && F.calc && true);

console.log('\n2) ค่าที่ส่งเซิร์ฟเวอร์ไม่เปลี่ยน — num() ตัดลูกน้ำ');
const calc = F.calc;
ok('ราคารวมคิดจากค่าที่มีลูกน้ำได้เท่าเดิม',
  calc.totalPrice('wa', '2,000,000', 100) === calc.totalPrice('wa', '2000000', 100) &&
  calc.totalPrice('wa', '2,000,000', 100) === 200000000, calc.totalPrice('wa', '2,000,000', 100));

console.log('\n3) moneyInput — จัดรูปแบบขณะพิมพ์ เคอร์เซอร์ไม่กระโดด');
function fakeEl(v) {
  const L = {};
  const el = { value: v, selectionStart: v.length, addEventListener: (t, fn) => { L[t] = fn; },
    setSelectionRange(a) { this.selectionStart = a; }, fire() { L.input && L.input(); } };
  return el;
}
global.document = { activeElement: null };
const e1 = fakeEl('2000000');
F.moneyInput(e1);
ok('ผูกแล้วจัดค่าที่มีอยู่ทันที (ค่าที่โหลดกลับมาแก้)', e1.value === '2,000,000', e1.value);
global.document.activeElement = e1;
e1.value = '2,000,0000'; e1.selectionStart = 10; e1.fire();
ok('พิมพ์ต่อท้าย → 20,000,000 เคอร์เซอร์ท้ายสุด', e1.value === '20,000,000' && e1.selectionStart === 10, e1.value + ' @' + e1.selectionStart);
e1.value = '20,0005,000'; e1.selectionStart = 7; e1.fire();   // แทรก 5 ต่อจาก "20,000"
ok('แทรกกลางเลข เคอร์เซอร์อยู่หลังตัวที่เพิ่งพิมพ์', e1.value === '200,005,000' && e1.value.slice(0, e1.selectionStart).replace(/,/g, '') === '200005',
  e1.value + ' @' + e1.selectionStart);
const e2 = fakeEl('5');
F.moneyInput(e2); F.moneyInput(e2);
ok('ผูกซ้ำไม่ซ้อนตัวฟัง', e2.__njMoney === true);

console.log('\n4) ซอร์สหน้าเว็บ');
const html = read('consign.html'), js = read('consign.js'), lf = read('landform.js');
ok('ช่องราคาผูกตัวจัดลูกน้ำใน initAreaPrice', /moneyInput\(priceEl\)/.test(lf));
ok('ตัวอย่างราคามีลูกน้ำ', html.indexOf('placeholder="เช่น 25,000"') >= 0 && lf.indexOf("'เช่น 4,000,000'") >= 0);
ok('ช่องข้อความ max ≥ 200 วาดเป็น textarea เต็มแถว', /f\.kind === 'text' && f\.max >= 200/.test(js) && /<textarea data-dt=/.test(js));
ok('ช่องเงิน (หน่วยบาท) ในรายละเอียดผูกตัวจัดลูกน้ำหลังวาด', /data-dt-money/.test(js) && /querySelectorAll\('\[data-dt-money\]'\)\.forEach\(NJLandForm\.moneyInput\)/.test(js));
ok('ช่องตัวเลขส่งโดยไม่มีลูกน้ำ', /replace\(\/,\/g, ''\)/.test(js));
ok('รูปแบบรังวัดมีตัวเลือก "ยังไม่ตัดสินใจ"', /name="surveyMode" value="undecided"/.test(html) && html.indexOf('ยังไม่ตัดสินใจ — ให้ทีมงานแนะนำ') >= 0);
ok('mode() คืน undecided ได้ · เปิดใบเดิมเลือกคืนได้', /var SURVEY_MODES = \['formal', 'informal', 'undecided'\]/.test(js) &&
  /pick\(modes, d && SURVEY_MODES\.indexOf\(d\.surveyMode\) >= 0/.test(js));
ok('ยังไม่ตัดสินใจ = แสดงราคาสองแบบคู่กัน', /mode\(\) === 'undecided'/.test(js) && js.indexOf('ยังไม่ต้องเลือกตอนนี้') >= 0);

console.log('\nผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
