import { Component, computed, inject, input } from '@angular/core';
import { BudgetLineStatus } from '../../../models/budget-status';
import { SettingsService } from '../../../services/settings';

@Component({
  selector: 'app-progress-bar',
  templateUrl: './progress-bar.html',
  styleUrl: './progress-bar.scss',
})
export class ProgressBar {
  private readonly settings = inject(SettingsService).settings;

  readonly consumptionRate = input.required<number>();
  readonly status = input.required<BudgetLineStatus>();
  readonly ariaLabel = input.required<string>();
  readonly ariaValueText = input.required<string>();

  // Le remplissage est plafonné à 100 % ; le pourcentage affiché ne l'est jamais.
  private readonly clampedRate = computed(() => Math.min(Math.max(this.consumptionRate(), 0), 1));

  protected readonly fillWidth = computed(() => this.clampedRate() * 100);
  protected readonly ariaValueNow = computed(() => Math.round(this.clampedRate() * 100));
  protected readonly percentLabel = computed(() =>
    new Intl.NumberFormat(this.settings().locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(this.consumptionRate()),
  );
}
