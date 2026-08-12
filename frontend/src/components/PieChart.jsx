const PALETTE = ["#2563eb", "#f59e0b", "#16a34a", "#dc2626", "#8b5cf6", "#0891b2"];

export function PieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let cumulative = 0;

  const gradientStops = data
    .map((d, i) => {
      const start = (cumulative / total) * 360;
      cumulative += d.value;
      const end = (cumulative / total) * 360;
      return `${PALETTE[i % PALETTE.length]} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="pie-chart-wrap">
      <div className="pie-chart" style={{ background: `conic-gradient(${gradientStops})` }} />
      <ul className="pie-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="pie-swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
            {d.label}: {d.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
