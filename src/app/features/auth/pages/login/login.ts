import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Auth } from '../../../../core/auth/auth';
import { AuthHeader } from '../../components/auth-header/auth-header';
import { ThemeSwitcher } from '../../../../shared/theme-switcher/theme-switcher';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthHeader, ThemeSwitcher],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.loading.set(true);

    this.auth
      .login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl('/'),
        error: (err: unknown) =>
          this.error.set(err instanceof Error ? err.message : 'No se pudo iniciar sesión.'),
      });
  }
}
