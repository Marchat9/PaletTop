import { ApplicationConfig, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

import { environment } from '../environments/environment';
import { routes } from './app-routes';
import { effects, reducers } from './store/app-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore(reducers),
    provideEffects(effects),
    provideAnimations(),
    provideToastr({
      progressBar: true,
      progressAnimation: 'decreasing',
      positionClass: 'toast-top-right-custom',
    }),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    ...(!environment.production
      ? [
          provideStoreDevtools({
            maxAge: 25,
            logOnly: false,
            autoPause: true,
          }),
        ]
      : []),
  ],
};
