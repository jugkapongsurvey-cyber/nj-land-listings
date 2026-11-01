/* หน้า "เกี่ยวกับเรา" — ช่องตัวเลขที่สาม (about.html #ab-count)
 *
 * กติกาเดียวกับช่องเดียวกันบนหน้าแรก (paintStat() ใน marketplace.js):
 * ยังไม่มีตัวเลข "แปลงที่รังวัดแล้ว" ที่ตรวจสอบได้ จึงนับ "แปลงที่เปิดประกาศอยู่" สดจาก API
 * ได้ตัวเลขจริงจากเจ้าของเมื่อไหร่ ใส่ `surveyedParcels` ใน config.js แล้วช่องนี้สลับให้เอง
 * ⚠️ ห้ามเดาตัวเลขลงไปตรงๆ · โหลดไม่สำเร็จ = คงขีด "—" ไว้ (ไม่ใช่ 0 ซึ่งอ่านว่าไม่มีแปลงเลย)
 */
(function(){
  'use strict';
  function paint(n){
    var el=document.getElementById('ab-count');
    if(!el)return;
    var cfg=window.NJ_CONFIG||{};
    var surveyed=Number(cfg.surveyedParcels);
    var label=document.getElementById('ab-count-label');
    var txt=surveyed>0 ? surveyed.toLocaleString('th-TH') : Number(n||0).toLocaleString('th-TH');
    if(el.textContent!==txt) el.textContent=txt;   // เทียบก่อนเขียนเสมอ (กับดัก MutationObserver)
    if(label&&surveyed>0&&label.textContent!=='แปลงที่รังวัดแล้ว') label.textContent='แปลงที่รังวัดแล้ว';
  }
  function boot(){
    var cfg=window.NJ_CONFIG||{};
    if(Number(cfg.surveyedParcels)>0){ paint(0); return; }
    var NJL=window.NJListing;
    if(!NJL||typeof NJL.fetchListings!=='function')return;
    NJL.fetchListings().then(function(list){ paint((list||[]).length); }).catch(function(){});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
