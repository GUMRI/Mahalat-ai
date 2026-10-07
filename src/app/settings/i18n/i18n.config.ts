import { HttpClient } from '@angular/common/http';
import { Injectable, inject, isDevMode } from '@angular/core';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import {
  TRANSLOCO_LOCALE_DEFAULT_CURRENCY,
  provideTranslocoLocale,
} from '@jsverse/transloco-locale';
import { provideTranslocoPersistLang } from '@jsverse/transloco-persist-lang';
import { LangService } from './i18n.service';

/** Single source of truth. Transloco "lang" ids ARE the locale codes → locale syncs automatically. */
export const LOCALES = {
  'ar-TN': { dir: 'rtl', label: 'العربية (تونس)' },
  'ar-SA': { dir: 'rtl', label: 'العربية (السعودية)' },
  'ar-EG': { dir: 'rtl', label: 'العربية (مصر)' },
  'en-US': { dir: 'ltr', label: 'English (US)' },
  'fr-FR': { dir: 'ltr', label: 'Français (France)' },
} as const satisfies Record<string, { dir: 'rtl' | 'ltr'; label: string }>;

export type AppLocale = keyof typeof LOCALES;
export const APP_LOCALES = Object.keys(LOCALES) as AppLocale[];

const DEFAULT_LOCALE: AppLocale = 'ar-TN';
export const DEFAULT_CURRENCY = 'TND';

const detectLocale = (): AppLocale => {
  const tags = typeof navigator === 'undefined' ? [] : navigator.languages;
  for (const tag of tags) {
    const base = tag.split('-')[0];
    const hit = APP_LOCALES.find((l) => l === tag) ?? APP_LOCALES.find((l) => l.startsWith(base + '-'));
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
};

/** ar-TN / ar-SA / ar-EG all share ar.json */
@Injectable({ providedIn: 'root' })
class RegionlessLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);
  getTranslation(lang: string) {
    return this.http.get<Translation>(`/assets/i18n/${lang.split('-')[0]}.json`);
  }
}

export const provideI18n = () => [
  provideTransloco({
    config: {
      availableLangs: APP_LOCALES,
      defaultLang: detectLocale(),
      fallbackLang: 'en-US',
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
    },
    loader: RegionlessLoader,
  }),
  provideTranslocoLocale({
    defaultLocale: DEFAULT_LOCALE,
  }),
  {
    provide: TRANSLOCO_LOCALE_DEFAULT_CURRENCY,
    useFactory: () => inject(LangService).currency(),
  },
  // remembers the chosen lang (→ locale) in localStorage
  provideTranslocoPersistLang({ storage: { useValue: localStorage } }),
];