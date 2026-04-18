// ===== CONSTANTS =====
const API_BASE = "";
let ADMIN_KEY = "";

// ===== AUTH =====
function login() {
  const key = document.getElementById("loginKey").value.trim();
  if (!key) return;

  ADMIN_KEY = key;
  sessionStorage.setItem("adminKey", key);

  // Try loading links to verify key
  verifyAndLogin();
}

async function verifyAndLogin() {
  try {
    const res = await fetch(`/api/links?adminKey=${encodeURIComponent(ADMIN_KEY)}`);
    const data = await res.json();

    if (res.status === 401) {
      document.getElementById("loginError").classList.remove("hidden");
      ADMIN_KEY = "";
      sessionStorage.removeItem("adminKey");
      return;
    }

    document.getElementById("loginError").classList.add("hidden");
    showDashboard(data.links || []);
  } catch (err) {
    document.getElementById("loginError").classList.remove("hidden");
  }
}

function logout() {
  ADMIN_KEY = "";
  sessionStorage.removeItem("adminKey");
  document.getElementById("dashboardScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginScreen").classList.add("active");
  document.getElementById("loginKey").value = "";
}

function showDashboard(links) {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("dashboardScreen").classList.remove("hidden");
  renderLinks(links);
}

// ===== CREATE LINK =====
async function createLink() {
  const originalUrl = document.getElementById("originalUrl").value.trim();
  const customSlug = document.getElementById("customSlug").value.trim();
  const password = document.getElementById("linkPassword").value.trim();

  const errorEl = document.getElementById("createError");
  const resultBox = document.getElementById("resultBox");
  const btn = document.getElementById("createBtn");
  const btnText = document.getElementById("createBtnText");
  const btnLoader = document.getElementById("createBtnLoader");

  errorEl.classList.add("hidden");
  resultBox.classList.add("hidden");

  if (!originalUrl) {
    errorEl.textContent = "❌ Please enter a destination URL";
    errorEl.classList.remove("hidden");
    return;
  }

  // Set loading state
  btn.disabled = true;
  btnText.classList.add("hidden");
  btnLoader.classList.remove("hidden");

  try {
    const res = await fetch("/api/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalUrl,
        customSlug: customSlug || undefined,
        password: password || undefined,
        adminKey: ADMIN_KEY,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = "❌ " + (data.error || "Failed to create link");
      errorEl.classList.remove("hidden");
      return;
    }

    // Show success
    document.getElementById("resultUrl").textContent = data.shortUrl;
    document.getElementById("resultOriginal").textContent =
      "→ " + data.originalUrl;
    resultBox.classList.remove("hidden");

    // Clear form
    document.getElementById("originalUrl").value = "";
    document.getElementById("customSlug").value = "";
    document.getElementById("linkPassword").value = "";

    // Reload links
    loadLinks();
  } catch (err) {
    errorEl.textContent = "❌ Network error. Please try again.";
    errorEl.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btnText.classList.remove("hidden");
    btnLoader.classList.add("hidden");
  }
}

// ===== LOAD LINKS =====
async function loadLinks() {
  const loaderEl = document.getElementById("linksLoader");
  const tableEl = document.getElementById("linksTable");
  const emptyEl = document.getElementById("linksEmpty");

  loaderEl.classList.remove("hidden");
  tableEl.classList.add("hidden");
  emptyEl.classList.add("hidden");

  try {
    const res = await fetch(
      `/api/links?adminKey=${encodeURIComponent(ADMIN_KEY)}`
    );
    const data = await res.json();

    if (!res.ok) {
      loaderEl.classList.add("hidden");
      return;
    }

    renderLinks(data.links || []);
  } catch (err) {
    loaderEl.classList.add("hidden");
    console.error("Failed to load links:", err);
  }
}

function renderLinks(links) {
  const loaderEl = document.getElementById("linksLoader");
  const tableEl = document.getElementById("linksTable");
  const emptyEl = document.getElementById("linksEmpty");
  const bodyEl = document.getElementById("linksBody");

  loaderEl.classList.add("hidden");

  // Update stats
  const today = new Date().toDateString();
  const todayCount = links.filter(
    (l) => new Date(l.created_at).toDateString() === today
  ).length;
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);

  document.getElementById("totalLinks").textContent = links.length;
  document.getElementById("totalClicks").textContent = totalClicks;
  document.getElementById("todayLinks").textContent = todayCount;

  if (links.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  tableEl.classList.remove("hidden");

  bodyEl.innerHTML = links
    .map((link) => {
      const shortUrl = `https://thedigita-2011.com/r/${link.slug}`;
      const date = new Date(link.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      return `
      <tr>
        <td class="td-short">/r/${escapeHtml(link.slug)}</td>
        <td class="td-original" title="${escapeHtml(link.original_url)}">
          ${escapeHtml(link.original_url)}
        </td>
        <td class="td-clicks">${link.clicks || 0}</td>
        <td class="td-date">${date}</td>
        <td class="td-actions">
          <button class="btn-sm btn-visit" onclick="window.open('${escapeHtml(shortUrl)}', '_blank')">Visit</button>
          <button class="btn-sm btn-copy-row" onclick="copyText('${escapeHtml(shortUrl)}', this)">Copy</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

// ===== UTILITIES =====
function copyLink() {
  const url = document.getElementById("resultUrl").textContent;
  copyText(url);
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "✓ Copied!";
      setTimeout(() => (btn.textContent = original), 2000);
    }
  } catch {
    // Fallback
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

// ===== ENTER KEY SUPPORT =====
document.addEventListener("DOMContentLoaded", () => {
  // Auto-login from session
  const savedKey = sessionStorage.getItem("adminKey");
  if (savedKey) {
    ADMIN_KEY = savedKey;
    verifyAndLogin();
  }

  // Enter key on login
  document.getElementById("loginKey")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") login();
  });

  // Enter key on URL field
  document.getElementById("originalUrl")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") createLink();
  });
});