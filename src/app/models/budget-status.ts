export type BudgetLineStatus = 'under' | 'on-track' | 'over';

export const BUDGET_STATUS_THRESHOLDS = {
  onTrackPercent: 80,
  overPercent: 100,
} as const;

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
}

// Comparaisons en produit croisé (actual * 100 vs planned * seuil) : pas de division flottante.
export function getBudgetLineStatus(actualCents: number, plannedCents: number): BudgetLineStatus {
  assertInteger(actualCents, 'actualCents');
  assertInteger(plannedCents, 'plannedCents');
  if (actualCents < 0) {
    throw new Error('actualCents must be greater than or equal to 0');
  }
  if (plannedCents <= 0) {
    throw new Error('plannedCents must be greater than 0');
  }

  if (actualCents * 100 <= plannedCents * BUDGET_STATUS_THRESHOLDS.onTrackPercent) {
    return 'under';
  }
  if (actualCents * 100 > plannedCents * BUDGET_STATUS_THRESHOLDS.overPercent) {
    return 'over';
  }
  return 'on-track';
}
