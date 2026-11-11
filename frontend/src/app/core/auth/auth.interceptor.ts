import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const isApiRequest = request.url.startsWith(`${environment.apiUrl}/`);
  const isLogin = request.url === `${environment.apiUrl}/auth/login`;
  if (!isApiRequest || isLogin) return next(request);
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const authenticated = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authenticated).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401) auth.requireLogin();
    return throwError(() => error);
  }));
};
