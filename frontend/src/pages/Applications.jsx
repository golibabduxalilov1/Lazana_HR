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
import { Pagination } from "../components/Pagination";
import { RoleGate } from "../components/RoleGate";
import { Icon } from "../components/icons";

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
        <h1 className="font-display-lg text-display-lg text-primary">{t("nav_applications")}</h1>

        <button className="btn btn-primary m-0 flex items-center gap-2" onClick={handleExport} disabled={exporting}>
          <Icon name="download" className="text-[18px]" />
          {exporting ? t("loading") : t("apps_export_excel")}
        </button>
      </div>

      <form className="apps-filters-card" onSubmit={applyFilters}>
        <div className="apps-filter-grid">
          <div className="apps-filter-field">
            <label className="apps-filter-label">{t("apps_filter_category")}</label>
            <select
              className="form-input"
              value={formState.categoryId}
              onChange={(e) => setFormState({ ...formState, categoryId: e.target.value })}
            >
              <option value="">{t("apps_all")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_uz}
                </option>
              ))}
            </select>
          </div>

          <div className="apps-filter-field">
            <label className="apps-filter-label">{t("apps_filter_position")}</label>
            <select
              className="form-input"
              value={formState.positionId}
              onChange={(e) => setFormState({ ...formState, positionId: e.target.value })}
            >
              <option value="">{t("apps_all")}</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_uz}
                </option>
              ))}
            </select>
          </div>

          <div className="apps-filter-field">
            <label className="apps-filter-label">{t("apps_filter_status")}</label>
            <select
              className="form-input"
              value={formState.status}
              onChange={(e) => setFormState({ ...formState, status: e.target.value })}
            >
              <option value="">{t("apps_all")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status_${s}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="apps-filter-field">
            <label className="apps-filter-label">{t("apps_filter_date_from")} — {t("apps_filter_date_to")}</label>
            <div className="flex items-center gap-2">
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
            </div>
          </div>
        </div>

        <div className="apps-extra-filters">
          <input
            className="form-input w-auto min-w-[220px] flex-1"
            placeholder={t("apps_search_placeholder")}
            value={formState.search}
            onChange={(e) => setFormState({ ...formState, search: e.target.value })}
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
        <div className="apps-canvas">
          <div className="overflow-x-auto">
            <table className="apps-table">
              <thead className="apps-thead">
                <tr>
                  <th className="apps-row-num">#</th>
                  <th>{t("apps_full_name")}</th>
                  <th>{t("apps_position")}</th>
                  <th>{t("apps_category")}</th>
                  <th>{t("apps_phone")}</th>
                  <th>{t("apps_status")}</th>
                  <th>{t("apps_submitted_at")}</th>
                  <th className="text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="apps-tbody">
                {result.items.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`apps-row${item.is_priority ? " apps-row-priority" : ""}`}
                    onClick={() => navigate(`/applications/${item.id}?${searchParams.toString()}`)}
                  >
                    <td className="apps-row-num">{(result.page - 1) * result.page_size + index + 1}</td>
                    <td className="font-medium">{item.full_name || "—"}</td>
                    <td>{item.position_name}</td>
                    <td>{item.category_name}</td>
                    <td>{item.phone || "—"}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>{formatDate(item.submitted_at)}</td>
                    <td className="row-actions text-right">
                      <span className="row-actions-group">
                        <button
                          className="apps-view-btn"
                          aria-label={t("view")}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/applications/${item.id}?${searchParams.toString()}`);
                          }}
                        >
                          <Icon name="visibility" className="text-[20px]" />
                        </button>
                        <RoleGate roles={["super_admin"]}>
                          <button className="apps-view-btn hover:text-error" aria-label={t("delete")} onClick={(e) => handleDelete(e, item)}>
                            <Icon name="delete" className="text-[20px]" />
                          </button>
                        </RoleGate>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={result.page} pageSize={result.page_size} total={result.total} onPageChange={goToPage} />
        </div>
      )}
    </div>
  );
}
