export type Language = 
  | 'en' // English
  | 'es' // Spanish
  | 'de' // German
  | 'fr' // French
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ar' // Arabic
  | 'tr' // Turkish
  | 'pl' // Polish
  | 'nl' // Dutch
  | 'hi' // Hindi
  | 'sv' // Swedish
  | 'bg' // Bulgarian
  | 'cs' // Czech
  | 'da' // Danish
  | 'et' // Estonian
  | 'fi' // Finnish
  | 'el' // Greek
  | 'hu' // Hungarian
  | 'id' // Indonesian
  | 'lv' // Latvian
  | 'lt' // Lithuanian
  | 'nb' // Norwegian (Bokmål)
  | 'ro' // Romanian
  | 'sk' // Slovak
  | 'sl'; // Slovenian

export type TranslationKeys = Record<string, string>;

export const SUPPORTED_LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių' },
  { code: 'nb', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina' },
];

export const loadTranslations = async (language: Language): Promise<TranslationKeys> => {
  switch (language) {
    case 'en':
      return (await import('./en')).default as TranslationKeys;
    case 'es':
      return (await import('./es')).default as TranslationKeys;
    case 'de':
      return (await import('./de')).default as TranslationKeys;
    case 'fr':
      return (await import('./fr')).default as TranslationKeys;
    case 'it':
      return (await import('./it')).default as TranslationKeys;
    case 'pt':
      return (await import('./pt')).default as TranslationKeys;
    case 'ru':
      return (await import('./ru')).default as TranslationKeys;
    case 'zh':
      return (await import('./zh')).default as TranslationKeys;
    case 'ja':
      return (await import('./ja')).default as TranslationKeys;
    case 'ko':
      return (await import('./ko')).default as TranslationKeys;
    case 'ar':
      return (await import('./ar')).default as TranslationKeys;
    case 'tr':
      return (await import('./tr')).default as TranslationKeys;
    case 'pl':
      return (await import('./pl')).default as TranslationKeys;
    case 'nl':
      return (await import('./nl')).default as TranslationKeys;
    case 'hi':
      return (await import('./hi')).default as TranslationKeys;
    case 'sv':
      return (await import('./sv')).default as TranslationKeys;
    case 'bg':
      return (await import('./bg')).default as TranslationKeys;
    case 'cs':
      return (await import('./cs')).default as TranslationKeys;
    case 'da':
      return (await import('./da')).default as TranslationKeys;
    case 'et':
      return (await import('./et')).default as TranslationKeys;
    case 'fi':
      return (await import('./fi')).default as TranslationKeys;
    case 'el':
      return (await import('./el')).default as TranslationKeys;
    case 'hu':
      return (await import('./hu')).default as TranslationKeys;
    case 'id':
      return (await import('./id')).default as TranslationKeys;
    case 'lv':
      return (await import('./lv')).default as TranslationKeys;
    case 'lt':
      return (await import('./lt')).default as TranslationKeys;
    case 'nb':
      return (await import('./nb')).default as TranslationKeys;
    case 'ro':
      return (await import('./ro')).default as TranslationKeys;
    case 'sk':
      return (await import('./sk')).default as TranslationKeys;
    case 'sl':
      return (await import('./sl')).default as TranslationKeys;
    default:
      return (await import('./en')).default as TranslationKeys;
  }
};
