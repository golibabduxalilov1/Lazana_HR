export function EmptyState({ title, subtitle, icon }) {
  return (
    <div className="empty-state empty-state-lg">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-title">{title}</div>
      {subtitle && <div className="empty-state-subtitle">{subtitle}</div>}
    </div>
  );
}
