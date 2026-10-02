/* คลิปแนะนำระบบบนหน้า portal.html (#ดูคลิป)
 *   รันด้วย:  node portalclip.test.js
 *
 * ทำไมต้องมี: คลิปนี้มีเสียงพูดและไฟล์ 11 MB — พังได้เงียบๆ 3 แบบ
 *   (1) เล่นเองตอนเปิดหน้า กินเน็ตมือถือและเสียงดังขึ้นมาเอง
 *   (2) JS โหลดไม่ขึ้นแล้วเหลือแต่ภาพนิ่งที่กดไม่ได้ (ต้องมี controls ตั้งแต่ HTML)
 *   (3) แอตทริบิวต์ height="1920" ชนะ aspect-ratio จอคลิปยืดยาวทั้งหน้า
 * และสารบัญบทผูกกับเวลาของไฟล์คลิป — เวลาเกินความยาวคลิป = กดแล้วไม่เกิดอะไร
 */
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + String(extra).slice(0, 170) : '')); }
}

const page = read('portal.html');
const css = read('portal.css');
const js = read('portalclip.js');
const code = js.replace(/\/\/.*$/gm, '');
const sec = (page.match(/<section class="pt-clip"[\s\S]*?<\/section>/) || [''])[0];
const hero = (page.match(/<section class="pt-head[\s\S]*?<\/section>/) || [''])[0];
const DURATION = 78; // วินาที — video/nj-intro.mp4 ยาว 1:18

console.log('\n1) โครงแถบคลิป');
ok('⭐ มีแถบ #ดูคลิป', sec.length > 500 && /id="ดูคลิป"/.test(sec));
ok('⭐ แถบอยู่ต่อจาก hero ก่อนเนื้อหา .pt-body',
   page.indexOf('<section class="pt-head') < page.indexOf('<section class="pt-clip"') &&
   page.indexOf('<section class="pt-clip"') < page.indexOf('<div class="shell pt-body">'));
ok('ใช้ไฟล์คลิปที่มีอยู่จริง (ไม่อัปโหลดซ้ำ)',
   /src="video\/nj-intro\.mp4"/.test(sec) && fs.existsSync(path.join(__dirname, 'video/nj-intro.mp4')) &&
   /poster="video\/nj-intro-poster\.jpg"/.test(sec) && fs.existsSync(path.join(__dirname, 'video/nj-intro-poster.jpg')));
ok('⭐ ไม่เล่นเอง: preload="none" และไม่มี autoplay', /preload="none"/.test(sec) && !/autoplay/.test(sec));
ok('⭐ มี controls ตั้งแต่ HTML (JS ตายก็ยังกดเล่นได้) และมี playsinline', /<video[^>]*\scontrols[\s>]/.test(sec) && /playsinline/.test(sec));
ok('⭐ ใส่ width/height กัน layout shift', /width="1080"\s+height="1920"/.test(sec));
ok('วิดีโอและปุ่มเล่นมีชื่อให้เครื่องอ่านหน้าจอ',
   /<video[^>]*aria-label="[^"]+"/.test(sec) && /<button[^>]*class="pc-play"[^>]*aria-label="[^"]+"/.test(sec));
ok('⭐ ไม่ชน id ของ services.html (#ตรวจก่อนโอน / #แนะนำระบบ)', !/id="(ตรวจก่อนโอน|แนะนำระบบ)"/.test(page));
ok('ไม่มี on*= ใน HTML ของแถบ (CSP)', !/\son[a-z]+=/.test(sec));
ok('ลิงก์ออกนอกเว็บมี rel="noopener"', (sec.match(/target="_blank"/g) || []).length === (sec.match(/rel="noopener"/g) || []).length);

console.log('\n2) สารบัญบท');
const times = [...sec.matchAll(/<button type="button" data-t="(\d+)"><span class="pc-t">(\d+):(\d\d)<\/span>/g)]
  .map(m => ({ t: +m[1], label: +m[2] * 60 + +m[3] }));
ok('มีอย่างน้อย 4 บท', times.length >= 4, times.length);
ok('⭐ บทแรกเริ่มที่ 0 วินาที', times.length > 0 && times[0].t === 0);
ok('⭐ เวลาเรียงจากน้อยไปมากและไม่ซ้ำ', times.every((x, i) => i === 0 || x.t > times[i - 1].t));
ok('⭐ ทุกบทเริ่มก่อนจบคลิป (ไม่เกิน ' + DURATION + ' วินาที)', times.every(x => x.t < DURATION - 3));
ok('⭐ ป้ายเวลาที่เห็นตรงกับ data-t ทุกบท', times.every(x => x.t === x.label), JSON.stringify(times));
ok('บทที่เป็นระบบของหน้านี้ติดป้ายบอก', /pc-tag">ระบบของหน้านี้</.test(sec));

console.log('\n3) ข้อความเต็มของคลิป');
ok('⭐ มีข้อความเต็มใน HTML (คนดูปิดเสียง + ให้เครื่องมือค้นหาอ่านได้) และไม่ถูกซ่อนด้วย hidden ตั้งแต่ HTML',
   /id="pc-script-body"(?![^>]*hidden)[^>]*>[\s\S]*<p>[\s\S]{40,}/.test(sec));
ok('⭐ แถบคลิปห้ามมี <details> — build/schema.js จะนับเป็นคำถาม FAQPage ปลอม', !/<details\b/i.test(sec));
ok('ปุ่มกางข้อความมี aria-expanded + aria-controls ชี้ถูกตัว',
   /<button[^>]*class="pc-script-btn"[^>]*aria-expanded="true"[^>]*aria-controls="pc-script-body"/.test(sec));
ok('ข้อความเต็มมีประโยคเปิดและประโยคปิดของคลิป',
   /บริษัทรังวัดมีเป็นร้อย/.test(sec) && /ทักมาปรึกษาฟรี/.test(sec));

console.log('\n4) ลิงก์ที่ hero และการโหลดสคริปต์');
ok('hero ใส่คลาส has-clip (ขยายท้ายให้การ์ดซ้อนขึ้นมา)', /class="pt-head has-clip"/.test(page));
ok('hero มีลิงก์ไปคลิป และไม่ใช่ปุ่มกรอบ .pt-btn', /<a class="pt-watch" href="#ดูคลิป" data-pc-play>/.test(hero));
ok('หน้านี้โหลด portalclip.js', /<script src="portalclip\.js" defer><\/script>/.test(page));
ok('⭐ portalclip.js โหลดหลัง analytics.js (ใช้ njTrack)',
   page.indexOf('src="analytics.js"') > 0 && page.indexOf('src="analytics.js"') < page.indexOf('src="portalclip.js"'));

console.log('\n5) portalclip.js');
ok('⭐ ถอด controls แล้วเล่นในจังหวะคลิก ไม่ preventDefault ไม่ autoplay',
   /removeAttribute\('controls'\)/.test(code) && /vid\.play\(\)/.test(code) &&
   !/preventDefault/.test(code) && !/autoplay/.test(code));
ok('⭐ เล่นไม่สำเร็จแล้วคืนปุ่มเล่น', /catch\(function\(\)\{[^}]*btn\.style\.display = ''/.test(code));
ok('⭐ คลิปยังไม่โหลด (preload none) ต้องรอ loadedmetadata ก่อนกระโดดเวลา', /loadedmetadata/.test(code) && /currentTime = t/.test(code));
ok('⭐ JS เป็นคนพับข้อความเต็ม (ไม่มี JS = แสดงเต็ม)', /sbody\.hidden = true/.test(code) && /aria-expanded/.test(code));
ok('⭐ ชื่อเหตุการณ์นับอ่านจาก data-track ของแต่ละแถบ (ไม่ฝังชื่อเดียวทั้งไฟล์)', /content_name: sec\.getAttribute\('data-track'\)/.test(code));
ok('แถบแรกนับเป็น portal_intro_clip', /<section class="pt-clip"[^>]*data-track="portal_intro_clip"/.test(page));
ok('⭐ JS วนทุก .pt-clip ไม่ผูก id เดี่ยว (getElementById หมาย #ดูคลิป เดิมใช้ไม่ได้แล้ว)',
   /querySelectorAll\('\.pt-clip'\)/.test(code) && !/getElementById\('ดูคลิป'\)/.test(code));
ok('⭐ กดเล่นแถบหนึ่งต้องหยุดอีกแถบ (เสียงพูดสองคลิปห้ามทับกัน)', /\.vid\.pause\(\)/.test(code));
ok('ลิงก์ [data-pc-play] อ่านแถบปลายทางจาก href', /\[data-pc-play\]/.test(code) && /decodeURIComponent/.test(code));
ok('ครอบ njTrack ด้วย try/catch (ไม่มีก็ไม่พัง)', /typeof njTrack === 'function'/.test(code) && /try \{ njTrack/.test(code));

console.log('\n6) portal.css');
ok('⭐ ปุ่มเล่นของเราซ่อนไว้จนกว่า JS ใส่ .js-ready',
   /\.pc-play\{display:none\}/.test(css) && /\.pt-clip\.js-ready \.pc-play\{[^}]*display:flex/.test(css));
ok('⭐ video ต้องมี height:auto (กัน height="1920" ชนะ aspect-ratio)', /\.pc-frame video\{[^}]*height:auto/.test(css));
ok('⭐ ปิดแอนิเมชันวงกลมเต้นเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว (วนไม่รู้จบ — .01ms จะกะพริบรัว)',
   /prefers-reduced-motion[\s\S]*\.pc-ring[\s\S]*animation:none/.test(css));
ok('มือถือสลับลำดับ: หัวข้อ → คลิป → สารบัญ', /\.pc-copy\{display:contents\}/.test(css) && /\.pc-player\{order:3/.test(css));

console.log('\n7) คลิปสอนใช้งาน (#วิธีใช้)');
const sec2 = (page.match(/<section class="pt-sec pt-clip pt-howto"[\s\S]*?<\/section>/) || [''])[0];
const DURATION2 = 89; // วินาที — video/portal-tutorial.mp4 ยาว 1:29
ok('⭐ มีแถบ #วิธีใช้ อยู่ในเนื้อหาหน้า (หลังหัวข้อ "เข้าไปแล้วเห็นอะไรบ้าง" ก่อน #getcode)',
   sec2.length > 500 && /id="วิธีใช้"/.test(sec2) &&
   page.indexOf('เข้าไปแล้วเห็นอะไรบ้าง') < page.indexOf('id="วิธีใช้"') &&
   page.indexOf('id="วิธีใช้"') < page.indexOf('id="getcode"'));
ok('ใช้ไฟล์คลิป + โปสเตอร์ที่มีอยู่จริง',
   /src="video\/portal-tutorial\.mp4"/.test(sec2) && fs.existsSync(path.join(__dirname, 'video/portal-tutorial.mp4')) &&
   /poster="video\/portal-tutorial-poster\.jpg"/.test(sec2) && fs.existsSync(path.join(__dirname, 'video/portal-tutorial-poster.jpg')));
ok('⭐ ไม่เล่นเอง (preload="none" · ไม่มี autoplay) · controls ใน HTML · playsinline · มี width/height',
   /preload="none"/.test(sec2) && !/autoplay/.test(sec2) && /<video[^>]*\scontrols[\s>]/.test(sec2) &&
   /playsinline/.test(sec2) && /width="1080"\s+height="1920"/.test(sec2));
ok('ไฟล์คลิปไม่ใหญ่เกิน 8 MB (ลูกค้าดูบนมือถือ)', fs.statSync(path.join(__dirname, 'video/portal-tutorial.mp4')).size < 8 * 1024 * 1024);
ok('วิดีโอและปุ่มเล่นมีชื่อให้เครื่องอ่านหน้าจอ',
   /<video[^>]*aria-label="[^"]+"/.test(sec2) && /<button[^>]*class="pc-play"[^>]*aria-label="[^"]+"/.test(sec2));
ok('⭐ ติดตามด้วยชื่อ portal_tutorial_clip (คนละชื่อกับคลิปแรก)', /data-track="portal_tutorial_clip"/.test(sec2));
ok('⭐ ไม่ใช้ <details> (build/schema.js นับเป็นคำถาม FAQPage ปลอม)', !/<details\b/i.test(sec2));
const t2 = [...sec2.matchAll(/<button type="button" data-t="(\d+)"><span class="pc-t">(\d+):(\d\d)<\/span>/g)]
  .map(m => ({ t: +m[1], label: +m[2] * 60 + +m[3] }));
ok('มีอย่างน้อย 4 บท · บทแรก 0 วินาที · เรียงจากน้อยไปมาก', t2.length >= 4 && t2[0].t === 0 && t2.every((x, i) => i === 0 || x.t > t2[i - 1].t), JSON.stringify(t2));
ok('⭐ ทุกบทเริ่มก่อนจบคลิป (ไม่เกิน ' + DURATION2 + ' วินาที)', t2.every(x => x.t < DURATION2 - 3));
ok('⭐ ป้ายเวลาที่เห็นตรงกับ data-t ทุกบท', t2.every(x => x.t === x.label), JSON.stringify(t2));
ok('⭐ ข้อความเต็มมีครบ 7 ท่อน (ตรงกับเสียง 7 ท่อน) · ประโยคเปิดและปิดของคลิป',
   (sec2.match(/<div class="pc-script-body"[\s\S]*?<\/div>/) || [''])[0].split('<p>').length - 1 === 7 &&
   /สวัสดีครับ วันนี้จะพาดู/.test(sec2) && /ทักไลน์หรือโทรหาทีมงาน/.test(sec2));
ok('⭐ บอกตรงๆ ว่าเป็นข้อมูลตัวอย่างสมมติ และเสียงสร้างด้วย AI', /ข้อมูลตัวอย่างสมมติ/.test(sec2) && /สร้างด้วย AI/.test(sec2));
ok('ข้อความเต็มพับด้วยปุ่ม aria-controls ชี้ id ที่ไม่ซ้ำกับคลิปแรก',
   /aria-controls="pc-script-body-2"/.test(sec2) && /id="pc-script-body-2"/.test(sec2) && !/id="pc-script-body"/.test(sec2));
const ids = [...page.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
ok('⭐ ไม่มี id ซ้ำทั้งหน้า (สองแถบใช้คลาสร่วมกัน แต่ id ต้องแยก)', new Set(ids).size === ids.length,
   ids.filter((x, i) => ids.indexOf(x) !== i).join(','));
ok('ไม่มี on*= ในแถบ · ลิงก์ออกนอกเว็บมี rel="noopener"', !/\son[a-z]+=/.test(sec2) &&
   (sec2.match(/target="_blank"/g) || []).length === (sec2.match(/rel="noopener"/g) || []).length);
ok('⭐ ไม่ดึงการ์ดขึ้นไปทับขอบบน (margin-top:0 หลัง @media ของ .pc-card)',
   /\.pt-howto \.pc-card\{margin-top:0\}/.test(css) &&
   css.indexOf('.pt-howto .pc-card{margin-top:0}') > css.indexOf('@media (max-width:760px)'));

console.log('\n' + (fail ? '❌' : '✅') + ' portalclip: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
