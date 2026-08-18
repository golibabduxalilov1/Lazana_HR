import { useI18n } from "../context/I18nContext";

const STATUS_CLASS = {
  submitted: "badge-gray",
  reviewed: "badge-blue",
  invited: "badge-green",
  rejected: "badge-red",
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${STATUS_CLASS[status] || "badge-gray"}`}>
      {t(`status_${status}`) || status}
    </span>
  );
}
