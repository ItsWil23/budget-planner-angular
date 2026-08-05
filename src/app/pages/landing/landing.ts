import { MOCK_FEATURES } from '../../mocks/mock-features';
import { Feature } from '../../models/feature';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  features: Feature[] = MOCK_FEATURES;
}
