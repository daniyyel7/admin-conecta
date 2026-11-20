import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CatalogosStore } from '../../../../core/catalogos/catalogos-store';
import { departamentos } from '../../../../core/catalogos/departamentos';
import { normalizar } from '../../../../shared/format';
import { Modal } from '../../../../shared/modal/modal';
import { Collection, CollectionInput } from '../../models/recurso';
import { ColeccionesStore } from '../../services/colecciones-store';

/** Crear o editar una colección. Si recibe `coleccion`, edita. */
@Component({
  selector: 'app-coleccion-form-dialog',
  imports: [ReactiveFormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [title]="coleccion() ? 'Editar colección' : 'Nueva colección'"
      subtitle="Una colección agrupa recursos (PDF, videos, audios, enlaces…) que se muestran juntos en la app."
      [busy]="saving()"
      (closed)="closed.emit()"
    >
      <form id="coleccion-form" [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-5">
        @if (saveError(); as e) {
          <p role="alert" class="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{{ e }}</p>
        }
        <div>
          <label for="col-title" class="form-label">Nombre <span class="text-danger">*</span></label>
          <input id="col-title" formControlName="title" maxlength="80" class="field" placeholder="Ej. Libros UMCH 2026" [attr.aria-invalid]="showError('title')" aria-describedby="col-title-error" />
          @if (showError('title')) {
            <p id="col-title-error" class="form-error">Escribe el nombre de la colección (mínimo 3 caracteres).</p>
          }
        </div>

        <div>
          <label for="col-description" class="form-label">Descripción <span class="text-danger">*</span></label>
          <textarea id="col-description" formControlName="description" rows="3" maxlength="300" class="field resize-y" placeholder="¿Qué encontrarán los miembros en esta colección?" [attr.aria-invalid]="showError('description')" aria-describedby="col-description-error"></textarea>
          @if (showError('description')) {
            <p id="col-description-error" class="form-error">Escribe una descripción.</p>
          }
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <label for="col-apartment" class="form-label">Departamento <span class="text-danger">*</span></label>
            <select id="col-apartment" formControlName="apartment" class="field" [attr.aria-invalid]="showError('apartment')" aria-describedby="col-apartment-error">
              <option value="" disabled>Selecciona…</option>
              @for (d of departamentos(); track d.id) {
                <option [value]="d.nombre">{{ d.nombre }}</option>
              }
            </select>
            @if (showError('apartment')) {
              <p id="col-apartment-error" class="form-error">Elige el departamento.</p>
            }
          </div>
          <div>
            <label for="col-category" class="form-label">Categoría <span class="text-danger">*</span></label>
            <select id="col-category" formControlName="category" class="field" [attr.aria-invalid]="showError('category')" aria-describedby="col-category-error">
              <option value="" disabled>Selecciona…</option>
              @for (c of categorias(); track c) {
                <option [value]="c">{{ c }}</option>
              }
            </select>
            @if (showError('category')) {
              <p id="col-category-error" class="form-error">Elige una categoría.</p>
            }
          </div>
          <div>
            <label for="col-date" class="form-label">Fecha <span class="text-danger">*</span></label>
            <input id="col-date" type="date" formControlName="date" class="field" [attr.aria-invalid]="showError('date')" aria-describedby="col-date-error" />
            @if (showError('date')) {
              <p id="col-date-error" class="form-error">Elige la fecha.</p>
            }
          </div>
          <div>
            <label for="col-location" class="form-label">Ubicación <span class="text-danger">*</span></label>
            <input id="col-location" formControlName="location" maxlength="100" class="field" placeholder="Ej. En línea" [attr.aria-invalid]="showError('location')" aria-describedby="col-location-error" />
            @if (showError('location')) {
              <p id="col-location-error" class="form-error">Indica la ubicación.</p>
            }
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 rounded-xl border border-line bg-field/50 px-4 py-3">
          <div>
            <p class="text-sm font-medium text-fg">Visible en la app</p>
            <p class="text-xs text-muted">Si la ocultas, los miembros no la verán.</p>
          </div>
          <button type="button" role="switch" class="switch" [attr.aria-checked]="form.controls.visible.value" aria-label="Visible en la app" (click)="toggleVisible()"></button>
        </div>

        <p class="text-xs text-subtle">El estado (Próximo, En curso o Finalizado) lo asigna el sistema según la fecha.</p>
      </form>

      <div modal-footer>
        <button type="button" class="btn-ghost" (click)="closed.emit()" [disabled]="saving()">Cancelar</button>
        <button type="submit" form="coleccion-form" class="btn-accent min-w-32" [disabled]="saving()">
          {{ saving() ? 'Guardando…' : coleccion() ? 'Guardar cambios' : 'Crear colección' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class ColeccionFormDialog implements OnInit {
  private readonly store = inject(ColeccionesStore);

  readonly coleccion = input<Collection | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Collection>();

  private readonly catalogos = inject(CatalogosStore);
  protected readonly departamentos = departamentos;
  /** Si la colección que se edita tiene una categoría que no está en la lista, se conserva como opción. */
  protected readonly categorias = computed(() => {
    const lista = this.catalogos.categorias().map((c) => c.nombre);
    const actual = this.coleccion()?.category;
    return actual && !lista.includes(actual) ? [...lista, actual] : lista;
  });
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.maxLength(300)]],
    apartment: ['', [Validators.required]],
    category: ['', [Validators.required]],
    date: ['', [Validators.required]],
    location: ['', [Validators.required, Validators.maxLength(100)]],
    visible: [true],
  });

  ngOnInit(): void {
    const c = this.coleccion();
    if (c) {
      this.form.reset({
        title: c.title,
        description: c.description,
        apartment: this.departamentos().find((d) => normalizar(d.nombre) === normalizar(c.apartment))?.nombre ?? c.apartment,
        category: c.category,
        date: c.date,
        location: c.location,
        visible: c.visible,
      });
    }
  }

  protected showError(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || this.submitted());
  }

  protected toggleVisible(): void {
    const c = this.form.controls.visible;
    c.setValue(!c.value);
    c.markAsDirty();
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() => document.querySelector<HTMLElement>('#coleccion-form [aria-invalid="true"]')?.focus());
      return;
    }
    const raw = this.form.getRawValue();
    const data: CollectionInput = {
      ...raw,
      title: raw.title.trim(),
      description: raw.description.trim(),
      location: raw.location.trim(),
    };
    const actual = this.coleccion();
    const request = actual ? this.store.updateCollection(actual.id, data) : this.store.createCollection(data);
    this.saving.set(true);
    this.saveError.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (col) => this.saved.emit(col),
      error: (err: unknown) =>
        this.saveError.set(err instanceof Error ? err.message : 'No se pudo guardar la colección.'),
    });
  }
}

