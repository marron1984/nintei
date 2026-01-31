/**
 * 多言語対応フック
 */

import { useCallback, useEffect, useState } from 'react';
import {
  createAsyncTranslator,
  type SupportedLocale,
  type TranslationFunction,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  getBrowserLocale,
} from '@nintei/i18n';

export function useTranslation(initialLocale?: SupportedLocale) {
  const [locale, setLocale] = useState<SupportedLocale>(initialLocale ?? DEFAULT_LOCALE);
  const [t, setT] = useState<TranslationFunction>(() => (key: string) => key);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadTranslations = async () => {
      setIsLoading(true);
      const translator = await createAsyncTranslator(locale);
      if (mounted) {
        setT(() => translator);
        setIsLoading(false);
      }
    };

    loadTranslations();

    return () => {
      mounted = false;
    };
  }, [locale]);

  const changeLocale = useCallback((newLocale: SupportedLocale) => {
    setLocale(newLocale);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }
  }, []);

  return {
    t,
    locale,
    setLocale: changeLocale,
    isLoading,
    supportedLocales: SUPPORTED_LOCALES,
    localeNames: LOCALE_NAMES,
  };
}

export function useInitialLocale(): SupportedLocale {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Check localStorage first
    const stored = localStorage.getItem('locale');
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      setLocale(stored as SupportedLocale);
      return;
    }

    // Fall back to browser locale
    setLocale(getBrowserLocale());
  }, []);

  return locale;
}
