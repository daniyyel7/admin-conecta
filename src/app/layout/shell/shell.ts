import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from '../../core/auth/auth';
import { CatalogosStore } from '../../core/catalogos/catalogos-store';
import { UserMenu } from '../user-menu/user-menu';
import { ThemeSwitcher } from '../../shared/theme-switcher/theme-switcher';
import { ChangePasswordDialog } from '../change-password-dialog/change-password-dialog';

interface NavItem {
  label: string;
  path: string;
  exact: boolean;
  /** Trazos SVG (viewBox 24x24) del icono. */
  icon: string[];
}

/**
 * Estructura principal del panel.
 * Escritorio: barra superior con pestañas. Móvil: botón hamburguesa que abre un menú lateral.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UserMenu, ThemeSwitcher, ChangePasswordDialog],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-dvh flex-col bg-bg text-fg',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class Shell {
  private readonly auth = inject(Auth);
  private readonly catalogos = inject(CatalogosStore);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly drawer = viewChild.required<ElementRef<HTMLElement>>('drawer');

  protected readonly nav: NavItem[] = [
    {
      label: 'Inicio',
      path: '/',
      exact: true,
      icon: ['M3 10.5 12 3l9 7.5', 'M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'],
    },
    {
      label: 'Eventos',
      path: '/eventos',
      exact: false,
      icon: ['M8 3v4M16 3v4M3 11h18', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'],
    },
    {
      label: 'Recursos',
      path: '/recursos',
      exact: false,
      icon: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
    },
    {
      label: 'Avisos',
      path: '/avisos',
      exact: false,
      icon: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
    },
  ];

  protected readonly menuOpen = signal(false);
  protected readonly changePasswordOpen = signal(false);
  protected readonly userName = computed(() => this.auth.user()?.name ?? '');
  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  constructor() {
    // Listas desplegables (departamentos, categorías, límites de subida) para todo el panel.
    this.catalogos.load();
    // Cierra el menú al navegar.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));

    // Bloquea el scroll del fondo mientras el menú está abierto.
    effect(() => {
      this.document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  protected openMenu(): void {
    this.menuOpen.set(true);
    // Foco al primer enlace cuando termine la transición de apertura.
    setTimeout(() => this.drawer().nativeElement.querySelector<HTMLElement>('a')?.focus(), 50);
  }

  protected closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.menuButton().nativeElement.focus();
  }

  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.document.getElementById('contenido')?.focus();
  }

  protected openChangePassword(): void {
    this.menuOpen.set(false);
    this.changePasswordOpen.set(true);
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }
}
