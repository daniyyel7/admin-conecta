import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/** true cuando se ejecuta `node dist/.../server.mjs` (producción); false dentro de `ng serve`. */
const isStandaloneServer = isMainModule(import.meta.url) || !!process.env['pm_id'];

/**
 * Ruta pública del panel. Debe coincidir con `baseHref` de la configuración `production` en angular.json.
 * Se puede sobrescribir con la variable de entorno BASE_PATH (sin barra final, p. ej. "/admin").
 * En `ng serve` la app vive en la raíz, así que ahí no se aplica.
 */
const basePath = isStandaloneServer ? (process.env['BASE_PATH'] ?? '/admin') : '';

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  basePath || '/',
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/** La raíz del dominio en este servidor redirige al panel. */
if (basePath) {
  app.get('/', (_req, res) => res.redirect(301, `${basePath}/`));
}

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
