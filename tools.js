// หน้า "เครื่องมือคำนวณ" (tools.html) — ประกอบ NJLoanCalc กับ NJFeeCalc ที่มีอยู่แล้ว
// ⚠️ ไม่มีสูตรในไฟล์นี้ · ค่าโอนใช้ feecalc.js ตัวเดิมทั้งหมด (กติกาข้อ 12–13 ของ CLAUDE.md)
// ⚠️ กล่องค่าโอนใช้ id `tl-fee` ไม่ใช่ `fee-calc` — `bootPage()` ใน feecalc.js จะซ่อนกล่อง #fee-calc
//    ไว้รอปุ่มกางของหน้าแรก ซึ่งหน้านี้ไม่มี
// ⚠️ ส่งต่อได้แค่ "ราคาซื้อขาย" · ห้ามเติมราคาประเมินให้ (กติกาข้อ 12)

(function () {
  'use strict';
  var feeEl = document.getElementById('tl-fee');
  NJFeeCalc.mount(feeEl, {});   // mount ครั้งเดียว — mount ซ้ำตัวเลขที่ผู้ใช้กรอกไว้จะหายหมด

  NJLoanCalc.mount(document.getElementById('tl-loan'), {
    onFee: function (v) {
      var sale = feeEl.querySelector('[data-fc="salePrice"]');
      if (sale && v.price > 0) {
        sale.value = Math.round(v.price).toLocaleString('en-US');
        sale.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // ประเภททรัพย์: ที่ดินเปล่าตรงกันพอดี · บ้านมีหลายแบบในเครื่องคำนวณค่าโอน ให้ผู้ใช้เลือกเอง
      var type = feeEl.querySelector('[data-fc="propertyType"]');
      if (type && v.type === 'land' && type.value !== 'land') {
        type.value = 'land';
        type.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.getElementById('fee').scrollIntoView({ behavior: 'smooth', block: 'start' });
      var appraisal = feeEl.querySelector('[data-fc="landAppraisal"]');
      if (appraisal) appraisal.focus({ preventScroll: true });
    }
  });

  document.getElementById('year').textContent = new Date().getFullYear() + 543;   // ปี พ.ศ.
  njTrack('ViewContent', { content_name: 'tools_page' });
})();
