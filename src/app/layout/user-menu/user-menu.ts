import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { ThemeSwitcher } from '../../shared/theme-switcher/theme-switcher';

/** Avatar con menú desplegable: datos del usuario y cerrar sesión. */
@Component({
  selector: 'app-user-menu',
  imports: [ThemeSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
  template: `
    <button
      type="button"
      (click)="toggle()"
      class="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      aria-controls="user-menu"
      [attr.aria-label]="'Menú de ' + name()"
    >
      <span
        class="grid size-9 place-items-center rounded-full bg-accent/15 text-xs font-semibold text-accent-fg ring-1 ring-accent/30"
        aria-hidden="true"
      >
        {{ initials() }}
      </span>
      <span class="hidden max-w-40 truncate text-sm text-fg sm:block">{{ name() }}</span>
      <svg
        class="hidden size-4 text-muted transition sm:block"
        [class.rotate-180]="open()"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>

    @if (open()) {
      <div
        id="user-menu"
        role="menu"
        class="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl shadow-shade/60"
      >
        <div class="border-b border-line px-4 py-3">
          <p class="truncate text-sm font-medium text-fg">{{ name() }}</p>
          <p class="truncate text-xs text-muted">{{ email() }}</p>
        </div>
        <div class="border-b border-line px-3 py-3">
          <p class="mb-2 px-1 text-[11px] font-medium tracking-wide text-subtle uppercase">Tema</p>
          <app-theme-switcher />
        </div>
        <div class="p-1.5">
          <button
            type="button"
            role="menuitem"
            (click)="requestChangePassword()"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg-2 transition hover:bg-hover hover:text-fg focus-visible:bg-hover focus-visible:text-fg focus-visible:outline-none"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Cambiar contraseña
          </button>
          <button

            type="button"
            role="menuitem"
            (click)="logout()"
            class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fg-2 transition hover:bg-hover hover:text-danger focus-visible:bg-hover focus-visible:text-danger focus-visible:outline-none"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    }
  `,
})
export class UserMenu {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** El shell abre el diálogo de cambio de contraseña. */
  readonly changePassword = output<void>();

  protected readonly open = signal(false);
  protected readonly name = computed(() => this.auth.user()?.name ?? 'Usuario');
  protected readonly email = computed(() => this.auth.user()?.email ?? '');
  protected readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  protected toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      // Lleva el foco a la primera opción para usar el menú con teclado.
      afterNextRender(
        () => this.host.nativeElement.querySelector<HTMLElement>('[role=menuitem]')?.focus(),
        { injector: this.injector },
      );
    }
  }

  protected close(returnFocus = false): void {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.host.nativeElement.querySelector<HTMLElement>('button')?.focus();
  }

  protected onDocumentClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  protected requestChangePassword(): void {
    this.open.set(false);
    this.changePassword.emit();
  }

  protected logout(): void {
    this.open.set(false);
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
