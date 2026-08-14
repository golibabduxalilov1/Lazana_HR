import { useI18n } from "../context/I18nContext";

const STAGE_COLORS = { submitted: "#6da7ec", reviewed: "#2a78d6", invited: "#184f95" };
const STAGE_LABEL_KEYS = {
  submitted: "dashboard_funnel_new",
  reviewed: "dashboard_funnel_reviewed",
  invited: "dashboard_funnel_invited",
};

export function FunnelChart({ stages, rejectedCount }) {
  const { t } = useI18n();
  const maxCount = stages[0]?.count || 0;

  return (
    <div className="funnel-chart">
      {stages.map((stage, i) => {
        const widthPct = maxCount ? (stage.count / maxCount) * 100 : 0;
        const prevStage = i > 0 ? stages[i - 1] : null;
        const stepConversion =
          prevStage && prevStage.count ? Math.round((stage.count / prevStage.count) * 100) : null;
        return (
          <div className="funnel-stage" key={stage.key}>
            <div className="funnel-stage-header">
              <span className="funnel-stage-label">{t(STAGE_LABEL_KEYS[stage.key] || stage.key)}</span>
              {stepConversion !== null && <span className="funnel-stage-conversion">→ {stepConversion}%</span>}
            </div>
            <div className="funnel-bar-track">
              <div
                className="funnel-bar-fill"
                style={{ width: `${Math.max(widthPct, maxCount ? 3 : 0)}%`, background: STAGE_COLORS[stage.key] || "#2a78d6" }}
              >
                <span className="funnel-bar-count">{stage.count}</span>
              </div>
            </div>
            <span className="funnel-stage-pct">{stage.pct}%</span>
          </div>
        );
      })}
      {rejectedCount > 0 && (
        <div className="funnel-rejected">
          <span className="badge badge-red">
            <span className="badge-dot" />
            {t("dashboard_funnel_rejected_note")}: {rejectedCount}
          </span>
        </div>
      )}
    </div>
  );
}
