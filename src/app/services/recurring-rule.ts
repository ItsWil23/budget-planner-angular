import { Injectable, signal } from '@angular/core';
import {
  RecurringRule,
  RecurringRuleInput,
  RecurringRulePatch,
  RecurringRuleVersionChange,
} from '../models/recurring-rule';
import { MOCK_RECURRING_RULES } from '../mocks/mock-recurring-rules';
import { MonthContextService } from './month-context';

@Injectable({
  providedIn: 'root',
})
export class RecurringRuleService {
  private readonly _rules = signal<RecurringRule[]>(MOCK_RECURRING_RULES);
  readonly rules = this._rules.asReadonly();

  constructor(private readonly monthContext: MonthContextService) {}

  createRule(input: RecurringRuleInput): RecurringRule {
    this.assertValidAmount(input.amountCents);
    const rule: RecurringRule = {
      ...input,
      id: crypto.randomUUID(),
      seriesId: crypto.randomUUID(),
      startMonth: this.monthContext.nextSystemMonthKey,
      active: true,
    };
    this._rules.update(rules => [...rules, rule]);
    return rule;
  }

  planVersionChange(ruleId: string, patch: RecurringRulePatch): RecurringRuleVersionChange {
    const source = this._rules().find(rule => rule.id === ruleId);
    if (!source) {
      throw new Error('Unknown recurring rule');
    }
    this.assertValidAmount(patch.amountCents ?? source.amountCents);

    const isUnstartedSuccessor = source.startMonth === this.monthContext.nextSystemMonthKey;
    const closedVersion = isUnstartedSuccessor
      ? null
      : { ...source, endMonth: this.monthContext.systemMonthKey };
    const nextVersion: RecurringRule = {
      ...source,
      ...patch,
      id: isUnstartedSuccessor ? source.id : crypto.randomUUID(),
      startMonth: isUnstartedSuccessor ? source.startMonth : this.monthContext.nextSystemMonthKey,
      endMonth: source.endMonth,
    };

    return { sourceVersionId: source.id, closedVersion, nextVersion };
  }

  private assertValidAmount(amountCents: number): void {
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new Error('Invalid recurring rule amount');
    }
  }

  commitVersionChange(change: RecurringRuleVersionChange): void {
    const currentRules = this._rules();
    if (!currentRules.some(rule => rule.id === change.sourceVersionId)) {
      throw new Error('Unknown recurring rule version');
    }

    const nextRules = currentRules.map(rule => {
      if (rule.id !== change.sourceVersionId) return rule;
      return change.closedVersion ?? change.nextVersion;
    });
    if (change.closedVersion !== null) {
      nextRules.push(change.nextVersion);
    }
    this._rules.set(nextRules);
  }

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
