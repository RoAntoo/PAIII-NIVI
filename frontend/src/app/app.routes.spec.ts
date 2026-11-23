import { TestBed } from '@angular/core/testing';
import { provideRouter, withRouterConfig } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthService } from './core/auth/auth.service';
import { VoiceTasksComponent } from './features/tasks/pages/task-voice/voice-tasks.component';

describe('Feature routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(), provideHttpClientTesting(),
    { provide: AuthService, useValue: { isAuthenticated: () => true } },
  ] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('inherits project and task identifiers across lazy route boundaries', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/12/tasks/34/edit');
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/projects/12/tasks/34`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 34, title: 'Example', estimateHours: 2, assignee: null, status: 'TODO', createdAt: '2026-11-04T12:00:00Z', finishedAt: null });
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('input[formControlName=title]')?.value).toBe('Example');
  });

  it('routes dictation and its manual fallback inside the same project', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/projects/12/tasks/voice');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Dictar tarea');
    const manual = harness.routeNativeElement?.querySelector('a[href$="/new"]');
    expect(manual?.getAttribute('href')).toBe('/projects/12/tasks/new');
  });

  it('protects a voice save from accidental navigation while allowing return to sign-in', async () => {
    const harness = await RouterTestingHarness.create();
    const voice = await harness.navigateByUrl('/projects/12/tasks/voice', VoiceTasksComponent);
    voice.addRow();
    voice.saving.set(true);
    await harness.navigateByUrl('/projects/12/tasks', VoiceTasksComponent);
    await harness.navigateByUrl('/login?returnUrl=%2Fprojects%2F12%2Ftasks%2Fvoice');
    expect(harness.routeNativeElement?.textContent).toContain('Ingresar a NIVI');
  });
});

