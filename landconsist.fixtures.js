/* ก้อน land ของ 7 แปลงที่ขึ้นเว็บจริง ณ 10 ต.ค. 2569 (เฉพาะช่องที่เกี่ยวข้อง · จาก /api/public/listings/:id)
 * ใช้ร่วมกันโดย landconsist.test.js (สองแผงบนหน้าแปลงไม่ขัดกัน) และ contracts.test.js
 * (ตัวนับ "ตรวจแล้ว N จาก 7" ของระบบหลังบ้าน = จำนวนหัวข้อที่ NJHealth.topic() ไม่ใช่ none)
 * ⚠️ ข้อมูลนี้เป็นสิ่งที่ API สาธารณะส่งออกอยู่แล้ว ไม่มีข้อมูลส่วนบุคคล · ไม่มีหน้าไหนโหลดไฟล์นี้
 */
'use strict';
const C = (status, value, note) => ({ status: status || '', value: value || '', note: note || '' });
const HEALTH0 = { widthM: null, depthM: null, shape: '', access: '', markerFound: null, markerTotal: null,
  structures: '', structureNote: '', surroundings: '', todos: [], refs: [], at: '', by: '' };
const h = o => Object.assign({}, HEALTH0, o);
const FIX = {
  'OP-102': { deedArea: '0-1-66 ไร่', frontage: 'หน้ากว้าง 46 เมตร  ลึก 13 เมตร', verified: true, verifiedAt: '2026-10-03',
    checks: { area: C('', 'รังวัดก่อนซื้อ-ขาย', 'รังวัดก่อนซื้อ-ขาย'), markers: C('', 'รังวัดก่อนซื้อ-ขาย'),
      access: C('ok', 'รังวัดก่อนซื้อ-ขาย', 'เป็นที่สาธารณะ'), servitude: C('ok', 'ไม่มี'), seizure: C('', 'รังวัดก่อนซื้อ-ขาย'),
      tax: C('', 'รังวัดก่อนซื้อ-ขาย'), mortgage: C('ok', 'ไม่มี', 'ไม่มี') },
    health: h({ access: 'other', markerFound: 1, markerTotal: 10, structures: 'none', at: '2026-10-03', by: 'CEO' }) },
  'OP-101': { deedArea: '0-1-40 ไร่', frontage: '8 เมตร',
    checks: { area: C(), markers: C(), access: C('ok', '8 เมตร', 'ถนนส่วนบุคคล'), servitude: C('ok', 'มี', 'ถนนส่วนบุคคล'),
      seizure: C(), tax: C(), mortgage: C() },
    health: h({ access: 'servitude', at: '2026-10-05', by: 'CEO' }) },
  'OP-091': { deedArea: '0-0-37.6 ไร่', verified: true,
    checks: { area: C('ok'), markers: C('ok'), access: C('ok'), servitude: C('ok'), seizure: C(), tax: C(), mortgage: C() },
    health: h({ access: 'servitude' }) },
  'OP-088': { deedArea: '0-0-79 ไร่',
    checks: { area: C(), markers: C(), access: C(), servitude: C(), seizure: C(), tax: C(), mortgage: C() },
    health: h({ access: 'servitude', at: '2026-10-08', by: 'CEO' }) },
  'OP-025': { deedArea: '0-0-33.9 ไร่', verified: true,
    checks: { area: C('ok', '33.9 ตารางวา'), markers: C('ok', 'ผ่านการตรวจสอบเเล้ว'), access: C('ok', 'ผ่านการตรวจสอบเเล้ว'),
      servitude: C('ok', 'ผ่านการตรวจสอบเเล้ว'), seizure: C('ok', 'ผ่านการตรวจสอบเเล้ว'), tax: C('ok', 'ผ่านการตรวจสอบเเล้ว'), mortgage: C() },
    health: h({ access: 'public_road' }) },
  'OP-024': { deedArea: '0-2-66 ไร่', frontage: '6', verified: true,
    checks: { area: C('', 'รังวัดก่อนซื้อ-ขาย'), markers: C('warn', 'รังวัดก่อนซื้อ-ขาย'), access: C('ok', '6', 'ทางสาธารณ'),
      servitude: C('ok', 'ไม่มี'), seizure: C('', 'รังวัดก่อนซื้อ-ขาย'), tax: C('', 'รังวัดก่อนซื้อ-ขาย'), mortgage: C('', 'รังวัดก่อนซื้อ-ขาย') },
    health: h({ widthM: 6, shape: 'trapezoid', access: 'public_road', structureNote: 'ไม่พบ',
      surroundings: 'มีกำแพงรั้วคอนกรีตล้อมรอบเป็นเเนวเขต', todos: [{ label: 'แนะนำให้รังวัดก่อนซื้อขาย', note: '' }], at: '2026-10-02', by: 'NJ' }) },
  'OP-023': { deedArea: '1-3-68 ไร่', verified: true,
    checks: { area: C('warn', '1-3-68'), markers: C('warn', '', 'ตรวจรังวัดที่ดิน'), access: C('ok', 'เป็นทางสาธารณประโยชน์'),
      servitude: C('ok', 'ไม่มี'), seizure: C('warn'), tax: C('warn'), mortgage: C('warn') },
    health: h({ shape: 'rect', access: 'public_road', markerFound: 0, markerTotal: 0, structures: 'none', structureNote: 'ไม่พบ',
      surroundings: 'เป็นป่ารกทึบ ไม่เห็นหลักเขต', todos: [{ label: 'รังวัดก่อนซื้อ-ขาย', note: '' }], refs: ['ไม่มี'], at: '2026-09-25', by: 'nj' }) }
};

module.exports = { FIX, C, h, HEALTH0 };
