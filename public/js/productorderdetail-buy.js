// /public/js/productorderdetail-buy.js
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const toNum = (v, d = 0) => {
    if (typeof v === "string") v = v.replace(/,/g, "");
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };
  const fmtMoney = (n) =>
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const getParam = (k, d = null) =>
    new URLSearchParams(location.search).get(k) ?? d;

  // ===== Modal Helpers (Bootstrap 5) =====
  const ensureAlertModal = () => {
    let modal = document.getElementById("alertModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal fade";
      modal.id = "alertModal";
      modal.tabIndex = -1;
      modal.innerHTML = `
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
      document.body.appendChild(modal);
    }
    return modal;
  };

  const showModalAlert = (title, message, variant = "primary") => {
    const modal = ensureAlertModal();
    const titleEl = modal.querySelector(".modal-title");
    const bodyEl = modal.querySelector("#alertModalBody");
    const okBtn = modal.querySelector("#alertModalOk");
    titleEl.textContent = title;
    bodyEl.innerHTML = message;

    okBtn.className = "btn";
    okBtn.classList.add(
      variant === "success" ? "btn-success" :
      variant === "danger"  ? "btn-danger"  :
      variant === "warning" ? "btn-warning" : "btn-primary"
    );

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    return new Promise((resolve) => {
      const handler = () => { okBtn.removeEventListener("click", handler); resolve(true); };
      okBtn.addEventListener("click", handler);
    });
  };

  const ensureConfirmModal = () => {
    let modal = document.getElementById("confirmModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal fade";
      modal.id = "confirmModal";
      modal.tabIndex = -1;
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content rounded-3 shadow">
            <div class="modal-header">
              <h5 class="modal-title">ยืนยันการทำรายการ</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="confirmModalBody"></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="confirmModalCancel" data-bs-dismiss="modal">ยกเลิก</button>
              <!-- ปุ่มยืนยันสีเขียว -->
              <button type="button" class="btn btn-success" id="confirmModalOk">ยืนยัน</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    return modal;
  };

  const showModalConfirm = (title, message) => {
    const modal = ensureConfirmModal();
    const titleEl = modal.querySelector(".modal-title");
    const bodyEl = modal.querySelector("#confirmModalBody");
    const okBtn = modal.querySelector("#confirmModalOk");
    const cancelBtn = modal.querySelector("#confirmModalCancel");

    titleEl.textContent = title;
    bodyEl.innerHTML = message;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    return new Promise((resolve) => {
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onHidden = () => { cleanup(); resolve(false); };
      const cleanup = () => {
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        modal.removeEventListener("hidden.bs.modal", onHidden);
      };
      okBtn.addEventListener("click", () => { bsModal.hide(); onOk(); });
      cancelBtn.addEventListener("click", onCancel);
      modal.addEventListener("hidden.bs.modal", onHidden);
    });
  };

  // ===== ปุ่มกลับ =====
  $("btnBack")?.addEventListener("click", async (e) => {
    e.preventDefault();
    // ถ้าอยากยืนยันก่อนกลับ ใช้ modal นี้ (ถ้าไม่ต้องการ ลบ block นี้ได้)
    const ok = await showModalConfirm("ยืนยันกลับหน้าเดิม", "ต้องการกลับไปหน้ารายการหรือไม่?");
    if (!ok) return;
    if (document.referrer) history.back();
    else location.href = "/productorderdetail/index.html";
  });

  // ===== โหลดรายชื่อบริษัท =====
  async function loadCompanies() {
    try {
      const res = await fetch("/company/read", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("โหลดไม่สำเร็จ");
      const data = await res.json();
      const arr = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.rows)
        ? data.rows
        : Array.isArray(data.items)
        ? data.items
        : [];
      const sel = $("company_id");
      sel.innerHTML = `<option value="">-- เลือกบริษัท --</option>`;
      arr.forEach((x) => {
        const id = x.id ?? x.company_id ?? x.COMPANY_ID;
        const name = x.company_name ?? x.name ?? x.COMPANY_NAME;
        if (id && name) {
          const op = document.createElement("option");
          op.value = id;
          op.textContent = name;
          sel.appendChild(op);
        }
      });
    } catch (err) {
      console.error(err);
      await showModalAlert("ผิดพลาด", "โหลดรายการบริษัทไม่สำเร็จ", "danger");
    }
  }

  // ===== ดึง reorder ตาม chem_id =====
  async function updateChemReorder(chemId) {
    const help = $("orderbuy_help");
    if (!chemId) {
      help.textContent = "reorder: -";
      return;
    }
    try {
      const res = await fetch(`/chem/detail?id=${chemId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const row = Array.isArray(data) ? data[0] : data;
      const reorder = row?.chem_reorder ?? row?.CHEM_REORDER ?? null;
      help.textContent = reorder ? `reorder: ${fmt(reorder)} กรัม` : "reorder: -";
    } catch {
      help.textContent = "reorder: -";
    }
  }

  // ===== คำนวณราคา/กรัม =====
  const totalPriceInput = $("chem_price"); // ✅ ราคารวมที่จ่าย (บาท)
  const qtyInput = $("orderbuy");          // ✅ ปริมาณที่สั่งซื้อ (กรัม)
  const unitBox = $("price_gram");         // ✅ ราคา/กรัม (readonly)

  const recalc = () => {
    const total = toNum(totalPriceInput.value);
    const qty = toNum(qtyInput.value);
    const unit = qty > 0 ? round2(total / qty) : 0;
    if (unitBox) unitBox.value = fmtMoney(unit);
  };

  totalPriceInput?.addEventListener("input", recalc);
  qtyInput?.addEventListener("input", recalc);

  // ===== โหลดข้อมูลตาม pod_id =====
  async function loadDetailByPodId(podId) {
    const urls = [
      `/productorderdetail/read/${podId}`,
      `/productorderdetail/detail?id=${podId}`,
      `/productorderdetail/${podId}`,
    ];
    for (const u of urls) {
      try {
        const res = await fetch(u, { headers: { Accept: "application/json" } });
        if (!res.ok) continue;
        const data = await res.json();
        return Array.isArray(data) ? data[0] : data;
      } catch {}
    }
    return null;
  }

  // ===== โหลดแถวล่าสุดตาม chem_id =====
  async function loadLatestByChemId(chemId) {
    if (!chemId) return null;
    const res = await fetch(`/productorderdetail/read`);
    if (!res.ok) return null;
    const raw = await res.json();
    const arr = Array.isArray(raw)
      ? raw
      : Array.isArray(raw.data)
      ? raw.data
      : Array.isArray(raw.rows)
      ? raw.rows
      : [];
    const rows = arr
      .filter((x) => Number(x.chem_id ?? x.CHEM_ID) === Number(chemId))
      .map((x) => ({
        pod_id: x.pod_id ?? x.POD_ID ?? null,
        chem_id: x.chem_id ?? x.CHEM_ID ?? null,
        chem_name: x.chem_name ?? x.CHEM_NAME ?? null,
        company_id: x.company_id ?? x.COMPANY_ID ?? null,
        orderbuy: x.orderbuy ?? x.ORDERBUY ?? null,
        chem_price: x.chem_price ?? x.CHEM_PRICE ?? null,
        coa: x.coa ?? x.COA ?? null,
        msds: x.msds ?? x.MSDS ?? null,
      }));
    if (!rows.length) return null;
    rows.sort((a, b) => (b.pod_id || 0) - (a.pod_id || 0));
    return rows[0];
  }

  // ===== Initial load =====
  const podId = Number(getParam("pod_id", 0)) || 0;
  let chemId = Number(getParam("chem_id", 0)) || 0;
  let chemName = getParam("chem_name", "");

  (async () => {
    await loadCompanies();

    $("chem_id").value = chemId || "";
    if (chemName) $("chem_name").value = chemName;

    let data = null;
    if (podId) {
      data = await loadDetailByPodId(podId);
    } else if (chemId) {
      data = await loadLatestByChemId(chemId);
    }

    if (!data) {
      await updateChemReorder(chemId);
      return;
    }

    // === Prefill ===
    $("chem_id").value = data.chem_id ?? "";
    $("chem_name").value = data.chem_name ?? chemName ?? "-";
    $("company_id").value = data.company_id ?? "";
    $("orderbuy").value = data.orderbuy ?? "";
    $("chem_price").value = ""; // ✅ ผู้ใช้กรอกเอง
    $("price_gram").value = fmtMoney(data.chem_price ?? 0);
    $("coa").value = data.coa ?? "";
    $("msds").value = data.msds ?? "";
    await updateChemReorder(data.chem_id);

    // ซ่อน pod_id สำหรับ submit
    let hid = document.getElementById("pod_id");
    if (!hid) {
      hid = document.createElement("input");
      hid.type = "hidden";
      hid.id = "pod_id";
      hid.name = "pod_id";
      document.getElementById("formBuy").appendChild(hid);
    }
    hid.value = data.pod_id;
  })();

  // ===== Submit (UPDATE ตาม pod_id) =====
  async function tryUpdate(payload) {
    const res = await fetch(`/productorderdetail/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `อัปเดตไม่สำเร็จ (${res.status})`);
    return data;
  }

  $("formBuy").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pod_id = Number($("pod_id")?.value || 0);
    if (!pod_id) {
      await showModalAlert("ไม่พบรายการ", "ไม่พบ pod_id ของรายการนี้", "warning");
      return;
    }

    const chem_id = toNum($("chem_id").value || 0);
    const company_id = toNum($("company_id").value || 0);
    const orderbuy = toNum($("orderbuy").value || 0);
    const chem_price = toNum($("chem_price").value || 0);
    const price_gram = orderbuy > 0 ? round2(chem_price / orderbuy) : 0;

    if (!chem_id) { await showModalAlert("ข้อมูลไม่ครบ", "กรุณาเลือกชื่อทางการค้า", "warning"); return; }
    if (!company_id) { await showModalAlert("ข้อมูลไม่ครบ", "กรุณาเลือกชื่อบริษัทที่ขายสารเคมี", "warning"); return; }

    const payload = {
      pod_id,
      chem_id,
      company_id,
      orderbuy,
      chem_price,
      price_gram,
      coa: ($("coa").value || "").trim() || null,
      msds: ($("msds").value || "").trim() || null,
    };

    // ✅ ยืนยันก่อนอัปเดต (ปุ่มยืนยันสีเขียว)
    const ok = await showModalConfirm(
      "ยืนยันการอัปเดต",
      `
        ต้องการอัปเดตรายการนี้หรือไม่?<br>
        <div class="mt-2 small text-muted">
          สารเคมี: <b>${$("chem_name").value || "-"}</b><br>
          บริษัท: <b>${$("company_id").selectedOptions[0]?.text || "-"}</b><br>
          จำนวนซื้อ (กรัม): <b>${orderbuy.toLocaleString()}</b><br>
          ราคารวม (บาท): <b>${chem_price.toLocaleString()}</b><br>
          ราคา/กรัม (บาท): <b>${fmtMoney(price_gram)}</b>
        </div>
      `
    );
    if (!ok) return;

    // ป้องกันกดซ้ำ
    const submitBtn = document.querySelector('#formBuy [type="submit"]');
    submitBtn?.setAttribute("disabled", "disabled");

    try {
      await tryUpdate(payload);
      await showModalAlert("สำเร็จ", "อัปเดตข้อมูลเรียบร้อยแล้ว", "success");
      location.href = "/productorderdetail/index.html";
    } catch (err) {
      console.error(err);
      await showModalAlert("อัปเดตไม่สำเร็จ", err.message || "กรุณาลองใหม่อีกครั้ง", "danger");
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
});

// ===== Upload helpers =====
function enableLink(aEl, url) {
  if (!aEl) return;
  if (url) {
    aEl.href = url;
    aEl.removeAttribute("disabled");
    aEl.classList.remove("disabled");
  } else {
    aEl.removeAttribute("href");
    aEl.setAttribute("disabled", "true");
    aEl.classList.add("disabled");
  }
}

async function uploadPdf(fieldName) {
  // fieldName = 'coa' | 'msds'
  const podId = Number(document.getElementById("pod_id")?.value || 0);
  if (!podId) { await showModalAlert("ยังไม่พร้อม", "ยังไม่พบ pod_id ของรายการนี้ (ยังไม่โหลดข้อมูลเสร็จ?)", "warning"); return; }

  const fileInput = document.getElementById(fieldName + "_file");
  const textBox   = document.getElementById(fieldName);
  const linkBtn   = document.getElementById(fieldName + "_link");

  const file = fileInput?.files?.[0];
  if (!file) { await showModalAlert("กรุณาเลือกไฟล์", "โปรดเลือกไฟล์ก่อน", "warning"); return; }

  if (file.type !== "application/pdf") {
    await showModalAlert("ชนิดไฟล์ไม่ถูกต้อง", "รองรับเฉพาะไฟล์ PDF เท่านั้น", "danger");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    await showModalAlert("ไฟล์ใหญ่เกินไป", "ขนาดไฟล์ต้องไม่เกิน 10MB", "warning");
    return;
  }

  const fd = new FormData();
  fd.append("pod_id", String(podId));
  fd.append(fieldName, file); // 'coa' หรือ 'msds'

  try {
    const res = await fetch("/upload/coa-msds", { method: "PUT", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `อัปโหลดไม่สำเร็จ (${res.status})`);

    const url = data[fieldName] || null;
    if (url) {
      if (textBox) textBox.value = url;
      enableLink(linkBtn, url);
      await showModalAlert("สำเร็จ", `อัปโหลด ${fieldName.toUpperCase()} สำเร็จ`, "success");
    } else {
      await showModalAlert("ข้อควรระวัง", `อัปโหลดสำเร็จ แต่ไม่พบ URL ของ ${fieldName.toUpperCase()}`, "warning");
    }
  } catch (err) {
    console.error(err);
    await showModalAlert("อัปโหลดล้มเหลว", err.message || "กรุณาลองใหม่อีกครั้ง", "danger");
  } finally {
    if (fileInput) fileInput.value = "";
  }
}

// ปุ่มอัปโหลด
document.getElementById("btnUploadCoa")?.addEventListener("click", () => uploadPdf("coa"));
document.getElementById("btnUploadMsds")?.addEventListener("click", () => uploadPdf("msds"));
// // อัปโหลดอัตโนมัติเมื่อเลือกไฟล์
// document.getElementById("coa_file")?.addEventListener("change", () => uploadPdf("coa"));
// document.getElementById("msds_file")?.addEventListener("change", () => uploadPdf("msds"));
