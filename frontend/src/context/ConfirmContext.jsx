import { createContext, useCallback, useContext, useRef, useState } from "react";
import { useI18n } from "./I18nContext";
import { IconX } from "../components/icons";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const { t } = useI18n();
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(
    (message, title) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({ message, title: title || t("confirm") });
      }),
    [t]
  );

  const settle = useCallback((result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={() => settle(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-header">
              <h2 className="confirm-title">{state.title}</h2>
              <button type="button" className="confirm-close" onClick={() => settle(false)} aria-label={t("cancel")}>
                <IconX />
              </button>
            </div>
            <div className="confirm-body">{state.message}</div>
            <div className="confirm-footer">
              <button type="button" className="btn btn-secondary" onClick={() => settle(false)}>
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => settle(true)}>
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
