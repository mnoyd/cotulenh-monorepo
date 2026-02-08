export interface LocaleDefinition<LocaleId extends string = string> {
  id: LocaleId;
  name: string;
  nativeName: string;
}

export const COTULENH_LOCALES = [
  { id: 'en', name: 'English', nativeName: 'English' },
  { id: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' }
] as const;

export type CotulenhLocale = (typeof COTULENH_LOCALES)[number]['id'];

export type TranslationDictionary<Key extends string = string> = Record<Key, string>;

export type TranslationMap<
  LocaleId extends string = string,
  Key extends string = string
> = Record<LocaleId, TranslationDictionary<Key>>;

export function createLocaleRegistry<const TLocales extends readonly LocaleDefinition<string>[]>(
  locales: TLocales
): {
  locales: Readonly<TLocales>;
  isValidLocale: (locale: string) => locale is TLocales[number]['id'];
} {
  const localeIds = new Set(locales.map((locale) => locale.id));

  return {
    locales,
    isValidLocale: (locale: string): locale is TLocales[number]['id'] => localeIds.has(locale)
  };
}

export function translateKey<
  LocaleId extends string,
  Key extends string,
  TTranslations extends TranslationMap<LocaleId, Key>
>(translations: TTranslations, locale: LocaleId, key: Key): string {
  return translations[locale]?.[key] ?? key;
}

/**
 * Returns missing keys for each locale when compared against the union of keys across all locales.
 */
export function findMissingTranslationKeys<
  TTranslations extends TranslationMap<string, string>
>(translations: TTranslations): Record<keyof TTranslations, string[]> {
  const allKeys = new Set<string>();

  for (const dictionary of Object.values(translations)) {
    for (const key of Object.keys(dictionary)) {
      allKeys.add(key);
    }
  }

  const result = {} as Record<keyof TTranslations, string[]>;

  for (const locale of Object.keys(translations) as Array<keyof TTranslations>) {
    const localeKeys = new Set(Object.keys(translations[locale]));
    result[locale] = [...allKeys].filter((key) => !localeKeys.has(key));
  }

  return result;
}
