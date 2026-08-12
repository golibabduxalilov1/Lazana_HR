import { useEffect, useState } from "react";
import { listTexts, updateText } from "../services/texts";
import { useI18n } from "../context/I18nContext";
import { useToast } from "../context/ToastContext";
import { apiErrorMessage } from "../services/client";
import { Loading } from "../components/Loading";

export default function Texts() {
  const { t } = useI18n();
  const toast = useToast();
  const [texts, setTexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  const load = () => {
    setLoading(true);
    listTexts()
      .then((data) => {
        setTexts(data);
        const initial = {};
        data.forEach((row) => {
          initial[row.key] = { text_uz: row.text_uz, text_ru: row.text_ru };
        });
        setDrafts(initial);
      })
      .catch((err) => toast.error(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async (key) => {
    setSavingKey(key);
    try {
      await updateText(key, drafts[key]);
      toast.success(t("save"));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="page-title">{t("texts_title")}</h1>

      {texts.map((row) => (
        <div className="panel" key={row.key}>
          <h2 className="panel-title">{row.key}</h2>
          <label className="form-label">{t("texts_uz")}</label>
          <textarea
            className="form-input"
            rows={3}
            value={drafts[row.key]?.text_uz || ""}
            onChange={(e) =>
              setDrafts({ ...drafts, [row.key]: { ...drafts[row.key], text_uz: e.target.value } })
            }
          />
          <label className="form-label">{t("texts_ru")}</label>
          <textarea
            className="form-input"
            rows={3}
            value={drafts[row.key]?.text_ru || ""}
            onChange={(e) =>
              setDrafts({ ...drafts, [row.key]: { ...drafts[row.key], text_ru: e.target.value } })
            }
          />
          <button className="btn btn-primary" disabled={savingKey === row.key} onClick={() => save(row.key)}>
            {savingKey === row.key ? t("loading") : t("save")}
          </button>
        </div>
      ))}
    </div>
  );
}
