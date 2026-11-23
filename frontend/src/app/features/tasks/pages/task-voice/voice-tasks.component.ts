import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, firstValueFrom } from 'rxjs';
import { DeviceCapabilitiesService, VOICE_MODULE } from '../../../../core/device/device-capabilities.service';
import { SpeechLanguage, SpeechService } from '../../../../core/device/speech.service';
import { SettingsService } from '../../../../core/settings/settings.service';
import { TaskService } from '../../data-access/task-api.service';
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS, TaskCategory, TaskRequest, validateTaskInput } from '../../domain/task.models';
import { parseTaskText } from '../../domain/task-text-parser';

type DictationPhase = 'idle' | 'preparing' | 'listening' | 'stopping' | 'canceling';

interface VoiceDraft {
  id: string;
  title: string;
  estimateHours: number | null;
  category: TaskCategory;
  saved: boolean;
}

const speechErrors: Readonly<Record<string, string>> = {
  PERMISSION: 'El micrófono está deshabilitado. Podés habilitarlo en los permisos de Android o escribir la tarea.',
  UNAVAILABLE: 'El servicio de reconocimiento no está disponible. Podés reintentar o escribir la tarea.',
  NETWORK: 'El reconocimiento necesita conexión en este dispositivo. Revisá la red y volvé a intentar.',
  NO_AUDIO: 'No se detectó voz. Volvé a intentar y hablá cerca del micrófono.',
  EMPTY: 'No se reconoció texto. Volvé a intentar o escribí la tarea.',
  AUDIO: 'Android no pudo usar el micrófono. Revisá que esté disponible y volvé a intentar.',
  BUSY: 'El reconocimiento está ocupado. Esperá un momento y volvé a intentar.',
  LANGUAGE: 'El reconocedor no tiene disponible el español. Podés escribir la tarea.',
  TIMEOUT: 'El reconocimiento tardó demasiado. Volvé a intentar.',
  FAILED: 'No se pudo completar el dictado. Podés volver a intentar.',
};

@Component({
  selector: 'app-voice-tasks',
  imports: [RouterLink],
  templateUrl: './voice-tasks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceTasksComponent {
  private readonly speech = inject(SpeechService);
  private readonly preferences = inject(SettingsService);
  private readonly capabilities = inject(DeviceCapabilitiesService);
  private readonly taskService = inject(TaskService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly projectId = Number(inject(ActivatedRoute).snapshot.paramMap.get('projectId'));
  readonly validProject = Number.isSafeInteger(this.projectId) && this.projectId > 0;
  readonly phase = signal<DictationPhase>('idle');
  readonly speechMessage = signal<string | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly rows = signal<VoiceDraft[]>([]);
  readonly reviewing = signal(false);
  readonly retryRequest = signal<TaskRequest | null>(null);
  readonly categories = TASK_CATEGORIES;
  readonly categoryLabels = TASK_CATEGORY_LABELS;
  readonly preferencesLoading = this.preferences.loading.asReadonly();
  readonly canDictate = computed(() => this.validProject && this.preferences.loaded()
    && this.capabilities.moduleAvailable(VOICE_MODULE, this.preferences.settings()));
  readonly unavailableMessage = computed(() => this.preferences.loaded()
    ? this.capabilities.status(VOICE_MODULE, this.preferences.settings())
    : 'No se pudieron leer tus preferencias. Podés recuperarlas desde Ajustes.');
  readonly savedCount = computed(() => this.rows().filter(row => row.saved).length);
  readonly pendingCount = computed(() => this.rows().length - this.savedCount());

  private attempt = 0;
  private language: SpeechLanguage = 'es-AR';

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.phase() === 'listening' || this.phase() === 'stopping') {
        void this.speech.cancel().catch(() => undefined);
      }
    });
  }

  async start(): Promise<void> {
    if (!this.canDictate() || this.saving() || this.phase() !== 'idle') return;
    const attempt = ++this.attempt;
    this.phase.set('preparing');
    this.speechMessage.set(null);
    try {
      const available = await this.speech.isAvailable();
      if (!this.currentAttempt(attempt) || this.phase() !== 'preparing' || !this.canDictate()) return;
      if (!available) {
        this.speechMessage.set(speechErrors['UNAVAILABLE']);
        return;
      }

      const allowed = await this.speech.requestPermission();
      if (!this.currentAttempt(attempt) || this.phase() !== 'preparing' || !this.canDictate()) return;
      if (!allowed) {
        this.speechMessage.set(speechErrors['PERMISSION']);
        return;
      }

      this.phase.set('listening');
      const transcript = await this.speech.start(this.language);
      if (!this.currentAttempt(attempt) || !this.canDictate()) return;
      const titles = parseTaskText(transcript);
      if (titles.length === 0) {
        this.speechMessage.set(speechErrors['EMPTY']);
        return;
      }
      this.rows.update(rows => [...rows, ...titles.map(title => this.newDraft(title))]);
      this.reviewing.set(true);
    } catch (error) {
      if (!this.currentAttempt(attempt) || this.phase() === 'canceling') return;
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
      if (code === 'CANCELED') return;
      if (code === 'LANGUAGE' && this.language === 'es-AR') {
        this.language = 'es-ES';
        this.speechMessage.set('El reconocedor no admite español de Argentina. Tocá Dictar tarea para volver a hablar en el modo español de España.');
      } else {
        const message = typeof code === 'string' && Object.hasOwn(speechErrors, code)
          ? speechErrors[code] : speechErrors['FAILED'];
        this.speechMessage.set(message);
      }
    } finally {
      if (this.currentAttempt(attempt)) this.phase.set('idle');
    }
  }

  async stop(): Promise<void> {
    if (this.phase() !== 'listening') return;
    const attempt = this.attempt;
    this.phase.set('stopping');
    try {
      await this.speech.stop();
    } catch {
      if (this.currentAttempt(attempt) && this.phase() === 'stopping') {
        await this.cancelDictation();
        if (!this.destroyRef.destroyed) this.speechMessage.set(speechErrors['FAILED']);
      }
    }
  }

  async cancelDictation(): Promise<void> {
    const phase = this.phase();
    if (phase === 'idle' || phase === 'canceling') return;
    this.phase.set('canceling');
    if (phase === 'preparing') {
      return;
    }
    ++this.attempt;
    try {
      await this.speech.cancel();
    } catch {
      if (!this.destroyRef.destroyed) this.speechMessage.set(speechErrors['FAILED']);
    } finally {
      if (!this.destroyRef.destroyed) this.phase.set('idle');
    }
  }

  addRow(): void {
    this.rows.update(rows => [...rows, this.newDraft('')]);
  }

  updateRow(row: VoiceDraft, changes: Partial<Pick<VoiceDraft, 'title' | 'estimateHours' | 'category'>>): void {
    this.rows.update(rows => rows.map(entry => entry.id === row.id ? { ...entry, ...changes } : entry));
  }

  changeCategory(row: VoiceDraft, value: string): void {
    const category = this.categories.find(entry => entry === value);
    if (category) this.updateRow(row, { category });
  }

  removeRow(row: VoiceDraft): void {
    this.rows.update(rows => rows.filter(entry => entry.id !== row.id));
  }

  splitRow(row: VoiceDraft, cursor: number): void {
    const before = row.title.slice(0, cursor).trim();
    const after = row.title.slice(cursor).trim();
    if (!before || !after) {
      this.saveError.set('Ubicá el cursor entre las dos partes del título para dividirlo.');
      return;
    }
    const second = { ...this.newDraft(after), category: row.category };
    this.rows.update(rows => rows.flatMap(entry => entry.id === row.id
      ? [{ ...entry, title: before }, second] : [entry]));
    this.saveError.set(null);
  }

  joinWithPrevious(row: VoiceDraft, previous: VoiceDraft): void {
    const title = [previous.title.trim(), row.title.trim()].filter(Boolean).join(' ');
    this.rows.update(rows => rows.filter(entry => entry.id !== row.id)
      .map(entry => entry.id === previous.id ? { ...entry, title } : entry));
    this.saveError.set(null);
  }

  async save(): Promise<void> {
    if (!this.canDictate() || this.saving() || this.phase() !== 'idle' || !this.pendingCount()) return;
    this.saveError.set(null);
    const retry = this.retryRequest();
    const pending = this.rows().filter(row => !row.saved && row.id !== retry?.clientRequestId);
    const requests: TaskRequest[] = [];
    if (retry) requests.push(retry);
    try {
      pending.forEach((row, index) => {
        try {
          const request: TaskRequest = {
            id: null,
            title: row.title.trim(),
            estimateHours: row.estimateHours ?? 0,
            assignee: null,
            status: 'TODO',
            source: 'VOZ',
            category: row.category,
            clientRequestId: row.id,
          };
          validateTaskInput(request);
          requests.push(request);
        } catch (error) {
          const number = index + 1 + Number(Boolean(retry));
          throw new Error('Tarea pendiente ' + number + '. ' + (error as Error).message);
        }
      });
    } catch (error) {
      this.saveError.set((error as Error).message);
      return;
    }

    this.saving.set(true);
    try {
      for (const request of requests) {
        try {
          await firstValueFrom(this.taskService.createTask(this.projectId, request)
            .pipe(takeUntilDestroyed(this.destroyRef)));
        } catch (error) {
          if (!this.destroyRef.destroyed) this.showSaveFailure(request, error);
          return;
        }
        if (this.destroyRef.destroyed) return;
        this.rows.update(rows => rows.map(row => row.id === request.clientRequestId ? { ...row, saved: true } : row));
        this.retryRequest.set(null);
      }
      await this.router.navigate(['/projects', this.projectId, 'tasks']);
    } finally {
      if (!this.destroyRef.destroyed) this.saving.set(false);
    }
  }

  private currentAttempt(attempt: number): boolean {
    return !this.destroyRef.destroyed && attempt === this.attempt;
  }

  private newDraft(title: string): VoiceDraft {
    return { id: crypto.randomUUID(), title, estimateHours: 1, category: 'GENERAL', saved: false };
  }

  private showSaveFailure(request: TaskRequest, error: unknown): void {
    const status = error instanceof HttpErrorResponse ? error.status : undefined;
    if (this.retryRequest() || error instanceof TimeoutError || status === 0 || (status !== undefined && status >= 500)) {
      this.retryRequest.set(request);
      this.saveError.set('No pudimos confirmar el guardado de una tarea. Reintentá para comprobar la misma solicitud y guardar las que quedan.');
    } else if (status === 409) {
      this.saveError.set('No se pueden agregar tareas a un proyecto cerrado.');
    } else if (status === 404) {
      this.saveError.set('El proyecto no existe.');
    } else {
      this.saveError.set('No se pudo guardar una tarea. Revisá los datos e intentá de nuevo.');
    }
  }
}
