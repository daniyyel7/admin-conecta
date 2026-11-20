import { CanDeactivateFn } from '@angular/router';

/** Pantallas con formularios que pueden pedir confirmación antes de salir. */
export interface CanLeave {
  canLeave(): boolean | Promise<boolean>;
}

/** Pregunta antes de salir si la pantalla tiene cambios sin guardar. */
export const unsavedChangesGuard: CanDeactivateFn<CanLeave> = (component) =>
  component?.canLeave ? component.canLeave() : true;
