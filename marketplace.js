(function(){
  'use strict';
  // หน้าแรก "ที่ดินชัวร์" — ดึงแปลงที่ดินสดจาก nj-survey-system
  //
  // ⚠️ กติกาข้อเดียวที่ห้ามผ่อนในไฟล์นี้: แสดงได้เฉพาะสิ่งที่ API ส่งมาจริงเท่านั้น
  // ห้ามมีแปลงตัวอย่าง ห้ามเติมข้อความแทนช่องที่ไม่มีข้อมูล (เช่น "มีทางเข้าออก",
  // "โฉนด", จำนวนรูปขั้นต่ำ) เพราะทุกบรรทัดบนการ์ดนี้ผู้ซื้อเข้าใจว่าเป็นข้อเท็จจริง
  // ที่ผ่านการรังวัดมาแล้ว — ซึ่งเป็นสิ่งเดียวที่แบรนด์นี้ขาย
  //
  // /api/public/listings ส่งมาเท่านี้: id · type · parcelInfo · estValue · blurb · photos · updatedAt
  // ช่องไหนไม่มี = ไม่แสดงบรรทัดนั้น ไม่ใช่เติมข้อความกลางๆ ลงไปแทน

  var LINE='https://line.me/R/ti/p/@716lffzt';
  var TEL='tel:021620405';
  var state={listings:[],loaded:false,query:'',price:'all',type:'all'};

  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
  function money(value){if(!Number(value))return 'ราคาติดต่อสอบถาม';return '฿'+Number(value).toLocaleString('th-TH');}
  function ago(iso){
    var d=new Date(iso),days=Math.floor((Date.now()-d.getTime())/86400000);
    if(!iso||isNaN(d))return '';
    if(days<=0)return 'อัปเดตวันนี้';
    if(days===1)return 'อัปเดตเมื่อวาน';
    if(days<31)return 'อัปเดต '+days+' วันที่แล้ว';
    return 'อัปเดต '+d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
  }

  function normalize(item,index){
    return {
      id:item.id||('land-'+index),
      type:item.type==='rent'?'rent':'sell',
      parcelInfo:item.parcelInfo||'',
      estValue:Number(item.estValue||0),
      blurb:item.blurb||'',
      photos:Array.isArray(item.photos)?item.photos:[],
      updatedAt:item.updatedAt||''
    };
  }

  function card(item){
    var media=item.photos[0]
      ? '<img src="'+esc(item.photos[0])+'" alt="'+esc(item.parcelInfo||'แปลงที่ดิน')+'" loading="lazy">'
      : '<div class="fallback-land" aria-hidden="true"></div>';
    // นับรูปตามจริง ไม่มีรูปก็ไม่ต้องขึ้นตัวเลข
    var count=item.photos.length>1?'<span class="photo-count">▣ '+item.photos.length+'</span>':'';
    // คำโปรยมาจากที่ทีมงานเขียนเองในระบบ ไม่มีก็เว้นไว้
    var facts=item.blurb?'<div class="card-facts"><span>'+esc(item.blurb)+'</span></div>':'';
    var when=ago(item.updatedAt);
    return '<article class="land-card" data-id="'+esc(item.id)+'">'+
      '<div class="card-media">'+media+
        '<div class="card-tags"><span>'+(item.type==='rent'?'ให้เช่า':'ขาย')+'</span><span class="verified">✓ รังวัดแล้ว</span></div>'+
        count+
      '</div>'+
      '<div class="card-body">'+
        '<div><span class="card-price">'+money(item.estValue)+'</span></div>'+
        '<h3 class="card-title">'+esc(item.parcelInfo||'แปลงที่ดิน')+'</h3>'+
        facts+
        '<div class="card-agent">'+
          '<span class="agent-avatar">NJ</span>'+
          '<div><b>ทีมที่ดินชัวร์</b>'+(when?'<small>'+esc(when)+'</small>':'')+'</div>'+
          '<span class="contact-mini">'+
            '<a href="'+LINE+'" target="_blank" rel="noopener" class="line" data-contact="line" aria-label="ติดต่อทางไลน์">●</a>'+
            '<a href="'+TEL+'" data-contact="tel" aria-label="โทรสอบถาม">☎</a>'+
          '</span>'+
        '</div>'+
      '</div>'+
    '</article>';
  }

  function filtered(){
    return state.listings.filter(function(item){
      var q=state.query.toLowerCase();
      var text=(item.parcelInfo+' '+item.blurb).toLowerCase();
      var qOk=!q||text.indexOf(q)>-1;
      var priceOk=state.price==='all'||(item.estValue>0&&item.estValue<=Number(state.price));
      var typeOk=state.type==='all'||item.type===state.type;
      return qOk&&priceOk&&typeOk;
    });
  }

  // ยังไม่มีแปลงประกาศ = คนที่เข้ามาถึงตรงนี้จะเจอทางตัน
  // เปลี่ยนเป็นข้อเสนอที่ใช้ได้จริงแทน — คนที่สนใจตลาดที่ดินจำนวนมากคือเจ้าของที่ดินเอง
  function emptyHtml(isFilter){
    if(isFilter){
      return '<div class="empty-result"><b>ยังไม่พบแปลงที่ตรงกับการค้นหา</b>'+
        'ลองเปลี่ยนทำเลหรือช่วงราคา แล้วค้นหาอีกครั้ง</div>';
    }
    return '<div class="empty-result">'+
      '<b>แปลงชุดแรกกำลังอยู่ระหว่างรังวัดยืนยันเขต</b>'+
      'เราจะไม่ลงประกาศแปลงใดจนกว่าจะรังวัดยืนยันเขตจริงเสร็จ และได้รับความยินยอมจากเจ้าของที่ดินแล้ว '+
      'ทักไลน์ไว้เพื่อให้เราแจ้งทันทีที่แปลงใหม่เปิดขาย หรือถ้าคุณมีที่ดินอยากขาย ฝากขายกับเราได้ฟรี'+
      '<span class="empty-actions">'+
        '<a class="outline-btn" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">แจ้งเตือนแปลงใหม่ทางไลน์</a>'+
        '<a class="post-btn" href="consign.html">ฝากขายที่ดินฟรี →</a>'+
      '</span>'+
    '</div>';
  }

  function render(message){
    var grid=document.getElementById('listing-grid');
    var list=filtered();
    if(message){
      var note=document.getElementById('result-note');
      note.hidden=false;
      note.textContent=message+' — พบ '+list.length+' รายการ';
    }
    if(!list.length){ grid.innerHTML=emptyHtml(state.loaded&&state.listings.length>0); return; }
    grid.innerHTML=list.map(card).join('');
  }

  function load(){
    var base=window.NJ_API_BASE||'https://nj-survey-system.onrender.com';
    fetch(base+'/api/public/listings')
      .then(function(r){if(!r.ok)throw new Error();return r.json();})
      .then(function(data){
        state.listings=(data.listings||[]).map(normalize);
        state.loaded=true;
        render();
      })
      .catch(function(){
        // โหลดไม่ได้ ≠ ไม่มีแปลง — ต้องบอกตามจริงและให้ช่องทางติดต่อ ไม่ใช่แสดงว่าว่างเปล่า
        document.getElementById('listing-grid').innerHTML=
          '<div class="empty-result"><b>ตอนนี้โหลดรายการที่ดินไม่สำเร็จ</b>'+
          'กรุณาลองใหม่อีกครั้ง หรือโทรสอบถามได้ที่ 02-162-0405'+
          '<span class="empty-actions"><a class="outline-btn" href="'+TEL+'" data-contact="tel">โทร 02-162-0405</a></span></div>';
      });
  }

  // ---------- ตัวกรอง ----------
  document.querySelectorAll('[data-purpose]').forEach(function(btn){
    btn.addEventListener('click',function(){
      document.querySelectorAll('[data-purpose]').forEach(function(x){x.classList.remove('selected');});
      btn.classList.add('selected');
      state.type=btn.dataset.purpose;
      document.getElementById('type-filter').value=state.type;
      render(state.type==='rent'?'ที่ดินให้เช่า':'ที่ดินขาย');
    });
  });

  document.getElementById('search-form').addEventListener('submit',function(e){
    e.preventDefault();
    state.query=document.getElementById('search-input').value.trim();
    state.price=document.getElementById('price-filter').value;
    state.type=document.getElementById('type-filter').value;
    render(state.query?'ผลการค้นหา “'+state.query+'”':'ผลการค้นหาทั้งหมด');
    document.getElementById('listings').scrollIntoView({behavior:'smooth'});
    if(window.njTrack)window.njTrack('Search',{search_string:state.query});
  });

  // ปุ่มค้นหาด่วน — ทุกปุ่มกรองจริงจากข้อมูลที่มี ไม่ใช่ขึ้นข้อความเฉยๆ
  document.querySelectorAll('[data-quick]').forEach(function(link){
    link.addEventListener('click',function(){
      var q=link.dataset.quick;
      state.query='';
      document.getElementById('search-input').value='';
      if(q==='sell'||q==='rent'){ state.type=q; state.price='all'; }
      else if(q==='under5'){ state.type='all'; state.price='5000000'; }
      else { state.type='all'; state.price='all'; }
      document.getElementById('type-filter').value=state.type;
      document.getElementById('price-filter').value=state.price;
      render(link.querySelector('b').textContent);
    });
  });

  // ปุ่มติดต่อบนการ์ด สร้างหลังโหลดข้อมูล จึงผูกที่ container ทีเดียว
  document.getElementById('listing-grid').addEventListener('click',function(e){
    var a=e.target.closest('[data-contact]');
    if(!a)return;
    if(a.getAttribute('data-contact')==='line'){
      if(window.njTrackInternal)window.njTrackInternal('line_click');
      if(window.njTrack)window.njTrack('Contact',{method:'line',from:'listing_card'});
    }else{
      if(window.njTrackInternal)window.njTrackInternal('tel_click');
      if(window.njTrack)window.njTrack('Contact',{method:'phone',from:'listing_card'});
    }
  });

  document.getElementById('year').textContent=new Date().getFullYear()+543;   // ปี พ.ศ.
  load();
  if(window.njTrackInternal)window.njTrackInternal('pageview');
})();
