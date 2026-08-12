import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export function Topbar() {
  const { fullName, role, logout } = useAuth();
  const { t, locale, setLocale, locales } = useI18n();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-spacer" />
      <div className="topbar-locale">
        {locales.map((loc) => (
          <button
            key={loc}
            className={"locale-btn" + (loc === locale ? " locale-btn-active" : "")}
            onClick={() => setLocale(loc)}
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="topbar-user">
        <span className="topbar-name">{fullName || "Admin"}</span>
        <span className="topbar-role">{t(`role_${role}`)}</span>
      </div>
      <button className="btn btn-secondary" onClick={handleLogout}>
        {t("logout")}
      </button>
    </header>
  );
}
