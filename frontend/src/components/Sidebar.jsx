import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import {
  IconGrid,
  IconInbox,
  IconBriefcase,
  IconFileText,
  IconUsers,
  IconLogout,
} from "./icons";

const NAV_GROUPS = [
  {
    labelKey: "nav_group_main",
    items: [{ to: "/dashboard", labelKey: "nav_dashboard", icon: IconGrid, roles: ["super_admin", "admin", "hr"] }],
  },
  {
    labelKey: "nav_group_management",
    items: [
      { to: "/applications", labelKey: "nav_applications", icon: IconInbox, roles: ["super_admin", "admin", "hr"] },
      { to: "/positions", labelKey: "nav_positions", icon: IconBriefcase, roles: ["super_admin", "admin", "hr"] },
      { to: "/texts", labelKey: "nav_texts", icon: IconFileText, roles: ["super_admin", "admin", "hr"] },
    ],
  },
  {
    labelKey: "nav_group_admin",
    items: [{ to: "/admins", labelKey: "nav_admins", icon: IconUsers, roles: ["super_admin", "admin"] }],
  },
];

function initials(name) {
  if (!name) return "A";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function Sidebar() {
  const { role, fullName, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.svg" alt="LAZANA HR" className="h-8 w-auto" />
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => item.roles.includes(role));
          if (items.length === 0) return null;
          return (
            <div key={group.labelKey}>
              <div className="sidebar-group-label">{t(group.labelKey)}</div>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}
                  >
                    <Icon />
                    {t(item.labelKey)}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-avatar">{initials(fullName)}</div>
        <div className="min-w-0 flex-1">
          <div className="sidebar-footer-name">{fullName || "Admin"}</div>
          <div className="sidebar-footer-role">{t(`role_${role}`)}</div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} aria-label={t("logout")} title={t("logout")}>
          <IconLogout />
        </button>
      </div>
    </aside>
  );
}
