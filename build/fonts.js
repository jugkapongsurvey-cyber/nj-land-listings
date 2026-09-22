/* ดาวน์โหลดฟอนต์ IBM Plex Sans Thai มาเก็บไว้ในเว็บเอง แล้วสร้าง fonts.css
 *
 *   รันด้วย:  node build/fonts.js
 *
 * ทำไมต้องเสิร์ฟฟอนต์เอง
 * ---------------------------------------------------------------------------
 * ของเดิมดึงจาก Google Fonts ซึ่งเป็น **คนละโดเมนกับเว็บ 2 โดเมน**
 * (fonts.googleapis.com สำหรับ CSS · fonts.gstatic.com สำหรับไฟล์ฟอนต์)
 * เบราว์เซอร์จึงต้องเปิดการเชื่อมต่อใหม่ก่อนจะเริ่มโหลดได้
 *
 * วัดด้วย Lighthouse (mobile) บนเครื่องเมื่อ 22 ก.ย. 2569:
 *   ดึงจาก Google  85 คะแนน · LCP 3,500 ms
 *   เสิร์ฟเอง      89 คะแนน · LCP 3,340 ms
 *   ไม่โหลดฟอนต์เลย 94 คะแนน · LCP 2,550 ms   (ไว้เทียบว่าฟอนต์ยังเหลือต้นทุนเท่าไร)
 *
 * ⚠️ **ไม่ลดจำนวนน้ำหนักฟอนต์** — 500/600 ถูกใช้ในสไตล์ชีตรวมกัน 143 จุด
 *    ตัดออกคือเปลี่ยนหน้าตาเว็บ ซึ่งต้องให้เจ้าของกิจการตัดสินก่อน
 *
 * ⚠️ **ไฟล์ woff2 และ fonts.css ถูก commit ลง repo** เหมือน sitemap.xml
 *    GitHub Pages เสิร์ฟจากรากของ repo ตามเดิม ไม่ได้เปลี่ยนวิธี deploy
 *
 * ⚠️ สัญญาอนุญาต SIL OFL 1.1 — **ต้องเก็บ fonts/OFL.txt ไว้เสมอ** ห้ามลบ
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'fonts');
const FAMILY = 'IBM+Plex+Sans+Thai';
const WEIGHTS = '400;500;600;700';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=' + FAMILY + ':wght@' + WEIGHTS + '&display=swap';
// ⚠️ ต้องส่ง User-Agent ของเบราว์เซอร์รุ่นใหม่ ไม่งั้น Google ส่ง CSS ที่ชี้ไฟล์ ttf รุ่นเก่ามาให้
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function get(url, binary) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      if (res.statusCode !== 200) { reject(new Error(url + ' → HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

(async function main() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  const css = await get(CSS_URL, false);
  const blocks = css.split(/(?=\/\* )/).filter((b) => b.indexOf('@font-face') >= 0);
  if (!blocks.length) throw new Error('อ่าน CSS ของ Google ไม่ออก — รูปแบบเปลี่ยนไปแล้ว');

  const out = [];
  for (const b of blocks) {
    const subset = /\/\* ([a-z-]+) \*\//.exec(b)[1];
    const weight = /font-weight:\s*(\d+)/.exec(b)[1];
    const src = /url\((https:\/\/[^)]+)\)/.exec(b)[1];
    const name = 'ibmplexsansthai-' + subset + '-' + weight + '.woff2';
    const bin = await get(src, true);
    fs.writeFileSync(path.join(DIR, name), bin);
    out.push(b.replace(src, 'fonts/' + name).trim());
    console.log('  ' + name.padEnd(42) + Math.round(bin.length / 1024) + ' KB');
  }

  const head = '/* IBM Plex Sans Thai — เสิร์ฟเองจากโดเมนเดียวกับเว็บ แทนการดึงจาก Google Fonts\n' +
    ' * ⚠️ ไฟล์นี้สร้างด้วย `node build/fonts.js` ห้ามแก้ด้วยมือ\n' +
    ' * ⚠️ สัญญาอนุญาต SIL OFL 1.1 — ดู fonts/OFL.txt (ห้ามลบ)\n' +
    ' */\n';
  fs.writeFileSync(path.join(ROOT, 'fonts.css'), head + out.join('\n') + '\n');
  console.log('เขียน fonts.css แล้ว — ' + out.length + ' บล็อก @font-face');
})().catch((e) => { console.error('ล้มเหลว:', e.message); process.exit(1); });
