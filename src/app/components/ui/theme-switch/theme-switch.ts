import { Component, inject } from '@angular/core';
import { Theme } from '../../../services/theme';

@Component({
  selector: 'app-theme-switch',
  imports: [],
  templateUrl: './theme-switch.html',
  styleUrl: './theme-switch.scss',
})
export class ThemeSwitch {
  protected readonly theme = inject(Theme);
}
