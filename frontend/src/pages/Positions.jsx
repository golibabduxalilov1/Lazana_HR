import { useEffect, useState } from "react";
import { listCategories } from "../services/applications";
import { createPosition, deletePosition, listPositions, updatePosition } from "../services/positions";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { RoleGate } from "../components/RoleGate";
import { PriorityBadge } from "../components/PriorityBadge";
import { Icon } from "../components/icons";

const EMPTY_FORM = { category_id: "", name_uz: "", name_ru: "", sort_order: 0, is_priority: false };

export default function Positions() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();

  const [categories, setCategories] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([listCategories(), listPositions()])
      .then(([cats, pos]) => {
        setCategories(cats);
        setPositions(pos);
        setActiveCategoryId((prev) => (prev != null && cats.some((c) => c.id === prev) ? prev : cats[0]?.id));
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNewModal = () => {
    setEditingPosition(null);
    setForm({ ...EMPTY_FORM, category_id: activeCategoryId ?? "" });
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingPosition(p);
    setForm({
      category_id: p.category_id,
      name_uz: p.name_uz,
      name_ru: p.name_ru || "",
      sort_order: p.sort_order,
      is_priority: p.is_priority,
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const toggleActive = async (p) => {
    try {
      await updatePosition(p.id, { is_active: !p.is_active });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const togglePriority = async (p) => {
    try {
      await updatePosition(p.id, { is_priority: !p.is_priority });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async (p) => {
    if (!(await confirm(`${t("delete")}: ${p.name_uz}?`))) return;
    try {
      await deletePosition(p.id);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category_id: Number(form.category_id),
        name_uz: form.name_uz,
        name_ru: form.name_ru || null,
        sort_order: Number(form.sort_order) || 0,
        is_priority: form.is_priority,
      };
      if (editingPosition) {
        await updatePosition(editingPosition.id, payload);
      } else {
        await createPosition(payload);
      }
      toast.success(t("save"));
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="positions-header">
        <div>
          <h1 className="page-title mb-2">{t("positions_title")}</h1>
          <p className="positions-subtitle">{t("positions_subtitle")}</p>
        </div>
        <RoleGate roles={["super_admin", "admin"]}>
          <button className="btn btn-primary m-0 flex items-center gap-2 px-6 py-3" onClick={openNewModal}>
            <Icon name="add" className="text-[18px]" />
            {t("positions_new")}
          </button>
        </RoleGate>
      </div>

      {(() => {
        const cat = categories.find((c) => c.id === activeCategoryId);
        const catPositions = cat ? positions.filter((p) => p.category_id === cat.id) : [];
        return (
          <div className="positions-canvas">
            <nav className="positions-tabs">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`positions-tab${activeCategoryId === c.id ? " positions-tab-active" : ""}`}
                  onClick={() => setActiveCategoryId(c.id)}
                >
                  {c.name_uz}
                </button>
              ))}
            </nav>

            <div className="overflow-x-auto">
              <table className="positions-table">
                <thead>
                  <tr className="positions-thead-row">
                    <th className="w-1/2">{t("positions_name_uz")}</th>
                    <th className="w-1/4">{t("positions_priority")}</th>
                    <th className="w-32">{t("active")}</th>
                    <RoleGate roles={["super_admin", "admin"]}>
                      <th className="text-right">{t("actions")}</th>
                    </RoleGate>
                  </tr>
                </thead>
                <tbody>
                  {catPositions.map((p) => (
                    <tr key={p.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="positions-row-icon">
                            <Icon name="work" className="text-lg" />
                          </div>
                          <div>
                            <p className="positions-row-name">{p.name_uz}</p>
                            <p className="positions-row-sub">{p.name_ru || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <label className="priority-toggle">
                          <input type="checkbox" checked={p.is_priority} onChange={() => togglePriority(p)} />
                          <PriorityBadge priority={p.is_priority} />
                        </label>
                      </td>
                      <td>
                        <div className="relative mr-2 inline-block w-10 select-none align-middle transition duration-200 ease-in">
                          <input
                            type="checkbox"
                            className="toggle-checkbox absolute z-10 block h-5 w-5 cursor-pointer appearance-none rounded-full border-4 border-surface-variant bg-white"
                            id={`position-toggle-${p.id}`}
                            checked={p.is_active}
                            onChange={() => toggleActive(p)}
                            aria-label={p.is_active ? t("inactive") : t("active")}
                          />
                          <label
                            className="toggle-label block h-5 cursor-pointer overflow-hidden rounded-full bg-surface-variant"
                            htmlFor={`position-toggle-${p.id}`}
                          />
                        </div>
                      </td>
                      <RoleGate roles={["super_admin", "admin"]}>
                        <td>
                          <div className="positions-row-actions">
                            <button className="positions-action-btn" title={t("edit")} aria-label={t("edit")} onClick={() => openEditModal(p)}>
                              <Icon name="edit" className="text-lg" />
                            </button>
                            <button className="positions-action-btn-danger" title={t("delete")} aria-label={t("delete")} onClick={() => remove(p)}>
                              <Icon name="delete" className="text-lg" />
                            </button>
                          </div>
                        </td>
                      </RoleGate>
                    </tr>
                  ))}
                </tbody>
              </table>
              {catPositions.length === 0 && <div className="empty-state m-4">{t("dashboard_top_positions_empty")}</div>}
            </div>

            <div className="positions-footer">
              <p className="positions-row-sub">
                {catPositions.length} {t("positions_count")}
              </p>
            </div>
          </div>
        );
      })()}

      <RoleGate roles={["super_admin", "admin"]}>
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">{editingPosition ? t("positions_edit_title") : t("positions_new")}</h2>
                <button type="button" className="modal-close" onClick={closeModal} aria-label={t("cancel")}>
                  <Icon name="close" />
                </button>
              </div>
              <form onSubmit={submitForm}>
                <div className="modal-body">
                  <div>
                    <label className="form-label">{t("positions_category")}</label>
                    <select
                      className="form-input"
                      value={form.category_id}
                      required
                      onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    >
                      <option value="">{t("positions_category")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name_uz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{t("positions_name_uz")}</label>
                    <input
                      className="form-input"
                      placeholder={t("positions_name_uz")}
                      value={form.name_uz}
                      required
                      onChange={(e) => setForm({ ...form, name_uz: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t("positions_name_ru")}</label>
                    <input
                      className="form-input"
                      placeholder={t("positions_name_ru")}
                      value={form.name_ru}
                      onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">{t("positions_sort_order")}</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder={t("positions_sort_order")}
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    />
                  </div>
                  <div>
                    <label>
                      <input
                        type="checkbox"
                        checked={form.is_priority}
                        onChange={(e) => setForm({ ...form, is_priority: e.target.checked })}
                      />
                      {" "}{t("positions_priority")}
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    {t("cancel")}
                  </button>
                  <button className="btn btn-primary" type="submit">
                    {t("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </RoleGate>
    </div>
  );
}
