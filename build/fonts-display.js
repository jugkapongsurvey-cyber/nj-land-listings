/* ดาวน์โหลดฟอนต์หัวข้อ Anuphan (ตัวหนา 700) มาเก็บไว้ในเว็บเอง
 *
 *   รันด้วย:  node build/fonts-display.js
 *
 * ทำไมต้องมีฟอนต์ตัวที่สอง (เจ้าของกิจการสั่ง 25 ก.ย. 2569)
 * ---------------------------------------------------------------------------
 * IBM Plex Sans Thai ตัวหนาวาง "ไม้เอก" ทับหางสระ ี พอดีเป๊ะ พอเป็นหัวข้อตัวใหญ่
 * คำว่า "ที่" ในหัวข้อหน้าแรกจึงอ่านเป็น "ที" (เจ้าของเห็นเองบนจอจริง)
 * Anuphan คือฟอนต์ตระกูลเดียวกัน (Cadson Demak พัฒนาต่อจาก Plex Sans Thai) หน้าตาเหมือนเดิม
 * แต่ยกวรรณยุกต์ลอยเหนือสระชัดเจน — เปลี่ยนแล้วแบรนด์ไม่เพี้ยน
 *
 * ⚠️ **ใช้เฉพาะหัวข้อใหญ่บนหน้าแรก** (`.hero h1` ใน home.css) ไม่ใช่ทั้งเว็บ
 *    โหลดแค่น้ำหนักเดียว 2 ชุดอักษร (thai + latin) เพื่อไม่ให้ LCP ช้าลง
 * ⚠️ @font-face อยู่ใน home.css ไม่ใช่ fonts.css — fonts.css ต้องเป็นตระกูลเดียว
 *    (header.test.js ข้อ 8) และโหลดทุกหน้า ซึ่งหน้าอื่นไม่ได้ใช้ฟอนต์นี้
 * ⚠️ สัญญาอนุญาต SIL OFL 1.1 — **ต้องเก็บ fonts/OFL-Anuphan.txt ไว้เสมอ** ห้ามลบ
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const DIR = path.join(__dirname, '..', 'fonts');
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Anuphan:wght@700&display=swap';
const SUBSETS = ['thai', 'latin'];
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
  const css = await get(CSS_URL, false);
  const blocks = css.split(/(?=\/\* )/).filter((b) => b.indexOf('@font-face') >= 0);
  const out = [];
  for (const b of blocks) {
    const subset = /\/\* ([a-z-]+) \*\//.exec(b)[1];
    if (SUBSETS.indexOf(subset) < 0) continue;
    const src = /url\((https:\/\/[^)]+)\)/.exec(b)[1];
    const name = 'anuphan-' + subset + '-700.woff2';
    const bin = await get(src, true);
    fs.writeFileSync(path.join(DIR, name), bin);
    out.push(b.replace(src, 'fonts/' + name).trim());
    console.log('  ' + name.padEnd(30) + Math.round(bin.length / 1024) + ' KB');
  }
  if (out.length !== SUBSETS.length) throw new Error('ได้ไม่ครบ ' + SUBSETS.join('+') + ' — รูปแบบ CSS ของ Google เปลี่ยนไปแล้ว');
  console.log('\nคัดลอก @font-face ข้างล่างไปไว้ใน home.css (ถ้าชื่อไฟล์หรือ unicode-range เปลี่ยน):\n');
  console.log(out.join('\n'));
})().catch((e) => { console.error('ล้มเหลว:', e.message); process.exit(1); });
