import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Smartphone,
  Building2,
  BookOpen,
  UserPlus,
  MapPinned,
  PlusCircle,
  FileText,
  ImagePlus,
  Send,
  ClipboardList,
  ChevronDown,
  Activity,
  LockKeyhole,
  Network,
  Timer,
  UserCheck,
  Eye,
  Target,
  ScrollText,
} from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { LiveStatsSection } from '../components/LiveStatsSection';
import { demoMailto, marketingConfig, publicPlans } from '../lib/marketing';

const { municipalityPortalUrl, citizenAppUrl, pilotDurationLabel } = marketingConfig;

export default function HomePage() {
  return (
    <>
      <SeoHead
        title="Kentiva — Belediye bildirim operasyonu"
        description="Atama, SLA ve vatandaş durum takibini tek platformda yönetin. Kentiva, belediye ekiplerinin bildirim iş yükünü ölçülebilir hale getirir."
        canonicalPath="/"
      />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <section
          className="relative overflow-hidden border-b border-slate-200/90 bg-white"
          aria-labelledby="hero-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-30%,rgba(14,165,233,0.2),transparent),radial-gradient(ellipse_50%_45%_at_100%_0%,rgba(11,79,156,0.14),transparent)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:48px_48px]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-secondary" aria-hidden />
                  Belediye operasyon platformu
                </p>
                <h1
                  id="hero-heading"
                  className="mt-5 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.12]"
                >
                  Bildirimleri ata, SLA&apos;yı yönet, vatandaşa şeffaf takip sun
                </h1>
                <p className="mt-5 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                  Kentiva; vatandaş bildirimlerinin birimlere yönlendirilmesi, süre taahhüdü ve
                  durum görünürlüğünü tek iş akışında birleştirir. Amaç özellik listesi değil;
                  ölçülebilir operasyon sonucu.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <a
                    href={demoMailto()}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
                  >
                    Demo talep edin
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                  <a
                    href="#neden-belediyeler"
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-sm transition-all hover:border-slate-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Neden belediyeler
                  </a>
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">
                  Vatandaş uygulaması için{' '}
                  <a href="#kilavuz" className="font-semibold text-slate-600 underline-offset-4 hover:underline hover:text-primary">
                    kısa kullanım rehberi
                  </a>
                </p>
                <dl className="mt-10 grid grid-cols-1 gap-3 sm:max-w-lg sm:grid-cols-3">
                  {[
                    { term: 'Atama', value: 'Doğru birime yönlendirme', icon: UserCheck },
                    { term: 'SLA', value: 'Süre ve iş yükü görünürlüğü', icon: Timer },
                    { term: 'Takip', value: 'Vatandaşa şeffaf durum', icon: Eye },
                  ].map(({ term, value, icon: Icon }) => (
                    <div
                      key={term}
                      className="rounded-2xl border border-slate-200/90 bg-white/85 p-3.5 shadow-sm backdrop-blur-sm"
                    >
                      <dt className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-slate-500">
                        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden /> {term}
                      </dt>
                      <dd className="mt-1.5 text-xs font-extrabold text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="relative lg:justify-self-end">
                <div
                  className="pointer-events-none absolute -inset-8 rounded-[40px] bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent blur-3xl"
                  aria-hidden
                />
                <div className="relative overflow-hidden rounded-[28px] border border-primary/25 bg-primary p-2.5 shadow-[0_35px_90px_-35px_rgba(11,79,156,.45)] ring-1 ring-primary/10">
                  <div className="flex items-center justify-between px-2 pb-2.5 pt-0.5">
                    <div className="flex gap-1.5" aria-hidden>
                      <span className="h-2 w-2 rounded-full bg-rose-300/90" />
                      <span className="h-2 w-2 rounded-full bg-amber-300/90" />
                      <span className="h-2 w-2 rounded-full bg-emerald-300/90" />
                    </div>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.14em] text-sky-100/90">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Operasyon paneli
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-[20px] bg-white">
                    <img
                      src="/mockup-real.png"
                      alt="Kentiva yönetim paneli ekran görüntüsü"
                      className="w-full max-w-lg object-cover lg:ml-auto"
                      width={1200}
                      height={800}
                      loading="eager"
                    />
                    <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Network className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-900">Operasyon zinciri</p>
                          <p className="text-[9px] font-semibold text-slate-500">Kayıt · Atama · SLA · Çözüm</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">
                        Aktif
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:flex">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-primary">
                    <Activity className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Bugün</p>
                    <p className="text-xs font-extrabold text-slate-900">Bekleyenler · Atama · Çözüm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <LiveStatsSection />

        <section
          id="neden-belediyeler"
          className="border-b border-slate-200/90 bg-white py-16 sm:py-20"
          aria-labelledby="why-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2
                id="why-heading"
                className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
              >
                Neden belediyeler
              </h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Satın alma kararı özellik sayısına değil, sahada görülen operasyon sonuçlarına dayanmalıdır.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <OutcomeCard
                icon={<UserCheck className="h-6 w-6 text-primary" aria-hidden />}
                title="Doğru birime hızlı atama"
                desc="Bildirimler kuyrukta kaybolmaz; birim ve personel ataması ile iş sahibi netleşir."
              />
              <OutcomeCard
                icon={<Timer className="h-6 w-6 text-primary" aria-hidden />}
                title="SLA ve iş yükü görünürlüğü"
                desc="Açık kayıtlar, süre baskısı ve birim yükü aynı ekranda izlenir; gecikmeler erken fark edilir."
              />
              <OutcomeCard
                icon={<Eye className="h-6 w-6 text-primary" aria-hidden />}
                title="Vatandaşa şeffaf takip"
                desc="Durum güncellemeleri vatandaş uygulamasında görünür; çağrı merkezi yükü azalır."
              />
            </div>

            <div className="mt-10 rounded-2xl border border-slate-200/90 bg-slate-50 p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-sans text-lg font-bold text-slate-900">Pilot başarı kriterleri</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                    {pilotDurationLabel} ücretsiz pilot sonunda karar, “uygulama var mı?” sorusundan değil;
                    vatandaşın kullanıp kullanmadığı ve belediyenin iş yükünü görüp görmediği üzerinden verilir.
                  </p>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      'Düzenli ihbar akışı ve birim kullanımı',
                      'Ölçülebilir çözüm oranı ve ortalama süre',
                      'Açık iş yükünün yönetilebilir olması',
                      'Haftalık yönetici özeti ile karar desteği',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="ozellikler"
          className="border-b border-slate-200/90 bg-[linear-gradient(180deg,#fff_0%,#f8fafc_100%)] py-16 sm:py-20"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2
                id="features-heading"
                className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
              >
                Operasyon nasıl işler
              </h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Üç yüzey, tek zincir: vatandaş bildirir, panel atar ve kapatır, vatandaş durumu görür.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <FeatureCard
                icon={<Smartphone className="h-6 w-6 text-primary" aria-hidden />}
                title="Vatandaş girişi"
                desc="Konum ve görsel ekli bildirimler kurumunuzun kuyruğuna düşer; kayıt numarası ile takip başlar."
              />
              <FeatureCard
                icon={<Building2 className="h-6 w-6 text-primary" aria-hidden />}
                title="Birim ataması"
                desc="Bugün ekranından bekleyenleri alın, birime atayın, SLA riskini erken görün."
              />
              <FeatureCard
                icon={<ShieldCheck className="h-6 w-6 text-primary" aria-hidden />}
                title="Çözüm ve şeffaflık"
                desc="Kapanış notu ve durum güncellemesi vatandaşa yansır; operasyon ölçülebilir hale gelir."
              />
            </div>
          </div>
        </section>

        <section
          id="guvence"
          className="border-b border-slate-200/90 bg-white py-16 sm:py-20"
          aria-labelledby="assurance-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2
                id="assurance-heading"
                className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
              >
                Kurumsal güvence
              </h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Çok kiracılı mimari ve yetkilendirme, belediye verisinin sınırlarını korumak için tasarlandı.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: LockKeyhole,
                  title: 'Tenant izolasyonu',
                  body: 'Her belediye yalnızca kendi verisine erişir; kiracı sınırları sunucu tarafında uygulanır.',
                },
                {
                  icon: UserCheck,
                  title: 'Rol bazlı erişim',
                  body: 'Personel, birim ve yönetici rolleri ile ekran ve işlem yetkileri ayrılır.',
                },
                {
                  icon: ScrollText,
                  title: 'Denetim izi',
                  body: 'Kritik işlemler izlenebilir; operasyonel değişiklikler denetime uygun tutulur.',
                },
                {
                  icon: ShieldCheck,
                  title: 'KVKK uyumu',
                  body: 'Kişisel veri işleme ve anonimleştirme politikaları gizlilik belgelerimizle uyumludur.',
                },
              ].map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-5 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm ring-1 ring-slate-200/80">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-sans text-sm font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{body}</p>
                </article>
              ))}
            </div>

            <p className="mt-8 text-sm font-medium text-slate-600">
              Ayrıntılar için{' '}
              <Link
                to="/gizlilik-politikasi"
                className="font-bold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Gizlilik Politikası
              </Link>
              {' '}sayfasını inceleyebilirsiniz.
            </p>
          </div>
        </section>

        <section
          id="kilavuz"
          className="border-b border-slate-200/90 bg-slate-50 py-12 sm:py-16"
          aria-labelledby="guide-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <details className="group rounded-2xl border border-slate-200/90 bg-white shadow-sm open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    <BookOpen className="h-4 w-4" aria-hidden />
                    İkincil · Vatandaş rehberi
                  </p>
                  <h2
                    id="guide-heading"
                    className="mt-2 font-sans text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
                  >
                    İhbar nasıl oluşturulur?
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
                    Bu site tanıtım içindir; ihbar kaydı vatandaş uygulamasından açılır. Adımlar isteğe bağlı olarak
                    aşağıda açılır.
                  </p>
                </div>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>

              <div className="border-t border-slate-100 px-5 pb-6 sm:px-6 sm:pb-8">
                <div className="mt-6 flex flex-wrap gap-3">
                  {citizenAppUrl ? (
                    <a
                      href={citizenAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
                      Uygulamayı aç
                    </a>
                  ) : (
                    <p className="max-w-md text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
                      Vatandaş uygulamasına belediyenizin duyurduğu bağlantıdan erişin.
                    </p>
                  )}
                </div>

                <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="İhbar oluşturma adımları">
                  <GuideStep
                    step={1}
                    icon={<Smartphone className="h-5 w-5 text-primary" aria-hidden />}
                    title="Uygulamayı açın"
                    body="Belediyenizin duyurduğu Kentiva uygulamasını veya size verilen web bağlantısını kullanın."
                  />
                  <GuideStep
                    step={2}
                    icon={<UserPlus className="h-5 w-5 text-primary" aria-hidden />}
                    title="Kayıt veya giriş"
                    body="İlk kullanımda kısa bir hesap oluşturun; sonrasında e-posta ve şifre ile giriş yapın."
                  />
                  <GuideStep
                    step={3}
                    icon={<MapPinned className="h-5 w-5 text-primary" aria-hidden />}
                    title="Belediyeyi seçin"
                    body="Birden fazla kurum varsa, ihbarı iletmek istediğiniz belediyeyi listeden seçin."
                  />
                  <GuideStep
                    step={4}
                    icon={<PlusCircle className="h-5 w-5 text-primary" aria-hidden />}
                    title="Yeni bildirim"
                    body="Ana ekrandan yeni ihbar akışını başlatın."
                  />
                  <GuideStep
                    step={5}
                    icon={<FileText className="h-5 w-5 text-primary" aria-hidden />}
                    title="Açıklama ve konum"
                    body="Olayı net yazın; konum izni veya harita işareti ekipler için gereklidir."
                  />
                  <GuideStep
                    step={6}
                    icon={<ImagePlus className="h-5 w-5 text-primary" aria-hidden />}
                    title="Fotoğraf (isteğe bağlı)"
                    body="Varsa fotoğraf ekleyin; inceleme ve önceliklendirmeyi hızlandırır."
                  />
                  <GuideStep
                    step={7}
                    icon={<Send className="h-5 w-5 text-primary" aria-hidden />}
                    title="Gönderin ve takip edin"
                    body="Gönderdikten sonra İhbarlarım listesinden durumu izleyin."
                  />
                </ol>

                <div className="mt-8 rounded-2xl border border-slate-200/90 bg-slate-50 p-5 sm:flex sm:items-start sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ClipboardList className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-sans text-base font-bold text-slate-900">Özet</h3>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                      Uygulamada giriş → belediye seçimi → yeni ihbar → metin ve konum → (fotoğraf) → gönder →
                      İhbarlarım.
                    </p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>

        <section
          id="fiyatlandirma"
          className="border-b border-slate-200/90 bg-white py-16 sm:py-20"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="pricing-heading"
                className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
              >
                Belediye ölçeğine uygun planlar
              </h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Gizli maliyet yok. İlk {pilotDurationLabel} ücretsiz pilot; yıllık peşinde 2 ay bedava.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-3">
              {publicPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative ${plan.popular ? 'pt-3' : ''}`}
                >
                  {plan.popular ? (
                    <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                      Önerilen
                    </span>
                  ) : null}
                  <div
                    className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border p-7 shadow-[0_28px_70px_-42px_rgba(11,79,156,.35)] ${
                      plan.popular
                        ? 'border-primary/30 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,.12),transparent_34%),white] ring-2 ring-primary/15'
                        : 'border-slate-200/90 bg-white'
                    }`}
                  >
                  <h3 className="text-center font-sans text-lg font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-center text-xs font-semibold text-slate-500">{plan.hint}</p>
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-slate-900">{plan.price}</span>
                    {plan.id !== 'enterprise' ? (
                      <span className="text-sm font-medium text-slate-500">/ay</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-center text-sm text-slate-500">İlk {pilotDurationLabel} ücretsiz pilot</p>
                  <ul className="mt-6 flex-1 space-y-2.5 border-t border-slate-100 pt-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={demoMailto(
                      plan.popular
                        ? 'Kentiva Profesyonel Demo Talebi'
                        : `Kentiva ${plan.name} Demo Talebi`,
                    )}
                    className={`mt-7 block rounded-xl py-3.5 text-center text-sm font-bold transition-all active:scale-[0.98] ${
                      plan.popular
                        ? 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-hover'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-white'
                    }`}
                  >
                    Ücretsiz Demo Talep Et
                  </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200/90 bg-slate-50 py-16 sm:py-20" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2
              id="faq-heading"
              className="text-center font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
            >
              Sıkça Sorulan Sorular
            </h2>
            <dl className="mt-10 space-y-4">
              <FaqItem
                q="Belediyemiz nasıl üye olabilir?"
                a={`Demo talebinde kurum, rol ve ölçek bilgilerinizi iletin. Ekibimiz kurulumu başlatır. İlk ${pilotDurationLabel} ücretsiz pilot süreci sunulur.`}
              />
              <FaqItem
                q="Vatandaş verileri güvende mi?"
                a="Veriler KVKK uyumlu işlenir. Her belediye yalnızca kendi tenant sınırları içindeki kayıtlara erişir. Ayrıntılar Gizlilik Politikası sayfasındadır."
              />
              <FaqItem
                q="Departmanları biz mi ekliyoruz?"
                a="Evet. Her belediye kendi birim yapısını oluşturur. Küçük bir belediyede birkaç birim, büyük bir belediyede daha fazla birim tanımlanabilir."
              />
              <FaqItem
                q="Pilot sonunda neye bakılır?"
                a="Düzenli ihbar akışı, çözüm oranı, açık iş yükü ve yönetici özetleri. Karar özellik listesine değil, operasyon sonucuna dayanır."
              />
              <FaqItem
                q="Mobil uygulama hangi platformlarda çalışıyor?"
                a="Android için APK olarak sunulmaktadır. iOS desteği yol haritasındadır. Belediyenizin paylaştığı web adresi de kullanılabilir."
              />
            </dl>
          </div>
        </section>

        <section
          className="relative overflow-hidden bg-gradient-to-br from-primary via-[#0C63B5] to-secondary py-16 sm:py-20"
          aria-labelledby="cta-heading"
        >
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-white/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent/20 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2
              id="cta-heading"
              className="font-sans text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
            >
              Belediyeniz için operasyonu görünür kılın
            </h2>
            <p className="mt-4 text-base font-medium text-sky-50/95">
              {pilotDurationLabel} ücretsiz pilot ile atama, SLA ve vatandaş takibini risk almadan deneyin.
              Kurulum desteği tarafımızdandır.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={demoMailto()}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary shadow-lg transition-all hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
              >
                Demo talep edin
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href={municipalityPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Belediye paneli
              </a>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function GuideStep({
  step,
  icon,
  title,
  body,
}: {
  step: number;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark text-sm font-extrabold text-white shadow-sm ring-1 ring-white/20"
        aria-hidden
      >
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">{icon}</span>
          <h3 className="font-sans text-sm font-bold text-slate-900">{title}</h3>
        </div>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{body}</p>
      </div>
    </li>
  );
}

function OutcomeCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {icon}
      </div>
      <h3 className="mt-5 font-sans text-lg font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-slate-600">{desc}</p>
    </article>
  );
}

function FeatureCard({ icon, title, desc }: { icon: ReactNode; title: string; desc: string }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200/90 bg-slate-50/50 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-white hover:shadow-lg hover:shadow-primary/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200/80 transition-shadow group-hover:ring-primary/20">
        {icon}
      </div>
      <h3 className="mt-5 font-sans text-lg font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm font-medium leading-relaxed text-slate-600">{desc}</p>
    </article>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left font-sans text-sm font-bold text-slate-900 focus:bg-slate-50/50 focus:outline-none"
        aria-expanded={isOpen}
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-350 ease-in-out ${
          isOpen ? 'max-h-48 border-t border-slate-100' : 'max-h-0'
        }`}
      >
        <div className="p-5 text-sm font-medium leading-relaxed text-slate-600" role="region">
          {a}
        </div>
      </div>
    </div>
  );
}
