import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../../../../core/auth/auth';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  const requestPasswordReset = vi.fn(() => of(undefined));

  beforeEach(async () => {
    requestPasswordReset.mockClear();
    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [provideRouter([]), { provide: Auth, useValue: { requestPasswordReset } }],
    }).compileComponents();
  });

  it('valida el correo antes de enviar', async () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(el.textContent).toContain('Ingresa tu correo.');
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('muestra la confirmación después de enviar', async () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#email')!;
    input.value = 'pastor.admin@conecta7.org';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(requestPasswordReset).toHaveBeenCalledWith('pastor.admin@conecta7.org');
    expect(el.textContent).toContain('Revisa tu correo');
    expect(el.textContent).toContain('pastor.admin@conecta7.org');
  });
});
