import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'tr' | 'en';

const DEFAULT_LANGUAGE: Language = 'tr';
const SUPPORTED_LANGUAGES: readonly Language[] = ['tr', 'en'];

export const translations = {
  tr: {
    dashboard: 'Dashboard',
    pilot_success: 'Pilot Başarı',
    reports: 'Raporlar',
    white_desk_entry: 'Beyaz Masa İhbarı',
    stats: 'İstatistikler',
    announcements: 'Duyurular',
    surveys: 'Anketler',
    events_outages: 'Etkinlikler & Kesintiler',
    staff: 'Personeller',
    departments: 'Departmanlar',
    municipality_settings: 'Belediye Ayarları',
    scheduled_exports: 'Planlı Dışa Aktarma',
    audit_logs: 'Denetim Raporu',
    onboarding: 'Kurulum Sihirbazı',
    municipalities: 'Belediyeler',
    feedback: 'Geri Bildirimler',
    logout: 'Çıkış Yap',
    welcome: 'Hoş geldiniz',
    overview: 'Özet',
    live_map: 'Canlı Harita',
    recent_reports: 'Son Raporlar',
    all_reports: 'Tümünü Gör',
    total_reports: 'Toplam Rapor',
    pending: 'Bekleyen',
    processing: 'İşleniyor',
    resolved: 'Çözülen',
    rejected: 'Reddedilen',
    out_of_jurisdiction: 'Yetki Alanı Dışı',
    language: 'Dil',
    platform_management: 'Platform Yönetimi',
    overview_group: 'Genel Bakış',
    tracking_group: 'İhbar & Takip',
    pr_group: 'Halkla İlişkiler',
    org_group: 'Organizasyon',
    system_group: 'Sistem & Yapılandırma',
    loading: 'Yükleniyor...',
    rewards: 'Ödüller',
    marketing_kit: 'Pazarlama Paketi',
    pricing: 'Planlar & Fiyatlandırma',
    executive_dashboard: 'Başkan Özeti',
    api_tracker: 'API Takibi',
  },
  en: {
    dashboard: 'Dashboard',
    pilot_success: 'Pilot Success',
    reports: 'Reports',
    white_desk_entry: 'White Desk Entry',
    stats: 'Statistics',
    announcements: 'Announcements',
    surveys: 'Surveys',
    events_outages: 'Events & Outages',
    staff: 'Staff',
    departments: 'Departments',
    municipality_settings: 'Municipality Settings',
    scheduled_exports: 'Scheduled Exports',
    audit_logs: 'Audit Logs',
    onboarding: 'Onboarding Wizard',
    municipalities: 'Municipalities',
    feedback: 'System Feedback',
    logout: 'Logout',
    welcome: 'Welcome',
    overview: 'Overview',
    live_map: 'Live Map',
    recent_reports: 'Recent Reports',
    all_reports: 'View All',
    total_reports: 'Total Reports',
    pending: 'Pending',
    processing: 'Processing',
    resolved: 'Resolved',
    rejected: 'Rejected',
    out_of_jurisdiction: 'Out of Jurisdiction',
    language: 'Language',
    platform_management: 'Platform Management',
    overview_group: 'Overview',
    tracking_group: 'Reports & Tracking',
    pr_group: 'Public Relations',
    org_group: 'Organization',
    system_group: 'System & Config',
    loading: 'Loading...',
    rewards: 'Rewards',
    marketing_kit: 'Marketing Kit',
    pricing: 'Plans & Pricing',
    executive_dashboard: 'Executive Summary',
    api_tracker: 'API Tracker',
  },
} satisfies Record<Language, Record<string, string>>;

type TranslationKey = keyof typeof translations.tr;

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function normalizeLanguage(value: string | null): Language {
  return SUPPORTED_LANGUAGES.includes(value as Language) ? (value as Language) : DEFAULT_LANGUAGE;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => normalizeLanguage(localStorage.getItem('kentiva_language')));

  const setLanguage = (lang: Language) => {
    const nextLanguage = normalizeLanguage(lang);
    setLanguageState(nextLanguage);
    localStorage.setItem('kentiva_language', nextLanguage);
  };

  useEffect(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = language;
    if (localStorage.getItem('kentiva_language') !== language) {
      localStorage.setItem('kentiva_language', language);
    }
  }, [language]);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations[DEFAULT_LANGUAGE][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
