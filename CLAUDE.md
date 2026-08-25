# Claude Code Guide — ที่ดินชัวร์

## เป้าหมายผลิตภัณฑ์

เว็บตลาดซื้อขายที่ดินของบริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด จุดต่างหลักคือข้อมูลแนวเขตจากงานรังวัดจริง ไม่ใช่เว็บรวมประกาศทั่วไป

## โครงสร้างสำคัญ

- `index.html` หน้า marketplace หลัก
- `marketplace.css` design system และ responsive layout ของหน้าแรก
- `marketplace.js` โหลดประกาศ ค้นหา กรอง และบันทึกรายการบนหน้าจอ
- `consign.html`, `consign.js`, `ui.css` หน้าฝากขายเดิม ห้ามแก้โดยไม่ทดสอบฟอร์ม
- `analytics.js` API base, analytics และ consent banner ใช้ร่วมกันทุกหน้า
- `brand/` โลโก้ favicon และ social preview

## กติกาการพัฒนา

1. รักษาภาษาไทยเป็นภาษาหลักและออกแบบ mobile-first
2. จุดขาย “รังวัดยืนยันแล้ว” ต้องเห็นบนการ์ดทุกแปลง
3. ห้ามเผยเลขโฉนด ชื่อเจ้าของ พิกัดละเอียด หรือข้อมูลส่วนบุคคลโดยไม่ได้รับความยินยอม
4. ประกาศจริงมาจาก `GET /api/public/listings`; ถ้า API ไม่มีข้อมูล หน้าแรกใช้ข้อมูลตัวอย่างเพื่อแสดง UI เท่านั้น
5. ค่าติดต่อหลักคือ `02-162-0405` และ LINE `@716lffzt`
6. คง semantic HTML, keyboard navigation, contrast และ `prefers-reduced-motion`
7. หลีกเลี่ยง framework จนกว่าจะมีเหตุผลด้าน routing, authentication หรือ state ที่ชัดเจน

## Design tokens

- Navy `#0B2549`: ความน่าเชื่อถือและข้อความหลัก
- Green `#1CA45C`: verified/action
- Mist `#F4F7F8`: พื้นหลังตลาด
- Thai font: IBM Plex Sans Thai
- Latin numbers: Manrope
- Card radius: 12px; panel radius: 16px

## การทดสอบขั้นต่ำ

- เปิดผ่าน local HTTP server (ไม่เปิดด้วย `file://`)
- ทดสอบที่ความกว้าง 390px, 768px และ 1440px
- ทดสอบค้นหา กรองราคา ปุ่มบันทึก โทร LINE และลิงก์ฝากขาย
- ตรวจ console และ network error; API ล่มต้องยังแสดง UI ตัวอย่างได้
