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

// Accessibility settings: stored per browser under "dn-a11y" and applied as
// html classes (a11y-text, a11y-contrast, a11y-motion, a11y-links). A small
// inline script in each page's <head> applies them before first paint.
const A11Y_KEY = "dn-a11y";
const A11Y_OPTIONS = [
  { id: "text", label: "Larger text", hint: "Increase text size across the site" },
  { id: "contrast", label: "High contrast", hint: "Stronger text and borders" },
  { id: "motion", label: "Reduce motion", hint: "Stop animations and the background video" },
  { id: "links", label: "Underline links", hint: "Make every link easy to spot" },
];
function readA11y() {
  try {
    return JSON.parse(localStorage.getItem(A11Y_KEY) || "{}");
  } catch (e) {
    return {};
  }
}
function applyA11y(prefs) {
  A11Y_OPTIONS.forEach((o) => document.documentElement.classList.toggle("a11y-" + o.id, !!prefs[o.id]));
  const video = document.getElementById("hero-video");
  if (video) prefs.motion ? video.pause() : video.play().catch(() => {});
}

let a11yPanel = null;
function openA11y(opener) {
  if (a11yPanel) {
    a11yPanel.querySelector("input").focus();
    return;
  }
  const prefs = readA11y();
  a11yPanel = document.createElement("div");
  a11yPanel.className = "a11y-panel";
  a11yPanel.setAttribute("role", "dialog");
  a11yPanel.setAttribute("aria-labelledby", "a11y-title");
  a11yPanel.innerHTML = `
    <span class="tag" id="a11y-title">Accessibility</span>
    <ul class="a11y-list">
      ${A11Y_OPTIONS.map((o) => `
        <li>
          <label class="a11y-row">
            <span><strong>${o.label}</strong><small>${o.hint}</small></span>
            <input type="checkbox" role="switch" data-opt="${o.id}" ${prefs[o.id] ? "checked" : ""}>
            <span class="a11y-switch" aria-hidden="true"></span>
          </label>
        </li>`).join("")}
    </ul>
    <div class="a11y-actions">
      <button type="button" class="a11y-reset">Reset</button>
      <button type="button" class="a11y-done">Done</button>
    </div>
  `;
  const notice = document.querySelector(".cookie-notice");
  if (notice) notice.hidden = true;
  a11yPanel.addEventListener("change", (e) => {
    const box = e.target.closest("input[data-opt]");
    if (!box) return;
    const next = readA11y();
    next[box.dataset.opt] = box.checked;
    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify(next));
    } catch (err) {}
    applyA11y(next);
  });
  a11yPanel.querySelector(".a11y-reset").addEventListener("click", () => {
    try {
      localStorage.removeItem(A11Y_KEY);
    } catch (err) {}
    a11yPanel.querySelectorAll("input[data-opt]").forEach((b) => (b.checked = false));
    applyA11y({});
  });
  const close = () => {
    a11yPanel.remove();
    a11yPanel = null;
    const n = document.querySelector(".cookie-notice");
    if (n) n.hidden = false;
    const back = n ? n.querySelector(".cookie-a11y") : opener;
    if (back) back.focus();
  };
  a11yPanel.querySelector(".a11y-done").addEventListener("click", close);
  a11yPanel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  document.body.appendChild(a11yPanel);
  a11yPanel.querySelector("input").focus();
}
applyA11y(readA11y());
document.querySelectorAll("[data-a11y-open]").forEach((btn) =>
  btn.addEventListener("click", () => openA11y(btn))
);

// Cookie notice: "Accept" (filled) beside "Decline" (outlined), plus accessibility settings.
// Stored choice is "all" (Accept) or "necessary" (Decline); check it with dnCookieConsent() before adding optional cookies.
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
      <button type="button" class="cookie-decline">Decline</button>
    </div>
    <button type="button" class="cookie-a11y">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.5"/><path d="M5 8l7 1.5L19 8M12 9.5V14m0 0l-3 6m3-6l3 6"/></svg>
      Accessibility settings
    </button>
  `;
  const choose = (value) => {
    try {
      localStorage.setItem(COOKIE_KEY, value);
    } catch (e) {}
    notice.remove();
  };
  notice.querySelector(".cookie-accept").addEventListener("click", () => choose("all"));
  notice.querySelector(".cookie-decline").addEventListener("click", () => choose("necessary"));
  notice.querySelector(".cookie-a11y").addEventListener("click", (e) => openA11y(e.currentTarget));
  document.body.appendChild(notice);
}
