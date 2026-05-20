import { useEffect, useRef } from 'react';

type Options = {
  enabled?: boolean;
  /** Sağ kenardan başlayan kaydırma (parmak sola) */
  edgeWidthPx?: number;
  thresholdPx?: number;
  onBack: () => void;
};

/**
 * Mobil geri jesti: ekranın sağ kenarından sola kaydırınca onBack çağrılır.
 */
export function useEdgeSwipeBack({
  enabled = true,
  edgeWidthPx = 28,
  thresholdPx = 72,
  onBack,
}: Options) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const fromRight = window.innerWidth - t.clientX <= edgeWidthPx;
      if (!fromRight) {
        startX.current = null;
        return;
      }
      startX.current = t.clientX;
      startY.current = t.clientY;
      fired.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startX.current == null || startY.current == null || fired.current) return;
      const t = e.touches[0];
      const dx = startX.current - t.clientX;
      const dy = Math.abs(t.clientY - startY.current);
      if (dx > thresholdPx && dy < 48) {
        fired.current = true;
        onBack();
      }
    };

    const onTouchEnd = () => {
      startX.current = null;
      startY.current = null;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, edgeWidthPx, thresholdPx, onBack]);
}
