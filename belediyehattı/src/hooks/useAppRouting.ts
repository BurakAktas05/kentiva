import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPublicDepartmentContext, fetchPublicMunicipalityBySlug, PublicTenant, PublicDepartment, ApiAnnouncement } from '../api';
import { inferMunicipalitySlugFromHostname, municipalityAppUrl } from '../lib/tenantHost';
import { toPublicTenant } from '../lib/tenantUtils';
import { registerNativeBackHandler } from '../lib/nativeShell';
import { useEdgeSwipeBack } from '../lib/useEdgeSwipeBack';
import { Capacitor } from '@capacitor/core';

export type Tab =
  | 'home'
  | 'kent'
  | 'topluluk'
  | 'report'
  | 'reports'
  | 'profile'
  | 'notifications'
  | 'settings'
  | 'rewards'
  | 'ranks';

/** Bottom nav: Ana · Bildir · İhbarlarım · Belediye */
export const MAIN_TABS: Tab[] = ['home', 'report', 'reports', 'kent'];

export type PublicRouteContext = {
  municipalitySlug: string;
  departmentSlug?: string;
};

export function parsePublicRoute(pathname: string, hostname: string): PublicRouteContext | null {
  const parts = pathname.split('/').filter(Boolean);
  const hostMunicipalitySlug = inferMunicipalitySlugFromHostname(hostname);

  if (hostMunicipalitySlug) {
    if (parts[0] === 'departments' && parts[1]) {
      return {
        municipalitySlug: hostMunicipalitySlug,
        departmentSlug: decodeURIComponent(parts[1]),
      };
    }
    return { municipalitySlug: hostMunicipalitySlug };
  }

  if (parts[0] !== 'belediye' || !parts[1]) {
    return null;
  }
  if (parts[2] === 'departments' && parts[3]) {
    return {
      municipalitySlug: decodeURIComponent(parts[1]),
      departmentSlug: decodeURIComponent(parts[3]),
    };
  }
  return { municipalitySlug: decodeURIComponent(parts[1]) };
}

interface UseAppRoutingProps {
  user: any;
  tenant: PublicTenant | null;
  setTenant: (tenant: PublicTenant | null) => void;
  department: PublicDepartment | null;
  setDepartment: (dept: PublicDepartment | null) => void;
  pickerMode: any;
  setPickerMode: any;
  isIntroModalOpen: boolean;
  setIsIntroModalOpen: (val: boolean) => void;
  isPrefsModalOpen: boolean;
  setIsPrefsModalOpen: (val: boolean) => void;
  explicitRoute: PublicRouteContext | null;
  routeBooting: boolean;
  setRouteBooting: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useAppRouting({
  user,
  tenant,
  setTenant,
  department,
  setDepartment,
  pickerMode,
  setPickerMode,
  isIntroModalOpen,
  setIsIntroModalOpen,
  isPrefsModalOpen,
  setIsPrefsModalOpen,
  explicitRoute,
  routeBooting,
  setRouteBooting,
}: UseAppRoutingProps) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [navStack, setNavStack] = useState<Tab[]>([]);
  const navStackRef = useRef(navStack);
  navStackRef.current = navStack;

  const [openReportId, setOpenReportId] = useState<string | null>(null);
  const [openAnnouncement, setOpenAnnouncement] = useState<ApiAnnouncement | null>(null);
  const [reportReturnTab, setReportReturnTab] = useState<Tab>('home');
  const [rewardsReturnTab, setRewardsReturnTab] = useState<Tab>('profile');

  // Dynamic route booting
  useEffect(() => {
    if (!explicitRoute) {
      setRouteBooting(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (explicitRoute.departmentSlug) {
          const resolvedDepartment = await fetchPublicDepartmentContext(
            explicitRoute.municipalitySlug,
            explicitRoute.departmentSlug,
          );
          const resolvedTenant = await fetchPublicMunicipalityBySlug(explicitRoute.municipalitySlug);
          if (!cancelled) {
            setTenant(toPublicTenant(resolvedTenant));
            setDepartment(resolvedDepartment);
            setPickerMode(null);
          }
          return;
        }

        const resolvedTenant = await fetchPublicMunicipalityBySlug(explicitRoute.municipalitySlug);
        if (!cancelled) {
          setTenant(toPublicTenant(resolvedTenant));
          setDepartment(null);
          setPickerMode(null);
        }
      } catch {
        if (!cancelled) {
          setDepartment(null);
        }
      } finally {
        if (!cancelled) {
          setRouteBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [explicitRoute, setDepartment, setTenant, setPickerMode, setRouteBooting]);

  // Sync browser path history
  useEffect(() => {
    if (routeBooting) return;

    const currentHostSlug = inferMunicipalitySlugFromHostname(window.location.hostname);

    if (tenant?.slug && currentHostSlug === tenant.slug) {
      const nextHostPath = department?.slug ? `/departments/${department.slug}` : '/';
      if (window.location.pathname !== nextHostPath) {
        window.history.replaceState({}, '', nextHostPath);
      }
      return;
    }

    if (!Capacitor.isNativePlatform() && tenant?.slug) {
      const nextSubdomainUrl = municipalityAppUrl(
        tenant.slug,
        department?.slug ? `/departments/${department.slug}` : '/',
      );
      if (nextSubdomainUrl && window.location.pathname.startsWith('/belediye/')) {
        window.location.replace(nextSubdomainUrl);
        return;
      }
    }

    const nextPath = tenant?.slug
      ? department?.slug
        ? `/belediye/${tenant.slug}/departments/${department.slug}`
        : `/belediye/${tenant.slug}`
      : '/';

    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, '', nextPath);
    }
  }, [department?.slug, routeBooting, tenant?.slug]);

  const openReport = useCallback((id: string) => {
    setReportReturnTab(activeTab);
    setOpenReportId(id);
  }, [activeTab]);

  const closeReport = useCallback(() => {
    setOpenReportId(null);
    setActiveTab(reportReturnTab);
  }, [reportReturnTab]);

  const goToTab = useCallback((tab: Tab) => {
    setActiveTab((current) => {
      if (current === tab) return current;
      const bothMain = MAIN_TABS.includes(current) && MAIN_TABS.includes(tab);
      if (bothMain) {
        setNavStack((stack) => [...stack, current].slice(-8));
      }
      return tab;
    });
  }, []);

  const popNavigation = useCallback((): boolean => {
    if (isIntroModalOpen) {
      setIsIntroModalOpen(false);
      return true;
    }
    if (isPrefsModalOpen) {
      setIsPrefsModalOpen(false);
      return true;
    }
    if (pickerMode === 'change') {
      setPickerMode(null);
      return true;
    }
    if (openAnnouncement) {
      setOpenAnnouncement(null);
      return true;
    }
    if (openReportId) {
      closeReport();
      return true;
    }
    if (activeTab === 'settings') {
      setActiveTab('profile');
      return true;
    }
    if (activeTab === 'ranks' || activeTab === 'rewards') {
      setActiveTab('kent');
      return true;
    }
    if (activeTab === 'kent' || activeTab === 'topluluk') {
      setActiveTab('home');
      return true;
    }
    if (activeTab === 'report' || activeTab === 'notifications' || activeTab === 'reports') {
      setNavStack([]);
      setActiveTab('home');
      return true;
    }
    const stack = navStackRef.current;
    if (stack.length > 0) {
      const prev = stack[stack.length - 1];
      setNavStack((s) => s.slice(0, -1));
      setActiveTab(prev);
      return true;
    }
    if (activeTab !== 'home' && MAIN_TABS.includes(activeTab)) {
      setActiveTab('home');
      return true;
    }
    return false;
  }, [activeTab, openReportId, openAnnouncement, closeReport, pickerMode, isPrefsModalOpen, setIsIntroModalOpen, setIsPrefsModalOpen, setPickerMode]);

  useEffect(() => registerNativeBackHandler(popNavigation), [popNavigation]);

  useEdgeSwipeBack({
    enabled:
      Boolean(user) &&
      !pickerMode &&
      !openAnnouncement &&
      !openReportId &&
      activeTab !== 'report' &&
      activeTab !== 'settings' &&
      activeTab !== 'ranks',
    onBack: popNavigation,
  });

  return {
    activeTab,
    setActiveTab,
    navStack,
    setNavStack,
    openReportId,
    setOpenReportId,
    openAnnouncement,
    setOpenAnnouncement,
    reportReturnTab,
    setReportReturnTab,
    rewardsReturnTab,
    setRewardsReturnTab,
    openReport,
    closeReport,
    goToTab,
    popNavigation,
  };
}
