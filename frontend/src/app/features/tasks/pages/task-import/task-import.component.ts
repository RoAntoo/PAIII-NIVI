import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DeviceCapabilitiesService, OCR_MODULE, QR_MODULE } from '../../../../core/device/device-capabilities.service';
import { OcrService, PhotoSource, QrService } from '../../../../core/device/task-import.service';
import { SettingsService } from '../../../../core/settings/settings.service';
import { TaskDraft, TaskDraftBatch } from '../../data-access/task-draft-batch';
import { QrTemplateError, parseNiviTaskQr, readTaskLines } from '../../domain/task-import-parser';
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS } from '../../domain/task.models';

const importErrors: Readonly<Record<string, string>> = {
  PERMISSION: 'La cámara está deshabilitada. Podés habilitarla en los permisos de Android.',
  IMAGE_FORMAT: 'Elegí una imagen JPEG, PNG o WebP.',
  IMAGE_LIMIT: 'La imagen supera el límite de 20 MB o las dimensiones admitidas. Elegí una más chica.',
  IMAGE_READ: 'No se pudo leer la foto. Probá sacar otra o elegirla de la galería.',
  OCR_FAILED: 'No se pudo procesar la foto. Probá con mejor luz y enfocá bien la lista.',
  QR_FORMAT: 'El código no es una plantilla NIVI compatible.',
  UNAVAILABLE: 'Esta acción no está disponible en el dispositivo. Podés escribir la tarea.',
  BUSY: 'Hay una importación en curso. Esperá un momento y volvé a intentar.',
};

@Component({
  selector: 'app-task-import',
  imports: [RouterLink],
  providers: [TaskDraftBatch],
  templateUrl: './task-import.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskImportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly preferences = inject(SettingsService);
  private readonly capabilities = inject(DeviceCapabilitiesService);
  private readonly ocr = inject(OcrService);
  private readonly scanner = inject(QrService);
  private readonly batch = inject(TaskDraftBatch);
  private readonly lifetime = new AbortController();

  readonly projectId = Number(this.route.snapshot.paramMap.get('projectId'));
  readonly validProject = Number.isSafeInteger(this.projectId) && this.projectId > 0;
  readonly isQr = this.route.snapshot.data['source'] === 'QR';
  readonly module = this.isQr ? QR_MODULE : OCR_MODULE;
  readonly title = this.isQr ? 'Escanear plantilla QR' : 'Escanear lista (OCR)';
  readonly available = computed(() => this.validProject && this.preferences.loaded()
    && this.capabilities.moduleAvailable(this.module, this.preferences.settings()));
  readonly preferencesLoading = this.preferences.loading.asReadonly();
  readonly unavailableMessage = computed(() => this.preferences.loaded()
    ? this.capabilities.status(this.module, this.preferences.settings())
    : 'No se pudieron leer tus preferencias. Podés recuperarlas desde Ajustes.');
  readonly importing = signal(false);
  readonly reviewed = signal(false);
  readonly importError = signal<string | null>(null);
  readonly rows = this.batch.rows;
  readonly saving = this.batch.saving;
  readonly savedCount = this.batch.savedCount;
  readonly pendingCount = this.batch.pendingCount;
  readonly retryRequest = this.batch.retryRequest;
  readonly saveError = this.batch.error;
  readonly categories = TASK_CATEGORIES;
  readonly categoryLabels = TASK_CATEGORY_LABELS;
  readonly canReplace = computed(() => !this.saving() && !this.importing()
    && !this.savedCount() && !this.retryRequest());

  constructor() {
    this.destroyRef.onDestroy(() => this.lifetime.abort());
  }

  async read(source: PhotoSource = 'gallery'): Promise<void> {
    if (!this.available() || !this.canReplace()) return;
    this.importing.set(true);
    this.importError.set(null);
    try {
      const drafts = this.isQr
        ? [this.asQrDraft(parseNiviTaskQr(await this.scanner.scan(this.lifetime.signal)))]
        : readTaskLines(await this.ocr.recognizeImage(source, this.lifetime.signal))
          .map(line => this.batch.draft(line.title, { originalTitle: line.originalTitle }));
      if (this.destroyRef.destroyed || !this.available()) return;
      if (!drafts.length) {
        this.importError.set('No se encontró texto. Probá otra foto con buena luz y la lista enfocada.');
      } else if (drafts.length > 100) {
        this.importError.set('La foto contiene más de 100 líneas. Probá con una sección más chica de la lista.');
      } else {
        this.rows.set(drafts);
        this.reviewed.set(true);
        this.saveError.set(null);
      }
    } catch (error) {
      if (this.destroyRef.destroyed) return;
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
      if (code === 'CANCELED') return;
      const message = error instanceof QrTemplateError ? error.message
        : typeof code === 'string' && Object.hasOwn(importErrors, code) ? importErrors[code]
          : 'La importación se interrumpió. Podés volver a intentar.';
      this.importError.set(message);
    } finally {
      if (!this.destroyRef.destroyed) this.importing.set(false);
    }
  }

  private asQrDraft(template: ReturnType<typeof parseNiviTaskQr>): TaskDraft {
    return this.batch.draft(template.title, { estimateHours: template.estimateHours, category: template.category });
  }

  addRow(): void {
    this.rows.update(rows => [...rows, this.batch.draft('')]);
  }

  update(row: TaskDraft, changes: Partial<Pick<TaskDraft, 'title' | 'estimateHours' | 'category' | 'selected'>>): void {
    this.rows.update(rows => rows.map(entry => entry.id === row.id ? { ...entry, ...changes } : entry));
  }

  changeCategory(row: TaskDraft, value: string): void {
    const category = this.categories.find(entry => entry === value);
    if (category) this.update(row, { category });
  }

  remove(row: TaskDraft): void {
    this.rows.update(rows => rows.filter(entry => entry.id !== row.id));
  }

  async save(): Promise<void> {
    if (!this.available() || this.importing()) return;
    if (await this.batch.save(this.projectId, this.isQr ? 'QR' : 'OCR')) {
      await this.router.navigate(['/projects', this.projectId, 'tasks']);
    }
  }
}
