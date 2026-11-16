export interface RecurringRule {
  id: string;
  seriesId: string;
  label: string;
  categoryId: string;
  subcategoryId: string;
  amountCents: number;
  dayOfMonth?: number;
  startMonth: string;
  endMonth?: string;
  active: boolean;
}

export type RecurringRuleInput = Pick<
  RecurringRule,
  'label' | 'categoryId' | 'subcategoryId' | 'amountCents' | 'dayOfMonth'
>;

export type RecurringRulePatch = Partial<
  Pick<RecurringRule, 'label' | 'categoryId' | 'subcategoryId' | 'amountCents' | 'dayOfMonth' | 'active'>
>;

export interface RecurringRuleVersionChange {
  readonly sourceVersionId: string;
  readonly closedVersion: RecurringRule | null;
  readonly nextVersion: RecurringRule;
}
