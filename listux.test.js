// ทดสอบหน้ารวมประกาศรุ่นค้นหาแบบ DDproperty (10 ต.ค. 69) — แถบชิป · แผงตัวกรอง · แผนที่ · ปุ่มแจ้งเตือน · หัวข้อการ์ดบรรทัดเดียว
// รันด้วย:  node listux.test.js
// ⚠️ ไม่พึ่งไลบรารีภายนอก (repo นี้ไม่มี package.json) — DOM ปลอมเขียนเองใน node:vm เท่าที่จำเป็น
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}

const html = read('listings.html');
const js = read('listings.js');
const css = read('listings.css');
const lcCss = read('listingcard.css');
const lm = read('listmap.js');

console.log('\n1) โครงหน้า listings.html');
const formHtml = (html.match(/<form class="ls-filters" id="ls-form"[\s\S]*?<\/form>/) || [''])[0];
ok('มีแผงตัวกรอง #ls-form', !!formHtml);
// ⭐ ห้ามตัดตัวกรองไหนทิ้ง — ช่องเดิมทุกตัวยังอยู่ในแผง
['f-type', 'f-province', 'f-pmin', 'f-pmax', 'f-amin', 'f-amax', 'f-prop', 'f-floors', 'f-deed', 'f-zone', 'f-features', 'f-saved', 'f-reset']
  .forEach(id => ok('⭐ ตัวกรองเดิมยังอยู่ในแผง: #' + id, formHtml.indexOf('id="' + id + '"') >= 0));
ok('ช่องคำค้นอยู่แถวบนสุด นอกแผง (เห็นในจอแรกเสมอ)', /id="ls-qform"[\s\S]*id="f-q"/.test(html) && formHtml.indexOf('id="f-q"') < 0);
ok('ตัวเรียงลำดับอยู่แถวผลลัพธ์ นอกแผง', /class="ls-bar"[\s\S]*id="f-sort"/.test(html) && formHtml.indexOf('id="f-sort"') < 0);
const chipsHtml = (html.match(/<div class="ls-chips"[\s\S]*?<\/div>/) || [''])[0];
ok('⭐ แถบชิปซ่อนไว้จนกว่า JS ทำงาน (hidden)', /<div class="ls-chips" id="ls-chips"[^>]*\shidden>/.test(html));
['province', 'price', 'area', 'zone', 'prop', 'type'].forEach(k => ok('ชิป ' + k, chipsHtml.indexOf('data-chip="' + k + '"') >= 0));
ok('ปุ่ม "ตัวกรอง" ยังเป็น #ls-open + aria-expanded ใน HTML', /id="ls-open"[^>]*aria-expanded="false"/.test(chipsHtml) && /aria-controls="ls-form"/.test(chipsHtml));
ok('ตัวเลขตัวกรองที่ใช้อยู่ (#ls-open-n)', chipsHtml.indexOf('id="ls-open-n"') >= 0);
ok('⭐ ปุ่มแจ้งเตือนชี้ wanted.html (notify.html เป็นหน้าตั้งค่าด้วยโทเคน ไม่ใช่หน้าสมัคร)',
  /id="ls-alert" href="wanted\.html\?from=listings"/.test(html) && !/href="notify\.html/.test(html));
ok('สวิตช์แผนที่ซ่อนไว้จนรู้ว่ามีหมุด', /id="ls-view"[^>]*aria-pressed="false"[^>]*hidden/.test(html));
ok('กล่องแผนที่ซ่อนไว้ตั้งต้น', /<div class="ls-map" id="ls-map" hidden><\/div>/.test(html));
ok('#result-note ยังประกาศ aria-live', /id="result-note"[^>]*aria-live/.test(html));
ok('<main> มีอันเดียว (เดิมซ้อนกันสองชั้น)', (html.match(/<main[\s>]/g) || []).length === 1);
ok('ไม่ประกาศ role=dialog ใน HTML (ไม่มี JS = ฟอร์มธรรมดา)', !/id="ls-form"[^>]*role="dialog"/.test(html));
const pos = s => html.indexOf('src="' + s + '"');
ok('listmap.js มาหลัง listingcard.js และก่อน listings.js', pos('listingcard.js') > 0 && pos('listingcard.js') < pos('listmap.js') && pos('listmap.js') < pos('listings.js'));

console.log('\n2) listings.js');
const code = noComments(js);
const chipMap = (code.match(/CHIP_FOCUS = (\{[^}]*\})/) || [])[1] || '';
['province', 'price', 'area', 'zone', 'prop', 'type'].forEach(k => {
  const id = (chipMap.match(new RegExp(k + ": '([^']+)'")) || [])[1];
  ok('ชิป ' + k + ' พาไปช่องที่มีอยู่จริงในแผง (' + id + ')', !!id && formHtml.indexOf('id="' + id + '"') >= 0);
});
ok('⭐ ใส่ ls-js ด้วย JS (กติกา Sprint 3 ข้อ 8)', /classList\.add\('ls-js'\)/.test(code));
ok('เปิดแถบชิปด้วย JS', /chips\.hidden = false/.test(code));
ok('ประกาศ role=dialog + aria-modal ตอน JS ทำงาน', /setAttribute\('role', 'dialog'\)/.test(code) && /setAttribute\('aria-modal', 'true'\)/.test(code));
ok('ขังโฟกัสในแผง (Tab วน)', /e\.key !== 'Tab'/.test(code));
ok('ปิดด้วย Escape · ฉากหลัง · ส่งฟอร์ม', /e\.key === 'Escape'/.test(code) && /back\.addEventListener\('click'/.test(code) && /form\.addEventListener\('submit', function \(\) \{ set\(false\); \}\)/.test(code));
ok('⭐ เขียนตัวกรองลงที่อยู่หน้าด้วย replaceState (ไม่ใช่ pushState)', /history\.replaceState/.test(code) && !/pushState/.test(code));
ok('ค่าจากที่อยู่หน้าใส่ได้เฉพาะตัวเลือกที่มีอยู่จริง (setSelect)', /function setSelect/.test(code) && /el\.options\[i\]\.value === v/.test(code));
ok('อ่านที่อยู่หน้าหลังรายชื่อจังหวัดถูกสร้าง', code.indexOf('fillProvinces();\n        // ') > 0 || /fillProvinces\(\);\s*applyUrl\(\);/.test(code));
ok('⭐ ปุ่มแจ้งเตือนส่งคีย์ ไม่ส่งข้อความอิสระทาง URL (ไม่มี note=)', !/p\.set\('note'/.test(code));
ok('ปุ่มแจ้งเตือนไม่ส่งข้อมูลส่วนบุคคล', !/p\.set\('(name|phone|tel|email)'/.test(code));
ok('เทียบค่าเดิมก่อนเขียนข้อความ (กับดัก MutationObserver)', /function setText\(el, txt\) \{ if \(el && el\.textContent !== txt\)/.test(code));
ok('ปุ่มล้างล้างคำค้น + การเรียงด้วย (อยู่นอกฟอร์มแล้ว)', /function resetAll\(\)[\s\S]{0,200}\$\('f-q'\)\.value = ''[\s\S]{0,80}\$\('f-sort'\)\.value = 'new'/.test(code));
ok('ไม่ยิงเหตุการณ์สถิติชนิดใหม่', !/njTrackInternal\('(chip|map|alert)[a-z_]*'\)/.test(code));
ok('การ์ดบนแผนที่ใช้ bindGrid ตัวกลาง', /NJL\.bindGrid\(box, 'listings_map'\)/.test(code));
ok('สวิตช์แผนที่ขึ้นเฉพาะเมื่อมีแปลงปักหมุด', /state\.listings\.some\(LM\.hasPin\)/.test(code));

console.log('\n3) listmap.js — แผนที่ไม่มีไลบรารี ไม่มีค่าใช้จ่าย');
const lmCode = noComments(lm);
ok('⭐ ไม่มีไลบรารี/บริการแผนที่เสียเงินหรือต้องใช้คีย์',
  !/(leaflet|maplibre|mapbox|maps\.googleapis|longdo|openlayers|\bol\.js|api[_-]?key)/i.test(lmCode));
ok('⭐ ไม่ฝัง <iframe>/<script> ใดๆ', !/<iframe|<script|createElement\(['"]script/i.test(lmCode));
ok('⭐ ไม่อ่าน land.lat/land.lng (พิกัดภายใน · กติกาข้อ 3)', !/\.(lat|lng)\b/.test(lmCode.replace(/pinLat|pinLng/g, '')));
ok('⭐ แสดงที่มาของภาพแผนที่ OpenStreetMap พร้อมลิงก์ลิขสิทธิ์', /openstreetmap\.org\/copyright/.test(lmCode) && /OpenStreetMap/.test(lmCode));
ok('การ์ดในป๊อปอัปใช้ NJListing.card ตัวกลาง', /NJL\.card\(it\)/.test(lmCode));
ok('หมุดเป็น <button>', /'<button type="button" class="lm-pin/.test(lmCode));
ok('⭐ บอกจำนวนแปลงที่ไม่ได้ปักหมุด (ไม่หายเงียบ)', /ทีมงานยังไม่ได้ปักหมุด/.test(lmCode));

const sandbox = { console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(lm, sandbox);
const M = sandbox.NJListMap;
ok('เปิด window.NJListMap', !!(M && M.mount && M.hasPin));
const L = (la, ln, extra) => ({ land: Object.assign({ pinLat: la, pinLng: ln }, extra || {}) });
ok('หมุดปกติ = มี', M.hasPin(L(13.9, 100.5)));
ok('ไม่มีหมุด (null) = ไม่มี', !M.hasPin(L(null, null)));
ok('ค่าว่าง = ไม่มี', !M.hasPin(L('', '')));
ok('ไม่ใช่ตัวเลข = ไม่มี', !M.hasPin(L('x', 100)));
ok('นอกช่วงพิกัด = ไม่มี', !M.hasPin(L(95, 100)) && !M.hasPin(L(13, 190)));
ok('⭐ มีแค่ lat/lng ภายใน ไม่มีหมุด = ไม่มี', !M.hasPin({ land: { lat: 13.9, lng: 100.5 } }));
ok('ไม่มี land = ไม่มี', !M.hasPin({}));
const p0 = M.project(0, 0, 0);
ok('project(0,0,z0) = กลางไทล์ 128,128', Math.abs(p0.x - 128) < 1e-9 && Math.abs(p0.y - 128) < 1e-9);
const pN = M.project(13.75, 100.5, 10), pS = M.project(13.0, 100.5, 10);
ok('ทิศเหนืออยู่บน (y น้อยกว่า)', pN.y < pS.y);
const f1 = M.fit([[13.9, 100.5]], 800, 500);
ok('หมุดเดียว = ซูมระดับย่าน (15)', f1 && f1.z === 15);
const f2 = M.fit([[13.9, 100.5], [13.45, 101.0]], 800, 500);
ok('หมุดห่างกัน = ซูมออกให้เห็นครบ', f2 && f2.z < 15 && f2.z >= 5);
ok('ไม่มีหมุด = ไม่จัดกรอบ', M.fit([], 800, 500) === null);
ok('ป้ายราคา: ล้าน 2 ตำแหน่ง', M.priceLabel(5760000) === '฿5.76 ล้าน' && M.priceLabel(5600000) === '฿5.6 ล้าน');
ok('ป้ายราคา: ต่ำกว่าล้านแสดงเต็ม', M.priceLabel(850000) === '฿850,000');
ok('⭐ ป้ายราคา: ไม่มีราคา = "สอบถาม" (ไม่ขึ้น ฿0)', M.priceLabel(0) === 'สอบถาม' && M.priceLabel(undefined) === 'สอบถาม');

console.log('\n4) CSS');
ok('⭐ แผงเป็นหน้าต่างเฉพาะเมื่อ body.ls-js', /body\.ls-js \.ls-filters \{[^}]*position: fixed/.test(css));
ok('จอคอมเป็นแผงข้างขวา', /@media \(min-width: 861px\) \{\s*body\.ls-js \.ls-filters \{[^}]*translateX\(100%\)/.test(css));
ok('⭐ [hidden] ชนะ display ของชิป/สวิตช์/แผนที่', /\.ls-chips\[hidden\][^{]*\.ls-chip\[hidden\][^{]*\.ls-view\[hidden\][^{]*\{display:none !important\}/.test(css));
ok('แถบชิปเลื่อนแนวนอน ไม่ตัดบรรทัด', /\.ls-chips\{[^}]*overflow-x:auto/.test(css) && /\.ls-chip\{[^}]*white-space:nowrap/.test(css));
ok('แผงยังต่ำกว่าแบนเนอร์คุกกี้ (z 860 < 900)', /z-index: 860/.test(css));
ok('ที่มาแผนที่ไม่ถูกซ่อน', /\.lm-attr \{/.test(css) && !/\.lm-attr[^{]*\{[^}]*display:\s*none/.test(css));
ok('⭐ หัวข้อการ์ดบรรทัดเดียวเฉพาะหน้ารวมประกาศ (.land-grid) — หน้าแรกหน้าตาเดิม',
  /\.land-grid \.card-title,\.lm-pop \.card-title\{[^}]*white-space:nowrap;overflow:hidden;text-overflow:ellipsis/.test(lcCss) &&
  !/(^|\n)\.card-title\{[^}]*nowrap/.test(lcCss));
ok('คำโปรยหลายบรรทัดซ่อนในหน้ารวมประกาศ', /\.land-grid \.card-desc\{display:none\}/.test(lcCss));
ok('เคารพ prefers-reduced-motion', /prefers-reduced-motion: reduce/.test(css));

console.log('\n5) wanted.js — เติมโจทย์จากปุ่มแจ้งเตือน');
const wj = read('wanted.js');
const fnSrc = (wj.match(/function prefillFromListings\(\) \{[\s\S]*?\n\}/) || [''])[0];
ok('มีฟังก์ชันเติมโจทย์', !!fnSrc);
ok('ทำงานตอน DOMContentLoaded (landvocab.js โหลดหลังไฟล์นี้)', /document\.addEventListener\('DOMContentLoaded', prefillFromListings\)/.test(wj));
ok('⭐ ไม่เติมช่องข้อมูลส่วนบุคคล (ชื่อ · เบอร์ · ยินยอม)', !/(setText\('(name|phone)'|elements\.(name|phone|pdpa)|pdpa)/.test(noComments(fnSrc)));
ok('รับคีย์คำศัพท์ผ่าน hasOwnProperty เท่านั้น', /hasOwnProperty\.call\(V\.PROPERTY_TH/.test(fnSrc) && /hasOwnProperty\.call\(V\.ZONE_TH/.test(fnSrc));
ok('wanted.html มีบรรทัดบอกว่าเติมให้แล้ว (ซ่อนไว้)', /id="wt-prefill" hidden/.test(read('wanted.html')));

// เรียกจริงด้วย DOM ปลอม — ยืนยันพฤติกรรม ไม่ใช่แค่ข้อความในไฟล์
function runWanted(search, preset) {
  const handlers = {};
  const els = {};
  const stub = id => els[id] || (els[id] = { id, hidden: true, value: '', textContent: '', href: '', addEventListener() {}, dispatchEvent() { this.dispatched = (this.dispatched || 0) + 1; }, scrollIntoView() {} });
  const inputs = [];
  const add = (name, value, type) => inputs.push({ name, value: type ? value : '', _v: value, type: type || 'text', checked: type === 'radio' && (value === 'rai' || value === 'chanote' || value === 'phone' || value === 'live' || value === 'looking') });
  ['name', 'phone', 'budgetMin', 'budgetMax', 'areaMin', 'areaMax', 'note', 'website'].forEach(n => add(n));
  add('pdpa', 'on', 'checkbox');
  ['rai', 'wa'].forEach(v => add('areaUnit', v, 'radio'));
  ['chanote', 'nor3gor', 'any'].forEach(v => add('deedType', v, 'radio'));
  ['road', 'electric', 'water', 'filled', 'community', 'buildable'].forEach(v => add('features', v, 'checkbox'));
  // radio จริง: ติ๊กอันหนึ่ง = อันอื่นในกลุ่มเดียวกันหลุด
  inputs.filter(i => i.type === 'radio').forEach(i => {
    let c = i.checked;
    Object.defineProperty(i, 'checked', { get: () => c, set: v => { if (v) inputs.forEach(o => { if (o !== i && o.type === 'radio' && o.name === i.name) o._c(false); }); c = v; } });
    i._c = v => { c = v; };
  });
  Object.assign(inputs.find(i => i.name === 'note'), preset || {});
  const form = {
    id: 'wanted-form', hidden: false,
    elements: new Proxy({}, { get: (_, n) => inputs.find(i => i.name === n && i.type === 'text') || inputs.find(i => i.name === n) }),
    querySelector(sel) {
      const m = sel.match(/input\[name="([^"]+)"\]\[value="([^"]+)"\]/);
      return m ? inputs.find(i => i.name === m[1] && i._v === m[2]) || null : null;
    },
    addEventListener() {}
  };
  els['wanted-form'] = form;
  const doc = {
    getElementById: id => id === 'wanted-form' ? form : stub(id),
    addEventListener: (ev, fn) => { handlers[ev] = fn; }
  };
  const win = {};
  const ctx = {
    window: win, document: doc, location: { search }, URLSearchParams, Event: function (t) { this.type = t; },
    NJLandForm: { initAddress: () => ({ value: () => ({}) }) }, njTrack() {}, njTrackInternal() {}, NJ_MESSENGER_URL: 'x', console
  };
  vm.createContext(ctx);
  vm.runInContext(read('landvocab.js').replace(/\}\)\(\);?\s*$/, '})();'), Object.assign(ctx, { window: win }));
  vm.runInContext(wj, ctx);
  if (handlers.DOMContentLoaded) handlers.DOMContentLoaded();
  return { inputs, els };
}
const val = (r, n) => (r.inputs.find(i => i.name === n && i.type === 'text') || {}).value;
const checked = (r, n) => r.inputs.filter(i => i.name === n && i.checked).map(i => i._v).join(',');
let r = runWanted('?from=listings&province=%E0%B8%99%E0%B8%99%E0%B8%97%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5&budgetMax=6000000&areaMin=1.5&deedType=nor3gor&features=road,%3Cimg%3E,water&zone=yellow&prop=house&floors=2&deal=rent&q=%E0%B8%9A%E0%B8%B2%E0%B8%87%E0%B8%9A%E0%B9%88%E0%B8%AD&name=x&phone=0811111111&pdpa=1');
ok('เติมจังหวัด + ยิงเหตุการณ์ให้ตัวเลือกอำเภอ', r.els['wt-province1'].value === 'นนทบุรี' && r.els['wt-province1'].dispatched === 2);
ok('เติมงบสูงสุด', val(r, 'budgetMax') === '6000000');
ok('เติมเนื้อที่ + หน่วยไร่', val(r, 'areaMin') === '1.5' && checked(r, 'areaUnit') === 'rai');
ok('เอกสารสิทธิ์ น.ส.3ก ขึ้นไป', checked(r, 'deedType') === 'nor3gor');
ok('⭐ สิ่งที่ต้องมี: รับเฉพาะคีย์ที่มีในฟอร์ม (ทิ้ง <img>)', checked(r, 'features') === 'road,water');
const note = val(r, 'note');
ok('หมายเหตุประกอบจากคำศัพท์กลาง', /สนใจเช่า/.test(note) && /ประเภททรัพย์: บ้านเดี่ยว/.test(note) && /จำนวนชั้น: 2 ชั้น/.test(note) && /ผังสี: เหลือง/.test(note) && /คำค้น: บางบ่อ/.test(note), note);
ok('⭐ ไม่เติมชื่อ/เบอร์/ยินยอม แม้มีใน URL', val(r, 'name') === '' && val(r, 'phone') === '' && checked(r, 'pdpa') === '');
ok('ขึ้นบรรทัดบอกว่าเติมให้แล้ว', r.els['wt-prefill'].hidden === false);
r = runWanted('?from=listings&zone=__proto__&prop=constructor&floors=9&q=%3Cscript%3Ealert(1)%3C%2Fscript%3E&province=%3Cb%3E');
ok('⭐ คีย์แปลกปลอม/สคริปต์ ไม่ถูกเติม', val(r, 'note') === '' && r.els['wt-province1'].value === '');
r = runWanted('?province=%E0%B8%99%E0%B8%99%E0%B8%97%E0%B8%9A%E0%B8%B8%E0%B8%A3%E0%B8%B5&budgetMax=1');
ok('ไม่ได้มาจากหน้ารวมประกาศ = ไม่เติมอะไร', (r.els['wt-province1'] || { value: '' }).value === '' && val(r, 'budgetMax') === '');
r = runWanted('?from=listings&zone=yellow', { value: 'ข้อความที่ผู้ใช้พิมพ์เอง' });
ok('ไม่ทับหมายเหตุที่ผู้ใช้พิมพ์ไว้แล้ว', val(r, 'note') === 'ข้อความที่ผู้ใช้พิมพ์เอง');

console.log('\n6) บล็อกลิงก์ค้นหาท้ายหน้า (SEO)');
const seoHtml = (html.match(/<section class="ls-seo"[\s\S]*?<\/section>/) || [''])[0];
ok('มีบล็อกท้ายหน้า + หัวข้อ h2', /<h2 id="ls-seo-h">/.test(seoHtml));
ok('⭐ ส่วนข้อมูลสดซ่อนไว้จนกว่าจะมีแปลงจริง', /<div class="ls-seo-live" id="ls-seo-live" hidden><\/div>/.test(seoHtml));
const hubLinks = (seoHtml.match(/href="([^"]+)"/g) || []).map(h => h.slice(6, -1));
ok('ลิงก์หน้าหลักเขียนใน HTML (บอตอ่านได้ไม่ต้องรัน JS) ≥ 10 ลิงก์', hubLinks.length >= 10, hubLinks.length);
hubLinks.forEach(h => {
  const file = h.split('#')[0];
  const src = fs.existsSync(path.join(__dirname, file)) ? read(file) : '';
  ok('ลิงก์ ' + h + ' ชี้หน้าที่มีจริงและไม่ noindex', !!src && !/name="robots"[^>]*noindex/.test(src));
  const anchor = h.split('#')[1];
  if (anchor) ok('  จุดยึด #' + anchor + ' มีจริง', src.indexOf('id="' + anchor + '"') >= 0);
});
ok('⭐ ไม่พิมพ์รายชื่อจังหวัดลง HTML', !/(นนทบุรี|กรุงเทพมหานคร|สมุทรปราการ|ชลบุรี)/.test(seoHtml));
const seoSrc = code.slice(code.indexOf('function seoGroups'), code.indexOf('function load()'));
ok('⭐ ไม่ลิงก์หน้าพื้นที่ (locations/) จากรายชื่อนี้ — หน้าพื้นที่เกิดจากแอดมินเผยแพร่', !/locations\//.test(seoHtml) && !/locations\//.test(seoSrc));
ok('สร้างกลุ่มจากแปลงจริง (state.listings) พร้อมจำนวน', /state\.listings\.forEach/.test(seoSrc) && /ls-seo-n/.test(seoSrc));
ok('ช่องว่างไม่นับ (จังหวัด/อำเภอ/ประเภท/ผังสี)', /if \(L\.province\)/.test(seoSrc) && /if \(L\.amphoe\)/.test(seoSrc) &&
  /if \(L\.propertyType\)/.test(seoSrc) && /if \(L\.zoneColor && ZONE_TH\[L\.zoneColor\]\)/.test(seoSrc));
ok('ไม่มีกลุ่ม = ซ่อนทั้งส่วน', /box\.hidden = !groups\.length/.test(seoSrc));
ok('ลิงก์ "ให้เช่า" ขึ้นเฉพาะเมื่อมีประกาศเช่าจริง', /if \(types\.rent\)/.test(seoSrc));
ok('ข้อความ/ลิงก์ผ่าน esc', /NJL\.esc\(it\.text\)/.test(seoSrc) && /NJL\.esc\(it\.href\)/.test(seoSrc));
ok('เทียบ HTML เดิมก่อนเขียน', /if \(box\.innerHTML !== html\)/.test(seoSrc));
ok('คลิก = กรองในหน้า แต่ href ยังเป็นที่อยู่จริง (เปิดแท็บใหม่ได้)', /a\[data-ls-seo\]/.test(code) && /e\.ctrlKey \|\| e\.metaKey/.test(code));
ok('สไตล์มีกฎ [hidden] ของส่วนสด', /\.ls-seo-live\[hidden\] \{ display: none !important; \}/.test(css));

console.log('\n' + (fail ? '❌' : '✅') + ' listux: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
