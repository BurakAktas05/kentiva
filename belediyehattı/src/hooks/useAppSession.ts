import { useState, useEffect, useCallback } from 'react';
import { getSavedUser, clearTokens, getMyProfile, setPreferredMunicipality, resolveMunicipalityByGps, AuthUser, PublicTenant } from '../api';
import { getDevicePosition } from '../lib/deviceLocation';
import { toPublicTenant } from '../lib/tenantUtils';
import { municipalityAppUrl, inferMunicipalitySlugFromHostname } from '../lib/tenantHost';
import { Capacitor } from '@capacitor/core';
import { storageService } from '../lib/storageService';
import type { AuthMeta } from '../lib/authTypes';
import type { MunicipalityPickerMode } from '../components/screens/MunicipalityPicker';

interface UseAppSessionProps {
  tenant: PublicTenant | null;
  setTenant: (tenant: PublicTenant | null) => void;
  setDepartment: (dept: any) => void;
  routeBooting: boolean;
  explicitRoute: any;
  setKey: React.Dispatch<React.SetStateAction<number>>;
}

export function useAppSession({
  tenant,
  setTenant,
  setDepartment,
  routeBooting,
  explicitRoute,
  setKey,
}: UseAppSessionProps) {
  const [user, setUser] = useState<AuthUser | null>(getSavedUser());
  const [sessionBooting, setSessionBooting] = useState(() => Boolean(getSavedUser()));
  const [pickerMode, setPickerMode] = useState<MunicipalityPickerMode | null>(null);
  const [isIntroModalOpen, setIsIntroModalOpen] = useState(false);
  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);
  const [pendingLocationTenant, setPendingLocationTenant] = useState<PublicTenant | null>(null);

  const handleMunicipalitySelect = useCallback(
    async (t: PublicTenant | null) => {
      if (!t) return;
      setTenant(t);
      setDepartment(null);
      setPickerMode(null);
      setKey((k) => k + 1);
      const targetUrl = t.slug ? municipalityAppUrl(t.slug, '/') : null;
      const currentHostSlug = inferMunicipalitySlugFromHostname(window.location.hostname);
      if (!Capacitor.isNativePlatform() && targetUrl && currentHostSlug !== t.slug) {
        window.location.replace(targetUrl);
        return;
      }
      try {
        await setPreferredMunicipality(t.id);
      } catch {
        /* offline — yerel seçim yeterli */
      }
    },
    [setDepartment, setTenant, setKey],
  );

  // Initial user onboarding & preferred municipality fetching
  useEffect(() => {
    if (!user) {
      setSessionBooting(false);
      return;
    }
    if (explicitRoute && routeBooting) {
      return;
    }
    if (explicitRoute && tenant?.id) {
      setSessionBooting(false);
      return;
    }
    let cancelled = false;
    setSessionBooting(true);
    (async () => {
      try {
        const p = await getMyProfile();
        const pref = p.preferredMunicipality;
        if (pref?.id) {
          if (!cancelled) {
            setTenant(toPublicTenant(pref as any));
            setPickerMode(null);
          }
          return;
        }
        if (tenant?.id) {
          try {
            await setPreferredMunicipality(tenant.id);
          } catch {
            /* ignore */
          }
          return;
        }
        if (!cancelled) {
          if (!tenant?.id) {
            setTenant(null);
            setPickerMode('onboarding');
          }
        }
      } catch {
        if (!cancelled) {
          if (!tenant?.id) setPickerMode('onboarding');
        }
      } finally {
        if (!cancelled) setSessionBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [explicitRoute, routeBooting, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Welcome introduction modal triggers
  useEffect(() => {
    if (user && storageService.getItem('belediye_welcome_onboarded') !== 'true') {
      setIsIntroModalOpen(true);
    }
  }, [user]);

  // Push notification prefs modal triggers
  useEffect(() => {
    if (
      user &&
      storageService.getItem('belediye_welcome_onboarded') === 'true' &&
      storageService.getItem('belediye_notification_prefs_onboarded') !== 'true' &&
      !isIntroModalOpen
    ) {
      const timer = setTimeout(() => {
        setIsPrefsModalOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, isIntroModalOpen]);

  // Geolocation-based prompt to automatically switch municipality boundaries
  useEffect(() => {
    if (!user || sessionBooting || routeBooting) return;
    
    let active = true;
    const checkLocationAndSetTenant = async () => {
      if (storageService.getItem('belediye_location_auto_prompt') === 'false') {
        return;
      }
      try {
        const result = await getDevicePosition({ highAccuracy: false, timeoutMs: 10000 });
        if (result.ok && active) {
          const resolved = await resolveMunicipalityByGps(result.coords.lat, result.coords.lng);
          if (resolved && resolved.onboarded) {
            if (!tenant || tenant.id !== resolved.id) {
              console.log(`[Kentiva] Konuma göre yeni belediye tespit edildi: ${resolved.displayName}`);
              setPendingLocationTenant(resolved);
            }
          } else {
            console.log("[Kentiva] Konum üye bir belediyeyle eşleşmedi veya üye değil. Mevcut belediyede kalınıyor.");
          }
        }
      } catch (err) {
        console.warn("[Kentiva] Konum tabanlı belediye çözümlenemedi:", err);
      }
    };
    
    const timer = setTimeout(() => {
      void checkLocationAndSetTenant();
    }, 1500);
    
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [user, sessionBooting, routeBooting, tenant]);

  const handleAuth = (authUser: AuthUser, meta?: AuthMeta) => {
    setUser(authUser);
    if (meta?.isNewUser) {
      setTenant(null);
      setPickerMode('onboarding');
    }
  };

  const handleLogout = () => {
    clearTokens();
    setUser(null);
    setTenant(null);
    setDepartment(null);
    setPickerMode(null);
  };

  return {
    user,
    setUser,
    sessionBooting,
    pickerMode,
    setPickerMode,
    isIntroModalOpen,
    setIsIntroModalOpen,
    isPrefsModalOpen,
    setIsPrefsModalOpen,
    pendingLocationTenant,
    setPendingLocationTenant,
    handleAuth,
    handleLogout,
    handleMunicipalitySelect,
  };
}
