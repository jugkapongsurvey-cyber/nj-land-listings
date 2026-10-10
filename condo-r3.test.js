// ทดสอบหน้าประกาศคอนโด รอบ 3 (10 ต.ค. 2569) — ชื่อโครงการ · ประกาศอื่นในโครงการ · เวลาเดิน · วันที่ประกาศ · ค่างวด · แผงให้ NJ ตรวจห้องชุด (อ.ช.2)
// ⚠️ ไม่มีเครือข่าย · อ่านไฟล์อย่างเดียว · ตรรกะชื่อโครงการเทียบกันที่ landlabel.test.js (เรียกฟังก์ชันจริง)
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const land = read('land.js');
const svc = read('njservices.js');
const html = read('land.html');
const css = read('land.css');
const card = read('listingcard.js');
const lint = read('build/lint.js');

// ตัดฟังก์ชันออกมาตรวจ (จากชื่อฟังก์ชันถึงชื่อฟังก์ชันถัดไปที่ระบุ)
function between(src, from, to) {
  const a = src.indexOf(from), b = src.indexOf(to, a + 1);
  return a >= 0 && b > a ? src.slice(a, b) : '';
}

console.log('\n1) ชื่อโครงการเป็นชื่อหน้า');
ok('landmeta.js ส่งออก projectNameOf และ shortLabel ใช้ชื่อโครงการ',
  /projectNameOf: projectNameOf/.test(read('landmeta.js')) && /var pj = projectNameOf\(l\)/.test(read('landmeta.js')));
ok('H1 หน้าแปลงมาจาก shortLabel (ตัวสร้างหน้าสแตติกเรียกชุดเดียวกัน)', /<h1 class="ld-title">'\+esc\(shortLabel\(l\)\)/.test(land));

console.log('\n2) ประกาศอื่นในโครงการเดียวกัน');
const rel = between(land, 'function renderRelated', 'function render(l)');
ok('จับคู่ด้วยชื่อโครงการที่ตรงกันเป๊ะ (ตัดช่องว่างซ้ำ · ไม่สนตัวพิมพ์) ไม่ใช่ใกล้เคียง',
  /projKey/.test(rel) && /replace\(\/\\s\+\/g, ?' '\)\.toLowerCase\(\)/.test(rel) && /projKey\(x\)===curKey/.test(rel));
ok('เฉพาะห้องชุด (projKey ผ่าน isCondo) และไม่มีชื่อโครงการ = ไม่ขึ้นหัวข้อ',
  /isCondo\(x\)&&window\.NJLandMeta/.test(rel) && /curKey \? all\.filter/.test(rel));
ok('ไม่เกิน 3 ใบ ใช้การ์ดตัวกลาง NJListing.card (ไม่ก๊อปการ์ด)',
  /\.slice\(0,3\)/.test(rel) && /sameProject\.map\(NJListing\.card\)/.test(rel));
ok('ใบที่อยู่กลุ่มโครงการเดียวกันไม่ซ้ำในกลุ่มใกล้เคียง', /all=all\.filter\(function\(x\)\{ return sameProject\.indexOf\(x\)<0; \}\)/.test(rel));
ok('หัวข้อ "ประกาศอื่นๆ ในโครงการนี้" ขึ้นเฉพาะเมื่อมีใบ (if sameProject.length)', /if\(sameProject\.length\)\{[\s\S]*ประกาศอื่นๆ ในโครงการนี้/.test(rel));
ok('การ์ดกลางเก็บ specs/listedAt จาก API (ใช้จับคู่โครงการ)', /specs: item\.specs && typeof item\.specs === 'object'/.test(card) && /listedAt:/.test(card));

console.log('\n3) เวลาเดินถึงสถานที่ใกล้เคียง');
const nb = between(land, 'function nearbyHtml', 'function tier1Html');
ok('เวลาเดินมาจาก walkMin ที่เซิร์ฟเวอร์คิด ไม่หารเองในเบราว์เซอร์', /Number\(it\.walkMin\)/.test(nb) && !/\/\s*80|80\s*\*/.test(nb));
ok('ไม่มี walkMin = ไม่ขึ้นเวลาเดิน', /wm>0\?/.test(nb));
ok('บอกว่าเวลาเดินเป็นค่าประมาณจากระยะเส้นตรง (เมื่อมีเวลาเดินอย่างน้อยหนึ่งแถว)', /hasWalk\?/.test(nb) && /ค่าประมาณจากระยะเส้นตรง/.test(nb));
ok('ยังบอกที่มา Google Places + วันที่สำรวจเหมือนเดิม', /ข้อมูลสถานที่จาก Google Places/.test(nb) && /thaiDate\(n\.at\)/.test(nb));

console.log('\n4) วันที่ประกาศ');
const ll = between(land, 'function listedLine', 'function loanWanted');
ok('ใช้ l.listedAt ที่ระบบคำนวณ — ว่าง = ไม่ขึ้นบรรทัด', /l\.listedAt \? thaiDate\(l\.listedAt\) : ''/.test(ll) && /return d \?/.test(ll));
ok('ไม่เดาวันจาก updatedAt', !/updatedAt/.test(ll));
ok('บรรทัดอยู่ใต้ที่ตั้งในหัวประกาศ', /ld-loc[\s\S]{0,120}listedLine\(l\)/.test(land));

console.log('\n5) ค่างวดสินเชื่อฝังในหน้า');
ok('loancalc.js โหลดก่อน land.js ใน land.html', html.indexOf('src="loancalc.js"') > 0 && html.indexOf('src="loancalc.js"') < html.indexOf('src="land.js"'));
ok('ด่านลำดับสคริปต์ใน build/lint.js ล็อกคู่ loancalc.js → land.js', /\['loancalc\.js', 'land\.js'\]/.test(lint));
ok('ขึ้นเฉพาะห้องชุดที่ขายและมีราคา (ไม่ขึ้นประกาศเช่า)', /function loanWanted\(l\)\{\s*return isCondo\(l\) && l\.type!=='rent' && Number\(l\.estValue\)>0/.test(land));
ok('ราคาตั้งต้น = ราคาประกาศ และไม่ฝังดอกเบี้ย/ชื่อธนาคาร',
  /NJLoanCalc\.mount\(loanHost,\{price:l\.estValue\}\)/.test(land) && !/ธนาคาร|ดอกเบี้ย\s*\d/.test(between(land, 'function loanWanted', 'function condoAskHtml')));
ok('ไม่มี NJLoanCalc (หน้าสแตติกรุ่นก่อน) = ถอดส่วนนี้ ไม่ทิ้งหัวข้อเปล่า', /else \{ var loanSec=document\.getElementById\('ld-s-loan'\); if\(loanSec\) loanSec\.remove\(\); \}/.test(land));

console.log('\n6) แผง "ให้ NJ ตรวจสอบห้องชุดนี้" (อ.ช.2)');
const ask = between(land, 'function condoAskHtml', 'function areaTh') || between(land, 'function condoAskHtml', '// "0-0-33.9"');
ok('ขึ้นเฉพาะห้องชุดที่ไม่ใช่ประกาศเช่า', /if\(!isCondo\(l\) \|\| l\.type==='rent'\) return ''/.test(ask));
ok('⛔ ไม่มีตัวเลขราคา/สัญลักษณ์เงินในแผง (ราคา = ติดต่อเพื่อขอใบเสนอราคา)',
  !/฿|บาท|\d[\d,]{3,}/.test(ask) && /ติดต่อเพื่อขอใบเสนอราคา/.test(ask));
ok('⛔ ติ๊ก = ขอให้ตรวจ ยังไม่ใช่การว่าจ้างและยังไม่ใช่ผลตรวจ', /ขอให้ตรวจ<\/b> ยังไม่ใช่การว่าจ้าง และยังไม่ใช่ผลตรวจ/.test(ask));
ok('บอกว่าเข้าวัดห้องต้องได้รับความยินยอมจากเจ้าของห้อง', /ความยินยอมจากเจ้าของห้อง/.test(ask));
ok('⛔ ไม่อ้างรับรอง/รับประกัน/ปลอดภัย/ผ่าน', !/รับประกัน|การันตี|ปลอดภัย|ผ่านการตรวจ|รับรองกรรมสิทธิ์/.test(ask));
ok('ไม่ใช่การยืนยันกรรมสิทธิ์ และไม่แทนการรังวัดของสำนักงานที่ดิน', /ไม่ใช่การยืนยันกรรมสิทธิ์/.test(ask) && /ไม่แทนการรังวัดของสำนักงานที่ดิน/.test(ask));
ok('ไม่ใช้คำ "ตรวจโดย NJ"/"NJ Verified" ในแผงขอ', !/ตรวจโดย NJ|NJ Verified/.test(ask));
ok('วางด้านท้าย ต่อจากรูปทั้งหมด ก่อนทางเข้าอื่น',
  land.indexOf("secHtml('ld-s-photos'") < land.indexOf("secHtml('ld-s-condoask'") &&
  land.indexOf("secHtml('ld-s-condoask'") < land.indexOf('<div class="ld-next">'));
ok('mount ผ่าน NJServices ท่อเดียวกัน (condo:true · ref land_condo_check) และถอดแผงเมื่อไม่มี NJServices',
  /NJServices\.mount\(ccHost,\{ condo:true, listingId:l\.id, ref:'land_condo_check'/.test(land) && /ld-s-condoask'\); if\(ccSec\) ccSec\.remove\(\)/.test(land));

console.log('\n7) ฟอร์มตรวจห้องชุดใน njservices.js');
const form = between(svc, 'function condoFormHtml', 'var WHY');
ok('ฟอร์มไม่ส่งถึงเจ้าของ (ไม่มี shareWithOwner) — ลีดไปที่ทีมงานเสมอ', !/shareWithOwner/.test(form) && !/shareWithOwner/.test(between(svc, 'if (opt.condo && !services.length)', 'sending = true')));
ok('⛔ ฟอร์มและรายการบริการห้องชุดไม่มีตัวเลขราคา',
  !/฿|บาท|\d[\d,]{3,}/.test(form) && !/฿|บาท/.test(between(svc, "key: 'condotitle'", 'ทะเบียนบริษัทพันธมิตรรายบริการ')));
ok('ต้องติ๊กอย่างน้อย 1 รายการจึงส่งได้', /ติ๊กสิ่งที่อยากให้ตรวจอย่างน้อย 1 รายการ/.test(svc));
ok('บริการห้องชุดผูก only:\'condo\' — ฟอร์มหน้าแรก/สนใจแปลงไม่เห็น', /only: 'condo'/.test(svc) && (svc.match(/only: 'condo'/g) || []).length >= 2);
ok('ข้อความยินยอม PDPA ของฟอร์มห้องชุดมี', /ติดต่อกลับเรื่องห้องชุดและบริการที่เลือกเท่านั้น/.test(form));
ok('ไม่บังคับช่องอื่นเกินกติกาลีดขั้นต่ำ (ชื่อ+เบอร์+ยินยอม)', !/required/.test(form));

console.log('\n8) สไตล์');
['ld-listed', 'ld-nb-walk', 'ld-rel-sub', 'ld-cc-lede', 'ld-cc-notes', 'ld-cc-price'].forEach((c) => {
  ok('land.css มี .' + c, new RegExp('\\.' + c + '\\b').test(css));
});

console.log('\n9) คอนโด: ลงฟรี ไม่บังคับค่าตรวจ (ฟอร์มฝากขาย · consign.js)');
const cs = read('consign.js');
const svcFn = between(cs, 'function setupService', 'var PT = null');
ok('ถ้อยคำ "ลงฟรี/ไม่บังคับค่าตรวจ" มาจาก spec.serviceModel.condoFree ไม่ได้พิมพ์ในเว็บ',
  /model\.condoFree/.test(svcFn) && !/ลงประกาศฟรี|ไม่บังคับค่าตรวจ/.test(svcFn.replace(/\/\/[^\n]*/g, '')));
ok('ห้องชุด = ไม่คิดค่าตรวจประมาณการ (drawFee ออกก่อนเรียก NJSurveyQuote)',
  svcFn.indexOf('if (condoFree())') > 0 && svcFn.indexOf('if (condoFree())') < svcFn.indexOf('NJSurveyQuote.load()'));
ok('เปลี่ยนประเภททรัพย์ = วาดบรรทัด "ค่าใช้จ่าย" ใหม่ (sync เช็กธงคอนโดในคีย์)', /condoFree\(\) \? 'condo' : ''/.test(svcFn) && /wasCondo/.test(svcFn));
ok('ไม่มี condoFree ใน spec (ระบบรุ่นเก่า) = ไม่เปลี่ยนอะไร', /model && model\.condoFree && getPropType/.test(svcFn));
ok('ตัวอ่านประเภททรัพย์ส่งเข้า setupService จาก PT', /return PT \? PT\.value\(\)\.propertyType : ''/.test(cs));
ok('บล็อกคอนโดไม่พูดถึงค่านายหน้า/อัตรา — ถ้อยคำเป็นกลางตามนโยบายลงฟรี', !/%|นายหน้า/.test(between(svcFn, 'function condoFree', 'function serviceOf')));

console.log('\n✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
