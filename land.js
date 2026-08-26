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

  function render(l){
    var L=l.land||{};
    var tier=l.tier===2?2:1;
    var photo=(l.photos&&l.photos[0])
      ? '<img src="'+esc(l.photos[0])+'" alt="'+esc(l.parcelInfo||'แปลงที่ดิน')+'">'
      : '<div class="ld-noimg"></div>';
    var count=(l.photos||[]).length>1?'<span class="ld-count">▣ '+l.photos.length+'</span>':'';
    var badge = tier===2
      ? '<span class="ld-badge ok">✓ รังวัดยืนยันแล้ว</span>'
      : '<span class="ld-badge basic">◐ ข้อมูลเบื้องต้น</span>';
    var areaForWa = (tier===2 && L.checks && L.checks.area && L.checks.area.value) ? L.checks.area.value : L.deedArea;
    var pw=perWa(l.estValue, areaForWa);

    document.getElementById('ld-root').innerHTML=
      '<div class="ld-gal">'+photo+
        '<div class="ld-badges"><span class="ld-badge type">'+(l.type==='rent'?'ให้เช่า':'ขาย')+'</span>'+badge+'</div>'+
        count+
        '<div class="ld-wm"><span>ที่ดินชัวร์</span><small>njteedinsure.com</small></div>'+
      '</div>'+
      '<div class="ld-body">'+
        '<div class="ld-price">'+money(l.estValue)+(pw?'<small>'+esc(pw)+'</small>':'')+'</div>'+
        '<h1 class="ld-title">'+esc(l.parcelInfo||'แปลงที่ดิน')+'</h1>'+
        (L.locality?'<div class="ld-loc">📍 '+esc(L.locality)+'</div>':'')+
        factsHtml(l,L,tier)+
        (l.blurb?'<p class="ld-blurb">'+esc(l.blurb)+'</p>':'')+
        (tier===2?tier2Html(L):tier1Html(L))+
        '<div class="ld-cta">'+
          '<a class="ld-btn line" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">💬 ทักไลน์สอบถาม</a>'+
          '<a class="ld-btn tel" href="'+TEL+'" data-contact="tel">📞 '+TEL_TXT+'</a>'+
        '</div>'+
      '</div>';

    document.title=(l.parcelInfo||'แปลงที่ดิน')+' | ที่ดินชัวร์';
    if(window.njTrack) njTrack('ViewContent',{content_name:'land_detail',content_ids:[l.id],content_category:'tier'+tier});
  }

  function fail(title,detail){
    document.getElementById('ld-root').innerHTML=
      '<div class="ld-empty"><b>'+esc(title)+'</b>'+esc(detail)+
      '<span class="ld-empty-btns">'+
        '<a class="ld-btn line" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">💬 ทักไลน์สอบถาม</a>'+
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
      })
      .catch(function(){
        fail('ตอนนี้โหลดข้อมูลไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง หรือโทรสอบถามได้ที่ '+TEL_TXT);
      });
  }

  document.getElementById('ld-root').addEventListener('click',function(e){
    var a=e.target.closest('[data-contact]');
    if(!a) return;
    if(a.getAttribute('data-contact')==='line'){
      if(window.njTrackInternal) njTrackInternal('line_click');
      if(window.njTrack) njTrack('Contact',{method:'line',from:'land_detail'});
    }else{
      if(window.njTrackInternal) njTrackInternal('tel_click');
      if(window.njTrack) njTrack('Contact',{method:'phone',from:'land_detail'});
    }
  });

  document.getElementById('year').textContent=new Date().getFullYear()+543;   // ปี พ.ศ.
  load();
  if(window.njTrackInternal) njTrackInternal('pageview');
})();
