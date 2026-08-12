import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { changeApplicationStatus, deleteApplication, getApplication } from "../services/applications";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";
import { StatusBadge } from "../components/StatusBadge";
import { RoleGate } from "../components/RoleGate";
import { IconUsers, IconFileText, IconCalendar, IconClock, IconTrendingUp, IconTrash } from "../components/icons";

const VALID_TRANSITIONS = {
  submitted: ["reviewed"],
  reviewed: ["invited", "rejected"],
  invited: [],
  rejected: [],
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" });
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value}</div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="detail-card">
      <div className="detail-card-header">
        <span className="detail-card-icon">{icon}</span>
        <h2 className="detail-card-title">{title}</h2>
      </div>
      <div className="detail-card-body">{children}</div>
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getApplication(id)
      .then(setApplication)
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (newStatus) => {
    setSubmitting(true);
    try {
      await changeApplicationStatus(id, newStatus, comment);
      setComment("");
      toast.success(t("save"));
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("detail_delete_confirm"))) return;
    try {
      await deleteApplication(id);
      navigate(`/applications${location.search}`);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  if (loading) return <Loading />;
  if (!application) return null;

  const transitions = VALID_TRANSITIONS[application.status] || [];

  return (
    <div>
      <button className="btn btn-secondary back-btn" onClick={() => navigate(`/applications${location.search}`)}>
        ← {t("back")}
      </button>

      <div className="detail-header">
        <div className="detail-header-title">
          <h1 className="page-title !mb-0">
            {t("detail_title")} #{application.id}
          </h1>
          <StatusBadge status={application.status} />
        </div>

        <RoleGate roles={["super_admin"]}>
          <button className="btn btn-danger !mr-0" onClick={handleDelete}>
            <span className="inline-flex items-center gap-1.5">
              <IconTrash /> {t("delete")}
            </span>
          </button>
        </RoleGate>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <Section icon={<IconUsers />} title={t("detail_section_basic")}>
            <Field label={t("apps_full_name")} value={application.full_name} />
            <Field label={t("apps_phone")} value={application.phone} />
            <Field label={t("apps_position")} value={application.position_name} />
            <Field label={t("apps_category")} value={application.category_name} />
            <Field label={t("detail_birth_date")} value={application.birth_date} />
            <Field label={t("detail_address")} value={application.address} />
            <Field label={t("detail_source")} value={application.source} />
          </Section>

          <Section icon={<IconFileText />} title={t("detail_section_qualification")}>
            <Field label={t("detail_education_level")} value={application.education_level} />
            <Field label={t("detail_education_institution")} value={application.education_institution} />
            <Field label={t("detail_work_experience")} value={application.work_experience_text} />
            <Field label={t("detail_experience_years")} value={application.experience_years_range} />
            <Field label={t("detail_languages")} value={application.languages?.join(", ")} />
            <Field label={t("detail_languages_other")} value={application.languages_other} />
            <Field label={t("detail_computer_skills")} value={application.computer_skills} />
            <Field label={t("detail_key_skills")} value={application.key_skills} />
            <Field label={t("detail_expected_salary")} value={application.expected_salary_range} />
          </Section>

          <RoleGate roles={["super_admin", "admin"]}>
            <div className="detail-card">
              <div className="detail-card-header">
                <span className="detail-card-icon">
                  <IconTrendingUp />
                </span>
                <h2 className="detail-card-title">{t("detail_change_status")}</h2>
              </div>
              {transitions.length === 0 ? (
                <div className="empty-state">{t("detail_no_transitions")}</div>
              ) : (
                <>
                  <textarea
                    className="form-input"
                    placeholder={t("detail_comment_placeholder")}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <div className="status-actions">
                    {transitions.map((s) => (
                      <button
                        key={s}
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={() => handleStatusChange(s)}
                      >
                        → {t(`status_${s}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </RoleGate>
        </div>

        <div className="detail-sidebar">
          <div className="detail-card">
            <div className="detail-card-header">
              <span className="detail-card-icon">
                <IconCalendar />
              </span>
              <h2 className="detail-card-title">{t("detail_section_meta")}</h2>
            </div>
            <div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">{t("detail_meta_id")}</span>
                <span className="detail-meta-value">#{application.id}</span>
              </div>
              <div className="detail-meta-row">
                <span className="detail-meta-label">{t("apps_submitted_at")}</span>
                <span className="detail-meta-value">{formatDate(application.submitted_at)}</span>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card-header">
              <span className="detail-card-icon">
                <IconClock />
              </span>
              <h2 className="detail-card-title">{t("detail_history")}</h2>
            </div>
            {application.status_history.length === 0 ? (
              <div className="empty-state">{t("detail_history_empty")}</div>
            ) : (
              <ul className="history-list">
                {application.status_history.map((h) => (
                  <li key={h.id} className="history-item">
                    <div className="history-transition">
                      {h.old_status ? <StatusBadge status={h.old_status} /> : <span>—</span>} →{" "}
                      <StatusBadge status={h.new_status} />
                    </div>
                    <div className="history-meta">
                      {h.changed_by_name || "—"} · {formatDate(h.changed_at)}
                    </div>
                    {h.comment && <div className="history-comment">{h.comment}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
