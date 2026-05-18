import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Lang } from '../i18n';
import AiPriorityBadge from './AiPriorityBadge';
import type { ReportDraftAnalysis } from '../api';

export default function ReportAiScanOverlay({
  open,
  analysis,
  loading,
  lang,
  onDone,
}: {
  open: boolean;
  analysis: ReportDraftAnalysis | null;
  loading: boolean;
  lang: Lang;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const steps = analysis?.steps ?? [];

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    if (loading || steps.length === 0) {
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < steps.length; i++) {
      timers.push(setTimeout(() => setStep(i), i * 750));
    }
    timers.push(setTimeout(() => onDone(), steps.length * 750 + 400));
    return () => timers.forEach(clearTimeout);
  }, [open, loading, steps, onDone]);

  if (!open) return null;

  const stepText = loading
    ? lang === 'tr'
      ? 'Yapay zeka analiz ediyor…'
      : 'AI is analyzing…'
    : steps[step] ?? steps[0] ?? '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-primary/30 bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <motion.div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className={`h-7 w-7 ${loading ? 'animate-pulse' : ''}`} />
        </motion.div>
        <AnimatePresence mode="wait">
          <motion.p
            key={loading ? 'load' : step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-semibold text-slate-800 dark:text-slate-100"
          >
            {stepText}
          </motion.p>
        </AnimatePresence>
        {!loading && steps.length > 0 && (
          <div className="mt-4 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i <= step ? 'w-6 bg-primary' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`}
              />
            ))}
          </div>
        )}
        {!loading && analysis && step >= 1 && (
          <motion.div className="mt-4 flex flex-col items-center gap-2">
            <AiPriorityBadge
              priority={analysis.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'}
              lang={lang}
            />
            <p className="text-center text-[10px] text-slate-400">{analysis.analysisSource}</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
