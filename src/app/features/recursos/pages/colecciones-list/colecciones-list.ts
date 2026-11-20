import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { departamentos, departamentoPorNombre } from '../../../../core/catalogos/departamentos';
import { ConfirmDialog } from '../../../../shared/confirm-dialog/confirm-dialog';
import { formatFecha, normalizar } from '../../../../shared/format';
import { ColeccionFormDialog } from '../../components/coleccion-form-dialog/coleccion-form-dialog';
import { Collection, statusClass, typeConfig } from '../../models/recurso';
import { ColeccionesStore } from '../../services/colecciones-store';

const PREVIEW = 3;

@Component({
  selector: 'app-colecciones-list',
  imports: [RouterLink, ConfirmDialog, ColeccionFormDialog],
  templateUrl: './colecciones-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ColeccionesList {
  protected readonly store = inject(ColeccionesStore);
  private readonly router = inject(Router);

  protected readonly search = signal('');
  /** id del departamento elegido; null = todos. */
  protected readonly depto = signal<string | null>(null);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Collection | null>(null);
  protected readonly toDelete = signal<Collection | null>(null);
  protected readonly deleting = signal(false);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly preview = PREVIEW;
  protected readonly typeConfig = typeConfig;
  protected readonly statusClass = statusClass;
  protected readonly formatFecha = formatFecha;
  protected readonly departamentoPorNombre = departamentoPorNombre;
  protected readonly skeletons = [0, 1, 2, 3];

  protected readonly chips = computed(() => {
    const counts = new Map<string, number>();
    for (const c of this.store.colecciones()) {
      const id = departamentoPorNombre(c.apartment).id;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return departamentos()
      .map((d) => ({ depto: d, count: counts.get(d.id) ?? 0 }))
      .filter((c) => c.count > 0);
  });

  protected readonly filtered = computed(() => {
    const q = normalizar(this.search());
    const depto = this.depto();
    return this.store.colecciones().filter((c) => {
      if (depto && departamentoPorNombre(c.apartment).id !== depto) return false;
      if (!q) return true;
      const texto = normalizar(
        [
          c.title,
          c.description,
          c.apartment,
          c.category,
          c.location,
          formatFecha(c.date),
          ...c.resources.flatMap((r) => [r.title, r.description]),
        ].join(' '),
      );
      return q.split(/\s+/).every((p) => texto.includes(p));
    });
  });

  protected readonly hasFilters = computed(() => !!this.search().trim() || this.depto() !== null);

  constructor() {
    this.store.load();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.depto.set(null);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(c: Collection): void {
    this.editing.set(c);
    this.formOpen.set(true);
  }

  protected onSaved(c: Collection): void {
    const nueva = !this.editing();
    this.formOpen.set(false);
    this.editing.set(null);
    if (nueva) {
      // Recién creada: lo siguiente es agregarle recursos.
      this.router.navigate(['/recursos', c.id], {
        state: { toast: `Se creó "${c.title}". Agrega sus recursos.` },
      });
    } else {
      this.showToast(`Se guardaron los cambios de "${c.title}".`);
    }
  }

  protected toggleVisible(c: Collection): void {
    this.togglingId.set(c.id);
    this.store
      .setCollectionVisible(c.id, !c.visible)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: (u) =>
          this.showToast(
            u.visible
              ? `"${u.title}" ahora es visible en la app.`
              : `"${u.title}" se ocultó de la app.`,
          ),
        error: (e: unknown) =>
          this.showToast(e instanceof Error ? e.message : 'No se pudo completar la acción.'),
      });
  }

  protected confirmDelete(): void {
    const c = this.toDelete();
    if (!c) return;
    this.deleting.set(true);
    this.store
      .removeCollection(c.id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        error: (e: unknown) => {
          this.toDelete.set(null);
          this.showToast(e instanceof Error ? e.message : 'No se pudo eliminar.');
        },
        next: () => {
          this.toDelete.set(null);
          this.showToast(`Se eliminó la colección "${c.title}".`);
        },
      });
  }

  private showToast(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
