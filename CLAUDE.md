# admin-conecta

Panel de administración construido con Angular. Responde y documenta en **español**.

## Stack

- **Angular 22** (standalone, zoneless, signals) con **SSR** (`@angular/ssr` + Express en `src/server.ts`)
- **TypeScript 6** en modo estricto
- **Tailwind CSS 4** vía PostCSS (`.postcssrc.json`, `@import "tailwindcss";` en `src/styles.css`)
- **Vitest** + jsdom para pruebas unitarias (`ng test`)
- **Prettier**: `printWidth: 100`, comillas simples, parser `angular` para HTML

## Comandos

```bash
npm start            # ng serve → http://localhost:4200
npm run build        # build de producción en dist/admin-conecta
npm test             # pruebas con Vitest
npm run serve:ssr:admin-conecta   # sirve el build SSR
npx prettier --write .            # formatear
```

Antes de dar una tarea por terminada: `npm run build` sin errores y `npm test` en verde.

**Nunca uses `sudo` con npm** (ya causó problemas de permisos en `~/.npm`).

## Estructura

```
src/app/
├── core/          # servicios singleton, interceptors, guards, modelos globales
├── shared/        # componentes, pipes y directivas reutilizables (UI)
├── features/      # una carpeta por módulo funcional (usuarios, reportes, ...)
│   └── <feature>/
│       ├── pages/       # componentes enrutados
│       ├── components/  # componentes propios del feature
│       ├── services/
│       └── <feature>.routes.ts
├── layout/        # shell, sidebar, header
├── app.config.ts  # providers (router, http, etc.)
└── app.routes.ts  # rutas raíz con lazy loading de features
```

- Archivos sin sufijo de tipo (convención Angular ≥ 20): `user-list.ts`, `user-list.html`, `user-list.css`; servicios `user-api.ts`, etc.
- Genera código con el CLI: `ng g c features/usuarios/pages/user-list`.

## Reglas de Angular

### Componentes
- Siempre **standalone** (no declares `standalone: true`, es el valor por defecto). No uses `NgModule`.
- `changeDetection: ChangeDetectionStrategy.OnPush`.
- Entradas/salidas con `input()`, `input.required()`, `output()` y `model()`; nunca `@Input`/`@Output`.
- Inyección con `inject()`, no por constructor.
- Bindings de host en el objeto `host: {}` del decorador, no `@HostBinding`/`@HostListener`.
- Plantillas pequeñas; si crece, separa en un componente hijo.
- Usa `NgOptimizedImage` (`ngSrc`) para imágenes estáticas.

### Estado y reactividad
- Estado local con `signal()`, derivados con `computed()`; actualiza con `set`/`update`, nunca `mutate`.
- Efectos (`effect()`) solo para sincronizar con APIs externas, no para derivar estado.
- Para datos HTTP prefiere `httpResource()` / `resource()`; si usas RxJS, conviértelo con `toSignal()`.

### Plantillas
- Control de flujo nativo: `@if`, `@for` (con `track`), `@switch`, `@defer`. Nada de `*ngIf`/`*ngFor`.
- Clases y estilos con `[class.x]` / `[style.x]`, no `ngClass`/`ngStyle`.
- Sin lógica compleja ni llamadas a funciones costosas en la plantilla.

### Formularios
- Formularios reactivos tipados (`FormBuilder.nonNullable`) o Signal Forms; no template-driven.

### Rutas
- Lazy loading por feature con `loadChildren` / `loadComponent`.
- Guards e interceptors **funcionales** (`CanActivateFn`, `HttpInterceptorFn`).

### Servicios y HTTP
- `@Injectable({ providedIn: 'root' })` para singletons.
- `provideHttpClient(withFetch(), withInterceptors([...]))` en `app.config.ts`.
- Tipa todas las respuestas con interfaces en `models/`. Nunca uses `any` (usa `unknown` si hace falta).
- URL de la API en `src/environments/` (créalo con `ng g environments` cuando se necesite).

### SSR
- No accedas a `window`, `document` ni `localStorage` directamente; usa `inject(DOCUMENT)`, `isPlatformBrowser` o `afterNextRender()`.

## Estilos
- Tailwind primero; CSS del componente solo para lo que Tailwind no cubra.
- Diseño responsive (mobile-first) y accesible: HTML semántico, `aria-*`, foco visible, contraste AA.

## Pruebas
- Un `*.spec.ts` junto a cada componente/servicio con lógica.
- Vitest (`describe`/`it`/`expect`, `vi.fn()`); usa `TestBed` y `provideHttpClientTesting()` para HTTP.
