import { useState } from "react";
import { useI18n } from "../context/I18nContext";

// Validated categorical ramp (dataviz skill): passes CVD/contrast checks for the
// slot counts actually used here (position categories, typically 3).
export const CATEGORY_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

const CX = 70;
const CY = 70;
const R_OUTER = 62;
const R_INNER = 38;
const GAP_DEG = 2;

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(startAngle, endAngle) {
  const start = Math.min(startAngle, endAngle);
  const end = Math.max(startAngle, endAngle);
  const largeArc = end - start > 180 ? 1 : 0;
  const outerStart = polarToCartesian(CX, CY, R_OUTER, end);
  const outerEnd = polarToCartesian(CX, CY, R_OUTER, start);
  const innerStart = polarToCartesian(CX, CY, R_INNER, end);
  const innerEnd = polarToCartesian(CX, CY, R_INNER, start);
  return [
    "M", outerStart.x, outerStart.y,
    "A", R_OUTER, R_OUTER, 0, largeArc, 0, outerEnd.x, outerEnd.y,
    "L", innerEnd.x, innerEnd.y,
    "A", R_INNER, R_INNER, 0, largeArc, 1, innerStart.x, innerStart.y,
    "Z",
  ].join(" ");
}

export function PieChart({ data, onSegmentClick, selectedLabel }) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState(null);
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  let cumulative = 0;
  const segments = data.map((d, i) => {
    const startAngle = (cumulative / total) * 360;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 360;
    const gap = data.length > 1 ? GAP_DEG / 2 : 0;
    return {
      ...d,
      color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
      path: arcPath(startAngle + gap, endAngle - gap),
      pct: Math.round((d.value / total) * 100),
    };
  });

  const clickable = !!onSegmentClick;

  return (
    <div className="pie-chart-wrap">
      <div className="pie-chart-svg-wrap">
        <svg viewBox="0 0 140 140" className="pie-chart-svg">
          {segments.map((seg) => {
            const isDimmed = selectedLabel && seg.label !== selectedLabel;
            return (
              <path
                key={seg.label}
                d={seg.path}
                fill={seg.color}
                className={`pie-segment${clickable ? " pie-segment-clickable" : ""}${isDimmed ? " pie-segment-dimmed" : ""}`}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={() => onSegmentClick?.(seg)}
                onKeyDown={(e) => {
                  if (clickable && (e.key === "Enter" || e.key === " ")) onSegmentClick(seg);
                }}
                onMouseEnter={() => setHovered(seg.label)}
                onMouseLeave={() => setHovered((h) => (h === seg.label ? null : h))}
              />
            );
          })}
        </svg>
        <div className="pie-chart-hole">
          <span className="pie-chart-hole-value">{total}</span>
          <span className="pie-chart-hole-label">{t("dashboard_total_short")}</span>
        </div>
        {hovered && (
          <div className="chart-tooltip pie-chart-tooltip">
            {(() => {
              const seg = segments.find((s) => s.label === hovered);
              return `${seg.label}: ${seg.value} (${seg.pct}%)`;
            })()}
          </div>
        )}
      </div>
      <ul className="pie-legend">
        {segments.map((seg) => (
          <li
            key={seg.label}
            className={`${clickable ? "pie-legend-clickable" : ""}${selectedLabel === seg.label ? " pie-legend-active" : ""}`}
            onClick={() => onSegmentClick?.(seg)}
          >
            <span className="pie-swatch" style={{ background: seg.color }} />
            {seg.label}: {seg.value} ({seg.pct}%)
          </li>
        ))}
      </ul>
    </div>
  );
}
