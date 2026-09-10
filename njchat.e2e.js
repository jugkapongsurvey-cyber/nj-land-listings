/* ทดสอบน้องเอ็นเจชัวร์กับเบราว์เซอร์จริง (Playwright + Chromium) — ไม่ยิงเซิร์ฟเวอร์จริง ไม่ยิง Anthropic
 *   node njchat.e2e.js [path-to-nj-survey-system]
 * เซิร์ฟเวอร์ปลอมในไฟล์นี้ให้เฉพาะ /api/public/listings · /api/public/njchat · /api/public/track
 * และ pricing.js ของจริงจาก repo หลังบ้าน (ตารางราคาต้องเป็นของจริง ไม่ใช่ตัวเลขที่เดา)
 * ⚠️ ไฟล์นี้ไม่ได้อยู่ในชุดเทสต์ประจำ (ต้องมี playwright) — รันด้วยมือก่อน deploy
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const WEB = __dirname;
const SRV = process.argv[2] || path.join(WEB, '..', 'nj-survey-system');
const API_PORT = 8790, WEB_PORT = 8791;

// แปลง 3 ใบที่ต่างกันตรงจุดที่ตรรกะแยกทาง: A ครบทุกช่อง+เอ่ยถึงบ้าน · B ยังไม่ระบุเอกสารสิทธิ์/ผัง · C ต่างจังหวัด
const LISTINGS = [
  { id: 'OP-101', type: 'sell', parcelInfo: 'ที่ดินพร้อมบ้านชั้นเดียว บางบ่อ', estValue: 2500000, totalWa: 850, pricePerWa: 2941, pricePerRai: 1176471, blurb: 'บ้านชั้นเดียว ติดถนนซอย ใกล้ตลาด', photos: [], tier: 2, updatedAt: '2026-09-08T00:00:00Z',
    land: { province: 'สมุทรปราการ', amphoe: 'บางบ่อ', tambon: 'บางบ่อ', deedType: 'chanote', zoneColor: 'yellow', roadSurface: 'concrete', features: ['road', 'electric'], verify: { reached: 2, total: 5 } } },
  { id: 'OP-102', type: 'sell', parcelInfo: 'ที่ดินเปล่า คลองหลวง', estValue: 4000000, totalWa: 400, pricePerWa: 10000, pricePerRai: 4000000, blurb: '', photos: [], tier: 1, updatedAt: '2026-09-07T00:00:00Z',
    land: { province: 'ปทุมธานี', amphoe: 'คลองหลวง', tambon: 'คลองสอง', deedType: '', zoneColor: '', features: [] } },
  { id: 'OP-103', type: 'sell', parcelInfo: 'ที่ดินสวน บ้านค่าย', estValue: 9000000, totalWa: 2000, pricePerWa: 4500, pricePerRai: 1800000, blurb: '', photos: [], tier: 1, updatedAt: '2026-09-06T00:00:00Z',
    land: { province: 'ระยอง', amphoe: 'บ้านค่าย', tambon: 'หนองละลอก', deedType: 'nor3gor', zoneColor: 'green', features: ['road'] } }
];
const aiCalls = [];
const trackCalls = [];

// สะท้อน origin เหมือน setPublicCors() ของจริง — sendBeacon ส่ง credentials มาด้วย ตอบ '*' แล้วเบราว์เซอร์บล็อก
function cors(req, res) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*'); res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS'); }
const api = http.createServer((req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    if (req.url === '/api/public/listings') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ listings: LISTINGS, count: LISTINGS.length })); }
    if (req.url === '/api/public/track') { try { trackCalls.push(JSON.parse(body)); } catch (e) {} res.writeHead(204); return res.end(); }
    if (req.url === '/api/public/njchat') {
      const b = JSON.parse(body || '{}'); aiCalls.push(b);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, text: 'คำตอบจาก AI (สตับ) สำหรับ: ' + b.message }));
    }
    if (req.url === '/pricing.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(fs.readFileSync(path.join(SRV, 'public', 'pricing.js'))); }
    res.writeHead(404); res.end();
  });
});
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const web = http.createServer((req, res) => {
  const p = path.join(WEB, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', MIME[path.extname(p)] || 'application/octet-stream');
  res.end(fs.readFileSync(p));
});

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 300) : '')); }
}

(async () => {
  await new Promise(r => api.listen(API_PORT, '127.0.0.1', r));
  await new Promise(r => web.listen(WEB_PORT, '127.0.0.1', r));
  const browser = await chromium.launch();
  const errors = [];
  async function open(url, width) {
    const ctx = await browser.newContext({ viewport: { width, height: 844 }, locale: 'th-TH' });
    // ตารางราคาจริงของบริษัท — เปลี่ยนทางไปที่เซิร์ฟเวอร์ปลอมแทนการยิงออกเน็ต
    // ⚠️ Playwright จับคู่ route จากตัวที่ลงทะเบียน "หลังสุด" ก่อน — ตัวดักทั่วไปต้องมาก่อน ตัวเจาะจงมาหลัง
    await ctx.route('https://app.njteedinsure.com/**', r => r.fulfill({ status: 404, body: '' }));
    await ctx.route('https://app.njteedinsure.com/pricing.js', r => r.fulfill({ path: path.join(SRV, 'public', 'pricing.js'), contentType: 'application/javascript' }));
    await ctx.route('https://fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await ctx.route(/connect\.facebook\.net|googletagmanager/, r => r.fulfill({ status: 200, body: '' }));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(url + ': ' + e.message));
    // 404 ของรูป/วิดีโอที่ไม่ได้อยู่ในสำเนาทดสอบไม่ใช่ความผิดของโค้ด — นับเฉพาะ error อื่น
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(url + ' console: ' + m.text()); });
    await page.goto('http://localhost:' + WEB_PORT + '/' + url + (url.indexOf('?') >= 0 ? '&' : '?') + 'api=http://127.0.0.1:' + API_PORT, { waitUntil: 'networkidle' });
    return { ctx, page };
  }
  async function ask(page, text) {
    await page.fill('.njchat-input', text);
    await page.press('.njchat-input', 'Enter');
    await page.waitForFunction(() => !document.querySelector('.njchat-typing') && document.querySelectorAll('.njchat-msg.bot').length > 0);
    await page.waitForTimeout(150);
    const bots = page.locator('.njchat-msg.bot');
    return bots.nth(await bots.count() - 1);
  }
  const outDir = path.join(WEB, '__e2e');
  fs.mkdirSync(outDir, { recursive: true });

  // ==================================================================
  console.log('\n1) วิดเจ็ตบนหน้ารวมประกาศ (มือถือ 390px)');
  {
    const { ctx, page } = await open('listings.html', 390);
    check('ปุ่มลอยขึ้น และแผงยังซ่อน', await page.locator('.njchat-launcher').isVisible() && await page.locator('.njchat-panel').isHidden());
    await page.click('.njchat-launcher');
    check('เปิดแผงแล้ว + ข้อความทักทายบอกว่าเป็น AI', await page.locator('.njchat-panel').isVisible() && /AI/.test(await page.locator('.njchat-msg.bot').first().innerText()));
    await page.waitForTimeout(300);
    check('ยิงสถิติ chat_open (ไม่ใช่ลีด)', trackCalls.some(t => t.type === 'chat_open'), JSON.stringify(trackCalls));
    await page.screenshot({ path: path.join(outDir, '01-mobile-open.png') });

    // สถานการณ์ตามโจทย์ของเจ้าของ
    let last = await ask(page, 'ต้องการบ้านที่มีสิ่งปลูกสร้าง 1 ชั้น ในกรุงเทพฯปริมณฑล ส่งมาให้ฉันดูเปรียบเทียบ มีกี่หลัง');
    let txt = await last.innerText();
    check('บอกตามจริงว่าประกาศยังไม่มีช่องจำนวนชั้น (ไม่แต่งข้อมูล)', /ยังไม่มีช่อง/.test(txt) && /1 ชั้น/.test(txt), txt);
    const cards = last.locator('.njchat-cards .land-card');
    check('คัดตามพื้นที่ กทม.+ปริมณฑล = 2 แปลง (A สป. + B ปทุม) แล้วเจาะแปลงที่เอ่ยถึงบ้าน = 1', /พบ 2 แปลง/.test(txt) && /แสดง 1 แปลงที่เอ่ยถึงสิ่งปลูกสร้าง/.test(txt) && await cards.count() === 1, txt + ' cards=' + await cards.count());
    check('โจทย์ขอ "เปรียบเทียบ" แต่เหลือแปลงเดียว = ไม่มีตารางเทียบ (ไม่เทียบกับของที่ไม่ตรงโจทย์)', await last.locator('.njchat-table').count() === 0);
    check('การ์ดใช้ตัวเรนเดอร์กลาง (มีป้ายรังวัดยืนยันแล้ว + ราคา + ตร.ว.)', /รังวัดยืนยันแล้ว/.test(await cards.first().innerText()) && /฿2,500,000/.test(await cards.first().innerText()) && /2,941\/ตร\.ว\./.test(await cards.first().innerText()), await cards.first().innerText());
    check('ปุ่ม "เทียบ" ของ compare.js ถูกแปะบนการ์ดในแชท', await cards.first().locator('.njcmp-btn').count() === 1);
    await page.screenshot({ path: path.join(outDir, '02-mobile-search.png'), fullPage: false });

    last = await ask(page, 'หาที่ดินในกรุงเทพฯ ปริมณฑล ไม่เกิน 5 ล้าน');
    txt = await last.innerText();
    check('ค้นด้วยงบ: พบ 2 แปลง (ระยองตกไป) และไม่มีข้อความเรื่องชั้น', /พบ 2 แปลง/.test(txt) && !/จำนวนชั้น/.test(txt) && await last.locator('.land-card').count() === 2, txt);
    last = await ask(page, 'เปรียบเทียบแปลงเหล่านี้');
    txt = await last.innerText();
    const rows = last.locator('.njchat-table tr');
    check('ตารางเทียบในแชท 2 คอลัมน์ + "—" สำหรับช่องที่ยังไม่ระบุ', /เทียบ 2 แปลง/.test(txt) && await rows.count() >= 9 && (await last.locator('.njchat-none').count()) >= 2, txt);
    const stored = await page.evaluate(() => sessionStorage.getItem('njCompare'));
    check('เขียนรายการเทียบผ่าน NJCompare (sessionStorage njCompare)', stored && JSON.parse(stored).length === 2 && await page.locator('.njcmp-bar').isVisible(), stored);
    await page.screenshot({ path: path.join(outDir, '03-mobile-compare.png') });

    last = await ask(page, 'เฉพาะที่มีโฉนด');
    txt = await last.innerText();
    check('กรองต่อจากโจทย์เดิม: โฉนด = 1 แปลง + บอกว่าอีก 1 แปลงยังไม่ระบุ', /พบ 1 แปลง/.test(txt) && /อีก 1 แปลงไม่ได้แสดง/.test(txt), txt);

    last = await ask(page, 'ที่ดินแถวบางบ่อ');
    txt = await last.innerText();
    check('จับชื่ออำเภอจากข้อมูลจริงได้ (บางบ่อ = 1 แปลง)', /พบ 1 แปลง/.test(txt) && await last.locator('.land-card').count() === 1, txt);

    last = await ask(page, 'ค่ารังวัดสอบเขต เท่าไหร่');
    txt = await last.innerText();
    check('ไม่รู้เนื้อที่ → ถามเนื้อที่ก่อน (ไม่เดาราคา)', /เนื้อที่ประมาณเท่าไหร่/.test(txt) && !/฿/.test(txt), txt);
    last = await ask(page, '2 ไร่ ที่เชียงใหม่ 3 โฉนด');
    txt = await last.innerText();
    // 2 ไร่ สอบเขต = 25,000 · โฉนด 3 ใบ = +10,000 · เชียงใหม่ โซน F 60,000 + ค้าง 3 คืน 12,000 = 72,000 → 107,000 (ตาม pricing.js)
    const P = require(path.join(SRV, 'public', 'pricing.js'));
    const zi = P.TRAVEL_ZONES.find(z => z.code === P.zoneOf('เชียงใหม่'));
    const exp = P.computeQuote({ jobType: 'สอบเขต', rai: 2, deeds: 3, splitPlots: 0, vatRate: 0, fees: [], travel: { province: 'เชียงใหม่', zone: zi.code, nights: zi.nights } });
    const fmt = n => '฿' + Math.round(n).toLocaleString('th-TH');
    check('คำนวณจาก pricing.js จริง: ตั้งต้น ' + fmt(exp.base) + ' · โฉนด ' + fmt(exp.deed) + ' · เดินทาง ' + fmt(exp.travelTotal) + ' · รวม ' + fmt(exp.subtotal),
      txt.indexOf(fmt(exp.base)) >= 0 && txt.indexOf(fmt(exp.deed)) >= 0 && txt.indexOf(fmt(exp.travelTotal)) >= 0 && txt.indexOf('รวมประมาณ ' + fmt(exp.subtotal)) >= 0 && /ประมาณการ/.test(txt), txt);
    check('ตัวเลขตรงกับใบเสนอราคาหลังบ้าน (25,000 + 10,000 + 72,000 = 107,000)', exp.base === 25000 && exp.deed === 10000 && exp.travelTotal === 72000 && exp.subtotal === 107000, JSON.stringify({ base: exp.base, deed: exp.deed, travel: exp.travelTotal, sub: exp.subtotal }));
    last = await ask(page, 'ถ้าเป็นแบ่งแยกโฉนดล่ะ');
    txt = await last.innerText();
    const exp2 = P.computeQuote({ jobType: 'รวม-แบ่งแยก', rai: 2, deeds: 3, splitPlots: 0, vatRate: 0, fees: [], travel: { province: 'เชียงใหม่', zone: zi.code, nights: zi.nights } });
    check('เปลี่ยนประเภทงานโดยจำเนื้อที่/จังหวัดเดิม: ' + fmt(exp2.subtotal), txt.indexOf('รวมประมาณ ' + fmt(exp2.subtotal)) >= 0 && /แบ่งแยก/.test(txt), txt);
    await page.screenshot({ path: path.join(outDir, '04-mobile-quote.png') });

    last = await ask(page, 'ขั้นตอนฝากขายที่ดิน');
    txt = await last.innerText();
    check('ขั้นตอนฝากขาย + ค่านายหน้า 3% + ลิงก์ฟอร์ม', /3%/.test(txt) && /1 วันทำการ/.test(txt) && await last.locator('a[href="consign.html"]').count() === 1, txt);
    last = await ask(page, 'เตรียมเอกสารอะไรบ้าง');
    check('เอกสารรังวัด', /โฉนดที่ดินฉบับจริง/.test(await last.innerText()));
    last = await ask(page, 'ค่าโอนมีอะไรบ้าง');
    check('ค่าโอน → ลิงก์เครื่องคำนวณ ไม่พิมพ์ตัวเลขเอง', await last.locator('a[href="guides.html#calc"]').count() === 1 && !/%/.test(await last.innerText()));
    last = await ask(page, 'เป็นบอทเหรอ');
    check('ถามว่าเป็นบอท → ตอบตรงว่าเป็น AI', /เป็น AI/.test(await last.innerText()));

    const before = aiCalls.length;
    last = await ask(page, 'ที่ดินแปลงนี้น้ำท่วมไหมช่วงหน้าฝน');
    txt = await last.innerText();
    check('นอกกฎ → ส่งให้ AI ผ่านเซิร์ฟเวอร์ (มีประวัติ + page) และติดป้าย "ตอบโดย AI"', aiCalls.length === before + 1 && aiCalls[before].page === 'listings.html' && aiCalls[before].history.length > 0 && /สตับ/.test(txt) && /ตอบโดย AI/.test(txt), txt);
    last = await ask(page, 'คุยกับเจ้าหน้าที่');
    check('ปุ่มคุยกับเจ้าหน้าที่ 3 ช่องทาง + data-contact', await last.locator('[data-contact="line"]').count() === 1 && await last.locator('[data-contact="tel"]').count() === 1);
    await last.locator('[data-contact="tel"]').evaluate(a => { a.setAttribute('href', '#'); });
    await last.locator('[data-contact="tel"]').click();
    await page.waitForTimeout(200);
    check('กดโทรในแชท → นับ tel_click (กติกาข้อ 6)', trackCalls.some(t => t.type === 'tel_click'));
    const hist = await page.evaluate(() => JSON.parse(sessionStorage.getItem('njchat') || '[]').length);
    check('ประวัติเก็บใน sessionStorage', hist >= 10, hist);
    await page.keyboard.press('Escape');
    check('Escape ปิดแผง', await page.locator('.njchat-panel').isHidden());
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check('ไม่ล้นแนวนอนที่ 390px', !overflow);
    await ctx.close();
  }

  // ==================================================================
  console.log('\n2) หน้าเต็ม chat.html (1440px) + ?q=');
  {
    const { ctx, page } = await open('chat.html?q=' + encodeURIComponent('หาที่ดินในปทุมธานี'), 1440);
    await page.waitForFunction(() => !document.querySelector('.njchat-typing') && document.querySelectorAll('.njchat-msg.bot').length >= 2);
    check('ไม่มีปุ่มลอยในหน้าเต็ม และแผงฝังในหน้า', await page.locator('.njchat-launcher').count() === 0 && await page.locator('#njchat-page.njchat-full').isVisible());
    const bots = page.locator('.njchat-msg.bot');
    const txt = await bots.nth(await bots.count() - 1).innerText();
    check('?q= เริ่มถามทันที: ปทุมธานี 1 แปลง', /พบ 1 แปลง/.test(txt), txt);
    check('ปี พ.ศ. ท้ายหน้าถูกเติม', /^25\d\d$/.test(await page.locator('#year').innerText()));
    check('เมนูหลักและฟุตเตอร์เหมือนหน้าอื่น', await page.locator('header.topbar nav a').count() === 7 && await page.locator('footer#contact').count() === 1);
    await page.screenshot({ path: path.join(outDir, '05-desktop-fullpage.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    check('หน้าเต็มบนจอเล็กมีปุ่มแฮมเบอร์เกอร์ (menu.js)', await page.locator('.njmenu-btn').isVisible());
    check('ไม่ล้นแนวนอนที่ 390px (หน้าเต็ม)', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)));
    await ctx.close();
  }

  // ==================================================================
  console.log('\n3) วิดเจ็ตบนหน้าอื่นทุกหน้า (หน้าแรก · ฝากขาย ui.css · คู่มือ) ที่ 1440px');
  for (const u of ['index.html', 'consign.html', 'guides.html', 'wanted.html', 'verify.html', 'portal.html', 'videos.html', 'compare.html', 'land.html?id=OP-101']) {
    const { ctx, page } = await open(u, 1440);
    const ok = await page.locator('.njchat-launcher').isVisible();
    await page.click('.njchat-launcher');
    const last = await ask(page, 'หาที่ดินในสมุทรปราการ');
    const cardOk = await last.locator('.land-card').count() === 1;
    const box = await last.locator('.land-card').first().boundingBox();
    check(u + ': ปุ่มลอย + ค้นแปลงได้ + การ์ดมีสไตล์ (สูง > 200px)', ok && cardOk && box && box.height > 200, JSON.stringify(box));
    if (u === 'consign.html') await page.screenshot({ path: path.join(outDir, '06-consign-widget.png') });
    // ปุ่มลอยต้องไม่ทับแบนเนอร์ยินยอมและอยู่ต่ำกว่าลิ้นชักเมนู (z-index)
    const z = await page.evaluate(() => [getComputedStyle(document.querySelector('.njchat-launcher')).zIndex, getComputedStyle(document.querySelector('.njchat-panel')).zIndex]);
    check(u + ': z-index ปุ่ม 790 / แผง 890 (< 900)', z[0] === '790' && z[1] === '890', z.join('/'));
    await ctx.close();
  }

  // ==================================================================
  console.log('\n4) API ล่ม → บอกว่าโหลดไม่สำเร็จ ไม่ใช่ "ไม่มีแปลง"');
  {
    const { ctx, page } = await open('guides.html', 1000);
    await ctx.route('http://127.0.0.1:' + API_PORT + '/api/public/listings', r => r.fulfill({ status: 500, body: '' }));
    await page.click('.njchat-launcher');
    const last = await ask(page, 'หาที่ดินในระยอง');
    check('ข้อความ "โหลดรายการที่ดินไม่สำเร็จ" + เบอร์โทร', /โหลดรายการที่ดินไม่สำเร็จ/.test(await last.innerText()) && /02-162-0405/.test(await last.innerText()));
    await ctx.close();
  }
  {
    const { ctx, page } = await open('guides.html', 1000);
    await ctx.route('http://127.0.0.1:' + API_PORT + '/api/public/listings', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ listings: [], count: 0 }) }));
    await page.click('.njchat-launcher');
    const last = await ask(page, 'หาที่ดินในระยอง');
    check('count:0 → "ยังไม่มีแปลงที่ประกาศอยู่" + ชวนฝากหา (คนละข้อความกับโหลดไม่สำเร็จ)', /ยังไม่มีแปลงที่ประกาศอยู่/.test(await last.innerText()) && await last.locator('a[href="wanted.html"]').count() === 1);
    await ctx.route('http://127.0.0.1:' + API_PORT + '/api/public/njchat', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: false, reason: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY' }) }));
    const l2 = await ask(page, 'น้ำท่วมไหม');
    check('AI ใช้ไม่ได้ → ถอยไปให้ทักไลน์/โทร ไม่พัง', /ทีมงานตอบดีกว่า/.test(await l2.innerText()) && /02-162-0405/.test(await l2.innerText()));
    await ctx.close();
  }

  check('ไม่มี page error / console error', errors.length === 0, errors.join(' | '));
  await browser.close();
  api.close(); web.close();
  console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail + '  (ภาพหน้าจอใน __e2e/)');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
