import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../../data-access/task-api.service';
import { TaskResponse, TaskStatus, TaskCategory, TASK_CATEGORIES, TASK_CATEGORY_LABELS } from '../../domain/task.models';
import { TaskPlacesComponent } from '../task-places/task-places.component';
import { TaskReminderComponent } from '../task-reminder/task-reminder.component';

@Component({
  selector: 'app-update-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TaskPlacesComponent, TaskReminderComponent],
  templateUrl: './update-task.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './update-task.component.css'
})
export class UpdateTaskComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private readonly destroyRef = inject(DestroyRef);
  private loadRequest?: Subscription;
  private saveRequest?: Subscription;

  projectId!: number;
  taskId!: number;
  readonly categories = TASK_CATEGORIES;
  readonly categoryLabels = TASK_CATEGORY_LABELS;

  // Estado local con signals
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);
  task = signal<TaskResponse | null>(null);
  readonly selectedPlaceId = signal<string | null>(null);
  private placeChanged = false;
  readonly reminderAt = signal<string | null>(null);
  readonly reminder = viewChild(TaskReminderComponent);
  private reminderChanged = false;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.pattern(/\S+/), Validators.maxLength(255)]],
    estimateHours: [1, [Validators.required, Validators.min(1), Validators.max(2147483647), Validators.pattern(/^[1-9]\d*$/)]],
    assignee: ['', Validators.maxLength(255)],
    status: ['TODO' as TaskStatus, Validators.required],
    category: ['GENERAL' as TaskCategory, Validators.required],
  });

  /** Resolves the project/task route and loads the editable task. */
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const projectId = Number(params.get('projectId'));
      const taskId = Number(params.get('taskId'));
      if (projectId === this.projectId && taskId === this.taskId) return;
      this.loadRequest?.unsubscribe();
      this.saveRequest?.unsubscribe();
      this.projectId = projectId;
      this.taskId = taskId;
      this.task.set(null);
      this.isSaving.set(false);
      this.selectedPlaceId.set(null);
      this.reminderAt.set(null);
      this.placeChanged = false;
      this.reminderChanged = false;
      this.form.reset({ estimateHours: 1, status: 'TODO', category: 'GENERAL' });
      this.loadTask();
    });
  }

  /** Loads the task and retains its original values for partial updates. */
  loadTask(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.loadRequest?.unsubscribe();
    this.loadRequest = this.taskService.getTask(this.projectId, this.taskId)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (task) => {
        this.task.set(task);
        this.selectedPlaceId.set(task.placeId ?? null);
        this.placeChanged = false;
        this.reminderAt.set(task.reminderAt ?? null);
        this.reminderChanged = false;
        this.form.patchValue({
          title: task.title,
          estimateHours: task.estimateHours,
          assignee: task.assignee ?? '',
          status: task.status,
          category: task.category,
        });
        this.isLoading.set(false);
      },
      error: (err) => {
        if (err.status === 404 && this.route.snapshot.queryParamMap?.get('fromReminder')) {
          void this.router.navigate(['/projects', this.projectId, 'tasks']);
          return;
        }
        const msg =
          err.status === 404
            ? 'Tarea no encontrada.'
            : 'Error al cargar la tarea. Intentá de nuevo.';
        this.errorMessage.set(msg);
        this.isLoading.set(false);
      },
    });
  }

  changePlace(placeId: string | null): void {
    this.selectedPlaceId.set(placeId);
    this.placeChanged = true;
  }

  changeReminder(value: string | null): void {
    this.reminderAt.set(value);
    this.reminderChanged = true;
  }

  /** Includes explicitly touched fields on retries after an uncertain save. */
  onSubmit(): void {
    if (this.isSaving() || this.form.invalid || !this.task() || this.reminder()?.checking()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const { title, estimateHours, assignee, status, category } = this.form.getRawValue();
    const placeId = this.selectedPlaceId();

    this.saveRequest = this.taskService
      .updateTask(this.projectId, this.taskId, {
        title: title!.trim(),
        estimateHours: estimateHours!,
        assignee: assignee?.trim() || null,
        ...(this.form.controls.status.dirty || status !== this.task()!.status ? { status: status! } : {}),
        ...(this.form.controls.category.dirty || category !== this.task()!.category ? { category: category! } : {}),
        ...(this.placeChanged ? { placeId } : {}),
        ...(this.reminderChanged ? { reminderAt: this.reminderAt() } : {}),
      }, this.task()?.version)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/projects', this.projectId, 'tasks']);
        },
        error: (err) => {
          const msg = err.status === 412 ? 'La tarea cambió. Volvé al listado y abrila para revisar los datos actuales.'
            : err.error?.message || 'Ocurrió un error al guardar. Intentá de nuevo.';
          this.errorMessage.set(msg);
          this.isSaving.set(false);
        },
      });
  }
}
