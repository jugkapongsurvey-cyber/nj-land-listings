/* ที่มาของลีด — UTM · แหล่งอ้างอิง · หน้าที่เข้ามาครั้งแรก · สัมผัสแรก/สัมผัดสุดท้าย
 *
 * ทำไมต้องมี: ตอนนี้ทีมยิงโฆษณาหลายชุดพร้อมกัน แต่ลีดที่เข้ามาไม่มีอะไรบอกว่ามาจากชุดไหน
 * (มีแต่ `ref` ในหน้าฝากขายที่ตัด query string มา 60 ตัวอักษรดิบๆ) เวลาสรุปผลจึงตอบไม่ได้ว่า
 * เงินที่จ่ายไปช่องทางไหนได้ลีดจริง — ซึ่งเป็นคำถามเดียวที่ต้องตอบเพื่อตัดสินใจว่าจะยิงต่อหรือหยุด
 *
 * ⚠️ **ห้ามเก็บหรือส่งข้อมูลส่วนบุคคลผ่านไฟล์นี้เด็ดขาด** (ข้อกำหนดข้อ 11 และข้อ 16)
 *    สิ่งที่เก็บคือ "ลิงก์ไหนพาเขามา" ไม่ใช่ "เขาเป็นใคร"
 *
 * ⚠️ **หน้าที่เข้ามาครั้งแรกเก็บเฉพาะ pathname ตัด query ทิ้งเสมอ**
 *    `inspect.html?id=..&t=..` · `room.html?id=..&t=..` · `deal.html?t=..` พก**ตั๋ว**มาใน query
 *    ซึ่งใครถือก็เปิดเอกสารในนามลูกค้าได้ · เก็บทั้ง URL เมื่อไหร่ = ตั๋วไปโผล่ในใบลีด
 *    แล้ววิ่งต่อเข้าระบบหลังบ้าน (กติกาเดียวกับ `<meta name="referrer">` ของสองหน้านั้น)
 *
 * ⚠️ **แหล่งอ้างอิงเก็บแค่ host + path ตัด query ทิ้งเหมือนกัน** — หน้าค้นหาของเว็บอื่น
 *    ใส่คำค้นของผู้ใช้ไว้ใน query ซึ่งเป็นข้อมูลของเขา ไม่ใช่ของเรา
 *
 * ⚠️ **"สัมผัส" นับเฉพาะตอนที่มี UTM หรือมาจากเว็บอื่นจริงๆ** — เดินดูหน้าต่อหน้าในเว็บเราเอง
 *    ต้องไม่ทับค่าสัมผัสสุดท้าย ไม่งั้นทุกลีดจะกลายเป็น "มาจากหน้าแรกของเราเอง" หมด
 */
(function () {
  'use strict';

  var K_FIRST = 'njAttribFirst';
  var K_LAST  = 'njAttribLast';
  var MAXAGE  = 180 * 24 * 60 * 60 * 1000;   // 180 วัน — ยาวกว่ารอบตัดสินใจซื้อที่ดินทั่วไป
  var CUT     = 120;                          // ความยาวสูงสุดต่อช่อง กันใบลีดบวม

  function cut(v) { return String(v == null ? '' : v).trim().slice(0, CUT); }

  function readJson(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      if (!v || typeof v !== 'object') return null;
      if (v.at && (Date.now() - Number(v.at)) > MAXAGE) return null;   // เก่าเกินไปถือว่าไม่มี
      return v;
    } catch (e) { return null; }
  }
  function writeJson(key, val) {
    // โหมดส่วนตัวเขียนไม่ได้ — ต้องไม่พังทั้งหน้า แค่ไม่ได้จำข้ามวัน
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // ---------- แหล่งอ้างอิงภายนอก ----------
  // คืน '' เมื่อไม่มี หรือเมื่อมาจากโดเมนเราเอง (เดินหน้าต่อหน้าไม่ใช่สัมผัสใหม่)
  function externalRef() {
    var r = document.referrer;
    if (!r) return '';
    try {
      var u = new URL(r);
      if (u.hostname === location.hostname) return '';
      return cut(u.hostname + (u.pathname === '/' ? '' : u.pathname));   // ⚠️ ไม่เอา search
    } catch (e) { return ''; }
  }

  // ---------- อ่าน UTM จากลิงก์ ----------
  function utmOf() {
    var q;
    try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    var out = {}, any = false;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      var v = q.get(k);
      if (v) { out[k.slice(4)] = cut(v); any = true; }
    });
    // รหัสโฆษณาของแพลตฟอร์ม — เก็บแค่ว่า "มี" ไม่เก็บค่า เพราะค่ามันผูกกับการคลิกรายคน
    if (q.get('gclid')) { out.source = out.source || 'google'; out.medium = out.medium || 'cpc'; any = true; }
    if (q.get('fbclid')) { out.source = out.source || 'facebook'; out.medium = out.medium || 'social'; any = true; }
    return any ? out : null;
  }

  // ---------- สัมผัสของการเข้าครั้งนี้ ----------
  function touchNow() {
    var utm = utmOf();
    var ref = externalRef();
    if (!utm && !ref) return null;            // เดินในเว็บเราเอง ไม่ใช่สัมผัสใหม่

    var t = utm || {};
    if (ref) t.ref = ref;
    if (!t.source) t.source = ref ? ref.split('/')[0] : 'direct';
    // ⚠️ pathname เท่านั้น ห้ามเอา search (มีตั๋วของลูกค้าอยู่ในนั้น)
    t.landing = cut(location.pathname);
    t.at = Date.now();
    return t;
  }

  function boot() {
    var t = touchNow();
    if (!t) return;
    if (!readJson(K_FIRST)) writeJson(K_FIRST, t);   // สัมผัสแรกเขียนครั้งเดียว ห้ามทับ
    writeJson(K_LAST, t);
  }

  // ---------- ค่าที่ฟอร์มเอาไปแนบ ----------
  //
  // คืน null เมื่อไม่มีอะไรจะบอก — ฟอร์มจะได้ไม่ส่งก้อนว่างไปให้เซิร์ฟเวอร์เก็บ
  function value() {
    var first = readJson(K_FIRST);
    var last  = readJson(K_LAST);
    // หน้าที่เขากำลังกรอกฟอร์มอยู่ — ตอบคำถาม "ลีดใบนี้เกิดที่หน้าไหน" ซึ่งต่างจาก landing
    var page  = cut(location.pathname);
    if (!first && !last) return { page: page };
    return {
      first: first || undefined,
      last:  last  || undefined,
      page:  page
    };
  }

  // สรุปเป็นข้อความสั้นสำหรับช่อง `ref` เดิมของหน้าฝากขาย (เซิร์ฟเวอร์ตัดที่ 60 ตัวอักษร)
  // ⚠️ ของเดิมยัด query string ดิบเข้าไป ซึ่งแปลว่าตั๋วก็เคยมีโอกาสหลุดเข้าช่องนี้
  function refText() {
    var v = readJson(K_LAST) || readJson(K_FIRST);
    if (!v) return '';
    return [v.source, v.medium, v.campaign].filter(Boolean).join(' / ').slice(0, 60);
  }

  boot();
  window.NJAttrib = { value: value, refText: refText };
})();
