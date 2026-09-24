# PHASE10_DEPLOYMENT_GUIDE.md — วิธีขึ้นระบบและตรวจหลังขึ้น (Phase 10)

**ครอบคลุม:** สปรินต์ 1–6 · **ปรับปรุงล่าสุด:** 24 กันยายน 2569

---

## 1. ระบบนี้มีสองส่วน ขึ้นคนละที่

| ส่วน | repo | โฮสต์ | วิธีขึ้น |
|---|---|---|---|
| เว็บสาธารณะ `njteedinsure.com` | `nj-land-listings` | GitHub Pages | merge เข้า `main` → GitHub Pages เผยแพร่เอง |
| ระบบหลังบ้าน `app.njteedinsure.com` | `nj-survey-system` | Render | merge เข้า `main` → Render deploy เอง |

⚠️ **รอบไหนแตะทั้งสองส่วน ขึ้นระบบหลังบ้านก่อนเสมอ** — หน้าเว็บเรียก API ของระบบ
ขึ้นเว็บก่อน = หน้าเว็บเรียกเส้นทางที่ยังไม่มี หรือเหตุการณ์สถิติชนิดใหม่ถูกเซิร์ฟเวอร์ทิ้ง (400)

---

## 2. ก่อน merge ทุกครั้ง

**ระบบหลังบ้าน**
```
CI=true npm test      # lint + ชุดทดสอบทั้งหมด ต้องผ่านครบ
npm run test:p10      # เฉพาะชุดของ Phase 10 (ทะเบียน SEO · หน้าพื้นที่ · บทความ · แดชบอร์ดการตลาด)
```

**เว็บสาธารณะ** (ไม่มี `package.json` โดยตั้งใจ — CI รันทุกไฟล์ `*.test.js` ให้เอง)
```
node build/lint.js                     # ไวยากรณ์ · ที่อยู่ไฟล์ · id ซ้ำ · ลำดับสคริปต์
for f in *.test.js; do node "$f" || echo "FAIL $f"; done
node contracts.test.js <path ของ nj-survey-system สาขาที่ตรงกัน>
node build/pages.js --check            # หัวเว็บกับสไตล์ชีตกลางตรงกันทุกหน้า
node build/lazycss.js --check          # สไตล์ชีตของของที่ JS สร้าง ไม่บล็อกการวาด
node build/sitemap.js --check
node build/linkcheck.js                # ลิงก์เสีย (ต้องเป็น 0)
```

⚠️ **`contracts.test.js` ต้องชี้ไปสาขาของระบบที่ตรงกับงานนั้น** — รันเปล่าๆ จะเทียบกับโฟลเดอร์
`../nj-survey-system` ซึ่งอาจค้างอยู่สาขาเก่า แล้วแดงทั้งที่โค้ดถูก (เจอซ้ำหลายรอบ)

⚠️ **`build/schema.js --check` แสดง "20 หน้าไม่ตรง" บนเครื่อง Windows อยู่แล้ว** (ตัวจบบรรทัด CRLF/LF)
ไม่ได้อยู่ใน CI · ตรวจความจริงด้วย `git diff --ignore-cr-at-eol` หลังรันตัวสร้าง

### ลำดับตัวสร้างของเว็บ (เมื่อแก้หน้าหรือเพิ่มหน้าใหม่)

`build/pages.js` → `build/properties.js` → `build/locations.js` → `build/schema.js` → `build/sitemap.js`

- ⚠️ **`build/properties.js` · `build/locations.js` · `build/knowledge.js` · `build/journal.js` · `build/seo.js`
  ดึงข้อมูลจาก API ของ production** — รันแล้วหน้าต่างๆ จะเปลี่ยนตามข้อมูลจริงวันนั้น (แปลงถูกถอน = หน้าถูกลบ)
  รันเฉพาะเมื่อตั้งใจอัปเดตหน้านั้นจริง และตรวจ `git status` ก่อน commit เสมอ
- ⚠️ **`build/seo.js` แก้แท็กของทุกหน้าที่อยู่ในทะเบียน SEO** — ห้ามรันระหว่างทำงานอื่นแล้วเผลอ commit ไปด้วย
- `knowledge` และ `journal` สร้างเองทุก 30 นาทีด้วย GitHub Actions (`knowledge.yml` · `journal.yml`) ไม่ต้องรันมือ
- ⚠️ **หน้าแปลง (`properties/**`) ยังไม่มี Action สร้างอัตโนมัติ** — ต้องรัน `node build/pages.js && node build/properties.js`
  เองเมื่อหัวเว็บหรือต้นแบบ `land.html` เปลี่ยน · ตอนนี้หน้าแปลงยังเป็นรุ่นวันที่ 21 ก.ย.
  (ดู `PHASE10_PERFORMANCE_REPORT.md` หัวข้อ 4)

⚠️ **สร้าง `sitemap.xml` ก่อน commit เสมอ** — สคริปต์ใช้วันนี้เป็น `lastmod` ของไฟล์ที่แก้แล้วยังไม่ commit

---

## 3. สวิตช์และค่าที่ต้องเปิด/ตั้งบนระบบหลังบ้าน

สวิตช์ทั้งหมด **ปิดเป็นค่าเริ่มต้น** · ปิดอยู่ = เส้นทางตอบ 404 และเมนูไม่แสดง ·
**สถานะบน production (ตรวจ 24 ก.ย. 2569): ทั้งสามสวิตช์ด้านล่างเปิดอยู่แล้ว** ·
Super Admin เปิดได้ที่ **จัดการผู้ใช้ → สวิตช์ฟีเจอร์ของโมดูลใหม่** (มีผลทันที ไม่ต้อง deploy)

| สวิตช์ | เปิดแล้วได้อะไร | ต้องทำอะไรก่อน/หลังเปิด |
|---|---|---|
| `seo_center` | เมนู **SEO และการตลาด** (ทะเบียน SEO · หน้าพื้นที่ · **แดชบอร์ดการตลาด**) · `/api/public/seo/*` | สำรองฐานข้อมูลก่อนเปิดครั้งแรก · บทบาทที่เห็นเมนูคือแอดมินและผู้จัดการ (สิทธิ์ `marketing`) |
| `kb_web` | แผง "บทความบนเว็บ" ในฐานความรู้ · `/api/public/kb/articles` | บทความขึ้นเว็บเมื่อทีมกดทีละบทความ ไม่มีอะไรขึ้นเองเมื่อเปิดสวิตช์ |
| `packages` | หน้าแพ็กเกจ · แบบประเมินทรัพย์ (`packages.html#pk-quiz`) | ถ้าปิด หน้าเช็กลิสต์ยังลิงก์ไปได้ แต่หน้าแพ็กเกจจะขึ้นกล่อง "ทักไลน์หาทีมงาน" |

ปิดฉุกเฉินได้ด้วย env `FEATURE_<ชื่อสวิตช์>=0` บน Render (ชนะค่าในระบบ)

---

## 4. ตรวจหลังขึ้นระบบ (ทุกครั้ง)

**เว็บสาธารณะ**
```
curl -sSI https://njteedinsure.com/ | head -3                     # 200
curl -sS  https://njteedinsure.com/sitemap.xml | head             # เป็นไฟล์ใหม่
curl -sS -o /dev/null -w "%{http_code}\n" https://njteedinsure.com/checklist.html   # 200
curl -sS -o /dev/null -w "%{http_code}\n" https://njteedinsure.com/ไม่มีหน้านี้     # 404
```

**ระบบหลังบ้าน**
```
curl -sS https://app.njteedinsure.com/healthz                     # {"status":"ok"}
curl -sS https://app.njteedinsure.com/robots.txt                  # text/plain ไม่ใช่ HTML
curl -sSI https://app.njteedinsure.com/ | grep -i x-robots-tag    # ต้องมี noindex
curl -sS -o /dev/null -w "%{http_code}\n" https://app.njteedinsure.com/api/marketing/dashboard   # 401 (ต้องล็อกอิน)
curl -sS -o /dev/null -w "%{http_code}\n" https://app.njteedinsure.com/api/public/seo/areas      # 200 (เปิดสวิตช์แล้ว) หรือ 404 (ยังปิด)
node scripts/smoke.js https://app.njteedinsure.com                # "== smoke ผ่าน =="
```

**แดชบอร์ดการตลาด (หลังเปิด `seo_center`)** — ล็อกอินเป็นแอดมิน → เมนู SEO และการตลาด → แท็บ "แดชบอร์ดการตลาด"
ตัวชี้วัดฝั่ง Google ต้องขึ้น **"ยังไม่ได้เชื่อม"** (ไม่ใช่ 0) · กดดาวน์โหลด CSV แล้วเปิดใน Excel ภาษาไทยต้องอ่านออก

---

## 5. สิ่งที่เจ้าของกิจการต้องกดเอง (ทำแทนไม่ได้)

### 5.1 ยืนยันสิทธิ์ Google Search Console — **ยังไม่ได้ทำ**

จำเป็นสำหรับตัวชี้วัดฝั่งการค้นหาของแดชบอร์ดการตลาด (Impressions · Clicks · CTR · Average Position · Indexed Pages)
และข้อมูล Core Web Vitals จากผู้ใช้จริง

1. เข้า <https://search.google.com/search-console> ด้วยบัญชี Google ของบริษัท
2. เลือก **"คำนำหน้า URL"** แล้วใส่ `https://njteedinsure.com`
3. เลือกวิธียืนยัน **"แท็ก HTML"** แล้วส่งบรรทัด `<meta name="google-site-verification" content="…">` มาให้ทีมพัฒนา
   · ⚠️ **อย่าเพิ่งกด "ยืนยัน" ก่อนแท็กขึ้นเว็บจริง**
4. ยืนยันสำเร็จแล้ว ส่งแผนผังในเมนู **แผนผังเว็บไซต์** ทุกไฟล์ที่ `robots.txt` ประกาศไว้
   (ตอนนี้: `sitemap.xml` · `sitemaps/properties.xml` · `sitemaps/journal.xml` — หน้าพื้นที่และบทความจะเพิ่มไฟล์ของตัวเองเมื่อมีหน้าเผยแพร่)

⚠️ แม้ยืนยันแล้ว ตัวเลขของ Google ยัง **ไม่ไหลเข้าแดชบอร์ดการตลาดเอง** — การเชื่อม API ของ Search Console/GA4
เป็นงานเพิ่ม และต้องได้รับอนุมัติก่อน (ดูรายการงานค้างใน `PHASE10_TEST_RESULTS.md`)

### 5.2 Google Analytics 4 — **รอการตัดสินใจ**

`analytics.js` มีช่อง `GA4_ID` ว่างรออยู่ · ใส่รหัส `G-XXXXXXXXXX` แล้วสคริปต์จะโหลด **หลังผู้ใช้กดยอมรับคุกกี้เท่านั้น**
· ไม่ใส่ = เว็บทำงานปกติ ระบบยังนับการเปิดหน้า คลิกปุ่มติดต่อ และการส่งฟอร์มเองโดยไม่ใช้คุกกี้

### 5.3 Meta Pixel — **ทำงานอยู่แล้ว**

`META_PIXEL_ID` ตั้งไว้ใน `analytics.js` และโหลดหลังผู้ใช้กดยอมรับ · ปิดได้โดยลบค่าเป็นสตริงว่าง

### 5.4 หน้าพื้นที่และบทความ — ทีมต้องกดเผยแพร่เอง

- หน้าจังหวัด/อำเภอขึ้นเว็บเมื่อแอดมินกดเผยแพร่ในทะเบียน SEO เท่านั้น (ต้องมีเนื้อหาแนะนำ ≥ 80 ตัวอักษร)
- บทความขึ้นเว็บเมื่อผู้มีสิทธิ์กด "ขึ้นเว็บ" ทีละบทความ · ระบบไม่เผยแพร่อะไรเอง

---

## 6. ทางถอยเมื่อมีปัญหา

| อาการ | ทำอะไร |
|---|---|
| เว็บสาธารณะพังหลัง merge | `git revert <commit>` แล้ว push — GitHub Pages เผยแพร่ใหม่ใน ~1 นาที |
| ระบบหลังบ้านพังหลัง deploy | Render → Deploys → เลือก deploy ก่อนหน้า → **Redeploy** |
| ฟีเจอร์ใหม่มีปัญหา แต่ส่วนอื่นปกติ | ปิดสวิตช์ของฟีเจอร์นั้น (ข้อ 3) — มีผลทันที ไม่ต้อง deploy |
| หน้าเว็บของระบบหลังบ้านขึ้นของเก่าค้าง | ขึ้นเลข `CACHE` ใน `public/sw.js` (เว็บสาธารณะไม่มี service worker) |
| บอตเก็บหน้าที่ไม่ควรเก็บ | เพิ่ม `<meta name="robots" content="noindex">` ในหน้านั้น แล้วสร้าง `sitemap.xml` ใหม่ |
| Action สร้างบทความ/วารสารแดง | ดูแท็บ Actions · API ล่ม = ตัวสร้างไม่แตะไฟล์ หน้าเดิมยังอยู่ครบ |
