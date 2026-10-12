import { SettingsService } from './settings';

describe('SettingsService', () => {
  it('provides the product defaults', () => {
    const service = new SettingsService();

    expect(service.settings()).toEqual({
      theme: 'dark',
      palette: 'terracotta',
      backgroundSeed: 1234567890,
      language: 'fr',
      currency: 'EUR',
      locale: 'fr-FR',
    });
  });

  it('starts each instance with the same valid mock seed', () => {
    const first = new SettingsService();
    const second = new SettingsService();

    expect(first.settings().backgroundSeed).toBe(second.settings().backgroundSeed);
    expect(first.settings().backgroundSeed).toBeGreaterThanOrEqual(0);
    expect(first.settings().backgroundSeed).toBeLessThanOrEqual(4294967295);
  });

  it('updates settings without mutating the original mock', () => {
    const service = new SettingsService();

    service.updateSettings({ language: 'en' });

    expect(service.settings().language).toBe('en');
    expect(new SettingsService().settings().language).toBe('fr');
  });
});