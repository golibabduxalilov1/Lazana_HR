import { useState } from "react";

export function BarChart({ data, colorFor, onBarClick, selectedKey }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <div className="bar-chart">
      {data.map((d) => {
        const isDimmed = selectedKey && d.key !== selectedKey;
        return (
          <div
            className={`bar-row${onBarClick ? " bar-row-clickable" : ""}${isDimmed ? " bar-row-dimmed" : ""}`}
            key={d.label}
            role={onBarClick ? "button" : undefined}
            tabIndex={onBarClick ? 0 : undefined}
            onClick={() => onBarClick?.(d)}
            onKeyDown={(e) => {
              if (onBarClick && (e.key === "Enter" || e.key === " ")) onBarClick(d);
            }}
            onMouseEnter={() => setHovered(d.label)}
            onMouseLeave={() => setHovered((h) => (h === d.label ? null : h))}
          >
            <span className="bar-label">{d.label}</span>
            <div className="bar-track-wrap">
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
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
            <span className="bar-pct">{Math.round((d.value / total) * 100)}%</span>
            <span className="bar-value">{d.value}</span>
          </div>
        );
      })}
    </div>
  );
}
