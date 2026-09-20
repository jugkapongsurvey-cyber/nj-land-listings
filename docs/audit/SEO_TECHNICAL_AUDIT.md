# SEO_TECHNICAL_AUDIT — ที่ดินชัวร์

วันที่ตรวจ 19–20 กันยายน 2569

---

## 1. สรุปภาพรวม

| หมวด | สถานะ |
|---|---|
| robots.txt | ดี — มีอยู่ · ชี้ sitemap · กันหน้าที่มีตั๋วครบ |
| sitemap.xml | **มีปัญหา — ไม่มีหน้าแปลงสักแปลง** |
| Title / Description | มีครบทุกหน้า แต่ **ยาวเกินเกณฑ์ 10 จาก 21 หน้า** |
| Canonical | **ขาดใน 7 หน้า** |
| Open Graph | ขาดใน 7 หน้า · **หน้าแปลงใช้ og ตัวเดียวกันทุกแปลง** |
| Structured Data | มีแค่ 2 หน้า · ไม่มี Breadcrumb / Organization / FAQ |
| Render ข้อมูลใน HTML | **หน้าแปลงเติมทุกอย่างด้วย JS — HTML ต้นทางมี H1 = 0** |
| noindex หน้า Admin/Login | **ผ่าน** |
| Soft 404 | **มีปัญหาที่ `land.html?id=…`** |
| Broken link | **ผ่าน — 0 ลิงก์เสีย** |
| Review Schema ปลอม | **ไม่มี (ดี)** |

---

## 2. robots.txt

```
User-agent: *
Allow: /
Disallow: /consign.html?*t=
Disallow: /inspect.html?*t=
Disallow: /deal.html
Disallow: /room.html
Disallow: /quote.html
Disallow: /notify.html
Disallow: /partner-apply.html?*t=
Sitemap: https://njteedinsure.com/sitemap.xml
```

| ข้อ | ผล |
|---|---|
| มีไฟล์และคืน 200 | ผ่าน |
| ชี้ sitemap | ผ่าน |
| กันหน้าที่มีตั๋วของลูกค้า | ผ่าน — และหน้าเหล่านั้นยังประกาศ `noindex` ในตัวหน้าอีกชั้น |
| ปัญหา | คอมเมนต์บรรทัดที่ 2 เขียนว่า "เว็บนี้ไม่มีหน้าที่ต้องซ่อนจากเสิร์ชเอนจิน" แต่ใต้ลงมามี `Disallow` 7 บรรทัด — คอมเมนต์ล้าสมัย (Low) |

**ระบบหลังบ้าน** `app.njteedinsure.com/robots.txt` มี `Disallow: /api/` และทุกหน้าส่ง header `X-Robots-Tag: noindex, nofollow` — **ผ่าน**

---

## 3. sitemap.xml

สร้างอัตโนมัติจาก `build/sitemap.js` · มี 14 URL · `lastmod` มาจากวันที่ commit ล่าสุด · ไม่มี `priority`/`changefreq` (ถูกต้อง)

### ปัญหาหลัก

| ปัญหา | ระดับ |
|---|---|
| **ไม่มี URL ของหน้าแปลงเลยสักแปลง** — ปัจจุบันมีประกาศจริง 22 รายการบน production | **High** |
| ไม่มี `/purpose.html` แยกตามวัตถุประสงค์ (มีหน้าเดียว ใช้พารามิเตอร์) | Medium |
| คอมเมนต์ในไฟล์เขียนว่า "หน้าแปลงรายแปลงจะมาในไฟล์แยก (sitemaps/properties.xml) เมื่อสร้างหน้าจริงเสร็จ" — ยังไม่ได้ทำ | — |

**ผลกระทบ:** หน้าที่ทำเงินจริง (หน้าประกาศแต่ละแปลง) ไม่ถูกส่งให้ Google เลย และยังเป็น **หน้ากำพร้า** ด้วย (ไม่มีลิงก์เข้าจากหน้าที่เก็บดัชนีได้ เพราะการ์ดทั้งหมดถูกเติมด้วย JS)

---

## 4. Title และ Description

### 4.1 Title ที่ยาวเกิน 60 ตัวอักษร (Google ตัดปลาย)

| หน้า | ความยาว | Title |
|---|---|---|
| `agency.html` | **83** | ทรัพย์หน่วยงาน — บังคับคดี ธนาคาร BAM SAM ส่งลิงก์ให้ NJ ตรวจก่อนเคาะ \| ที่ดินชัวร์ |
| `purpose.html` | **79** | ค้นหาที่ดินตามวัตถุประสงค์ — สร้างบ้าน โกดัง โรงงาน แบ่งขาย เกษตร \| ที่ดินชัวร์ |
| `chat.html` | **78** | น้องเอ็นเจชัวร์ — ถามเรื่องที่ดิน หาแปลง เทียบแปลง เช็กค่ารังวัด \| ที่ดินชัวร์ |
| `verify.html` | **72** | ส่งทรัพย์ให้ NJ ตรวจสอบก่อนซื้อ — บังคับคดี/ธนาคาร/BAM/SAM \| ที่ดินชัวร์ |
| `partner-apply.html` | **71** | สมัครเป็นพันธมิตรกับ NJ — เครือข่ายผู้ให้บริการด้านที่ดิน \| ที่ดินชัวร์ |
| `listings.html` | **70** | ประกาศขายที่ดินทั้งหมด — กรองตามทำเล ราคา เนื้อที่ ผังสี \| ที่ดินชัวร์ |
| `inspect.html` | 68 | นัดตรวจแปลงก่อนซื้อ — ให้ช่างรังวัดไปดูให้ก่อนตัดสินใจ \| ที่ดินชัวร์ |
| `tools.html` | 64 | เครื่องมือคำนวณ — ค่างวดสินเชื่อ ค่าโอน ภาษีวันโอน \| ที่ดินชัวร์ |
| `videos.html` | 61 | วิดีโอให้ความรู้เรื่องที่ดิน — ดูจบใน 30 วินาที \| ที่ดินชัวร์ |
| `wanted.html` | 61 | ฝากหาที่ดิน — บอกโจทย์ไว้ ให้ทีมช่างรังวัดหาให้ \| ที่ดินชัวร์ |

**หมายเหตุ:** ภาษาไทยนับความกว้างพิกเซลไม่ใช่จำนวนตัวอักษร ตัวเลขข้างบนใช้เป็นสัญญาณเตือนเบื้องต้น ควรวัดซ้ำด้วยเครื่องมือดูตัวอย่างผลค้นหา

### 4.2 Description ที่ยาวเกิน 160 ตัวอักษร

`tools.html` (201) · `verify.html` (194) · `wanted.html` (190) · `consign.html` (187) · `listings.html` (181) · `guides.html` (176) · `chat.html` (175) · `purpose.html` (175) · `agency.html` (173) · `partner-apply.html` (171) · `inspect.html` (170) · `portal.html` (161)

**12 จาก 21 หน้า** ยาวเกินเกณฑ์

### 4.3 หน้าที่ Title/Description สั้นเกินไปหรือเป็นข้อความกลาง

| หน้า | ปัญหา |
|---|---|
| `land.html` | Description = "รายละเอียดแปลงที่ดิน พร้อมผลการตรวจสอบเชิงลึกโดยช่างรังวัดเอกชนใบอนุญาตกรมที่ดินเลขที่ 351" — **เหมือนกันทุกแปลง ไม่เปลี่ยนตามข้อมูลจริง** |
| `index.html` | Title = "ที่ดินชัวร์ — เช็กก่อนซื้อ ชัวร์ก่อนโอน" ไม่มีคำค้นหลักอย่าง "ซื้อขายที่ดิน" |

---

## 5. Canonical

| สถานะ | หน้า |
|---|---|
| **มี canonical** (14) | agency · chat · compare · consign · guides · index · inspect · listings · partner-apply · portal · purpose · tools · verify · videos · wanted |
| **ไม่มี canonical** (7) | `404.html` · `deal.html` · `land.html` (HTML ต้นทาง) · `notify.html` · `quote.html` · `room.html` · `s/index.html` |

- หน้าที่ขาด canonical ส่วนใหญ่เป็นหน้า `noindex` จึงไม่เป็นปัญหาใหญ่
- **`land.html` เป็นข้อยกเว้นสำคัญ** — HTML ต้นทางไม่มี canonical เลย มีเฉพาะหลัง JS ทำงาน (`land.js` ใส่ `https://njteedinsure.com/land.html?id=OP-072` ให้ถูกต้อง) บอตรอบแรกจึงไม่เห็น

### Filter URL

**ยังไม่เป็นปัญหา** เพราะตัวกรองไม่เขียนลง URL เลย (ดู FUNCTIONAL_TEST_REPORT 2.2) — แต่เมื่องานที่ 4 ทำ "URL ที่แชร์ได้" เสร็จ จะเกิดหน้าซ้ำจำนวนมากทันที **ต้องวางกติกา canonical + `noindex` สำหรับ URL ที่มีตัวกรองไปพร้อมกับงานนั้น ไม่ใช่ตามทีหลัง**

---

## 6. Open Graph และการแชร์

| สถานะ | หน้า |
|---|---|
| มี `og:title` + `og:image` | agency · chat · consign · guides · index · inspect · land · listings · partner-apply · portal · purpose · tools · verify · videos · wanted (15) |
| ไม่มี og เลย | 404 · compare · deal · notify · quote · room (6 — เป็นหน้า noindex ทั้งหมด ยอมรับได้) |

### ปัญหา High

**`land.html` ใช้ og ชุดเดียวกันทุกแปลง**

| | ค่าจริงที่วัดได้ |
|---|---|
| `og:title` | "รายละเอียดแปลงที่ดิน \| ที่ดินชัวร์" (ไม่เปลี่ยนแม้ JS ทำงานแล้ว) |
| `og:url` | **ไม่มี** |
| `og:image` | ภาพ og กลางของเว็บ ไม่ใช่รูปแปลง |

**ผลกระทบจริง:** LINE / Facebook / Messenger อ่าน og จาก HTML ต้นทาง ไม่รันสคริปต์ → **ทุกแปลงที่พนักงานส่งให้ลูกค้าทาง LINE แสดงหัวข้อและรูปเหมือนกันหมด** ซึ่งเป็นช่องทางขายหลักของบริษัท

`index.html` `og:description` ยังเป็นข้อความอ้างเกินจริง (ดู C-02)

---

## 7. Structured Data

| หน้า | Schema | สถานะ |
|---|---|---|
| `index.html` | มี JSON-LD 1 ก้อน | ต้องตรวจว่าชนิดถูกต้อง (`@type` อ่านไม่ออกจากไฟล์ต้นทาง) |
| `land.html` | `RealEstateListing` | **ฉีดด้วย JS เท่านั้น** ไม่มีใน HTML ต้นทาง |
| อีก 19 หน้า | **ไม่มีเลย** | |

### ขาด

| Schema | ควรอยู่ที่ |
|---|---|
| `Organization` / `LocalBusiness` | ทุกหน้า (ใส่ใบอนุญาต 351 · ที่อยู่ · เบอร์โทร · LINE) |
| `BreadcrumbList` | `land.html` · `listings.html` · หน้าคู่มือ |
| `FAQPage` | `verify.html` (มี `<summary>` คำถาม-คำตอบอยู่แล้ว) · `guides.html` |
| `Article` | บทความคู่มือแต่ละเรื่อง (หลังแยกเป็น `/knowledge/*` ตามงานที่ 10) |
| `VideoObject` | `videos.html` |
| `WebSite` + `SearchAction` | `index.html` |

### ข้อดี

**ไม่มี Review Schema ปลอมเลย** — ตรงตามกติกางานที่ 15

### ความเสี่ยงที่ต้องระวัง

`RealEstateListing` ของหน้าแปลงอาจส่งประเภททรัพย์ผิด เพราะ title บอกว่า "ขายที่ดิน" แต่ H1 บอกว่า "บ้านแฝด 2 ชั้น" (ดู C-03) — Structured Data ที่ไม่ตรงข้อมูลจริงเสี่ยงถูก Google ลงโทษ

---

## 8. การ Render ข้อมูลใน HTML (งานที่ 15)

| หน้า | H1 ใน HTML ต้นทาง | เนื้อหาหลักใน HTML ต้นทาง |
|---|---|---|
| `index.html` | 1 | มีครบ (เป็น static HTML) |
| `listings.html` | 1 | **หัวข้อมี แต่การ์ดประกาศทั้งหมดเติมด้วย JS** |
| `land.html` | **0** | **ไม่มีอะไรเลย — ทั้งหน้าเติมด้วย JS** |
| `purpose.html` | 1 | ผลลัพธ์เติมด้วย JS |
| หน้าอื่น | 1 | มีครบ |

**สรุป:** หน้าที่ขายของจริงทั้งสามหน้า (แปลง · รวมประกาศ · ค้นตามวัตถุประสงค์) มีเนื้อหาสินค้าอยู่ใน JS ทั้งหมด

Google รัน JavaScript ได้ แต่เป็นคิวรอบสอง ช้ากว่า และไม่รับประกัน · ส่วน LINE / Facebook / Twitter **ไม่รันเลย**

**ทางเลือกที่ต้องตัดสินใจ:** ดู WEBSITE_FULL_AUDIT หัวข้อ 7 ข้อ 1–3 (เว็บนี้เป็น static บน GitHub Pages ไม่มี server-side render)

---

## 9. 404 · Soft 404 · Redirect

| ข้อ | ผล |
|---|---|
| `/no-such-page-xyz` | **HTTP 404 จริง** + หน้า `404.html` ที่ออกแบบไว้ · `noindex, follow` — **ผ่าน** |
| **`/land.html?id=<ไม่มีจริง>`** | **HTTP 200** พร้อมโครงหน้าว่าง — **soft 404 (High)** |
| Redirect ของ URL เดิม | ยังไม่มีการเปลี่ยน URL จึงยังไม่มี redirect ให้ตรวจ |
| Broken link | **0** (`build/linkcheck.js`) |

**ข้อควรระวังสำหรับงานที่ 8 และ 10:** GitHub Pages **ทำ 301 redirect ไม่ได้** ถ้าจะเปลี่ยน URL หน้าแปลงหรือแยกบทความ ต้องเลือกระหว่าง
(ก) คง URL เดิมไว้ + ใช้ canonical
(ข) สร้างไฟล์ HTML เดิมที่มี `<meta http-equiv="refresh">` + canonical (ไม่ใช่ 301 จริง)
(ค) วาง Cloudflare หน้าโดเมนแล้วทำ redirect ที่ชั้นนั้น

---

## 10. หน้าที่ต้อง noindex

| หน้า | สถานะ |
|---|---|
| `app.njteedinsure.com` (Admin/Login ทั้งหมด) | **ผ่าน** — `X-Robots-Tag: noindex, nofollow` + `robots.txt` |
| `deal.html` (ติดตามงานผู้ซื้อ) | ผ่าน — `noindex` + `Disallow` |
| `room.html` (ห้องเอกสาร) | ผ่าน — `noindex, nofollow, noarchive` + `Disallow` |
| `quote.html` (ใบเสนอราคา) | ผ่าน |
| `notify.html` (ตั้งค่าแจ้งเตือน) | ผ่าน |
| `compare.html` | ผ่าน — `noindex,follow` |
| `404.html` | ผ่าน |
| `consign.html?…&t=` (ลิงก์แก้ไขของเจ้าของ) | ผ่าน — `Disallow` (หน้าเปล่ายัง index ได้ ถูกต้อง) |

**ไม่พบหน้าที่ควร noindex แล้วยังเปิดดัชนีอยู่**

---

## 11. SEO ภายใน (Internal linking)

| ปัญหา | ระดับ |
|---|---|
| `land.html` เป็นหน้ากำพร้า — ไม่มีลิงก์เข้าจากหน้า HTML ใดเลย มีแต่จาก JS | **High** |
| `inspect.html` เป็นหน้ากำพร้า | Medium |
| `partner-apply.html` **ไม่มีลิงก์เข้าจากที่ใดเลยทั้งเว็บ** | Medium |
| บทความคู่มือทั้ง 9 เรื่องอยู่ในหน้าเดียว (`guides.html`) เป็น anchor | Medium — แข่งคำค้นกันเองไม่ได้ |
| ไม่มี breadcrumb ทั้งเว็บ | Medium |
| ชื่อเมนูที่ชี้หน้าเดียวกันไม่ตรงกัน 4 แบบ (anchor text กระจาย) | Medium |

---

## 12. รายการแก้ไขเรียงตามผลกระทบ

| ลำดับ | งาน | ระดับ | Sprint ที่เสนอ |
|---|---|---|---|
| 1 | ใส่ `og:title` / `og:description` / `og:image` / `og:url` แบบไดนามิกในหน้าแปลง (ต้องอยู่ใน HTML ต้นทาง ไม่ใช่ JS) | High | 3 |
| 2 | เพิ่มหน้าแปลงลง sitemap (สร้าง `sitemaps/properties.xml` จาก API ตอน build) | High | 3 |
| 3 | แก้ประเภททรัพย์ที่ขัดกันระหว่าง title กับ H1 + Structured Data | Critical | 3 |
| 4 | แก้ soft 404 ของ `land.html?id=` ที่ไม่มีจริง | High | 3 |
| 5 | ใส่ meta description ไดนามิกของหน้าแปลง | High | 3 |
| 6 | แก้ `og:description` หน้าแรกที่อ้างเกินจริง | Critical | 1 |
| 7 | เพิ่มลิงก์ HTML จริงไปหน้าแปลง (เช่น รายการแปลงแนะนำที่ render ใน HTML) | High | 3 |
| 8 | ย่อ Title 10 หน้า และ Description 12 หน้า | Medium | 5 |
| 9 | เพิ่ม `Organization` · `BreadcrumbList` · `FAQPage` · `WebSite`+`SearchAction` | Medium | 5 |
| 10 | แยกบทความคู่มือเป็น `/knowledge/*` พร้อม `Article` schema + author/reviewer/updated | Medium | 4 |
| 11 | วางกติกา canonical/noindex ของ filter URL **พร้อมกับ** งานที่ 4 | Medium | 2 |
| 12 | ใส่ลิงก์เข้า `partner-apply.html` และ `inspect.html` | Medium | 1 |
| 13 | แก้คอมเมนต์ที่ล้าสมัยใน `robots.txt` | Low | 5 |

---

## 13. Baseline ที่จะใช้เทียบหลังปรับ (SEO_BEFORE_AFTER)

| ตัวชี้วัด | ค่าวันนี้ |
|---|---|
| URL ใน sitemap | 14 |
| หน้าแปลงใน sitemap | **0** (จากประกาศจริง 22 รายการ) |
| หน้าที่มี canonical | 14 / 21 |
| หน้าที่มี Open Graph ครบ | 15 / 21 |
| หน้าที่มี Structured Data | 2 / 21 |
| ชนิด Schema ที่ใช้ | 2 |
| Title เกิน 60 ตัวอักษร | 10 |
| Description เกิน 160 ตัวอักษร | 12 |
| หน้ากำพร้า | 3 |
| ลิงก์เสีย | 0 |
| Soft 404 | 1 รูปแบบ (`land.html?id=`) |
| หน้าที่ H1 อยู่ใน HTML ต้นทาง | 20 / 21 |
