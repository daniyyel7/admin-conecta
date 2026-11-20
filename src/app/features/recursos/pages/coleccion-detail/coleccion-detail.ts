import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { departamentoPorNombre } from '../../../../core/catalogos/departamentos';
import { ConfirmDialog } from '../../../../shared/confirm-dialog/confirm-dialog';
import { formatFecha } from '../../../../shared/format';
import { ColeccionFormDialog } from '../../components/coleccion-form-dialog/coleccion-form-dialog';
import { RecursoFormDialog } from '../../components/recurso-form-dialog/recurso-form-dialog';
import {
  Collection,
  RESOURCE_TYPES,
  Resource,
  ResourceType,
  statusClass,
  typeConfig,
} from '../../models/recurso';
import { ColeccionesStore } from '../../services/colecciones-store';

@Component({
  selector: 'app-coleccion-detail',
  imports: [RouterLink, ConfirmDialog, ColeccionFormDialog, RecursoFormDialog],
  templateUrl: './coleccion-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class ColeccionDetail {
  protected readonly store = inject(ColeccionesStore);
  private readonly router = inject(Router);

  /** Viene de la ruta `:id`. */
  readonly id = input.required<string>();

  protected readonly coleccion = computed(() =>
    this.store.colecciones().find((c) => c.id === this.id()),
  );
  protected readonly notFound = computed(
    () => !this.store.loading() && this.store.total() > 0 && !this.coleccion(),
  );

  /** Filtro por tipo; null = todos. */
  protected readonly tipo = signal<ResourceType | null>(null);
  protected readonly tipos = computed(() => {
    const counts = new Map<ResourceType, number>();
    for (const r of this.coleccion()?.resources ?? [])
      counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
    return RESOURCE_TYPES.filter((t) => counts.has(t.type)).map((t) => ({
      cfg: t,
      count: counts.get(t.type)!,
    }));
  });
  protected readonly recursos = computed(() => {
    const t = this.tipo();
    const list = this.coleccion()?.resources ?? [];
    return t ? list.filter((r) => r.type === t) : list;
  });

  protected readonly editCollectionOpen = signal(false);
  protected readonly resourceFormOpen = signal(false);
  protected readonly editingResource = signal<Resource | null>(null);
  protected readonly toDelete = signal<Resource | null>(null);
  protected readonly deleting = signal(false);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly typeConfig = typeConfig;
  protected readonly statusClass = statusClass;
  protected readonly formatFecha = formatFecha;
  protected readonly departamentoPorNombre = departamentoPorNombre;

  constructor() {
    this.store.load();
    const toast = this.router.currentNavigation()?.extras.state?.['toast'];
    if (typeof toast === 'string') this.showToast(toast);
  }

  protected openAdd(): void {
    this.editingResource.set(null);
    this.resourceFormOpen.set(true);
  }

  protected openEdit(r: Resource): void {
    this.editingResource.set(r);
    this.resourceFormOpen.set(true);
  }

  protected onResourceSaved(r: Resource): void {
    const nuevo = !this.editingResource();
    this.resourceFormOpen.set(false);
    this.editingResource.set(null);
    // Si el filtro de tipo ocultaría el recurso nuevo, se quita.
    if (this.tipo() && this.tipo() !== r.type) this.tipo.set(null);
    this.showToast(nuevo ? `Se agregó "${r.title}".` : `Se guardaron los cambios de "${r.title}".`);
  }

  protected onCollectionSaved(c: Collection): void {
    this.editCollectionOpen.set(false);
    this.showToast(`Se guardaron los cambios de "${c.title}".`);
  }

  protected toggleVisible(r: Resource): void {
    this.togglingId.set(r.id);
    this.store
      .setResourceVisible(this.id(), r.id, !r.visible)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: (u) =>
          this.showToast(
            u.visible ? `"${u.title}" ahora es visible.` : `"${u.title}" se ocultó de la app.`,
          ),
        error: (e: unknown) =>
          this.showToast(e instanceof Error ? e.message : 'No se pudo completar la acción.'),
      });
  }

  protected confirmDelete(): void {
    const r = this.toDelete();
    if (!r) return;
    this.deleting.set(true);
    this.store
      .removeResource(this.id(), r.id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        error: (e: unknown) => {
          this.toDelete.set(null);
          this.showToast(e instanceof Error ? e.message : 'No se pudo eliminar.');
        },
        next: () => {
          this.toDelete.set(null);
          if (this.tipo() && !this.recursos().length) this.tipo.set(null);
          this.showToast(`Se eliminó "${r.title}".`);
        },
      });
  }

  /** Los archivos subidos en esta sesión (blob:) y los enlaces se abren en otra pestaña. */
  protected isExternal(link: string): boolean {
    return /^(https?:|blob:)/.test(link);
  }

  private showToast(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
