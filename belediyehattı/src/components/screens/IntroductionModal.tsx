import { useState } from 'react';
import { storageService } from '../../lib/storageService';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Eye, MessageCircle, Check, ChevronRight } from 'lucide-react';
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
      icon: <ClipboardList className="h-10 w-10 text-primary" />,
      title: {
        tr: 'Bildir sorun',
        en: 'Report an issue',
        ar: 'أبلغ عن مشكلة',
      },
      desc: {
        tr: 'Çukur, arızalı lamba veya benzeri bir sorunu fotoğraf ve konumla belediyenize hızlıca iletin.',
        en: 'Send potholes, broken lights, or similar issues to your municipality with a photo and location.',
        ar: 'أرسل الحفر أو الإضاءة المعطلة أو المشكلات المشابهة إلى بلديتك مع صورة وموقع.',
      },
      bg: 'from-primary/10 to-transparent',
    },
    {
      icon: <Eye className="h-10 w-10 text-blue-500" />,
      title: {
        tr: 'Takip et',
        en: 'Track progress',
        ar: 'تابع الحالة',
      },
      desc: {
        tr: 'İhbarınızın durumunu anlık görün; belediye ekibi süreci ilerlettikçe bilgilendirilirsiniz.',
        en: 'See your report status in real time and get updates as the municipal team progresses.',
        ar: 'اطلع على حالة بلاغك أولاً بأول وتلقَّ تحديثات مع تقدم فريق البلدية.',
      },
      bg: 'from-blue-500/10 to-transparent',
    },
    {
      icon: <MessageCircle className="h-10 w-10 text-emerald-500" />,
      title: {
        tr: 'Belediyen yanıtlar',
        en: 'Your municipality responds',
        ar: 'بلديتك ترد',
      },
      desc: {
        tr: 'Yetkili birimler ihbarınızı değerlendirir ve çözüm sürecini sizinle paylaşır.',
        en: 'The responsible units review your report and share the resolution process with you.',
        ar: 'تراجع الوحدات المختصة بلاغك وتشارك معك مسار الحل.',
      },
      bg: 'from-emerald-500/10 to-transparent',
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
          <div className="absolute inset-0 -z-10" onClick={handleSkip} />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            className={`w-full max-w-sm overflow-hidden rounded-3xl border shadow-2xl ${
              isDark ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
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
                      <span>{lang === 'tr' ? 'Başla' : lang === 'ar' ? 'ابدأ' : 'Get Started'}</span>
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
