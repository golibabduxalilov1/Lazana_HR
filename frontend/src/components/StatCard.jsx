import { useI18n } from "../context/I18nContext";
import { Icon } from "./icons";

function TrendArrow({ up }) {
  return <Icon name={up ? "arrow_upward" : "arrow_downward"} className="stat-trend-arrow text-[14px]" />;
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
  const blobClass = iconClass.split(" ")[0];

  return (
    <Tag className={`stat-card${onClick ? " stat-card-clickable" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      <div className={`stat-card-blob ${blobClass}`} />
      <div className="stat-card-header">
        <div className="stat-card-label">{label}</div>
        <div className={`stat-card-icon ${iconClass}`}>{icon}</div>
      </div>
      <div className="stat-card-body">
        <div className="stat-value">{value}</div>
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
