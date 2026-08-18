import { useI18n } from "../context/I18nContext";

export function PriorityBadge({ priority }) {
  const { t } = useI18n();
  return (
    <span className={`badge ${priority ? "badge-yellow" : "badge-gray"}`}>
      {priority ? t("priority_yes") : t("priority_no")}
    </span>
  );
}
