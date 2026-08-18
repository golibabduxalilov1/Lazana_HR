import { useState } from "react";
import { useI18n } from "../context/I18nContext";

const STAGE_COLORS = { submitted: "#0e1d47", reviewed: "#155a97", invited: "#1e9af7" };
const STAGE_LABEL_KEYS = {
  submitted: "dashboard_funnel_new",
  reviewed: "dashboard_funnel_reviewed",
  invited: "dashboard_funnel_invited",
};

const CHART_WIDTH = 280;
const STAGE_HEIGHT = 52;
const BAND_GAP = 3;
const MIN_WIDTH = 24;

export function FunnelChart({ stages, rejectedCount }) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(null);
  const maxCount = stages[0]?.count || 0;
  const chartHeight = stages.length * STAGE_HEIGHT;

  const widthFor = (count) => {
    if (!maxCount) return 0;
    const raw = (count / maxCount) * CHART_WIDTH;
    return count > 0 ? Math.max(raw, MIN_WIDTH) : 0;
  };

  const bands = stages.map((stage, i) => {
    const topW = widthFor(stage.count);
    const nextStage = stages[i + 1];
    const bottomW = nextStage ? widthFor(nextStage.count) : Math.max(topW - 30, MIN_WIDTH * 0.6);
    const y0 = i * STAGE_HEIGHT;
    const y1 = y0 + STAGE_HEIGHT - BAND_GAP;
    const leftTop = (CHART_WIDTH - topW) / 2;
    const leftBottom = (CHART_WIDTH - bottomW) / 2;
    const prevStage = i > 0 ? stages[i - 1] : null;
    const stepConversion =
      prevStage && prevStage.count ? Math.round((stage.count / prevStage.count) * 100) : null;
    return {
      ...stage,
      points: `${leftTop},${y0} ${leftTop + topW},${y0} ${leftBottom + bottomW},${y1} ${leftBottom},${y1}`,
      cy: (y0 + y1) / 2,
      color: STAGE_COLORS[stage.key] || "#1e9af7",
      stepConversion,
    };
  });

  return (
    <div className="funnel-chart-visual">
      <svg
        className="funnel-chart-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {bands.map((b) => (
          <g
            key={b.key}
            onMouseEnter={() => setHovered(b.key)}
            onMouseLeave={() => setHovered((h) => (h === b.key ? null : h))}
          >
            <polygon points={b.points} fill={b.color} opacity={hovered && hovered !== b.key ? 0.55 : 1} className="funnel-band" />
            <text x={CHART_WIDTH / 2} y={b.cy + 5} textAnchor="middle" className="funnel-band-count">
              {b.count}
            </text>
          </g>
        ))}
      </svg>
      <ul className="funnel-legend">
        {bands.map((b) => (
          <li key={b.key} className={`funnel-legend-item${hovered === b.key ? " funnel-legend-active" : ""}`}>
            <span className="funnel-legend-swatch" style={{ background: b.color }} />
            <span className="funnel-legend-label">{t(STAGE_LABEL_KEYS[b.key] || b.key)}</span>
            {b.stepConversion !== null && <span className="funnel-legend-conv">→ {b.stepConversion}%</span>}
            <span className="funnel-legend-pct">{b.pct}%</span>
          </li>
        ))}
      </ul>
      {rejectedCount > 0 && (
        <div className="funnel-rejected">
          <span className="badge badge-red">
            {t("dashboard_funnel_rejected_note")}: {rejectedCount}
          </span>
        </div>
      )}
    </div>
  );
}
