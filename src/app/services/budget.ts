import { Injectable, signal } from '@angular/core';
import { BudgetLine } from '../models/budget-line';
import { CategoryService } from './category';
import { MoneyService } from './money';

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private readonly _lines = signal<BudgetLine[]>([]);

  readonly lines = this._lines.asReadonly();

  constructor(
    private readonly moneyService: MoneyService,
    private readonly categoryService: CategoryService,
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

  private assertValidMonthKey(monthKey: string): void {
    if (!MONTH_KEY_PATTERN.test(monthKey)) {
      throw new Error('Invalid month key format');
    }
  }
}
