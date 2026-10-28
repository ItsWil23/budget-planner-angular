export interface RecurringRule {
  id: string;
  label: string;
  categoryId: string;
  subcategoryId: string;
  amountCents: number;
  dayOfMonth?: number;
  startMonth: string;
  endMonth?: string;
  active: boolean;
}
