import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ElementRef,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { TaskService } from '../../data-access/task-api.service';
import { TaskResponse, TASK_CATEGORY_LABELS } from '../../domain/task.models';
import { ConfirmationModalComponent } from '../../../../shared/ui/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LowerCasePipe, RouterLink, ConfirmationModalComponent],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly pendingDelete = signal<TaskResponse | null>(null);
  readonly isDeleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly categoryLabels = TASK_CATEGORY_LABELS;

  projectId: string = '';
  tasks = signal<TaskResponse[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  filterStatus = signal<string>('TODAS');

  // Computed signals para el dashboard de progreso y contadores
  totalTasks = computed(() => this.tasks().length);
  completedTasks = computed(() => this.tasks().filter(t => t.status === 'DONE').length);
  progressPercentage = computed(() => {
    const total = this.totalTasks();
    if (total === 0) return 0;
    return Math.round((this.completedTasks() / total) * 100);
  });
  
  todoCount = computed(() => this.tasks().filter(t => t.status === 'TODO').length);
  inProgressCount = computed(() => this.tasks().filter(t => t.status === 'IN_PROGRESS').length);
  doneCount = computed(() => this.tasks().filter(t => t.status === 'DONE').length);

  filteredTasks = computed(() => {
    const currentFilter = this.filterStatus();
    const allTasks = this.tasks();

    if (currentFilter === 'TODAS') {
      return allTasks;
    }
    return allTasks.filter(
      (t) => t.status && t.status.toLowerCase() === currentFilter.toLowerCase(),
    );
  });

  /** Reads the parent project and loads its tasks or reports an invalid route. */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');

    if (id) {
      this.projectId = id;
      this.loadTasks(id);
    } else {
      this.error.set('No se especificó un proyecto válido en la ruta.');
    }
  }

  /** Loads server tasks and exposes a recoverable error when the request fails. */
  loadTasks(projectId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.taskService.getTasksByProjectId(projectId).subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las tareas. Verificá la conexión y reintentá.');
        this.loading.set(false);
      },
    });
  }

  /** Updates the displayed task-status filter from the selected option. */
  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.filterStatus.set(selectElement.value);
  }

  /** Opens confirmation for a task without sending a deletion request. */
  requestDelete(task: TaskResponse): void {
    this.deleteError.set(null);
    this.pendingDelete.set(task);
  }

  /** Closes an idle confirmation dialog and restores focus to the task filter. */
  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.pendingDelete.set(null);
      this.host.nativeElement.querySelector<HTMLSelectElement>('#statusFilter')?.focus();
    }
  }

  /** Deletes a confirmed task, reconciles a missing task and retains recoverable failures. */
  confirmDelete(): void {
    const task = this.pendingDelete();
    if (!task || this.isDeleting()) return;
    this.isDeleting.set(true);
    this.deleteError.set(null);
    this.taskService.deleteTask(Number(this.projectId), task.id).subscribe({
      next: () => {
        this.tasks.update(tasks => tasks.filter(item => item.id !== task.id));
        this.pendingDelete.set(null);
        this.isDeleting.set(false);
        this.host.nativeElement.querySelector<HTMLSelectElement>('#statusFilter')?.focus();
      },
      error: (err) => {
        this.isDeleting.set(false);
        if (err.status === 404) {
          this.tasks.update(tasks => tasks.filter(item => item.id !== task.id));
          this.pendingDelete.set(null);
          this.host.nativeElement.querySelector<HTMLSelectElement>('#statusFilter')?.focus();
          return;
        }
        this.deleteError.set(err.status === 409
          ? 'No se pueden borrar tareas de un proyecto cerrado.'
          : 'No se pudo borrar la tarea. Verificá la conexión e intentá de nuevo.');
      },
    });
  }
}

