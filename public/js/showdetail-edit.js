// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const getParam = (k, d=null) => new URLSearchParams(location.search).get(k) ?? d;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const toNum = (v, d=0) => {
  if (typeof v === "string") v = v.replace(/,/g,"");
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const fmtInt   = (n) => Number(toNum(n)).toLocaleString();
const fmtMoney = (n) => Number(toNum(n)).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2});
const fmtDate  = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

// ---------- Endpoints ----------
const API_DETAIL = (id) => `/showdetail/${encodeURIComponent(id)}`;
const API_MATS = (id) => `/showdetail/materials?id=${encodeURIComponent(id)}`;

// ✅ ใส่เส้นทางที่ตรงกับ router ปัจจุบันไว้เป็นตัวเลือกแรก
const API_UPDATE_CANDIDATES = (id) => [
  `/showdetail/productorder/${encodeURIComponent(id)}`, // <-- สำคัญ
  `/productorder/${encodeURIComponent(id)}`,
  `/api/productorder/${encodeURIComponent(id)}`,
  `/productorder/update/${encodeURIComponent(id)}`,
  `/api/productorder/update/${encodeURIComponent(id)}`
];

// ---------- Modals ----------
function ensureAlertModal(){
  let m = document.getElementById("alertModal");
  if (!m){
    m = document.createElement("div");
    m.className = "modal fade";
    m.id = "alertModal";
    m.tabIndex = -1;
    m.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-3 shadow">
          <div class="modal-header">
            <h5 class="modal-title">แจ้งเตือน</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="alertModalBody"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="alertModalOk" data-bs-dismiss="modal">ตกลง</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);
  }
  return m;
}
function showModalAlert(title, html, variant="primary"){
  const m = ensureAlertModal();
  m.querySelector(".modal-title").textContent = title;
  m.querySelector("#alertModalBody").innerHTML = html;
  const okBtn = m.querySelector("#alertModalOk");
  okBtn.className = "btn";
  okBtn.classList.add(
    variant === "success" ? "btn-success" :
    variant === "danger"  ? "btn-danger"  :
    variant === "warning" ? "btn-warning" : "btn-primary"
  );
  const bs = new bootstrap.Modal(m);
  bs.show();
  return new Promise(resolve=>{
    const handler = ()=>{ okBtn.removeEventListener("click", handler); resolve(true); };
    okBtn.addEventListener("click", handler);
  });
}

function ensureConfirmModal(){
  let m = document.getElementById("confirmModal");
  if (!m){
    m = document.createElement("div");
    m.className = "modal fade";
    m.id = "confirmModal";
    m.tabIndex = -1;
    m.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content rounded-3 shadow">
          <div class="modal-header">
            <h5 class="modal-title">ยืนยันการทำรายการ</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="confirmModalBody"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirmCancel" data-bs-dismiss="modal">ยกเลิก</button>
            <button type="button" class="btn btn-success" id="confirmOk">ยืนยัน</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);
  }
  return m;
}
function showModalConfirm(title, html){
  const m = ensureConfirmModal();
  m.querySelector(".modal-title").textContent = title;
  m.querySelector("#confirmModalBody").innerHTML = html;
  const okBtn = m.querySelector("#confirmOk");
  const cancelBtn = m.querySelector("#confirmCancel");
  const bs = new bootstrap.Modal(m);
  bs.show();
  return new Promise(resolve=>{
    const onOk = ()=>{ cleanup(); resolve(true); };
    const onCancel = ()=>{ cleanup(); resolve(false); };
    const onHidden = ()=>{ cleanup(); resolve(false); };
    const cleanup = ()=>{
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      m.removeEventListener("hidden.bs.modal", onHidden);
    };
    okBtn.addEventListener("click", ()=>{ bs.hide(); onOk(); });
    cancelBtn.addEventListener("click", onCancel);
    m.addEventListener("hidden.bs.modal", onHidden);
  });
}

function showAlert(type, msg){
  if (window.bootstrap?.Modal){
    const map = { success:"success", danger:"danger", warning:"warning", info:"primary", primary:"primary" };
    return void showModalAlert(
      type==="success"?"สำเร็จ":type==="danger"?"ผิดพลาด":type==="warning"?"คำเตือน":"แจ้งเตือน",
      esc(msg),
      map[type] || "primary"
    );
  }
  const el = $("#alertBox");
  if (!el) return alert(msg);
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove("d-none");
}

// ---------- Load detail & materials ----------
async function loadDetail() {
  const id = getParam("id");
  if (!id) {
    $("#tbody-mats").innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">ไม่พบพารามิเตอร์ id</td></tr>`;
    return;
  }

  let detail;
  try {
    const r = await fetch(API_DETAIL(id), { headers: { "Accept":"application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    detail = await r.json();
  } catch (e) {
    console.error("load detail error:", e);
    showAlert("danger", "โหลดข้อมูลรายละเอียดไม่สำเร็จ");
    return;
  }

  $("#product_name").value   = detail.product_name ?? "-";
  $("#product_code").value   = detail.product_code ?? detail.product_id ?? "-";
  $("#order_quantity").value = fmtInt(detail.order_quantity ?? 0);
  $("#order_lot").value      = detail.order_lot ?? "";
  $("#order_date").value     = detail.order_date ?? "";
  $("#order_exp").value      = detail.order_exp ?? "";
  $("#price").value          = fmtMoney(detail.price ?? 0);

  $("#ph").value     = detail.PH ?? detail.ph ?? "";
  $("#color").value  = (detail.color ?? "") === "" ? "" : String(detail.color);
  $("#smell").value  = (detail.smell ?? "") === "" ? "" : String(detail.smell);
  $("#amount").value = (detail.amount ?? "") === "" ? "" : String(detail.amount);

  await loadMaterials(id);
}

async function loadMaterials(id) {
  const tbody = $("#tbody-mats");
  const sumEl = $("#matsSummary");
  try {
    const r = await fetch(API_MATS(id), { headers: { "Accept":"application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = await r.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">ไม่พบรายการ</td></tr>`;
      if (sumEl) sumEl.textContent = "";
      return;
    }

    let total = 0;
    const html = rows.map((x, i) => {
      const name = x.chem_name ?? x.material_name ?? x.name ?? `รายการที่ ${i+1}`;
      const use  = Number(x.use_quantity || 0);
      const ppu  = Number(x.unit_price || 0);
      const sum  = Number(x.sum_price || (use * ppu));
      total += sum;
      return `
        <tr>
          <td>${esc(name)}</td>
          <td class="text-end">${use.toLocaleString()}</td>
          <td class="text-end">${ppu.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
          <td class="text-end">${sum.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        </tr>`;
    }).join("");

    tbody.innerHTML = html;
    if (sumEl) sumEl.textContent = `รวมทั้งสิ้น: ${total.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2})} บาท`;
  } catch (e) {
    console.warn("materials error:", e);
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">โหลดวัตถุดิบล้มเหลว</td></tr>`;
    if (sumEl) sumEl.textContent = "";
  }
}

// ---------- Save (PUT) ----------
async function updateOrder(id, payload){
  let lastErr;
  for (const url of API_UPDATE_CANDIDATES(id)) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("all endpoints failed");
}

// ---------- Events ----------
document.addEventListener("DOMContentLoaded", () => {
  const id = getParam("id");
  if (!id) {
    showAlert("danger", "ไม่พบ id");
    return;
  }

  loadDetail();

  $("#btnSave")?.addEventListener("click", async () => {
    const phRaw    = $("#ph").value.trim();
    const colorRaw = $("#color").value;
    const smellRaw = $("#smell").value;
    const amountRaw= $("#amount").value.trim();

    const ph = phRaw === "" ? null : Number(phRaw);
    if (ph != null && (!Number.isFinite(ph) || ph < 0 || ph > 14)) {
      await showModalAlert("ข้อมูลไม่ถูกต้อง", "ค่า PH ต้องอยู่ระหว่าง 0 - 14", "warning");
      return;
    }
    const color  = colorRaw === "" ? null : Number(colorRaw);
    const smell  = smellRaw === "" ? null : Number(smellRaw);
    const amount = amountRaw === "" ? null : Number(amountRaw);
    if (amount != null && (!Number.isInteger(amount) || amount < 0)) {
      await showModalAlert("ข้อมูลไม่ถูกต้อง", "จำนวน (ชิ้น) ต้องเป็นจำนวนเต็มไม่ติดลบ", "warning");
      return;
    }

    const payload = {};
    if (ph != null)     payload.PH = ph;
    if (color != null)  payload.color = color;
    if (smell != null)  payload.smell = smell;
    if (amount != null) payload.amount = amount;

    if (Object.keys(payload).length === 0) {
      await showModalAlert("ยังไม่มีการเปลี่ยนแปลง", "ไม่มีข้อมูลที่เปลี่ยนแปลง", "warning");
      return;
    }

    // ✅ กดบันทึก = ถือว่ายืนยัน
    payload.status_con = 1;

    const ok = await showModalConfirm(
      "ยืนยันบันทึก",
      `
        ต้องการบันทึกการเปลี่ยนแปลงหรือไม่?<br>
        <div class="mt-2 small text-muted">
          PH: <b>${payload.PH ?? "-"}</b>,
          สี: <b>${payload.color ?? "-"}</b>,
          กลิ่น: <b>${payload.smell ?? "-"}</b>,
          จำนวน: <b>${payload.amount ?? "-"}</b>
        </div>
      `
    );
    if (!ok) return;

    const btn = $("#btnSave");
    const old = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> กำลังบันทึก...';

    try {
      await updateOrder(id, payload);
      await showModalAlert("สำเร็จ", "บันทึกสำเร็จ", "success");
      loadDetail();
    } catch (e) {
      await showModalAlert("บันทึกล้มเหลว", "บันทึกไม่สำเร็จ: " + (e.message || e), "danger");
    } finally {
      btn.disabled = false;
      btn.innerHTML = old;
    }
  });
});
