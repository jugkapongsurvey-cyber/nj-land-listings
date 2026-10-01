(function(){
  'use strict';
  // คลิปแนะนำ 30 วินาทีบนหน้าแรก (#ดูคลิป) — ปุ่มเล่นทับจอ + ลิงก์ "ดูคลิป" ที่ hero
  //
  // ทำไมไม่ใช้ njintro.js: ไฟล์นั้นผูกกับแถบ .nj-intro ของ services.html (สไตล์อยู่ใน services.css)
  // และหน้าแรกตั้งใจเลิกโหลดมันแล้ว (homepage.test.js ข้อ 7) — ไฟล์นี้เล็กและมีเรื่องเดียว
  //
  // ⚠️ กติกาเดียวกับ njintro.js — ห้ามให้สองสถานะซ้อนกัน:
  //   ยังไม่เล่น → โปสเตอร์ + ปุ่มเล่นที่เราวาดเอง (ไม่มีแถบควบคุมของเบราว์เซอร์)
  //   เล่นแล้ว  → แถบควบคุมของเบราว์เซอร์ (ไม่มีปุ่มของเรา)
  // ⚠️ HTML ใส่ controls ไว้ตั้งแต่แรก แล้วไฟล์นี้เป็นคนถอดออก — ทำกลับด้านไม่ได้
  //   ถ้าไฟล์นี้โหลดไม่สำเร็จ ต้องเหลือวิดีโอที่กดเล่นได้ตามปกติ (ปุ่มของเราซ่อนใน CSS จนกว่าจะได้ .js-ready)
  // ⚠️ ไม่เล่นอัตโนมัติ: คลิปมีเสียงพูด และ preload="none" — เล่นเองคือกินเน็ตมือถือลูกค้าฟรีๆ
  // ⚠️ ลิงก์ที่ hero ต้องเรียก start() ในจังหวะคลิกทันที ห้ามรอเลื่อนจอถึงก่อน — นโยบายสื่อของเบราว์เซอร์
  //   อนุญาตเล่นคลิปมีเสียงเฉพาะตอนที่ผู้ใช้เพิ่งกด · และไม่ preventDefault ปล่อยให้ href พาไปตามปกติ
  var sec = document.getElementById('ดูคลิป');
  if (!sec) return;
  var vid = sec.querySelector('.ic-frame video');
  var btn = sec.querySelector('.ic-play');
  if (!vid || !btn) return;

  sec.classList.add('js-ready');
  vid.removeAttribute('controls');

  var counted = false;
  function start(){
    btn.style.display = 'none';
    vid.setAttribute('controls', '');
    // เบราว์เซอร์บางตัวปฏิเสธการเล่น (นโยบายสื่อ/โหมดประหยัดข้อมูล) — คืนปุ่มให้กดใหม่
    var p = vid.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function(){ vid.removeAttribute('controls'); btn.style.display = ''; });
    }
    // นับครั้งแรกที่กดเล่นของการเข้าหน้านี้ · njTrack รอความยินยอมคุกกี้เองอยู่แล้ว
    if (!counted && typeof njTrack === 'function') {
      counted = true;
      try { njTrack('ViewContent', { content_name: 'home_intro_clip' }); } catch (e) {}
    }
  }

  btn.addEventListener('click', start);
  Array.prototype.forEach.call(document.querySelectorAll('[data-ic-play]'), function(a){
    a.addEventListener('click', function(){ if (vid.paused) start(); });
  });
})();
