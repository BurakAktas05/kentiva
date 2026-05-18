import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import type { Report } from '../api';
import { useMunicipalityReportFeed } from '../hooks/useMunicipalityReportFeed';
import { playReportAlertSound } from '../lib/playReportAlertSound';

type ReportLiveContextValue = {
  newCount: number;
  latestReport: Report | null;
  wsConnected: boolean;
  clearNewCount: () => void;
};

const ReportLiveContext = createContext<ReportLiveContextValue | null>(null);

export function ReportLiveProvider({
  municipalityId,
  children,
}: {
  municipalityId?: string;
  children: ReactNode;
}) {
  const location = useLocation();
  const [newCount, setNewCount] = useState(0);
  const [latestReport, setLatestReport] = useState<Report | null>(null);

  const onReport = useCallback((report: Report) => {
    playReportAlertSound();
    setLatestReport(report);
    setNewCount((c) => c + 1);
  }, []);

  const { connected } = useMunicipalityReportFeed(municipalityId, onReport);

  useEffect(() => {
    const onReports =
      location.pathname === '/reports' || location.pathname.startsWith('/reports/');
    if (onReports) {
      setNewCount(0);
    }
  }, [location.pathname]);

  const clearNewCount = useCallback(() => setNewCount(0), []);

  const value = useMemo(
    () => ({
      newCount,
      latestReport,
      wsConnected: connected,
      clearNewCount,
    }),
    [newCount, latestReport, connected, clearNewCount],
  );

  return <ReportLiveContext.Provider value={value}>{children}</ReportLiveContext.Provider>;
}

export function useReportLive(): ReportLiveContextValue {
  const ctx = useContext(ReportLiveContext);
  if (!ctx) {
    return {
      newCount: 0,
      latestReport: null,
      wsConnected: false,
      clearNewCount: () => {},
    };
  }
  return ctx;
}
