import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStatsSummary } from "../services/stats";
import { listApplications, listCategories } from "../services/applications";
import { useToast } from "../context/ToastContext";
import { useI18n } from "../context/I18nContext";
import { apiErrorMessage } from "../services/client";
import { DashboardSkeleton } from "../components/DashboardSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FilterBar } from "../components/FilterBar";
import { StatCard } from "../components/StatCard";
import { BarChart } from "../components/BarChart";
import { PieChart } from "../components/PieChart";
import { TrendComparisonChart } from "../components/TrendComparisonChart";
import { FunnelChart } from "../components/FunnelChart";
import { TopPositionsList } from "../components/TopPositionsList";
import { StatusBadge } from "../components/StatusBadge";
import { Loading } from "../components/Loading";
import { IconInbox, IconCalendar, IconUsers, IconClock, IconX } from "../components/icons";

const STATUSES = ["submitted", "reviewed", "invited", "rejected"];
const STATUS_COLOR = {
  submitted: "#1e9af7",
  reviewed: "#1e9af7",
  invited: "#1e9af7",
  rejected: "#1e9af7",
};

function toISODate(d) {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function computeRange(preset, customFrom, customTo) {
  const today = new Date();
  if (preset === "custom") {
    return { dateFrom: customFrom || toISODate(today), dateTo: customTo || toISODate(today) };
  }
  const days = { today: 0, "7d": 6, "30d": 29, "90d": 89 }[preset] ?? 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { dateFrom: toISODate(from), dateTo: toISODate(today) };
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" });
}

export default function Dashboard() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ preset: "30d", customFrom: "", customTo: "", categoryIds: [], statuses: [] });
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [drilldown, setDrilldown] = useState(null);
  const [drilldownResult, setDrilldownResult] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const { dateFrom, dateTo } = useMemo(
    () => computeRange(filters.preset, filters.customFrom, filters.customTo),
    [filters.preset, filters.customFrom, filters.customTo]
  );

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const fetchSummary = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStatsSummary({ dateFrom, dateTo, categoryIds: filters.categoryIds, statuses: filters.statuses })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, filters.categoryIds.join(","), filters.statuses.join(",")]);

  useEffect(() => {
    const cancel = fetchSummary();
    return cancel;
  }, [fetchSummary]);

  useEffect(() => {
    setDrilldown(null);
  }, [dateFrom, dateTo, filters.categoryIds, filters.statuses]);

  useEffect(() => {
    if (!drilldown) {
      setDrilldownResult(null);
      return;
    }
    let cancelled = false;
    setDrilldownLoading(true);
    listApplications({
      status: drilldown.type === "status" ? drilldown.value : filters.statuses.length === 1 ? filters.statuses[0] : "",
      categoryId:
        drilldown.type === "category" ? drilldown.value : filters.categoryIds.length === 1 ? filters.categoryIds[0] : "",
      dateFrom,
      dateTo,
      page: 1,
      pageSize: 10,
    })
      .then((data) => {
        if (!cancelled) setDrilldownResult(data);
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => {
        if (!cancelled) setDrilldownLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drilldown, dateFrom, dateTo]);

  const goToApplications = (extra = {}) => {
    const params = new URLSearchParams();
    params.set("date_from", dateFrom);
    params.set("date_to", dateTo);
    if (filters.categoryIds.length === 1) params.set("category_id", filters.categoryIds[0]);
    if (filters.statuses.length === 1 && !extra.status) params.set("status", filters.statuses[0]);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    navigate(`/applications?${params.toString()}`);
  };

  const handleStatusBarClick = (d) => {
    setDrilldown((prev) => (prev?.type === "status" && prev.value === d.key ? null : { type: "status", value: d.key, label: d.label }));
  };

  const handleCategorySegmentClick = (seg) => {
    const categoryObj = categories.find((c) => c.name_uz === seg.label);
    if (!categoryObj) return;
    setDrilldown((prev) =>
      prev?.type === "category" && prev.value === categoryObj.id
        ? null
        : { type: "category", value: categoryObj.id, label: seg.label }
    );
  };

  if (loading) {
    return (
      <div>
        <h1 className="page-title">{t("nav_dashboard")}</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="page-title">{t("nav_dashboard")}</h1>
        <ErrorState title={t("dashboard_error_title")} message={error} onRetry={fetchSummary} />
      </div>
    );
  }

  if (!summary) return null;

  const statusData = STATUSES.map((s) => ({ label: t(`status_${s}`), value: summary.by_status[s] || 0, key: s }));
  const categoryData = Object.entries(summary.by_category)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const isEmpty = summary.total === 0;

  return (
    <div>
      <h1 className="page-title">{t("nav_dashboard")}</h1>

      <FilterBar filters={filters} onChange={setFilters} categories={categories} />

      {isEmpty ? (
        <EmptyState
          icon={<IconInbox width="40" height="40" />}
          title={t("dashboard_empty_title")}
          subtitle={t("dashboard_empty_subtitle")}
        />
      ) : (
        <>
          <div className="stat-cards">
            <StatCard
              icon={<IconInbox />}
              iconClass="bg-primary-50 text-primary-700"
              label={t("dashboard_total")}
              value={summary.total}
              changePct={summary.change_pct}
              onClick={() => goToApplications()}
            />
            <StatCard
              icon={<IconCalendar />}
              iconClass="bg-status-idleBg text-status-idleText"
              label={t("dashboard_reviewed_stat")}
              value={summary.reviewed_count}
              changePct={summary.reviewed_change_pct}
              onClick={() => goToApplications({ status: "reviewed" })}
            />
            <StatCard
              icon={<IconUsers />}
              iconClass="bg-status-workingBg text-status-workingText"
              label={t("dashboard_invited_stat")}
              value={summary.invited_count}
              changePct={summary.invited_change_pct}
              onClick={() => goToApplications({ status: "invited" })}
            />
            <StatCard
              icon={<IconClock />}
              iconClass="bg-status-infoBg text-status-infoText"
              label={t("dashboard_avg_review_stat")}
              value={
                summary.avg_review_days !== null
                  ? `${summary.avg_review_days} ${t("dashboard_avg_review_days_suffix")}`
                  : t("dashboard_avg_review_no_data")
              }
              changePct={undefined}
            />
          </div>

          <div className="chart-grid">
            <div className="panel">
              <h2 className="panel-title">{t("dashboard_by_status")}</h2>
              <BarChart
                data={statusData}
                colorFor={(label) => {
                  const entry = statusData.find((d) => d.label === label);
                  return STATUS_COLOR[entry?.key] || "#64748b";
                }}
                onBarClick={handleStatusBarClick}
                selectedKey={drilldown?.type === "status" ? drilldown.value : undefined}
              />
            </div>
            <div className="panel">
              <h2 className="panel-title">{t("dashboard_by_category")}</h2>
              <PieChart
                data={categoryData}
                onSegmentClick={handleCategorySegmentClick}
                selectedLabel={drilldown?.type === "category" ? drilldown.label : undefined}
              />
            </div>
            <div className="panel col-span-2">
              <h2 className="panel-title">{t("dashboard_trend")}</h2>
              <TrendComparisonChart data={summary.daily_trend} />
            </div>
            <div className="panel">
              <h2 className="panel-title">{t("dashboard_funnel_title")}</h2>
              <FunnelChart stages={summary.funnel} rejectedCount={summary.rejected_count} />
            </div>
            <div className="panel">
              <h2 className="panel-title">{t("dashboard_top_positions_title")}</h2>
              <TopPositionsList positions={summary.top_positions} />
            </div>
          </div>

          {drilldown && (
            <div className="panel">
              <div className="drilldown-header">
                <h2 className="panel-title mb-0">
                  {t("dashboard_drilldown_title")}: {drilldown.label}
                </h2>
                <div className="drilldown-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => goToApplications(
                    drilldown.type === "status" ? { status: drilldown.value } : { category_id: drilldown.value }
                  )}>
                    {t("dashboard_view_all")}
                  </button>
                  <button className="btn-icon btn btn-secondary" type="button" onClick={() => setDrilldown(null)} aria-label={t("dashboard_clear_selection")}>
                    <IconX width="14" height="14" />
                  </button>
                </div>
              </div>

              {drilldownLoading ? (
                <Loading />
              ) : !drilldownResult || drilldownResult.items.length === 0 ? (
                <div className="empty-state">{t("apps_empty")}</div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("apps_id")}</th>
                      <th>{t("apps_full_name")}</th>
                      <th>{t("apps_position")}</th>
                      <th>{t("apps_status")}</th>
                      <th>{t("apps_submitted_at")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownResult.items.map((item) => (
                      <tr key={item.id} className="data-row" onClick={() => navigate(`/applications/${item.id}`)}>
                        <td>{item.id}</td>
                        <td>{item.full_name || "—"}</td>
                        <td>{item.position_name}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>{formatDate(item.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
