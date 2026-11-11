import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../../projects/data-access/project-api.service';

import { ProjectResponse } from '../../../projects/domain/project.models';
import { TaskService } from '../../../tasks/data-access/task-api.service';
import { TaskResponse } from '../../../tasks/domain/task.models';
import { forkJoin } from 'rxjs';

interface RecentTaskItem extends TaskResponse {
  projectName: string;
  projectId: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  error = signal<string | null>(null);

  projects = signal<ProjectResponse[]>([]);
  recentTasks = signal<RecentTaskItem[]>([]);
  loading = signal<boolean>(false);

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({projects: this.projectService.getProjects(3), recent: this.taskService.getRecentTasks()}).subscribe({
      next: ({projects, recent}) => {
        this.projects.set(projects);
        this.recentTasks.set(recent.map(item => ({...item.task, projectId: item.projectId, projectName: item.projectName})));
        this.loading.set(false);
      },
      error: () => {this.error.set('No se pudo cargar el inicio. Intentá nuevamente.'); this.loading.set(false);}
    });
  }

  progress(project: ProjectResponse): number {
    return project.totalTasks > 0 ? Math.round(project.completedTasks / project.totalTasks * 100) : 0;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PLANNED':
        return 'Planificado';
      case 'ACTIVE':
        return 'En progreso';
      case 'CLOSED':
        return 'Cerrado';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getTaskStatusLabel(status: string): string {
    switch (status) {
      case 'TODO':
        return 'Pendiente';
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'DONE':
        return 'Completada';
      default:
        return status;
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' ' + date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
