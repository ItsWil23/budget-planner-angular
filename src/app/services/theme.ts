import { Injectable, signal, effect, inject, DOCUMENT } from '@angular/core';
import type { ThemeMode } from '../models/thememode';

@Injectable({
  providedIn: 'root',
})
export class Theme {
  private readonly _themeMode = signal<ThemeMode>('light');
  readonly theme = this._themeMode.asReadonly();
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      const themeMode = this._themeMode();
      this.document.documentElement.classList.toggle('dark', themeMode === 'dark');
    });
  }

  toggleTheme(): void {
    this._themeMode.update((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  }
}
