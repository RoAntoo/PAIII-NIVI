import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../../projects/data-access/project-api.service';

import { ProjectResponse } from '../../../projects/domain/project.models';
import { TaskService } from '../../../tasks/data-access/task-api.service';
import { TaskResponse } from '../../../tasks/domain/task.models';
import { forkJoin, map } from 'rxjs';

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

  projects = signal<ProjectResponse[]>([]);
  recentTasks = signal<RecentTaskItem[]>([]);
  loading = signal<boolean>(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.projectService.getProjects().subscribe({
      next: (projectsData) => {
        // Guardamos los primeros 3 proyectos
        this.projects.set(projectsData.slice(0, 3));
        
        // Si no hay proyectos, dejamos de cargar
        if (projectsData.length === 0) {
          this.loading.set(false);
          return;
        }

        // Cargar tareas de todos los proyectos para armar la Actividad Reciente
        const taskRequests = projectsData.map((p) =>
          this.taskService.getTasksByProjectId(p.id).pipe(
            map((tasks) =>
              tasks.map((t) => ({
                ...t,
                projectName: p.name,
                projectId: p.id,
              }))
            )
          )
        );

        forkJoin(taskRequests).subscribe({
          next: (results) => {
            // results es una matriz de arrays de tareas, la aplanamos
            const allTasks = results.flat();

            // Las ordenamos por fecha de creación de más reciente a más antigua
            allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            // Tomamos las primeras 4 tareas más recientes
            this.recentTasks.set(allTasks.slice(0, 4));
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.loading.set(false);
      },
    });
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
