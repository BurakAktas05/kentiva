import { FileText, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfServicePage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Ana sayfa
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Kullanım Koşulları
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Son güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <article className="prose prose-slate max-w-none text-sm leading-relaxed">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">1. Genel Hükümler</h2>
          <p className="text-slate-600">
            Bu kullanım koşulları ("Koşullar"), Kentiva Yazılım Teknolojileri ("Kentiva") tarafından
            sunulan Kentiva mobil uygulaması ve web platformlarının ("Hizmet") kullanımını
            düzenlemektedir. Hizmeti kullanarak bu koşulları kabul etmiş sayılırsınız.
          </p>
          <p className="text-slate-600 mt-2">
            Kentiva, belediyelerin vatandaş ihbar ve hizmet süreçlerini dijitalleştiren bir
            SaaS platformudur. Vatandaşlar uygulama aracılığıyla çevrelerindeki sorunları
            belediyelerine bildirebilir ve süreçleri takip edebilir.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">2. Hizmetin Kapsamı</h2>
          <p className="text-slate-600 mb-3">Kentiva aşağıdaki hizmetleri sunar:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Vatandaş ihbar oluşturma ve takip etme</li>
            <li>Belediye duyuru ve etkinliklerini görüntüleme</li>
            <li>Anketlere katılım</li>
            <li>Sosyal yardım ilanları (kan arama, kayıp evcil hayvan, eşya bağışı)</li>
            <li>Belediye istatistiklerini görüntüleme</li>
            <li>Push bildirimler ile ihbar durumu takibi</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">3. Hesap Oluşturma</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Hizmeti kullanmak için geçerli bir e-posta adresi ile kayıt olmanız gerekmektedir.</li>
            <li>Kayıt sırasında doğru ve güncel bilgiler vermeniz zorunludur.</li>
            <li>Hesap güvenliğiniz sizin sorumluluğunuzdadır; şifrenizi kimseyle paylaşmayınız.</li>
            <li>18 yaşından küçükler hesap oluşturamaz.</li>
            <li>Her kullanıcı yalnızca bir hesap açabilir.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">4. Kullanıcı Yükümlülükleri</h2>
          <p className="text-slate-600 mb-3">Hizmeti kullanırken aşağıdaki kurallara uymayı kabul edersiniz:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>İhbarları gerçek ve doğru bilgilere dayanarak oluşturmak</li>
            <li>Asılsız, yanlış veya yanıltıcı ihbarlarda bulunmamak</li>
            <li>Hakaret, tehdit, ayrımcılık veya yasadışı içerik paylaşmamak</li>
            <li>Başkalarının kişisel verilerini izinsiz paylaşmamak</li>
            <li>Sistemi kötüye kullanmamak (spam, bot, otomatik ihbar gönderimi vb.)</li>
            <li>Fotoğraflarda kasıtlı olarak üçüncü kişilerin gizliliğini ihlal etmemek</li>
            <li>Uygulamayı yalnızca yasal amaçlarla kullanmak</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">5. Güven Puanı Sistemi</h2>
          <p className="text-slate-600">
            Kentiva, ihbar kalitesini artırmak amacıyla bir güven puanı (reputation score) sistemi
            kullanmaktadır. Her kullanıcı 100 puan ile başlar. Asılsız ihbarlar, spam davranışları
            veya kural ihlalleri puan düşüşüne neden olabilir.
          </p>
          <p className="text-slate-600 mt-2">
            Güven puanı <strong>30</strong> puanın altına düşen kullanıcıların yeni ihbar oluşturma
            yetkisi geçici olarak askıya alınır. Puan, doğru ve kaliteli ihbarlar ile geri kazanılabilir.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">6. Konum Hizmetleri</h2>
          <p className="text-slate-600">
            İhbar oluşturabilmek için cihazınızın konum servislerini etkinleştirmeniz gerekmektedir.
            Konum bilgisi yalnızca ihbar oluşturma sırasında alınır ve arka planda sürekli
            takip yapılmaz.
          </p>
          <p className="text-slate-600 mt-2">
            Kentiva üyesi olmayan bir belediye bölgesinden ihbar oluşturulamaz (geofencing).
            Bu durumda kullanıcıya bilgilendirme mesajı gösterilir.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">7. Fotoğraf ve Medya</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>İhbar oluşturma sırasında fotoğraf çekimi zorunlu olabilir.</li>
            <li>Fotoğraflar yalnızca uygulama kamerası ile anlık olarak çekilmelidir; galeriden yükleme kısıtlanabilir.</li>
            <li>Fotoğraflardaki yüzler ve araç plakaları yapay zeka tarafından otomatik olarak anonimleştirilir.</li>
            <li>Uygunsuz, müstehcen veya ihbarla ilgisiz fotoğraflar yapay zeka tarafından tespit edilir ve reddedilir.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">8. Fikri Mülkiyet</h2>
          <p className="text-slate-600">
            Kentiva uygulaması, logosu, tasarımı, kaynak kodu ve tüm içerikleri
            Kentiva Yazılım Teknolojileri'nin fikri mülkiyetidir. İzinsiz kopyalama,
            dağıtma, tersine mühendislik veya değişiklik yapma yasaktır.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">9. Hesap Askıya Alma ve Sonlandırma</h2>
          <p className="text-slate-600">
            Kentiva, aşağıdaki durumlarda kullanıcı hesabını geçici veya kalıcı olarak askıya
            alma veya sonlandırma hakkını saklı tutar:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-2">
            <li>Kullanım koşullarının ihlali</li>
            <li>Tekrarlayan asılsız ihbar gönderimi</li>
            <li>Sistemi kötüye kullanma girişimleri</li>
            <li>Yasadışı faaliyetler</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">10. Sorumluluk Sınırlaması</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Kentiva, belediye hizmetlerinin kalitesi veya zamanlaması konusunda garanti vermez.</li>
            <li>İhbarların belediye tarafından ne zaman veya nasıl çözüleceği belediyenin sorumluluğundadır.</li>
            <li>Hizmet kesintileri, bakım çalışmaları veya mücbir sebepler nedeniyle oluşabilecek kesintilerden Kentiva sorumlu tutulamaz.</li>
            <li>Kullanıcıların paylaştığı içeriklerden kaynaklanan hukuki sorumluluk içerik sahibine aittir.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">11. Değişiklikler</h2>
          <p className="text-slate-600">
            Kentiva, bu kullanım koşullarını önceden bildirmeksizin güncelleme hakkını
            saklı tutar. Önemli değişiklikler uygulama içi bildirim ile duyurulur.
            Güncellenen koşullar yayınlandığı tarihte yürürlüğe girer.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">12. Uygulanacak Hukuk</h2>
          <p className="text-slate-600">
            Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda
            Türkiye Cumhuriyeti mahkemeleri yetkilidir.
          </p>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">13. İletişim</h2>
          <p className="text-slate-600 mb-4">
            Kullanım koşullarıyla ilgili sorularınız için:
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:destek@kentiva.app?subject=Kullanım%20Koşulları%20Hakkında"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" />
              destek@kentiva.app
            </a>
            <a
              href="mailto:kvkk@kentiva.app?subject=KVKK%20Başvurusu"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <Mail className="h-4 w-4" />
              kvkk@kentiva.app
            </a>
          </div>
        </section>
      </article>
    </main>
  );
}
