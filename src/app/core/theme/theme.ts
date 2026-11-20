import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

/** Debe coincidir con el script en línea de index.html. */
export const THEME_STORAGE_KEY = 'c7.theme';
const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#141518', light: '#ffffff' };

/**
 * Tema claro / oscuro. Guarda la preferencia del usuario y, en modo "system",
 * sigue el ajuste del sistema operativo en tiempo real.
 */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly media =
    this.isBrowser && typeof this.document.defaultView?.matchMedia === 'function'
      ? this.document.defaultView.matchMedia('(prefers-color-scheme: dark)')
      : undefined;

  private readonly systemDark = signal(this.media?.matches ?? true);

  readonly preference = signal<ThemePreference>(this.readPreference());
  readonly resolved = computed<ResolvedTheme>(() => {
    const pref = this.preference();
    return pref === 'system' ? (this.systemDark() ? 'dark' : 'light') : pref;
  });

  constructor() {
    if (!this.isBrowser) return;

    const onChange = (e: MediaQueryListEvent) => this.systemDark.set(e.matches);
    this.media?.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', onChange));

    let first = true;
    effect(() => {
      const theme = this.resolved();
      this.apply(theme, !first);
      first = false;
    });
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Sin almacenamiento: la preferencia dura solo esta sesión.
    }
  }

  /** Alterna explícitamente entre claro y oscuro. */
  toggle(): void {
    this.set(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: ResolvedTheme, animate: boolean): void {
    const root = this.document.documentElement;
    if (animate) {
      root.classList.add('theme-transition');
      setTimeout(() => root.classList.remove('theme-transition'), 250);
    }
    root.dataset['theme'] = theme;
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLORS[theme]);
  }

  private readPreference(): ThemePreference {
    if (!this.isBrowser) return 'system';
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
    } catch {
      return 'system';
    }
  }
}
