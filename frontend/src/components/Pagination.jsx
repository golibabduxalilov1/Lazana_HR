import { useI18n } from "../context/I18nContext";
import { Icon } from "./icons";

function buildPageList(current, total) {
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  if (total > 1) pages.push(total);

  return pages;
}

export function Pagination({ page, pageSize, total, onPageChange }) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="pagination-footer">
      <span className="pagination-footer-text">
        {t("apps_showing")}: {from}-{to} {t("apps_showing_of")} {total} {t("apps_showing_suffix")}
      </span>
      <div className="flex gap-1">
        <button className="pagination-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t("prev")}>
          <Icon name="chevron_left" className="text-[18px]" />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-outline">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={p === page ? "pagination-current" : "pagination-btn"}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label={t("next")}
        >
          <Icon name="chevron_right" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
