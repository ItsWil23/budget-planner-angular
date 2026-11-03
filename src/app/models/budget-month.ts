export interface BudgetMonth {
  monthKey: string;
  openingBalanceCents: number;
  openingBalanceOverridden: boolean;
  initialized: boolean;
}

export interface OpenMonthResult {
  monthKey: string;
  created: number;
  skipped: number;
  ignoredRuleIds: string[];
}
