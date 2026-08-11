import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importing translation files. Locales other than en/es currently fall
// back to the English strings — the LanguageSwitcher offers 11 languages,
// so we register each one so the dropdown actually re-renders header text
// instead of silently leaving the UI on English. Once proper translations
// are authored per locale, replace the fallback JSON with the translated
// file; the resource map already routes to the right language.
import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';
import translationFR from './locales/fr/translation.json';
import translationDE from './locales/de/translation.json';
import translationJA from './locales/ja/translation.json';
import translationZH from './locales/zh/translation.json';
import translationPT from './locales/pt/translation.json';
import translationAR from './locales/ar/translation.json';
import translationKO from './locales/ko/translation.json';
import translationIT from './locales/it/translation.json';
import translationRU from './locales/ru/translation.json';

import sharedEN from './locales/shared/en.json';
import sharedES from './locales/shared/es.json';
import sharedFR from './locales/shared/fr.json';
import sharedDE from './locales/shared/de.json';
import sharedJA from './locales/shared/ja.json';
import sharedZH from './locales/shared/zh.json';
import sharedPT from './locales/shared/pt.json';
import sharedAR from './locales/shared/ar.json';
import sharedKO from './locales/shared/ko.json';
import sharedIT from './locales/shared/it.json';
import sharedRU from './locales/shared/ru.json';

const resources = {
  en: { translation: translationEN, shared: sharedEN },
  es: { translation: translationES, shared: sharedES },
  fr: { translation: translationFR, shared: sharedFR },
  de: { translation: translationDE, shared: sharedDE },
  ja: { translation: translationJA, shared: sharedJA },
  zh: { translation: translationZH, shared: sharedZH },
  pt: { translation: translationPT, shared: sharedPT },
  ar: { translation: translationAR, shared: sharedAR },
  ko: { translation: translationKO, shared: sharedKO },
  it: { translation: translationIT, shared: sharedIT },
  ru: { translation: translationRU, shared: sharedRU },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false, // Disable debug to reduce console noise
    // Persist user-selected locale across reloads. i18next-browser-languagedetector
    // defaults to localStorage with the key `i18nextLng`, but listing it explicitly
    // makes the contract visible to E2E tests and future readers.
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
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
