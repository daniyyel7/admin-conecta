import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize, startWith } from 'rxjs';
import { Auth } from '../../core/auth/auth';
import { passwordRulesValidator, passwordsMatch } from '../../core/auth/password-rules';
import { Modal } from '../../shared/modal/modal';
import { PasswordChecklist } from '../../shared/password-checklist/password-checklist';

/** La nueva contraseña no puede ser igual a la actual. */
function distintaDeLaActual(group: AbstractControl): ValidationErrors | null {
  const actual = group.get('current')?.value;
  const nueva = group.get('password')?.value;
  return actual && nueva && actual === nueva ? { sameAsCurrent: true } : null;
}

/** Cambiar la contraseña del usuario con sesión iniciada (menú de perfil). */
@Component({
  selector: 'app-change-password-dialog',
  imports: [ReactiveFormsModule, Modal, PasswordChecklist],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Cambiar contraseña" [busy]="saving()" (closed)="closed.emit()">
      @if (done()) {
        <div class="flex flex-col items-center py-4 text-center" role="status">
          <div class="grid size-12 place-items-center rounded-full bg-success/10 text-success">
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
          </div>
          <p class="mt-4 text-sm font-semibold text-fg">Tu contraseña se actualizó</p>
          <p class="mt-1 text-xs text-muted">La próxima vez que inicies sesión usa la nueva contraseña.</p>
        </div>
      } @else {
        <form id="change-password-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-5">
          <div>
            <label for="cp-current" class="form-label">Contraseña actual</label>
            <input id="cp-current" [type]="show() ? 'text' : 'password'" formControlName="current" autocomplete="current-password" class="field" [attr.aria-invalid]="showError('current') || !!serverError()" />
            @if (showError('current')) {
              <p class="form-error">Escribe tu contraseña actual.</p>
            } @else if (serverError(); as e) {
              <p class="form-error" role="alert">{{ e }}</p>
            }
          </div>

          <div>
            <label for="cp-password" class="form-label">Nueva contraseña</label>
            <input id="cp-password" [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" class="field" [attr.aria-invalid]="showError('password') || sameAsCurrent()" aria-describedby="cp-rules" />
            <app-password-checklist id="cp-rules" [value]="passwordValue()" />
            @if (showError('password') && form.controls.password.hasError('required')) {
              <p class="form-error">Escribe la nueva contraseña.</p>
            } @else if (sameAsCurrent()) {
              <p class="form-error">La nueva contraseña debe ser diferente a la actual.</p>
            }
          </div>

          <div>
            <label for="cp-confirm" class="form-label">Confirmar nueva contraseña</label>
            <input id="cp-confirm" [type]="show() ? 'text' : 'password'" formControlName="confirm" autocomplete="new-password" class="field" [attr.aria-invalid]="showError('confirm') || mismatch()" />
            @if (showError('confirm')) {
              <p class="form-error">Vuelve a escribir la nueva contraseña.</p>
            } @else if (mismatch()) {
              <p class="form-error">Las contraseñas no coinciden.</p>
            }
          </div>

          <label class="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" class="check" [checked]="show()" (change)="show.set(!show())" />
            Mostrar contraseñas
          </label>
        </form>
      }

      <div modal-footer>
        @if (done()) {
          <button type="button" class="btn-accent min-w-28" (click)="closed.emit()">Listo</button>
        } @else {
          <button type="button" class="btn-ghost" (click)="closed.emit()" [disabled]="saving()">Cancelar</button>
          <button type="submit" form="change-password-form" class="btn-accent min-w-40" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Cambiar contraseña' }}
          </button>
        }
      </div>
    </app-modal>
  `,
})
export class ChangePasswordDialog {
  private readonly auth = inject(Auth);
  readonly closed = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      current: ['', [Validators.required]],
      password: ['', [Validators.required, passwordRulesValidator]],
      confirm: ['', [Validators.required]],
    },
    { validators: [passwordsMatch(), distintaDeLaActual] },
  );

  protected readonly passwordValue = toSignal(
    this.form.controls.password.valueChanges.pipe(startWith('')),
    { requireSync: true },
  );
  protected readonly show = signal(false);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly done = signal(false);

  constructor() {
    // Si cambia la contraseña actual, se quita el error que haya dado el servidor.
    this.form.controls.current.valueChanges.subscribe(() => this.serverError.set(null));
  }

  protected showError(name: 'current' | 'password' | 'confirm'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected mismatch(): boolean {
    return this.form.hasError('mismatch') && (this.form.controls.confirm.touched || this.submitted());
  }

  protected sameAsCurrent(): boolean {
    return this.form.hasError('sameAsCurrent') && (this.form.controls.password.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() =>
        document.querySelector<HTMLElement>('#change-password-form [aria-invalid="true"]')?.focus(),
      );
      return;
    }
    const { current, password } = this.form.getRawValue();
    this.saving.set(true);
    this.auth
      .changePassword(current, password)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.done.set(true),
        error: (err: unknown) => {
          this.serverError.set(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.');
          setTimeout(() => document.querySelector<HTMLElement>('#cp-current')?.focus());
        },
      });
  }
}
