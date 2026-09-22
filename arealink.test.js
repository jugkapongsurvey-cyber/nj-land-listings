// ทดสอบส่วน "วัดพื้นที่แปลง" แบบลิงก์ออก (arealink.js) + การต่อสายบน tools.html
// รันด้วย:  node arealink.test.js
const fs = require('fs');
const path = require('path');
const W = __dirname;
const read = f => fs.readFileSync(path.join(W, f), 'utf8');

// โหลดในกล่องเดียวกันแบบหน้าเว็บจริง — arealink อ่านคณิตหน่วยที่ดินจาก NJLandForm (landform.js ต้องมาก่อน)
global.window = {};
global.globalThis.NJLandForm = undefined;
new Function('window', 'globalThis', read('landform.js')).call(global.window, global.window, global.window);
new Function(read('arealink.js'))();
const A = global.window.NJAreaLink;
const C = global.window.NJLandForm.calc;
const SRC = read('arealink.js');
const HTML = read('tools.html');
// ตัดคอมเมนต์ออกก่อนตรวจ "ของต้องห้าม" — หัวไฟล์เขียนกติกาไว้เป็นข้อความ (เช่น "ห้ามใส่ <iframe>")
// ถ้าตรวจทั้งไฟล์ กติกาที่เขียนไว้จะกลายเป็นตัวที่ทำให้เทสต์แดงเอง
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ 	]*\/\/.*$/gm, '');
const CODE = code(SRC);

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

console.log('\n1) ลิงก์ไปวัดข้างนอก');
ok('มีลิงก์ครบ 3 บริการ', A.MEASURE_LINKS.length === 3, A.MEASURE_LINKS.map(l => l.name));
ok('ทุกลิงก์เป็น https', A.MEASURE_LINKS.every(l => /^https:\/\//.test(l.url)), A.MEASURE_LINKS.map(l => l.url));
ok('ทุกลิงก์บอกว่าใช้ทำอะไร และวิธีวัด', A.MEASURE_LINKS.every(l => l.what && l.how));
ok('มี LandsMaps ของกรมที่ดิน และติดป้ายว่าเป็นระบบของรัฐ',
   A.MEASURE_LINKS.some(l => /landsmaps\.dol\.go\.th/.test(l.url) && l.official === true));
ok('ระบบของรัฐมาเป็นอันดับแรก (เอกสารสิทธิ์น่าเชื่อถือกว่าการวัดจากภาพ)', A.MEASURE_LINKS[0].official === true);
const h = A.html();
ok('ลิงก์ทั้งหมดขึ้นในหน้า พร้อม noopener noreferrer',
   A.MEASURE_LINKS.every(l => h.indexOf('href="' + l.url + '" target="_blank" rel="noopener noreferrer"') >= 0));

console.log('\n2) ⚠️ ห้ามฝังแผนที่ของผู้ให้บริการไว้ในหน้า (ข้อตัดสิน 22 ก.ย. 69 — ทั้งเรื่องค่าใช้จ่ายและสิทธิ์ในข้อมูล)');
[['arealink.js', CODE], ['tools.html', code(HTML)], ['tools.js', code(read('tools.js'))]].forEach(([name, src]) => {
  ok(name + ': ไม่มี <iframe>', !/<iframe/i.test(src));
  ok(name + ': ไม่โหลดสคริปต์ของบริการแผนที่', !/api\.longdo\.com|maps\.googleapis\.com|api\.mapbox\.com|unpkg\.com\/leaflet/i.test(src));
});
ok('ไม่มีคีย์ API ค้างอยู่ในไฟล์', !/LONGDO_KEY|['"]AIza[0-9A-Za-z_-]{10}/.test(CODE));
ok('บอกผู้ใช้ในหน้าเลยว่าทำไมไม่ฝังแผนที่', /ไม่ฝังแผนที่/.test(A.WHY) && h.indexOf(A.WHY.slice(0, 40)) >= 0);
ok('เหตุผลพูดถึงทั้งสิทธิ์ในข้อมูลและค่าบริการ', /สิทธิ์ตามสัญญา/.test(A.WHY) && /ค่าบริการตามปริมาณการใช้/.test(A.WHY));

console.log('\n3) คณิตหน่วยที่ดิน — อ่านจาก NJLandForm ที่เดียว');
ok('ไม่มีค่าคงที่หน่วยที่ดินของตัวเองในไฟล์', !/WA_PER_RAI|WA_PER_NGAN|SQM_PER_WA\s*=/.test(CODE));
ok('ผลตรงกับ NJLandForm ทุกค่าที่ลอง',
   [1, 4, 400, 1600, 6400, 12345.6].every(m2 => {
     const a = A.fromSqm(m2);
     return a && a.text === C.areaText(m2 / C.SQM_PER_WA);
   }));
const four = A.fromSqm(6400);
ok('6,400 ตร.ม. = 4-0-0 ไร่ (1,600 ตร.ว.)', four.text === '4-0-0 ไร่' && four.wa === 1600 && four.rai === 4, four);
const one = A.fromSqm(2000);
ok('2,000 ตร.ม. = 1-1-0 ไร่', one.text === '1-1-0 ไร่' && one.rai === 1 && one.ngan === 1 && one.waRest === 0, one);
const back = A.toSqm(4, 0, 0);
ok('4 ไร่ = 6,400 ตร.ม.', back.sqm === 6400 && back.wa === 1600, back);
ok('แปลงไป-กลับได้ค่าเดิม', [800, 2000, 6400, 51234].every(m2 => {
  const a = A.fromSqm(m2);
  return Math.abs(A.toSqm(a.rai, a.ngan, a.waRest).sqm - m2) < 0.5;
}));
ok('กรอก 0 / ว่าง / ติดลบ / ตัวอักษร = คืน null ไม่ใช่ศูนย์',
   A.fromSqm('') === null && A.fromSqm(0) === null && A.fromSqm('-5') === null && A.fromSqm('abc') === null &&
   A.toSqm('', '', '') === null && A.toSqm(0, 0, 0) === null);
ok('รับตัวเลขที่มีเครื่องหมายคั่นหลักพัน', A.fromSqm('6,400').wa === 1600);

console.log('\n4) คำเตือน — วัดจากภาพไม่ใช่การรังวัด');
ok('คำเตือนขึ้นในหน้าเสมอ', h.indexOf(A.DISCLAIM.slice(0, 40)) >= 0);
ok('คำเตือนบอกว่าไม่ใช่ผลรังวัด และห้ามใช้ทำสัญญา',
   /ไม่ใช่ผลรังวัด/.test(A.DISCLAIM) && /ทำสัญญา/.test(A.DISCLAIM));
ok('คำเตือนเรียกผลว่า "เนื้อที่ที่วัดจากภาพ" ไม่ใช่ "เนื้อที่" เฉยๆ', /เนื้อที่ที่วัดจากภาพ/.test(A.DISCLAIM));
const text = h + ' ' + A.MEASURE_LINKS.map(l => l.what + ' ' + l.how).join(' ');
['รับประกัน', 'การันตี', 'แม่นยำ 100', 'เท่ากับการรังวัด', 'ใช้แทนการรังวัด'].forEach(bad => {
  ok('ไม่มีคำว่า "' + bad + '"', text.indexOf(bad) < 0);
});

console.log('\n5) ไม่ส่งตัวเลขของผู้ใช้ไปไหน');
ok('ไม่มี fetch / XMLHttpRequest', !/fetch\s*\(|XMLHttpRequest/.test(CODE));
ok('ไม่เก็บ localStorage / sessionStorage', !/localStorage|sessionStorage/.test(CODE));
ok('ไม่ยิงสถิติ', !/njTrack|gtag|fbq/.test(CODE));

console.log('\n6) ช่องแปลงหน่วยสองทาง (DOM ปลอม)');
function fakeInput() {
  return { value: '', handlers: [], addEventListener(ev, fn) { if (ev === 'input') this.handlers.push(fn); },
           type() { this.handlers.forEach(fn => fn()); } };
}
const fields = { sqm: fakeInput(), rai: fakeInput(), ngan: fakeInput(), wa: fakeInput(), out: { textContent: '' } };
const root = { querySelector(sel) { const m = /\[data-al="([a-z]+)"\]/.exec(sel); return m ? fields[m[1]] : null; } };
const api = A.bind(root);
ok('ผูกช่องสำเร็จ', !!api);
fields.sqm.value = '6400'; fields.sqm.type();
ok('พิมพ์ 6400 ตร.ม. แล้วฝั่งไร่-งาน-วาเติมให้', fields.rai.value === 4 && fields.ngan.value === 0 && fields.wa.value === 0,
   [fields.rai.value, fields.ngan.value, fields.wa.value]);
ok('บรรทัดสรุปบอกทั้งสามหน่วย', /4-0-0 ไร่/.test(fields.out.textContent) && /1,600 ตารางวา/.test(fields.out.textContent) &&
   /6,400 ตารางเมตร/.test(fields.out.textContent), fields.out.textContent);
fields.rai.value = '2'; fields.ngan.value = ''; fields.wa.value = ''; fields.rai.type();
ok('พิมพ์ 2 ไร่ แล้วฝั่งตารางเมตรเติมให้', fields.sqm.value === 3200, fields.sqm.value);
fields.sqm.value = ''; fields.sqm.type();
ok('ลบค่าทิ้ง = ล้างอีกฝั่งและบรรทัดสรุป ไม่ใช่ค้างเลขเก่า',
   fields.rai.value === '' && fields.ngan.value === '' && fields.wa.value === '' && fields.out.textContent === '');

console.log('\n7) ต่อสายบน tools.html');
ok('มีหัวข้อ #area และกล่อง #tl-area', /id="area"/.test(HTML) && /id="tl-area"/.test(HTML));
ok('มีลิงก์กระโดดไปหัวข้อนี้', /href="#area"/.test(HTML));
ok('โหลด arealink.css', /href="arealink\.css"/.test(HTML));
const iLandform = HTML.indexOf('src="landform.js"');
const iArea = HTML.indexOf('src="arealink.js"');
const iTools = HTML.indexOf('src="tools.js"');
ok('⚠️ landform.js มาก่อน arealink.js และ arealink.js มาก่อน tools.js',
   iLandform > 0 && iLandform < iArea && iArea < iTools, [iLandform, iArea, iTools]);
ok('tools.js เรียก mount ของส่วนนี้', /NJAreaLink\.mount\(document\.getElementById\('tl-area'\)\)/.test(read('tools.js')));

console.log('\n8) ปุ่มส่งงานให้ทีมช่างรังวัด');
ok('ปุ่มพาไปฟอร์มพร้อมหัวข้อที่กรอกไว้ให้', /href="verify\.html\?topic=area#form"/.test(h));
const verify = read('verify.js');
ok('verify.js รู้จักหัวข้อ area', /^\s*area: '/m.test(verify), verify.slice(verify.indexOf('PREFILL_TOPICS'), verify.indexOf('PREFILL_TOPICS') + 300));
ok('ข้อความที่กรอกให้พูดเรื่องรังวัดสอบเขต ไม่ใช่เรื่องผังเมือง',
   /รังวัดสอบเขต/.test(verify.slice(verify.indexOf('  area:'), verify.indexOf('  area:') + 200)));

console.log('\n9) ไม่มี NJLandForm = ไม่วาดช่องแปลงหน่วย (แต่ลิงก์ยังขึ้น)');
{
  const solo = {};
  new Function('window', 'with(window){' + SRC.replace(/typeof window !== 'undefined' \? window : this/, 'window') + '}')(solo);
  const S = solo.NJAreaLink;
  const sh = S.html();
  ok('ไม่มีช่องแปลงหน่วยให้กรอกแล้วเงียบ', sh.indexOf('data-al="sqm"') < 0);
  ok('ลิงก์และคำเตือนยังขึ้นครบ', S.MEASURE_LINKS.every(l => sh.indexOf(l.url) >= 0) && sh.indexOf(S.DISCLAIM.slice(0, 40)) >= 0);
  ok('แปลงหน่วยคืน null แทนที่จะพัง', S.fromSqm(6400) === null && S.toSqm(1, 0, 0) === null);
  ok('bind() คืน null ไม่โยน error', S.bind(root) === null);
}

console.log('\nผ่าน ' + pass + ' ข้อ · ไม่ผ่าน ' + fail + ' ข้อ');
process.exit(fail ? 1 : 0);
