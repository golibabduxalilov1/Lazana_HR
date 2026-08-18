import { useEffect, useRef, useState } from "react";
import { useI18n } from "../context/I18nContext";
import { Icon } from "./icons";

export function MultiSelectDropdown({ label, allLabel, options, selected, onChange }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const buttonText =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? options.find((o) => String(o.value) === String(selected[0]))?.label || allLabel
        : `${selected.length} ${t("dashboard_selected_suffix")}`;

  return (
    <div className="multiselect" ref={ref}>
      <button
        type="button"
        className={`multiselect-trigger form-input${selected.length ? " multiselect-trigger-active" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="multiselect-trigger-label">
          <span className="multiselect-trigger-prefix">{label}:</span> {buttonText}
        </span>
        <Icon name="expand_more" className={`multiselect-chevron${open ? " multiselect-chevron-open" : ""}`} />
      </button>
      {open && (
        <div className="multiselect-panel">
          {options.length === 0 ? (
            <div className="multiselect-empty">{t("dashboard_top_positions_empty")}</div>
          ) : (
            options.map((opt) => (
              <label className="multiselect-option" key={opt.value}>
                <input
                  type="checkbox"
                  checked={selected.includes(String(opt.value))}
                  onChange={() => toggle(String(opt.value))}
                />
                <span>{opt.label}</span>
              </label>
            ))
          )}
          {selected.length > 0 && (
            <button type="button" className="multiselect-clear" onClick={() => onChange([])}>
              {t("dashboard_clear_filters")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
