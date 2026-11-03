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

export type TransactionInput = Omit<Transaction, 'id' | 'monthKey' | 'amountCents' | 'createdAt'> & {
  amountEuros: number;
};

export type TransactionPresentation = Transaction & {
  amountEuros: number;
};
