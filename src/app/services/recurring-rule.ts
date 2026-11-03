import { Injectable, signal } from '@angular/core';
import { RecurringRule } from '../models/recurring-rule';
import { MOCK_RECURRING_RULES } from '../mocks/mock-recurring-rules';

@Injectable({
  providedIn: 'root',
})
export class RecurringRuleService {
  private readonly _rules = signal<RecurringRule[]>(MOCK_RECURRING_RULES);
  readonly rules = this._rules.asReadonly();

  private validateMonthKey(monthKey: string): void {
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!regex.test(monthKey)) {
      throw new Error('Invalid month key format');
    }
  }

  // endMonth est inclusif : la règle est active le mois de endMonth.
  activeRulesForMonth(monthKey: string): RecurringRule[] {
    this.validateMonthKey(monthKey);
    return this._rules().filter(
      (rule: RecurringRule) =>
        rule.active &&
        rule.startMonth <= monthKey &&
        (rule.endMonth === undefined || monthKey <= rule.endMonth),
    );
  }
}
