import { de } from './de.js';
import { en } from './en.js';
import { es } from './es.js';
import { zh } from './zh.js';
import { ja } from './ja.js';
import { ru } from './ru.js';
import type { Translations } from './types.js';

type Lang = 'de' | 'en' | 'es' | 'zh' | 'ja' | 'ru';
const SUPPORTED: Lang[] = ['de', 'en', 'es', 'zh', 'ja', 'ru'];
const langs: Record<Lang, Translations> = { de, en, es, zh, ja, ru };
let current: Lang = (SUPPORTED.includes(process.env.FC_LANGUAGE as Lang)
  ? process.env.FC_LANGUAGE as Lang : 'de');

export function t(): Translations { return langs[current]; }
export function setLanguage(lang: Lang) { current = lang; }
export function getLanguage(): Lang { return current; }
export function getSupportedLanguages(): Lang[] { return [...SUPPORTED]; }
export type { Lang, Translations };
