import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { APP_LOCALES, AppLocale, DEFAULT_CURRENCY, LOCALES } from './i18n.config';

@Injectable({ providedIn: 'root' })
export class LangService {
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);

  /** Active lang id === locale code; TranslocoLocaleService follows it automatically. */
  readonly locale = signal(this.asAppLocale(this.transloco.getActiveLang()));
  readonly currency = signal(DEFAULT_CURRENCY);

  readonly meta = computed(() => LOCALES[this.locale()]);
  readonly dir = computed(() => this.meta().dir);
  readonly isRtl = computed(() => this.dir() === 'rtl');
  readonly locales = APP_LOCALES.map((code) => ({ code, ...LOCALES[code] }));

  constructor() {
    effect(() => {
      const html = this.doc.documentElement;
      html.lang = this.locale();
      html.dir = this.dir();
    });
  }

  setLocale(locale: AppLocale): void {
    this.locale.set(locale);
    this.transloco.setActiveLang(locale);
  }

  private asAppLocale(locale: string): AppLocale {
    return APP_LOCALES.find((supportedLocale) => supportedLocale === locale) ?? 'ar-TN';
  }
}