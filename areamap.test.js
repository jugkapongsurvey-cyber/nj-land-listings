// ทดสอบวัดพื้นที่บนแผนที่ (areamap.js) — สูตร + ตัวควบคุมหมุดด้วย Longdo ตัวปลอม (ไม่ต่อเน็ต)
// รันด้วย:  node areamap.test.js
const fs = require('fs');
const path = require('path');
global.window = {};
new Function(fs.readFileSync(path.join(__dirname, 'areamap.js'), 'utf8'))();
const A = global.window.NJAreaMap;

let pass = 0, fail = 0;
function ok(label, cond, extra) {
  if (cond) pass++;
  else { fail++; console.log('  ✗ ' + label + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function near(label, got, want, tol) { ok(label + ' (ได้ ' + got + ' ต้องการ ' + want + ')', Math.abs(got - want) <= tol); }

// สี่เหลี่ยมที่รู้ขนาดแน่นอน: ที่ละติจูด φ, 1° ลองจิจูด = R·cos φ·π/180 เมตร, 1° ละติจูด = R·π/180 เมตร
const R = 6371008.8, lat0 = 13.6, lon0 = 100.6;
const mLat = R * Math.PI / 180, mLon = mLat * Math.cos(lat0 * Math.PI / 180);
function rect(wM, hM) {
  const dLon = wM / mLon, dLat = hM / mLat;
  return [
    { lat: lat0, lon: lon0 }, { lat: lat0, lon: lon0 + dLon },
    { lat: lat0 + dLat, lon: lon0 + dLon }, { lat: lat0 + dLat, lon: lon0 }
  ];
}

console.log('\n1) พื้นที่และระยะ');
near('40×40 ม. = 1,600 ตร.ม. (1 ไร่)', A.areaM2(rect(40, 40)), 1600, 2);
near('100×81.55 ม. ≈ 8,155 ตร.ม.', A.areaM2(rect(100, 81.55)), 8155, 8);
near('1×1 กม. = 1,000,000 ตร.ม. (±0.05%)', A.areaM2(rect(1000, 1000)), 1e6, 500);
near('ลำดับหมุดกลับด้าน ได้พื้นที่เท่าเดิม', A.areaM2(rect(40, 40).reverse()), 1600, 2);
near('ด้าน 40 ม. (haversine)', A.haversine(rect(40, 40)[0], rect(40, 40)[1]), 40, 0.05);
ok('2 หมุดยังไม่มีพื้นที่', A.areaM2(rect(40, 40).slice(0, 2)) === 0);
let s = A.summary(rect(40, 30));
ok('สี่เหลี่ยม: 4 ด้าน ปิดรูป', s.closed && s.sides.length === 4 && s.n === 4);
near('เส้นรอบรูป 140 ม.', s.length, 140, 0.2);
s = A.summary(rect(40, 30).slice(0, 2));
ok('2 หมุด = ระยะทาง 1 ช่วง ไม่ใช่รูปปิด', !s.closed && s.sides.length === 1 && s.thai === null);
near('ระยะ 2 หมุด = 40 ม.', s.length, 40, 0.05);
ok('หมุดเดียว → null', A.summary(rect(40, 30).slice(0, 1)) === null);
ok('พิกัดเสีย ถูกกรองทิ้ง', A.summary([{ lat: NaN, lon: 1 }, { lat: 13, lon: 100 }]) === null);
s = A.summary([{ lat: 95, lon: 100 }, { lat: 13, lon: 100 }, { lat: 13.1, lon: 100 }]);
ok('ละติจูดเกิน 90 ถูกกรองทิ้ง (เหลือ 2 หมุด = ระยะทาง)', s && s.n === 2 && !s.closed, s);

console.log('\n2) หน่วยไทย');
let t = A.thaiArea(8155);
ok('8,155 ตร.ม. = 5 ไร่ 0 งาน 38.8 ตร.ว.', t.rai === 5 && t.ngan === 0 && t.wa === 38.8, t);
t = A.thaiArea(1600);
ok('1,600 ตร.ม. = 1-0-0', t.rai === 1 && t.ngan === 0 && t.wa === 0 && t.short === '1-0-0 ไร่', t);
t = A.thaiArea(1599.99);
ok('1,599.99 ตร.ม. ปัดขึ้นเป็น 1 ไร่ (ไม่ใช่ 0-3-100)', t.rai === 1 && t.ngan === 0 && t.wa === 0, t);
t = A.thaiArea(3800);
ok('3,800 ตร.ม. = 2 ไร่ 1 งาน 50 ตร.ว.', t.rai === 2 && t.ngan === 1 && t.wa === 50, t);
ok('ข้อความเต็ม', A.thaiArea(3800).text === '2 ไร่ 1 งาน 50 ตร.ว.', A.thaiArea(3800).text);
t = A.thaiArea(0);
ok('0 ตร.ม. = 0-0-0', t.rai === 0 && t.ngan === 0 && t.wa === 0);

console.log('\n3) ข้อความส่งไลน์ + ผลบนจอ');
s = A.summary(rect(100, 81.55));
const lt = A.lineText(s);
ok('ข้อความไลน์มีเนื้อที่เดียวกับบนจอ', lt.indexOf(s.thai.text) >= 0, lt);
ok('ข้อความไลน์บอกว่าวัดจากแผนที่ และมีจุดกึ่งกลาง', /วัดจากแผนที่/.test(lt) && /\d+\.\d{6},\d+\.\d{6}/.test(lt), lt);
ok('ข้อความไลน์ไม่มีพิกัดทุกหมุด (ส่งแค่จุดกึ่งกลาง)', (lt.match(/\d+\.\d{6}/g) || []).length === 2, lt);
ok('ยังไม่ปิดรูป → ไม่มีข้อความไลน์', A.lineText(A.summary(rect(40, 30).slice(0, 2))) === '');
const html = A.resultHtml(s);
ok('ผลบนจอมีคำเตือนครบทุกครั้ง', html.indexOf(A.DISCLAIM.slice(0, 30)) >= 0);
ok('ผลบนจอเรียกว่า "เนื้อที่ที่วัดจากภาพ"', /เนื้อที่ที่วัดจากภาพ/.test(html));
ok('ผลระยะทาง (2 หมุด) มีคำเตือนด้วย', A.resultHtml(A.summary(rect(40, 30).slice(0, 2))).indexOf(A.DISCLAIM.slice(0, 30)) >= 0);
ok('คำเตือนบอกว่าไม่ใช่ผลรังวัด', /ไม่ใช่ผลรังวัด/.test(A.DISCLAIM));

console.log('\n4) ตัวควบคุมหมุด (Longdo ตัวปลอม)');
function fakeLongdo() {
  const handlers = {};
  const overlays = new Set();
  class Geo { constructor(loc, opt) { this.loc = loc; this.opt = opt; } location(v) { if (v) this.loc = v; return this.loc; } }
  const L = {
    EventName: { Click: 'click', OverlayClick: 'overlayClick', OverlayDrag: 'overlayDrag', OverlayDrop: 'overlayDrop' },
    Marker: class extends Geo {}, Polygon: class extends Geo {}, Polyline: class extends Geo {},
    LocationMode: { Pointer: 'pointer' }
  };
  const map = {
    Overlays: { add: o => overlays.add(o), remove: o => overlays.delete(o) },
    Event: { bind: (n, fn) => { handlers[n] = fn; } },
    location: () => ({ lat: 1, lon: 1 })
  };
  return { L, map, handlers, overlays };
}
const tick = () => new Promise(r => setTimeout(r, 5));

(async () => {
  const f = fakeLongdo();
  let clock = 1000;
  let last = null;
  const c = A.createController(f.L, f.map, sum => { last = sum; });
  c._setClock(() => clock);
  const r = rect(40, 40);

  f.handlers.click(r[0]); await tick();
  ok('แตะแผนที่ = วางหมุด 1', c.points().length === 1 && [...f.overlays].filter(o => o instanceof f.L.Marker).length === 1);
  f.handlers.click(r[1]); await tick();
  ok('2 หมุด = มีเส้น (Polyline)', [...f.overlays].some(o => o instanceof f.L.Polyline) && last && !last.closed);
  f.handlers.click(r[2]); f.handlers.click(r[3]); await tick();
  ok('4 หมุด = รูปปิด (Polygon) แทนเส้น', [...f.overlays].some(o => o instanceof f.L.Polygon) && ![...f.overlays].some(o => o instanceof f.L.Polyline));
  near('พื้นที่จากตัวควบคุม = 1,600', last.m2, 1600, 2);
  ok('มีรูปแปลงแค่ชิ้นเดียว (ลบของเก่าทุกครั้ง)', [...f.overlays].filter(o => o instanceof f.L.Polygon).length === 1);
  ok('หมุดมีเลขกำกับ', c._markers()[3].opt.icon.html.indexOf('>4<') >= 0 && c._markers()[3].opt.draggable === true);

  // แตะหมุด: Longdo ยิง overlayClick + click ของแผนที่ → ต้องไม่เกิดหมุดใหม่ (ลองทั้งสองลำดับ)
  f.handlers.overlayClick(c._markers()[0]); f.handlers.click(r[0]); await tick();
  ok('แตะหมุด (overlayClick ก่อน) ไม่เพิ่มหมุด', c.points().length === 4);
  clock += 1000;
  f.handlers.click(r[0]); f.handlers.overlayClick(c._markers()[0]); await tick();
  ok('แตะหมุด (click ก่อน) ไม่เพิ่มหมุด', c.points().length === 4);

  // ลากหมุด 3 ออกไป 40 ม. → พื้นที่เปลี่ยน · หลังลากเสร็จ การแตะครั้งถัดไป (เวลาผ่านไปแล้ว) ต้องวางหมุดได้
  clock += 1000;
  const m = c._markers()[2];
  m.location({ lat: r[2].lat + 40 / mLat, lon: r[2].lon });
  f.handlers.overlayDrop(m); await tick();
  near('ลากหมุดแล้วพื้นที่อัปเดต (สี่เหลี่ยมคางหมู 2,400)', last.m2, 2400, 4);
  ok('ลากหมุดไม่สร้างหมุดซ้ำ', c._markers().length === 4);
  clock += 1000;
  f.handlers.click({ lat: r[0].lat - 0.0001, lon: r[0].lon }); await tick();
  ok('⭐ หลังลากหมุด การแตะครั้งถัดไปยังวางหมุดได้ (ไม่มีธงค้าง)', c.points().length === 5);

  c.undo();
  ok('ย้อนหมุด', c.points().length === 4 && c._markers().length === 4);
  const stale = { njIndex: 1, location: () => ({ lat: 0, lon: 0 }) };
  f.handlers.overlayDrop(stale);
  ok('หมุดแปลกปลอม/หมุดเก่า ลากแล้วไม่มีผล', c.points()[1].lat === r[1].lat);
  clock += 1000;
  f.handlers.click({ lat: 'x', lon: null }); await tick();
  ok('แตะได้พิกัดเสีย → ใช้ตำแหน่งเมาส์จาก map.location แทน', c.points().length === 5 && c.points()[4].lat === 1);
  c.undo();
  clock += 1000;
  f.map.location = () => undefined;   // Longdo คืน undefined ได้ถ้ายังไม่มี mousemove (แตะเร็วบนจอสัมผัส)
  f.handlers.click({ lat: null, lon: null }); await tick();
  ok('⭐ พิกัดเสียและไม่มีตำแหน่งเมาส์ → ไม่เพิ่มหมุด (null ไม่กลายเป็น 0,0)', c.points().length === 4);
  ok('null ไม่ผ่านการตรวจพิกัด', A.summary([{ lat: null, lon: null }, { lat: 13, lon: 100 }]) === null);
  c.clear();
  ok('ล้างทั้งหมด = ไม่เหลือ overlay', c.points().length === 0 && f.overlays.size === 0 && last === null);
  for (let i = 0; i < 70; i++) c.add({ lat: 13 + i / 1e4, lon: 100 + (i % 2) / 1e4 });
  ok('หมุดไม่เกิน 60 จุด', c.points().length === 60);

  console.log('\n5) หน้าเว็บและกติกา');
  const src = fs.readFileSync(path.join(__dirname, 'areamap.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok('ไม่ใช้ size() ของ Longdo คิดพื้นที่', !/\.size\(/.test(code));
  ok('ไม่เก็บพิกัดลง storage', !/localStorage|sessionStorage/.test(code));
  ok('ซ่อนตัวเลือกชั้นแผนที่ของ Longdo', /LayerSelector\.visible\(false\)/.test(code));
  ok('ใช้เฉพาะชั้น HARD / NORMAL', (code.match(/Layers\.[A-Z_]+/g) || []).every(x => /Layers\.(HARD|NORMAL)$/.test(x)), code.match(/Layers\.[A-Z_]+/g));
  ok('โหลดสคริปต์จาก api.longdo.com/map3 เท่านั้น', /'https:\/\/api\.longdo\.com\/map3\/\?key='/.test(src));
  ok('ไม่มีคีย์ = mount คืน false (ไม่วาดแผนที่เปล่า)', A.mount({}, { key: '' }) === false);
  ok('สถิติเปิดแผนที่ไม่แนบพิกัด', /njTrack\('ViewContent', \{ content_name: 'area_map_open' \}\)/.test(code));

  const tools = fs.readFileSync(path.join(__dirname, 'tools.html'), 'utf8');
  const toolsJs = fs.readFileSync(path.join(__dirname, 'tools.js'), 'utf8');
  ok('tools.html โหลด areamap.js + areamap.css', /areamap\.js/.test(tools) && /areamap\.css/.test(tools));
  ok('tools.html มีส่วน #map ที่ซ่อนไว้ก่อน', /<section[^>]*id="map"[^>]*hidden/.test(tools));
  ok('tools.js เปิดส่วนแผนที่เมื่อ mount สำเร็จเท่านั้น', /NJAreaMap\.mount\(/.test(toolsJs) && /hidden = false/.test(toolsJs));
  ok('ไม่มีแท็ก script ของ Longdo ฝังในหน้า (ต้องโหลดตอนกดเท่านั้น)', !/api\.longdo\.com/.test(tools));

  console.log('\n' + (fail ? '❌' : '✅') + ' areamap: ผ่าน ' + pass + ' · ไม่ผ่าน ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
