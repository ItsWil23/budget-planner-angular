import { CategoryType } from "./category";

export interface Transaction {
  id: string;
  label: string;
  categoryId: string;
  subcategoryId: string;
  date: string;
  monthKey: string;
  amountCents: number;
  type: CategoryType;
  createdAt: string;
}

export type TransactionInput = Omit<Transaction, 'id' | 'monthKey' | 'createdAt' | 'type'>;

export interface RemovedTransaction {
  transaction: Transaction;
  index: number;
}

export type TransactionPresentation = Transaction & {
  amountEuros: number;
};
