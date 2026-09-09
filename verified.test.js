/* ตรวจตัวเรนเดอร์ของระลอก Teedin Sure Verified — บันได 5 ระดับ · รายงานสุขภาพแปลง · แผนที่แนวเขต
 *   รันด้วย:  node verified.test.js
 *
 * ⚠️ ไม่พึ่งไลบรารีภายนอก — repo นี้เป็นเว็บสแตติกล้วน ไม่มี package.json และไม่ควรมี node_modules
 * โมดูลทั้งสามคืนค่าเป็นสตริง HTML จึงทดสอบได้ด้วย stub เล็กๆ ไม่ต้องมี DOM จริง
 *
 * สิ่งที่ต้องล็อกไว้ให้แน่น (แก้โค้ดแล้วข้อไหนแดง แปลว่ากำลังทำสิ่งที่ตกลงกันว่าห้ามทำ):
 *   · ไม่มีข้อมูล = ไม่ขึ้นแผงเลย ห้ามขึ้นแผงว่างที่อ่านแล้วเหมือนแปลงมีปัญหา
 *   · ทุกสถานะต้องมีข้อความกำกับ ห้ามใช้สีอย่างเดียว
 *   · "ยังไม่ได้ตรวจ" ต้องไม่ถูกวาดเหมือน "ตรวจแล้วไม่พบประเด็น"
 *   · ที่ตาบอดและแนวรุกล้ำต้องขึ้นสถานะแดงเสมอ
 *   · ข้อความจากผู้ใช้ต้องถูก escape ไม่สร้าง element
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra != null ? ('  → ' + extra) : '')); }
}
function has(name, hay, needle) { ok(name, String(hay).indexOf(needle) >= 0, 'ไม่พบ "' + needle + '"'); }
function hasNot(name, hay, needle) { ok(name, String(hay).indexOf(needle) < 0, 'ไม่ควรพบ "' + needle + '" แต่พบ'); }

// ---- โหลดสามโมดูลเข้า sandbox เดียว (เรียงตามลำดับที่ land.html โหลดจริง) ----
const sandbox = { window: {}, document: { querySelector: () => null, querySelectorAll: () => [] } };
sandbox.window.document = sandbox.document;
vm.createContext(sandbox);
['landvocab.js', 'verified.js', 'health.js', 'parcelmap.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), sandbox, { filename: f });
});
const V = sandbox.window.NJVerified;
const H = sandbox.window.NJHealth;
const P = sandbox.window.NJParcelMap;

console.log('\n1) ⚠️ ไม่มีข้อมูล = ไม่ขึ้นแผงเลย (แปลงเก่าทุกแปลงต้องหน้าตาเหมือนเดิม)');
{
  ok('ไม่มีบันได → สตริงว่าง', V.ladderHtml(null) === '');
  ok('บันไดว่างเปล่า → สตริงว่าง', V.ladderHtml({}) === '');
  ok('ไม่มีป้ายบนการ์ดเมื่อยังไม่ถึงระดับใด', V.badgeHtml({ reached: 0, total: 5 }) === '');
  ok('ไม่มีป้ายเมื่อไม่มีข้อมูลเลย', V.badgeHtml(null) === '');
  // ⚠️ ข้อนี้สำคัญที่สุด — แปลงเก่ามี deedType/deedArea/checks อยู่แล้ว ถ้าไม่กั้น
  // ตารางสุขภาพจะโผล่ทุกแปลงในวันที่ deploy ทั้งที่ยังไม่มีใครไปตรวจอะไรเพิ่ม
  const legacy = { deedType: 'chanote', deedArea: '2-1-50', health: null,
                   checks: { area: { status: 'ok', value: '2-1-48' } } };
  ok('แปลงเก่าที่ยังไม่มีรายงานสุขภาพ → ไม่ขึ้นตารางเลย', H.tableHtml(legacy) === '');
  ok('ไม่มีข้อมูลแปลงเลย → ไม่ขึ้นตาราง', H.tableHtml(null) === '');
  ok('ไม่มีรูปแปลง → ไม่ขึ้นแผนที่', P.mapHtml(null) === '');
  ok('รูปแปลงมีหมุดไม่ถึง 3 จุด → ไม่ขึ้นแผนที่',
     P.mapHtml({ points: [{ p: 'A', x: 0, y: 0 }, { p: 'B', x: 10, y: 0 }] }) === '');
}

console.log('\n2) บันได 5 ระดับ');
{
  const v = {
    reached: 2, total: 5,
    levels: [
      { key: 'owner', th: 'ยืนยันผู้มีสิทธิ์ประกาศ', status: 'passed', expired: false,
        at: '2026-09-01', by: 'ฝ่ายขาย NJ', until: '2027-09-01', hasRef: true,
        done: ['ตรวจบัตรประชาชน'], todo: ['ยังไม่ได้ตรวจหนังสือมอบอำนาจ'], note: '',
        evidence: [{ label: 'หนังสือยินยอม', url: '/uploads/a.pdf' }] },
      { key: 'document', th: 'ตรวจข้อมูลเอกสารเบื้องต้น', status: 'passed', expired: false,
        at: '2026-09-02', by: '', until: '', hasRef: false, done: [], todo: [], note: '', evidence: [] },
      { key: 'site', th: 'ลงพื้นที่ตรวจตำแหน่งและสภาพแปลง', status: 'issue', expired: false,
        at: '2026-09-03', by: '', until: '', hasRef: false, done: [], todo: [],
        note: 'ทางเข้าแคบกว่าที่แจ้ง', evidence: [] },
      { key: 'survey', th: 'มีรายงานรังวัดหรือข้อมูลแนวเขตล่าสุด', status: 'passed', expired: true,
        at: '2024-01-01', by: '', until: '2025-01-01', hasRef: false, done: [], todo: [], note: '', evidence: [] },
      { key: 'transfer', th: 'ข้อมูลและเอกสารพร้อมเข้าสู่ขั้นตอนซื้อขาย', status: '', expired: false,
        at: '', by: '', until: '', hasRef: false, done: [], todo: [], note: '', evidence: [] }
    ]
  };
  const h = V.ladderHtml(v);
  has('บอกจำนวนระดับที่ผ่านเป็นข้อความ', h, 'ผ่านการตรวจสอบ 2 จาก 5 ระดับ');
  has('แถบความคืบหน้าอ่านออกเสียงได้', h, 'aria-label="ผ่านการตรวจสอบ 2 จาก 5 ระดับ"');
  ok('ระบายขีดตามจำนวนที่ผ่านจริง', (h.match(/<i class="on">/g) || []).length === 2,
     String((h.match(/<i class="on">/g) || []).length));

  // ⚠️ ทุกสถานะต้องมีข้อความ ไม่ใช่มีแต่สี
  has('สถานะผ่านมีข้อความ', h, 'ตรวจแล้ว');
  has('สถานะพบประเด็นมีข้อความ', h, 'พบประเด็นที่ควรทราบ');
  has('สถานะหมดอายุมีข้อความ', h, 'ถึงกำหนดตรวจใหม่แล้ว');
  has('สถานะยังไม่ตรวจมีข้อความ', h, 'ยังไม่ได้ตรวจ');
  ok('มีคลาสครบทั้ง 4 สถานะ',
     ['njv-row ok', 'njv-row issue', 'njv-row stale', 'njv-row none'].every(c => h.indexOf(c) >= 0));

  has('รายการที่ตรวจแล้วขึ้นครบ', h, 'ตรวจบัตรประชาชน');
  has('⚠️ รายการที่ยังไม่ได้ตรวจก็ต้องขึ้น ห้ามซ่อน', h, 'ยังไม่ได้ตรวจหนังสือมอบอำนาจ');
  has('บอกว่ามีเลขอ้างอิงงานโดยไม่บอกเลข', h, 'อ้างอิงเลขงานในระบบ');
  has('หลักฐานที่เปิดเผยได้ขึ้นเป็นลิงก์', h, '/uploads/a.pdf');
  has('บอกวันควรตรวจใหม่', h, 'ควรตรวจใหม่ภายใน');
  has('ระดับที่หมดอายุบอกให้ทักไลน์ขอตรวจซ้ำ', h, 'ถึงกำหนดตรวจใหม่ตั้งแต่');
  has('แถวที่พบประเด็นถูกกางไว้ให้เห็นเลย', h, '<details class="njv-row issue" open>');

  // ⚠️ ข้อความปิดท้ายห้ามถอด — เส้นแบ่งระหว่าง "ตรวจอะไรไปแล้ว" กับ "รับประกันอะไร"
  has('มีข้อความกำกับว่าไม่ใช่การรับรองทางกฎหมาย', h, 'ไม่ใช่การรับรองสถานะทางกฎหมายของที่ดิน');
  has('บอกให้ตรวจซ้ำวันโอน', h, 'ตรวจสอบซ้ำอีกครั้งในวันโอนกรรมสิทธิ์');
  // ⚠️ คำที่ห้ามคือ "คำอ้างว่ารับประกัน" ไม่ใช่คำว่า "รับประกัน" เฉยๆ —
  // ข้อความปิดท้ายพูดว่า "ไม่ใช่คำรับประกันว่า..." ซึ่งเป็นการปฏิเสธ ต้องเก็บไว้
  ok('ไม่มีคำอ้างว่ารับประกันหรือปลอดภัย 100%',
     !/ปลอดภัย 100|รับประกันกรรมสิทธิ์|เรารับประกัน|การันตี/.test(h));
  has('ยังคงข้อความปฏิเสธการรับประกันไว้', h, 'ไม่ใช่คำรับประกัน');

  ok('ป้ายบนการ์ดขึ้นเมื่อผ่านแล้ว', V.badgeHtml({ reached: 2, total: 5 }).indexOf('2/5') >= 0);
}

console.log('\n3) รายงานสุขภาพแปลง — 4 สถานะ ทุกสถานะมีข้อความ');
{
  const L = {
    deedType: 'chanote', deedArea: '1-2-30', roadSurface: 'concrete', roadLanes: 2,
    zoning: '3.13 ชนบทและเกษตรกรรม', features: ['road', 'electric', 'water'],
    checks: { area: { status: 'ok', value: '1-2-28' }, markers: {}, access: {} },
    health: {
      widthM: 40, depthM: 68, shape: 'trapezoid', access: 'none',
      markerFound: 4, markerTotal: 5, structures: 'encroach',
      structureNote: 'รั้วเพื่อนบ้านล้ำเข้ามา 1 เมตร',
      todos: [{ label: 'รังวัดสอบเขตยืนยันแนวรั้ว', note: 'ต้องทำก่อนโอน' }],
      at: '2026-09-05', by: 'ทีมช่างรังวัด NJ', refs: ['รายงานรังวัด J-0042']
    }
  };
  const h = H.tableHtml(L);
  has('มีคำอธิบายสัญลักษณ์ครบ 4 สถานะ', h, 'ยังไม่มีข้อมูล');
  ok('มีคลาสครบทั้ง 4 สถานะในตาราง',
     ['njh-row ok', 'njh-row warn', 'njh-row bad', 'njh-row none'].every(c => h.indexOf(c) >= 0),
     ['njh-row ok', 'njh-row warn', 'njh-row bad', 'njh-row none'].filter(c => h.indexOf(c) < 0).join(','));

  // ⚠️ สองข้อนี้คือข้อมูลที่ผู้ซื้อต้องรู้ที่สุด ต้องขึ้นแดงเสมอ
  ok('ที่ตาบอดขึ้นสถานะแดง', /njh-row bad[\s\S]{0,400}ที่ตาบอด/.test(h));
  has('ที่ตาบอดมีข้อความอธิบายให้ผู้ซื้อ', h, 'ผู้ซื้อควรตรวจสอบเรื่องทางเข้าออกก่อนตัดสินใจ');
  ok('แนวรุกล้ำขึ้นสถานะแดง', /njh-row bad[\s\S]{0,400}พบแนวรุกล้ำ/.test(h));
  has('หมุดไม่ครบขึ้นตัวเลขจริง', h, 'พบ 4 จาก 5 หมุด');
  has('รายการที่ต้องตรวจเพิ่มขึ้นครบ', h, 'รังวัดสอบเขตยืนยันแนวรั้ว');
  has('บอกวันที่ตรวจล่าสุด', h, '5 ก.ย. 2569');
  has('บอกเอกสารอ้างอิง', h, 'รายงานรังวัด J-0042');

  // ⚠️ "ยังไม่มีข้อมูล" ต้องเขียนให้อ่านออกว่าไม่ได้แปลว่าไม่มี
  has('เทา = ยังไม่ได้ตรวจ ไม่ใช่ไม่มี', h, 'ไม่ได้แปลว่าไม่มี');
  hasNot('ไม่มีคำว่าปลอดภัย', h, 'ปลอดภัย');

  // สถานะสีต้องมาคู่กับข้อความสถานะเสมอ — นับให้ตรงกันทุกแถว
  const rows = (h.match(/njh-row /g) || []).length;
  const states = (h.match(/njh-st"/g) || []).length;
  ok('ทุกแถวมีข้อความสถานะกำกับ (ไม่ใช้สีอย่างเดียว)', rows === states, rows + ' แถว · ' + states + ' ข้อความ');
}

console.log('\n4) แผนที่แนวเขตแปลง');
{
  const plot = {
    mode: 'shape', crs: 'WGS84 / UTM โซน 47N', surveyedAt: '2026-09-05', count: 4,
    areaWa: 559, areaSqm: 2236,
    sides: [{ from: 'A', to: 'B', m: 36.76 }, { from: 'B', to: 'C', m: 53.28 },
            { from: 'C', to: 'D', m: 29.88 }, { from: 'D', to: 'A', m: 45.1 }],
    points: [{ p: 'A', x: -18, y: -25, note: 'หมุดสมบูรณ์', photo: '' },
             { p: 'B', x: 18, y: -25, note: '', photo: '/uploads/m.jpg' },
             { p: 'C', x: 18, y: 25, note: '', photo: '' },
             { p: 'D', x: -18, y: 25, note: '', photo: '' }]
  };
  const h = P.mapHtml(plot);
  has('วาดรูปแปลงเป็น polygon', h, '<polygon class="njp-poly"');
  has('บอกพื้นที่โดยประมาณ', h, '559');
  has('บอกระบบพิกัดที่ใช้', h, 'WGS84 / UTM โซน 47N');
  has('บอกวันที่สำรวจ', h, '5 ก.ย. 2569');
  has('ขึ้นความยาวด้านจากค่าที่เซิร์ฟเวอร์คิดมา', h, '36.76 ม.');
  has('มีไม้บรรทัดบอกมาตราส่วน', h, 'njp-scale');
  has('มีเข็มทิศ', h, 'njp-n');
  ok('หมุดเป็นปุ่มจริง กดด้วยคีย์บอร์ดได้', (h.match(/<button type="button" class="njp-pin"/g) || []).length === 4);
  has('หมุดที่ไม่มีหมายเหตุบอกตรงๆ', h, 'ไม่มีหมายเหตุจากช่างรังวัด');
  has('รูปอ่านออกเสียงได้', h, 'role="img"');

  // ⚠️ ข้อความกำกับที่ห้ามถอด
  has('บอกว่าไม่ใช่แนวเขตที่กรมที่ดินรับรอง', h, 'ไม่ใช่แนวเขตที่กรมที่ดินรับรอง');
  has('บอกว่าไม่ใช่เนื้อที่ตามเอกสารสิทธิ์', h, 'ไม่ใช่เนื้อที่ตามเอกสารสิทธิ์');
  has('โหมด shape บอกว่าไม่ได้วางทับตำแหน่งจริง', h, 'ไม่ได้วางทับตำแหน่งจริงบนแผนที่');

  // โหมด geo ต้องบอกว่าพิกัดถูกลดความละเอียด
  const geo = P.mapHtml(Object.assign({}, plot, {
    mode: 'geo', precisionM: 1.1,
    points: [{ p: 'A', lat: 14.2426, lng: 100.5619 }, { p: 'B', lat: 14.2426, lng: 100.5623 },
             { p: 'C', lat: 14.2431, lng: 100.5623 }, { p: 'D', lat: 14.2431, lng: 100.5619 }]
  }));
  has('โหมด geo บอกว่าพิกัดถูกลดความละเอียด', geo, 'ถูกลดความละเอียดลงเหลือประมาณ 1.1 เมตร');
}

console.log('\n5) ⚠️ ข้อความจากผู้ใช้ต้องถูก escape ไม่สร้าง element');
{
  const evil = '<img src=x onerror=alert(1)>';
  const h1 = V.ladderHtml({ reached: 0, total: 5, levels: [
    { key: 'owner', th: 'x', status: 'issue', expired: false, at: '', by: evil, until: '',
      hasRef: false, done: [evil], todo: [], note: evil, evidence: [{ label: evil, url: evil }] }
  ] });
  hasNot('บันได: ไม่มี <img> หลุดออกมา', h1, '<img src=x');
  has('บันได: ถูก escape แล้ว', h1, '&lt;img src=x');

  const h2 = H.tableHtml({ health: { structures: 'building', structureNote: evil, at: '2026-09-05' } });
  hasNot('รายงานสุขภาพ: ไม่มี <img> หลุดออกมา', h2, '<img src=x');

  const h3 = P.mapHtml({ mode: 'shape', crs: evil, count: 3, areaWa: 1, sides: [],
    points: [{ p: evil, x: 0, y: 0, note: evil, photo: '' }, { p: 'B', x: 5, y: 0 }, { p: 'C', x: 0, y: 5 }] });
  hasNot('แผนที่: ไม่มี <img> หลุดออกมา', h3, '<img src=x');
}

console.log('\n' + (fail ? '❌' : '✅') + ' ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
