import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth as firebaseAuth } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import arKeys from './translations/ar.json';
import enKeys from './translations/en.json';

export type Language = 'ar' | 'en';
export type TranslationKey = keyof typeof arKeys;

const translations: Record<Language, Record<string, string>> = {
  ar: arKeys as Record<string, string>,
  en: enKeys as Record<string, string>,
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | (string & {})) => string;
  isRtl: boolean;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key) => key,
  isRtl: true,
  loading: false,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('schoolixiq_lang') as Language) || 'ar';
  });

  const loading = false;

  // Synchronize document direction and lang attributes
  useEffect(() => {
    localStorage.setItem('schoolixiq_lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = async (newLang: Language) => {
    if (newLang === language) return;
    setLanguageState(newLang);
    localStorage.setItem('schoolixiq_lang', newLang);

    // Save choice to Firestore profile document if authorized
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { language: newLang });
      } catch (error) {
        console.warn('Failed to persist user language preference in Firestore:', error);
      }
    }
  };

  const t = (key: TranslationKey | (string & {})): string => {
    // Current translations -> Fallback (English / LTR) -> Safe Raw Key
    return translations[language][key] || translations['en'][key] || key;
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
