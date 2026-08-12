import { useEffect, useState } from "react";
import { listCategories } from "../services/applications";
import { createPosition, deletePosition, listPositions, updatePosition } from "../services/positions";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { RoleGate } from "../components/RoleGate";

const EMPTY_FORM = { category_id: "", name_uz: "", name_ru: "", sort_order: 0 };

export default function Positions() {
  const { t } = useI18n();
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [showNewForm, setShowNewForm] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([listCategories(), listPositions()])
      .then(([cats, pos]) => {
        setCategories(cats);
        setPositions(pos);
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ category_id: p.category_id, name_uz: p.name_uz, name_ru: p.name_ru || "", sort_order: p.sort_order });
  };

  const saveEdit = async (id) => {
    try {
      await updatePosition(id, {
        category_id: Number(editForm.category_id),
        name_uz: editForm.name_uz,
        name_ru: editForm.name_ru || null,
        sort_order: Number(editForm.sort_order),
      });
      toast.success(t("save"));
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const toggleActive = async (p) => {
    try {
      await updatePosition(p.id, { is_active: !p.is_active });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`${t("delete")}: ${p.name_uz}?`)) return;
    try {
      await deletePosition(p.id);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const submitNew = async (e) => {
    e.preventDefault();
    try {
      await createPosition({
        category_id: Number(newForm.category_id),
        name_uz: newForm.name_uz,
        name_ru: newForm.name_ru || null,
        sort_order: Number(newForm.sort_order) || 0,
      });
      toast.success(t("save"));
      setNewForm(EMPTY_FORM);
      setShowNewForm(false);
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
        <button className="btn btn-primary" onClick={() => setShowNewForm((v) => !v)}>
          + {t("positions_new")}
        </button>

        {showNewForm && (
          <form className="panel new-item-form" onSubmit={submitNew}>
            <select
              className="form-input"
              value={newForm.category_id}
              required
              onChange={(e) => setNewForm({ ...newForm, category_id: e.target.value })}
            >
              <option value="">{t("positions_category")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_uz}
                </option>
              ))}
            </select>
            <input
              className="form-input"
              placeholder={t("positions_name_uz")}
              value={newForm.name_uz}
              required
              onChange={(e) => setNewForm({ ...newForm, name_uz: e.target.value })}
            />
            <input
              className="form-input"
              placeholder={t("positions_name_ru")}
              value={newForm.name_ru}
              onChange={(e) => setNewForm({ ...newForm, name_ru: e.target.value })}
            />
            <input
              type="number"
              className="form-input"
              placeholder={t("positions_sort_order")}
              value={newForm.sort_order}
              onChange={(e) => setNewForm({ ...newForm, sort_order: e.target.value })}
            />
            <button className="btn btn-primary" type="submit">
              {t("save")}
            </button>
          </form>
        )}
      </RoleGate>

      {categories.map((cat) => (
        <div className="panel" key={cat.id}>
          <h2 className="panel-title">{cat.name_uz}</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("positions_name_uz")}</th>
                <th>{t("positions_name_ru")}</th>
                <th>{t("positions_sort_order")}</th>
                <th>{t("active")}</th>
                <RoleGate roles={["super_admin", "admin"]}>
                  <th />
                </RoleGate>
              </tr>
            </thead>
            <tbody>
              {positions
                .filter((p) => p.category_id === cat.id)
                .map((p) =>
                  editingId === p.id ? (
                    <tr key={p.id}>
                      <td>
                        <input
                          className="form-input"
                          value={editForm.name_uz}
                          onChange={(e) => setEditForm({ ...editForm, name_uz: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={editForm.name_ru}
                          onChange={(e) => setEditForm({ ...editForm, name_ru: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.sort_order}
                          onChange={(e) => setEditForm({ ...editForm, sort_order: e.target.value })}
                        />
                      </td>
                      <td>{p.is_active ? t("active") : t("inactive")}</td>
                      <td className="row-actions">
                        <button className="btn btn-primary" onClick={() => saveEdit(p.id)}>
                          {t("save")}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setEditingId(null)}>
                          {t("cancel")}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={p.id}>
                      <td>{p.name_uz}</td>
                      <td>{p.name_ru || "—"}</td>
                      <td>{p.sort_order}</td>
                      <td>{p.is_active ? t("active") : t("inactive")}</td>
                      <RoleGate roles={["super_admin", "admin"]}>
                        <td className="row-actions">
                          <button className="btn btn-secondary" onClick={() => startEdit(p)}>
                            {t("edit")}
                          </button>
                          <button className="btn btn-secondary" onClick={() => toggleActive(p)}>
                            {p.is_active ? t("inactive") : t("active")}
                          </button>
                          <button className="btn btn-danger" onClick={() => remove(p)}>
                            {t("delete")}
                          </button>
                        </td>
                      </RoleGate>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
