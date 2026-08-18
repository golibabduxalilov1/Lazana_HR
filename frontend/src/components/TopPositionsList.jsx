import { useI18n } from "../context/I18nContext";

const RANK_CLASS = ["top-position-rank-gold", "top-position-rank-silver", "top-position-rank-bronze"];

export function TopPositionsList({ positions }) {
  const { t } = useI18n();

  if (!positions.length) {
    return <div className="empty-state">{t("dashboard_top_positions_empty")}</div>;
  }

  return (
    <ol className="top-positions-list">
      {positions.map((p, i) => (
        <li className="top-position-item" key={p.position_id}>
          <span className={`top-position-rank ${RANK_CLASS[i] || ""}`}>{i + 1}</span>
          <div className="top-position-body">
            <div className="top-position-row">
              <span className="top-position-name">{p.name}</span>
              <span className="top-position-count">{p.count}</span>
            </div>
            {p.category_name && <span className="top-position-chip">{p.category_name}</span>}
            <div className="top-position-track">
              <div className="top-position-fill" style={{ width: `${Math.max(p.pct, 4)}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
