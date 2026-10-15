/* คลิปสอนวิธีฝากขาย 3 นาทีบนหน้า consign.html (#คลิปวิธีฝากขาย)
 *   รันด้วย:  node consignclip.test.js
 *
 * ใช้โค้ดชุดเดียวกับคลิปบน portal.html (portalclip.js + portalclip.css) — เทสต์นี้ล็อกสิ่งที่พังได้เงียบๆ บนหน้านี้:
 *   (1) เล่นเองตอนเปิดหน้า / ไม่มี controls ตอน JS ตาย (กติกาเดียวกับคลิปทุกตัวของเว็บ)
 *   (2) id ซ้ำกับแถบคลิปของ portal.html หรือกับฟอร์มฝากขาย (getElementById คืนตัวแรกเสมอ)
 *   (3) สารบัญบทเกินความยาวคลิป / ไม่เรียง / ป้ายเวลาไม่ตรง data-t (กดแล้วไม่เกิดอะไร)
 *   (4) ใช้ <details> แล้ว build/schema.js นับเป็นคำถาม FAQPage ปลอม
 *   (5) ถ้อยคำต้องห้ามของเจ้าของ (เร็วขึ้น · ไม่กี่นาที · ค่านายหน้า · ฝากขายฟรี)
 * ⚠️ ไฟล์คลิป/โปสเตอร์ยังไม่ต้องมีตอนรันเทสต์นี้ (ขึ้นเป็นหมายเหตุ) — build/lint.js เป็นด่านที่ตรวจว่าไฟล์มีจริง
 */
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 170) : '')); }
}

const page = read('consign.html');
const noComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
const pageNC = noComments(page);
const ui = read('ui.css');
const pcss = read('portalclip.css');
const js = read('portalclip.js').replace(/\/\/.*$/gm, '');
const sec = (page.match(/<section class="pt-clip cs-clip"[\s\S]*?<\/section>/) || [''])[0];
const secNC = noComments(sec);
const DURATION = 180; // วินาที — video/consign-tutorial.mp4 ยาว 3:00 (เสียงหญิง 15 ต.ค. 69)
const ID = 'คลิปวิธีฝากขาย';

console.log('\n1) โครงแถบคลิปและตำแหน่ง');
ok('⭐ มีแถบ #' + ID + ' (class pt-clip ให้ portalclip.js เจอ)', sec.length > 500 && new RegExp('id="' + ID + '"').test(sec));
ok('⭐ วางต่อจาก hero (ฟอร์มเลือกบริการ + #cs-gate) ก่อนตารางเปรียบเทียบ',
   page.indexOf('id="cs-gate"') > 0 && page.indexOf('id="cs-gate"') < page.indexOf('id="' + ID + '"') &&
   page.indexOf('<section class="cs-hero">') < page.indexOf('<section class="pt-clip cs-clip"') &&
   page.indexOf('<section class="pt-clip cs-clip"') < page.indexOf('<section class="cs-compare">'));
ok('ติดตามด้วยชื่อ consign_tutorial_clip', /<section class="pt-clip cs-clip"[^>]*data-track="consign_tutorial_clip"/.test(sec));
ok('aria-labelledby ชี้หัวข้อของแถบนี้', /aria-labelledby="pc-h-consign"/.test(sec) && /<h2 id="pc-h-consign">/.test(sec));
const cmt = page.slice(0, page.indexOf('<section class="pt-clip cs-clip"'));
const lastCmt = cmt.slice(cmt.lastIndexOf('<!--'));
ok('มีคอมเมนต์กำกับเหนือแถบ (ข้อมูลสมมติ · เสียง AI Airova · เวลาบทต้องตรงเสียง · ห้าม details)',
   /สมมติ/.test(lastCmt) && /Airova/.test(lastCmt) && /data-t/.test(lastCmt) && /details\/summary/.test(lastCmt));

console.log('\n2) วิดีโอ');
ok('⭐ ไฟล์คลิป + โปสเตอร์ชี้ที่อยู่ที่ตกลงกัน',
   /src="video\/consign-tutorial\.mp4"/.test(sec) && /poster="video\/consign-tutorial-poster\.jpg"/.test(sec));
ok('⭐ ไม่เล่นเอง: preload="none" และไม่มี autoplay', /preload="none"/.test(sec) && !/autoplay/i.test(sec));
ok('⭐ มี controls ตั้งแต่ HTML (JS ตายก็ยังกดเล่นได้) และมี playsinline',
   /<video[^>]*\scontrols[\s>]/.test(sec) && /<video[^>]*playsinline/.test(sec));
ok('⭐ ใส่ width/height กัน layout shift', /width="1080"\s+height="1920"/.test(sec));
ok('⭐ aria-label ของวิดีโอบอกความยาว 3 นาที และว่าข้อมูลเป็นตัวอย่างสมมติ',
   /<video[^>]*aria-label="[^"]*3 นาที[^"]*สมมติ[^"]*"/.test(sec));
ok('ปุ่มเล่นของเรามีชื่อให้เครื่องอ่านหน้าจอ', /<button[^>]*class="pc-play"[^>]*aria-label="[^"]*3 นาที[^"]*"/.test(sec));
['video/consign-tutorial.mp4', 'video/consign-tutorial-poster.jpg'].forEach(f => {
  const full = path.join(__dirname, f);
  if (!fs.existsSync(full)) console.log('  · หมายเหตุ: ยังไม่มีไฟล์ ' + f + ' (ใส่ก่อน commit — build/lint.js จะแดงจนกว่าจะมี)');
  else if (/\.mp4$/.test(f)) ok('ไฟล์คลิปไม่ใหญ่เกิน 20 MB (ลูกค้าดูบนมือถือ)', fs.statSync(full).size < 20 * 1024 * 1024);
});

console.log('\n3) id ไม่ซ้ำ');
const ids = [...pageNC.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
ok('⭐ ไม่มี id ซ้ำทั้งหน้า', new Set(ids).size === ids.length, ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
ok('id ในแถบลงท้าย -consign (ไม่ชนกับแถบคลิปของ portal.html)',
   /id="pc-video-consign"/.test(sec) && /id="pc-script-body-consign"/.test(sec) &&
   ![...secNC.matchAll(/\sid="([^"]+)"/g)].some(m => m[1] !== ID && !/-consign$/.test(m[1])));

console.log('\n4) สารบัญบท');
const chapBlock = (secNC.match(/<ol class="pc-chap"[\s\S]*?<\/ol>/) || [''])[0];
const times = [...chapBlock.matchAll(/<button type="button" data-t="(\d+(?:\.\d+)?)"><span class="pc-t">(\d+):(\d\d)<\/span>/g)]
  .map(m => ({ t: +m[1], label: +m[2] * 60 + +m[3], raw: m[1] }));
const liCount = (chapBlock.match(/<li>/g) || []).length;
ok('⭐ สารบัญอยู่ใน <ol class="pc-chap"> เดียว · ทุกบทอ่าน data-t ได้', liCount === 14 && times.length === liCount, liCount + '/' + times.length);
ok('⭐ บทแรกเริ่มที่ 0 วินาที', times.length > 0 && times[0].t === 0);
ok('⭐ เวลาเรียงจากน้อยไปมากและไม่ซ้ำ', times.every((x, i) => i === 0 || x.t > times[i - 1].t), times.map(x => x.raw).join(','));
ok('⭐ ทุกบทอยู่ในช่วง 0..' + DURATION + ' วินาที และเริ่มก่อนจบคลิปอย่างน้อย 3 วินาที', times.every(x => x.t >= 0 && x.t < DURATION - 3));
ok('⭐ ป้ายเวลาที่เห็น (m:ss) = data-t ปัดลง ทุกบท', times.every(x => x.label === Math.floor(x.t)),
   JSON.stringify(times.filter(x => x.label !== Math.floor(x.t))));
ok('ทุกบทมีหัวข้อ <b> และคำอธิบาย <small>', (chapBlock.match(/<span class="pc-ct"><b>[^<]+<\/b><small>[^<]+<\/small><\/span>/g) || []).length === liCount);

console.log('\n5) ข้อความเต็มของคลิป');
const body = (secNC.match(/<div class="pc-script-body" id="pc-script-body-consign"(?![^>]*hidden)[^>]*>[\s\S]*?<\/div>/) || [''])[0];
const paras = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1]);
ok('⭐ ข้อความเต็มมี 15 ท่อน (ตรงกับเสียง 15 ท่อน) และไม่ถูกซ่อนด้วย hidden ตั้งแต่ HTML', paras.length === 15, paras.length);
ok('ข้อความเต็มมีประโยคเปิดและปิดของคลิป (เสียงผู้หญิง — ค่ะ)',
   /^สวัสดีค่ะ วันนี้จะพาไปดูวิธีฝากขาย/.test(paras[0] || '') && /ทักไลน์ โทรหาทีมงานที่ดินชัวร์ได้เลยค่ะ$/.test(paras[14] || ''));
const src = path.join(__dirname, '..', 'consign-tutorial-video', 'fulltext.txt');
if (fs.existsSync(src)) {
  const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.replace(/^\d+: /, ''));
  ok('⭐ ข้อความเต็มตรงกับสคริปต์ที่ส่งให้เสียง AI อ่าน (../consign-tutorial-video/fulltext.txt) ทุกท่อน',
     lines.length === paras.length && lines.every((l, i) => l === paras[i]),
     lines.map((l, i) => l === paras[i] ? '' : (i + 1)).filter(Boolean).join(','));
}
ok('ปุ่มกางข้อความมี aria-expanded + aria-controls ชี้ถูกตัว',
   /<button[^>]*class="pc-script-btn"[^>]*aria-expanded="true"[^>]*aria-controls="pc-script-body-consign"/.test(sec));
ok('⭐ บอกตรงๆ ว่าเป็นข้อมูลตัวอย่างสมมติ และเสียงสร้างด้วย AI', /ข้อมูลตัวอย่างสมมติ/.test(secNC) && /สร้างด้วย AI/.test(secNC));

console.log('\n6) กติกาของเจ้าของ');
ok('⭐ ไม่มี <details>/<summary> ในแถบ (build/schema.js จะนับเป็น FAQPage)', !/<details\b|<summary\b/i.test(sec));
['เร็วขึ้น', 'ไม่กี่นาที', 'ค่านายหน้า', 'ฝากขายฟรี', 'คอมมิชชั่น'].forEach(w =>
  ok('⭐ ไม่มีคำต้องห้าม "' + w + '" ในแถบ', secNC.indexOf(w) < 0));
ok('ไม่มีอัตราร้อยละในแถบ', !/\d\s*%/.test(secNC));
ok('ไม่มี on*= ในแถบ (CSP)', !/\son[a-z]+=/i.test(sec));

console.log('\n7) ลิงก์ในกล่องสมัคร #cs-gate');
const gate = (page.match(/<div class="cs-gate" id="cs-gate" hidden>[\s\S]*?\n        <\/div>/) || [''])[0];
const gateLink = (gate.match(/<a class="cs-gate-clip"[^>]*>[\s\S]*?<\/a>/) || [''])[0];
ok('⭐ #cs-gate มีลิงก์ไปคลิป [data-pc-play] (portalclip.js สั่งเล่นในจังหวะคลิก)',
   new RegExp('<a class="cs-gate-clip" href="#' + ID + '" data-pc-play>').test(gateLink));
ok('ลิงก์บอกว่าเป็นคลิปสอนวิธีฝากขาย และไม่ใช่ปุ่มกรอบ (.cs-gate-btn/.cs-gate-alt)',
   /ดูคลิปสอนวิธีฝากขาย 3 นาที/.test(gateLink) && !/cs-gate-btn|cs-gate-alt/.test(gateLink));
ok('ลิงก์สูงอย่างน้อย 44px (จอสัมผัส)', /\.cs-gate-clip \{[^}]*min-height: 44px/.test(ui));
ok('ปุ่มสมัคร/เข้าสู่ระบบยังอยู่ครบในกล่อง', /id="cs-gate-reg"/.test(gate) && /id="cs-gate-login"/.test(gate));

console.log('\n8) สไตล์และสคริปต์');
ok('⭐ หน้านี้โหลด portalclip.css (สไตล์ .pc-* กลาง) — ไม่โหลด portal.css ทั้งไฟล์',
   /<link rel="stylesheet" href="portalclip\.css">/.test(page) && !/href="portal\.css"/.test(page));
ok('portalclip.css มาหลัง ui.css (กฎ .pc-* ชนะกฎทั่วไปของหน้าที่ความเจาะจงเท่ากัน)',
   page.indexOf('href="ui.css"') > 0 && page.indexOf('href="ui.css"') < page.indexOf('href="portalclip.css"'));
ok('⭐ หน้านี้โหลด portalclip.js', /<script src="portalclip\.js" defer><\/script>/.test(page));
ok('⭐ portalclip.js โหลดหลัง analytics.js (ใช้ njTrack)',
   page.indexOf('src="analytics.js"') > 0 && page.indexOf('src="analytics.js"') < page.indexOf('src="portalclip.js"'));
ok('portalclip.js อ่าน data-t แบบทศนิยม (parseFloat) และวนทุก .pt-clip', /parseFloat\(b\.getAttribute\('data-t'\)\)/.test(js) && /querySelectorAll\('\.pt-clip'\)/.test(js));
ok('หัวไฟล์ portalclip.js บอกว่าใช้กับหน้าฝากขายด้วย', /consign\.html/.test(read('portalclip.js')));
ok('⭐ portalclip.css ซ่อนปุ่มเล่นจนกว่า .js-ready และ video ต้อง height:auto',
   /\.pc-play\{display:none\}/.test(pcss) && /\.pt-clip\.js-ready \.pc-play\{[^}]*display:flex/.test(pcss) && /\.pc-frame video\{[^}]*height:auto/.test(pcss));
ok('แถบบนหน้านี้มีระยะของตัวเอง (.cs-clip ใน ui.css) · การ์ดไม่ดึงขึ้นทับ hero', /\.cs-clip\{padding:/.test(ui) && !/margin-top:-\d/.test(pcss.replace(/\/\*[\s\S]*?\*\//g, '')));

console.log('\n' + (fail ? '❌' : '✅') + ' consignclip: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
