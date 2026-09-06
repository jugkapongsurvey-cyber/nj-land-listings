(function(){
  'use strict';
  // แถบคลิปพรีเซนเตอร์แนวตั้งบนหน้าแรก — ปุ่มเล่นทับจอ
  // ตอนนี้มี 2 แถบ (2026-09-07): #ตรวจก่อนโอน (โฆษณา 30 วิ) และ #แนะนำระบบ (แนะนำระบบ 1:18)
  // จึงเลิกผูกด้วย id เดี่ยว มาวนทุก .nj-intro แล้วหาปุ่ม/วิดีโอ "ในแถบของตัวเอง" แทน
  // เพิ่มแถบที่สามเมื่อไหร่ก็แค่เขียน HTML ตามโครงเดิม ไม่ต้องแก้ไฟล์นี้อีก
  //
  // ⚠️ กติกาของสองสถานะนี้ ห้ามให้ซ้อนกัน:
  //   ยังไม่เล่น → โปสเตอร์ + ปุ่มเล่นที่เราวาดเอง (ไม่มีแถบควบคุมของเบราว์เซอร์)
  //   เล่นแล้ว  → แถบควบคุมของเบราว์เซอร์ (ไม่มีปุ่มของเรา)
  // ถ้าปล่อยให้มีพร้อมกัน แถบควบคุมจะทับปุ่มที่มุมล่างจนอ่านไม่ออก (เจอจริงตอนพรีวิว)
  //
  // ⚠️ HTML ใส่ controls ไว้ตั้งแต่แรก แล้วไฟล์นี้เป็นคนถอดออก — ทำกลับด้านไม่ได้
  // เพราะถ้าไฟล์นี้โหลดไม่สำเร็จ ต้องเหลือวิดีโอที่กดเล่นได้ตามปกติ ไม่ใช่ภาพนิ่งที่กดอะไรไม่ได้เลย
  // (ปุ่มของเราก็ซ่อนไว้ใน CSS จนกว่าจะได้คลาส .js-ready ด้วยเหตุผลเดียวกัน)
  //
  // ⚠️ ไม่เล่นอัตโนมัติ: ทั้งสองคลิปมีเสียงพูด และไฟล์ใหญ่ (preload="none" จึงยังไม่โหลดจนกว่าจะกด)
  // เล่นเองคือกินเน็ตมือถือลูกค้าฟรีๆ และเสียงดังขึ้นมาเองกลางหน้าเว็บ

  var starters = {};   // id ของแถบ -> ฟังก์ชัน start ของแถบนั้น

  Array.prototype.forEach.call(document.querySelectorAll('.nj-intro'), function(sec){
    var vid = sec.querySelector('.nj-intro-frame video');
    var btn = sec.querySelector('.nj-intro-play');
    if (!vid || !btn) return;

    sec.classList.add('js-ready');
    vid.removeAttribute('controls');

    function start(){
      // คลิปอื่นที่เล่นค้างอยู่ต้องหยุดก่อน ไม่งั้นเสียงพูดสองคลิปทับกัน
      Array.prototype.forEach.call(document.querySelectorAll('.nj-intro-frame video'), function(other){
        if (other !== vid && !other.paused) other.pause();
      });
      btn.style.display = 'none';
      vid.setAttribute('controls', '');
      // เบราว์เซอร์บางตัวปฏิเสธการเล่น (นโยบายสื่อ/โหมดประหยัดข้อมูล) — คืนปุ่มให้กดใหม่
      // ไม่ปล่อยให้จอค้างเป็นภาพนิ่งโดยไม่มีอะไรบอกว่าเกิดอะไรขึ้น
      var p = vid.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function(){ vid.removeAttribute('controls'); btn.style.display = ''; });
      }
    }

    btn.addEventListener('click', start);
    if (sec.id) starters[sec.id] = start;
  });

  // ปุ่ม "ดูคลิปแนะนำระบบ" ที่ hero (และที่อื่นที่ติด data-nj-intro-play)
  // ค่าของแอตทริบิวต์ = id ของแถบที่จะให้เล่น · ไม่ใส่ค่า = แถบ "แนะนำระบบ" ตามเดิม
  //
  // ⚠️ ต้องเรียก start() ในจังหวะคลิกทันที ห้ามรอให้เลื่อนจอถึงก่อน — นโยบายสื่อของเบราว์เซอร์
  // อนุญาตให้เล่นคลิปที่มีเสียงเฉพาะตอนที่ผู้ใช้เพิ่งกดเท่านั้น หน่วงเมื่อไหร่ play() ถูกปฏิเสธ
  // แล้วผู้ใช้จะเลื่อนไปเจอจอนิ่งๆ ที่ต้องกดซ้ำอีกที
  //
  // ปล่อยให้ href พาไปที่แถบคลิปตามปกติ ไม่ preventDefault — ถ้าไฟล์นี้ไม่ทำงาน
  // ลิงก์ยังต้องพาไปดูคลิปได้เหมือนลิงก์ธรรมดา
  Array.prototype.forEach.call(document.querySelectorAll('[data-nj-intro-play]'), function(a){
    a.addEventListener('click', function(){
      var target = a.getAttribute('data-nj-intro-play') || 'แนะนำระบบ';
      var fn = starters[target];
      if (fn) fn();
    });
  });
})();
