import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

const NAV_ITEMS = [
  { to: "/dashboard", labelKey: "nav_dashboard", roles: ["super_admin", "admin"] },
  { to: "/applications", labelKey: "nav_applications", roles: ["super_admin", "admin"] },
  { to: "/positions", labelKey: "nav_positions", roles: ["super_admin", "admin"] },
  { to: "/texts", labelKey: "nav_texts", roles: ["super_admin", "admin"] },
  { to: "/export", labelKey: "nav_export", roles: ["super_admin", "admin"] },
  { to: "/admins", labelKey: "nav_admins", roles: ["super_admin", "admin"] },
];

export function Sidebar() {
  const { role } = useAuth();
  const { t } = useI18n();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">LAZANA HR</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => "sidebar-link" + (isActive ? " sidebar-link-active" : "")}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
