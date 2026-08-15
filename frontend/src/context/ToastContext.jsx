import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);
let nextId = 1;

const ICONS = {
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="toast-icon-svg">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16Zm-1-9a1 1 0 112 0v3a1 1 0 11-2 0V9Zm1-4a1.1 1.1 0 100 2.2A1.1 1.1 0 0010 5Z" clipRule="evenodd" />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="toast-icon-svg">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16Zm3.7-9.7-4.2 4.2a1 1 0 0 1-1.4 0L6.3 10.7a1 1 0 1 1 1.4-1.4l1.1 1.1 3.5-3.5a1 1 0 0 1 1.4 1.4Z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="toast-icon-svg">
      <path fillRule="evenodd" d="M8.48 3.5c.66-1.15 2.38-1.15 3.04 0l6.34 11a1.75 1.75 0 0 1-1.52 2.62H3.66a1.75 1.75 0 0 1-1.52-2.62l6.34-11ZM10 7a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 8.1a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z" clipRule="evenodd" />
    </svg>
  ),
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, type = "error") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const value = {
    error: (message) => push(message, "error"),
    success: (message) => push(message, "success"),
    warning: (message) => push(message, "warning"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)} role="alert">
            <span className="toast-icon">{ICONS[t.type]}</span>
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={(e) => {
                e.stopPropagation();
                remove(t.id);
              }}
              aria-label="Yopish"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
