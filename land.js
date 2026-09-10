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
  function localityOf(l){
    var d=(l&&l.land)||{};
    var p=[];
    if(d.tambon)   p.push('ต.'+d.tambon);
    if(d.amphoe)   p.push('อ.'+d.amphoe);
    if(d.province) p.push('จ.'+d.province);
    return p.join(' ');
  }
  function shortLabel(l){
    var head=(l&&l.type==='rent')?'ให้เช่าที่ดิน':'ขายที่ดิน';
    var loc=localityOf(l);
    if(!loc){
      // ไม่มีช่องแยก — ใช้ท่อนแรกของ parcelInfo (ท่อนที่ตั้ง) แล้วตัดความยาว
      var first=String((l&&l.parcelInfo)||'').split(' · ')[0].trim();
      loc=first.length>60?first.slice(0,60).trim()+'…':first;
    }
    var area=(l&&l.land&&l.land.deedArea)?String(l.land.deedArea).trim():'';
    // ข้อมูลเก่าบางแปลงเก็บเนื้อที่เป็น "14-3-48" เฉยๆ ไม่มีหน่วย — เติมให้อ่านออกในผลค้นหา
    // เติมเฉพาะรูปแบบ ไร่-งาน-วา ที่ชัดเจนเท่านั้น ข้อความอื่นปล่อยไว้ตามที่ทีมกรอก
    if(/^\d+-\d+-\d+(\.\d+)?$/.test(area)) area+=' ไร่';
    return [head, loc, area].filter(Boolean).join(' · ');
  }
  function setSeo(l, photos){
    try{
      var url=SITE_URL+'/land.html?id='+encodeURIComponent(l.id);
      var link=document.querySelector('link[rel="canonical"]');
      if(!link){ link=document.createElement('link'); link.rel='canonical'; document.head.appendChild(link); }
      link.href=url;

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
  function inquiryHtml(){
    if(!window.NJServices) return '';
    return '<section class="njsv ld-inq" id="ld-inq" aria-labelledby="ld-inq-h">'+
      '<h2 id="ld-inq-h">สนใจแปลงนี้ — ให้ทีมงานติดต่อกลับ</h2>'+
      '<p class="ld-inq-lede">ระบบแนบรหัสทรัพย์ให้อัตโนมัติแล้ว ทีมงานจะรู้ทันทีว่าคุณสนใจแปลงไหน '+
        'และถ้าซื้อแล้วอยากให้ดูแลเรื่องโอน ขออนุญาตก่อสร้าง หรือหาผู้รับเหมาต่อ ติ๊กบอกไว้ได้เลย</p>'+
      '<div id="ld-inq-form"></div>'+
    '</section>';
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
        inquiryHtml()+
        '<button type="button" class="ld-btn ghost ld-pdf-btn" id="ld-pdf-btn">📄 ดาวน์โหลด PDF ประกาศนี้</button>'+
      '</div>';

    // เครื่องคำนวณค่าโอน — เติมให้แค่ "ราคาซื้อขาย" ซึ่งเป็นตัวเลขที่ประกาศอยู่แล้ว
    // ⚠️ ห้ามเติมราคาประเมินราชการให้ (ดูเหตุผลใน feecalc.js) — ผู้ซื้อต้องกรอกเอง
    if(window.NJFeeCalc) NJFeeCalc.mount(document.getElementById('ld-fee'),{salePrice:l.estValue});

    initGallery(document.querySelector('.ld-gal'), photos.length);
    // ปุ่มหมุดบนแผนที่แนวเขต — ต้องต่อหลังวาด HTML เสร็จ (ผูก listener ที่กล่อง ไม่ผูกรายปุ่ม)
    if(window.NJParcelMap&&L.plot) NJParcelMap.init(document.getElementById('ld-root'), L.plot);
    var pdfBtn=document.getElementById('ld-pdf-btn');
    if(pdfBtn) pdfBtn.addEventListener('click', function(){ window.print(); });

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

    document.title=shortLabel(l)+' | ที่ดินชัวร์';
    setSeo(l, photos);
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
