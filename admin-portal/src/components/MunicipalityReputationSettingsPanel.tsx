import { useEffect, useState } from 'react';
import { Shield, Award, AlertTriangle, Check, Loader2, Zap, Scale, Lock } from 'lucide-react';
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

type PresetId = 'ESNEK' | 'ORTA' | 'KATI';

interface PresetConfig {
  id: PresetId;
  label: string;
  subtitle: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
  reputationDeltaReportCreated: number;
  reputationDeltaReportResolved: number;
  reputationDeltaReportRejected: number;
  reputationDeltaInappropriateMedia: number;
  autoSuspensionThreshold: number;
  autoSuspensionDays: number;
}

const PRESETS: PresetConfig[] = [
  {
    id: 'ESNEK',
    label: 'Esnek',
    subtitle: 'Düşük Moderasyon',
    icon: Zap,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    ringColor: 'ring-emerald-500',
    reputationDeltaReportCreated: 30,
    reputationDeltaReportResolved: 60,
    reputationDeltaReportRejected: -10,
    reputationDeltaInappropriateMedia: -25,
    autoSuspensionThreshold: 10,
    autoSuspensionDays: 7,
  },
  {
    id: 'ORTA',
    label: 'Orta',
    subtitle: 'Dengeli Güvenlik',
    icon: Scale,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    ringColor: 'ring-blue-500',
    reputationDeltaReportCreated: 25,
    reputationDeltaReportResolved: 50,
    reputationDeltaReportRejected: -45,
    reputationDeltaInappropriateMedia: -70,
    autoSuspensionThreshold: 5,
    autoSuspensionDays: 30,
  },
  {
    id: 'KATI',
    label: 'Katı',
    subtitle: 'Sıkı Güvenlik',
    icon: Lock,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    ringColor: 'ring-red-500',
    reputationDeltaReportCreated: 15,
    reputationDeltaReportResolved: 30,
    reputationDeltaReportRejected: -80,
    reputationDeltaInappropriateMedia: -120,
    autoSuspensionThreshold: 3,
    autoSuspensionDays: 90,
  },
];

function detectPreset(form: {
  reputationDeltaReportCreated: number;
  reputationDeltaReportResolved: number;
  reputationDeltaReportRejected: number;
  reputationDeltaInappropriateMedia: number;
  autoSuspensionThreshold: number;
  autoSuspensionDays: number;
}): PresetId | null {
  for (const p of PRESETS) {
    if (
      form.reputationDeltaReportCreated === p.reputationDeltaReportCreated &&
      form.reputationDeltaReportResolved === p.reputationDeltaReportResolved &&
      form.reputationDeltaReportRejected === p.reputationDeltaReportRejected &&
      form.reputationDeltaInappropriateMedia === p.reputationDeltaInappropriateMedia &&
      form.autoSuspensionThreshold === p.autoSuspensionThreshold &&
      form.autoSuspensionDays === p.autoSuspensionDays
    ) {
      return p.id;
    }
  }
  return null;
}


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

  const selectedPreset = detectPreset(form);

  const applyPreset = (preset: PresetConfig) => {
    setForm((f) => ({
      ...f,
      reputationDeltaReportCreated: preset.reputationDeltaReportCreated,
      reputationDeltaReportResolved: preset.reputationDeltaReportResolved,
      reputationDeltaReportRejected: preset.reputationDeltaReportRejected,
      reputationDeltaInappropriateMedia: preset.reputationDeltaInappropriateMedia,
      autoSuspensionThreshold: preset.autoSuspensionThreshold,
      autoSuspensionDays: preset.autoSuspensionDays,
    }));
  };

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

        {/* SECURITY PACKAGE PRESETS */}
        <div className="space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Award className="h-4.5 w-4.5 text-violet-600" />
              Güvenlik Paketi Seçimi
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Belediyenizin moderasyon sertliğini belirleyen hazır paket ayarlarından birini seçin. Paket seçiminiz, puan değişim kurallarını ve askıya alma politikalarını otomatik olarak yapılandırır.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? `${preset.borderColor} ${preset.bgColor} ring-2 ${preset.ringColor} ring-offset-1 shadow-md`
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5">
                      <Check className={`h-4.5 w-4.5 ${preset.color}`} />
                    </div>
                  )}

                  <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${preset.bgColor} mb-3`}>
                    <Icon className={`h-5 w-5 ${preset.color}`} />
                  </div>

                  <p className={`text-sm font-bold ${preset.color}`}>{preset.label}</p>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {preset.subtitle}
                  </p>

                  <div className="mt-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">İhbar Oluşturma</span>
                      <span className="font-bold text-emerald-600">+{preset.reputationDeltaReportCreated}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">İhbar Çözüldü</span>
                      <span className="font-bold text-emerald-600">+{preset.reputationDeltaReportResolved}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">İhbar Reddedildi</span>
                      <span className="font-bold text-red-500">{preset.reputationDeltaReportRejected}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Uygunsuz Medya</span>
                      <span className="font-bold text-red-500">{preset.reputationDeltaInappropriateMedia}</span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Askıya Alma Barajı</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{preset.autoSuspensionThreshold} red</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Dondurma Süresi</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{preset.autoSuspensionDays} gün</span>
                    </div>
                  </div>

                  {preset.id === 'ORTA' && (
                    <div className="mt-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-center">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                        Önerilen
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {!selectedPreset && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                  Mevcut ayarlarınız hazır paketlerden birine uymuyor. Yukarıdan bir paket seçerek ayarlarınızı standart hale getirebilirsiniz.
                </p>
              </div>
            </div>
          )}
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
