import { useEffect, useState } from "react";
import { getStatsSummary } from "../services/stats";
import { useToast } from "../context/ToastContext";
import { useI18n } from "../context/I18nContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { BarChart } from "../components/BarChart";
import { PieChart } from "../components/PieChart";

const STATUS_COLOR = {
  submitted: "#2563eb",
  reviewed: "#f59e0b",
  invited: "#16a34a",
  rejected: "#dc2626",
};

export default function Dashboard() {
  const { t } = useI18n();
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStatsSummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loading />;
  if (!summary) return null;

  const statusData = Object.entries(summary.by_status).map(([label, value]) => ({
    label: t(`status_${label}`) || label,
    value,
    key: label,
  }));
  const categoryData = Object.entries(summary.by_category).map(([label, value]) => ({ label, value }));

  return (
    <div>
      <h1 className="page-title">{t("nav_dashboard")}</h1>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-value">{summary.total}</div>
          <div className="stat-label">{t("dashboard_total")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.last_7_days}</div>
          <div className="stat-label">{t("dashboard_last7")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.last_30_days}</div>
          <div className="stat-label">{t("dashboard_last30")}</div>
        </div>
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
          />
        </div>
        <div className="panel">
          <h2 className="panel-title">{t("dashboard_by_category")}</h2>
          <PieChart data={categoryData} />
        </div>
      </div>
    </div>
  );
}
