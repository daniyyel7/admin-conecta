import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ResetPassword } from './reset-password';

describe('ResetPassword', () => {
  let fixture: ComponentFixture<ResetPassword>;
  let el: HTMLElement;
  const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const escribir = (sel: string, v: string) => {
    const i = el.querySelector<HTMLInputElement>(sel)!;
    i.value = v;
    i.dispatchEvent(new Event('input'));
  };

  async function abrir(token: string) {
    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ResetPassword);
    fixture.componentRef.setInput('token', token);
    el = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.textContent).toContain('Verificando el enlace');
    await esperar(550);
    await fixture.whenStable();
  }

  it('con un enlace vencido ofrece pedir uno nuevo', async () => {
    await abrir('vencido');
    expect(el.textContent).toContain('El enlace ya no es válido');
    expect(el.querySelector('a[href="/recuperar-contrasena"]')).not.toBeNull();
  });

  it('valida las reglas y que las contraseñas coincidan', async () => {
    await abrir('abc123');
    escribir('#password', 'corta');
    escribir('#confirm', 'otra');
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
    const reglas = [...el.querySelectorAll('app-password-checklist li')].map((li) => li.className.includes('text-success'));
    expect(reglas).toEqual([false, true, false]); // largo, letra, número
    expect(el.textContent).toContain('Las contraseñas no coinciden.');
  });

  it('guarda la nueva contraseña y lleva a iniciar sesión', async () => {
    await abrir('abc123');
    escribir('#password', 'Conecta2027');
    escribir('#confirm', 'Conecta2027');
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await esperar(750);
    await fixture.whenStable();
    expect(el.textContent).toContain('¡Contraseña actualizada!');
    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
