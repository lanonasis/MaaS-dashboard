import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importing translation files
import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';
import sharedTranslationEN from '../../../packages/shared-i18n/locales/en.json';
import sharedTranslationES from '../../../packages/shared-i18n/locales/es.json';

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
    debug: true,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    ns: ['translation', 'shared'],
    defaultNS: 'translation'
  });

export default i18n;