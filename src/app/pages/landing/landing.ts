import { MOCK_FEATURES } from '../../mocks/mock-features';
import { Feature } from '../../models/feature';
import { Component } from '@angular/core';

@Component({
  selector: 'app-landing',
  imports: [],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  features: Feature[] = MOCK_FEATURES;
}
