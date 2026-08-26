// สร้างไฟล์ข้อมูล จังหวัด/อำเภอ/ตำบล แบบกระชับ สำหรับ dropdown บนหน้าเว็บ
// ที่มา: github.com/kongvut/thai-province-data (api/latest) — อ้างอิงข้อมูลกรมการปกครอง
// รูปแบบ: {"v":<วันที่สร้าง>,"p":[[ชื่อจังหวัด,[[ชื่ออำเภอ,[[ชื่อตำบล,รหัสไปรษณีย์],...]],...]],...]}
// เลือกเป็น array ซ้อน ไม่ใช่ object เพราะประหยัดพื้นที่กว่าครึ่ง (ไม่ต้องเก็บชื่อคีย์ซ้ำ 7 พันครั้ง)
const fs = require('fs');
const live = a => a.filter(x => !x.deleted_at);
const provinces = live(require('./th_province.json'));
const districts = live(require('./th_district.json'));
const subs = live(require('./th_sub_district.json'));

const th = (a, b) => String(a).localeCompare(String(b), 'th');
const byDistrict = new Map();
subs.forEach(s => {
  if (!byDistrict.has(s.district_id)) byDistrict.set(s.district_id, []);
  byDistrict.get(s.district_id).push([s.name_th, Number(s.zip_code) || 0]);
});
const byProvince = new Map();
districts.forEach(d => {
  if (!byProvince.has(d.province_id)) byProvince.set(d.province_id, []);
  const t = (byDistrict.get(d.id) || []).sort((a, b) => th(a[0], b[0]));
  byProvince.get(d.province_id).push([d.name_th, t]);
});
const p = provinces
  .map(pv => [pv.name_th, (byProvince.get(pv.id) || []).sort((a, b) => th(a[0], b[0]))])
  .sort((a, b) => th(a[0], b[0]));

const out = { v: '2026-08-27', src: 'kongvut/thai-province-data', p };
fs.writeFileSync('thai-admin.json', JSON.stringify(out));
console.log('จังหวัด', p.length,
  '| อำเภอ', p.reduce((n, x) => n + x[1].length, 0),
  '| ตำบล', p.reduce((n, x) => n + x[1].reduce((m, d) => m + d[1].length, 0), 0),
  '| ขนาด', (fs.statSync('thai-admin.json').size / 1024).toFixed(0) + ' KB');
