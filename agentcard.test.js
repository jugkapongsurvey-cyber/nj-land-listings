// การ์ดผู้ลงประกาศ (agent card) ฝั่งเว็บ — 2026-10-10
//   รันด้วย: node agentcard.test.js
//
// ล็อกไว้:
//   · ฟอร์มในหน้าฝากขาย: ซ่อนไว้ใน HTML · ข้อความยินยอมไม่ถูกพิมพ์ซ้ำ (มาจาก spec ของระบบหลังบ้านที่เดียว)
//   · agentcard.js โหลดหลัง consign.js · ไม่ต่อ HTML จากข้อความของผู้ใช้ · ไม่มีคำต้องห้าม
//   · หน้าแปลง: ไม่มี l.agent = ไม่วาดอะไรเลย · มีแล้ววาดเฉพาะ ชื่อ/บริษัท/ตำแหน่ง/รูป — ไม่มีเบอร์ อีเมล หรือป้ายยืนยันตัวตน
//   · ข้อความจากผู้ลงประกาศถูก escape
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const W = __dirname;
const read = f => fs.readFileSync(path.join(W, f), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}
const noComment = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

const html = read('consign.html');
const js = read('agentcard.js');
const consign = read('consign.js');
const land = read('land.js');
const landCss = read('land.css');
const ui = read('ui.css');

console.log('\n1) ฟอร์มในหน้าฝากขาย (consign.html)');
const block = (html.match(/<div class="cs-ac" id="cs-ac"[\s\S]*?<\/form>\s*<\/div>/) || [''])[0];
check('มีกล่อง #cs-ac', !!block);
check('กล่องซ่อนไว้ใน HTML (JS เป็นคนเปิด)', /id="cs-ac" hidden/.test(block));
check('มีช่องชื่อ · บริษัท · รูป · ติ๊กยินยอม · ปุ่มส่ง · ปุ่มลบ', ['cs-ac-name', 'cs-ac-co', 'cs-ac-photo', 'cs-ac-consent', 'cs-ac-save', 'cs-ac-del'].every(i => block.indexOf('id="' + i + '"') >= 0));
check('ปุ่มส่งเริ่มปิดไว้จนกว่าจะติ๊กยินยอม', /id="cs-ac-save" disabled/.test(block));
check('ช่องข้อความยินยอมว่าง — ข้อความมาจาก spec ที่เดียว', /<span id="cs-ac-consent-text"><\/span>/.test(block));
check('ไม่มีช่องโทรศัพท์/อีเมลในกล่อง', !/type="(tel|email)"/.test(block));
check('บอกตรงๆ ว่าไม่แสดงเบอร์/อีเมล', /ไม่แสดงเบอร์โทรหรืออีเมล/.test(block));
check('บอกว่าไม่บังคับ', /ไม่บังคับ/.test(block));
check('agentcard.js โหลดหลัง consign.js', html.indexOf('src="consign.js"') > 0 && html.indexOf('src="agentcard.js"') > html.indexOf('src="consign.js"'));
check('กล่องอยู่ก่อนปุ่มส่งให้ทีมงาน', html.indexOf('id="cs-ac"') > 0 && html.indexOf('id="cs-ac"') < html.indexOf('id="cs-send"'));

console.log('\n2) agentcard.js');
const code = noComment(js);
check('ดึง spec จาก /api/public/consign/spec', /\/api\/public\/consign\/spec/.test(code));
check('ใส่ข้อความยินยอมจาก SPEC.consentText ด้วย textContent', /SPEC\.consentText/.test(code) && /textContent/.test(code));
check('ไม่ฝังข้อความยินยอมในไฟล์', !/ข้าพเจ้า|ยินยอมให้เผยแพร่/.test(code));
check('ไม่มีสวิตช์ใน spec (agentCard) = ซ่อนกล่อง', /SPEC\s*=\s*s\s*&&\s*s\.agentCard\s*\?\s*s\.agentCard\s*:\s*null/.test(code) && /box\.hidden\s*=\s*!\(SPEC/.test(code));
check('ใบของผู้ซื้อ (buyer) ไม่แสดง', /role\s*!==\s*'buyer'/.test(code));
check('ใบที่ยกเลิกแล้วไม่แสดง', /!d\.cancelled/.test(code));
check('ส่งเป็น FormData ไป /agent-card พร้อมตั๋ว', /new FormData/.test(code) && /agent-card\?t=/.test(code));
check('ลบการ์ดด้วย DELETE + ถามยืนยันก่อน', /method:\s*'DELETE'/.test(code) && /confirm\(/.test(code));
check('ไม่ต่อข้อความผู้ใช้เป็น HTML (ไม่มี innerHTML/insertAdjacentHTML)', !/innerHTML|insertAdjacentHTML|document\.write/.test(code));
check('ไม่ตัดสินสถานะเอง — ใช้ statusTh / live / reason จากเซิร์ฟเวอร์', /CUR\.live/.test(code) && /CUR\.statusTh/.test(code) && /CUR\.reason/.test(code));
check('ไม่เก็บลง localStorage/sessionStorage', !/localStorage|sessionStorage/.test(code));
check('ไม่ยิงสถิติ (ไม่ใช่ช่องทางติดต่อ)', !/njTrack|sendBeacon|\/api\/public\/track/.test(code));
check('ไม่มีคำต้องห้าม (ผ่าน/ปลอดภัย/รับประกัน/ยืนยันตัวตนแล้ว) ในข้อความบนจอ',
  !/['"`][^'"`\n]*(ปลอดภัย|รับประกัน|ยืนยันตัวตนแล้ว)[^'"`\n]*['"`]/.test(code));
check('บอกผู้ใช้ว่ายังไม่ขึ้นหน้าประกาศจนกว่าทีมงานจะรับรอง', /ยังไม่ขึ้นหน้าประกาศจนกว่าทีมงานจะรับรอง/.test(code));
check('เปิดให้ consign.js เรียก NJAgentCard.paint', /window\.NJAgentCard\s*=\s*\{\s*paint/.test(code));
check('consign.js เรียก NJAgentCard.paint ใน setLead', /function setLead[\s\S]*?window\.NJAgentCard\.paint\(d\)/.test(consign));

console.log('\n3) หน้าแปลง (land.js · posterHtml)');
const m = land.match(/function posterHtml\(l\)\{[\s\S]*?\n  \}/);
check('ดึงฟังก์ชัน posterHtml ออกมาได้', !!m);
let none, off, full, evil, noPhoto;
if (m) {
  const ctx = { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) };
  vm.createContext(ctx);
  vm.runInContext(m[0] + ';this.f=posterHtml;', ctx);
  none = ctx.f({});
  off = ctx.f({ agent: null });
  full = ctx.f({ agent: { name: 'คุณสมชาย', company: 'บริษัท ตัวอย่าง', roleTh: 'นายหน้า', photo: 'https://app.njteedinsure.com/uploads/ac-1.jpg', disclaim: 'ข้อมูลผู้ลงประกาศ (ระบุโดยผู้ลงประกาศ)' } });
  evil = ctx.f({ agent: { name: '<img src=x onerror=alert(1)>', company: '"><script>x</script>', roleTh: 'นายหน้า', photo: 'javascript:alert(1)' } });
  noPhoto = ctx.f({ agent: { name: 'คุณมานี', company: '', roleTh: 'เจ้าของทรัพย์', photo: '' } });
}
check('ไม่มี l.agent → ไม่วาดอะไรเลย', none === '' && off === '');
check('มี l.agent → วาดชื่อ บริษัท ตำแหน่ง', /คุณสมชาย/.test(full) && /บริษัท ตัวอย่าง/.test(full) && /นายหน้า/.test(full));
check('มีรูป → วาด <img> จาก URL ที่ API ส่งมา', /<img src="https:\/\/app\.njteedinsure\.com\/uploads\/ac-1\.jpg"/.test(full));
check('บอกว่าระบุโดยผู้ลงประกาศ', /ระบุโดยผู้ลงประกาศ/.test(full));
check('แสดงข้อความกำกับจาก API', /ข้อมูลผู้ลงประกาศ \(ระบุโดยผู้ลงประกาศ\)/.test(full));
check('ไม่มีเบอร์โทร/อีเมล/ลิงก์โทร/ป้ายยืนยันตัวตนในผลลัพธ์', !/tel:|mailto:|@|ยืนยันตัวตน|✓/.test(full), full);
check('ข้อความของผู้ลงประกาศถูก escape (ไม่เกิดแท็กจริง)', !/<img src=x|<script/.test(evil) && /&lt;/.test(evil), evil);
check('URL รูปที่ไม่ใช่ http(s) หรือ / ถูกทิ้ง (ใช้ตัวอักษรแทน)', !/<img src="javascript:/.test(evil) && /ld-poster-ini/.test(evil), evil);
check('ไม่มีรูป → ใช้ตัวอักษรแรกของชื่อ', /ld-poster-ini/.test(noPhoto) && />ม</.test(noPhoto), noPhoto);
check('agentHtml เรียก posterHtml(l)', /function agentHtml\(l\)\{[\s\S]*?posterHtml\(l\)/.test(land));

console.log('\n4) สไตล์');
check('ui.css มีสไตล์ .cs-ac ของฟอร์ม', /\.cs-ac\{/.test(ui) && /\.cs-ac\[hidden\]\{display:none\}/.test(ui));
check('ช่องกรอกฟอนต์ 16px (กัน iOS ซูม)', /\.cs-ac-f input\{[^}]*font-size:16px/.test(ui));
check('ปุ่มสูงอย่างน้อย 44px', /\.cs-ac-save\{[^}]*min-height:44px/.test(ui));
check('land.css มีสไตล์ .ld-poster', /\.ld-poster\{/.test(landCss) && /\.ld-poster-note\{/.test(landCss));
check('รูปบนหน้าแปลงมีขนาดตายตัว (ไม่กระตุกตอนโหลด)', /width="56" height="56"/.test(land));

console.log('\n== สรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + ' ==');
process.exit(fail ? 1 : 0);
