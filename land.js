(function(){
  'use strict';
  // หน้ารายละเอียดแปลงที่ดิน — land.html?id=OP-xxx
  //
  // ⚠️ กติกาที่ห้ามผ่อนในไฟล์นี้ (เหตุผลเดียวกับ CLAUDE.md ข้อ 4-5):
  //   1. แสดงเฉพาะสิ่งที่ API ส่งมาจริง · ช่องไหนไม่มีข้อมูล = ซ่อนบรรทัดนั้น ห้ามเติมข้อความแทน
  //   2. ผลตรวจที่ status ว่าง ต้องแสดงเป็น "ยังไม่ได้ตรวจ" เท่านั้น
  //      ห้ามแสดงเป็นติ๊กถูกหรือปล่อยว่างจนคนเข้าใจว่า "ไม่มีปัญหา" — สองอย่างนี้คนละเรื่องกัน
  //   3. ประกาศระดับ 1 ห้ามขึ้นป้าย "รังวัดยืนยันแล้ว" เด็ดขาด

  var LINE='https://line.me/R/ti/p/@716lffzt';
  var FB=window.NJ_MESSENGER_URL||'https://m.me/NJTeeDinSure';   // ตั้งค่าไว้ใน analytics.js
  var TEL='tel:021620405';
  var TEL_TXT='02-162-0405';

  // 7 หัวข้อตรวจ เรียงตามลำดับที่ผู้ซื้อสนใจ — ทางเข้า-ออกกับภาระจำยอมคือสิ่งที่คนกลัวที่สุด
  var CHECKS=[
    {k:'area',      t:'เนื้อที่วัดจริงในสนาม'},
    {k:'markers',   t:'หมุดหลักเขต'},
    {k:'access',    t:'ทางเข้า-ออก'},
    {k:'servitude', t:'ภาระจำยอม'},
    {k:'seizure',   t:'การอายัด / คดีความ'},
    {k:'tax',       t:'ภาษีที่ดินค้างชำระ'},
    {k:'mortgage',  t:'จำนอง / สิทธิเก็บกิน'}
  ];
  // สิ่งที่ระดับ 1 ยังตรวจไม่ได้ — บอกตรงๆ ดีกว่าเว้นว่างให้คนเดาเอง
  var TIER1_UNKNOWN=[
    ['เนื้อที่จริงในสนาม','ยังไม่ได้รังวัด อาจต่างจากที่ระบุในโฉนด'],
    ['แนวเขตและหมุดหลักเขต','ยังไม่ได้ตรวจว่าหมุดครบและอยู่ตำแหน่งใด'],
    ['ภาระจำยอม · ทางเข้า-ออก · การอายัด','ต้องตรวจจากหลังโฉนดและสารบบที่ดิน']
  ];

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function money(v){ if(!Number(v)) return 'ราคาติดต่อสอบถาม'; return '฿'+Number(v).toLocaleString('th-TH'); }
  function qs(k){ try{ return new URLSearchParams(location.search).get(k)||''; }catch(e){ return ''; } }

  function thaiDate(iso){
    if(!iso) return '';
    var d=new Date(iso); if(isNaN(d)) return '';
    var M=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return d.getDate()+' '+M[d.getMonth()]+' '+(d.getFullYear()+543);
  }

  // ราคาต่อตารางวา — คิดได้ก็ต่อเมื่อรู้เนื้อที่จริงเป็นตัวเลข
  // รูปแบบเนื้อที่ไทยคือ ไร่-งาน-วา · 1 ไร่ = 400 ตร.ว. · 1 งาน = 100 ตร.ว.
  function waFrom(areaStr){
    var m=String(areaStr||'').match(/^\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+(?:\.\d+)?)\s*$/);
    if(!m) return 0;
    return Number(m[1])*400 + Number(m[2])*100 + Number(m[3]);
  }
  function perWa(price, areaStr){
    var wa=waFrom(areaStr);
    if(!wa || !Number(price)) return '';
    return '≈ '+Math.round(Number(price)/wa).toLocaleString('th-TH')+' บาท/ตร.ว.';
  }

  function factsHtml(l, L, tier){
    var out=[];
    // ระดับ 2 ใช้เนื้อที่วัดจริงเป็นหลัก · ระดับ 1 ใช้เนื้อที่ตามโฉนดและต้องบอกว่ามาจากโฉนด
    if(tier===2 && L.checks && L.checks.area && L.checks.area.value)
      out.push(['<b>'+esc(L.checks.area.value)+'</b>','เนื้อที่วัดจริง']);
    else if(L.deedArea)
      out.push(['<b>'+esc(L.deedArea)+'</b>','เนื้อที่ตามโฉนด']);
    if(L.frontage) out.push(['<b>'+esc(L.frontage)+'</b>','หน้ากว้างโดยประมาณ']);
    if(L.zoning)   out.push(['<b>'+esc(L.zoning)+'</b>','ผังเมืองรวม']);
    if(!out.length) return '';
    return '<div class="ld-facts">'+out.map(function(f){
      return '<div class="ld-fact">'+f[0]+'<span>'+esc(f[1])+'</span></div>';
    }).join('')+'</div>';
  }

  function tier2Html(L){
    var rows=CHECKS.map(function(c){
      var x=(L.checks||{})[c.k]||{};
      var st=x.status||'';
      var ico = st==='ok'   ? '<span class="ld-ico ok">✓</span>'
              : st==='warn' ? '<span class="ld-ico warn">!</span>'
              :               '<span class="ld-ico none">—</span>';
      var note = x.note ? '<span>'+esc(x.note)+'</span>'
               : (!st ? '<span>ยังไม่ได้ตรวจหัวข้อนี้</span>' : '');
      var val = x.value ? '<span class="ld-val">'+esc(x.value)+'</span>' : '';
      return '<div class="ld-crow'+(st?'':' dim')+'">'+ico+'<div><b>'+esc(c.t)+'</b>'+note+'</div>'+val+'</div>';
    }).join('');
    var when=thaiDate(L.verifiedAt);
    var by=L.verifiedBy?(' โดย '+esc(L.verifiedBy)):'';
    return '<section class="ld-tier t2">'+
      '<div class="ld-tier-h"><b>✓ ระดับ 2 — ตรวจสอบเชิงลึกแล้ว</b><em>ใบอนุญาต 351</em></div>'+
      rows+
      '<p class="ld-tier-foot">'+
        (when?('ตรวจสอบเมื่อ '+esc(when)+esc(by)+' · '):'')+
        'ข้อมูลอ้างอิงจากเอกสารสิทธิ์และสารบบที่ดิน ณ วันที่ตรวจ ผู้ซื้อควรตรวจสอบซ้ำอีกครั้งในวันโอนกรรมสิทธิ์'+
      '</p>'+
    '</section>';
  }

  // แผนที่แปลง — มี 2 โหมด ขึ้นกับว่าทีมงานปักหมุดให้แปลงนี้ไว้หรือยัง
  //   pinLat/pinLng มีค่า = ทีมงานเลือกจุดนี้เองในระบบว่าให้ลูกค้าเห็นได้ → ปักหมุดตำแหน่งจริง
  //   ไม่มี              = ถอยไปค้นด้วยข้อความทำเล ได้แผนที่ระดับพื้นที่ ไม่ใช่จุดแม่นยำ
  // ⚠️ API สาธารณะไม่เคยส่ง lat/lng (พิกัดภายในจากงานรังวัด) ออกมาเลย — ดู publicLand ใน server.js
  // ห้ามเปลี่ยนมาอ่าน L.lat/L.lng ตรงนี้ เพราะจะกลายเป็นเผยพิกัดของแปลงที่ไม่มีใครเคยกดอนุญาต
  function pinOf(L){
    var la=Number(L.pinLat), ln=Number(L.pinLng);
    if(!isFinite(la)||!isFinite(ln)||L.pinLat==null||L.pinLng==null) return null;
    return [la,ln];
  }
  function mapHtml(L){
    var pin=pinOf(L);
    if(!pin && !L.locality) return '';
    var src,head,note;
    if(pin){
      src='https://www.google.com/maps?q='+pin[0]+','+pin[1]+'&z=17&output=embed';
      head='📍 ตำแหน่งแปลงบนแผนที่';
      note='หมุดนี้คือตำแหน่งแปลงที่ทีมงานระบุไว้ · แนวเขตที่แน่นอนต้องยืนยันด้วยการรังวัดในสนาม — '+
           'ทักไลน์เพื่อนัดดูที่จริงกับทีมงานได้';
    }else{
      src='https://www.google.com/maps?q='+encodeURIComponent(L.locality+' ประเทศไทย')+'&z=14&output=embed';
      head='📍 ทำเลโดยประมาณ';
      note='ตำแหน่งบนแผนที่เป็นค่าประมาณระดับพื้นที่เท่านั้น ไม่ใช่พิกัดจุดแปลงที่แน่นอน — ทักไลน์เพื่อขอนัดดูที่จริงกับทีมงาน';
    }
    return '<section class="ld-map">'+
      '<div class="ld-map-h">'+head+'</div>'+
      '<div class="ld-map-frame"><iframe src="'+esc(src)+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="แผนที่ตำแหน่งแปลงที่ดิน"></iframe></div>'+
      (pin?('<a class="ld-map-open" href="https://www.google.com/maps/search/?api=1&query='+pin[0]+','+pin[1]+'" target="_blank" rel="noopener">เปิดใน Google Maps / ขอเส้นทาง →</a>'):'')+
      '<p class="ld-map-note">'+note+'</p>'+
    '</section>';
  }

  // สถานที่ใกล้เคียง — ข้อมูลจาก Google Places ที่ทีมงานดึงไว้ตอนตรวจแปลง
  // ⚠️ นี่คือข้อมูลของบุคคลที่สาม ไม่ใช่สิ่งที่ทีมช่างรังวัดไปยืนยันเองในสนาม
  //    จึงต้องแยกหน้าตาออกจากแผงผลตรวจ 7 หัวข้อให้ชัด และต้องบอกที่มา + วันที่ดึงเสมอ
  //    (ร้าน/โรงเรียน/โรงพยาบาลปิดหรือย้ายได้ ข้อมูลวันนี้ไม่ใช่คำรับประกันว่าพรุ่งนี้ยังอยู่)
  function nearbyHtml(L){
    var n=L.nearby;
    if(!n || !n.groups || !n.groups.length) return '';
    var groups=n.groups.map(function(g){
      var items=(g.items||[]).map(function(it){
        return '<li><span>'+esc(it.name)+'</span><b>'+Number(it.km||0).toFixed(1)+' กม.</b></li>';
      }).join('');
      if(!items) return '';
      return '<div class="ld-nb-g"><h3>'+esc(g.icon||'')+' '+esc(g.label)+'</h3><ul>'+items+'</ul></div>';
    }).join('');
    if(!groups) return '';
    return '<section class="ld-nb">'+
      '<div class="ld-nb-h">สถานที่ใกล้เคียง<small>ในรัศมีประมาณ 5 กม. จากตำแหน่งแปลง</small></div>'+
      groups+
      '<p class="ld-nb-foot">ข้อมูลสถานที่จาก Google Places · สำรวจเมื่อ '+esc(thaiDate(n.at))+' · '+
        'ระยะทางเป็นเส้นตรงจากตำแหน่งแปลง ไม่ใช่ระยะทางขับรถ — สถานที่อาจเปลี่ยนแปลงได้ ควรตรวจสอบอีกครั้งก่อนตัดสินใจ</p>'+
    '</section>';
  }

  function tier1Html(L){
    var known=[];
    if(L.deedArea) known.push(['เนื้อที่ตามหน้าโฉนด','อ่านจากเอกสารสิทธิ์ที่เจ้าของแสดง',L.deedArea]);
    if(L.zoning)   known.push(['ผังเมืองรวม','ตรวจจากระบบผังเมืองของหน่วยงานราชการ',L.zoning]);
    if(L.locality) known.push(['ตำแหน่งแปลงโดยประมาณ','อ้างอิงระวางจากกรมที่ดิน',L.locality]);
    var kHtml=known.map(function(k){
      return '<div class="ld-crow"><span class="ld-ico ok">✓</span><div><b>'+esc(k[0])+'</b><span>'+esc(k[1])+'</span></div><span class="ld-val">'+esc(k[2])+'</span></div>';
    }).join('');
    var uHtml=TIER1_UNKNOWN.map(function(u){
      return '<div class="ld-crow dim"><span class="ld-ico none">—</span><div><b>'+esc(u[0])+'</b><span>'+esc(u[1])+'</span></div></div>';
    }).join('');
    return '<section class="ld-tier t1">'+
      '<div class="ld-tier-h"><b>◐ ระดับ 1 — ข้อมูลเบื้องต้น</b><em>ยังไม่รังวัด</em></div>'+
      kHtml+uHtml+
      '<p class="ld-tier-foot">เราแสดงเฉพาะสิ่งที่ตรวจสอบได้จริง — ช่องที่ขึ้น “—” หมายถึง<b>ยังไม่ได้ตรวจ</b> ไม่ใช่ “ไม่มีปัญหา”</p>'+
      '<div class="ld-upsell">'+
        '<b>สนใจแปลงนี้ แต่อยากมั่นใจก่อน?</b>'+
        '<p>ทีมช่างรังวัดของเราเข้าไปรังวัดและตรวจเอกสารเชิงลึกให้ได้ ผลตรวจจะแสดงบนหน้านี้ให้ทุกคนเห็น</p>'+
        '<a class="ld-upbtn" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">ขอให้ตรวจสอบแปลงนี้</a>'+
      '</div>'+
    '</section>';
  }

  // สไลด์โชว์ภาพแนบ — เลื่อนอัตโนมัติเมื่อมีมากกว่า 1 รูป กดปุ่มหยุด/เล่นหรือแตะจุด/ลูกศรได้เอง
  function galleryHtml(photos, altBase){
    if(!photos.length) return '<div class="ld-noimg"></div>';
    // ภาพพื้นหลังเบลอ = รูปใบเดียวกันขยายเต็มกรอบ ใช้ถมแถบว่างข้างภาพแนวตั้ง
    // (รูปจากมือถือเกือบทั้งหมดเป็นแนวตั้ง 3:4 แต่กรอบเป็น 16:9 — ดูเหตุผลที่ .ld-gal ใน land.css)
    // aria-hidden เพราะเป็นภาพประดับล้วน ไม่มีข้อมูลเพิ่มจากรูปจริงที่อยู่ข้างหน้า
    var bd='<img class="ld-gal-bd" src="'+esc(photos[0])+'" alt="" aria-hidden="true">';
    var slides=photos.map(function(src,i){
      return '<img class="ld-slide'+(i===0?' active':'')+'" data-i="'+i+'" src="'+esc(src)+'" alt="'+esc(altBase)+(photos.length>1?' (รูปที่ '+(i+1)+' จาก '+photos.length+')':'')+'">';
    }).join('');
    if(photos.length<2) return bd+slides;
    var dots=photos.map(function(_,i){return '<button type="button" class="ld-dot'+(i===0?' active':'')+'" data-i="'+i+'" aria-label="ไปที่รูปที่ '+(i+1)+'"></button>';}).join('');
    return bd+slides+
      '<div class="ld-gal-ctrl">'+
        '<button type="button" class="ld-gal-prev" aria-label="รูปก่อนหน้า">‹</button>'+
        '<span class="ld-gal-counter">1/'+photos.length+'</span>'+
        '<button type="button" class="ld-gal-pause" aria-label="หยุดสไลด์">⏸</button>'+
        '<button type="button" class="ld-gal-next" aria-label="รูปถัดไป">›</button>'+
      '</div>'+
      '<div class="ld-dots">'+dots+'</div>';
  }

  function initGallery(root, count){
    if(!root || count<2) return;
    var slides=[].slice.call(root.querySelectorAll('.ld-slide'));
    var dots=[].slice.call(root.querySelectorAll('.ld-dot'));
    var counter=root.querySelector('.ld-gal-counter');
    var pauseBtn=root.querySelector('.ld-gal-pause');
    var backdrop=root.querySelector('.ld-gal-bd');
    var idx=0, timer=null, playing=false;
    var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(i){
      idx=(i+slides.length)%slides.length;
      slides.forEach(function(s,j){ s.classList.toggle('active', j===idx); });
      dots.forEach(function(d,j){ d.classList.toggle('active', j===idx); });
      if(counter) counter.textContent=(idx+1)+'/'+slides.length;
      // ตั้งผ่าน .src ไม่ใช่ background-image ในสไตล์ — ค่าจาก API จึงไม่มีทางหลุดไปเป็นโค้ด CSS
      if(backdrop && slides[idx]) backdrop.src=slides[idx].src;
    }
    function updateBtn(){ if(!pauseBtn) return; pauseBtn.textContent=playing?'⏸':'▶'; pauseBtn.setAttribute('aria-label',playing?'หยุดสไลด์':'เล่นสไลด์ต่อ'); }
    function stop(){ if(timer){ clearInterval(timer); timer=null; } playing=false; updateBtn(); }
    function play(){ if(reduceMotion) return; stop(); playing=true; timer=setInterval(function(){ show(idx+1); },4200); updateBtn(); }
    root.addEventListener('click',function(e){
      var dot=e.target.closest('.ld-dot'); if(dot){ show(Number(dot.dataset.i)); stop(); return; }
      if(e.target.closest('.ld-gal-prev')){ show(idx-1); stop(); return; }
      if(e.target.closest('.ld-gal-next')){ show(idx+1); stop(); return; }
      if(e.target.closest('.ld-gal-pause')){ playing?stop():play(); return; }
    });
    show(0);
    play();
  }

  function render(l){
    var L=l.land||{};
    var tier=l.tier===2?2:1;
    var photos=l.photos||[];
    var badge = tier===2
      ? '<span class="ld-badge ok">✓ รังวัดยืนยันแล้ว</span>'
      : '<span class="ld-badge basic">◐ ข้อมูลเบื้องต้น</span>';
    var areaForWa = (tier===2 && L.checks && L.checks.area && L.checks.area.value) ? L.checks.area.value : L.deedArea;
    var pw=perWa(l.estValue, areaForWa);

    document.getElementById('ld-root').innerHTML=
      '<div class="ld-gal">'+galleryHtml(photos, l.parcelInfo||'แปลงที่ดิน')+
        '<div class="ld-badges"><span class="ld-badge type">'+(l.type==='rent'?'ให้เช่า':'ขาย')+'</span>'+badge+'</div>'+
        '<div class="ld-wm"><span>ที่ดินชัวร์</span><small>njteedinsure.com</small></div>'+
      '</div>'+
      '<div class="ld-body">'+
        '<div class="ld-price">'+money(l.estValue)+(pw?'<small>'+esc(pw)+'</small>':'')+'</div>'+
        (l.estValue?'<a class="ld-vlink" href="guides.html#valuation">ราคานี้คำนวณอย่างไร →</a>':'')+
        '<div id="ld-fee"></div>'+
        '<h1 class="ld-title">'+esc(l.parcelInfo||'แปลงที่ดิน')+'</h1>'+
        (L.locality?'<div class="ld-loc">📍 '+esc(L.locality)+'</div>':'')+
        factsHtml(l,L,tier)+
        mapHtml(L)+
        nearbyHtml(L)+
        (l.blurb?'<p class="ld-blurb">'+esc(l.blurb)+'</p>':'')+
        (tier===2?tier2Html(L):tier1Html(L))+
        '<div class="ld-cta">'+
          '<a class="ld-btn line" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">💬 ทักไลน์สอบถาม</a>'+
          '<a class="ld-btn fb" href="'+FB+'" target="_blank" rel="noopener" data-contact="messenger">💬 เมสเซนเจอร์</a>'+
          // "คลิกดูเบอร์" — ซ่อนเบอร์ไว้จนกว่าจะกด แล้วค่อยกลายเป็นลิงก์โทรจริง
          // ⚠️ ปุ่มนี้ยิง phone_reveal **แทน** tel_click ไม่ใช่ยิงทั้งคู่ (ดู PUBLIC_EVENT_TYPES ใน server.js)
          // ยิงทั้งคู่เมื่อไหร่ = นับคนเดิมสองครั้ง แล้วตัวเลขลีดจะสูงกว่าความจริง
          '<button type="button" class="ld-btn tel" id="ld-tel" data-reveal="'+esc(l.id)+'">📞 คลิกดูเบอร์โทร</button>'+
        '</div>'+
        '<button type="button" class="ld-btn ghost ld-pdf-btn" id="ld-pdf-btn">📄 ดาวน์โหลด PDF ประกาศนี้</button>'+
      '</div>';

    // เครื่องคำนวณค่าโอน — เติมให้แค่ "ราคาซื้อขาย" ซึ่งเป็นตัวเลขที่ประกาศอยู่แล้ว
    // ⚠️ ห้ามเติมราคาประเมินราชการให้ (ดูเหตุผลใน feecalc.js) — ผู้ซื้อต้องกรอกเอง
    if(window.NJFeeCalc) NJFeeCalc.mount(document.getElementById('ld-fee'),{salePrice:l.estValue});

    initGallery(document.querySelector('.ld-gal'), photos.length);
    var pdfBtn=document.getElementById('ld-pdf-btn');
    if(pdfBtn) pdfBtn.addEventListener('click', function(){ window.print(); });

    document.title=(l.parcelInfo||'แปลงที่ดิน')+' | ที่ดินชัวร์';
    if(window.njTrack) njTrack('ViewContent',{content_name:'land_detail',content_ids:[l.id],content_category:'tier'+tier});
  }

  function fail(title,detail){
    document.getElementById('ld-root').innerHTML=
      '<div class="ld-empty"><b>'+esc(title)+'</b>'+esc(detail)+
      '<span class="ld-empty-btns">'+
        '<a class="ld-btn line" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">💬 ทักไลน์สอบถาม</a>'+
        '<a class="ld-btn fb" href="'+FB+'" target="_blank" rel="noopener" data-contact="messenger">💬 เมสเซนเจอร์</a>'+
        '<a class="ld-btn ghost" href="index.html#listings">ดูแปลงทั้งหมด</a>'+
      '</span></div>';
  }

  function load(){
    var id=qs('id');
    var base=window.NJ_API_BASE||'https://nj-survey-system.onrender.com';
    if(!id){ fail('ไม่พบรหัสแปลงที่ดิน','ลิงก์อาจไม่สมบูรณ์ ลองเลือกแปลงจากหน้ารายการอีกครั้ง'); return; }
    fetch(base+'/api/public/listings')
      .then(function(r){ if(!r.ok) throw new Error(); return r.json(); })
      .then(function(d){
        var l=(d.listings||[]).filter(function(x){ return x.id===id; })[0];
        // ไม่เจอ = อาจขายไปแล้วหรือเจ้าของถอนประกาศ ต้องบอกตามจริง ไม่ใช่บอกว่าเว็บพัง
        if(!l){ fail('ไม่พบแปลงที่ดินนี้แล้ว','แปลงนี้อาจขายไปแล้ว หรือเจ้าของขอถอนประกาศ — ทักไลน์มาสอบถามแปลงอื่นที่ใกล้เคียงได้'); return; }
        render(l);
        // นับว่ามีคนเปิดดูแปลงนี้ — ยิงหลังจากพบแปลงจริงแล้วเท่านั้น
        // ยิงตั้งแต่ตอนเปิดหน้า = นับรวมลิงก์เสียและแปลงที่ถอนประกาศไปแล้วเข้าไปด้วย
        if(window.njTrackInternal) njTrackInternal('listing_view', l.id);
      })
      .catch(function(){
        fail('ตอนนี้โหลดข้อมูลไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง หรือโทรสอบถามได้ที่ '+TEL_TXT);
      });
  }

  // แมปช่องทาง → ชื่อเหตุการณ์ · ห้ามใช้ if/else สองทาง ไม่งั้นช่องทางที่ 3 จะถูกนับเป็นกดโทร
  var TRACK={line:['line_click','line'],messenger:['messenger_click','messenger'],tel:['tel_click','phone']};
  document.getElementById('ld-root').addEventListener('click',function(e){
    // ---- ปุ่ม "คลิกดูเบอร์" ----
    // กดครั้งแรก = เผยเบอร์ + นับ phone_reveal · หลังจากนั้นปุ่มกลายเป็นลิงก์โทรธรรมดา
    // ⚠️ ลิงก์ที่เผยออกมา **ไม่มี data-contact** โดยตั้งใจ — กดโทรต่อจะไม่ยิง tel_click ซ้ำ
    // เพราะความตั้งใจจะติดต่อถูกนับไปแล้วตอนกดดูเบอร์ (ดูเหตุผลเต็มที่ PUBLIC_EVENT_TYPES ใน server.js)
    var rv=e.target.closest('[data-reveal]');
    if(rv){
      var wrap=document.createElement('a');
      wrap.className='ld-btn tel'; wrap.href=TEL; wrap.textContent='📞 '+TEL_TXT;
      rv.parentNode.replaceChild(wrap,rv);
      // ส่งรหัสแปลงไปด้วยเสมอ — สถิติรายแปลง (listingStats) นับ "กดดูเบอร์" จากค่านี้
      // ไม่ส่ง = ช่องนั้นขึ้น 0 ตลอดทั้งที่มีคนกดจริง โดยไม่มีอะไรเตือน
      if(window.njTrackInternal) njTrackInternal('phone_reveal', rv.getAttribute('data-reveal'));
      if(window.njTrack) njTrack('Contact',{method:'phone',from:'land_detail'});
      return;
    }
    var a=e.target.closest('[data-contact]');
    if(!a) return;
    var t=TRACK[a.getAttribute('data-contact')];
    if(!t) return;
    if(window.njTrackInternal) njTrackInternal(t[0]);
    if(window.njTrack) njTrack('Contact',{method:t[1],from:'land_detail'});
  });

  document.getElementById('year').textContent=new Date().getFullYear()+543;   // ปี พ.ศ.
  load();
  if(window.njTrackInternal) njTrackInternal('pageview');
})();
