import { useI18n } from "../context/I18nContext";

export function Pagination({ page, pageSize, total, onPageChange }) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ‹
      </button>
      <span className="pagination-info">
        {page} / {totalPages} {t("apps_page_of")}
      </span>
      <button
        className="btn btn-secondary"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        ›
      </button>
    </div>
  );
}
