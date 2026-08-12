import { useI18n } from "../context/I18nContext";

export function ActiveBadge({ active }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${active ? "badge-green" : "badge-gray"}`}>
      <span className="badge-dot" />
      {active ? t("active") : t("inactive")}
    </span>
  );
}
