import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ReminderService } from '../device/reminder.service';
import { SettingsService } from '../settings/settings.service';
import { OfflineService } from './offline.service';
import { PendingOperation } from './task-queue';

@Component({
  selector: 'app-sync-status',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:online)': 'resume()',
    '(document:visibilitychange)': 'resume()',
  },
  template: `
    @if (offline.account()) {
      @if (!auth.hasSession()) {
        <div class="alert alert-info">Acceso local. <a routerLink="/login" [queryParams]="{ returnUrl: router.url }">Iniciá sesión para sincronizar</a>.</div>
      }
      @if (offline.summary().length || offline.syncing() || offline.problem()) {
        <section class="alert alert-secondary" aria-label="Sincronización de tareas">
          <p role="status">
            @if (offline.syncing()) { Sincronizando… }
            @else if (offline.summary().length === 1) { 1 cambio por sincronizar }
            @else { {{ offline.summary().length }} cambios por sincronizar }
          </p>
          @if (offline.problem()) { <p role="alert">{{ offline.problem() }}</p> }
          @for (operation of offline.summary(); track operation.id) {
            @if (operation.status !== 'pending') {
              <div class="mb-2">
                {{ operation.status === 'conflict' ? 'Conflicto' : 'Error' }} en
                {{ operation.body?.title || (operation.task < 0 ? 'tarea local' : 'tarea #' + operation.task) }}
                del proyecto {{ operation.project }}.
                @if (operation.explanation) { <span>{{ operation.explanation }}</span> }
                <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="offline.syncing()"
                        (click)="discard(operation)">Descartar cambio local</button>
                <a class="ms-2" [routerLink]="['/projects', operation.project, 'tasks']">Ver tareas</a>
              </div>
            }
          }
          <button type="button" class="btn btn-sm btn-outline-primary" [disabled]="offline.syncing() || !auth.hasSession()"
                  (click)="retry()">Reintentar sincronización</button>
        </section>
      }
    }
    @if (reminders.problem()) { <p class="alert alert-warning" role="status">{{ reminders.problem() }}</p> }
  `,
})
export class SyncStatusComponent {
  readonly offline = inject(OfflineService);
  readonly auth = inject(AuthService);
  readonly router = inject(Router);
  readonly reminders = inject(ReminderService);
  private readonly settings = inject(SettingsService);

  constructor() {
    this.reminders.start();
    effect(() => {
      this.offline.account();
      this.auth.hasSession();
      this.reminders.account();
      this.reminders.enabled();
      const loaded = this.settings.loaded();
      if (loaded) untracked(() => this.resume());
    });
  }

  resume(): void {
    if (document.visibilityState === 'hidden') return;
    this.offline.refreshProjects();
    void this.offline.sync();
    void this.reminders.reconcile();
  }

  retry(): void {
    void this.offline.retry().catch(() => this.offline.problem.set('No se pudo reintentar la sincronización.'));
  }

  discard(operation: PendingOperation): void {
    if (window.confirm('¿Descartar todos los cambios locales pendientes de esta tarea?')) {
      void this.offline.discardFailed(operation).catch(() => this.offline.problem.set('No se pudo descartar el cambio local.'));
    }
  }
}
