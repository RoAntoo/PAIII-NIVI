import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task-api.service';
import { environment } from '../../../../environments/environment';

describe('task HTTP contract', () => {
  let service: TaskService;
  let http: HttpTestingController;
  const path = `${environment.apiUrl}/projects/12/tasks`;
  const legacy = { id: 34, title: 'Original', estimateHours: 2, assignee: 'Ana', status: 'TODO',
    createdAt: '2026-11-04T12:00:00', finishedAt: null, projectId: 12 };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); });

  it('normalizes old task DTOs without losing original fields', () => {
    service.getTasksByProjectId(12).subscribe(tasks => expect(tasks[0]).toEqual({
      ...legacy, source: 'MANUAL', category: 'GENERAL',
    }));
    http.expectOne(path).flush([legacy]);
  });

  it('blocks empty titles before any HTTP request and returns a recoverable validation error', () => {
    const error = vi.fn();
    service.createTask(12, { id: null, title: '  ', estimateHours: 1, assignee: null, status: 'TODO' })
      .subscribe({ next: () => expect.fail('No success expected'), error });
    expect(error.mock.calls[0][0].message).toContain('título');
    http.expectNone(path);
  });

  it('sends only explicitly edited fields and preserves metadata in the response', () => {
    service.updateTask(12, 34, { title: ' Changed ' }).subscribe(task => expect(task).toEqual({
      ...legacy, title: 'Changed', source: 'OCR', category: 'COMPRAS', clientRequestId: 'request-id',
    }));
    const request = http.expectOne(`${path}/34`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ title: 'Changed' });
    request.flush({ ...legacy, title: 'Changed', source: 'OCR', category: 'COMPRAS', clientRequestId: 'request-id' });
  });

  it('propagates backend failure and permits retry without simulating a successful creation', () => {
    const input = { id: null, title: ' Task ', estimateHours: 1, assignee: null, status: 'TODO' as const };
    const next = vi.fn(), error = vi.fn();
    service.createTask(12, input).subscribe({ next, error });
    const failed = http.expectOne(path);
    expect(failed.request.body).toEqual({ ...input, title: 'Task', source: 'MANUAL', category: 'GENERAL' });
    failed.flush({ message: 'Unavailable' }, { status: 503, statusText: 'Service Unavailable' });
    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    service.createTask(12, input).subscribe(next);
    http.expectOne(path).flush({ ...legacy, title: 'Task' });
    expect(next).toHaveBeenCalledOnce();
  });
});
