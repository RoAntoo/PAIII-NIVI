import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  username: string;
}

const STORAGE_KEY = 'nivi.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private session = signal<AuthSession | null>(this.restore());
  private expiryTimer?: ReturnType<typeof setTimeout>;
  readonly username = computed(() => this.session()?.username ?? '');
  readonly signedIn = computed(() => this.session() !== null);

  constructor() {
    this.scheduleExpiry();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expiryTimer));
  }

  isAuthenticated(): boolean { return this.accessToken() !== null; }

  accessToken(): string | null {
    const session = this.session();
    return session && Date.parse(session.expiresAt) > Date.now() ? session.accessToken : null;
  }

  login(credentials: { username: string; password: string }) {
    return this.http.post<AuthSession>(`${environment.apiUrl}/auth/login`, credentials).pipe(tap(session => {
      this.session.set(session);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session)); } catch { /* Memory session still works. */ }
      this.scheduleExpiry();
    }));
  }

  logout(): void {
    this.clear();
    void this.router.navigate(['/login']);
  }

  requireLogin(): void {
    const returnUrl = this.router.url;
    this.clear();
    if (!returnUrl.startsWith('/login')) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }

  private clear(): void {
    clearTimeout(this.expiryTimer);
    this.session.set(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage can be disabled. */ }
  }

  private restore(): AuthSession | null {
    try {
      const value: Partial<AuthSession> = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
      if (value && typeof value.accessToken === 'string' && value.accessToken.length > 0
          && value.tokenType === 'Bearer' && typeof value.username === 'string'
          && typeof value.expiresAt === 'string' && Date.parse(value.expiresAt) > Date.now()) {
        return value as AuthSession;
      }
      sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* Invalid or unavailable storage starts an anonymous session. */ }
    return null;
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    const session = this.session();
    if (session) {
      const delay = Math.min(Date.parse(session.expiresAt) - Date.now(), 2_147_483_647);
      this.expiryTimer = setTimeout(() => this.requireLogin(), Math.max(0, delay));
    }
  }
}
