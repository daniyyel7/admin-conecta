import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, startWith } from 'rxjs';
import { ArchivosService } from '../../../../core/api/archivos';
import { CatalogosStore } from '../../../../core/catalogos/catalogos-store';
import { ConfirmDialog } from '../../../../shared/confirm-dialog/confirm-dialog';
import { CanLeave } from '../../../../shared/unsaved-changes-guard';
import { departamentos, ESTADO_LABEL, EventoInput } from '../../models/evento';
import { EventosStore } from '../../services/eventos-store';

/** Si el catálogo aún no carga (la API define el límite real en tipos_recurso: image). */
const MAX_IMAGEN_MB = 10;

/** La fecha de fin no puede ser anterior a la de inicio. */
function rangoFechas(group: AbstractControl): ValidationErrors | null {
  const inicio = group.get('fechaInicio')?.value as string;
  const fin = group.get('fechaFin')?.value as string;
  return inicio && fin && fin < inicio ? { rangoFechas: true } : null;
}

/** Crear (`/eventos/nuevo`) y editar (`/eventos/:id/editar`) un evento. */
@Component({
  selector: 'app-evento-form',
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog],
  templateUrl: './evento-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export class EventoForm implements CanLeave {
  private readonly store = inject(EventosStore);
  private readonly router = inject(Router);
  private readonly archivos = inject(ArchivosService);
  private readonly catalogos = inject(CatalogosStore);

  /** Viene de la ruta `:id/editar` (withComponentInputBinding). */
  readonly id = input<string>();

  protected readonly departamentos = departamentos;
  protected readonly estadoLabel = ESTADO_LABEL;
  protected readonly maxImagenMb = computed(() => this.catalogos.limite('image')?.maxMb ?? MAX_IMAGEN_MB);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
      descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      departamentoId: ['', [Validators.required]],
      fechaInicio: ['', [Validators.required]],
      fechaFin: ['', [Validators.required]],
      ubicacion: ['', [Validators.required, Validators.maxLength(150)]],
      imagen: ['', [Validators.required]],
    },
    { validators: rangoFechas },
  );

  protected readonly isEdit = computed(() => !!this.id());
  protected readonly original = computed(() => {
    const id = this.id();
    return id ? this.store.eventos().find((e) => e.id === id) : undefined;
  });
  /** Edición de un ID que no existe (cuando ya terminó de cargar). */
  protected readonly notFound = computed(
    () => this.isEdit() && !this.store.loading() && this.store.total() > 0 && !this.original(),
  );

  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly imagenError = signal<string | null>(null);
  protected readonly subiendo = signal<number | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly leaveDialog = signal(false);
  private leaveResolver?: (ok: boolean) => void;
  private saved = false;

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), {
    requireSync: true,
  });
  protected readonly nombreLen = computed(() => this.value().nombre?.length ?? 0);
  protected readonly descripcionLen = computed(() => this.value().descripcion?.length ?? 0);
  protected readonly imagen = computed(() => this.value().imagen ?? '');

  constructor() {
    this.store.load();

    // Al editar, rellena el formulario una sola vez cuando el evento esté disponible.
    let patched = false;
    effect(() => {
      const evento = this.original();
      if (!evento || patched) return;
      patched = true;
      untracked(() => {
        this.form.reset({
          nombre: evento.nombre,
          descripcion: evento.descripcion ?? '',
          departamentoId: evento.departamentoId,
          fechaInicio: evento.fechaInicio,
          fechaFin: evento.fechaFin ?? '',
          ubicacion: evento.ubicacion,
          imagen: evento.imagen ?? '',
        });
      });
    });
  }

  /** Muestra el error de un campo si ya se tocó o se intentó guardar. */
  protected showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  // ---- Imagen de portada ----
  protected onImagenSelected(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.imagenError.set('El archivo debe ser una imagen (JPG, PNG o WebP).');
      return;
    }
    const maxMb = this.maxImagenMb();
    if (file.size > maxMb * 1024 * 1024) {
      this.imagenError.set(`La imagen pesa más de ${maxMb} MB.`);
      return;
    }
    this.imagenError.set(null);
    // Se sube a la API (imagenes/eventos/) y el evento guarda la URL que regresa.
    this.subiendo.set(0);
    this.archivos
      .subir(file, { destino: 'evento-portada' })
      .pipe(finalize(() => this.subiendo.set(null)))
      .subscribe({
        next: ({ progress, url }) => {
          this.subiendo.set(progress);
          if (url) {
            this.form.controls.imagen.setValue(url);
            this.form.controls.imagen.markAsDirty();
            this.form.controls.imagen.markAsTouched();
          }
        },
        error: (err: unknown) =>
          this.imagenError.set(err instanceof Error ? err.message : 'No se pudo subir la imagen.'),
      });
  }

  protected removeImagen(): void {
    this.form.controls.imagen.setValue('');
    this.form.controls.imagen.markAsDirty();
    this.form.controls.imagen.markAsTouched();
  }

  // ---- Guardar ----
  protected submit(): void {
    this.submitted.set(true);
    if (this.subiendo() !== null) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    const raw = this.form.getRawValue();
    const data: EventoInput = {
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim(),
      departamentoId: raw.departamentoId,
      // El estado no se envía: la API lo asigna según las fechas.
      fechaInicio: raw.fechaInicio,
      fechaFin: raw.fechaFin,
      ubicacion: raw.ubicacion.trim(),
      // El formulario ya no maneja etiquetas: se conservan las que tuviera el evento.
      etiquetas: this.original()?.etiquetas ?? [],
      imagen: raw.imagen,
    };

    const id = this.id();
    const request = id ? this.store.update(id, data) : this.store.create(data);
    this.saving.set(true);
    this.saveError.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (evento) => {
        this.saved = true;
        this.router.navigate(['/eventos'], {
          state: {
            toast: id ? `Se guardaron los cambios de "${evento.nombre}".` : `Se creó el evento "${evento.nombre}".`,
          },
        });
      },
      error: (err: unknown) =>
        this.saveError.set(err instanceof Error ? err.message : 'No se pudo guardar el evento.'),
    });
  }

  private focusFirstInvalid(): void {
    setTimeout(() =>
      document
        .querySelector<HTMLElement>('app-evento-form [aria-invalid="true"]')
        ?.focus(),
    );
  }

  // ---- Salir con cambios sin guardar ----
  canLeave(): boolean | Promise<boolean> {
    if (this.saved || !this.form.dirty) return true;
    this.leaveDialog.set(true);
    return new Promise((resolve) => (this.leaveResolver = resolve));
  }

  protected resolveLeave(ok: boolean): void {
    this.leaveDialog.set(false);
    this.leaveResolver?.(ok);
    this.leaveResolver = undefined;
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.saved && this.form.dirty) event.preventDefault();
  }
}
