import { useI18n } from "../context/I18nContext";

function TrendArrow({ up }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="stat-trend-arrow">
      {up ? <path d="M5 1.5 9 7H1z" /> : <path d="M5 8.5 1 3h8z" />}
    </svg>
  );
}

export function StatCard({ icon, iconClass, label, value, changePct, invert = false, onClick }) {
  const { t } = useI18n();

  let trend = null;
  if (changePct === null) {
    trend = <span className="stat-trend stat-trend-neutral">{t("dashboard_new_badge")}</span>;
  } else if (changePct === 0) {
    trend = <span className="stat-trend stat-trend-neutral">{t("dashboard_no_change")}</span>;
  } else {
    const isPositive = changePct > 0;
    const isGood = invert ? !isPositive : isPositive;
    trend = (
      <span className={`stat-trend ${isGood ? "stat-trend-up" : "stat-trend-down"}`}>
        <TrendArrow up={isPositive} />
        {Math.abs(changePct)}%
      </span>
    );
  }

  const Tag = onClick ? "button" : "div";

  return (
    <Tag className={`stat-card${onClick ? " stat-card-clickable" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <div className={`stat-card-icon ${iconClass}`}>{icon}</div>
      <div className="stat-card-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {changePct !== undefined && (
          <div className="stat-trend-row">
            {trend}
            <span className="stat-trend-caption">{t("dashboard_vs_prev_period")}</span>
          </div>
        )}
      </div>
    </Tag>
  );
}
