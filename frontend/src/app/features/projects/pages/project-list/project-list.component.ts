import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  afterNextRender, Injector, ElementRef, viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LowerCasePipe } from '@angular/common';
import { ProjectService } from '../../data-access/project-api.service';

import { ProjectResponse } from '../../domain/project.models';
import { ConfirmationModalComponent } from '../../../../shared/ui/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [RouterLink, LowerCasePipe, ConfirmationModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css',
})
export class ProjectListComponent implements OnInit {
  private injector = inject(Injector);
  private statusFilter = viewChild.required<ElementRef<HTMLSelectElement>>('statusFilter');
  restoreModalOpener = signal(true);
  private projectService = inject(ProjectService);

  // Signals
  projects = signal<ProjectResponse[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  filterStatus = signal<string>('TODOS');
  isConfirmOpen = signal<boolean>(false);
  projectToDelete = signal<{ id: number; name: string } | null>(null);
  isDeleting = signal<boolean>(false);

  // Computed Signal para el mensaje de confirmación
  confirmMessage = computed(() => {
    const project = this.projectToDelete();
    return project ? `¿Estás seguro de que deseas eliminar el proyecto "${project.name}"?` : '';
  });

  // Computed Signal para el filtro
  filteredProjects = computed(() => {
    const currentFilter = this.filterStatus();
    const allProjects = this.projects();

    if (currentFilter === 'TODOS') {
      return allProjects;
    }
    return allProjects.filter((p) => p.status === currentFilter);
  });

  /** Loads projects on entry. */
  ngOnInit(): void {
    this.loadProjects();
  }

  /** Refreshes the list while preserving an explicit loading/error state. */
  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);

    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  /** Updates the client-side status filter. */
  onFilterChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.filterStatus.set(selectElement.value);
  }

  /** Opens confirmation and enables focus restoration for cancellation. */
  deleteProject(id: number, name: string): void {
    this.restoreModalOpener.set(true);
    this.projectToDelete.set({ id, name });
    this.isConfirmOpen.set(true);
  }

  /** Deletes the selected project and moves focus to the stable filter after closing. */
  confirmDelete(): void {
    const project = this.projectToDelete();
    if (!project) return;

    this.isDeleting.set(true);
    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.restoreModalOpener.set(false);
        this.isConfirmOpen.set(false);
        this.isDeleting.set(false);
        this.projectToDelete.set(null);
        this.loadProjects();
        afterNextRender(() => this.statusFilter().nativeElement.focus(), { injector: this.injector });
      },
      error: (err: Error) => {
        this.isConfirmOpen.set(false);
        this.isDeleting.set(false);
        this.projectToDelete.set(null);
        this.error.set(`Error al eliminar el proyecto: ${err.message}`);
      }
    });
  }

  /** Closes confirmation without deleting or changing the opener focus policy. */
  cancelDelete(): void {
    this.isConfirmOpen.set(false);
    this.projectToDelete.set(null);
  }
}
