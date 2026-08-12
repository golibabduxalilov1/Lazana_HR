import { useState } from "react";

export function BarChart({ data, colorFor }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div
          className="bar-row"
          key={d.label}
          onMouseEnter={() => setHovered(d.label)}
          onMouseLeave={() => setHovered((h) => (h === d.label ? null : h))}
        >
          <span className="bar-label">{d.label}</span>
          <div className="bar-track-wrap">
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(d.value / max) * 100}%`,
                  background: colorFor ? colorFor(d.label) : undefined,
                }}
              />
            </div>
            {hovered === d.label && (
              <div className="chart-tooltip" style={{ left: `${Math.min((d.value / max) * 100, 100)}%` }}>
                {d.value} ({Math.round((d.value / total) * 100)}%)
              </div>
            )}
          </div>
          <span className="bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
