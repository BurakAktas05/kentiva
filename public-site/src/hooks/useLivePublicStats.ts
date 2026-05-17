import { useCallback, useMemo } from 'react';
import {
  fetchPublicCategoryStats,
  fetchPublicMonthlyStats,
  fetchPublicMunicipalityStats,
  fetchPublicStatsOverview,
  type PublicCategoryStat,
  type PublicMonthlyStat,
  type PublicMunicipalityStat,
  type PublicStatsOverview,
} from '../lib/api';
import { usePollingFetch } from './usePollingFetch';

const POLL_MS = 45_000;

export type LivePublicStats = {
  overview: PublicStatsOverview | null;
  municipalities: PublicMunicipalityStat[];
  categories: PublicCategoryStat[];
  monthly: PublicMonthlyStat[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
};

async function fetchAllStats(signal: AbortSignal) {
  const [overview, municipalities, categories, monthly] = await Promise.all([
    fetchPublicStatsOverview(signal),
    fetchPublicMunicipalityStats(signal),
    fetchPublicCategoryStats(signal),
    fetchPublicMonthlyStats(signal),
  ]);
  return { overview, municipalities, categories, monthly };
}

export function useLivePublicStats(enabled = true): LivePublicStats {
  const fetcher = useCallback((signal: AbortSignal) => fetchAllStats(signal), []);
  const { data, error, loading, refreshing, lastUpdated, refresh } = usePollingFetch(
    fetcher,
    POLL_MS,
    enabled,
  );

  return useMemo(
    () => ({
      overview: data?.overview ?? null,
      municipalities: data?.municipalities ?? [],
      categories: data?.categories ?? [],
      monthly: data?.monthly ?? [],
      loading,
      refreshing,
      error,
      lastUpdated,
      refresh,
    }),
    [data, error, loading, refreshing, lastUpdated, refresh],
  );
}
