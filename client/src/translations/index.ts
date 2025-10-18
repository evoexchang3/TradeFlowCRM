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
      return (await import('./en')).en;
    case 'es':
      return (await import('./es')).es;
    case 'de':
      return (await import('./de')).de;
    case 'fr':
      return (await import('./fr')).fr;
    case 'it':
      return (await import('./it')).it;
    case 'pt':
      return (await import('./pt')).pt;
    case 'ru':
      return (await import('./ru')).ru;
    case 'zh':
      return (await import('./zh')).zh;
    case 'ja':
      return (await import('./ja')).ja;
    case 'ko':
      return (await import('./ko')).ko;
    case 'ar':
      return (await import('./ar')).ar;
    case 'tr':
      return (await import('./tr')).tr;
    case 'pl':
      return (await import('./pl')).pl;
    case 'nl':
      return (await import('./nl')).nl;
    case 'hi':
      return (await import('./hi')).hi;
    case 'sv':
      return (await import('./sv')).sv;
    default:
      return (await import('./en')).en;
  }
};
