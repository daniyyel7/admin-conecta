import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface PasswordRule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

/** Reglas de contraseña nueva. El servidor debe validar las mismas. */
export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'letter', label: 'Al menos una letra', test: (v) => /[a-záéíóúñü]/i.test(v) },
  { id: 'number', label: 'Al menos un número', test: (v) => /\d/.test(v) },
];

/** Marca `passwordRules` si la contraseña no cumple todas las reglas. */
export const passwordRulesValidator: ValidatorFn = (control) => {
  const value = String(control.value ?? '');
  if (!value) return null; // de "vacío" se encarga Validators.required
  return PASSWORD_RULES.every((r) => r.test(value)) ? null : { passwordRules: true };
};

/** Validador de grupo: `confirm` debe ser igual a `password`. Marca `mismatch` en el grupo. */
export function passwordsMatch(passwordKey = 'password', confirmKey = 'confirm'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(passwordKey)?.value;
    const b = group.get(confirmKey)?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  };
}
