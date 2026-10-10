// ลงประกาศฟรีต้องสมัคร/เข้าสู่ระบบก่อน + ปุ่มเข้าสู่ระบบเห็นทุกขนาดจอ (เจ้าของสั่ง 10 ต.ค. 2569)
//
// เจ้าของ: "หน้าเข้าสู่ระบบหายไป" — ที่จริงปุ่มถูกซ่อนทั้งปุ่มที่จอต่ำกว่า 1280px
//          "ให้ทุกคนลงฝากฟรี แต่บังคับให้สมัครเข้าระบบก่อน" — เดิมส่งใบได้โดยไม่มีบัญชี แล้วค่อยผูกทีหลัง
//
// รัน: node signupgate.test.js
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (extra ? ' — ' + extra : '')); }
}
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('consign.html');
const js = read('consign.js');
const css = read('ui.css');
const hcss = read('header.css');

console.log('1) กล่องด่านสมัครในหน้าฝากขาย');
const gate = (html.match(/<div class="cs-gate" id="cs-gate" hidden>[\s\S]*?\n        <\/div>/) || [''])[0];
ok('⭐ มีกล่อง #cs-gate ซ่อนไว้ก่อน (consign.js เปิดเอง)', !!gate);
ok('กล่องอยู่ในฟอร์ม ต่อจากกล่องเลือกบริการ',
   html.indexOf('id="cs-svc"') > 0 && html.indexOf('id="cs-gate"') > html.indexOf('id="cs-svc"') &&
   html.indexOf('id="cs-gate"') < html.indexOf('id="cs-submit"'));
ok('⭐ ไม่มีช่องรหัสผ่านบนเว็บนี้ (สมัคร/เข้าสู่ระบบทำที่ seller.html บนโดเมนระบบเท่านั้น)', !/type="password"/.test(html));
ok('บอกขั้นตอน: ใบเสนอราคาแพ็กเกจ → แสดงผลรังวัดบนประกาศ → เจ้าของอนุมัติเองก่อนขึ้นเว็บ',
   /ใบเสนอราคาแพ็กเกจ/.test(gate) && /แสดงผลการรังวัดตรวจสอบบนประกาศ/.test(gate) && /กดอนุมัติเอง/.test(gate));
ok('มีทั้งปุ่มสมัครและปุ่มเข้าสู่ระบบ', /id="cs-gate-reg"/.test(gate) && /id="cs-gate-login"/.test(gate));
ok('⭐ ตรวจชัวร์ก็ต้องสมัครด้วย (เจ้าของสั่ง 10 ต.ค. 69) — ไม่มีข้อความว่าส่งได้โดยไม่ต้องสมัคร',
   /ทุกบริการ \(ตรวจชัวร์ · ขายเองชัวร์ · ฝากขายชัวร์\)/.test(gate) && !/โดยไม่ต้องสมัคร/.test(gate));
ok('"ต้องการ" (ฝากขาย/ฝากเช่า) ยังเห็นหลังด่าน', /<div class="cs-field cs-gate-keep">\s*<span class="cs-label">ต้องการ<\/span>/.test(html));

console.log('\n2) consign.js — เปิดด่านเมื่อไหร่');
const gateFn = (js.match(/function gateOn\(\) \{[\s\S]*?\n\}/) || [''])[0];
ok('⭐ ด่านขึ้นทุกบริการเมื่อระบบส่งรูปแบบบริการมา (ไม่ผูกกับ needsAccount · ไม่พิมพ์รายชื่อบริการในเว็บ)',
   /return SVC\.active\(\);/.test(gateFn) && !/needsAccount/.test(gateFn) && !/selfsell|broker|inspect/.test(gateFn) &&
   /active: function \(\) \{ return on\(\); \}/.test(js));
ok('ใบที่บันทึกไว้แล้ว (LEAD.id) แก้ต่อได้ · สวิตช์บัญชีปิด = ไม่มีด่าน', /if \(LEAD\.id \|\| !SELLER_ON \|\| !SVC\) return false;/.test(gateFn));
ok('⭐ ลิงก์ส่งแค่ key บริการผ่าน #fragment ไปหน้า seller.html (ไม่ส่งชื่อ/เบอร์)',
   /NJ_API_BASE \+ '\/seller\.html#start=consign&svc=' \+ encodeURIComponent\(key\)/.test(js) &&
   !/start=consign[^']*'\s*\+\s*[^;]*(name|phone)/.test(js));
ok('renderClaim เรียก renderGate ทุกครั้ง (บริการ/สวิตช์/ใบเปลี่ยน ด่านตามทัน)', /function renderClaim\(\) \{\s*renderGate\(\);/.test(js));
ok('⭐ กดส่งหลังด่าน = พาไปสมัคร ไม่ส่งใบแบบไม่มีบัญชี',
   /if \(sending\) return;\s*\/\/[^\n]*\n\s*if \(gateOn\(\)\) \{ location\.href = gateUrl\(''\); return; \}/.test(js));
ok('ข้อความในกล่องบริการไม่บอก "สมัครหลังบันทึกฟอร์ม" แล้ว', !/สมัครด้วยอีเมลได้หลังบันทึกฟอร์ม/.test(js));

console.log('\n3) ui.css — ซ่อนช่องกรอกหลังด่าน');
ok('⭐ ซ่อนลูกของฟอร์มทุกอันยกเว้น ต้องการ · เลือกบริการ · ด่าน · ช่องทางติดต่อ',
   /#consign-form\.cs-gated > :not\(\.cs-gate-keep\):not\(\.cs-svc\):not\(\.cs-gate\):not\(\.cs-alt\) \{ display: none !important; \}/.test(css));
ok('ปุ่มในด่านสูงอย่างน้อย 44px (จอสัมผัส)', /\.cs-gate-btn \{[^}]*min-height: 48px/.test(css) && /\.cs-gate-alt \{[^}]*min-height: 48px/.test(css));

console.log('\n4) ปุ่มเข้าสู่ระบบบนหัวเว็บ');
const home = read('index.html');
ok('⭐ ไม่ซ่อนทั้งปุ่มที่ขนาดจอใด', !/\.njh-login\s*\{[^}]*display:\s*none/.test(hcss));
ok('ต่ำกว่า 1280 เป็นไอคอน + ซ่อนเฉพาะข้อความ (โปรแกรมอ่านจอยังอ่าน aria-label)',
   /\.njh-login-ic \{ display: block; \}/.test(hcss) && /aria-label="เข้าสู่ระบบเจ้าของทรัพย์"/.test(home));
ok('ทุกหน้าที่สร้างจาก pages.js มีปุ่มรุ่นใหม่ (ไอคอน + ข้อความ)',
   fs.readdirSync(__dirname).filter(f => /\.html$/.test(f)).every(f => {
     const h = read(f);
     return !/class="njh-login"/.test(h) || /<span class="njh-login-t">เข้าสู่ระบบ<\/span>/.test(h);
   }));

console.log('\n✅ signupgate: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
