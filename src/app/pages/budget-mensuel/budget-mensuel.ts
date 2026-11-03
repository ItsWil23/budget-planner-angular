import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoneyPipe } from '../../components/ui/money-pipe/money-pipe';
import { BudgetService } from '../../services/budget';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-budget-mensuel',
  imports: [MoneyPipe, TranslocoPipe],
  templateUrl: './budget-mensuel.html',
  styleUrl: './budget-mensuel.scss',
})
export class BudgetMensuel {
  protected readonly monthSummary = inject(BudgetService).monthSummary;
  protected readonly settings = inject(SettingsService).settings;
}
