import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth as firebaseAuth } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import arKeys from './translations/ar.json';

export type Language = 'ar' | 'en';
export type TranslationKey = keyof typeof arKeys;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRtl: boolean;
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (key) => key,
  isRtl: true,
  loading: true,
});

// Cache loaded translations to prevent redundant lazy chunk loadings
const translationsCache: Record<Language, Record<string, string> | null> = {
  ar: null,
  en: null,
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('schoolixiq_lang') as Language) || 'ar';
  });

  const [currentTranslations, setCurrentTranslations] = useState<Record<string, string>>({});
  const [fallbackTranslations, setFallbackTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Lazy-load translation files
  useEffect(() => {
    let active = true;
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        // Load target language mapping
        let targetData = translationsCache[language];
        if (!targetData) {
          if (language === 'ar') {
            targetData = (await import('./translations/ar.json')).default;
          } else {
            targetData = (await import('./translations/en.json')).default;
          }
          translationsCache[language] = targetData as Record<string, string>;
        }

        // Load fallback language (English) if the active one isn't English, to provide dynamic fallbacks
        let englishData = translationsCache['en'];
        if (language !== 'en' && !englishData) {
          englishData = (await import('./translations/en.json')).default;
          translationsCache['en'] = englishData as Record<string, string>;
        }

        if (active) {
          setCurrentTranslations(targetData || {});
          if (englishData) {
            setFallbackTranslations(englishData);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load lazy translations:', err);
        if (active) setLoading(false);
      }
    };

    fetchTranslations();
    return () => {
      active = false;
    };
  }, [language]);

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

  const t = (key: TranslationKey): string => {
    // Current translations -> Fallback (English / LTR) -> Safe Raw Key
    return currentTranslations[key] || fallbackTranslations[key] || key;
  };

  const isRtl = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl, loading }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
