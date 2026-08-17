import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listAuditLogs } from "../services/auditLogs";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { Pagination } from "../components/Pagination";

const ACTIONS = [
  "login",
  "employee_create",
  "employee_update",
  "employee_delete",
  "position_create",
  "position_update",
  "position_delete",
  "text_update",
  "application_status_change",
];

const ENTITY_TYPES = ["employee", "position", "text", "application"];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" });
}

function formatMeta(item, t) {
  const meta = item.meta || {};
  switch (item.action) {
    case "application_status_change":
      return `${t(`status_${meta.old_status}`)} → ${t(`status_${meta.new_status}`)}`;
    case "employee_update":
    case "position_update":
      return (meta.changed_fields || []).join(", ") || "—";
    case "employee_create":
    case "employee_delete":
      return meta.full_name || "—";
    case "position_create":
    case "position_delete":
      return meta.name_uz || "—";
    case "text_update":
      return meta.key || "—";
    default:
      return "—";
  }
}

export default function AuditLogs() {
  const { t } = useI18n();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [result, setResult] = useState({ items: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(true);

  const filters = {
    action: searchParams.get("action") || "",
    entityType: searchParams.get("entity_type") || "",
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: 20,
  };

  const [formState, setFormState] = useState(filters);

  const fetchData = useCallback(() => {
    setLoading(true);
    listAuditLogs(filters)
      .then(setResult)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFilters = (e) => {
    e.preventDefault();
    const next = {};
    if (formState.action) next.action = formState.action;
    if (formState.entityType) next.entity_type = formState.entityType;
    next.page = "1";
    setSearchParams(next);
  };

  const resetFilters = () => {
    setFormState({ action: "", entityType: "", page: 1, pageSize: 20 });
    setSearchParams({});
  };

  const goToPage = (page) => {
    const next = Object.fromEntries(searchParams);
    next.page = String(page);
    setSearchParams(next);
  };

  return (
    <div>
      <h1 className="page-title">{t("logs_title")}</h1>

      <form className="panel" onSubmit={applyFilters}>
        <div className="filter-bar mb-0">
          <select
            className="form-input"
            value={formState.action}
            onChange={(e) => setFormState({ ...formState, action: e.target.value })}
          >
            <option value="">{t("apps_all")} — {t("logs_filter_action")}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`action_${a}`)}
              </option>
            ))}
          </select>

          <select
            className="form-input"
            value={formState.entityType}
            onChange={(e) => setFormState({ ...formState, entityType: e.target.value })}
          >
            <option value="">{t("apps_all")} — {t("logs_filter_entity")}</option>
            {ENTITY_TYPES.map((et) => (
              <option key={et} value={et}>
                {t(`entity_${et}`)}
              </option>
            ))}
          </select>

          <button className="btn btn-primary" type="submit">
            {t("apps_filter_apply")}
          </button>
          <button className="btn btn-secondary" type="button" onClick={resetFilters}>
            {t("apps_filter_reset")}
          </button>
        </div>
      </form>

      {loading ? (
        <Loading />
      ) : result.items.length === 0 ? (
        <div className="empty-state">{t("logs_empty")}</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("logs_date")}</th>
                <th>{t("logs_actor")}</th>
                <th>{t("logs_action")}</th>
                <th>{t("logs_entity")}</th>
                <th>{t("logs_details")}</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.created_at)}</td>
                  <td>{item.actor_name || (item.actor_id != null ? `#${item.actor_id}` : "—")}</td>
                  <td>{item.action ? t(`action_${item.action}`) : "—"}</td>
                  <td>
                    {item.entity_type ? t(`entity_${item.entity_type}`) : "—"}
                    {item.entity_id != null ? ` #${item.entity_id}` : ""}
                  </td>
                  <td>{formatMeta(item, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination page={result.page} pageSize={result.page_size} total={result.total} onPageChange={goToPage} />
        </>
      )}
    </div>
  );
}
