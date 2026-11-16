import { NgTemplateOutlet } from '@angular/common';
import { Component, TemplateRef, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { UserSettings } from '../../../models/user-settings';
import { MoneyPipe } from '../money-pipe/money-pipe';

@Component({
  selector: 'app-budget-equation',
  imports: [MoneyPipe, NgTemplateOutlet, TranslocoPipe],
  templateUrl: './budget-equation.html',
  styleUrl: './budget-equation.scss',
})
export class BudgetEquation {
  readonly settings = input.required<UserSettings>();
  readonly openingCents = input.required<number>();
  /** Gabarit du champ d'ouverture, présent seulement pendant l'édition : il remplace la valeur dans la formule. */
  readonly openingEditor = input<TemplateRef<unknown> | null>(null);
  readonly incomeCents = input.required<number>();
  readonly expenseCents = input.required<number>();
  readonly unallocatedCents = input.required<number>();
  /** Clôture affichée : montant, `null` hors plage sûre, `'invalid'` si le brouillon est incomplet. */
  readonly closing = input.required<number | null | 'invalid'>();
  readonly opened = input.required<boolean>();
}
