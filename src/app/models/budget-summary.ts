import { BudgetLineStatus } from './budget-status';
import { CategoryType } from './category';

export interface BudgetSubcategorySummary {
  categoryId: string;
  subcategoryId: string;
  categoryType: CategoryType;
  plannedAmountCents: number;
  actualAmountCents: number;
  varianceCents: number;
  consumptionRate: number | undefined;
  status: BudgetLineStatus | undefined;
}

export interface BudgetCategorySummary {
  categoryId: string;
  categoryType: CategoryType;
  plannedAmountCents: number;
  actualAmountCents: number;
  varianceCents: number;
  consumptionRate: number | undefined;
  status: BudgetLineStatus | undefined;
  subcategories: BudgetSubcategorySummary[];
}

export interface BudgetMonthSummary {
  monthKey: string;
  categories: BudgetCategorySummary[];
  incomePlannedCents: number;
  expensePlannedCents: number;
  unallocatedCents: number;
  openingBalanceCents: number;
  actualClosingBalanceCents: number;
}
