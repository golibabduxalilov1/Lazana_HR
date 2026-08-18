import { useState } from "react";
import { useI18n } from "../context/I18nContext";

const WIDTH = 640;
const HEIGHT = 200;
const PAD_X = 8;
const PAD_Y = 16;
const CURRENT_COLOR = "#1e9af7";
const PREVIOUS_COLOR = "#767680";

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

  // Smooth polyline into a curve (Chart.js-style tension) using cubic
  // Bezier segments derived from each point's neighbors.
  const smoothPath = (key) => {
    if (points.length < 2) return "";
    const pts = points.map((p) => ({ x: p.x, y: p[key] }));
    const tension = 0.2;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 3;
      const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 3;
      const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 3;
      const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 3;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = smoothPath;
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

  // Evenly spaced dashed gridlines (Chart.js-style y-axis grid).
  const GRID_LINES = 4;
  const gridYs = Array.from({ length: GRID_LINES + 1 }, (_, i) => PAD_Y + (i / GRID_LINES) * (HEIGHT - PAD_Y * 2));

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
            <stop offset="0%" stopColor={CURRENT_COLOR} stopOpacity="0.1" />
            <stop offset="100%" stopColor={CURRENT_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridYs.map((y, i) => (
          <line key={i} x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y} stroke="#c6c6d0" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="5 5" />
        ))}
        {n > 1 && <path d={areaPath} fill="url(#trendFill)" stroke="none" />}
        {n > 1 && (
          <path d={linePath("yPrevious")} fill="none" stroke={PREVIOUS_COLOR} strokeWidth="2" strokeDasharray="4 4" />
        )}
        {n > 1 && <path d={linePath("yCurrent")} fill="none" stroke={CURRENT_COLOR} strokeWidth="3" strokeLinecap="round" />}
        {tooltipPoint && (
          <line
            x1={tooltipPoint.x}
            y1="0"
            x2={tooltipPoint.x}
            y2={HEIGHT}
            stroke="#c6c6d0"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
        {points.map((p, i) => (
          <g key={p.date || i}>
            <circle cx={p.x} cy={p.yPrevious} r={hovered === i ? 4 : 2.5} fill={PREVIOUS_COLOR} />
            <circle cx={p.x} cy={p.yCurrent} r={hovered === i ? 6 : 4} fill="#ffffff" stroke={CURRENT_COLOR} strokeWidth="2" />
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
