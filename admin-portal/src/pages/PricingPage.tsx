import { useEffect, useState, useMemo } from 'react';
import {
  Check,
  Crown,
  Mail,
  Rocket,
  Shield,
  Sparkles,
  Star,
  X,
  Zap,
} from 'lucide-react';
import api from '../api';

/* ───── Types ───── */
type MunicipalityInfo = {
  subscriptionPlan?: string;
  name?: string;
  displayName?: string | null;
};

type PlanId = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

type FeatureRow = {
  name: string;
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
};

const FEATURES: FeatureRow[] = [
  { name: 'İhbar Yönetimi', starter: true, professional: true, enterprise: true },
  { name: 'Beyaz Masa Girişi', starter: true, professional: true, enterprise: true },
  { name: 'Departman Yönetimi', starter: "3'e kadar", professional: 'Sınırsız', enterprise: 'Sınırsız' },
  { name: 'Excel / PDF Dışa Aktarma', starter: true, professional: true, enterprise: true },
  { name: 'Canlı Harita & Isı Katmanı', starter: false, professional: true, enterprise: true },
  { name: 'AI Önceliklendirme & Özetleme', starter: false, professional: true, enterprise: true },
  { name: 'KVKK Yüz/Plaka Maskeleme', starter: false, professional: true, enterprise: true },
  { name: 'Tahminsel Analiz & Uyarılar', starter: false, professional: true, enterprise: true },
  { name: 'Anket & Duyuru Modülü', starter: false, professional: true, enterprise: true },
  { name: 'Pazarlama Paketi (Afiş/QR)', starter: false, professional: true, enterprise: true },
  { name: 'Başkan Özet Ekranı', starter: false, professional: true, enterprise: true },
  { name: 'Ödül & Gamification', starter: false, professional: true, enterprise: true },
  { name: 'Planlı Otomatik Dışa Aktarma', starter: false, professional: true, enterprise: true },
  { name: 'MIS Entegrasyonu (Sampaş/Kolaylı/Netigma)', starter: false, professional: false, enterprise: true },
  { name: 'Webhook & API Anahtarı', starter: false, professional: false, enterprise: true },
  { name: 'Özel SLA Takibi & Bildirimleri', starter: false, professional: false, enterprise: true },
  { name: 'Vatandaş Sosyal İlanlar', starter: false, professional: false, enterprise: true },
  { name: 'Öncelikli Teknik Destek', starter: false, professional: false, enterprise: true },
  { name: 'Özel Eğitim & Kurulum Desteği', starter: false, professional: false, enterprise: true },
];

type PlanCard = {
  id: PlanId;
  name: string;
  subtitle: string;
  icon: typeof Rocket;
  popular: boolean;
  gradientFrom: string;
  gradientTo: string;
  priceLabel: string;
  priceHint: string;
  features: string[];
};

/** Liste fiyatları — sales-package/02-commercial/FIYAT-POLITIKASI.md ile hizalı */
const PLANS: PlanCard[] = [
  {
    id: 'STARTER',
    name: 'Başlangıç',
    subtitle: 'Küçük ilçe belediyeleri için',
    icon: Rocket,
    popular: false,
    gradientFrom: '#64748b',
    gradientTo: '#94a3b8',
    priceLabel: '₺4.990',
    priceHint: 'KDV hariç / ay · yıllık ₺49.900',
    features: [
      'Temel ihbar yönetimi',
      'Beyaz Masa girişi',
      '3 departmana kadar',
      'Excel / PDF dışa aktarma',
    ],
  },
  {
    id: 'PROFESSIONAL',
    name: 'Profesyonel',
    subtitle: 'En popüler — Çoğu belediye için önerilen',
    icon: Star,
    popular: true,
    gradientFrom: '#0ea5e9',
    gradientTo: '#0b4f9c',
    priceLabel: '₺9.999',
    priceHint: 'KDV hariç / ay · yıllık ₺99.990',
    features: [
      'Başlangıç planındaki her şey',
      'AI önceliklendirme & özetleme',
      'Canlı ısı haritası',
      'KVKK maskeleme',
      'Anket & duyuru',
      'Pazarlama paketi',
      'Başkan özet ekranı',
      'Sınırsız departman',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    subtitle: 'Büyük şehir ve il belediyeleri için',
    icon: Crown,
    popular: false,
    gradientFrom: '#0b4f9c',
    gradientTo: '#e6b422',
    priceLabel: 'Teklif',
    priceHint: 'Liste başlangıç ₺24.990/ay · MIS & SLA',
    features: [
      'Profesyonel planındaki her şey',
      'MIS entegrasyonu (Sampaş/Kolaylı/Netigma)',
      'Webhook & API anahtarı',
      'Özel SLA takibi',
      'Vatandaş sosyal ilanlar',
      'Öncelikli teknik destek',
      'Özel eğitim & kurulum',
    ],
  },
];

function FeatureCheck({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-xs font-bold text-primary">{value}</span>;
  }
  return value ? (
    <Check className="h-4 w-4 text-emerald-500" />
  ) : (
    <X className="h-4 w-4 text-slate-300 dark:text-slate-600" />
  );
}

export default function PricingPage() {
  const [municipality, setMunicipality] = useState<MunicipalityInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPlan = useMemo(() => {
    if (!municipality?.subscriptionPlan) return 'TRIAL';
    return municipality.subscriptionPlan;
  }, [municipality]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/auth/me');
        const me = res.data.data;
        setMunicipality({
          subscriptionPlan: me?.municipality?.subscriptionPlan ?? 'TRIAL',
          name: me?.municipality?.name,
          displayName: me?.municipality?.displayName,
        });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-sky-400 text-white shadow-xl shadow-primary/25">
          <Sparkles className="h-7 w-7" />
        </div>
        <p className="kentiva-eyebrow">Lisanslama</p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Planlar & Fiyatlandırma
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-slate-600 dark:text-slate-400">
          Belediyenizin büyüklüğüne ve ihtiyacına göre doğru planı seçin. Tüm planlar {' '}
          <span className="font-bold text-primary">90 gün ücretsiz deneme</span> ile başlar.
        </p>
        {currentPlan && (
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-bold text-primary">
            <Shield className="h-3.5 w-3.5" />
            Mevcut planınız: {currentPlan === 'TRIAL' ? 'Deneme Sürümü' : currentPlan}
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border p-6 shadow-sm transition-all ${
                plan.popular
                  ? 'border-primary/30 bg-white shadow-xl shadow-primary/10 dark:border-primary/30 dark:bg-slate-900 ring-2 ring-primary/20'
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-sky-400 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                  ⭐ En Popüler
                </div>
              )}

              {/* Icon */}
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${plan.gradientFrom}, ${plan.gradientTo})` }}
              >
                <plan.icon className="h-6 w-6" />
              </div>

              {/* Name */}
              <h3 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">{plan.name}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{plan.subtitle}</p>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-950/40">
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{plan.priceLabel}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{plan.priceHint}</p>
              </div>

              {/* Features */}
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-6">
                {isCurrent ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Check className="h-4 w-4" />
                    Mevcut Plan
                  </div>
                ) : (
                  <a
                    href="mailto:info@kentiva.app?subject=Kentiva%20Plan%20Yükseltme&body=Merhaba,%20belediyemiz%20için%20plan%20yükseltme%20hakkında%20bilgi%20almak%20istiyoruz."
                    className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-sm transition-all hover:shadow-md ${
                      plan.popular
                        ? 'bg-primary text-white hover:bg-primary-hover'
                        : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Mail className="h-4 w-4" />
                    İletişime Geçin
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Comparison Table */}
      <section className="mx-auto max-w-5xl rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Detaylı Özellik Karşılaştırması</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 text-left font-bold text-slate-700 dark:text-slate-300">Özellik</th>
                <th className="py-3 text-center font-bold text-slate-500">Başlangıç</th>
                <th className="py-3 text-center font-bold text-primary">Profesyonel</th>
                <th className="py-3 text-center font-bold text-amber-600 dark:text-amber-400">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, idx) => (
                <tr
                  key={feature.name}
                  className={idx % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-950/20' : ''}
                >
                  <td className="py-3 pr-4 font-semibold text-slate-700 dark:text-slate-300">{feature.name}</td>
                  <td className="py-3 text-center">
                    <div className="flex justify-center"><FeatureCheck value={feature.starter} /></div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex justify-center"><FeatureCheck value={feature.professional} /></div>
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex justify-center"><FeatureCheck value={feature.enterprise} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-sky-400/5 p-8 text-center dark:border-primary/20">
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
          Hangi plan sizin için doğru?
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-600 dark:text-slate-400">
          Belediyenizin nüfusu, departman sayısı ve ihtiyaçlarına göre size en uygun planı önerelim.
          Tüm planlar 90 gün ücretsiz deneme ile başlar.
        </p>
        <a
          href="mailto:info@kentiva.app?subject=Kentiva%20Plan%20Danışmanlığı"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover"
        >
          <Mail className="h-4 w-4" />
          Ücretsiz Danışmanlık Alın
        </a>
      </div>
    </div>
  );
}
