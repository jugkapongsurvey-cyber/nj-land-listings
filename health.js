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

  /* ---------- คำนวณ 14 หัวข้อจากข้อมูลที่ API ส่งมาจริง ----------
     L = ก้อน land ที่มาจาก /api/public/listings/:id */
  function rowsOf(L) {
    var H = L.health || {};
    var C = L.checks || {};
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

    // 3 เนื้อที่จากผลรังวัดล่าสุด — ต่างจากเอกสาร = ประเด็นที่ผู้ซื้อต้องรู้
    var ca = C.area || {};
    if (!ca.status && !ca.value) {
      out.push(row('เนื้อที่จากผลรังวัดล่าสุด', 'none', '',
        'ยังไม่มีผลรังวัดในระบบ — เนื้อที่จริงอาจต่างจากหน้าเอกสาร ตรวจได้ด้วยการรังวัดสอบเขต'));
    } else if (ca.status === 'warn') {
      out.push(row('เนื้อที่จากผลรังวัดล่าสุด', 'bad', ca.value,
        ca.note || 'ผลรังวัดต่างจากเนื้อที่ตามเอกสาร — ควรอ่านรายละเอียดก่อนตัดสินใจ'));
    } else {
      out.push(row('เนื้อที่จากผลรังวัดล่าสุด', ca.status === 'ok' ? 'ok' : 'warn', ca.value,
        ca.note || (ca.status === 'ok' ? 'วัดจริงในสนามแล้ว ตรงกับที่ประกาศ' : 'มีข้อมูลบางส่วน ยังต้องตรวจเพิ่ม')));
    }

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

    // 6 ทางเข้า–ออก · ⚠️ ที่ตาบอดต้องขึ้นแดงเสมอ เป็นข้อมูลที่ผู้ซื้อต้องรู้ที่สุด
    var ac = C.access || {};
    if (H.access === 'none') {
      out.push(row('ทางเข้า–ออก', 'bad', v.ACCESS_TH.none,
        (ac.note || '') || 'แปลงนี้ยังไม่มีทางเข้าออกตามกฎหมาย ผู้ซื้อควรตรวจสอบเรื่องทางเข้าออกก่อนตัดสินใจ'));
    } else if (H.access === 'shared') {
      out.push(row('ทางเข้า–ออก', 'warn', v.ACCESS_TH.shared,
        (ac.note || '') || 'ใช้ทางร่วมกับแปลงข้างเคียงแต่ยังไม่ได้จดทะเบียน — ควรตรวจสอบสิทธิ์การใช้ทางเพิ่มเติม'));
    } else if (H.access) {
      out.push(row('ทางเข้า–ออก', ac.status === 'warn' ? 'warn' : 'ok', v.ACCESS_TH[H.access] || H.access,
        ac.note || (ac.value ? ('หน้ากว้างทางเข้า ' + ac.value) : 'ทีมงานตรวจทางเข้าออกในสนามแล้ว')));
    } else if (ac.status || ac.value) {
      out.push(row('ทางเข้า–ออก', ac.status === 'warn' ? 'warn' : (ac.status === 'ok' ? 'ok' : 'warn'),
        ac.value, ac.note || 'มีผลตรวจทางเข้าออก แต่ยังไม่ได้ระบุประเภททางเข้าออก'));
    } else {
      out.push(row('ทางเข้า–ออก', 'none', '', GREY_NOTE));
    }

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

    // 11 หมุดหลักเขต · พบไม่ครบ = ประเด็นที่ต้องตรวจเพิ่ม
    var cm = C.markers || {};
    if (H.markerTotal > 0) {
      var found = (H.markerFound == null) ? null : H.markerFound;
      if (found === null) {
        out.push(row('หมุดหลักเขต', 'warn', 'ทั้งหมด ' + H.markerTotal + ' หมุด',
          'ยังไม่ได้บันทึกว่าพบหมุดครบหรือไม่'));
      } else if (found >= H.markerTotal) {
        out.push(row('หมุดหลักเขต', 'ok', 'พบครบ ' + found + ' จาก ' + H.markerTotal + ' หมุด',
          cm.note || 'ทีมช่างรังวัดพบหมุดหลักเขตครบทุกจุดในวันที่ลงพื้นที่'));
      } else {
        out.push(row('หมุดหลักเขต', 'bad', 'พบ ' + found + ' จาก ' + H.markerTotal + ' หมุด',
          cm.note || 'หมุดหลักเขตไม่ครบ — แนวเขตบางด้านยังยืนยันในสนามไม่ได้ ควรรังวัดสอบเขตก่อนโอน'));
      }
    } else if (cm.status || cm.value) {
      out.push(row('หมุดหลักเขต', cm.status === 'warn' ? 'bad' : (cm.status === 'ok' ? 'ok' : 'warn'),
        cm.value, cm.note || 'ผลตรวจหมุดหลักเขตจากงานรังวัด'));
    } else {
      out.push(row('หมุดหลักเขต', 'none', '', GREY_NOTE));
    }

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

    return '<section class="njh" aria-labelledby="njh-h">' +
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

  w.NJHealth = { tableHtml: tableHtml, rowsOf: rowsOf, STATE_TH: STATE_TH };
})(window, document);
