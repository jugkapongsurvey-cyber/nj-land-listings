// เครื่องมือเก็บลีด 5 ตัวบนหน้าเครื่องมือ (Phase 10 สปรินต์ 5)
//   รันด้วย:  node leadtools.test.js
//
// สิ่งที่ล็อกไว้ (ข้อไหนแดง = กำลังเปิดช่องที่ตั้งใจปิด):
//   · ⭐ ห้ามคัดลอกคำถาม/ตัวเลือก/คะแนนมาไว้ในหน้าเว็บ — ต้องดึงจาก /api/public/lead-tool/spec ที่เดียว
//     สองที่เมื่อไหร่ คะแนนที่ผู้ใช้เห็นกับที่ทีมขายเห็นในใบลีดจะไม่ตรงกัน
//   · ⭐ ห้ามมี on*= ในหน้าเว็บที่เสิร์ฟจริง (กติกา CSP ของเว็บนี้) — ผูกด้วย addEventListener เท่านั้น
//   · ⭐ ข้อความยินยอมต้องอยู่ติดปุ่มส่ง และต้องส่ง pdpa ไปให้เซิร์ฟเวอร์เก็บเป็นหลักฐาน
//   · ⭐ เช็กลิสต์ห้ามสรุปว่า "ผ่าน" หรือ "ปลอดภัย" — ติ๊กครบไม่ได้แปลว่าแปลงไม่มีปัญหา
//   · ⭐ ห้ามให้ตัวเลขราคาในหน้านี้ — ราคาที่ไม่ได้ดูแปลงจริงคือการเดา
const fs = require('fs');
const path = require('path');

const JS = fs.readFileSync(path.join(__dirname, 'leadtools.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, 'leadtools.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, 'tools.html'), 'utf8');
// เช็กลิสต์ก่อนซื้ออยู่ท้าย checklist.html (รวมเป็นอันเดียว 2026-09-25) — อีก 4 ตัวอยู่หน้าเครื่องมือ
const CL_HTML = fs.readFileSync(path.join(__dirname, 'checklist.html'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}
// ตัดคอมเมนต์ออกก่อนตรวจ — คำเตือนในคอมเมนต์พูดถึงสิ่งที่ห้ามทำได้ ไม่ใช่การทำ
const CODE = JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

console.log('\n1) ต่อสายครบทั้ง 5 เครื่องมือ');
const MOUNTS = ['lt-assess', 'lt-price', 'lt-checklist', 'lt-sample', 'lt-news'];
MOUNTS.forEach(id => {
  const page = id === 'lt-checklist' ? CL_HTML : HTML;
  const n = page.split('id="' + id + '"').length - 1;
  check((id === 'lt-checklist' ? 'หน้าเช็กลิสต์' : 'หน้าเครื่องมือ') + 'มีที่วาง ' + id + ' หนึ่งที่พอดี', n === 1, n);
  check('สคริปต์รู้จัก ' + id, CODE.indexOf("'" + id + "'") >= 0);
});
check('⭐ หน้าเครื่องมือไม่มีเช็กลิสต์ชุดที่สอง', HTML.indexOf('id="lt-checklist"') < 0);
check('⭐ เช็กลิสต์อ่านรายการข้อจากหน้า checklist.html (input[data-cl])', /input\[data-cl\]/.test(CODE));
check('⭐ ไม่พึ่งรายการเช็กลิสต์จากเซิร์ฟเวอร์', !/SPEC\.checklist/.test(CODE));
check('ส่งจำนวนที่ติ๊กและชื่อข้อที่ยังไม่ติ๊กให้ทีม', /done:/.test(CODE) && /total:/.test(CODE) && /left:/.test(CODE));
check('หน้าเครื่องมือเรียก leadtools.js', /<script src="leadtools\.js"/.test(HTML));
check('หน้าเครื่องมือเรียก leadtools.css', /href="leadtools\.css"/.test(HTML));
check('⭐ leadtools.js มาหลัง attrib.js (ต้องมีที่มาของลีดก่อนถึงจะแนบไปได้)',
      HTML.indexOf('attrib.js') < HTML.indexOf('leadtools.js'));

console.log('\n2) ⭐ คำถามมาจากเซิร์ฟเวอร์ที่เดียว ห้ามเก็บสำเนาไว้ในหน้าเว็บ');
check('เรียก /api/public/lead-tool/spec', CODE.indexOf('/api/public/lead-tool/spec') >= 0);
// คีย์ตัวเลือกจริงของแบบประเมิน — โผล่ในไฟล์นี้เมื่อไหร่ = มีสำเนาที่สองแล้ว
['chanote', 'nsk3', 'servitude', 'mortgage', 'deed_copy', 'bound_walk'].forEach(k => {
  check('ไม่มีสำเนาตัวเลือก "' + k + '" ในหน้าเว็บ', CODE.indexOf(k) < 0);
});
check('⭐ ไม่คิดคะแนนเองในหน้าเว็บ (ไม่มีตารางน้ำหนักคะแนน)',
      CODE.indexOf('weight') < 0 && !/score\s*[+]=/.test(CODE));
check('ขอคะแนนจากเซิร์ฟเวอร์ผ่าน /preview', CODE.indexOf('/api/public/lead-tool/preview') >= 0);

console.log('\n3) ⭐ ความยินยอมและการส่งลีด');
check('มีช่องติ๊กยินยอมในกล่องขอเบอร์', /data-lt="pdpa"/.test(JS));
check('ไม่ติ๊กแล้วไม่ยอมส่ง', /ยินยอมให้เราติดต่อกลับก่อนส่ง/.test(JS));
check('⭐ ส่ง pdpa ไปให้เซิร์ฟเวอร์เก็บเป็นหลักฐาน', /pdpa:\s*true/.test(CODE));
check('ข้อความยินยอมบอกชื่อบริษัทเต็ม', /บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด/.test(JS));
check('รับข่าวสารบอกว่ายกเลิกได้ทุกเมื่อ', /ยกเลิกได้ทุกเมื่อ/.test(JS));
check('แนบที่มาของลีดไปด้วย (ใช้วัดผลโฆษณา)', /NJAttrib/.test(CODE));
check('มี honeypot กันบอท', /data-lt="website"/.test(JS) && /lt-hp/.test(CSS));
check('honeypot ถูกซ่อนจากคนจริงและจากโปรแกรมอ่านหน้าจอ',
      /aria-hidden="true"/.test(JS) && /tabindex="-1"/.test(JS));

console.log('\n4) ⭐ ข้อความที่ห้ามเพี้ยน');
check('แบบประเมินบอกว่าไม่ใช่การประเมินราคาและไม่ใช่การรังวัด',
      /ไม่ใช่การประเมินราคา/.test(JS) && /ไม่ใช่การรังวัด/.test(JS));
check('⭐ เช็กลิสต์ไม่สรุปว่า "ผ่าน" หรือ "ปลอดภัย"',
      /ติ๊กครบทุกข้อไม่ได้แปลว่าแปลงปลอดภัย/.test(JS));
check('⭐ ฟอร์มขอวิเคราะห์ราคาไม่ตอบราคาทันที', /ไม่ตอบราคาทันทีในหน้านี้/.test(JS));
check('ตัวอย่างรายงานบอกว่าปิดข้อมูลลูกค้าไว้แล้ว', /ปิดข้อมูลของลูกค้า/.test(JS));

console.log('\n5) ⭐ กติกาเดิมของเว็บนี้');
check('⭐ ไม่มี on*= ในสคริปต์ (CSP)', !/\son[a-z]+\s*=/.test(CODE), (CODE.match(/\son[a-z]+\s*=/) || [])[0]);
check('ผูกเหตุการณ์ด้วย addEventListener', /addEventListener/.test(CODE));
check('ไม่มี innerHTML ที่ยัดค่าจากผู้ใช้โดยไม่ผ่าน esc()',
      !/innerHTML\s*=\s*[^;]*\+\s*(c\.|v\.)[a-z]/i.test(CODE));
check('ต่อเซิร์ฟเวอร์ไม่ได้ = ซ่อนทั้งก้อน ไม่ทิ้งหัวข้อลอยไว้', /style\.display\s*=\s*'none'/.test(CODE));
check('ไม่มีคีย์ API = ไม่วาดอะไรเลย', /if \(!base\) return;/.test(CODE));

console.log('\n5b) ⭐ สถิติภายในส่งออกจริง (เดิมเรียก NJTrack ซึ่งไม่มีอยู่บนเว็บ)');
check('⭐ ไม่เรียก NJTrack (ไม่มีตัวแปรนี้บนเว็บ)', !/NJTrack/.test(CODE));
check('ใช้ njTrackInternal ของ analytics.js', /njTrackInternal/.test(CODE));
check('ยิง lead_tool_preview ตอนดูผลแบบประเมิน', /track\('lead_tool_preview'\)/.test(CODE));
check('⭐ ไม่ยิง lead_tool_submit จากหน้าเว็บ (เซิร์ฟเวอร์บันทึกเอง)', !/'lead_tool_submit'/.test(CODE));
const ANALYTICS = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');
check('⭐ lead_tool_preview อยู่ใน NJ_INTERNAL_EVENTS', /'lead_tool_preview'/.test((ANALYTICS.match(/NJ_INTERNAL_EVENTS = \[[\s\S]*?\];/) || [''])[0]));
check('ข้อความหลังส่งมีไลน์เสมอ (ไม่มี config.js ก็ไม่ว่าง)', /lineId\) \|\| '@/.test(CODE));

console.log('\n5c) หน้ายกเลิกรับข่าวสาร');
const UH = fs.readFileSync(path.join(__dirname, 'unsubscribe.html'), 'utf8');
const UJ = fs.readFileSync(path.join(__dirname, 'unsubscribe.js'), 'utf8');
const UCODE = UJ.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
check('⭐ หน้า noindex + referrer ไม่ส่งตั๋วต่อ', /name="robots" content="noindex/.test(UH) && /name="referrer" content="no-referrer"/.test(UH));
check('โหลด unsubscribe.js', /<script src="unsubscribe\.js" defer><\/script>/.test(UH));
check('⭐ ไม่มี on*= และ script แบบ inline (CSP)', !/\son[a-z]+\s*=/.test(UH + UCODE) && !/<script>(?!\s*<\/script>)/.test(UH));
check('เรียกเส้นทางยกเลิกของระบบ', /\/api\/public\/newsletter\//.test(UCODE) && /'\/unsubscribe'/.test(UCODE));
check('⭐ ยกเลิกได้ในคลิกเดียว (ไม่มีกล่องถามยืนยัน)', !/confirm\(/.test(UCODE));
check('ข้อความจากเซิร์ฟเวอร์ผ่าน esc() ก่อนวาด', /esc\(DATA\.error\)/.test(UCODE) && /map\(esc\)/.test(UCODE));

console.log('\n6) สไตล์ชีตอ่านสีจาก tokens.css');
const decls = CSS.match(/(?:color|background|border-color|border-left-color)\s*:\s*[^;]+;/g) || [];
const raw = decls.filter(d => /#[0-9A-Fa-f]{3,8}/.test(d) && d.indexOf('var(') < 0);
check('⭐ ไม่มีสีดิบที่ไม่ได้อยู่ในค่าสำรองของ var()', raw.length === 0, raw.slice(0, 3).join(' '));
check('กล่องคำถามอ่านได้บนจอแคบ (มี media query)', /@media \(max-width: 599px\)/.test(CSS));

console.log('\n7) ฝั่งระบบมีเส้นทางที่หน้าเว็บเรียกจริงไหม (ข้ามถ้าไม่มีโฟลเดอร์)');
const sys = process.argv[2] || path.join(__dirname, '..', 'nj-survey-system');
if (!fs.existsSync(path.join(sys, 'server.js'))) {
  console.log('  — ข้าม: ไม่พบ ' + sys);
} else {
  const SRV = fs.readFileSync(path.join(sys, 'server.js'), 'utf8');
  ['/api/public/lead-tool/spec', '/api/public/lead-tool/preview', '/api/public/lead-tool'].forEach(r => {
    check('ฝั่งระบบมีเส้นทาง ' + r, SRV.indexOf("'" + r + "'") >= 0);
  });
}

console.log('\n== สรุป: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + ' ==');
process.exit(fail ? 1 : 0);
