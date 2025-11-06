// /public/js/navbar.js
(function () {
  const HOST = "#site-header";

  function highlightMenu() {
    const pathname = window.location.pathname;
    const header = document.querySelector(HOST);
    if (!header) {
      console.warn("[navbar] header not found");
      return false;
    }

    const links = header.querySelectorAll("a[href]");
    if (!links.length) {
      console.warn("[navbar] no links in header");
      return false;
    }

    // ล้างสถานะเดิม
    links.forEach((a) => {
      a.classList.remove("active");
      a.style.removeProperty("color");
    });

    // ✅ ตั้งกลุ่มแมป route → เมนู
    const groups = [
      { prefix: "/productorderdetail" },
      { prefix: "/productdetail" },
      { prefix: "/productorder", target: "/product" }, // ← productorder ให้ไปเขียวที่ /product
      { prefix: "/product" },
      { prefix: "/chem" },
      { prefix: "/brand" },
      { prefix: "/showdetail" },
    ];

    for (const { prefix, target } of groups) {
      if (pathname === prefix || pathname.startsWith(prefix + "/")) {
        const matchHref = target || prefix;

        // ⬇️ หาเมนูโดยแมตช์ขอบ segment ให้ตรง (กัน /productorder ชน /product)
        let link = Array.from(links).find((a) => {
          const href = (a.getAttribute("href") || "")
            .split("#")[0]
            .split("?")[0];
          return href === matchHref || href.startsWith(matchHref + "/");
        });
        if (!link) continue;

        // ถ้าเป็นรายการใน dropdown ⇒ ยก active ขึ้นปุ่มหลัก
        if (link.classList.contains("dropdown-item")) {
          const dropdown = link.closest(".nav-item.dropdown");
          const topToggle =
            dropdown && dropdown.querySelector(".nav-link.dropdown-toggle");
          if (topToggle) link = topToggle;
        }

        link.classList.add("active");
        link.style.setProperty("color", "#00d312", "important");

        console.debug(
          "✅ active menu:",
          prefix,
          "->",
          link.getAttribute("href") || "#"
        );
        return true;
      }
    }

    console.debug("[navbar] no match for", pathname);
    return false;
  }

  function boot() {
    if (highlightMenu()) return;

    const onReady = () => highlightMenu();
    document.addEventListener("header:ready", onReady, { once: true });
    document.addEventListener("header:loaded", onReady, { once: true });

    const host = document.querySelector(HOST);
    if (host) {
      const obs = new MutationObserver(() => {
        if (highlightMenu()) obs.disconnect();
      });
      obs.observe(host, { childList: true, subtree: true });
    }

    window.addEventListener("popstate", highlightMenu);
    setTimeout(highlightMenu, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
