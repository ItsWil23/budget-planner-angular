import { describe, it, expect } from 'vitest';
import { FeatureService } from './feature';

describe('FeatureService', () => {
  let service: FeatureService;

  beforeEach(() => {
    service = new FeatureService();
  });

  it('should expose the three mocked features in order', () => {
    const features = service.features();

    expect(features.length).toBe(3);
    expect(features.map(feature => feature.title)).toEqual([
      'Planification mensuelle',
      'Suivi quotidien',
      'Synthèse claire',
    ]);
  });

  it('should expose title and description on every feature', () => {
    for (const feature of service.features()) {
      expect(typeof feature.title).toBe('string');
      expect(feature.title.length).toBeGreaterThan(0);
      expect(typeof feature.description).toBe('string');
      expect(feature.description.length).toBeGreaterThan(0);
    }
  });
});
