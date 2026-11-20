import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize, startWith } from 'rxjs';
import { Auth, ResetTokenInvalidError } from '../../../../core/auth/auth';
import { passwordRulesValidator, passwordsMatch } from '../../../../core/auth/password-rules';
import { PasswordChecklist } from '../../../../shared/password-checklist/password-checklist';
import { ThemeSwitcher } from '../../../../shared/theme-switcher/theme-switcher';
import { AuthHeader } from '../../components/auth-header/auth-header';

type Paso = 'validando' | 'invalido' | 'formulario' | 'listo';

/** Pantalla que abre el enlace del correo: `/restablecer-contrasena?token=XXXX`. */
@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthHeader, ThemeSwitcher, PasswordChecklist],
  templateUrl: './reset-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ResetPassword implements OnInit {
  private readonly auth = inject(Auth);

  /** Parámetro `?token=` del enlace (withComponentInputBinding). */
  readonly token = input<string>('');

  protected readonly paso = signal<Paso>('validando');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, passwordRulesValidator]],
      confirm: ['', [Validators.required]],
    },
    { validators: passwordsMatch() },
  );

  protected readonly passwordValue = toSignal(
    this.form.controls.password.valueChanges.pipe(startWith('')),
    { requireSync: true },
  );

  ngOnInit(): void {
    this.auth.validateResetToken(this.token()).subscribe({
      next: () => this.paso.set('formulario'),
      error: () => this.paso.set('invalido'),
    });
  }

  protected showError(name: 'password' | 'confirm'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected mismatch(): boolean {
    return this.form.hasError('mismatch') && (this.form.controls.confirm.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set(null);
    this.loading.set(true);
    this.auth
      .resetPassword(this.token(), this.form.controls.password.value)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.paso.set('listo'),
        error: (err: unknown) => {
          if (err instanceof ResetTokenInvalidError) this.paso.set('invalido');
          else this.error.set('No se pudo guardar la contraseña. Inténtalo de nuevo.');
        },
      });
  }
}
