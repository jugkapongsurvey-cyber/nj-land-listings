// วิดีโอทรัพย์บนหน้าแปลง + ป้ายจำนวนบนการ์ด (ฝากขายชัวร์ · ระบบ 3 พ.ย. 69) · รันด้วย:  node listingvideo.test.js
// กติกาหลัก: ไม่มี videos (หรือ API รุ่นเก่า) = หน้าตาเดิมทุกอย่าง · รับเฉพาะลิงก์ http(s) · ไม่เล่นเอง · escape ทุกค่า
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 240) : '')); }
}

// ---------- 1) หน้าแปลง: ตัววาดวิดีโอ (ดึงสองฟังก์ชันออกจาก land.js มารันจริง) ----------
console.log('\n1) land.js — หัวข้อวิดีโอทรัพย์');
const land = read('land.js');
function grab(name) {
  const i = land.indexOf('  function ' + name + '(');
  const j = land.indexOf('\n  }\n', i);
  if (i < 0 || j < 0) throw new Error('ไม่พบ ' + name);
  return land.slice(i, j + 4);
}
const escSrc = (land.match(/  function esc\(s\)\{[^\n]*\}/) || [''])[0];
const api = new Function(escSrc + grab('videosOf') + grab('videosHtml') + 'return {videosOf:videosOf, videosHtml:videosHtml};')();

ok('ไม่มี videos = สตริงว่าง (หัวข้อไม่ขึ้น)', api.videosHtml({}) === '' && api.videosHtml({ videos: [] }) === '' && api.videosHtml({ videos: 'x' }) === '');
const V = [
  { url: 'https://app.njteedinsure.com/uploads/a.mp4', duration: 20.4, width: 1080, height: 1920, quality: 'Full HD 1080p' },
  { url: 'https://app.njteedinsure.com/uploads/b.mp4', duration: 12, width: 1280, height: 720, quality: 'HD 720p' }
];
const h = api.videosHtml({ videos: V });
ok('วาดครบทุกคลิป', (h.match(/<video /g) || []).length === 2, h);
ok('ไม่เล่นเอง · โหลดแค่หัวไฟล์ · เล่นในหน้าบนมือถือ', !/autoplay/.test(h) && /preload="metadata"/.test(h) && /playsinline/.test(h) && /controls/.test(h));
ok('#t=0.1 ให้มือถือวาดเฟรมแรก', h.indexOf('a.mp4#t=0.1') > 0);
ok('แนวตั้งได้คลาส tall · แนวนอนไม่ได้', /class="ld-vid tall"[\s\S]*a\.mp4/.test(h) && /class="ld-vid">[\s\S]*b\.mp4/.test(h));
ok('คำบรรยาย: ลำดับ · วินาที (ปัด) · ความละเอียด', h.indexOf('คลิปที่ 1 · 20 วินาที · Full HD 1080p') > 0 && h.indexOf('คลิปที่ 2 · 12 วินาที · HD 720p') > 0, h);
ok('กว้าง×สูงใส่เป็นแอตทริบิวต์ (กันหน้ากระโดดตอนโหลด)', /width="1080" height="1920"/.test(h));
const bad = api.videosOf({ videos: [{ url: 'javascript:alert(1)' }, { url: 'data:video/mp4;base64,AA' }, { url: '//evil/x.mp4' }, null, { url: 5 }].concat(V) });
ok('รับเฉพาะลิงก์ http(s)', bad.length === 2 && bad.every(v => /^https:/.test(v.url)));
ok('เพดาน 5 คลิป', api.videosOf({ videos: Array(8).fill(V[0]) }).length === 5);
const x = api.videosHtml({ videos: [{ url: 'https://x/"><img src=x onerror=1>.mp4', quality: '<b>q</b>' }] });
ok('escape ลิงก์และป้าย', x.indexOf('<img') < 0 && x.indexOf('<b>') < 0 && x.indexOf('&quot;') > 0, x);
ok('ไม่มีข้อมูลความยาว = ไม่ขึ้น "0 วินาที"', api.videosHtml({ videos: [{ url: 'https://x/a.mp4' }] }).indexOf('0 วินาที') < 0);
ok('หัวข้อ ld-s-video อยู่ต่อจากรายละเอียดทรัพย์ ก่อนสาธารณูปโภค',
  land.indexOf("secHtml('ld-s-desc'") < land.indexOf("secHtml('ld-s-video'") && land.indexOf("secHtml('ld-s-video'") < land.indexOf("secHtml('ld-s-feat'"));
const css = read('land.css');
ok('สไตล์ .ld-vids/.ld-vid อยู่ใน land.css + จำกัดความสูงคลิปแนวตั้ง', /\.ld-vids\{/.test(css) && /\.ld-vid video\{[^}]*max-height/.test(css));

// ---------- 2) การ์ด: ป้ายจำนวนวิดีโอ ----------
console.log('\n2) listingcard.js — ป้าย ▶ วิดีโอ');
global.window = {}; global.document = {};
new Function(read('landvocab.js'))();
new Function(read('listingcard.js'))();
const NJL = global.window.NJListing;
function card(extra) { return NJL.card(NJL.normalize(Object.assign({ id: 'OP-9', type: 'sell', parcelInfo: 'แปลงทดสอบ', estValue: 1000000, photos: [], tier: 1 }, extra || {}), 0)); }
const cnt = html => (html.match(/<span class="photo-count"[^>]*>([^<]*)<\/span>/) || [])[1] || '';
ok('API รุ่นเก่า (ไม่มี videos) = videoCount 0', NJL.normalize({ id: 'OP-1' }, 0).videoCount === 0);
ok('ไม่มีวิดีโอ รูปเดียว = ไม่มีป้าย (เหมือนเดิม)', card({ photos: ['https://x/1.jpg'] }).indexOf('photo-count') < 0);
ok('ไม่มีวิดีโอ หลายรูป = ป้ายเดิม "▣ 3"', cnt(card({ photos: ['https://x/1.jpg', 'https://x/2.jpg', 'https://x/3.jpg'] })) === '▣ 3');
ok('มีวิดีโอ 1 คลิป ไม่มีรูป = "▶ วิดีโอ"', cnt(card({ videos: [V[0]] })) === '▶ วิดีโอ', card({ videos: [V[0]] }));
ok('หลายรูป + 2 คลิป = "▣ 2 · ▶ วิดีโอ 2"', cnt(card({ photos: ['https://x/1.jpg', 'https://x/2.jpg'], videos: V })) === '▣ 2 · ▶ วิดีโอ 2');
ok('มี aria-label บอกจำนวนคลิป', /aria-label="มีวิดีโอทรัพย์ 2 คลิป"/.test(card({ videos: V })));

console.log('\n' + pass + ' ผ่าน · ' + fail + ' ไม่ผ่าน');
process.exit(fail ? 1 : 0);
