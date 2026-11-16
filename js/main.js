document.documentElement.classList.add("js");

// Header: transparent at the top, solid once you scroll.
const header = document.getElementById("site-header");
function updateHeader() {
  header.classList.toggle("scrolled", window.scrollY > 10);
}
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

// Narrow screens: collapse every header link into a menu drawer.
(function setupMenu() {
  const inner = header.querySelector(".header-inner");
  const links = [...header.querySelectorAll(".header-nav a")];
  if (!inner || !links.length) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-btn";
  btn.setAttribute("aria-label", "Open menu");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "site-menu");
  btn.innerHTML = '<span class="bars" aria-hidden="true"><span></span><span></span><span></span></span>';
  inner.appendChild(btn);

  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const drawer = document.createElement("nav");
  drawer.className = "drawer";
  drawer.id = "site-menu";
  drawer.setAttribute("aria-label", "Menu");
  const here = location.pathname.split("/").pop() || "index.html";
  drawer.innerHTML = `
    <div class="drawer-head">
      <a href="./" class="brand">DisputeNews</a>
      <button type="button" class="menu-btn menu-open" aria-label="Close menu" style="display:grid">
        <span class="bars" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
    </div>
    <ul class="drawer-list">
      ${links.map((a) => {
        const href = a.getAttribute("href");
        const current = href === here ? ' aria-current="page"' : "";
        return `<li><a href="${href}"${current}>${a.textContent}</a></li>`;
      }).join("")}
    </ul>`;
  document.body.append(scrim, drawer);

  const setOpen = (open) => {
    drawer.classList.toggle("on", open);
    scrim.classList.toggle("on", open);
    btn.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    if (open) drawer.querySelector(".drawer-list a")?.focus();
  };
  btn.addEventListener("click", () => setOpen(!drawer.classList.contains("on")));
  drawer.querySelector(".drawer-head .menu-btn").addEventListener("click", () => {
    setOpen(false);
    btn.focus();
  });
  scrim.addEventListener("click", () => setOpen(false));
  drawer.addEventListener("click", (e) => {
    if (e.target.closest(".drawer-list a")) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("on")) {
      setOpen(false);
      btn.focus();
    }
  });
  window.matchMedia("(min-width: 641px)").addEventListener("change", (e) => {
    if (e.matches) setOpen(false);
  });
})();

// Hero video: fade out just before the end and back in after it loops, so the jump isn't visible.
const heroVideo = document.getElementById("hero-video");
if (heroVideo) {
  // Checked every frame (timeupdate only fires ~4x a second).
  const watchLoop = () => {
    const d = heroVideo.duration, t = heroVideo.currentTime;
    if (d) {
      if (t > d - 0.6) heroVideo.classList.add("fading");
      else if (t > 0.15 && t < 1.5) heroVideo.classList.remove("fading");
    }
    requestAnimationFrame(watchLoop);
  };
  requestAnimationFrame(watchLoop);
  // Some browsers block autoplay until muted is set from script.
  heroVideo.muted = true;
  heroVideo.play().catch(() => {});
  // Resume if the browser paused it while the tab was in the background.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && heroVideo.paused) heroVideo.play().catch(() => {});
  });
}

document.getElementById("year").textContent = new Date().getFullYear();

// Terminal login: no accounts exist yet, so explain instead of sending anything.
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = document.getElementById("login-msg");
    msg.textContent = "Terminal accounts open at launch. Request access below to get notified.";
    msg.hidden = false;
  });
}

// Press releases: vertical list, 5 per page, with page buttons. Page is kept in ?page=N.
const releaseList = document.getElementById("release-list");
if (releaseList) {
  const PER_PAGE = 5;
  const rows = [...releaseList.querySelectorAll(".release-row")];
  const pager = document.getElementById("pager");
  const count = document.getElementById("release-count");
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const fromUrl = parseInt(new URLSearchParams(location.search).get("page"), 10);
  let page = Math.min(pages, Math.max(1, fromUrl || 1));

  const render = (scroll) => {
    rows.forEach((r, i) => { r.hidden = Math.floor(i / PER_PAGE) + 1 !== page; });
    const first = (page - 1) * PER_PAGE + 1, last = Math.min(rows.length, page * PER_PAGE);
    count.textContent = rows.length > PER_PAGE
      ? `${first}–${last} of ${rows.length}`
      : `${rows.length} release${rows.length === 1 ? "" : "s"}`;
    pager.hidden = pages <= 1;
    if (pages > 1) {
      const btn = (label, target, opts = {}) =>
        `<button type="button" data-page="${target}"${opts.current ? ' aria-current="page"' : ""}${opts.disabled ? " disabled" : ""}${opts.aria ? ` aria-label="${opts.aria}"` : ""}>${label}</button>`;
      let html = btn("&larr; Prev", page - 1, { disabled: page === 1, aria: "Previous page" });
      for (let n = 1; n <= pages; n++) html += btn(n, n, { current: n === page, aria: `Page ${n}` });
      html += btn("Next &rarr;", page + 1, { disabled: page === pages, aria: "Next page" });
      pager.innerHTML = html;
    }
    const url = new URL(location.href);
    if (page > 1) url.searchParams.set("page", page); else url.searchParams.delete("page");
    history.replaceState(null, "", url);
    if (scroll) document.querySelector(".release-section").scrollIntoView({ behavior: "smooth", block: "start" });
  };

  pager.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-page]");
    if (!b || b.disabled) return;
    page = Number(b.dataset.page);
    render(true);
  });
  render(false);
}

// Cookie notice: "Accept" up front, "Necessary only" tucked behind an options toggle.
// Stored choice is "all" or "necessary"; check it with dnCookieConsent() before adding optional cookies.
const COOKIE_KEY = "dn-cookie-notice";
function readConsent() {
  try {
    return localStorage.getItem(COOKIE_KEY);
  } catch (e) {
    return null;
  }
}
window.dnCookieConsent = readConsent;

if (!readConsent()) {
  const notice = document.createElement("div");
  notice.className = "cookie-notice";
  notice.setAttribute("role", "region");
  notice.setAttribute("aria-label", "Cookie notice");
  notice.innerHTML = `
    <span class="tag">Cookies</span>
    <p>We use cookies to make this site work. By using this site, you accept our
    <a href="terms.html">Terms of Service</a> and <a href="cookies.html">Cookie Policy</a>.</p>
    <div class="cookie-actions">
      <button type="button" class="cookie-accept">Accept</button>
      <button type="button" class="cookie-toggle" aria-expanded="false" aria-controls="cookie-options" aria-label="More cookie options">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    </div>
    <div class="cookie-options" id="cookie-options" hidden>
      <button type="button" class="cookie-necessary">Necessary only</button>
    </div>
  `;
  const choose = (value) => {
    try {
      localStorage.setItem(COOKIE_KEY, value);
    } catch (e) {}
    notice.remove();
  };
  const toggle = notice.querySelector(".cookie-toggle");
  const options = notice.querySelector(".cookie-options");
  notice.querySelector(".cookie-accept").addEventListener("click", () => choose("all"));
  notice.querySelector(".cookie-necessary").addEventListener("click", () => choose("necessary"));
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    options.hidden = open;
  });
  document.body.appendChild(notice);
}
