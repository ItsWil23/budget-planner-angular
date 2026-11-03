import { Injectable, signal } from '@angular/core';
import { BudgetLine } from '../models/budget-line';
import { BudgetMonth, OpenMonthResult } from '../models/budget-month';
import { RecurringRule } from '../models/recurring-rule';
import { CategoryService } from './category';
import { MoneyService } from './money';
import { RecurringRuleService } from './recurring-rule';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly _lines = signal<BudgetLine[]>([]);
  private readonly _months = signal<BudgetMonth[]>([]);

  readonly lines = this._lines.asReadonly();
  readonly months = this._months.asReadonly();

  constructor(
    private readonly moneyService: MoneyService,
    private readonly categoryService: CategoryService,
    private readonly recurringRuleService: RecurringRuleService,
  ) {}

  setPlannedAmount(monthKey: string, subcategoryId: string, amountEuros: number): BudgetLine | null {
    this.assertValidMonthKey(monthKey);

    const subcategory = this.categoryService
      .subcategories()
      .find(sub => sub.id === subcategoryId);
    if (!subcategory) {
      throw new Error('Unknown subcategory');
    }

    if (amountEuros < 0) {
      throw new Error('Invalid amount');
    }

    const cents = this.moneyService.toCents(amountEuros);
    if (!Number.isInteger(cents) || cents < 0) {
      throw new Error('Invalid amount');
    }

    const existing = this._lines().find(
      line => line.monthKey === monthKey && line.subcategoryId === subcategoryId,
    );

    if (cents === 0) {
      this._lines.update(lines =>
        lines.filter(line => line.monthKey !== monthKey || line.subcategoryId !== subcategoryId),
      );
      return null;
    }

    const line: BudgetLine = existing
      ? { ...existing, plannedAmountCents: cents }
      : {
          id: crypto.randomUUID(),
          monthKey,
          categoryId: subcategory.categoryId,
          subcategoryId,
          plannedAmountCents: cents,
        };

    this._lines.update(lines =>
      existing ? lines.map(current => (current === existing ? line : current)) : [...lines, line],
    );

    return line;
  }

  linesForMonth(monthKey: string): BudgetLine[] {
    this.assertValidMonthKey(monthKey);
    return this._lines().filter(line => line.monthKey === monthKey);
  }

  plannedCentsFor(monthKey: string, subcategoryId: string): number {
    const line = this._lines().find(
      current => current.monthKey === monthKey && current.subcategoryId === subcategoryId,
    );
    return line?.plannedAmountCents ?? 0;
  }

  openMonth(monthKey: string): OpenMonthResult {
    this.assertValidMonthKey(monthKey);

    const result: OpenMonthResult = { monthKey, created: 0, skipped: 0, ignoredRuleIds: [] };
    if (this.isMonthOpened(monthKey)) {
      return result;
    }

    const subcategories = this.categoryService.subcategories();
    const handledSubcategoryIds = new Set<string>();
    const generatedLines: BudgetLine[] = [];

    for (const rule of this.recurringRuleService.activeRulesForMonth(monthKey)) {
      const subcategory = subcategories.find(sub => sub.id === rule.subcategoryId);
      if (
        !subcategory ||
        subcategory.categoryId !== rule.categoryId ||
        !this.isValidRuleAmount(rule)
      ) {
        result.ignoredRuleIds.push(rule.id);
        continue;
      }

      if (handledSubcategoryIds.has(subcategory.id)) {
        result.ignoredRuleIds.push(rule.id);
        continue;
      }
      handledSubcategoryIds.add(subcategory.id);

      const alreadyExists = this._lines().some(
        line => line.monthKey === monthKey && line.subcategoryId === subcategory.id,
      );
      if (alreadyExists) {
        result.skipped++;
        continue;
      }

      generatedLines.push({
        id: crypto.randomUUID(),
        monthKey,
        categoryId: subcategory.categoryId,
        subcategoryId: subcategory.id,
        plannedAmountCents: rule.amountCents,
        sourceRuleId: rule.id,
      });
      result.created++;
    }

    if (generatedLines.length > 0) {
      this._lines.update(lines => [...lines, ...generatedLines]);
    }

    this._months.update(months => [
      ...months,
      { monthKey, openingBalanceCents: 0, openingBalanceOverridden: false, initialized: true },
    ]);

    return result;
  }

  isMonthOpened(monthKey: string): boolean {
    return this._months().some(month => month.monthKey === monthKey && month.initialized);
  }

  private isValidRuleAmount(rule: RecurringRule): boolean {
    return Number.isInteger(rule.amountCents) && rule.amountCents > 0;
  }

  private assertValidMonthKey(monthKey: string): void {
    if (!MONTH_KEY_PATTERN.test(monthKey)) {
      throw new Error('Invalid month key format');
    }
  }
}
