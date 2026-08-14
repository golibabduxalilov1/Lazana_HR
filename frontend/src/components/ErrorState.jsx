import { useI18n } from "../context/I18nContext";

export function ErrorState({ title, message, onRetry }) {
  const { t } = useI18n();
  return (
    <div className="empty-state empty-state-lg empty-state-error">
      <div className="empty-state-title">{title}</div>
      {message && <div className="empty-state-subtitle">{message}</div>}
      {onRetry && (
        <button type="button" className="btn btn-secondary mt-3" onClick={onRetry}>
          {t("dashboard_retry")}
        </button>
      )}
    </div>
  );
}
