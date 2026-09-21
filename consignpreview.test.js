/* ตัวอย่างประกาศแบบสดข้างฟอร์มฝากขาย (consignpreview.js) · เพิ่ม 2026-09-21
 *   รันด้วย:  node consignpreview.test.js
 *
 * ทำไมต้องมีเทสต์นี้: กล่องนี้คือที่เดียวในเว็บที่ "วาดประกาศจากข้อมูลที่ยังไม่ได้ตรวจ"
 * ซึ่งชนกับกติกาที่แพงที่สุดของโปรเจกต์โดยตรง —
 *   ข้อ 4  ห้ามมีแปลงตัวอย่างที่อ่านแล้วเข้าใจว่าเป็นประกาศจริง
 *   ข้อ 5  ห้ามเติมข้อความแทนช่องที่ยังไม่มีข้อมูล
 *   ข้อ 10 ห้ามขึ้นป้าย "รังวัดยืนยันแล้ว" กับแปลงที่ยังไม่ได้รังวัด
 * ข้อพวกนี้พังแบบเงียบๆ ได้ทั้งหมด (ไม่มี error ให้เห็น) จึงต้องล็อกด้วยเทสต์
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const P = require('./consignpreview.js');
const HERE = __dirname;
const read = (f) => fs.readFileSync(path.join(HERE, f), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '  → ' + String(extra).slice(0, 200) : '')); }
}
function head(t) { console.log('\n' + t); }

// ค่าตั้งต้นของฟอร์มเปล่า — เทสต์แต่ละข้อทับเฉพาะช่องที่สนใจ
function V(over) {
  return Object.assign({
    type: 'sell', title: '', province: '',
    areaText: '', totalWa: 0,
    priceUnit: 'wa', unitPrice: 0, estValue: 0,
    note: '', surveyOpt: 'undecided',
    saved: false, photos: 0, photo: null,
    live: false, cancelled: false
  }, over || {});
}
// แปลงที่กรอกครบทุกช่องแล้ว
function FULL(over) {
  return V(Object.assign({
    province: 'ระยอง',
    title: 'ต.เชิงเนิน อ.เมืองระยอง จ.ระยอง · 2-1-50 ไร่',
    areaText: '2-1-50 ไร่', totalWa: 950,
    priceUnit: 'wa', unitPrice: 25000, estValue: 23750000,
    note: 'ติดถนนลาดยาง มีไฟฟ้าถึง',
    saved: true, photos: 2, photo: { url: 'https://x/a.jpg', pending: false }
  }, over || {}));
}

// ============================================================================
head('1) เขียนราคาเหมือนการ์ดประกาศจริง (contract ข้ามไฟล์)');
// ⚠️ ข้อนี้คือเหตุผลที่ยอมให้ money() มีสองที่ — ตราบใดที่เทสต์นี้ยังรัน สองที่จะไม่เลื่อนออกจากกัน
// (บทเรียนเดียวกับ contracts.test.js: ของสองฝั่งเลื่อนออกจากกันโดยไม่มี error ให้เห็น)
{
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(read('listingcard.js'), sandbox, { filename: 'listingcard.js' });
  const cardMoney = sandbox.window.NJListing && sandbox.window.NJListing.money;
  check('โหลด NJListing.money จาก listingcard.js ได้', typeof cardMoney === 'function');
  [0, 1, 950, 25000, 1234567, 23750000, null, undefined, NaN].forEach((n) => {
    check('money(' + String(n) + ') ตรงกับการ์ดจริง', P.money(n) === cardMoney(n),
      P.money(n) + ' vs ' + cardMoney(n));
  });
  check('ไม่มีราคา = "ราคาติดต่อสอบถาม" ไม่ใช่ ฿0', P.money(0) === 'ราคาติดต่อสอบถาม', P.money(0));
}

// ============================================================================
head('2) ยังไม่กรอกอะไร / ขึ้นเว็บแล้ว / ยกเลิกแล้ว = ไม่แสดงกล่องเลย');
check('ฟอร์มเปล่า → show=false', P.model(V()).show === false);
check('ฟอร์มเปล่า → reason=empty', P.model(V()).reason === 'empty');
// ชื่อกับเบอร์ไม่ได้ขึ้นประกาศ จึงไม่นับว่า "เริ่มกรอกประกาศแล้ว"
check('started() ไม่นับชื่อ/เบอร์', P.started(V({ name: 'สมชาย', phone: '0812345678' })) === false);
check('ใส่จังหวัดแล้ว → show=true', P.model(V({ province: 'ระยอง' })).show === true);
check('ใส่เนื้อที่แล้ว → show=true', P.model(V({ totalWa: 400 })).show === true);
check('ใส่ราคาแล้ว → show=true', P.model(V({ unitPrice: 9000 })).show === true);
check('เขียนจุดเด่นแล้ว → show=true', P.model(V({ note: 'ติดถนน' })).show === true);
// กติกาข้อ 5 หัวไฟล์ — มีของจริงให้ดูแล้ว ตัวอย่างต้องหลบ
check('ประกาศขึ้นเว็บแล้ว → show=false', P.model(FULL({ live: true })).show === false);
check('ขึ้นเว็บแล้ว → reason=live', P.model(FULL({ live: true })).reason === 'live');
check('ยกเลิกฝากขายแล้ว → show=false', P.model(FULL({ cancelled: true })).show === false);
check('การ์ดของกล่องที่ไม่แสดง = สตริงว่าง ไม่ใช่กล่องเปล่า', P.cardHtml(P.model(V())) === '');
check('รายการที่ขาดของกล่องที่ไม่แสดง = สตริงว่าง', P.todoHtml(P.model(V())) === '');

// ============================================================================
head('3) ⛔ ห้ามขึ้นป้าย "รังวัดยืนยันแล้ว" (กติกาข้อ 10)');
['yes', 'no', 'undecided'].forEach((opt) => {
  const html = P.cardHtml(P.model(FULL({ surveyOpt: opt })));
  const tier = (html.match(/<span class="cs-pv-tier">([^<]*)<\/span>/) || [])[1];
  check('surveyOpt=' + opt + ' → ป้ายเป็น "◐ ข้อมูลเบื้องต้น"', tier === P.BADGE_BASIC, tier);
  check('surveyOpt=' + opt + ' → ไม่มีคลาสป้ายเขียว', html.indexOf('verified') < 0);
});
{
  // เลือก "ต้องการรังวัด" ต้องพูดถึงป้ายเขียวเป็น "สิ่งที่จะเกิด" ไม่ใช่ "สิ่งที่เป็นแล้ว"
  const line = P.SURVEY_LINE.yes;
  check('ข้อความของ yes บอกว่ายังไม่ใช่ตอนนี้', /ยังไม่ใช่ตอนนี้/.test(line), line);
  check('ข้อความของ yes บอกเงื่อนไขว่าต้องรังวัดเสร็จจริงก่อน', /เสร็จจริง/.test(line), line);
  check('มีข้อความครบทั้งสามตัวเลือก',
    !!(P.SURVEY_LINE.yes && P.SURVEY_LINE.no && P.SURVEY_LINE.undecided));
  // ค่าที่ไม่รู้จัก (เช่นเซิร์ฟเวอร์เพิ่มตัวเลือกใหม่) ต้องถอยไปข้อความกลางๆ ไม่ใช่ undefined
  check('surveyOpt แปลกปลอม → ถอยไปข้อความ "ยังไม่ได้ตัดสินใจ"',
    P.model(FULL({ surveyOpt: 'zzz' })).surveyLine === P.SURVEY_LINE.undecided);
}

// ============================================================================
head('4) ห้ามเติมข้อความแทนช่องที่ยังไม่มีข้อมูล (กติกาข้อ 5)');
{
  const html = P.cardHtml(P.model(V({ province: 'ระยอง' })));
  ['ที่ดินเปล่า', 'โฉนด', 'มีทางเข้าออก', 'ตรวจสอบเนื้อที่แล้ว', 'รังวัดยืนยันแล้ว']
    .forEach((w) => check('ไม่มีคำว่า "' + w + '" บนการ์ดที่ยังไม่มีข้อมูล', html.indexOf(w) < 0));
  check('ไม่มีเนื้อที่ = ไม่ขึ้นบรรทัดเนื้อที่', html.indexOf('cs-pv-meta') < 0);
  check('ไม่มีจุดเด่น = ไม่ขึ้นบรรทัดจุดเด่น', html.indexOf('cs-pv-blurb') < 0);
  check('ไม่มีราคา = "ราคาติดต่อสอบถาม"', html.indexOf('ราคาติดต่อสอบถาม') >= 0);
  check('ไม่มีรูป = บอกตรงๆ ว่ายังไม่มีรูป', html.indexOf('ยังไม่มีรูป') >= 0);
  check('ยังไม่กรอกที่ตั้ง = บอกว่ายังไม่ได้กรอก ไม่ใช่ตั้งชื่อให้เอง',
    P.cardHtml(P.model(V({ totalWa: 400 }))).indexOf('ยังไม่ได้กรอกที่ตั้ง') >= 0);
}
// "ยังไม่แน่ใจ" ห้ามกลายเป็น "ขาย"
check('type=sell → ขาย', P.typeLabel('sell') === 'ขาย');
check('type=rent → ให้เช่า', P.typeLabel('rent') === 'ให้เช่า');
check('type=survey_first ไม่ใช่ "ขาย"', P.typeLabel('survey_first') !== 'ขาย', P.typeLabel('survey_first'));
check('type=survey_first บอกว่ายังไม่สรุป', /ยังไม่สรุป/.test(P.typeLabel('survey_first')));

// ============================================================================
head('5) ราคาต่อหน่วยสะท้อนสิ่งที่เจ้าของพิมพ์ ไม่หารเอง (กติกาข้อ 5)');
check('ต่อ ตร.ว.', P.unitText(V({ priceUnit: 'wa', unitPrice: 25000 })) === '฿25,000/ตร.ว.',
  P.unitText(V({ priceUnit: 'wa', unitPrice: 25000 })));
check('ต่อไร่', P.unitText(V({ priceUnit: 'rai', unitPrice: 10000000 })) === '฿10,000,000/ไร่',
  P.unitText(V({ priceUnit: 'rai', unitPrice: 10000000 })));
// รวมทั้งแปลง = ตัวเลขเดียวกับราคาพาดหัว เขียนซ้ำคือบอกเลขเดิมสองรอบ
check('รวมทั้งแปลง → ไม่มีบรรทัดต่อหน่วย', P.unitText(V({ priceUnit: 'total', unitPrice: 5000000 })) === '');
check('ยังไม่ใส่ราคา → ไม่มีบรรทัดต่อหน่วย', P.unitText(V({ unitPrice: 0 })) === '');
{
  // กรอกราคาต่อหน่วยแต่ยังไม่กรอกเนื้อที่ = คำนวณราคารวมไม่ได้ (กติกาข้อ 11)
  // ห้ามเดาเป็นราคารวม · ราคาพาดหัวต้องเป็น "ราคาติดต่อสอบถาม" ไม่ใช่ ฿0 และไม่ใช่ ฿25,000
  const m = P.model(V({ unitPrice: 25000, estValue: 0 }));
  check('ราคาต่อหน่วยอย่างเดียว → พาดหัวไม่เดาราคารวม', m.price === 'ราคาติดต่อสอบถาม', m.price);
  check('แต่ยังโชว์ตัวเลขที่เขาพิมพ์ไว้', m.bits.indexOf('฿25,000/ตร.ว.') >= 0, JSON.stringify(m.bits));
}

// ============================================================================
head('6) รายการ "ยังเติมอะไรได้อีก"');
{
  const keys = (v) => P.missing(v).map((t) => t.key);
  check('ฟอร์มเปล่า → ขาดครบทั้ง 5 ข้อ',
    keys(V()).join(',') === 'province,area,price,photo,note', keys(V()).join(','));
  check('กรอกครบแล้ว → ไม่เหลืออะไร', keys(FULL()).length === 0, keys(FULL()).join(','));
  check('ใส่จังหวัดแล้ว → ที่ตั้งหลุดจากรายการ', keys(V({ province: 'ระยอง' })).indexOf('province') < 0);
  check('ใส่เนื้อที่แล้ว → เนื้อที่หลุดจากรายการ', keys(V({ totalWa: 400 })).indexOf('area') < 0);
  check('แนบรูปแล้ว → รูปหลุดจากรายการ', keys(V({ photos: 1 })).indexOf('photo') < 0);
  // ช่องแนบรูปเปิดหลังบันทึกเท่านั้น — คำชวนต้องต่างกันตามสถานะจริง ไม่งั้นชี้ไปที่ช่องที่ยังไม่มี
  const before = P.missing(V()).filter((t) => t.key === 'photo')[0].why;
  const after = P.missing(V({ saved: true })).filter((t) => t.key === 'photo')[0].why;
  check('ยังไม่บันทึก → บอกให้กดบันทึกก่อน', /บันทึก/.test(before), before);
  check('บันทึกแล้ว → ชี้ไปที่ช่องแนบรูปด้านล่าง', before !== after && /ด้านล่าง/.test(after), after);
  // กติกาข้อ 5: ห้ามเขียนจำนวนรูปขั้นต่ำ
  P.missing(V()).forEach((t) => {
    check('ข้อ "' + t.label + '" ไม่ระบุจำนวนรูปขั้นต่ำ', !/\d+\s*(รูป|ใบ)/.test(t.why), t.why);
  });
}
// กติกาข้อ 6 หัวไฟล์ — เป็นคำชวน ไม่ใช่ช่องบังคับ
check('หัวรายการบอกว่าข้ามได้ ไม่ได้บังคับ', /ไม่ได้บังคับ/.test(P.TODO_LEAD), P.TODO_LEAD);
['ต้องกรอก', 'จำเป็นต้อง', 'ห้ามเว้น'].forEach((w) => {
  check('หัวรายการไม่มีคำว่า "' + w + '"', P.TODO_LEAD.indexOf(w) < 0);
});
check('กรอกครบ → ขึ้นข้อความว่าครบแล้ว', P.todoHtml(P.model(FULL())).indexOf(P.READY_TEXT) >= 0);
check('ยังไม่ครบ → ไม่ขึ้นข้อความว่าครบแล้ว',
  P.todoHtml(P.model(V({ province: 'ระยอง' }))).indexOf(P.READY_TEXT) < 0);

// ============================================================================
head('7) รูปที่ทีมงานยังไม่ได้ตรวจต้องติดป้ายบอก');
{
  const okHtml = P.cardHtml(P.model(FULL({ photo: { url: 'https://x/a.jpg', pending: false } })));
  const waitHtml = P.cardHtml(P.model(FULL({ photo: { url: 'https://x/a.jpg', pending: true } })));
  check('ตรวจแล้ว → ไม่มีป้ายรอตรวจ', okHtml.indexOf(P.PHOTO_PENDING) < 0);
  check('รอตรวจ → มีป้ายรอตรวจบนรูป', waitHtml.indexOf(P.PHOTO_PENDING) >= 0);
  check('รูปใช้ loading=lazy', okHtml.indexOf('loading="lazy"') >= 0);
  // รูปแปลงของลูกค้าไม่ควรถูกอ่านออกเสียงด้วยชื่อไฟล์ — ปล่อย alt ว่างให้เป็นภาพประกอบ
  check('รูปมี alt ว่าง (ภาพประกอบ ไม่ใช่ข้อมูล)', okHtml.indexOf('alt=""') >= 0);
}

// ============================================================================
head('8) ข้อความจากผู้ใช้ต้องถูกหนีอักขระเสมอ');
{
  const evil = '<script>alert(1)</script>';
  const html = P.cardHtml(P.model(V({ province: 'x', title: evil, note: evil, areaText: evil })));
  check('ไม่มี <script> หลุดออกมาเป็น element', html.indexOf('<script') < 0);
  check('ถูกแปลงเป็น &lt;script&gt;', html.indexOf('&lt;script&gt;') >= 0);
  const todo = P.todoHtml(P.model(V({ province: evil })));
  check('รายการที่ขาดก็หนีอักขระเหมือนกัน', todo.indexOf('<script') < 0);
  check('รูปที่ url แปลกปลอมไม่หลุดออกจาก attribute',
    P.cardHtml(P.model(V({ province: 'x', photo: { url: '" onerror="x', pending: false } })))
      .indexOf('onerror="x"') < 0);
}

// ============================================================================
head('9) ไฟล์ตรรกะต้องบริสุทธิ์ (ทดสอบด้วย node ได้โดยไม่มี DOM)');
{
  const src = read('consignpreview.js');
  const body = src.replace(/typeof window !== 'undefined' \? window : null/g, '');
  check('ไม่เรียก document', body.indexOf('document') < 0);
  check('ไม่ยิงเน็ตเอง', src.indexOf('fetch(') < 0 && src.indexOf('XMLHttpRequest') < 0);
  check('ไม่แตะ localStorage', src.indexOf('localStorage') < 0);
  // กติกาข้อ 3 หัวไฟล์ — ข้อความ "ยังไม่เผยแพร่" ห้ามถอด
  check('มี DRAFT_NOTE และพูดถึงหนังสือยินยอม',
    /ยินยอม/.test(P.DRAFT_NOTE) && /ยังไม่ได้เผยแพร่/.test(P.DRAFT_NOTE), P.DRAFT_NOTE);
}

// ============================================================================
head('10) หน้าฝากขายต่อสายไว้ถูกต้อง');
{
  const html = read('consign.html');
  const a = html.indexOf('src="consignpreview.js"');
  const b = html.indexOf('src="consign.js"');
  check('consign.html โหลด consignpreview.js', a >= 0);
  check('โหลดก่อน consign.js', a >= 0 && b >= 0 && a < b);
  ['id="cs-preview"', 'id="cs-pv-card"', 'id="cs-pv-todo"'].forEach((id) => {
    check('มี ' + id, html.indexOf(id) >= 0);
  });
  // ซ่อนใน HTML แล้วให้ JS เปิด — ไฟล์โหลดไม่สำเร็จจะได้ไม่มีกรอบเปล่าค้างกลางฟอร์ม
  check('กล่องถูกซ่อนไว้ใน HTML', /id="cs-preview"[^>]*\shidden/.test(html));
  // กล่องนี้เปลี่ยนทุกครั้งที่พิมพ์ — ประกาศให้โปรแกรมอ่านหน้าจอทุกรอบคือเสียงรบกวน
  check('ไม่มี aria-live ที่กล่องตัวอย่าง', !/id="cs-preview"[^>]*aria-live/.test(html));
  check('วางไว้ก่อนกล่องรังวัด', html.indexOf('id="cs-preview"') < html.indexOf('id="cs-survey"'));
  check('บนหน้ามีข้อความว่ายังไม่ได้เผยแพร่', html.indexOf('ยังไม่ได้เผยแพร่ที่ไหนทั้งสิ้น') >= 0);

  const js = read('consign.js');
  check('consign.js มี livePreview()', /function livePreview\(/.test(js));
  check('เทียบ HTML เดิมก่อนเขียน (กับดัก MutationObserver)', /lastCard/.test(js) && /lastTodo/.test(js));
  check('startNewParcel ล้างการ์ดของแปลงก่อนหน้า', /PV\.reset\(\)/.test(js));
  check('setLead วาดใหม่ให้ด้วย', /PV\.paint\(\)/.test(js));

  const css = read('ui.css');
  check('ui.css มีสไตล์ .cs-pv-tier', css.indexOf('.cs-pv-tier') >= 0);
  // .cs-preview ห้ามมี display ของตัวเอง ไม่งั้นชนะกฎ [hidden] แล้วกล่องโผล่ทั้งที่สั่งซ่อน
  check('.cs-preview ไม่ตั้ง display เอง',
    !/\.cs-preview\{[^}]*display:/.test(css.replace(/\s+/g, '')));
  check('ยังมีกฎ [hidden]{display:none !important}', /\[hidden\]\{display:none !important\}/.test(css));

  const lint = read(path.join('build', 'lint.js'));
  check('build/lint.js ล็อกลำดับสคริปต์ไว้แล้ว',
    /'consignpreview\.js', *'consign\.js'/.test(lint));
}

// ============================================================================
console.log('\n' + (fail ? '✗' : '✓') + ' ผ่าน ' + pass + ' ข้อ · ไม่ผ่าน ' + fail + ' ข้อ');
process.exit(fail ? 1 : 0);
