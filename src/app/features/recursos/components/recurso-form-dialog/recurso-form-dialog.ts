import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize, startWith } from 'rxjs';
import { Modal } from '../../../../shared/modal/modal';
import {
  RESOURCE_TYPES,
  Resource,
  ResourceInput,
  ResourceType,
  nombreArchivo,
  typeConfig,
} from '../../models/recurso';
import { CatalogosStore } from '../../../../core/catalogos/catalogos-store';
import { ColeccionesStore } from '../../services/colecciones-store';

type Source = 'file' | 'url';

/**
 * Agregar o editar un recurso de una colección.
 * Según el tipo, pide un archivo (con formatos y tamaño máximo), un enlace validado o ambos (video).
 */
@Component({
  selector: 'app-recurso-form-dialog',
  imports: [ReactiveFormsModule, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recurso-form-dialog.html',
})
export class RecursoFormDialog implements OnInit {
  private readonly store = inject(ColeccionesStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly catalogos = inject(CatalogosStore);

  readonly coleccionId = input.required<string>();
  readonly recurso = input<Resource | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Resource>();

  protected readonly types = RESOURCE_TYPES;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: ['' as ResourceType | '', [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.maxLength(160)]],
    link: ['', [Validators.required]],
    visible: [true],
  });

  private readonly typeValue = toSignal(
    this.form.controls.type.valueChanges.pipe(startWith(this.form.controls.type.value)),
    { requireSync: true },
  );
  protected readonly config = computed(() => {
    const t = this.typeValue();
    if (!t) return null;
    // Formatos y tamaño máximo los define la API (tabla tipos_recurso); si aún no cargan, los del panel.
    const limite = this.catalogos.limite(t);
    const base = typeConfig(t);
    return limite
      ? { ...base, accept: limite.accept ?? base.accept, maxMb: limite.maxMb ?? base.maxMb, formats: limite.formats ?? base.formats }
      : base;
  });

  /** De dónde sale el contenido (para video se puede elegir). */
  protected readonly source = signal<Source>('file');
  protected readonly effectiveSource = computed<Source | null>(() => {
    const c = this.config();
    if (!c) return null;
    return c.mode === 'file-or-url' ? this.source() : c.mode;
  });

  // Estado de la subida
  protected readonly uploading = signal(false);
  protected readonly progress = signal(0);
  protected readonly fileName = signal<string | null>(null);
  protected readonly fileSize = signal<number | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly dragOver = signal(false);
  private uploadSub?: Subscription;

  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly saveError = signal<string | null>(null);

  private readonly linkValue = toSignal(
    this.form.controls.link.valueChanges.pipe(startWith(this.form.controls.link.value)),
    { requireSync: true },
  );
  /** Vista previa del archivo subido (imagen, audio o video). */
  protected readonly previewUrl = computed(() =>
    this.effectiveSource() === 'file' ? this.linkValue() : '',
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.uploadSub?.unsubscribe());
  }

  ngOnInit(): void {
    const r = this.recurso();
    if (r) {
      this.form.reset({
        type: r.type,
        title: r.title,
        description: r.description,
        link: r.link,
        visible: r.visible,
      });
      const cfg = typeConfig(r.type);
      const esUrl = cfg.mode === 'url' || (cfg.mode === 'file-or-url' && !!cfg.urlPattern?.test(r.link));
      this.source.set(esUrl ? 'url' : 'file');
      if (!esUrl) this.fileName.set(nombreArchivo(r.link));
    }
    this.updateLinkValidators();
  }

  protected selectType(type: ResourceType): void {
    if (this.form.controls.type.value === type) return;
    const anterior = this.form.controls.type.value;
    this.form.controls.type.setValue(type);
    this.form.controls.type.markAsDirty();
    // Cambiar de tipo descarta el archivo o enlace anterior (el formato ya no aplica).
    if (anterior) this.resetSource();
    this.source.set(typeConfig(type).mode === 'url' ? 'url' : 'file');
    this.updateLinkValidators();
  }

  protected setSource(source: Source): void {
    if (this.source() === source) return;
    this.resetSource();
    this.source.set(source);
    this.updateLinkValidators();
  }

  /** El enlace solo se valida con patrón cuando se escribe a mano. */
  private updateLinkValidators(): void {
    const link = this.form.controls.link;
    const cfg = this.config();
    const validators = [Validators.required];
    if (cfg?.urlPattern && this.effectiveSource() === 'url') {
      validators.push(Validators.pattern(cfg.urlPattern));
    }
    link.setValidators(validators);
    link.updateValueAndValidity();
  }

  private resetSource(): void {
    this.cancelUpload();
    this.form.controls.link.setValue('');
    this.fileName.set(null);
    this.fileSize.set(null);
    this.fileError.set(null);
  }

  // ---------- Archivos ----------

  protected onFileInput(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) this.handleFile(file);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.handleFile(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  private handleFile(file: File): void {
    const cfg = this.config();
    if (!cfg) return;
    const error = validarArchivo(file, cfg.accept, cfg.maxMb);
    if (error) {
      this.fileError.set(error);
      return;
    }
    this.fileError.set(null);
    this.cancelUpload();
    this.fileName.set(file.name);
    this.fileSize.set(file.size);
    this.form.controls.link.setValue('');
    this.uploading.set(true);
    this.progress.set(0);

    // Si el título está vacío, se sugiere el nombre del archivo.
    if (!this.form.controls.title.value.trim()) {
      this.form.controls.title.setValue(tituloDesdeArchivo(file.name));
    }

    this.uploadSub = this.store
      .upload(file, cfg.type, this.coleccionId())
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: ({ progress, url }) => {
          this.progress.set(progress);
          if (url) {
            this.form.controls.link.setValue(url);
            this.form.controls.link.markAsDirty();
          }
        },
        error: (err: unknown) => {
          this.fileError.set(
            err instanceof Error ? err.message : 'No se pudo subir el archivo. Inténtalo de nuevo.',
          );
          this.fileName.set(null);
        },
      });
  }

  protected cancelUpload(): void {
    if (this.uploadSub && !this.uploadSub.closed) {
      this.uploadSub.unsubscribe();
      this.uploading.set(false);
      this.fileName.set(null);
      this.fileSize.set(null);
    }
  }

  protected removeFile(): void {
    this.resetSource();
  }

  // ---------- Guardar ----------

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
    if (this.uploading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      setTimeout(() =>
        document.querySelector<HTMLElement>('#recurso-form [aria-invalid="true"]')?.focus(),
      );
      return;
    }
    const raw = this.form.getRawValue();
    const data: ResourceInput = {
      type: raw.type as ResourceType,
      title: raw.title.trim(),
      description: raw.description.trim(),
      link: raw.link.trim(),
      visible: raw.visible,
    };
    const actual = this.recurso();
    const request = actual
      ? this.store.updateResource(this.coleccionId(), actual.id, data)
      : this.store.addResource(this.coleccionId(), data);
    this.saving.set(true);
    this.saveError.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (r) => this.saved.emit(r),
      error: (err: unknown) =>
        this.saveError.set(err instanceof Error ? err.message : 'No se pudo guardar el recurso.'),
    });
  }

  protected formatSize(bytes: number | null): string {
    if (bytes === null) return '';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

/** Valida tipo y tamaño contra el `accept` del tipo de recurso. Devuelve el mensaje de error o null. */
export function validarArchivo(file: File, accept?: string, maxMb?: number): string | null {
  if (accept) {
    const reglas = accept.split(',').map((r) => r.trim().toLowerCase());
    const nombre = file.name.toLowerCase();
    const mime = (file.type || '').toLowerCase();
    const ok = reglas.some((r) =>
      r.startsWith('.')
        ? nombre.endsWith(r)
        : r.endsWith('/*')
          ? mime.startsWith(r.slice(0, -1))
          : mime === r,
    );
    if (!ok) return 'Este tipo de archivo no corresponde al tipo de recurso elegido.';
  }
  if (maxMb && file.size > maxMb * 1024 * 1024) {
    return `El archivo pesa más de ${maxMb} MB.`;
  }
  return null;
}

/** "guia_lideres-2026.pdf" → "Guia lideres 2026" */
function tituloDesdeArchivo(nombre: string): string {
  const base = nombre.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 80);
}
