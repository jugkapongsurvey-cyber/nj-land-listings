// อีเมลแจ้งแปลงใหม่ถึงผู้ฝากหาที่ดิน — ฝั่งหน้าเว็บ (11 ต.ค. 2569)
//   รันด้วย:  node buyeralert.test.js [โฟลเดอร์ nj-survey-system]
//
// สิ่งที่ล็อกไว้ (ข้อไหนแดง = กำลังเปิดช่องที่ตั้งใจปิด):
//   · ⭐ กล่องอีเมลซ่อนไว้จนระบบตอบ config 200 · ช่องติ๊กยินยอมแยกจากช่องติดต่อกลับ และเริ่มที่ไม่ติ๊ก
//   · ⭐ ไม่ติ๊ก = ไม่ส่งอีเมลไปเซิร์ฟเวอร์ · ติ๊กแล้วต้องมีอีเมลถูกรูปแบบ + จังหวัด
//   · ⭐ หน้ายกเลิกรองรับ ?k=alert · ยังกดยกเลิกได้คลิกเดียว · ลิงก์วารสารเดิมไม่เปลี่ยน
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 220) : '')); }
}
const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n1) หน้าฝากหาที่ดิน (wanted.html)');
const H = read('wanted.html');
const box = (H.match(/<div class="wt-alert" id="wt-alert"[\s\S]*?\n        <\/div>/) || [''])[0];
check('มีกล่องอีเมลแจ้งเตือน และซ่อนไว้เป็นค่าเริ่มต้น', /<div class="wt-alert" id="wt-alert" hidden>/.test(H));
check('⭐ ช่องติ๊กยินยอมรับอีเมลแยก และไม่ติ๊กไว้ล่วงหน้า', /name="alertConsent"/.test(box) && !/name="alertConsent"[^>]*checked/.test(box));
check('ช่องอีเมลเป็น type=email · ซ่อนจนกว่าจะติ๊ก', /id="wt-alert-box" hidden/.test(box) && /type="email" name="alertEmail"/.test(box));
check('บอกว่าสรุปวันละไม่เกิน 1 ฉบับ + ยกเลิกได้ + ต้องมีจังหวัด', /วันละไม่เกิน 1 ฉบับ/.test(box) && /ยกเลิกได้ทุกเมื่อ/.test(box) && /ต้องระบุจังหวัด/.test(box));
check('⭐ ช่องยินยอมติดต่อกลับเดิมยังอยู่ ไม่ถูกแก้ความหมาย', /<input type="checkbox" name="pdpa" required>/.test(H) && /เพื่อติดต่อกลับเรื่องการหาที่ดินตามโจทย์นี้เท่านั้น/.test(H));
check('ไม่มีถ้อยคำรับประกัน', !/รับประกัน|การันตี/.test(box));
check('กล่องผลลัพธ์มีที่แสดงสถานะอีเมล', /<div class="cs-hint" id="wt-done-alert" hidden><\/div>/.test(H));

console.log('\n2) wanted.js');
const J = read('wanted.js');
const JC = strip(J);
check('ถามสวิตช์ที่ /api/public/buyer-alert/config แล้วค่อยโชว์', /\/api\/public\/buyer-alert\/config/.test(JC) && /alertOn = true;\s*box\.hidden = false;/.test(JC));
check('⭐ ใส่ alertConsent/alertEmail เฉพาะเมื่อผ่าน alertValues', /if \(al\) \{ v\.alertConsent = true; v\.alertEmail = al\.email; \}/.test(JC)
  && (JC.match(/alertEmail\s*=/g) || []).length === 1);
// ดึงฟังก์ชันมารันจริง
const grab = (name) => { const m = J.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}\\n')); return m ? m[0] : ''; };
const reSrc = (J.match(/var EMAIL_RE = [^\n]+\n/) || [''])[0];
const els = { 'wt-alert-consent': { checked: false }, 'wt-alert-email': { value: '' } };
const ctx = { alertOn: true, $: (id) => els[id] || null };
vm.createContext(ctx);
vm.runInContext(reSrc + grab('alertValues') + grab('alertDoneText'), ctx);
const v1 = { areas: [{ province: 'ชลบุรี' }] };
check('⭐ ไม่ติ๊ก = null (ไม่ส่งอะไรเพิ่ม)', ctx.alertValues(v1) === null);
els['wt-alert-consent'].checked = true;
els['wt-alert-email'].value = 'ไม่ใช่อีเมล';
const e1 = ctx.alertValues(v1);
check('ติ๊กแล้วอีเมลผิด = ชี้ช่องอีเมล', e1 && e1.err && e1.err.field === 'alertEmail', JSON.stringify(e1));
els['wt-alert-email'].value = '  buyer@example.com ';
const e2 = ctx.alertValues({ areas: [] });
check('ติ๊กแล้วไม่มีจังหวัด = ชี้ช่องจังหวัดแรก', e2 && e2.err && e2.err.field === 'wt-province1', JSON.stringify(e2));
const ok1 = ctx.alertValues(v1);
check('ติ๊ก + อีเมลถูก + มีจังหวัด = ส่งอีเมลที่ตัดช่องว่างแล้ว', ok1 && ok1.email === 'buyer@example.com', JSON.stringify(ok1));
ctx.alertOn = false;
check('⭐ ระบบไม่เปิดสวิตช์ = null แม้ติ๊กค้างไว้', ctx.alertValues(v1) === null);
check('ผลลัพธ์ on = ข้อความยืนยัน · noArea = บอกเหตุผล · อื่นๆ = ว่าง',
  /วันละไม่เกิน 1 ฉบับ/.test(ctx.alertDoneText({ alert: 'on' })) && /ไม่ได้ระบุจังหวัด/.test(ctx.alertDoneText({ alert: 'noArea' })) && ctx.alertDoneText({ id: 'BR-1' }) === '');

console.log('\n3) หน้ายกเลิก (unsubscribe)');
const UJ = read('unsubscribe.js');
const UC = strip(UJ);
const UH = read('unsubscribe.html');
check('รองรับ ?k=alert → เส้นทางของอีเมลแจ้งเตือน', /qs\('k'\) === 'alert'/.test(UC) && /'\/api\/public\/buyer-alert\/'/.test(UC));
check('⭐ ลิงก์วารสารเดิม (ไม่มี k) ยังเรียกเส้นทางวารสาร', /'\/api\/public\/newsletter\/'/.test(UC) && /fetch\(API \+ TXT\.path/.test(UC));
check('⭐ ยกเลิกได้คลิกเดียว (ไม่มีกล่องถามยืนยัน) · POST /unsubscribe', !/confirm\(/.test(UC) && /'\/unsubscribe'/.test(UC));
check('หัวหน้าเปลี่ยนตามชนิดลิงก์ (textContent ไม่ใช่ HTML)', /id="nt-title"/.test(UH) && /h\.textContent = TXT\.title/.test(UC));
check('ข้อความจากเซิร์ฟเวอร์ยังผ่าน esc()', /esc\(DATA\.error\)/.test(UC) && /map\(esc\)/.test(UC));

console.log('\n4) นโยบายความเป็นส่วนตัว');
const P = read('privacy.html');
check('ระบุว่าเก็บอีเมลเฉพาะเมื่อติ๊กขอรับอีเมลแจ้งแปลงใหม่', /อีเมล \(เฉพาะเมื่อติ๊กขอรับอีเมลแจ้งแปลงใหม่\)/.test(P));
check('แถวผู้ให้บริการ Resend รวมผู้ฝากหาที่ขอรับอีเมล', /Resend[\s\S]{0,300}ผู้ฝากหาที่ดินที่ขอรับอีเมลแจ้งแปลงใหม่/.test(P));

console.log('\n5) ฝั่งระบบ (ข้ามถ้าไม่มีโฟลเดอร์ หรือยังไม่มีงานนี้)');
const sys = process.argv[2] || path.join(__dirname, '..', 'nj-survey-system');
if (!fs.existsSync(path.join(sys, 'lib', 'buyeralert.js'))) {
  console.log('  — ข้าม: ไม่พบ lib/buyeralert.js ใน ' + sys);
} else {
  const S = fs.readFileSync(path.join(sys, 'server.js'), 'utf8');
  const L = fs.readFileSync(path.join(sys, 'lib', 'buyeralert.js'), 'utf8');
  check('ระบบมีเส้นทาง config + ดูสถานะ + ยกเลิก', /app\.get\('\/api\/public\/buyer-alert\/config'/.test(S) && /app\.get\('\/api\/public\/buyer-alert\/:id'/.test(S)
    && /app\.post\('\/api\/public\/buyer-alert\/:id\/unsubscribe'/.test(S));
  check('⭐ ลิงก์ในอีเมลชี้ unsubscribe.html?k=alert ของเว็บนี้', /'\/unsubscribe\.html\?' \+ q/.test(L) && /'k=alert&id='/.test(L));
  check('ฟอร์มฝากหาส่งชื่อช่องตรงกับที่ระบบอ่าน (alertEmail · alertConsent)', /b\.alertEmail/.test(L) && /b\.alertConsent/.test(L));
}

console.log('\nสรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
