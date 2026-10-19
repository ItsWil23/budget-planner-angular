import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { FeatureService } from '../../services/feature';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly featureService = inject(FeatureService);

  protected readonly features = this.featureService.features;
}
