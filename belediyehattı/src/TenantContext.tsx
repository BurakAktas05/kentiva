import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicTenant } from './api';

const STORAGE_KEY = 'kentiva_tenant_v1';

type TenantContextValue = {
  tenant: PublicTenant | null;
  setTenant: (t: PublicTenant | null) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenantState] = useState<PublicTenant | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PublicTenant) : null;
    } catch {
      return null;
    }
  });

  const setTenant = (t: PublicTenant | null) => {
    setTenantState(t);
    if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (tenant?.primaryColor) root.style.setProperty('--color-primary', tenant.primaryColor);
    else root.style.removeProperty('--color-primary');
    if (tenant?.secondaryColor) root.style.setProperty('--color-secondary', tenant.secondaryColor);
    else root.style.removeProperty('--color-secondary');
    if (tenant?.accentColor) root.style.setProperty('--color-accent', tenant.accentColor);
    else root.style.removeProperty('--color-accent');
  }, [tenant]);

  const value = useMemo(() => ({ tenant, setTenant }), [tenant]);
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
