import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="not-found">
      <h1>404</h1>
      <p>{t("not_found")}</p>
      <Link className="btn btn-primary" to="/dashboard">
        {t("nav_dashboard")}
      </Link>
    </div>
  );
}
