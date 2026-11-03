import { RecurringRule } from '../models/recurring-rule';

export const MOCK_RECURRING_RULES: RecurringRule[] = [
  {
    id: 'rule-1',
    label: 'Salaire mensuel',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1',
    amountCents: 245000,
    dayOfMonth: 1,
    startMonth: '2026-07',
    active: true,
  },
  {
    id: 'rule-2',
    label: 'Loyer appartement',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2',
    amountCents: 85000,
    dayOfMonth: 2,
    startMonth: '2026-07',
    active: true,
  },
  {
    id: 'rule-3',
    label: 'Facture internet fibre',
    categoryId: 'cat-2',
    subcategoryId: 'sub-3',
    amountCents: 3999,
    dayOfMonth: 5,
    startMonth: '2026-07',
    endMonth: '2026-09',
    active: true,
  },
  {
    id: 'rule-4',
    label: 'Électricité désactivée',
    categoryId: 'cat-2',
    subcategoryId: 'sub-4',
    amountCents: 1000,
    startMonth: '2026-07',
    active: false,
  },
];
