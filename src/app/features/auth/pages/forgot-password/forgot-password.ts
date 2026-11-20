import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Auth } from '../../../../core/auth/auth';
import { AuthHeader } from '../../components/auth-header/auth-header';
import { ThemeSwitcher } from '../../../../shared/theme-switcher/theme-switcher';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthHeader, ThemeSwitcher],
  templateUrl: './forgot-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ForgotPassword {
  private readonly auth = inject(Auth);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Correo al que se envió el enlace; `null` mientras no se haya enviado. */
  protected readonly sentTo = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    this.error.set(null);
    this.loading.set(true);

    this.auth
      .requestPasswordReset(email)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.sentTo.set(email),
        error: () => this.error.set('No pudimos enviar el enlace. Inténtalo de nuevo.'),
      });
  }

  protected resend(): void {
    this.submit();
  }

  protected changeEmail(): void {
    this.sentTo.set(null);
  }
}
