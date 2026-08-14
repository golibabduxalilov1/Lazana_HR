export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton skeleton-filterbar" />
      <div className="stat-cards">
        {[0, 1, 2, 3].map((i) => (
          <div className="stat-card" key={i}>
            <div className="skeleton skeleton-circle" />
            <div className="stat-card-body">
              <div className="skeleton skeleton-line skeleton-line-lg" />
              <div className="skeleton skeleton-line skeleton-line-sm" />
              <div className="skeleton skeleton-line skeleton-line-xs" />
            </div>
          </div>
        ))}
      </div>
      <div className="chart-grid">
        <div className="panel">
          <div className="skeleton skeleton-line skeleton-line-sm mb-4" />
          <div className="skeleton skeleton-block" style={{ height: 180 }} />
        </div>
        <div className="panel">
          <div className="skeleton skeleton-line skeleton-line-sm mb-4" />
          <div className="skeleton skeleton-block" style={{ height: 180 }} />
        </div>
        <div className="panel col-span-2">
          <div className="skeleton skeleton-line skeleton-line-sm mb-4" />
          <div className="skeleton skeleton-block" style={{ height: 200 }} />
        </div>
      </div>
    </div>
  );
}
