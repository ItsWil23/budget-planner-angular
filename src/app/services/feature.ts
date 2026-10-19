import { Injectable, signal } from '@angular/core';
import { Feature } from '../models/feature';
import { MOCK_FEATURES } from '../mocks/mock-features';

@Injectable({
  providedIn: 'root',
})
export class FeatureService {
  // === ÉTAT INITIAL (signal en lecture seule exposé) ===
  private readonly _features = signal<Feature[]>(MOCK_FEATURES);

  readonly features = this._features.asReadonly();
}
