import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { apiErrorMessage } from "../services/client";
import { IconClock, IconFileText, IconUsers } from "../components/icons";

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      const dest = location.state?.from?.pathname || "/dashboard";
      navigate(dest, { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, t("error_generic")));
    } finally {
      setLoading(false);
    }
  };

  const shieldIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.4 2.4L15.5 9.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-visual-grid" aria-hidden="true" />
        <div className="login-visual-glow login-visual-glow-1" aria-hidden="true" />
        <div className="login-visual-glow login-visual-glow-2" aria-hidden="true" />

        <div className="login-brand">
          <span className="login-brand-mark" aria-hidden="true">
            {shieldIcon}
          </span>
          <span className="login-brand-name">LAZANA HR</span>
        </div>

        <div className="login-hero">
          <h1 className="login-hero-title">
            {t("login_hero_title_line1")}
            <span className="login-hero-title-accent">{t("login_hero_title_line2")}</span>
          </h1>
          <p className="login-hero-subtitle">{t("login_hero_subtitle")}</p>
        </div>

        <ul className="login-feature-list">
          <li className="login-feature">
            <span className="login-feature-icon" aria-hidden="true">
              <IconFileText width={18} height={18} />
            </span>
            <span>{t("login_feature_1")}</span>
          </li>
          <li className="login-feature">
            <span className="login-feature-icon" aria-hidden="true">
              <IconClock width={18} height={18} />
            </span>
            <span>{t("login_feature_2")}</span>
          </li>
          <li className="login-feature">
            <span className="login-feature-icon" aria-hidden="true">
              <IconUsers width={18} height={18} />
            </span>
            <span>{t("login_feature_3")}</span>
          </li>
        </ul>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div className="login-mobile-brand">
            <span className="login-logo" aria-hidden="true">
              {shieldIcon}
            </span>
            <span className="login-brand-name">LAZANA HR</span>
          </div>

          <span className="login-badge">
            <span className="login-badge-dot" aria-hidden="true" />
            {t("login_badge")}
          </span>

          <h2 className="login-title">{t("login_title")}</h2>
          <p className="login-subtitle">{t("login_subtitle")}</p>

          <div className="form-group">
            <label className="form-label" htmlFor="username">
              {t("username")}
            </label>
            <div className="input-group">
              <span className="input-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M4.5 20c1.4-3.8 4.4-5.8 7.5-5.8s6.1 2 7.5 5.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="username"
                className="form-input input-with-icon"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                placeholder={t("username")}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              {t("password")}
            </label>
            <div className="input-group">
              <span className="input-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="10.5" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M8 10.5V7.5a4 4 0 1 1 8 0v3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input input-with-icon input-with-action"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder={t("password")}
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? t("password_hide") : t("password_show")}
              >
                {showPassword ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3l18 18M9.9 5.5A10.4 10.4 0 0 1 12 5.3c5.2 0 8.7 3.7 10.2 6.7-.6 1.2-1.6 2.6-3 3.9M6.6 6.9C4.4 8.4 2.8 10.4 1.8 12c1.5 3 5 6.7 10.2 6.7 1.6 0 3-.3 4.2-.9M9.9 12a2.6 2.6 0 0 0 3.6 2.4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M1.8 12c1.5-3 5-6.7 10.2-6.7S20.7 9 22.2 12c-1.5 3-5 6.7-10.2 6.7S3.3 15 1.8 12Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error form-error-box" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="16" r="0.9" fill="currentColor" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
            {loading && <span className="btn-spinner" aria-hidden="true" />}
            {loading ? t("loading") : t("login_button")}
          </button>

          <p className="login-footer">
            © {new Date().getFullYear()} LAZANA — {t("login_footer")}
          </p>
        </form>
      </div>
    </div>
  );
}
