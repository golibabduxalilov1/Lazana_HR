import { useEffect, useState } from "react";
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from "../services/employees";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";

const ALL_ROLES = ["super_admin", "admin", "hr"];
const EMPTY_FORM = { full_name: "", phone: "", telegram_id: "", role: "hr" };

export default function Admins() {
  const { t } = useI18n();
  const toast = useToast();
  const { role: myRole } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);

  const assignableRoles = myRole === "super_admin" ? ALL_ROLES : ALL_ROLES.filter((r) => r !== "super_admin");

  const load = () => {
    setLoading(true);
    listEmployees()
      .then(setEmployees)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submitNew = async (e) => {
    e.preventDefault();
    try {
      await createEmployee({ ...newForm, telegram_id: Number(newForm.telegram_id) });
      toast.success(t("save"));
      setNewForm(EMPTY_FORM);
      setShowNewForm(false);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const changeRole = async (emp, role) => {
    try {
      await updateEmployee(emp.id, { role });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const toggleActive = async (emp) => {
    try {
      await updateEmployee(emp.id, { is_active: !emp.is_active });
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async (emp) => {
    if (!window.confirm(`${t("delete")}: ${emp.full_name || emp.telegram_id}?`)) return;
    try {
      await deleteEmployee(emp.id);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="page-title">{t("admins_title")}</h1>

      <button className="btn btn-primary" onClick={() => setShowNewForm((v) => !v)}>
        + {t("admins_new")}
      </button>

      {showNewForm && (
        <form className="panel new-item-form" onSubmit={submitNew}>
          <input
            className="form-input"
            placeholder={t("admins_full_name")}
            value={newForm.full_name}
            onChange={(e) => setNewForm({ ...newForm, full_name: e.target.value })}
          />
          <input
            className="form-input"
            placeholder={t("admins_phone")}
            value={newForm.phone}
            onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
          />
          <input
            className="form-input"
            placeholder={t("admins_telegram_id")}
            type="number"
            required
            value={newForm.telegram_id}
            onChange={(e) => setNewForm({ ...newForm, telegram_id: e.target.value })}
          />
          <select
            className="form-input"
            value={newForm.role}
            onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>
                {t(`role_${r}`)}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">
            {t("save")}
          </button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("admins_full_name")}</th>
            <th>{t("admins_phone")}</th>
            <th>{t("admins_telegram_id")}</th>
            <th>{t("admins_role")}</th>
            <th>{t("admins_status")}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id}>
              <td>{emp.full_name || "—"}</td>
              <td>{emp.phone || "—"}</td>
              <td>{emp.telegram_id}</td>
              <td>
                <select value={emp.role} onChange={(e) => changeRole(emp, e.target.value)} className="form-input">
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r} disabled={r === "super_admin" && myRole !== "super_admin"}>
                      {t(`role_${r}`)}
                    </option>
                  ))}
                </select>
              </td>
              <td>{emp.is_active ? t("active") : t("inactive")}</td>
              <td className="row-actions">
                <button className="btn btn-secondary" onClick={() => toggleActive(emp)}>
                  {emp.is_active ? t("inactive") : t("active")}
                </button>
                <button className="btn btn-danger" onClick={() => remove(emp)}>
                  {t("delete")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
