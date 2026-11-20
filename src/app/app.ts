import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Theme } from './core/theme/theme';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Inicia el servicio de tema (aplica la preferencia y sigue los cambios del sistema).
  private readonly theme = inject(Theme);
}
