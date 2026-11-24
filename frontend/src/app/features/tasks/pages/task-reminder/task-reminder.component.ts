import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, model, signal } from '@angular/core';
import { ReminderService } from '../../../../core/device/reminder.service';

@Component({
  selector: 'app-task-reminder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (reminders.enabled() || at()) {
      <div class="mb-3">
        <label for="reminder-date" class="form-label">Recordarme</label>
        @if (reminders.enabled()) {
          <input id="reminder-date" type="datetime-local" class="form-control" [value]="localDate()"
                 [disabled]="disabled() || checking()" (change)="change($event)">
          <p class="form-text">Android puede entregar la notificación después de la hora elegida.</p>
        } @else {
          <p id="reminder-date">Activá Recordatorios en Ajustes para programar otro aviso.</p>
        }
        @if (at()) {
          <button type="button" class="btn btn-sm btn-outline-secondary" [disabled]="disabled() || checking()"
                  (click)="clear()">Quitar recordatorio</button>
        }
        @if (message()) { <p class="small mt-2 mb-0" role="status">{{ message() }}</p> }
      </div>
    }
  `,
})
export class TaskReminderComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly reminders = inject(ReminderService);
  readonly at = model<string | null>(null);
  readonly disabled = input(false);
  readonly checking = signal(false);
  readonly message = signal('');
  readonly localDate = computed(() => {
    const value = this.at();
    if (!value) return '';
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });

  async change(event: Event): Promise<void> {
    const field = event.target as HTMLInputElement;
    const date = new Date(field.value);
    this.message.set('');
    if (!field.value) return this.clear();
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      this.message.set('Elegí una fecha y hora futuras.');
      field.value = this.localDate();
      return;
    }
    const previous = this.at();
    this.checking.set(true);
    try {
      const granted = await this.reminders.requestPermission();
      if (this.destroyRef.destroyed) return;
      if (date.getTime() <= Date.now()) {
        this.at.set(previous);
        this.message.set('La hora elegida ya pasó. Elegí otra fecha y hora.');
        field.value = this.localDate();
      } else if (granted) this.at.set(date.toISOString());
      else {
        this.message.set('Android bloqueó las notificaciones. Podés guardar la tarea sin este recordatorio.');
        field.value = this.localDate();
      }
    } finally {
      this.checking.set(false);
    }
  }

  clear(): void {
    this.at.set(null);
    this.message.set('');
  }
}
