import { useI18n } from "../context/I18nContext";

export function ActiveBadge({ active }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${active ? "badge-green" : "badge-gray"}`}>
      {active ? t("active") : t("inactive")}
    </span>
  );
}
