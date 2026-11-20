import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { THEME_STORAGE_KEY, Theme } from './theme';
import { ThemeSwitcher } from '../../shared/theme-switcher/theme-switcher';

describe('Theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('aplica y guarda la preferencia elegida', async () => {
    const theme = TestBed.inject(Theme);
    const doc = TestBed.inject(DOCUMENT);

    theme.set('light');
    TestBed.tick();
    expect(theme.resolved()).toBe('light');
    expect(doc.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    theme.toggle();
    TestBed.tick();
    expect(doc.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('recupera la preferencia guardada', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(TestBed.inject(Theme).preference()).toBe('light');
  });

  it('el selector marca la opción activa y cambia el tema', async () => {
    const fixture = TestBed.createComponent(ThemeSwitcher);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const radios = [...el.querySelectorAll<HTMLButtonElement>('[role=radio]')];
    expect(radios.map((r) => r.textContent?.trim())).toEqual(['Sistema', 'Claro', 'Oscuro']);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');

    radios[1].click();
    await fixture.whenStable();
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
