import { TestBed } from '@angular/core/testing';
import { provideRouter, withRouterConfig } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

describe('Feature routes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(), provideHttpClientTesting(),
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
});

