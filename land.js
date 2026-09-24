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
  var TEL2='tel:0849158601';
  var TEL2_TXT='084-915-8601';

  // ---------- บอก Google ว่าหน้านี้คือแปลงไหน ----------
  //
  // หน้านี้เป็นหน้าเดียว (land.html) ที่เปลี่ยนเนื้อหาตาม ?id= จึงตั้ง canonical แบบคงที่ในไฟล์ HTML ไม่ได้
  // ถ้าตั้งเป็น /land.html เฉยๆ ทุกแปลงจะถูกยุบรวมเป็นหน้าเดียวในสายตา Google เหลือแปลงเดียวในดัชนี
  // ไม่ตั้งเลยดีกว่าตั้งผิด — ที่นี่จึงตั้งจาก JS หลังรู้แล้วว่าเป็นแปลงไหน
  //
  // ⚠️ ใส่เฉพาะข้อมูลที่มีจริงในแปลงนั้น ช่องไหนว่างให้ข้ามไป ห้ามเติมค่าแทน
  // การประกาศราคา/รูป/พื้นที่ที่ไม่ตรงกับหน้าจอ ถือเป็นข้อมูลหลอกลวงตามเกณฑ์ของ Google
  // และโดนตัดสิทธิ์แสดงผลพิเศษทั้งเว็บ ไม่ใช่แค่หน้านี้หน้าเดียว
  var SITE_URL='https://njteedinsure.com';

  // ---------- ชื่อสั้นของแปลง สำหรับชื่อหน้าและผลค้นหา ----------
  //
  // ห้ามใช้ parcelInfo เป็นชื่อหน้าตรงๆ — มันคือ "ที่ตั้ง · รายละเอียดที่เจ้าของพิมพ์ · เนื้อที่"
  // ต่อกันเป็นก้อนเดียว และเจ้าของหลายรายพิมพ์ข้อความโฆษณาทั้งชุดลงในช่องรายละเอียด
  // (เจอจริง: OP-025 ยาว 200+ ตัวอักษร) Google ตัดชื่อที่ยาวเกินราว 60 ตัวอักษรทิ้ง
  // คนที่ค้นเจอจะเห็นชื่อขาดกลางประโยค อ่านไม่รู้เรื่อง และไม่รู้ว่าแปลงอยู่ที่ไหน
  //
  // จึงประกอบเองจากช่องที่แยกไว้แล้ว: ขาย/เช่า + ตำบล อำเภอ จังหวัด + เนื้อที่
  // ช่องไหนไม่มีก็ข้าม ไม่เติมแทน · ถ้าไม่มีข้อมูลโครงสร้างเลยค่อยถอยไปตัดคำแรกของ parcelInfo
  // ⚠️ ตัวประกอบชื่อจริงย้ายไป `landmeta.js` แล้ว (Sprint 5) เพราะ `build/properties.js`
  //    ต้องใช้สูตรเดียวกันตอนสร้างหน้าสแตติก · สองที่ประกอบเองแยกกันเมื่อไหร่
  //    สิ่งที่ Google เห็นกับสิ่งที่ผู้ใช้เห็นจะไม่ตรงกัน ซึ่งเป็นเกณฑ์ที่ Google ตัดสิทธิ์ทั้งเว็บ
  //    ตัวห่อข้างล่างเก็บไว้ให้โค้ดเดิมในไฟล์นี้เรียกได้เหมือนเดิม
  function vocab(){ return window.NJVocab || {}; }
  function localityOf(l){ return NJLandMeta.localityOf(l); }
  // ---------- คำนำหน้าชื่อหน้า: ขาย/ให้เช่า + ประเภททรัพย์ ----------
  //
  // ⚠️ **ห้ามเขียน "ที่ดิน" ตายตัวอีก** (แก้ 20 ก.ย. 2569)
  // ของเดิมเขียน 'ขายที่ดิน' ตายตัวจาก l.type อย่างเดียว ไม่เคยอ่าน land.propertyType เลย
  // ผลที่เจอจริง: OP-072 เป็นบ้านแฝด 2 ชั้น แต่ชื่อหน้าขึ้นว่า "ขายที่ดิน · ..."
  // ส่วน H1 ของแปลงเดียวกันขึ้นว่า "... บ้านแฝด 2 ชั้น" — ขัดกันเองในหน้าเดียว
  // และ Structured Data ก็ใช้ชื่อชุดนี้ต่อ จึงส่งข้อมูลผิดให้ Google ตามไปด้วย
  //
  // ⚠️ **ช่องว่าง = ยังไม่ได้กรอก ไม่ใช่ "ที่ดินเปล่า"** — กติกาเดียวกับป้ายผังสีใน listingcard.js
  // PROPERTY_TH มีค่า 'land' = 'ที่ดินเปล่า' อยู่แล้วเป็นตัวเลือกหนึ่ง ดังนั้นแปลงที่ยังไม่กรอก
  // ไม่ได้แปลว่าเป็นที่ดินเปล่า · เดาแทนเมื่อไหร่ = ติดป้ายผิดให้แปลงที่มีบ้านจริง (เคสนี้เป๊ะ)
  // จึงถอยไปใช้คำกลางว่า "ทรัพย์" แทน ไม่อ้างประเภทที่ไม่รู้
  //
  // ⚠️ ตัวแก้จริงของเรื่องนี้อยู่ที่ **ข้อมูล** ไม่ใช่โค้ด — ต้องให้ทีมกรอก propertyType
  // ให้ครบทุกแปลง (ตรวจ 20 ก.ย. 2569: ว่างทั้ง 22 แปลง) แล้วชื่อหน้าจะถูกต้องเองทันที
  // ⚠️ ค่าจริงอยู่ที่ `NJLandMeta.FALLBACK_KIND` ที่เดียว — อย่าประกาศซ้ำในไฟล์นี้อีก
  function kindOf(l){ return NJLandMeta.kindOf(l, vocab()); }
  function shortLabel(l){ return NJLandMeta.shortLabel(l, vocab()); }
  // เขียน <meta> ให้ถูกตัว — มี name= กับ property= ปนกัน ถ้าเลือกผิดจะได้แท็กซ้ำ
  function setMeta(attr, key, value){
    if(!value) return;
    var el=document.head.querySelector('meta['+attr+'="'+key+'"]');
    if(!el){ el=document.createElement('meta'); el.setAttribute(attr,key); document.head.appendChild(el); }
    if(el.getAttribute('content')!==value) el.setAttribute('content', value);
  }
  // คำอธิบายสั้นของแปลง — ประกอบจากช่องที่มีจริง ไม่เติมแทนช่องที่ว่าง
  function metaDescOf(l){ return NJLandMeta.metaDesc(l, vocab()); }

  function setSeo(l, photos){
    try{
      // ⚠️ **canonical ชี้ไปหน้าจริงที่ `/properties/{ประเภท}/{จังหวัด}/{อำเภอ}/{รหัส}/` ไม่ใช่ที่อยู่ของหน้านี้เอง**
      // หน้าสแตติกมีเนื้อหาอยู่ใน HTML ตั้งแต่ต้นทาง บอตของไลน์/เฟซบุ๊ก/Google จึงอ่านได้จริง
      // ส่วนหน้านี้ส่ง HTML เปล่าให้บอตเสมอ (เนื้อหามาทีหลังจาก JS)
      //
      // ⚠️ การ์ดทุกใบยังลิงก์มาที่ `land.html?id=` เหมือนเดิม **ไม่มีทางพาไป 404**
      //    แปลงที่เพิ่งขึ้นหลังรอบ build ล่าสุด จะยังไม่มีหน้าสแตติก → canonical ชี้ไปหน้าที่ยังไม่มี
      //    ซึ่ง Google ถือว่า "ข้ามคำสั่งนี้" แล้วเก็บหน้านี้แทน = เท่ากับพฤติกรรมเดิมก่อน Sprint 5
      //    พอ build รอบถัดไปวิ่ง ทุกอย่างเข้าที่เอง · ไม่มีจังหวะไหนที่ผู้ใช้เจอหน้าเสีย
      // ⚠️ ที่อยู่ใหม่ต้องใช้ข้อมูลทั้งใบ (ประเภท/จังหวัด/อำเภออยู่ใน URL) ไม่ใช่แค่รหัส
      //    และต้องเข้ารหัสก่อนใส่ลง href เพราะที่อยู่เป็นภาษาไทย
      var url=NJLandMeta.encUrl(NJLandMeta.pageUrl(l, vocab()));
      var link=document.querySelector('link[rel="canonical"]');
      if(!link){ link=document.createElement('link'); link.rel='canonical'; document.head.appendChild(link); }
      link.href=url;

      // ⚠️ **og ต้องเปลี่ยนตามแปลง** — ของเดิมเป็นข้อความกลางทุกแปลง
      // แปลว่าลิงก์ที่พนักงานส่งให้ลูกค้าทางไลน์ทุกแปลง ขึ้นหัวข้อและรูปเหมือนกันหมด
      // ซึ่งเป็นช่องทางขายหลักของบริษัท (รายงานตรวจ SEO ข้อ H-07)
      // ⚠️ ข้อจำกัดที่ต้องรู้: ไลน์/เฟซบุ๊กอ่าน og จาก HTML ต้นทาง **ไม่รันสคริปต์**
      //    การตั้งค่าตรงนี้จึงช่วยได้เฉพาะตัวที่รัน JS · ตัวแก้จริงคือสร้างหน้าแปลงเป็นไฟล์จริง
      //    ตอน build (ดู build/properties.js) ซึ่งต้องให้เจ้าของอนุมัติรอบ deploy ก่อน
      var desc=metaDescOf(l);
      var img=(photos||[]).filter(function(u){return /^https:\/\//.test(u);})[0]||'';
      setMeta('name','description',desc);
      setMeta('property','og:title',shortLabel(l)+' | ที่ดินชัวร์');
      setMeta('property','og:description',desc);
      setMeta('property','og:url',url);
      setMeta('property','og:type','website');
      if(img) setMeta('property','og:image',img);

      // เส้นทางนำทางสำหรับเสิร์ชเอนจิน — ต้องตรงกับที่แสดงบนหน้าจอเป๊ะ
      var bc={'@context':'https://schema.org','@type':'BreadcrumbList',
        itemListElement:crumbsOf(l).map(function(c,i){
          var it={'@type':'ListItem',position:i+1,name:c.t};
          if(c.h) it.item=SITE_URL+'/'+c.h;
          return it;
        })};
      var oldBc=document.getElementById('ld-breadcrumb');
      if(oldBc) oldBc.remove();
      var bs=document.createElement('script');
      bs.type='application/ld+json'; bs.id='ld-breadcrumb';
      bs.textContent=JSON.stringify(bc);
      document.head.appendChild(bs);

      var d={
        '@context':'https://schema.org',
        '@type':'RealEstateListing',
        url:url,
        name:shortLabel(l),
        inLanguage:'th-TH',
        isPartOf:{'@id':SITE_URL+'/#website'},
        provider:{'@id':SITE_URL+'/#org'}
      };
      if(l.blurb) d.description=String(l.blurb).slice(0,600);
      if(l.updatedAt) d.datePosted=l.updatedAt;
      // รูปต้องเป็นลิงก์เต็มและเป็น https เท่านั้น — Google ไม่ดึงรูปที่เป็น http บนหน้า https
      var imgs=(photos||[]).filter(function(u){ return /^https:\/\//.test(u); });
      if(imgs.length) d.image=imgs.slice(0,8);

      var land=l.land||{};
      var place={'@type':'Place', name:localityOf(l)||shortLabel(l)};
      if(land.province){
        // ไทยมี 3 ชั้น (ตำบล/อำเภอ/จังหวัด) แต่ PostalAddress มีช่องให้ 2 ชั้น
        // จับคู่แบบที่ใช้กันทั่วไป: ตำบล→streetAddress · อำเภอ→addressLocality · จังหวัด→addressRegion
        // ไม่ใส่เลขที่/พิกัดจริง — API สาธารณะตัดออกโดยตั้งใจอยู่แล้ว (ดู publicLand ใน server.js)
        place.address={'@type':'PostalAddress', addressCountry:'TH', addressRegion:land.province};
        if(land.amphoe) place.address.addressLocality=land.amphoe;
        if(land.tambon) place.address.streetAddress=land.tambon;
      }
      // เนื้อที่: ตารางวาไม่ใช่หน่วยสากล จึงแปลงเป็นตารางเมตร (1 ตร.ว. = 4 ตร.ม. ตรงตัว ไม่ใช่ค่าประมาณ)
      if(Number(l.totalWa)>0){
        place.additionalProperty=[
          {'@type':'PropertyValue', name:'เนื้อที่', value:l.land&&l.land.deedArea?l.land.deedArea:(l.totalWa+' ตร.ว.')},
          {'@type':'QuantitativeValue', name:'เนื้อที่ (ตารางเมตร)', value:Math.round(Number(l.totalWa)*4), unitCode:'MTK'}
        ];
      }
      d.about=place;

      if(Number(l.estValue)>0){
        d.offers={
          '@type':'Offer',
          price:Number(l.estValue),
          priceCurrency:'THB',
          availability:'https://schema.org/InStock',
          // 'sell' = ขายขาด · 'rent' = ให้เช่า — บอกให้ตรงกับที่หน้าจอแสดง
          businessFunction: l.type==='rent' ? 'http://purl.org/goodrelations/v1#LeaseOut'
                                            : 'http://purl.org/goodrelations/v1#Sell',
          url:url,
          seller:{'@id':SITE_URL+'/#org'}
        };
      }

      var old=document.getElementById('ld-schema');
      if(old) old.remove();
      var sc=document.createElement('script');
      sc.type='application/ld+json';
      sc.id='ld-schema';
      sc.textContent=JSON.stringify(d);
      document.head.appendChild(sc);
    }catch(e){ /* ข้อมูลให้เสิร์ชเอนจินพังห้ามทำให้หน้าแปลงพังตาม */ }
  }


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
    // ประเภทสิ่งปลูกสร้าง + จำนวนชั้น (2026-09-11) — แสดงเฉพาะที่ทีมกรอกแล้ว
    // ว่าง = ยังไม่ได้กรอก ไม่ใช่ "ที่ดินเปล่า" · ไม่กรอกก็ไม่ต้องขึ้นแถวนี้เลย
    var PT=(window.NJVocab&&window.NJVocab.PROPERTY_TH)||{};
    if(L.propertyType&&PT[L.propertyType]) known.push(['ประเภททรัพย์','ทีมงานบันทึกจากข้อมูลที่เจ้าของแจ้ง',PT[L.propertyType]+(L.floors>0?' · '+L.floors+' ชั้น':'')]);
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

  // ---------- รหัสทรัพย์ ----------
  //
  // ทำไมต้องเด่นขนาดนี้: ผู้ซื้อส่วนใหญ่ทักไลน์เข้ามาว่า "สนใจที่แปลงนึงในเว็บ" โดยไม่บอกว่าแปลงไหน
  // ทีมงานต้องไล่ถามย้อน และบ่อยครั้งจับคู่กลับไม่ได้เลยว่าเป็นแปลงของผู้ฝากขายรายใด
  // แปลว่า **เจ้าของที่ดินไม่เคยรู้ว่ามีคนสนใจแปลงของตัวเอง** ซึ่งเป็นสิ่งที่เราสัญญากับเขาไว้
  // รหัสนี้คือกุญแจดอกเดียวที่ทำให้แอดมินเปิดใบที่ถูกต้องแล้วโทรแจ้งเจ้าของได้ทันที
  //
  // ⚠️ ปุ่มคัดลอกต้องมี fallback เสมอ — navigator.clipboard ใช้ไม่ได้บน http:// และในเว็บวิวบางตัว
  // ล้มเหลวแล้วเงียบ = ผู้ซื้อคิดว่าคัดลอกแล้ว วางในไลน์ไม่ติด แล้วก็ไม่แจ้งรหัสอยู่ดี
  function codeHtml(l){
    return '<div class="ld-code">'+
      '<div class="ld-code-main">'+
        '<span class="ld-code-label">รหัสทรัพย์</span>'+
        '<b class="ld-code-val" id="ld-code-val">'+esc(l.id)+'</b>'+
      '</div>'+
      '<div class="ld-code-acts">'+
        '<button type="button" class="ld-code-btn" id="ld-code-copy" data-code="'+esc(l.id)+'">⧉ คัดลอกรหัส</button>'+
        // ปุ่มนี้ให้ compare.js เป็นคนสลับข้อความ (data-on/data-off) — บนการ์ดใช้คำสั้นว่า "เทียบ"
        // แต่บนหน้านี้มีที่พอเขียนเต็มประโยค จึงบอกข้อความของตัวเองไปให้
        '<button type="button" class="ld-code-btn njcmp-inline" data-njcmp="'+esc(l.id)+'" '+
          'data-off="＋ เทียบกับแปลงอื่น" data-on="✓ อยู่ในรายการเทียบแล้ว">'+
          '<span class="njcmp-txt">＋ เทียบกับแปลงอื่น</span></button>'+
      '</div>'+
      '<p class="ld-code-note">แจ้งรหัสนี้ทุกครั้งที่ทักไลน์ โทร หรือส่งข้อความเข้ามา — ทีมงานจะเปิดแปลงที่ถูกใบได้ทันที '+
        'และแจ้งเจ้าของที่ดินให้ทราบว่ามีผู้สนใจ</p>'+
    '</div>';
  }

  // ---------- สนใจแปลงนี้ + บริการเพิ่มเติม ----------
  // เนื้อในฟอร์มมาจาก njservices.js (รายการบริการชุดเดียวกับหน้าแรก) — ห้ามเขียนรายการซ้ำที่นี่
  // ลิงก์ไปเว็บ NJ — รหัสทรัพย์เดินทางไปกับลิงก์เพื่อให้ฟอร์มฝั่ง NJ กรอกให้เอง
  // ⚠️ รหัสต้องเป็นรูปแบบรหัสจริงเท่านั้น (กันยัดข้อความแปลกเข้า URL ของอีกโดเมน)
  var NJ_SITE='https://njandconsulting.com/';
  function njLinkHtml(l){
    var code=/^[A-Z]{2,4}-\d{1,6}$/.test(String(l&&l.id||''))?String(l.id):'';
    var utm='utm_source=njteedinsure&utm_medium=referral&utm_campaign=crosslink&utm_content=land_detail';
    var href=NJ_SITE+'?'+utm+'&from=teedin_land'+(code?'&code='+encodeURIComponent(code):'')+'#nj-contact';
    return '<a class="ld-inspect ld-nj" href="'+esc(href)+'" target="_blank" rel="noopener" data-njlink="'+esc(code)+'">'+
      '<b>ปรึกษาการสอบเขตก่อนซื้อ กับสำนักงานช่างรังวัดเอกชน NJ</b>'+
      '<small>งานรังวัดสอบเขตที่ยื่นเรื่องผ่านสำนักงานที่ดิน — แนบรหัสทรัพย์'+(code?' '+esc(code):'')+' ไปให้แล้ว · เปิดเว็บ njandconsulting.com</small>'+
    '</a>'+
    '<a class="ld-njguide" href="guides.html#survey">ดูวิธีตรวจสอบที่ดินก่อนซื้อ →</a>';
  }
  function inquiryHtml(){
    if(!window.NJServices) return '';
    return '<section class="njsv ld-inq" id="ld-inq" aria-labelledby="ld-inq-h">'+
      '<h2 id="ld-inq-h">สนใจแปลงนี้ — ให้ทีมงานติดต่อกลับ</h2>'+
      '<p class="ld-inq-lede">ระบบแนบรหัสทรัพย์ให้อัตโนมัติแล้ว ทีมงานจะรู้ทันทีว่าคุณสนใจแปลงไหน '+
        'และถ้าซื้อแล้วอยากให้ดูแลเรื่องโอน ขออนุญาตก่อสร้าง หรือหาผู้รับเหมาต่อ ติ๊กบอกไว้ได้เลย</p>'+
      '<div id="ld-inq-form"></div>'+
    '</section>';
  }

  // ---------- เส้นทางนำทาง (Breadcrumb) ----------
  // ⚠️ ลิงก์ทุกอันต้องไปถึงที่ที่ใช้ได้จริง — "จังหวัด" ชี้ไปหน้ารวมประกาศพร้อมคำค้น
  //    ซึ่งใช้ได้เพราะหน้านั้นรับ ?q= แล้ว (Sprint 2) · ไม่มีจังหวัดก็ข้ามขั้นนั้นไป
  function crumbsOf(l){
    var d=(l.land||{});
    var out=[{t:'หน้าแรก',h:'index.html'},{t:'ประกาศทั้งหมด',h:'listings.html'}];
    if(d.province) out.push({t:d.province,h:'listings.html?q='+encodeURIComponent(d.province)});
    out.push({t:l.id,h:''});
    return out;
  }
  function breadcrumbHtml(l){
    var c=crumbsOf(l);
    return '<nav class="ld-crumbs" aria-label="เส้นทางนำทาง"><ol>'+
      c.map(function(x,i){
        return '<li>'+(x.h?'<a href="'+esc(x.h)+'">'+esc(x.t)+'</a>'
                          :'<span aria-current="page">'+esc(x.t)+'</span>')+'</li>';
      }).join('')+'</ol></nav>';
  }

  // ลิงก์แจ้งข้อมูลไม่ถูกต้อง — เปิดไลน์พร้อมข้อความที่มีรหัสแปลงติดไปแล้ว
  // ⚠️ ต้องมีรหัสแปลงเสมอ ไม่งั้นทีมงานได้ข้อความว่า "ข้อมูลผิด" โดยไม่รู้ว่าแปลงไหน
  function reportHref(l){
    var msg='แจ้งข้อมูลไม่ถูกต้องของประกาศ รหัส '+l.id+' — รายละเอียด: ';
    return 'https://line.me/R/oaMessage/'+encodeURIComponent('@716lffzt')+'/?'+encodeURIComponent(msg);
  }

  // ---------- แปลงที่เพิ่งดู ----------
  // ⚠️ เก็บแค่รหัส ไม่เก็บข้อมูลแปลง — ราคาและสถานะเปลี่ยนได้ตลอด
  //    เก็บทั้งก้อนไว้ = ผู้ซื้อกลับมาเห็นราคาเก่าที่ไม่ตรงกับความจริงแล้ว
  var SEEN_KEY='njSeen', SEEN_MAX=8;
  function seenList(){
    try{ var v=JSON.parse(localStorage.getItem(SEEN_KEY)||'[]');
      return Array.isArray(v)?v.filter(function(x){return typeof x==='string'&&x;}):[]; }
    catch(e){ return []; }
  }
  function seenPush(id){
    var list=seenList().filter(function(x){return x!==id;});
    list.unshift(id);
    try{ localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(0,SEEN_MAX))); }catch(e){}
  }

  // ---------- แปลงใกล้เคียง + แปลงที่เพิ่งดู ----------
  // ⚠️ ดึงรายการย่อครั้งเดียวแล้วใช้ทั้งสองบล็อก — ไม่ยิงซ้ำสองรอบ
  // ⚠️ โหลดไม่สำเร็จ = ซ่อนทั้งหัวข้อไปเลย ห้ามขึ้นกล่องว่าง (กติกาข้อ 5)
  function renderRelated(current){
    var host=document.getElementById('ld-related');
    if(!host||!window.NJListing) return;
    NJListing.fetchListings().then(function(list){
      var all=list.filter(function(x){ return x.id!==current.id; });
      var prov=(current.land||{}).province||'';
      var near=all.filter(function(x){ return prov && (x.land||{}).province===prov; });
      var similar=near.concat(all.filter(function(x){ return near.indexOf(x)<0; })).slice(0,3);
      var seen=seenList().filter(function(id){ return id!==current.id; });
      var recent=seen.map(function(id){
        return all.filter(function(x){ return x.id===id; })[0];
      }).filter(Boolean).slice(0,3);

      var html='';
      if(similar.length){
        html+='<section class="ld-rel" aria-labelledby="ld-rel-h">'+
          '<h2 id="ld-rel-h">แปลงใกล้เคียง'+(prov?' ใน'+esc(prov):'')+'</h2>'+
          '<div class="ld-rel-grid">'+similar.map(NJListing.card).join('')+'</div>'+
          '<a class="ld-rel-more" href="listings.html'+(prov?'?q='+encodeURIComponent(prov):'')+'">ดูประกาศทั้งหมด'+(prov?'ใน'+esc(prov):'')+' <span aria-hidden="true">→</span></a>'+
        '</section>';
      }
      if(recent.length){
        html+='<section class="ld-rel" aria-labelledby="ld-seen-h">'+
          '<h2 id="ld-seen-h">แปลงที่คุณเพิ่งดู</h2>'+
          '<div class="ld-rel-grid">'+recent.map(NJListing.card).join('')+'</div>'+
        '</section>';
      }
      if(!html) return;
      host.innerHTML=html;
      if(window.NJCompare&&NJCompare.decorate) NJCompare.decorate(host);
      if(window.NJSave) NJSave.decorate(host);
      NJListing.bindGrid(host,'land_related');
    }).catch(function(){ /* ไม่มีแปลงใกล้เคียงก็ไม่ต้องขึ้นอะไร */ });
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
      breadcrumbHtml(l)+
      '<div class="ld-gal">'+galleryHtml(photos, l.parcelInfo||'แปลงที่ดิน')+
        '<div class="ld-badges"><span class="ld-badge type">'+(l.type==='rent'?'ให้เช่า':'ขาย')+'</span>'+badge+'</div>'+
        '<div class="ld-wm"><span>ที่ดินชัวร์</span><small>njteedinsure.com</small></div>'+
      '</div>'+
      '<div class="ld-body">'+
        '<div class="ld-price">'+money(l.estValue)+(pw?'<small>'+esc(pw)+'</small>':'')+'</div>'+
        (l.estValue?'<a class="ld-vlink" href="guides.html#valuation">ราคานี้คำนวณอย่างไร →</a>':'')+
        '<div id="ld-fee"></div>'+
        // ⚠️ **H1 ต้องเป็นชื่อสั้น ไม่ใช่รายละเอียดทั้งย่อหน้า** (งานที่ 8)
        // ของเดิมใช้ `parcelInfo` ทั้งก้อน ซึ่งคือ "ที่ตั้ง · ข้อความที่เจ้าของพิมพ์ · เนื้อที่"
        // ต่อกัน · เจอจริงยาว 200+ ตัวอักษร อ่านบนผลค้นหาไม่รู้เรื่องและกินพื้นที่ครึ่งจอมือถือ
        // ข้อความเต็มไม่ได้หายไปไหน — ย้ายลงไปเป็นคำอธิบายใต้ข้อมูลแปลงแทน
        '<h1 class="ld-title">'+esc(shortLabel(l))+'</h1>'+
        codeHtml(l)+
        (L.locality?'<div class="ld-loc">📍 '+esc(L.locality)+'</div>':'')+
        factsHtml(l,L,tier)+
        // ---- ระลอก Teedin Sure Verified (2026-09-09) ----
        // ⚠️ ทั้งสามตัวคืนสตริงว่างเมื่อ API ไม่ได้ส่งข้อมูลมา → แปลงเก่าทุกแปลงหน้าตาเหมือนเดิมเป๊ะ
        // ห้ามเปลี่ยนเป็นวาดกล่องว่างพร้อมข้อความ "ยังไม่มีข้อมูล" — บันไดว่าง 5 ขีดสีเทา
        // อ่านแล้วเหมือนแปลงถูกตัดสินไปแล้ว ทั้งที่ความจริงคือยังไม่มีใครไปตรวจ (กติกาข้อ 5)
        (window.NJVerified?NJVerified.ladderHtml(L.verify):'')+
        (window.NJHealth?NJHealth.tableHtml(L):'')+
        (window.NJParcelMap?NJParcelMap.mapHtml(L.plot):'')+
        // คะแนนความพร้อมของข้อมูล (Phase 3) — สรุปรวมของทุกอย่างข้างบน
        // ⚠️ `l.score` อยู่ระดับบนสุดของประกาศ **ไม่ได้อยู่ใน l.land** (คิดจากทั้งใบ ไม่ใช่เฉพาะข้อมูลแปลง)
        // ⚠️ คืนสตริงว่างเมื่อ API ไม่ส่งคะแนนมา → แปลงเก่าหน้าตาเหมือนเดิมเป๊ะ (กติกาข้อ 5)
        (window.NJScore?NJScore.panelHtml(l.score):'')+
        // แปลงนี้เข้าทางวัตถุประสงค์ไหนบ้าง (Phase 3) — ⚠️ `l.purposes` อยู่ระดับบนสุดของประกาศ
        // เหมือน `l.score` ไม่ได้อยู่ใน l.land · คืนสตริงว่างเมื่อ API ไม่ส่งมา (แปลงเก่าหน้าตาเหมือนเดิม)
        (window.NJPurpose?NJPurpose.panelHtml(l.purposes):'')+
        mapHtml(L)+
        nearbyHtml(L)+
        // รายละเอียดเต็ม — ย้ายมาจาก H1 (งานที่ 8) · ขึ้นเฉพาะเมื่อมีข้อความที่ต่างจากชื่อสั้น
        (l.parcelInfo&&l.parcelInfo!==shortLabel(l)
          ? '<section class="ld-desc"><h2>รายละเอียดแปลง</h2><p>'+esc(l.parcelInfo)+'</p></section>' : '')+
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
        // ทางเข้าหน้านัดตรวจแปลง (Phase 2) — วางแยกจากแถวปุ่มติดต่อโดยตั้งใจ
        // ⚠️ ไม่ใส่ data-contact และไม่ยิงสถิติติดต่อ — คนกดยังไม่ได้ติดต่อใคร เขาไปกรอกฟอร์มต่อ
        //    ซึ่งเซิร์ฟเวอร์นับเป็น inspect_submit ให้เองตอนสร้างใบ (นับที่เดียว · กติกาข้อ 6)
        '<a class="ld-inspect" href="inspect.html?listing='+encodeURIComponent(l.id)+'&from=land_page">'+
          '<b>ยังไม่มั่นใจ? ให้ช่างรังวัดไปตรวจแปลงนี้ก่อน</b>'+
          '<small>ตรวจเอกสารสิทธิ์ · หมุดหลักเขต · ทางเข้า–ออก · ค่าใช้จ่ายวันโอน — ส่งคำขอไม่มีค่าใช้จ่าย</small>'+
        '</a>'+
        // ทางเข้าเว็บ NJ (สำนักงานช่างรังวัดเอกชน) — งานรังวัดสอบเขตที่ยื่นผ่านสำนักงานที่ดิน (2026-09-23)
        // ⚠️ ต่างจากกล่องนัดตรวจข้างบนโดยตั้งใจ: อันบน = ทีมที่ดินชัวร์ไปดูแปลงให้ (ไม่มีค่าใช้จ่ายตอนขอ)
        //    อันนี้ = งานรังวัดอย่างเป็นทางการที่มีค่าบริการและต้องยื่นเรื่องที่สำนักงานที่ดิน
        // ⚠️ ส่งแค่รหัสทรัพย์ (ข้อมูลที่ประกาศอยู่แล้ว) ไปกับลิงก์ — ไม่มีข้อมูลส่วนบุคคลใน URL
        //    และติด UTM ให้ฝั่ง NJ รู้ว่ามาจากหน้าไหน · กดแล้วยิง nj_link_click (ไม่ใช่ลีด)
        njLinkHtml(l)+
        // ห้องข้อมูลแปลง (Phase 3) — ⚠️ ไม่ใช่ปุ่มดาวน์โหลด แต่เป็นการ "ขอสิทธิ์"
        // ข้อความต้องบอกตรงๆ ว่าต้องผ่านการอนุมัติก่อน ไม่งั้นคนกดแล้วคาดหวังว่าจะได้ไฟล์ทันที
        '<a class="ld-inspect ld-room" href="room.html?listing='+encodeURIComponent(l.id)+'">'+
          '<b>ขอดูเอกสารของแปลงนี้ก่อนตัดสินใจ</b>'+
          '<small>รายงานรังวัด · รายงานตรวจสอบ · แผนที่ · เอกสารทางเข้า–ออก — ทีมงานยืนยันตัวตนแล้วจึงเปิดให้ดู</small>'+
        '</a>'+
        // แถวเครื่องมือของผู้ซื้อ — บันทึก · แชร์ · แจ้งประกาศไม่ถูกต้อง (งานที่ 8)
        // ⚠️ ปุ่มแจ้งประกาศ **ไม่ใช่ช่องทางติดต่อ** จึงไม่ใส่ data-contact และไม่ยิงสถิติลีด
        //    คนที่กดคือคนที่เจอข้อมูลผิด ไม่ใช่คนที่สนใจซื้อ (กติกาเดียวกับหน้าพอร์ทัล)
        '<div class="ld-tools">'+
          '<button type="button" class="njsave-btn njsave-wide" data-njsave="'+esc(l.id)+'" aria-pressed="false">'+
            '<span class="njsave-ico" aria-hidden="true">♥</span><span class="njsave-txt">บันทึก</span></button>'+
          '<button type="button" class="ld-tool" id="ld-share">'+
            '<span aria-hidden="true">↗</span> แชร์แปลงนี้</button>'+
          '<a class="ld-tool" id="ld-report" href="'+esc(reportHref(l))+'" target="_blank" rel="noopener noreferrer">'+
            '<span aria-hidden="true">⚑</span> แจ้งข้อมูลไม่ถูกต้อง</a>'+
        '</div>'+
        inquiryHtml()+
        '<button type="button" class="ld-btn ghost ld-pdf-btn" id="ld-pdf-btn">📄 ดาวน์โหลด PDF ประกาศนี้</button>'+
        '<div id="ld-related"></div>'+
      '</div>'+
      // แถบติดต่อแบบติดหนึบบนมือถือ (งานที่ 8) — ซ่อนบนเดสก์ท็อปและตอนสั่งพิมพ์
      // ⚠️ ต้องอยู่ต่ำกว่าแบนเนอร์คุกกี้และลิ้นชักเมนู ไม่งั้นไปบังของที่เป็นเรื่องกฎหมาย
      '<div class="ld-sticky" role="group" aria-label="ติดต่อเรื่องแปลงนี้">'+
        '<span class="ld-sticky-code">รหัส '+esc(l.id)+'</span>'+
        '<a class="ld-sticky-btn line" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">ทักไลน์</a>'+
        '<a class="ld-sticky-btn tel" href="'+TEL2+'" data-contact="tel">โทร</a>'+
      '</div>';

    // เครื่องคำนวณค่าโอน — เติมให้แค่ "ราคาซื้อขาย" ซึ่งเป็นตัวเลขที่ประกาศอยู่แล้ว
    // ⚠️ ห้ามเติมราคาประเมินราชการให้ (ดูเหตุผลใน feecalc.js) — ผู้ซื้อต้องกรอกเอง
    if(window.NJFeeCalc) NJFeeCalc.mount(document.getElementById('ld-fee'),{salePrice:l.estValue});

    initGallery(document.querySelector('.ld-gal'), photos.length);
    // ปุ่มหมุดบนแผนที่แนวเขต — ต้องต่อหลังวาด HTML เสร็จ (ผูก listener ที่กล่อง ไม่ผูกรายปุ่ม)
    if(window.NJParcelMap&&L.plot) NJParcelMap.init(document.getElementById('ld-root'), L.plot);
    var pdfBtn=document.getElementById('ld-pdf-btn');
    if(pdfBtn) pdfBtn.addEventListener('click', function(){
      // ⚠️ นับเป็น "ดาวน์โหลดรายงาน" ไม่ใช่การติดต่อ — ห้ามบวกเข้า leads
      if(window.njTrackInternal) njTrackInternal('download_report', l.id);
      window.print();
    });

    // ปุ่มคัดลอกรหัสทรัพย์ — มีทางถอย 2 ชั้น เพราะ clipboard API ใช้ไม่ได้ทุกที่
    var copyBtn=document.getElementById('ld-code-copy');
    if(copyBtn) copyBtn.addEventListener('click', function(){
      var code=copyBtn.getAttribute('data-code');
      var ok=function(){ copyBtn.textContent='✓ คัดลอกแล้ว'; setTimeout(function(){ copyBtn.textContent='⧉ คัดลอกรหัส'; },2000); };
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(code).then(ok, function(){ prompt('คัดลอกรหัสนี้ไว้', code); });
      } else { prompt('คัดลอกรหัสนี้ไว้', code); }
    });

    // ฟอร์มสนใจแปลง — ส่งรหัสแปลงเข้าไปให้ล็อกไว้ ผู้ซื้อจึงไม่มีทางพิมพ์รหัสผิด
    var inqHost=document.getElementById('ld-inq-form');
    if(inqHost&&window.NJServices){
      NJServices.mount(inqHost,{ listingId:l.id, ref:'land_detail' });
      if(window.njTrackInternal) njTrackInternal('inquiry_view', l.id);
    }
    // ปุ่ม "เทียบกับแปลงอื่น" บนหน้านี้ไม่ได้อยู่บนการ์ด compare.js จึงยังไม่รู้จักสถานะของมัน
    if(window.NJCompare){ NJCompare.sync(); NJCompare.renderBar(); }

    // ปุ่มแชร์ — ใช้ตัวแชร์ของเครื่องถ้ามี ไม่มีก็คัดลอกลิงก์ให้
    // ⚠️ ต้องมีทางถอยเสมอ: navigator.share ใช้ได้เฉพาะ https และบางเบราว์เซอร์เท่านั้น
    var shareBtn=document.getElementById('ld-share');
    if(shareBtn) shareBtn.addEventListener('click', function(){
      var url=location.href, title=shortLabel(l)+' | ที่ดินชัวร์';
      if(window.njTrackInternal) njTrackInternal('share_property', l.id);
      var done=function(){ shareBtn.innerHTML='<span aria-hidden="true">✓</span> คัดลอกลิงก์แล้ว';
        setTimeout(function(){ shareBtn.innerHTML='<span aria-hidden="true">↗</span> แชร์แปลงนี้'; },2200); };
      if(navigator.share){ navigator.share({title:title,text:title,url:url}).catch(function(){}); return; }
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(done, function(){ prompt('คัดลอกลิงก์นี้ไว้', url); });
      } else { prompt('คัดลอกลิงก์นี้ไว้', url); }
    });
    if(window.NJSave) NJSave.sync();
    seenPush(l.id);
    renderRelated(l);

    document.title=shortLabel(l)+' | ที่ดินชัวร์';
    setSeo(l, photos);
    if(window.njTrack) njTrack('ViewContent',{content_name:'land_detail',content_ids:[l.id],content_category:'tier'+tier});
  }

  // ⚠️ **แปลงที่ไม่มีอยู่แล้วต้องบอกเสิร์ชเอนจินว่าอย่าเก็บหน้านี้**
  // เว็บนี้เป็นสแตติกบน GitHub Pages จึงคืนสถานะ 404 จริงไม่ได้ (ทุกคำขอได้ 200 เสมอ)
  // ผลคือประกาศที่ถอนไปแล้วยังค้างในดัชนีเป็นหน้าว่าง — รายงานตรวจ SEO ข้อ H-08
  // ทางที่ทำได้จริงคือ noindex + ไม่ใส่ canonical ชี้ไปหาหน้าที่ไม่มีเนื้อหาแล้ว
  function markGone(){
    var m=document.head.querySelector('meta[name="robots"]');
    if(!m){ m=document.createElement('meta'); m.name='robots'; document.head.appendChild(m); }
    m.setAttribute('content','noindex, follow');
    var c=document.querySelector('link[rel="canonical"]');
    if(c) c.remove();
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
    // ⚠️ หน้าสแตติก `p/<รหัส>.html` ไม่มี query string — `build/properties.js` ฝังรหัสไว้ใน
    //    `window.NJ_LISTING_ID` แทน · `?id=` ยังชนะเสมอ เพื่อให้ลิงก์เดิมทุกอันทำงานเหมือนเดิม
    var id=qs('id')||String(window.NJ_LISTING_ID||'').trim();
    var base=window.NJ_API_BASE||'https://app.njteedinsure.com';
    if(!id){ fail('ไม่พบรหัสแปลงที่ดิน','ลิงก์อาจไม่สมบูรณ์ ลองเลือกแปลงจากหน้ารายการอีกครั้ง'); return; }
    // ⚠️ ดึงเฉพาะแปลงนี้แปลงเดียว (เพิ่ม 2026-09-09)
    // เดิมหน้านี้โหลด `/api/public/listings` ทั้งก้อน = ดาวน์โหลดข้อมูลของ **ทุกแปลงทั้งเว็บ**
    // แล้วค่อยคัดเอาแปลงเดียวที่ต้องการ · พอบันได 5 ระดับ รายงานสุขภาพ และรูปแปลง
    // (หมุดได้ถึง 200 จุด) เข้ามา ข้อมูลต่อแปลงโตขึ้นหลายเท่า คนที่เปิดหน้าเดียว
    // จะต้องโหลดของทุกแปลงตามไปด้วย · ห้ามกลับไปโหลดทั้งก้อนอีก
    // 404 = แปลงถูกถอด/ขายแล้ว ซึ่งคนละเรื่องกับ "โหลดไม่สำเร็จ" ต้องขึ้นคนละข้อความ
    fetch(base+'/api/public/listings/'+encodeURIComponent(id))
      .then(function(r){
        if(r.status===404) return null;
        if(!r.ok) throw new Error();
        return r.json();
      })
      .then(function(d){
        var l=d&&d.listing;
        // ไม่เจอ = อาจขายไปแล้วหรือเจ้าของถอนประกาศ ต้องบอกตามจริง ไม่ใช่บอกว่าเว็บพัง
        if(!l){ markGone(); fail('ไม่พบแปลงที่ดินนี้แล้ว','แปลงนี้อาจขายไปแล้ว หรือเจ้าของขอถอนประกาศ — ทักไลน์มาสอบถามแปลงอื่นที่ใกล้เคียงได้'); return; }
        render(l);
        // นับว่ามีคนเปิดดูแปลงนี้ — ยิงหลังจากพบแปลงจริงแล้วเท่านั้น
        // ยิงตั้งแต่ตอนเปิดหน้า = นับรวมลิงก์เสียและแปลงที่ถอนประกาศไปแล้วเข้าไปด้วย
        if(window.njTrackInternal) njTrackInternal('listing_view', l.id);
      })
      .catch(function(){
        fail('ตอนนี้โหลดข้อมูลไม่สำเร็จ','กรุณาลองใหม่อีกครั้ง หรือโทรสอบถามได้ที่ '+TEL_TXT+' / '+TEL2_TXT);
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
      wrap.className='ld-btn tel'; wrap.href=TEL; wrap.textContent='☏ '+TEL_TXT;
      // เผยทั้งสองเบอร์พร้อมกัน — กดดูเบอร์แล้วต้องเห็นทุกเบอร์ที่โทรหาเราได้จริง
      var wrap2=document.createElement('a');
      wrap2.className='ld-btn tel'; wrap2.href=TEL2; wrap2.textContent='📱 '+TEL2_TXT;
      rv.parentNode.replaceChild(wrap,rv);
      wrap.parentNode.insertBefore(wrap2,wrap.nextSibling);
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
