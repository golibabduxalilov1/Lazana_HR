import { useEffect, useState } from "react";
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from "../services/employees";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { ActiveBadge } from "../components/ActiveBadge";
import { PhoneInput } from "../components/PhoneInput";
import { Icon } from "../components/icons";
import { formatUzPhoneReadable, isCompleteUzPhone } from "../utils/phone";

const ALL_ROLES = ["super_admin", "admin", "hr"];
const EMPTY_FORM = { full_name: "", phone: "", password: "", telegram_id: "", role: "hr" };

export default function Admins() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { isEnvSuperAdmin, adminId } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const assignableRoles = isEnvSuperAdmin ? ALL_ROLES : ALL_ROLES.filter((r) => r !== "super_admin");

  const load = () => {
    setLoading(true);
    listEmployees()
      .then(setEmployees)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNewModal = () => {
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setForm({
      full_name: emp.full_name || "",
      phone: emp.phone || "",
      password: "",
      telegram_id: emp.telegram_id != null ? String(emp.telegram_id) : "",
      role: emp.role,
    });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const submitForm = async (e) => {
    e.preventDefault();
    if (!isCompleteUzPhone(form.phone)) {
      toast.error(t("admins_phone_incomplete"));
      return;
    }
    try {
      const payload = {
        ...form,
        telegram_id: form.telegram_id.trim() === "" ? null : Number(form.telegram_id),
      };
      if (editingEmployee) {
        if (!payload.password) delete payload.password;
        await updateEmployee(editingEmployee.id, payload);
      } else {
        await createEmployee(payload);
      }
      toast.success(t("save"));
      setShowModal(false);
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
    if (!(await confirm(`${t("delete")}: ${emp.full_name || formatUzPhoneReadable(emp.phone) || emp.telegram_id}?`))) return;
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

      <button className="btn btn-primary flex items-center gap-1.5" onClick={openNewModal}>
        <Icon name="add" className="text-[18px]" />
        {t("admins_new")}
      </button>

      <table className="data-table">
        <thead>
          <tr>
            <th>{t("admins_full_name")}</th>
            <th>{t("admins_phone")}</th>
            <th>{t("admins_telegram_id")}</th>
            <th>{t("admins_role")}</th>
            <th>{t("admins_status")}</th>
            <th className="w-[145px]" />
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const isSelf = adminId != null && String(emp.id) === String(adminId);
            // The .env superadmin row is never editable through the panel — its credentials
            // come from .env only. Otherwise: the .env superadmin (or the account itself) may
            // edit a super_admin row; only the .env superadmin may deactivate/delete another
            // superadmin. The backend enforces this regardless — these just keep the UI from
            // offering actions that would 403.
            const canEdit = !emp.is_env_admin && (isSelf || emp.role !== "super_admin" || isEnvSuperAdmin);
            const canChangeRole = !emp.is_env_admin && !isSelf && (emp.role !== "super_admin" || isEnvSuperAdmin);
            const canDeactivateOrDelete = !emp.is_env_admin && !isSelf && (emp.role !== "super_admin" || isEnvSuperAdmin);
            return (
            <tr key={emp.id}>
              <td>{emp.full_name || "—"}{emp.is_env_admin && <span className="badge" title={t("admins_env_admin_hint")}> · {t("admins_env_admin")}</span>}</td>
              <td>{formatUzPhoneReadable(emp.phone) || "—"}</td>
              <td>{emp.telegram_id ?? "—"}</td>
              <td>
                <select
                  value={emp.role}
                  onChange={(e) => changeRole(emp, e.target.value)}
                  className="form-input"
                  disabled={!canChangeRole}
                >
                  {emp.role === "super_admin" && !assignableRoles.includes("super_admin") && (
                    <option value="super_admin">{t("role_super_admin")}</option>
                  )}
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {t(`role_${r}`)}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <ActiveBadge active={emp.is_active} />
              </td>
              <td className="row-actions">
                <span className="row-actions-group">
                  {canEdit && (
                    <button className="btn btn-secondary btn-icon" title={t("edit")} aria-label={t("edit")} onClick={() => openEditModal(emp)}>
                      <Icon name="edit" className="text-[18px]" />
                    </button>
                  )}
                  {canDeactivateOrDelete && (
                    <>
                      <button
                        className="btn btn-secondary btn-icon"
                        title={emp.is_active ? t("inactive") : t("active")}
                        aria-label={emp.is_active ? t("inactive") : t("active")}
                        onClick={() => toggleActive(emp)}
                      >
                        <Icon name="power_settings_new" className="text-[18px]" />
                      </button>
                      <button className="btn btn-danger btn-icon" title={t("delete")} aria-label={t("delete")} onClick={() => remove(emp)}>
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </>
                  )}
                </span>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingEmployee ? t("admins_edit_title") : t("admins_new")}</h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label={t("cancel")}>
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={submitForm}>
              <div className="modal-body">
                <div>
                  <label className="form-label">{t("admins_full_name")}</label>
                  <input
                    className="form-input"
                    placeholder={t("admins_full_name")}
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">{t("admins_phone")}</label>
                  <PhoneInput
                    required
                    value={form.phone}
                    onChange={(phone) => setForm({ ...form, phone })}
                  />
                </div>
                <div>
                  <label className="form-label">{t("admins_password")}</label>
                  <input
                    className="form-input"
                    placeholder={t("admins_password")}
                    type="password"
                    autoComplete="new-password"
                    required={!editingEmployee}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  {editingEmployee && <p className="form-hint">{t("admins_password_hint")}</p>}
                </div>
                <div>
                  <label className="form-label">{t("admins_telegram_id")}</label>
                  <input
                    className="form-input"
                    placeholder={t("admins_telegram_id")}
                    type="number"
                    value={form.telegram_id}
                    onChange={(e) => setForm({ ...form, telegram_id: e.target.value })}
                  />
                  <p className="form-hint">{t("admins_telegram_id_hint")}</p>
                </div>
                <div>
                  <label className="form-label">{t("admins_role")}</label>
                  <select
                    className="form-input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {t(`role_${r}`)}
                      </option>
                    ))}
                  </select>
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
    </div>
  );
}
