// ฟอร์มแจ้งข้อมูลไม่ถูกต้องบนหน้าแปลง (ระบบ 2 พ.ย. 2569 · ลงประกาศเอง รอบ 2 · POST /api/public/listings/:id/report)
// รันด้วย:  node listingreport.test.js  [path ไปยัง nj-survey-system]
// กติกา: ส่งเข้าระบบ (ไม่ใช่ LINE อย่างเดียว) · ยังมีทาง LINE · ไม่ถามชื่อ/เบอร์ · ไม่ใช่ช่องทางติดต่อ (ไม่มี data-contact/สถิติลีด)
//        · คีย์เหตุผลตรงกับ REPORT_REASONS ของระบบ · ส่งสำเร็จขึ้นข้อความขอบคุณ · ซ่อนตอนสั่งพิมพ์
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 240) : '')); }
}
const land = read('land.js');
const css = read('land.css');
const s0 = land.indexOf('var REPORT_REASONS='), s1 = land.indexOf('// ---------- แปลงที่เพิ่งดู', s0);
const box = s0 > 0 && s1 > s0 ? land.slice(s0, s1) : '';

ok('มีฟอร์มแจ้ง + ตัวผูกปุ่ม', box.length > 500 && /function bindReport/.test(box) && /bindReport\(l\);/.test(land));
ok('ปุ่ม ⚑ เป็นปุ่มกางฟอร์ม (ไม่ใช่ลิงก์ LINE ตรง)', /<button type="button" class="ld-tool" id="ld-report" aria-expanded="false" aria-controls="ld-report-box">/.test(land));
ok('ฟอร์มวางใต้แถวเครื่องมือ', /'<\/div>'\+\s*reportBoxHtml\(l\)\+/.test(land));
ok('ยิงเข้า /api/public/listings/:id/report', /\/api\/public\/listings\/'\+encodeURIComponent\(l\.id\)\+'\/report'/.test(box) && /method:'POST'/.test(box));
ok('ยังมีทางแจ้งทาง LINE (reportHref) ในฟอร์ม', /reportHref\(l\)/.test(box) && /หรือแจ้งทาง LINE/.test(box));
ok('ไม่ถามชื่อ/เบอร์/อีเมล', !/name="(name|phone|email|tel)"/.test(box) && !/type="tel"|type="email"/.test(box));
ok('⭐ ไม่ใช่ช่องทางติดต่อ — ไม่มี data-contact และไม่ยิงสถิติ', !/data-contact/.test(box) && !/njTrack/.test(box) && !/id="ld-report"[^>]*data-contact/.test(land));
ok('มี honeypot website', /name="website" class="njsv-hp"/.test(box));
ok('ข้อความจำกัด 300 ตัว', /maxlength="300"/.test(box) && /slice\(0,300\)/.test(box));
ok('ส่งสำเร็จขึ้นข้อความขอบคุณพร้อมรหัสประกาศ', /ขอบคุณที่แจ้ง/.test(box) && /esc\(l\.id\)/.test(box));
ok('ส่งไม่สำเร็จบอกเหตุ ไม่เงียบ', /\.catch\(function\(err\)/.test(box) && /say\('bad'/.test(box));
ok('ถ้อยคำไม่มีคำรับประกัน/เร็วขึ้น', !/รับประกัน|การันตี|เร็วขึ้น|ไม่กี่นาที/.test(box));
ok('ซ่อนตอนสั่งพิมพ์ + เป้ากด 44px', /\.ld-sticky, \.ld-tools, \.ld-report-box, \.ld-rel \{ display: none !important; \}/.test(css) && /\.ld-report-box select, \.ld-report-box textarea \{[^}]*min-height: 44px/.test(css));
ok('ฟอร์มซ่อนไว้ก่อน (hidden) จนกดปุ่ม', /id="ld-report-box" hidden/.test(box) && /\.ld-report-box\[hidden\] \{ display: none; \}/.test(css));

const keys = [...box.matchAll(/\['([a-z_]+)','/g)].map(m => m[1]);
ok('มีเหตุผล 6 แบบ', keys.length === 6, keys.join());
const SRV = process.argv[2] || path.join(__dirname, '..', 'nj-survey-system');
const libP = path.join(SRV, 'lib', 'selfreview.js');
if (fs.existsSync(libP)) {
  const srv = require(libP);
  ok('⭐ คีย์เหตุผลตรงกับ REPORT_REASONS ของระบบ', keys.slice().sort().join() === srv.REASON_KEYS.slice().sort().join(), keys.join() + ' ≠ ' + srv.REASON_KEYS.join());
  const thW = Object.fromEntries([...box.matchAll(/\['([a-z_]+)','([^']+)'\]/g)].map(m => [m[1], m[2]]));
  ok('ป้ายภาษาไทยตรงกับระบบ', srv.REPORT_REASONS.every(r => thW[r.key] === r.th), JSON.stringify(thW));
} else {
  console.log('  (ข้ามการเทียบกับระบบ — ไม่พบ ' + libP + ')');
}

console.log('listingreport: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
