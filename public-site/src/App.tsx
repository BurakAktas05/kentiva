import { useEffect, useState, type ReactNode } from 'react';
import {
  ShieldCheck,
  Map,
  Activity,
  ArrowRight,
  CheckCircle2,
  BarChart3,
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
} from 'lucide-react';
import { resolvePublicApiBase } from './lib/apiBase';

const API = resolvePublicApiBase(import.meta.env.VITE_PUBLIC_API_BASE);
const ADMIN_PORTAL_URL =
  (import.meta.env.VITE_ADMIN_PORTAL_URL as string | undefined)?.trim() ||
  'https://admin.kentiva.app';

const CITIZEN_APP_URL = (import.meta.env.VITE_CITIZEN_APP_URL as string | undefined)?.trim() || '';

type Overview = {
  totalReports: number;
  resolvedReports: number;
  resolutionRatePercent: number;
  onboardedMunicipalityCount: number;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'İstek başarısız');
  return body.data as T;
}

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 ring-1 ring-white/20 ${className}`}
      aria-hidden
    >
      <Building2 className="h-5 w-5" strokeWidth={2} />
    </div>
  );
}

export default function App() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    getJson<Overview>('/public/stats')
      .then(setOverview)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none"
      >
        İçeriğe geç
      </a>

      <header>
        <nav
          className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md"
          aria-label="Ana gezinme"
        >
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 sm:h-[4.25rem]">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark />
              <div className="min-w-0">
                <span className="block truncate text-base font-bold tracking-tight text-slate-900">
                  Kentiva
                </span>
                <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
                  Belediye operasyon platformu
                </span>
              </div>
            </div>
            <div className="hidden items-center gap-10 md:flex">
              <a
                href="#ozellikler"
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                Özellikler
              </a>
              <a
                href="#istatistikler"
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                İstatistikler
              </a>
              <a
                href="#kilavuz"
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-primary"
              >
                Kullanım kılavuzu
              </a>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <a
                href={ADMIN_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
                className="hidden text-sm font-semibold text-slate-600 transition-colors hover:text-primary sm:inline"
              >
                Yönetim girişi
              </a>
              <a
                href="mailto:demo@kentiva.app"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-4"
              >
                İletişim
              </a>
            </div>
          </div>
        </nav>
      </header>

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
                  Kurumsal platform
                </p>
                <h1
                  id="hero-heading"
                  className="mt-5 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl lg:text-[2.5rem] lg:leading-[1.12]"
                >
                  Belediye bildirimlerinin kaydı ve operasyonel takibi
                </h1>
                <p className="mt-5 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                  Kentiva; vatandaş bildirimlerinin toplanması, birimlere yönlendirilmesi ve durum
                  takibini tek platformda sunar. Verileriniz kurum politikalarınıza uygun şekilde
                  yönetilir.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-3">
                  <a
                    href="mailto:demo@kentiva.app"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98]"
                  >
                    Bilgi alın
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                  <a
                    href="#ozellikler"
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-800 shadow-sm backdrop-blur-sm transition-all hover:border-slate-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Platform özeti
                  </a>
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">
                  Vatandaş mısınız?{' '}
                  <a href="#kilavuz" className="font-bold text-primary underline-offset-4 hover:underline">
                    İhbar oluşturma kılavuzu
                  </a>
                </p>
                <dl className="mt-10 grid grid-cols-2 gap-4 sm:max-w-md sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Güven</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-900">KVKK uyumlu</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Erişim</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-900">Web + mobil</dd>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-slate-200/90 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:col-span-1">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Operasyon</dt>
                    <dd className="mt-1 text-sm font-bold text-slate-900">Canlı durum</dd>
                  </div>
                </dl>
              </div>
              <div className="relative lg:justify-self-end">
                <div
                  className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent blur-2xl"
                  aria-hidden
                />
                <div className="relative rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
                  <img
                    src="/mockup.png"
                    alt="Kentiva yönetim paneli ekran görüntüsü"
                    className="w-full max-w-lg rounded-xl object-cover lg:ml-auto"
                    width={1200}
                    height={800}
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="istatistikler"
          className="border-b border-slate-200/90 bg-slate-50 py-16 sm:py-20"
          aria-labelledby="stats-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2
                id="stats-heading"
                className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
              >
                Platform özet verileri
              </h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Aşağıdaki değerler, sisteme kayıtlı belediyeler için birleştirilmiş ve kişisel veri
                içermeyen toplu istatistiklerdir.
              </p>
            </div>

            {err && (
              <div
                className="mt-8 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
                role="alert"
              >
                {err}
              </div>
            )}

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Map className="h-5 w-5 text-primary" aria-hidden />}
                label="Kayıtlı belediye sayısı"
                value={overview?.onboardedMunicipalityCount ?? '-'}
              />
              <StatCard
                icon={<Activity className="h-5 w-5 text-primary" aria-hidden />}
                label="Toplam bildirim"
                value={overview?.totalReports ?? '-'}
              />
              <StatCard
                icon={<CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />}
                label="Çözülen bildirim"
                value={overview?.resolvedReports ?? '-'}
              />
              <StatCard
                icon={<BarChart3 className="h-5 w-5 text-primary" aria-hidden />}
                label="Çözüm oranı"
                value={overview?.resolutionRatePercent ?? '-'}
                suffix="%"
              />
            </div>
          </div>
        </section>

        <section
          id="ozellikler"
          className="border-b border-slate-200/90 bg-white py-16 sm:py-20"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2
                id="features-heading"
                className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
              >
                Modüller
              </h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Bildirim yaşam döngüsü; mobil başvuru, kurum içi işleyiş ve raporlama ile
                desteklenir.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <FeatureCard
                icon={<Smartphone className="h-6 w-6 text-primary" aria-hidden />}
                title="Vatandaş uygulaması"
                desc="iOS ve Android üzerinden konum ve görsel ekli bildirim; kurumunuza düşen kayıtlar tek kuyrukta toplanır."
              />
              <FeatureCard
                icon={<ShieldCheck className="h-6 w-6 text-primary" aria-hidden />}
                title="Sınıflandırma ve öncelik"
                desc="Metin ve bağlam bilgisine dayalı öneriler; ekip ataması ve önceliklendirme süreçlerini hızlandırır."
              />
              <FeatureCard
                icon={<Building2 className="h-6 w-6 text-primary" aria-hidden />}
                title="Yönetim paneli"
                desc="Web tabanlı arayüz ile bildirim durumu, birim yükü ve operasyonel görünürlük aynı ekranda izlenir."
              />
            </div>
          </div>
        </section>

        <section
          id="kilavuz"
          className="border-b border-slate-200/90 bg-slate-50 py-16 sm:py-20"
          aria-labelledby="guide-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
                  <BookOpen className="h-4 w-4" aria-hidden />
                  Vatandaş rehberi
                </p>
                <h2
                  id="guide-heading"
                  className="mt-2 font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
                >
                  İhbar (bildirim) nasıl oluşturulur?
                </h2>
                <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">
                  Bu kurumsal site tanıtım ve iletişim içindir; doğrudan siteden ihbar kaydı açılmaz.
                  İhbarlar, belediyenizin kullandığı{' '}
                  <strong className="font-bold text-slate-800">Kentiva vatandaş uygulaması</strong> (mobil veya
                  belediyenizin paylaştığı web adresi) üzerinden iletilir ve yönetim paneline düşer.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:shrink-0">
                {CITIZEN_APP_URL ? (
                  <a
                    href={CITIZEN_APP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
                    Uygulamayı aç
                  </a>
                ) : (
                  <p className="max-w-md self-center text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
                    Vatandaş uygulamasına belediyenizin web sitesi, duyuruları veya uygulama mağazasındaki
                    bağlantıdan erişin. Kurumunuz Kentiva kullanıyorsa size özel indirme veya web adresi paylaşılır.
                  </p>
                )}
                <a
                  href="#ozellikler"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Modülleri inceleyin
                </a>
              </div>
            </div>

            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="İhbar oluşturma adımları">
              <GuideStep
                step={1}
                icon={<Smartphone className="h-5 w-5 text-primary" aria-hidden />}
                title="Uygulamayı açın"
                body="Belediyenizin duyurduğu Kentiva uygulamasını veya size verilen web bağlantısını kullanın. Kurulum için mağaza (App Store / Google Play) veya belediye web sitesindeki yönlendirmeyi izleyin."
              />
              <GuideStep
                step={2}
                icon={<UserPlus className="h-5 w-5 text-primary" aria-hidden />}
                title="Kayıt veya giriş"
                body="İlk kullanımda kısa bir hesap oluşturun; sonrasında e-posta ve şifre ile giriş yapın. Bilgileriniz yalnızca bildiriminizin işlenmesi için kullanılır."
              />
              <GuideStep
                step={3}
                icon={<MapPinned className="h-5 w-5 text-primary" aria-hidden />}
                title="Belediyeyi seçin"
                body="Birden fazla kurum varsa, ihbarı iletmek istediğiniz belediyeyi listeden seçin. Seçim sonrası uygulama o belediyenin süreçlerine göre çalışır."
              />
              <GuideStep
                step={4}
                icon={<PlusCircle className="h-5 w-5 text-primary" aria-hidden />}
                title="Yeni bildirim başlatın"
                body="Alt menüdeki artı (+) düğmesine dokunarak yeni ihbar sihirbazını açın. Ana ekrandan da hızlı duyurulara erişebilirsiniz."
              />
              <GuideStep
                step={5}
                icon={<FileText className="h-5 w-5 text-primary" aria-hidden />}
                title="Açıklama ve konum"
                body="Olayı net şekilde yazın. Konum iznini verin veya haritadan noktayı işaretleyin; ekiplerin sahayı bulması için gereklidir."
              />
              <GuideStep
                step={6}
                icon={<ImagePlus className="h-5 w-5 text-primary" aria-hidden />}
                title="Fotoğraf (isteğe bağlı)"
                body="Varsa çektiğiniz fotoğrafı ekleyin; görsel inceleme ve önceliklendirme sürecini hızlandırır."
              />
              <GuideStep
                step={7}
                icon={<Send className="h-5 w-5 text-primary" aria-hidden />}
                title="Gönderin ve takip edin"
                body="Gönderdikten sonra kayıt numarası veya listeden durumu izleyin. Gelişmeler için bildirim tercihlerinizi açık tutabilirsiniz."
              />
            </ol>

            <div className="mt-10 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:flex sm:items-start sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="font-sans text-base font-bold text-slate-900">Özet</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                  Kısaca: uygulamada giriş yapın → belediyeyi seçin → artı ile yeni ihbar → metin ve konum → (fotoğraf)
                  → gönder. Sorun yaşarsanız belediye çağrı merkezi veya Kentiva iletişim kanallarından destek alın.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark py-16 sm:py-20"
          aria-labelledby="cta-heading"
        >
          <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-secondary/25 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent/15 blur-3xl" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2
              id="cta-heading"
              className="font-sans text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
            >
              Kurumunuz için bilgilendirme
            </h2>
            <p className="mt-4 text-base font-medium text-primary-100">
              Teknik gereksinimler, veri işleme ve devreye alma adımları hakkında yazılı bilgi
              talep edebilirsiniz.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:demo@kentiva.app"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary shadow-lg transition-all hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.98]"
              >
                İletişime geçin
                <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a
                href={ADMIN_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Yönetim girişi
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30"
                  aria-hidden
                >
                  <Building2 className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="text-sm font-bold tracking-tight text-white">Kentiva</span>
              </div>
              <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-slate-400">
                © {new Date().getFullYear()} Kentiva Yazılım Teknolojileri. Tüm hakları saklıdır.
              </p>
            </div>
            <nav className="flex flex-col gap-2 text-sm font-semibold sm:items-end" aria-label="Alt bağlantılar">
              <a href="#ozellikler" className="text-slate-400 transition-colors hover:text-white">
                Özellikler
              </a>
              <a href="#istatistikler" className="text-slate-400 transition-colors hover:text-white">
                İstatistikler
              </a>
              <a href="#kilavuz" className="text-slate-400 transition-colors hover:text-white">
                Kullanım kılavuzu
              </a>
              <a
                href={ADMIN_PORTAL_URL}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 transition-colors hover:text-white"
              >
                Yönetim girişi
              </a>
              <a
                href="mailto:demo@kentiva.app"
                className="text-slate-400 transition-colors hover:text-white"
              >
                demo@kentiva.app
              </a>
            </nav>
          </div>
          <p className="mt-8 border-t border-slate-800/80 pt-6 text-xs font-medium leading-relaxed text-slate-500">
            KVKK: Bu sayfadaki istatistikler anonimleştirilmiş toplu verilerden oluşur; tekil
            bildirim, konum veya kimlik bilgisi kamuya açık paylaşılmaz.
          </p>
        </div>
      </footer>
    </div>
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
    <li className="flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
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

function StatCard({
  icon,
  label,
  value,
  suffix = '',
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  suffix?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/10 transition-colors group-hover:bg-primary/12">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
            {value === '-' ? (
              <span
                className="inline-block h-8 w-14 animate-pulse rounded-lg bg-slate-200"
                aria-hidden
              />
            ) : (
              <>
                {value}
                {suffix}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
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
