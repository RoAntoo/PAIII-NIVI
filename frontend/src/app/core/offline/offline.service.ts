import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpHeaders, HttpRequest, HttpResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TaskDto, TaskRequest, UpdateTaskDto } from '../../features/tasks/domain/task.models';
import { ProjectResponse } from '../../features/projects/domain/project.models';
import { AuthService } from '../auth/auth.service';
import { SettingsService } from '../settings/settings.service';
import { ReminderService } from '../device/reminder.service';
import { LocalData } from './local-data';
import { PendingOperation, TaskQueue, commitOperation, emptyQueue, enqueue, visibleTasks } from './task-queue';

export const SKIP_OFFLINE = new HttpContextToken(() => false);
const taskPath = /^\/projects\/(\d+)\/tasks(?:\/(-?\d+))?$/;

@Injectable({ providedIn: 'root' })
export class OfflineService {
  private readonly storage = inject(LocalData);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  private readonly reminders = inject(ReminderService);
  private running?: Promise<void>;
  private projectRefresh?: Promise<unknown>;
  private rerun = false;
  private retryTimer?: ReturnType<typeof setTimeout>;
  readonly enabled = computed(() => this.settings.loaded() && this.settings.settings().enableOfflineMode);
  private readonly queueSummary = signal<PendingOperation[]>([]);
  readonly syncing = signal(false);
  readonly problem = signal('');
  readonly changes = signal(0);
  readonly account = computed(() => this.enabled() ? this.auth.username() || this.auth.offlineAccount() : null);
  private readonly summaryAccount = signal<string | null>(null);
  readonly summary = computed(() => this.account() === this.summaryAccount() ? this.queueSummary() : []);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.retryTimer));
  }

  async handle(request: HttpRequest<unknown>, route: string, forward: () => Observable<HttpResponse<unknown>>): Promise<HttpResponse<unknown>> {
    const account = this.account();
    if (!account) return firstValueFrom(forward());
    const match = taskPath.exec(route);
    const project = match ? Number(match[1]) : null;
    const taskId = match?.[2] !== undefined ? Number(match[2]) : undefined;
    if (project !== null && ['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const kind = request.method === 'POST' ? 'create' : request.method === 'PUT' ? 'update' : 'delete';
      const { body, target } = await this.change(account, state => {
        const target = taskId === undefined ? undefined : state.aliases[taskId] ?? taskId;
        const expected = request.headers.get('If-Match');
        if (expected !== null && target !== undefined && expected !== `"${state.tasks[target]?.version}"`) {
          throw new HttpErrorResponse({ status: 412 });
        }
        return { target, body: enqueue(state, project, taskId, kind,
          request.body as TaskRequest | UpdateTaskDto | undefined) };
      });
      await this.reminders.observe(account, project, target, request.method, body);
      void this.sync();
      return new HttpResponse({ body, status: kind === 'create' ? 201 : kind === 'delete' ? 204 : 200 });
    }
    if (request.method !== 'GET') return firstValueFrom(forward());

    const cached = () => this.change(account, state => {
      if (project !== null) {
        const list = visibleTasks(state, project);
        return taskId === undefined ? (state.projectsLoaded[project] ? list : undefined)
          : list.find(task => task.id === (state.aliases[taskId] ?? taskId));
      }
      const snapshot = state.snapshots[request.urlWithParams];
      const projects = state.snapshots[`${environment.apiUrl}/projects`] as ProjectResponse[] | undefined;
      if (route === '/projects/recent-tasks' && projects) {
        const local = projects.flatMap(project => visibleTasks(state, project.id).map(task => ({
          task, projectId: project.id, projectName: project.name,
        })));
        const remote = (snapshot ?? []) as typeof local;
        const known = new Set([...local.map(row => row.task.id), ...state.pending.map(item => item.task)]);
        return [...local, ...remote.filter(row => !state.projectsLoaded[row.projectId] && !known.has(row.task.id))]
          .sort((first, second) => second.task.createdAt.localeCompare(first.task.createdAt)).slice(0, 4);
      }
      if (route === '/projects') {
        const limit = Number(request.params.get('limit'));
        const rows = snapshot as ProjectResponse[] | undefined ?? (limit > 0 ? projects?.slice(0, limit) : undefined);
        return rows?.map(project => {
          if (!state.projectsLoaded[project.id]) return project;
          const tasks = visibleTasks(state, project.id);
          return { ...project, totalTasks: tasks.length, completedTasks: tasks.filter(task => task.status === 'DONE').length };
        });
      }
      return snapshot;
    });
    const initial = await this.change(account, state => ({
      revision: state.revision,
      local: taskId !== undefined && (taskId < 0 || state.pending.some(item => item.task === taskId)),
    }));
    if (initial.local || !this.auth.isAuthenticated() || !navigator.onLine) {
      const body = await cached();
      if (body === undefined) {
        if (initial.local) throw new HttpErrorResponse({ status: 404 });
        throw new Error('Esta información todavía no está guardada en el dispositivo.');
      }
      return new HttpResponse({ body });
    }
    try {
      const response = await firstValueFrom(forward().pipe(timeout(5_000)));
      await this.change(account, state => {
        if (project === null) {
          state.snapshots[request.urlWithParams] = response.body;
          return;
        }
        if (state.revision !== initial.revision) return;
        const rows = (taskId === undefined ? response.body : [response.body]) as TaskDto[];
        const queued = new Set(state.pending.map(item => item.task));
        if (taskId === undefined) {
          for (const task of Object.values(state.tasks)) {
            if (task.projectId === project && !queued.has(task.id)) delete state.tasks[task.id];
          }
          state.projectsLoaded[project] = true;
        }
        for (const task of rows) {
          if (!queued.has(task.id)) state.tasks[task.id] = { ...task, projectId: project };
        }
      });
      if (project === null) return response;
      const body = await cached();
      return body !== undefined ? response.clone({ body }) : response;
    } catch (error) {
      if (!transient(error)) throw error;
      const body = await cached();
      if (body === undefined) throw error;
      return new HttpResponse({ body });
    }
  }

  async refresh(): Promise<void> {
    const account = this.account();
    if (!account) {
      this.queueSummary.set([]);
      this.summaryAccount.set(null);
      return;
    }
    try {
      const pending = await this.change(account, state => state.pending);
      if (account === this.account()) {
        this.summaryAccount.set(account);
        this.queueSummary.set(pending);
      }
    } catch {
      this.problem.set('No se pudo abrir el almacenamiento local.');
    }
  }

  refreshProjects(): void {
    if (this.projectRefresh || !this.account() || !navigator.onLine || !this.auth.isAuthenticated()) return;
    this.projectRefresh = firstValueFrom(this.http.get(`${environment.apiUrl}/projects`).pipe(timeout(7_000)))
      .catch(() => undefined).finally(() => { this.projectRefresh = undefined; });
  }

  sync(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }
    const account = this.account();
    if (!account || !navigator.onLine || !this.auth.isAuthenticated()) return this.refresh();
    clearTimeout(this.retryTimer);
    this.syncing.set(true);
    this.running = this.drain(account).catch(() => {
      this.problem.set('La sincronización se interrumpió. Podés reintentar.');
    }).finally(() => {
      this.running = undefined;
      this.syncing.set(false);
      void this.refresh();
      const again = this.rerun || this.account() !== account;
      this.rerun = false;
      if (again && this.account()) void this.sync();
    });
    return this.running;
  }

  async retry(): Promise<void> {
    const account = this.account();
    if (!account || this.running) return;
    await this.change(account, state => {
      for (const item of state.pending.filter(item => item.status !== 'conflict')) {
        Object.assign(item, { status: 'pending', attempts: 0, retryAt: 0 });
        delete item.explanation;
      }
    });
    await this.sync();
  }

  async discardFailed(operation: PendingOperation): Promise<void> {
    const account = this.account();
    if (!account || this.syncing() || this.summaryAccount() !== account) return;
    const result = await this.change(account, state => {
      const current = state.pending.find(item => item.id === operation.id);
      if (!current || current.status === 'pending') return undefined;
      state.pending = state.pending.filter(item => item.task !== current.task);
      if (current.task < 0) delete state.tasks[current.task];
      state.revision++;
      return state.tasks[current.task];
    });
    await this.reminders.observe(account, operation.project, operation.task, result ? 'PUT' : 'DELETE', result);
    this.changes.update(value => value + 1);
    await this.refresh();
  }

  private change<T>(account: string, update: (state: TaskQueue) => T): Promise<T> {
    return this.storage.change(`tasks:${environment.apiUrl}:${account}`, emptyQueue, update);
  }

  private async drain(account: string): Promise<void> {
    this.problem.set('');
    const session = this.auth.currentSession();
    while (this.account() === account && navigator.onLine && this.auth.currentSession() === session && this.auth.isAuthenticated()) {
      const operation = await this.change(account, state => {
        const firstByTask = state.pending.filter((item, index) => state.pending.findIndex(other => other.task === item.task) === index);
        return firstByTask.find(item => item.status === 'pending' && item.retryAt <= Date.now());
      });
      if (!operation) {
        const wake = await this.change(account, state => state.pending.filter((item, index) =>
          item.status === 'pending' && item.retryAt > Date.now()
          && state.pending.findIndex(other => other.task === item.task) === index)
          .reduce((next, item) => Math.min(next, item.retryAt), Infinity));
        if (Number.isFinite(wake)) this.retryTimer = setTimeout(() => void this.sync(), Math.max(100, wake - Date.now()));
        break;
      }
      if (this.account() !== account || this.auth.currentSession() !== session) break;
      try {
        const response = await this.send(operation);
        const task = await this.change(account, state => {
          commitOperation(state, operation, response);
          return visibleTasks(state, operation.project).find(item => item.id === response?.id);
        });
        await this.reminders.observe(account, operation.project, response?.id ?? operation.task, task ? 'PUT' : 'DELETE', task);
        this.changes.update(value => value + 1);
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 401) break;
        if (operation.kind === 'delete' && error instanceof HttpErrorResponse && error.status === 404) {
          await this.change(account, state => commitOperation(state, operation, null));
          this.changes.update(value => value + 1);
          continue;
        }
        await this.change(account, state => {
          const pending = state.pending.find(item => item.id === operation.id);
          if (!pending) return;
          pending.attempts++;
          const status = error instanceof HttpErrorResponse ? error.status : null;
          if (status === 404 || status === 409 || status === 412) {
            pending.status = 'conflict';
            pending.explanation = status === 404 ? 'La tarea o el proyecto ya no está disponible.'
              : status === 409 ? 'El estado del proyecto impide guardar el cambio.'
              : 'La tarea cambió en el servidor.';
          } else if (!transient(error) || pending.attempts >= 4) {
            pending.status = 'error';
            pending.explanation = transient(error) ? 'El servidor no respondió después de varios intentos.'
              : 'El servidor rechazó el cambio.';
          } else pending.retryAt = Date.now() + 2 ** pending.attempts * 1_000;
        });
        this.changes.update(value => value + 1);
      }
    }
  }

  private send(operation: PendingOperation): Promise<TaskDto | null> {
    const url = `${environment.apiUrl}/projects/${operation.project}/tasks`;
    const context = new HttpContext().set(SKIP_OFFLINE, true);
    if (operation.kind === 'create') {
      return firstValueFrom(this.http.post<TaskDto>(url, operation.body, { context }).pipe(timeout(8_000)));
    }
    if (operation.version === undefined) return Promise.reject(new HttpErrorResponse({ status: 412 }));
    const headers = new HttpHeaders({
      'If-Match': `"${operation.version}"`,
      'X-Task-Operation-Id': operation.id,
    });
    const target = `${url}/${operation.task}`;
    const request: Observable<TaskDto | null> = operation.kind === 'delete'
      ? this.http.delete<null>(target, { headers, context })
      : this.http.put<TaskDto>(target, operation.body, { headers, context });
    return firstValueFrom(request.pipe(timeout(8_000)));
  }
}

function transient(error: unknown): boolean {
  return error instanceof TimeoutError || error instanceof HttpErrorResponse
    && (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500);
}
