# PHASE10_TEST_RESULTS.md — ผลทดสอบ · รายชื่อไฟล์ · งานค้าง (Phase 10)

**วันที่รัน:** 24 กันยายน 2569 · ตอบสิ่งที่ต้องส่งมอบข้อ 13 (Test Results) · ข้อ 17 (รายชื่อไฟล์) · ข้อ 18 (งานค้างและข้อเสนอ)

---

## 1. สรุปผล

| ส่วน | คำสั่ง | ผล |
|---|---|---|
| ระบบหลังบ้าน ทั้งชุด | `CI=true npm test` (lint + 199 ไฟล์เทสต์) | **ผ่าน · exit 0 · ไม่มีบรรทัด FAIL** |
| ระบบหลังบ้าน เฉพาะ Phase 10 | `npm run test:p10` (8 ไฟล์) | **454 ข้อ ผ่านทั้งหมด** |
| เว็บสาธารณะ | `*.test.js` ทั้ง 29 ไฟล์ | **2,198 ข้อ ผ่านทั้งหมด** (ดูหมายเหตุ `contracts.test.js` ข้อ 4) |
| เว็บ — ตรวจโครงสร้าง | `build/lint.js` · `pages --check` · `lazycss --check` · `sitemap --check` | ผ่านทั้งหมด (31 หน้า) |
| เว็บ — ลิงก์เสีย | `build/linkcheck.js` | **ลิงก์เสีย 0** · หน้ากำพร้า 1 (`land.html` — เข้าจากการ์ดด้วย JS โดยตั้งใจ) |

---

## 2. ครบ 14 ชนิดตามข้อกำหนดงานที่ 15

| ชนิด | อยู่ที่ไหน | สถานะ |
|---|---|---|
| Unit Test | เว็บ: `feecalc` `loancalc` `valuecalc` `landlabel` `zonechip` `njchat` `checklist` ฯลฯ · ระบบ: `seo` `kbweb` `mktdash` | ✅ อัตโนมัติ |
| Integration Test | ระบบ: `seo-api` `seo-areas-api` `kb-web-api` `mktdash-api` `p10-robots-api` (เปิดเซิร์ฟเวอร์จริง) · ข้าม repo: `contracts.test.js` | ✅ อัตโนมัติ |
| Sitemap Test | `seo.test.js` · `propurl.test.js` · `locations.test.js` · `knowledge.test.js` · `build/sitemap.js --check` (CI) | ✅ อัตโนมัติ |
| robots.txt Test | ระบบ `p10-robots-api.test.js` (28 ข้อ) · เว็บ `seo.test.js` · `propurl.test.js` | ✅ อัตโนมัติ |
| Canonical Test | `seo.test.js` · `seocenter.test.js` · `propurl.test.js` · `detail.test.js` · `checklist.test.js` | ✅ อัตโนมัติ |
| Metadata Test | `seocenter.test.js` · `seo.test.js` · ระบบ `seo.test.js` (คะแนนและความยาว) | ✅ อัตโนมัติ |
| Structured Data Test | `schema.test.js` (41) · `seo.test.js` (ห้าม Review/AggregateRating) | ✅ อัตโนมัติ |
| Redirect Test | `propurl.test.js` (129) — ที่อยู่เดิม `p/*.html` → ที่อยู่ใหม่ · `redirects.json` | ✅ อัตโนมัติ |
| Permission Test | ระบบ: `route-authz` · `security-review` · `*-api.test.js` ของ Phase 10 (สวิตช์ปิด = 404 · ไม่มีสิทธิ์ = 403) | ✅ อัตโนมัติ |
| Analytics Event Test | `forms.test.js` (ที่มาของลีด) · `contracts.test.js` (ชื่อเหตุการณ์ตรงกันสองฝั่ง) · ระบบ `mktdash*.test.js` | ✅ อัตโนมัติ |
| Responsive Test | ตรวจในเบราว์เซอร์จริงทุกรอบ (วัด `scrollWidth` เทียบความกว้างจอ) · รายงาน `docs/audit/RESPONSIVE_TEST_REPORT.md` | ⚠️ **ทำด้วยมือ ไม่มีเทสต์อัตโนมัติ** |
| Accessibility Test | `a11y.test.js` (257) — ตรวจจาก HTML ต้นทาง | ✅ อัตโนมัติ (บางส่วน — ความต่างสีและคีย์บอร์ดจริงต้องวัดในเบราว์เซอร์) |
| Broken Link Test | `build/linkcheck.js` (CI ทุก push) | ✅ อัตโนมัติ |
| SEO Regression Test | `seo.test.js` · `seocenter.test.js` · `header.test.js` · ด่าน `--check` ใน CI | ✅ อัตโนมัติ |

⚠️ **Responsive Test ยังเป็นงานมือ** เพราะ repo เว็บตั้งใจไม่มี `package.json` และ `node_modules`
การเพิ่มเบราว์เซอร์อัตโนมัติ (Playwright) ต้องดาวน์โหลดเบราว์เซอร์ก้อนใหญ่ — ต้องได้รับอนุมัติก่อน
· มีไฟล์ `njchat.e2e.js` (Playwright) ที่รันด้วยมือได้อยู่แล้วเป็นตัวอย่าง

---

## 3. ผลรายไฟล์

### ระบบหลังบ้าน — ชุด Phase 10

| ไฟล์ | ผ่าน |
|---|---|
| `p10-robots-api.test.js` | 28 |
| `seo.test.js` | 89 |
| `seo-api.test.js` | 61 |
| `seo-areas-api.test.js` | 26 |
| `kbweb.test.js` | 113 |
| `kb-web-api.test.js` | 57 |
| `mktdash.test.js` (ใหม่ · สปรินต์ 6) | 47 |
| `mktdash-api.test.js` (ใหม่ · สปรินต์ 6) | 33 |

### เว็บสาธารณะ

a11y 257 · agency 69 · arealink 51 · cardthumb 27 · **checklist 43 (ใหม่ · สปรินต์ 5)** · compare 10 · consent 39 ·
consignpreview 100 · contracts 265 · detail 78 · feecalc 50 · forms 86 · header 119 · homepage 154 · journal 89 ·
knowledge 59 · landlabel 31 · loancalc 25 · locations 80 · njchat 51 · njlink 23 · propurl 129 · schema 41 ·
seo 126 · seocenter 48 · valuecalc 28 · verified 58 · zonechip 20 · zoneguide 42

---

## 4. สิ่งที่ต้องรู้ตอนอ่านผล

1. **`contracts.test.js` ขึ้นแดง 1 ข้อ (`nj_link_click`) เมื่อรันเปล่าๆ** — เพราะโฟลเดอร์ `../nj-survey-system`
   บนเครื่องค้างอยู่สาขาเก่า · ชี้ไปสาขาปัจจุบันแล้วผ่านครบ 265 ข้อ (`node contracts.test.js ../nj-wt-p10s5`)
2. **`build/schema.js --check` ขึ้น "20 หน้าไม่ตรง" บนเครื่อง Windows** — เป็นมาตั้งแต่ก่อนรอบนี้ (ตรวจกับ `main` สะอาดแล้ว)
   สาเหตุคือตัวจบบรรทัด CRLF/LF · ไม่ได้อยู่ใน CI
3. **Core Web Vitals วันนี้วัดซ้ำไม่ได้** — โควตาฟรีรายวันของ PageSpeed Insights หมด · ใช้ค่าหลัง deploy 22 ก.ย.

### ตรวจในเบราว์เซอร์จริงรอบนี้
- **แดชบอร์ดการตลาด** (ระบบบนเครื่อง · ฐานข้อมูลชั่วคราว): ตัวเลขตรงกับลีดทดสอบ · เปลี่ยนช่วงวันที่ได้ ·
  CSV มี BOM หัวตารางไทย ไม่มีข้อมูลส่วนบุคคล · 375px ไม่ล้นแนวนอน · ไม่มีคำว่า `undefined`
- **เช็กลิสต์ก่อนซื้อ**: ติ๊กแล้วโหลดหน้าใหม่ค่ายังอยู่ · 375px ไม่ล้นแนวนอน · ปุ่มสูง 44px · เมนูมีลิงก์ใหม่

### ยังทดสอบไม่ได้
- **Safari / iPhone** — เครื่องทดสอบมีแต่เบราว์เซอร์ตระกูล Chromium
- **Staging** — ยังไม่มี environment ก่อน production

---

## 5. รายชื่อไฟล์ที่สร้างและแก้ไข (สปรินต์ 5–6)

สปรินต์ 1–4 ดูได้จากประวัติ git ของทั้งสอง repo (แต่ละสปรินต์ merge เป็น PR ของตัวเอง)

**ระบบหลังบ้าน (`nj-survey-system`)**
| ไฟล์ | |
|---|---|
| `lib/mktdash.js` | ใหม่ — ตรรกะแดชบอร์ดการตลาด |
| `test/mktdash.test.js` · `test/mktdash-api.test.js` | ใหม่ |
| `server.js` | เพิ่ม `GET /api/marketing/dashboard` (+ CSV) |
| `public/app.js` | แท็บแดชบอร์ดการตลาดในเมนู SEO และการตลาด |
| `public/sw.js` | v149 |
| `package.json` · `CLAUDE.md` | ลงทะเบียนเทสต์ · บันทึกกติกา |

**เว็บสาธารณะ (`nj-land-listings`)**
| ไฟล์ | |
|---|---|
| `checklist.html` · `checklist.js` · `checklist.css` · `checklist.test.js` | ใหม่ — เช็กลิสต์ก่อนซื้อ 16 ข้อ |
| `build/pages.js` + หน้า HTML เดิม 30 หน้า | เมนูใหม่ "เช็กลิสต์ก่อนซื้อ" (หน้าละ 1 บรรทัด สร้างด้วยตัวสร้าง) |
| `tools.html` · `guides.html` · `sitemap.xml` | ทางเข้าหน้าเช็กลิสต์ |
| `PHASE10_PERFORMANCE_REPORT.md` · `PHASE10_DEPLOYMENT_GUIDE.md` | ปรับปรุง |
| `PHASE10_MARKETING_USER_GUIDE.md` · `PHASE10_TEST_RESULTS.md` | ใหม่ |
| `CLAUDE.md` | บันทึกกติกาหน้าเช็กลิสต์ |

---

## 6. งานที่ยังไม่เสร็จ และข้อเสนอ Phase ต่อไป

### รอเจ้าของกิจการ
1. **ยืนยันสิทธิ์ Google Search Console** (ขั้นตอนใน `PHASE10_DEPLOYMENT_GUIDE.md` ข้อ 5.1)
2. **ตัดสินใจเรื่อง GA4** — ใส่ `GA4_ID` หรือใช้สถิติภายในอย่างเดียว
3. **ไฟล์รายงานตัวอย่าง** ที่ตัดข้อมูลส่วนบุคคลแล้ว — เพื่อทำปุ่มดาวน์โหลดรายงานตัวอย่าง
4. **อนุมัติสร้างหน้าแปลงสแตติกใหม่** — หน้าแปลงยังเป็นรุ่น 21 ก.ย. (ยังดึงฟอนต์ภายนอก · ดูรายงานประสิทธิภาพข้อ 4)
5. **merge และ deploy แดชบอร์ดการตลาดกับหน้าเช็กลิสต์** — สวิตช์ `seo_center` `kb_web` `packages` เปิดอยู่บน production แล้ว (ตรวจ 24 ก.ย.)
   แดชบอร์ดจึงใช้ได้ทันทีหลัง deploy โดยไม่ต้องเปิดอะไรเพิ่ม

### ข้อเสนอ Phase ต่อไป (ต้องอนุมัติก่อนทำ)
1. **เชื่อม Search Console API / GA4 Data API เข้าแดชบอร์ดการตลาด** — ต้องมีบัญชีบริการของ Google และสิทธิ์อ่านข้อมูล
2. **Action สร้างหน้าแปลงอัตโนมัติ** แบบเดียวกับบทความและวารสาร — หน้าแปลงจะไม่ค้างรุ่นเก่าอีก
3. **ผูกลีดกับรายได้จริง** (ค่านายหน้า · รายได้แพ็กเกจ) — ข้อกำหนดงานที่ 12 ขอไว้ แต่ใบลีดยังไม่ผูกกับใบแจ้งหนี้
4. **แบ่งหน้าให้หน้ารวมประกาศ** เมื่อแปลงเกิน ~500 แปลง
5. **เทสต์การแสดงผลอัตโนมัติ (Playwright)** และ **staging** — มีค่าใช้จ่าย/ต้องติดตั้งเพิ่ม
6. **ส่ง CSS เฉพาะที่แต่ละหน้าใช้** เพื่อลด `styleLayout` บนหน้าแรก (งานใหญ่ เสี่ยงกับเว็บ 31 หน้า)
