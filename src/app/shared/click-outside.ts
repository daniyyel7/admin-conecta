import { Directive, ElementRef, inject, output } from '@angular/core';

/** Emite `clickOutside` cuando se hace clic fuera del elemento (para cerrar menús y popovers). */
@Directive({
  selector: '[appClickOutside]',
  host: { '(document:click)': 'onClick($event)' },
})
export class ClickOutside {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly clickOutside = output<void>();

  protected onClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target as Node)) this.clickOutside.emit();
  }
}
