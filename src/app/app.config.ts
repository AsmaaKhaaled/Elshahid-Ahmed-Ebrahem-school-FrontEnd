import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { notifyInterceptor } from './core/interceptors/notify.interceptor';

// Angular Material defaults (form fields / dropdowns) are provided by the lazy-loaded
// layouts — see shared/material/material-defaults.providers.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // notify first, so it sees how each request finally ended (after the auth interceptor)
    provideHttpClient(withInterceptors([notifyInterceptor, authInterceptor])),
    // Async animations: the animations package is lazy-loaded, keeping the initial bundle small
    provideAnimationsAsync()
  ]
};
