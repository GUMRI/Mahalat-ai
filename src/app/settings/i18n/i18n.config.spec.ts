import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideI18n } from './i18n.config';

describe('i18n configuration', () => {
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...provideI18n(),
      ],
    });
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('loads regionless translations and resolves app keys at the root', () => {
    const transloco = TestBed.inject(TranslocoService);
    transloco.load('ar-TN').subscribe();

    httpTesting.expectOne('/assets/i18n/ar.json').flush({
      auth: { language: 'اللغة' },
      app: { sections: { home: 'الرئيسية' } },
    });

    transloco.setActiveLang('ar-TN');
    expect(transloco.translate('app.sections.home')).toBe('الرئيسية');
    expect(transloco.translate('auth.language')).toBe('اللغة');
  });
});
