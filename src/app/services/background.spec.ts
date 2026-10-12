import { Background } from './background';
import { SettingsService } from './settings';

describe('Background', () => {
  const createBackground = (seed: number): Background => {
    const settings = new SettingsService();
    settings.updateSettings({ backgroundSeed: seed });
    return new Background(settings);
  };

  it('should be created', () => {
    const background = createBackground(12345);
    expect(background).toBeTruthy();
  });

  it('should use the seed from settings', () => {
    const background = createBackground(98765);

    expect(background.seed).toBe(98765);
  });

  it('should produce the same blobs and CSS for the same seed', () => {
    const background1 = createBackground(12345);
    const background2 = createBackground(12345);

    expect(background1.blobs).toEqual(background2.blobs);
    expect(background1.background).toBe(background2.background);
  });

  it('should generate different blobs for different seeds', () => {
    const background1 = createBackground(12345);
    const background2 = createBackground(67890);

    expect(background1.blobs).not.toEqual(background2.blobs);
  });

  it('should generate valid blobs within bounds for multiple seeds', () => {
    for (let i = 0; i < 200; i++) {
      const background = createBackground(i);

      // Check that number of blobs is between 6 and 8
      expect(background.blobs.length).toBeGreaterThanOrEqual(6);
      expect(background.blobs.length).toBeLessThanOrEqual(8);

      // Check each blob's properties are within bounds
      for (const blob of background.blobs) {
        expect(blob.x).toBeGreaterThanOrEqual(-10);
        expect(blob.x).toBeLessThanOrEqual(110);
        expect(blob.y).toBeGreaterThanOrEqual(-10);
        expect(blob.y).toBeLessThanOrEqual(110);
        expect(blob.w).toBeGreaterThanOrEqual(20);
        expect(blob.w).toBeLessThanOrEqual(62);
        expect(blob.h).toBeGreaterThanOrEqual(18);
        expect(blob.h).toBeLessThanOrEqual(64);
        expect([1, 2, 3]).toContain(blob.hue);
      }
    }
  });
});
