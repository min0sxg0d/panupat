// /public/js/include-header.js
(async () => {
  const host = '';
  const mount = document.getElementById('site-header');
  if (!mount) return;

  // โหลด header
  const html = await (await fetch(`${host}/components/header.html`)).text();
  mount.innerHTML = html;
  console.debug('[include-header] header injected');

  // ---- header.css (ให้สี active ทำงาน) ----
  if (!document.getElementById('header-css')) {
    const link = document.createElement('link');
    link.id = 'header-css';
    link.rel = 'stylesheet';
    link.href = '/components/header.css';
    document.head.appendChild(link);
    console.debug('[include-header] header.css linked');
  }

  // ---- inject modal logout (ครั้งเดียว) ----
  try {
    if (!document.getElementById('logoutConfirmModal')) {
      const modalHtml = await (await fetch(`${host}/components/logout-modal.html`)).text();
      const wrapper = document.createElement('div');
      wrapper.innerHTML = modalHtml.trim();
      document.body.appendChild(wrapper.firstElementChild);
      console.debug('[include-header] logout modal injected');
    }
  } catch (e) {
    console.error('[include-header] load logout-modal failed:', e);
  }

  // ---- ให้แน่ใจว่า Bootstrap bundle พร้อมใช้ (สำหรับ modal) ----
  if (!window.bootstrap) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
    console.debug('[include-header] bootstrap loaded');
  }

  // ---- โหลดสคริปต์ logout แค่ครั้งเดียว ----
  if (![...document.scripts].some(s => s.src.includes('/js/login-logout.js'))) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.id = 'login-logout-js';
      s.src = '/js/login-logout.js';
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
    console.debug('[include-header] login-logout.js loaded');
  }

  // ---- ตั้งค่า headerindex (ข้อความชื่อหน้าบน header) ----
  function setHeaderIndex() {
    const el = document.querySelector('.headerindex');
    if (!el) return;

    const path = location.pathname.toLowerCase();

    // แมปชื่อหน้าที่ต้องการ (แก้/เพิ่มได้ตามสะดวก)
    const map = [
      // chem
      ['/chem/index.html',           'สารเคมี'],
      ['/chem/create.html',          'เพิ่มสารเคมี'],
      ['/chem/edit.html',            'แก้ไขสารเคมี'],

      // brand
      ['/brand/index.html',          'แบรนด์'],

      // product (ผลิตภัณฑ์)
      ['/product/index.html',        'ผลิตภัณฑ์'],
      ['/product/create.html',       'เพิ่มผลิตภัณฑ์'],
      ['/product/edit.html',         'แก้ไขผลิตภัณฑ์'],

      // productdetail (ตั้งค่าสูตร)
      ['/productdetail/index.html',  'ตั้งค่าสูตร'],
      ['/productdetail/create.html', 'เพิ่มสูตร'],
      ['/productdetail/edit.html',   'แก้ไขสูตร'],

      // productorder (สั่งผลิต)
      ['/productorder/index.html',   'สั่งผลิต'],
      ['/productorder/create.html',  'เพิ่มคำสั่งผลิต'],
      ['/productorder/edit.html',    'แก้ไขคำสั่งผลิต'],

      // productorderdetail (ซื้อสารเคมี)
      ['/productorderdetail/index.html',  'ซื้อสารเคมี'],
      ['/productorderdetail/create.html', 'เพิ่มรายการสั่งซื้อสารเคมี'],
      ['/productorderdetail/edit.html',   'แก้ไขรายการสั่งซื้อสารเคมี'],

      // showdetail
      ['/showdetail/index.html',     'รายละเอียดต้นทุนการผลิต'],
    ];

    const hit = map.find(([p]) => path.endsWith(p));
    el.textContent = hit ? hit[1] : (document.title || '');
    // ถ้าอยาก fallback แบบ startsWith แทน endsWith ให้ใช้:
    // const hit = map.find(([p]) => path.endsWith(p) || path.startsWith(p.replace('/index.html','')));
    console.debug('[include-header] headerindex =', el.textContent);
  }

  setHeaderIndex();
  // เผื่อมีการเปลี่ยนหน้าแบบ SPA/back-forward
  window.addEventListener('popstate', setHeaderIndex);

  // ---- แจ้งว่า header พร้อม (รองรับทั้ง ready/loaded) ----
  document.dispatchEvent(new CustomEvent('header:ready'));
  document.dispatchEvent(new CustomEvent('header:loaded'));
  console.debug('[include-header] dispatched header:ready & header:loaded');
})();
