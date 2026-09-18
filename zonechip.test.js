// ทดสอบป้ายผังสีบนการ์ดประกาศ (listingcard.js + NJVocab.ZONE_HEX) · เพิ่ม 2026-09-18
// รันด้วย:  node zonechip.test.js
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

// โหลดแบบเดียวกับหน้าเว็บ: landvocab.js ต้องมาก่อน listingcard.js
global.window = {};
new Function(read('landvocab.js'))();
new Function(read('listingcard.js'))();
const NJL = global.window.NJListing;
const V = global.window.NJVocab;

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}
function cardOf(land) {
  return NJL.card(NJL.normalize({ id: 'OP-1', type: 'sell', parcelInfo: 'แปลงทดสอบ', estValue: 1000000, photos: [], land: land }, 0));
}

console.log('\n1) ขึ้นป้ายเฉพาะแปลงที่ทีมกรอกผังสีแล้ว');
let h = cardOf({ zoneColor: 'yellow' });
ok('มีผังสี → ขึ้นป้าย', /class="card-zone"/.test(h) && /ผังเหลือง/.test(h), h.slice(h.indexOf('card-zone') - 40, h.indexOf('card-zone') + 160));
ok('ป้ายใช้สีจาก NJVocab', h.indexOf('background:' + V.ZONE_HEX.yellow) >= 0);
ok('ป้ายมีคำอธิบายเต็มใน title', h.indexOf('ผังสี: ' + V.ZONE_TH.yellow) >= 0);
ok('⭐ ไม่มีผังสี → ไม่ขึ้นป้ายอะไรเลย (ยังไม่ตรวจ ≠ ไม่มีผังสี)', !/card-zone/.test(cardOf({})));
ok('ไม่มี land เลย → ไม่ขึ้นป้าย', !/card-zone/.test(cardOf(null)));
ok('ค่าผังสีที่ไม่รู้จัก → ไม่ขึ้นป้าย (ไม่เดาสี)', !/card-zone/.test(cardOf({ zoneColor: 'rainbow' })));

console.log('\n2) เขียวลายขาวต้องเป็นลายทแยง ไม่ใช่สีทึบ');
h = cardOf({ zoneColor: 'green_diag' });
ok('วาดเป็นลายทแยง', /repeating-linear-gradient/.test(h), h.match(/background:[^"]*/) || '');
ok('ข้อความป้ายคือคำสีสั้น', /ผังเขียวลายขาว/.test(h));
ok('เขียวทึบไม่เป็นลาย', !/repeating-linear-gradient/.test(cardOf({ zoneColor: 'green' })));

console.log('\n3) ไม่พิมพ์รหัสสีซ้ำ และกันสตริงหลุด');
const cardSrc = read('listingcard.js');
ok('listingcard.js ไม่มีรหัสสีผังของตัวเอง', !/ZONE_HEX\s*=/.test(cardSrc));
ok('อ่านสีจาก NJVocab', /NJVocab/.test(cardSrc) && /ZONE_HEX\[key\]/.test(cardSrc));
h = cardOf({ zoneColor: 'yellow' });
ok('title ถูก escape (ไม่มีเครื่องหมายคำพูดหลุด)', (h.match(/title="[^"]*"/) || [''])[0].indexOf('ผังสี') > 0);

console.log('\n4) สไตล์ป้ายต้องมีครบทั้งสามชุด (กติกาการ์ดสองชุดสี + การ์ดในแชท)');
['home.css', 'marketplace.css'].forEach(f => ok(f + ' มี .card-zone', /\.card-zone\{/.test(read(f))));
ok('njchat.css มี .njchat-cards .card-zone', /\.njchat-cards \.card-zone\{/.test(read('njchat.css')));

console.log('\n5) ตัวกรอง "ตรวจผังสีแล้ว" ในหน้ารวมประกาศ');
const lj = read('listings.js');
ok('มีตัวเลือก checked ในรายการกรอง', /\['checked', 'ตรวจผังสีแล้ว \(ทุกสี\)'\]/.test(lj));
ok('checked = ขอแปลงที่มีผังสีอะไรก็ได้', /f\.zone !== 'checked' && L\.zoneColor !== f\.zone/.test(lj));
ok('⭐ ไม่มีผังสียังนับเป็น "ยังไม่ได้ระบุ" เหมือนเดิม', /if \(!L\.zoneColor\) \{ hiddenUnknown\+\+; return false; \}/.test(lj));

console.log('\n' + (fail ? '❌' : '✅') + ' zonechip: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
