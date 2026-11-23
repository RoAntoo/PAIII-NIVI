import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DeviceCapabilitiesService, VOICE_MODULE } from '../../../../core/device/device-capabilities.service';
import { SpeechLanguage, SpeechService } from '../../../../core/device/speech.service';
import { SettingsService } from '../../../../core/settings/settings.service';
import { TaskDraft, TaskDraftBatch } from '../../data-access/task-draft-batch';
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS, TaskCategory } from '../../domain/task.models';
import { parseTaskText } from '../../domain/task-text-parser';

type DictationPhase = 'idle' | 'preparing' | 'listening' | 'stopping' | 'canceling';

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
  providers: [TaskDraftBatch],
  templateUrl: './voice-tasks.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceTasksComponent {
  private readonly speech = inject(SpeechService);
  private readonly preferences = inject(SettingsService);
  private readonly capabilities = inject(DeviceCapabilitiesService);
  private readonly batch = inject(TaskDraftBatch);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly projectId = Number(inject(ActivatedRoute).snapshot.paramMap.get('projectId'));
  readonly validProject = Number.isSafeInteger(this.projectId) && this.projectId > 0;
  readonly phase = signal<DictationPhase>('idle');
  readonly speechMessage = signal<string | null>(null);
  readonly saving = this.batch.saving;
  readonly saveError = this.batch.error;
  readonly rows = this.batch.rows;
  readonly reviewing = signal(false);
  readonly retryRequest = this.batch.retryRequest;
  readonly categories = TASK_CATEGORIES;
  readonly categoryLabels = TASK_CATEGORY_LABELS;
  readonly preferencesLoading = this.preferences.loading.asReadonly();
  readonly canDictate = computed(() => this.validProject && this.preferences.loaded()
    && this.capabilities.moduleAvailable(VOICE_MODULE, this.preferences.settings()));
  readonly unavailableMessage = computed(() => this.preferences.loaded()
    ? this.capabilities.status(VOICE_MODULE, this.preferences.settings())
    : 'No se pudieron leer tus preferencias. Podés recuperarlas desde Ajustes.');
  readonly savedCount = this.batch.savedCount;
  readonly pendingCount = this.batch.pendingCount;

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
      this.rows.update(rows => [...rows, ...titles.map(title => this.batch.draft(title))]);
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
    this.rows.update(rows => [...rows, this.batch.draft('')]);
  }

  updateRow(row: TaskDraft, changes: Partial<Pick<TaskDraft, 'title' | 'estimateHours' | 'category'>>): void {
    this.rows.update(rows => rows.map(entry => entry.id === row.id ? { ...entry, ...changes } : entry));
  }

  changeCategory(row: TaskDraft, value: string): void {
    const category = this.categories.find(entry => entry === value);
    if (category) this.updateRow(row, { category });
  }

  removeRow(row: TaskDraft): void {
    this.rows.update(rows => rows.filter(entry => entry.id !== row.id));
  }

  splitRow(row: TaskDraft, cursor: number): void {
    const before = row.title.slice(0, cursor).trim();
    const after = row.title.slice(cursor).trim();
    if (!before || !after) {
      this.saveError.set('Ubicá el cursor entre las dos partes del título para dividirlo.');
      return;
    }
    const second = { ...this.batch.draft(after), category: row.category };
    this.rows.update(rows => rows.flatMap(entry => entry.id === row.id
      ? [{ ...entry, title: before }, second] : [entry]));
    this.saveError.set(null);
  }

  joinWithPrevious(row: TaskDraft, previous: TaskDraft): void {
    const title = [previous.title.trim(), row.title.trim()].filter(Boolean).join(' ');
    this.rows.update(rows => rows.filter(entry => entry.id !== row.id)
      .map(entry => entry.id === previous.id ? { ...entry, title } : entry));
    this.saveError.set(null);
  }

  async save(): Promise<void> {
    if (!this.canDictate() || this.phase() !== 'idle') return;
    if (await this.batch.save(this.projectId, 'VOZ')) {
      await this.router.navigate(['/projects', this.projectId, 'tasks']);
    }
  }

  private currentAttempt(attempt: number): boolean {
    return !this.destroyRef.destroyed && attempt === this.attempt;
  }
}
