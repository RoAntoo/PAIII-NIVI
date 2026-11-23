import { TaskDto, TaskRequest, UpdateTaskDto, taskFromDto } from '../../features/tasks/domain/task.models';

export interface PendingOperation {
  id: string;
  project: number;
  task: number;
  kind: 'create' | 'update' | 'delete';
  body?: TaskRequest | UpdateTaskDto;
  version?: number;
  attempts: number;
  retryAt: number;
  status: 'pending' | 'error' | 'conflict';
  queuedAt: string;
  explanation?: string;
}

export interface TaskQueue {
  nextId: number;
  revision: number;
  snapshots: Record<string, unknown>;
  tasks: Record<number, TaskDto>;
  projectsLoaded: Record<number, boolean>;
  pending: PendingOperation[];
  aliases: Record<number, number>;
}

export function emptyQueue(): TaskQueue {
  return { nextId: -1, revision: 0, snapshots: {}, tasks: {}, projectsLoaded: {}, pending: [], aliases: {} };
}

export function visibleTasks(queue: TaskQueue, project: number): TaskDto[] {
  const tasks = new Map(Object.values(queue.tasks).filter(task => task.projectId === project)
    .map(task => [task.id, task]));
  for (const operation of queue.pending.filter(item => item.project === project)) {
    const current = tasks.get(operation.task);
    if (operation.kind === 'delete') {
      tasks.delete(operation.task);
      continue;
    }
    if (!current) continue;
    const change = operation.kind === 'update' ? operation.body : undefined;
    const updated = { ...current, ...change };
    const syncState = current.syncState === 'pending' || !current.syncState ? operation.status : current.syncState;
    tasks.set(operation.task, {
      ...updated,
      finishedAt: updated.status === 'DONE' ? current.finishedAt ?? operation.queuedAt : null,
      syncState,
    });
  }
  return [...tasks.values()];
}

export function enqueue(
  queue: TaskQueue, project: number, taskId: number | undefined, kind: PendingOperation['kind'],
  body: TaskRequest | UpdateTaskDto | undefined,
): TaskDto | null {
  const id = kind === 'create' ? (body as TaskRequest).clientRequestId ?? crypto.randomUUID() : crypto.randomUUID();
  const existing = kind === 'create' && queue.pending.find(item => item.id === id);
  if (existing) return visibleTasks(queue, project).find(task => task.id === existing.task) ?? null;

  const task = taskId === undefined ? queue.nextId-- : queue.aliases[taskId] ?? taskId;
  const current = queue.tasks[task];
  if (kind !== 'create' && (!current || current.projectId !== project)) throw new Error('La tarea no está disponible en el dispositivo.');
  if (queue.pending.some(item => item.task === task && item.kind === 'delete')) {
    throw new Error('La tarea está pendiente de eliminación.');
  }
  if (kind !== 'create' && task > 0 && current.version === undefined) {
    throw new Error('Volvé a cargar esta tarea con conexión antes de cambiarla offline.');
  }
  if (kind === 'create') {
    const request = { ...(body as TaskRequest), clientRequestId: id };
    const now = new Date().toISOString();
    queue.tasks[task] = taskFromDto({
      ...request, id: task, projectId: project, createdAt: now,
      finishedAt: request.status === 'DONE' ? now : null,
    });
    body = request;
  }
  queue.pending.push({
    id, project, task, kind, body, version: current?.version,
    attempts: 0, retryAt: 0, status: 'pending', queuedAt: new Date().toISOString(),
  });
  queue.revision++;
  return visibleTasks(queue, project).find(item => item.id === task) ?? null;
}

export function commitOperation(queue: TaskQueue, operation: PendingOperation, response: TaskDto | null): void {
  if (!queue.pending.some(item => item.id === operation.id)) return;
  queue.pending = queue.pending.filter(item => item.id !== operation.id);
  delete queue.tasks[operation.task];
  if (response) {
    queue.tasks[response.id] = { ...response, projectId: operation.project };
    if (response.id !== operation.task) queue.aliases[operation.task] = response.id;
    for (const item of queue.pending.filter(item => item.task === operation.task)) {
      item.task = response.id;
      item.version = response.version;
      if (operation.kind === 'create' && (response.version ?? 0) > 0) {
        item.status = 'conflict';
        item.explanation = 'La tarea se editó en el servidor después del alta.';
      }
    }
  }
  queue.revision++;
}
