import { TestBed } from '@angular/core/testing';
import { Background } from './background';

describe('Background', () => {
  let originalGetItem: typeof localStorage.getItem;
  let originalSetItem: typeof localStorage.setItem;

  beforeEach(() => {
    // Save original localStorage methods
    originalGetItem = window.localStorage.getItem;
    originalSetItem = window.localStorage.setItem;

    // Clear localStorage before each test
    localStorage.clear();

    // Create a fresh TestBed to ensure clean state
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    // Restore original localStorage methods after each test
    window.localStorage.getItem = originalGetItem;
    window.localStorage.setItem = originalSetItem;
  });

  it('should be created', () => {
    const background = new Background();
    expect(background).toBeTruthy();
  });

  it('should use the same blobs for the same seed', () => {
    // Set a fixed seed in localStorage
    localStorage.setItem('budget-planner.background-seed', '12345');

    const background1 = new Background();
    const background2 = new Background();

    expect(background1.blobs).toEqual(background2.blobs);
  });

  it('should generate different blobs for different seeds', () => {
    // Set different seeds
    localStorage.setItem('budget-planner.background-seed', '12345');
    const background1 = new Background();

    localStorage.setItem('budget-planner.background-seed', '67890');
    const background2 = new Background();

    expect(background1.blobs).not.toEqual(background2.blobs);
  });

  it('should generate valid blobs within bounds for multiple seeds', () => {
    for (let i = 0; i < 200; i++) {
      // Set seed to i
      localStorage.setItem('budget-planner.background-seed', i.toString());

      const background = new Background();

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

  it('should write a seed to localStorage on first launch', () => {
    // Ensure localStorage is empty
    localStorage.clear();

    const background = new Background();
    const storedSeed = localStorage.getItem('budget-planner.background-seed');

    expect(storedSeed).toBeDefined();
    expect(parseInt(storedSeed!, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(storedSeed!, 10)).toBeLessThanOrEqual(4294967295);
  });

  it('should read the same seed on subsequent launches', () => {
    // Set a seed
    localStorage.setItem('budget-planner.background-seed', '98765');

    const background1 = new Background();
    const background2 = new Background();

    expect(background1.seed).toEqual(background2.seed);
  });

  it('should generate a new seed and rewrite when localStorage is invalid', () => {
    // Set an invalid seed
    localStorage.setItem('budget-planner.background-seed', 'invalid-seed');

    const background = new Background();

    // Check that a valid seed was generated and written
    const storedSeed = localStorage.getItem('budget-planner.background-seed');
    expect(storedSeed).toBeDefined();
    expect(parseInt(storedSeed!, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(storedSeed!, 10)).toBeLessThanOrEqual(4294967295);

    // Check that the seed from the background is valid
    expect(background.seed).toBeGreaterThanOrEqual(0);
    expect(background.seed).toBeLessThanOrEqual(4294967295);
  });

  it('should properly validate and reject invalid seeds', () => {
    // Test various invalid seeds
    const invalidSeeds = ['123x', '1.5', '-123', '4294967296', 'abc'];

    for (const invalidSeed of invalidSeeds) {
      localStorage.setItem('budget-planner.background-seed', invalidSeed);

      const background = new Background();

      // Should generate a new valid seed
      expect(background.seed).toBeGreaterThanOrEqual(0);
      expect(background.seed).toBeLessThanOrEqual(4294967295);

      // Check that the new seed was written to storage
      const storedSeed = localStorage.getItem('budget-planner.background-seed');
      expect(storedSeed).toBeDefined();
      expect(parseInt(storedSeed!, 10)).toBeGreaterThanOrEqual(0);
      expect(parseInt(storedSeed!, 10)).toBeLessThanOrEqual(4294967295);
    }
  });

  it('should properly accept valid decimal seeds', () => {
    // Test various valid seeds
    const validSeeds = ['0', '12345', '4294967295'];

    for (const validSeed of validSeeds) {
      localStorage.setItem('budget-planner.background-seed', validSeed);

      const background = new Background();

      // Should use the provided seed
      expect(background.seed).toBe(parseInt(validSeed, 10));
    }
  });

  it('should handle localStorage getItem errors gracefully', () => {
    // Mock localStorage.getItem to throw an error
    window.localStorage.getItem = () => {
      throw new Error('Storage error');
    };

    const background = new Background();

    // Should not crash even with storage errors
    expect(background).toBeTruthy();
    expect(background.seed).toBeGreaterThanOrEqual(0);
    expect(background.seed).toBeLessThanOrEqual(4294967295);

    // Restore original method
    window.localStorage.getItem = originalGetItem;
  });

  it('should handle localStorage setItem errors gracefully', () => {
    // Mock localStorage.setItem to throw an error
    window.localStorage.setItem = (key, value) => {
      throw new Error('Storage error');
    };

    const background = new Background();

    // Should not crash even with storage errors
    expect(background).toBeTruthy();
    expect(background.seed).toBeGreaterThanOrEqual(0);
    expect(background.seed).toBeLessThanOrEqual(4294967295);

    // Restore original method
    window.localStorage.setItem = originalSetItem;
  });
});