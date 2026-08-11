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
const ROLE_LABELS = { super_admin: "Super Admin", hr: "HR menejer", viewer: "Kuzatuvchi" };
const NEXT_STATUS = { submitted: ["reviewed"], reviewed: ["invited", "rejected"] };
const TAB_TITLES = { stats: "Statistika", applications: "Arizalar", positions: "Lavozimlar", texts: "Matnlar" };

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

// --- Login ---
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errorBox = document.getElementById("login-error");
  errorBox.textContent = "";
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
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

// --- Tabs ---
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove("hidden");
    document.getElementById("breadcrumb-current").textContent = TAB_TITLES[btn.dataset.tab] || btn.dataset.tab;
    if (btn.dataset.tab === "applications") loadApplications(1);
    if (btn.dataset.tab === "stats") loadStats();
    if (btn.dataset.tab === "positions") loadPositions();
    if (btn.dataset.tab === "texts") loadTexts();
  });
});

async function enterDashboard() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  const roleLabel = ROLE_LABELS[state.role] || state.role;
  document.getElementById("admin-role-badge").textContent = roleLabel;
  document.getElementById("export-btn").style.display = state.role === "viewer" ? "none" : "inline-block";

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
  if (!res.ok) { alert("Eksport qilishda xatolik yuz berdi."); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "lazana_applications.csv" });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DETAIL_FIELDS = [
  ["full_name", "F.I.Sh."], ["phone", "Telefon"], ["address", "Manzil"], ["birth_date", "Tug'ilgan sana"],
  ["work_experience_text", "Mehnat faoliyati"], ["experience_years_range", "Ish staji"],
  ["education_level", "Ma'lumoti"], ["education_institution", "Ta'lim muassasasi"],
  ["languages", "Tillar"], ["expected_salary_range", "Kutilayotgan maosh"],
  ["computer_skills", "Kompyuter ko'nikmalari"], ["key_skills", "Asosiy ko'nikmalar"],
  ["source", "Manba"],
];

async function openApplicationDetail(id) {
  const app = await api(`/api/applications/${id}`);
  const container = el("div");
  container.append(el("h2", {}, `Ariza #${app.id} — ${app.category_name} / ${app.position_name}`));
  container.append(
    el("div", { class: "field" }, [el("b", {}, "Holat"), statusPill(app.status)])
  );
  for (const [key, label] of DETAIL_FIELDS) {
    let value = app[key];
    if (value == null || value === "") continue;
    if (Array.isArray(value)) value = value.join(", ");
    container.append(el("div", { class: "field" }, [el("b", {}, label), el("span", {}, String(value))]));
  }

  const actions = el("div", { class: "actions" });
  if (state.role !== "viewer") {
    for (const target of NEXT_STATUS[app.status] || []) {
      actions.append(
        el("button", { class: "btn-primary", onclick: () => changeStatus(app.id, target) }, `→ ${STATUS_LABELS[target]}`)
      );
    }
  }
  actions.append(el("button", { class: "btn-close", onclick: closeModal }, "Yopish"));
  container.append(actions);
  showModal(container);
}

async function changeStatus(id, newStatus) {
  const comment = prompt(`«${STATUS_LABELS[newStatus]}» holatiga o'tkazish uchun izoh (ixtiyoriy):`, "") || null;
  try {
    await api(`/api/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ new_status: newStatus, comment }),
    });
    closeModal();
    loadApplications(state.applicationsPage);
  } catch (err) {
    alert(err.message);
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
    tbody.append(
      el("tr", {}, [
        el("td", {}, p.name_uz),
        el("td", {}, p.name_ru || "-"),
        el("td", {}, el("span", { class: `status-pill ${p.is_active ? "status-invited" : "status-neutral"}` }, [el("span", { class: "dot" }), p.is_active ? "Faol" : "Nofaol"])),
        el("td", {}, state.role === "super_admin" ? el("button", { class: "btn-secondary", onclick: () => togglePosition(p) }, p.is_active ? "Nofaollashtirish" : "Faollashtirish") : ""),
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

// --- Texts ---
async function loadTexts() {
  const texts = await api("/api/texts");
  const container = document.getElementById("texts-list");
  container.innerHTML = "";
  for (const text of texts) {
    const uzArea = el("textarea", {}, text.text_uz);
    const ruArea = el("textarea", {}, text.text_ru);
    const card = el("div", { class: "card", style: "padding:20px;margin-bottom:16px" });
    card.append(
      el("div", { class: "field" }, [el("b", {}, `Kalit: ${text.key}`)]),
      el("div", { class: "field" }, [el("b", {}, "O'zbekcha"), uzArea]),
      el("div", { class: "field" }, [el("b", {}, "Ruscha"), ruArea])
    );
    if (state.role === "super_admin") {
      card.append(
        el("button", {
          class: "btn-secondary",
          onclick: async () => {
            await api(`/api/texts/${text.key}`, { method: "PATCH", body: JSON.stringify({ text_uz: uzArea.value, text_ru: ruArea.value }) });
            alert("Saqlandi.");
          },
        }, "💾 Saqlash")
      );
    }
    container.append(card);
  }
}

// --- Boot ---
if (state.token) {
  enterDashboard().catch(() => logout());
}
