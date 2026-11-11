import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../data-access/project-api.service';
import { ProjectRequest, ProjectStatus } from '../../domain/project.models';

import { dateValidator } from '../../validators/project-dates';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './project-create.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './project-create.component.css'
})
export class ProjectCreateComponent {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  projectForm = this.fb.group(
    {
      name: this.fb.control('', { validators: Validators.required, nonNullable: true }),
      startDate: this.fb.control('', { validators: Validators.required, nonNullable: true }),
      endDate: this.fb.control('', { validators: Validators.required, nonNullable: true }),
      status: this.fb.control<ProjectStatus>('PLANNED', {
        validators: Validators.required,
        nonNullable: true,
      }),
      description: this.fb.control(''),
    },
    { validators: dateValidator },
  );

  onSubmit() {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const formValue = this.projectForm.getRawValue();
    const request: ProjectRequest = {
      id: null,
      name: formValue.name,
      startDate: formValue.startDate,
      endDate: formValue.endDate,
      status: formValue.status,
      description: formValue.description || undefined,
    };

    this.projectService.createProject(request).subscribe({
      next: () => {
        this.loading.set(false);
        this.error.set(null);
        this.success.set('¡Proyecto creado con éxito! Redirigiendo...');

        this.projectForm.reset({ status: 'PLANNED' });

        setTimeout(() => {
          this.router.navigate(['/projects']);
        }, 2000);
      },
      error: (err) => {
        this.loading.set(false);
        this.success.set(null);

        if (err.status === 409) {
          this.error.set('Recurso duplicado: El nombre del proyecto ya existe.');
        } else if (err.status === 400) {
          this.error.set('Error de validación: Revisa los datos ingresados.');
        } else {
          this.error.set('Ocurrió un error inesperado al intentar crear el proyecto.');
        }
      },
    });
  }
}
