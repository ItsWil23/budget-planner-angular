import { describe, it, expect } from 'vitest';
import { FeatureService } from './feature';

describe('FeatureService', () => {
  let service: FeatureService;

  beforeEach(() => {
    service = new FeatureService();
  });

  it('should expose the three mocked feature keys in order', () => {
    const features = service.features();

    expect(features.length).toBe(3);
    expect(features.map(feature => feature.titleKey)).toEqual([
      'landing.features.planning.title',
      'landing.features.tracking.title',
      'landing.features.summary.title',
    ]);
  });

  it('should expose title and description keys on every feature', () => {
    for (const feature of service.features()) {
      expect(typeof feature.titleKey).toBe('string');
      expect(feature.titleKey.length).toBeGreaterThan(0);
      expect(typeof feature.descriptionKey).toBe('string');
      expect(feature.descriptionKey.length).toBeGreaterThan(0);
    }
  });
});
