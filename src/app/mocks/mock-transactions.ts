import { Transaction } from '../models/transactions';

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    date: '2023-01-01',
    description: 'Grocery Shopping',
    amount: 50.25,
    category: 'Groceries',
  },

  {
    id: 2,
    date: '2023-01-02',
    description: 'Electricity Bill',
    amount: 75.5,
    category: 'Utilities',
  },

  {
    id: 3,
    date: '2023-01-03',
    description: 'Dinner at Restaurant',
    amount: 30.0,
    category: 'Dining',
  },
];
