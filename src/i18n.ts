import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importing translation files
import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';
import sharedTranslationEN from './locales/shared/en.json';
import sharedTranslationES from './locales/shared/es.json';

const resources = {
  en: {
    translation: translationEN,
    shared: sharedTranslationEN
  },
  es: {
    translation: translationES,
    shared: sharedTranslationES
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false, // Disable debug to reduce console noise
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    ns: ['translation', 'shared'],
    defaultNS: 'translation',
    react: {
      useSuspense: false // Disable suspense to prevent loading issues
    }
  })
  .catch((error) => {
    console.error('i18n initialization error:', error);
  });

export default i18n;