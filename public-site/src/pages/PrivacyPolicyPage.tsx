import { Shield, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyPage() {
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
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Gizlilik Politikası
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Son güncelleme: {new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <article className="prose prose-slate max-w-none text-sm leading-relaxed">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">1. Veri Sorumlusu</h2>
          <p className="text-slate-600">
            Kentiva Yazılım Teknolojileri ("Kentiva", "biz") olarak, 6698 sayılı Kişisel Verilerin
            Korunması Kanunu ("KVKK") kapsamında <strong>veri sorumlusu</strong> sıfatıyla
            kişisel verilerinizi aşağıda açıklanan şekilde işlemekteyiz.
          </p>
          <p className="text-slate-600 mt-2">
            Kentiva, belediyelerin vatandaş ihbar ve hizmet süreçlerini dijitalleştiren çok kiracılı
            (multi-tenant) bir SaaS platformudur. Uygulama, belediye operasyonlarını modernize
            etmek amacıyla vatandaşlar ve belediye personeli tarafından kullanılmaktadır.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">2. Toplanan Kişisel Veriler</h2>
          <p className="text-slate-600 mb-3">Uygulamamız aşağıdaki kişisel verileri toplamaktadır:</p>

          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-800 mb-1">Kimlik Bilgileri</h3>
              <p className="text-slate-600">Ad, soyad, e-posta adresi, telefon numarası (opsiyonel), T.C. kimlik numarası (opsiyonel — doğrulama amaçlı), doğum yılı (opsiyonel).</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-800 mb-1">Konum Bilgileri</h3>
              <p className="text-slate-600">İhbar oluşturma sırasında GPS koordinatları. Konum verisi yalnızca ihbar oluşturma esnasında ve kullanıcı izni ile alınır.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-800 mb-1">Görsel ve Medya</h3>
              <p className="text-slate-600">İhbar kanıtı olarak çekilen fotoğraflar. Fotoğraflarda yer alan yüzler ve araç plakaları KVKK uyumluluğu kapsamında yapay zeka tarafından otomatik olarak anonimleştirilir (pikselleştirilir).</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-800 mb-1">Cihaz Bilgileri</h3>
              <p className="text-slate-600">Push bildirim token'ı (FCM). Cihaz kimliği veya reklam tanımlayıcısı toplanmaz.</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-800 mb-1">Kullanım Verileri</h3>
              <p className="text-slate-600">İhbar geçmişi, uygulama kullanım istatistikleri, güven puanı (reputation score).</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">3. Veri İşleme Amaçları</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Vatandaş hesap oluşturma ve kimlik doğrulama işlemleri</li>
            <li>Belediyeye ihbar iletilmesi, takip edilmesi ve çözümlenmesi</li>
            <li>Konum tabanlı belediye eşleştirmesi (geofencing)</li>
            <li>Push bildirim ile ihbar durumu hakkında bilgilendirme</li>
            <li>KVKK kapsamında yüz ve plaka anonimleştirme</li>
            <li>Yapay zeka destekli ihbar kategorizasyonu ve önceliklendirme</li>
            <li>Hizmet kalitesinin iyileştirilmesi ve istatistiksel analiz</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">4. Veri İşlemenin Hukuki Dayanağı</h2>
          <p className="text-slate-600">
            Kişisel verileriniz KVKK'nın 5. maddesi kapsamında aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-2">
            <li><strong>Açık rıza:</strong> Kayıt sırasında KVKK onay kutusu ile alınan açık rıza</li>
            <li><strong>Sözleşmenin ifası:</strong> Hizmet sunumu için gerekli olan veriler</li>
            <li><strong>Hukuki yükümlülük:</strong> Yasal saklama süreleri ve mevzuat gereklilikleri</li>
            <li><strong>Meşru menfaat:</strong> Hizmet güvenliği ve kötüye kullanım önleme</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">5. Verilerin Paylaşılması</h2>
          <p className="text-slate-600">Kişisel verileriniz aşağıdaki taraflarla paylaşılabilir:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-2">
            <li><strong>Belediyeler:</strong> İhbarınızın işlenmesi amacıyla ilgili belediye ile ihbar içeriği ve konum bilgisi paylaşılır.</li>
            <li><strong>Altyapı sağlayıcıları:</strong> Veri depolama (Cloudflare R2 / AWS S3), veritabanı (PostgreSQL), push bildirim (Firebase Cloud Messaging) hizmetleri için teknik altyapı sağlayıcılarıyla paylaşılır.</li>
            <li><strong>SMS sağlayıcıları:</strong> Şifre sıfırlama ve doğrulama kodları için (NetGSM / Twilio).</li>
          </ul>
          <p className="text-slate-600 mt-3">
            Kişisel verileriniz <strong>üçüncü taraf reklam şirketleri ile paylaşılmaz</strong> ve 
            <strong> pazarlama amacıyla kullanılmaz</strong>.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">6. Veri Güvenliği</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Tüm iletişim HTTPS/TLS ile şifrelenir</li>
            <li>Şifreler BCrypt algoritması ile hash'lenerek saklanır</li>
            <li>JWT tabanlı durumsuz (stateless) kimlik doğrulama kullanılır</li>
            <li>Brute-force saldırı koruması ve rate limiting uygulanır</li>
            <li>Fotoğraflardaki yüzler ve plakalar AI ile otomatik anonimleştirilir</li>
            <li>Veritabanı erişimi rol bazlı yetkilendirme ile kısıtlıdır</li>
            <li>Denetim günlükleri (audit logs) tüm kritik işlemler için tutulur</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">7. Veri Saklama Süreleri</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li><strong>Kullanıcı hesap bilgileri:</strong> Hesap aktif olduğu sürece saklanır. Hesap kapatıldığında profil bilgileri anonimleştirilir.</li>
            <li><strong>İhbar kayıtları:</strong> Belediye mevzuatı gereği anonimleştirilmiş halde yasal süre boyunca saklanabilir.</li>
            <li><strong>Konum verileri:</strong> Yalnızca ihbar kaydıyla birlikte saklanır.</li>
            <li><strong>Oturum verileri (JWT):</strong> Access token 15 dakika, refresh token 30 gün geçerlidir.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">8. Haklarınız (KVKK Madde 11)</h2>
          <p className="text-slate-600 mb-3">KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
            <li>Kişisel verilerinizin işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
            <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme</li>
            <li>KVKK'nın 7. maddesi kapsamında silinmesini veya yok edilmesini isteme</li>
            <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
            <li>Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">9. Hesap Silme</h2>
          <p className="text-slate-600">
            Hesabınızı uygulama içindeki <strong>Ayarlar → Hesabı kapat</strong> bölümünden
            istediğiniz zaman silebilirsiniz. Hesap kapatıldığında:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-600 mt-2">
            <li>Aktif oturumlarınız sonlandırılır</li>
            <li>Sosyal ilanlarınız kaldırılır</li>
            <li>Profil bilgileriniz anonimleştirilir</li>
            <li>Belediye ihbar kayıtları mevzuat gereği anonimleştirilmiş halde saklanabilir</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">10. Çerezler ve İzleme</h2>
          <p className="text-slate-600">
            Mobil uygulamamız çerez kullanmaz. Web platformlarımız yalnızca oturum yönetimi
            için zorunlu çerezler kullanır. Üçüncü taraf izleme veya reklam çerezleri bulunmaz.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">11. Değişiklikler</h2>
          <p className="text-slate-600">
            Bu gizlilik politikası güncellenebilir. Önemli değişiklikler yapıldığında uygulama
            içi bildirim ile kullanıcılar bilgilendirilir. Bu sayfayı düzenli olarak kontrol
            etmenizi öneririz.
          </p>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-3">12. İletişim</h2>
          <p className="text-slate-600 mb-4">
            Kişisel verilerinizle ilgili tüm başvuru, soru ve talepleriniz için:
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:kvkk@kentiva.app?subject=KVKK%20Başvurusu"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary/90"
            >
              <Mail className="h-4 w-4" />
              kvkk@kentiva.app
            </a>
            <a
              href="mailto:destek@kentiva.app?subject=Destek%20Talebi"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <Mail className="h-4 w-4" />
              destek@kentiva.app
            </a>
          </div>
        </section>
      </article>
    </main>
  );
}
