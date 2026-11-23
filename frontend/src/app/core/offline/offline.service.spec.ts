import 'fake-indexeddb/auto';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectService } from '../../features/projects/data-access/project-api.service';
import { TaskService } from '../../features/tasks/data-access/task-api.service';
import { AuthService } from '../auth/auth.service';
import { ReminderService } from '../device/reminder.service';
import { DEFAULT_SETTINGS, SettingsService } from '../settings/settings.service';
import { LocalData } from './local-data';
import { offlineInterceptor } from './offline.interceptor';
import { OfflineService } from './offline.service';
import { emptyQueue, visibleTasks } from './task-queue';

describe('offline task operations', () => {
  const url = `${environment.apiUrl}/projects/2/tasks`;
  const payload = {
    id: null, title: 'Comprar clavos', status: 'TODO', estimateHours: 1, assignee: null,
    source: 'OCR', category: 'COMPRAS', clientRequestId: '7f945b21-6941-4c77-bdea-85557dae27cf',
  } as const;
  const saved = { ...payload, id: 7, version: 0, projectId: 2, createdAt: '2026-01-01T12:00:00Z', finishedAt: null };
  let connected: boolean;
  let account: string;
  let tasks: TaskService;
  let offline: OfflineService;
  let http: HttpTestingController;

  beforeEach(() => {
    connected = true;
    account = crypto.randomUUID();
    const login = {};
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => connected);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([offlineInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: {
        username: () => account, offlineAccount: () => account, isAuthenticated: () => true, currentSession: () => login,
      } },
      { provide: SettingsService, useValue: { loaded: signal(true), settings: signal({ ...DEFAULT_SETTINGS, enableOfflineMode: true }) } },
      { provide: ReminderService, useValue: { account: () => account, observe: async () => {} } },
    ] });
    tasks = TestBed.inject(TaskService);
    offline = TestBed.inject(OfflineService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function download(rows: typeof saved[]): Promise<void> {
    const read = firstValueFrom(tasks.getTasksByProjectId(2));
    const request = await vi.waitFor(() => http.expectOne({ url, method: 'GET' }));
    request.flush(rows);
    await read;
  }

  it('persists a local creation, edit and completion across another IndexedDB connection and syncs in order', async () => {
    await download([]);
    connected = false;
    const local = await firstValueFrom(tasks.createTask(2, payload));
    expect(local.id).toBeLessThan(0);
    await firstValueFrom(tasks.updateTask(2, local.id, { title: 'Comprar tornillos', status: 'DONE' }));
    http.expectNone(url);
    const reopened = new LocalData();
    const restored = await reopened.change(`tasks:${environment.apiUrl}:${account}`, emptyQueue, queue => ({
      pending: queue.pending.length, tasks: visibleTasks(queue, 2),
    }));
    expect(restored.pending).toBe(2);
    expect(restored.tasks[0]).toMatchObject({ title: 'Comprar tornillos', status: 'DONE', syncState: 'pending' });

    connected = true;
    const sync = offline.sync();
    const create = await vi.waitFor(() => http.expectOne({ url, method: 'POST' }));
    expect(create.request.body).toMatchObject({ source: 'OCR', category: 'COMPRAS', clientRequestId: payload.clientRequestId });
    create.flush(saved);
    const edit = await vi.waitFor(() => http.expectOne({ url: url + '/7', method: 'PUT' }));
    expect(edit.request.headers.get('If-Match')).toBe('"0"');
    edit.flush({ ...saved, ...edit.request.body, version: 1 });
    await sync;
    connected = false;
    expect(await firstValueFrom(tasks.getTasksByProjectId(2))).toEqual([
      expect.objectContaining({ id: 7, version: 1, title: 'Comprar tornillos', source: 'OCR', category: 'COMPRAS' }),
    ]);
  });

  it('reuses the creation key after a server failure and keeps a deleted task hidden after replay', async () => {
    await download([]);
    connected = false;
    const local = await firstValueFrom(tasks.createTask(2, payload));
    await firstValueFrom(tasks.deleteTask(2, local.id));
    expect(await firstValueFrom(tasks.getTasksByProjectId(2))).toEqual([]);
    connected = true;
    const first = offline.sync();
    const failed = await vi.waitFor(() => http.expectOne({ url, method: 'POST' }));
    failed.flush({}, { status: 500, statusText: 'Unknown outcome' });
    await first;
    const retry = offline.retry();
    const replay = await vi.waitFor(() => http.expectOne({ url, method: 'POST' }));
    expect(replay.request.body).toEqual(failed.request.body);
    replay.flush(saved);
    const deletion = await vi.waitFor(() => http.expectOne({ url: url + '/7', method: 'DELETE' }));
    deletion.flush(null, { status: 404, statusText: 'Already deleted' });
    await retry;
    connected = false;
    expect(await firstValueFrom(tasks.getTasksByProjectId(2))).toEqual([]);
  });

  it('opens the offline home using downloaded projects and tasks', async () => {
    const projects = TestBed.inject(ProjectService);
    const loaded = firstValueFrom(projects.getProjects());
    const projectUrl = `${environment.apiUrl}/projects`;
    const request = await vi.waitFor(() => http.expectOne(projectUrl));
    const project = { id: 2, name: 'Proyecto descargado', status: 'ACTIVE', totalTasks: 1, completedTasks: 0 };
    request.flush([project]);
    await loaded;
    await download([saved]);
    connected = false;
    expect(await firstValueFrom(projects.getProjects(3))).toEqual([project]);
    expect(await firstValueFrom(tasks.getRecentTasks())).toEqual([
      { task: saved, projectId: 2, projectName: project.name },
    ]);
    await firstValueFrom(tasks.updateTask(2, saved.id, { status: 'DONE' }, 0));
    expect(await firstValueFrom(projects.getProjects(3))).toEqual([{ ...project, completedTasks: 1 }]);
    http.expectNone(projectUrl + '/recent-tasks');
  });

  it.each([[400, 'error'], [412, 'conflict']] as const)('keeps an HTTP %s result visible as %s', async (status, state) => {
    await download([saved]);
    connected = false;
    await firstValueFrom(tasks.updateTask(2, 7, { title: 'Edición local' }, 0));
    connected = true;
    const sync = offline.sync();
    const edit = await vi.waitFor(() => http.expectOne({ url: url + '/7', method: 'PUT' }));
    edit.flush({}, { status, statusText: 'Rejected' });
    await sync;
    await offline.refresh();
    expect(offline.summary()[0]?.status).toBe(state);
    connected = false;
    expect(await firstValueFrom(tasks.getTasksByProjectId(2))).toEqual([
      expect.objectContaining({ title: 'Edición local', syncState: state }),
    ]);
    http.expectNone(url + '/7');
  });
});
