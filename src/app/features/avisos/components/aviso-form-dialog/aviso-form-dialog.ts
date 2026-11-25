import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Modal } from '../../../../shared/modal/modal';
import { Aviso, AvisoInput, ICONO_AVISO_DEFAULT, ICONOS_AVISO } from '../../models/aviso';
import { AvisosStore } from '../../services/avisos-store';

/** Fecha local de hoy en aaaa-mm-dd. */
function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Crear o editar un aviso general. Si recibe `aviso`, edita. */
@Component({
  selector: 'app-aviso-form-dialog',
  imports: [ReactiveFormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [title]="aviso() ? 'Editar aviso' : 'Nuevo aviso'"
      subtitle="Los avisos generales se muestran en la app a todos los miembros."
      [busy]="saving()"
      (closed)="closed.emit()"
    >
      <form id="aviso-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-5">
        @if (saveError(); as e) {
          <p role="alert" class="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{{ e }}</p>
        }
        <div>
          <label for="aviso-titulo" class="form-label"
            >Título <span class="text-danger">*</span></label
          >
          <input
            id="aviso-titulo"
            formControlName="titulo"
            maxlength="120"
            class="field"
            placeholder="Ej. Reunión General"
            [attr.aria-invalid]="showError('titulo')"
            aria-describedby="aviso-titulo-error"
          />
          @if (showError('titulo')) {
            <p id="aviso-titulo-error" class="form-error">
              Escribe el título (entre 3 y 120 caracteres).
            </p>
          }
        </div>

        <div>
          <label for="aviso-mensaje" class="form-label"
            >Mensaje <span class="text-danger">*</span></label
          >
          <textarea
            id="aviso-mensaje"
            formControlName="mensaje"
            rows="5"
            maxlength="1000"
            class="field resize-y"
            placeholder="¿Qué necesitan saber los miembros?"
            [attr.aria-invalid]="showError('mensaje')"
            aria-describedby="aviso-mensaje-error aviso-mensaje-count"
          ></textarea>
          <div class="mt-1 flex justify-between gap-3">
            @if (showError('mensaje')) {
              <p id="aviso-mensaje-error" class="form-error mt-0">
                Escribe el mensaje (entre 5 y 1000 caracteres).
              </p>
            } @else {
              <span></span>
            }
            <p id="aviso-mensaje-count" class="text-[11px] text-subtle">
              {{ form.controls.mensaje.value.length }}/1000
            </p>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label for="aviso-fecha" class="form-label"
              >Fecha <span class="text-danger">*</span></label
            >
            <input
              id="aviso-fecha"
              type="date"
              formControlName="fecha"
              class="field"
              [attr.aria-invalid]="showError('fecha')"
              aria-describedby="aviso-fecha-error"
            />
            @if (showError('fecha')) {
              <p id="aviso-fecha-error" class="form-error">Elige la fecha.</p>
            }
          </div>
          <div>
            <label for="aviso-icono" class="form-label">Icono en la app</label>
            <select id="aviso-icono" formControlName="icono" class="field">
              @for (i of iconos; track i.value) {
                <option [value]="i.value">{{ i.label }}</option>
              }
            </select>
          </div>
        </div>

        <div class="space-y-3">
          <div
            class="flex items-center justify-between gap-4 rounded-xl border border-line bg-field/50 px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-fg">Importante</p>
              <p class="text-xs text-muted">La app lo resalta y lo muestra primero ese día.</p>
            </div>
            <button
              type="button"
              role="switch"
              class="switch"
              [attr.aria-checked]="form.controls.importante.value"
              aria-label="Importante"
              (click)="toggle('importante')"
            ></button>
          </div>
          <div
            class="flex items-center justify-between gap-4 rounded-xl border border-line bg-field/50 px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-fg">Visible en la app</p>
              <p class="text-xs text-muted">Si lo ocultas, los miembros no lo verán.</p>
            </div>
            <button
              type="button"
              role="switch"
              class="switch"
              [attr.aria-checked]="form.controls.visible.value"
              aria-label="Visible en la app"
              (click)="toggle('visible')"
            ></button>
          </div>
        </div>
      </form>

      <div modal-footer>
        <button type="button" class="btn-ghost" (click)="closed.emit()" [disabled]="saving()">
          Cancelar
        </button>
        <button type="submit" form="aviso-form" class="btn-accent min-w-32" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : aviso() ? 'Guardar cambios' : 'Publicar aviso' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class AvisoFormDialog implements OnInit {
  private readonly store = inject(AvisosStore);

  readonly aviso = input<Aviso | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Aviso>();

  protected readonly iconos = ICONOS_AVISO;
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    mensaje: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(1000)]],
    fecha: [hoy(), [Validators.required]],
    icono: [ICONO_AVISO_DEFAULT],
    importante: [false],
    visible: [true],
  });

  ngOnInit(): void {
    const a = this.aviso();
    if (a) {
      this.form.reset({
        titulo: a.titulo,
        mensaje: a.mensaje,
        fecha: a.fecha,
        icono: a.icono,
        importante: a.importante,
        visible: a.visible,
      });
    }
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected toggle(name: 'importante' | 'visible'): void {
    const c = this.form.controls[name];
    c.setValue(!c.value);
    c.markAsDirty();
  }

  protected submit(): void {
    this.submitted.set(true);
    // Un mensaje solo con espacios no cuenta.
    const raw = this.form.getRawValue();
    if (this.form.invalid || raw.titulo.trim().length < 3 || raw.mensaje.trim().length < 5) {
      this.form.markAllAsTouched();
      if (raw.titulo.trim().length < 3) this.form.controls.titulo.setErrors({ required: true });
      if (raw.mensaje.trim().length < 5) this.form.controls.mensaje.setErrors({ required: true });
      setTimeout(() =>
        document.querySelector<HTMLElement>('#aviso-form [aria-invalid="true"]')?.focus(),
      );
      return;
    }
    const data: AvisoInput = { ...raw, titulo: raw.titulo.trim(), mensaje: raw.mensaje.trim() };
    const actual = this.aviso();
    const request = actual ? this.store.update(actual.id, data) : this.store.create(data);
    this.saving.set(true);
    this.saveError.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (a) => this.saved.emit(a),
      error: (err: unknown) =>
        this.saveError.set(err instanceof Error ? err.message : 'No se pudo guardar el aviso.'),
    });
  }
}
