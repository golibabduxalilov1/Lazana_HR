import { useI18n } from "../context/I18nContext";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import { Icon } from "./icons";

const PRESETS = [
  { key: "today", labelKey: "dashboard_period_today" },
  { key: "7d", labelKey: "dashboard_period_7d" },
  { key: "30d", labelKey: "dashboard_period_30d" },
  { key: "90d", labelKey: "dashboard_period_90d" },
  { key: "custom", labelKey: "dashboard_period_custom" },
];

const STATUSES = ["submitted", "reviewed", "invited", "rejected"];

export function FilterBar({ filters, onChange, categories }) {
  const { t } = useI18n();
  const { preset, customFrom, customTo, categoryIds, statuses } = filters;

  const hasActiveFilters =
    preset !== "30d" || categoryIds.length > 0 || statuses.length > 0;

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name_uz }));
  const statusOptions = STATUSES.map((s) => ({ value: s, label: t(`status_${s}`) }));

  const removeCategory = (id) => onChange({ ...filters, categoryIds: categoryIds.filter((c) => c !== String(id)) });
  const removeStatus = (s) => onChange({ ...filters, statuses: statuses.filter((v) => v !== s) });

  const clearAll = () =>
    onChange({ preset: "30d", customFrom: "", customTo: "", categoryIds: [], statuses: [] });

  const categoryName = (id) => categories.find((c) => String(c.id) === String(id))?.name_uz || id;

  return (
    <div className="filter-bar-compact">
      <div className="filter-bar mb-0">
        <div className="period-tabs">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`period-tab${preset === p.key ? " period-tab-active" : ""}`}
              onClick={() => onChange({ ...filters, preset: p.key })}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <>
            <input
              type="date"
              className="form-input"
              title={t("apps_filter_date_from")}
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => onChange({ ...filters, customFrom: e.target.value })}
            />
            <input
              type="date"
              className="form-input"
              title={t("apps_filter_date_to")}
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => onChange({ ...filters, customTo: e.target.value })}
            />
          </>
        )}

        <MultiSelectDropdown
          label={t("dashboard_filter_category_label")}
          allLabel={t("dashboard_filter_all_categories")}
          options={categoryOptions}
          selected={categoryIds}
          onChange={(next) => onChange({ ...filters, categoryIds: next })}
        />

        <MultiSelectDropdown
          label={t("dashboard_filter_status_label")}
          allLabel={t("dashboard_filter_all_statuses")}
          options={statusOptions}
          selected={statuses}
          onChange={(next) => onChange({ ...filters, statuses: next })}
        />

        {hasActiveFilters && (
          <button type="button" className="btn btn-secondary m-0" onClick={clearAll}>
            {t("dashboard_clear_filters")}
          </button>
        )}
      </div>

      {(categoryIds.length > 0 || statuses.length > 0) && (
        <div className="filter-chips">
          {categoryIds.map((id) => (
            <span className="filter-chip" key={`cat-${id}`}>
              {categoryName(id)}
              <button type="button" onClick={() => removeCategory(id)} aria-label="remove">
                <Icon name="close" className="text-[12px]" />
              </button>
            </span>
          ))}
          {statuses.map((s) => (
            <span className={`filter-chip filter-chip-${s}`} key={`status-${s}`}>
              {t(`status_${s}`)}
              <button type="button" onClick={() => removeStatus(s)} aria-label="remove">
                <Icon name="close" className="text-[12px]" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
