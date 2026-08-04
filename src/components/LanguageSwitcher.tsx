import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Normalise i18n.language — it can be "en", "en-US", or "es-ES".
  // Match against the first segment so we always land on a known language.
  const activeCode = (i18n.language || 'en').split('-')[0];
  const currentLanguage = languages.find(lang => lang.code === activeCode) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // Defensive explicit persistence. i18next-browser-languagedetector writes
    // to localStorage under `i18nextLng`, but writing it ourselves here means
    // a future config change can't silently break reload-preservation.
    try {
      window.localStorage.setItem('i18nextLng', langCode);
    } catch {
      /* storage may be disabled; safe to ignore */
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" data-testid="language-switcher">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Select Language"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-language={currentLanguage.code}
      >
        <Globe className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline-block">{currentLanguage.name}</span>
        <span className="sm:hidden" aria-hidden="true">{currentLanguage.flag}</span>
        <span className="sr-only">Language: {currentLanguage.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div
            role="listbox"
            aria-label="Available languages"
            className="absolute right-0 top-full mt-2 w-64 bg-popover border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <div className="p-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={currentLanguage.code === lang.code}
                  data-language-option={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors ${
                    currentLanguage.code === lang.code
                      ? 'bg-accent text-accent-foreground'
                      : ''
                  }`}
                >
                  <span className="text-base" aria-hidden="true">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.name}</span>
                  {currentLanguage.code === lang.code && (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Footer */}
            <div className="px-3 py-2 bg-muted/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-muted-foreground text-center">
                🌐 SaaS Platform Translations
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};