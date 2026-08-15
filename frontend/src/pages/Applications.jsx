import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deleteApplication, listApplications, listCategories } from "../services/applications";
import { listPositions } from "../services/positions";
import { exportApplicationsExcel } from "../services/export";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";
import { Pagination } from "../components/Pagination";
import { RoleGate } from "../components/RoleGate";
import { IconDownload, IconTrash } from "../components/icons";

const STATUSES = ["submitted", "reviewed", "invited", "rejected"];

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" });
}

export default function Applications() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [positions, setPositions] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const filters = {
    status: searchParams.get("status") || "",
    categoryId: searchParams.get("category_id") || "",
    positionId: searchParams.get("position_id") || "",
    search: searchParams.get("search") || "",
    dateFrom: searchParams.get("date_from") || "",
    dateTo: searchParams.get("date_to") || "",
    page: parseInt(searchParams.get("page") || "1", 10),
    pageSize: 20,
  };

  const [formState, setFormState] = useState(filters);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => {});
    listPositions().then(setPositions).catch(() => {});
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    listApplications(filters)
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
    if (formState.status) next.status = formState.status;
    if (formState.categoryId) next.category_id = formState.categoryId;
    if (formState.positionId) next.position_id = formState.positionId;
    if (formState.search) next.search = formState.search;
    if (formState.dateFrom) next.date_from = formState.dateFrom;
    if (formState.dateTo) next.date_to = formState.dateTo;
    next.page = "1";
    setSearchParams(next);
  };

  const resetFilters = () => {
    setFormState({ status: "", categoryId: "", positionId: "", search: "", dateFrom: "", dateTo: "", page: 1, pageSize: 20 });
    setSearchParams({});
  };

  const goToPage = (page) => {
    const next = Object.fromEntries(searchParams);
    next.page = String(page);
    setSearchParams(next);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportApplicationsExcel(filters);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    if (!(await confirm(t("detail_delete_confirm")))) return;
    try {
      await deleteApplication(item.id);
      toast.success(t("delete"));
      fetchData();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-ink-900">{t("nav_applications")}</h1>
          <div className="flex items-center gap-1.5 text-sm text-ink-400">
            <span>{t("apps_total")}</span>
            <span className="role-badge">{result.total}</span>
            <span>{t("apps_total_suffix")}</span>
          </div>
        </div>

        <button className="btn btn-secondary m-0 flex items-center gap-1.5" onClick={handleExport} disabled={exporting}>
          <IconDownload width="16" height="16" />
          {exporting ? t("loading") : t("apps_export_excel")}
        </button>
      </div>

      <form className="panel" onSubmit={applyFilters}>
        <input
          className="form-input mb-3"
          placeholder={t("apps_search_placeholder")}
          value={formState.search}
          onChange={(e) => setFormState({ ...formState, search: e.target.value })}
        />

        <div className="filter-bar mb-0">
          <select
            className="form-input"
            value={formState.status}
            onChange={(e) => setFormState({ ...formState, status: e.target.value })}
          >
            <option value="">{t("apps_all")} — {t("apps_filter_status")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status_${s}`)}
              </option>
            ))}
          </select>

          <select
            className="form-input"
            value={formState.categoryId}
            onChange={(e) => setFormState({ ...formState, categoryId: e.target.value })}
          >
            <option value="">{t("apps_all")} — {t("apps_filter_category")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_uz}
              </option>
            ))}
          </select>

          <select
            className="form-input"
            value={formState.positionId}
            onChange={(e) => setFormState({ ...formState, positionId: e.target.value })}
          >
            <option value="">{t("apps_all")} — {t("apps_filter_position")}</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_uz}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="form-input"
            title={t("apps_filter_date_from")}
            value={formState.dateFrom}
            onChange={(e) => setFormState({ ...formState, dateFrom: e.target.value })}
          />
          <input
            type="date"
            className="form-input"
            title={t("apps_filter_date_to")}
            value={formState.dateTo}
            onChange={(e) => setFormState({ ...formState, dateTo: e.target.value })}
          />

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
        <div className="empty-state">{t("apps_empty")}</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("apps_id")}</th>
                <th>{t("apps_full_name")}</th>
                <th>{t("apps_position")}</th>
                <th>{t("apps_category")}</th>
                <th>{t("apps_phone")}</th>
                <th>{t("apps_status")}</th>
                <th>{t("apps_submitted_at")}</th>
                {isSuperAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {result.items.map((item) => (
                <tr
                  key={item.id}
                  className="data-row"
                  onClick={() => navigate(`/applications/${item.id}?${searchParams.toString()}`)}
                >
                  <td>{item.id}</td>
                  <td>{item.full_name || "—"}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {item.position_name}
                      {item.is_priority && <PriorityBadge priority />}
                    </div>
                  </td>
                  <td>{item.category_name}</td>
                  <td>{item.phone || "—"}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{formatDate(item.submitted_at)}</td>
                  <RoleGate roles={["super_admin"]}>
                    <td className="row-actions">
                      <button className="btn btn-danger" onClick={(e) => handleDelete(e, item)}>
                        <IconTrash />
                      </button>
                    </td>
                  </RoleGate>
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
