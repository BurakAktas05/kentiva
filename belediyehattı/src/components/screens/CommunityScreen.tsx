import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PublicTenant } from '../../api';
import { Lang, t } from '../../i18n';
import { screenHeadingClass, screenSubtitleClass, segmentBarClass, segmentBtnClass } from '../../lib/ui';
import SocialAds from './SocialAds';

interface CommunityScreenProps {
  municipality: PublicTenant | null;
  lang: Lang;
  isDark: boolean;
}

export type CommunitySegment = 'blood' | 'lost' | 'items';

export default function CommunityScreen({ municipality, lang, isDark }: CommunityScreenProps) {
  const [segment, setSegment] = useState<CommunitySegment>('blood');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-6">
      <div className="px-4 pt-4 pb-2">
        <h2 className={screenHeadingClass(isDark)}>{t('tab.community', lang)}</h2>
        <p className={`mt-0.5 ${screenSubtitleClass()}`}>{t('community.subtitle', lang)}</p>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{t('community.citizenHint', lang)}</p>
      </div>

      <div className="px-4 pb-3">
        <div className={`${segmentBarClass(isDark)} gap-0.5`}>
          {(['blood', 'lost', 'items'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSegment(key)}
              className={segmentBtnClass(segment === key, isDark)}
            >
              {t(`community.segment.${key}`, lang)}
            </button>
          ))}
        </div>
      </div>

      <SocialAds
        municipality={municipality}
        lang={lang}
        isDark={isDark}
        embedded
        forcedTab={segment}
        hideSegmentBar
      />
    </motion.div>
  );
}
