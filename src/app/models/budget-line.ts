export interface BudgetLine {
  id: string;
  monthKey: string;
  categoryId: string;
  subcategoryId: string;
  plannedAmountCents: number;
  sourceRuleId?: string;
}
