import { Injectable, signal } from '@angular/core';
import { MOCK_USER_SETTINGS } from '../mocks/mock-user-settings';
import { UserSettings } from '../models/user-settings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly _settings = signal<UserSettings>({ ...MOCK_USER_SETTINGS });
  readonly settings = this._settings.asReadonly();

  updateSettings(settings: Partial<UserSettings>): void {
    this._settings.update(current => ({ ...current, ...settings }));
  }
}