import { proveerApiFalsa } from '../../../../../testing/api-falsa';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), ...proveerApiFalsa()],
    }).compileComponents();
  });

  it('muestra el formulario de inicio de sesión', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#email')).toBeTruthy();
    expect(el.querySelector('#password')).toBeTruthy();
    expect(el.textContent).toContain('Iniciar Sesión');
  });

  it('muestra errores si se envía vacío', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Ingresa tu usuario.');
    expect(el.textContent).toContain('Ingresa tu contraseña.');
  });
});
