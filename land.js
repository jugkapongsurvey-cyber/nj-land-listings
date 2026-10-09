(function(){
  'use strict';
  // หน้ารายละเอียดแปลงที่ดิน — land.html?id=OP-xxx
  //
  // ⚠️ กติกาที่ห้ามผ่อนในไฟล์นี้ (เหตุผลเดียวกับ CLAUDE.md ข้อ 4-5):
  //   1. แสดงเฉพาะสิ่งที่ API ส่งมาจริง · ช่องไหนไม่มีข้อมูล = ซ่อนบรรทัดนั้น ห้ามเติมข้อความแทน
  //   2. ผลตรวจที่ status ว่าง ต้องแสดงเป็น "ยังไม่ได้ตรวจ" เท่านั้น
  //      ห้ามแสดงเป็นติ๊กถูกหรือปล่อยว่างจนคนเข้าใจว่า "ไม่มีปัญหา" — สองอย่างนี้คนละเรื่องกัน
  //   3. ประกาศระดับ 1 ห้ามขึ้นป้าย "ตรวจสอบโดย NJ" เด็ดขาด (ป้ายระดับ 2 = ทีม NJ ตรวจสอบแล้ว ไม่ได้แปลว่ารังวัดแล้วเสมอไป)

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

  // ราคาต่อตารางวา — ⚠️ ใช้ตัวเลขที่เซิร์ฟเวอร์คำนวณให้ (`pricePerWa`) เท่านั้น (กติกาข้อ 5)
  // ของเดิมหารเองจากข้อความเนื้อที่ในเบราว์เซอร์ ซึ่งปัดเศษคนละแบบกับการ์ดในหน้ารวม
  // ผู้ซื้อเห็นราคาต่อตารางวาของแปลงเดียวกันสองค่า (แก้ 27 ก.ย. 2569) · 0 = ไม่มีเนื้อที่/ราคา → ซ่อน
  function perWaText(l){
    var n=Number(l.pricePerWa)||0;
    return n>0 ? '≈ '+n.toLocaleString('th-TH')+' บาท/ตร.ว.' : '';
  }
  // ราคาต่อ ตร.ม. ของห้องชุด — ⚠️ เซิร์ฟเวอร์คิดจากขนาดห้องที่ "เจ้าของแจ้ง" (pricePerSqm) ห้ามหารเองในเบราว์เซอร์
  // 0 = ไม่มีขนาดห้อง/ไม่มีราคา/ประกาศเช่า → ซ่อน (ไม่เดา) · ที่มาของขนาดห้องบอกในหัวข้อ "โครงสร้างและขนาดพื้นที่"
  function perSqmText(l){
    var n=Number(l.pricePerSqm)||0;
    return n>0 ? '≈ '+n.toLocaleString('th-TH')+' บาท/ตร.ม.' : '';
  }

  // "0-0-33.9" → "33.9 ตร.ว." · "2-1-50 ไร่" → "2 ไร่ 1 งาน 50 ตร.ว." — อ่านง่ายกว่ารูปแบบย่อ
  // อ่านไม่ออก = คืนข้อความเดิมทั้งก้อน ห้ามเดา (เนื้อที่ผิดทำให้ราคาต่อหน่วยผิดตาม)
  function areaTh(s){
    var m=String(s||'').match(/^\s*(\d+)\s*-\s*(\d+)\s*-\s*(\d+(?:\.\d+)?)\s*(?:ไร่)?\s*$/);
    if(!m) return String(s||'');
    var p=[];
    if(Number(m[1])) p.push(Number(m[1])+' ไร่');
    if(Number(m[2])) p.push(Number(m[2])+' งาน');
    if(Number(m[3])||!p.length) p.push(Number(m[3])+' ตร.ว.');
    return p.join(' ');
  }

  // ---------- รายละเอียดทรัพย์จากเจ้าของ (`l.specs` · 2026-09-27) ----------
  // ⚠️ **ข้อมูลที่เจ้าของกรอกตอนฝากขาย ทีมยังไม่ได้ตรวจ** — ต้องติดป้ายบอกทุกที่ที่แสดง
  //    ห้ามแสดงปนกับผลตรวจของช่าง และห้ามใช้ตัดสินป้ายเหลือง/เขียว (กติกาข้อ 10)
  // ⚠️ `l.specs` อยู่ระดับบนสุดของประกาศ ไม่ได้อยู่ใน `l.land` · null = ไม่มีข้อมูล → ซ่อน (กติกาข้อ 5)
  function specOf(l, k){
    var s=l.specs; if(!s||!s.items) return null;
    for(var i=0;i<s.items.length;i++) if(s.items[i].k===k) return s.items[i];
    return null;
  }
  // ป้ายที่มา 2 แบบ (source ส่งมาจากระบบ · 2026-09-27): เจ้าของกรอกเองในฟอร์มฝากขาย
  // หรือทีมงานบันทึกให้จากที่เจ้าของแจ้ง (แปลงเก่าที่ไม่มีประเภททรัพย์) — ทั้งสองแบบยังไม่ได้ตรวจวัดจริง ห้ามตัดท่อนนั้นทิ้ง
  function specNote(l){
    return (l.specs&&l.specs.source==='team')
      ? 'ทีมงานบันทึกจากข้อมูลที่เจ้าของแจ้ง · ยังไม่ได้ตรวจวัดจริง'
      : 'ข้อมูลจากเจ้าของทรัพย์ · ทีมงานยังไม่ได้ตรวจสอบ';
  }

  // ไอคอนเส้นของแถบตัวเลขสำคัญ — ประดับล้วน (aria-hidden) ป้ายข้อความข้างใต้คือข้อมูลจริง
  var ICO={
    area:'<rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M8 3.5v3M3.5 8h3M16 20.5v-3M20.5 16h-3"/>',
    usable:'<path d="M3.5 20.5V9.5l8.5-6 8.5 6v11"/><path d="M9.5 20.5v-6h5v6"/>',
    bed:'<path d="M3.5 18.5V6.5M20.5 18.5V13a3 3 0 0 0-3-3h-7v5"/><path d="M3.5 15h17"/><circle cx="7" cy="11.5" r="1.6"/>',
    bath:'<path d="M4 12h16v2.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 14.5z"/><path d="M6.5 12V6.5a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/>',
    car:'<path d="M5 15.5l1.4-4.3A2 2 0 0 1 8.3 9.8h7.4a2 2 0 0 1 1.9 1.4l1.4 4.3"/><rect x="3.5" y="15.5" width="17" height="4" rx="1.5"/>',
    front:'<path d="M3.5 17h17M3.5 14v6M20.5 14v6"/><path d="M6 10.5l6-6 6 6"/>',
    floors:'<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12.5l8.5 4.5 8.5-4.5"/>'
  };
  function ico(k){ return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+ICO[k]+'</svg>'; }

  // แถบตัวเลขสำคัญใต้ราคา (แบบเว็บอสังหาฯ ทั่วไป) — เนื้อที่ · พื้นที่ใช้สอย · ห้องนอน · ห้องน้ำ · ที่จอด · หน้ากว้าง
  // ⚠️ แสดงเฉพาะช่องที่มีค่าจริง · มีค่าจากเจ้าของปนอยู่ = ต้องมีบรรทัดบอกที่มาใต้แถบเสมอ
  function statsHtml(l, L, tier){
    var out=[], owner=false;
    var measured=tier===2 && L.checks && L.checks.area && L.checks.area.value;
    if(measured) out.push(['area', areaTh(L.checks.area.value), 'เนื้อที่วัดจริง']);
    else if(L.deedArea) out.push(['area', areaTh(L.deedArea), 'เนื้อที่ตามโฉนด']);
    var size=specOf(l,'usableSqm')||specOf(l,'roomSqm')||specOf(l,'buildingSqm');
    if(size){ out.push(['usable', size.text, size.th]); owner=true; }
    [['bedrooms','bed'],['bathrooms','bath'],['parking','car']].forEach(function(p){
      var s=specOf(l,p[0]); if(s){ out.push([p[1], String(s.v), s.th+(s.k==='parking'?' (คัน)':'')]); owner=true; }
    });
    var fl=Number(L.floors)>0 ? L.floors : 0;
    if(!fl){ var sf=specOf(l,'floors'); if(sf){ fl=sf.v; owner=true; } }
    if(fl) out.push(['floors', String(fl), 'ชั้น']);
    if(L.frontage) out.push(['front', L.frontage, 'หน้ากว้างโดยประมาณ']);
    if(!out.length) return '';
    return '<ul class="ld-stats">'+out.map(function(s){
      return '<li class="ld-stat">'+ico(s[0])+'<b>'+esc(s[1])+'</b><span>'+esc(s[2])+'</span></li>';
    }).join('')+'</ul>'+
    (owner?'<p class="ld-stats-src">พื้นที่ใช้สอย · ห้อง · ที่จอดรถ: '+esc(specNote(l))+'</p>':'');
  }

  // ---------- โครงสร้างและขนาดพื้นที่ ----------
  // สองกลุ่มแยกกันชัดเจน: สิ่งที่ทีมงานบันทึก (land.*) กับสิ่งที่เจ้าของแจ้ง (specs)
  // ⚠️ ช่องที่ทีมกรอกแล้ว ไม่ขึ้นค่าของเจ้าของซ้ำ (เช่นหน้ากว้าง/ถนน/จำนวนชั้น) — ของทีมมาก่อนเสมอ
  function specGridHtml(l, L, tier){
    var V=vocab(), team=[];
    var PT=V.PROPERTY_TH||{};
    if(L.propertyType&&PT[L.propertyType]) team.push(['ประเภททรัพย์', PT[L.propertyType]+(Number(L.floors)>0?' · '+L.floors+' ชั้น':'')]);
    var measured=tier===2 && L.checks && L.checks.area && L.checks.area.value;
    if(measured) team.push(['เนื้อที่วัดจริง', areaTh(L.checks.area.value)]);
    if(L.deedArea) team.push(['เนื้อที่ตามโฉนด', areaTh(L.deedArea)]);
    if(Number(l.totalWa)>0) team.push(['เนื้อที่รวม', Number(l.totalWa).toLocaleString('th-TH')+' ตร.ว.']);
    if(L.frontage) team.push(['หน้ากว้างโดยประมาณ', L.frontage]);
    if(L.deedType&&V.DEED_TH&&V.DEED_TH[L.deedType]) team.push(['เอกสารสิทธิ์', V.DEED_TH[L.deedType]]);
    if(L.zoneColor&&V.zoneShort) team.push(['ผังสีผังเมือง', V.zoneShort(L.zoneColor), V.ZONE_HEX&&V.ZONE_HEX[L.zoneColor]]);
    if(L.zoning) team.push(['ผังเมืองรวม', L.zoning]);
    if(L.roadSurface&&V.ROAD_TH&&V.ROAD_TH[L.roadSurface]) team.push(['ถนนหน้าแปลง', V.ROAD_TH[L.roadSurface]+(Number(L.roadLanes)>0?' · '+L.roadLanes+' เลน':'')]);
    if(L.facing&&V.FACING_TH&&V.FACING_TH[L.facing]) team.push(['หันหน้าทิศ', V.FACING_TH[L.facing]]);
    if(Number(l.pricePerRai)>0) team.push(['ราคาต่อไร่', '≈ '+Number(l.pricePerRai).toLocaleString('th-TH')+' บาท']);

    var dup={ frontageM:!!L.frontage, roadAccess:!!L.roadSurface, floors:Number(L.floors)>0 };
    var own=((l.specs&&l.specs.items)||[]).filter(function(s){ return !dup[s.k] && s.k!=='utilities'; })
      .map(function(s){ return [s.th, s.text]; });
    // ราคาต่อ ตร.ม. คำนวณจากขนาดห้องที่เจ้าของแจ้ง → อยู่ในกลุ่มที่ติดป้ายข้อมูลจากเจ้าของ (ไม่ปนกับค่าที่ทีมตรวจวัด)
    var psq=perSqmText(l);
    if(psq && own.length) own.push(['ราคาต่อ ตร.ม. (คิดจากขนาดห้อง)', psq]);

    function grid(rows){
      return '<dl class="ld-spec">'+rows.map(function(r){
        var dot=r[2]?'<i class="ld-dot-z" style="background:'+esc(r[2])+'" aria-hidden="true"></i>':'';
        return '<div class="ld-spec-i"><dt>'+esc(r[0])+'</dt><dd>'+dot+esc(r[1])+'</dd></div>';
      }).join('')+'</dl>';
    }
    var html='';
    if(team.length) html+='<p class="ld-src team">ทีมงานบันทึก</p>'+grid(team);
    if(own.length) html+='<p class="ld-src owner">'+esc(specNote(l))+'</p>'+grid(own);
    return html;
  }

  // ---------- สาธารณูปโภคและจุดเด่นของแปลง ----------
  // features[] = ทีมติ๊กเอง · utilities = เจ้าของแจ้ง · แยกกลุ่มและบอกที่มาเหมือนตารางข้างบน
  function featuresHtml(l, L){
    var V=vocab(), FT=V.FEATURE_TH||{};
    var team=(L.features||[]).filter(function(k){ return FT[k]; }).map(function(k){ return FT[k]; });
    var u=specOf(l,'utilities');
    var own=u&&u.text ? String(u.text).split(/,\s*/) : [];
    function chips(list){
      return '<ul class="ld-feat">'+list.map(function(t){
        return '<li><span class="ld-feat-i" aria-hidden="true">✓</span>'+esc(t)+'</li>';
      }).join('')+'</ul>';
    }
    var html='';
    if(team.length) html+='<p class="ld-src team">ทีมงานบันทึก</p>'+chips(team);
    if(own.length) html+='<p class="ld-src owner">'+esc(specNote(l))+'</p>'+chips(own);
    return html;
  }

  // ---------- หัวข้อพับได้ ----------
  // <details open> — เปิดไว้ทุกหัวข้อตั้งแต่แรก (ผู้ซื้อต้องเห็นข้อมูลโดยไม่ต้องกด) แค่พับเก็บได้
  // ⚠️ ตอนสั่งพิมพ์ต้องกางทุกหัวข้อ (ดู beforeprint ใน render) ไม่งั้นหัวข้อที่พับไว้หายจาก PDF
  // ⚠️ body ว่าง = ไม่วาดหัวข้อเลย (กติกาข้อ 5) ห้ามวาดหัวข้อเปล่าพร้อมข้อความ "ยังไม่มีข้อมูล"
  function secHtml(id, title, body){
    if(!body) return '';
    return '<details class="ld-sec" id="'+id+'" open>'+
      '<summary><h2>'+esc(title)+'</h2><span class="ld-sec-ico" aria-hidden="true"></span></summary>'+
      '<div class="ld-sec-b">'+body+'</div>'+
    '</details>';
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
    // สรุปตรวจแล้ว/ยังไม่ตรวจ — บอกตรงๆ ว่ายังเหลือหัวข้อไหน (ยังไม่ตรวจ ≠ ไม่มีปัญหา)
    var chk=L.checks||{}, done=CHECKS.filter(function(c){ return (chk[c.k]||{}).status; }).length;
    var sum='<p class="ld-tier-sum">ตรวจแล้ว <b>'+done+'</b> จาก '+CHECKS.length+' หัวข้อ'+
      (done<CHECKS.length?' · ยังไม่ตรวจ '+(CHECKS.length-done)+' หัวข้อ (ยังไม่ตรวจ ไม่ได้แปลว่าไม่มีประเด็น)':'')+'</p>';
    return '<section class="ld-tier t2">'+
      '<div class="ld-tier-h"><b>✓ ระดับ 2 — ตรวจสอบเชิงลึกแล้ว</b><em>ใบอนุญาต 351</em></div>'+
      sum+
      rows+
      '<p class="ld-tier-foot">'+
        (when?('ตรวจสอบเมื่อ '+esc(when)+esc(by)+' · '):'')+
        'ข้อมูลอ้างอิงจากเอกสารสิทธิ์และสารบบที่ดิน ณ วันที่ตรวจ ผู้ซื้อควรตรวจสอบซ้ำอีกครั้งในวันโอนกรรมสิทธิ์'+
      '</p>'+
    '</section>';
  }

  // ผลตรวจเฉพาะห้องชุด (รอบคอนโด 2 · `l.condoChecks` อยู่ระดับบนสุดของประกาศ ไม่ได้อยู่ใน `l.land`)
  // ⚠️ หัวข้อ ข้อความสถานะ วันที่ ผู้ตรวจ และข้อความกำกับ มาจาก API ทั้งหมด — ห้ามพิมพ์รายการ/คำปฏิเสธซ้ำไว้ที่นี่
  //    (ต้นฉบับคือ lib/condochecks.js ฝั่งระบบ · `contracts.test.js` ล็อกว่าไฟล์นี้ไม่มีรายการฝัง)
  // ⚠️ null = ไม่ใช่คอนโด/ยังไม่มีข้อไหนตรวจ → คืนสตริงว่าง ไม่วาดกล่องว่าง (กติกาข้อ 5)
  // ⚠️ ข้อที่ยังไม่ตรวจต้องแสดงเป็นขีด "—" พร้อมคำว่า "ยังไม่ได้ตรวจ" ห้ามซ่อนและห้ามแสดงเป็นผ่าน (ยังไม่ตรวจ ≠ ไม่มีปัญหา)
  // ⚠️ ชุดนี้แยกจากแผง "ระดับ 1/2" — ไม่ได้เปลี่ยนระดับข้อมูลของประกาศ จึงใช้คลาส .tc คนละสีกับ .t1/.t2 และไม่ใช้ป้าย "ตรวจโดย NJ"
  function condoChecksHtml(l){
    var cc=l&&l.condoChecks;
    if(!cc||!cc.items||!cc.items.length) return '';
    var done=cc.items.filter(function(i){ return i.status; }).length;
    var rows=cc.items.map(function(i){
      var st=i.status||'';
      var ico = st==='ok'   ? '<span class="ld-ico ok">✓</span>'
              : st==='warn' ? '<span class="ld-ico warn">!</span>'
              :               '<span class="ld-ico none">—</span>';
      var line=[i.statusTh||'', i.at?('ตรวจเมื่อ '+thaiDate(i.at)):''].filter(Boolean).join(' · ');
      var note=i.note?'<span>'+esc(i.note)+'</span>':'';
      var val=i.value?'<span class="ld-val">'+esc(i.value)+'</span>':'';
      return '<div class="ld-crow'+(st?'':' dim')+'">'+ico+'<div><b>'+esc(i.th)+'</b>'+
        '<span class="ld-cst">'+esc(line)+'</span>'+note+'</div>'+val+'</div>';
    }).join('');
    return '<section class="ld-tier tc">'+
      '<div class="ld-tier-h"><b>🏢 ผลตรวจเฉพาะห้องชุด</b><em>'+esc(cc.by||'')+'</em></div>'+
      '<p class="ld-tier-sum">ตรวจแล้ว <b>'+done+'</b> จาก '+cc.items.length+' หัวข้อ'+
        (done<cc.items.length?' · ยังไม่ตรวจ '+(cc.items.length-done)+' หัวข้อ (ยังไม่ตรวจ ไม่ได้แปลว่าไม่มีประเด็น)':'')+'</p>'+
      rows+
      '<p class="ld-tier-foot">'+esc(cc.disclaim||'')+' · ชุดตรวจนี้แยกจากระดับข้อมูลของประกาศ ไม่ได้เปลี่ยนระดับ 1/2</p>'+
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

  // ---------- แกลเลอรีรูป (แบบโมเสก · 2026-09-27) ----------
  //
  // เดิมเป็นสไลด์เลื่อนเองทีละรูปเต็มความกว้าง — ผู้ซื้อต้องรอ/กดทีละใบกว่าจะรู้ว่าแปลงนี้มีรูปอะไรบ้าง
  // แบบใหม่ตามเว็บอสังหาฯ ที่เจ้าของส่งมา: จอกว้างเห็น 5 รูปพร้อมกัน (ใหญ่ 1 + เล็ก 4) · มือถือปัดนิ้วเลื่อนเอง
  // แตะรูปไหนก็เปิดดูเต็มจอ (lightbox) ที่ใบนั้น
  //
  // ⚠️ รูปใหญ่ใบแรกยังเป็น object-fit:contain + พื้นหลังเบลอเหมือนเดิม (เหตุผลที่ .ld-tile.t0 ใน land.css)
  //    ภาพกราฟิกแผนที่ที่มีตัวหนังสือชิดขอบต้องไม่ถูกครอบตัดในจุดที่คนดูเป็นใบแรก
  //    รูปเล็กใช้ไฟล์ย่อ 800×600 (ครอบตัดมาแล้ว) ได้ เพราะเป็นแค่ตัวอย่าง — เต็มจอใช้ไฟล์ต้นฉบับเสมอ
  // ⚠️ ไม่เลื่อนเองอีกแล้ว — การเลื่อนเองขัดกับ prefers-reduced-motion และทำให้คนอ่านรูปไม่ทัน
  // ⚠️ รูปทั้งหมดของแปลงเป็นภาพถ่ายจริงของแปลงนั้น (กติกาข้อ 9) · ห้ามเติมรูปแทนเมื่อรูปไม่ครบ 5
  // ไฟล์ย่อโหลดไม่ขึ้น → ถอยไปไฟล์ต้นฉบับ (ตัวดักอยู่ที่ NJListing.imgFallback · ดูเหตุผลใน listingcard.js)
  function fullAttr(thumb, full){
    return (thumb && full && thumb!==full) ? ' data-full="'+esc(full)+'"' : '';
  }
  function galleryHtml(photos, thumbs, altBase){
    var n=photos.length;
    if(!n) return '<div class="ld-gal ld-mosaic n0"><div class="ld-noimg"></div></div>';
    var tiles=photos.map(function(src,i){
      var alt=esc(altBase)+(n>1?' (รูปที่ '+(i+1)+' จาก '+n+')':'');
      var lbl='เปิดรูปที่ '+(i+1)+' จาก '+n+' แบบเต็มจอ';
      if(i===0){
        // ภาพพื้นหลังเบลอ = รูปใบเดียวกันขยายเต็มกรอบ ใช้ถมแถบว่างข้างภาพแนวตั้ง · aria-hidden เพราะประดับล้วน
        return '<button type="button" class="ld-tile t0" data-open="0" aria-label="'+lbl+'">'+
          '<img class="ld-gal-bd" src="'+esc(src)+'" alt="" aria-hidden="true">'+
          '<img class="ld-tile-img" src="'+esc(src)+'" alt="'+alt+'" fetchpriority="high">'+
          '<span class="ld-wm"><span>ที่ดินชัวร์</span><small>njteedinsure.com</small></span>'+
        '</button>';
      }
      return '<button type="button" class="ld-tile" data-open="'+i+'" aria-label="'+lbl+'">'+
        '<img class="ld-tile-img" src="'+esc(thumbs[i]||src)+'"'+fullAttr(thumbs[i],src)+' alt="'+alt+'" loading="lazy" decoding="async">'+
      '</button>';
    }).join('');
    // ⚠️ ตัวนับกับปุ่ม "ดูทั้งหมด" ต้องอยู่นอกแถบที่เลื่อนได้ (.ld-strip) — ลูกที่ position:absolute
    //    ในกล่องที่ scroll ได้จะเลื่อนหายไปพร้อมรูปใบแรกตอนปัดนิ้วบนมือถือ
    return '<div class="ld-gal ld-mosaic n'+Math.min(n,5)+'" data-count="'+n+'"><div class="ld-strip">'+tiles+'</div>'+
      (n>1?'<span class="ld-gal-count" aria-hidden="true">1/'+n+'</span>':'')+
      '<button type="button" class="ld-gal-all" data-open="0">'+
        '<span aria-hidden="true">▦</span> '+(n>1?'ดูรูปทั้งหมด ('+n+')':'ดูรูปเต็มจอ')+'</button>'+
    '</div>';
  }

  // ตัวเลข "2/10" บนมือถือ — อัปเดตตามตำแหน่งที่ปัดนิ้วไป (แถบรูปเป็น scroll-snap แนวนอน)
  function initGallery(root){
    if(!root) return;
    var count=root.querySelector('.ld-gal-count');
    var strip=root.querySelector('.ld-strip');
    var n=Number(root.getAttribute('data-count'))||0;
    if(!count||!strip||n<2) return;
    var raf=0;
    strip.addEventListener('scroll', function(){
      if(raf) return;
      raf=requestAnimationFrame(function(){
        raf=0;
        var w=strip.clientWidth||1;
        var i=Math.min(n-1, Math.max(0, Math.round(strip.scrollLeft/w)));
        var t=(i+1)+'/'+n;
        if(count.textContent!==t) count.textContent=t;
      });
    }, {passive:true});
  }

  // ---------- ดูรูปเต็มจอ (lightbox) ----------
  // ใช้ <dialog> ของเบราว์เซอร์: กัก focus ในกล่อง + ปิดด้วย Esc ได้เอง (ไม่ต้องเขียนตัวกัก focus เอง)
  // ⚠️ เบราว์เซอร์เก่าที่ไม่มี showModal → เปิดแบบธรรมดา ยังดูรูป/ปิดได้ครบ
  // ⚠️ รูปใส่ผ่าน .src ไม่ใช่ innerHTML — ที่อยู่รูปจาก API จึงไม่มีทางหลุดไปเป็นโค้ด
  var lb=null;
  function openLightbox(photos, start, altBase){
    if(!photos.length) return;
    if(!lb){
      lb=document.createElement('dialog');
      lb.className='ld-lb';
      lb.setAttribute('aria-label','รูปภาพของแปลง');
      lb.innerHTML=
        '<div class="ld-lb-top"><span class="ld-lb-count" aria-live="polite"></span>'+
          '<button type="button" class="ld-lb-x" aria-label="ปิดหน้าดูรูป">✕</button></div>'+
        '<div class="ld-lb-stage">'+
          '<button type="button" class="ld-lb-nav prev" aria-label="รูปก่อนหน้า">‹</button>'+
          '<img class="ld-lb-img" alt="">'+
          '<button type="button" class="ld-lb-nav next" aria-label="รูปถัดไป">›</button>'+
          '<span class="ld-wm ld-lb-wm"><span>ที่ดินชัวร์</span><small>njteedinsure.com</small></span>'+
        '</div>'+
        '<div class="ld-lb-strip"></div>';
      document.body.appendChild(lb);
    }
    var img=lb.querySelector('.ld-lb-img'), cnt=lb.querySelector('.ld-lb-count'), strip=lb.querySelector('.ld-lb-strip');
    var idx=0, n=photos.length;
    strip.innerHTML='';
    photos.forEach(function(src,i){
      var b=document.createElement('button');
      b.type='button'; b.className='ld-lb-th'; b.setAttribute('aria-label','รูปที่ '+(i+1));
      var t=document.createElement('img'); t.alt=''; t.loading='lazy'; t.src=src;
      b.appendChild(t);
      b.addEventListener('click', function(){ show(i); });
      strip.appendChild(b);
    });
    lb.querySelector('.prev').hidden=lb.querySelector('.next').hidden=(n<2);
    strip.hidden=(n<2);
    function show(i){
      idx=(i+n)%n;
      img.src=photos[idx];
      img.alt=altBase+(n>1?' (รูปที่ '+(idx+1)+' จาก '+n+')':'');
      cnt.textContent=(idx+1)+' / '+n;
      [].forEach.call(strip.children, function(c,j){ c.classList.toggle('on', j===idx); if(j===idx&&c.scrollIntoView) c.scrollIntoView({block:'nearest',inline:'center'}); });
    }
    function close(){
      if(!lb.open) return;
      if(lb.close) lb.close();
      else { lb.removeAttribute('open'); lb.dispatchEvent(new Event('close')); }   // เบราว์เซอร์เก่าไม่ยิง close เอง
    }
    // ผูกตัวจัดการใหม่ทุกครั้งที่เปิด (รายการรูปผูกกับแปลงที่เปิดอยู่) แล้วถอดตอนปิด
    function onKey(e){
      if(e.key==='ArrowRight'){ show(idx+1); e.preventDefault(); }
      else if(e.key==='ArrowLeft'){ show(idx-1); e.preventDefault(); }
    }
    function onClick(e){
      if(e.target.closest('.ld-lb-x')) return close();
      if(e.target.closest('.ld-lb-nav.prev')) return show(idx-1);
      if(e.target.closest('.ld-lb-nav.next')) return show(idx+1);
      // แตะพื้นหลังว่าง (นอกรูป/ปุ่ม) = ปิด — พฤติกรรมที่คนคุ้นจากแอปรูปภาพ
      if(e.target===lb || e.target.classList.contains('ld-lb-stage')) return close();
      // รูปกางเต็มเวที (object-fit:contain) — แตะแถบว่างข้างรูปก็ต้องปิดได้เหมือนแตะพื้นหลัง
      if(e.target===img && img.naturalWidth){
        var r=img.getBoundingClientRect(), s=Math.min(r.width/img.naturalWidth, r.height/img.naturalHeight);
        var w=img.naturalWidth*s, h=img.naturalHeight*s;
        var px=e.clientX-r.left-(r.width-w)/2, py=e.clientY-r.top-(r.height-h)/2;
        if(px<0||py<0||px>w||py>h) close();
      }
    }
    var x0=null;
    function onTs(e){ x0=e.touches&&e.touches.length===1 ? e.touches[0].clientX : null; }
    function onTe(e){
      if(x0==null) return;
      var dx=(e.changedTouches[0].clientX)-x0; x0=null;
      if(Math.abs(dx)>45) show(idx+(dx<0?1:-1));
    }
    var stage=lb.querySelector('.ld-lb-stage');
    lb.addEventListener('keydown', onKey);
    lb.addEventListener('click', onClick);
    stage.addEventListener('touchstart', onTs, {passive:true});
    stage.addEventListener('touchend', onTe);
    lb.addEventListener('close', function done(){
      lb.removeEventListener('keydown', onKey);
      lb.removeEventListener('click', onClick);
      stage.removeEventListener('touchstart', onTs);
      stage.removeEventListener('touchend', onTe);
      lb.removeEventListener('close', done);
      document.documentElement.classList.remove('ld-lb-lock');
      if(lastFocus&&lastFocus.focus) lastFocus.focus();
    });
    var lastFocus=document.activeElement;
    document.documentElement.classList.add('ld-lb-lock');
    if(lb.showModal) lb.showModal(); else lb.setAttribute('open','');
    show(start||0);
    // ⚠️ ไม่ยิงสถิติ — ชื่อเหตุการณ์ใหม่ต้องขึ้นทะเบียนทั้ง analytics.js และ server.js ก่อน (กติกาข้อ 6)
    //    ยิงชื่อที่ไม่มีในทะเบียน = ถูกทิ้งเงียบๆ แล้วคนอ่านสถิติคิดว่าไม่มีใครเปิดดูรูป
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
  // ฟอร์มสนใจแปลง — อยู่ในแถบข้าง ใต้การ์ดติดต่อ (แบบกระชับ `brief` ของ njservices.js)
  // ⚠️ ประกาศขายเองชัวร์ (saleBy 'owner') ใช้ฟอร์มส่งถึงเจ้าของแทน — ต้องติ๊กยินยอมเสมอ (เปิดเผยข้อมูลให้บุคคลที่สาม)
  //    เซิร์ฟเวอร์เป็นคนตัดสินว่าส่งถึงเจ้าของได้จริงไหม (route ในคำตอบ) หน้านี้แค่ขอ
  function inquiryHtml(l){
    if(l.saleBy==='owner') return ownerFormHtml(l);
    if(!window.NJServices) return '';
    return '<section class="njsv ld-inq" id="ld-inq" aria-labelledby="ld-inq-h">'+
      '<h2 id="ld-inq-h">สนใจแปลงนี้ — ให้ทีมงานติดต่อกลับ</h2>'+
      '<p class="ld-inq-lede">แนบรหัสทรัพย์ <b>'+esc(l.id)+'</b> ให้อัตโนมัติแล้ว ทีมงานจะรู้ทันทีว่าคุณสนใจแปลงไหน</p>'+
      '<div id="ld-inq-form"></div>'+
    '</section>';
  }

  function ownerFormHtml(l){
    return '<section class="njsv ld-inq ld-own" id="ld-inq" aria-labelledby="ld-inq-h">'+
      '<h2 id="ld-inq-h">ติดต่อเจ้าของทรัพย์</h2>'+
      '<p class="ld-inq-lede">ประกาศ <b>ขายเองชัวร์</b> — เจ้าของขายเอง กรอกชื่อและเบอร์ ระบบจะส่งถึงเจ้าของให้ เจ้าของติดต่อกลับเอง · รหัสทรัพย์ <b>'+esc(l.id)+'</b></p>'+
      '<form class="njsv-form" id="ld-own-form" novalidate>'+
        '<label class="njsv-field"><span>ชื่อผู้ติดต่อ</span><input type="text" name="name" maxlength="80" autocomplete="name" placeholder="ระบุชื่อ"></label>'+
        '<label class="njsv-field"><span>เบอร์โทร</span><input type="tel" name="phone" maxlength="20" autocomplete="tel" inputmode="tel" placeholder="ระบุเบอร์โทร"></label>'+
        '<label class="njsv-field"><span>ข้อความถึงเจ้าของ <i>(ไม่บังคับ)</i></span><textarea name="note" rows="2" maxlength="500" placeholder="เช่น สะดวกดูที่วันเสาร์นี้ช่วงเช้า"></textarea></label>'+
        '<input type="text" name="website" class="njsv-hp" tabindex="-1" autocomplete="off" aria-hidden="true">'+
        '<label class="ld-own-ck"><input type="checkbox" name="pdpa"> <span>ยินยอมให้ส่งชื่อ เบอร์ และข้อความนี้ถึงเจ้าของทรัพย์ เพื่อติดต่อกลับเรื่องทรัพย์นี้เท่านั้น และให้บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด เก็บบันทึกการส่งไว้</span></label>'+
        '<div class="njsv-msg" data-own-msg role="alert" hidden></div>'+
        '<button type="submit" class="njsv-submit">ส่งถึงเจ้าของทรัพย์</button>'+
      '</form>'+
      '<p class="ld-own-note">ที่ดินชัวร์ไม่ได้เป็นตัวแทนการขายของประกาศนี้ · ดูผลการตรวจสอบแปลงในหัวข้อด้านล่าง · สอบถามเรื่องข้อมูลแปลงกับทีมงานทางไลน์ได้</p>'+
    '</section>';
  }
  function bindOwnerForm(l){
    var form=document.getElementById('ld-own-form'); if(!form) return;
    var msg=form.querySelector('[data-own-msg]'), btn=form.querySelector('button[type="submit"]'), sending=false;
    function v(n){ var el=form.elements[n]; return el?String(el.value||'').trim():''; }
    function say(kind,text){ msg.className='njsv-msg '+kind; msg.textContent=text; msg.hidden=false; }
    if(window.njTrackInternal) njTrackInternal('inquiry_view', l.id);
    form.addEventListener('submit', function(e){
      e.preventDefault(); if(sending) return;
      if(!v('name')){ say('bad','กรุณากรอกชื่อผู้ติดต่อ'); return; }
      if(v('phone').replace(/\D/g,'').length<9){ say('bad','กรุณากรอกเบอร์โทรให้ครบ'); return; }
      if(!form.elements.pdpa.checked){ say('bad','กรุณาติ๊กยินยอมให้ส่งข้อมูลถึงเจ้าของทรัพย์ก่อน'); return; }
      var body={ listingId:l.id, name:v('name'), phone:v('phone'), note:v('note'), website:v('website'),
        shareWithOwner:true, pdpa:true, ref:(window.NJAttrib&&NJAttrib.refText())||'land_owner' };
      if(window.NJAttrib) body.attrib=NJAttrib.value();
      sending=true; btn.disabled=true; say('wait','กำลังส่ง...');
      var base=window.NJ_API_BASE||'https://app.njteedinsure.com';
      fetch(base+'/api/public/inquiry',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
        .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ if(!r.ok) throw new Error(d.error||'ส่งไม่สำเร็จ'); return d; }); })
        .then(function(d){
          // เซิร์ฟเวอร์ตัดสินปลายทาง — route 'owner' = ส่งถึงเจ้าของ · อย่างอื่น = ทีมงานติดต่อกลับแทน (บอกตามจริง)
          var toOwner=d&&d.route==='owner';
          form.parentNode.innerHTML='<div class="njsv-done"><b>✓ '+(toOwner?'ส่งถึงเจ้าของทรัพย์แล้ว':'ส่งเรื่องให้ทีมงานแล้ว')+'</b>'+
            '<span>'+(toOwner?'เจ้าของจะติดต่อกลับเอง':'ทีมงานจะติดต่อกลับภายใน 1 วันทำการ')+' — รหัสทรัพย์ <b>'+esc(l.id)+'</b>'+(d&&d.id?' · เลขที่เรื่อง <b>'+esc(d.id)+'</b>':'')+'</span></div>';
        })
        .catch(function(err){ sending=false; btn.disabled=false; say('bad',err.message||'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง หรือทักไลน์'); });
    });
  }

  // ---------- การ์ดติดต่อในแถบข้าง (แบบการ์ดเอเจนต์ของเว็บตัวอย่าง) ----------
  // ⚠️ ผู้ติดต่อคือ "ทีมขายของบริษัท" ไม่ใช่ชื่อพนักงานรายคน — เว็บนี้ไม่มีนายหน้าอิสระ
  //    และห้ามใส่รูป/ชื่อคนที่ไม่ได้ยินยอม (กติกาข้อ 9) · โลโก้บริษัทใช้แทนรูปคน
  // ⚠️ ปุ่มติดต่อชุดนี้คือ `.ld-cta` ตัวเดิม (ย้ายมาจากกลางหน้า) — data-contact / ปุ่มดูเบอร์ไม่เปลี่ยน
  //    จึงนับสถิติที่เดิมทุกอย่าง ห้ามทำปุ่มชุดที่สองซ้ำในหน้า (ลีดจะถูกนับจากสองที่)
  // ป้าย "ตรวจโดยที่ดินชัวร์" (รูปแบบบริการ รอบ 3ค) — ตัวตัดสินอยู่ที่ NJListing.inspectedText ตัวเดียวกับการ์ด
  // ⚠️ ไม่มีผลตรวจจริง = ไม่มีป้าย · listingcard.js ยังไม่โหลด = ไม่มีป้าย (ไม่ใช่หน้าพัง)
  function inspectedLine(l){
    var t=(window.NJListing&&NJListing.inspectedText)?NJListing.inspectedText(l.inspected):'';
    return t?'<small class="ld-agent-ins">✓ ตรวจโดยที่ดินชัวร์ · '+esc(t)+'</small>':'';
  }
  function agentHtml(l){
    return '<div class="ld-agent">'+
      '<div class="ld-agent-h">'+
        '<img src="brand/logo-mark.svg" alt="" width="46" height="46">'+
        // ใครดูแลการขาย (saleBy จากระบบ) — ใบตามเงื่อนไขเดิม ('') หน้าตาเหมือนเดิมทุกตัวอักษร
        (l.saleBy==='owner'
          ? '<div><b>เจ้าของทรัพย์ขายเอง</b><small>ประกาศขายเองชัวร์ · ติดต่อเจ้าของผ่านฟอร์มด้านล่าง · ทีมที่ดินชัวร์ตอบเรื่องข้อมูลแปลงทางไลน์</small>'+inspectedLine(l)+'</div>'
          : '<div><b>ทีมขาย ที่ดินชัวร์</b><small>'+(l.saleBy==='nj'?'ฝากขายชัวร์ — ทีมที่ดินชัวร์ดูแลการขาย · ':'')+'บริษัท เอ็นเจ แอนด์ คอนซัลติ้ง จำกัด · สำนักงานช่างรังวัดเอกชน ใบอนุญาต 351</small>'+(l.saleBy?inspectedLine(l):'')+'</div>')+
      '</div>'+
      '<div class="ld-agent-b">'+
        '<div class="ld-agent-price"><span>'+(l.type==='rent'?'ค่าเช่า':'ราคาขาย')+'</span><b>'+money(l.estValue)+'</b></div>'+
        '<p class="ld-agent-code">รหัสทรัพย์ <b>'+esc(l.id)+'</b> · แจ้งรหัสนี้ทุกครั้งที่ติดต่อ</p>'+
        '<div class="ld-cta">'+
          '<a class="ld-btn line" href="'+LINE+'" target="_blank" rel="noopener" data-contact="line">💬 ทักไลน์สอบถาม</a>'+
          '<a class="ld-btn fb" href="'+FB+'" target="_blank" rel="noopener" data-contact="messenger">💬 เมสเซนเจอร์</a>'+
          // "คลิกดูเบอร์" — ซ่อนเบอร์ไว้จนกว่าจะกด แล้วค่อยกลายเป็นลิงก์โทรจริง
          // ⚠️ ปุ่มนี้ยิง phone_reveal **แทน** tel_click ไม่ใช่ยิงทั้งคู่ (ดู PUBLIC_EVENT_TYPES ใน server.js)
          // ยิงทั้งคู่เมื่อไหร่ = นับคนเดิมสองครั้ง แล้วตัวเลขลีดจะสูงกว่าความจริง
          '<button type="button" class="ld-btn tel" id="ld-tel" data-reveal="'+esc(l.id)+'">📞 คลิกดูเบอร์โทร</button>'+
        '</div>'+
        '<p class="ld-agent-hours">เวลาทำการ จ.–ส. 08:30–17:30 น.</p>'+
      '</div>'+
    '</div>';
  }

  // ---------- แชร์ไปโซเชียล ----------
  // ลิงก์ที่แชร์ = ที่อยู่ของหน้านี้แบบสะอาด (ตัด utm/fbclid ที่ติดมาจากโฆษณาทิ้ง)
  // ⚠️ นับเป็น share_property ตัวเดิม (ขึ้นทะเบียนแล้ว) ไม่ใช่ช่องทางติดต่อ — ไม่มี data-contact
  // ⚠️ ใช้ LINE เป็นปุ่มแรก — ช่องทางขายหลักของบริษัท (ของเว็บตัวอย่างมี LinkedIn ซึ่งลูกค้าเราไม่ได้ใช้)
  function shareUrlOf(l){
    var p=location.pathname;
    return location.origin+p+(/land\.html$/.test(p)?'?id='+encodeURIComponent(l.id):'');
  }
  function shareHtml(l){
    var u=encodeURIComponent(shareUrlOf(l)), t=encodeURIComponent(shortLabel(l)+' | ที่ดินชัวร์');
    var list=[
      ['line','LINE','https://social-plugins.line.me/lineit/share?url='+u],
      ['fb','Facebook','https://www.facebook.com/sharer/sharer.php?u='+u],
      ['x','X','https://twitter.com/intent/tweet?url='+u+'&text='+t]
    ];
    return '<div class="ld-share" role="group" aria-label="แชร์แปลงนี้">'+
      '<span class="ld-share-h">แชร์แปลงนี้</span>'+
      list.map(function(s){
        return '<a class="ld-share-b '+s[0]+'" href="'+esc(s[2])+'" target="_blank" rel="noopener noreferrer" data-share="'+s[0]+'">'+esc(s[1])+'</a>';
      }).join('')+
    '</div>';
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
  // ⚠️ หัวข้อ "ใน<จังหวัด>" ใช้ได้เฉพาะเมื่อ **ทุกแปลงที่แสดง** อยู่ในจังหวัดนั้นจริง
  //    จังหวัดเดียวกันมีไม่ถึง 3 แปลง = เติมด้วยแปลงจังหวัดอื่น → หัวข้อต้องไม่อ้างจังหวัด
  //    (เคยขึ้น "แปลงใกล้เคียง ในสระบุรี" ทั้งที่ 2 ใน 3 แปลงอยู่อยุธยาและสุพรรณบุรี — ผู้ซื้ออ่านเป็นข้อเท็จจริง)
  function relatedTitle(prov,shown){
    var allIn=!!prov && shown.length>0 && shown.every(function(x){ return (x.land||{}).province===prov; });
    return allIn ? 'แปลงใกล้เคียง ใน'+prov : 'แปลงอื่นที่น่าสนใจ';
  }
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
          '<h2 id="ld-rel-h">'+esc(relatedTitle(prov,similar))+'</h2>'+
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
    var thumbs=l.thumbs||[];
    var alt=l.parcelInfo||'แปลงที่ดิน';
    var PT=vocab().PROPERTY_TH||{};
    var kind=(L.propertyType&&PT[L.propertyType]) ? PT[L.propertyType] : (l.specs&&l.specs.typeTh)||'';
    // ป้ายระดับข้อมูล — ⚠️ ระดับ 1 ห้ามขึ้น "ตรวจสอบโดย NJ" เด็ดขาด (กติกาข้อ 10) · คำบนป้ายเจ้าของกิจการเลือก 28 ก.ย. 69
    var badge = tier===2
      ? '<span class="ld-badge ok">✓ ตรวจสอบโดย NJ</span>'
      : '<span class="ld-badge basic">◐ ข้อมูลเบื้องต้น</span>';
    var pw=perWaText(l)||perSqmText(l);

    // ---------- โครงหน้า (แบบใหม่ 2026-09-27 · ตามเว็บอสังหาฯ ที่เจ้าของส่งมา แล้วปรับให้เข้ากติกาของเรา) ----------
    //   แกลเลอรีโมเสกเต็มความกว้าง
    //   ↓
    //   [หัวประกาศ: ป้าย · ราคา · ชื่อ · ที่ตั้ง · ตัวเลขสำคัญ · รหัสทรัพย์]   [แถบข้าง: การ์ดติดต่อ + ฟอร์ม (ติดหนึบ)]
    //   [หัวข้อพับได้: ค่าโอน · โครงสร้าง · รายละเอียด · สาธารณูปโภค · ผลตรวจ · ทำเล · รูปทั้งหมด]
    //   ↓
    //   แปลงใกล้เคียง (เต็มความกว้าง)
    // ⚠️ มือถือเรียงเป็นคอลัมน์เดียว: หัวประกาศ → หัวข้อ → แถบข้าง (ปุ่มติดต่อใช้แถบติดหนึบล่างจอแทน)
    // ⚠️ ราคายังอยู่บนสุดของเนื้อหา และเครื่องคำนวณค่าโอนเป็นหัวข้อแรก (คำสั่งเจ้าของ 2026-08-30)
    document.getElementById('ld-root').innerHTML=
      breadcrumbHtml(l)+
      galleryHtml(photos, thumbs, alt)+
      '<div class="ld-layout">'+
        '<div class="ld-head">'+
          '<div class="ld-chips"><span class="ld-badge type">'+(l.type==='rent'?'ให้เช่า':'ขาย')+'</span>'+
            (kind?'<span class="ld-badge kind">'+esc(kind)+'</span>':'')+badge+'</div>'+
          '<div class="ld-price">'+money(l.estValue)+(pw?'<small>'+esc(pw)+'</small>':'')+'</div>'+
          (l.estValue?'<a class="ld-vlink" href="guides.html#valuation">ราคานี้คำนวณอย่างไร →</a>':'')+
          // ⚠️ **H1 ต้องเป็นชื่อสั้น ไม่ใช่รายละเอียดทั้งย่อหน้า** (งานที่ 8)
          // ของเดิมใช้ `parcelInfo` ทั้งก้อน ซึ่งคือ "ที่ตั้ง · ข้อความที่เจ้าของพิมพ์ · เนื้อที่"
          // ต่อกัน · เจอจริงยาว 200+ ตัวอักษร อ่านบนผลค้นหาไม่รู้เรื่องและกินพื้นที่ครึ่งจอมือถือ
          // ข้อความเต็มไม่ได้หายไปไหน — ย้ายลงไปเป็นหัวข้อ "รายละเอียดทรัพย์" แทน
          '<h1 class="ld-title">'+esc(shortLabel(l))+'</h1>'+
          (L.locality?'<div class="ld-loc">📍 '+esc(L.locality)+'</div>':'')+
          statsHtml(l,L,tier)+
          codeHtml(l)+
        '</div>'+
        '<aside class="ld-aside" aria-label="ติดต่อเรื่องแปลงนี้"><div class="ld-aside-in">'+
          agentHtml(l)+
          inquiryHtml(l)+
        '</div></aside>'+
        '<div class="ld-content">'+
          secHtml('ld-s-fee','ประมาณการค่าใช้จ่ายวันโอน','<div id="ld-fee"></div>')+
          secHtml('ld-s-spec','โครงสร้างและขนาดพื้นที่', specGridHtml(l,L,tier))+
          // รายละเอียดเต็ม — ย้ายมาจาก H1 (งานที่ 8) · ขึ้นเฉพาะเมื่อมีข้อความที่ต่างจากชื่อสั้น
          secHtml('ld-s-desc','รายละเอียดทรัพย์',
            (l.parcelInfo&&l.parcelInfo!==shortLabel(l)
              ? '<div class="ld-desc"><p>'+esc(l.parcelInfo)+'</p></div>' : '')+
            (l.blurb?'<p class="ld-blurb">'+esc(l.blurb)+'</p>':''))+
          secHtml('ld-s-feat','สาธารณูปโภคและจุดเด่นของแปลง', featuresHtml(l,L))+
          secHtml('ld-s-check','ผลการตรวจสอบแปลง',
            (tier===2?tier2Html(L):tier1Html(L))+
            // ---- ระลอก Teedin Sure Verified (2026-09-09) ----
            // ⚠️ ทั้งหมดคืนสตริงว่างเมื่อ API ไม่ได้ส่งข้อมูลมา → แปลงเก่าหน้าตาเหมือนเดิมเป๊ะ
            // ห้ามเปลี่ยนเป็นวาดกล่องว่างพร้อมข้อความ "ยังไม่มีข้อมูล" (กติกาข้อ 5)
            (window.NJVerified?NJVerified.ladderHtml(L.verify):'')+
            (window.NJHealth?NJHealth.tableHtml(L):'')+
            // ⚠️ `l.score` / `l.purposes` อยู่ระดับบนสุดของประกาศ **ไม่ได้อยู่ใน l.land**
            (window.NJScore?NJScore.panelHtml(l.score):'')+
            (window.NJPurpose?NJPurpose.panelHtml(l.purposes):'')+
            (window.NJParcelMap?NJParcelMap.mapHtml(L.plot):''))+
          secHtml('ld-s-condo','ผลตรวจเฉพาะห้องชุด', condoChecksHtml(l))+
          secHtml('ld-s-loc','ทำเลที่ตั้ง', mapHtml(L)+nearbyHtml(L))+
          (photos.length>1 ? secHtml('ld-s-photos','รูปภาพทั้งหมด ('+photos.length+')',
            '<div class="ld-pgrid">'+photos.map(function(src,i){
              return '<button type="button" class="ld-pgrid-i" data-open="'+i+'" aria-label="เปิดรูปที่ '+(i+1)+' แบบเต็มจอ">'+
                '<img src="'+esc(thumbs[i]||src)+'"'+fullAttr(thumbs[i],src)+' alt="" loading="lazy" decoding="async"></button>';
            }).join('')+'</div>') : '')+
          // ทางเข้าหน้านัดตรวจแปลง (Phase 2) — วางแยกจากปุ่มติดต่อโดยตั้งใจ
          // ⚠️ ไม่ใส่ data-contact และไม่ยิงสถิติติดต่อ — คนกดยังไม่ได้ติดต่อใคร เขาไปกรอกฟอร์มต่อ
          //    ซึ่งเซิร์ฟเวอร์นับเป็น inspect_submit ให้เองตอนสร้างใบ (นับที่เดียว · กติกาข้อ 6)
          '<div class="ld-next">'+
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
          '</div>'+
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
          shareHtml(l)+
          '<button type="button" class="ld-btn ghost ld-pdf-btn" id="ld-pdf-btn">📄 ดาวน์โหลด PDF ประกาศนี้</button>'+
        '</div>'+
      '</div>'+
      '<div id="ld-related"></div>'+
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

    var root=document.getElementById('ld-root');
    if(window.NJListing && NJListing.imgFallback) NJListing.imgFallback(root);
    initGallery(root.querySelector('.ld-gal'));
    // แตะรูปไหนก็ได้ (โมเสก · ปุ่มดูทั้งหมด · ตารางรูปทั้งหมด) = เปิดเต็มจอที่ใบนั้น — ต้นฉบับเสมอ ไม่ใช่ไฟล์ย่อ
    root.addEventListener('click', function(e){
      var t=e.target.closest('[data-open]');
      if(!t||!root.contains(t)) return;
      openLightbox(photos, Number(t.getAttribute('data-open'))||0, alt);
    });
    // ⚠️ สั่งพิมพ์/บันทึก PDF ต้องกางทุกหัวข้อก่อน — หัวข้อที่ผู้ใช้พับไว้จะหายจากกระดาษทั้งหัวข้อ
    window.addEventListener('beforeprint', function(){
      [].forEach.call(root.querySelectorAll('details.ld-sec'), function(d){ d.open=true; });
    });
    // ปุ่มแชร์ไปโซเชียล — นับเป็น share_property ตัวเดิม (ไม่ใช่ลีด · ไม่ใช่ช่องทางติดต่อ)
    root.addEventListener('click', function(e){
      var s=e.target.closest('[data-share]');
      if(s&&window.njTrackInternal) njTrackInternal('share_property', l.id);
    });
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
    if(l.saleBy==='owner') bindOwnerForm(l);
    var inqHost=document.getElementById('ld-inq-form');
    if(inqHost&&window.NJServices){
      NJServices.mount(inqHost,{ listingId:l.id, ref:'land_detail', province:(l.land||{}).province||'', brief:true });
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
    // แล้วค่อยคัดเอาแปลงเดียวที่ต้องการ · พอบันไดการตรวจสอบ รายงานสุขภาพ และรูปแปลง
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
