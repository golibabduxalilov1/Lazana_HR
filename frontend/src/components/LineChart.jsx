import { useState } from "react";

const WIDTH = 600;
const HEIGHT = 160;
const PAD_X = 8;
const PAD_Y = 12;

export function LineChart({ data, color = "#4F46E5" }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;

  const points = data.map((d, i) => ({
    ...d,
    x: n > 1 ? PAD_X + (i / (n - 1)) * (WIDTH - PAD_X * 2) : WIDTH / 2,
    y: HEIGHT - PAD_Y - (d.value / max) * (HEIGHT - PAD_Y * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath =
    n > 1 ? `${linePath} L ${points[n - 1].x} ${HEIGHT} L ${points[0].x} ${HEIGHT} Z` : "";

  return (
    <div className="line-chart-wrap">
      <svg className="line-chart-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {n > 1 && <path d={areaPath} fill="url(#lineChartFill)" stroke="none" />}
        {n > 1 && <path d={linePath} fill="none" stroke={color} strokeWidth="2" />}
        {points.map((p, i) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 4 : 2.5}
            fill={color}
            className="line-chart-point"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
          />
        ))}
      </svg>
      {hovered !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(points[hovered].x / WIDTH) * 100}%`,
            top: `${(points[hovered].y / HEIGHT) * 100}%`,
          }}
        >
          {points[hovered].label}: {points[hovered].value}
        </div>
      )}
      <div className="line-chart-axis">
        <span>{points[0]?.label}</span>
        <span>{points[n - 1]?.label}</span>
      </div>
    </div>
  );
}
