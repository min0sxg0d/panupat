// /public/js/productorder-create.js
document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const productSelect = $('product_select');
  const productCode   = $('product_code');     // ต้องแสดง product_id
  const orderQty      = $('order_quantity');
  const orderLot      = $('order_lot');        // ให้ผู้ใช้กรอก 11 ตัว ระบบแสดงเป็น YYYY-#####-NN
  const orderDate     = $('order_date');
  const orderExp      = $('order_exp');
  const form          = $('proorderForm');

  // -------------------------------------------------------------
  // ✅ Bootstrap Alert + Confirm Modal
  // -------------------------------------------------------------
  function showAlert(type, msg, opts = {}) {
    const { autoHideMs = 3000 } = opts;
    let host = document.getElementById('alertBox');
    if (!host) {
      host = document.createElement('div');
      host.id = 'alertBox';
      document.body.appendChild(host);
    }
    host.style.position = 'fixed';
    host.style.top = '1rem';
    host.style.right = '1rem';
    host.style.zIndex = '1080';
    host.style.maxWidth = '520px';

    const el = document.createElement('div');
    el.className = `alert alert-${type} alert-dismissible fade show shadow-sm mb-2`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <div>${String(msg)}</div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    host.appendChild(el);
    if (autoHideMs > 0) {
      setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 200);
      }, autoHideMs);
    }
  }

  async function bsConfirm({
    title = 'ยืนยันการทำรายการ',
    message = '',
    okText = 'ตกลง',
    cancelText = 'ยกเลิก',
    okVariant = 'primary'
  } = {}) {
    if (!(window.bootstrap && bootstrap.Modal)) return window.confirm(message);
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="modal fade" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body"><p class="mb-0">${message}</p></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-light" data-bs-dismiss="modal">${cancelText}</button>
              <button type="button" class="btn btn-${okVariant}" data-role="ok">${okText}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    const modalEl = wrap.firstElementChild;
    document.body.appendChild(modalEl);
    const modal = new bootstrap.Modal(modalEl);
    return await new Promise((resolve) => {
      modalEl.querySelector('[data-role="ok"]').addEventListener('click', () => {
        resolve(true);
        modal.hide();
      });
      modalEl.addEventListener('hidden.bs.modal', () => {
        modalEl.remove();
        resolve(false);
      }, { once: true });
      modal.show();
    });
  }

  // -------------------------------------------------------------
  // LOT mask: แสดง YYYY-#####-NN แต่เก็บเลขล้วน 11 หลัก
  // -------------------------------------------------------------
  const LOT_DIGITS_MAX = 11; // 4 + 5 + 2
  if (orderLot) {
    if (!orderLot.placeholder) orderLot.placeholder = '2025-12345-01';
    orderLot.maxLength = 13; // รวมขีด 2 ตัว
    orderLot.title = 'พิมพ์รหัสล็อต 11 หลัก (ปี4 + รหัสผลิตภัณฑ์5 + ล็อต2) ระบบจะแสดงขีดให้เอง';
  }

  function onlyDigits(s) {
    return String(s ?? '').replace(/\D/g, '');
  }
  function toLotView(digits) {
    const d = onlyDigits(digits).slice(0, LOT_DIGITS_MAX);
    if (d.length <= 4) return d;
    if (d.length <= 9) return `${d.slice(0,4)}-${d.slice(4)}`;
    return `${d.slice(0,4)}-${d.slice(4,9)}-${d.slice(9,11)}`;
  }
  orderLot?.addEventListener('input', () => orderLot.value = toLotView(orderLot.value));
  orderLot?.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text') || '';
    orderLot.value = toLotView(text);
  });
  orderLot?.addEventListener('blur', () => {
    orderLot.value = toLotView(orderLot.value);
  });

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (m) =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m])
    );
  }
  function normalizeProducts(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    if (payload && Array.isArray(payload.data))  return payload.data;
    return [];
  }
  const getPid   = (p) => p?.product_id ?? p?.id ?? p?.productId ?? null;
  const getPname = (p) => p?.product_name ?? p?.name ?? `#${getPid(p) ?? ''}`;

  // -------------------------------------------------------------
  // 📅 ฟังก์ชันคำนวณวันหมดอายุ = วันผลิต + 2 ปี - 1 วัน
  // -------------------------------------------------------------
  function fmtDateYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function calcExpiryFromOrder(dateStr) {
    if (!dateStr) return '';
    const base = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(base.getTime())) return '';
    const exp = new Date(base);
    exp.setFullYear(exp.getFullYear() + 2); // +2 ปี
    exp.setDate(exp.getDate() - 1);         // -1 วัน
    return fmtDateYMD(exp);
  }

  // -------------------------------------------------------------
  // โหลดรายการสินค้า
  // -------------------------------------------------------------
  async function loadProducts() {
    try {
      const res = await fetch('/product/options-ready-all', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`options-ready-all HTTP ${res.status}`);
      const raw  = await res.json();
      const list = normalizeProducts(raw);

      if (!list.length) {
        productSelect.innerHTML = '<option value="">— ไม่มีสินค้า —</option>';
        return;
      }

      const items = list.map((p) => ({ id: getPid(p), name: getPname(p) })).filter(x => x.id != null);

      productSelect.innerHTML =
        '<option value="">— เลือกผลิตภัณฑ์ —</option>' +
        items.map((p) =>
          `<option value="${escapeHtml(String(p.id))}" data-code="${escapeHtml(String(p.id))}">
             ${escapeHtml(p.name)}
           </option>`
        ).join('');

      // sync ช่อง product_code หากมีค่าเลือกไว้
      const opt = productSelect.selectedOptions[0];
      if (opt) productCode.value = opt.getAttribute('data-code') || opt.value || '';
    } catch (e) {
      console.error('โหลดสินค้าไม่สำเร็จ:', e);
      productSelect.innerHTML = '<option value="">— โหลดสินค้าไม่สำเร็จ —</option>';
    }
  }

  // เมื่อเลือกสินค้า → ให้ช่อง product_code แสดง product_id
  productSelect?.addEventListener('change', () => {
    const opt = productSelect.selectedOptions[0];
    productCode.value = opt ? (opt.getAttribute('data-code') || opt.value || '') : '';
  });

  // เมื่อเปลี่ยนวันสั่ง → auto คำนวณวันหมดอายุ (+2 ปี -1 วัน)
  orderDate?.addEventListener('change', () => {
    const exp = calcExpiryFromOrder(orderDate.value);
    if (exp) orderExp.value = exp;
  });

  // -------------------------------------------------------------
  // Validate & Submit
  // -------------------------------------------------------------
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!productSelect?.value) { showAlert('warning', 'กรุณาเลือกผลิตภัณฑ์'); productSelect?.focus(); return; }
    if (!orderQty?.value)      { showAlert('warning', 'กรุณากรอกจำนวนสั่ง'); orderQty?.focus(); return; }
    if (!orderDate?.value)     { showAlert('warning', 'กรุณาเลือกวันที่สั่ง'); orderDate?.focus(); return; }

    const qty = Number(orderQty.value);
    if (!Number.isFinite(qty) || qty <= 0) {
      showAlert('warning', 'จำนวนสั่งต้องเป็นตัวเลขมากกว่า 0');
      orderQty.focus();
      return;
    }

    const lotView = (orderLot?.value || '').trim();
    const lotDigits = onlyDigits(lotView);
    if (lotDigits.length !== LOT_DIGITS_MAX) {
      showAlert('warning', 'รหัสล็อตต้องมีเลขรวม 11 หลัก (เช่น 2025-12345-01 หรือ 20251234501)');
      orderLot?.focus();
      return;
    }

    const ok = await bsConfirm({
      title: 'ยืนยันสร้างคำสั่งผลิต',
      message: `สินค้า: <b>${productSelect.selectedOptions[0]?.text || '-'}</b><br>
                จำนวน: <b>${qty}</b><br>
                LOT: <b>${toLotView(lotDigits)}</b>`,
      okText: 'บันทึก',
      okVariant: 'success'
    });
    if (!ok) return;

    const payload = {
      product_id: Number(productSelect.value),
      order_quantity: qty,
      order_lot: lotDigits,               // เก็บเลขล้วน
      order_date: orderDate.value || null,
      order_exp: orderExp?.value || null,
      PH: null, color: null, smell: null, amount: null, price: null
    };

    try {
      const res = await fetch('/productorder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => 'บันทึกไม่สำเร็จ');
        throw new Error(errText);
      }
      const out = await res.json().catch(() => ({}));
      showAlert('success', 'บันทึกสำเร็จ #' + (out?.id ?? ''));
      setTimeout(() => { location.href = '/productorder/index.html'; }, 600);
    } catch (err) {
      console.error('บันทึก error:', err);
      showAlert('danger', 'บันทึกไม่สำเร็จ: ' + (err?.message || ''));
    }
  });

  // -------------------------------------------------------------
  // ตั้งค่าเริ่มต้น
  // -------------------------------------------------------------
  if (orderDate && !orderDate.value) {
    const today = new Date();
    orderDate.value = fmtDateYMD(today);
  }
  if (orderExp) {
    const exp = calcExpiryFromOrder(orderDate.value);
    if (exp) orderExp.value = exp;
  }

  loadProducts();
});
