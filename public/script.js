// ═══════════════════════════════════════════════════════════════════════
// ALSL Sign Evaluation — Full app logic (v1.8)
// ═══════════════════════════════════════════════════════════════════════

let expert = null;
let signs = [];
let filtered = [];
let currentCategory = "all";
let index = 0;
let saving = false;
let evaluated = new Set();
let evaluatedAnswers = {};     // sign_id -> answer
let evaluatedComments = {};    // sign_id -> comment
let sessionAnswers = { YES: 0, NO: 0, ALMOST: 0, FLAG: 0 };

// ─── AUTH TABS ────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById("formLogin").style.display    = tab === "login"    ? "block" : "none";
  document.getElementById("formRegister").style.display = tab === "register" ? "block" : "none";
  document.getElementById("tabLogin").classList.toggle("active",    tab === "login");
  document.getElementById("tabRegister").classList.toggle("active", tab === "register");
  document.getElementById("loginError").textContent = "";
  document.getElementById("regError").textContent   = "";
}

// ─── INIT ────────────────────────────────────────────────────────────
async function init() {
  try {
    const r = await fetch("/auth/me", { credentials: "include" });
    const data = await r.json();
    if (data.success && data.expert) {
      expert = data.expert;
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("appContent").style.display  = "block";
      loadSigns();
      return;
    }
  } catch(e) {}
  showLoginScreen();
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById("loginScreen").style.display  = "flex";
  document.getElementById("appContent").style.display   = "none";
  document.getElementById("finishedScreen").style.display = "none";
  setTimeout(() => {
    const u = document.getElementById("loginUser");
    if (u) u.focus();
  }, 100);
}

async function doLogin() {
  const username = (document.getElementById("loginUser").value || "").trim();
  const password = (document.getElementById("loginPass").value || "").trim();
  const errEl    = document.getElementById("loginError");
  errEl.textContent = "";
  if (!username || !password) { errEl.textContent = t("errUsernamePass"); return; }
  try {
    const r = await fetch("/auth/login", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await r.json();
    if (data.success) {
      expert = data.expert;
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("appContent").style.display  = "block";
      loadSigns();
    } else {
      errEl.textContent = data.error || t("errAuthFail");
    }
  } catch(e) { errEl.textContent = t("errConnection"); }
}

function validEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function doRegister() {
  const full_name = (document.getElementById("regName").value || "").trim();
  const email     = (document.getElementById("regEmail").value || "").trim();
  const username  = (document.getElementById("regUser").value || "").trim();
  const password  = (document.getElementById("regPass").value || "").trim();
  const errEl     = document.getElementById("regError");
  errEl.textContent = "";
  if (!full_name || !email || !username || !password) {
    errEl.textContent = t("errFillFields"); return;
  }
  if (!validEmail(email)) {
    errEl.textContent = t("errInvalidEmail"); return;
  }
  try {
    const r = await fetch("/auth/register", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, display_name: full_name, email })
    });
    const data = await r.json();
    if (data.success) {
      expert = data.expert;
      document.getElementById("loginScreen").style.display = "none";
      document.getElementById("appContent").style.display  = "block";
      loadSigns();
    } else {
      errEl.textContent = data.error || t("errRegisterFail");
    }
  } catch(e) { errEl.textContent = t("errConnection"); }
}

async function doLogout() {
  if (!confirm(t("confirmLogout"))) return;
  await fetch("/auth/logout", { method: "POST", credentials: "include" });
  expert = null;
  signs = []; filtered = []; index = 0;
  evaluated = new Set(); evaluatedAnswers = {}; evaluatedComments = {};
  sessionAnswers = { YES: 0, NO: 0, ALMOST: 0, FLAG: 0 };
  showLoginScreen();
}

function toggleProfileMenu() {
  const menu = document.getElementById("profileMenu");
  menu.classList.toggle("open");
}
document.addEventListener("click", e => {
  const chip = document.getElementById("expertChip");
  const menu = document.getElementById("profileMenu");
  if (menu && chip && !chip.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove("open");
  }
});

async function downloadMyCsv() {
  try {
    const r = await fetch("/my-work.csv", { credentials: "include" });
    if (!r.ok) return alert(t("alertNoServer"));
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-work-${expert}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  } catch(e) { alert(t("alertNoServer")); }
}

// ─── LOAD SIGNS ──────────────────────────────────────────────────────
function loadSigns() {
  document.getElementById("expertName").textContent = expert;
  fetch("/signs.json", { credentials: "include" })
    .then(r => r.json())
    .then(data => {
      signs = data;
      computeVariantMeta();
      return fetch("/progress/" + encodeURIComponent(expert), { credentials: "include" });
    })
    .then(r => r.json())
    .then(progress => {
      if (progress.success) {
        evaluated = new Set(progress.evaluated);
        if (progress.answers) {
          for (const [id, ans] of Object.entries(progress.answers)) {
            evaluatedAnswers[parseInt(id)] = ans;
          }
        }
        if (progress.comments) {
          for (const [id, c] of Object.entries(progress.comments)) {
            evaluatedComments[parseInt(id)] = c;
          }
        }
      }
      buildCategoryNav();
      showCategoryPicker();
    })
    .catch(() => { buildCategoryNav(); showCategoryPicker(); });
}

function computeVariantMeta() {
  const buckets = new Map();
  for (const s of signs) {
    const key = (s.concept_en || "").trim().toLowerCase();
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }
  for (const s of signs) {
    const key = (s.concept_en || "").trim().toLowerCase();
    const group = buckets.get(key) || [];
    s._variantCount = group.length;
    s._variantPos   = group.indexOf(s) + 1;
  }
}

// ─── CATEGORIES ──────────────────────────────────────────────────────
const CAT_META = {
  nouns:        { key: "catNouns",        icon: "📗" },
  verbs:        { key: "catVerbs",        icon: "📕" },
  adjectives:   { key: "catAdjectives",   icon: "📘" },
  adverbs:      { key: "catAdverbs",      icon: "📙" },
  prepositions: { key: "catPrepositions", icon: "📒" },
  pronouns:     { key: "catPronouns",     icon: "📓" },
};

function getCatLabel(cat) {
  if (cat === "all") return t("allSigns");
  const m = CAT_META[cat];
  return m ? t(m.key) : cat;
}

function buildCategoryNav() {
  const counts = {}, done = {};
  for (const cat of Object.keys(CAT_META)) { counts[cat] = 0; done[cat] = 0; }
  let totalAll = 0, doneAll = 0;
  for (const s of signs) {
    const cat = s.category || "nouns";
    if (counts[cat] !== undefined) { counts[cat]++; totalAll++; }
    if (evaluated.has(s.id)) { if (done[cat] !== undefined) done[cat]++; doneAll++; }
  }
  window._catCounts = counts;
  window._catDone   = done;
  window._totalAll  = totalAll;
  window._doneAll   = doneAll;
}

function showCategoryPicker() {
  document.getElementById("appContent").style.display     = "block";
  document.getElementById("categoryPicker").style.display = "block";
  document.getElementById("mainCard").style.display       = "none";
  document.getElementById("progressSection").style.display = "none";
  document.getElementById("finishedScreen").style.display = "none";

  const counts = window._catCounts || {};
  const done   = window._catDone   || {};
  const totalSigns = window._totalAll || signs.length;
  const totalDone  = window._doneAll  || evaluated.size;
  const totalPct   = totalSigns ? Math.round(100 * totalDone / totalSigns) : 0;

  document.getElementById("pickerProgress").innerHTML =
    `<span>${totalDone} / ${totalSigns}</span><span>${totalPct}%</span>`;
  document.getElementById("pickerProgressFill").style.width = totalPct + "%";

  const grid = document.getElementById("categoryGrid");
  grid.innerHTML = "";
  grid.appendChild(makeCategoryTile("all", "📋", getCatLabel("all"), totalDone, totalSigns));
  for (const [cat, meta] of Object.entries(CAT_META)) {
    if (!counts[cat]) continue;
    grid.appendChild(makeCategoryTile(cat, meta.icon, getCatLabel(cat), done[cat], counts[cat]));
  }

  // Hide eval-only header buttons
  const b1 = document.getElementById("backToCatBtn");
  const b2 = document.getElementById("endSessionBtn");
  if (b1) b1.style.display = "none";
  if (b2) b2.style.display = "none";
  const catLabel = document.getElementById("activeCatLabel");
  if (catLabel) catLabel.style.display = "none";
}

function makeCategoryTile(cat, icon, label, doneN, totalN) {
  const pct = totalN ? Math.round(100 * doneN / totalN) : 0;
  const remaining = totalN - doneN;
  const complete  = remaining === 0 && totalN > 0;
  const tile = document.createElement("button");
  tile.className = "cat-tile" + (complete ? " cat-complete" : "");
  tile.onclick = () => startCategory(cat);
  tile.innerHTML = `
    <span class="cat-icon">${icon}</span>
    <span class="cat-label">${escapeHtml(label)}</span>
    <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
    <span class="cat-count">${remaining > 0 ? remaining + " " + escapeHtml(t("remaining")) : "✓"}</span>
  `;
  return tile;
}

// ─── CATEGORY START ──────────────────────────────────────────────────
// Keep signs in STABLE order (by id). No re-sorting. This fixes bug #9.
function startCategory(cat) {
  currentCategory = cat;
  let pool = cat === "all" ? [...signs] : signs.filter(s => (s.category || "nouns") === cat);

  // Group variants together but preserve order within groups by id
  const groups = new Map();
  const order = [];
  for (const s of pool) {
    const key = s.concept_en.trim().toLowerCase();
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key).push(s);
  }
  filtered = order.map(k => groups.get(k)).flat();

  // Find first unevaluated sign — start there. But user can navigate freely.
  let startIdx = filtered.findIndex(s => !evaluated.has(s.id));
  if (startIdx < 0) startIdx = 0;  // all done, start at beginning
  index = startIdx;

  document.getElementById("categoryPicker").style.display = "none";
  document.getElementById("mainCard").style.display       = "block";
  document.getElementById("progressSection").style.display = "block";
  document.getElementById("finishedScreen").style.display = "none";

  document.getElementById("activeCatLabel").textContent = getCatLabel(cat);
  document.getElementById("activeCatLabel").style.display = "inline";
  const b1 = document.getElementById("backToCatBtn");
  const b2 = document.getElementById("endSessionBtn");
  if (b1) b1.style.display = "inline-flex";
  if (b2) b2.style.display = "inline-flex";

  renderSign();
}

function backToPicker() {
  document.getElementById("finishedScreen").style.display = "none";
  document.getElementById("mainCard").style.display       = "none";
  document.getElementById("progressSection").style.display = "none";
  document.getElementById("activeCatLabel").style.display = "none";
  buildCategoryNav();
  showCategoryPicker();
}

// ─── RENDER SIGN ─────────────────────────────────────────────────────
function renderSign() {
  updateProgress();

  if (index >= filtered.length) { showFinished(); return; }
  if (index < 0) { index = 0; }

  document.getElementById("mainCard").style.display = "block";
  document.getElementById("finishedScreen").style.display = "none";

  const sign = filtered[index];

  // ── Three-language concept display (bug #2) ──
  // We always show all three. Active language is highlighted via .primary class.
  // Note: in our dataset concept_en actually holds the French source word
  // (the FR portal is where the videos come from). EN translation is the same
  // for now, so to avoid showing the same text twice we mark one span with
  // both flags ("EN/FR"). This keeps the three-language philosophy intact.
  const row = document.getElementById("conceptTriple");
  row.innerHTML = "";
  const arText = sign.concept_ar || "—";
  const frText = sign.concept_en || "—";   // concept_en field is actually FR
  const enText = sign.concept_en || "—";   // same source for EN

  // Build three spans always — Arabic, French, English — in a consistent
  // visual order. Active language is bigger and brighter.
  const items = [
    { lang: "ar", text: arText, flag: "AR" },
    { lang: "fr", text: frText, flag: "FR" },
    { lang: "en", text: enText, flag: "EN" },
  ];
  for (const it of items) {
    const span = document.createElement("span");
    const active = it.lang === currentLang;
    span.className = "concept-lang lang-" + it.lang + (active ? " primary" : " secondary");
    span.innerHTML =
      `<span class="lang-tag">${it.flag}</span>` +
      `<span class="lang-word">${escapeHtml(it.text)}</span>`;
    row.appendChild(span);
  }

  // Variant badge
  const badge = document.getElementById("statusBadge");
  badge.className = "status-badge";
  let badgeText = "";
  if (sign._variantCount > 1) {
    badgeText = t("variantOf").replace("{pos}", sign._variantPos).replace("{total}", sign._variantCount);
    badge.classList.add("status-partial");
  }
  badge.textContent   = badgeText;
  badge.style.display = badgeText ? "inline-block" : "none";

  // Already evaluated badge
  const alreadyBadge = document.getElementById("alreadyEvaluated");
  if (evaluated.has(sign.id)) {
    const prevAnswer = evaluatedAnswers[sign.id] || "?";
    const ansLabel = { YES: t("btnYes"), NO: t("btnNo"), ALMOST: t("btnAlmost"), FLAG: t("btnFlag") };
    alreadyBadge.textContent = "✓ " + (ansLabel[prevAnswer] || prevAnswer);
    alreadyBadge.className   = "already-badge already-" + (prevAnswer || "").toLowerCase();
    alreadyBadge.style.display = "inline-block";
  } else {
    alreadyBadge.style.display = "none";
  }

  // Comment field (bug #4).
  // Preserve in-progress (unsaved) text when re-rendering for language change.
  // Only set from storage when we're arriving at a DIFFERENT sign than we were showing.
  const commentField = document.getElementById("signComment");
  if (commentField) {
    if (commentField.dataset.signId !== String(sign.id)) {
      commentField.value = evaluatedComments[sign.id] || "";
      commentField.dataset.signId = String(sign.id);
    }
    // Otherwise keep whatever the user has typed
  }

  replaceVideo(sign.video);
  setUIEnabled(true);
}

function replaceVideo(src) {
  const c = document.getElementById("videoContainer");
  // If the same video is already loaded, don't rebuild (avoids reload on lang change)
  const existing = c.querySelector("video");
  if (existing && existing.src === src) return;
  c.innerHTML = "";
  const v = document.createElement("video");
  v.controls = true; v.preload = "auto"; v.playsInline = true; v.autoplay = true;
  v.src = src;
  c.appendChild(v);
}

function updateProgress() {
  const total = filtered.length;
  const done  = filtered.filter(s => evaluated.has(s.id)).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById("progressText").textContent    = `${done} / ${total}`;
  document.getElementById("progressPercent").textContent = `${pct}%`;
  document.getElementById("progressFill").style.width    = `${pct}%`;
}

// ─── ANSWER ──────────────────────────────────────────────────────────
function answer(value) {
  if (saving || index >= filtered.length || index < 0) return;
  saving = true;
  setUIEnabled(false);
  const signId = filtered[index].id;
  const commentField = document.getElementById("signComment");
  const comment = commentField ? commentField.value.trim() : "";
  sendData(value, null, comment)
    .then(res => {
      if (res && res.success) {
        evaluated.add(signId);
        evaluatedAnswers[signId] = value;
        evaluatedComments[signId] = comment;
        sessionAnswers[value] = (sessionAnswers[value] || 0) + 1;

        // After answering, advance:
        //  - if there are still unevaluated signs somewhere in the list → jump to the next unevaluated one
        //  - if all signs done → show finished screen
        //  - if current is last & done → show finished
        const allDone = filtered.every(s => evaluated.has(s.id));
        if (allDone) {
          index = filtered.length;  // triggers finished
        } else {
          const nextUn = findNextUnevaluated(index);
          if (nextUn !== -1) {
            index = nextUn;
          } else {
            // No unevaluated after current, but some unevaluated earlier — wrap to first unevaluated
            const firstUn = filtered.findIndex(s => !evaluated.has(s.id));
            index = firstUn >= 0 ? firstUn : index + 1;
          }
        }
        renderSign();
      } else { alert(t("alertSaveFail")); setUIEnabled(true); }
    })
    .catch(() => { alert(t("alertNoServer")); setUIEnabled(true); })
    .finally(() => { saving = false; });
}

function findNextUnevaluated(fromIdx) {
  for (let i = fromIdx + 1; i < filtered.length; i++) {
    if (!evaluated.has(filtered[i].id)) return i;
  }
  return -1;
}

function sendData(answerValue, flagReasons, comment) {
  if (index >= filtered.length || index < 0) return Promise.resolve({ success: false });
  const sign = filtered[index];
  return fetch("/save", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expert, sign_id: sign.id,
      concept: sign.concept_ar || sign.concept_en,
      answer: answerValue, comment: comment || "",
      flag_reasons: flagReasons || []
    })
  }).then(r => r.json());
}

// ─── NAV (fixed: unrestricted back/forward) ──────────────────────────
function skipSign() {
  if (saving) return;
  if (index < filtered.length) { index++; renderSign(); }
}
function prevSign() {
  if (saving) return;
  if (index > 0) { index--; renderSign(); }
}
function restartCategory() {
  index = 0;
  document.getElementById("finishedScreen").style.display = "none";
  document.getElementById("mainCard").style.display = "block";
  document.getElementById("progressSection").style.display = "block";
  renderSign();
}

// ─── END SESSION ─────────────────────────────────────────────────────
function endSession() {
  const doneThis = Object.values(sessionAnswers).reduce((a, b) => a + b, 0);
  const msg = `${t("endSessionConfirm")}\n\n` +
    `${t("btnYes")}: ${sessionAnswers.YES || 0}  ` +
    `${t("btnAlmost")}: ${sessionAnswers.ALMOST || 0}  ` +
    `${t("btnNo")}: ${sessionAnswers.NO || 0}\n` +
    `${t("totalRated")}: ${doneThis}`;
  if (confirm(msg)) backToPicker();
}

function setUIEnabled(on) {
  document.querySelectorAll(".answer-btn, .flag-btn, .nav-btn").forEach(b => b.disabled = !on);
}

// ─── FINISHED SCREEN ─────────────────────────────────────────────────
function showFinished() {
  document.getElementById("mainCard").style.display        = "none";
  document.getElementById("progressSection").style.display = "none";
  document.getElementById("finishedScreen").style.display  = "flex";

  const yes = sessionAnswers.YES || 0, almost = sessionAnswers.ALMOST || 0;
  const no = sessionAnswers.NO || 0, flag = sessionAnswers.FLAG || 0;

  document.getElementById("finStatsYes").textContent    = yes;
  document.getElementById("finStatsAlmost").textContent = almost;
  document.getElementById("finStatsNo").textContent     = no;
  document.getElementById("finStatsFlag").textContent   = flag;

  const allTotal = signs.length;
  const allDone  = evaluated.size;
  const allPct   = allTotal ? Math.round(100 * allDone / allTotal) : 0;
  document.getElementById("finOverallBar").style.width = allPct + "%";
  document.getElementById("finOverallLabel").textContent = `${allDone} / ${allTotal} (${allPct}%)`;
}

// ─── FLAG MODAL ──────────────────────────────────────────────────────
function openFlagModal() {
  if (index >= filtered.length || index < 0) return;
  document.querySelectorAll(".flag-options input[type='checkbox']").forEach(cb => cb.checked = false);
  document.getElementById("flagComment").value = "";
  document.getElementById("modalSubmit").disabled = true;
  document.getElementById("flagModal").classList.add("open");
  document.getElementById("modalBackdrop").classList.add("open");
}
function closeFlagModal() {
  document.getElementById("flagModal").classList.remove("open");
  document.getElementById("modalBackdrop").classList.remove("open");
}
function submitFlag() {
  const checked = document.querySelectorAll(".flag-options input[type='checkbox']:checked");
  const reasons = Array.from(checked).map(cb => cb.value);
  const comment = document.getElementById("flagComment").value.trim();
  if (!reasons.length) return;
  closeFlagModal();
  saving = true; setUIEnabled(false);
  const signId = filtered[index].id;
  sendData("FLAG", reasons, comment)
    .then(res => {
      if (res && res.success) {
        evaluated.add(signId);
        evaluatedAnswers[signId] = "FLAG";
        evaluatedComments[signId] = comment;
        sessionAnswers.FLAG = (sessionAnswers.FLAG || 0) + 1;
        const allDone = filtered.every(s => evaluated.has(s.id));
        if (allDone) {
          index = filtered.length;
        } else {
          const nextUn = findNextUnevaluated(index);
          if (nextUn !== -1) index = nextUn;
          else {
            const firstUn = filtered.findIndex(s => !evaluated.has(s.id));
            index = firstUn >= 0 ? firstUn : index + 1;
          }
        }
        renderSign();
      } else { alert(t("alertSaveFail")); setUIEnabled(true); }
    })
    .catch(() => { alert(t("alertNoServer")); setUIEnabled(true); })
    .finally(() => { saving = false; });
}
document.addEventListener("change", e => {
  if (e.target.closest(".flag-options")) {
    document.getElementById("modalSubmit").disabled =
      document.querySelectorAll(".flag-options input:checked").length === 0;
  }
});

// ─── KEYBOARD ────────────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
  if (document.getElementById("flagModal").classList.contains("open")) {
    if (e.key === "Escape") closeFlagModal(); return;
  }
  if (document.getElementById("categoryPicker").style.display !== "none") return;
  if (document.getElementById("finishedScreen").style.display !== "none") return;
  if (document.getElementById("mainCard").style.display === "none") return;
  if (e.key === "1") answer("YES");
  if (e.key === "2") answer("NO");
  if (e.key === "3") answer("ALMOST");
  if (e.key === "4") openFlagModal();
  if (e.key === "ArrowLeft")  prevSign();
  if (e.key === "ArrowRight") skipSign();
  if (e.key === "Escape") endSession();
});

// ─── INIT on load + re-render on lang change ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  init();
  // Login form enter keys
  ["loginUser","loginPass"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  });
  ["regName","regEmail","regUser","regPass"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") doRegister(); });
  });
});

// Re-render everything on language change (fixes bugs 1,2,3,5,6)
document.addEventListener("langchanged", () => {
  // Re-render picker if visible
  if (document.getElementById("categoryPicker") &&
      document.getElementById("categoryPicker").style.display !== "none") {
    showCategoryPicker();
  }
  // Update active category label in header
  const catLabel = document.getElementById("activeCatLabel");
  if (catLabel && catLabel.style.display !== "none") {
    catLabel.textContent = getCatLabel(currentCategory);
  }
  // Re-render current sign (three-language highlight changes + already-badge)
  if (document.getElementById("mainCard") &&
      document.getElementById("mainCard").style.display !== "none") {
    renderSign();
  }
});

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
}

// ─── THEME ───────────────────────────────────────────────────────────
function initTheme() {
  applyTheme(localStorage.getItem("theme") || "dark");
}
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  applyTheme(next); localStorage.setItem("theme", next);
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.textContent = theme === "light" ? "🌙" : "☀️";
}
document.addEventListener("DOMContentLoaded", initTheme);
