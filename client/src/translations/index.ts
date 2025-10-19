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
  | 'sv'; // Swedish

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
    default:
      return (await import('./en')).default as TranslationKeys;
  }
};
