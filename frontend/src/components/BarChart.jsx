export function BarChart({ data, colorFor }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="bar-label">{d.label}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: colorFor ? colorFor(d.label) : undefined,
              }}
            />
          </div>
          <span className="bar-value">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
