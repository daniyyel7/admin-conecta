import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Ventana modal con <dialog> nativo (foco atrapado, Escape).
 * Se abre al crearse; el padre la muestra con @if y la quita al recibir `closed`.
 * En móvil se muestra como hoja desde abajo.
 *
 *   <app-modal title="..." (closed)="...">
 *     contenido
 *     <div modal-footer>botones</div>
 *   </app-modal>
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="modal bg-surface p-0 text-fg"
      [class]="size() === 'lg' ? 'modal-lg' : 'modal-md'"
      aria-labelledby="modal-title"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
    >
      <div class="flex max-h-[inherit] flex-col">
        <header class="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div class="min-w-0">
            <h2 id="modal-title" class="text-base font-semibold">{{ title() }}</h2>
            @if (subtitle()) {
              <p class="mt-0.5 text-xs text-muted">{{ subtitle() }}</p>
            }
          </div>
          <button
            type="button"
            class="-mr-2 grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40"
            (click)="requestClose()"
            [disabled]="busy()"
            aria-label="Cerrar"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <ng-content />
        </div>
        <footer class="modal-footer flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <ng-content select="[modal-footer]" />
        </footer>
      </div>
    </dialog>
  `,
  styles: `
    .modal {
      margin: auto;
      width: calc(100% - 2rem);
      max-height: min(90dvh, 52rem);
      border-radius: 1rem;
      border: 1px solid var(--c-line-strong);
      box-shadow: 0 25px 50px -12px color-mix(in srgb, var(--c-shade) 60%, transparent);
    }
    .modal-md { max-width: 32rem; }
    .modal-lg { max-width: 42rem; }
    .modal::backdrop {
      background: var(--c-scrim);
      backdrop-filter: blur(2px);
    }
    .modal-footer {
      padding-bottom: max(0.875rem, env(safe-area-inset-bottom));
    }
    /* Móvil: hoja inferior a todo lo ancho */
    @media (width < 40rem) {
      .modal {
        margin: auto 0 0;
        width: 100%;
        max-width: none;
        max-height: 92dvh;
        border-radius: 1rem 1rem 0 0;
        border-bottom: 0;
      }
    }
  `,
})
export class Modal {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly size = input<'md' | 'lg'>('md');
  /** Mientras está ocupado (guardando/subiendo) no se puede cerrar. */
  readonly busy = input(false);
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const el = this.dialog().nativeElement;
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    });
  }

  protected requestClose(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.requestClose();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.requestClose();
  }
}
