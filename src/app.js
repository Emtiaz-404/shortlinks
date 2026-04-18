/* =============================================
   THEDIGITA SHORT LINK APP - FRONTEND LOGIC
============================================= */

let ADMIN_KEY = "";

// =============================================
//  AUTH
// =============================================

async function login() {
  const keyInput = document.getElementById("loginKey");
  const key = keyInput.value.trim();

  if (!key) {
    keyInput.focus();
    return;
  }

  ADMIN_KEY = key;

  // Show loader
  setLoginLoading(true);
  document.getElementById("loginError").classList.add("hidden");

  try {
    const res = await fetch(`/api/links?adminKey=${encodeURIComponent(key)}`);
    const data = await res.json();

    if (res.status === 401 || data.error === "Unauthorized") {
      ADMIN_KEY = "";
      sessionStorage.removeItem("adminKey");
      document.getElementById("loginError").classList.remove("hidden");
      setLoginLoading(false);
      return;
    }

    // Success
    sessionStorage.setItem("adminKey", key);
    showDashboard(data.links || []);
  } catch (err) {
    console.error("Login error:", err);
    document.getElementById("loginError").classList.remove("hidden");
    ADMIN_KEY = "";
  }

  setLoginLoading(false);
}

function setLoginLoading(loading) {
  const btn = document.getElementById("loginBtn");
  const text = document.getElementById("loginBtnText");
  const loader = document.getElementById("loginBtnLoader");
  btn.disabled = loading;
  text.classList.toggle("hidden", loading);
  loader.classList.toggle("hidden", !loading);
}

function logout() {
  ADMIN_KEY = "";
  sessionStorage.removeItem("adminKey");

  document.getElementById("dashboardScreen").classList.add("hidden");
  const loginScreen = document.getElementById("loginScreen");
  loginScreen.classList.remove("hidden");
  loginScreen.style.display = "flex";
  document.getElementById("loginKey").value = "";
  document.getElementById("loginError").classList.add("hidden");
}

function showDashboard(links) {
  const loginScreen = document.getElementById("loginScreen");
  loginScreen.classList.add("hidden");
  loginScreen.style.display = "none";

  const dashboard = document.getElementById("dashboardScreen");
  dashboard.classList.remove("hidden");
  dashboard.style.display = "block";

  renderLinks(links);
}

// =============================================
//  CREATE LINK
// =============================================

async function createLink() {
  const originalUrl   = document.getElementById("originalUrl").value.trim();
  const customSlug    = document.getElementById("customSlug").value.trim();
  const password      = document.getElementById("linkPassword").value.trim();

  const errorEl  = document.getElementById("createError");
  const resultEl = document.getElementById("resultBox");
  const btn      = document.getElementById("createBtn");
  const btnText  = document.getElementById("createBtnText");
  const btnLoad  = document.getElementById("createBtnLoader");

  // Reset
  errorEl.classList.add("hidden");
  resultEl.classList.add("hidden");

  // Validate
  if (!originalUrl) {
    showCreateError("Please enter a destination URL");
    return;
  }

  try {
    new URL(originalUrl);
  } catch {
    showCreateError("Please enter a valid URL (include https://)");
    return;
  }

  // Loading
  btn.disabled = true;
  btnText.classList.add("hidden");
  btnLoad.classList.remove("hidden");

  try {
    const res = await fetch("/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalUrl,
        customSlug: customSlug || undefined,
        password: password   || undefined,
        adminKey: ADMIN_KEY,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showCreateError(data.error || "Failed to create link. Please try again.");
      return;
    }

    // Show result
    document.getElementById("resultUrl").textContent      = data.shortUrl;
    document.getElementById("resultOriginal").textContent = data.originalUrl;
    resultEl.classList.remove("hidden");

    // Clear inputs
    document.getElementById("originalUrl").value  = "";
    document.getElementById("customSlug").value   = "";
    document.getElementById("linkPassword").value = "";

    // Reload table
    loadLinks();

  } catch (err) {
    console.error("Create error:", err);
    showCreateError("Network error. Please check your connection and try again.");
  }

  // Reset loading
  btn.disabled = false;
  btnText.classList.remove("hidden");
  btnLoad.classList.add("hidden");
}

function showCreateError(msg) {
  const el = document.getElementById("createError");
  el.textContent = "❌ " + msg;
  el.classList.remove("hidden");
}

// =============================================
//  LOAD & RENDER LINKS
// =============================================

async function loadLinks() {
  const loaderEl = document.getElementById("linksLoader");
  const tableEl  = document.getElementById("linksTable");
  const emptyEl  = document.getElementById("linksEmpty");
  const refreshIcon = document.getElementById("refreshIcon");

  // Show loader
  loaderEl.classList.remove("hidden");
  tableEl.classList.add("hidden");
  emptyEl.classList.add("hidden");

  // Animate refresh icon
  if (refreshIcon) {
    refreshIcon.style.display = "inline-block";
    refreshIcon.style.animation = "spin 0.7s linear infinite";
  }

  try {
    const res  = await fetch(`/api/links?adminKey=${encodeURIComponent(ADMIN_KEY)}`);
    const data = await res.json();

    if (!res.ok) {
      loaderEl.classList.add("hidden");
      return;
    }

    renderLinks(data.links || []);
  } catch (err) {
    console.error("Load links error:", err);
    loaderEl.classList.add("hidden");
  }

  if (refreshIcon) {
    refreshIcon.style.animation = "";
  }
}

function renderLinks(links) {
  const loaderEl = document.getElementById("linksLoader");
  const tableEl  = document.getElementById("linksTable");
  const emptyEl  = document.getElementById("linksEmpty");
  const bodyEl   = document.getElementById("linksBody");

  loaderEl.classList.add("hidden");

  // Update stats
  const today       = new Date().toDateString();
  const todayCount  = links.filter(l => new Date(l.created_at).toDateString() === today).length;
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const topClicks   = links.length ? Math.max(...links.map(l => l.clicks || 0)) : 0;

  animateNumber("totalLinks",  links.length);
  animateNumber("totalClicks", totalClicks);
  animateNumber("todayLinks",  todayCount);
  animateNumber("topClicks",   topClicks);

  if (links.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  tableEl.classList.remove("hidden");

  bodyEl.innerHTML = links.map((link, index) => {
    const shortUrl = `https://thedigita-2011.com/r/${link.slug}`;
    const date = new Date(link.created_at).toLocaleDateString("en-US", {
      month: "short",
      day:   "numeric",
      year:  "numeric",
    });

    const isProtected = link.password ? "🔒" : "—";

    return `
      <tr>
        <td class="td-num">${index + 1}</td>
        <td class="td-short">/r/${escHtml(link.slug)}</td>
        <td class="td-original" title="${escHtml(link.original_url)}">
          ${escHtml(link.original_url)}
        </td>
        <td class="td-lock">${isProtected}</td>
        <td class="td-clicks">${link.clicks || 0}</td>
        <td class="td-date">${date}</td>
        <td class="td-actions">
          <button
            class="btn-action btn-action-visit"
            onclick="window.open('${escHtml(shortUrl)}', '_blank')"
          >
            Visit
          </button>
          <button
            class="btn-action btn-action-copy"
            onclick="copyRowLink('${escHtml(shortUrl)}', this)"
          >
            Copy
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

// =============================================
//  COPY HELPERS
// =============================================

async function copyLink() {
  const url = document.getElementById("resultUrl").textContent;
  const btn = document.getElementById("copyMainBtn");
  await copyToClipboard(url, btn, "📋 Copy Link", "✅ Copied!");
}

async function copyRowLink(url, btn) {
  await copyToClipboard(url, btn, "Copy", "✓ Copied!");
}

async function copyToClipboard(text, btn, original, success) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }

  if (btn) {
    const prev = btn.textContent;
    btn.textContent = success;
    setTimeout(() => (btn.textContent = original || prev), 2000);
  }
}

// =============================================
//  UTILITIES
// =============================================

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str || "");
  return d.innerHTML;
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;

  const current = parseInt(el.textContent) || 0;
  if (current === target) return;

  const step     = Math.ceil(Math.abs(target - current) / 20);
  const dir      = target > current ? 1 : -1;
  let   val      = current;

  const timer = setInterval(() => {
    val += dir * step;
    if ((dir > 0 && val >= target) || (dir < 0 && val <= target)) {
      val = target;
      clearInterval(timer);
    }
    el.textContent = val;
  }, 30);
}

// =============================================
//  INIT
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  // Auto-restore session
  const savedKey = sessionStorage.getItem("adminKey");
  if (savedKey) {
    ADMIN_KEY = savedKey;
    document.getElementById("loginKey").value = savedKey;
    login();
    return;
  }

  // Make login screen visible
  const loginScreen = document.getElementById("loginScreen");
  loginScreen.style.display = "flex";

  // Enter key support
  document.getElementById("loginKey")?.addEventListener("keypress", e => {
    if (e.key === "Enter") login();
  });

  document.getElementById("originalUrl")?.addEventListener("keypress", e => {
    if (e.key === "Enter") createLink();
  });

  document.getElementById("customSlug")?.addEventListener("keypress", e => {
    if (e.key === "Enter") createLink();
  });
});
