const STATUS_LABELS = {
  submitted: "Yuborilgan",
  reviewed: "Ko'rib chiqilgan",
  invited: "Taklif qilingan",
  rejected: "Rad etilgan",
};
const STATUS_TONE = {
  submitted: { pill: "status-submitted", hex: "#3B82F6" },
  reviewed: { pill: "status-reviewed", hex: "#F59E0B" },
  invited: { pill: "status-invited", hex: "#10B981" },
  rejected: { pill: "status-rejected", hex: "#EF4444" },
};
const ROLE_LABELS = { super_admin: "Super Admin", admin: "Admin", hr: "HR menejer" };
const NEXT_STATUS = { submitted: ["reviewed"], reviewed: ["invited", "rejected"] };
const TAB_TITLES = { stats: "Statistika", applications: "Arizalar", positions: "Lavozimlar", texts: "Matnlar", employees: "Xodimlar" };
const CAN_MANAGE_ROLES = ["super_admin", "admin"];

const state = {
  token: localStorage.getItem("lazana_token") || null,
  role: localStorage.getItem("lazana_role") || null,
  fullName: localStorage.getItem("lazana_full_name") || null,
  categories: [],
  applicationsPage: 1,
};

function statusPill(status) {
  const tone = STATUS_TONE[status] || { pill: "status-neutral" };
  return el("span", { class: `status-pill ${tone.pill}` }, [el("span", { class: "dot" }), STATUS_LABELS[status] || status]);
}

function initials(name) {
  if (!name) return "A";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

async function api(path, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  if (opts.body && !(opts.body instanceof Blob)) headers["Content-Type"] = "application/json";

  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    logout();
    throw new Error("Sessiya tugadi, qayta kiring.");
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Xatolik: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  return contentType.includes("application/json") ? res.json() : res;
}

function logout() {
  state.token = null;
  state.role = null;
  state.fullName = null;
  localStorage.removeItem("lazana_token");
  localStorage.removeItem("lazana_role");
  localStorage.removeItem("lazana_full_name");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

function showModal(contentNode) {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  const backdrop = el("div", { class: "modal-backdrop", onclick: (e) => { if (e.target === backdrop) root.innerHTML = ""; } });
  const modal = el("div", { class: "modal" }, [contentNode]);
  backdrop.append(modal);
  root.append(backdrop);
}
function closeModal() { document.getElementById("modal-root").innerHTML = ""; }

function openConfirm({ title = "Tasdiqlash", message, confirmText = "Ha", cancelText = "Bekor qilish", danger = false }) {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    root.innerHTML = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      root.innerHTML = "";
      resolve(result);
    };
    const backdrop = el("div", { class: "modal-backdrop", onclick: (e) => { if (e.target === backdrop) finish(false); } });
    const body = el("div", { class: "modal modal-confirm" }, [
      el("h2", {}, title),
      el("p", { class: "modal-message" }, message),
      el("div", { class: "actions" }, [
        el("button", { class: danger ? "btn-danger" : "btn-primary", onclick: () => finish(true) }, confirmText),
        el("button", { class: "btn-close", onclick: () => finish(false) }, cancelText),
      ]),
    ]);
    backdrop.append(body);
    root.append(backdrop);
  });
}

function openPrompt({ title, message, placeholder = "" }) {
  return new Promise((resolve) => {
    const root = document.getElementById("modal-root");
    root.innerHTML = "";
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      root.innerHTML = "";
      resolve(result);
    };
    const textarea = el("textarea", { placeholder, rows: 3 });
    const backdrop = el("div", { class: "modal-backdrop", onclick: (e) => { if (e.target === backdrop) finish(null); } });
    const fields = [el("h2", {}, title)];
    if (message) fields.push(el("p", { class: "modal-message" }, message));
    fields.push(
      el("div", { class: "field" }, [textarea]),
      el("div", { class: "actions" }, [
        el("button", { class: "btn-primary", onclick: () => finish(textarea.value.trim() || "") }, "Davom etish"),
        el("button", { class: "btn-close", onclick: () => finish(null) }, "Bekor qilish"),
      ])
    );
    backdrop.append(el("div", { class: "modal modal-confirm" }, fields));
    root.append(backdrop);
    textarea.focus();
  });
}

// --- Login ---
document.getElementById("toggle-password").addEventListener("click", () => {
  const input = document.getElementById("login-password");
  const eyeIcon = document.getElementById("eye-icon");
  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  eyeIcon.innerHTML = showing
    ? '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>'
    : '<path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.36 5.6A10.8 10.8 0 0 1 12 5c7 0 11 7 11 7a13.3 13.3 0 0 1-3.4 4.02M6.3 6.3A13.4 13.4 0 0 0 1 12s4 7 11 7a10.7 10.7 0 0 0 4.15-.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errorBox = document.getElementById("login-error");
  const submitBtn = document.getElementById("login-submit");
  const btnLabel = submitBtn.querySelector(".btn-label");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");
  errorBox.textContent = "";
  submitBtn.disabled = true;
  btnLabel.textContent = "Tekshirilmoqda...";
  btnSpinner.classList.remove("hidden");
  try {
    const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    state.token = res.access_token;
    state.role = res.role;
    state.fullName = res.full_name || null;
    localStorage.setItem("lazana_token", state.token);
    localStorage.setItem("lazana_role", state.role);
    if (state.fullName) localStorage.setItem("lazana_full_name", state.fullName);
    else localStorage.removeItem("lazana_full_name");
    await enterDashboard();
  } catch (err) {
    errorBox.textContent = err.message;
    submitBtn.disabled = false;
    btnLabel.textContent = "Kirish";
    btnSpinner.classList.add("hidden");
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

// --- Tabs ---
function activateTab(tabName) {
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
  const panel = document.getElementById(`tab-${tabName}`);
  if (panel) panel.classList.remove("hidden");
  document.getElementById("breadcrumb-current").textContent = TAB_TITLES[tabName] || tabName;
  if (tabName === "applications") loadApplications(state.applicationsPage || 1);
  if (tabName === "stats") loadStats();
  if (tabName === "positions") loadPositions();
  if (tabName === "texts") loadTexts();
  if (tabName === "employees") loadEmployees();
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => activateTab(btn.dataset.tab));
});

async function enterDashboard() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  const roleLabel = ROLE_LABELS[state.role] || state.role;
  document.getElementById("admin-role-badge").textContent = roleLabel;
  document.getElementById("export-btn").style.display = CAN_MANAGE_ROLES.includes(state.role) ? "inline-block" : "none";

  const displayName = state.fullName || roleLabel;
  const initialsText = initials(state.fullName || roleLabel);
  for (const id of ["sidebar-avatar", "topbar-avatar"]) document.getElementById(id).textContent = initialsText;
  document.getElementById("sidebar-user-name").textContent = displayName;
  document.getElementById("sidebar-user-role").textContent = roleLabel;
  document.getElementById("topbar-user-name").textContent = displayName;

  await loadCategories();
  await loadStats();
}

async function loadCategories() {
  state.categories = await api("/api/categories");
  const selects = [document.getElementById("filter-category"), document.getElementById("positions-category-filter")];
  for (const sel of selects) {
    const current = sel.value;
    sel.innerHTML = '<option value="">Barcha yo\'nalishlar</option>';
    for (const c of state.categories) {
      sel.append(el("option", { value: c.id }, `${c.code}) ${c.name_uz}`));
    }
    sel.value = current;
  }
}

// --- Applications ---
document.getElementById("filter-apply-btn").addEventListener("click", () => loadApplications(1));
document.getElementById("export-btn").addEventListener("click", exportCsv);

function buildApplicationsQuery(page) {
  const params = new URLSearchParams();
  const statusVal = document.getElementById("filter-status").value;
  const categoryVal = document.getElementById("filter-category").value;
  const searchVal = document.getElementById("filter-search").value.trim();
  if (statusVal) params.set("status", statusVal);
  if (categoryVal) params.set("category_id", categoryVal);
  if (searchVal) params.set("search", searchVal);
  params.set("page", page);
  params.set("page_size", 20);
  return params;
}

async function loadApplications(page) {
  state.applicationsPage = page;
  const params = buildApplicationsQuery(page);
  const data = await api(`/api/applications?${params.toString()}`);

  const wrap = document.getElementById("applications-table-wrap");
  const table = el("table", {}, [
    el("thead", {}, el("tr", {}, ["#", "F.I.Sh.", "Telefon", "Yo'nalish/Lavozim", "Holat", "Sana"].map((h) => el("th", {}, h)))),
  ]);
  const tbody = el("tbody");
  for (const item of data.items) {
    const row = el("tr", { class: "clickable", onclick: () => openApplicationDetail(item.id) }, [
      el("td", {}, `#${item.id}`),
      el("td", {}, item.full_name || "-"),
      el("td", {}, item.phone || "-"),
      el("td", {}, `${item.category_name} / ${item.position_name}`),
      el("td", {}, statusPill(item.status)),
      el("td", {}, item.submitted_at ? new Date(item.submitted_at).toLocaleString("uz-UZ") : "-"),
    ]);
    tbody.append(row);
  }
  table.append(tbody);
  wrap.innerHTML = "";
  wrap.append(table);

  const totalPages = Math.max(1, Math.ceil(data.total / data.page_size));
  const pag = document.getElementById("applications-pagination");
  pag.innerHTML = "";
  pag.append(
    el("button", { disabled: page <= 1 ? "true" : null, onclick: () => loadApplications(page - 1) }, "← Oldingi"),
    el("span", {}, ` ${page} / ${totalPages} (jami: ${data.total}) `),
    el("button", { disabled: page >= totalPages ? "true" : null, onclick: () => loadApplications(page + 1) }, "Keyingi →")
  );
}

async function exportCsv() {
  const params = buildApplicationsQuery(1);
  params.delete("page");
  params.delete("page_size");
  const res = await fetch(`/api/export/applications.csv?${params.toString()}`, {
    headers: { Authorization: `Bearer ${state.token}` },
  });
  if (!res.ok) { showToast("Eksport qilishda xatolik yuz berdi.", "error"); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "lazana_applications.csv" });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DETAIL_ICONS = {
  person: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  book: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
};

const BASIC_FIELDS = [
  ["full_name", "F.I.Sh."], ["phone", "Telefon"], ["birth_date", "Tug'ilgan sana"],
  ["address", "Manzil", true], ["source", "Manba"],
];
const EXPERIENCE_FIELDS = [
  ["education_level", "Ma'lumoti"], ["education_institution", "Ta'lim muassasasi"],
  ["experience_years_range", "Ish staji"], ["expected_salary_range", "Kutilayotgan maosh"],
  ["computer_skills", "Kompyuter ko'nikmalari"], ["languages", "Tillar"],
  ["work_experience_text", "Mehnat faoliyati", true], ["key_skills", "Asosiy ko'nikmalar", true],
];

function formatDetailValue(app, key) {
  let value = app[key];
  if (value == null || value === "") return null;
  if (Array.isArray(value)) value = value.join(", ");
  if (key === "birth_date") value = new Date(value).toLocaleDateString("uz-UZ");
  if (key === "languages" && app.languages_other) value = `${value}, ${app.languages_other}`;
  return String(value);
}

function detailField(label, value, full = false) {
  return el("div", { class: `detail-field${full ? " full" : ""}` }, [
    el("label", {}, label),
    el("div", { class: `value${value ? "" : " muted"}` }, value || "—"),
  ]);
}

function detailCard(icon, title, badge, children) {
  return el("div", { class: "card detail-card" }, [
    el("div", { class: "detail-card-header" }, [
      el("div", { class: "detail-card-icon", html: DETAIL_ICONS[icon] }),
      el("div", { class: "detail-card-title" }, title),
      badge != null ? el("span", { class: "detail-card-badge" }, String(badge)) : null,
    ]),
    ...[].concat(children),
  ]);
}

function historyItem(item) {
  return el("div", { class: "history-item" }, [
    el("div", { class: "transition" }, [
      item.old_status ? statusPill(item.old_status) : el("span", { class: "status-pill status-neutral" }, [el("span", { class: "dot" }), "Yaratildi"]),
      item.old_status ? el("span", { class: "transition-arrow" }, "→") : null,
      statusPill(item.new_status),
    ]),
    el("div", { class: "who" }, item.changed_by_name || "Tizim"),
    el("div", { class: "when" }, new Date(item.changed_at).toLocaleString("uz-UZ")),
    item.comment ? el("div", { class: "comment" }, item.comment) : null,
  ]);
}

async function openApplicationDetail(id) {
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === "applications"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
  document.getElementById("tab-application-detail").classList.remove("hidden");
  document.getElementById("breadcrumb-current").textContent = `Ariza #${id}`;

  const container = document.getElementById("application-detail-content");
  container.innerHTML = "";
  container.append(el("div", { class: "texts-loading" }, "Yuklanmoqda..."));

  let app;
  try {
    app = await api(`/api/applications/${id}`);
  } catch (err) {
    container.innerHTML = "";
    container.append(el("div", { class: "empty-state" }, [
      el("div", { class: "empty-state-icon" }, "⚠"),
      el("p", {}, err.message || "Arizani yuklashda xatolik yuz berdi."),
    ]));
    return;
  }
  renderApplicationDetail(app);
}

function renderApplicationDetail(app) {
  document.getElementById("breadcrumb-current").textContent = `Ariza #${app.id}`;
  const container = document.getElementById("application-detail-content");
  container.innerHTML = "";

  const backBtn = el("button", { class: "detail-back-btn", title: "Orqaga", onclick: () => activateTab("applications"), html: DETAIL_ICONS.back });

  const titleGroup = el("div", { class: "detail-title-group" }, [
    el("h1", {}, [app.full_name || "Noma'lum nomzod", statusPill(app.status)]),
    el("p", {}, `#${app.id} · ${app.category_name} / ${app.position_name}`),
  ]);

  const actions = el("div", { class: "detail-actions" });
  if (CAN_MANAGE_ROLES.includes(state.role)) {
    for (const target of NEXT_STATUS[app.status] || []) {
      actions.append(el("button", { class: "btn-primary", onclick: () => changeStatus(app.id, target) }, `→ ${STATUS_LABELS[target]}`));
    }
    actions.append(el("button", { class: "btn-danger", onclick: () => deleteApplication(app) }, "O'chirish"));
  }

  const header = el("div", { class: "detail-header" }, [
    el("div", { class: "detail-header-left" }, [backBtn, titleGroup]),
    actions,
  ]);

  const basicFieldsNode = el("div", { class: "detail-fields-grid" },
    BASIC_FIELDS.map(([key, label, full]) => detailField(label, formatDetailValue(app, key), full))
  );
  const experienceFieldsNode = el("div", { class: "detail-fields-grid" },
    EXPERIENCE_FIELDS.map(([key, label, full]) => detailField(label, formatDetailValue(app, key), full))
  );

  const metaCard = detailCard("info", "Metama'lumotlar", null, [
    el("div", { class: "meta-list" }, [
      el("div", { class: "meta-row" }, [el("span", { class: "k" }, "Yuborilgan"), el("span", { class: "v" }, app.submitted_at ? new Date(app.submitted_at).toLocaleString("uz-UZ") : "—")]),
      el("div", { class: "meta-row" }, [el("span", { class: "k" }, "Yaratilgan"), el("span", { class: "v" }, new Date(app.created_at).toLocaleString("uz-UZ"))]),
      el("div", { class: "meta-row" }, [el("span", { class: "k" }, "Yo'nalish"), el("span", { class: "v" }, app.category_name)]),
      el("div", { class: "meta-row" }, [el("span", { class: "k" }, "Lavozim"), el("span", { class: "v" }, app.position_name)]),
    ]),
  ]);

  const historyCard = detailCard("history", "Holat tarixi", app.status_history.length, [
    app.status_history.length
      ? el("div", { class: "history-list" }, app.status_history.map(historyItem))
      : el("div", { class: "empty-state history-empty" }, [el("p", {}, "Holat tarixi hali yo'q")]),
  ]);

  const grid = el("div", { class: "detail-grid" }, [
    el("div", { class: "detail-col-main" }, [
      detailCard("person", "Asosiy ma'lumotlar", null, [basicFieldsNode]),
      detailCard("book", "Ta'lim, tajriba va ko'nikmalar", null, [experienceFieldsNode]),
    ]),
    el("div", { class: "detail-col-side" }, [metaCard, historyCard]),
  ]);

  container.append(header, grid);
}

async function changeStatus(id, newStatus) {
  const comment = await openPrompt({
    title: `«${STATUS_LABELS[newStatus]}» holatiga o'tkazish`,
    message: "Izoh (ixtiyoriy):",
  });
  if (comment === null) return;
  try {
    await api(`/api/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ new_status: newStatus, comment: comment || null }),
    });
    showToast(`Holat «${STATUS_LABELS[newStatus]}»ga o'zgartirildi.`, "success");
    openApplicationDetail(id);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteApplication(app) {
  const confirmed = await openConfirm({
    title: "Arizani o'chirish",
    message: `#${app.id} — ${app.full_name || "nomzod"} arizasini butunlay o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi. O'chirilgach, nomzod kutish muddatisiz qayta ariza topshira oladi.`,
    confirmText: "O'chirish",
    danger: true,
  });
  if (!confirmed) return;
  try {
    await api(`/api/applications/${app.id}`, { method: "DELETE" });
    showToast("Ariza o'chirildi.", "success");
    activateTab("applications");
  } catch (err) {
    showToast(err.message || "O'chirishda xatolik yuz berdi.", "error");
  }
}

// --- Stats ---
const ICONS = {
  total: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  week: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  month: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  category: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
};

function statCard(tone, icon, value, label) {
  return el("div", { class: "card stat-card" }, [
    el("div", { class: "stat-top" }, [el("div", { class: `icon-circle tone-${tone}`, html: icon })]),
    el("div", { class: "value" }, String(value)),
    el("div", { class: "label" }, label),
  ]);
}

async function loadStats() {
  const data = await api("/api/stats/summary");

  const badge = document.getElementById("applications-nav-badge");
  const submittedCount = data.by_status.submitted || 0;
  badge.textContent = String(submittedCount);
  badge.classList.toggle("hidden", submittedCount === 0);

  const container = document.getElementById("stats-content");
  container.innerHTML = "";
  container.append(
    statCard("indigo", ICONS.total, data.total, "Jami arizalar"),
    statCard("info", ICONS.week, data.last_7_days, "Oxirgi 7 kun"),
    statCard("success", ICONS.month, data.last_30_days, "Oxirgi 30 kun"),
    statCard("warning", ICONS.category, Object.keys(data.by_category).length, "Faol yo'nalishlar")
  );

  const charts = document.getElementById("stats-charts");
  charts.innerHTML = "";
  charts.append(
    breakdownCard(
      "Holat bo'yicha",
      "Arizalarning joriy holati taqsimoti",
      Object.entries(data.by_status).map(([k, v]) => ({ label: STATUS_LABELS[k] || k, value: v, color: (STATUS_TONE[k] || {}).hex || "#94A3B8" }))
    ),
    breakdownCard(
      "Yo'nalish bo'yicha",
      "Kategoriyalar kesimida arizalar soni",
      Object.entries(data.by_category).map(([k, v], i) => ({ label: k, value: v, color: ["#4F46E5", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#6366F1"][i % 6] }))
    )
  );
}

function breakdownCard(title, subtitle, rows) {
  const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
  const list = el(
    "ul",
    { class: "breakdown-list" },
    rows.map((r) =>
      el("li", {}, [
        el("span", { class: "dot", style: `background:${r.color}` }),
        el("span", { class: "b-label" }, r.label),
        el("span", { class: "b-bar-track" }, [el("span", { class: "b-bar-fill", style: `width:${Math.round((r.value / total) * 100)}%;background:${r.color}` })]),
        el("span", { class: "b-value" }, String(r.value)),
      ])
    )
  );
  return el("div", { class: "card breakdown-card" }, [
    el("div", { class: "card-title" }, title),
    el("div", { class: "card-sub" }, subtitle),
    rows.length ? list : el("div", { class: "card-sub" }, "Ma'lumot yo'q"),
  ]);
}

// --- Positions ---
document.getElementById("positions-category-filter").addEventListener("change", () => loadPositions());
document.getElementById("position-add-btn").addEventListener("click", openAddPositionModal);

async function loadPositions() {
  const categoryId = document.getElementById("positions-category-filter").value;
  const query = categoryId ? `?category_id=${categoryId}` : "";
  const positions = await api(`/api/positions${query}`);
  const wrap = document.getElementById("positions-table-wrap");
  const table = el("table", {}, [el("thead", {}, el("tr", {}, ["Nomi (UZ)", "Nomi (RU)", "Holat", ""].map((h) => el("th", {}, h))))]);
  const tbody = el("tbody");
  for (const p of positions) {
    const actions = el("div", { class: "row-actions" });
    if (CAN_MANAGE_ROLES.includes(state.role)) {
      actions.append(
        el("button", { title: "Tahrirlash", onclick: () => openEditPositionModal(p) }, "✏️"),
        el("button", { class: "btn-secondary", onclick: () => togglePosition(p) }, p.is_active ? "Nofaollashtirish" : "Faollashtirish"),
        el("button", { title: "O'chirish", onclick: () => deletePosition(p) }, "🗑")
      );
    }
    tbody.append(
      el("tr", {}, [
        el("td", {}, p.name_uz),
        el("td", {}, p.name_ru || "-"),
        el("td", {}, el("span", { class: `status-pill ${p.is_active ? "status-invited" : "status-neutral"}` }, [el("span", { class: "dot" }), p.is_active ? "Faol" : "Nofaol"])),
        el("td", {}, actions),
      ])
    );
  }
  table.append(tbody);
  wrap.innerHTML = "";
  wrap.append(table);
}

async function togglePosition(position) {
  await api(`/api/positions/${position.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !position.is_active }) });
  loadPositions();
}

async function deletePosition(position) {
  const confirmed = await openConfirm({
    title: "Lavozimni o'chirish",
    message: `"${position.name_uz}" lavozimini o'chirmoqchimisiz?`,
    confirmText: "O'chirish",
    danger: true,
  });
  if (!confirmed) return;
  try {
    await api(`/api/positions/${position.id}`, { method: "DELETE" });
    loadPositions();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openAddPositionModal() {
  const nameUz = el("input", { type: "text", placeholder: "Lavozim nomi (UZ)" });
  const nameRu = el("input", { type: "text", placeholder: "Lavozim nomi (RU, ixtiyoriy)" });
  const categorySelect = el("select", {}, state.categories.map((c) => el("option", { value: c.id }, `${c.code}) ${c.name_uz}`)));
  const errorBox = el("div", { class: "error" });

  const form = el("div", {}, [
    el("h2", {}, "Yangi lavozim qo'shish"),
    el("div", { class: "field" }, [el("b", {}, "Yo'nalish"), categorySelect]),
    el("div", { class: "field" }, [el("b", {}, "Nomi (UZ)"), nameUz]),
    el("div", { class: "field" }, [el("b", {}, "Nomi (RU)"), nameRu]),
    errorBox,
    el("div", { class: "actions" }, [
      el("button", {
        class: "btn-primary",
        onclick: async () => {
          if (!nameUz.value.trim()) { errorBox.textContent = "Nomi (UZ) majburiy."; return; }
          try {
            await api("/api/positions", {
              method: "POST",
              body: JSON.stringify({ category_id: Number(categorySelect.value), name_uz: nameUz.value.trim(), name_ru: nameRu.value.trim() || null }),
            });
            closeModal();
            loadPositions();
          } catch (err) {
            errorBox.textContent = err.message;
          }
        },
      }, "Saqlash"),
      el("button", { class: "btn-close", onclick: closeModal }, "Bekor qilish"),
    ]),
  ]);
  showModal(form);
}

function openEditPositionModal(position) {
  const nameUz = el("input", { type: "text", value: position.name_uz });
  const nameRu = el("input", { type: "text", value: position.name_ru || "" });
  const categorySelect = el("select", {}, state.categories.map((c) => el("option", { value: c.id }, `${c.code}) ${c.name_uz}`)));
  categorySelect.value = position.category_id;
  const sortOrder = el("input", { type: "number", value: position.sort_order });
  const errorBox = el("div", { class: "error" });

  const form = el("div", {}, [
    el("h2", {}, "Lavozimni tahrirlash"),
    el("div", { class: "field" }, [el("b", {}, "Yo'nalish"), categorySelect]),
    el("div", { class: "field" }, [el("b", {}, "Nomi (UZ)"), nameUz]),
    el("div", { class: "field" }, [el("b", {}, "Nomi (RU)"), nameRu]),
    el("div", { class: "field" }, [el("b", {}, "Tartib raqami"), sortOrder]),
    errorBox,
    el("div", { class: "actions" }, [
      el("button", {
        class: "btn-primary",
        onclick: async () => {
          if (!nameUz.value.trim()) { errorBox.textContent = "Nomi (UZ) majburiy."; return; }
          try {
            await api(`/api/positions/${position.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                category_id: Number(categorySelect.value),
                name_uz: nameUz.value.trim(),
                name_ru: nameRu.value.trim() || null,
                sort_order: Number(sortOrder.value) || 0,
              }),
            });
            closeModal();
            loadPositions();
          } catch (err) {
            errorBox.textContent = err.message;
          }
        },
      }, "Saqlash"),
      el("button", { class: "btn-close", onclick: closeModal }, "Bekor qilish"),
    ]),
  ]);
  showModal(form);
}

// --- Texts ---
const TEXT_META = {
  welcome_message: { title: "Xush kelibsiz xabari", desc: "Bot ishga tushirilganda foydalanuvchiga birinchi bo'lib yuboriladi." },
  about_us: { title: "Kompaniya haqida", desc: "\"Biz haqimizda\" bo'limi bosilganda ko'rsatiladigan matn." },
  thanks_message: { title: "Minnatdorchilik xabari", desc: "Nomzod arizani muvaffaqiyatli topshirgandan so'ng yuboriladi." },
};

function autosizeTextarea(ta) {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 320) + "px";
}

function showToast(message, tone = "success") {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = el("div", { id: "toast-host", class: "toast-host" });
    document.body.append(host);
  }
  const icon = tone === "error" ? "✕" : "✓";
  const toast = el("div", { class: `toast toast-${tone}` }, [el("span", { class: "toast-icon" }, icon), el("span", {}, message)]);
  host.append(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

async function loadTexts() {
  const container = document.getElementById("texts-list");
  const readonlyBadge = document.getElementById("texts-readonly-badge");
  const canEdit = CAN_MANAGE_ROLES.includes(state.role);
  if (readonlyBadge) readonlyBadge.classList.toggle("hidden", canEdit);

  container.innerHTML = "";
  container.append(el("div", { class: "texts-loading" }, ["Matnlar yuklanmoqda..."]));

  let texts;
  try {
    texts = await api("/api/texts");
  } catch (err) {
    container.innerHTML = "";
    container.append(el("div", { class: "empty-state" }, [
      el("div", { class: "empty-state-icon" }, "⚠"),
      el("p", {}, err.message || "Matnlarni yuklashda xatolik yuz berdi."),
    ]));
    return;
  }

  container.innerHTML = "";

  if (!texts.length) {
    container.append(el("div", { class: "empty-state" }, [
      el("div", { class: "empty-state-icon" }, "✎"),
      el("p", {}, "Hozircha matnlar mavjud emas."),
    ]));
    return;
  }

  const toolbar = el("div", { class: "toolbar texts-toolbar" }, [
    el("input", { type: "text", id: "texts-search", placeholder: "Kalit yoki nom bo'yicha qidirish" }),
    el("span", { class: "texts-count" }, `${texts.length} ta matn`),
  ]);

  const grid = el("div", { class: "texts-grid" });

  for (const text of texts) {
    const meta = TEXT_META[text.key] || { title: text.key, desc: "" };

    const uzArea = el("textarea", { class: "text-area", rows: "3", spellcheck: "false" }, text.text_uz);
    const ruArea = el("textarea", { class: "text-area", rows: "3", spellcheck: "false" }, text.text_ru);

    const uzCount = el("span", {}, `${text.text_uz.length}`);
    const ruCount = el("span", {}, `${text.text_ru.length}`);

    const statusBadge = el("span", { class: "text-status" }, "Saqlangan");
    const saveBtn = el("button", { class: "btn-primary text-save-btn", disabled: "true" }, "Saqlash");

    if (!canEdit) {
      uzArea.setAttribute("readonly", "true");
      ruArea.setAttribute("readonly", "true");
    }

    const markDirty = () => {
      statusBadge.textContent = "Saqlanmagan o'zgarishlar";
      statusBadge.className = "text-status dirty";
      saveBtn.removeAttribute("disabled");
    };

    uzArea.addEventListener("input", () => { autosizeTextarea(uzArea); uzCount.textContent = uzArea.value.length; markDirty(); });
    ruArea.addEventListener("input", () => { autosizeTextarea(ruArea); ruCount.textContent = ruArea.value.length; markDirty(); });

    if (canEdit) {
      saveBtn.addEventListener("click", async () => {
        saveBtn.setAttribute("disabled", "true");
        const originalLabel = saveBtn.textContent;
        saveBtn.textContent = "Saqlanmoqda...";
        try {
          await api(`/api/texts/${text.key}`, { method: "PATCH", body: JSON.stringify({ text_uz: uzArea.value, text_ru: ruArea.value }) });
          statusBadge.textContent = `Saqlandi · ${new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}`;
          statusBadge.className = "text-status saved";
          showToast(`"${meta.title}" saqlandi.`, "success");
        } catch (err) {
          statusBadge.textContent = "Xatolik yuz berdi";
          statusBadge.className = "text-status error";
          saveBtn.removeAttribute("disabled");
          showToast(err.message || "Saqlashda xatolik yuz berdi.", "error");
        } finally {
          saveBtn.textContent = originalLabel;
        }
      });
    }

    const card = el("div", { class: "card text-card" }, [
      el("div", { class: "text-card-header" }, [
        el("div", { class: "text-card-heading" }, [
          el("div", { class: "text-icon" }, "✎"),
          el("div", {}, [
            el("div", { class: "text-card-title" }, meta.title),
            el("code", { class: "text-card-key" }, text.key),
          ]),
        ]),
        statusBadge,
      ]),
      meta.desc ? el("p", { class: "text-card-desc" }, meta.desc) : null,
      el("div", { class: "text-lang-grid" }, [
        el("div", { class: "text-lang-block" }, [
          el("div", { class: "text-lang-label" }, [el("span", { class: "lang-flag lang-uz" }, "UZ"), "O'zbekcha"]),
          uzArea,
          el("div", { class: "text-area-footer" }, [uzCount, " belgi"]),
        ]),
        el("div", { class: "text-lang-block" }, [
          el("div", { class: "text-lang-label" }, [el("span", { class: "lang-flag lang-ru" }, "RU"), "Ruscha"]),
          ruArea,
          el("div", { class: "text-area-footer" }, [ruCount, " belgi"]),
        ]),
      ]),
      canEdit ? el("div", { class: "text-card-footer" }, [saveBtn]) : null,
    ]);
    card.dataset.search = `${text.key} ${meta.title}`.toLowerCase();

    grid.append(card);
    requestAnimationFrame(() => { autosizeTextarea(uzArea); autosizeTextarea(ruArea); });
  }

  toolbar.querySelector("#texts-search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    for (const card of grid.children) {
      card.classList.toggle("hidden", !(!q || card.dataset.search.includes(q)));
    }
  });

  container.append(toolbar, grid);
}

// --- Employees (Xodimlar) ---
const EMPLOYEE_ROLE_LABELS = { super_admin: "Superadmin", admin: "Admin", hr: "HR" };

document.getElementById("employee-add-btn").addEventListener("click", openAddEmployeeModal);

function employeeRolePill(role) {
  const tone = role === "super_admin" ? "status-invited" : role === "admin" ? "status-submitted" : "status-neutral";
  return el("span", { class: `status-pill ${tone}` }, [el("span", { class: "dot" }), EMPLOYEE_ROLE_LABELS[role] || role]);
}

function employeeRoleOptions() {
  const roles = state.role === "admin" ? ["admin", "hr"] : ["super_admin", "admin", "hr"];
  return roles.map((r) => el("option", { value: r }, EMPLOYEE_ROLE_LABELS[r]));
}

async function loadEmployees() {
  const employees = await api("/api/employees");
  const wrap = document.getElementById("employees-table-wrap");
  const table = el("table", {}, [
    el("thead", {}, el("tr", {}, ["Ism", "Telefon", "Telegram ID", "Rol", "Holat", ""].map((h) => el("th", {}, h)))),
  ]);
  const tbody = el("tbody");
  for (const emp of employees) {
    const canModify = !(state.role === "admin" && emp.role === "super_admin");
    const actions = el("div", { class: "row-actions" });
    if (canModify) {
      actions.append(
        el("button", { title: "Tahrirlash", onclick: () => openEditEmployeeModal(emp) }, "✏️"),
        el("button", { title: "Nofaollashtirish", onclick: () => deactivateEmployee(emp) }, "🗑")
      );
    }
    tbody.append(
      el("tr", {}, [
        el("td", {}, emp.full_name || "-"),
        el("td", {}, emp.phone || "-"),
        el("td", {}, String(emp.telegram_id)),
        el("td", {}, employeeRolePill(emp.role)),
        el("td", {}, el("span", { class: `status-pill ${emp.is_active ? "status-invited" : "status-neutral"}` }, [el("span", { class: "dot" }), emp.is_active ? "Faol" : "Nofaol"])),
        el("td", {}, actions),
      ])
    );
  }
  table.append(tbody);
  wrap.innerHTML = "";
  wrap.append(table);
}

function openAddEmployeeModal() {
  const fullName = el("input", { type: "text", placeholder: "F.I.Sh." });
  const phone = el("input", { type: "text", placeholder: "+998901234567" });
  const telegramId = el("input", { type: "text", placeholder: "Telegram ID" });
  const roleSelect = el("select", {}, employeeRoleOptions());
  const errorBox = el("div", { class: "error" });

  const form = el("div", {}, [
    el("h2", {}, "Yangi xodim qo'shish"),
    el("div", { class: "field" }, [el("b", {}, "F.I.Sh."), fullName]),
    el("div", { class: "field" }, [el("b", {}, "Telefon"), phone]),
    el("div", { class: "field" }, [el("b", {}, "Telegram ID"), telegramId]),
    el("div", { class: "field" }, [el("b", {}, "Rol"), roleSelect]),
    errorBox,
    el("div", { class: "actions" }, [
      el("button", {
        class: "btn-primary",
        onclick: async () => {
          const tgId = Number(telegramId.value.trim());
          if (!tgId || !Number.isInteger(tgId)) { errorBox.textContent = "Telegram ID to'g'ri raqam bo'lishi kerak."; return; }
          try {
            await api("/api/employees", {
              method: "POST",
              body: JSON.stringify({
                full_name: fullName.value.trim() || null,
                phone: phone.value.trim() || null,
                telegram_id: tgId,
                role: roleSelect.value,
              }),
            });
            closeModal();
            loadEmployees();
          } catch (err) {
            errorBox.textContent = err.message;
          }
        },
      }, "Saqlash"),
      el("button", { class: "btn-close", onclick: closeModal }, "Bekor qilish"),
    ]),
  ]);
  showModal(form);
}

function openEditEmployeeModal(emp) {
  const fullName = el("input", { type: "text", value: emp.full_name || "" });
  const phone = el("input", { type: "text", value: emp.phone || "" });
  const roleSelect = el("select", {}, employeeRoleOptions());
  roleSelect.value = emp.role;
  const activeSelect = el("select", {}, [
    el("option", { value: "true" }, "Faol"),
    el("option", { value: "false" }, "Nofaol"),
  ]);
  activeSelect.value = String(emp.is_active);
  const errorBox = el("div", { class: "error" });

  const form = el("div", {}, [
    el("h2", {}, `Xodimni tahrirlash — ${emp.full_name || emp.telegram_id}`),
    el("div", { class: "field" }, [el("b", {}, "F.I.Sh."), fullName]),
    el("div", { class: "field" }, [el("b", {}, "Telefon"), phone]),
    el("div", { class: "field" }, [el("b", {}, "Rol"), roleSelect]),
    el("div", { class: "field" }, [el("b", {}, "Holat"), activeSelect]),
    errorBox,
    el("div", { class: "actions" }, [
      el("button", {
        class: "btn-primary",
        onclick: async () => {
          try {
            await api(`/api/employees/${emp.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                full_name: fullName.value.trim() || null,
                phone: phone.value.trim() || null,
                role: roleSelect.value,
                is_active: activeSelect.value === "true",
              }),
            });
            closeModal();
            loadEmployees();
          } catch (err) {
            errorBox.textContent = err.message;
          }
        },
      }, "Saqlash"),
      el("button", { class: "btn-close", onclick: closeModal }, "Bekor qilish"),
    ]),
  ]);
  showModal(form);
}

async function deactivateEmployee(emp) {
  const confirmed = await openConfirm({
    title: "Xodimni nofaollashtirish",
    message: `${emp.full_name || emp.telegram_id} xodimini nofaollashtirmoqchimisiz?`,
    confirmText: "Nofaollashtirish",
    danger: true,
  });
  if (!confirmed) return;
  try {
    await api(`/api/employees/${emp.id}`, { method: "DELETE" });
    loadEmployees();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// --- Boot ---
if (state.token) {
  enterDashboard().catch(() => logout());
}
