import { useEffect, useState } from "react";
import { listCategories } from "../services/applications";
import { createPosition, deletePosition, listPositions, updatePosition } from "../services/positions";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { RoleGate } from "../components/RoleGate";
import { ActiveBadge } from "../components/ActiveBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { IconEdit, IconPower, IconTrash, IconX } from "../components/icons";

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
      <h1 className="page-title">{t("positions_title")}</h1>

      <RoleGate roles={["super_admin", "admin"]}>
        <button className="btn btn-primary" onClick={openNewModal}>
          + {t("positions_new")}
        </button>
      </RoleGate>

      <div className="period-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`period-tab${activeCategoryId === cat.id ? " period-tab-active" : ""}`}
            onClick={() => setActiveCategoryId(cat.id)}
          >
            {cat.name_uz}
          </button>
        ))}
      </div>

      {(() => {
        const cat = categories.find((c) => c.id === activeCategoryId);
        if (!cat) return null;
        return (
          <div className="panel" key={cat.id}>
            <h2 className="panel-title">{cat.name_uz}</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("positions_name_uz")}</th>
                  <th>{t("positions_name_ru")}</th>
                  <th>{t("positions_sort_order")}</th>
                  <th>{t("active")}</th>
                  <th>{t("positions_priority")}</th>
                  <RoleGate roles={["super_admin", "admin"]}>
                    <th />
                  </RoleGate>
                </tr>
              </thead>
              <tbody>
                {positions
                  .filter((p) => p.category_id === cat.id)
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.name_uz}</td>
                      <td>{p.name_ru || "—"}</td>
                      <td>{p.sort_order}</td>
                      <td>
                        <ActiveBadge active={p.is_active} />
                      </td>
                      <td>
                        <PriorityBadge priority={p.is_priority} />
                      </td>
                      <RoleGate roles={["super_admin", "admin"]}>
                        <td className="row-actions">
                          <button className="btn btn-info btn-icon" title={t("edit")} aria-label={t("edit")} onClick={() => openEditModal(p)}>
                            <IconEdit />
                          </button>
                          <button
                            className="btn btn-warning btn-icon"
                            title={p.is_active ? t("inactive") : t("active")}
                            aria-label={p.is_active ? t("inactive") : t("active")}
                            onClick={() => toggleActive(p)}
                          >
                            <IconPower />
                          </button>
                          <button className="btn btn-danger btn-icon" title={t("delete")} aria-label={t("delete")} onClick={() => remove(p)}>
                            <IconTrash />
                          </button>
                        </td>
                      </RoleGate>
                    </tr>
                  ))}
              </tbody>
            </table>
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
                  <IconX />
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
