// Launch date — change this to the real date.
const LAUNCH_DATE = new Date("2026-12-15T00:00:00");

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

// Countdown clock (homepage only).
const countdown = document.getElementById("countdown");
if (countdown) {
  const els = {
    days: document.getElementById("cd-days"),
    hours: document.getElementById("cd-hours"),
    minutes: document.getElementById("cd-minutes"),
    seconds: document.getElementById("cd-seconds"),
  };
  const pad = (n) => String(n).padStart(2, "0");
  let timer;
  const tick = () => {
    const diff = Math.max(0, LAUNCH_DATE - Date.now());
    const s = Math.floor(diff / 1000);
    els.days.textContent = pad(Math.floor(s / 86400));
    els.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    els.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    els.seconds.textContent = pad(s % 60);
    if (diff === 0) clearInterval(timer);
  };
  timer = setInterval(tick, 1000);
  tick();
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

// Press releases: arrow buttons scroll the row one card at a time.
const releaseList = document.getElementById("release-list");
if (releaseList) {
  const btnWrap = document.querySelector(".scroll-btns");
  const btns = [...btnWrap.querySelectorAll(".scroll-btn")];
  const step = () => {
    const card = releaseList.querySelector(".release-card");
    return card ? card.offsetWidth + 16 : 300;
  };
  const update = () => {
    const max = releaseList.scrollWidth - releaseList.clientWidth - 2;
    btns.forEach((b) => {
      b.disabled = Number(b.dataset.dir) < 0 ? releaseList.scrollLeft <= 2 : releaseList.scrollLeft >= max;
    });
    btnWrap.hidden = max <= 0;   // hide arrows when every card already fits
  };
  btns.forEach((b) => b.addEventListener("click", () => {
    releaseList.scrollBy({ left: step() * Number(b.dataset.dir), behavior: "smooth" });
  }));
  releaseList.addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
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
