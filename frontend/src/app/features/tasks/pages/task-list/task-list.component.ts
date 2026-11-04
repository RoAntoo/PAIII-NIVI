import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { TaskService } from '../../data-access/task-api.service';
import { TaskResponse } from '../../domain/task.models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LowerCasePipe, RouterLink],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('projectId');

    if (id) {
      this.projectId = id;
      this.loadTasks(id);
    } else {
      this.error.set('No se especificó un proyecto válido en la ruta.');
    }
  }

  loadTasks(projectId: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.taskService.getTasksByProjectId(projectId).subscribe({
      next: (data) => {
        this.tasks.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.filterStatus.set(selectElement.value);
  }
}

