import { useState } from "react";
import { useI18n } from "../context/I18nContext";

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 8;
const PAD_Y = 16;
const CURRENT_COLOR = "#1e9af7";
const PREVIOUS_COLOR = "#94A3B8";

export function TrendComparisonChart({ data }) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(null);
  const n = data.length;
  const max = Math.max(1, ...data.map((d) => Math.max(d.current, d.previous)));

  const points = data.map((d, i) => ({
    ...d,
    x: n > 1 ? PAD_X + (i / (n - 1)) * (WIDTH - PAD_X * 2) : WIDTH / 2,
    yCurrent: HEIGHT - PAD_Y - (d.current / max) * (HEIGHT - PAD_Y * 2),
    yPrevious: HEIGHT - PAD_Y - (d.previous / max) * (HEIGHT - PAD_Y * 2),
  }));

  const linePath = (key) => points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p[key]}`).join(" ");
  const areaPath =
    n > 1 ? `${linePath("yCurrent")} L ${points[n - 1].x} ${HEIGHT} L ${points[0].x} ${HEIGHT} Z` : "";

  const handleMove = (e) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setHovered(closest);
  };

  const tooltipPoint = hovered !== null ? points[hovered] : null;

  return (
    <div className="trend-chart-wrap">
      <div className="trend-chart-legend">
        <span className="trend-legend-item">
          <span className="trend-legend-swatch trend-legend-current" />
          {t("dashboard_trend_current")}
        </span>
        <span className="trend-legend-item">
          <span className="trend-legend-swatch trend-legend-previous" />
          {t("dashboard_trend_previous")}
        </span>
      </div>
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CURRENT_COLOR} stopOpacity="0.18" />
            <stop offset="100%" stopColor={CURRENT_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        {n > 1 && <path d={areaPath} fill="url(#trendFill)" stroke="none" />}
        {n > 1 && (
          <path d={linePath("yPrevious")} fill="none" stroke={PREVIOUS_COLOR} strokeWidth="2" strokeDasharray="4 4" />
        )}
        {n > 1 && <path d={linePath("yCurrent")} fill="none" stroke={CURRENT_COLOR} strokeWidth="2" />}
        {tooltipPoint && (
          <line
            x1={tooltipPoint.x}
            y1="0"
            x2={tooltipPoint.x}
            y2={HEIGHT}
            stroke="#E2E8F0"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        {points.map((p, i) => (
          <g key={p.date || i}>
            <circle cx={p.x} cy={p.yCurrent} r={hovered === i ? 4 : 2.5} fill={CURRENT_COLOR} />
            <circle cx={p.x} cy={p.yPrevious} r={hovered === i ? 4 : 2.5} fill={PREVIOUS_COLOR} />
          </g>
        ))}
      </svg>
      {tooltipPoint && (
        <div
          className="chart-tooltip trend-tooltip"
          style={{
            left: `${(tooltipPoint.x / WIDTH) * 100}%`,
            top: `${(Math.min(tooltipPoint.yCurrent, tooltipPoint.yPrevious) / HEIGHT) * 100}%`,
          }}
        >
          <div className="trend-tooltip-label">{tooltipPoint.label}</div>
          <div className="trend-tooltip-row">
            <span className="trend-tooltip-dot trend-tooltip-dot-current" />
            {t("dashboard_trend_current")}: {tooltipPoint.current}
          </div>
          <div className="trend-tooltip-row">
            <span className="trend-tooltip-dot trend-tooltip-dot-previous" />
            {t("dashboard_trend_previous")}: {tooltipPoint.previous}
          </div>
        </div>
      )}
      <div className="line-chart-axis">
        <span>{points[0]?.label}</span>
        <span>{points[n - 1]?.label}</span>
      </div>
    </div>
  );
}
