import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { Icon } from "./icons";

const PAGE_LABEL_KEYS = {
  dashboard: "nav_dashboard",
  applications: "nav_applications",
  positions: "nav_positions",
  texts: "nav_texts",
  admins: "nav_admins",
};

function initials(name) {
  if (!name) return "A";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function Topbar() {
  const { fullName, role } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  const segment = location.pathname.split("/").filter(Boolean)[0] || "dashboard";
  const labelKey = PAGE_LABEL_KEYS[segment];
  const isDetail = segment === "applications" && location.pathname.split("/").filter(Boolean).length > 1;

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>{t("breadcrumb_home")}</span>
        {labelKey && (
          <>
            <Icon name="chevron_right" className="text-outline text-[16px]" />
            <span className={isDetail ? "" : "breadcrumb-current"}>{t(labelKey)}</span>
          </>
        )}
        {isDetail && (
          <>
            <Icon name="chevron_right" className="text-outline text-[16px]" />
            <span className="breadcrumb-current">#{location.pathname.split("/").filter(Boolean)[1]}</span>
          </>
        )}
      </div>

      <div className="topbar-spacer" />

      <span className="role-badge">{t(`role_${role}`)}</span>

      <button className="topbar-bell" aria-label={t("notifications")} title={t("notifications")}>
        <Icon name="notifications" className="text-[18px]" />
      </button>

      <button className="topbar-bell" aria-label={t("help")} title={t("help")}>
        <Icon name="help" className="text-[18px]" />
      </button>

      <div className="topbar-user">
        <div className="topbar-avatar">{initials(fullName)}</div>
        <span className="topbar-name">{fullName || "Admin"}</span>
        <Icon name="arrow_drop_down" className="text-outline text-[18px]" />
      </div>
    </header>
  );
}
