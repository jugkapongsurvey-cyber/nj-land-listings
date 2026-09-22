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

  // ⚠️ `tier:'2'` = หน้าแรกตั้งต้นกรองเฉพาะแปลงที่รังวัดยืนยันแล้ว (ตรงกับปุ่มที่ติด is-on ใน index.html)
  //    สามค่านี้ต้องตรงกันเสมอ: ปุ่มใน index.html · ค่าตั้งต้นตรงนี้ · ค่าถอยใน readUrl()
  //    ไม่ตรงกันเมื่อไหร่ = ปุ่มขึ้นว่าเปิดอยู่แต่ผลไม่ได้ถูกกรอง (หรือกลับกัน) โดยไม่มี error
  var DEFAULT_TIER='2';
  var state={listings:[],loaded:false,query:'',price:'all',size:'all',type:'all',tier:DEFAULT_TIER,sort:'new',page:1};

  // "0-5000000" · "5000000-10000000" · "10000000-"  → {min,max}
  // ⚠️ ค่าที่อ่านไม่ออกคืน null = ไม่กรอง (ไม่ใช่กรองจนว่าง) — คนกดลิงก์เก่าที่ค่าเปลี่ยนไปแล้ว
  //    ควรได้ประกาศตามปกติ ไม่ใช่หน้าว่างที่ดูเหมือนเว็บพัง
  function range(v){
    if(!v||v==='all')return null;
    var m=String(v).match(/^(\d*)-(\d*)$/);
    if(!m)return null;
    return { min: m[1]?Number(m[1]):0, max: m[2]?Number(m[2]):Infinity };
  }
  var WA_PER_RAI=400;
  // ⚠️ **6 ใบ ไม่ใช่ 9** (เจ้าของสั่งใหม่ 19 ก.ย. 2569 · งานที่ 6 ข้อ 5 "ทรัพย์แนะนำ 6 รายการ")
  // ของเดิมเป็น 9 ตามคำสั่งเมื่อ 13 ก.ย. — คำสั่งใหม่กว่าจึงทับของเดิม
  // หน้าแรกเป็นหน้า "แนะนำ" ไม่ใช่หน้าไล่ดูของ · คนที่อยากดูครบมีปุ่มไปหน้ารวมประกาศ
  var PAGE_SIZE=6;

  function filtered(){
    var pr=range(state.price), sz=range(state.size);
    var list=state.listings.filter(function(item){
      var q=state.query.toLowerCase();
      // ค้นจากที่ตั้งที่แยกช่องด้วย ไม่ใช่แค่ข้อความก้อนเดียว — ช่องเติมคำอัตโนมัติเสนอชื่อ
      // จังหวัด/อำเภอ/ตำบล ให้ ซึ่งบางแปลงไม่มีคำนั้นอยู่ใน parcelInfo เลย
      var d=item.land||{};
      var text=[item.parcelInfo,item.blurb,d.province,d.amphoe,d.tambon].filter(Boolean).join(' ').toLowerCase();
      var qOk=!q||text.indexOf(q)>-1;
      // ⚠️ "ยังไม่ได้ระบุ" ไม่นับว่าตรงเงื่อนไข (บอกว่าตรงทั้งที่ไม่รู้ = โกหกผู้ซื้อ)
      //    กติกาเดียวกับตัวกรองในหน้ารวมประกาศ
      var priceOk=!pr||(item.estValue>0&&item.estValue>=pr.min&&item.estValue<=pr.max);
      var rai=item.totalWa/WA_PER_RAI;
      var sizeOk=!sz||(item.totalWa>0&&rai>=sz.min&&rai<=sz.max);
      var typeOk=state.type==='all'||item.type===state.type;
      var tierOk=state.tier==='all'||item.tier===Number(state.tier);
      return qOk&&priceOk&&sizeOk&&typeOk&&tierOk;
    });
    return sorted(list);
  }

  // เรียงลำดับตามที่ผู้ใช้เลือก — แปลงที่ไม่มีค่าในช่องที่ใช้เรียงจะไปอยู่ท้ายเสมอ
  // ⚠️ ไม่ตัดแปลงเหล่านั้นทิ้ง "ยังไม่ระบุราคา" ไม่ใช่เหตุผลที่จะทำให้แปลงหายจากหน้าแรก
  function sorted(list){
    var by=state.sort;
    if(by==='new')return list.slice().sort(function(a,b){
      return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
    });
    var key=(by==='area-desc')?'totalWa':'estValue';
    var desc=(by!=='price-asc');
    return list.slice().sort(function(a,b){
      var x=Number(a[key]||0), y=Number(b[key]||0);
      if(!x&&!y)return 0;
      if(!x)return 1;           // ไม่มีค่า → ท้ายสุดเสมอ ไม่ว่าจะเรียงทางไหน
      if(!y)return -1;
      return desc?y-x:x-y;
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

  // ---------- ที่อยู่หน้าเว็บสะท้อนสิ่งที่ผู้ใช้เลือก (งานที่ 4) ----------
  //
  // ⚠️ ของเดิมค้นหา/กรองแล้ว URL ไม่เปลี่ยนเลย → แชร์ผลการค้นหาไม่ได้ และกดปุ่มย้อนกลับ
  //    ก็ไม่คืนตัวกรองให้ (รายงานตรวจ FUNCTIONAL ข้อ 2.1)
  // ⚠️ ใช้ replaceState ตอนโหลดครั้งแรก และ pushState เฉพาะตอนผู้ใช้สั่งเอง
  //    ไม่งั้นประวัติจะเต็มไปด้วยรายการที่ผู้ใช้ไม่ได้กด แล้วกดย้อนกลับทีละสิบครั้งถึงจะออกจากหน้า
  function urlOf(){
    var p=[];
    if(state.query) p.push('q='+encodeURIComponent(state.query));
    if(state.type!=='all') p.push('type='+encodeURIComponent(state.type));
    if(state.price!=='all') p.push('price='+encodeURIComponent(state.price));
    if(state.size!=='all') p.push('size='+encodeURIComponent(state.size));
    if(state.tier!=='all') p.push('tier='+encodeURIComponent(state.tier));
    if(state.sort!=='new') p.push('sort='+encodeURIComponent(state.sort));
    return location.pathname+(p.length?'?'+p.join('&'):'')+'#listings';
  }
  function syncUrl(push){
    if(!window.history||!history.pushState)return;
    var snap={q:state.query,type:state.type,price:state.price,size:state.size,tier:state.tier,sort:state.sort};
    try{ push ? history.pushState(snap,'',urlOf()) : history.replaceState(snap,'',urlOf()); }
    catch(e){ /* บางเบราว์เซอร์ในเว็บวิวห้ามแก้ที่อยู่ — ค้นหายังทำงานได้ตามปกติ */ }
  }
  // อ่านค่าจากที่อยู่หน้าเว็บ — รับเฉพาะค่าที่ช่องนั้นมีจริง ห้ามเชื่อค่าจาก URL ตรงๆ
  // รับเฉพาะค่าที่ช่องนั้นมีจริง — ห้ามเชื่อค่าจาก URL ตรงๆ
  function optionOf(id,v,dflt){
    var el=document.getElementById(id);
    if(!el||!v)return dflt;
    var allowed=Array.prototype.map.call(el.options,function(o){return o.value;});
    return allowed.indexOf(v)>-1?v:dflt;
  }
  function readUrl(){
    var u=new URLSearchParams(location.search);
    var q=(u.get('q')||'').slice(0,80);
    var t=u.get('type'), tier=u.get('tier');
    state.query=q;
    state.type=(t==='sell'||t==='rent')?t:'all';
    state.price=optionOf('price-filter',u.get('price'),'all');
    state.size=optionOf('size-filter',u.get('size'),'all');
    state.sort=optionOf('sort-filter',u.get('sort'),'new');
    // 'all' มาจาก URL ได้ (ผู้ใช้กดปิดตัวกรองแล้วแชร์ลิงก์) · ค่าที่อ่านไม่ออกถึงจะถอยไปค่าตั้งต้น
    state.tier=(tier==='1'||tier==='2'||tier==='all')?tier:DEFAULT_TIER;
    state.page=1;
    paintControls();
  }
  // เขียนสถานะกลับลงช่องกรอก เพื่อให้หน้าจอตรงกับ URL เสมอ
  function paintControls(){
    document.getElementById('search-input').value=state.query;
    document.getElementById('type-filter').value=state.type;
    document.getElementById('price-filter').value=state.price;
    var sizeEl=document.getElementById('size-filter'); if(sizeEl)sizeEl.value=state.size;
    var sortEl=document.getElementById('sort-filter'); if(sortEl)sortEl.value=state.sort;
    // ปุ่มซื้อ/เช่าเป็น <button aria-pressed> ไม่ใช่แท็บที่ใช้คลาส — สถานะจึงต้องอยู่ใน
    // แอตทริบิวต์ที่เครื่องอ่านหน้าจอเห็นด้วย ไม่ใช่แค่สีที่คนมองเห็นเท่านั้น
    document.querySelectorAll('[data-purpose]').forEach(function(x){
      x.setAttribute('aria-pressed', x.dataset.purpose===state.type ? 'true' : 'false');
    });
    document.querySelectorAll('[data-tier]').forEach(function(x){
      var on = x.dataset.tier===state.tier;
      x.setAttribute('aria-pressed', on ? 'true' : 'false');
      x.classList.toggle('is-on', on);
      x.classList.toggle('is-outline', !on);
    });
  }
  // ⚠️ ย้อนกลับมาที่ "ไม่มีตัวกรอง" ต้องเก็บข้อความสรุปผลเดิมทิ้งด้วย
  //    ไม่งั้นการ์ดกลับเป็น 6 ใบแล้วแต่บรรทัดบนยังเขียนว่า "ผลการค้นหา … พบ 5 รายการ"
  //    ซึ่งอ่านแล้วขัดกับสิ่งที่เห็นตรงหน้า (เจอจริงตอนทดสอบปุ่มย้อนกลับ)
  function noteFor(){
    if(state.query) return 'ผลการค้นหา “'+state.query+'”';
    if(state.type!=='all'||state.price!=='all'||state.size!=='all'||state.tier!=='all') return 'ผลการกรอง';
    return '';
  }
  window.addEventListener('popstate',function(){
    readUrl();
    var m=noteFor();
    if(m){ render(m); }
    else {
      var note=document.getElementById('result-note');
      if(note){ note.hidden=true; note.textContent=''; }
      render();
    }
  });

  // ---------- รายชื่อทำเลสำหรับช่องเติมคำอัตโนมัติ ----------
  // ⚠️ **สร้างจากแปลงที่มีอยู่จริงเท่านั้น ไม่ใช่รายชื่อ 77 จังหวัด**
  //    เลือกทำเลที่ไม่มีของแล้วเจอผลว่างเปล่าจะดูเหมือนเว็บพัง (กติกาเดียวกับ listings.js)
  function fillLocations(list){
    var box=document.getElementById('nj-locations');
    if(!box)return;
    var seen={};
    list.forEach(function(it){
      var d=it.land||{};
      [d.province,d.amphoe,d.tambon].forEach(function(v){
        v=(v||'').trim();
        if(v&&!seen[v])seen[v]=true;
      });
    });
    var names=Object.keys(seen).sort();
    var frag=document.createDocumentFragment();
    names.forEach(function(n){
      var o=document.createElement('option');
      o.value=n;                 // ชื่อมาจากข้อมูล ใส่ผ่าน .value ไม่ใช่ต่อเป็นสตริง HTML
      frag.appendChild(o);
    });
    box.innerHTML='';
    box.appendChild(frag);
  }

  // ช่องสถิติที่สามในแถบทีมงาน — ดีไซน์เขียนไว้ว่า "[จำนวน] แปลงที่รังวัดแล้ว"
  // ⚠️ เรายังไม่มีตัวเลขนั้นที่ตรวจสอบได้ จึงแสดง "จำนวนแปลงที่เปิดประกาศอยู่" ซึ่งนับสดจาก API
  //    ได้ตัวเลขจริงจากเจ้าของเมื่อไหร่ ใส่ `surveyedParcels` ใน config.js แล้วช่องนี้สลับให้เอง
  //    **ห้ามเดาตัวเลขลงไปตรงๆ** — หน้านี้ขายด้วยคำว่า "ข้อมูลที่ตรวจสอบได้"
  function paintStat(n){
    var el=document.getElementById('stat-count');
    if(!el)return;
    var cfg=window.NJ_CONFIG||{};
    var surveyed=Number(cfg.surveyedParcels);
    var label=document.getElementById('stat-count-label');
    var txt = surveyed>0 ? surveyed.toLocaleString('th-TH') : Number(n||0).toLocaleString('th-TH');
    if(el.textContent!==txt) el.textContent=txt;   // เทียบก่อนเขียนเสมอ (กับดัก MutationObserver)
    if(label&&surveyed>0&&label.textContent!=='แปลงที่รังวัดแล้ว') label.textContent='แปลงที่รังวัดแล้ว';
  }

  function load(){
    NJL.fetchListings()
      .then(function(list){
        state.listings=list;
        state.loaded=true;
        fillLocations(list);
        paintStat(list.length);
        readUrl();               // เปิดลิงก์ที่มีตัวกรองติดมา ต้องได้ผลเดิม
        syncUrl(false);
        render(noteFor());
      })
      .catch(function(){
        // โหลดไม่ได้ ≠ ไม่มีแปลง — ต้องบอกตามจริงและให้ช่องทางติดต่อ ไม่ใช่แสดงว่าว่างเปล่า
        document.getElementById('listing-grid').innerHTML=NJL.loadFailedHtml();
      });
  }

  // ---------- ตัวกรอง ----------
  var TYPE_NOTE={all:'ทรัพย์ทั้งหมด',sell:'ทรัพย์ประกาศขาย',rent:'ทรัพย์ให้เช่า'};
  document.querySelectorAll('[data-purpose]').forEach(function(btn){
    btn.addEventListener('click',function(){
      state.type=btn.dataset.purpose;
      document.getElementById('type-filter').value=state.type;
      paintControls();
      syncUrl(true);
      render(TYPE_NOTE[state.type]||'');
    });
  });

  // ปุ่มกรองระดับข้อมูล — กดซ้ำที่ปุ่มเดิม = ปิดตัวกรอง (ไม่ใช่ติดค้างจนหาทางออกไม่เจอ)
  // ⚠️ เริ่มต้นต้องเป็น "ไม่กรอง" เสมอ · เปิดค้างไว้ = ผู้ซื้อเห็นของน้อยกว่าที่มีจริงโดยไม่รู้ตัว
  document.querySelectorAll('[data-tier]').forEach(function(btn){
    btn.addEventListener('click',function(){
      state.tier = (state.tier===btn.dataset.tier) ? 'all' : btn.dataset.tier;
      paintControls();
      syncUrl(true);
      render(state.tier==='all' ? 'ทุกระดับข้อมูล' : btn.textContent.trim());
    });
  });

  var sortSel=document.getElementById('sort-filter');
  if(sortSel)sortSel.addEventListener('change',function(){
    state.sort=sortSel.value;
    syncUrl(true);
    render();          // เรียงใหม่ ไม่ใช่กรองใหม่ — ไม่ต้องขึ้นข้อความสรุปผลและไม่ต้องกลับหน้า 1
  });

  document.getElementById('search-form').addEventListener('submit',function(e){
    e.preventDefault();
    state.query=document.getElementById('search-input').value.trim();
    state.price=document.getElementById('price-filter').value;
    var szEl=document.getElementById('size-filter');
    state.size=szEl?szEl.value:'all';
    state.type=document.getElementById('type-filter').value;
    state.page=1;
    syncUrl(true);
    render(state.query?'ผลการค้นหา “'+state.query+'”':'ผลการค้นหาทั้งหมด');
    document.getElementById('listings').scrollIntoView({behavior:'smooth'});
    if(window.njTrack)window.njTrack('Search',{search_string:state.query});
    // สถิติภายใน — นับว่ามีคนใช้ช่องค้นหาบนหน้าแรกกี่ครั้ง (ไม่ส่งคำค้น ไม่มี PII)
    if(window.njTrackInternal)njTrackInternal('homepage_search');
  });

  // ปุ่มค้นหาด่วน — ทุกปุ่มกรองจริงจากข้อมูลที่มี ไม่ใช่ขึ้นข้อความเฉยๆ
  document.querySelectorAll('[data-quick]').forEach(function(link){
    link.addEventListener('click',function(){
      var q=link.dataset.quick;
      state.query='';
      document.getElementById('search-input').value='';
      state.size='all'; state.tier='all';
      if(q==='sell'||q==='rent'){ state.type=q; state.price='all'; }
      else if(q==='under5'){ state.type='all'; state.price='0-5000000'; }
      else { state.type='all'; state.price='all'; }
      paintControls();
      syncUrl(true);
      render(link.querySelector('b').textContent);
    });
  });

  // ผูกปุ่มติดต่อ + คลิกการ์ด (ตัวเดียวกับหน้ารวมประกาศ — ดู listingcard.js)
  NJL.bindGrid(document.getElementById('listing-grid'),'listing_card');

  document.getElementById('year').textContent=new Date().getFullYear()+543;   // ปี พ.ศ.
  load();
  if(window.njTrackInternal)window.njTrackInternal('pageview');
})();
