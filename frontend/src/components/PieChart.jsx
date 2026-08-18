import { useState } from "react";
import { useI18n } from "../context/I18nContext";

// Matches the brand categorical sequence used across the reference design
// (navy / bright blue / amber), extended with further palette colors for
// installations with more than three categories.
export const CATEGORY_PALETTE = [
  "#0e1d47", // navy
  "#1e9af7", // bright blue
  "#ffb95f", // amber
  "#1baf7a", // aqua
  "#e87ba4", // magenta
  "#4a3aa7", // violet
  "#eda100", // yellow
  "#e34948", // red
];

const CX = 70;
const CY = 70;
const R_OUTER = 62;
const R_INNER = 46.5;
const GAP_DEG = 0;

function polarToCartesian(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// A single SVG arc command can't render a full 360deg sweep (start and end
// points coincide, so browsers draw nothing) — build the ring from two
// concentric circles instead, cut out with the evenodd fill rule.
function fullRingPath() {
  const outerRight = { x: CX + R_OUTER, y: CY };
  const outerLeft = { x: CX - R_OUTER, y: CY };
  const innerRight = { x: CX + R_INNER, y: CY };
  const innerLeft = { x: CX - R_INNER, y: CY };
  return [
    "M", outerRight.x, outerRight.y,
    "A", R_OUTER, R_OUTER, 0, 1, 0, outerLeft.x, outerLeft.y,
    "A", R_OUTER, R_OUTER, 0, 1, 0, outerRight.x, outerRight.y,
    "Z",
    "M", innerRight.x, innerRight.y,
    "A", R_INNER, R_INNER, 0, 1, 0, innerLeft.x, innerLeft.y,
    "A", R_INNER, R_INNER, 0, 1, 0, innerRight.x, innerRight.y,
    "Z",
  ].join(" ");
}

function arcPath(startAngle, endAngle) {
  const start = Math.min(startAngle, endAngle);
  const end = Math.max(startAngle, endAngle);
  if (end - start >= 359.9) return fullRingPath();
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

export function PieChart({ data, onSegmentClick, selectedLabel, colorFor, centerLabel }) {
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
      color: colorFor ? colorFor(d) : CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
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
                fillRule="evenodd"
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
          <span className="pie-chart-hole-label">{centerLabel || t("dashboard_total_short")}</span>
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
            <span className="pie-legend-left">
              <span className="pie-swatch" style={{ background: seg.color }} />
              {seg.label}
            </span>
            <span className="pie-legend-pct">{seg.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
