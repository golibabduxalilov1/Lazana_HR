import { useState } from "react";
import { exportApplicationsCsv } from "../services/export";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { apiErrorMessage } from "../services/client";

const STATUSES = ["submitted", "reviewed", "invited", "rejected"];

export default function Export() {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState({ dateFrom: "", dateTo: "", status: "" });
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await exportApplicationsCsv(form);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">{t("export_title")}</h1>

      <div className="panel">
        <label className="form-label">{t("export_status")}</label>
        <select
          className="form-input"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="">{t("apps_all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>

        <label className="form-label">{t("export_date_from")}</label>
        <input
          type="date"
          className="form-input"
          value={form.dateFrom}
          onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
        />

        <label className="form-label">{t("export_date_to")}</label>
        <input
          type="date"
          className="form-input"
          value={form.dateTo}
          onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
        />

        <button className="btn btn-primary" disabled={loading} onClick={handleDownload}>
          {loading ? t("loading") : t("export_download")}
        </button>
      </div>
    </div>
  );
}
