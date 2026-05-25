import React, { createContext, useContext, useState } from 'react';
import { translations } from './translations';
import type { Language } from './translations';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const cached = localStorage.getItem('app_language');
    return (cached as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  // Dotted-notation lookup function with fallback to English
  const t = (path: string): string => {
    const keys = path.split('.');
    let translation: any = translations[language];
    let fallback: any = translations['en'];

    for (const key of keys) {
      if (translation && translation[key] !== undefined) {
        translation = translation[key];
      } else {
        translation = null;
      }

      if (fallback && fallback[key] !== undefined) {
        fallback = fallback[key];
      } else {
        fallback = null;
      }
    }

    return typeof translation === 'string' ? translation : (typeof fallback === 'string' ? fallback : path);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
