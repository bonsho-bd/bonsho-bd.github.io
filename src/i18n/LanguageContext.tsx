import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, TranslationSchema } from './types';
import { bnTranslations, toBengaliNumeral } from './bn';
import { enTranslations } from './en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationSchema;
  formatNumber: (num: number | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getInitialLanguage(): Language {
  // 1. Check URL query params (?lang=en or ?lang=bn)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'en' || urlLang === 'bn') {
      return urlLang;
    }

    // 2. Check localStorage
    const saved = localStorage.getItem('bonsho_lang');
    if (saved === 'en' || saved === 'bn') {
      return saved;
    }
  }

  // 3. Default to Bangla
  return 'bn';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const t = useMemo(() => {
    return language === 'en' ? enTranslations : bnTranslations;
  }, [language]);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('bonsho_lang', newLang);
      const url = new URL(window.location.href);
      if (newLang === 'bn') {
        url.searchParams.delete('lang'); // clean URL for default
      } else {
        url.searchParams.set('lang', newLang);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Storage access or URL update safety
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'bn' ? 'en' : 'bn');
  };

  const formatNumber = (num: number | string): string => {
    if (language === 'bn') {
      return toBengaliNumeral(num);
    }
    return String(num);
  };

  // Sync html lang attribute and document title
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.title = t.app.documentTitle;
    }
  }, [language, t]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      formatNumber,
    }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
