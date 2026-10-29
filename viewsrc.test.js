// ทดสอบช่อง src ของเหตุการณ์ listing_view (analytics.js · 29 ต.ค. 2569)
//   รันด้วย: node viewsrc.test.js
//
// สิ่งที่ต้องล็อก — เซิร์ฟเวอร์ใช้ช่องนี้นับว่า "คนเปิดดูประกาศมาจากไหน" ในบัญชีเจ้าของทรัพย์
//   · ส่งเฉพาะ listing_view · เหตุการณ์อื่นห้ามมี src
//   · สัมผัสเก่ากว่า 30 นาที = เข้าตรง ('') ไม่ใช่ช่องทางเดิมเมื่อหลายวันก่อน
//   · หน้าไม่มี attrib.js = ไม่ส่งช่องนี้เลย (เซิร์ฟเวอร์นับเป็น "ไม่ทราบ" ไม่ใช่ "เข้าตรง")
//   · ส่งแค่ source สั้นๆ — ไม่มีหน้าที่เข้า แคมเปญ หรืออะไรที่ไม่ได้ใช้
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, 'analytics.js'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}

// เบราว์เซอร์ปลอมขั้นต่ำ — เก็บ body ที่ sendBeacon ได้รับ
function run(attrib) {
  const sent = [];
  const el = () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {} } });
  const win = {
    location: { hostname: 'njteedinsure.com', search: '', pathname: '/land.html' },
    navigator: {
      sendBeacon(url, blob) { sent.push(JSON.parse(blob.__text)); return true; }
    },
    document: {
      readyState: 'complete', cookie: '', documentElement: { style: { getPropertyValue: () => '', setProperty() {} } },
      getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, createElement: el, head: el(), body: el()
    },
    // ตอบแบนเนอร์คุกกี้ไปแล้ว ('no') — ไม่ต้องสร้างแถบ · การนับภายในไม่ขึ้นกับคำตอบนี้
    localStorage: { getItem: k => (k === 'njts_consent' ? 'no' : null), setItem() {}, removeItem() {} },
    Blob: function (parts) { this.__text = parts.join(''); },
    URLSearchParams, setTimeout: () => 0, clearTimeout() {}, addEventListener() {},
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
    console
  };
  win.window = win;
  if (attrib !== undefined) win.NJAttrib = { value: () => attrib };
  vm.createContext(win);
  vm.runInContext(SRC, win, { filename: 'analytics.js' });
  return { win, sent };
}

console.log('1) listing_view แนบ src จากสัมผัสสุดท้ายที่ยังสด');
let r = run({ last: { source: 'facebook', medium: 'paid_social', campaign: 'x', landing: '/land.html', at: Date.now() - 60 * 1000 } });
r.win.njTrackInternal('listing_view', 'OP-102');
check('ส่ง src = facebook', r.sent[0] && r.sent[0].src === 'facebook', JSON.stringify(r.sent[0]));
check('ไม่ส่งแคมเปญ/หน้าที่เข้า/medium', r.sent[0] && Object.keys(r.sent[0]).sort().join(',') === 'listingId,src,type', JSON.stringify(r.sent[0]));

console.log('\n2) สัมผัสเก่ากว่า 30 นาที = เข้าตรง');
r = run({ last: { source: 'google', at: Date.now() - 31 * 60 * 1000 } });
r.win.njTrackInternal('listing_view', 'OP-102');
check('src = "" (ไม่ใช่ google)', r.sent[0] && r.sent[0].src === '', JSON.stringify(r.sent[0]));
r = run({ page: '/land.html' });
r.win.njTrackInternal('listing_view', 'OP-102');
check('ไม่เคยมีสัมผัสภายนอก = src ""', r.sent[0] && r.sent[0].src === '', JSON.stringify(r.sent[0]));

console.log('\n3) หน้าไม่มี attrib.js = ไม่ส่งช่อง src เลย');
r = run(undefined);
r.win.njTrackInternal('listing_view', 'OP-102');
check('ไม่มีคีย์ src', r.sent[0] && !('src' in r.sent[0]), JSON.stringify(r.sent[0]));

console.log('\n4) เหตุการณ์อื่นไม่มี src');
r = run({ last: { source: 'facebook', at: Date.now() } });
r.win.njTrackInternal('phone_reveal', 'OP-102');
r.win.njTrackInternal('pageview');
check('phone_reveal / pageview ไม่มี src', r.sent.length === 2 && r.sent.every(x => !('src' in x)), JSON.stringify(r.sent));

console.log('\n5) ค่ายาวถูกตัด');
r = run({ last: { source: 'x'.repeat(500), at: Date.now() } });
r.win.njTrackInternal('listing_view', 'OP-102');
check('src ยาวไม่เกิน 60', r.sent[0] && r.sent[0].src.length === 60);

console.log('\n' + (fail ? 'FAIL ' + fail + ' ข้อ · ' : '') + '✅ ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
process.exit(fail ? 1 : 0);
