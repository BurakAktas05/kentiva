import { useEffect, useState } from 'react';
import { Shield, Award, AlertTriangle, Check, Loader2 } from 'lucide-react';
import api from '../api';

type ReputationSettingsProps = {
  municipality: {
    allowMunicipalityRejection: boolean | null;
    reputationDeltaReportCreated: number | null;
    reputationDeltaReportResolved: number | null;
    reputationDeltaReportRejected: number | null;
    reputationDeltaInappropriateMedia: number | null;
    autoSuspensionThreshold: number | null;
    autoSuspensionDays: number | null;
    aiMediaModerationEnabled: boolean | null;
  };
  onSaved: () => void;
};

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500';

export default function MunicipalityReputationSettingsPanel({ municipality, onSaved }: ReputationSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    allowMunicipalityRejection: true,
    reputationDeltaReportCreated: 25,
    reputationDeltaReportResolved: 50,
    reputationDeltaReportRejected: -45,
    reputationDeltaInappropriateMedia: -70,
    autoSuspensionThreshold: 5,
    autoSuspensionDays: 30,
    aiMediaModerationEnabled: true,
  });

  useEffect(() => {
    if (municipality) {
      setForm({
        allowMunicipalityRejection: municipality.allowMunicipalityRejection ?? true,
        reputationDeltaReportCreated: municipality.reputationDeltaReportCreated ?? 25,
        reputationDeltaReportResolved: municipality.reputationDeltaReportResolved ?? 50,
        reputationDeltaReportRejected: municipality.reputationDeltaReportRejected ?? -45,
        reputationDeltaInappropriateMedia: municipality.reputationDeltaInappropriateMedia ?? -70,
        autoSuspensionThreshold: municipality.autoSuspensionThreshold ?? 5,
        autoSuspensionDays: municipality.autoSuspensionDays ?? 30,
        aiMediaModerationEnabled: municipality.aiMediaModerationEnabled ?? true,
      });
    }
  }, [municipality]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setErrorMsg('');

    try {
      await api.patch('/municipalities/me/branding', form);
      setSuccess(true);
      onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Ayarlar kaydedilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 dark:border-slate-800">
        <Shield className="h-5.5 w-5.5 text-violet-600 dark:text-violet-400" />
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Vatandaş Puanlama & Güvenlik Ayarları</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Güven puanı kazanım kuralları, AI görsel filtreleme ve otomatik üyelik dondurma politikaları
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* MODERATION SETTINGS */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Shield className="h-4.5 w-4.5 text-violet-600" />
            İhbar & Moderasyon Yetkileri
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="relative flex flex-col justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="pr-4">
                  <span className="text-sm font-semibold text-slate-950 dark:text-white">İhbar Reddetme</span>
                  <p className="mt-1 text-xs text-slate-500">
                    Belediye personelinin ihbarları reddetmesine izin ver. Devre dışı bırakılırsa ihbarlar sadece yönlendirilebilir veya çözülebilir.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4.5 w-4.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-700"
                  checked={form.allowMunicipalityRejection}
                  onChange={(e) => setForm((f) => ({ ...f, allowMunicipalityRejection: e.target.checked }))}
                />
              </div>
            </label>

            <label className="relative flex flex-col justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="pr-4">
                  <span className="text-sm font-semibold text-slate-950 dark:text-white">AI Medya Moderasyonu</span>
                  <p className="mt-1 text-xs text-slate-500">
                    Müstehcen, uygunsuz veya şiddet içeren fotoğrafları yapay zeka ile otomatik algıla ve belediye çalışanları görmeden doğrudan engelle.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4.5 w-4.5 rounded text-violet-600 focus:ring-violet-500 border-slate-300 dark:border-slate-700"
                  checked={form.aiMediaModerationEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, aiMediaModerationEnabled: e.target.checked }))}
                />
              </div>
            </label>
          </div>
        </div>

        {/* CITIZEN REPUTATION DELTAS */}
        <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <Award className="h-4.5 w-4.5 text-violet-600" />
            Vatandaş Güven Puanı Değişim Kuralları
          </h4>
          <p className="text-xs text-slate-500">
            Kullanıcıların yaptıkları işlemler sonucunda alacakları puan değişimleri. Negatif değerler puan düşüşünü temsil eder.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">İhbar Oluşturma</label>
              <input
                type="number"
                className={inputClass}
                value={form.reputationDeltaReportCreated}
                onChange={(e) => setForm((f) => ({ ...f, reputationDeltaReportCreated: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">İhbar Çözüldü</label>
              <input
                type="number"
                className={inputClass}
                value={form.reputationDeltaReportResolved}
                onChange={(e) => setForm((f) => ({ ...f, reputationDeltaReportResolved: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">İhbar Reddedildi</label>
              <input
                type="number"
                className={inputClass}
                value={form.reputationDeltaReportRejected}
                onChange={(e) => setForm((f) => ({ ...f, reputationDeltaReportRejected: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Uygunsuz Medya Cezası</label>
              <input
                type="number"
                className={inputClass}
                value={form.reputationDeltaInappropriateMedia}
                onChange={(e) => setForm((f) => ({ ...f, reputationDeltaInappropriateMedia: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </div>

        {/* SUSPENSION RULES */}
        <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
            <AlertTriangle className="h-4.5 w-4.5 text-violet-600" />
            Otomatik Üyelik Askıya Alma (Dondurma)
          </h4>
          <p className="text-xs text-slate-500">
            AI veya sistem tarafından uygunsuz/selfie fotoğraf tespitiyle otomatik reddedilen ihbar oluşturan kullanıcıların üyeliklerinin askıya alınma parametreleri.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Otomatik Red Limit (Baraj)
              </label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.autoSuspensionThreshold}
                onChange={(e) => setForm((f) => ({ ...f, autoSuspensionThreshold: parseInt(e.target.value) || 1 }))}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Belirlenen gün aralığında bu sayıda otomatik red yiyen kullanıcının hesabı dondurulur.
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Askıda Kalma Süresi (Gün)
              </label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={form.autoSuspensionDays}
                onChange={(e) => setForm((f) => ({ ...f, autoSuspensionDays: parseInt(e.target.value) || 1 }))}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Üyeliğin dondurulacağı gün sayısı (ve geçmişe dönük red tarama periyodu).
              </p>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6 dark:border-slate-800">
          <div className="flex-1 pr-4">
            {success && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <Check className="h-4.5 w-4.5" />
                Ayarlar başarıyla kaydedildi!
              </span>
            )}
            {errorMsg && <span className="text-sm font-semibold text-red-600">{errorMsg}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-5 py-2.5 text-sm font-bold text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </button>
        </div>
      </form>
    </section>
  );
}
