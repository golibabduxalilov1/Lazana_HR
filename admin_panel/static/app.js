const STATUS_LABELS = {
  submitted: "Yuborilgan",
  reviewed: "Ko'rib chiqilgan",
  invited: "Taklif qilingan",
  rejected: "Rad etilgan",
};
const NEXT_STATUS = { submitted: ["reviewed"], reviewed: ["invited", "rejected"] };

const state = {
  token: localStorage.getItem("lazana_token") || null,
  role: localStorage.getItem("lazana_role") || null,
  categories: [],
  applicationsPage: 1,
};

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
  localStorage.removeItem("lazana_token");
  localStorage.removeItem("lazana_role");
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
    localStorage.setItem("lazana_token", state.token);
    localStorage.setItem("lazana_role", state.role);
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
    if (btn.dataset.tab === "applications") loadApplications(1);
    if (btn.dataset.tab === "stats") loadStats();
    if (btn.dataset.tab === "positions") loadPositions();
    if (btn.dataset.tab === "texts") loadTexts();
  });
});

async function enterDashboard() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("admin-role-badge").textContent = state.role;
  document.getElementById("export-btn").style.display = state.role === "viewer" ? "none" : "inline-block";
  await loadCategories();
  await loadApplications(1);
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
      el("td", {}, el("span", { class: `status-pill status-${item.status}` }, STATUS_LABELS[item.status] || item.status)),
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
    el("div", { class: "field" }, [el("b", {}, "Holat"), el("span", { class: `status-pill status-${app.status}` }, STATUS_LABELS[app.status] || app.status)])
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
async function loadStats() {
  const data = await api("/api/stats/summary");
  const container = document.getElementById("stats-content");
  container.innerHTML = "";
  container.append(
    el("div", { class: "stat-card" }, [el("div", { class: "value" }, String(data.total)), el("div", { class: "label" }, "Jami arizalar")]),
    el("div", { class: "stat-card" }, [el("div", { class: "value" }, String(data.last_7_days)), el("div", { class: "label" }, "Oxirgi 7 kun")]),
    el("div", { class: "stat-card" }, [el("div", { class: "value" }, String(data.last_30_days)), el("div", { class: "label" }, "Oxirgi 30 kun")]),
    el("div", { class: "stat-card" }, [
      el("div", { class: "label" }, "Holat bo'yicha"),
      el("ul", {}, Object.entries(data.by_status).map(([k, v]) => el("li", {}, [el("span", {}, STATUS_LABELS[k] || k), el("span", {}, String(v))]))),
    ]),
    el("div", { class: "stat-card" }, [
      el("div", { class: "label" }, "Yo'nalish bo'yicha"),
      el("ul", {}, Object.entries(data.by_category).map(([k, v]) => el("li", {}, [el("span", {}, k), el("span", {}, String(v))]))),
    ])
  );
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
        el("td", {}, el("span", { class: `status-pill ${p.is_active ? "status-invited" : "status-rejected"}` }, p.is_active ? "Faol" : "Nofaol")),
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
    const card = el("div", { class: "stat-card", style: "margin-bottom:16px" });
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
