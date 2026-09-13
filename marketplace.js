(function(){
  'use strict';
  // หน้าแรก "ที่ดินชัวร์" — ดึงแปลงที่ดินสดจาก nj-survey-system
  //
  // ⚠️ ตัวเรนเดอร์การ์ด · ตัวดึงข้อมูล · ข้อความตอนไม่มีแปลง ย้ายไปอยู่ที่ listingcard.js แล้ว
  // ใช้ร่วมกับหน้ารวมประกาศ (listings.js) — กติกา "แสดงเฉพาะสิ่งที่ API ส่งมาจริง" อยู่ในไฟล์นั้น
  // ห้ามก๊อปตัวเรนเดอร์กลับมาไว้ที่นี่อีก ไม่งั้นกติกาข้อนั้นจะมีสองที่ให้ลืมแก้
  // ไฟล์นี้เหลือเฉพาะเรื่องของหน้าแรก: ตัวกรองด่วน · ฟอร์มค้นหา · การผูกกับ DOM ของ index.html
  var NJL = window.NJListing;
  var card = NJL.card;   // ตัวเรนเดอร์การ์ดตัวเดียวกับหน้ารวมประกาศ

  var state={listings:[],loaded:false,query:'',price:'all',type:'all',page:1};
  var PAGE_SIZE=9;   // หน้าแรกโชว์หน้าละ 9 แปลง (3×3) ที่เหลือไปหน้าถัดไป

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

  // message = มาจากการกรอง/ค้นหาใหม่ → กลับไปหน้า 1 เสมอ · ไม่มี message = แค่เปลี่ยนหน้า/โหลดครั้งแรก
  function render(message){
    var grid=document.getElementById('listing-grid');
    var list=filtered();
    if(message){
      state.page=1;
      var note=document.getElementById('result-note');
      note.hidden=false;
      note.textContent=message+' — พบ '+list.length+' รายการ';
    }
    if(!list.length){ grid.innerHTML=NJL.emptyHtml(state.loaded&&state.listings.length>0); renderPager(0); return; }
    var pages=Math.ceil(list.length/PAGE_SIZE);
    if(state.page>pages)state.page=pages;
    var start=(state.page-1)*PAGE_SIZE;
    grid.innerHTML=list.slice(start,start+PAGE_SIZE).map(card).join('');
    renderPager(list.length);
  }

  // ปุ่มเปลี่ยนหน้า — แปลงไม่เกิน 9 = ซ่อนทั้งแถบ
  // ⚠️ pager ต้องอยู่นอก #listing-grid — compare.js เฝ้า DOM ในตะแกรงนั้นอยู่ (ดูกับดัก MutationObserver ใน CLAUDE.md)
  function renderPager(total){
    var pager=document.getElementById('listing-pager');
    if(!pager)return;
    var pages=Math.ceil(total/PAGE_SIZE);
    if(pages<=1){ pager.hidden=true; pager.innerHTML=''; return; }
    var p=state.page, html='';
    html+='<button type="button" data-page="'+(p-1)+'"'+(p<=1?' disabled':'')+' aria-label="หน้าก่อนหน้า">‹ ก่อนหน้า</button>';
    for(var i=1;i<=pages;i++){
      html+='<button type="button" data-page="'+i+'"'+(i===p?' aria-current="page"':'')+'>'+i+'</button>';
    }
    html+='<button type="button" data-page="'+(p+1)+'"'+(p>=pages?' disabled':'')+' aria-label="หน้าถัดไป">ถัดไป ›</button>';
    var from=(p-1)*PAGE_SIZE+1, to=Math.min(p*PAGE_SIZE,total);
    html+='<div class="pager-info">แสดง '+from+'–'+to+' จาก '+total+' แปลง</div>';
    pager.innerHTML=html;
    pager.hidden=false;
  }

  var pagerEl=document.getElementById('listing-pager');
  if(pagerEl)pagerEl.addEventListener('click',function(e){
    var btn=e.target.closest('button[data-page]');
    if(!btn||btn.disabled)return;
    state.page=Number(btn.dataset.page);
    render();
    // เลื่อนกลับไปหัวแถบ ไม่งั้นคนกดหน้า 2 แล้วยังยืนอยู่ท้ายตะแกรง เห็นแต่ปุ่ม
    document.getElementById('listings').scrollIntoView({behavior:'smooth'});
  });

  function load(){
    NJL.fetchListings()
      .then(function(list){
        state.listings=list;
        state.loaded=true;
        render();
      })
      .catch(function(){
        // โหลดไม่ได้ ≠ ไม่มีแปลง — ต้องบอกตามจริงและให้ช่องทางติดต่อ ไม่ใช่แสดงว่าว่างเปล่า
        document.getElementById('listing-grid').innerHTML=NJL.loadFailedHtml();
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

  // ผูกปุ่มติดต่อ + คลิกการ์ด (ตัวเดียวกับหน้ารวมประกาศ — ดู listingcard.js)
  NJL.bindGrid(document.getElementById('listing-grid'),'listing_card');

  document.getElementById('year').textContent=new Date().getFullYear()+543;   // ปี พ.ศ.
  load();
  if(window.njTrackInternal)window.njTrackInternal('pageview');
})();
