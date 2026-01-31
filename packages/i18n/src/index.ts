/**
 * 多言語対応（i18n）
 */

export type SupportedLocale = 'ja' | 'en' | 'vi' | 'zh' | 'id' | 'th' | 'my' | 'ne' | 'tl';

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  'ja', // 日本語
  'en', // English
  'vi', // Tiếng Việt
  'zh', // 中文
  'id', // Bahasa Indonesia
  'th', // ไทย
  'my', // မြန်မာ
  'ne', // नेपाली
  'tl', // Tagalog
];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  ja: '日本語',
  en: 'English',
  vi: 'Tiếng Việt',
  zh: '中文',
  id: 'Bahasa Indonesia',
  th: 'ไทย',
  my: 'မြန်မာ',
  ne: 'नेपाली',
  tl: 'Tagalog',
};

export const DEFAULT_LOCALE: SupportedLocale = 'ja';

/**
 * ネストされたキーを取得するためのユーティリティ型
 */
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}` | K
          : K
        : never;
    }[keyof T]
  : never;

/**
 * 翻訳関数の型
 */
export type TranslationFunction = (
  key: string,
  params?: Record<string, string | number>
) => string;

/**
 * 翻訳辞書のキャッシュ
 */
const translationCache = new Map<SupportedLocale, Record<string, unknown>>();

/**
 * 翻訳辞書を読み込む
 */
export async function loadTranslations(locale: SupportedLocale): Promise<Record<string, unknown>> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }

  try {
    // Dynamic import for locale files
    const translations = await import(`../locales/${locale}.json`);
    translationCache.set(locale, translations.default || translations);
    return translations.default || translations;
  } catch {
    console.warn(`Failed to load translations for locale: ${locale}, falling back to ${DEFAULT_LOCALE}`);
    if (locale !== DEFAULT_LOCALE) {
      return loadTranslations(DEFAULT_LOCALE);
    }
    return {};
  }
}

/**
 * ネストされたオブジェクトから値を取得
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
  }, obj as unknown);
}

/**
 * 翻訳関数を作成
 */
export function createTranslator(
  translations: Record<string, unknown>,
  fallback?: Record<string, unknown>
): TranslationFunction {
  return (key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations, key);

    if (value === undefined && fallback) {
      value = getNestedValue(fallback, key);
    }

    if (typeof value !== 'string') {
      console.warn(`Translation not found: ${key}`);
      return key;
    }

    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() ?? `{${paramKey}}`;
      });
    }

    return value;
  };
}

/**
 * 非同期翻訳関数を作成
 */
export async function createAsyncTranslator(locale: SupportedLocale): Promise<TranslationFunction> {
  const translations = await loadTranslations(locale);
  const fallback = locale !== DEFAULT_LOCALE ? await loadTranslations(DEFAULT_LOCALE) : undefined;
  return createTranslator(translations, fallback);
}

/**
 * ロケールが有効かチェック
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * ブラウザの言語設定からロケールを取得
 */
export function getBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const browserLang = navigator.language.split('-')[0];
  if (isValidLocale(browserLang)) {
    return browserLang;
  }

  return DEFAULT_LOCALE;
}

/**
 * 日付フォーマット（ロケール対応）
 */
export function formatDate(date: Date, locale: SupportedLocale, options?: Intl.DateTimeFormatOptions): string {
  const localeMapping: Record<SupportedLocale, string> = {
    ja: 'ja-JP',
    en: 'en-US',
    vi: 'vi-VN',
    zh: 'zh-CN',
    id: 'id-ID',
    th: 'th-TH',
    my: 'my-MM',
    ne: 'ne-NP',
    tl: 'tl-PH',
  };

  return new Intl.DateTimeFormat(localeMapping[locale], options).format(date);
}

/**
 * 数値フォーマット（ロケール対応）
 */
export function formatNumber(num: number, locale: SupportedLocale, options?: Intl.NumberFormatOptions): string {
  const localeMapping: Record<SupportedLocale, string> = {
    ja: 'ja-JP',
    en: 'en-US',
    vi: 'vi-VN',
    zh: 'zh-CN',
    id: 'id-ID',
    th: 'th-TH',
    my: 'my-MM',
    ne: 'ne-NP',
    tl: 'tl-PH',
  };

  return new Intl.NumberFormat(localeMapping[locale], options).format(num);
}
