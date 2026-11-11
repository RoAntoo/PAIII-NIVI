import { ApplicationConfig,provideBrowserGlobalErrorListeners} from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideIonicAngular } from '@ionic/angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideIonicAngular(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
