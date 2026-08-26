(function(){
  'use strict';
  // จัดการช่องใส่รูป (.ph) — มี 2 โหมด เพราะผู้ชมเว็บกับคนถ่ายรูปต้องการคนละอย่าง
  //
  //   โหมดปกติ (เว็บจริง)  : ช่องไหนยังไม่มีรูป ให้ซ่อนไปเลย ไม่ใช่โชว์กรอบว่าง
  //                          ถ้าทั้งกลุ่มไม่มีรูปสักช่อง ซ่อนทั้งกลุ่ม — ลูกค้าไม่ควรเห็นโครงที่ยังไม่เสร็จ
  //   โหมดดูสเปก (คนทำเว็บ) : แสดงกรอบประพร้อมบอกว่าช่องนี้ต้องถ่ายอะไร ชื่อไฟล์อะไร สัดส่วนเท่าไหร่
  //
  // เปิดโหมดดูสเปกได้ 2 ทาง: เปิดจาก localhost หรือเติม ?photos=dev ท้าย URL
  // เช่น https://njteedinsure.com/?photos=dev  ← ใช้ดูว่ายังขาดรูปไหนบ้างจากมือถือได้เลย

  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var wantDev  = location.search.indexOf('photos=dev')  >= 0;
  var wantLive = location.search.indexOf('photos=live') >= 0;   // ดูว่าลูกค้าเห็นอะไร ตอนเปิดจากเครื่องตัวเอง
  var devMode = wantLive ? false : (isLocal || wantDev);
  if (devMode) document.documentElement.classList.add('photo-dev');

  var slots = Array.prototype.slice.call(document.querySelectorAll('.ph'));
  var pending = slots.length;

  // ซ่อนกลุ่มที่ไม่มีรูปเลยสักช่อง (โหมดปกติเท่านั้น) — กันไม่ให้เหลือช่องว่างเป็นแถบ
  function tidyGroups(){
    if (devMode) return;
    ['.team-mosaic', '.field-strip', '.team-sub'].forEach(function(sel){
      var group = document.querySelector(sel);
      if (!group) return;
      var inside = group.querySelectorAll('.ph');
      var shown  = group.querySelectorAll('.ph.has-photo');
      if (inside.length && !shown.length) group.style.display = 'none';
    });
  }

  function settle(){ if (--pending <= 0) tidyGroups(); }

  slots.forEach(function(fig){
    var img = fig.querySelector('img');
    if (!img || !img.getAttribute('src')) { settle(); return; }

    // โหมดปกติ: ปล่อยให้รูปโหลดทันทีทุกช่อง จะได้รู้ผลเร็วและซ่อนช่องที่ไม่มีรูปก่อนผู้ใช้เลื่อนถึง
    // (รูปที่ไม่มีจริงมีขนาด 0 อยู่แล้ว ไม่เปลืองแบนด์วิดท์ · พอมีรูปครบแล้วค่อยกลับไปใช้ lazy ได้)
    if (!devMode) img.setAttribute('loading', 'eager');

    if (img.complete) {
      if (img.naturalWidth) fig.classList.add('has-photo');
      settle();
      return;
    }
    img.addEventListener('load', function(){
      if (img.naturalWidth) fig.classList.add('has-photo');
      settle();
    });
    img.addEventListener('error', settle);
  });

  if (!slots.length) tidyGroups();

  // รูปใน hero วางทับภาพวาดแนวเขต/หมุดของเดิม — เผยเฉพาะเมื่อโหลดสำเร็จ
  // ยังไม่มีรูป = ภาพวาดเดิมทำงานต่อตามปกติ ผู้ชมไม่เห็นอะไรผิดปกติเลย
  var heroWrap = document.querySelector('.hero-photo');
  if (heroWrap) {
    var heroImg = heroWrap.querySelector('img');
    if (heroImg && heroImg.getAttribute('src')) {
      if (heroImg.complete) { if (heroImg.naturalWidth) heroWrap.classList.add('on'); }
      else heroImg.addEventListener('load', function(){ heroWrap.classList.add('on'); });
    }
  }
})();
