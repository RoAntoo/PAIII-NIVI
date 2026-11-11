import { ApplicationConfig,provideBrowserGlobalErrorListeners, provideAppInitializer, inject} from '@angular/core';
import { SettingsService } from './core/settings/settings.service';
import { provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideIonicAngular } from '@ionic/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(SettingsService).ready),
    provideIonicAngular(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
