import { de } from './de.js';
import { en } from './en.js';
import { es } from './es.js';
import { zh } from './zh.js';
import { ja } from './ja.js';
import { ru } from './ru.js';
import { fr } from './fr.js';
import { hi } from './hi.js';
import { ar } from './ar.js';
import { bn } from './bn.js';
import { pt } from './pt.js';
import type { Translations } from './types.js';

export const SUPPORTED_LANGUAGE_CODES = ['de', 'en', 'es', 'zh', 'ja', 'ru', 'fr', 'hi', 'ar', 'bn', 'pt'] as const;
type Lang = typeof SUPPORTED_LANGUAGE_CODES[number];
const SUPPORTED: readonly Lang[] = SUPPORTED_LANGUAGE_CODES;
const langs: Record<Lang, Translations> = { de, en, es, zh, ja, ru, fr, hi, ar, bn, pt };
const INTL_LOCALES: Record<Lang, string> = {
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ru: 'ru-RU',
  fr: 'fr-FR',
  hi: 'hi-IN',
  ar: 'ar',
  bn: 'bn-BD',
  pt: 'pt-BR',
};

export function resolveStartupLanguage(value: string | undefined): Lang {
  return SUPPORTED.includes(value as Lang) ? value as Lang : 'de';
}

let current: Lang = resolveStartupLanguage(process.env.FC_LANGUAGE);

export function t(): Translations { return langs[current]; }
export function setLanguage(lang: Lang) { current = lang; }
export function getLanguage(): Lang { return current; }
export function getIntlLocale(): string { return INTL_LOCALES[current]; }
export function getSupportedLanguages(): Lang[] { return [...SUPPORTED]; }
export type { Lang, Translations };
