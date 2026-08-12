import { createContext, useContext, useMemo, useCallback } from "react";
import { dictionaries, DEFAULT_LOCALE } from "../i18n";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const t = useCallback((key) => dictionaries[DEFAULT_LOCALE][key] ?? key, []);

  const value = useMemo(() => ({ locale: DEFAULT_LOCALE, t }), [t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
