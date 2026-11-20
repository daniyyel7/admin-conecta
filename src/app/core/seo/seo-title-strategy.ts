import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

/** URL pública del panel en producción (sin barra final). */
export const SITE_URL = 'https://app.umch.org.mx/admin';
export const SITE_NAME = 'Conecta 7';

const DEFAULT_TITLE = `${SITE_NAME} · Administrador`;
const DEFAULT_DESCRIPTION =
  'Panel de administración de Conecta7 para la gestión de recursos, eventos eclesiásticos y ministerios locales de la Unión Mexicana de Chiapas.';
/** Las pantallas del panel son privadas: no se indexan salvo que la ruta diga lo contrario. */
const DEFAULT_ROBOTS = 'noindex, nofollow';

/** Datos SEO opcionales en `data` de cada ruta. */
export interface SeoRouteData {
  description?: string;
  /** p. ej. 'index, follow' para páginas públicas. */
  robots?: string;
}

/**
 * Además del <title>, actualiza description, robots, canonical y Open Graph en cada navegación.
 * Funciona también en SSR, así que las páginas pre-renderizadas salen con sus metadatos.
 */
@Injectable({ providedIn: 'root' })
export class SeoTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  override updateTitle(state: RouterStateSnapshot): void {
    const title = this.buildTitle(state) ?? DEFAULT_TITLE;
    const data = deepestData(state.root);
    const description = data.description ?? DEFAULT_DESCRIPTION;
    const robots = data.robots ?? DEFAULT_ROBOTS;
    const path = state.url.split(/[?#]/)[0];
    const url = `${SITE_URL}${path === '/' ? '/' : path}`;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.setCanonical(url);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}

/** Combina `data` desde la raíz hasta la ruta más profunda (la hija gana). */
function deepestData(route: ActivatedRouteSnapshot): SeoRouteData {
  let data: SeoRouteData = {};
  for (let r: ActivatedRouteSnapshot | null = route; r; r = r.firstChild) {
    data = { ...data, ...(r.data as SeoRouteData) };
  }
  return data;
}
