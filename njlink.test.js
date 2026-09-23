// ทางเชื่อมที่ดินชัวร์ → เว็บ NJ (njandconsulting.com) — 2026-09-23
//   รันด้วย: node njlink.test.js
//
// ล็อกไว้:
//   · หน้าแปลงมีทางเข้า NJ ที่แนบรหัสทรัพย์ + UTM และนับคลิกด้วย nj_link_click (ไม่ใช่ลีด)
//   · รหัสทรัพย์ต้องผ่านรูปแบบรหัสจริงก่อนต่อเข้า URL ของอีกโดเมน
//   · ไม่มีข้อมูลส่วนบุคคลใน URL (มีแค่รหัสทรัพย์ที่ประกาศอยู่แล้ว)
//   · ห้ามใช้คำ "ในเครือ" "พันธมิตร" "ตรวจสอบโดย NJ" จนกว่าเจ้าของกิจการยืนยันถ้อยคำ
//   · ห้ามรับปากผลการรังวัด
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

const land = read('land.js');
const analytics = read('analytics.js');
const guides = read('guides.html');

console.log('\n1) หน้าแปลง (land.js)');
check('มีฟังก์ชัน njLinkHtml', /function njLinkHtml\(l\)\{/.test(land));
check('ถูกเรียกในหน้ารายละเอียด', /njLinkHtml\(l\)\+/.test(land));
// ดึงฟังก์ชันมารันจริง แล้วตรวจผลลัพธ์
const m = land.match(/var NJ_SITE='[^']+';\s*function njLinkHtml\(l\)\{[\s\S]*?\n  \}/);
check('ดึงโค้ดฟังก์ชันออกมาได้', !!m);
let html = '', bad = '';
if (m) {
  const ctx = { esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) };
  vm.createContext(ctx);
  vm.runInContext(m[0] + ';this.f=njLinkHtml;', ctx);
  html = ctx.f({ id: 'OP-045' });
  bad = ctx.f({ id: '"><script>x</script>' });
}
check('ลิงก์ไป njandconsulting.com', /href="https:\/\/njandconsulting\.com\/\?/.test(html), html);
check('แนบรหัสทรัพย์', /code=OP-045/.test(html), html);
check('มี UTM ครบ source/medium/campaign/content', /utm_source=njteedinsure/.test(html) && /utm_medium=referral/.test(html) && /utm_campaign=crosslink/.test(html) && /utm_content=land_detail/.test(html));
check('บอกฝั่ง NJ ว่ามาจากหน้าแปลง (from=teedin_land)', /from=teedin_land/.test(html));
check('นับคลิกด้วย data-njlink พร้อมรหัส', /data-njlink="OP-045"/.test(html));
check('เปิดแท็บใหม่แบบ noopener', /target="_blank" rel="noopener"/.test(html));
check('⭐ รหัสรูปแบบผิดไม่ถูกต่อเข้า URL', bad.indexOf('script') < 0 && !/code=/.test(bad), bad);
check('ปุ่มบอกชัดว่าได้บริการอะไร', /ปรึกษาการสอบเขตก่อนซื้อ/.test(html) && /ดูวิธีตรวจสอบที่ดิน/.test(html));
check('⭐ ไม่มีชื่อ/เบอร์/ตั๋วใน URL', !/(^|[?&]|&amp;)(name|phone|tel|t)=/.test((html.match(/href="([^"]+)"/) || [])[1] || ''));

console.log('\n2) สถิติ (analytics.js)');
check('nj_link_click อยู่ในรายการเหตุการณ์', /'nj_link_click'/.test(analytics));
check('ตัวดักคลิกกลางสำหรับ a[data-njlink]', /closest\('a\[data-njlink\]'\)/.test(analytics) && /njTrackInternal\('nj_link_click'/.test(analytics));
check('⭐ ไม่ยิง survey_request_submit จากเบราว์เซอร์', analytics.indexOf("'survey_request_submit'") < 0);

console.log('\n3) คู่มือ (guides.html)');
check('หัวข้อรังวัดสอบเขตมีทางเข้า NJ', /id="survey"[\s\S]{0,1400}data-njlink=""/.test(guides));
check('ลิงก์คู่มือมี UTM ของตัวเอง', /utm_content=guide_survey/.test(guides) && /from=teedin_guide/.test(guides));

console.log('\n4) ถ้อยคำที่ต้องรอเจ้าของกิจการยืนยัน');
const txt = land + guides;
['ในเครือ', 'พันธมิตรของ NJ', 'ตรวจสอบโดย NJ', 'รับประกัน', 'การันตี', 'แน่นอน'].forEach(w => {
  const seg = (land.match(/function njLinkHtml[\s\S]*?\n  \}/) || [''])[0] + (guides.match(/class="gd-nj"[\s\S]*?<\/p>/) || [''])[0];
  check('ไม่มีคำว่า "' + w + '" ในทางเข้า NJ', seg.indexOf(w) < 0);
});
void txt;

console.log('\n' + (fail ? 'FAIL ' + fail + ' · ' : '') + '✅ njlink: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
