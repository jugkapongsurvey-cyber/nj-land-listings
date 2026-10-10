/* ===========================================================================
   Land Health Check — รายงานสุขภาพแปลง (window.NJHealth)
   ต้องโหลด landvocab.js ก่อนไฟล์นี้เสมอ

   ⚠️ กติกาที่ห้ามผ่อน

   1. **สถานะมี 4 สี และทุกสีต้องมีข้อความอธิบายเสมอ** ห้ามใช้สีอย่างเดียว
        เขียว  ตรวจแล้ว ไม่พบประเด็นสำคัญ
        เหลือง ต้องตรวจเพิ่มเติม
        แดง    พบประเด็นที่ผู้ซื้อควรทราบ
        เทา    ยังไม่มีข้อมูล
   2. **เทา = "ยังไม่มีข้อมูล" ไม่ใช่ "ไม่มี"** เช่น ไม่ได้กรอกว่ามีไฟฟ้าไหม
      ไม่ได้แปลว่าไม่มีไฟฟ้า · ข้อความต้องเขียนให้อ่านออกว่าเรายังไม่รู้
   3. **ห้ามเดาสถานะจากข้อมูลที่ไม่พอ** ทุกแถวคำนวณจากช่องที่ API ส่งมาจริงเท่านั้น
      ช่องไหนไม่มีค่า = เทา ไม่ใช่เขียว
   4. **ห้ามใช้คำว่า "ปลอดภัย" "รับประกัน" "100%" หรือ "ไม่มีปัญหาแน่นอน"**
      เขียวแปลว่า "ตรวจแล้วไม่พบประเด็น ณ วันที่ตรวจ" เท่านั้น
   =========================================================================== */
(function (w, d) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function V() { return w.NJVocab || {}; }

  // สถานะ 4 สี — ตัวช่วยสร้างแถว · `note` คือข้อความอธิบายซึ่ง **บังคับมีเสมอ**
  function row(label, state, value, note) {
    return { label: label, state: state, value: value || '', note: note || '' };
  }
  var GREY_NOTE = 'ยังไม่มีข้อมูลในระบบ — ไม่ได้แปลว่าไม่มี ทักไลน์ขอให้ทีมงานตรวจเพิ่มได้';
  var AREA_NONE = 'ยังไม่มีผลรังวัดในระบบ — เนื้อที่จริงอาจต่างจากหน้าเอกสาร ตรวจได้ด้วยการรังวัดสอบเขต';

  /* ---------- แหล่งความจริงเดียวต่อหัวข้อ (10 ต.ค. 2569) ----------
     หน้าแปลงมีสองแผงที่พูดเรื่องเดียวกัน 3 หัวข้อ — แผงผลตรวจ 7 หัวข้อ (land.js tier2Html อ่าน `checks`)
     กับตารางนี้ (อ่าน `health` ก่อน) · เดิมต่างคนต่างอ่าน จึงขัดกันเองบนหน้าเดียว (เจอจริง OP-102:
     ผลตรวจ "ยังไม่ได้ตรวจหมุด" แต่ตารางนี้ "พบ 1 จาก 10 หมุด" · ผลตรวจ "ทางเป็นที่สาธารณะ ✓"
     แต่ตารางนี้ "ทางเข้าออกแบบอื่น · ต้องตรวจเพิ่ม")
     ⚠️ **ทุกที่ที่แสดง เนื้อที่วัดจริง / หมุดหลักเขต / ทางเข้า–ออก ต้องผ่าน `topic()` เท่านั้น**
        ห้ามกลับไปอ่าน L.checks.area/markers/access หรือ L.health ตรงๆ (verified.test.js ล็อกไว้)
     กติกา
       1. ช่องโครงสร้างของรายงานสุขภาพ (markerFound/markerTotal · access แบบเลือก) มาก่อนข้อความอิสระใน checks
       2. checks ที่สถานะว่าง = "ยังไม่ได้ตรวจ" — **ไม่มีผล ไม่มีค่า ไม่มีหมายเหตุ** แม้ทีมพิมพ์อะไรไว้
          (ค่าบนแถวที่ยังไม่ตรวจอ่านแล้วเหมือนผลตรวจ — OP-102/OP-024 มีชื่อบริการ "รังวัดก่อนซื้อ-ขาย" อยู่ในช่องค่า)
       3. สองแหล่งขัดกัน = ใช้สถานะที่ระวังกว่า และไม่แสดงหมายเหตุของแหล่งที่ขัด · ห้ามเลือกข้างที่ดูดีกว่า
       4. เนื้อที่วัดจริงต้องเป็นตัวเลขเนื้อที่ (ไร่-งาน-ตร.ว. หรือเลขพร้อมหน่วย) ไม่งั้นไม่แสดงเป็นค่าที่วัดได้
          เลขเปล่าไม่มีหน่วยก็ไม่นับ — ห้ามเดาหน่วยแทนทีม
     ผลลัพธ์ { state, value, note, hint, src, conflict }
       note = ข้อความที่ทีมพิมพ์จริง (ผ่านกติกา 2–3 แล้ว) · hint = คำอธิบายมาตรฐานของสถานะนั้น
       src  = 'health' | 'checks' | '' — แผงผลตรวจใช้ hint เฉพาะเมื่อ src='health' หรือขัดกัน
              แปลงที่มีแค่ checks จึงหน้าตาเหมือนเดิม (ไม่เติมข้อความใหม่ให้แปลงที่ไม่มีข้อมูลใหม่) */
  var AREA_RNW = /^\s*\d+\s*-\s*\d+\s*-\s*\d+(?:\.\d+)?\s*(?:ไร่)?\s*$/;
  var AREA_UNIT = /^\s*\d+(?:[.,]\d+)?\s*(?:ตร\.?\s*ว\.?|ตารางวา|ไร่|ตร\.?\s*ม\.?|ตารางเมตร)\s*$/;
  function isAreaValue(s) {
    var t = String(s == null ? '' : s);
    return AREA_RNW.test(t) || AREA_UNIT.test(t);
  }
  var RANK = { none: 0, ok: 1, warn: 2, bad: 3 };
  function chkState(x, warnAs) {
    var st = (x && x.status) || '';
    return st === 'ok' ? 'ok' : st === 'warn' ? warnAs : 'none';
  }
  function res(state, value, note, hint, src, conflict) {
    return { state: state, value: value || '', note: note || '', hint: hint || '', src: src || '', conflict: !!conflict };
  }
  // หัวข้อที่ไม่มีช่องคู่ในรายงานสุขภาพ (ภาระจำยอม · อายัด · ภาษี · จำนอง) — กติกา 2 อย่างเดียว
  function plainCheck(x) {
    var s = chkState(x, 'warn');
    if (s === 'none') return res('none', '', '', '', '');
    return res(s, x.value, x.note, '', 'checks');
  }
  function areaTopic(L) {
    var ca = (L.checks || {}).area || {};
    var s = chkState(ca, 'bad');
    if (s === 'none') return res('none', '', '', AREA_NONE, '');
    var val = isAreaValue(ca.value) ? String(ca.value).trim() : '';
    return res(s, val, ca.note,
      s === 'bad' ? 'ผลรังวัดต่างจากเนื้อที่ตามเอกสาร — ควรอ่านรายละเอียดก่อนตัดสินใจ' : 'วัดจริงในสนามแล้ว ตรงกับที่ประกาศ',
      'checks');
  }
  // รวมผลสองแหล่ง: base = จากรายงานสุขภาพ · c = สถานะจาก checks · cx = ก้อน checks
  function merge(base, c, cx) {
    if (c === 'none') return base;                       // checks ยังไม่ตรวจ = ไม่มีอะไรมาขัด
    if (c === base.state) { base.note = cx.note || ''; return base; }
    var useC = RANK[c] > RANK[base.state];
    base.conflict = true;
    if (useC) { base.state = c; base.note = cx.note || ''; base.hint = 'ผลตรวจบางส่วนพบข้อควรรู้ — สอบถามรายละเอียดกับทีมงานก่อนตัดสินใจ'; }
    else base.note = '';
    return base;
  }
  function markersTopic(L) {
    var H = L.health || {}, cm = (L.checks || {}).markers || {};
    var c = chkState(cm, 'bad');
    if (H.markerTotal > 0) {
      var f = H.markerFound == null ? null : H.markerFound, b;
      if (f === null) b = res('warn', 'ทั้งหมด ' + H.markerTotal + ' หมุด', '', 'ยังไม่ได้บันทึกว่าพบหมุดครบหรือไม่', 'health');
      else if (f >= H.markerTotal) b = res('ok', 'พบครบ ' + f + ' จาก ' + H.markerTotal + ' หมุด', '',
        'ทีมช่างรังวัดพบหมุดหลักเขตครบทุกจุดในวันที่ลงพื้นที่', 'health');
      else b = res('bad', 'พบ ' + f + ' จาก ' + H.markerTotal + ' หมุด', '',
        'หมุดหลักเขตไม่ครบ — แนวเขตบางด้านยังยืนยันในสนามไม่ได้ ควรรังวัดสอบเขตก่อนโอน', 'health');
      return merge(b, c, cm);
    }
    if (c === 'none') return res('none', '', '', GREY_NOTE, '');
    return res(c, cm.value, cm.note, 'ผลตรวจหมุดหลักเขตจากงานรังวัด', 'checks');
  }
  function accessTopic(L) {
    var H = L.health || {}, ac = (L.checks || {}).access || {}, v = V();
    var c = chkState(ac, 'warn');
    var AT = v.ACCESS_TH || {};
    if (H.access) {
      var b = H.access === 'none'
        ? res('bad', AT.none, '', 'แปลงนี้ยังไม่มีทางเข้าออกตามกฎหมาย ผู้ซื้อควรตรวจสอบเรื่องทางเข้าออกก่อนตัดสินใจ', 'health')
        : H.access === 'shared'
        ? res('warn', AT.shared, '', 'ใช้ทางร่วมกับแปลงข้างเคียงแต่ยังไม่ได้จดทะเบียน — ควรตรวจสอบสิทธิ์การใช้ทางเพิ่มเติม', 'health')
        : H.access === 'other'
        ? res('warn', AT.other, '', 'ทางเข้าออกไม่ใช่แบบมาตรฐาน — สอบถามรายละเอียดกับทีมงาน และตรวจสอบสิทธิ์การใช้ทางก่อนตัดสินใจ', 'health')
        : res('ok', AT[H.access] || H.access, '',
            (c === 'ok' && ac.value) ? ('หน้ากว้างทางเข้า ' + ac.value) : 'ทีมงานตรวจทางเข้าออกในสนามแล้ว', 'health');
      return merge(b, c, ac);
    }
    if (c === 'none') return res('none', '', '', GREY_NOTE, '');
    return res(c, ac.value, ac.note, 'มีผลตรวจทางเข้าออก แต่ยังไม่ได้ระบุประเภททางเข้าออก', 'checks');
  }
  function topic(L, k) {
    L = L || {};
    if (k === 'area') return areaTopic(L);
    if (k === 'markers') return markersTopic(L);
    if (k === 'access') return accessTopic(L);
    return plainCheck((L.checks || {})[k] || {});
  }
  // เนื้อที่วัดจริงที่แสดงเป็นตัวเลขได้ ('' = ไม่มี) — แถบตัวเลขใต้ราคาและตารางขนาดพื้นที่ใช้ตัวนี้
  function measuredArea(L) {
    var t = areaTopic(L || {});
    return t.state === 'none' ? '' : t.value;
  }

  // หน้ากว้างเป็นเมตร (null = ไม่มีตัวเลขที่เชื่อได้) — ชิปบนการ์ดประกาศใช้ตัวนี้ (10 ต.ค. 2569)
  // แหล่งเดียวกับหน้าแปลง: health.widthM (ทีมกรอกเป็นตัวเลข) มาก่อน แล้วค่อย land.frontage (ข้อความอิสระ)
  // ⚠️ frontage เป็นข้อความที่ทีมพิมพ์เอง ("หน้ากว้าง 46 เมตร ลึก 13 เมตร" · "8 เมตร" · "6")
  //    · รับเฉพาะเลขที่มีหน่วย ม./เมตร — เลขเปล่าไม่นับ (ห้ามเดาหน่วย กติกาเดียวกับเนื้อที่วัดจริง)
  //    · มีคำว่า "กว้าง" = เอาเลขหลังคำนั้น · ไม่มี = ต้องเป็นเลข+หน่วยล้วนทั้งช่อง (กันหยิบความลึกมาเป็นหน้ากว้าง)
  //    · "กว้าง" ต้องเป็น "หน้ากว้าง" หรือขึ้นต้นข้อความ — "ถนนกว้าง 8 เมตร" คือความกว้างถนน ไม่ใช่หน้าแปลง
  //    · สองแหล่งได้ตัวเลขต่างกัน = ไม่แสดง (ขัดกันเอง ไม่เลือกข้างแทนผู้ซื้อ)
  var FR_WIDE = /(?:^\s*|หน้า)กว้าง[^\d]{0,12}(\d+(?:\.\d+)?)\s*(?:ม\.?|เมตร)(?![ก-๙a-z])/;
  var FR_ONLY = /^\s*(\d+(?:\.\d+)?)\s*(?:ม\.?|เมตร)\s*$/;
  function frontageM(L) {
    L = L || {};
    var w = Number((L.health || {}).widthM);
    w = isFinite(w) && w > 0 ? w : null;
    var t = String(L.frontage == null ? '' : L.frontage).replace(/,/g, '');
    var m = FR_WIDE.exec(t) || FR_ONLY.exec(t);
    var f = m ? Number(m[1]) : null;
    if (!(f > 0)) f = null;
    if (w != null && f != null && Math.abs(w - f) > 0.5) return null;
    return w != null ? w : f;
  }

  /* ---------- คำนวณ 14 หัวข้อจากข้อมูลที่ API ส่งมาจริง ----------
     L = ก้อน land ที่มาจาก /api/public/listings/:id */
  function topicRow(label, t) {
    return row(label, t.state, t.value, t.note || t.hint || GREY_NOTE);
  }
  function rowsOf(L) {
    var H = L.health || {};
    var v = V();
    var out = [];

    // 1 ประเภทเอกสารสิทธิ์
    out.push(L.deedType
      ? row('ประเภทเอกสารสิทธิ์', 'ok', v.DEED_TH[L.deedType] || L.deedType,
            'อ่านจากเอกสารสิทธิ์ที่เจ้าของแสดงให้ทีมงาน')
      : row('ประเภทเอกสารสิทธิ์', 'none', '', GREY_NOTE));

    // 2 เนื้อที่ตามเอกสาร
    out.push(L.deedArea
      ? row('เนื้อที่ตามเอกสารสิทธิ์', 'ok', L.deedArea + ' ไร่-งาน-ตร.ว.', 'ตัวเลขที่ปรากฏบนหน้าเอกสารสิทธิ์')
      : row('เนื้อที่ตามเอกสารสิทธิ์', 'none', '', GREY_NOTE));

    // 3 เนื้อที่จากผลรังวัดล่าสุด — ต่างจากเอกสาร = ประเด็นที่ผู้ซื้อต้องรู้ · ผ่าน topic() ที่เดียว
    out.push(topicRow('เนื้อที่จากผลรังวัดล่าสุด', topic(L, 'area')));

    // 4 ความกว้างและความยาวโดยประมาณ
    if (H.widthM || H.depthM) {
      var wl = [];
      if (H.widthM) wl.push('กว้างประมาณ ' + H.widthM + ' ม.');
      if (H.depthM) wl.push('ลึกประมาณ ' + H.depthM + ' ม.');
      out.push(row('ความกว้างและความยาว', 'ok', wl.join(' · '),
        'ค่าโดยประมาณจากการตรวจของทีมงาน ไม่ใช่ค่ารังวัดที่ใช้อ้างอิงทางกฎหมาย'));
    } else if (L.frontage) {
      out.push(row('ความกว้างและความยาว', 'warn', 'หน้ากว้างประมาณ ' + L.frontage,
        'มีเฉพาะหน้ากว้าง ยังไม่ได้วัดความลึก'));
    } else {
      out.push(row('ความกว้างและความยาว', 'none', '', GREY_NOTE));
    }

    // 5 รูปร่างแปลง
    out.push(H.shape
      ? row('รูปร่างแปลง', 'ok', v.SHAPE_TH[H.shape] || H.shape,
            'ทีมงานสรุปจากรูปแปลงและการลงพื้นที่')
      : row('รูปร่างแปลง', 'none', '', GREY_NOTE));

    // 6 ทางเข้า–ออก · ⚠️ ที่ตาบอดต้องขึ้นแดงเสมอ เป็นข้อมูลที่ผู้ซื้อต้องรู้ที่สุด · ผ่าน topic() ที่เดียว
    out.push(topicRow('ทางเข้า–ออก', topic(L, 'access')));

    // 7 ประเภทถนนหน้าแปลง
    if (L.roadSurface === 'none') {
      out.push(row('ถนนหน้าแปลง', 'bad', v.ROAD_TH.none,
        'ยังไม่มีถนนเข้าถึงแปลง — ต้องคิดต้นทุนการทำทางเข้าเพิ่ม'));
    } else if (L.roadSurface) {
      out.push(row('ถนนหน้าแปลง', 'ok',
        (v.ROAD_TH[L.roadSurface] || L.roadSurface) + (L.roadLanes ? (' · ' + L.roadLanes + ' ช่องจราจร') : ''),
        'ประเภทผิวถนนหน้าแปลงตามที่ทีมงานบันทึกไว้'));
    } else {
      out.push(row('ถนนหน้าแปลง', 'none', '', GREY_NOTE));
    }

    // 8 ผังเมือง
    if (L.zoning || L.zoneColor) {
      out.push(row('ผังเมืองรวม', 'ok',
        L.zoning || (v.ZONE_TH[L.zoneColor] || L.zoneColor),
        'ข้อมูลผังเมืองเป็นข้อมูลเบื้องต้นจากหน่วยงานราชการ ใช้อ้างอิงทางกฎหมายไม่ได้ ' +
        'ผู้ซื้อควรตรวจสอบข้อกำหนดฉบับเต็มกับหน่วยงานผังเมืองก่อนวางแผนใช้ประโยชน์'));
    } else {
      out.push(row('ผังเมืองรวม', 'none', '', GREY_NOTE));
    }

    // 9 สภาพแวดล้อม
    if (H.surroundings) {
      out.push(row('สภาพแวดล้อมโดยรอบ', 'ok', '', H.surroundings));
    } else if (L.nearby && L.nearby.total) {
      out.push(row('สภาพแวดล้อมโดยรอบ', 'warn', 'พบสถานที่ใกล้เคียง ' + L.nearby.total + ' แห่ง',
        'เป็นข้อมูลสถานที่จากบุคคลที่สาม ไม่ใช่การตรวจสภาพแวดล้อมโดยทีมงาน — ดูรายละเอียดในหัวข้อสถานที่ใกล้เคียง'));
    } else {
      out.push(row('สภาพแวดล้อมโดยรอบ', 'none', '', GREY_NOTE));
    }

    // 10 สาธารณูปโภค — อ่านจาก features ชุดเดิม ไม่สร้างช่องใหม่ซ้ำ
    var F = L.features || [];
    var has = function (k) { return F.indexOf(k) >= 0; };
    if (F.length) {
      var util = [];
      if (has('electric')) util.push('ไฟฟ้า');
      if (has('water')) util.push('น้ำประปา');
      out.push(util.length
        ? row('สาธารณูปโภค', 'ok', util.join(' · '), 'ตามที่ทีมงานบันทึกจากการลงพื้นที่')
        : row('สาธารณูปโภค', 'warn', 'ยังไม่พบไฟฟ้าหรือน้ำประปา',
              'ทีมงานกรอกข้อมูลแปลงแล้วแต่ไม่ได้ระบุว่ามีไฟฟ้าหรือน้ำประปา — ควรสอบถามเพิ่ม'));
    } else {
      out.push(row('สาธารณูปโภค', 'none', '', GREY_NOTE));
    }

    // 11 หมุดหลักเขต · พบไม่ครบ = ประเด็นที่ต้องตรวจเพิ่ม · ผ่าน topic() ที่เดียว
    out.push(topicRow('หมุดหลักเขต', topic(L, 'markers')));

    // 12 สิ่งปลูกสร้างหรือแนวรุกล้ำ
    if (H.structures === 'encroach') {
      out.push(row('สิ่งปลูกสร้างและแนวรุกล้ำ', 'bad', v.STRUCTURE_TH.encroach,
        H.structureNote || 'พบแนวรุกล้ำในแปลง — ผู้ซื้อควรตรวจสอบรายละเอียดกับทีมงานก่อนตัดสินใจ'));
    } else if (H.structures === 'none') {
      out.push(row('สิ่งปลูกสร้างและแนวรุกล้ำ', 'ok', v.STRUCTURE_TH.none,
        H.structureNote || 'ไม่พบสิ่งปลูกสร้างหรือแนวรุกล้ำในวันที่ทีมงานลงพื้นที่'));
    } else if (H.structures) {
      out.push(row('สิ่งปลูกสร้างและแนวรุกล้ำ', 'warn', v.STRUCTURE_TH[H.structures] || H.structures,
        H.structureNote || 'มีการใช้ประโยชน์อยู่ในแปลง ควรสอบถามรายละเอียดเพิ่มเติม'));
    } else {
      out.push(row('สิ่งปลูกสร้างและแนวรุกล้ำ', 'none', '', GREY_NOTE));
    }

    // 13 ประเด็นที่ต้องตรวจเพิ่มเติม
    if (H.todos && H.todos.length) {
      out.push(row('ประเด็นที่ต้องตรวจเพิ่มเติม', 'warn', H.todos.length + ' รายการ',
        H.todos.map(function (t) { return '• ' + t.label + (t.note ? (' — ' + t.note) : ''); }).join('\n')));
    } else if (H.at) {
      out.push(row('ประเด็นที่ต้องตรวจเพิ่มเติม', 'ok', 'ไม่มีรายการค้าง',
        'ทีมงานไม่ได้บันทึกประเด็นที่ต้องตรวจเพิ่มไว้ ณ วันที่ตรวจ'));
    } else {
      out.push(row('ประเด็นที่ต้องตรวจเพิ่มเติม', 'none', '', GREY_NOTE));
    }

    // 14 วันที่ตรวจล่าสุดและเอกสารอ้างอิง
    if (H.at) {
      var who = H.by ? (' โดย ' + H.by) : '';
      out.push(row('วันที่ตรวจข้อมูลล่าสุด', 'ok',
        (w.NJVerified ? w.NJVerified.thaiDate(H.at) : H.at) + who,
        (H.refs && H.refs.length)
          ? ('เอกสารอ้างอิง: ' + H.refs.join(' · '))
          : 'ข้อมูลทั้งหมดในตารางนี้เป็นข้อเท็จจริง ณ วันที่ตรวจ'));
    } else {
      out.push(row('วันที่ตรวจข้อมูลล่าสุด', 'none', '',
        'ยังไม่มีการบันทึกวันที่ตรวจรายงานสุขภาพแปลงนี้'));
    }

    return out;
  }

  var STATE_TH = {
    ok:   'ตรวจแล้ว ไม่พบประเด็นสำคัญ',
    warn: 'ต้องตรวจเพิ่มเติม',
    bad:  'พบประเด็นที่ผู้ซื้อควรทราบ',
    none: 'ยังไม่มีข้อมูล'
  };
  var STATE_ICO = { ok: '✓', warn: '!', bad: '!', none: '—' };

  function rowHtml(r) {
    // ⚠️ ทุกแถวมีทั้งไอคอน ข้อความสถานะ และคำอธิบาย — ห้ามเหลือแค่สี (กติกาข้อ 1)
    return '<div class="njh-row ' + r.state + '">' +
      '<span class="njh-ico" aria-hidden="true">' + STATE_ICO[r.state] + '</span>' +
      '<div class="njh-c">' +
        '<b>' + esc(r.label) + '</b>' +
        (r.value ? '<span class="njh-v">' + esc(r.value) + '</span>' : '') +
        '<span class="njh-st">' + esc(STATE_TH[r.state]) + '</span>' +
        (r.note ? '<span class="njh-note">' + esc(r.note).replace(/\n/g, '<br>') + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  /* ---- ตารางเต็ม ----
     ⚠️ ขึ้นเฉพาะแปลงที่ **มีคนกรอกรายงานสุขภาพแปลงไว้จริง** (`L.health` ไม่เป็น null)
     ไม่ใช่ขึ้นทันทีที่ประกอบแถวสีเขียวได้จากข้อมูลเดิม · เหตุผล 2 ข้อ:

       1. แปลงเก่าทุกแปลงบนเว็บมี deedType/deedArea/checks อยู่แล้ว ถ้าไม่กั้นตรงนี้
          ตารางนี้จะโผล่ขึ้นทุกแปลงในวันที่ deploy ทั้งที่ยังไม่มีใครไปตรวจอะไรเพิ่ม
          ซึ่งขัดกับที่ตกลงกันไว้ว่าประกาศเดิมต้องไม่เปลี่ยนจนกว่าทีมจะกรอกข้อมูลใหม่
       2. หัวข้อ เนื้อที่ / ทางเข้าออก / หมุดหลักเขต ซ้ำกับแผงผลตรวจ 7 หัวข้อเดิมที่อยู่ล่างลงไป
          ขึ้นทั้งสองอันโดยที่ไม่มีข้อมูลใหม่มาเพิ่ม = อ่านซ้ำสองรอบโดยไม่ได้อะไรเพิ่ม
          · เมื่อขึ้นทั้งคู่ สามหัวข้อนี้ต้องผ่าน topic() ตัวเดียวกันเสมอ (10 ต.ค. 2569 · landconsist.test.js)
            ไม่งั้นสองแผงขัดกันเองบนหน้าเดียว (เจอจริง OP-102)

     กรอกช่องไหนก็ได้แค่ช่องเดียวในฟอร์มฝั่งพนักงาน ตารางก็ขึ้นทั้งใบพร้อมข้อมูลเดิมที่มีอยู่แล้ว */
  function tableHtml(L) {
    if (!L || !L.health) return '';
    var rows = rowsOf(L);
    var known = rows.filter(function (r) { return r.state !== 'none'; });
    if (!known.length) return '';

    var n = { ok: 0, warn: 0, bad: 0, none: 0 };
    rows.forEach(function (r) { n[r.state]++; });
    var sum = [];
    if (n.ok) sum.push(n.ok + ' หัวข้อตรวจแล้วไม่พบประเด็น');
    if (n.warn) sum.push(n.warn + ' หัวข้อต้องตรวจเพิ่ม');
    if (n.bad) sum.push(n.bad + ' หัวข้อมีประเด็นที่ควรทราบ');
    if (n.none) sum.push(n.none + ' หัวข้อยังไม่มีข้อมูล');

    return '<section class="njhc" aria-labelledby="njh-h">' +
      '<div class="njh-head">' +
        '<h2 id="njh-h">รายงานสุขภาพแปลง</h2>' +
        '<p>' + esc(sum.join(' · ')) + '</p>' +
      '</div>' +
      '<div class="njh-legend">' +
        Object.keys(STATE_TH).map(function (k) {
          return '<span class="njh-lg ' + k + '"><i aria-hidden="true">' + STATE_ICO[k] + '</i>' + esc(STATE_TH[k]) + '</span>';
        }).join('') +
      '</div>' +
      rows.map(rowHtml).join('') +
      '<p class="njh-foot">ตารางนี้สรุปจากข้อมูลที่ทีมงานตรวจและบันทึกไว้จริงเท่านั้น ' +
      'หัวข้อที่ขึ้นว่า “ยังไม่มีข้อมูล” หมายถึงยังไม่ได้ตรวจ <b>ไม่ได้แปลว่าไม่มีหรือไม่ผ่าน</b> — ' +
      'ทักไลน์ขอให้ทีมช่างรังวัดตรวจเพิ่มเติมได้</p>' +
    '</section>';
  }

  w.NJHealth = { tableHtml: tableHtml, rowsOf: rowsOf, STATE_TH: STATE_TH,
    topic: topic, measuredArea: measuredArea, isAreaValue: isAreaValue, frontageM: frontageM };
})(window, document);
