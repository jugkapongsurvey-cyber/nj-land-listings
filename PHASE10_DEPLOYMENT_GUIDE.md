# PHASE10_DEPLOYMENT_GUIDE.md — วิธีขึ้นระบบและตรวจหลังขึ้น

**สถานะ:** ครอบคลุมถึงสปรินต์ 1 · จะเติมทีละสปรินต์ตามงานที่ทำจริง
**ปรับปรุงล่าสุด:** 18 กันยายน 2569

---

## 1. ระบบนี้มีสองส่วน ขึ้นคนละที่

| ส่วน | repo | โฮสต์ | วิธีขึ้น |
|---|---|---|---|
| เว็บสาธารณะ `njteedinsure.com` | `nj-land-listings` | GitHub Pages | merge เข้า `main` → GitHub Pages เผยแพร่เอง (ไม่มี build step) |
| ระบบหลังบ้าน `app.njteedinsure.com` | `nj-survey-system` | Render | merge เข้า `main` → Render สั่ง deploy เอง |

⚠️ **ลำดับสำคัญเมื่อรอบไหนแตะทั้งสองส่วน: ขึ้นระบบหลังบ้านก่อนเสมอ**
เพราะหน้าเว็บสาธารณะเรียก API ของระบบหลังบ้าน — ขึ้นเว็บก่อนแล้วหน้าเว็บจะเรียกเส้นทางที่ยังไม่มี

---

## 2. ก่อน merge ทุกครั้ง

**ระบบหลังบ้าน**
```
npm test          # lint + ชุดทดสอบทั้งหมด ต้องผ่านครบ
```
**เว็บสาธารณะ** (ไม่มี `package.json` โดยตั้งใจ — รันทีละไฟล์)
```
node contracts.test.js ../nj-wt-p2b    # ค่าคงที่ที่ผูกกันข้ามสอง repo
node compare.test.js ; node feecalc.test.js ; node valuecalc.test.js
node verified.test.js ; node njchat.test.js ; node agency.test.js
node loancalc.test.js ; node zonechip.test.js ; node zoneguide.test.js
node build/linkcheck.js                # ลิงก์เสีย + หน้ากำพร้า (ออก 1 เมื่อมีลิงก์เสีย)
node build/sitemap.js                  # สร้าง sitemap.xml ใหม่จากไฟล์จริง
```

⚠️ **สร้าง `sitemap.xml` ก่อน commit เสมอ** — สคริปต์ใช้วันนี้เป็น `lastmod` ของไฟล์ที่แก้แล้วยังไม่ commit
สร้างหลัง commit จะได้วันที่ของ commit ก่อนหน้า ซึ่งบอก Google ผิด

---

## 3. ตรวจหลังขึ้นระบบ (ทุกครั้ง)

**เว็บสาธารณะ**
```
curl -sSI https://njteedinsure.com/ | head -3          # ต้องได้ 200
curl -sS  https://njteedinsure.com/sitemap.xml | head  # ต้องเป็นไฟล์ใหม่
curl -sS -o /dev/null -w "%{http_code}\n" https://njteedinsure.com/ไม่มีหน้านี้   # ต้องได้ 404
```
**ระบบหลังบ้าน**
```
curl -sS https://app.njteedinsure.com/healthz                       # {"status":"ok"}
curl -sS https://app.njteedinsure.com/robots.txt                    # ต้องเป็น text/plain ไม่ใช่ HTML
curl -sSI https://app.njteedinsure.com/ | grep -i x-robots-tag      # ต้องมี noindex
curl -sS -o /dev/null -w "%{http_code}\n" https://app.njteedinsure.com/wp-login.php   # ต้องได้ 404
node scripts/smoke.js https://app.njteedinsure.com                  # ต้องขึ้น "== smoke ผ่าน =="
```

---

## 4. สิ่งที่เจ้าของกิจการต้องกดเอง (ผมทำแทนไม่ได้)

### 4.1 ยืนยันสิทธิ์ Google Search Console — **ยังไม่ได้ทำ**

จำเป็นสำหรับตัวชี้วัดฝั่งการค้นหาทั้งหมดของแดชบอร์ดการตลาด (Impressions · Clicks · CTR · Average Position · Indexed Pages)

1. เข้า <https://search.google.com/search-console> ด้วยบัญชี Google ของบริษัท
2. เลือก **"คำนำหน้า URL"** แล้วใส่ `https://njteedinsure.com`
3. เลือกวิธียืนยัน **"แท็ก HTML"** แล้วคัดลอกบรรทัด `<meta name="google-site-verification" content="…">` มาให้ผม
   ผมจะใส่ให้ทุกหน้าผ่านทะเบียน SEO กลาง (สปรินต์ 2) แล้วบอกให้กด "ยืนยัน"
   · ⚠️ **อย่าเพิ่งกด "ยืนยัน" ก่อนที่แท็กจะขึ้นเว็บจริง** — Google จะบอกว่าไม่สำเร็จ
4. ยืนยันสำเร็จแล้ว ส่ง `https://njteedinsure.com/sitemap.xml` ในเมนู **แผนผังเว็บไซต์**

⚠️ **ทางเลือกที่ผมไม่แนะนำ**: ยืนยันด้วยไฟล์ `google*.html` ที่ราก — ทำได้เหมือนกัน
แต่ไฟล์นั้นจะกลายเป็นหน้าหนึ่งของเว็บที่ตัวตรวจลิงก์และ sitemap ต้องยกเว้นเป็นกรณีพิเศษตลอดไป

### 4.2 Google Analytics 4 — **รอการตัดสินใจ**

`analytics.js` มีช่อง `GA4_ID` ว่างรออยู่แล้ว · ใส่รหัส `G-XXXXXXXXXX` เมื่อไหร่ สคริปต์ก็จะโหลด
**หลังผู้ใช้กดยอมรับคุกกี้เท่านั้น** (กติกาเดิมของไฟล์นั้น ห้ามแก้)
· ไม่ใส่ = เว็บทำงานปกติทุกอย่าง แค่ไม่มีข้อมูลส่งเข้า Google

**ผมเสนอให้ตัดสินใจโดยเทียบกับสถิติภายในที่มีอยู่แล้ว** — ระบบเก็บ pageview · คลิกปุ่มติดต่อ ·
การส่งฟอร์ม ไว้เองอยู่แล้วโดยไม่มีคุกกี้และไม่ส่งข้อมูลออกนอกบริษัท (ดู `PUBLIC_EVENT_TYPES`)
สิ่งที่ GA4 ให้เพิ่มคือ ผู้ใช้ไม่ซ้ำ · เส้นทางการเข้าชม · ที่มาของทราฟฟิก

### 4.3 Meta Pixel — **ทำงานอยู่แล้ว**

`META_PIXEL_ID = '2478386206003868'` ตั้งไว้แล้วใน `analytics.js` และโหลดหลังผู้ใช้กดยอมรับ
· ถ้าต้องการปิด ให้ลบค่าในตัวแปรนั้นออกเป็นสตริงว่าง

---

## 5. ทางถอยเมื่อมีปัญหา

| อาการ | ทำอะไร |
|---|---|
| เว็บสาธารณะพังหลัง merge | `git revert <commit>` แล้ว push — GitHub Pages เผยแพร่ใหม่ใน ~1 นาที |
| ระบบหลังบ้านพังหลัง deploy | Render → Deploys → เลือก deploy ก่อนหน้า → **Redeploy** |
| หน้าเว็บขึ้นของเก่าค้าง | ขึ้นเลข `CACHE` ใน `public/sw.js` (ระบบหลังบ้าน) · เว็บสาธารณะไม่มี service worker |
| บอตเก็บหน้าที่ไม่ควรเก็บ | เพิ่ม `<meta name="robots" content="noindex">` ในหน้านั้น แล้วสร้าง `sitemap.xml` ใหม่ |
