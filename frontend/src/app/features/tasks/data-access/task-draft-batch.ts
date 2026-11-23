import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TimeoutError, firstValueFrom } from 'rxjs';
import { TaskCategory, TaskRequest, TaskSource, validateTaskInput } from '../domain/task.models';
import { TaskService } from './task-api.service';

export interface TaskDraft {
  id: string;
  title: string;
  estimateHours: number | null;
  category: TaskCategory;
  saved: boolean;
  selected?: boolean;
  originalTitle?: string;
}

@Injectable()
export class TaskDraftBatch {
  private readonly taskService = inject(TaskService);
  private readonly destroyRef = inject(DestroyRef);
  readonly rows = signal<TaskDraft[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly retryRequest = signal<TaskRequest | null>(null);
  readonly savedCount = computed(() => this.rows().filter(row => row.saved).length);
  readonly pendingCount = computed(() => this.rows().filter(row => !row.saved && row.selected !== false).length);

  draft(title: string, fields: Partial<Pick<TaskDraft, 'estimateHours' | 'category' | 'originalTitle'>> = {}): TaskDraft {
    return { id: crypto.randomUUID(), title, estimateHours: 1, category: 'GENERAL', saved: false, ...fields };
  }

  async save(projectId: number, source: TaskSource): Promise<boolean> {
    if (this.saving() || !this.pendingCount()) return false;
    this.error.set(null);
    const retry = this.retryRequest();
    const requests: TaskRequest[] = retry ? [retry] : [];
    const pending = this.rows().filter(row => !row.saved
      && row.selected !== false && row.id !== retry?.clientRequestId);
    for (const row of pending) {
      const request: TaskRequest = {
        id: null,
        title: row.title.trim(),
        estimateHours: row.estimateHours ?? 0,
        assignee: null,
        status: 'TODO',
        source,
        category: row.category,
        clientRequestId: row.id,
      };
      try {
        validateTaskInput(request);
      } catch (error) {
        this.error.set('Tarea pendiente ' + (requests.length + 1) + '. ' + (error as Error).message);
        return false;
      }
      requests.push(request);
    }

    this.saving.set(true);
    try {
      for (const request of requests) {
        try {
          const saved = await firstValueFrom(this.taskService.createTask(projectId, request)
            .pipe(takeUntilDestroyed(this.destroyRef)));
          if (this.destroyRef.destroyed) return false;
          this.rows.update(rows => rows.map(row => row.id === request.clientRequestId
            ? { ...row, title: saved.title, saved: true } : row));
          this.retryRequest.set(null);
        } catch (error) {
          if (!this.destroyRef.destroyed) this.showFailure(request, error);
          return false;
        }
      }
      return true;
    } finally {
      if (!this.destroyRef.destroyed) this.saving.set(false);
    }
  }

  private showFailure(request: TaskRequest, error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    if (this.retryRequest() || error instanceof TimeoutError || status === 0 || (status !== undefined && status >= 500)) {
      this.retryRequest.set(request);
      this.error.set('No pudimos confirmar el guardado de una tarea. Reintentá para comprobar la misma solicitud y guardar las que quedan.');
    } else if (status === 409) {
      this.error.set('No se pueden agregar tareas a un proyecto cerrado.');
    } else if (status === 404) {
      this.error.set('El proyecto no existe.');
    } else {
      this.error.set('No se pudo guardar una tarea. Revisá los datos e intentá de nuevo.');
    }
  }
}
