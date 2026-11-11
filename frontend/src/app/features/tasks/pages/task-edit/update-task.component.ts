import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskService } from '../../data-access/task-api.service';
import { TaskResponse, TaskStatus, TaskCategory, TASK_CATEGORIES, TASK_CATEGORY_LABELS } from '../../domain/task.models';

@Component({
  selector: 'app-update-task',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './update-task.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './update-task.component.css'
})
export class UpdateTaskComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);

  projectId!: number;
  taskId!: number;
  readonly categories = TASK_CATEGORIES;
  readonly categoryLabels = TASK_CATEGORY_LABELS;

  // Estado local con signals
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);
  task = signal<TaskResponse | null>(null);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.pattern(/\S+/), Validators.maxLength(255)]],
    estimateHours: [1, [Validators.required, Validators.min(1), Validators.max(2147483647), Validators.pattern(/^[1-9]\d*$/)]],
    assignee: ['', Validators.maxLength(255)],
    status: ['TODO' as TaskStatus, Validators.required],
    category: ['GENERAL' as TaskCategory, Validators.required],
  });

  /** Resolves the project/task route and loads the editable task. */
  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
    this.taskId = Number(this.route.snapshot.paramMap.get('taskId'));
    this.loadTask();
  }

  /** Loads the task and retains its original values for partial updates. */
  loadTask(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.taskService.getTask(this.projectId, this.taskId).subscribe({
      next: (task) => {
        this.task.set(task);
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
        const msg =
          err.status === 404
            ? 'Tarea no encontrada.'
            : 'Error al cargar la tarea. Intentá de nuevo.';
        this.errorMessage.set(msg);
        this.isLoading.set(false);
      },
    });
  }

  /** Saves changed or explicitly touched status/category, preserving user intent across uncertain retries. */
  onSubmit(): void {
    if (this.isSaving() || this.form.invalid || !this.task()) { this.form.markAllAsTouched(); return; }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const { title, estimateHours, assignee, status, category } = this.form.getRawValue();

    this.taskService
      .updateTask(this.projectId, this.taskId, {
        title: title!.trim(),
        estimateHours: estimateHours!,
        assignee: assignee?.trim() || null,
        ...(this.form.controls.status.dirty || status !== this.task()!.status ? { status: status! } : {}),
        ...(this.form.controls.category.dirty || category !== this.task()!.category ? { category: category! } : {}),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/projects', this.projectId, 'tasks']);
        },
        error: (err) => {
          const msg = err.error?.message || 'Ocurrió un error al guardar. Intentá de nuevo.';
          this.errorMessage.set(msg);
          this.isSaving.set(false);
        },
      });
  }
}
