// /public/js/productorderdetail-create.js
document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const toNum = (v, d = 0) => {
    const n = Number(String(v ?? "").replaceAll(",", ""));
    return Number.isFinite(n) ? n : d;
  };

  const chemSel = $("chem_id");
  const compSel = $("company_id");
  const orderBuy = $("orderbuy");
  const form = $("formCreate");
  const btnBack = $("btnBack");

  // ---------- Modal Alert (OK) ----------
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
    const bodyEl = modal.querySelector(".modal-body");
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
      const handler = () => {
        okBtn.removeEventListener("click", handler);
        resolve(true);
      };
      okBtn.addEventListener("click", handler);
    });
  };

  // ---------- Modal Confirm (Cancel/Confirm) ----------
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
              <button type="button" class="btn btn-success" id="confirmModalOk">ยืนยัน</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    return modal;
  };

  const showModalConfirm = (title, message, variant = "primary") => {
    const modal = ensureConfirmModal();
    const titleEl = modal.querySelector(".modal-title");
    const bodyEl = modal.querySelector("#confirmModalBody");
    const okBtn = modal.querySelector("#confirmModalOk");
    const cancelBtn = modal.querySelector("#confirmModalCancel");

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
      const onOk = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onHidden = () => { cleanup(); resolve(false); };

      const cleanup = () => {
        okBtn.removeEventListener("click", onOk);
        cancelBtn.removeEventListener("click", onCancel);
        modal.removeEventListener("hidden.bs.modal", onHidden);
      };

      okBtn.addEventListener("click", () => {
        bsModal.hide();
        onOk();
      });
      cancelBtn.addEventListener("click", onCancel);
      modal.addEventListener("hidden.bs.modal", onHidden);
    });
  };

  // ---------- Fetch Utils ----------
  const fetchJson = async (url) => {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}\n${text.slice(0, 150)}...`);
    if (text.trim().startsWith("<")) throw new Error(`Expected JSON but got HTML from ${url}`);
    return JSON.parse(text);
  };

  const setOptions = (sel, rows, mapFn, placeholder) => {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    rows.forEach((r) => {
      const { value, label } = mapFn(r);
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      sel.appendChild(opt);
    });
  };

  // ---------- Load dropdowns ----------
  fetchJson("/chem/read-all")
    .then((rows) => {
      setOptions(
        chemSel,
        rows,
        (c) => ({
          value: c.id ?? c.chem_id,
          label: `${c.chem_name}${c.chem_unit ? " [" + c.chem_unit + "]" : ""}`,
        }),
        "— เลือกสารเคมี —"
      );
    })
    .catch((err) => console.error("load chem error:", err));

  fetchJson("/company/read")
    .then((rows) => {
      setOptions(
        compSel,
        rows,
        (c) => ({
          value: c.company_id ?? c.id,
          label: c.company_name ?? c.name,
        }),
        "— เลือกบริษัทผู้ขาย —"
      );
    })
    .catch((err) => console.error("load company error:", err));

  // ---------- Back button ----------
  btnBack?.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.referrer) history.back();
    else location.href = "/productorderdetail";
  });

  // ---------- Submit with Confirm ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const chem_id = toNum(chemSel.value);
    const company_id = toNum(compSel.value);
    const orderbuy = toNum(orderBuy.value);

    if (!chem_id || !company_id || orderbuy <= 0) {
      await showModalAlert("ข้อมูลไม่ครบ", "กรุณาเลือกสารเคมี บริษัท และกรอกจำนวนกรัม (> 0)", "warning");
      return;
    }

    // ✅ ยืนยันก่อนบันทึก
    const ok = await showModalConfirm(
      "ยืนยันบันทึก",
      `
        ต้องการบันทึกรายการนี้หรือไม่?<br>
        <div class="mt-2 small text-muted">
          สารเคมี: <b>${chemSel.options[chemSel.selectedIndex]?.text || "-"}</b><br>
          บริษัท: <b>${compSel.options[compSel.selectedIndex]?.text || "-"}</b><br>
          จำนวน (กรัม): <b>${orderbuy.toLocaleString()}</b>
        </div>
      `,
      "success"
    );
    if (!ok) return;

    const payload = { chem_id, company_id, orderbuy };
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn?.setAttribute("disabled", "disabled");

    try {
      const res = await fetch("/productorderdetail/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "เกิดข้อผิดพลาด");

      await showModalAlert("บันทึกสำเร็จ", "สร้างรายการสั่งซื้อสารเคมีเรียบร้อยแล้ว", "success");
      form.reset();
      chemSel.focus();
    } catch (err) {
      console.error(err);
      await showModalAlert("บันทึกล้มเหลว", err.message || "ไม่สามารถบันทึกได้", "danger");
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
});
