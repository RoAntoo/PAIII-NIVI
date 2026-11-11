import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../data-access/project-api.service';

import { ProjectUpdateRequest, ProjectResponse } from '../../domain/project.models';

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value;
  const end = control.get('endDate')?.value;
  if (start && end && end < start) {
    return { dateRange: true };
  }
  return null;
}

@Component({
  selector: 'app-update-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './update-project.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './update-project.component.css',
})
export class UpdateProjectComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);

  form!: FormGroup;
  projectId!: number;

  loading = signal(false);
  loadError = signal<string | null>(null);
  saveError = signal<string | null>(null);
  nameConflict = signal(false);

  ngOnInit(): void {
    this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));

    this.form = this.fb.group(
      {
        name: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]],
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        description: ['', Validators.maxLength(255)],
      },
      { validators: dateRangeValidator },
    );

    this.loadProject();
  }

  private loadProject(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.projectService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        this.form.patchValue({
          name: project.name,
          startDate: project.startDate,
          endDate: project.endDate,
          description: project.description ?? '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.loadError.set('Proyecto no encontrado.');
        } else {
          this.loadError.set('Error al cargar el proyecto. Intentá de nuevo.');
        }
      },
    });
  }

  onSubmit(): void {
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveError.set(null);
    this.nameConflict.set(false);
    this.loading.set(true);

    const body: ProjectUpdateRequest = { ...this.form.value, name: this.form.value.name.trim() };

    this.projectService.updateProject(this.projectId, body).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/projects']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 409 && err.error?.code === 'DUPLICATE_RESOURCE') {
          this.nameConflict.set(true);
        } else if (err.status === 400 || err.status === 409) {
          this.saveError.set(err.error?.message || 'Datos inválidos. Revisá los campos.');
        } else {
          this.saveError.set('Error al guardar. Intentá de nuevo.');
        }
      },
    });
  }
}
