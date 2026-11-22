import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import { CatalogosStore } from '../../../../core/catalogos/catalogos-store';
import { ColeccionesStore } from '../../services/colecciones-store';

const MAX_IMAGEN_MB = 10;

/**
 * Imagen de portada opcional de un recurso. Sube la imagen a la carpeta de la colección
 * (`imagenes/<colección>/`) y deja su URL en `url`. Vacía = la app usa la portada por defecto.
 */
@Component({
  selector: 'app-recurso-portada',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurso-portada.html',
  host: { class: 'block' },
})
export class RecursoPortada {
  private readonly store = inject(ColeccionesStore);
  private readonly catalogos = inject(CatalogosStore);

  readonly coleccionId = input.required<string>();
  /** URL de la portada propia ('' si no tiene). */
  readonly url = model('');
  /** true mientras se sube (el formulario no deja guardar). */
  readonly uploading = model(false);

  protected readonly maxMb = computed(() => this.catalogos.limite('image')?.maxMb ?? MAX_IMAGEN_MB);
  protected readonly progress = signal(0);
  protected readonly error = signal<string | null>(null);
  private sub?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  protected onFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error.set('La portada debe ser una imagen (JPG, PNG o WebP).');
      return;
    }
    const maxMb = this.maxMb();
    if (file.size > maxMb * 1024 * 1024) {
      this.error.set(`La imagen pesa más de ${maxMb} MB.`);
      return;
    }
    this.error.set(null);
    this.sub?.unsubscribe();
    this.progress.set(0);
    this.uploading.set(true);
    this.sub = this.store
      .uploadPortada(file, this.coleccionId())
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: ({ progress, url }) => {
          this.progress.set(progress);
          if (url) this.url.set(url);
        },
        error: (err: unknown) =>
          this.error.set(err instanceof Error ? err.message : 'No se pudo subir la imagen.'),
      });
  }

  protected quitar(): void {
    this.sub?.unsubscribe();
    this.uploading.set(false);
    this.error.set(null);
    this.url.set('');
  }
}
