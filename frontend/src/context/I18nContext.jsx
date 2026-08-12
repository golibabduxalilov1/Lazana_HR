import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { dictionaries, DEFAULT_LOCALE } from "../i18n";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(
    localStorage.getItem("lazana_locale") || DEFAULT_LOCALE
  );

  const setLocale = useCallback((next) => {
    localStorage.setItem("lazana_locale", next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key) => dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key,
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, locales: Object.keys(dictionaries) }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
