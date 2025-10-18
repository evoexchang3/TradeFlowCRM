import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationKeys, loadTranslations } from '@/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<TranslationKeys>({});
  const [fallbackTranslations, setFallbackTranslations] = useState<TranslationKeys>({});

  const isRTL = language === 'ar';

  useEffect(() => {
    const loadLanguageTranslations = async () => {
      try {
        const langTranslations = await loadTranslations(language);
        setTranslations(langTranslations);
        
        if (language !== 'en') {
          const englishTranslations = await loadTranslations('en');
          setFallbackTranslations(englishTranslations);
        } else {
          setFallbackTranslations({});
        }
      } catch (error) {
        console.error('Failed to load translations:', error);
        const englishTranslations = await loadTranslations('en');
        setTranslations(englishTranslations);
      }
    };
    
    loadLanguageTranslations();
  }, [language]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['en', 'es', 'de', 'fr', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'tr', 'pl', 'nl', 'hi', 'sv'].includes(savedLanguage)) {
      setLanguageState(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[key] || fallbackTranslations[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(
          new RegExp(`{{${paramKey}}}`, 'g'), 
          String(paramValue)
        );
      });
    }
    
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
