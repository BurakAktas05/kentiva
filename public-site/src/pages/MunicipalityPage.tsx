import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  BarChart3,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { SeoHead, siteUrl } from '../components/SeoHead';
import { StatCard } from '../components/StatCard';
import {
  fetchPublicMunicipalityBySlug,
  fetchPublicMunicipalityStats,
  type PublicMunicipalityDetail,
  type PublicMunicipalityStat,
} from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import { mainSiteUrl, municipalityPublicUrl } from '../lib/tenantSite';

export default function MunicipalityPage({ fixedSlug }: { fixedSlug?: string }) {
  const { slug = '' } = useParams<{ slug: string }>();
  const activeSlug = fixedSlug || slug;
  const [detail, setDetail] = useState<PublicMunicipalityDetail | null>(null);
  const [stat, setStat] = useState<PublicMunicipalityStat | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeSlug) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      fetchPublicMunicipalityBySlug(activeSlug, controller.signal),
      fetchPublicMunicipalityStats(controller.signal).catch(() => [] as PublicMunicipalityStat[]),
    ])
      .then(([d, stats]) => {
        setDetail(d);
        setStat(stats.find((s) => s.slug === activeSlug) ?? null);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message || 'Belediye bulunamadı');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeSlug]);

  const description = useMemo(() => {
    if (!detail) return '';
    const parts = [
      detail.slogan,
      `${detail.displayName} Kentiva belediye bildirim platformu sayfası.`,
      detail.publicStatsEnabled && stat
        ? `Toplam ${stat.totalReports} bildirim, ${stat.resolvedReports} çözülmüş.`
        : null,
    ].filter(Boolean);
    return parts.join(' ').slice(0, 320);
  }, [detail, stat]);

  const canonicalPath = fixedSlug ? '/' : `/belediye/${activeSlug}`;
  const canonicalUrl = activeSlug ? municipalityPublicUrl(activeSlug) : undefined;
  const ogImage = detail?.logoUrl ? resolveMediaUrl(detail.logoUrl) : undefined;
  const brandColor = detail?.primaryColor || '#0b4f9c';

  const resolutionRate =
    stat && stat.totalReports > 0
      ? Math.round((stat.resolvedReports / stat.totalReports) * 100)
      : null;

  return (
    <>
      {detail && (
        <SeoHead
          title={`${detail.displayName} | Kentiva`}
          description={description}
          canonicalPath={canonicalPath}
          canonicalUrl={canonicalUrl}
          ogImage={ogImage}
          ogType="article"
        />
      )}

      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <article
          className="border-b border-slate-200/90 bg-white"
          itemScope
          itemType="https://schema.org/GovernmentOrganization"
        >
          <div
            className="relative overflow-hidden border-b border-slate-200/80"
            style={{
              background: `linear-gradient(135deg, ${brandColor}12 0%, #f8fafc 55%, #ffffff 100%)`,
            }}
          >
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
              <nav aria-label="Sayfa yolu">
                {fixedSlug ? (
                  <a
                    href={mainSiteUrl('/')}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Ana sayfa
                  </a>
                ) : (
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Ana sayfa
                  </Link>
                )}
              </nav>

              {loading && (
                <p className="mt-10 text-sm font-medium text-slate-500" aria-live="polite">
                  Yükleniyor…
                </p>
              )}

              {error && (
                <div
                  className="mt-8 max-w-lg rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {detail && !error && (
                <header className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
                  {detail.logoUrl ? (
                    <img
                      src={resolveMediaUrl(detail.logoUrl)}
                      alt=""
                      className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-2 shadow-sm"
                      width={80}
                      height={80}
                      itemProp="logo"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-2xl text-white shadow-lg"
                      style={{ backgroundColor: brandColor }}
                      aria-hidden
                    >
                      <Building2 className="h-9 w-9" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h1
                      className="font-sans text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
                      itemProp="name"
                    >
                      {detail.displayName}
                    </h1>
                    {detail.slogan && (
                      <p className="mt-2 text-lg font-medium text-slate-600" itemProp="slogan">
                        {detail.slogan}
                      </p>
                    )}
                    <meta itemProp="url" content={siteUrl(canonicalPath)} />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      {detail.onboarded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800 ring-1 ring-emerald-200/80">
                          Kentiva platformunda aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600">
                          Kurulum sürecinde
                        </span>
                      )}
                    </p>
                  </div>
                </header>
              )}
            </div>
          </div>

          {detail && !error && (
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="grid gap-10 lg:grid-cols-3">
                <section className="lg:col-span-2" aria-labelledby="muni-about-heading">
                  <h2 id="muni-about-heading" className="font-sans text-xl font-bold text-slate-900">
                    Kurum bilgisi
                  </h2>
                  <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">
                    {detail.displayName} vatandaşları, Kentiva mobil uygulaması üzerinden çevre,
                    altyapı ve hizmet bildirimlerini iletebilir. Bu sayfa kamuya açık kurumsal
                    bilgi ve — izin verildiğinde — anonimleştirilmiş istatistikleri içerir.
                  </p>

                  {detail.publicStatsEnabled && stat && (
                    <section className="mt-10" aria-labelledby="muni-stats-heading">
                      <h2
                        id="muni-stats-heading"
                        className="font-sans text-xl font-bold text-slate-900"
                      >
                        Kamu istatistikleri
                      </h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        Kişisel veri içermeyen toplu sayılar
                      </p>
                      <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <StatCard
                          icon={<Activity className="h-5 w-5 text-primary" aria-hidden />}
                          label="Toplam bildirim"
                          value={stat.totalReports}
                        />
                        <StatCard
                          icon={<CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />}
                          label="Çözülen"
                          value={stat.resolvedReports}
                        />
                        <StatCard
                          icon={<BarChart3 className="h-5 w-5 text-primary" aria-hidden />}
                          label="Çözüm oranı"
                          value={resolutionRate ?? 0}
                          suffix="%"
                        />
                      </div>
                    </section>
                  )}

                  {detail.publicStatsEnabled && !stat && (
                    <p className="mt-8 text-sm font-medium text-slate-500">
                      Bu belediye için henüz yayınlanmış istatistik bulunmuyor.
                    </p>
                  )}
                </section>

                <aside className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-6 shadow-sm">
                  <h2 className="font-sans text-base font-bold text-slate-900">İletişim</h2>
                  <address className="mt-4 space-y-4 not-italic text-sm font-medium text-slate-700">
                    {(detail.contactEmail || detail.contactPhone || detail.websiteUrl) ? (
                      <>
                        {detail.contactEmail && (
                          <p className="flex items-start gap-2">
                            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <a
                              href={`mailto:${detail.contactEmail}`}
                              className="text-primary hover:underline"
                              itemProp="email"
                            >
                              {detail.contactEmail}
                            </a>
                          </p>
                        )}
                        {detail.contactPhone && (
                          <p className="flex items-start gap-2">
                            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <a
                              href={`tel:${detail.contactPhone.replace(/\s/g, '')}`}
                              className="hover:text-primary"
                              itemProp="telephone"
                            >
                              {detail.contactPhone}
                            </a>
                          </p>
                        )}
                        {detail.websiteUrl && (
                          <p className="flex items-start gap-2">
                            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <a
                              href={detail.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-primary hover:underline"
                              itemProp="url"
                            >
                              {detail.websiteUrl.replace(/^https?:\/\//, '')}
                            </a>
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500">İletişim bilgisi paylaşılmamış.</p>
                    )}
                    <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-slate-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        Merkez: {detail.centerLat.toFixed(4)}, {detail.centerLng.toFixed(4)}
                      </span>
                    </p>
                  </address>
                </aside>
              </div>
            </div>
          )}
        </article>
      </main>
    </>
  );
}
