import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { IonButton, IonSpinner } from '@ionic/angular';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, IonButton, IonSpinner],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.loading() || this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const requested = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        const safe = requested.startsWith('/') && !requested.startsWith('//')
          && !requested.startsWith('/\\') && !requested.startsWith('/login');
        void this.router.navigateByUrl(safe ? requested : '/');
      },
      error: error => {
        this.loading.set(false);
        this.error.set(error.status === 401 ? 'Usuario o contraseña incorrectos.'
          : 'No se pudo iniciar sesión. Intentá nuevamente.');
      },
    });
  }
}
