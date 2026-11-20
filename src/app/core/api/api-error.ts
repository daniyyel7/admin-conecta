import { HttpErrorResponse } from '@angular/common/http';

/** Cuerpo de error de la API: `{ message, errors?: { campo: [mensajes] } }`. */
export interface ApiErrorBody {
  message?: string | string[];
  errors?: Record<string, string[]>;
}

/** Error de la API ya listo para mostrar en pantalla. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
  }

  /** Primer mensaje del campo indicado, si la API lo reportó. */
  campo(nombre: string): string | null {
    return this.errors[nombre]?.[0] ?? null;
  }
}

const POR_ESTADO: Record<number, string> = {
  0: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  401: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para esta acción.',
  404: 'No se encontró lo que buscas.',
  413: 'El archivo es demasiado grande.',
  429: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
};

/** Convierte cualquier error de HttpClient en un `ApiError` con un mensaje en español. */
export function aApiError(error: unknown, porDefecto = 'Ocurrió un error. Inténtalo de nuevo.'): ApiError {
  if (error instanceof ApiError) return error;
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError(error instanceof Error ? error.message : porDefecto, -1);
  }
  const body = (error.error ?? {}) as ApiErrorBody;
  const mensaje = Array.isArray(body.message) ? body.message[0] : body.message;
  return new ApiError(
    // 429 y 0 siempre con nuestro texto; en lo demás manda el mensaje de la API si viene.
    error.status === 429 || error.status === 0
      ? POR_ESTADO[error.status]
      : (mensaje ?? POR_ESTADO[error.status] ?? porDefecto),
    error.status,
    body.errors ?? {},
  );
}
