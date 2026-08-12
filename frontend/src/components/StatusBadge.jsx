import { useI18n } from "../context/I18nContext";

const STATUS_CLASS = {
  submitted: "badge-blue",
  reviewed: "badge-yellow",
  invited: "badge-green",
  rejected: "badge-red",
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${STATUS_CLASS[status] || "badge-gray"}`}>
      <span className="badge-dot" />
      {t(`status_${status}`) || status}
    </span>
  );
}
