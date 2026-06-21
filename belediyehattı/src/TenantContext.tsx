import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicDepartment, PublicTenant } from './api';
import { storageService } from './lib/storageService';

const TENANT_STORAGE_KEY = 'kentiva_tenant_v1';
const DEPARTMENT_STORAGE_KEY = 'kentiva_department_v1';

type TenantContextValue = {
  tenant: PublicTenant | null;
  setTenant: (tenant: PublicTenant | null) => void;
  department: PublicDepartment | null;
  setDepartment: (department: PublicDepartment | null) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenantState] = useState<PublicTenant | null>(() => {
    try {
      const raw = storageService.getItem(TENANT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PublicTenant) : null;
    } catch {
      return null;
    }
  });
  const [department, setDepartmentState] = useState<PublicDepartment | null>(() => {
    try {
      const raw = storageService.getItem(DEPARTMENT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PublicDepartment) : null;
    } catch {
      return null;
    }
  });

  const setTenant = (nextTenant: PublicTenant | null) => {
    setTenantState(nextTenant);
    if (nextTenant) {
      storageService.setItem(TENANT_STORAGE_KEY, JSON.stringify(nextTenant));
    } else {
      storageService.removeItem(TENANT_STORAGE_KEY);
      setDepartmentState(null);
      storageService.removeItem(DEPARTMENT_STORAGE_KEY);
    }
  };

  const setDepartment = (nextDepartment: PublicDepartment | null) => {
    setDepartmentState(nextDepartment);
    if (nextDepartment) {
      storageService.setItem(DEPARTMENT_STORAGE_KEY, JSON.stringify(nextDepartment));
    } else {
      storageService.removeItem(DEPARTMENT_STORAGE_KEY);
    }
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

  useEffect(() => {
    if (!department || !tenant?.id) return;
    if (department.municipalityId !== tenant.id) {
      setDepartmentState(null);
      storageService.removeItem(DEPARTMENT_STORAGE_KEY);
    }
  }, [department, tenant?.id]);

  const value = useMemo(
    () => ({ tenant, setTenant, department, setDepartment }),
    [department, tenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
