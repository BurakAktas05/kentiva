import { useState, type ReactNode } from 'react';
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
} from 'lucide-react';
import { SeoHead } from '../components/SeoHead';
import { LiveStatsSection } from '../components/LiveStatsSection';
import { demoMailto, marketingConfig } from '../lib/marketing';

const { adminPortalUrl, citizenAppUrl, monthlyPriceLabel, pilotDurationLabel } = marketingConfig;

export default function HomePage() {
  return (
    <>
      <SeoHead
        title="Kentiva — Belediye bildirim yönetimi"
        description="Kentiva; vatandaş bildirimlerinin toplanması, birimlere yönlendirilmesi ve durum takibini tek platformda sunar. Anonimleştirilmiş kamu istatistikleri."
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
                    href={demoMailto('Kentiva Bilgi Talebi')}
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

        <LiveStatsSection />

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
                {citizenAppUrl ? (
                  <a
                    href={citizenAppUrl}
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

        {/* Fiyatlandırma */}
        <section
          id="fiyatlandirma"
          className="border-b border-slate-200/90 bg-white py-16 sm:py-20"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <h2
                id="pricing-heading"
                className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
              >
                Tek plan, tüm özellikler
              </h2>
              <p className="mt-3 text-base font-medium text-slate-600">
                Gizli maliyet yok. Tüm modüller, sınırsız kullanım, AI analizi dahil. Belediyenizin büyüklüğü fark etmez.
              </p>
            </div>

            <div className="mt-10 mx-auto max-w-lg">
              <div className="relative flex flex-col rounded-2xl border border-primary/30 bg-primary/[0.02] p-8 shadow-lg ring-2 ring-primary/20">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  Her şey dahil
                </span>
                <h3 className="text-center font-sans text-xl font-bold text-slate-900">Kentiva Platform</h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">{monthlyPriceLabel}</span>
                  <span className="text-sm font-medium text-slate-500">/ay</span>
                </div>
                <p className="mt-2 text-center text-sm text-slate-500">İlk {pilotDurationLabel} ücretsiz pilot</p>
                <ul className="mt-8 flex-1 space-y-3 border-t border-slate-100 pt-6">
                  {[
                    'Sınırsız rapor & bildirim',
                    'Sınırsız personel hesabı',
                    'Sınırsız departman',
                    'AI önceliklendirme & analiz',
                    'Selfie/sahte fotoğraf tespiti',
                    'Beyaz etiket (logo + renkler)',
                    'Vatandaş mobil uygulaması',
                    'Yönetim paneli',
                    'Canlı harita & PostGIS',
                    'Excel/PDF dışa aktarma',
                    'Push bildirimler',
                    'Teknik destek',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm font-medium text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={demoMailto()}
                  className="mt-8 block rounded-xl bg-primary py-3.5 text-center text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-hover active:scale-[0.98]"
                >
                  Ücretsiz Demo Talep Et
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SSS */}
        <section className="border-b border-slate-200/90 bg-slate-50 py-16 sm:py-20" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 id="faq-heading" className="font-sans text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl text-center">
              Sıkça Sorulan Sorular
            </h2>
            <dl className="mt-10 space-y-4">
              <FaqItem q="Belediyemiz nasıl üye olabilir?" a={`Demo talep formunu doldurmanız yeterlidir. Ekibimiz sizinle iletişime geçerek kurulumu başlatır. İlk ${pilotDurationLabel} ücretsiz pilot süreci sunulur.`} />
              <FaqItem q="Vatandaş verileri güvende mi?" a="Tüm veriler KVKK uyumlu şekilde işlenir. Her belediye yalnızca kendi ilçe sınırları içindeki bildirimleri görür. Veriler şifreli bağlantılarla taşınır." />
              <FaqItem q="Departmanları biz mi ekliyoruz?" a="Evet. Her belediye kendi departman yapısını oluşturur. Küçük bir belediyede 2 departman, büyük bir belediyede 10+ departman olabilir." />
              <FaqItem q="AI analizi nasıl çalışıyor?" a="Her bildirim otomatik olarak AI tarafından analiz edilir: öncelik, kategori önerisi, özet ve cevap taslağı üretilir. Selfie/sahte fotoğraflar otomatik tespit edilir." />
              <FaqItem q="Mobil uygulama hangi platformlarda çalışıyor?" a="Şu an Android için APK olarak sunulmaktadır. iOS desteği yakında eklenecektir." />
            </dl>
          </div>
        </section>

        {/* CTA */}
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
              Belediyeniz için hemen başlayın
            </h2>
            <p className="mt-4 text-base font-medium text-primary-100">
              {pilotDurationLabel} ücretsiz pilot ile platformu risk almadan test edin. Kurulum desteği tarafımızdandır.
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
                href={adminPortalUrl}
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
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left font-sans text-sm font-bold text-slate-900 focus:outline-none focus:bg-slate-50/50"
      >
        <span>{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>
      <div
        className={`transition-all duration-350 ease-in-out ${
          isOpen ? 'max-h-40 border-t border-slate-100' : 'max-h-0'
        } overflow-hidden`}
      >
        <div className="p-5 text-sm font-medium leading-relaxed text-slate-600">
          {a}
        </div>
      </div>
    </div>
  );
}
