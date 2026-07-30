import { useCallback, useEffect, useRef, useState } from 'react';

export type PollingState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
};

/**
 * SWR-benzeri: ilk yükleme + arka planda periyodik yenileme.
 */
export function usePollingFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  enabled = true,
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mounted = useRef(true);
  const inFlightController = useRef<AbortController | null>(null);

  const run = useCallback(
    async (isInitial: boolean) => {
      if (!enabled) return;
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      inFlightController.current?.abort();
      const controller = new AbortController();
      inFlightController.current = controller;
      try {
        const result = await fetcher(controller.signal);
        if (!mounted.current) return;
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      } catch (e) {
        if (!mounted.current || controller.signal.aborted) return;
        const msg = e instanceof Error ? e.message : 'Veri yüklenemedi';
        setError(msg);
      } finally {
        if (inFlightController.current === controller) {
          inFlightController.current = null;
        }
        if (!mounted.current) return;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, fetcher],
  );

  const refresh = useCallback(() => {
    void run(false);
  }, [run]);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) {
      setLoading(false);
      return () => {
        mounted.current = false;
      };
    }

    void run(true);
    const id = window.setInterval(() => void run(false), intervalMs);
    return () => {
      mounted.current = false;
      inFlightController.current?.abort();
      window.clearInterval(id);
    };
  }, [enabled, intervalMs, run]);

  return { data, error, loading, refreshing, lastUpdated, refresh };
}
