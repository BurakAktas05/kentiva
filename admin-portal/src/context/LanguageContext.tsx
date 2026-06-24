import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'tr' | 'en' | 'ar';

export const translations = {
  tr: {
    dashboard: "Dashboard",
    reports: "Raporlar",
    stats: "İstatistikler",
    announcements: "Duyurular",
    surveys: "Anketler",
    events_outages: "Etkinlikler & Kesintiler",
    staff: "Personeller",
    departments: "Departmanlar",
    municipality_settings: "Belediye Ayarları",
    scheduled_exports: "Planlı Dışa Aktarma",
    audit_logs: "Denetim Raporu",
    onboarding: "Kurulum Sihirbazı",
    municipalities: "Belediyeler",
    feedback: "Geri Bildirimler",
    logout: "Çıkış Yap",
    welcome: "Hoş geldiniz",
    overview: "Özet",
    live_map: "Canlı Harita",
    recent_reports: "Son Raporlar",
    all_reports: "Tümünü Gör",
    total_reports: "Toplam Rapor",
    pending: "Bekleyen",
    processing: "İşleniyor",
    resolved: "Çözülen",
    rejected: "Reddedilen",
    out_of_jurisdiction: "Yetki Alanı Dışı",
    language: "Dil",
    platform_management: "Platform Yönetimi",
    overview_group: "Genel Bakış",
    tracking_group: "İhbar & Takip",
    pr_group: "Halkla İlişkiler",
    org_group: "Organizasyon",
    system_group: "Sistem & Yapılandırma",
    loading: "Yükleniyor...",
    bus_routes: "Ulaşım Hatları",
    rewards: "Ödüller",
  },
  en: {
    dashboard: "Dashboard",
    reports: "Reports",
    stats: "Statistics",
    announcements: "Announcements",
    surveys: "Surveys",
    events_outages: "Events & Outages",
    staff: "Staff",
    departments: "Departments",
    municipality_settings: "Municipality Settings",
    scheduled_exports: "Scheduled Exports",
    audit_logs: "Audit Logs",
    onboarding: "Onboarding Wizard",
    municipalities: "Municipalities",
    feedback: "System Feedback",
    logout: "Logout",
    welcome: "Welcome",
    overview: "Overview",
    live_map: "Live Map",
    recent_reports: "Recent Reports",
    all_reports: "View All",
    total_reports: "Total Reports",
    pending: "Pending",
    processing: "Processing",
    resolved: "Resolved",
    rejected: "Rejected",
    out_of_jurisdiction: "Out of Jurisdiction",
    language: "Language",
    platform_management: "Platform Management",
    overview_group: "Overview",
    tracking_group: "Reports & Tracking",
    pr_group: "Public Relations",
    org_group: "Organization",
    system_group: "System & Config",
    loading: "Loading...",
    bus_routes: "Bus Routes",
    rewards: "Rewards",
  },
  ar: {
    dashboard: "لوحة القيادة",
    reports: "التقارير",
    stats: "الإحصائيات",
    announcements: "الإعلانات",
    surveys: "الاستبيانات",
    events_outages: "الفعاليات والانقطاعات",
    staff: "الموظفين",
    departments: "الأقسام",
    municipality_settings: "إعدادات البلدية",
    scheduled_exports: "التصدير المجدول",
    audit_logs: "سجل التدقيق",
    onboarding: "معالج الإعداد",
    municipalities: "البلديات",
    feedback: "ملاحظات النظام",
    logout: "تسجيل الخروج",
    welcome: "مرحباً بكم",
    overview: "ملخص",
    live_map: "الخريطة المباشرة",
    recent_reports: "أحدث البلاغات",
    all_reports: "عرض الكل",
    total_reports: "إجمالي التقارير",
    pending: "قيد الانتظار",
    processing: "قيد المعالجة",
    resolved: "تم الحل",
    rejected: "مرفوض",
    out_of_jurisdiction: "خارج نطاق الصلاحية",
    language: "اللغة",
    platform_management: "إدارة المنصة",
    overview_group: "نظرة عامة",
    tracking_group: "البلاغات والمتابعة",
    pr_group: "العلاقات العامة",
    org_group: "المؤسسة",
    system_group: "النظام والتكوين",
    loading: "تحميل...",
    bus_routes: "خطوط النقل",
    rewards: "الجوائز",
  }
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['tr']) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('kentiva_language') as Language) || 'tr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kentiva_language', lang);
    // RTL (Right-to-Left) support for Arabic:
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    // Apply RTL on initial load if needed
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key: keyof typeof translations['tr']): string => {
    return translations[language][key] || translations['tr'][key] || String(key);
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
