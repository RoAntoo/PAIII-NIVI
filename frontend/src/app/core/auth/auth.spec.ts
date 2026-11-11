import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthSession } from './auth.service';
import { authInterceptor } from './auth.interceptor';
import { ProjectService } from '../../features/projects/data-access/project-api.service';
import { environment } from '../../../environments/environment';

describe('authentication', () => {
  let http: HttpTestingController;
  const session = (): AuthSession => ({ accessToken: 'signed-token', tokenType: 'Bearer',
    username: 'user', expiresAt: new Date(Date.now() + 3_600_000).toISOString() });

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); sessionStorage.clear(); vi.useRealTimers(); });

  it('stores the session, authenticates API calls and clears it on logout', () => {
    const auth = TestBed.inject(AuthService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.login({ username: 'user', password: 'password' }).subscribe();
    const login = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(login.request.headers.has('Authorization')).toBe(false);
    login.flush(session());
    expect(auth.isAuthenticated()).toBe(true);
    expect(sessionStorage.getItem('nivi.session')).not.toContain('password');
    TestBed.inject(ProjectService).getProjects().subscribe();
    const projects = http.expectOne(`${environment.apiUrl}/projects`);
    expect(projects.request.headers.get('Authorization')).toBe('Bearer signed-token');
    projects.flush([]);
    auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('nivi.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not send the token to external URLs and expires the session on an API 401', () => {
    sessionStorage.setItem('nivi.session', JSON.stringify(session()));
    const auth = TestBed.inject(AuthService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const client = TestBed.inject(HttpClient);
    client.get('https://external.example/data').subscribe();
    const external = http.expectOne('https://external.example/data');
    expect(external.request.headers.has('Authorization')).toBe(false);
    external.flush({});
    TestBed.inject(ProjectService).getProjects().subscribe({ error: () => {} });
    http.expectOne(`${environment.apiUrl}/projects`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('propagates a late 401 without clearing a newer login', () => {
    sessionStorage.setItem('nivi.session', JSON.stringify(session()));
    const auth = TestBed.inject(AuthService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const failed = vi.fn();
    TestBed.inject(ProjectService).getProjects().subscribe({ error: failed });
    const oldRequest = http.expectOne(`${environment.apiUrl}/projects`);
    auth.login({ username: 'user', password: 'new-password' }).subscribe();
    http.expectOne(`${environment.apiUrl}/auth/login`).flush({ ...session(), accessToken: 'new-token' });
    oldRequest.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.accessToken()).toBe('new-token');
    expect(navigate).not.toHaveBeenCalled();
    expect(failed).toHaveBeenCalledOnce();
  });

  it('rejects expired persisted sessions', () => {
    sessionStorage.setItem('nivi.session', JSON.stringify({ ...session(), expiresAt: '2000-01-01T00:00:00Z' }));
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('nivi.session')).toBeNull();
  });

  it('ends the session when the token expires', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('nivi.session', JSON.stringify({ ...session(), expiresAt: new Date(Date.now() + 1000).toISOString() }));
    const auth = TestBed.inject(AuthService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.advanceTimersByTime(1000);
    expect(auth.isAuthenticated()).toBe(false);
  });
});
