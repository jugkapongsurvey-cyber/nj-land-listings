/* build/testhtml.js — ให้เทสต์อ่าน HTML แบบไม่มีเลขเวอร์ชันท้ายไฟล์ CSS/JS
 *
 * ตั้งแต่ 12 พ.ย. 2569 ทุกหน้าอ้าง `x.css?v=<แฮช>` (build/assetver.js) แต่เทสต์จำนวนมากค้นแท็กด้วยชื่อไฟล์ตรงๆ
 * เช่น `src="landvocab.js"` — ไฟล์นี้ห่อ fs.readFileSync ให้ตัด `?v=…` ออกเฉพาะตอนอ่านไฟล์ .html เป็นข้อความ
 * เทสต์จึงเห็น HTML หน้าตาเดิมและตรวจกติกาเดิมได้ครบ · ความถูกต้องของเลขเวอร์ชันตรวจที่ `assetver.js --check` ใน CI
 *
 * ใช้: บรรทัดแรกของเทสต์ (หลัง 'use strict') → require('./build/testhtml');
 * ⚠️ ห้ามใช้ในโค้ดที่ไม่ใช่เทสต์ — ตัวสร้างหน้า (build/*.js) ต้องเห็นเลขเวอร์ชันจริง
 */
'use strict';
const fs = require('fs');
const { stripVer } = require('./assetver');

if (!fs.readFileSync.__njStripVer) {
  const orig = fs.readFileSync;
  const wrapped = function (file, opts) {
    const out = orig.apply(fs, arguments);
    if (typeof out === 'string' && /\.html$/i.test(String(file))) return stripVer(out);
    return out;
  };
  wrapped.__njStripVer = true;
  fs.readFileSync = wrapped;
}
