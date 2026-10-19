import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { LOCALE_ID } from '@angular/core';
import { provideTransloco, TRANSLOCO_LOADER, Translation, TranslocoService } from '@jsverse/transloco';
import { routes } from './app.routes';
import { SettingsService } from './services/settings';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    ...provideTransloco({
      config: {
        availableLangs: ['fr', 'en'],
        defaultLang: 'fr',
        fallbackLang: 'fr',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
    }),
    {
      provide: TRANSLOCO_LOADER,
      useFactory: () => {
        const http = inject(HttpClient);
        return { getTranslation: (lang: string) => http.get<Translation>(`/i18n/${lang}.json`) };
      },
    },
    provideAppInitializer(() => {
      inject(TranslocoService).setActiveLang(inject(SettingsService).settings().language);
    }),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
  ],
};
