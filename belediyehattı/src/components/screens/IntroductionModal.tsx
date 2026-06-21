import { useState } from 'react';
import { storageService } from '../../lib/storageService';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Bell, Map, Users, Sparkles, Check, ChevronRight } from 'lucide-react';
import { Lang } from '../../i18n';

interface IntroductionModalProps {
  lang: Lang;
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function IntroductionModal({ lang, isDark, isOpen, onClose }: IntroductionModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <Sparkles className="h-10 w-10 text-primary animate-pulse" />,
      title: {
        tr: 'Kentiva\'ya Hoş Geldiniz!',
        en: 'Welcome to Kentiva!',
        ar: 'مرحباً بك في Kentiva!',
      },
      desc: {
        tr: 'Kentiva, belediyeniz ile aranızdaki dijital köprüdür. Şehrinizi daha yaşanabilir kılmak için tasarlanmıştır.',
        en: 'Kentiva is the digital bridge between you and your municipality. Designed to make your city more livable.',
        ar: 'منصة Kentiva هي الجسر الرقمي بينك وبين بلديتك، صُممت لجعل مدينتك أفضل للعيش.',
      },
      bg: 'from-primary/10 to-transparent',
    },
    {
      icon: <ClipboardList className="h-10 w-10 text-amber-500" />,
      title: {
        tr: 'Sorunları Kolayca Bildirin',
        en: 'Report Issues Easily',
        ar: 'أبلغ عن المشكلات بسهولة',
      },
      desc: {
        tr: 'Sokaktaki çukurları, arızalı lambaları veya diğer sorunları fotoğraf ve konum ekleyerek hızlıca belediyeye iletin.',
        en: 'Report potholes, broken streetlights, or other issues by adding photos and GPS location to the municipality.',
        ar: 'أبلغ عن الحفر في الشوارع، مصابيح الإنارة المعطلة أو أي مشكلات أخرى بإرفاق صورة وموقع GPS للبلدية.',
      },
      bg: 'from-amber-500/10 to-transparent',
    },
    {
      icon: <Bell className="h-10 w-10 text-blue-500" />,
      title: {
        tr: 'Duyurular & Hava Durumu',
        en: 'Announcements & Weather',
        ar: 'الإعلانات والطقس',
      },
      desc: {
        tr: 'Belediyenizden anlık haberleri takip edin, hava durumunu kontrol edin ve nöbetçi eczanelere kolayca ulaşın.',
        en: 'Follow instant news from your municipality, check local weather, and easily access pharmacies on duty.',
        ar: 'تابع الأخبار العاجلة من بلديتك، وتفقد أحوال الطقس، وتعرف على الصيدليات المناوبة بكل سهولة.',
      },
      bg: 'from-blue-500/10 to-transparent',
    },
    {
      icon: <Map className="h-10 w-10 text-emerald-500" />,
      title: {
        tr: 'Otobüs Seferleri & Duraklar',
        en: 'Bus Schedules & Stops',
        ar: 'مواعيد الحافلات والمواقف',
      },
      desc: {
        tr: 'Şehir içi otobüslerin güzergahlarına, sıralı duraklarına ve kalkış saatlerine dilediğiniz an erişin.',
        en: 'Access inner-city bus routes, list of stops, and departure times whenever you need.',
        ar: 'الوصول إلى مسارات الحافلات داخل المدينة، قائمة المواقف، وأوقات المغادرة في أي وقت تشاء.',
      },
      bg: 'from-emerald-500/10 to-transparent',
    },
    {
      icon: <Users className="h-10 w-10 text-rose-500" />,
      title: {
        tr: 'Topluluk Yardımlaşması',
        en: 'Community Ads',
        ar: 'التكافل المجتمعي',
      },
      desc: {
        tr: 'Acil kan arama duyuruları paylaşın, kayıp evcil hayvanları bildirin veya ihtiyaç sahipleri için eşya bağışında bulunun.',
        en: 'Share urgent blood donation alerts, report lost pets, or donate unused items to people in need.',
        ar: 'انشر إعلانات التبرع بالدم العاجلة، أو أبلغ عن الحيوانات الأليفة المفقودة، أو تبرع بالسلع للمحتاجين.',
      },
      bg: 'from-rose-500/10 to-transparent',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      storageService.setItem('belediye_welcome_onboarded', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    storageService.setItem('belediye_welcome_onboarded', 'true');
    onClose();
  };

  const currentData = slides[currentSlide];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          {/* Backdrop */}
          <div className="absolute inset-0 -z-10" onClick={handleSkip} />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className={`w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl ${
              isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            {/* Top gradient visual */}
            <div className={`h-36 bg-gradient-to-b ${currentData.bg} flex items-center justify-center relative transition-all duration-300`}>
              <button
                type="button"
                onClick={handleSkip}
                className="absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
              >
                {lang === 'tr' ? 'Atla' : lang === 'ar' ? 'تخطي' : 'Skip'}
              </button>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  transition={{ duration: 0.25, type: 'spring', stiffness: 200, damping: 18 }}
                  className="p-4 rounded-3xl bg-white dark:bg-slate-950 shadow-md border border-slate-100 dark:border-slate-800"
                >
                  {currentData.icon}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Slide Info */}
            <div className="p-6 text-center space-y-4 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-3"
                >
                  <h3 className="text-lg font-extrabold tracking-tight">
                    {currentData.title[lang] || currentData.title.en}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[64px] px-2 font-medium">
                    {currentData.desc[lang] || currentData.desc.en}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Dots indicator */}
              <div className="flex justify-center gap-1.5 pt-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === currentSlide
                        ? 'w-6 bg-primary shadow-sm shadow-primary/30'
                        : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 flex gap-3">
                {currentSlide > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentSlide((prev) => prev - 1)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-white py-3.5 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 transition-all active:scale-[0.98]"
                  >
                    {lang === 'tr' ? 'Geri' : lang === 'ar' ? 'سابق' : 'Back'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-xs font-bold text-white shadow-lg shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  {currentSlide === slides.length - 1 ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{lang === 'tr' ? 'Keşfetmeye Başla' : lang === 'ar' ? 'ابدأ الاستكشاف' : 'Get Started'}</span>
                    </>
                  ) : (
                    <>
                      <span>{lang === 'tr' ? 'İleri' : lang === 'ar' ? 'التالي' : 'Next'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
