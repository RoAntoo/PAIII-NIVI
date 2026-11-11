import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TaskService } from '../../data-access/task-api.service';
import { TaskRequest, TaskStatus, TaskCategory, TASK_CATEGORIES, TASK_CATEGORY_LABELS } from '../../domain/task.models';
import { TimeoutError } from 'rxjs';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-task.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './create-task.component.css'
})
export class CreateTaskComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  projectId!: number;
  readonly categories = TASK_CATEGORIES;
  readonly categoryLabels = TASK_CATEGORY_LABELS;
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  readonly unknownOutcome = signal(false);
  private pendingRequest: TaskRequest | null = null;

  form = this.fb.group({
    title: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
    estimateHours: [null as number | null, [Validators.required, Validators.min(1), Validators.max(2147483647), Validators.pattern(/^[1-9]\d*$/)]],
    assignee: ['', Validators.maxLength(255)],
    status: ['TODO', Validators.required],
    category: ['GENERAL' as TaskCategory, Validators.required],
  });

  /** Reads the parent project identifier from the active route. */
  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
  }

  /** Validates and creates a task, treating a timeout as an unknown server outcome. */
  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.loading() || this.form.invalid || this.successMessage()) return;

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.pendingRequest ??= {
        id: null,
        title: this.form.value.title!.trim(),
        estimateHours: this.form.value.estimateHours!,
        assignee: this.form.value.assignee?.trim() || null,
        status: this.form.value.status as TaskStatus,
        category: this.form.value.category!,
        source: 'MANUAL',
        clientRequestId: crypto.randomUUID(),
      };
    this.form.disable();
    this.taskService
      .createTask(this.projectId, this.pendingRequest)
      .subscribe({
        next: () => {
          this.unknownOutcome.set(false);
          this.pendingRequest = null;
          this.loading.set(false);
          this.successMessage.set('Tarea creada exitosamente. Redirigiendo...');
          this.form.reset({ status: 'TODO', category: 'GENERAL' });
          setTimeout(() => {
            this.router.navigate(['/projects', this.projectId, 'tasks']);
          }, 2000);
        },
        error: (err) => {
          this.loading.set(false);
          if (err instanceof TimeoutError || err.status === 0 || err.status >= 500) {
            this.unknownOutcome.set(true);
            this.errorMessage.set('No pudimos confirmar si la tarea se guardó. Revisá la lista de tareas antes de reintentar. El reintento comprobará la misma solicitud sin duplicarla, aunque aún no aparezca en la lista.');
          } else if (err.status === 409) {
            this.unknownOutcome.set(false);
            this.pendingRequest = null;
            this.form.enable();
            this.errorMessage.set('No se pueden agregar tareas a un proyecto cerrado.');
          } else if (err.status === 404) {
            this.unknownOutcome.set(false);
            this.pendingRequest = null;
            this.form.enable();
            this.errorMessage.set('El proyecto no existe.');
          } else {
            this.unknownOutcome.set(false);
            this.pendingRequest = null;
            this.form.enable();
            this.errorMessage.set('Error al crear la tarea. Revisá los datos e intentá de nuevo.');
          }
        },
      });
  }
}
