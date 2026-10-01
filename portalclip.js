(function(){
  'use strict';
  // คลิปแนะนำระบบ 1:18 นาทีบนหน้า portal.html (#ดูคลิป) — ปุ่มเล่นทับจอ + สารบัญบท + ลิงก์ที่ hero
  //
  // ทำไมไม่ใช้ njintro.js / introclip.js: njintro.js ผูกกับแถบ .nj-intro ของ services.html
  // ส่วน introclip.js ผูกกับ #ดูคลิป ของหน้าแรก (.ic-*) · ไฟล์นี้เล็กและมีเรื่องเดียวของหน้านี้ (.pc-*)
  //
  // ⚠️ กติกาเดียวกับสองไฟล์นั้น — ห้ามให้สองสถานะซ้อนกัน:
  //   ยังไม่เล่น → โปสเตอร์ + ปุ่มเล่นที่เราวาดเอง (ไม่มีแถบควบคุมของเบราว์เซอร์)
  //   เล่นแล้ว  → แถบควบคุมของเบราว์เซอร์ (ไม่มีปุ่มของเรา)
  // ⚠️ HTML ใส่ controls ไว้ตั้งแต่แรก แล้วไฟล์นี้เป็นคนถอดออก — ทำกลับด้านไม่ได้
  //   ถ้าไฟล์นี้โหลดไม่สำเร็จ ต้องเหลือวิดีโอที่กดเล่นได้ตามปกติ (ปุ่มของเราและสารบัญซ่อนการกดใน CSS จนกว่าจะได้ .js-ready)
  // ⚠️ ไม่เล่นอัตโนมัติ: คลิปมีเสียงพูด และ preload="none" — เล่นเองคือกินเน็ตมือถือลูกค้าฟรีๆ
  // ⚠️ ลิงก์ที่ hero และปุ่มสารบัญต้องเรียก start() ในจังหวะคลิกทันที ห้ามรอเลื่อนจอถึงก่อน
  //   — นโยบายสื่อของเบราว์เซอร์อนุญาตเล่นคลิปมีเสียงเฉพาะตอนที่ผู้ใช้เพิ่งกด
  //   · ลิงก์ hero ไม่ preventDefault ปล่อยให้ href พาไปตามปกติ
  var sec = document.getElementById('ดูคลิป');
  if (!sec) return;
  var vid = sec.querySelector('.pc-frame video');
  var btn = sec.querySelector('.pc-play');
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
      p.catch(function(){ vid.removeAttribute('controls'); btn.style.display = ''; mark(currentIndex()); });
    }
    // นับครั้งแรกที่กดเล่นของการเข้าหน้านี้ · njTrack รอความยินยอมคุกกี้เองอยู่แล้ว
    if (!counted && typeof njTrack === 'function') {
      counted = true;
      try { njTrack('ViewContent', { content_name: 'portal_intro_clip' }); } catch (e) {}
    }
  }

  btn.addEventListener('click', start);
  Array.prototype.forEach.call(document.querySelectorAll('[data-pc-play]'), function(a){
    a.addEventListener('click', function(){ if (vid.paused) start(); });
  });

  // ---- ข้อความเต็มของคลิป: พับไว้ตอนเริ่ม (ไม่มี JS = แสดงเต็ม) กดหัวข้อเพื่อกาง/พับ ----
  var sbtn = sec.querySelector('.pc-script-btn');
  var sbody = document.getElementById('pc-script-body');
  if (sbtn && sbody) {
    sbody.hidden = true;
    sbtn.setAttribute('aria-expanded', 'false');
    sbtn.addEventListener('click', function(){
      var open = sbtn.getAttribute('aria-expanded') === 'true';
      sbtn.setAttribute('aria-expanded', open ? 'false' : 'true');
      sbody.hidden = open;
    });
  }

  // ---- สารบัญบท: กดแล้วข้ามไปเวลานั้นและเล่นต่อ · ไฮไลต์บทที่กำลังฟังอยู่ ----
  var items = Array.prototype.slice.call(sec.querySelectorAll('.pc-chap li'));
  var chaps = items.map(function(li){
    var b = li.querySelector('button');
    return { li: li, btn: b, t: parseFloat(b.getAttribute('data-t')) || 0 };
  });

  function mark(i){
    chaps.forEach(function(c, k){
      var on = k === i;
      c.li.classList.toggle('on', on);
      if (on) c.btn.setAttribute('aria-current', 'true'); else c.btn.removeAttribute('aria-current');
    });
  }
  function currentIndex(){
    var now = vid.currentTime || 0, idx = -1;
    chaps.forEach(function(c, k){ if (now + 0.25 >= c.t) idx = k; });
    return idx;
  }

  function seek(t){
    // preload="none": ยังไม่มีเมทาดาต้า สั่ง currentTime ตอนนี้ไม่ได้ผล — รอโหลดแล้วค่อยกระโดด
    if (vid.readyState >= 1) {
      vid.currentTime = t;
    } else {
      var once = function(){ vid.removeEventListener('loadedmetadata', once); vid.currentTime = t; };
      vid.addEventListener('loadedmetadata', once);
    }
    if (vid.paused) start();
    // มือถือ: สารบัญอยู่ใต้คลิป กดแล้วต้องพาสายตากลับไปที่จอคลิป ไม่งั้นคนไม่เห็นว่าเลื่อนแล้ว
    var r = vid.getBoundingClientRect();
    if (r.top < 0 || r.bottom > (window.innerHeight || document.documentElement.clientHeight)) {
      var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      try { vid.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' }); } catch (e) { vid.scrollIntoView(); }
    }
  }

  chaps.forEach(function(c, k){
    c.btn.addEventListener('click', function(){ mark(k); seek(c.t); });
  });
  vid.addEventListener('timeupdate', function(){ mark(currentIndex()); });
  vid.addEventListener('seeked', function(){ mark(currentIndex()); });
})();
