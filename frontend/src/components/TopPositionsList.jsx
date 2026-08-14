import { useI18n } from "../context/I18nContext";

export function TopPositionsList({ positions }) {
  const { t } = useI18n();

  if (!positions.length) {
    return <div className="empty-state">{t("dashboard_top_positions_empty")}</div>;
  }

  return (
    <ol className="top-positions-list">
      {positions.map((p, i) => (
        <li className="top-position-item" key={p.position_id}>
          <span className="top-position-rank">{i + 1}</span>
          <div className="top-position-body">
            <div className="top-position-row">
              <span className="top-position-name">{p.name}</span>
              <span className="top-position-count">{p.count}</span>
            </div>
            <div className="top-position-meta">{p.category_name}</div>
            <div className="top-position-track">
              <div className="top-position-fill" style={{ width: `${Math.max(p.pct, 4)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
