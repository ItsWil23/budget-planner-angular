import { computed, Injectable, signal } from '@angular/core';
import { BudgetLine } from '../models/budget-line';
import { BudgetMonth, OpenMonthResult } from '../models/budget-month';
import { BudgetLineStatus, getBudgetLineStatus } from '../models/budget-status';
import {
  BudgetCategorySummary,
  BudgetMonthSummary,
  BudgetSubcategorySummary,
} from '../models/budget-summary';
import { RecurringRule } from '../models/recurring-rule';
import { Transaction } from '../models/transactions';
import { CategoryService } from './category';
import { MoneyService } from './money';
import { MonthContextService } from './month-context';
import { RecurringRuleService } from './recurring-rule';
import { TransactionService } from './transaction';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type BudgetFigures = Pick<
  BudgetCategorySummary,
  'plannedAmountCents' | 'actualAmountCents' | 'varianceCents' | 'consumptionRate' | 'status'
>;

function sumBy<T>(items: readonly T[], getAmountCents: (item: T) => number): number {
  return items.reduce((total, item) => total + getAmountCents(item), 0);
}

function buildFigures(plannedAmountCents: number, actualAmountCents: number): BudgetFigures {
  const figures = {
    plannedAmountCents,
    actualAmountCents,
    varianceCents: actualAmountCents - plannedAmountCents,
  };

  // Sans prévu, le taux et le statut ne sont pas définissables.
  if (plannedAmountCents <= 0) {
    return { ...figures, consumptionRate: undefined, status: undefined };
  }

  const status: BudgetLineStatus = getBudgetLineStatus(actualAmountCents, plannedAmountCents);
  return {
    ...figures,
    consumptionRate: actualAmountCents / plannedAmountCents,
    status,
  };
}

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly _lines = signal<BudgetLine[]>([]);
  private readonly _months = signal<BudgetMonth[]>([]);

  readonly lines = this._lines.asReadonly();
  readonly months = this._months.asReadonly();

  readonly monthSummary = computed<BudgetMonthSummary>(() => {
    const monthKey = this.monthContextService.monthKey();
    const monthLines = this._lines().filter(line => line.monthKey === monthKey);
    const monthTransactions: Transaction[] = this.transactionService
      .transactions()
      .filter(transaction => transaction.monthKey === monthKey);
    const subcategories = this.categoryService.subcategories();

    const categories = this.categoryService.categories().map((category): BudgetCategorySummary => {
      const categoryLines = monthLines.filter(line => line.categoryId === category.id);
      const categoryTransactions = monthTransactions.filter(
        transaction => transaction.categoryId === category.id,
      );

      const subcategorySummaries = subcategories
        .filter(subcategory => subcategory.categoryId === category.id)
        .map((subcategory): BudgetSubcategorySummary => {
          const plannedAmountCents = sumBy(
            monthLines.filter(line => line.subcategoryId === subcategory.id),
            line => line.plannedAmountCents,
          );
          const actualAmountCents = sumBy(
            categoryTransactions.filter(
              transaction => transaction.subcategoryId === subcategory.id,
            ),
            transaction => transaction.amountCents,
          );
          return {
            categoryId: category.id,
            subcategoryId: subcategory.id,
            categoryType: category.type,
            ...buildFigures(plannedAmountCents, actualAmountCents),
          };
        });

      return {
        categoryId: category.id,
        categoryType: category.type,
        ...buildFigures(
          sumBy(categoryLines, line => line.plannedAmountCents),
          sumBy(categoryTransactions, transaction => transaction.amountCents),
        ),
        subcategories: subcategorySummaries,
      };
    });

    const incomePlannedCents = sumBy(
      categories.filter(category => category.categoryType === 'income'),
      category => category.plannedAmountCents,
    );
    const expensePlannedCents = sumBy(
      categories.filter(category => category.categoryType === 'expense'),
      category => category.plannedAmountCents,
    );

    return {
      monthKey,
      categories,
      incomePlannedCents,
      expensePlannedCents,
      unallocatedCents: incomePlannedCents - expensePlannedCents,
    };
  });

  constructor(
    private readonly moneyService: MoneyService,
    private readonly categoryService: CategoryService,
    private readonly recurringRuleService: RecurringRuleService,
    private readonly transactionService: TransactionService,
    private readonly monthContextService: MonthContextService,
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
